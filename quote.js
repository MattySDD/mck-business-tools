// ═══════════════════════════════════════════════════════════
// MCK QUOTE GENERATOR LOGIC
// ═══════════════════════════════════════════════════════════

function initQuote() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const qNum = document.getElementById('q-quote-number');
  if (qNum) qNum.textContent = `MCK-${year}-${rand}`;
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' });
  const dateEl = document.getElementById('q-date-display');
  if (dateEl) dateEl.textContent = dateStr;
  
  updateQuoteValidity();
  
  if (document.getElementById('q-pricing-body').children.length === 0) {
    addQuoteLine('Microcement Application — Floors', 0, 'sqm', 0);
    addQuoteLine('Microcement Application — Feature Walls', 0, 'sqm', 0);
  }
  
  initSignature();
}

function updateQuoteValidity() {
  const sel = document.getElementById('q-validity-select');
  if (!sel) return;
  const hours = parseInt(sel.value);
  const date = new Date();
  date.setHours(date.getHours() + hours);
  const dateStr = date.toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' });
  
  const note = document.getElementById('q-expiry-note');
  if (note) note.textContent = 'Expires: ' + dateStr;
  
  const banner = document.getElementById('q-validity-banner');
  if (banner) {
    const label = sel.options[sel.selectedIndex].text;
    banner.textContent = 'QUOTE VALID FOR ' + label.toUpperCase() + ' FROM DATE OF ISSUE';
  }
}

function addQuoteLine(desc = '', qty = 0, unit = 'sqm', rate = 0) {
  const body = document.getElementById('q-pricing-body');
  const tr = document.createElement('tr');
  tr.className = 'q-line-item';
  
  tr.innerHTML = `
    <td><input type="text" class="desc" value="${desc}" oninput="updateQuoteTotals()"></td>
    <td class="right"><input type="number" class="qty" value="${qty}" oninput="updateQuoteTotals()"></td>
    <td>
      <select class="unit" onchange="updateQuoteTotals()">
        <option value="sqm" ${unit==='sqm'?'selected':''}>sqm</option>
        <option value="lm" ${unit==='lm'?'selected':''}>lm</option>
        <option value="item" ${unit==='item'?'selected':''}>item</option>
        <option value="hr" ${unit==='hr'?'selected':''}>hr</option>
      </select>
    </td>
    <td class="right"><input type="number" class="rate" value="${rate}" oninput="updateQuoteTotals()"></td>
    <td class="right line-total">—</td>
    <td class="center no-print"><button class="btn-remove-line" onclick="this.parentElement.parentElement.remove(); updateQuoteTotals();">&times;</button></td>
  `;
  
  body.appendChild(tr);
  updateQuoteTotals();
}

function updateQuoteTotals() {
  const lines = document.querySelectorAll('.q-line-item');
  let subtotal = 0;
  
  lines.forEach(line => {
    const qty = parseFloat(line.querySelector('.qty').value) || 0;
    const rate = parseFloat(line.querySelector('.rate').value) || 0;
    const total = qty * rate;
    line.querySelector('.line-total').textContent = total > 0 ? '$' + total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
    subtotal += total;
  });
  
  const gst = subtotal * 0.1;
  const grandTotal = subtotal + gst;
  
  document.getElementById('q-subtotal-cell').textContent = '$' + subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-gst-cell').textContent = '$' + gst.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-grand-total-cell').textContent = '$' + grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  
  const depositPct = subtotal > 20000 ? 5 : 10;
  const depositAmt = subtotal * (depositPct / 100);
  const materialAmt = subtotal * 0.5;
  const finalPct = 100 - depositPct - 50;
  const finalAmt = subtotal - depositAmt - materialAmt;
  
  document.getElementById('q-deposit-amt').textContent = '$' + depositAmt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-deposit-pct').textContent = depositPct + '%';
  document.getElementById('q-material-amt').textContent = '$' + materialAmt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-final-amt').textContent = '$' + finalAmt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-final-pct').textContent = finalPct + '%';
  document.getElementById('q-payment-total').textContent = '$' + subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  
  if (subtotal === 0) {
    ['q-deposit-amt','q-material-amt','q-final-amt','q-payment-total'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    document.getElementById('q-deposit-pct').textContent = '—';
    document.getElementById('q-final-pct').textContent = '—';
  }
}

