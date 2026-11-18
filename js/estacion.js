/* Estación meteorológica del Museo Archipiélago de Humboldt
   Lee los JSON que genera scripts/estacion_fetch.py y dibuja la página.
   Sin librerías: SVG a mano. */

const COLOR_AIRE = '#C9611C';   // naranja de marca, oscurecido para legibilidad
const COLOR_AGUA = '#0E78AD';   // azul mar

const SECTORES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

const nf = (v, d = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', ',');

const rumbo = (g) =>
  g === null || g === undefined ? '—' : SECTORES[Math.round((g % 360) / 22.5) % 16];

const DIAS_SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const etiquetaDia = (fecha) => {
  const [a, m, d] = fecha.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  return `${DIAS_SEM[dt.getDay()]} ${d}`;
};

/* ------------------------------------------------------------- gráfico base */

/* Dibuja una serie temporal como línea, con cursor y globo al pasar el mouse.
   datos: [{t: Date, v: Number}]  */
function graficoLinea(destino, { datos, color, unidad, decimales = 1, area = true,
  piso = null, techo = null }) {
  const nodo = document.getElementById(destino);
  if (!nodo) return;
  const puntos = datos.filter((p) => p.v !== null && p.v !== undefined && !Number.isNaN(p.v));
  if (puntos.length < 2) {
    nodo.innerHTML = '<p class="est-vacio">Sin datos suficientes todavía.</p>';
    return;
  }

  const W = 900, H = 260, M = { t: 18, r: 16, b: 34, l: 46 };
  const x0 = puntos[0].t.getTime();
  const x1 = puntos[puntos.length - 1].t.getTime();
  const vals = puntos.map((p) => p.v);
  let vmin = Math.min(...vals), vmax = Math.max(...vals);
  const margen = (vmax - vmin) * 0.12 || 1;
  vmin -= margen; vmax += margen;
  // Algunas variables no pueden pasar de ciertos límites físicos:
  // el viento no es negativo y la humedad relativa no supera el 100 %.
  if (piso !== null) vmin = Math.max(vmin, piso);
  if (techo !== null) vmax = Math.min(vmax, techo);

  const px = (t) => M.l + ((t - x0) / (x1 - x0 || 1)) * (W - M.l - M.r);
  const py = (v) => H - M.b - ((v - vmin) / (vmax - vmin || 1)) * (H - M.t - M.b);

  // Marcas del eje Y: cuatro líneas de referencia, discretas.
  let ejeY = '';
  for (let i = 0; i <= 3; i++) {
    const v = vmin + ((vmax - vmin) * i) / 3;
    const y = py(v);
    ejeY += `<line class="est-grid" x1="${M.l}" y1="${y}" x2="${W - M.r}" y2="${y}"/>`
      + `<text class="est-tick" x="${M.l - 8}" y="${y + 4}" text-anchor="end">${nf(v, 0)}</text>`;
  }

  // Marcas del eje X: un rótulo por día.
  let ejeX = '';
  let diaPrevio = null;
  puntos.forEach((p) => {
    const clave = p.t.toDateString();
    if (clave !== diaPrevio) {
      diaPrevio = clave;
      const x = px(p.t.getTime());
      if (x > M.l + 12 && x < W - M.r - 12) {
        ejeX += `<line class="est-grid" x1="${x}" y1="${M.t}" x2="${x}" y2="${H - M.b}"/>`
          + `<text class="est-tick" x="${x}" y="${H - M.b + 18}" text-anchor="middle">`
          + `${DIAS_SEM[p.t.getDay()]} ${p.t.getDate()}</text>`;
      }
    }
  });

  const linea = puntos.map((p, i) =>
    `${i ? 'L' : 'M'}${px(p.t.getTime()).toFixed(1)},${py(p.v).toFixed(1)}`).join('');
  const relleno = area
    ? `<path d="${linea}L${px(x1).toFixed(1)},${H - M.b}L${px(x0).toFixed(1)},${H - M.b}Z"
         fill="${color}" opacity="0.1"/>`
    : '';

  nodo.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="est-svg" role="img"
         aria-label="Serie de ${unidad} de los últimos siete días">
      ${ejeY}${ejeX}
      <line class="est-eje" x1="${M.l}" y1="${H - M.b}" x2="${W - M.r}" y2="${H - M.b}"/>
      ${relleno}
      <path d="${linea}" fill="none" stroke="${color}" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"/>
      <g class="est-cursor" style="display:none">
        <line y1="${M.t}" y2="${H - M.b}" stroke="#646E7C" stroke-width="1" stroke-dasharray="3 3"/>
        <circle r="4.5" fill="${color}" stroke="#FAF7F1" stroke-width="2"/>
      </g>
      <rect x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}"
            fill="transparent" class="est-captura"/>
    </svg>
    <div class="est-globo" hidden></div>`;

  // Capa de interacción: cursor vertical, punto y globo con el valor.
  const svg = nodo.querySelector('svg');
  const cursor = nodo.querySelector('.est-cursor');
  const globo = nodo.querySelector('.est-globo');
  const captura = nodo.querySelector('.est-captura');

  const mover = (ev) => {
    const caja = svg.getBoundingClientRect();
    const toque = ev.touches ? ev.touches[0] : ev;
    const xSvg = ((toque.clientX - caja.left) / caja.width) * W;
    const t = x0 + ((xSvg - M.l) / (W - M.l - M.r)) * (x1 - x0);
    let cerca = puntos[0];
    for (const p of puntos) {
      if (Math.abs(p.t.getTime() - t) < Math.abs(cerca.t.getTime() - t)) cerca = p;
    }
    const cx = px(cerca.t.getTime()), cy = py(cerca.v);
    cursor.style.display = '';
    cursor.querySelector('line').setAttribute('x1', cx);
    cursor.querySelector('line').setAttribute('x2', cx);
    cursor.querySelector('circle').setAttribute('cx', cx);
    cursor.querySelector('circle').setAttribute('cy', cy);
    globo.hidden = false;
    globo.innerHTML = `<strong>${nf(cerca.v, decimales)} ${unidad}</strong>`
      + `<span>${cerca.t.toLocaleString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })} h</span>`;
    const izq = (cx / W) * caja.width;
    globo.style.left = `${Math.min(Math.max(izq, 70), caja.width - 70)}px`;
    globo.style.top = `${(cy / H) * caja.height - 14}px`;
  };
  const salir = () => { cursor.style.display = 'none'; globo.hidden = true; };

  captura.addEventListener('mousemove', mover);
  captura.addEventListener('mouseleave', salir);
  captura.addEventListener('touchmove', mover, { passive: true });
  captura.addEventListener('touchend', salir);
}

/* Barras diarias (lluvia). */
function graficoBarras(destino, { dias, color, unidad }) {
  const nodo = document.getElementById(destino);
  if (!nodo) return;
  if (!dias.length) {
    nodo.innerHTML = '<p class="est-vacio">Sin datos suficientes todavía.</p>';
    return;
  }
  const W = 900, H = 220, M = { t: 24, r: 16, b: 34, l: 46 };
  const max = Math.max(...dias.map((d) => d.valor), 1);
  const ancho = (W - M.l - M.r) / dias.length;
  const sinLluvia = dias.every((d) => !d.valor);

  let barras = '';
  dias.forEach((d, i) => {
    const h = (d.valor / max) * (H - M.t - M.b);
    const x = M.l + i * ancho + 2;           // 2px de aire entre barras
    const w = ancho - 4;
    const y = H - M.b - h;
    barras += `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(h, d.valor ? 2 : 0)}"
                 rx="4" fill="${color}"><title>${d.etiqueta}: ${nf(d.valor, 1)} ${unidad}</title></rect>`
      + `<text class="est-tick" x="${x + w / 2}" y="${H - M.b + 18}" text-anchor="middle">${d.etiqueta}</text>`;
    if (d.valor) {
      barras += `<text class="est-valor" x="${x + w / 2}" y="${y - 7}" text-anchor="middle">${nf(d.valor, 1)}</text>`;
    }
  });

  nodo.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="est-svg" role="img"
         aria-label="Lluvia diaria de los últimos siete días en ${unidad}">
      <line class="est-eje" x1="${M.l}" y1="${H - M.b}" x2="${W - M.r}" y2="${H - M.b}"/>
      ${barras}
      ${sinLluvia ? `<text class="est-nota-svg" x="${W / 2}" y="${H / 2}" text-anchor="middle">Sin precipitaciones en el período</text>` : ''}
    </svg>`;
}

