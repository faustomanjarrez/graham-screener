/* ═══ Graham Screener PWA — lógica principal ═══ */
'use strict';

// ── Estado ────────────────────────────────────────────────────────────────
const LS = {
  theme: 'graham_theme',
  watchlist: 'graham_watchlist',
  bookmarks: 'graham_bookmarks',
  bi: 'graham_bi',
  data: 'graham_imported_data',
};

let DATA = null;            // dataset activo (bundled o importado)
let filtered = [];          // resultado de filtros actual
let shown = 0;              // cuántos cards se han renderizado
const PAGE = 60;

const state = { filter: 'all', search: '', sector: '', sort: 'mos' };

// Tickers con datos conocidamente poco confiables en Yahoo Finance
const ANOMALIES = {
  'BRK-B': 'Berkshire reporta BVPS en escala Clase A — el Graham # está inflado y no es confiable.',
};

// ── Utilidades ────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn(e); }
}

function fmtMoney(v) {
  if (v == null) return '—';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMcap(v) {
  if (!v) return '—';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(1) + ' T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + ' B';
  return '$' + (v / 1e6).toFixed(0) + ' M';
}
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Cálculos Graham (para watchlist manual) ──────────────────────────────
function grahamNumber(eps, bvps) {
  if (eps == null || bvps == null || eps <= 0 || bvps <= 0) return null;
  return Math.sqrt(22.5 * eps * bvps);
}
function marginOfSafety(price, gn) {
  if (!gn || !price) return null;
  return ((gn - price) / gn) * 100;
}
function grahamStars(price, gn, eps, bvps) {
  if (!gn || !price) return 0;
  let s = 0;
  if (price < gn) s++;
  const pe = eps > 0 ? price / eps : null;
  const pb = bvps > 0 ? price / bvps : null;
  if (pe && pe <= 15) s++;
  if (pb && pb <= 1.5) s++;
  if (pe && pb && pe * pb <= 22.5) s++;
  return s;
}

// ── Clasificación ─────────────────────────────────────────────────────────
function verdict(stock) {
  if (!stock.valid || stock.mos == null) return { cls: 'b-na', label: 'Sin datos' };
  if (stock.mos >= 33) return { cls: 'b-strong', label: 'MoS ≥ 33%' };
  if (stock.mos >= 0) return { cls: 'b-under', label: 'Subvaluada' };
  if (stock.mos >= -25) return { cls: 'b-fair', label: 'Cerca del valor' };
  return { cls: 'b-over', label: 'Sobrevaluada' };
}
function starsHtml(n) {
  n = n || 0;
  return '<span class="stars"><span class="on">' + '★'.repeat(n) + '</span><span class="off">' + '★'.repeat(4 - n) + '</span></span>';
}
function mosHtml(mos, extraCls) {
  if (mos == null) return '<span class="mos-na">N/A</span>';
  const cls = mos >= 0 ? 'mos-pos' : 'mos-neg';
  return `<span class="${cls} ${extraCls || ''}">${mos >= 0 ? '+' : ''}${mos.toFixed(1)}%</span>`;
}

// ── Carga de datos ────────────────────────────────────────────────────────
function initData() {
  const imported = loadJSON(LS.data, null);
  const bundled = (typeof SCREENER !== 'undefined') ? SCREENER : null;
  if (imported && bundled) {
    DATA = new Date(imported.updated) >= new Date(bundled.updated) ? imported : bundled;
  } else {
    DATA = imported || bundled || { updated: null, stocks: [] };
  }
  $('hdrUpdated').textContent = DATA.updated
    ? `${DATA.stocks.length} acciones · ${fmtDate(DATA.updated)}`
    : 'Sin datos';
}

// ── Filtros y orden ───────────────────────────────────────────────────────
function applyFilters() {
  const q = state.search.trim().toUpperCase();
  filtered = DATA.stocks.filter((s) => {
    if (q && !(s.ticker || '').toUpperCase().includes(q) && !(s.name || '').toUpperCase().includes(q)) return false;
    if (state.sector && s.sector !== state.sector) return false;
    switch (state.filter) {
      case 'strong': return s.valid && s.mos != null && s.mos >= 33;
      case 'under': return s.valid && s.mos != null && s.mos >= 0;
      case 'over': return s.valid && s.mos != null && s.mos < 0;
      case 'stars4': return (s.stars || 0) === 4;
      default: return true;
    }
  });

  const dir = { mos: -1, stars: -1, mcap: -1, pe: 1, pb: 1, ticker: 1 }[state.sort];
  const key = { mos: 'mos', stars: 'stars', mcap: 'market_cap', pe: 'pe', pb: 'pb', ticker: 'ticker' }[state.sort];
  filtered.sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'ticker') return (va || '').localeCompare(vb || '');
    // nulls al final siempre
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * dir;
  });

  shown = 0;
  $('stockList').innerHTML = '';
  renderMore();
  $('resultCount').textContent = `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`;
}

