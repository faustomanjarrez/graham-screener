#!/usr/bin/env python3
"""
Benjamin Graham Screener — S&P 500 + S&P MidCap 400
=====================================================
Dynamically fetches ticker lists from Wikipedia (primary).
Falls back to comprehensive hardcoded lists (~850 tickers) if Wikipedia fails.
Calculates Graham Number, Margin of Safety, and 4-star score for each.
Saves results to graham_screen.json.

Runtime estimate: ~18-25 minutes for ~850 stocks.
If interrupted, re-run — completed stocks are cached and skipped automatically.

Run:
    python fetch_graham.py          <- full run / resume from cache
    python fetch_graham.py --fresh  <- discard cache and start over
"""

import json
import os
import sys
import time
import ssl
import warnings
import argparse
import traceback
from datetime import datetime

warnings.filterwarnings("ignore")
ssl._create_default_https_context = ssl._create_unverified_context

try:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except Exception:
    pass

try:
    import yfinance as yf
    import requests
    import pandas as pd
except ImportError:
    print("⚠️  Instalando dependencias...")
    os.system(f"{sys.executable} -m pip install yfinance pandas requests --quiet")
    import yfinance as yf
    import requests
    import pandas as pd

_session = requests.Session()
_session.verify = False
_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
})

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "graham_screen.json")
CACHE_FILE  = os.path.join(SCRIPT_DIR, ".graham_cache.jsonl")   # JSON Lines format
DONE_FILE   = os.path.join(SCRIPT_DIR, "graham_run.done")
LOG_FILE    = os.path.join(SCRIPT_DIR, "graham_errors.log")
DELAY       = 1.2
SAVE_EVERY  = 25   # kept for ETA display only


# ── Logger ────────────────────────────────────────────────────────────────
def log_error(ticker, context, exc):
    """Append an error entry to graham_errors.log."""
    ts  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"[{ts}] {ticker:<8}  [{context}]  {type(exc).__name__}: {exc}\n"
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg)
    except Exception:
        pass  # never let logging break the main loop

