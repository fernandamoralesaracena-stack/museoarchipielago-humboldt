#!/usr/bin/env python3
"""
Descarga los datos de la estación meteorológica del Museo Archipiélago de
Humboldt desde la API v2 de WeatherLink y los deja listos para el sitio web.

Qué genera (dentro de data/estacion/):
  historico/YYYY-MM.csv   archivo acumulativo, un registro por intervalo
  ultima-semana.json      los últimos 7 días, para los gráficos de la página
  resumen.json            estado actual + resumen de la semana + por día

Credenciales (nunca van en el código, se leen del entorno):
  WEATHERLINK_API_KEY
  WEATHERLINK_API_SECRET
  WEATHERLINK_STATION_ID   (opcional; si no se da, usa la primera estación)

Uso:
  python3 scripts/estacion_fetch.py            # últimos 8 días
  python3 scripts/estacion_fetch.py --dias 30  # recuperar más historia

La API v2 entrega los valores en unidades imperiales (°F, mph, inHg), así que
acá se convierten a °C, km/h y hPa. La lluvia viene ya en milímetros.
Solo se piden datos históricos por tramos de 24 horas, que es el máximo que
acepta la API por llamada.
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

BASE_URL = "https://api.weatherlink.com/v2"
TZ_LOCAL = ZoneInfo("America/Santiago")
RAIZ = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR_DATOS = os.path.join(RAIZ, "data", "estacion")
DIR_HISTORICO = os.path.join(DIR_DATOS, "historico")

COLUMNAS = [
    "ts_utc",
    "fecha_hora_local",
    "temp_c",
    "temp_max_c",
    "temp_min_c",
    "humedad_pct",
    "punto_rocio_c",
    "viento_kmh",
    "rafaga_kmh",
    "viento_dir_grados",
    "presion_hpa",
    "lluvia_mm",
]


# ---------------------------------------------------------------- utilidades

def f_a_c(v):
    return None if v is None else round((v - 32.0) * 5.0 / 9.0, 2)


def mph_a_kmh(v):
    return None if v is None else round(v * 1.609344, 2)


def inhg_a_hpa(v):
    return None if v is None else round(v * 33.8638866667, 2)


def primero(registro, *nombres):
    """Devuelve el primer campo presente y no nulo de los nombres dados."""
    for n in nombres:
        if registro.get(n) is not None:
            return registro[n]
    return None


def pedir(ruta, api_key, api_secret, params=None):
    params = dict(params or {})
    params["api-key"] = api_key
    consulta = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{BASE_URL}/{ruta}?{consulta}"
    pedido = urllib.request.Request(url, headers={"X-Api-Secret": api_secret})
    ultimo_error = None
    for intento in range(4):
        try:
            with urllib.request.urlopen(pedido, timeout=60) as respuesta:
                return json.loads(respuesta.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            cuerpo = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503, 504):
                ultimo_error = f"HTTP {e.code}: {cuerpo}"
                time.sleep(5 * (intento + 1))
                continue
            raise SystemExit(
                f"Error de la API en /{ruta}: HTTP {e.code}. {cuerpo}\n"
                "Si dice que la clave es inválida, hay que regenerarla en "
                "weatherlink.com/account y actualizarla en los secrets."
            )
        except urllib.error.URLError as e:
            ultimo_error = str(e)
            time.sleep(5 * (intento + 1))
    raise SystemExit(f"No se pudo consultar /{ruta} tras varios intentos. {ultimo_error}")


# ------------------------------------------------------------ lectura de API

def resolver_estacion(api_key, api_secret, id_pedido):
    datos = pedir("stations", api_key, api_secret)
    estaciones = datos.get("stations") or []
    if not estaciones:
        raise SystemExit("La cuenta no tiene estaciones visibles para esta clave.")
    if id_pedido:
        for e in estaciones:
            if str(e.get("station_id")) == str(id_pedido):
                return e
        raise SystemExit(f"No se encontró la estación {id_pedido} en esta cuenta.")
    return estaciones[0]


def extraer_registros(respuesta):
    """Aplana los sensores de una respuesta y une los registros por timestamp.

    No se asume el tipo de sensor: se toman los campos por nombre, así que
    sirve igual si mañana se agrega otro sensor a la estación.
    """
    por_ts = defaultdict(dict)
    for sensor in respuesta.get("sensors") or []:
        for reg in sensor.get("data") or []:
            ts = reg.get("ts")
            if ts is None:
                continue
            destino = por_ts[ts]

            temp = primero(reg, "temp_avg", "temp", "temp_out")
            if temp is not None:
                destino["temp_c"] = f_a_c(temp)
            if reg.get("temp_hi") is not None:
                destino["temp_max_c"] = f_a_c(reg["temp_hi"])
            if reg.get("temp_lo") is not None:
                destino["temp_min_c"] = f_a_c(reg["temp_lo"])

            hum = primero(reg, "hum_last", "hum", "hum_out")
            if hum is not None:
                destino["humedad_pct"] = round(hum, 1)

            rocio = primero(reg, "dew_point_last", "dew_point", "dew_point_out")
            if rocio is not None:
                destino["punto_rocio_c"] = f_a_c(rocio)

            viento = primero(reg, "wind_speed_avg", "wind_speed_last", "wind_speed")
            if viento is not None:
                destino["viento_kmh"] = mph_a_kmh(viento)

            rafaga = primero(reg, "wind_speed_hi", "wind_gust_10_min", "wind_speed_hi_last_10_min")
            if rafaga is not None:
                destino["rafaga_kmh"] = mph_a_kmh(rafaga)

            direccion = primero(
                reg, "wind_dir_of_prevail", "wind_dir_last", "wind_dir_scalar_avg", "wind_dir"
            )
            if direccion is not None:
                destino["viento_dir_grados"] = round(direccion)

            presion = primero(reg, "bar_sea_level", "bar", "bar_absolute")
            if presion is not None:
                destino["presion_hpa"] = inhg_a_hpa(presion)

            lluvia = primero(reg, "rainfall_mm", "rain_mm", "rainfall_in")
            if lluvia is not None:
                if reg.get("rainfall_mm") is not None or reg.get("rain_mm") is not None:
                    destino["lluvia_mm"] = round(lluvia, 2)
                else:
                    destino["lluvia_mm"] = round(lluvia * 25.4, 2)

    registros = []
    for ts, campos in por_ts.items():
        # Solo sirven los registros con alguna medición real.
        if not any(v is not None for v in campos.values()):
            continue
        fila = {c: None for c in COLUMNAS}
        fila.update(campos)
        fila["ts_utc"] = ts
        fila["fecha_hora_local"] = datetime.fromtimestamp(ts, TZ_LOCAL).strftime(
            "%Y-%m-%d %H:%M"
        )
        registros.append(fila)
    registros.sort(key=lambda f: f["ts_utc"])
    return registros


def bajar_historico(api_key, api_secret, station_id, dias):
    ahora = int(time.time())
    inicio = ahora - dias * 86400
    todos = []
    tramo_inicio = inicio
    while tramo_inicio < ahora:
        tramo_fin = min(tramo_inicio + 86400, ahora)
        respuesta = pedir(
            f"historic/{station_id}",
            api_key,
            api_secret,
            {"start-timestamp": tramo_inicio, "end-timestamp": tramo_fin},
        )
        nuevos = extraer_registros(respuesta)
        todos.extend(nuevos)
        print(f"  {datetime.fromtimestamp(tramo_inicio, TZ_LOCAL):%Y-%m-%d}: "
              f"{len(nuevos)} registros")
        tramo_inicio = tramo_fin
        time.sleep(1)  # cortesía con la API
    return todos


# ------------------------------------------------------------------ escritura

def fusionar_csv(registros):
    """Agrega los registros nuevos a los CSV mensuales, sin duplicar."""
    os.makedirs(DIR_HISTORICO, exist_ok=True)
    por_mes = defaultdict(dict)
    for fila in registros:
        mes = datetime.fromtimestamp(fila["ts_utc"], TZ_LOCAL).strftime("%Y-%m")
        por_mes[mes][fila["ts_utc"]] = fila

    resumen_meses = []
    for mes, filas_nuevas in sorted(por_mes.items()):
        ruta = os.path.join(DIR_HISTORICO, f"{mes}.csv")
        existentes = {}
        if os.path.exists(ruta):
            with open(ruta, newline="", encoding="utf-8") as f:
                for fila in csv.DictReader(f):
                    try:
                        ts = int(fila["ts_utc"])
                    except (TypeError, ValueError, KeyError):
                        continue
                    existentes[ts] = {
                        c: (fila.get(c) if fila.get(c) not in ("", None) else None)
                        for c in COLUMNAS
                    }
        antes = len(existentes)
        existentes.update(filas_nuevas)
        with open(ruta, "w", newline="", encoding="utf-8") as f:
            escritor = csv.DictWriter(f, fieldnames=COLUMNAS)
            escritor.writeheader()
            for ts in sorted(existentes):
                escritor.writerow(existentes[ts])
        resumen_meses.append((mes, len(existentes), len(existentes) - antes))
    return resumen_meses


def promedio(valores):
    limpios = [v for v in valores if v is not None]
    return round(sum(limpios) / len(limpios), 1) if limpios else None


def rosa_predominante(registros):
    sectores = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
    cuenta = defaultdict(int)
    for r in registros:
        g = r.get("viento_dir_grados")
        if g is None:
            continue
        cuenta[sectores[int(((g % 360) + 22.5) // 45) % 8]] += 1
    if not cuenta:
        return None
    return max(cuenta.items(), key=lambda kv: kv[1])[0]


def construir_salidas(registros, estacion, actual):
    os.makedirs(DIR_DATOS, exist_ok=True)
    corte = int(time.time()) - 7 * 86400
    semana = [r for r in registros if r["ts_utc"] >= corte]

    with open(os.path.join(DIR_DATOS, "ultima-semana.json"), "w", encoding="utf-8") as f:
        json.dump(semana, f, ensure_ascii=False, separators=(",", ":"))

    por_dia = defaultdict(list)
    for r in semana:
        por_dia[r["fecha_hora_local"][:10]].append(r)

    dias = []
    for fecha in sorted(por_dia):
        filas = por_dia[fecha]
        temps = [v for r in filas for v in (r.get("temp_max_c"), r.get("temp_c")) if v is not None]
        temps_min = [v for r in filas for v in (r.get("temp_min_c"), r.get("temp_c")) if v is not None]
        vientos = [r.get("rafaga_kmh") or r.get("viento_kmh") for r in filas]
        vientos = [v for v in vientos if v is not None]
        dias.append({
            "fecha": fecha,
            "temp_max_c": max(temps) if temps else None,
            "temp_min_c": min(temps_min) if temps_min else None,
            "temp_media_c": promedio([r.get("temp_c") for r in filas]),
            "humedad_media_pct": promedio([r.get("humedad_pct") for r in filas]),
            "viento_max_kmh": max(vientos) if vientos else None,
            "lluvia_mm": round(sum(r.get("lluvia_mm") or 0 for r in filas), 2),
        })

    temps_sem = [d["temp_max_c"] for d in dias if d["temp_max_c"] is not None]
    temps_min_sem = [d["temp_min_c"] for d in dias if d["temp_min_c"] is not None]
    vientos_sem = [d["viento_max_kmh"] for d in dias if d["viento_max_kmh"] is not None]

    resumen = {
        "actualizado_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "actualizado_local": datetime.now(TZ_LOCAL).strftime("%d-%m-%Y %H:%M"),
        "estacion": {
            "nombre": estacion.get("station_name"),
            "id": estacion.get("station_id"),
            "latitud": estacion.get("latitude"),
            "longitud": estacion.get("longitude"),
            "altitud_m": (
                round(estacion["elevation"] * 0.3048, 1)
                if estacion.get("elevation") is not None else None
            ),
            "intervalo_registro_min": (
                round(estacion["recording_interval"])
                if estacion.get("recording_interval") is not None else None
            ),
        },
        "actual": actual,
        "semana": {
            "desde": dias[0]["fecha"] if dias else None,
            "hasta": dias[-1]["fecha"] if dias else None,
            "registros": len(semana),
            "temp_max_c": max(temps_sem) if temps_sem else None,
            "temp_min_c": min(temps_min_sem) if temps_min_sem else None,
            "temp_media_c": promedio([r.get("temp_c") for r in semana]),
            "humedad_media_pct": promedio([r.get("humedad_pct") for r in semana]),
            "viento_max_kmh": max(vientos_sem) if vientos_sem else None,
            "viento_medio_kmh": promedio([r.get("viento_kmh") for r in semana]),
            "lluvia_total_mm": round(sum(d["lluvia_mm"] or 0 for d in dias), 2),
            "viento_predominante": rosa_predominante(semana),
        },
        "dias": dias,
        "archivos_historico": sorted(
            f for f in os.listdir(DIR_HISTORICO) if f.endswith(".csv")
        ) if os.path.isdir(DIR_HISTORICO) else [],
        "fuente": "Estación Davis WeatherLink Live del Museo Archipiélago de Humboldt",
        "unidades": {
            "temperatura": "°C", "humedad": "%", "viento": "km/h",
            "presion": "hPa", "lluvia": "mm",
        },
    }
    with open(os.path.join(DIR_DATOS, "resumen.json"), "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=1)
    return resumen, semana


def leer_actual(api_key, api_secret, station_id):
    try:
        respuesta = pedir(f"current/{station_id}", api_key, api_secret)
    except SystemExit:
        return None
    registros = extraer_registros(respuesta)
    if not registros:
        return None
    ultimo = registros[-1]
    return {k: v for k, v in ultimo.items() if v is not None}


# ----------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Descarga datos de la estación del museo.")
    ap.add_argument("--dias", type=int, default=8,
                    help="días de historia a pedir (por defecto 8)")
    args = ap.parse_args()

    api_key = os.environ.get("WEATHERLINK_API_KEY")
    api_secret = os.environ.get("WEATHERLINK_API_SECRET")
    if not api_key or not api_secret:
        raise SystemExit(
            "Faltan las credenciales. Hay que definir WEATHERLINK_API_KEY y "
            "WEATHERLINK_API_SECRET en el entorno (en GitHub, como secrets "
            "del repositorio)."
        )

    estacion = resolver_estacion(api_key, api_secret,
                                 os.environ.get("WEATHERLINK_STATION_ID"))
    station_id = estacion["station_id"]
    print(f"Estación: {estacion.get('station_name')} (id {station_id})")

    print(f"Descargando {args.dias} días de historia, por tramos de 24 h:")
    registros = bajar_historico(api_key, api_secret, station_id, args.dias)
    if not registros:
        raise SystemExit(
            "La API respondió sin registros históricos. Esto pasa si la "
            "estación no tiene plan Pro activo."
        )

    meses = fusionar_csv(registros)
    for mes, total, nuevos in meses:
        print(f"  {mes}.csv: {total} registros ({nuevos} nuevos)")

    # Para los gráficos se usa todo lo acumulado del mes en curso y el anterior,
    # así la semana queda completa aunque cruce de mes.
    acumulado = []
    for mes, _, _ in meses[-2:]:
        with open(os.path.join(DIR_HISTORICO, f"{mes}.csv"), newline="",
                  encoding="utf-8") as f:
            for fila in csv.DictReader(f):
                limpia = {}
                for c in COLUMNAS:
                    v = fila.get(c)
                    if v in ("", None):
                        limpia[c] = None
                    elif c == "ts_utc":
                        limpia[c] = int(v)
                    elif c == "fecha_hora_local":
                        limpia[c] = v
                    elif c == "viento_dir_grados":
                        limpia[c] = int(float(v))
                    else:
                        limpia[c] = float(v)
                acumulado.append(limpia)
    acumulado.sort(key=lambda f: f["ts_utc"])

    actual = leer_actual(api_key, api_secret, station_id)
    resumen, semana = construir_salidas(acumulado, estacion, actual)

    print(f"\nListo. {len(semana)} registros en la última semana.")
    s = resumen["semana"]
    print(f"  Temperatura: {s['temp_min_c']} a {s['temp_max_c']} °C "
          f"(media {s['temp_media_c']})")
    print(f"  Humedad media: {s['humedad_media_pct']} %")
    print(f"  Viento máximo: {s['viento_max_kmh']} km/h, "
          f"predominante del {s['viento_predominante']}")
    print(f"  Lluvia acumulada: {s['lluvia_total_mm']} mm")


if __name__ == "__main__":
    sys.exit(main())