function renderMore() {
  const list = $('stockList');
  const slice = filtered.slice(shown, shown + PAGE);
  if (shown === 0 && slice.length === 0) {
    list.innerHTML = '<div class="empty-msg"><div class="big">🔍</div>Sin resultados con estos filtros.</div>';
    $('btnMore').style.display = 'none';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const s of slice) {
    const v = verdict(s);
    const warn = ANOMALIES[s.ticker];
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.innerHTML = `
      <div class="sc-top">
        <span class="sc-ticker">${escHtml(s.ticker)}</span>
        <span class="sc-badge ${warn ? 'b-fair' : v.cls}">${warn ? '⚠ Dato dudoso' : v.label}</span>
      </div>
      <div class="sc-mos">${mosHtml(s.mos)}</div>
      <div class="sc-name">${escHtml(s.name || '')}</div>
      <div class="sc-bottom">
        <span class="sc-prices">P <b>${fmtMoney(s.price)}</b> · Graham# <b>${fmtMoney(s.graham_num)}</b></span>
        ${starsHtml(s.stars)}
      </div>`;
    card.addEventListener('click', () => openDetail(s));
    frag.appendChild(card);
  }
  list.appendChild(frag);
  shown += slice.length;
  $('btnMore').style.display = shown < filtered.length ? 'block' : 'none';
}

// ── Stats + selects ───────────────────────────────────────────────────────
function renderStats() {
  const st = DATA.stocks;
  const valid = st.filter((s) => s.valid && s.mos != null);
  const under = valid.filter((s) => s.mos >= 0);
  const strong = valid.filter((s) => s.mos >= 33);
  $('statsRow').innerHTML = `
    <div class="stat"><div class="v">${st.length}</div><div class="l">Total</div></div>
    <div class="stat"><div class="v">${valid.length}</div><div class="l">Válidas</div></div>
    <div class="stat s-green"><div class="v">${under.length}</div><div class="l">Subval.</div></div>
    <div class="stat s-strong"><div class="v">${strong.length}</div><div class="l">MoS≥33%</div></div>`;
}