# ── Complete S&P 500 fallback list (~470 tickers) ─────────────────────────
SP500_FALLBACK = [
    # Technology
    "AAPL","MSFT","NVDA","AVGO","AMD","QCOM","TXN","AMAT","ADI","KLAC",
    "SNPS","CDNS","MCHP","FTNT","APH","CSCO","IBM","CRM","ADBE","INTU",
    "NOW","ORCL","ACN","PANW","CRWD","INTC","MU","ANSS","CTSH","GDDY",
    "GEN","IT","KEYS","LDOS","NTAP","ON","PLTR","PTC","ROP","TDY",
    "VRSN","WDC","ZBRA","HPQ","HPE","GLW","STX","AKAM","CDW","FFIV",
    "GRMN","JKHY","MPWR","LRCX","NXPI","TER","EPAM","ENPH",
    # Communication Services
    "GOOGL","GOOG","META","NFLX","T","VZ","TMUS","DIS","CMCSA","CHTR",
    "FOXA","FOX","LYV","NWSA","NWS","OMC","PARA","WBD","IPG","MTCH",
    # Consumer Discretionary
    "AMZN","TSLA","HD","MCD","NKE","TJX","LOW","BKNG","SBUX","YUM",
    "MAR","HLT","GM","F","ORLY","AZO","ROST","BBY","DHI","LEN",
    "NVR","PHM","APTV","BWA","CMI","GPC","LKQ","MGM","CCL","RCL",
    "EXPE","ETSY","EBAY","HAS","LVS","PVH","RL","TPR","UAL","DAL",
    "AAL","ULTA","DKNG","DRI","NCLH","POOL","SNA","MHK","WH",
    # Consumer Staples
    "WMT","COST","PG","KO","PEP","MO","PM","MDLZ","CL","GIS",
    "K","KHC","KR","SYY","MKC","CHD","CAG","HRL","HSY","SJM",
    "TAP","TSN","MNST","WBA","EL","CLX","CPB","BF-B",
    # Healthcare
    "LLY","UNH","JNJ","MRK","ABBV","TMO","DHR","ABT","AMGN","GILD",
    "SYK","ISRG","REGN","VRTX","CI","HUM","BDX","EW","ZTS","ELV",
    "A","BAX","BIIB","BMY","BSX","CAH","CNC","COO","CRL","DXCM",
    "GEHC","HCA","HOLX","HSIC","IQV","MCK","MDT","MOH","MRNA","MTD",
    "PFE","PODD","RMD","RVTY","STE","TFX","UHS","WAT","WST","ZBH",
    "CVS","SOLV","MCK","VTRS",
    # Financials
    "BRK-B","JPM","BAC","WFC","GS","MS","BLK","SPGI","MCO","AXP",
    "SCHW","USB","PNC","CME","CB","MMC","AON","FIS","AFL","AIG",
    "AIZ","AJG","ALL","AMP","BEN","BK","BRO","CBOE","CFG","COF",
    "DFS","FITB","GL","HBAN","ICE","IVZ","KEY","L","MET","MTB",
    "NTRS","PFG","PRU","RF","RJF","STT","SYF","TRV","WTW","ACGL",
    "HIG","LNC","RE","RGA","SFG",
    # Real Estate
    "AMT","PLD","CCI","DLR","EQIX","PSA","WELL","EQR","AVB","SPG",
    "O","VICI","ARE","BXP","EXR","FRT","HST","IRM","KIM","MAA",
    "NNN","REG","SBA","UDR","VNO","WY","SBAC","ESS","ELS","INVH",
    # Industrials
    "RTX","GE","DE","MMM","NSC","ITW","EMR","FDX","HON","UPS",
    "LMT","NOC","GD","BA","LHX","HWM","HII","TDG","TXT","URI",
    "CARR","OTIS","CSX","UNP","FTV","GNRC","GWW","IR","JBHT","MAS",
    "NDSN","PH","PCAR","PWR","ROK","WAB","CTAS","RSG","WM","EXPD",
    "FAST","J","LUV","RRX","TT","VLTO","HUBB","SWK","EME","STLD",
    "AXON","BR","EFX","PAYC","VRSK",
    # Energy
    "XOM","CVX","EOG","SLB","COP","MPC","PSX","VLO","OXY","HES",
    "DVN","FANG","APA","BKR","HAL","KMI","LNG","MRO","OKE","TRGP",
    "WMB","CVI","HF",
    # Utilities
    "NEE","DUK","SO","AES","AEE","AEP","AWK","CNP","CMS","D",
    "DTE","ED","EIX","ES","ETR","EVRG","EXC","FE","LNT","NI",
    "NRG","PEG","PPL","SRE","WEC","XEL","ATO",
    # Materials
    "LIN","APD","SHW","FCX","NEM","ECL","DD","CTVA","CF","CE",
    "ALB","EMN","FMC","IFF","IP","LYB","MOS","NUE","PKG","PPG",
    "VMC","MLM","AVY","SEE","RPM",
]

