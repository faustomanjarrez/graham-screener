# 📱 Graham Screener — Instalación en Android

La carpeta **`app/`** contiene la aplicación completa (PWA — Progressive Web App).
Se instala en Android como una app normal: con su propio ícono, pantalla completa
y funcionamiento sin conexión.

---

## Opción A — Publicar en Netlify (recomendada, ~2 minutos)

1. Entra a **https://app.netlify.com/drop** (crea una cuenta gratis si no tienes).
2. Arrastra la carpeta **`app`** completa a la página.
3. Netlify te da una dirección, por ejemplo: `https://graham-screener.netlify.app`.
4. Abre esa dirección en **Chrome en tu teléfono Android**.
5. Toca el menú **⋮** → **"Agregar a pantalla principal"** (o el aviso "Instalar app").
6. Listo: la app queda instalada con su ícono y funciona sin internet.

> 💡 En Netlify puedes cambiar el nombre del sitio en *Site settings → Change site name*.

## Opción B — GitHub Pages

Si usas GitHub: sube la carpeta `app/` a un repositorio, activa **Settings →
Pages** y abre la URL resultante en Chrome Android. El paso de instalación es
el mismo (menú ⋮ → Agregar a pantalla principal).

---

## 🔄 Cómo actualizar los datos de las acciones

Los datos vienen incluidos en la app (845 acciones del S&P 500 + MidCap 400).
Para refrescarlos hay dos caminos:

**Camino 1 — Importar desde el teléfono (más fácil):**
1. En tu PC corre `run_screener.bat` (tarda ~20 min).
2. Envíate el archivo `graham_screen.json` al teléfono (correo, Drive, WhatsApp…).
3. En la app toca el botón **⬇** (arriba a la derecha) y elige el archivo.
   Los datos quedan guardados en el teléfono, incluso sin conexión.

**Camino 2 — Volver a publicar:**
1. Corre `run_screener.bat` — ahora también actualiza `app/data.js` automáticamente.
2. Vuelve a arrastrar la carpeta `app` a Netlify Drop (misma cuenta = misma URL).
3. En el teléfono, abre la app dos veces (la segunda carga los datos nuevos).

---

## 🏪 ¿Y si la quiero en Google Play?

Una PWA se convierte en un archivo instalable (APK/AAB) sin programar nada:

1. Publica la app (Opción A o B).
2. Entra a **https://www.pwabuilder.com**, pega tu URL y descarga el paquete Android.
3. Ese paquete se puede instalar directo en el teléfono o subir a Google Play
   (requiere cuenta de desarrollador de Google, USD $25 una sola vez).

---

## Contenido de la app

| Pestaña | Qué hace |
|---|---|
| 🔍 **Screener** | 845 acciones con filtros (MoS ≥ 33%, subvaluadas, 4★), búsqueda, sectores y orden. Toca una acción para ver su análisis completo. |
| 📋 **Watchlist** | Guarda acciones del screener (botón 🔖) o agrega cualquier acción manualmente (calcula Graham # al instante). |
| 🧭 **Mercado** | Indicador Buffett con medidor visual, oportunidades por sector y Top 10 por margen de seguridad. |
| 📐 **Guía** | Metodología de Benjamin Graham, score de estrellas y cómo actualizar datos. |

Extras: modo claro/oscuro, funciona 100% sin conexión, y los tickers con datos
poco confiables (ej. BRK-B) aparecen marcados como "⚠ Dato dudoso".

> ⚠️ Herramienta educativa de análisis cuantitativo — no constituye asesoría de inversión.