/* ----------------------------------------------------------------- la página */

function tarjeta(etiqueta, valor, detalle) {
  return `<div class="est-tarjeta"><span class="est-tarjeta-et">${etiqueta}</span>
    <strong class="est-tarjeta-val">${valor}</strong>
    ${detalle ? `<span class="est-tarjeta-det">${detalle}</span>` : ''}</div>`;
}

function pintarTabla(dias) {
  const cuerpo = dias.map((d) => `<tr>
      <th scope="row">${d.fecha.split('-').reverse().join('-')}</th>
      <td>${nf(d.temp_min_c)}</td><td>${nf(d.temp_max_c)}</td><td>${nf(d.temp_media_c)}</td>
      <td>${nf(d.humedad_media_pct, 0)}</td><td>${nf(d.viento_max_kmh)}</td><td>${nf(d.lluvia_mm)}</td>
    </tr>`).join('');
  document.getElementById('est-tabla-cuerpo').innerHTML = cuerpo;
}

async function iniciar() {
  const aviso = document.getElementById('est-aviso');
  let resumen, semana;
  try {
    const [r1, r2] = await Promise.all([
      fetch('data/estacion/resumen.json', { cache: 'no-cache' }),
      fetch('data/estacion/ultima-semana.json', { cache: 'no-cache' }),
    ]);
    if (!r1.ok || !r2.ok) throw new Error('faltan los archivos de datos');
    resumen = await r1.json();
    semana = await r2.json();
  } catch (e) {
    aviso.hidden = false;
    aviso.textContent = 'Todavía no hay datos publicados de la estación. '
      + 'Se actualizan automáticamente cada lunes.';
    return;
  }

  const a = resumen.actual || {};
  const s = resumen.semana || {};

  document.getElementById('est-actualizado').textContent = resumen.actualizado_local || '—';

  document.getElementById('est-ahora').innerHTML = [
    tarjeta('Temperatura', `${nf(a.temp_c)} °C`,
      a.punto_rocio_c != null ? `punto de rocío ${nf(a.punto_rocio_c)} °C` : ''),
    tarjeta('Humedad', `${nf(a.humedad_pct, 0)} %`),
    tarjeta('Viento', `${nf(a.viento_kmh)} km/h`,
      a.viento_dir_grados != null ? `del ${rumbo(a.viento_dir_grados)}` : ''),
    tarjeta('Presión', `${nf(a.presion_hpa, 0)} hPa`),
  ].join('');

  document.getElementById('est-semana').innerHTML = [
    tarjeta('Máxima de la semana', `${nf(s.temp_max_c)} °C`),
    tarjeta('Mínima de la semana', `${nf(s.temp_min_c)} °C`),
    tarjeta('Humedad media', `${nf(s.humedad_media_pct, 0)} %`),
    tarjeta('Racha máxima', `${nf(s.viento_max_kmh)} km/h`,
      s.viento_predominante ? `predominante del ${s.viento_predominante}` : ''),
    tarjeta('Lluvia acumulada', `${nf(s.lluvia_total_mm)} mm`),
  ].join('');

  if (s.desde && s.hasta) {
    const enChileno = (f) => f.split('-').reverse().join('-');
    document.getElementById('est-periodo').textContent =
      `Del ${enChileno(s.desde)} al ${enChileno(s.hasta)} · ${s.registros} registros`;
  }

  const serie = semana.map((r) => ({
    t: new Date(r.ts_utc * 1000),
    temp: r.temp_c, hum: r.humedad_pct, viento: r.viento_kmh,
  }));

  graficoLinea('est-g-temp', {
    datos: serie.map((p) => ({ t: p.t, v: p.temp })),
    color: COLOR_AIRE, unidad: '°C',
  });
  graficoLinea('est-g-hum', {
    datos: serie.map((p) => ({ t: p.t, v: p.hum })),
    color: COLOR_AGUA, unidad: '%', decimales: 0, piso: 0, techo: 100,
  });
  graficoLinea('est-g-viento', {
    datos: serie.map((p) => ({ t: p.t, v: p.viento })),
    color: COLOR_AIRE, unidad: 'km/h', area: false, piso: 0,
  });
  graficoBarras('est-g-lluvia', {
    dias: (resumen.dias || []).map((d) => ({
      etiqueta: etiquetaDia(d.fecha), valor: d.lluvia_mm || 0,
    })),
    color: COLOR_AGUA, unidad: 'mm',
  });

  pintarTabla(resumen.dias || []);

  // Ficha técnica y descargas.
  const e = resumen.estacion || {};
  document.getElementById('est-ficha').innerHTML = `
    <dl>
      <dt>Estación</dt><dd>${e.nombre || '—'} · Davis WeatherLink Live</dd>
      <dt>Ubicación</dt><dd>${e.latitud != null ? `${nf(e.latitud, 4)}, ${nf(e.longitud, 4)}` : '—'}
        ${e.altitud_m != null ? ` · ${nf(e.altitud_m, 0)} m s.n.m.` : ''}</dd>
      <dt>Intervalo de registro</dt><dd>${e.intervalo_registro_min != null
      ? `${e.intervalo_registro_min} minutos` : '—'}</dd>
      <dt>Unidades</dt><dd>temperatura °C · humedad % · viento km/h · presión hPa · lluvia mm</dd>
    </dl>`;

  const descargas = (resumen.archivos_historico || []).map((f) =>
    `<li><a href="data/estacion/historico/${f}" download>${f.replace('.csv', '')}</a></li>`).join('');
  document.getElementById('est-descargas').innerHTML = descargas
    ? `<ul class="est-archivos">${descargas}</ul>`
    : '<p class="est-vacio">Aún no hay meses archivados.</p>';

  const botonTabla = document.getElementById('est-ver-tabla');
  const tabla = document.getElementById('est-tabla-envoltura');
  botonTabla.addEventListener('click', () => {
    const visible = !tabla.hidden;
    tabla.hidden = visible;
    botonTabla.setAttribute('aria-expanded', String(!visible));
    botonTabla.textContent = visible ? 'Ver los datos en tabla' : 'Ocultar la tabla';
  });
}

document.addEventListener('DOMContentLoaded', iniciar);