# ── Complete S&P MidCap 400 fallback list (~380 tickers) ──────────────────
SP400_FALLBACK = [
    # Industrials / Defense
    "ACM","AIR","AL","ALSN","AM","AMKR","ATI","ARMK","ARW","ASTE",
    "ATR","AXS","BC","BCC","BCO","BECN","BR","BWA","CAR","CACI",
    "CAE","CACC","CDAY","CE","CHE","CHX","CHRW","CIR","CLH","CLW",
    "CMC","CNA","CNO","CNX","COHU","COR","CRS","CW","CWT",
    "DINO","DIOD","DKS","DLB","DNOW","DPZ","DV","DVA","DY",
    "EAT","EFC","EHC","ELF","EME","ENOV","ENV","EPAM","ESE","ESNT",
    "EXP","EXPO","EYE","FAF","FBP","FHN","FL","FLR","FNB","FNF",
    "FR","FULT","G","GFF","GHM","GLPI","GME","GOLF","GPK","GPOR","GXO",
    "HAE","HBI","HCI","HHH","HII","HIW","HLI","HMST","HNI","HOMB",
    "HP","HRB","HRI","HTH","HWC","HXL","IAC","IDCC","IDA","IEX",
    "INGR","IPAR","IPGP","IRM","ITRI","JBLU","JHG","JKHY","JWN",
    "KAI","KBH","KD","KMT","KNF","KNX","KSS","LANC","LDI","LEA",
    "LNC","LNW","LNTH","LPX","LSTR","LUV","LW","M",
    "MAN","MAT","MBWM","MCY","MDU","MHK","MMS","MODG","MTG","MTH",
    "MTN","MTZ","MUR","NAVI","NBR","NBTB","NJR","NNN","NOG","NVT",
    "NXST","OGS","OHI","OLN","OLLI","OVV","OXY","PATK","PB","PCH",
    "PDCO","PEB","PENN","PII","PKG","PNM","POST","PRI","PRK",
    "RCM","RDN","RGA","RGEN","RHI","RIG","RLI","RLJ","RNR","RPM",
    "RRX","RS","RWT","SAIC","SCI","SFM","SGH","SKX","SLM","SM",
    "SMG","SN","SNV","SPB","SR","SSNC","STE","STL","STLD",
    "SUM","SWK","SWKS","SXT","SYF","TALO","TDC","TDS","TFX","THC",
    "THO","TNL","TRMK","TRMB","TRN","TTC","TYL","UFP","UGI",
    "UMBF","UNM","URBN","VAC","VFC","VICI","VLY","VMC",
    "VSH","VVV","WAL","WAT","WBS","WDFC","WEX","WHR","WMS",
    "WOR","WPC","WRB","WRK","WSM","WSO","X","XPO","XRAY",
    "XYL","ZION",
    # Additional MidCap 400 members
    "ABCB","ACIW","AEL","AEO","AGCO","AIN","AIT","AKR",
    "ALKS","AMG","AN","ANF","APAM","APLE","ATUS","AVT","AWR",
    "AXE","BHF","BJK","BJRI","BOOT","BRC","BRX","BURL",
    "CAE","CASY","CBSH","CBT","CCOI","CDK","CGNX","CINF",
    "CLB","CNK","COLB","CR","CRUS","CTLT","CVLT","CWT",
    "DAVA","DBD","DCI","DCO","DIOD","DLX","DV","DXPE",
    "EAT","EBS","EG","EME","ENS","ENVA","EPIQ","ESCA",
    "EWBC","EXL","EXPO","EXTR","EYE","FCF","FCNCA","FIBK",
    "FIVE","FNF","FOR","FORM","FR","FRME","FULT","GBCI",
    "GEO","GNTX","GPRE","GTES","HBI","HGV","HIBB","HOLX",
    "HOPE","HQY","HSY","HWM","IBP","ICUI","IDCC","IIIN",
    "INDB","INVA","IVZ","JELD","JHG","JJSF","JLL","JWN",
    "KAR","KBAL","KFY","KMPR","KNF","KRC","LBAI","LKFN",
    "LMB","LTC","LXFR","MAN","MATX","MAX","MBUU","MEDP",
    "MELI","MGEE","MGM","MHO","MMS","MNRO","MODV","MSA",
    "MSM","MTG","MWA","NATI","NAVB","NBT","NBTB","NEO",
    "NFG","NHI","NHC","NJR","NKTR","NNN","NOG","NUS",
    "NVE","NVST","NWL","NXRT","OFG","OGE","OGS","OHI",
    "OII","OKE","OLN","OMER","OMF","ONB","OPK","ORCL",
    "ORI","OSIS","OTTR","OUT","PACB","PAGP","PAMT","PATK",
    "PAYA","PBCT","PBPB","PCH","PEB","PENN","PLAB","PLAY",
    "PLXS","PLUS","PNM","PNFP","POST","PPBI","PRGO","PRIM",
    "PRKS","PVH","PVTL","QCRH","R","RAMP","RBC","RCII",
    "RCUS","RDN","REYN","RGA","RGP","RIG","RLJ","RMBS",
    "RNR","ROCK","ROG","RPM","RRX","RS","RUSHA","RWT",
    "SAFE","SAIA","SCI","SEIC","SFBS","SFNC","SGH","SIGI",
    "SJW","SKT","SLM","SLVM","SM","SMTC","SN","SNV",
    "SON","SPSC","STAG","STRA","STRL","SUM","SUPN","SXT",
    "SYBT","TALO","TBK","TCBK","TFIN","THG","TNET","TOWN",
    "TPH","TRMK","TRN","TROW","TRQ","TRST","TTC","TWI",
    "TXRH","TYL","UBSI","UCBI","UFI","UFPI","UGI","ULCC",
    "UMBF","UMH","UNFI","UNM","UNVR","URBN","USPH","UTL",
    "VAC","VCEL","VFC","VHC","VIAV","VLY","VMI","VSH",
    "VSCO","VVV","WAL","WASH","WBS","WDFC","WEX","WHR",
    "WMS","WOLF","WOR","WRB","WSBC","WSFS","WSR","WTFC",
    "WWD","X","XNCR","XPO","XRAY","XYL","Y","YELP","ZION",
]


