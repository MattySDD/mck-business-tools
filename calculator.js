// ═══════════════════════════════════════════════════════════
// MCK MARGIN CALCULATOR — CONFIRMED PRICING ENGINE
// All prices ex GST. Source: sop_data_confirmed.md v2.0
// ═══════════════════════════════════════════════════════════

// ── TAB SWITCHING ──────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active','print-active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabId);
  if (tab) { tab.classList.add('active','print-active'); }
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

  // Resize signature canvases when their tab becomes visible
  if (tabId === 'quote' || tabId === 'terms') {
    setTimeout(() => {
      const pairs = tabId === 'quote'
        ? [['q-sig-canvas','q-canvas-wrap'],['q-mck-sig-canvas','q-mck-canvas-wrap']]
        : [['tc-sig-canvas','tc-canvas-wrap']];
      pairs.forEach(([cId, wId]) => {
        const c = document.getElementById(cId);
        const w = document.getElementById(wId);
        if (c && w && c.width !== w.offsetWidth) {
          c.width = w.offsetWidth;
          c.height = 160;
        }
      });
    }, 50);
  }
}

// ── CONFIRMED PRODUCT DATA ─────────────────────────────────
const PRODUCTS = {
  // SHARED — POOLED ACROSS ENTIRE JOB
  iw_blocker:   { name:'IW Blocker Grip Primer 5kg',  packCost:161.78, packCoverage:100, unit:'5kg pack' },
  mesh:         { name:'Fibreglass Mesh 50sqm roll',   packCost:120.00, packCoverage:50,  unit:'50sqm roll' },
  idealpu:      { name:'IDEALPU-WB-PRIMER 5kg',        packCost:411.81, packCoverage:100, unit:'5kg pack' },
  pu100:        { name:'PU100 Sealer 20L',             packCost:624.00, packCoverage:100, unit:'20L pack' },
  micro_seal:   { name:'Micro Seal 5.5L',              packCost:198.00, packCoverage:30,  unit:'5.5L pack' },
  wp120:        { name:'Velosit WP120 20kg',           packCost:151.63, packCoverage:20,  unit:'20kg pack' },

  // SOLIDRO — PER SURFACE
  solidro_zero: { name:'Solidro Zero 20kg',  packCost:745.80, packKg:20, kgPerSqm:1/1.1, sqmPerKg:1.1, sqmPerPack:22 },
  solidro_top:  { name:'Solidro Top 10kg',   packCost:627.00, packKg:10, kgPerSqm:1/2.5, sqmPerKg:2.5, sqmPerPack:25 },

  // MICROTOPPING — PER SURFACE
  mt_base:   { name:'MT-BC-W Base Coat 25kg',    packCost:259.17, packKg:25, kgPerSqm:1/1.1, sqmPerKg:1.1, sqmPerPack:27.5 },
  mt_finish: { name:'MT-FC-W Finish Coat 17.5kg', packCost:211.80, packKg:17.5, kgPerSqm:1/2.2, sqmPerKg:2.2, sqmPerPack:38.5 },
  mt_pol:    { name:'MT-POL Liquid Polymer 17L',   packCost:586.67, packCoverage:46.75, unit:'17L pack' },
};

const CONSUMABLES = 100.00; // flat per job

// Surface types that need mesh
const NEEDS_MESH = ['Floor','Wet Area','Bench Top'];
// Surface types that need Micro Seal
const NEEDS_MICRO_SEAL = ['Floor','Wet Area','Bench Top'];
// Surface types that need WP120
const NEEDS_WP120 = ['Wet Area'];

// ── CREW CONFIGS (reads from Settings if available) ─────────
function getCrewConfigs() {
  const s = typeof getSetting === 'function' ? getSetting : (k => null);
  return {
    solo:     { rate: s('solo_rate') || 65,  label:'Patty Only', sqmPerDay: s('sqm_per_day_solo') || 15, workers:1 },
    standard: { rate: s('standard_rate') || 120, label:'Patty + Hayden/Micky', sqmPerDay: s('sqm_per_day_standard') || 20, workers:2 },
    full:     { rate: s('full_rate') || 155, label:'Patty + Hayden/Micky + Labourer', sqmPerDay: s('sqm_per_day_full') || 28, workers:3 },
  };
}
const CREW_CONFIGS = getCrewConfigs();

let crewConfig = CREW_CONFIGS.standard;
let prepMultiplier = 1.0;

// ── MARKET RANGES (Gold Coast) ─────────────────────────────
const MARKET_RANGES = {
  'Floor':        { min:200, max:400 },
  'Feature Wall': { min:280, max:500 },
  'Wet Area':     { min:350, max:600 },
  'Bench Top':    { min:300, max:500 },
};

