# 🏪 Guía: Publicar Graham Screener en Google Play

Todo lo que necesitas está preparado. Los pasos marcados 👤 los haces tú
(requieren tu identidad o tu tarjeta); los marcados 🤖 me los puedes pedir a mí (Claude).

---

## Resumen del proceso

| # | Paso | Quién | Tiempo |
|---|------|-------|--------|
| 1 | Crear cuenta Buy Me a Coffee | 👤 | 5 min |
| 2 | Generar el paquete Android en PWABuilder | 👤 o 🤖 | 5 min |
| 3 | Publicar el archivo assetlinks.json | 🤖 | 2 min |
| 4 | Crear cuenta de desarrollador de Google Play ($25 USD) | 👤 | 15 min + días de verificación |
| 5 | Crear la app en Play Console y llenar la ficha | 👤 (con mis textos) | 30 min |
| 6 | Prueba cerrada: 12 testers × 14 días | 👤 | 14 días |
| 7 | Solicitar producción y publicar | 👤 | 1–7 días de revisión |

---

## Paso 1 — Ko-fi ✅ HECHO

Cuenta creada: **ko-fi.com/faustomanjarrez** — el botón de la app ya apunta ahí.
Pendiente solo: conectar tu método de cobro en Ko-fi (Settings → Payment options,
acepta PayPal o Stripe).

## Paso 2 — Generar el paquete Android (PWABuilder) 👤/🤖

1. Entra a **https://www.pwabuilder.com**
2. Pega la URL de la app: `https://faustomanjarrez.github.io/graham-screener/` y presiona **Start**.
3. Presiona **Package for stores** → **Android** → **Generate package**.
4. En el formulario usa exactamente:
   - **Package ID:** `io.github.faustomanjarrez.grahamscreener`
   - **App name:** `Graham Screener`
   - **Short name:** `Graham`
   - **Version:** `1.0.0` (deja el version code en 1)
   - **Signing key:** deja "Create new" (PWABuilder crea la llave de firma por ti)
5. Descarga el ZIP. Contiene:
   - `*.aab` → el archivo que se sube a Google Play
   - `signing.keystore` + `signing-key-info.txt` → **⚠️ GUÁRDALOS COMO ORO**
     (respáldalos en tu Drive/Dropbox; sin ellos no podrás actualizar la app nunca)
   - `assetlinks.json` → dáselo a Claude (Paso 3)

## Paso 3 — Publicar assetlinks.json 🤖

Este archivito le demuestra a Android que la app y el sitio web son tuyos
(sin él, la app instalada mostraría la barra del navegador).

Copia el `assetlinks.json` del ZIP a la carpeta del proyecto y dile a Claude:
*"publica el assetlinks"* — lo subirá a
`https://faustomanjarrez.github.io/graham-screener/.well-known/assetlinks.json`.

## Paso 4 — Cuenta de desarrollador 👤

1. Entra a **https://play.google.com/console/signup** con tu cuenta de Google.
2. Elige cuenta **personal**, paga los **$25 USD** (única vez).
3. Google pedirá verificar tu identidad (INE/pasaporte) — puede tardar 1–3 días.

## Paso 5 — Crear la app y llenar la ficha 👤

En Play Console → **Crear app**: nombre `Graham Screener`, idioma predeterminado
**Español (Latinoamérica)**, tipo **App**, **Gratis**.

### Textos listos para copiar y pegar

**Nombre (máx. 30):**
```
Graham Screener
```

**Descripción corta (máx. 80):**
```
Encuentra acciones subvaluadas del S&P 500 con el método de Benjamin Graham.
```