# ── Ticker list fetching ──────────────────────────────────────────────────
def fetch_ticker_list():
    """Fetch S&P 500 + S&P MidCap 400 from Wikipedia. Falls back to full hardcoded lists."""
    tickers = []
    sources = [
        (
            "S&P 500",
            "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
            ["Symbol", "Ticker", "Ticker symbol"],
            SP500_FALLBACK,
        ),
        (
            "S&P MidCap 400",
            "https://en.wikipedia.org/wiki/List_of_S%26P_400_companies",
            ["Ticker symbol", "Symbol", "Ticker"],
            SP400_FALLBACK,
        ),
    ]

    for name, url, col_hints, fallback in sources:
        try:
            resp = _session.get(url, timeout=20)
            resp.raise_for_status()
            tables = pd.read_html(resp.text)
            found = False
            for tbl in tables:
                for col in col_hints:
                    if col in tbl.columns:
                        raw  = tbl[col].dropna().astype(str).tolist()
                        tkrs = [t.replace(".", "-").strip() for t in raw
                                if t and t != "nan" and 1 < len(t) <= 12]
                        tickers.extend(tkrs)
                        print(f"  ✅  {name}: {len(tkrs)} tickers (Wikipedia)")
                        found = True
                        break
                if found:
                    break
            if not found:
                raise ValueError("Columna de tickers no encontrada")
        except Exception as exc:
            print(f"  ⚠️   {name}: usando lista interna — {len(fallback)} tickers ({exc})")
            tickers.extend(fallback)

    # Deduplicate preserving order
    seen, result = set(), []
    for t in tickers:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


# ── Graham calculations ───────────────────────────────────────────────────
def graham_number(eps, bvps):
    if eps is None or bvps is None or eps <= 0 or bvps <= 0:
        return None
    return (22.5 * eps * bvps) ** 0.5


def margin_of_safety(price, gn):
    if not gn or not price or gn == 0:
        return None
    return ((gn - price) / gn) * 100


def graham_stars(price, gn, eps, bvps):
    if not gn or not price:
        return 0
    score = 0
    if price < gn:
        score += 1
    pe = price / eps   if eps  and eps  > 0 else None
    pb = price / bvps  if bvps and bvps > 0 else None
    if pe and pe <= 15:                   score += 1
    if pb and pb <= 1.5:                  score += 1
    if pe and pb and pe * pb <= 22.5:     score += 1
    return score


# ── Single stock fetch ────────────────────────────────────────────────────
def fetch_stock(ticker, max_retries=4):
    for attempt in range(max_retries):
        try:
            t    = yf.Ticker(ticker, session=_session)
            info = t.info
            if not info or len(info) <= 2:
                raise ValueError("Respuesta vacía — posible rate limit")

            price  = info.get("currentPrice") or info.get("regularMarketPrice")
            eps    = info.get("trailingEps")
            bvps   = info.get("bookValue")
            pe     = info.get("trailingPE")
            pb     = info.get("priceToBook")
            mcap   = info.get("marketCap")
            name   = (info.get("longName") or info.get("shortName") or ticker)[:40]
            sector = info.get("sector") or info.get("industry") or "N/A"

            gn    = graham_number(eps, bvps)
            mos   = margin_of_safety(price, gn) if price and gn else None
            stars = graham_stars(price, gn, eps, bvps)

            return {
                "ticker":     ticker,
                "name":       name,
                "sector":     sector,
                "currency":   info.get("currency", "USD"),
                "price":      round(price, 2) if price else None,
                "eps":        round(eps,   2) if eps   else None,
                "bvps":       round(bvps,  2) if bvps  else None,
                "pe":         round(pe,    1) if pe    else None,
                "pb":         round(pb,    2) if pb    else None,
                "market_cap": mcap,
                "graham_num": round(gn,  2)  if gn    else None,
                "mos":        round(mos,  1)  if mos is not None else None,
                "stars":      stars,
                "valid":      gn is not None and price is not None,
            }

        except Exception as exc:
            err     = str(exc).lower()
            is_rate = any(k in err for k in ["429","rate","too many","empty","redirect"])
            if is_rate and attempt < max_retries - 1:
                wait = 90 * (attempt + 1)
                print(f"\n  ⏳  Rate limit — esperando {wait}s…", flush=True)
                log_error(ticker, f"rate_limit attempt {attempt+1}", exc)
                time.sleep(wait)
            elif attempt < max_retries - 1:
                time.sleep(5)
            else:
                log_error(ticker, "fetch_failed", exc)
                return {"ticker": ticker, "valid": False, "error": str(exc)[:60]}


