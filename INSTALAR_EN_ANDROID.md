# 📱 Graham Screener — Instalación en Android

La app ya está publicada y se actualiza sola. **Dirección oficial:**

> ### https://faustomanjarrez.github.io/graham-screener/

---

## Instalar en tu teléfono (1 minuto)

1. Abre esa dirección en **Chrome en tu Android**.
2. Toca el menú **⋮** → **"Agregar a pantalla principal"** (o el aviso "Instalar app").
3. Listo: queda instalada con su ícono, pantalla completa y funciona sin internet.

---

## 🔄 Actualización de datos — automática

Un robot gratuito en la nube (GitHub Actions) corre el screener completo
**cada día hábil a las 22:30 UTC** (~4:30 pm en México, después del cierre de NYSE)
y publica los datos nuevos.

- La app los busca sola al abrirla con internet.
- También puedes forzar la búsqueda con el botón **🔄** (arriba a la derecha).
- Respaldo manual: corre `run_screener.bat` en tu PC y usa el botón **⬇ Importar**
  con el archivo `graham_screen.json`.

Puedes ver las corridas del robot en:
https://github.com/faustomanjarrez/graham-screener/actions

> ⚠️ Nota: Yahoo Finance a veces limita las consultas desde la nube. Si una corrida
> falla, se reintenta al siguiente día hábil automáticamente — no hay que hacer nada.

---

## 🏪 ¿Y si la quiero en Google Play?

1. Entra a **https://www.pwabuilder.com** y pega la dirección de la app.
2. Descarga el paquete Android (APK/AAB).
3. Se puede instalar directo en el teléfono o subir a Google Play
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