// ── MCK RECOMMENDED SELL PRICING (reads from Settings if available) ──
function getMCKPricing() {
  const s = typeof getSetting === 'function' ? getSetting : (k => null);
  return {
    'Floor':        { overThreshold: s('floor_over_60_rate') || 100, underThreshold: s('floor_under_60_rate') || 160, thresholdSqm: 60, minCharge: s('floor_min_charge') || 7500 },
    'Feature Wall': { overThreshold: s('wall_over_20_rate') || 120, underThreshold: s('wall_under_20_rate') || 180, thresholdSqm: 20, minCharge: s('wall_min_charge') || 5000 },
    'Wet Area':     { overThreshold: s('wet_over_20_rate') || 160, underThreshold: s('wet_under_20_rate') || 300, thresholdSqm: 20, minCharge: s('wet_min_charge') || 7500 },
    'Bench Top':    { overThreshold: s('wet_over_20_rate') || 160, underThreshold: s('wet_under_20_rate') || 300, thresholdSqm: 20, minCharge: s('wet_min_charge') || 7500 },
  };
}
let MCK_PRICING = getMCKPricing();

// ── SURFACE LINE MANAGEMENT ────────────────────────────────
let lineCount = 0;

function addSurfaceLine(defaultType, defaultSys) {
  const count = document.querySelectorAll('.surface-line').length;
  if (count >= 10) return;
  lineCount++;
  const id = lineCount;
  const type = defaultType || 'Floor';
  const sys = defaultSys || 'solidro';

  const html = `
  <div class="surface-line" id="surface-line-${id}">
    <div class="surface-line-header">
      <div class="surface-line-title">SURFACE ${id}</div>
    </div>
    <div class="surface-line-controls">
      <div class="field-group">
        <label>SURFACE NAME</label>
        <input type="text" id="name-${id}" placeholder="e.g. Bathroom Floor" oninput="recalc()">
      </div>
      <div class="field-group">
        <label>TYPE</label>
        <select id="type-${id}" onchange="onTypeChange(${id});recalc()">
          <option value="Floor" ${type==='Floor'?'selected':''}>Floor</option>
          <option value="Feature Wall" ${type==='Feature Wall'?'selected':''}>Feature Wall</option>
          <option value="Wet Area" ${type==='Wet Area'?'selected':''}>Wet Area</option>
          <option value="Bench Top" ${type==='Bench Top'?'selected':''}>Bench Top</option>
        </select>
      </div>
      <div class="field-group">
        <label>SYSTEM</label>
        <select id="sys-${id}" onchange="recalc()">
          <option value="solidro" ${sys==='solidro'?'selected':''}>Solidro</option>
          <option value="microtopping" ${sys==='microtopping'?'selected':''}>Microtopping</option>
        </select>
      </div>
      <div class="field-group">
        <label>SQM</label>
        <input type="number" id="sqm-${id}" placeholder="0" min="0" step="0.1" oninput="recalc()">
      </div>
      <button class="remove-btn" onclick="removeSurfaceLine(${id})" title="Remove">&times;</button>
    </div>
    <div class="toggle-wrap" id="levelled-wrap-${id}" style="opacity:${type==='Floor'?'1':'0.3'}">
      <input type="checkbox" id="levelled-${id}" onchange="recalc()">
      <label for="levelled-${id}">Levelled floor (good substrate — 1 base + 1 top, no mesh)</label>
    </div>
  </div>`;

  document.getElementById('surface-lines').insertAdjacentHTML('beforeend', html);
  updateAddBtn();
  recalc();
}

function onTypeChange(id) {
  const type = document.getElementById('type-'+id)?.value;
  const wrap = document.getElementById('levelled-wrap-'+id);
  if (wrap) wrap.style.opacity = type === 'Floor' ? '1' : '0.3';
  const cb = document.getElementById('levelled-'+id);
  if (cb && type !== 'Floor') cb.checked = false;
}

function removeSurfaceLine(id) {
  const el = document.getElementById('surface-line-'+id);
  if (el) el.remove();
  recalc();
  updateAddBtn();
}

function updateAddBtn() {
  const count = document.querySelectorAll('.surface-line').length;
  document.getElementById('add-surface-btn').style.display = count >= 10 ? 'none' : 'block';
}

// ── CREW & PREP ────────────────────────────────────────────
function selectCrew(el, key) {
  document.querySelectorAll('#crew-grid .crew-option').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  crewConfig = CREW_CONFIGS[key];
  recalc();
}

function selectPrep(el, key, mult) {
  document.querySelectorAll('#prep-grid .crew-option').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  prepMultiplier = mult;
  recalc();
}