function renderSectorSelect() {
  const sectors = [...new Set(DATA.stocks.map((s) => s.sector).filter((x) => x && x !== 'N/A'))].sort();
  $('sectorSel').innerHTML = '<option value="">Todos los sectores</option>' +
    sectors.map((s) => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join('');
}

// ── Detail sheet ──────────────────────────────────────────────────────────
let currentDetail = null;

function openDetail(s) {
  currentDetail = s;
  const v = verdict(s);
  const pe = s.pe, pb = s.pb;
  const pexpb = (pe != null && pb != null) ? pe * pb : null;
  const bookmarks = loadJSON(LS.bookmarks, []);
  const isBm = bookmarks.includes(s.ticker);

  const crit = (ok, label, val) => `
    <div class="dt-crit-row">
      <span>${label}</span>
      <span>${val != null ? `<span style="color:var(--text2);margin-right:8px">${val}</span>` : ''}
      <span class="${ok ? 'crit-ok' : 'crit-no'}">${ok ? '✓' : '✗'}</span></span>
    </div>`;

  const verdictBg = { 'b-strong': 'var(--strong-bg)', 'b-under': 'var(--green-bg)', 'b-fair': 'var(--yellow-bg)', 'b-over': 'var(--red-bg)', 'b-na': 'var(--gray-bg)' }[v.cls];
  const verdictColor = { 'b-strong': 'var(--strong-text)', 'b-under': 'var(--green-text)', 'b-fair': 'var(--yellow-text)', 'b-over': 'var(--red-text)', 'b-na': 'var(--gray-text)' }[v.cls];

  $('sheetBody').innerHTML = `
    <div class="dt-head">
      <div>
        <div class="dt-ticker">${escHtml(s.ticker)}</div>
        <div class="dt-name">${escHtml(s.name || '')}</div>
        <div class="dt-sector">${escHtml(s.sector || '')} · ${fmtMcap(s.market_cap)}</div>
      </div>
      <button class="dt-bookmark ${isBm ? 'on' : ''}" id="dtBookmark" title="Guardar en watchlist">
        <svg viewBox="0 0 24 24" fill="${isBm ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
    <div class="dt-verdict" style="background:${verdictBg};color:${verdictColor}">
      <span class="lbl">${v.label}<br>Margen de seguridad</span>
      <span class="val">${s.mos != null ? (s.mos >= 0 ? '+' : '') + s.mos.toFixed(1) + '%' : 'N/A'}</span>
    </div>
    <div class="dt-grid">
      <div class="dt-metric"><div class="k">Precio actual</div><div class="v">${fmtMoney(s.price)}</div></div>
      <div class="dt-metric"><div class="k">Graham Number</div><div class="v">${fmtMoney(s.graham_num)}</div></div>
      <div class="dt-metric"><div class="k">EPS (TTM)</div><div class="v">${s.eps != null ? s.eps : '—'}</div></div>
      <div class="dt-metric"><div class="k">BVPS</div><div class="v">${s.bvps != null ? s.bvps : '—'}</div></div>
      <div class="dt-metric"><div class="k">P/E</div><div class="v">${pe != null ? pe.toFixed(1) : '—'}</div></div>
      <div class="dt-metric"><div class="k">P/B</div><div class="v">${pb != null ? pb.toFixed(2) : '—'}</div></div>
    </div>
    <div class="dt-crit">
      <div class="card-title">Criterios Graham ${starsHtml(s.stars)}</div>
      ${crit(s.valid && s.price < s.graham_num, 'Precio < Graham Number', null)}
      ${crit(pe != null && pe <= 15, 'P/E ≤ 15', pe != null ? pe.toFixed(1) : '—')}
      ${crit(pb != null && pb <= 1.5, 'P/B ≤ 1.5', pb != null ? pb.toFixed(2) : '—')}
      ${crit(pexpb != null && pexpb <= 22.5, 'P/E × P/B ≤ 22.5', pexpb != null ? pexpb.toFixed(1) : '—')}
    </div>
    ${ANOMALIES[s.ticker] ? `<div class="warn-box">⚠️ ${escHtml(ANOMALIES[s.ticker])}</div>` : ''}
    <a class="dt-link" href="https://finance.yahoo.com/quote/${encodeURIComponent(s.ticker)}" target="_blank" rel="noopener">Ver en Yahoo Finance ↗</a>`;

  $('dtBookmark').addEventListener('click', toggleBookmark);
  $('sheet').classList.add('open');
  $('sheetBackdrop').classList.add('open');
}

function closeDetail() {
  $('sheet').classList.remove('open');
  $('sheetBackdrop').classList.remove('open');
}

function toggleBookmark() {
  if (!currentDetail) return;
  let bookmarks = loadJSON(LS.bookmarks, []);
  const tk = currentDetail.ticker;
  if (bookmarks.includes(tk)) {
    bookmarks = bookmarks.filter((t) => t !== tk);
    toast(`${tk} eliminado de la watchlist`);
  } else {
    bookmarks.push(tk);
    toast(`${tk} guardado en la watchlist`);
  }
  saveJSON(LS.bookmarks, bookmarks);
  const btn = $('dtBookmark');
  const on = bookmarks.includes(tk);
  btn.classList.toggle('on', on);
  btn.querySelector('svg').setAttribute('fill', on ? 'currentColor' : 'none');
  renderWatchlist();
}

// ── Watchlist ─────────────────────────────────────────────────────────────
function renderWatchlist() {
  const manual = loadJSON(LS.watchlist, []);
  const bookmarks = loadJSON(LS.bookmarks, []);
  const bmStocks = bookmarks
    .map((tk) => DATA.stocks.find((s) => s.ticker === tk))
    .filter(Boolean);

  const total = manual.length + bmStocks.length;
  $('wlCount').textContent = total ? `${total} acción${total === 1 ? '' : 'es'}` : '';

  if (!total) {
    $('wlBody').innerHTML = '<div class="empty-msg"><div class="big">📋</div>Agrega acciones manualmente o guárdalas desde el screener con el botón <b>🔖</b>.</div>';
    return;
  }

  const rows = [];
  for (const s of bmStocks) {
    rows.push(wlRow(s, 'screener', null));
  }
  manual.forEach((m, i) => {
    const gn = grahamNumber(m.eps, m.bvps);
    const mos = marginOfSafety(m.price, gn);
    const stars = grahamStars(m.price, gn, m.eps, m.bvps);
    rows.push(wlRow({ ...m, graham_num: gn, mos, stars, valid: gn != null }, 'manual', i));
  });
  $('wlBody').innerHTML = rows.join('');

  // listeners
  $('wlBody').querySelectorAll('[data-wl-open]').forEach((el) => {
    el.addEventListener('click', () => {
      const tk = el.getAttribute('data-wl-open');
      const s = DATA.stocks.find((x) => x.ticker === tk);
      if (s) openDetail(s);
    });
  });
  $('wlBody').querySelectorAll('[data-wl-del]').forEach((el) => {
    el.addEventListener('click', () => {
      const [src, idx] = el.getAttribute('data-wl-del').split(':');
      if (src === 'manual') {
        const list = loadJSON(LS.watchlist, []);
        const removed = list.splice(Number(idx), 1);
        saveJSON(LS.watchlist, list);
        toast(`${removed[0]?.ticker || ''} eliminado`);
      } else {
        let bms = loadJSON(LS.bookmarks, []);
        bms = bms.filter((t) => t !== idx);
        saveJSON(LS.bookmarks, bms);
        toast(`${idx} eliminado`);
      }
      renderWatchlist();
    });
  });
}

function wlRow(s, src, idx) {
  const gn = s.graham_num;
  const delKey = src === 'manual' ? `manual:${idx}` : `bm:${s.ticker}`;
  const openAttr = src === 'screener' ? `data-wl-open="${escHtml(s.ticker)}"` : '';
  return `
    <div class="wl-item">
      <div class="wl-main" ${openAttr}>
        <div class="wl-tk">${escHtml(s.ticker)} ${starsHtml(s.stars)}</div>
        <div class="wl-nm">${escHtml(s.name || '')}</div>
        <div class="wl-src">${src === 'manual' ? 'Manual' : 'Screener'}</div>
      </div>
      <div class="wl-metrics">
        <div class="wl-mos">${mosHtml(s.mos)}</div>
        <div class="wl-gn">P ${fmtMoney(s.price)} · G# ${gn != null ? fmtMoney(gn) : '—'}</div>
      </div>
      <button class="wl-del" data-wl-del="${src === 'manual' ? delKey : 'bm:' + escHtml(s.ticker)}" aria-label="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>`;
}

function addManualStock() {
  const tk = $('fTk').value.trim().toUpperCase();
  const price = parseFloat($('fPr').value);
  const eps = parseFloat($('fEp').value);
  const bvps = parseFloat($('fBv').value);
  const name = $('fNm').value.trim();

  if (!tk) { toast('Escribe un ticker'); return; }
  if (!price || price <= 0) { toast('Precio inválido'); return; }
  if (isNaN(eps) || isNaN(bvps)) { toast('EPS y BVPS son obligatorios'); return; }

  const list = loadJSON(LS.watchlist, []);
  if (list.some((x) => x.ticker === tk)) { toast(`${tk} ya está en la watchlist`); return; }
  list.push({ ticker: tk, name: name || tk, price, eps, bvps, added: new Date().toISOString() });
  saveJSON(LS.watchlist, list);

  ['fTk', 'fPr', 'fEp', 'fBv', 'fNm'].forEach((id) => { $(id).value = ''; });
  toast(`${tk} agregado ✓`);
  renderWatchlist();
}

// ── Mercado: Buffett + sectores + top ─────────────────────────────────────
function biZone(v) {
  if (v < 75) return { label: 'Subvaluado', bg: 'var(--green-bg)', color: 'var(--green-text)', arc: '#059669' };
  if (v < 90) return { label: 'Valor justo', bg: 'var(--yellow-bg)', color: 'var(--yellow-text)', arc: '#d97706' };
  if (v < 115) return { label: 'Sobrevaluado', bg: 'var(--orange-bg)', color: 'var(--orange-text)', arc: '#ea580c' };
  return { label: 'Zona de peligro', bg: 'var(--red-bg)', color: 'var(--red-text)', arc: '#dc2626' };
}

function renderBI() {
  const bi = loadJSON(LS.bi, null);
  const v = bi?.value;
  const max = 250;
  const pct = v != null ? Math.min(v / max, 1) : 0;
  const angle = -110 + pct * 220;
  const zone = v != null ? biZone(v) : null;

  // gauge SVG: arco de -110° a +110°
  const polar = (deg, r) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [60 + r * Math.cos(rad), 60 + r * Math.sin(rad)];
  };
  const arc = (from, to, r) => {
    const [x1, y1] = polar(from, r);
    const [x2, y2] = polar(to, r);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const seg = (a, b, color) => `<path d="${arc(-110 + a * 220, -110 + b * 220, 46)}" stroke="${color}" stroke-width="11" fill="none" stroke-linecap="round" opacity=".85"/>`;
  const [nx, ny] = polar(angle, 34);

  $('biGauge').innerHTML = `
    <svg width="130" height="105" viewBox="0 0 120 95">
      ${seg(0, 75 / max, '#059669')}
      ${seg(75 / max, 90 / max, '#d97706')}
      ${seg(90 / max, 115 / max, '#ea580c')}
      ${seg(115 / max, 1, '#dc2626')}
      ${v != null ? `<line x1="60" y1="60" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="60" r="5" fill="var(--text)"/>` : ''}
    </svg>`;

  if (v != null) {
    $('biNum').textContent = v;
    $('biPill').textContent = zone.label;
    $('biPill').style.background = zone.bg;
    $('biPill').style.color = zone.color;
    $('biDate').textContent = bi.date ? 'Actualizado: ' + fmtDate(bi.date) : '';
  } else {
    $('biNum').textContent = '—';
    $('biPill').textContent = 'Sin dato';
    $('biPill').style.background = '';
    $('biPill').style.color = '';
    $('biDate').textContent = '';
  }
}

function updateBI() {
  const v = parseFloat($('biIn').value);
  if (isNaN(v) || v <= 0 || v > 500) { toast('Ingresa un valor entre 1 y 500'); return; }
  saveJSON(LS.bi, { value: v, date: new Date().toISOString() });
  $('biIn').value = '';
  renderBI();
  toast('Indicador Buffett actualizado ✓');
}

function renderMarket() {
  renderBI();

  // sectores con oportunidades (MoS >= 0)
  const bySector = {};
  for (const s of DATA.stocks) {
    if (!s.valid || s.mos == null || s.mos < 0) continue;
    const sec = s.sector && s.sector !== 'N/A' ? s.sector : 'Otros';
    bySector[sec] = (bySector[sec] || 0) + 1;
  }
  const entries = Object.entries(bySector).sort((a, b) => b[1] - a[1]);
  const maxN = entries[0]?.[1] || 1;
  $('sectorBars').innerHTML = entries.length
    ? entries.map(([sec, n]) => `
      <div class="sbar">
        <div class="sbar-head"><span class="sbar-name">${escHtml(sec)}</span><span class="sbar-n">${n}</span></div>
        <div class="sbar-track"><div class="sbar-fill" style="width:${(n / maxN * 100).toFixed(0)}%"></div></div>
      </div>`).join('')
    : '<div class="empty-msg">Sin acciones subvaluadas en el dataset.</div>';

  // top 10 por MoS (excluye tickers con datos anómalos conocidos)
  const top = DATA.stocks
    .filter((s) => s.valid && s.mos != null && !ANOMALIES[s.ticker])
    .sort((a, b) => b.mos - a.mos)
    .slice(0, 10);
  $('topList').innerHTML = top.map((s, i) => `
    <div class="top-item" data-tk="${escHtml(s.ticker)}">
      <div class="top-rank">${i + 1}</div>
      <div class="top-main">
        <div class="top-tk">${escHtml(s.ticker)} ${starsHtml(s.stars)}</div>
        <div class="top-nm">${escHtml(s.name || '')}</div>
      </div>
      <div class="top-mos">+${s.mos.toFixed(1)}%</div>
    </div>`).join('');
  $('topList').querySelectorAll('.top-item').forEach((el) => {
    el.addEventListener('click', () => {
      const s = DATA.stocks.find((x) => x.ticker === el.getAttribute('data-tk'));
      if (s) openDetail(s);
    });
  });
}

// ── Actualización de datos ────────────────────────────────────────────────
// Acepta graham_screen.json (JSON puro) o graham_data.js (var SCREENER={...};)
function parseScreenerText(text) {
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1) throw new Error('Formato no reconocido');
  const obj = JSON.parse(text.slice(braceStart, braceEnd + 1));
  if (!Array.isArray(obj.stocks) || !obj.updated) throw new Error('El archivo no contiene datos del screener');
  return obj;
}