**Descripción completa:**
```
Graham Screener analiza ~845 acciones del S&P 500 y S&P MidCap 400 y te muestra cuáles cotizan por debajo de su valor intrínseco según el método clásico de Benjamin Graham, el padre de la inversión en valor y mentor de Warren Buffett.

SIN ANUNCIOS · SIN REGISTRO · SIN RECOLECCIÓN DE DATOS

🔍 SCREENER COMPLETO
• Graham Number, margen de seguridad y score de 4 estrellas para cada acción
• Filtros: margen ≥ 33 %, subvaluadas, 4 estrellas, por sector
• Filtros de calidad anti value-trap: deuda/capital < 100 % y pago de dividendo
• Alerta educativa cuando el P/E es sospechosamente bajo
• Búsqueda por ticker o nombre y 6 criterios de ordenamiento
• Ficha de análisis con P/E, P/B, EPS, BVPS y checklist de criterios Graham
• Datos actualizados automáticamente cada día hábil tras el cierre de NYSE

📋 WATCHLIST PERSONAL
• Guarda acciones del screener con un toque
• Agrega cualquier acción manualmente (incluida la BMV) y la app calcula su Graham Number al instante

🧭 PANORAMA DE MERCADO
• Indicador Buffett (Market Cap/GNP) con medidor visual
• Oportunidades por sector y Top 10 por margen de seguridad

📐 METODOLOGÍA TRANSPARENTE
• Graham Number = √(22.5 × EPS × BVPS)
• Toda la metodología explicada dentro de la app
• Código abierto: github.com/faustomanjarrez/graham-screener

✈️ FUNCIONA SIN CONEXIÓN
Los datos se guardan en tu teléfono; consulta tu análisis donde sea.

⚠️ Herramienta educativa de análisis cuantitativo. La información proviene de fuentes públicas y puede contener errores o retrasos. No constituye asesoría, recomendación ni oferta de inversión.
```

**Gráficos** (en la carpeta `play-store/`):
- Ícono 512×512: `icono-512.png`
- Gráfico de funciones 1024×500: `feature-graphic-1024x500.png`
- Capturas de pantalla: toma 4–8 desde tu propio teléfono (botón encendido + bajar
  volumen): screener, ficha de una acción, watchlist, mercado y alguna en modo oscuro.

### Formularios de política (respuestas listas)

| Formulario | Respuesta |
|---|---|
| **Política de privacidad** | `https://faustomanjarrez.github.io/graham-screener/privacidad.html` |
| **Seguridad de los datos** | "No se recopilan datos" y "No se comparten datos" en todo |
| **Anuncios** | No contiene anuncios |
| **Acceso a la app** | Todas las funciones disponibles sin acceso especial |
| **Clasificación de contenido (IARC)** | Categoría "Utilidad, productividad u otro" → responde No a todo → clasificación para todos |
| **Público objetivo** | 18 años o más (evita requisitos de apps infantiles) |
| **Funciones financieras** | "Mi app no ofrece ninguna de estas funciones" (solo muestra información educativa; no permite operar, ni prestar, ni gestionar dinero) |
| **App gubernamental** | No |
| **Categoría de la ficha** | Finanzas |

## Paso 6 — Prueba cerrada (el requisito molesto) 👤

Google exige a las cuentas personales nuevas una prueba cerrada antes de publicar:

1. En Play Console → **Pruebas → Prueba cerrada** → crea una lista de correos con
   **al menos 12 personas** con Android (familia, colegas, amigos).
2. Sube el archivo `.aab` (del Paso 2) a esa prueba.
3. Comparte el enlace de la prueba; cada tester lo abre e instala la app.
4. Los 12 deben mantenerla instalada **14 días** (no necesitan usarla a diario).
5. Cumplido el plazo, en la consola aparecerá **"Solicitar acceso a producción"**:
   responde el cuestionario (di que los testers son conocidos tuyos, que probaron
   screener/watchlist/actualización de datos, y que la app está lista).

> 💡 Consejo: manda un mensaje al grupo familiar/amigos: "Hice una app gratuita de
> análisis de acciones, ¿me ayudan instalándola 2 semanas?" — la gente suele decir que sí.

## Paso 7 — Publicar 👤

Aprobado el acceso a producción: **Producción → Crear versión** → sube el mismo
`.aab` → **Publicar**. La revisión de Google tarda de horas a ~7 días.

---

## Preguntas frecuentes

**¿Actualizar la app después?** Casi nunca hará falta: los DATOS se actualizan solos
todos los días sin tocar Play. Solo si cambiamos el diseño/funciones de la app haría
falta subir un nuevo `.aab` (Claude te lo prepara; se firma con el keystore que guardaste).

**¿Costos recurrentes?** Cero. GitHub gratis, Play $25 una única vez.

**¿Y si Google rechaza algo?** El motivo llega por correo; dile a Claude y lo corregimos.
