// ═══════════════════════════════════════════════════════════
// MCK QUOTE GENERATOR LOGIC
// Features: Signature, Credit Limit, Pay-in-Full, Share,
//           WhatsApp, Revision History, PDF Generation
// ═══════════════════════════════════════════════════════════

// Helper: format YYYY-MM-DD date to DD/MM/YYYY for display
function formatDateForPDF(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

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
  renderQuoteHistory();
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

  // Read settings for deposit/payment logic
  const s = typeof getSetting === 'function' ? getSetting : (k => null);
  const threshold = s('deposit_threshold') || 20000;
  const depOver = s('deposit_pct_over') || 5;
  const depUnder = s('deposit_pct_under') || 10;
  const matPct = s('material_pct') || 50;
  const creditLimit = s('credit_limit') || 10000;
  const upfrontDiscPct = s('upfront_discount_pct') || 5;
  const upfrontDiscCap = s('upfront_discount_cap') || 1000;

  const depositPct = subtotal > threshold ? depOver : depUnder;
  const depositAmt = subtotal * (depositPct / 100);
  const materialAmt = subtotal * (matPct / 100);
  const finalPct = 100 - depositPct - matPct;
  const finalAmt = subtotal - depositAmt - materialAmt;

  document.getElementById('q-deposit-amt').textContent = '$' + depositAmt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-deposit-pct').textContent = depositPct + '%';
  document.getElementById('q-material-amt').textContent = '$' + materialAmt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-final-amt').textContent = '$' + finalAmt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('q-final-pct').textContent = finalPct + '%';
  document.getElementById('q-payment-total').textContent = '$' + subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

  // Credit limit warning
  const creditWarn = document.getElementById('q-credit-warning');
  if (creditWarn) {
    if (subtotal > creditLimit && creditLimit > 0) {
      creditWarn.style.display = 'block';
      creditWarn.innerHTML = `<strong>CREDIT LIMIT EXCEEDED:</strong> Contract value ($${subtotal.toLocaleString()}) exceeds the $${creditLimit.toLocaleString()} credit limit. Deposit and material payment must be received before work commences. No credit terms available for this contract.`;
    } else {
      creditWarn.style.display = 'none';
    }
  }

  // Pay-in-full discount
  const upfrontEl = document.getElementById('q-upfront-discount');
  if (upfrontEl) {
    const disc = Math.min(subtotal * (upfrontDiscPct / 100), upfrontDiscCap);
    const discTotal = subtotal - disc;
    upfrontEl.innerHTML = `<strong>UPFRONT PAYMENT DISCOUNT:</strong> A <strong>${upfrontDiscPct}% discount</strong> (capped at $${upfrontDiscCap.toLocaleString()}) is available for clients who pay the full contract amount upfront prior to commencement. Upfront price: <strong>$${discTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> (saving $${disc.toLocaleString(undefined, {minimumFractionDigits:2})}).`;
  }

  if (subtotal === 0) {
    ['q-deposit-amt','q-material-amt','q-final-amt','q-payment-total'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    document.getElementById('q-deposit-pct').textContent = '—';
    document.getElementById('q-final-pct').textContent = '—';
  }
}


// ═══════════════════════════════════════════════════════════
// SIGNATURE CANVAS — BOTH CLIENT AND MCK AUTHORISED
// ═══════════════════════════════════════════════════════════

function initSignature() {
  initSigCanvas('q-sig-canvas', 'q-canvas-wrap', 'q-canvas-hint', 'q-accept-btn');
  initSigCanvas('q-mck-sig-canvas', 'q-mck-canvas-wrap', 'q-mck-canvas-hint', 'q-mck-accept-btn');
  initSigCanvas('tc-sig-canvas', 'tc-canvas-wrap', 'tc-canvas-hint', 'tc-accept-btn');

  // Set default dates to today
  const today = new Date().toISOString().split('T')[0];
  ['q-sig-date', 'q-mck-sig-date', 'tc-sig-date', 'tc-mck-sig-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });
}

function initSigCanvas(canvasId, wrapId, hintId, acceptBtnId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;

  function resize() {
    const wrap = document.getElementById(wrapId);
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
      const hint = document.getElementById(hintId);
      if (hint) hint.style.display = 'none';
      const btn = document.getElementById(acceptBtnId);
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
  clearSigCanvas('q-sig-canvas', 'q-canvas-hint', 'q-sig-accepted-banner', 'q-accept-btn');
}

function clearMCKSig() {
  clearSigCanvas('q-mck-sig-canvas', 'q-mck-canvas-hint', 'q-mck-sig-accepted-banner', 'q-mck-accept-btn');
}

function clearTcSig() {
  clearSigCanvas('tc-sig-canvas', 'tc-canvas-hint', 'tc-sig-accepted-banner', 'tc-accept-btn');
}

function acceptTcSig() {
  acceptSigCanvas('tc-sig-canvas', 'tc-sig-accepted-banner', 'tc-sig-image', 'CLIENT (T&Cs)');
}

function clearSigCanvas(canvasId, hintId, bannerId, acceptBtnId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const hint = document.getElementById(hintId);
  if (hint) hint.style.display = 'block';
  const banner = document.getElementById(bannerId);
  if (banner) banner.style.display = 'none';
  const btn = document.getElementById(acceptBtnId);
  if (btn) btn.disabled = true;
}

function acceptQuoteSig() {
  acceptSigCanvas('q-sig-canvas', 'q-sig-accepted-banner', 'q-sig-image', 'CLIENT');
}

function acceptMCKSig() {
  acceptSigCanvas('q-mck-sig-canvas', 'q-mck-sig-accepted-banner', 'q-mck-sig-image', 'MCK AUTHORISED');
}

function acceptSigCanvas(canvasId, bannerId, imageId, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  if (canvas.toDataURL() === blank.toDataURL()) {
    alert('Please sign before accepting.');
    return;
  }
  const banner = document.getElementById(bannerId);
  if (banner) {
    banner.style.display = 'block';
    const lbl = banner.querySelector('.acc-label');
    if (lbl) lbl.textContent = label + ' SIGNATURE ACCEPTED — ' + new Date().toLocaleString();
  }
  const img = document.getElementById(imageId);
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
  clearMCKSig();
}


// ═══════════════════════════════════════════════════════════
// QUOTE DATA EXTRACTION (shared by PDF, Share, History)
// ═══════════════════════════════════════════════════════════

function extractQuoteData() {
  const txt = id => {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.textContent || el.innerText || '').trim().replace(/^\u00a0$/, '');
  };

  const quoteNumber = txt('q-quote-number') || 'MCK-2026-XXXX';
  const dateIssued = txt('q-date-display') || new Date().toLocaleDateString('en-AU');
  const validitySel = document.getElementById('q-validity-select');
  const validityLabel = validitySel ? validitySel.options[validitySel.selectedIndex].text : '48 Hours';
  const validityHours = validitySel ? parseInt(validitySel.value) : 48;
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

  const s = typeof getSetting === 'function' ? getSetting : (k => null);
  const threshold = s('deposit_threshold') || 20000;
  const depOver = s('deposit_pct_over') || 5;
  const depUnder = s('deposit_pct_under') || 10;
  const matPct = s('material_pct') || 50;
  const creditLimit = s('credit_limit') || 10000;
  const upfrontDiscPct = s('upfront_discount_pct') || 5;
  const upfrontDiscCap = s('upfront_discount_cap') || 1000;
  const variationRate = s('variation_rate') || 150;
  const variationMinHrs = s('variation_min_hours') || 2;
  const overdueAdminFee = s('overdue_admin_fee') || 220;
  const overdueInterest = s('overdue_interest_pct_week') || 3;
  const measureFee = s('measure_fee') || 220;

  const depositPct = subtotal > threshold ? depOver : depUnder;
  const depositAmt = subtotal * (depositPct / 100);
  const materialAmt = subtotal * (matPct / 100);
  const finalPct = 100 - depositPct - matPct;
  const finalAmt = subtotal - depositAmt - materialAmt;
  const upfrontDisc = Math.min(subtotal * (upfrontDiscPct / 100), upfrontDiscCap);
  const upfrontTotal = subtotal - upfrontDisc;

  const getListItems = id => {
    const el = document.getElementById(id);
    if (!el) return [];
    return Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim()).filter(t => t);
  };
  const inclusions = getListItems('q-inclusions');
  const exclusions = getListItems('q-exclusions');

  // Signature images
  let sigDataURL = '';
  const sigCanvas = document.getElementById('q-sig-canvas');
  if (sigCanvas) {
    const blank = document.createElement('canvas');
    blank.width = sigCanvas.width; blank.height = sigCanvas.height;
    if (sigCanvas.toDataURL() !== blank.toDataURL()) sigDataURL = sigCanvas.toDataURL();
  }
  let mckSigDataURL = '';
  const mckSigCanvas = document.getElementById('q-mck-sig-canvas');
  if (mckSigCanvas) {
    const blank = document.createElement('canvas');
    blank.width = mckSigCanvas.width; blank.height = mckSigCanvas.height;
    if (mckSigCanvas.toDataURL() !== blank.toDataURL()) mckSigDataURL = mckSigCanvas.toDataURL();
  }

  // Typed names and dates
  const clientTypedName = (document.getElementById('q-sig-typed-name') || {}).value || '';
  const clientSigDate = (document.getElementById('q-sig-date') || {}).value || '';
  const mckTypedName = (document.getElementById('q-mck-typed-name') || {}).value || 'King Mannion';
  const mckTypedTitle = (document.getElementById('q-mck-typed-title') || {}).value || 'Director';
  const mckSigDate = (document.getElementById('q-mck-sig-date') || {}).value || '';

  return {
    quoteNumber, dateIssued, validityLabel, validityHours, validityBanner, preparedBy,
    clientName, clientPhone, clientEmail, projectAddress, siteContact,
    colourFinish, substrate, scope, startDate, duration, completion,
    lineItems, subtotal, gst, grandTotal,
    depositPct, depositAmt, materialAmt, finalPct, finalAmt, matPct,
    creditLimit, upfrontDiscPct, upfrontDiscCap, upfrontDisc, upfrontTotal,
    variationRate, variationMinHrs, overdueAdminFee, overdueInterest, measureFee,
    inclusions, exclusions, sigDataURL, mckSigDataURL,
    clientTypedName, clientSigDate, mckTypedName, mckTypedTitle, mckSigDate,
    createdAt: new Date().toISOString(),
  };
}


// ═══════════════════════════════════════════════════════════
// BUILD STATIC QUOTE HTML (shared by PDF and Share)
// ═══════════════════════════════════════════════════════════

function buildQuoteHTML(d, options = {}) {
  const $ = v => '$' + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  const showAcceptBtn = options.showAcceptBtn || false;
  const showPrintBtn = options.showPrintBtn || false;
  const isExpired = options.isExpired || false;
  const status = options.status || 'PENDING';

  let statusBanner = '';
  if (isExpired) {
    statusBanner = `<div style="background:#ff4444!important;color:#fff!important;text-align:center;padding:10pt;font-weight:800;font-size:11pt;letter-spacing:2px;text-transform:uppercase;margin-bottom:14pt;border-radius:4px;">THIS QUOTE HAS EXPIRED</div>`;
  } else if (status === 'ACCEPTED') {
    statusBanner = `<div style="background:#27AE60!important;color:#fff!important;text-align:center;padding:10pt;font-weight:800;font-size:11pt;letter-spacing:2px;text-transform:uppercase;margin-bottom:14pt;border-radius:4px;">QUOTE ACCEPTED</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>MCK Quote — ${d.quoteNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
  box-sizing: border-box;
}
@page { size: A4 portrait; margin: 15mm; }
html, body {
  margin: 0; padding: 0;
  background: #0a0a0a !important;
  color: #ffffff !important;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 10pt; line-height: 1.5;
}
.container { max-width: 800px; margin: 0 auto; padding: 20pt; }
.page-section { page-break-after: always; padding: 0; }
.page-section:last-child { page-break-after: auto; }
.doc-header { border-bottom: 2px solid #c9a84c; padding-bottom: 16pt; margin-bottom: 16pt; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14pt; flex-wrap: wrap; gap: 12pt; }
.brand-block .label { font-size: 8pt; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4pt; }
.brand-block h1 { font-size: 22pt; color: #ffffff; margin: 0 0 4pt 0; letter-spacing: 2px; font-weight: 800; }
.brand-block .tagline { font-size: 8.5pt; color: #aaaaaa; letter-spacing: 1px; }
.contact-block { text-align: right; font-size: 8.5pt; color: #aaaaaa; line-height: 2; }
.contact-block strong { color: #c9a84c; font-size: 7pt; letter-spacing: 1px; margin-right: 6pt; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; background: #1a1a1a !important; border: 1px solid #333; border-radius: 4px; overflow: hidden; }
.meta-cell { padding: 8pt 12pt; border-right: 1px solid #333; }
.meta-cell:last-child { border-right: none; }
.meta-label { font-size: 6.5pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 3pt; font-weight: 600; }
.meta-value { font-size: 10pt; color: #ffffff; font-weight: 600; }
.validity-banner { background: #c9a84c !important; color: #000000 !important; text-align: center; padding: 7pt 12pt; font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 14pt 0; border-radius: 3px; }
.sec-hd { display: flex; align-items: center; gap: 10pt; margin-bottom: 12pt; padding-bottom: 8pt; border-bottom: 1px solid #333; }
.sec-num { background: #c9a84c !important; color: #000000 !important; font-weight: 800; font-size: 9pt; padding: 3pt 8pt; border-radius: 3px; min-width: 24pt; text-align: center; }
.sec-hd h2 { margin: 0; font-size: 11pt; color: #c9a84c; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
.field-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }
.field-full { grid-column: 1 / -1; }
.field { background: #111111 !important; border: 1px solid #333; border-radius: 3px; padding: 6pt 10pt; }
.field-lbl { font-size: 6.5pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 2pt; }
.field-val { font-size: 9.5pt; color: #ffffff; min-height: 12pt; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; }
th { background: #1a1a1a !important; color: #c9a84c !important; font-size: 7pt; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; padding: 6pt 8pt; border: 1px solid #c9a84c; text-align: left; }
th.right { text-align: right; }
td { background: #111111 !important; color: #ffffff !important; font-size: 9pt; padding: 5pt 8pt; border: 1px solid #333; }
td.right { text-align: right; }
tr:nth-child(even) td { background: #0d0d0d !important; }
tfoot td { background: #1a1a1a !important; font-weight: 700; border-top: 2px solid #c9a84c !important; }
.grand-total td { color: #c9a84c !important; font-size: 11pt; font-weight: 800; border-top: 2px solid #c9a84c !important; }
.callout { background: #1a1a1a !important; border-left: 3px solid #c9a84c; padding: 8pt 12pt; font-size: 8pt; color: #ffffff; line-height: 1.6; border-radius: 0 3px 3px 0; margin: 10pt 0; }
.callout strong { color: #c9a84c; }
.callout.warning { border-left-color: #ff4444; }
.callout.warning strong { color: #ff4444; }
.inc-exc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }
.ie-col { background: #111111 !important; border: 1px solid #333; border-radius: 4px; padding: 10pt 12pt; }
.ie-col h3 { margin: 0 0 8pt 0; font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; padding-bottom: 6pt; border-bottom: 1px solid #333; }
.ie-col.inc h3 { color: #c9a84c; }
.ie-col.exc h3 { color: #aaaaaa; }
.ie-item { font-size: 8.5pt; color: #ffffff; padding: 3pt 0; line-height: 1.5; }
.ie-item .tick { color: #c9a84c; font-weight: 700; margin-right: 6pt; }
.ie-item .cross { color: #ff6b6b; font-weight: 700; margin-right: 6pt; }
.pay-stage { font-size: 7pt; color: #c9a84c; font-weight: 700; }
.pay-note { font-size: 7.5pt; color: #aaaaaa; font-style: italic; }
.tc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
.tc-item { background: #111111 !important; border: 1px solid #333; border-radius: 3px; padding: 8pt 10pt; font-size: 8pt; color: #ffffff; line-height: 1.5; }
.tc-item .tc-head { color: #c9a84c; font-weight: 700; font-size: 7pt; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3pt; }
.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24pt; margin-top: 16pt; }
.sig-block {}
.sig-label { font-size: 7pt; color: #c9a84c; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 6pt; }
.sig-line { border-bottom: 1px solid #c9a84c; height: 36pt; margin-bottom: 4pt; position: relative; }
.sig-line img { position: absolute; bottom: 2pt; left: 0; max-height: 32pt; max-width: 200pt; }
.sig-sub { font-size: 8pt; color: #aaaaaa; margin-top: 4pt; }
.doc-footer { margin-top: 20pt; padding: 10pt 14pt; background: #1a1a1a !important; border: 1px solid #333; border-radius: 3px; text-align: center; font-size: 8pt; color: #aaaaaa; line-height: 1.8; }
.doc-footer .gold { color: #c9a84c; font-weight: 700; }
.legal-footer { margin-top: 14pt; padding: 10pt 14pt; background: #111111 !important; border: 1px solid #333; border-radius: 3px; text-align: center; font-size: 7.5pt; color: #aaaaaa; line-height: 1.8; }
.legal-footer strong { color: #c9a84c; }
.action-bar { text-align: center; margin: 20pt 0; }
.action-btn { background: #c9a84c; color: #000; border: none; padding: 14px 36px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; border-radius: 4px; margin: 0 8px; }
.action-btn:hover { opacity: 0.9; }
.action-btn.ghost { background: transparent; border: 2px solid #c9a84c; color: #c9a84c; }
@media (max-width: 600px) {
  .meta-grid { grid-template-columns: 1fr 1fr; }
  .field-grid, .inc-exc-grid, .sig-grid, .tc-grid { grid-template-columns: 1fr; }
  .field-grid-3 { grid-template-columns: 1fr; }
  .header-row { flex-direction: column; }
  .contact-block { text-align: left; }
  .container { padding: 12pt; }
}
@media print {
  html, body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background: #0a0a0a !important; }
  .action-bar, .no-print { display: none !important; }
}
</style>
</head>
<body>
<div class="container">
${statusBanner}

<!-- PAGE 1: HEADER + CLIENT DETAILS -->
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
      <div class="meta-cell"><div class="meta-label">QUOTE NUMBER</div><div class="meta-value">${d.quoteNumber}</div></div>
      <div class="meta-cell"><div class="meta-label">DATE ISSUED</div><div class="meta-value">${d.dateIssued}</div></div>
      <div class="meta-cell"><div class="meta-label">VALIDITY</div><div class="meta-value">${d.validityLabel}</div></div>
      <div class="meta-cell"><div class="meta-label">PREPARED BY</div><div class="meta-value">${d.preparedBy}</div></div>
    </div>
  </div>
  <div class="validity-banner">${d.validityBanner}</div>
  <div class="sec-hd"><div class="sec-num">01</div><h2>CLIENT DETAILS</h2></div>
  <div class="field-grid">
    <div class="field"><div class="field-lbl">CLIENT NAME</div><div class="field-val">${d.clientName || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">PROJECT ADDRESS</div><div class="field-val">${d.projectAddress || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">PHONE NUMBER</div><div class="field-val">${d.clientPhone || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">SITE CONTACT</div><div class="field-val">${d.siteContact || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">EMAIL ADDRESS</div><div class="field-val">${d.clientEmail || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">PREPARED BY</div><div class="field-val">${d.preparedBy}</div></div>
  </div>
  <div style="height:14pt;"></div>
  <div class="sec-hd"><div class="sec-num">02</div><h2>PROJECT SCOPE</h2></div>
  <div class="field-grid">
    <div class="field"><div class="field-lbl">COLOUR / FINISH</div><div class="field-val">${d.colourFinish || '\u2014'}</div></div>
    <div class="field"><div class="field-lbl">SUBSTRATE</div><div class="field-val">${d.substrate || '\u2014'}</div></div>
  </div>
  <div style="height:8pt;"></div>
  <div class="field field-full"><div class="field-lbl">SCOPE OF WORKS</div><div class="field-val">${d.scope || '\u2014'}</div></div>
</div>

<!-- PAGE 2: PRICING -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">03</div><h2>SCOPE OF WORKS &amp; PRICING</h2></div>
  <table>
    <thead><tr><th style="width:42%">DESCRIPTION</th><th class="right" style="width:10%">QTY</th><th style="width:12%">UNIT</th><th class="right" style="width:18%">RATE (EX GST)</th><th class="right" style="width:18%">TOTAL (EX GST)</th></tr></thead>
    <tbody>${d.lineItems.map(l => `<tr><td>${l.desc}</td><td class="right">${l.qty}</td><td>${l.unit}</td><td class="right">${$(l.rate)}</td><td class="right">${$(l.total)}</td></tr>`).join('')}</tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right;">SUBTOTAL (EX GST)</td><td class="right">${$(d.subtotal)}</td></tr>
      <tr><td colspan="4" style="text-align:right;">GST (10%)</td><td class="right">${$(d.gst)}</td></tr>
      <tr class="grand-total"><td colspan="4" style="text-align:right;">TOTAL (INC GST)</td><td class="right">${$(d.grandTotal)}</td></tr>
    </tfoot>
  </table>
  ${d.subtotal > d.creditLimit ? `<div class="callout warning"><strong>CREDIT LIMIT NOTE:</strong> Contract value exceeds the $${d.creditLimit.toLocaleString()} credit limit. Full deposit and material payment required before commencement. No credit terms available.</div>` : ''}
  <div class="callout"><strong>ON-SITE MEASURE FEE:</strong> A non-refundable on-site measure fee of <strong>$${d.measureFee} ex GST</strong> applies where a site visit is required. This fee is <strong>credited in full against the contract</strong> upon acceptance.</div>
</div>

<!-- PAGE 3: INCLUSIONS & EXCLUSIONS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">04</div><h2>INCLUSIONS &amp; EXCLUSIONS</h2></div>
  <div class="inc-exc-grid">
    <div class="ie-col inc"><h3>INCLUSIONS</h3>${d.inclusions.map(i => `<div class="ie-item"><span class="tick">\u2713</span>${i}</div>`).join('')}</div>
    <div class="ie-col exc"><h3>EXCLUSIONS</h3>${d.exclusions.map(e => `<div class="ie-item"><span class="cross">\u2717</span>${e}</div>`).join('')}</div>
  </div>
</div>

<!-- PAGE 4: PAYMENT SCHEDULE -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">05</div><h2>PAYMENT SCHEDULE</h2></div>
  <div class="callout" style="margin-bottom:14pt;"><strong>PAYMENT STRUCTURE:</strong> Booking deposit is <strong>${d.depositPct}%</strong> ${d.subtotal > (d.creditLimit || 20000) ? '(contract exceeds credit limit)' : d.subtotal > 20000 ? '(contract value exceeds $20,000)' : '(contract value under $20,000)'}. Material payment is due before commencement.</div>
  <table>
    <thead><tr><th style="width:5%">#</th><th style="width:32%">STAGE</th><th class="right" style="width:22%">AMOUNT (EX GST)</th><th class="right" style="width:22%">% OF CONTRACT</th><th style="width:19%">DUE</th></tr></thead>
    <tbody>
      <tr><td class="pay-stage">1</td><td><strong>Booking Deposit</strong><br><span class="pay-note">Secures your place in the schedule</span></td><td class="right">${$(d.depositAmt)}</td><td class="right">${d.depositPct}%</td><td class="pay-note">On acceptance</td></tr>
      <tr><td class="pay-stage">2</td><td><strong>Material Payment</strong><br><span class="pay-note">Works do not start until paid</span></td><td class="right">${$(d.materialAmt)}</td><td class="right">${d.matPct}%</td><td class="pay-note">Prior to start date</td></tr>
      <tr><td class="pay-stage">3</td><td><strong>Final Claim</strong><br><span class="pay-note">On practical completion and sign-off</span></td><td class="right">${$(d.finalAmt)}</td><td class="right">${d.finalPct}%</td><td class="pay-note">Within 3 business days</td></tr>
    </tbody>
    <tfoot><tr class="grand-total"><td colspan="2" style="text-align:right;">TOTAL CONTRACT VALUE (EX GST)</td><td class="right">${$(d.subtotal)}</td><td class="right">100%</td><td></td></tr></tfoot>
  </table>
  <div class="callout" style="margin-top:14pt;"><strong>UPFRONT PAYMENT DISCOUNT:</strong> A <strong>${d.upfrontDiscPct}% discount</strong> (capped at $${d.upfrontDiscCap.toLocaleString()}) is available for clients who pay the full contract amount upfront. Upfront price: <strong>${$(d.upfrontTotal)}</strong> (saving ${$(d.upfrontDisc)}).</div>
</div>

<!-- PAGE 5: TIMELINE + KEY TERMS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">06</div><h2>PROJECT TIMELINE</h2></div>
  <div class="field-grid-3">
    <div class="field"><div class="field-lbl">ESTIMATED START DATE</div><div class="field-val">${d.startDate || 'TBC'}</div></div>
    <div class="field"><div class="field-lbl">ESTIMATED DURATION</div><div class="field-val">${d.duration || 'TBC'}</div></div>
    <div class="field"><div class="field-lbl">ESTIMATED COMPLETION</div><div class="field-val">${d.completion || 'TBC'}</div></div>
  </div>
  <div class="callout" style="margin-top:12pt;margin-bottom:18pt;"><strong>TIMELINE NOTE:</strong> Microcement is a multi-coat system requiring full cure time between each coat. Timeline assumes unobstructed site access, no other trades in the same area, and standard environmental conditions.</div>
  <div class="sec-hd"><div class="sec-num">07</div><h2>TERMS &amp; CONDITIONS SUMMARY</h2></div>
  <div class="tc-grid">
    <div class="tc-item"><div class="tc-head">Quote Validity</div>This quote is valid for the period stated above from date of issue. After expiry, pricing must be reconfirmed.</div>
    <div class="tc-item"><div class="tc-head">Variations</div>All variations must be agreed in writing. Rate: $${d.variationRate}/hr (${d.variationMinHrs}-hour minimum).</div>
    <div class="tc-item"><div class="tc-head">Workmanship Warranty</div>All workmanship is covered under statutory warranties as required by Queensland law.</div>
    <div class="tc-item"><div class="tc-head">Product Warranty</div>Manufacturer warranties on all Ideal Works and Solidro products are passed through to the client in full.</div>
    <div class="tc-item"><div class="tc-head">Payment Disputes</div>No third-party contractors may be engaged to rectify alleged defects until a written resolution is agreed upon by both parties.</div>
    <div class="tc-item"><div class="tc-head">Overdue Payments</div>Invoices overdue by 3+ days incur a $${d.overdueAdminFee} admin fee. Interest accrues at ${d.overdueInterest}% per week from Day 4.</div>
    <div class="tc-item"><div class="tc-head">Site Access</div>The client must ensure unobstructed access to the work area for the full project duration.</div>
    <div class="tc-item"><div class="tc-head">Termination</div>Either party may terminate with written notice. All completed work is payable immediately upon termination.</div>
    <div class="tc-item"><div class="tc-head">Colour &amp; Finish</div>Microcement colour and finish may vary from samples due to substrate, lighting, and application conditions.</div>
    <div class="tc-item"><div class="tc-head">Substrate Responsibility</div>The client is responsible for ensuring the substrate is structurally sound prior to commencement.</div>
  </div>
  <div class="callout" style="margin-top:12pt;"><strong>FULL TERMS &amp; CONDITIONS:</strong> The above is a summary only. Full Payment Terms &amp; Conditions are set out in the companion document.</div>
</div>

<!-- PAGE 6: SIGNATURES -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">08</div><h2>ACCEPTANCE &amp; SIGNATURE</h2></div>
  <div class="callout" style="margin-bottom:18pt;"><strong>HOW TO ACCEPT:</strong> Sign below (or print, sign, and return). Pay the booking deposit to confirm your start date.</div>
  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-label">CLIENT SIGNATURE</div>
      <div class="sig-line">${d.sigDataURL ? `<img src="${d.sigDataURL}" alt="Client Signature">` : ''}</div>
      <div class="sig-sub">Full Name: <strong style="color:#fff;">${d.clientTypedName || d.clientName || '___________________________'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Date: <strong style="color:#fff;">${d.clientSigDate ? formatDateForPDF(d.clientSigDate) : '___________________________'}</strong></div>
    </div>
    <div class="sig-block">
      <div class="sig-label">MICRO CEMENT KING — AUTHORISED SIGNATORY</div>
      <div class="sig-line">${d.mckSigDataURL ? `<img src="${d.mckSigDataURL}" alt="MCK Signature">` : ''}</div>
      <div class="sig-sub">Name: <strong style="color:#fff;">${d.mckTypedName || 'King Mannion'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Title: <strong style="color:#fff;">${d.mckTypedTitle || 'Director'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Date: <strong style="color:#fff;">${d.mckSigDate ? formatDateForPDF(d.mckSigDate) : '___________________________'}</strong></div>
    </div>
  </div>
  <div class="legal-footer">By signing this document, the client confirms they have read and agree to all terms summarised in Section 07 and the full Payment Terms &amp; Conditions.<br>This quote is a formal offer. It does not constitute a binding contract until signed by both parties and the booking deposit is received.</div>
  <div class="doc-footer"><span class="gold">MICRO CEMENT KING</span> &nbsp;|&nbsp; 0468 053 819 &nbsp;|&nbsp; projects@microcementking.com.au &nbsp;|&nbsp; microcementking.com.au</div>
</div>

${showPrintBtn || showAcceptBtn ? `<div class="action-bar no-print">
  ${showPrintBtn ? '<button class="action-btn ghost" onclick="window.print()">PRINT / SAVE PDF</button>' : ''}
  ${showAcceptBtn && !isExpired ? '<button class="action-btn" onclick="showAcceptModal()">ACCEPT &amp; SIGN</button>' : ''}
</div>` : ''}

</div>
${!showAcceptBtn ? `<script>window.onload=function(){setTimeout(function(){window.print();},600);};</script>` : ''}
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════
// GENERATE PDF QUOTE
// ═══════════════════════════════════════════════════════════

function generatePDFQuote() {
  const d = extractQuoteData();
  const html = buildQuoteHTML(d);

  // Save to revision history
  saveQuoteRevision(d);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
  }
}


// ═══════════════════════════════════════════════════════════
// SHAREABLE QUOTE LINK
// ═══════════════════════════════════════════════════════════

function generateShareableLink() {
  const d = extractQuoteData();

  // Save to revision history
  saveQuoteRevision(d);

  // Encode quote data as base64 URL parameter
  const jsonStr = JSON.stringify(d);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));

  // Build the shareable URL
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
  const shareUrl = baseUrl + 'quote-viewer.html?data=' + base64;

  // Show the link in a modal
  showShareModal(shareUrl, d.clientName);
}

function showShareModal(url, clientName) {
  // Remove existing modal
  const existing = document.getElementById('share-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

  modal.innerHTML = `
    <div style="background:#111;border:1px solid #c9a84c;border-radius:8px;padding:30px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;">
      <h3 style="color:#c9a84c;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px 0;">SHAREABLE QUOTE LINK</h3>
      <div style="background:#0a0a0a;border:1px solid #333;border-radius:4px;padding:12px;margin-bottom:16px;word-break:break-all;">
        <input type="text" id="share-url-input" value="${url}" readonly style="width:100%;background:transparent;border:none;color:#fff;font-family:monospace;font-size:11px;outline:none;">
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="copyShareLink()" style="background:#c9a84c;color:#000;border:none;padding:12px 24px;font-family:inherit;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:4px;" id="copy-link-btn">COPY LINK</button>
        <button onclick="shareViaWhatsApp('${url}','${(clientName || '').replace(/'/g, "\\'")}');" style="background:#25D366;color:#fff;border:none;padding:12px 24px;font-family:inherit;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:4px;">SEND VIA WHATSAPP</button>
        <button onclick="document.getElementById('share-modal').remove();" style="background:transparent;border:1px solid #666;color:#aaa;padding:12px 24px;font-family:inherit;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;border-radius:4px;">CLOSE</button>
      </div>
      <p style="color:#666;font-size:10px;margin-top:14px;line-height:1.6;">This link contains the full quote data encoded in the URL. The recipient can view, print, and accept the quote from their browser. The link will work as long as the website is live.</p>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function copyShareLink() {
  const input = document.getElementById('share-url-input');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('copy-link-btn');
    if (btn) {
      btn.textContent = 'COPIED ✓';
      btn.style.background = '#27AE60';
      setTimeout(() => { btn.textContent = 'COPY LINK'; btn.style.background = '#c9a84c'; }, 2000);
    }
  }).catch(() => {
    document.execCommand('copy');
  });
}