// ── HELPERS ────────────────────────────────────────────────
const fmt = n => {
  if (n === 0 || isNaN(n)) return '$0.00';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function packsNeeded(totalSqm, packCoverage) {
  if (totalSqm <= 0) return { packs:0, leftover:0 };
  const packs = Math.ceil(totalSqm / packCoverage);
  const leftover = (packs * packCoverage) - totalSqm;
  return { packs, leftover };
}

// ── MCK RECOMMENDED SELL PRICE ENGINE ──────────────────────
function calculateRecommendedSellPrice(lines) {
  if (!lines.length) return null;

  const uniqueTypes = [...new Set(lines.map(l => l.type))];
  const isCombined = uniqueTypes.length > 1;
  const totalSqm = lines.reduce((s, l) => s + l.sqm, 0);

  // Group by surface type
  const typeGroups = {};
  lines.forEach(l => {
    if (!typeGroups[l.type]) typeGroups[l.type] = { sqm: 0, lines: [] };
    typeGroups[l.type].sqm += l.sqm;
    typeGroups[l.type].lines.push(l);
  });

  let totalRecommended = 0;
  const breakdown = [];

  Object.entries(typeGroups).forEach(([type, data]) => {
    const pricing = MCK_PRICING[type];
    if (!pricing) return;

    const sqm = data.sqm;
    const rate = sqm >= pricing.thresholdSqm ? pricing.overThreshold : pricing.underThreshold;
    let linePrice = sqm * rate;

    // Apply minimum charge only if NOT combined
    let minApplied = false;
    if (!isCombined && linePrice < pricing.minCharge) {
      linePrice = pricing.minCharge;
      minApplied = true;
    }

    totalRecommended += linePrice;
    breakdown.push({
      type,
      sqm,
      rate,
      linePrice,
      minCharge: pricing.minCharge,
      minApplied,
      thresholdSqm: pricing.thresholdSqm,
      overUnder: sqm >= pricing.thresholdSqm ? 'OVER' : 'UNDER'
    });
  });

  return {
    totalRecommended,
    breakdown,
    isCombined,
    totalSqm,
    combinedNote: isCombined ? 'Combined areas — individual minimum charges eliminated. Only total job value matters.' : null
  };
}

// ── MAIN RECALC ────────────────────────────────────────────
function recalc() {
  const lines = [];
  document.querySelectorAll('.surface-line').forEach(el => {
    const id = el.id.replace('surface-line-', '');
    const type = document.getElementById('type-'+id)?.value;
    const sys  = document.getElementById('sys-'+id)?.value;
    const sqm  = parseFloat(document.getElementById('sqm-'+id)?.value) || 0;
    const name = document.getElementById('name-'+id)?.value || ('Surface ' + id);
    const lev  = document.getElementById('levelled-'+id)?.checked && type === 'Floor';
    if (type && sqm > 0) lines.push({ id, name, type, sys, sqm, levelled: lev });
  });

  const hasLines = lines.length > 0;
  document.getElementById('empty-state').style.display = hasLines ? 'none' : 'block';
  document.getElementById('results-content').style.display = hasLines ? 'block' : 'none';
  if (!hasLines) { clearResults(); return; }

  // ── TOTAL SQM CALCULATIONS ──
  const totalSqm = lines.reduce((s, l) => s + l.sqm, 0);
  const meshSqm = lines.filter(l => NEEDS_MESH.includes(l.type) && !l.levelled).reduce((s, l) => s + l.sqm, 0);
  const microSealSqm = lines.filter(l => NEEDS_MICRO_SEAL.includes(l.type)).reduce((s, l) => s + l.sqm, 0);
  const wp120Sqm = lines.filter(l => NEEDS_WP120.includes(l.type)).reduce((s, l) => s + l.sqm, 0);

  // ── POOLED MATERIALS (same for both systems) ──
  const iwB     = packsNeeded(totalSqm, 100);
  const idealpu = packsNeeded(totalSqm, 100);
  const pu100   = packsNeeded(totalSqm, 100);
  const mseal   = packsNeeded(microSealSqm, 30);
  const mesh    = packsNeeded(meshSqm, 50);
  const wp120   = packsNeeded(wp120Sqm, 20);

  const pooledCost =
    (iwB.packs * PRODUCTS.iw_blocker.packCost) +
    (idealpu.packs * PRODUCTS.idealpu.packCost) +
    (pu100.packs * PRODUCTS.pu100.packCost) +
    (mseal.packs * PRODUCTS.micro_seal.packCost) +
    (mesh.packs * PRODUCTS.mesh.packCost) +
    (wp120.packs * PRODUCTS.wp120.packCost) +
    CONSUMABLES;

  // ── SOLIDRO BASE/TOP COAT (per surface) ──
  let solidroBaseCost = 0, solidroTopCost = 0;
  const solidroLines = [];
  lines.forEach(l => {
    const baseKg = l.sqm / PRODUCTS.solidro_zero.sqmPerKg;
    const topCoats = l.levelled ? 1 : 2;
    const topKg = l.sqm / PRODUCTS.solidro_top.sqmPerKg * topCoats;
    const basePacks = Math.ceil(baseKg / PRODUCTS.solidro_zero.packKg);
    const topPacks  = Math.ceil(topKg / PRODUCTS.solidro_top.packKg);
    const bCost = basePacks * PRODUCTS.solidro_zero.packCost;
    const tCost = topPacks * PRODUCTS.solidro_top.packCost;
    solidroBaseCost += bCost;
    solidroTopCost += tCost;
    solidroLines.push({ ...l, basePacks, topPacks, bCost, tCost, topCoats,
      baseKg: baseKg.toFixed(2), topKg: topKg.toFixed(2) });
  });
  const solidroMatCost = solidroBaseCost + solidroTopCost + pooledCost;

  // ── MICROTOPPING BASE/TOP COAT + POLYMER (per surface) ──
  let mtBaseCost = 0, mtTopCost = 0, mtPolCost = 0;
  const mtLines = [];
  lines.forEach(l => {
    const baseKg = l.sqm / PRODUCTS.mt_base.sqmPerKg;
    const topCoats = l.levelled ? 1 : 2;
    const topKg = l.sqm / PRODUCTS.mt_finish.sqmPerKg * topCoats;
    const basePacks = Math.ceil(baseKg / PRODUCTS.mt_base.packKg);
    const topPacks  = Math.ceil(topKg / PRODUCTS.mt_finish.packKg);
    const bCost = basePacks * PRODUCTS.mt_base.packCost;
    const tCost = topPacks * PRODUCTS.mt_finish.packCost;
    mtBaseCost += bCost;
    mtTopCost += tCost;
    mtLines.push({ ...l, basePacks, topPacks, bCost, tCost, topCoats,
      baseKg: baseKg.toFixed(2), topKg: topKg.toFixed(2) });
  });
  const mtPolPacks = packsNeeded(totalSqm, 46.75);
  mtPolCost = mtPolPacks.packs * PRODUCTS.mt_pol.packCost;
  const mtMatCost = mtBaseCost + mtTopCost + mtPolCost + pooledCost;

  // ── LABOUR ──
  const floorSqm = lines.filter(l => l.type === 'Floor').reduce((s,l) => s+l.sqm, 0);
  const nonFloorSqm = lines.filter(l => l.type !== 'Floor').reduce((s,l) => s+l.sqm, 0);
  const floorDays = floorSqm > 0 ? Math.ceil(floorSqm / crewConfig.sqmPerDay) : 0;
  const wallDays = nonFloorSqm > 0 ? Math.ceil(nonFloorSqm / (crewConfig.sqmPerDay * 1.25)) : 0;
  const prepDays = totalSqm > 0 ? Math.ceil(totalSqm / 80) : 0;
  const sealerDays = totalSqm > 0 ? Math.ceil(totalSqm / 100) : 0;
  const rawDays = prepDays + floorDays + wallDays + sealerDays;
  const totalDays = Math.ceil(rawDays * prepMultiplier);
  const labourHrs = totalDays * 8;
  const labourCost = labourHrs * crewConfig.rate;

  // ── TOTALS ──
  const solidroTotal = solidroMatCost + labourCost;
  const mtTotal = mtMatCost + labourCost;

  // ── MCK RECOMMENDED SELL PRICE ──
  MCK_PRICING = getMCKPricing(); // Refresh from settings
  const recSell = calculateRecommendedSellPrice(lines);

  // ── UPDATE SUMMARY ──
  document.getElementById('r-mat-cost').textContent = fmt(solidroMatCost);
  document.getElementById('r-mat-sub').textContent = 'Solidro system (pooled materials)';
  document.getElementById('r-lab-cost').textContent = fmt(labourCost);
  document.getElementById('r-lab-sub').textContent = totalDays + ' working days × 8hrs × ' + fmt(crewConfig.rate) + '/hr';
  document.getElementById('r-job-cost').textContent = fmt(solidroTotal);
  document.getElementById('r-sqm-cost').textContent = fmt(solidroTotal / totalSqm) + '/sqm cost price';
  document.getElementById('r-total-sqm').textContent = totalSqm.toFixed(1) + ' sqm';

  // ── COMPARISON ──
  document.getElementById('cmp-sol-mat').textContent = fmt(solidroMatCost);
  document.getElementById('cmp-sol-lab').textContent = fmt(labourCost);
  document.getElementById('cmp-sol-total').textContent = fmt(solidroTotal);
  document.getElementById('cmp-sol-40').textContent = fmt(solidroTotal / 0.60);
  document.getElementById('cmp-sol-45').textContent = fmt(solidroTotal / 0.55);
  document.getElementById('cmp-mt-mat').textContent = fmt(mtMatCost);
  document.getElementById('cmp-mt-lab').textContent = fmt(labourCost);
  document.getElementById('cmp-mt-total').textContent = fmt(mtTotal);
  document.getElementById('cmp-mt-40').textContent = fmt(mtTotal / 0.60);
  document.getElementById('cmp-mt-45').textContent = fmt(mtTotal / 0.55);

  // ── MATERIAL TABLE (Solidro) ──
  renderMaterialTable('mat-table-wrap', {
    iwB, idealpu, pu100, mseal, mesh, wp120, microSealSqm, meshSqm, wp120Sqm, totalSqm,
    surfaceLines: solidroLines, baseCost: solidroBaseCost, topCost: solidroTopCost,
    pooledCost, totalMatCost: solidroMatCost
  }, 'solidro');

  // ── MATERIAL TABLE (Microtopping) ──
  renderMaterialTable('mt-table-wrap', {
    iwB, idealpu, pu100, mseal, mesh, wp120, microSealSqm, meshSqm, wp120Sqm, totalSqm,
    surfaceLines: mtLines, baseCost: mtBaseCost, topCost: mtTopCost,
    pooledCost, totalMatCost: mtMatCost, mtPolPacks, mtPolCost
  }, 'microtopping');

  // ── SURFACE BREAKDOWN ──
  renderSurfaceBreakdown(solidroLines);

  // ── RECOMMENDED SELL PRICE ──
  renderRecommendedSellPrice(recSell, solidroTotal, totalSqm);

  // ── MARGIN BANDS ──
  renderMarginBands(solidroTotal, totalSqm);

  // ── MARKET SANITY ──
  renderMarketCheck(solidroTotal, lines);

  // ── LABOUR BREAKDOWN ──
  renderLabourBreakdown(prepDays, floorDays, wallDays, sealerDays, totalDays, labourHrs, labourCost);

  // ── CUSTOM SELL PRICE ──
  const customSell = parseFloat(document.getElementById('custom-sell').value) || 0;
  if (customSell > 0) {
    const margin = ((customSell - solidroTotal) / customSell * 100);
    const cls = margin >= 40 ? 'var(--green)' : margin >= 35 ? 'var(--amber)' : 'var(--red)';
    document.getElementById('custom-margin-display').innerHTML =
      `<span style="color:${cls};font-size:18px;">${margin.toFixed(1)}% margin</span> &nbsp; Profit: ${fmt(customSell - solidroTotal)} &nbsp; $/sqm sell: ${fmt(customSell/totalSqm)}`;
  } else {
    document.getElementById('custom-margin-display').textContent = 'Enter a sell price to see your actual margin';
    document.getElementById('custom-margin-display').style.color = 'var(--grey-light)';
  }
}

// ── RENDER RECOMMENDED SELL PRICE ──────────────────────────
function renderRecommendedSellPrice(recSell, totalCost, totalSqm) {
  const wrap = document.getElementById('rec-sell-wrap');
  if (!wrap) return;
  if (!recSell) { wrap.innerHTML = ''; return; }

  const margin = ((recSell.totalRecommended - totalCost) / recSell.totalRecommended * 100);
  const marginCls = margin >= 40 ? 'green' : margin >= 35 ? 'amber' : 'red';
  const profit = recSell.totalRecommended - totalCost;

  let html = `
    <div class="results-grid">
      <div class="stat-card" style="border-left:4px solid var(--gold);">
        <div class="stat-label">RECOMMENDED SELL PRICE</div>
        <div class="stat-value gold">${fmt(recSell.totalRecommended)}</div>
        <div class="stat-sub">${fmt(recSell.totalRecommended / totalSqm)}/sqm blended (ex GST)</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--${marginCls});">
        <div class="stat-label">MARGIN AT RECOMMENDED PRICE</div>
        <div class="stat-value ${marginCls}">${margin.toFixed(1)}%</div>
        <div class="stat-sub">Profit: ${fmt(profit)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">TOTAL COST PRICE</div>
        <div class="stat-value">${fmt(totalCost)}</div>
        <div class="stat-sub">${fmt(totalCost / totalSqm)}/sqm cost</div>
      </div>
    </div>`;

  // Combined areas note
  if (recSell.isCombined) {
    html += `<div class="callout callout-gold" style="margin-top:14px;">
      <strong>COMBINED AREAS:</strong> ${recSell.combinedNote}
    </div>`;
  }

  // Breakdown table
  html += `<table class="mat-table" style="margin-top:14px;">
    <thead><tr>
      <th>SURFACE TYPE</th><th class="right">SQM</th><th class="right">THRESHOLD</th>
      <th class="right">RATE/SQM</th><th class="right">LINE PRICE</th><th>STATUS</th>
    </tr></thead><tbody>`;

  recSell.breakdown.forEach(b => {
    const statusColor = b.minApplied ? 'var(--amber)' : 'var(--green)';
    const statusText = b.minApplied ? 'MIN CHARGE APPLIED' : (b.overUnder + ' ' + b.thresholdSqm + 'sqm');
    html += `<tr>
      <td>${b.type}</td>
      <td class="right">${b.sqm.toFixed(1)}</td>
      <td class="right">${b.thresholdSqm} sqm</td>
      <td class="right">${fmt(b.rate)}/sqm</td>
      <td class="right">${fmt(b.linePrice)}</td>
      <td style="color:${statusColor};font-weight:700;font-size:11px;">${statusText}</td>
    </tr>`;
  });

  html += `</tbody><tfoot>
    <tr class="total-row">
      <td colspan="4">TOTAL RECOMMENDED SELL PRICE (EX GST)</td>
      <td class="right">${fmt(recSell.totalRecommended)}</td>
      <td></td>
    </tr>
  </tfoot></table>`;

  // MCK Pricing reference
  html += `<div class="callout callout-info" style="margin-top:14px;">
    <strong>MCK PRICING STRUCTURE (ALL SYSTEMS — EX GST, INCLUDES MATERIALS)</strong><br>
    <strong>Floors:</strong> Over 60sqm = $100/sqm | Under 60sqm = $160/sqm | Min $7,500<br>
    <strong>Feature Walls:</strong> Over 20sqm = $120/sqm | Under 20sqm = $180/sqm | Min $5,000<br>
    <strong>Wet Areas / Bathrooms / Benchtops:</strong> Over 20sqm = $160/sqm | Under 20sqm = $300/sqm | Min $7,500<br>
    <strong>Combined areas:</strong> Individual minimums eliminated — only total job value matters
  </div>`;

  wrap.innerHTML = html;
}

// ── RENDER MATERIAL TABLE ──────────────────────────────────
function renderMaterialTable(wrapperId, d, system) {
  const isSolidro = system === 'solidro';
  const baseProduct = isSolidro ? PRODUCTS.solidro_zero : PRODUCTS.mt_base;
  const topProduct  = isSolidro ? PRODUCTS.solidro_top  : PRODUCTS.mt_finish;

  let html = `<table class="mat-table">
    <thead><tr>
      <th>PRODUCT</th><th>APPLIES TO</th><th class="right">PACKS</th>
      <th class="right">LEFTOVER</th><th class="right">UNIT COST</th><th class="right">LINE COST</th>
    </tr></thead><tbody>`;

  // BASE COAT
  let totalBasePacks = 0, totalBaseKg = 0;
  d.surfaceLines.forEach(l => { totalBasePacks += l.basePacks; totalBaseKg += parseFloat(l.baseKg); });
  const baseLeftoverKg = (totalBasePacks * baseProduct.packKg) - totalBaseKg;
  const baseLeftoverSqm = baseLeftoverKg * baseProduct.sqmPerKg;
  html += `<tr>
    <td>${baseProduct.name}</td>
    <td>Base coat — all surfaces (1 coat)</td>
    <td class="right">${totalBasePacks}</td>
    <td class="right">${baseLeftoverSqm.toFixed(1)} sqm</td>
    <td class="right">${fmt(baseProduct.packCost)}</td>
    <td class="right">${fmt(totalBasePacks * baseProduct.packCost)}</td>
  </tr>`;

  // TOP COAT
  let totalTopPacks = 0, totalTopKg = 0;
  d.surfaceLines.forEach(l => { totalTopPacks += l.topPacks; totalTopKg += parseFloat(l.topKg); });
  const topLeftoverKg = (totalTopPacks * topProduct.packKg) - totalTopKg;
  const topLeftoverSqm = topLeftoverKg * topProduct.sqmPerKg;
  html += `<tr>
    <td>${topProduct.name}</td>
    <td>Top coat — all surfaces (2 coats std, 1 coat levelled)</td>
    <td class="right">${totalTopPacks}</td>
    <td class="right">${topLeftoverSqm.toFixed(1)} sqm</td>
    <td class="right">${fmt(topProduct.packCost)}</td>
    <td class="right">${fmt(totalTopPacks * topProduct.packCost)}</td>
  </tr>`;

  // MT-POL (Microtopping only)
  if (!isSolidro && d.mtPolPacks) {
    html += `<tr>
      <td>${PRODUCTS.mt_pol.name}</td>
      <td>Mixed into base + finish coats (${d.totalSqm.toFixed(0)} sqm total)</td>
      <td class="right">${d.mtPolPacks.packs}</td>
      <td class="right">${d.mtPolPacks.leftover.toFixed(1)} sqm</td>
      <td class="right">${fmt(PRODUCTS.mt_pol.packCost)}</td>
      <td class="right">${fmt(d.mtPolCost)}</td>
    </tr>`;
  }

  // POOLED PRODUCTS
  const pooledRows = [
    { label:'IW Blocker Grip Primer 5kg', applies:`All surfaces (${d.totalSqm.toFixed(0)} sqm total)`, packs:d.iwB.packs, leftover:d.iwB.leftover, unit:PRODUCTS.iw_blocker.packCost },
    { label:'IDEALPU-WB-PRIMER 5kg', applies:`All surfaces (${d.totalSqm.toFixed(0)} sqm total)`, packs:d.idealpu.packs, leftover:d.idealpu.leftover, unit:PRODUCTS.idealpu.packCost },
    { label:'PU100 Sealer 20L', applies:`All surfaces (${d.totalSqm.toFixed(0)} sqm total)`, packs:d.pu100.packs, leftover:d.pu100.leftover, unit:PRODUCTS.pu100.packCost },
    { label:'Micro Seal 5.5L', applies:d.microSealSqm>0?`Floors/Bench Tops/Wet Areas (${d.microSealSqm.toFixed(0)} sqm)`:'Not required — no eligible surfaces', packs:d.mseal.packs, leftover:d.mseal.leftover, unit:PRODUCTS.micro_seal.packCost },
    { label:'Fibreglass Mesh 50sqm roll', applies:d.meshSqm>0?`Floors/Wet Areas/Bench Tops (${d.meshSqm.toFixed(0)} sqm)`:'Not required — no eligible surfaces', packs:d.mesh.packs, leftover:d.mesh.leftover, unit:PRODUCTS.mesh.packCost },
    { label:'Velosit WP120 20kg', applies:d.wp120Sqm>0?`Wet Areas only (${d.wp120Sqm.toFixed(0)} sqm)`:'Not required — no wet areas', packs:d.wp120.packs, leftover:d.wp120.leftover, unit:PRODUCTS.wp120.packCost },
  ];
  pooledRows.forEach(r => {
    html += `<tr>
      <td>${r.label} <span class="pooled-badge">POOLED</span></td>
      <td>${r.applies}</td>
      <td class="right">${r.packs}</td>
      <td class="right">${r.leftover.toFixed(1)} sqm</td>
      <td class="right">${fmt(r.unit)}</td>
      <td class="right">${fmt(r.packs * r.unit)}</td>
    </tr>`;
  });

  // CONSUMABLES
  html += `<tr>
    <td>Consumables (flat per job)</td><td>All jobs</td>
    <td class="right">—</td><td class="right">—</td>
    <td class="right">—</td><td class="right">${fmt(CONSUMABLES)}</td>
  </tr>`;

  // PENDING ITEMS (Microtopping section)
  if (!isSolidro) {
    html += `<tr class="pending-row">
      <td>X-Bond <span class="pending-label">PENDING PRICING</span></td>
      <td>X-Bond system — pricing not yet confirmed</td>
      <td class="right">—</td><td class="right">—</td>
      <td class="right">$0.00</td><td class="right">$0.00</td>
    </tr>
    <tr class="pending-row">
      <td>Dulux Microcement <span class="pending-label">PENDING PRICING</span></td>
      <td>Dulux system — pricing not yet confirmed</td>
      <td class="right">—</td><td class="right">—</td>
      <td class="right">$0.00</td><td class="right">$0.00</td>
    </tr>`;
  }

  html += `</tbody><tfoot>
    <tr class="total-row">
      <td colspan="5">TOTAL MATERIAL COST</td>
      <td class="right">${fmt(d.totalMatCost)}</td>
    </tr>
  </tfoot></table>`;

  document.getElementById(wrapperId).innerHTML = html;
}

// ── RENDER SURFACE BREAKDOWN ───────────────────────────────
function renderSurfaceBreakdown(lines) {
  if (!lines.length) { document.getElementById('surface-breakdown-wrap').innerHTML = ''; return; }
  let html = `<table class="breakdown-table">
    <thead><tr>
      <th>SURFACE</th><th>TYPE</th><th>SQM</th>
      <th>BASE PACKS</th><th>TOP PACKS</th><th>TOP COATS</th>
      <th>MESH</th><th>MICRO SEAL</th><th>WP120</th><th>LINE MAT COST</th>
    </tr></thead><tbody>`;
  lines.forEach(l => {
    const needsMesh = NEEDS_MESH.includes(l.type) && !l.levelled;
    const needsSeal = NEEDS_MICRO_SEAL.includes(l.type);
    const needsWP = NEEDS_WP120.includes(l.type);
    html += `<tr>
      <td>${l.name}</td>
      <td>${l.type}${l.levelled?' (Levelled)':''}</td>
      <td>${l.sqm}</td>
      <td>${l.basePacks}</td>
      <td>${l.topPacks}</td>
      <td>${l.topCoats}</td>
      <td style="color:${needsMesh?'var(--green)':'var(--grey-light)'};font-weight:700;">${needsMesh?'YES':'NO'}</td>
      <td style="color:${needsSeal?'var(--green)':'var(--grey-light)'};font-weight:700;">${needsSeal?'YES':'NO'}</td>
      <td style="color:${needsWP?'var(--green)':'var(--grey-light)'};font-weight:700;">${needsWP?'YES':'NO'}</td>
      <td>${fmt(l.bCost + l.tCost)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('surface-breakdown-wrap').innerHTML = html;
}

// ── RENDER MARGIN BANDS ────────────────────────────────────
function renderMarginBands(totalCost, totalSqm) {
  const bands = [30,35,40,45,50,55,60];
  let html = `<table class="margin-table">
    <thead><tr>
      <th>MARGIN</th><th>SELL PRICE (JOB)</th><th>$/SQM SELL</th><th>PROFIT</th><th>STATUS</th>
    </tr></thead><tbody>`;
  bands.forEach(b => {
    const sell = totalCost / (1 - b/100);
    const profit = sell - totalCost;
    const sqmRate = sell / totalSqm;
    const cls = b >= 40 ? 'band-green' : b >= 35 ? 'band-amber' : 'band-red';
    const dot = b >= 40 ? 'green' : b >= 35 ? 'amber' : 'red';
    const label = b >= 40 ? 'TARGET' : b >= 35 ? 'MINIMUM' : 'BELOW MIN';
    html += `<tr class="${cls}">
      <td><span class="band-dot ${dot}"></span><strong>${b}%</strong></td>
      <td>${fmt(sell)}</td>
      <td>${fmt(sqmRate)}/sqm</td>
      <td>${fmt(profit)}</td>
      <td><strong>${label}</strong></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('margin-bands-wrap').innerHTML = html;
}

// ── RENDER MARKET SANITY CHECK ─────────────────────────────
function renderMarketCheck(totalCost, lines) {
  if (!lines.length) { document.getElementById('market-check-wrap').innerHTML = ''; return; }

  const totalSqm = lines.reduce((s,l) => s+l.sqm, 0);
  const sell40 = totalCost / 0.60;
  const avgSqmRate = sell40 / totalSqm;

  const typeMap = {};
  lines.forEach(l => {
    if (!typeMap[l.type]) typeMap[l.type] = { sqm:0 };
    typeMap[l.type].sqm += l.sqm;
  });

  let html = `<div class="market-grid">`;
  Object.entries(typeMap).forEach(([type, data]) => {
    const range = MARKET_RANGES[type];
    if (!range) return;
    const rate = avgSqmRate;
    let cls, status;
    if (rate >= range.min && rate <= range.max) {
      cls = 'mc-green'; status = 'WITHIN MARKET';
    } else if (rate < range.min) {
      cls = 'mc-amber'; status = 'BELOW MARKET';
    } else {
      cls = 'mc-red'; status = 'ABOVE MARKET';
    }
    html += `<div class="market-cell ${cls}">
      <div class="mc-label">${type} (${data.sqm} sqm)</div>
      <div class="mc-rate">${fmt(rate)}/sqm</div>
      <div class="mc-status">${status}</div>
      <div style="font-size:10px;color:var(--grey-mid);margin-top:4px;">Market: $${range.min}–$${range.max}/sqm</div>
    </div>`;
  });

  html += `<div class="market-cell" style="background:var(--card-bg);border-color:var(--border);">
    <div class="mc-label">JOB AVERAGE</div>
    <div class="mc-rate" style="color:var(--gold);">${fmt(avgSqmRate)}/sqm</div>
    <div class="mc-status" style="color:var(--grey-mid);">@ 40% MARGIN</div>
    <div style="font-size:10px;color:var(--grey-mid);margin-top:4px;">All surfaces blended</div>
  </div>`;
  html += `</div>`;

  // Market reference table
  html += `<div class="callout callout-info" style="margin-top:14px;">
    <strong>GOLD COAST MARKET REFERENCE (2025–2026)</strong>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
      <tr style="background:rgba(255,255,255,.05);">
        <th style="text-align:left;padding:6px 10px;color:var(--gold);">Surface Type</th>
        <th style="text-align:center;padding:6px 10px;color:var(--gold);">Market Min</th>
        <th style="text-align:center;padding:6px 10px;color:var(--gold);">Market Max</th>
      </tr>
      ${Object.entries(MARKET_RANGES).map(([t,r]) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,.1);">
          <td style="padding:6px 10px;font-weight:600;">${t}</td>
          <td style="text-align:center;padding:6px 10px;">$${r.min}/sqm</td>
          <td style="text-align:center;padding:6px 10px;">$${r.max}/sqm</td>
        </tr>`).join('')}
    </table>
  </div>`;

  document.getElementById('market-check-wrap').innerHTML = html;
}

// ── RENDER LABOUR BREAKDOWN ────────────────────────────────
function renderLabourBreakdown(prepDays, floorDays, wallDays, sealerDays, totalDays, hrs, cost) {
  const crewLabel = document.querySelector('#crew-grid .crew-option.active .crew-label')?.textContent || '';
  const prepLabel = document.querySelector('#prep-grid .crew-option.active .crew-label')?.textContent || '';
  document.getElementById('labour-wrap').innerHTML = `
    <div class="results-grid wide">
      <div class="stat-card"><div class="stat-label">CREW</div><div class="stat-value" style="font-size:16px;">${crewLabel}</div><div class="stat-sub">${fmt(crewConfig.rate)}/hr combined</div></div>
      <div class="stat-card"><div class="stat-label">PREP LEVEL</div><div class="stat-value" style="font-size:16px;">${prepLabel}</div><div class="stat-sub">x${prepMultiplier.toFixed(1)} multiplier</div></div>
      <div class="stat-card" style="border-color:var(--gold);"><div class="stat-label">TOTAL LABOUR COST</div><div class="stat-value gold">${fmt(cost)}</div><div class="stat-sub">${totalDays} days x 8hrs x ${fmt(crewConfig.rate)}/hr</div></div>
    </div>
    <table class="mat-table" style="margin-top:14px;">
      <thead><tr><th>PHASE</th><th class="right">DAYS</th><th class="right">HOURS</th><th class="right">COST</th></tr></thead>
      <tbody>
        <tr><td>Prep (masking, grinding, substrate prep)</td><td class="right">${prepDays}</td><td class="right">${prepDays*8}</td><td class="right">${fmt(prepDays*8*crewConfig.rate)}</td></tr>
        <tr><td>Floor Application</td><td class="right">${floorDays}</td><td class="right">${floorDays*8}</td><td class="right">${fmt(floorDays*8*crewConfig.rate)}</td></tr>
        <tr><td>Wall / Feature / Bench Top Application</td><td class="right">${wallDays}</td><td class="right">${wallDays*8}</td><td class="right">${fmt(wallDays*8*crewConfig.rate)}</td></tr>
        <tr><td>Sealer Days (IW Primer + PU100 + Micro Seal)</td><td class="right">${sealerDays}</td><td class="right">${sealerDays*8}</td><td class="right">${fmt(sealerDays*8*crewConfig.rate)}</td></tr>
      </tbody>
      <tfoot><tr class="total-row"><td colspan="3">TOTAL LABOUR (incl. prep multiplier x${prepMultiplier.toFixed(1)})</td><td class="right">${fmt(cost)}</td></tr></tfoot>
    </table>`;
}

function clearResults() {
  ['r-mat-cost','r-lab-cost','r-job-cost','r-sqm-cost','r-mat-sub','r-lab-sub','r-total-sqm',
   'cmp-sol-mat','cmp-sol-lab','cmp-sol-total','cmp-sol-40','cmp-sol-45',
   'cmp-mt-mat','cmp-mt-lab','cmp-mt-total','cmp-mt-40','cmp-mt-45'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—';
  });
  ['mat-table-wrap','mt-table-wrap','surface-breakdown-wrap','margin-bands-wrap',
   'market-check-wrap','labour-wrap','rec-sell-wrap'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
}

// ── INIT ───────────────────────────────────────────────────
addSurfaceLine('Floor', 'solidro');
