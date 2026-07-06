# 📈 Graham Screener

Screener de acciones subvaluadas del **S&P 500 + S&P MidCap 400** según el método
de Benjamin Graham (Graham Number, margen de seguridad y score de 4 estrellas).

**📱 App (instalable en Android):** https://faustomanjarrez.github.io/graham-screener/

## Cómo funciona

- **`app/`** — la aplicación (PWA). Se instala desde Chrome en Android con
  "Agregar a pantalla principal". Funciona sin conexión.
- **`fetch_graham.py`** — descarga ~845 acciones de Yahoo Finance y calcula las
  métricas Graham. Corre automáticamente en GitHub Actions cada día hábil a las
  22:30 UTC (después del cierre de NYSE) y publica los datos nuevos.
- **`.github/workflows/update-data.yml`** — la automatización: corre el screener,
  guarda `app/data.js` y vuelve a publicar la app en GitHub Pages.

También se puede correr localmente con `run_screener.bat` (Windows).

> ⚠️ Herramienta educativa de análisis cuantitativo — no constituye asesoría de inversión.