function shareViaWhatsApp(url, clientName) {
  const name = clientName || 'there';
  const message = `Hi ${name}, please find your Micro Cement King quote here: ${url}`;
  const waUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
  window.open(waUrl, '_blank');
}

// Direct WhatsApp button (from quote tab)
function shareQuoteWhatsApp() {
  const d = extractQuoteData();
  saveQuoteRevision(d);

  const jsonStr = JSON.stringify(d);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
  const shareUrl = baseUrl + 'quote-viewer.html?data=' + base64;

  const name = d.clientName || 'there';
  const message = `Hi ${name}, please find your Micro Cement King quote here: ${shareUrl}`;
  const waUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
  window.open(waUrl, '_blank');
}


// ═══════════════════════════════════════════════════════════
// REVISION HISTORY
// ═══════════════════════════════════════════════════════════

const QUOTE_HISTORY_KEY = 'mck_quote_history';

function getQuoteHistory() {
  try {
    const stored = localStorage.getItem(QUOTE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) { return []; }
}

function saveQuoteRevision(d) {
  const history = getQuoteHistory();

  // Check if this quote number already exists
  const existing = history.filter(h => h.quoteNumber === d.quoteNumber);
  const revision = existing.length + 1;

  const entry = {
    quoteNumber: d.quoteNumber,
    clientName: d.clientName || 'Unknown',
    subtotal: d.subtotal,
    grandTotal: d.grandTotal,
    date: new Date().toISOString(),
    revision: revision,
    data: d,
  };

  history.unshift(entry);

  // Keep only last 20 entries
  while (history.length > 20) history.pop();

  localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(history));
  renderQuoteHistory();
}