# ── Cache helpers (JSONL format — one stock per line, tiny writes) ────────
def load_cache():
    """Read .graham_cache.jsonl — each line is {"TICKER": {...data...}}."""
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            cache.update(json.loads(line))
                        except json.JSONDecodeError:
                            pass   # skip corrupted lines
        except Exception:
            pass
    return cache


def append_cache(ticker, data):
    """Append a single stock to the JSONL cache — one tiny write per stock."""
    try:
        with open(CACHE_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps({ticker: data}, ensure_ascii=False) + "\n")
            f.flush()
            os.fsync(f.fileno())
    except Exception as exc:
        log_error(ticker, "cache_append", exc)


def write_local_html(cache, tickers):
    """
    Write graham_local.html — fully self-contained dashboard, no external files.
    Uses tiny appends (one stock per write) to avoid the Windows 90KB write limit.
    Templates: .graham_html_header.txt / .graham_html_footer.txt
    """
    header_path = os.path.join(SCRIPT_DIR, ".graham_html_header.txt")
    footer_path = os.path.join(SCRIPT_DIR, ".graham_html_footer.txt")
    out_path    = os.path.join(SCRIPT_DIR, "graham_local.html")

    if not os.path.exists(header_path) or not os.path.exists(footer_path):
        print("  ⚠️  Templates HTML no encontrados — omitiendo graham_local.html")
        return

    results = [cache[t] for t in tickers if t in cache]
    valid   = sorted(
        [r for r in results if r.get("valid") and r.get("mos") is not None],
        key=lambda x: x.get("mos", -9999), reverse=True
    )
    invalid = [r for r in results if not r.get("valid") or r.get("mos") is None]
    uv  = [r for r in valid if (r.get("mos") or 0) >= 0]
    sb  = [r for r in valid if (r.get("mos") or 0) >= 33]
    stocks = valid + invalid

    def _w(content, mode):
        with open(out_path, mode, encoding="utf-8") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

    try:
        with open(header_path, encoding="utf-8") as f:
            header = f.read()
        with open(footer_path, encoding="utf-8") as f:
            footer = f.read()

        meta = (
            f'"updated":"{datetime.now().isoformat()}",'
            f'"source":"Yahoo Finance via yfinance (S&P 500 + S&P MidCap 400)",'
            f'"complete":true,'
            f'"total":{len(results)},'
            f'"valid":{len(valid)},'
            f'"undervalued":{len(uv)},'
            f'"strong_buy":{len(sb)},'
            f'"stocks":[\n'
        )
        # 1) Header + meta (~12KB)
        _w(header + meta, "w")
        # 2) One stock per append (~250 bytes)
        for i, stock in enumerate(stocks):
            comma = "" if i == len(stocks) - 1 else ","
            _w(json.dumps(stock, ensure_ascii=False) + comma + "\n", "a")
        # 3) Footer (~12KB)
        _w("]};" + footer, "a")

        size = os.path.getsize(out_path)
        print(f"  🌐  graham_local.html generado — {size:,} bytes ({len(stocks)} acciones)")
    except Exception as exc:
        log_error("LOCAL_HTML", "write", exc)
        print(f"  ⚠️  Error generando graham_local.html: {exc}")


