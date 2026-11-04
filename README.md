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

## Contacto

📍 Chungungo, comuna de La Higuera, Región de Coquimbo, Chile
✉️ [contacto@museoarchipielagodehumboldt.cl](mailto:contacto@museoarchipielagodehumboldt.cl)
📷 [@museohumboldt](https://www.instagram.com/museohumboldt)