// ── SIGNATURE CANVAS ──
function initSignature() {
  const canvas = document.getElementById('q-sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;

  function resize() {
    const wrap = document.getElementById('q-canvas-wrap');
    if (!wrap) return;
    canvas.width = wrap.offsetWidth;
    canvas.height = 160;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }
  
  window.addEventListener('resize', resize);
  resize();

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function startDraw(e) {
    if (e.target === canvas) {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      document.getElementById('q-canvas-hint').style.display = 'none';
      const btn = document.getElementById('q-accept-btn');
      if (btn) btn.disabled = false;
    }
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() { drawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw, { passive: false });
}

function clearQuoteSig() {
  const canvas = document.getElementById('q-sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('q-canvas-hint').style.display = 'block';
  document.getElementById('q-sig-accepted-banner').style.display = 'none';
  const btn = document.getElementById('q-accept-btn');
  if (btn) btn.disabled = true;
}

function acceptQuoteSig() {
  const canvas = document.getElementById('q-sig-canvas');
  if (!canvas) return;
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  if (canvas.toDataURL() === blank.toDataURL()) {
    alert('Please sign before accepting.');
    return;
  }
  const banner = document.getElementById('q-sig-accepted-banner');
  if (banner) {
    banner.style.display = 'block';
    const label = banner.querySelector('.acc-label');
    if (label) label.textContent = 'QUOTE ACCEPTED — DIGITALLY SIGNED — ' + new Date().toLocaleString();
  }
  const img = document.getElementById('q-sig-image');
  if (img) {
    img.src = canvas.toDataURL();
    img.style.display = 'block';
  }
}

function clearQuoteForm() {
  if (!confirm('Clear all quote data?')) return;
  document.getElementById('q-pricing-body').innerHTML = '';
  document.querySelectorAll('#tab-quote .field-val').forEach(f => f.innerHTML = '&nbsp;');
  addQuoteLine('Microcement Application — Floors', 0, 'sqm', 0);
  updateQuoteTotals();
  clearQuoteSig();
}


// ═══════════════════════════════════════════════════════════
// GENERATE PDF QUOTE — Opens a fully static print document
// ═══════════════════════════════════════════════════════════

function generatePDFQuote() {
  // ── 1. Extract all data from the live form ──
  const txt = id => {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.textContent || el.innerText || '').trim().replace(/^\u00a0$/, '');
  };

  const quoteNumber = txt('q-quote-number') || 'MCK-2026-XXXX';
  const dateIssued = txt('q-date-display') || new Date().toLocaleDateString('en-AU');
  const validitySel = document.getElementById('q-validity-select');
  const validityLabel = validitySel ? validitySel.options[validitySel.selectedIndex].text : '48 Hours';
  const validityBanner = txt('q-validity-banner') || 'QUOTE VALID FOR 48 HOURS FROM DATE OF ISSUE';
  const preparedBy = txt('q-prepared-by') || 'King Mannion';

  const clientName = txt('q-client-name');
  const clientPhone = txt('q-client-phone');
  const clientEmail = txt('q-client-email');
  const projectAddress = txt('q-project-address');
  const siteContact = txt('q-site-contact');
  const colourFinish = txt('q-colour-finish');
  const substrate = txt('q-substrate');
  const scope = txt('q-scope');

  const startDate = txt('q-start-date');
  const duration = txt('q-duration');
  const completion = txt('q-completion');

  // Line items
  const lineItems = [];
  document.querySelectorAll('.q-line-item').forEach(row => {
    const desc = row.querySelector('.desc')?.value || '';
    const qty = parseFloat(row.querySelector('.qty')?.value) || 0;
    const unit = row.querySelector('.unit')?.value || 'sqm';
    const rate = parseFloat(row.querySelector('.rate')?.value) || 0;
    const total = qty * rate;
    if (desc || qty > 0) lineItems.push({ desc, qty, unit, rate, total });
  });

  const subtotal = lineItems.reduce((s, l) => s + l.total, 0);
  const gst = subtotal * 0.1;
  const grandTotal = subtotal + gst;

  const depositPct = subtotal > 20000 ? 5 : 10;
  const depositAmt = subtotal * (depositPct / 100);
  const materialAmt = subtotal * 0.5;
  const finalPct = 100 - depositPct - 50;
  const finalAmt = subtotal - depositAmt - materialAmt;

  // Inclusions / Exclusions
  const getListItems = id => {
    const el = document.getElementById(id);
    if (!el) return [];
    return Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim()).filter(t => t);
  };
  const inclusions = getListItems('q-inclusions');
  const exclusions = getListItems('q-exclusions');

  // Signature image
  const sigCanvas = document.getElementById('q-sig-canvas');
  let sigDataURL = '';
  if (sigCanvas) {
    const blank = document.createElement('canvas');
    blank.width = sigCanvas.width;
    blank.height = sigCanvas.height;
    if (sigCanvas.toDataURL() !== blank.toDataURL()) {
      sigDataURL = sigCanvas.toDataURL();
    }
  }

  const $ = v => '$' + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

  // ── 2. Build the static HTML document ──
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="dark">
<title>MCK Quote — ${quoteNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
/* ── GLOBAL COLOUR FORCE ── */
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
  box-sizing: border-box;
}

@page {
  size: A4 portrait;
  margin: 15mm;
}

html, body {
  margin: 0; padding: 0;
  background: #0a0a0a !important;
  color: #ffffff !important;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* ── PAGE SECTIONS ── */
.page-section {
  page-break-after: always;
  padding: 0;
}
.page-section:last-child { page-break-after: auto; }

/* ── HEADER ── */
.doc-header {
  border-bottom: 2px solid #c9a84c;
  padding-bottom: 16pt;
  margin-bottom: 16pt;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14pt;
}
.brand-block .label { font-size: 8pt; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4pt; }
.brand-block h1 { font-size: 22pt; color: #ffffff; margin: 0 0 4pt 0; letter-spacing: 2px; font-weight: 800; }
.brand-block .tagline { font-size: 8.5pt; color: #aaaaaa; letter-spacing: 1px; }
.contact-block { text-align: right; font-size: 8.5pt; color: #aaaaaa; line-height: 2; }
.contact-block strong { color: #c9a84c; font-size: 7pt; letter-spacing: 1px; margin-right: 6pt; }

/* ── META GRID ── */
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0;
  background: #1a1a1a !important;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
}
.meta-cell {
  padding: 8pt 12pt;
  border-right: 1px solid #333;
}
.meta-cell:last-child { border-right: none; }
.meta-label { font-size: 6.5pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 3pt; font-weight: 600; }
.meta-value { font-size: 10pt; color: #ffffff; font-weight: 600; }

/* ── VALIDITY BANNER ── */
.validity-banner {
  background: #c9a84c !important;
  color: #000000 !important;
  text-align: center;
  padding: 7pt 12pt;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 14pt 0;
  border-radius: 3px;
}

/* ── SECTION HEADERS ── */
.sec-hd {
  display: flex;
  align-items: center;
  gap: 10pt;
  margin-bottom: 12pt;
  padding-bottom: 8pt;
  border-bottom: 1px solid #333;
}
.sec-num {
  background: #c9a84c !important;
  color: #000000 !important;
  font-weight: 800;
  font-size: 9pt;
  padding: 3pt 8pt;
  border-radius: 3px;
  min-width: 24pt;
  text-align: center;
}
.sec-hd h2 {
  margin: 0;
  font-size: 11pt;
  color: #c9a84c;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
}

/* ── FIELDS ── */
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
.field-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }
.field-full { grid-column: 1 / -1; }
.field {
  background: #111111 !important;
  border: 1px solid #333;
  border-radius: 3px;
  padding: 6pt 10pt;
}
.field-lbl {
  font-size: 6.5pt;
  color: #c9a84c;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 2pt;
}
.field-val {
  font-size: 9.5pt;
  color: #ffffff;
  min-height: 12pt;
  line-height: 1.5;
}

/* ── TABLES ── */
table { width: 100%; border-collapse: collapse; }
th {
  background: #1a1a1a !important;
  color: #c9a84c !important;
  font-size: 7pt;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  padding: 6pt 8pt;
  border: 1px solid #c9a84c;
  text-align: left;
}
th.right { text-align: right; }
td {
  background: #111111 !important;
  color: #ffffff !important;
  font-size: 9pt;
  padding: 5pt 8pt;
  border: 1px solid #333;
}
td.right { text-align: right; }
tr:nth-child(even) td { background: #0d0d0d !important; }
tfoot td {
  background: #1a1a1a !important;
  font-weight: 700;
  border-top: 2px solid #c9a84c !important;
}
.grand-total td {
  color: #c9a84c !important;
  font-size: 11pt;
  font-weight: 800;
  border-top: 2px solid #c9a84c !important;
}

/* ── CALLOUT ── */
.callout {
  background: #1a1a1a !important;
  border-left: 3px solid #c9a84c;
  padding: 8pt 12pt;
  font-size: 8pt;
  color: #ffffff;
  line-height: 1.6;
  border-radius: 0 3px 3px 0;
  margin: 10pt 0;
}
.callout strong { color: #c9a84c; }

/* ── INCLUSIONS / EXCLUSIONS ── */
.inc-exc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14pt;
}
.ie-col {
  background: #111111 !important;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 10pt 12pt;
}
.ie-col h3 {
  margin: 0 0 8pt 0;
  font-size: 9pt;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  padding-bottom: 6pt;
  border-bottom: 1px solid #333;
}
.ie-col.inc h3 { color: #c9a84c; }
.ie-col.exc h3 { color: #aaaaaa; }
.ie-item {
  font-size: 8.5pt;
  color: #ffffff;
  padding: 3pt 0;
  line-height: 1.5;
}
.ie-item .tick { color: #c9a84c; font-weight: 700; margin-right: 6pt; }
.ie-item .cross { color: #ff6b6b; font-weight: 700; margin-right: 6pt; }

/* ── PAYMENT TABLE ── */
.pay-stage { font-size: 7pt; color: #c9a84c; font-weight: 700; }
.pay-note { font-size: 7.5pt; color: #aaaaaa; font-style: italic; }

/* ── T&C ITEMS ── */
.tc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
.tc-item {
  background: #111111 !important;
  border: 1px solid #333;
  border-radius: 3px;
  padding: 8pt 10pt;
  font-size: 8pt;
  color: #ffffff;
  line-height: 1.5;
}
.tc-item .tc-head {
  color: #c9a84c;
  font-weight: 700;
  font-size: 7pt;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 3pt;
}

/* ── SIGNATURE BLOCK ── */
.sig-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24pt;
  margin-top: 16pt;
}
.sig-block {}
.sig-label {
  font-size: 7pt;
  color: #c9a84c;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 6pt;
}
.sig-line {
  border-bottom: 1px solid #c9a84c;
  height: 36pt;
  margin-bottom: 4pt;
  position: relative;
}
.sig-line img { position: absolute; bottom: 2pt; left: 0; max-height: 32pt; max-width: 200pt; }
.sig-sub { font-size: 8pt; color: #aaaaaa; margin-top: 4pt; }

/* ── FOOTER ── */
.doc-footer {
  margin-top: 20pt;
  padding: 10pt 14pt;
  background: #1a1a1a !important;
  border: 1px solid #333;
  border-radius: 3px;
  text-align: center;
  font-size: 8pt;
  color: #aaaaaa;
  line-height: 1.8;
}
.doc-footer .gold { color: #c9a84c; font-weight: 700; }

/* ── LEGAL FOOTER ── */
.legal-footer {
  margin-top: 14pt;
  padding: 10pt 14pt;
  background: #111111 !important;
  border: 1px solid #333;
  border-radius: 3px;
  text-align: center;
  font-size: 7.5pt;
  color: #aaaaaa;
  line-height: 1.8;
}
.legal-footer strong { color: #c9a84c; }

@media print {
  html, body, * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body { background: #0a0a0a !important; }
}
</style>
</head>
<body>

<!-- ═══ PAGE 1: HEADER + CLIENT DETAILS ═══ -->
<div class="page-section">
  <div class="doc-header">
    <div class="header-row">
      <div class="brand-block">
        <div class="label">FORMAL QUOTATION</div>
        <h1>MICRO CEMENT KING</h1>
        <div class="tagline">Gold Coast's Premium Seamless Surfaces Specialist</div>
      </div>
      <div class="contact-block">
        <div><strong>PHONE</strong> 0468 053 819</div>
        <div><strong>EMAIL</strong> projects@microcementking.com.au</div>
        <div><strong>WEB</strong> microcementking.com.au</div>
        <div><strong>INSTAGRAM</strong> @microcementking</div>
        <div style="margin-top:6pt;font-size:7.5pt;color:#666;">All prices ex GST unless stated</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-cell"><div class="meta-label">QUOTE NUMBER</div><div class="meta-value">${quoteNumber}</div></div>
      <div class="meta-cell"><div class="meta-label">DATE ISSUED</div><div class="meta-value">${dateIssued}</div></div>
      <div class="meta-cell"><div class="meta-label">QUOTE VALIDITY</div><div class="meta-value">${validityLabel}</div></div>
      <div class="meta-cell"><div class="meta-label">PREPARED BY</div><div class="meta-value">${preparedBy}</div></div>
    </div>
  </div>

  <div class="validity-banner">${validityBanner}</div>

  <div class="sec-hd"><div class="sec-num">01</div><h2>CLIENT DETAILS</h2></div>
  <div class="field-grid">
    <div class="field"><div class="field-lbl">CLIENT NAME</div><div class="field-val">${clientName || '—'}</div></div>
    <div class="field"><div class="field-lbl">PROJECT ADDRESS</div><div class="field-val">${projectAddress || '—'}</div></div>
    <div class="field"><div class="field-lbl">PHONE NUMBER</div><div class="field-val">${clientPhone || '—'}</div></div>
    <div class="field"><div class="field-lbl">SITE CONTACT</div><div class="field-val">${siteContact || '—'}</div></div>
    <div class="field"><div class="field-lbl">EMAIL ADDRESS</div><div class="field-val">${clientEmail || '—'}</div></div>
    <div class="field"><div class="field-lbl">PREPARED BY</div><div class="field-val">${preparedBy}</div></div>
  </div>

  <div style="height:14pt;"></div>
  <div class="sec-hd"><div class="sec-num">02</div><h2>PROJECT SCOPE</h2></div>
  <div class="field-grid">
    <div class="field"><div class="field-lbl">COLOUR / FINISH</div><div class="field-val">${colourFinish || '—'}</div></div>
    <div class="field"><div class="field-lbl">SUBSTRATE</div><div class="field-val">${substrate || '—'}</div></div>
  </div>
  <div style="height:8pt;"></div>
  <div class="field field-full"><div class="field-lbl">SCOPE OF WORKS</div><div class="field-val">${scope || '—'}</div></div>
</div>

<!-- ═══ PAGE 2: PRICING ═══ -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">03</div><h2>SCOPE OF WORKS &amp; PRICING</h2></div>
  <table>
    <thead>
      <tr><th style="width:42%">DESCRIPTION</th><th class="right" style="width:10%">QTY</th><th style="width:12%">UNIT</th><th class="right" style="width:18%">RATE (EX GST)</th><th class="right" style="width:18%">TOTAL (EX GST)</th></tr>
    </thead>
    <tbody>
      ${lineItems.map(l => `<tr><td>${l.desc}</td><td class="right">${l.qty}</td><td>${l.unit}</td><td class="right">${$(l.rate)}</td><td class="right">${$(l.total)}</td></tr>`).join('')}
    </tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right;">SUBTOTAL (EX GST)</td><td class="right">${$(subtotal)}</td></tr>
      <tr><td colspan="4" style="text-align:right;">GST (10%)</td><td class="right">${$(gst)}</td></tr>
      <tr class="grand-total"><td colspan="4" style="text-align:right;">TOTAL (INC GST)</td><td class="right">${$(grandTotal)}</td></tr>
    </tfoot>
  </table>
  <div class="callout" style="margin-top:14pt;">
    <strong>ON-SITE MEASURE FEE:</strong> A non-refundable on-site measure fee of <strong>$220 ex GST</strong> applies where a site visit is required. This fee is <strong>credited in full against the contract</strong> upon acceptance of this quote and signing of the formal agreement.
  </div>
</div>

<!-- ═══ PAGE 3: INCLUSIONS & EXCLUSIONS ═══ -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">04</div><h2>INCLUSIONS &amp; EXCLUSIONS</h2></div>
  <div class="inc-exc-grid">
    <div class="ie-col inc">
      <h3>INCLUSIONS</h3>
      ${inclusions.map(i => `<div class="ie-item"><span class="tick">\u2713</span>${i}</div>`).join('')}
    </div>
    <div class="ie-col exc">
      <h3>EXCLUSIONS</h3>
      ${exclusions.map(e => `<div class="ie-item"><span class="cross">\u2717</span>${e}</div>`).join('')}
    </div>
  </div>
</div>

<!-- ═══ PAGE 4: PAYMENT SCHEDULE ═══ -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">05</div><h2>PAYMENT SCHEDULE</h2></div>
  <div class="callout" style="margin-bottom:14pt;">
    <strong>PAYMENT STRUCTURE:</strong> Booking deposit is <strong>${depositPct}%</strong> ${subtotal > 20000 ? '(contract value exceeds $20,000)' : '(contract value under $20,000)'}. Material payment is due before commencement. Works do not start until cleared funds are received.
  </div>
  <table>
    <thead>
      <tr><th style="width:5%">#</th><th style="width:32%">STAGE</th><th class="right" style="width:22%">AMOUNT (EX GST)</th><th class="right" style="width:22%">% OF CONTRACT</th><th style="width:19%">DUE</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="pay-stage">1</td>
        <td><strong>Booking Deposit</strong><br><span class="pay-note">Secures your place in the schedule</span></td>
        <td class="right">${$(depositAmt)}</td>
        <td class="right">${depositPct}%</td>
        <td class="pay-note">On acceptance</td>
      </tr>
      <tr>
        <td class="pay-stage">2</td>
        <td><strong>Material Payment</strong><br><span class="pay-note">Works do not start until paid</span></td>
        <td class="right">${$(materialAmt)}</td>
        <td class="right">50%</td>
        <td class="pay-note">Prior to start date</td>
      </tr>
      <tr>
        <td class="pay-stage">3</td>
        <td><strong>Final Claim</strong><br><span class="pay-note">On practical completion and sign-off</span></td>
        <td class="right">${$(finalAmt)}</td>
        <td class="right">${finalPct}%</td>
        <td class="pay-note">Within 3 business days</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="grand-total"><td colspan="2" style="text-align:right;">TOTAL CONTRACT VALUE (EX GST)</td><td class="right">${$(subtotal)}</td><td class="right">100%</td><td></td></tr>
    </tfoot>
  </table>
  <div class="callout" style="margin-top:14pt;">
    <strong>UPFRONT PAYMENT DISCOUNT:</strong> A <strong>5% discount</strong> (capped at $1,000) is available for clients who pay the full contract amount upfront prior to commencement. Contact us to arrange.
  </div>
</div>

<!-- ═══ PAGE 5: TIMELINE + KEY TERMS ═══ -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">06</div><h2>PROJECT TIMELINE</h2></div>
  <div class="field-grid-3">
    <div class="field"><div class="field-lbl">ESTIMATED START DATE</div><div class="field-val">${startDate || 'TBC'}</div></div>
    <div class="field"><div class="field-lbl">ESTIMATED DURATION</div><div class="field-val">${duration || 'TBC'}</div></div>
    <div class="field"><div class="field-lbl">ESTIMATED COMPLETION</div><div class="field-val">${completion || 'TBC'}</div></div>
  </div>
  <div class="callout" style="margin-top:12pt; margin-bottom:18pt;">
    <strong>TIMELINE NOTE:</strong> Microcement is a multi-coat system requiring full cure time between each coat. Timeline assumes unobstructed site access, no other trades in the same area, and standard environmental conditions. Delays caused by other trades, wet weather, or restricted access will be communicated promptly.
  </div>

  <div class="sec-hd"><div class="sec-num">07</div><h2>TERMS &amp; CONDITIONS SUMMARY</h2></div>
  <div class="tc-grid">
    <div class="tc-item"><div class="tc-head">Quote Validity</div>This quote is valid for the period stated above from date of issue. After expiry, pricing must be reconfirmed in writing.</div>
    <div class="tc-item"><div class="tc-head">Variations</div>All variations must be agreed in writing before work commences. Rate: $150/hr (2-hour minimum).</div>
    <div class="tc-item"><div class="tc-head">Workmanship Warranty</div>All workmanship is covered under statutory warranties as required by Queensland law.</div>
    <div class="tc-item"><div class="tc-head">Product Warranty</div>Manufacturer warranties on all Ideal Works and Solidro products are passed through to the client in full.</div>
    <div class="tc-item"><div class="tc-head">Payment Disputes</div>No third-party contractors may be engaged to rectify alleged defects until a written resolution is agreed upon by both parties.</div>
    <div class="tc-item"><div class="tc-head">Overdue Payments</div>Invoices overdue by 3+ days incur a $220 admin fee. Interest accrues at 3% per week from Day 4. External recovery at Day 30.</div>
    <div class="tc-item"><div class="tc-head">Site Access</div>The client must ensure unobstructed access to the work area for the full project duration. Restricted access may result in delays and additional charges.</div>
    <div class="tc-item"><div class="tc-head">Termination</div>Either party may terminate with written notice. All completed work will be invoiced and is payable immediately upon termination.</div>
    <div class="tc-item"><div class="tc-head">Colour &amp; Finish</div>Microcement colour and finish may vary from samples due to substrate, lighting, and application conditions. Samples are indicative only.</div>
    <div class="tc-item"><div class="tc-head">Substrate Responsibility</div>The client is responsible for ensuring the substrate is structurally sound, clean, and free from contamination prior to commencement.</div>
  </div>
  <div class="callout" style="margin-top:12pt;">
    <strong>FULL TERMS &amp; CONDITIONS:</strong> The above is a summary only. Full Payment Terms &amp; Conditions are set out in the companion document. By signing below, the client acknowledges they have read, understood, and agree to the full terms.
  </div>
</div>

<!-- ═══ PAGE 6: SIGNATURES ═══ -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">08</div><h2>ACCEPTANCE &amp; SIGNATURE</h2></div>
  <div class="callout" style="margin-bottom:18pt;">
    <strong>HOW TO ACCEPT:</strong> Sign below (or print, sign, and return). Pay the booking deposit to confirm your start date. This quote becomes a binding agreement once signed by both parties and the deposit is received.
  </div>

  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-label">CLIENT SIGNATURE</div>
      <div class="sig-line">${sigDataURL ? `<img src="${sigDataURL}" alt="Client Signature">` : ''}</div>
      <div class="sig-sub">Full Name: ${clientName || '___________________________'}</div>
      <div class="sig-sub" style="margin-top:4pt;">Date: ___________________________</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">MICRO CEMENT KING — AUTHORISED SIGNATORY</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Name: King Mannion</div>
      <div class="sig-sub" style="margin-top:4pt;">Title: Director</div>
      <div class="sig-sub" style="margin-top:4pt;">Date: ___________________________</div>
    </div>
  </div>

  <div class="legal-footer">
    By signing this document (digitally or in print), the client confirms they have read and agree to all terms summarised in Section 07 and the full Payment Terms &amp; Conditions.<br>
    This quote is a formal offer to perform the described works. It does not constitute a binding contract until signed by both parties and the booking deposit is received.
  </div>

  <div class="doc-footer">
    <span class="gold">MICRO CEMENT KING</span> &nbsp;|&nbsp; 0468 053 819 &nbsp;|&nbsp; projects@microcementking.com.au &nbsp;|&nbsp; microcementking.com.au
  </div>
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 600);
  };
</script>
</body>
</html>`;

  // ── 3. Open in new window ──
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
  }
}


// ── INIT ON LOAD ──
document.addEventListener('DOMContentLoaded', initQuote);
