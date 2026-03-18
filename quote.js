// ═══════════════════════════════════════════════════════════
// MCK QUOTE GENERATOR LOGIC
// ═══════════════════════════════════════════════════════════

function initQuote() {
  // Set default quote number
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const qNum = document.getElementById('q-quote-number');
  if (qNum) qNum.textContent = `MCK-${year}-${rand}`;
  
  // Set default date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' });
  const dateEl = document.getElementById('q-date-display');
  if (dateEl) dateEl.textContent = dateStr;
  
  // Setup validity
  updateQuoteValidity();
  
  // Add first line items
  if (document.getElementById('q-pricing-body').children.length === 0) {
    addQuoteLine('Microcement Application — Floors', 0, 'sqm', 0);
    addQuoteLine('Microcement Application — Feature Walls', 0, 'sqm', 0);
  }
  
  // Setup signature
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
  
  // Update Payment Schedule
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
  let hasDrawn = false;

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
      hasDrawn = true;
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

  function stopDraw() {
    drawing = false;
  }

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
  // Check if canvas is blank
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
  // Save signature image
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

// ── INIT ON LOAD ──
document.addEventListener('DOMContentLoaded', initQuote);