function adoptData(obj, verb) {
  saveJSON(LS.data, obj);
  initData();
  renderAll();
  toast(`✓ Datos ${verb}: ${obj.stocks.length} acciones (${fmtDate(obj.updated)})`);
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      adoptData(parseScreenerText(String(reader.result)), 'importados');
    } catch (e) {
      console.error(e);
      toast('⚠ No se pudo leer el archivo. Usa graham_screen.json o graham_data.js');
    }
  };
  reader.readAsText(file);
}

// Descarga data.js del mismo sitio (publicado por GitHub Actions) saltando el caché
let refreshing = false;
async function refreshData(silent) {
  if (refreshing) return;
  refreshing = true;
  if (!silent) toast('Buscando datos nuevos…');
  try {
    const resp = await fetch('data.js?t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const obj = parseScreenerText(await resp.text());
    const current = DATA?.updated ? new Date(DATA.updated) : 0;
    if (new Date(obj.updated) <= current) {
      if (!silent) toast('Ya tienes los datos más recientes ✓');
    } else {
      adoptData(obj, 'actualizados');
    }
  } catch (e) {
    console.warn('refreshData:', e);
    if (!silent) toast('⚠ Sin conexión — no se pudo actualizar');
  } finally {
    refreshing = false;
  }
}

// ── Tema ──────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('iconMoon').style.display = theme === 'dark' ? 'none' : 'block';
  $('iconSun').style.display = theme === 'dark' ? 'block' : 'none';
  localStorage.setItem(LS.theme, theme);
}

