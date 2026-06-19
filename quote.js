// ═══════════════════════════════════════════════════════════
// MCK QUOTE GENERATOR v3.0 - FULL REBUILD
// Variations, SMS, editable inclusions/exclusions,
// embedded MCK signature, fixed clear signature
// ═══════════════════════════════════════════════════════════

// Helper: format YYYY-MM-DD date to DD/MM/YYYY for display
function formatDateForPDF(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return dateStr;
}

// ── KING MANNION EMBEDDED SIGNATURE ───────────────────────
// Pre-drawn signature as SVG data URL (clean cursive "King Mannion")
const MCK_SIGNATURE_DATA_URL = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80" width="300" height="80">
    <path d="M20,55 C25,20 30,15 35,25 C40,35 30,55 35,55 C40,55 55,15 60,15 C65,15 50,55 55,55 C60,55 70,25 75,25 C80,25 72,55 78,50 M90,55 C95,20 100,15 105,25 C110,35 100,55 105,55 C110,55 125,15 130,15 C135,15 120,55 125,55 C130,55 140,25 145,25 C150,25 142,55 148,50 M160,55 C165,20 170,15 175,25 C180,35 170,55 175,55 C180,55 195,15 200,15 C205,15 190,55 195,55 C200,55 210,25 215,25 C220,25 212,55 218,50 C224,45 230,30 240,30 C250,30 245,55 250,55 C255,55 265,35 270,30"
    fill="none" stroke="#111" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
})();

// ── ATTACHMENT HANDLING ──────────────────────────────────
window._quoteAttachments = [];

function handleFileUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  Array.from(files).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File "' + file.name + '" exceeds 5MB limit. Skipping.');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const att = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result
      };
      window._quoteAttachments.push(att);
      renderAttachments();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function removeAttachment(index) {
  window._quoteAttachments.splice(index, 1);
  renderAttachments();
}

function renderAttachments() {
  const grid = document.getElementById('q-attachments-grid');
  if (!grid) return;
  grid.innerHTML = '';
  window._quoteAttachments.forEach((att, i) => {
    const card = document.createElement('div');
    card.className = 'attachment-card';
    const isPDF = att.type === 'application/pdf';
    if (isPDF) {
      card.innerHTML = `<div class="attachment-pdf-icon">PDF</div><div class="att-name">${att.name}</div><div class="att-remove" onclick="removeAttachment(${i})">&times;</div>`;
    } else {
      card.innerHTML = `<img src="${att.data}" alt="${att.name}"><div class="att-name">${att.name}</div><div class="att-remove" onclick="removeAttachment(${i})">&times;</div>`;
    }
    grid.appendChild(card);
  });
}

// ── SPECIAL CONDITIONS ─────────────────────────────────
let _specialConditionCount = 0;

