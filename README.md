# Museo Archipiélago de Humboldt

Sitio web del **Museo Archipiélago de Humboldt**, ubicado en Chungungo, comuna de La Higuera, Región de Coquimbo, Chile. El museo une el arte, la ciencia y la comunidad para proteger uno de los ecosistemas marino-costeros más biodiversos del Pacífico Sur.

🌐 **Sitio en producción:** [museoarchipielagodehumboldt.cl](https://museoarchipielagodehumboldt.cl)

## Acerca del sitio

Es una página única (single-page) estática con secciones ancladas en la navegación:

- **Importancia** — por qué el Archipiélago de Humboldt es relevante para Chile y el mundo
- **Arte y Conservación** — cómo el arte impulsa la conservación del Área Marítima Protegida
- **Biodiversidad** — galería de flora y fauna (pingüinos, delfines, ballenas, chungungos)
- **Impacto** — alcance en educación, comunidad y turismo
- **Actividades** — experiencias que ofrece el museo
- **Visita** — cómo llegar (con mapa) y contacto

## Tecnología

Sitio estático sin framework ni proceso de compilación:

- HTML5 (`index.html`)
- CSS con variables personalizadas (`css/styles.css`)
- JavaScript puro (`js/main.js`) para la galería tipo *lightbox* y el resaltado de navegación al hacer scroll
- Tipografía [Open Sans](https://fonts.google.com/specimen/Open+Sans) (Google Fonts), según la ficha técnica de marca
- Imágenes en formato `.webp`

## Estructura

```
.
├── index.html        # Página completa con todas las secciones
├── css/styles.css    # Estilos (tokens de diseño en :root)
├── js/main.js        # Lightbox de la galería y scroll-spy del menú
├── images/           # Recursos en .webp
└── favicon.ico
```

## Ejecutar localmente

No requiere instalación ni compilación. Abre `index.html` en el navegador, o sirve la carpeta para que las rutas absolutas (p. ej. `/favicon.ico`) se resuelvan correctamente:

```bash
python3 -m http.server 8000
# Abre http://localhost:8000
```

## Estación meteorológica

La página `estacion.html` publica los datos de la estación Davis WeatherLink Live
instalada en el terreno del museo: temperatura, humedad, punto de rocío, viento,
presión y lluvia. Muestra la última semana en gráficos y deja el registro completo
en archivos CSV descargables, uno por mes.

Los datos se actualizan solos: la rutina `.github/workflows/estacion.yml` corre
todos los lunes, consulta la API v2 de WeatherLink con `scripts/estacion_fetch.py`
y guarda lo nuevo en `data/estacion/`. También se puede correr a mano desde la
pestaña **Actions** del repositorio (útil para recuperar más historia: el campo
"días" acepta, por ejemplo, 90).

Para que funcione hay que cargar tres *secrets* en el repositorio
(Settings → Secrets and variables → Actions):

| Secret | Qué es |
|---|---|
| `WEATHERLINK_API_KEY` | clave de la API v2, se genera en weatherlink.com/account |
| `WEATHERLINK_API_SECRET` | el secreto que acompaña a esa clave |
| `WEATHERLINK_STATION_ID` | opcional; solo si la cuenta tiene más de una estación |

Las credenciales nunca van en el código ni en los archivos del sitio: el script
las lee del entorno. Si el secreto se filtra, hay que regenerarlo desde la misma
página de cuenta de WeatherLink y actualizar el *secret*.

La API entrega los valores en unidades imperiales; el script los convierte a
grados Celsius, km/h y hPa. Los datos se publican tal como los entrega la
estación, sin corregir ni rellenar huecos.

## Contacto

📍 Chungungo, comuna de La Higuera, Región de Coquimbo, Chile
✉️ [contacto@museoarchipielagodehumboldt.cl](mailto:contacto@museoarchipielagodehumboldt.cl)
📷 [@museohumboldt](https://www.instagram.com/museohumboldt)
