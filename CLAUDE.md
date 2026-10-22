# Entreno escalada

App web instalable (PWA) con el calentamiento de clase y la sesión de resistencia por libre del grupo
de escalada. La comparte Julia con todo el grupo; cada persona la usa en su móvil, también sin conexión.
Todo en español.

## Estructura

- `public/` es lo que se publica (Cloudflare Pages, sin paso de compilación, directorio de salida `public`).
  - `index.html`, `styles.css`, `app.js`: la app, en JavaScript sin dependencias ni compilación.
  - `figuras.js`: secuencias ilustradas de los ejercicios (figuras de palitos en SVG, dibujo propio).
  - `data/entreno.json`: todo el contenido del entreno (pasos, textos, descansos, vídeos, pautas).
  - `img/`: fotos propias de los ejercicios (opcional).
  - `sw.js`: service worker. Guarda la app (caché primero) y el contenido e imágenes (red primero, caché sin conexión).

## Cuando llegue una versión nueva del PDF del entrenador

Editar solo `public/data/entreno.json` y subir `version` (fecha). Cada paso admite:
`id` (permanente: el progreso del día se guarda por id), `titulo`, `texto`, `lista`, `claves`, `aviso`, `nota`,
`descanso` / `descanso2` (segundos), `modo` (textos `cuerda` / `bloque`), `secuencias` (ids de `figuras.js`),
`fotos` (`[{ "src": "img/x.jpg", "pie": "..." }]`), `videos` (`[{ "yt": "<id de YouTube>", "titulo", "nota" }]`),
`widget` (`test` o `series`), `ir` (pestaña a la que enlaza). En los textos, `**así**` va en negrita.
Fiel al PDF: no añadir ejercicios ni pautas que el entrenador no haya puesto.

## Fotos propias

Mejor fotos del propio entrenador o del grupo (con su permiso) que fotos de internet, que tienen derechos.
Guardarlas en `public/img/` (JPG de ~1000 px de ancho, menos de 200 KB) y añadirlas al paso con `fotos`.
Si un paso tiene `fotos` y `secuencias`, se ven las dos.

## Cambiar la app

- Al cambiar `index.html`, `styles.css`, `app.js`, `figuras.js` o los iconos, subir `APP_VERSION` en `public/sw.js`;
  si no, los móviles seguirán usando la copia guardada. La app avisa de la versión nueva con «Actualizar».
- El estado vive en `localStorage['entreno.v1']` (pasos de hoy, modo, tiempo de referencia, registro).
  Si cambia su forma, migrar en `cargar()`; nunca perder el registro.
- Sin dependencias externas ni fuentes web: tiene que funcionar sin conexión en el rocódromo.
- Probar a ancho de iPhone (390 px), en claro y en oscuro.
- Commit y push a `main`: Cloudflare publica solo.