function renderQuoteHistory() {
  const wrap = document.getElementById('quote-history-wrap');
  if (!wrap) return;

  const history = getQuoteHistory();
  if (history.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#666;font-style:italic;font-size:12px;">No quotes generated yet. Generate a PDF or share a quote to start building history.</div>';
    return;
  }

  const $ = v => '$' + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

  let html = `<table class="mat-table" style="font-size:12px;">
    <thead><tr>
      <th>QUOTE #</th><th>CLIENT</th><th class="right">VALUE (EX GST)</th>
      <th>DATE</th><th class="right">REV</th><th class="center">ACTIONS</th>
    </tr></thead><tbody>`;

  history.slice(0, 10).forEach((entry, idx) => {
    const date = new Date(entry.date).toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    html += `<tr>
      <td style="font-weight:700;color:#c9a84c;">${entry.quoteNumber}</td>
      <td>${entry.clientName}</td>
      <td class="right">${$(entry.subtotal)}</td>
      <td style="font-size:10px;color:#aaa;">${date}</td>
      <td class="right" style="font-weight:700;">R${entry.revision}</td>
      <td class="center">
        <button onclick="reloadQuoteFromHistory(${idx})" style="background:#c9a84c;color:#000;border:none;padding:6px 14px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;">RELOAD</button>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';

  if (history.length > 10) {
    html += `<div style="text-align:center;padding:10px;color:#666;font-size:10px;">Showing 10 of ${history.length} entries</div>`;
  }

  wrap.innerHTML = html;
}

function reloadQuoteFromHistory(idx) {
  const history = getQuoteHistory();
  if (!history[idx] || !history[idx].data) return;

  const d = history[idx].data;

  // Populate fields
  const fields = {
    'q-quote-number': d.quoteNumber,
    'q-date-display': d.dateIssued,
    'q-prepared-by': d.preparedBy,
    'q-client-name': d.clientName,
    'q-client-phone': d.clientPhone,
    'q-client-email': d.clientEmail,
    'q-project-address': d.projectAddress,
    'q-site-contact': d.siteContact,
    'q-colour-finish': d.colourFinish,
    'q-substrate': d.substrate,
    'q-scope': d.scope,
    'q-start-date': d.startDate,
    'q-duration': d.duration,
    'q-completion': d.completion,
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  });

  // Pricing lines
  const body = document.getElementById('q-pricing-body');
  if (body) {
    body.innerHTML = '';
    if (d.lineItems && d.lineItems.length > 0) {
      d.lineItems.forEach(l => addQuoteLine(l.desc, l.qty, l.unit, l.rate));
    }
  }

  updateQuoteTotals();

  // Scroll to top of quote tab
  const tab = document.getElementById('tab-quote');
  if (tab) tab.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Show confirmation
  const banner = document.createElement('div');
  banner.className = 'auto-populate-banner';
  banner.innerHTML = `<span class="apb-icon">&#9889;</span> QUOTE ${d.quoteNumber} (R${history[idx].revision}) RELOADED FROM HISTORY — REVIEW BEFORE SENDING`;
  const existing = tab.querySelector('.auto-populate-banner');
  if (existing) existing.remove();
  tab.insertBefore(banner, tab.firstChild);
  setTimeout(() => { if (banner.parentNode) banner.style.opacity = '0.5'; }, 10000);
}

function clearQuoteHistory() {
  if (!confirm('Clear all quote history? This cannot be undone.')) return;
  localStorage.removeItem(QUOTE_HISTORY_KEY);
  renderQuoteHistory();
}


// ═══════════════════════════════════════════════════════════
// INIT ON LOAD
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initQuote);