def write_data_js(cache, tickers):
    """
    Write graham_data.js via tiny appends (one line per stock).
    The HTML dashboard loads this file automatically — no Claude needed.
    """
    js_path = os.path.join(SCRIPT_DIR, "graham_data.js")

    results = [cache[t] for t in tickers if t in cache]
    valid   = sorted(
        [r for r in results if r.get("valid") and r.get("mos") is not None],
        key=lambda x: x.get("mos", -9999), reverse=True
    )
    invalid = [r for r in results if not r.get("valid") or r.get("mos") is None]
    uv  = [r for r in valid if (r.get("mos") or 0) >= 0]
    sb  = [r for r in valid if (r.get("mos") or 0) >= 33]
    stocks = valid + invalid

    def _tiny_write(path, content, mode="a"):
        with open(path, mode, encoding="utf-8") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

    try:
        # Header (one write, tiny)
        header = (
            f'// Benjamin Graham Screener — auto-generated {datetime.now().strftime("%Y-%m-%d %H:%M")}\n'
            f'// Abre graham_dashboard.html en tu navegador para ver los datos actualizados.\n'
            f'var SCREENER={{'
            f'"updated":"{datetime.now().isoformat()}",'
            f'"source":"Yahoo Finance via yfinance (S&P 500 + S&P MidCap 400)",'
            f'"complete":true,'
            f'"total":{len(results)},'
            f'"valid":{len(valid)},'
            f'"undervalued":{len(uv)},'
            f'"strong_buy":{len(sb)},'
            f'"stocks":[\n'
        )
        _tiny_write(js_path, header, mode="w")

        # One stock per append (~200 bytes each)
        for i, stock in enumerate(stocks):
            comma = "" if i == len(stocks) - 1 else ","
            _tiny_write(js_path, json.dumps(stock, ensure_ascii=False) + comma + "\n")

        # Footer
        _tiny_write(js_path, "]};\n")
        print(f"  📄  graham_data.js generado — {len(stocks)} acciones")

        # Copia para la app Android (PWA) — carpeta app/
        app_data = os.path.join(SCRIPT_DIR, "app", "data.js")
        if os.path.isdir(os.path.dirname(app_data)):
            import shutil
            shutil.copyfile(js_path, app_data)
            print(f"  📱  app/data.js actualizado (PWA Android)")
    except Exception as exc:
        log_error("DATA_JS", "write", exc)
        print(f"  ⚠️  Error generando graham_data.js: {exc}")


def write_screen_json(cache, tickers):
    """Write graham_screen.json — mismo contenido que graham_data.js en JSON puro."""
    results = [cache[t] for t in tickers if t in cache]
    valid   = sorted(
        [r for r in results if r.get("valid") and r.get("mos") is not None],
        key=lambda x: x.get("mos", -9999), reverse=True
    )
    invalid = [r for r in results if not r.get("valid") or r.get("mos") is None]
    uv = [r for r in valid if (r.get("mos") or 0) >= 0]
    sb = [r for r in valid if (r.get("mos") or 0) >= 33]
    payload = {
        "updated":     datetime.now().isoformat(),
        "source":      "Yahoo Finance via yfinance (S&P 500 + S&P MidCap 400)",
        "complete":    True,
        "total":       len(results),
        "valid":       len(valid),
        "undervalued": len(uv),
        "strong_buy":  len(sb),
        "stocks":      valid + invalid,
    }
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
        print(f"  📊  graham_screen.json generado — {len(payload['stocks'])} acciones")
    except Exception as exc:
        log_error("SCREEN_JSON", "write", exc)


def fmt_mcap(v):
    if not v:      return "N/A"
    if v >= 1e12:  return f"${v/1e12:.1f}T"
    if v >= 1e9:   return f"${v/1e9:.1f}B"
    return f"${v/1e6:.0f}M"


def fmt_eta(seconds):
    if seconds < 60: return f"{int(seconds)}s"
    m, s = divmod(int(seconds), 60)
    return f"{m}m {s:02d}s"


