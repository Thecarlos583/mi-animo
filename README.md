# Mi Ánimo

App web personal (PWA) para marcar el ánimo y hacer una cosa pequeña a la vez. HTML, CSS y JS puro, sin build. Funciona sin internet, y todos los datos se guardan solo en el teléfono (localStorage). Nada se envía a ningún servidor.

## Estructura

```
index.html      pantalla única
styles.css      diseño (modo claro y oscuro)
app.js          lógica: ánimo, "Una cosa ahora", 10 minutos, día difícil, patrones, plan de apoyo, recordatorio, respaldo
sw.js           caché sin internet + recordatorio diario
manifest.json   datos de la app instalable
icons/          ícono (SVG + PNG)
```

Las sugerencias de "Una cosa ahora" están en `SUGERENCIAS`, al principio de `app.js`.

Después de cambiar cualquier archivo, sube `VERSION` en `sw.js` (por ejemplo, `mi-animo-v2`) para que el teléfono descargue lo nuevo.

## Probar en la PC

```
python -m http.server 8790
```
Abre `http://localhost:8790`.