function addSpecialCondition(text) {
  _specialConditionCount++;
  const list = document.getElementById('tc-special-conditions-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'special-condition-row';
  row.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:8px;';
  row.innerHTML = `<span class="clause-num" style="min-width:30px;">SC.${_specialConditionCount}</span><input type="text" class="sc-input" value="${text || ''}" placeholder="Enter special condition..." style="flex:1;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:3px;color:var(--white);font-family:inherit;font-size:12px;"><button onclick="this.parentElement.remove()" style="background:none;border:1px solid #ff4444;color:#ff4444;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:22px;">&times;</button>`;
  list.appendChild(row);
  if (!text) row.querySelector('input').focus();
}

function getSpecialConditions() {
  const inputs = document.querySelectorAll('#tc-special-conditions-list .sc-input');
  return Array.from(inputs).map(inp => inp.value.trim()).filter(v => v);
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
  initPaymentStages();

  if (document.getElementById('q-pricing-body').children.length === 0) {
    addQuoteLine('Micro Cement Application - Floors', 0, 'sqm', 0);
    addQuoteLine('Micro Cement Application - Feature Walls', 0, 'sqm', 0);
  }

  initSignature();
  renderQuoteHistory();
  initEditableListItems();
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


// ═══════════════════════════════════════════════════════════
// PRICING LINE ITEMS
// ═══════════════════════════════════════════════════════════

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
    <td class="right line-total">-</td>
    <td class="center no-print"><button class="btn-remove-line" onclick="this.parentElement.parentElement.remove(); updateQuoteTotals();">&times;</button></td>
  `;

  body.appendChild(tr);
  updateQuoteTotals();
}


// ═══════════════════════════════════════════════════════════
// VARIATION LINE ITEMS
// ═══════════════════════════════════════════════════════════

function addVariationLine(desc = '', hrs = 0, matCost = 0) {
  const body = document.getElementById('q-variations-body');
  if (!body) return;

  const s = typeof getSetting === 'function' ? getSetting : (k => null);
  const varRate = s('variation_rate') || 150;

  const tr = document.createElement('tr');
  tr.className = 'q-variation-item';

  tr.innerHTML = `
    <td><input type="text" class="var-desc" value="${desc}" oninput="updateVariationTotals()"></td>
    <td class="right"><input type="number" class="var-hrs" value="${hrs}" min="0" step="0.5" oninput="updateVariationTotals()"></td>
    <td class="right"><input type="number" class="var-rate" value="${varRate}" oninput="updateVariationTotals()"></td>
    <td class="right"><input type="number" class="var-mat" value="${matCost}" min="0" step="1" oninput="updateVariationTotals()"></td>
    <td class="right var-line-total">-</td>
    <td class="center no-print"><button class="btn-remove-line" onclick="this.parentElement.parentElement.remove(); updateVariationTotals();">&times;</button></td>
  `;

  body.appendChild(tr);
  updateVariationTotals();
}

function updateVariationTotals() {
  const lines = document.querySelectorAll('.q-variation-item');
  let varTotal = 0;

  lines.forEach(row => {
    const hrs = parseFloat(row.querySelector('.var-hrs')?.value) || 0;
    const rate = parseFloat(row.querySelector('.var-rate')?.value) || 0;
    const mat = parseFloat(row.querySelector('.var-mat')?.value) || 0;
    const total = (hrs * rate) + mat;
    row.querySelector('.var-line-total').textContent = total > 0 ? '$' + total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '-';
    varTotal += total;
  });

  const totalEl = document.getElementById('q-variations-subtotal');
  if (totalEl) totalEl.textContent = '$' + varTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

  // Update main totals (variations add to subtotal)
  updateQuoteTotals();
}


// ═══════════════════════════════════════════════════════════
// QUOTE TOTALS
// ═══════════════════════════════════════════════════════════

function updateQuoteTotals() {
  const lines = document.querySelectorAll('.q-line-item');
  let subtotal = 0;

  lines.forEach(line => {
    const qty = parseFloat(line.querySelector('.qty').value) || 0;
    const rate = parseFloat(line.querySelector('.rate').value) || 0;
    const total = qty * rate;
    line.querySelector('.line-total').textContent = total > 0 ? '$' + total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '-';
    subtotal += total;
  });

  // Add variation totals
  let varTotal = 0;
  document.querySelectorAll('.q-variation-item').forEach(row => {
    const hrs = parseFloat(row.querySelector('.var-hrs')?.value) || 0;
    const rate = parseFloat(row.querySelector('.var-rate')?.value) || 0;
    const mat = parseFloat(row.querySelector('.var-mat')?.value) || 0;
    varTotal += (hrs * rate) + mat;
  });
  subtotal += varTotal;

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
  const commencementPct = s('commencement_pct') || 40;
  const finalSealerPct = s('final_pct') || 10;
  const creditLimit = s('credit_limit') || 10000;
  const upfrontDiscPct = s('upfront_reduction_pct') || 5;
  const upfrontDiscCap = s('upfront_reduction_cap') || 1000;

  const depositPct = subtotal > threshold ? depOver : depUnder;
  // Material payment is the balance after deposit, commencement and final sealer
  // payments, so the four stages always sum to 100%.
  const matPct = Math.max(0, 100 - depositPct - commencementPct - finalSealerPct);

  // Recalculate editable payment schedule rows. Amount is ex GST, GST and inc GST shown separately.
  updatePaymentScheduleFromTotals(subtotal, depositPct, matPct, commencementPct);

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

  // Pay-in-full reduction
  const upfrontEl = document.getElementById('q-upfront-callout');
  if (upfrontEl) {
    const disc = Math.min(subtotal * (upfrontDiscPct / 100), upfrontDiscCap);
    const discTotal = subtotal - disc;
    upfrontEl.innerHTML = `<strong>UPFRONT PAYMENT REDUCTION:</strong> A <strong>${upfrontDiscPct}% reduction</strong> (capped at $${upfrontDiscCap.toLocaleString()}) is available for clients who pay the full contract amount upfront prior to commencement. Upfront price: <strong>$${discTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> (saving $${disc.toLocaleString(undefined, {minimumFractionDigits:2})}).`;
  }

}



// ═══════════════════════════════════════════════════════════
// EDITABLE PAYMENT SCHEDULE
// ═══════════════════════════════════════════════════════════

const PAYMENT_STAGE_MIN = 2;
const PAYMENT_STAGE_MAX = 5;

function formatMoney(value) {
  const num = parseFloat(value) || 0;
  return '$' + num.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}

function getQuoteSubtotalForPayments() {
  let subtotal = 0;
  document.querySelectorAll('.q-line-item').forEach(line => {
    const qty = parseFloat(line.querySelector('.qty')?.value) || 0;
    const rate = parseFloat(line.querySelector('.rate')?.value) || 0;
    subtotal += qty * rate;
  });
  document.querySelectorAll('.q-variation-item').forEach(row => {
    const hrs = parseFloat(row.querySelector('.var-hrs')?.value) || 0;
    const rate = parseFloat(row.querySelector('.var-rate')?.value) || 0;
    const mat = parseFloat(row.querySelector('.var-mat')?.value) || 0;
    subtotal += (hrs * rate) + mat;
  });
  return subtotal;
}

function initPaymentStages() {
  const body = document.getElementById('q-payment-body');
  if (!body) return;
  body.querySelectorAll('.q-payment-stage-row').forEach(row => {
    if (!row.dataset.stageType) row.dataset.stageType = 'progress';
  });
  renumberPaymentRows();
  updateAddPaymentButtonState();
}

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function roundPct(value) {
  const n = parseFloat(value) || 0;
  return (Math.round(n * 100) / 100).toString();
}

function createPaymentStageRow(stage = {}) {
  const tr = document.createElement('tr');
  const type = stage.type || 'progress';
  tr.className = 'q-payment-stage-row' + (type === 'progress' ? ' q-progress-row' : '');
  tr.dataset.stageType = type;
  if (stage.autoPct) tr.dataset.autoPct = stage.autoPct;
  if (stage.manualPct) tr.dataset.manualPct = 'true';
  if (stage.id) tr.id = stage.id;

  const title = stage.title || stage.desc || 'Progress Payment';
  const note = stage.note || (type === 'progress' ? 'Progress payment on milestone' : '');
  const due = stage.due || (type === 'progress' ? 'On milestone' : '');
  const pct = Number.isFinite(parseFloat(stage.pct)) ? parseFloat(stage.pct) : 0;
  const amt = Number.isFinite(parseFloat(stage.amt)) ? parseFloat(stage.amt) : 0;

  const gstAmt = amt * 0.1;
  const incGstAmt = amt + gstAmt;

  tr.innerHTML = `
    <td class="stage-num">-</td>
    <td><input type="text" class="payment-stage-title" value="${escapeAttr(title)}" oninput="updatePaymentStageData()"><input type="text" class="payment-stage-note" value="${escapeAttr(note)}" oninput="updatePaymentStageData()"></td>
    <td><input type="number" class="payment-stage-amount" value="${amt.toFixed(2)}" min="0" step="0.01" oninput="handlePaymentAmountInput(this)"></td>
    <td class="payment-stage-gst right">${formatMoney(gstAmt)}</td>
    <td class="payment-stage-inc-gst right">${formatMoney(incGstAmt)}</td>
    <td><div class="payment-pct-wrap"><input type="number" class="payment-stage-pct" value="${roundPct(pct)}" min="0" max="100" step="0.01" oninput="handlePaymentPctInput(this)"><span>%</span></div></td>
    <td><input type="text" class="payment-stage-due" value="${escapeAttr(due)}" oninput="updatePaymentStageData()"></td>
    <td class="center no-print"><button class="btn-remove-line payment-stage-remove" onclick="removePaymentStage(this)">&times;</button></td>
  `;
  return tr;
}

function toggleProgressPayment() {
  const toggle = document.getElementById('q-progress-toggle');
  const isOn = toggle && toggle.checked;
  syncProgressToggleUI();

  if (isOn) {
    const rows = document.querySelectorAll('.q-payment-stage-row');
    const existingProgress = document.querySelectorAll('.q-progress-row');
    if (existingProgress.length === 0 && rows.length < PAYMENT_STAGE_MAX) addProgressPaymentRow();
  } else {
    document.querySelectorAll('.q-progress-row').forEach(row => {
      if (document.querySelectorAll('.q-payment-stage-row').length > PAYMENT_STAGE_MIN) row.remove();
    });
    updateQuoteTotals();
  }
}

function addProgressPaymentRow(pct, desc = 'Progress Payment', due = 'On milestone') {
  const body = document.getElementById('q-payment-body');
  if (!body) return;
  const rows = body.querySelectorAll('.q-payment-stage-row');
  if (rows.length >= PAYMENT_STAGE_MAX) {
    alert('Maximum 5 payment stages allowed.');
    updateAddPaymentButtonState();
    return;
  }

  const subtotal = getQuoteSubtotalForPayments();
  const currentPct = Array.from(rows).reduce((sum, row) => sum + (parseFloat(row.querySelector('.payment-stage-pct')?.value) || 0), 0);
  const defaultPct = Number.isFinite(parseFloat(pct)) ? parseFloat(pct) : Math.max(0, Math.round((100 - currentPct) * 100) / 100);
  const tr = createPaymentStageRow({
    type: 'progress',
    title: desc || 'Progress Payment',
    note: 'Progress payment on milestone',
    due,
    pct: defaultPct,
    amt: subtotal * (defaultPct / 100),
    manualPct: true,
    id: 'q-progress-row-' + Date.now()
  });

  const finalRow = body.querySelector('[data-stage-type="final"]');
  if (finalRow) body.insertBefore(tr, finalRow);
  else body.appendChild(tr);

  const toggle = document.getElementById('q-progress-toggle');
  if (toggle) toggle.checked = document.querySelectorAll('.q-progress-row').length > 0;
  syncProgressToggleUI();
  updateQuoteTotals();
}

function removePaymentStage(button) {
  const rows = document.querySelectorAll('.q-payment-stage-row');
  if (rows.length <= PAYMENT_STAGE_MIN) {
    alert('Minimum 2 payment stages required.');
    return;
  }
  const row = button.closest('.q-payment-stage-row');
  if (row) row.remove();
  const toggle = document.getElementById('q-progress-toggle');
  if (toggle) toggle.checked = document.querySelectorAll('.q-progress-row').length > 0;
  syncProgressToggleUI();
  updateQuoteTotals();
}

function removeProgressRow(rowId) {
  const row = document.getElementById(rowId);
  if (!row) return;
  if (document.querySelectorAll('.q-payment-stage-row').length <= PAYMENT_STAGE_MIN) {
    alert('Minimum 2 payment stages required.');
    return;
  }
  row.remove();
  updateQuoteTotals();
}

function handlePaymentPctInput(input) {
  const row = input.closest('.q-payment-stage-row');
  if (row) {
    row.dataset.manualPct = 'true';
    const subtotal = getQuoteSubtotalForPayments();
    const pct = parseFloat(input.value) || 0;
    const amount = row.querySelector('.payment-stage-amount');
    if (amount) amount.value = subtotal > 0 ? (subtotal * pct / 100).toFixed(2) : '0.00';
  }
  updatePaymentStageData();
}

function handlePaymentAmountInput(input) {
  const row = input.closest('.q-payment-stage-row');
  if (row) {
    row.dataset.manualPct = 'true';
    const subtotal = getQuoteSubtotalForPayments();
    const amount = parseFloat(input.value) || 0;
    const pctInput = row.querySelector('.payment-stage-pct');
    if (pctInput) pctInput.value = subtotal > 0 ? roundPct((amount / subtotal) * 100) : '0';
  }
  updatePaymentStageData();
}

function updatePaymentStageData() {
  updatePaymentScheduleFromTotals(getQuoteSubtotalForPayments());
}

function updatePaymentScheduleFromTotals(subtotal, defaultDepositPct, defaultMaterialPct, defaultCommencementPct) {
  const body = document.getElementById('q-payment-body');
  if (!body) return;
  const rows = Array.from(body.querySelectorAll('.q-payment-stage-row'));

  rows.forEach(row => {
    const pctInput = row.querySelector('.payment-stage-pct');
    const amountInput = row.querySelector('.payment-stage-amount');
    if (!pctInput || !amountInput) return;

    if (row.dataset.manualPct !== 'true') {
      if (row.dataset.autoPct === 'deposit' && Number.isFinite(parseFloat(defaultDepositPct))) {
        pctInput.value = roundPct(defaultDepositPct);
      } else if (row.dataset.autoPct === 'material' && Number.isFinite(parseFloat(defaultMaterialPct))) {
        pctInput.value = roundPct(defaultMaterialPct);
      } else if (row.dataset.autoPct === 'commencement' && Number.isFinite(parseFloat(defaultCommencementPct))) {
        pctInput.value = roundPct(defaultCommencementPct);
      } else if (row.dataset.autoPct === 'final') {
        const otherPct = rows.filter(r => r !== row).reduce((sum, r) => sum + (parseFloat(r.querySelector('.payment-stage-pct')?.value) || 0), 0);
        pctInput.value = roundPct(Math.max(0, 100 - otherPct));
      }
    }

    const pct = parseFloat(pctInput.value) || 0;
    const exGstAmt = subtotal > 0 ? (subtotal * pct / 100) : 0;
    amountInput.value = exGstAmt.toFixed(2);

    // Update GST and inc GST cells
    const gstCell = row.querySelector('.payment-stage-gst');
    const incGstCell = row.querySelector('.payment-stage-inc-gst');
    const gstAmt = exGstAmt * 0.1;
    const incGstAmt = exGstAmt + gstAmt;
    if (gstCell) gstCell.textContent = formatMoney(gstAmt);
    if (incGstCell) incGstCell.textContent = formatMoney(incGstAmt);
  });

  const totalPct = rows.reduce((sum, row) => sum + (parseFloat(row.querySelector('.payment-stage-pct')?.value) || 0), 0);
  const totalExGst = rows.reduce((sum, row) => sum + (parseFloat(row.querySelector('.payment-stage-amount')?.value) || 0), 0);
  const totalGst = totalExGst * 0.1;
  const totalIncGst = totalExGst + totalGst;

  const totalExGstEl = document.getElementById('q-payment-total-exgst');
  if (totalExGstEl) totalExGstEl.textContent = subtotal > 0 ? formatMoney(totalExGst) : '-';

  const totalGstEl = document.getElementById('q-payment-total-gst');
  if (totalGstEl) totalGstEl.textContent = subtotal > 0 ? formatMoney(totalGst) : '-';

  const totalEl = document.getElementById('q-payment-total');
  if (totalEl) totalEl.textContent = subtotal > 0 ? formatMoney(totalIncGst) : '-';

  const pctTotalEl = document.getElementById('q-payment-pct-total');
  if (pctTotalEl) {
    pctTotalEl.textContent = roundPct(totalPct) + '%';
    const isBalanced = Math.abs(totalPct - 100) < 0.01 || subtotal === 0;
    pctTotalEl.style.color = isBalanced ? '#c9a84c' : '#ff4444';
    pctTotalEl.title = isBalanced ? 'Payment percentages equal 100%' : 'Payment percentages should equal 100%';
  }

  renumberPaymentRows();
  updateAddPaymentButtonState();
  return { totalPct, totalAmt: totalIncGst };
}

function updateProgressPaymentAmounts(subtotal, depositPct, matPct) {
  updatePaymentScheduleFromTotals(subtotal, depositPct, matPct);
}

function balanceProgressPayments() {
  updateQuoteTotals();
}

function renumberPaymentRows() {
  const body = document.getElementById('q-payment-body');
  if (!body) return;
  const rows = body.querySelectorAll('.q-payment-stage-row');
  rows.forEach((row, idx) => {
    const stageCell = row.querySelector('.stage-num');
    if (stageCell) stageCell.textContent = idx + 1;
  });
  updateAddPaymentButtonState();
}

function updateAddPaymentButtonState() {
  const rows = document.querySelectorAll('.q-payment-stage-row');
  const addBtn = document.getElementById('q-add-progress-btn');
  const limit = document.getElementById('q-payment-stage-limit');
  if (addBtn) {
    addBtn.disabled = rows.length >= PAYMENT_STAGE_MAX;
    addBtn.textContent = rows.length >= PAYMENT_STAGE_MAX ? 'MAX 5 PAYMENT STAGES' : '+ ADD PAYMENT STAGE';
  }
  if (limit) {
    const totalPct = Array.from(rows).reduce((sum, row) => sum + (parseFloat(row.querySelector('.payment-stage-pct')?.value) || 0), 0);
    limit.textContent = `${rows.length}/${PAYMENT_STAGE_MAX} stages. Total ${roundPct(totalPct)}% - edit amount or percentage as needed.`;
    limit.style.color = Math.abs(totalPct - 100) < 0.01 ? '#888' : '#ff7777';
  }
  rows.forEach(row => {
    const btn = row.querySelector('.payment-stage-remove');
    if (btn) btn.disabled = rows.length <= PAYMENT_STAGE_MIN;
  });
}

function syncProgressToggleUI() {
  const toggle = document.getElementById('q-progress-toggle');
  const track = document.getElementById('q-progress-toggle-track');
  const thumb = document.getElementById('q-progress-toggle-thumb');
  const isOn = toggle && toggle.checked;
  if (track) track.style.background = isOn ? '#c9a84c' : '#333';
  if (thumb) { thumb.style.background = isOn ? '#000' : '#666'; thumb.style.left = isOn ? '22px' : '2px'; }
}

function getPaymentStagesData(subtotalOverride) {
  const subtotal = Number.isFinite(parseFloat(subtotalOverride)) ? parseFloat(subtotalOverride) : getQuoteSubtotalForPayments();
  return Array.from(document.querySelectorAll('.q-payment-stage-row')).map((row, index) => {
    const pct = parseFloat(row.querySelector('.payment-stage-pct')?.value) || 0;
    const amtInput = parseFloat(row.querySelector('.payment-stage-amount')?.value);
    const amt = Number.isFinite(amtInput) ? amtInput : subtotal * (pct / 100);
    return {
      stage: index + 1,
      type: row.dataset.stageType || 'progress',
      title: row.querySelector('.payment-stage-title')?.value?.trim() || `Payment Stage ${index + 1}`,
      desc: row.querySelector('.payment-stage-title')?.value?.trim() || `Payment Stage ${index + 1}`,
      note: row.querySelector('.payment-stage-note')?.value?.trim() || '',
      due: row.querySelector('.payment-stage-due')?.value?.trim() || '',
      pct: Math.round(pct * 100) / 100,
      amt: Math.round(amt * 100) / 100
    };
  });
}

function setPaymentStagesFromData(d = {}) {
  const body = document.getElementById('q-payment-body');
  if (!body) return;
  let stages = Array.isArray(d.paymentStages) && d.paymentStages.length ? d.paymentStages : null;

  if (!stages) {
    stages = [];
    if (d.depositPct != null || d.depositAmt != null) stages.push({ type:'deposit', title:'Booking Deposit', note:'Secures your place in the schedule', due:'On acceptance', pct:d.depositPct || 10, amt:d.depositAmt || 0, autoPct:'deposit' });
    if (d.matPct != null || d.materialAmt != null) stages.push({ type:'material', title:'Material Payment', note:'Non-refundable once materials are ordered', due:'Prior to commencement', pct:d.matPct || 40, amt:d.materialAmt || 0, autoPct:'material' });
    (d.progressPayments || []).forEach(p => stages.push({ type:'progress', title:p.title || p.desc || 'Progress Payment', note:p.note || 'Progress payment on milestone', due:p.due || 'On milestone', pct:p.pct || 0, amt:p.amt || 0, manualPct:true }));
    stages.push({ type:'commencement', title:'Commencement Payment', note:'Payable within 24 hours of commencement', due:'Within 24 hrs of commencement', pct:d.commencementPct != null ? d.commencementPct : 40, amt:d.commencementAmt || 0, autoPct:'commencement' });
    stages.push({ type:'final', title:'Final Payment (Sealer)', note:'On first sealer coat application; warranties then commence', due:'On first sealer coat', pct:d.finalPct || 0, amt:d.finalAmt || 0, autoPct:'final' });
  }

  stages = stages.slice(0, PAYMENT_STAGE_MAX);
  if (stages.length < PAYMENT_STAGE_MIN) return;
  body.innerHTML = '';
  stages.forEach(stage => body.appendChild(createPaymentStageRow({ ...stage, manualPct: true, autoPct: stage.autoPct })));
  const toggle = document.getElementById('q-progress-toggle');
  if (toggle) toggle.checked = document.querySelectorAll('.q-progress-row').length > 0;
  syncProgressToggleUI();
  updateQuoteTotals();
}

// ═══════════════════════════════════════════════════════════
// EDITABLE INCLUSIONS / EXCLUSIONS
// ═══════════════════════════════════════════════════════════

function normalizeIeItems(items, type) {
  const defaultEnabled = type === 'inclusion';
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (typeof item === 'string') return { text: item, enabled: defaultEnabled };
    return {
      text: (item && (item.text || item.label || item.value) || '').toString(),
      enabled: item && typeof item.enabled === 'boolean' ? item.enabled : defaultEnabled
    };
  }).filter(item => item.text.trim());
}

function createIeListItem(text, enabled = true, type = 'inclusion') {
  const li = document.createElement('li');
  li.className = 'ie-row';
  li.dataset.enabled = enabled ? 'true' : 'false';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ie-toggle no-print';
  toggle.setAttribute('aria-label', 'Toggle ' + type);
  toggle.onclick = function() { toggleIeItem(toggle); };

  const marker = document.createElement('span');
  marker.className = 'ie-print-marker';

  const textSpan = document.createElement('span');
  textSpan.className = 'ie-text';
  textSpan.contentEditable = 'true';
  textSpan.textContent = text;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'ie-delete no-print';
  del.textContent = 'Remove';
  del.setAttribute('aria-label', 'Remove ' + type);
  del.onclick = function() { deleteIeItem(del); };

  li.append(toggle, marker, textSpan, del);
  syncIeItem(li);
  return li;
}

function syncIeItem(li) {
  if (!li) return;
  const enabled = li.dataset.enabled !== 'false';
  const symbol = enabled ? '✓' : '✗';
  const toggle = li.querySelector('.ie-toggle');
  const marker = li.querySelector('.ie-print-marker');
  if (toggle) toggle.textContent = symbol;
  if (marker) marker.textContent = symbol;
}

function toggleIeItem(btn) {
  const li = btn.closest('.ie-row');
  if (!li) return;
  li.dataset.enabled = li.dataset.enabled === 'false' ? 'true' : 'false';
  syncIeItem(li);
}

function deleteIeItem(btn) {
  const li = btn.closest('.ie-row');
  if (li) li.remove();
}

function initEditableListItems() {
  ['q-inclusions', 'q-exclusions'].forEach(listId => {
    const list = document.getElementById(listId);
    if (!list) return;
    const type = listId === 'q-inclusions' ? 'inclusion' : 'exclusion';
    const defaultEnabled = type === 'inclusion';
    Array.from(list.querySelectorAll('li')).forEach(li => {
      if (!li.classList.contains('ie-row')) {
        const text = li.textContent.trim();
        li.replaceWith(createIeListItem(text, defaultEnabled, type));
      } else {
        syncIeItem(li);
      }
    });
  });
}

function addInclusionItem() {
  const list = document.getElementById('q-inclusions');
  if (!list) return;
  const li = createIeListItem('New inclusion - click to edit', true, 'inclusion');
  list.appendChild(li);
  const text = li.querySelector('.ie-text');
  if (text) {
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function addExclusionItem() {
  const list = document.getElementById('q-exclusions');
  if (!list) return;
  const li = createIeListItem('New exclusion - click to edit', false, 'exclusion');
  list.appendChild(li);
  const text = li.querySelector('.ie-text');
  if (text) {
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// ═══════════════════════════════════════════════════════════
// SIGNATURE CANVAS - BOTH CLIENT AND MCK AUTHORISED
// ═══════════════════════════════════════════════════════════

function initSignature() {
  initSigCanvas('q-sig-canvas', 'q-canvas-wrap', 'q-canvas-hint', 'q-accept-btn');
  initSigCanvas('tc-sig-canvas', 'tc-canvas-wrap', 'tc-canvas-hint', 'tc-accept-btn');

  // Set default dates to today
  const today = new Date().toISOString().split('T')[0];
  ['q-sig-date', 'tc-sig-date', 'tc-mck-sig-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });
}

function preDrawMCKSignature(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || canvas.width === 0) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = function() {
    ctx.drawImage(img, 10, 20, 200, 60);
  };
  img.src = MCK_SIGNATURE_DATA_URL;
}

function initSigCanvas(canvasId, wrapId, hintId, acceptBtnId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;

  function resize() {
    const wrap = document.getElementById(wrapId);
    if (!wrap || wrap.offsetWidth === 0) return;
    // Save current content
    const imgData = canvas.width > 0 ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    canvas.width = wrap.offsetWidth;
    canvas.height = 160;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    // Restore content if we had any
    if (imgData && imgData.width > 0) {
      try { ctx.putImageData(imgData, 0, 0); } catch(e) {}
    }
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
  clearSigCanvas('q-sig-canvas', 'q-canvas-wrap', 'q-canvas-hint', 'q-sig-accepted-banner', 'q-accept-btn');
}

function clearMCKSig() {
  clearSigCanvas('q-mck-sig-canvas', 'q-mck-canvas-wrap', 'q-mck-canvas-hint', 'q-mck-sig-accepted-banner', 'q-mck-accept-btn');
  // Re-draw the embedded signature after clearing
  setTimeout(() => preDrawMCKSignature('q-mck-sig-canvas'), 100);
}

function clearTcSig() {
  clearSigCanvas('tc-sig-canvas', 'tc-canvas-wrap', 'tc-canvas-hint', 'tc-sig-accepted-banner', 'tc-accept-btn');
}

function acceptTcSig() {
  acceptSigCanvas('tc-sig-canvas', 'tc-sig-accepted-banner', 'tc-sig-image', 'CLIENT (T&Cs)');
}

function clearSigCanvas(canvasId, wrapId, hintId, bannerId, acceptBtnId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Resize first to ensure proper dimensions
  const wrap = document.getElementById(wrapId);
  if (wrap && wrap.offsetWidth > 0) {
    canvas.width = wrap.offsetWidth;
    canvas.height = 160;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
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
    if (lbl) lbl.textContent = label + ' SIGNATURE ACCEPTED - ' + new Date().toLocaleString();
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
  const varBody = document.getElementById('q-variation-body');
  if (varBody) varBody.innerHTML = '';
  document.querySelectorAll('#tab-quote .field-val').forEach(f => f.innerHTML = '&nbsp;');
  addQuoteLine('Micro Cement Application - Floors', 0, 'sqm', 0);
  updateQuoteTotals();
  clearQuoteSig();
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

  // Variation line items
  const variationItems = [];
  document.querySelectorAll('.q-variation-item').forEach(row => {
    const desc = row.querySelector('.var-desc')?.value || '';
    const hrs = parseFloat(row.querySelector('.var-hrs')?.value) || 0;
    const rate = parseFloat(row.querySelector('.var-rate')?.value) || 0;
    const mat = parseFloat(row.querySelector('.var-mat')?.value) || 0;
    const total = (hrs * rate) + mat;
    if (desc || hrs > 0 || mat > 0) variationItems.push({ desc, hrs, rate, mat, total });
  });

  const baseSubtotal = lineItems.reduce((s, l) => s + l.total, 0);
  const varSubtotal = variationItems.reduce((s, v) => s + v.total, 0);
  const subtotal = baseSubtotal + varSubtotal;
  const gst = subtotal * 0.1;
  const grandTotal = subtotal + gst;

  const st = typeof getSetting === 'function' ? getSetting : (k => null);
  const threshold = st('deposit_threshold') || 20000;
  const depOver = st('deposit_pct_over') || 5;
  const depUnder = st('deposit_pct_under') || 10;
  const commencementPctDefault = st('commencement_pct') || 40;
  const finalPctDefault = st('final_pct') || 10;
  const creditLimit = st('credit_limit') || 10000;
  const upfrontDiscPct = st('upfront_reduction_pct') || 5;
  const upfrontDiscCap = st('upfront_reduction_cap') || 1000;
  const variationRate = st('variation_rate') || 150;
  const variationMinHrs = st('variation_min_hours') || 2;
  const variationMatAllowance = st('variation_material_allowance') || 500;
  const overdueAdminFee = st('overdue_admin_fee') || 220;
  const overdueInterest = st('overdue_interest_pct_week') || 3;
  const measureFee = st('measure_fee') || 220;

  const paymentStages = getPaymentStagesData(subtotal);
  let progressPayments = paymentStages.filter(p => p.type === 'progress');
  const fallbackDepositPct = subtotal > threshold ? depOver : depUnder;
  const depositStage = paymentStages[0] || {};
  const materialStage = paymentStages.find(p => p.type === 'material') || paymentStages[1] || {};
  const commencementStage = paymentStages.find(p => p.type === 'commencement') || {};
  const finalStage = [...paymentStages].reverse().find(p => p.type === 'final') || paymentStages[paymentStages.length - 1] || {};
  const depositPct = depositStage.pct ?? fallbackDepositPct;
  const matPct = materialStage.pct ?? Math.max(0, 100 - depositPct - commencementPctDefault - finalPctDefault);
  const commencementPct = commencementStage.pct ?? commencementPctDefault;
  const depositAmt = depositStage.amt ?? subtotal * (depositPct / 100);
  const materialAmt = materialStage.amt ?? subtotal * (matPct / 100);
  const commencementAmt = commencementStage.amt ?? subtotal * (commencementPct / 100);
  const finalPct = finalStage.pct ?? Math.max(0, 100 - depositPct - matPct - commencementPct);
  const finalAmt = finalStage.amt ?? subtotal * (finalPct / 100);
  const upfrontDisc = Math.min(subtotal * (upfrontDiscPct / 100), upfrontDiscCap);
  const upfrontTotal = subtotal - upfrontDisc;

  const getListItems = (id, type) => {
    const el = document.getElementById(id);
    if (!el) return [];
    return Array.from(el.querySelectorAll('li')).map(li => {
      const textEl = li.querySelector('.ie-text');
      const text = (textEl ? textEl.textContent : li.textContent).trim();
      return { text, enabled: li.dataset.enabled !== 'false' };
    }).filter(item => item.text);
  };
  const inclusions = getListItems('q-inclusions', 'inclusion');
  const exclusions = getListItems('q-exclusions', 'exclusion');

  // Signature images
  let sigDataURL = '';
  const sigCanvas = document.getElementById('q-sig-canvas');
  if (sigCanvas) {
    const blank = document.createElement('canvas');
    blank.width = sigCanvas.width; blank.height = sigCanvas.height;
    if (sigCanvas.toDataURL() !== blank.toDataURL()) sigDataURL = sigCanvas.toDataURL();
  }

  // Typed names and dates
  const clientTypedName = (document.getElementById('q-sig-typed-name') || {}).value || '';
  const clientPrintName = (document.getElementById('q-sig-print-name') || {}).value || '';
  const clientSigDate = (document.getElementById('q-sig-date') || {}).value || '';

  return {
    quoteNumber, dateIssued, validityLabel, validityHours, validityBanner, preparedBy,
    clientName, clientPhone, clientEmail, projectAddress, siteContact,
    colourFinish, substrate, scope, startDate, duration, completion,
    lineItems, variationItems, subtotal, gst, grandTotal, baseSubtotal, varSubtotal,
    depositPct, depositAmt, materialAmt, finalPct, finalAmt, matPct, commencementPct, commencementAmt,
    progressPayments, paymentStages,
    creditLimit, upfrontDiscPct, upfrontDiscCap, upfrontDisc, upfrontTotal,
    variationRate, variationMinHrs, variationMatAllowance,
    overdueAdminFee, overdueInterest, measureFee,
    inclusions, exclusions, sigDataURL,
    clientTypedName, clientPrintName, clientSigDate,
    attachments: window._quoteAttachments || [],
    specialConditions: getSpecialConditions(),
    createdAt: new Date().toISOString(),
    // Customer ▶ Project ▶ Quote linkage + per-quote end-client, stamped
    // from the dashboard via job-link.js (see window._mckJobContext).
    ...(window._mckJobContext || {}),
  };
}


// ═══════════════════════════════════════════════════════════
// BUILD STATIC QUOTE HTML (shared by PDF and Share)
// ═══════════════════════════════════════════════════════════


function getPrintablePaymentStages(d) {
  if (Array.isArray(d.paymentStages) && d.paymentStages.length) {
    return d.paymentStages.slice(0, PAYMENT_STAGE_MAX).map((p, i) => ({
      stage: i + 1,
      type: p.type || 'progress',
      title: p.title || p.desc || `Payment Stage ${i + 1}`,
      desc: p.desc || p.title || `Payment Stage ${i + 1}`,
      note: p.note || '',
      due: p.due || '',
      pct: parseFloat(p.pct) || 0,
      amt: parseFloat(p.amt) || 0
    }));
  }
  return [
    { type:'deposit', title:'Booking Deposit', note:'Secures your place in the schedule', due:'On acceptance', pct:d.depositPct || 0, amt:d.depositAmt || 0 },
    { type:'material', title:'Material Payment', note:'Non-refundable once materials are ordered', due:'Prior to commencement', pct:d.matPct || 0, amt:d.materialAmt || 0 },
    ...(d.progressPayments || []).map(p => ({ type:'progress', title:p.title || p.desc || 'Progress Payment', note:p.note || 'Progress payment on milestone', due:p.due || 'On milestone', pct:p.pct || 0, amt:p.amt || 0 })),
    ...(d.commencementPct != null || d.commencementAmt != null ? [{ type:'commencement', title:'Commencement Payment', note:'Payable within 24 hours of commencement', due:'Within 24 hrs of commencement', pct:d.commencementPct || 0, amt:d.commencementAmt || 0 }] : []),
    { type:'final', title:'Final Payment (Sealer)', note:'On first sealer coat application; warranties then commence', due:'On first sealer coat', pct:d.finalPct || 0, amt:d.finalAmt || 0 }
  ].slice(0, PAYMENT_STAGE_MAX);
}

function buildQuoteHTML(d, options = {}) {
  const $ = v => '$' + (parseFloat(v) || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
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

  // Build variation rows HTML
  let variationHTML = '';
  if (d.variationItems && d.variationItems.length > 0) {
    variationHTML = `
    <div style="height:14pt;"></div>
    <div class="sec-hd"><div class="sec-num">03B</div><h2>VARIATIONS</h2></div>
    <table>
      <thead><tr><th style="width:40%">DESCRIPTION</th><th class="right" style="width:12%">HOURS</th><th class="right" style="width:16%">RATE/HR</th><th class="right" style="width:16%">MATERIALS</th><th class="right" style="width:16%">TOTAL (EX GST)</th></tr></thead>
      <tbody>${d.variationItems.map(v => `<tr><td>${v.desc}</td><td class="right">${v.hrs}</td><td class="right">${$(v.rate)}</td><td class="right">${$(v.mat)}</td><td class="right">${$(v.total)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;">VARIATIONS SUBTOTAL (EX GST)</td><td class="right">${$(d.varSubtotal || 0)}</td></tr></tfoot>
    </table>
    <div class="callout" style="margin-top:10pt;"><strong>VARIATION TERMS:</strong> All variations are charged at $${d.variationRate}/hr (${d.variationMinHrs}-hour minimum) plus materials at cost + ${d.variationMatAllowance ? '$' + d.variationMatAllowance + ' allowance' : 'cost'}. Variations must be agreed in writing before work commences.</div>`;
  }

  const inclusions = normalizeIeItems(d.inclusions, 'inclusion');
  const exclusions = normalizeIeItems(d.exclusions, 'exclusion');
  const paymentStages = getPrintablePaymentStages(d);
  const paymentPctTotal = paymentStages.reduce((sum, stage) => sum + (parseFloat(stage.pct) || 0), 0);
  const paymentStagesHTML = paymentStages.map((stage, i) => {
    const stageGst = (parseFloat(stage.amt) || 0) * 0.1;
    const stageIncGst = (parseFloat(stage.amt) || 0) + stageGst;
    return `<tr><td class="pay-stage">${i + 1}</td><td><div class="pay-stage">${stage.title || 'Payment Stage'}</div><div class="pay-note">${stage.note || ''}</div></td><td class="right">${$(stage.amt)}</td><td class="right">${$(stageGst)}</td><td class="right">${$(stageIncGst)}</td><td class="right">${roundPct(stage.pct)}%</td><td>${stage.due || 'TBC'}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>MCK Quote - ${d.quoteNumber}</title>
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
.page-section { padding: 0; margin-bottom: 0; }
.page-section + .page-section { page-break-before: always; }
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
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html, body { background: #0a0a0a !important; color: #ffffff !important; height: auto !important; min-height: 0 !important; }
  .container { padding: 0 !important; max-width: 100% !important; }
  .action-bar, .no-print { display: none !important; }
  .page-section { page-break-inside: avoid; }
  .page-section + .page-section { page-break-before: always; }
  .validity-banner { background: #c9a84c !important; color: #000000 !important; }
  .sec-num { background: #c9a84c !important; color: #000000 !important; }
  .meta-grid { background: #1a1a1a !important; }
  .field { background: #111111 !important; }
  th { background: #1a1a1a !important; color: #c9a84c !important; }
  td { background: #111111 !important; color: #ffffff !important; }
  tr:nth-child(even) td { background: #0d0d0d !important; }
  tfoot td { background: #1a1a1a !important; }
  .callout { background: #1a1a1a !important; }
  .ie-col { background: #111111 !important; }
  .tc-item { background: #111111 !important; }
  .doc-footer { background: #1a1a1a !important; }
  .legal-footer { background: #111111 !important; }
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
        <div><strong>EMAIL</strong> projects@microcementking.au</div>
        <div><strong>WEB</strong> microcementking.au</div>
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
      <tr><td colspan="4" style="text-align:right;">SUBTOTAL (EX GST)</td><td class="right">${$(d.baseSubtotal || d.subtotal)}</td></tr>
      ${d.varSubtotal > 0 ? `<tr><td colspan="4" style="text-align:right;">VARIATIONS SUBTOTAL</td><td class="right">${$(d.varSubtotal)}</td></tr>` : ''}
      <tr><td colspan="4" style="text-align:right;">GST (10%)</td><td class="right">${$(d.gst)}</td></tr>
      <tr class="grand-total"><td colspan="4" style="text-align:right;">TOTAL (INC GST)</td><td class="right">${$(d.grandTotal)}</td></tr>
    </tfoot>
  </table>
  ${d.subtotal > d.creditLimit ? `<div class="callout warning"><strong>CREDIT LIMIT NOTE:</strong> Contract value exceeds the $${d.creditLimit.toLocaleString()} credit limit. Full deposit and material payment required before commencement. No credit terms available.</div>` : ''}
  <div class="callout"><strong>ON-SITE MEASURE FEE:</strong> A non-refundable on-site measure fee of <strong>$${d.measureFee} ex GST</strong> applies where a site visit is required. This fee is <strong>credited in full against the contract</strong> upon acceptance.</div>
  ${variationHTML}
</div>

<!-- PAGE 3: INCLUSIONS & EXCLUSIONS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">04</div><h2>INCLUSIONS &amp; EXCLUSIONS</h2></div>
  <div class="inc-exc-grid">
    <div class="ie-col inc"><h3>INCLUSIONS</h3>${inclusions.map(i => `<div class="ie-item"><span class="${i.enabled ? 'tick' : 'cross'}">${i.enabled ? '✓' : '✗'}</span>${i.text}</div>`).join('')}</div>
    <div class="ie-col exc"><h3>EXCLUSIONS</h3>${exclusions.map(e => `<div class="ie-item"><span class="${e.enabled ? 'tick' : 'cross'}">${e.enabled ? '✓' : '✗'}</span>${e.text}</div>`).join('')}</div>
  </div>
</div>

<!-- PAGE 4: PAYMENT SCHEDULE -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">05</div><h2>PAYMENT SCHEDULE</h2></div>
  <div class="callout" style="margin-bottom:14pt;"><strong>PAYMENT STRUCTURE:</strong> Booking deposit <strong>${d.depositPct}%</strong> on acceptance ${d.subtotal > 20000 ? '(contract over $20,000)' : '(contract $20,000 or under)'}; material payment (non-refundable once materials are ordered) prior to commencement; a commencement payment within 24 hours of works starting on site; and the final 10% on application of the first sealer coat — at which point all warranties and manufacturer guarantees commence. Stages are agreed per quote as set out below.</div>
  <table>
    <thead><tr><th style="width:4%">#</th><th style="width:24%">STAGE</th><th class="right" style="width:15%">AMOUNT (EX GST)</th><th class="right" style="width:11%">GST</th><th class="right" style="width:15%">TOTAL (INC GST)</th><th class="right" style="width:12%">% OF CONTRACT</th><th style="width:19%">DUE</th></tr></thead>
    <tbody>${paymentStagesHTML}</tbody>
    <tfoot><tr class="grand-total"><td colspan="2" style="text-align:right;">TOTAL</td><td class="right">${$(d.subtotal)}</td><td class="right">${$(d.gst)}</td><td class="right">${$(d.grandTotal)}</td><td class="right">${roundPct(paymentPctTotal)}%</td><td></td></tr></tfoot>
  </table>
  <div class="callout" style="margin-top:14pt;"><strong>UPFRONT PAYMENT REDUCTION:</strong> A <strong>${d.upfrontDiscPct}% reduction</strong> (capped at $${d.upfrontDiscCap.toLocaleString()}) is available for clients who pay the full contract amount upfront. Upfront price: <strong>${$(d.upfrontTotal)}</strong> (saving ${$(d.upfrontDisc)}).</div>
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
    <div class="tc-item"><div class="tc-head">Variations</div>All variations must be agreed in writing. Rate: $${d.variationRate}/hr (${d.variationMinHrs}-hour minimum) plus materials at cost.</div>
    <div class="tc-item"><div class="tc-head">Workmanship Warranty</div>All workmanship is covered under statutory warranties as required by Queensland law.</div>
    <div class="tc-item"><div class="tc-head">Product Warranty</div>Manufacturer warranties on all Ideal Works, Solidro, and Rusico products are passed through to the client in full.</div>
    <div class="tc-item"><div class="tc-head">Dispute Resolution</div>Concerns must be raised with MCK in writing, with MCK given a fair opportunity to inspect and rectify. No third party may be engaged while a dispute is on foot — doing so voids all warranties. Undisputed amounts remain payable. Refusal to engage is a breach of contract.</div>
    <div class="tc-item"><div class="tc-head">Overdue Payments</div>Invoices overdue by 3+ days incur a $${d.overdueAdminFee} admin fee. Interest accrues at ${d.overdueInterest}% per week from Day 4.</div>
    <div class="tc-item"><div class="tc-head">Site Access</div>The client must ensure unobstructed access to the work area for the full project duration.</div>
    <div class="tc-item"><div class="tc-head">Termination &amp; Non-Compliance</div>On termination or non-compliance, the site must be made ready for completion within 14 days, or the full final invoice — including admin fee and weekly interest — becomes immediately payable. Materials are non-refundable; warranties do not commence until final payment is received.</div>
    <div class="tc-item"><div class="tc-head">Natural Finish &amp; Samples</div>Microcement is a uniquely natural, hand-applied finish; variation in tone, mottling, and movement over the natural contour is inherent and not a defect. Physical samples are charged at $330 ex GST each.</div>
    <div class="tc-item"><div class="tc-head">Substrate Responsibility</div>The client is responsible for ensuring the substrate is structurally sound prior to commencement.</div>
    <div class="tc-item"><div class="tc-head">Confidentiality &amp; IP</div>This quote, its pricing, and methodology are the confidential intellectual property of Micro Cement King, to be held between the client and MCK only. Sharing or distributing it, using it to quote against MCK, or using it to build or train any template or AI system may result in recovery of MCK's costs plus liquidated damages of up to $30,000 (see full Terms &amp; Conditions).</div>
  </div>
  <div class="callout" style="margin-top:12pt;"><strong>FULL TERMS &amp; CONDITIONS:</strong> The above is a summary only. Full Payment Terms &amp; Conditions are set out in the companion document.</div>
</div>

${(d.attachments && d.attachments.length > 0) ? `
<!-- SITE PHOTOS & PLANS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">07B</div><h2>SITE PHOTOS, PLANS &amp; MARKUPS</h2></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180pt,1fr));gap:10pt;">
    ${d.attachments.map(att => att.type === 'application/pdf' ? `<div style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:12pt;text-align:center;"><div style="font-size:24pt;color:#c8a84e;margin-bottom:6pt;">PDF</div><div style="font-size:8pt;color:#999;">${att.name}</div></div>` : `<div style="border:1px solid #333;border-radius:4px;overflow:hidden;"><img src="${att.data}" style="width:100%;height:auto;display:block;"><div style="padding:4pt 8pt;font-size:8pt;color:#999;background:#1a1a1a;">${att.name}</div></div>`).join('')}
  </div>
</div>` : ''}

${(d.specialConditions && d.specialConditions.length > 0) ? `
<!-- SPECIAL CONDITIONS -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num" style="background:#c8a84e;color:#000;">SC</div><h2>SPECIAL CONDITIONS</h2></div>
  ${d.specialConditions.map((c, i) => `<div style="padding:6pt 0;border-bottom:1px solid #333;"><span style="color:#c8a84e;font-weight:700;margin-right:8pt;">SC.${i+1}</span><span style="color:#fff;">${c}</span></div>`).join('')}
</div>` : ''}

<!-- PAGE 6: SIGNATURES -->
<div class="page-section">
  <div class="sec-hd"><div class="sec-num">08</div><h2>ACCEPTANCE &amp; SIGNATURE</h2></div>
  <div class="callout" style="margin-bottom:18pt;"><strong>HOW TO ACCEPT:</strong> Sign below (or print, sign, and return). Pay the booking deposit to confirm your start date.</div>
  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-label">CLIENT SIGNATURE</div>
      <div class="sig-line">${d.sigDataURL ? `<img src="${d.sigDataURL}" alt="Client Signature">` : ''}</div>
      <div class="sig-sub">Full Name: <strong style="color:#fff;">${d.clientTypedName || d.clientName || '___________________________'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Print Name: <strong style="color:#fff;">${d.clientPrintName || '___________________________'}</strong></div>
      <div class="sig-sub" style="margin-top:4pt;">Date: <strong style="color:#fff;">${d.clientSigDate ? formatDateForPDF(d.clientSigDate) : '___________________________'}</strong></div>
    </div>
  </div>
  <div class="legal-footer">By signing this document, the client confirms they have read and agree to all terms summarised in Section 07 and the full Payment Terms &amp; Conditions.<br>This quote is a formal offer. It does not constitute a binding contract until signed by the client and the booking deposit is received.</div>
  <div class="doc-footer"><span class="gold">MICRO CEMENT KING</span> &nbsp;|&nbsp; 0468 053 819 &nbsp;|&nbsp; projects@microcementking.au &nbsp;|&nbsp; microcementking.au</div>
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
  // Small delay to ensure canvas render is complete
  setTimeout(function() {
    const d = extractQuoteData();
    const html = buildQuoteHTML(d);
    saveQuoteRevision(d);

    // Use Blob URL to open the print window - avoids document.write() blocking in modern browsers
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      // Fallback: offer download if popup is blocked
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = d.quoteNumber + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else {
      // Revoke after window has had time to load
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    }
  }, 150);
}


// ═══════════════════════════════════════════════════════════
// SHAREABLE QUOTE LINK
// ═══════════════════════════════════════════════════════════

async function generateShareableLink() {
  const d = extractQuoteData();

  // Add margin override reason if present
  if (window._marginOverrideReason) {
    d.marginOverrideReason = window._marginOverrideReason;
  }

  saveQuoteRevision(d);

  // Show saving indicator on all share buttons
  const btns = document.querySelectorAll('[onclick*="generateShareableLink"]');
  const origTexts = [];
  btns.forEach(btn => { origTexts.push(btn.textContent); btn.textContent = 'SAVING...'; btn.disabled = true; });

  try {
    // Check if this quote already exists - if so, save as versioned file
    const exists = await MCK_QUOTE_STORAGE.quoteExists(d.quoteNumber);
    if (exists) {
      // Find next version number
      const listResult = await MCK_QUOTE_STORAGE.listQuotes();
      if (listResult.success) {
        const baseId = d.quoteNumber;
        const versionFiles = listResult.files.filter(f => f.startsWith(baseId + '-v') && f.endsWith('.json'));
        const nextVersion = versionFiles.length + 2; // v2, v3, etc.
        const versionId = baseId + '-v' + nextVersion;
        d.version = nextVersion;
        d.parentQuoteId = baseId;
        // Save the versioned copy
        await MCK_QUOTE_STORAGE.saveQuote(versionId, d);
      }
    }

    // Always save/update the main quote file
    d.lastSavedAt = new Date().toISOString();
    const result = await MCK_QUOTE_STORAGE.saveQuote(d.quoteNumber, d);

    // If this quote belongs to a project (opened from the customer
    // dashboard), file it under that project. Best-effort, non-blocking.
    try {
      if (d.projectId && typeof MCK_CUSTOMER_STORAGE !== 'undefined') {
        await MCK_CUSTOMER_STORAGE.attachQuoteToProject(d.projectId, d);
      }
    } catch (linkErr) {
      console.warn('Project link failed (quote still saved):', linkErr);
    }
    // ── PostMessage bridge: notify parent dashboard (mckquote.com) ──
    try {
      window.parent.postMessage({
        type: 'MCK_QUOTE_SAVED',
        quoteNumber: d.quoteNumber,
        clientName: d.clientName,
        clientEmail: d.clientEmail,
        clientPhone: d.clientPhone,
        projectAddress: d.projectAddress,
        subtotal: d.subtotal,
        gst: d.gst,
        grandTotal: d.grandTotal,
        lineItems: d.lineItems,
        paymentStages: d.paymentStages,
        scope: d.scope,
        startDate: d.startDate,
        savedAt: d.lastSavedAt,
        quoteUrl: result.success ? (result.urls && result.urls.internal) : null,
      }, 'https://mckquote.com');
    } catch(e) { /* not in iframe - ignore */ }
    if (result.success) {
      showShareModal(result.urls, d.clientName, d.quoteNumber);
    } else {
      // Fallback to base64 if GitHub save fails
      console.warn('GitHub save failed, using base64 fallback:', result.error);
      const jsonStr = JSON.stringify(d);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
      const fallbackUrl = baseUrl + 'quote-viewer.html?data=' + base64;
      showShareModal({ client: fallbackUrl, tc: fallbackUrl, internal: fallbackUrl }, d.clientName, d.quoteNumber);
    }
  } catch (e) {
    console.error('Share error:', e);
    const jsonStr = JSON.stringify(d);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const fallbackUrl = baseUrl + 'quote-viewer.html?data=' + base64;
    showShareModal({ client: fallbackUrl, tc: fallbackUrl, internal: fallbackUrl }, d.clientName, d.quoteNumber);
  } finally {
    btns.forEach((btn, i) => { btn.textContent = origTexts[i] || 'SHARE QUOTE LINK'; btn.disabled = false; });
  }
}

function showShareModal(urls, clientName, quoteNumber) {
  const existing = document.getElementById('share-modal');
  if (existing) existing.remove();

  // urls = { client, tc, internal }
  const clientUrl = urls.client || urls.internal || '';
  const tcUrl = urls.tc || '';
  const internalUrl = urls.internal || '';
  const safeName = (clientName || '').replace(/'/g, "\\'");

  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

  modal.innerHTML = `
    <div style="background:#111;border:1px solid #c9a84c;border-radius:8px;padding:30px;max-width:650px;width:100%;max-height:90vh;overflow-y:auto;">
      <h3 style="color:#c9a84c;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;">SHARE QUOTE ${quoteNumber || ''}</h3>
      <p style="color:#666;font-size:10px;margin:0 0 20px 0;">Choose the link type below. Client link hides all internal data. T&C link shows terms only.</p>

      <!-- CLIENT LINK -->
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:#27AE60;color:#fff;padding:2px 8px;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:1px;">CLIENT</span><span style="color:#aaa;font-size:10px;">Quote + T&Cs - no internal data visible</span></div>
        <div style="background:#0a0a0a;border:1px solid #333;border-radius:4px;padding:10px;display:flex;gap:8px;align-items:center;">
          <input type="text" id="share-url-client" value="${clientUrl}" readonly style="flex:1;background:transparent;border:none;color:#fff;font-family:monospace;font-size:10px;outline:none;">
          <button onclick="copyLink('share-url-client',this)" style="background:#27AE60;color:#fff;border:none;padding:8px 14px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;white-space:nowrap;">COPY</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button onclick="shareViaWhatsApp('${clientUrl}','${safeName}');" style="background:#25D366;color:#fff;border:none;padding:8px 16px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;">WHATSAPP</button>
          <button onclick="shareViaSMS('${clientUrl}','${safeName}');" style="background:#3498DB;color:#fff;border:none;padding:8px 16px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;">SMS</button>
          <button onclick="shareViaEmail('${clientUrl}','${safeName}','${quoteNumber || ''}');" style="background:#c9a84c;color:#000;border:none;padding:8px 16px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;">EMAIL</button>
        </div>
      </div>

      <!-- T&C ONLY LINK -->
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:#3498DB;color:#fff;padding:2px 8px;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:1px;">T&C ONLY</span><span style="color:#aaa;font-size:10px;">Terms & Conditions + signature pad only</span></div>
        <div style="background:#0a0a0a;border:1px solid #333;border-radius:4px;padding:10px;display:flex;gap:8px;align-items:center;">
          <input type="text" id="share-url-tc" value="${tcUrl}" readonly style="flex:1;background:transparent;border:none;color:#fff;font-family:monospace;font-size:10px;outline:none;">
          <button onclick="copyLink('share-url-tc',this)" style="background:#3498DB;color:#fff;border:none;padding:8px 14px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;white-space:nowrap;">COPY</button>
        </div>
      </div>

      <!-- INTERNAL LINK -->
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="background:#c9a84c;color:#000;padding:2px 8px;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:1px;">INTERNAL</span><span style="color:#aaa;font-size:10px;">Full view with margins + edit button</span></div>
        <div style="background:#0a0a0a;border:1px solid #333;border-radius:4px;padding:10px;display:flex;gap:8px;align-items:center;">
          <input type="text" id="share-url-internal" value="${internalUrl}" readonly style="flex:1;background:transparent;border:none;color:#fff;font-family:monospace;font-size:10px;outline:none;">
          <button onclick="copyLink('share-url-internal',this)" style="background:#c9a84c;color:#000;border:none;padding:8px 14px;font-family:inherit;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:3px;white-space:nowrap;">COPY</button>
        </div>
      </div>

      <div style="text-align:center;margin-top:16px;">
        <button onclick="document.getElementById('share-modal').remove();" style="background:transparent;border:1px solid #666;color:#aaa;padding:12px 32px;font-family:inherit;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;border-radius:4px;">CLOSE</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function copyLink(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    if (btn) {
      const origText = btn.textContent;
      const origBg = btn.style.background;
      btn.textContent = 'COPIED \u2713';
      setTimeout(() => { btn.textContent = origText; }, 2000);
    }
  }).catch(() => {
    document.execCommand('copy');
  });
}

// Legacy alias
function copyShareLink() {
  copyLink('share-url-client', document.getElementById('copy-link-btn'));
}

function shareViaWhatsApp(url, clientName) {
  const name = clientName || 'there';
  const message = `Hi ${name}, please find your Micro Cement King quote here: ${url}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank');
}

function shareViaSMS(url, clientName) {
  const name = clientName || 'there';
  const message = `Hi ${name}, please find your Micro Cement King quote here: ${url}`;
  window.open('sms:?body=' + encodeURIComponent(message));
}

function shareViaEmail(url, clientName, quoteNumber) {
  const name = clientName || 'there';
  const subject = encodeURIComponent('Micro Cement King Quote' + (quoteNumber ? ' - ' + quoteNumber : ''));
  const body = encodeURIComponent(`Hi ${name},\n\nPlease find your Micro Cement King quote here:\n${url}\n\nIf you have any questions, please don't hesitate to reach out.\n\nKind regards,\nMicro Cement King\n0468 053 819\nprojects@microcementking.au`);
  window.open('mailto:?subject=' + subject + '&body=' + body);
}

// Direct buttons from quote tab - always use CLIENT link
async function shareQuoteWhatsApp() {
  const d = extractQuoteData();
  saveQuoteRevision(d);
  const result = await MCK_QUOTE_STORAGE.saveQuote(d.quoteNumber, d);
  const shareUrl = result.success ? result.urls.client : (() => {
    const jsonStr = JSON.stringify(d);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'quote-viewer.html?data=' + base64;
  })();
  const name = d.clientName || 'there';
  window.open('https://wa.me/?text=' + encodeURIComponent(`Hi ${name}, please find your Micro Cement King quote here: ${shareUrl}`), '_blank');
}

async function shareQuoteSMS() {
  const d = extractQuoteData();
  saveQuoteRevision(d);
  const result = await MCK_QUOTE_STORAGE.saveQuote(d.quoteNumber, d);
  const shareUrl = result.success ? result.urls.client : (() => {
    const jsonStr = JSON.stringify(d);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'quote-viewer.html?data=' + base64;
  })();
  const name = d.clientName || 'there';
  window.open('sms:?body=' + encodeURIComponent(`Hi ${name}, please find your Micro Cement King quote here: ${shareUrl}`));
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

  const body = document.getElementById('q-pricing-body');
  if (body) {
    body.innerHTML = '';
    if (d.lineItems && d.lineItems.length > 0) {
      d.lineItems.forEach(l => addQuoteLine(l.desc, l.qty, l.unit, l.rate));
    }
  }

  // Restore variation items
  const varBody = document.getElementById('q-variation-body');
  if (varBody) {
    varBody.innerHTML = '';
    if (d.variationItems && d.variationItems.length > 0) {
      d.variationItems.forEach(v => addVariationLine(v.desc, v.hrs, v.mat));
    }
  }

  setPaymentStagesFromData(d);
  updateQuoteTotals();

  const tab = document.getElementById('tab-quote');
  if (tab) tab.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const banner = document.createElement('div');
  banner.className = 'auto-populate-banner';
  banner.innerHTML = `<span class="apb-icon">&#9889;</span> QUOTE ${d.quoteNumber} (R${history[idx].revision}) RELOADED FROM HISTORY - REVIEW BEFORE SENDING`;
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
// EDIT MODE - Load quote from GitHub for editing
// ═══════════════════════════════════════════════════════════

async function loadQuoteForEditing(quoteId) {
  if (!quoteId || typeof MCK_QUOTE_STORAGE === 'undefined') return false;

  try {
    const result = await MCK_QUOTE_STORAGE.loadQuote(quoteId);
    if (!result.success || !result.data) {
      console.error('Failed to load quote for editing:', result.error);
      return false;
    }

    const d = result.data;

    // Set quote number (keep the same ID for re-saving)
    const qNum = document.getElementById('q-quote-number');
    if (qNum) qNum.textContent = d.quoteNumber;

    // Set date
    const dateEl = document.getElementById('q-date-display');
    if (dateEl) dateEl.textContent = d.dateIssued;

    // Set text fields
    const textFields = {
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

    Object.entries(textFields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el || !val) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.value = val;
      } else {
        el.textContent = val;
      }
    });

    // Set validity if available
    if (d.validityHours) {
      const sel = document.getElementById('q-validity-select');
      if (sel) {
        sel.value = d.validityHours;
        updateQuoteValidity();
      }
    }

    // Populate line items
    const body = document.getElementById('q-pricing-body');
    if (body) {
      body.innerHTML = '';
      if (d.lineItems && d.lineItems.length > 0) {
        d.lineItems.forEach(l => addQuoteLine(l.desc, l.qty, l.unit, l.rate));
      }
    }

    // Populate variation items
    const varBody = document.getElementById('q-variation-body');
    if (varBody) {
      varBody.innerHTML = '';
      if (d.variationItems && d.variationItems.length > 0) {
        d.variationItems.forEach(v => addVariationLine(v.desc, v.hrs, v.mat));
      }
    }

    // Populate payment stages
    setPaymentStagesFromData(d);
    // Populate inclusions / exclusions
    if (d.inclusions && d.inclusions.length > 0) populateIeList('q-inclusions', d.inclusions, 'inclusion');
    if (d.exclusions && d.exclusions.length > 0) populateIeList('q-exclusions', d.exclusions, 'exclusion');

    // Populate signature fields
    const sigTypedName = document.getElementById('q-sig-typed-name');
    if (sigTypedName && d.clientTypedName) sigTypedName.value = d.clientTypedName;
    const sigPrintName = document.getElementById('q-sig-print-name');
    if (sigPrintName && d.clientPrintName) sigPrintName.value = d.clientPrintName;
    const sigDate = document.getElementById('q-sig-date');
    if (sigDate && d.clientSigDate) sigDate.value = d.clientSigDate;

    // Restore special conditions
    if (d.specialConditions && d.specialConditions.length > 0) {
      const scList = document.getElementById('tc-special-conditions-list');
      if (scList) scList.innerHTML = '';
      _specialConditionCount = 0;
      d.specialConditions.forEach(c => addSpecialCondition(c));
    }

    // Restore attachments
    if (d.attachments && d.attachments.length > 0) {
      window._quoteAttachments = d.attachments;
      renderAttachments();
    }

    // Update totals
    updateQuoteTotals();

    // Switch to quote tab
    if (typeof switchTab === 'function') switchTab('quote');

    // Show edit banner
    const tab = document.getElementById('tab-quote');
    if (tab) {
      const existing = tab.querySelector('.auto-populate-banner');
      if (existing) existing.remove();
      const banner = document.createElement('div');
      banner.className = 'auto-populate-banner';
      banner.innerHTML = '<span class="apb-icon">&#9998;</span> EDITING QUOTE ' + d.quoteNumber + ' - CHANGES WILL SAVE TO THE SAME QUOTE ID';
      tab.insertBefore(banner, tab.firstChild);
    }

    return true;
  } catch (e) {
    console.error('Error loading quote for editing:', e);
    return false;
  }
}


// ═══════════════════════════════════════════════════════════
// INIT ON LOAD
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async function() {
  initQuote();

  // Check for edit mode via URL parameter
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    // Small delay to ensure DOM is fully ready
    setTimeout(async () => {
      const loaded = await loadQuoteForEditing(editId);
      if (!loaded) {
        alert('Could not load quote ' + editId + ' for editing. It may not exist or there was a network error.');
      }
    }, 300);
  }
});


// ═══════════════════════════════════════════════════════════
// GENERATE T&C PDF
// ═══════════════════════════════════════════════════════════

function generateTCPDF() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>MCK Payment Terms &amp; Conditions</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
  box-sizing: border-box;
  margin: 0; padding: 0;
}
@page { size: A4 portrait; margin: 15mm; }
html, body {
  background: #0a0a0a !important;
  color: #ffffff !important;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 10pt; line-height: 1.6;
}
.container { max-width: 800px; margin: 0 auto; padding: 20pt; }
.doc-header { border-bottom: 2px solid #c9a84c; padding-bottom: 16pt; margin-bottom: 16pt; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12pt; flex-wrap: wrap; }
.brand-block .label { font-size: 8pt; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4pt; }
.brand-block h1 { font-size: 20pt; color: #ffffff; letter-spacing: 2px; font-weight: 800; margin: 0 0 4pt 0; }
.brand-block .tagline { font-size: 8.5pt; color: #aaaaaa; }
.contact-block { text-align: right; font-size: 8.5pt; color: #aaaaaa; line-height: 2; }
.contact-block strong { color: #c9a84c; font-size: 7pt; letter-spacing: 1px; margin-right: 6pt; }
.tc-section { margin-bottom: 14pt; background: #111111 !important; border: 1px solid #2a2a2a; border-radius: 4px; overflow: hidden; }
.tc-section-head { display: flex; align-items: center; gap: 10pt; padding: 8pt 12pt; background: #1a1a1a !important; border-bottom: 1px solid #2a2a2a; }
.tc-section-num { background: #c9a84c !important; color: #000000 !important; font-weight: 800; font-size: 9pt; padding: 3pt 8pt; border-radius: 3px; min-width: 24pt; text-align: center; }
.tc-section-head h2 { margin: 0; font-size: 10pt; color: #c9a84c; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
.clause { display: flex; gap: 8pt; padding: 5pt 12pt; font-size: 9pt; line-height: 1.6; border-bottom: 1px solid #1e1e1e; }
.clause:last-child { border-bottom: none; }
.clause-num { color: #c9a84c; font-weight: 700; min-width: 30pt; font-size: 8pt; flex-shrink: 0; }
.clause-text { color: #dddddd; flex: 1; }
.sub-clauses { padding: 0 12pt 6pt 50pt; }
.sub-clause { display: flex; gap: 8pt; padding: 2pt 0; font-size: 8.5pt; }
.sub-num { color: #c9a84c; font-weight: 600; min-width: 40pt; font-size: 7.5pt; flex-shrink: 0; }
.doc-footer { margin-top: 20pt; padding: 10pt 14pt; background: #1a1a1a !important; border: 1px solid #2a2a2a; border-radius: 3px; text-align: center; font-size: 8pt; color: #aaaaaa; line-height: 1.8; }
.doc-footer .gold { color: #c9a84c; font-weight: 700; }
.end-marker { text-align: center; padding: 16pt 0; color: #555; font-size: 9pt; letter-spacing: 2px; }
.no-print { display: block; text-align: center; margin: 20pt 0; }
.print-btn { background: #c9a84c; color: #000; border: none; padding: 14px 36px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; border-radius: 4px; }
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html, body { background: #0a0a0a !important; color: #ffffff !important; }
  .no-print { display: none !important; }
  .tc-section { background: #111111 !important; border-color: #2a2a2a !important; }
  .tc-section-head { background: #1a1a1a !important; }
  .tc-section-num { background: #c9a84c !important; color: #000000 !important; }
  .doc-footer { background: #1a1a1a !important; }
}
</style>
</head>
<body>
<div class="container">

<div class="doc-header">
  <div class="header-row">
    <div class="brand-block">
      <div class="label">PAYMENT TERMS &amp; CONDITIONS</div>
      <h1>MICRO CEMENT KING</h1>
      <div class="tagline">Gold Coast's Premium Seamless Surfaces Specialist</div>
    </div>
    <div class="contact-block">
      <div><strong>PHONE</strong> 0468 053 819</div>
      <div><strong>EMAIL</strong> projects@microcementking.au</div>
      <div><strong>WEB</strong> microcementking.au</div>
      <div style="margin-top:6pt;font-size:7.5pt;color:#555;">All prices ex GST unless stated</div>
    </div>
  </div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">01</div><h2>DEFINITIONS</h2></div>
  <div class="clause"><span class="clause-num">1.1</span><span class="clause-text">"MCK" refers to Micro Cement King and its authorised representatives. "Client" refers to the party named in the associated quotation. "Works" refers to all microcement application, surface preparation, sealing, and related services described in the quotation scope.</span></div>
  <div class="clause"><span class="clause-num">1.2</span><span class="clause-text">"Contract" means the accepted quotation together with these Payment Terms &amp; Conditions, forming the entire agreement between the parties.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">02</div><h2>QUOTE VALIDITY &amp; ACCEPTANCE</h2></div>
  <div class="clause"><span class="clause-num">2.1</span><span class="clause-text">Quotes are valid for the period stated on the quotation from the date of issue. After expiry, pricing must be reconfirmed in writing by MCK.</span></div>
  <div class="clause"><span class="clause-num">2.2</span><span class="clause-text">Acceptance of the quotation is confirmed by the client's signature (digital or physical) on the quotation document AND receipt of the booking deposit. Both conditions must be met.</span></div>
  <div class="clause"><span class="clause-num">2.3</span><span class="clause-text">MCK reserves the right to withdraw or amend any quotation prior to formal acceptance.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">03</div><h2>PAYMENT TERMS</h2></div>
  <div class="clause"><span class="clause-num">3.1 - Booking Deposit</span><span class="clause-text">A non-refundable booking deposit of 5% to 10% of the contract value is required to secure the project start date (5% for contracts exceeding $20,000, or 10% for contracts of $20,000 or under). The deposit is non-refundable as it secures the client's place in the schedule.</span></div>
  <div class="clause"><span class="clause-num">3.2 - Material Payment</span><span class="clause-text">A material payment of 40% to 45% of the contract value is due prior to the scheduled start date so that materials can be ordered and purchased. Once materials have been ordered or purchased this payment is non-refundable, including if the project is subsequently cancelled, as the materials are procured specifically for the client. Works will not commence until this payment is received as cleared funds.</span></div>
  <div class="clause"><span class="clause-num">3.3 - Commencement Payment</span><span class="clause-text">A commencement payment of 40% of the contract value is due and payable within 24 hours of works commencing on site.</span></div>
  <div class="clause"><span class="clause-num">3.4 - Final Payment &amp; Sealer</span><span class="clause-text">The final 10% of the contract value is due upon application of the first sealer coat. The final application of sealer is completed only after the final 10% has been received as cleared funds. Upon receipt of the final payment and application of the final sealer coat, all workmanship warranties and manufacturer guarantees commence.</span></div>
  <div class="clause"><span class="clause-num">3.5 - Upfront Reduction</span><span class="clause-text">A 5% reduction (capped at $1,000) is available for clients who pay the full contract amount upfront prior to commencement. This reduction is applied to the total contract value (ex GST).</span></div>
  <div class="clause"><span class="clause-num">3.6 - Measure Fee</span><span class="clause-text">A non-refundable on-site measure fee of $220 (ex GST) applies where a site visit is required prior to quoting. This fee is credited in full against the contract upon acceptance.</span></div>
  <div class="clause"><span class="clause-num">3.7 - Samples</span><span class="clause-text">Microcement is a uniquely natural finish. Where physical samples are requested, they are charged at $330 (ex GST) per sample. Sample fees are non-refundable and are not credited against the contract.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">04</div><h2>OVERDUE PAYMENTS &amp; DEBT RECOVERY</h2></div>
  <div class="clause"><span class="clause-num">4.1</span><span class="clause-text">Invoices overdue by more than 3 business days will incur an administration fee of $220 (ex GST).</span></div>
  <div class="clause"><span class="clause-num">4.2</span><span class="clause-text">Interest accrues at 3% per week on outstanding amounts from Day 4 of the overdue period, compounding weekly.</span></div>
  <div class="clause"><span class="clause-num">4.3</span><span class="clause-text">If payment remains outstanding for 30 days or more, the matter will be referred to an external debt recovery agent. All recovery costs, legal fees, and collection charges will be added to the outstanding amount and are payable by the client.</span></div>
  <div class="clause"><span class="clause-num">4.4</span><span class="clause-text">MCK reserves the right to suspend or terminate works immediately if any payment milestone is not met within the specified timeframe.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">05</div><h2>VARIATIONS</h2></div>
  <div class="clause"><span class="clause-num">5.1</span><span class="clause-text">All variations to the original scope must be agreed in writing before work commences. Verbal agreements are not binding.</span></div>
  <div class="clause"><span class="clause-num">5.2</span><span class="clause-text">Variations are charged at $150/hr (ex GST) with a 2-hour minimum, plus materials at cost + 20%. A $500 material allowance applies per variation unless otherwise agreed.</span></div>
  <div class="clause"><span class="clause-num">5.3</span><span class="clause-text">Variation invoices are payable within 3 business days of issue and are subject to the same overdue terms as the primary contract.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">06</div><h2>WARRANTIES</h2></div>
  <div class="clause"><span class="clause-num">6.1</span><span class="clause-text">All workmanship is covered under statutory warranties as required by Queensland law.</span></div>
  <div class="clause"><span class="clause-num">6.2</span><span class="clause-text">Manufacturer product warranties are passed through to the client in full. MCK will assist with any warranty claims where reasonable.</span></div>
  <div class="clause"><span class="clause-num">6.3</span><span class="clause-text">Warranties do not cover damage caused by misuse, neglect, other trades, structural movement, or failure to follow maintenance guidelines provided by MCK.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">07</div><h2>DISPUTE RESOLUTION</h2></div>
  <div class="clause"><span class="clause-num">7.1</span><span class="clause-text">Both parties agree to engage in good faith to resolve any dispute. Any concern with the works must be raised with MCK in writing, with specific detail and photographs where relevant, and MCK must be given reasonable access and a fair opportunity to inspect and rectify before any other action is taken.</span></div>
  <div class="clause"><span class="clause-num">7.2</span><span class="clause-text">No third-party contractors may be engaged to inspect, alter, or rectify the works while a dispute is on foot or until a written resolution is agreed by both parties. Engaging third parties, or altering the works, without MCK's prior written consent immediately and permanently voids all warranties and releases MCK from all liability in respect of the affected works.</span></div>
  <div class="clause"><span class="clause-num">7.3</span><span class="clause-text">Payment may not be withheld, reduced, or delayed on account of minor, cosmetic, or natural-finish characteristics (see Natural Finish &amp; Design), or while a dispute is being worked through in good faith. Undisputed amounts remain due in accordance with the Payment Terms.</span></div>
  <div class="clause"><span class="clause-num">7.4</span><span class="clause-text">Unreasonable refusal or unwillingness to engage in this dispute process — including failure to respond in writing within 7 days, denying MCK access to inspect or rectify, or engaging third parties — is a breach of contract. In such circumstances MCK is entitled to treat the works as accepted, render the full final invoice as immediately due and payable, and recover all resulting costs, including the administration fee, weekly interest, and recovery costs.</span></div>
  <div class="clause"><span class="clause-num">7.5</span><span class="clause-text">If a dispute remains unresolved after good-faith negotiation, it may be referred to mediation in Queensland before either party commences legal proceedings.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">08</div><h2>SITE ACCESS &amp; CONDITIONS</h2></div>
  <div class="clause"><span class="clause-num">8.1</span><span class="clause-text">The client must ensure unobstructed access to the work area for the full project duration. Restricted access, delays caused by other trades, or site conditions not disclosed at quoting may incur additional charges.</span></div>
  <div class="clause"><span class="clause-num">8.2</span><span class="clause-text">MCK is not responsible for damage to surfaces caused by other trades working in or near the application area after MCK has completed its works.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">09</div><h2>NATURAL FINISH &amp; DESIGN</h2></div>
  <div class="clause"><span class="clause-num">9.1</span><span class="clause-text">Microcement is a uniquely natural, hand-applied finish. Variation in tone, shading, mottling, trowel movement, and texture — and the way the finish follows the natural contour of the substrate — is an inherent and intended characteristic of the product and is not a defect.</span></div>
  <div class="clause"><span class="clause-num">9.2</span><span class="clause-text">Final design, layout, trowel direction, and finish decisions are made on site by MCK's tradesmen and microcement experts, applied over the natural contour of the surface. Where the client has specific preferences these should be discussed and agreed in writing prior to application.</span></div>
  <div class="clause"><span class="clause-num">9.3</span><span class="clause-text">Colour and finish may vary from samples due to substrate conditions, ambient lighting, humidity, and application technique. Samples are indicative only and do not guarantee an exact colour match. Physical samples are charged at $330 (ex GST) per sample.</span></div>
  <div class="clause"><span class="clause-num">9.4</span><span class="clause-text">Colour or finish changes requested after application has commenced will be treated as a variation and charged accordingly.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">10</div><h2>TERMINATION &amp; NON-COMPLIANCE</h2></div>
  <div class="clause"><span class="clause-num">10.1</span><span class="clause-text">MCK reserves the right to suspend or terminate the contract where payment terms are breached, where site conditions present an unreasonable risk to workers or materials, or where the client fails to comply with, or refuses to engage with, the Dispute Resolution process.</span></div>
  <div class="clause"><span class="clause-num">10.2</span><span class="clause-text">Where the contract is terminated, or where a final sealer coat or other works remain outstanding due to the client's non-compliance, non-payment, or refusal to engage with or comprehend the Dispute Resolution process, the situation must be resolved and the site made ready for completion within 14 days. If it is not, the full and final invoice for the contract becomes immediately due and payable in full, including the administration fee and weekly interest set out in these terms.</span></div>
  <div class="clause"><span class="clause-num">10.3</span><span class="clause-text">Upon termination, all work completed to date is invoiced at the agreed contract rates and is immediately payable. Materials ordered or delivered are non-refundable. Warranties and manufacturer guarantees do not commence on any works for which final payment has not been received.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">11</div><h2>CONFIDENTIALITY, INTELLECTUAL PROPERTY &amp; NON-DISTRIBUTION</h2></div>
  <div class="clause"><span class="clause-num">11.1</span><span class="clause-text">This quotation and all of its contents — including pricing, rates, pricing scaffolds, cost structures, methodology, scope, inclusions, system specifications, and these Terms &amp; Conditions — are the confidential information and intellectual property of Micro Cement King, developed over many years at significant cost. They are provided to the Owner/Client in confidence and are to be held strictly private and confidential between the Owner/Client and Micro Cement King only.</span></div>
  <div class="clause"><span class="clause-num">11.2</span><span class="clause-text">This quotation must not be shared, disclosed, published, forwarded, distributed, reproduced, or copied to any third party (including other contractors, suppliers, or competitors), nor used to quote against, benchmark, or undercut Micro Cement King, nor used to train, build, populate, or reverse-engineer any template, database, or artificial-intelligence system, without the prior written consent of Micro Cement King.</span></div>
  <div class="clause"><span class="clause-num">11.3</span><span class="clause-text">Any unauthorised sharing, distribution, or use of this quotation or its contents will result in the recovery of MCK's operational expenses and the time invested in preparing it, plus liquidated damages of up to $30,000 to account for the compromise and devaluation of MCK's pricing structures, procedures, and intellectual property — including any use to build out or train quoting templates or AI systems. Micro Cement King reserves the right to recover any and all losses arising from the compromise of the procedures and pricing scaffolds it has spent years creating.</span></div>
  <div class="clause"><span class="clause-num">11.4</span><span class="clause-text">This clause survives the completion, expiry, or termination of the contract.</span></div>
</div>

<div class="tc-section">
  <div class="tc-section-head"><div class="tc-section-num">12</div><h2>GOVERNING LAW</h2></div>
  <div class="clause"><span class="clause-num">12.1</span><span class="clause-text">This agreement is governed by the laws of Queensland, Australia. Any legal proceedings shall be conducted in the courts of Queensland.</span></div>
</div>

<div class="end-marker"> - END OF TERMS - </div>

<div class="doc-footer">
  <span class="gold">MICRO CEMENT KING</span> &nbsp;|&nbsp; 0468 053 819 &nbsp;|&nbsp; projects@microcementking.au &nbsp;|&nbsp; microcementking.au<br>
  These terms form part of the formal quotation and are binding upon acceptance.
</div>

<div class="no-print">
  <button class="print-btn" onclick="window.print()">PRINT / SAVE AS PDF</button>
</div>

</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'MCK-Terms-and-Conditions.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  }
}