# ── Main ──────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--fresh", action="store_true")
    args, _ = parser.parse_known_args()

    print()
    print("=" * 62)
    print("  📈  Benjamin Graham Screener — S&P 500 + S&P MidCap 400")
    print("=" * 62)

    if args.fresh:
        for f in [CACHE_FILE, DONE_FILE]:
            if os.path.exists(f):
                os.remove(f)
        print("  🗑️   Caché borrado (--fresh)\n")

    # Rotate log: keep previous run as .bak
    if os.path.exists(LOG_FILE):
        bak = LOG_FILE + ".bak"
        if os.path.exists(bak):
            os.remove(bak)
        os.rename(LOG_FILE, bak)

    run_start = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"# Graham Screener — run started {run_start}\n")

    cache = load_cache()

    print("\n  📋  Obteniendo lista de tickers…")
    tickers = fetch_ticker_list()
    total   = len(tickers)
    pending = [t for t in tickers if t not in cache]
    done    = total - len(pending)

    print(f"\n  Total : {total}  |  Ya en caché: {done}  |  Pendientes: {len(pending)}")
    if pending:
        mins = len(pending) * DELAY / 60
        print(f"  ⏱️   Tiempo estimado: ~{mins:.0f} minutos")
    print()

    t0 = time.time()
    for i, ticker in enumerate(pending, 1):
        global_n = done + i
        elapsed  = time.time() - t0
        rate     = i / elapsed if elapsed > 0 else 1
        eta      = fmt_eta((len(pending) - i) / rate) if i > 3 else "—"

        print(f"  [{global_n:4}/{total}]  {ticker:<8}", end="  ", flush=True)
        data = fetch_stock(ticker)
        cache[ticker] = data

        # Persist immediately — one tiny write per stock (~200 bytes)
        append_cache(ticker, data)

        if data.get("valid") and data.get("mos") is not None:
            gn   = data.get("graham_num") or 0
            mos  = data.get("mos") or 0
            flag = "✅" if mos >= 0 else "⚠️ "
            mc   = fmt_mcap(data.get("market_cap"))
            print(f"{flag}  GN ${gn:8.2f}  P ${data['price']:8.2f}  "
                  f"MoS {mos:+6.1f}%  {mc:<8}  ETA {eta}")
        elif not data.get("valid"):
            print(f"❌/➖  {data.get('error','BVPS/EPS negativo')[:45]}")
        else:
            print(f"❓  Sin datos")

        if i % SAVE_EVERY == 0:
            print(f"  💾  Checkpoint — {done + i}/{total} tickers", flush=True)

        time.sleep(DELAY)

    # Write self-contained graham_local.html (no external dependencies)
    write_local_html(cache, tickers)
    # Also write graham_data.js as backup
    write_data_js(cache, tickers)
    # And graham_screen.json (para importar en la app Android)
    write_screen_json(cache, tickers)

    # Write a tiny "done" marker
    done_info = {
        "completed":   datetime.now().isoformat(),
        "total":       total,
        "processed":   len(cache),
        "source":      "Yahoo Finance via yfinance (S&P 500 + S&P MidCap 400)",
    }
    try:
        with open(DONE_FILE, "w", encoding="utf-8") as f:
            json.dump(done_info, f)
    except Exception as exc:
        log_error("DONE_FILE", "write", exc)

    elapsed_total = time.time() - t0

    all_results = list(cache.values())
    valid_r     = [r for r in all_results if r.get("valid") and r.get("mos") is not None]
    uv_r        = [r for r in valid_r if (r.get("mos") or 0) >= 0]
    sb_list     = sorted([r for r in valid_r if (r.get("mos") or 0) >= 33],
                         key=lambda x: x.get("mos", 0), reverse=True)

    print()
    print("=" * 62)
    print(f"  ✅  Cache JSONL completo → .graham_cache.jsonl")
    print(f"  📊  Tickers procesados:            {len(all_results)}")
    print(f"  ✔️   Con Graham Number válido:      {len(valid_r)}")
    print(f"  🟡  Precio < Graham Number:        {len(uv_r)}")
    print(f"  🟢  Margen de seguridad ≥ 33 %:   {len(sb_list)}")
    print(f"  ⏱️   Tiempo total:                  {elapsed_total/60:.1f} min")
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, encoding="utf-8") as f:
            n_errors = sum(1 for _ in f)
        print(f"  ⚠️   Errores registrados:          {n_errors}  (ver graham_errors.log)")
    print()

    if sb_list:
        print("  ⭐  Top acciones subvaluadas (MoS ≥ 33 %):")
        print(f"  {'Ticker':<8}  {'Graham#':>9}  {'Precio':>9}  {'MoS':>7}  {'★'}")
        print("  " + "─" * 52)
        for r in sb_list[:20]:
            stars = "★" * r.get("stars", 0) + "☆" * (4 - r.get("stars", 0))
            print(f"  {r['ticker']:<8}  ${r.get('graham_num',0):>8.2f}  "
                  f"${r.get('price',0):>8.2f}  {r.get('mos',0):>+6.1f}%  {stars}")

    print()
    print("  👉  Dile a Claude: 'Actualiza el dashboard con los nuevos datos'")
    print("=" * 62)
    print()


if __name__ == "__main__":
    main()