// ── Navegación ────────────────────────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  $('view-' + name).classList.add('active');
  document.querySelector(`.nav-item[data-view="${name}"]`).classList.add('active');
  window.scrollTo({ top: 0 });
  if (name === 'market') renderMarket();
  if (name === 'watchlist') renderWatchlist();
}

// ── Render global ─────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderSectorSelect();
  applyFilters();
  renderWatchlist();
  renderMarket();
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // tema
  const savedTheme = localStorage.getItem(LS.theme)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);
  $('btnTheme').addEventListener('click', () =>
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  initData();
  renderAll();

  // navegación
  document.querySelectorAll('.nav-item').forEach((btn) =>
    btn.addEventListener('click', () => switchView(btn.dataset.view)));

  // filtros
  $('filterChips').querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      $('filterChips').querySelector('.chip.active').classList.remove('active');
      chip.classList.add('active');
      state.filter = chip.dataset.filter;
      applyFilters();
    }));
  let searchTimer = null;
  $('searchBox').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = e.target.value; applyFilters(); }, 200);
  });
  $('sectorSel').addEventListener('change', (e) => { state.sector = e.target.value; applyFilters(); });
  $('sortSel').addEventListener('change', (e) => { state.sort = e.target.value; applyFilters(); });
  $('btnMore').addEventListener('click', renderMore);

  // watchlist
  $('btnAdd').addEventListener('click', addManualStock);

  // buffett
  $('btnBI').addEventListener('click', updateBI);

  // sheet
  $('sheetBackdrop').addEventListener('click', closeDetail);
  $('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeDetail(); });

  // importar / actualizar
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', (e) => {
    if (e.target.files?.[0]) handleImportFile(e.target.files[0]);
    e.target.value = '';
  });
  $('btnRefresh').addEventListener('click', () => refreshData(false));
  // al abrir con internet, busca datos nuevos en silencio
  if (navigator.onLine) setTimeout(() => refreshData(true), 1500);

  // service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
