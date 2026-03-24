// ═══════════════════════════════════════════════════════════
// MCK MARGIN CALCULATOR v3.0 — FULL BACKEND REBUILD
// 3 Product Systems: Micro Cement, Solidro, Rusico
// Tiered pricing, min 4-day process, new crew configs
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
        : [['tc-sig-canvas','tc-canvas-wrap'],['tc-mck-sig-canvas','tc-mck-canvas-wrap']];
      pairs.forEach(([cId, wId]) => {
        const c = document.getElementById(cId);
        const w = document.getElementById(wId);
        if (c && w && c.width !== w.offsetWidth) {
          c.width = w.offsetWidth;
          c.height = 160;
        }
      });
      // Re-draw MCK pre-loaded signature after canvas is sized
      if (tabId === 'quote' && typeof preDrawMCKSignature === 'function') {
        preDrawMCKSignature('q-mck-sig-canvas');
      }
    }, 100);
  }
}

// ── HELPER: READ SETTING ──────────────────────────────────
function s(key) {
  return (typeof getSetting === 'function') ? getSetting(key) : null;
}

// ── PRODUCT DATA ──────────────────────────────────────────
// All costs read from Settings (localStorage) with hardcoded fallbacks
function getProducts() {
  return {
    // SHARED / POOLED
    primer_rr:    { name:'PRIMER-RR 22.5kg',             packCost: s('primer_rr_5kg') || 161.78,  packCoverage:100, unit:'22.5kg pack' },
    wb_blocker:   { name:'WB Mesh Blocker 10kg',         packCost: s('wb_blocker_5kg') || 161.78, packCoverage:200, unit:'10kg pack' },
    mesh:         { name:'Fibreglass Mesh 50sqm roll',   packCost: s('mesh_50sqm') || 120.00,     packCoverage:50,  unit:'50sqm roll' },
    idealpu:      { name:'IDEALPU-PRIMER Easy 5kg',       packCost: s('idealpu_5kg') || 411.81,    packCoverage:100, unit:'5kg pack' },
    pu100:        { name:'PU100 Sealer 20L',              packCost: s('pu100_20l') || 624.00,      packCoverage:100, unit:'20L drum' },
    micro_seal:   { name:'Micro Seal 5.5L',               packCost: s('micro_seal_5_5l') || 198.00, packCoverage:27.5, unit:'5.5L can' },
    wp120:        { name:'Velosit WP120 20kg',            packCost: s('wp120_20kg') || 151.63,     packCoverage:20,  unit:'20kg pack' },
    seal_r:       { name:'SEAL-R NEW 20L',                packCost: s('seal_r_20l') || 529.28,     packCoverage:100, unit:'20L can' },

    // SOLIDRO (spread rates from settings)
    solidro_zero: { name:'Solidro Zero 20kg',  packCost: s('solidro_zero_20kg') || 745.80, packKg:20, sqmPerKg: s('solidro_zero_spread') || 1.3, get kgPerSqm() { return 1/this.sqmPerKg; }, get sqmPerPack() { return 20 * this.sqmPerKg; } },
    solidro_top:  { name:'Solidro Top 10kg',   packCost: s('solidro_top_10kg') || 627.00,  packKg:10, sqmPerKg: s('solidro_top_spread') || 3.0, get kgPerSqm() { return 1/this.sqmPerKg; }, get sqmPerPack() { return 10 * this.sqmPerKg; } },

    // MICRO CEMENT (spread rates from settings)
    mt_zero:  { name:'MT-Zero Base Coat 25kg',     packCost: s('mt_zero_25kg') || 259.17,  packKg:25, sqmPerKg: s('mt_zero_spread') || 1.3, get kgPerSqm() { return 1/this.sqmPerKg; }, get sqmPerPack() { return 25 * this.sqmPerKg; } },
    mt_w:     { name:'MT-W Finish Coat 17L',       packCost: s('mt_w_17_5kg') || 211.80,   packKg:17, sqmPerKg: s('mt_w_spread') || 3.0, get kgPerSqm() { return 1/this.sqmPerKg; }, get sqmPerPack() { return 17 * this.sqmPerKg; } },
    mt_pol:   { name:'MT-POL Liquid Polymer 17L',  packCost: s('mt_pol_17l') || 586.67,    packCoverage:46.75, unit:'17L pack' },

    // RUSICO (Hard-Neu Colour Hardener + Rasico Touch Finishing Powder)
    rusico_base:  { name:'Hard-Neu Colour Hardener 25kg',       packCost: s('rusico_base_20kg') || 580.00,  packKg:25, sqmPerKg: s('rusico_base_spread') || 1.1, get kgPerSqm() { return 1/this.sqmPerKg; }, get sqmPerPack() { return 25 * this.sqmPerKg; } },
    rusico_top:   { name:'Rasico Touch Finishing Powder 25kg',  packCost: s('rusico_top_10kg') || 520.00,   packKg:25, sqmPerKg: s('rusico_top_spread') || 1.3, get kgPerSqm() { return 1/this.sqmPerKg; }, get sqmPerPack() { return 25 * this.sqmPerKg; } },

    // IDEAL BINDER (Rusico system only — 4 bucket mixes per 25L can)
    ideal_binder: { name:'Ideal Binder 25L', packCost: s('ideal_binder_25l') || 761.68, packCoverage: 4, unit:'25L can (4 mixes)' },

    // COLOUR PACK (all systems — 1 pack per 50 sqm)
    colour_pack:  { name:'Colour Pack', packCost: s('colour_pack_cost') || 85.00, packCoverage:50, unit:'pack (per 50sqm)' },
  };
}

const CONSUMABLES = 100.00;
function getMinJobDays() { return (typeof getSetting === 'function' && getSetting('min_days')) ? parseInt(getSetting('min_days')) || 4 : 4; }

// ── CREW CONFIGS ──────────────────────────────────────────
function getCrewConfigs() {
  return {
    solo:     { rate: s('solo_rate') || 65,  label:'Patty Only ($65/hr)', sqmPerDay: s('sqm_per_day_solo') || 15, workers:1 },
    dual:     { rate: s('dual_rate') || 120, label:'Patty + Hayden/Micky ($120/hr)', sqmPerDay: s('sqm_per_day_dual') || 30, workers:2 },
    full:     { rate: s('full_rate') || 155, label:'3-Man Crew + Labour ($155/hr)', sqmPerDay: s('sqm_per_day_full') || 40, workers:3 },
  };
}

let crewConfig = getCrewConfigs().dual;
let prepMultiplier = 1.0;

// ── MARKET RANGES ─────────────────────────────────────────
const MARKET_RANGES = {
  'Floor':        { min:200, max:400 },
  'Feature Wall': { min:280, max:500 },
  'Wet Area':     { min:350, max:600 },
  'Bench Top':    { min:300, max:500 },
  'External':     { min:200, max:400 },
};

// ── MCK TIERED SELL PRICING ───────────────────────────────
function getMCKPricing() {
  return {
    'Floor': {
      minCharge: s('floor_min_charge') || 3000,
      tiers: [
        { maxSqm: 25,  rate: s('floor_0_25_rate') || 365 },
        { maxSqm: 70,  rate: s('floor_25_70_rate') || 305 },
        { maxSqm: 9999, rate: s('floor_70_plus_rate') || 250 },
      ]
    },
    'Feature Wall': {
      minCharge: s('wall_min_charge') || 3000,
      tiers: [
        { maxSqm: 30,  rate: s('wall_15_30_rate') || 300 },
        { maxSqm: 60,  rate: s('wall_30_60_rate') || 260 },
        { maxSqm: 9999, rate: s('wall_60_plus_rate') || 220 },
      ]
    },
    'Wet Area': {
      minCharge: s('wet_min_charge') || 7000,
      tiers: [
        { maxSqm: 30,  rate: s('wet_15_30_rate') || 460 },
        { maxSqm: 60,  rate: s('wet_30_60_rate') || 360 },
        { maxSqm: 100, rate: s('wet_60_100_rate') || 320 },
        { maxSqm: 9999, rate: s('wet_100_plus_rate') || 280 },
      ]
    },
    'Bench Top': {
      minCharge: s('wet_min_charge') || 7000,
      tiers: [
        { maxSqm: 30,  rate: s('wet_15_30_rate') || 460 },
        { maxSqm: 60,  rate: s('wet_30_60_rate') || 360 },
        { maxSqm: 100, rate: s('wet_60_100_rate') || 320 },
        { maxSqm: 9999, rate: s('wet_100_plus_rate') || 280 },
      ]
    },
    'External': {
      minCharge: s('floor_min_charge') || 3000,
      tiers: [
        { maxSqm: 25,  rate: s('floor_0_25_rate') || 365 },
        { maxSqm: 70,  rate: s('floor_25_70_rate') || 305 },
        { maxSqm: 9999, rate: s('floor_70_plus_rate') || 250 },
      ]
    },
  };
}

function getTieredRate(pricing, sqm) {
  for (const tier of pricing.tiers) {
    if (sqm <= tier.maxSqm) return tier.rate;
  }
  return pricing.tiers[pricing.tiers.length - 1].rate;
}

// ── SYSTEM-SPECIFIC MATERIAL RULES ────────────────────────
// Returns which products apply for a given system + surface type + substrate
function getSystemRules(system, surfaceType, isPlasterboard, isLevelledFloor) {
  const isFloor = surfaceType === 'Floor';
  const isWall = surfaceType === 'Feature Wall';
  const isWet = surfaceType === 'Wet Area' || surfaceType === 'Bench Top';
  const isExternal = surfaceType === 'External';

  const rules = {
    needsPrimerRR: false,
    needsWBBlocker: false,
    needsMesh: false,
    needsPU100: false,      // Solidro + Micro Cement ONLY
    needsSealR: false,      // Rusico ONLY
    needsIdealPU: false,    // IDEALPU-PRIMER Easy — Rusico ONLY (before SEAL-R)
    needsMicroSeal: false,
    needsWP120: false,
    needsPolymer: false,    // MT-POL for Micro Cement only
  };

  if (system === 'microcement') {
    // PRIMER-RR: all surfaces EXCEPT plasterboard feature walls AND self-level ready floors
    rules.needsPrimerRR = !(isWall && isPlasterboard) && !(isFloor && isLevelledFloor);
    // WB Mesh Blocker: floors, wet areas, benchtops (NOT feature walls on plasterboard — but blocker ONLY on plasterboard walls)
    rules.needsWBBlocker = (isFloor || isWet) || (isWall && isPlasterboard);
    // Fibreglass mesh: floors, wet areas, benchtops (NOT feature walls)
    rules.needsMesh = (isFloor || isWet) && !isLevelledFloor;
    // Micro Seal: floors, wet areas, benchtops (NOT feature walls)
    rules.needsMicroSeal = isFloor || isWet;
    rules.needsWP120 = isWet;
    rules.needsPolymer = true;
    rules.needsPU100 = true;  // PU100 on Micro Cement
  } else if (system === 'solidro') {
    // Same primer/mesh/sealer rules as Micro Cement
    rules.needsPrimerRR = !(isWall && isPlasterboard) && !(isFloor && isLevelledFloor);
    rules.needsWBBlocker = (isFloor || isWet) || (isWall && isPlasterboard);
    rules.needsMesh = (isFloor || isWet) && !isLevelledFloor;
    rules.needsMicroSeal = isFloor || isWet;
    rules.needsWP120 = isWet;
    rules.needsPU100 = true;  // PU100 on Solidro
  } else if (system === 'rusico') {
    // RUSICO self-level floor (good substrate):
    // WB Mesh Blocker 10kg — YES (no PRIMER-RR on good substrate self-level)
    // Ideal Binder — YES (mixed into base + finish coats)
    // Hard-Neu Colour Hardener (base) + Rasico Touch Finishing Powder (top)
    // IDEALPU-PRIMER Easy — YES (applied before SEAL-R)
    // SEAL-R NEW 20L — YES (Rusico ONLY, NOT PU100)
    // NO PRIMER-RR on good substrate levelled floor, YES on all other Rusico surfaces
    rules.needsPrimerRR = !(isFloor && isLevelledFloor);
    rules.needsWBBlocker = true;   // WB Mesh Blocker on all Rusico
    rules.needsMesh = !isLevelledFloor; // No mesh on good substrate self-level floor
    rules.needsSealR = true;       // SEAL-R NEW on all Rusico (NOT PU100)
    rules.needsIdealPU = true;     // IDEALPU-PRIMER Easy before SEAL-R on Rusico
    rules.needsMicroSeal = false;  // No Micro Seal on Rusico
    rules.needsWP120 = false;
    rules.needsPU100 = false;      // NEVER PU100 on Rusico
  }

  return rules;
}

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
          <option value="Wet Area" ${type==='Wet Area'?'selected':''}>Wet Area / Bathroom</option>
          <option value="Bench Top" ${type==='Bench Top'?'selected':''}>Bench Top</option>
          <option value="External" ${type==='External'?'selected':''}>External / Outdoor</option>
        </select>
      </div>
      <div class="field-group">
        <label>SYSTEM</label>
        <select id="sys-${id}" onchange="onSystemChange(${id});recalc()">
          <option value="solidro" ${sys==='solidro'?'selected':''}>Solidro</option>
          <option value="microcement" ${sys==='microcement'?'selected':''}>Micro Cement</option>
          <option value="rusico" ${sys==='rusico'?'selected':''}>Rusico (External)</option>
        </select>
      </div>
      <div class="field-group">
        <label>SQM</label>
        <input type="number" id="sqm-${id}" placeholder="0" min="0" step="0.1" oninput="recalc()">
      </div>
      <button class="remove-btn" onclick="removeSurfaceLine(${id})" title="Remove">&times;</button>
    </div>
    <div class="surface-options" id="options-${id}">
      <div class="toggle-wrap" id="levelled-wrap-${id}" style="display:${type==='Floor'?'flex':'none'}">
        <input type="checkbox" id="levelled-${id}" onchange="recalc()">
        <label for="levelled-${id}">Levelled floor (good substrate — 1 top coat, no mesh, no primer)</label>
      </div>
      <div class="toggle-wrap" id="plaster-wrap-${id}" style="display:${type==='Feature Wall'?'flex':'none'}">
        <input type="checkbox" id="plaster-${id}" onchange="recalc()">
        <label for="plaster-${id}">Plasterboard substrate (WB Blocker only — no primer, no mesh)</label>
      </div>
    </div>
  </div>`;

  document.getElementById('surface-lines').insertAdjacentHTML('beforeend', html);
  updateAddBtn();
  recalc();
}

function onTypeChange(id) {
  const type = document.getElementById('type-'+id)?.value;
  const levWrap = document.getElementById('levelled-wrap-'+id);
  const plasWrap = document.getElementById('plaster-wrap-'+id);
  const sysSelect = document.getElementById('sys-'+id);

  // Show/hide substrate options
  if (levWrap) levWrap.style.display = type === 'Floor' ? 'flex' : 'none';
  if (plasWrap) plasWrap.style.display = type === 'Feature Wall' ? 'flex' : 'none';

  // Reset checkboxes when type changes
  const levCb = document.getElementById('levelled-'+id);
  const plasCb = document.getElementById('plaster-'+id);
  if (levCb && type !== 'Floor') levCb.checked = false;
  if (plasCb && type !== 'Feature Wall') plasCb.checked = false;

  // Auto-select Rusico for External surfaces
  if (type === 'External' && sysSelect) {
    sysSelect.value = 'rusico';
  }
  // If switching away from External and system is Rusico, switch to Solidro
  if (type !== 'External' && sysSelect && sysSelect.value === 'rusico') {
    sysSelect.value = 'solidro';
  }
}

function onSystemChange(id) {
  const sys = document.getElementById('sys-'+id)?.value;
  const typeSelect = document.getElementById('type-'+id);
  // If Rusico selected, auto-set type to External
  if (sys === 'rusico' && typeSelect && typeSelect.value !== 'External') {
    typeSelect.value = 'External';
    onTypeChange(id);
  }
}

function removeSurfaceLine(id) {
  const el = document.getElementById('surface-line-'+id);
  if (el) el.remove();
  recalc();
  updateAddBtn();
}

function updateAddBtn() {
  const count = document.querySelectorAll('.surface-line').length;
  const btn = document.getElementById('add-surface-btn');
  if (btn) btn.style.display = count >= 10 ? 'none' : 'block';
}

// ── CREW & PREP ────────────────────────────────────────────
function selectCrew(el, key) {
  document.querySelectorAll('#crew-grid .crew-option').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  const configs = getCrewConfigs();
  crewConfig = configs[key];
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
  const MCK_PRICING = getMCKPricing();

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
    const rate = getTieredRate(pricing, sqm);
    let linePrice = sqm * rate;

    // Apply minimum charge only if NOT combined
    let minApplied = false;
    if (!isCombined && linePrice < pricing.minCharge) {
      linePrice = pricing.minCharge;
      minApplied = true;
    }

    totalRecommended += linePrice;

    // Determine tier label
    let tierLabel = '';
    for (const tier of pricing.tiers) {
      if (sqm <= tier.maxSqm) {
        tierLabel = sqm.toFixed(0) + ' sqm @ ' + fmt(tier.rate) + '/sqm';
        break;
      }
    }

    breakdown.push({
      type, sqm, rate, linePrice,
      minCharge: pricing.minCharge,
      minApplied, tierLabel
    });
  });

  return {
    totalRecommended, breakdown, isCombined, totalSqm,
    combinedNote: isCombined ? 'Combined areas — individual minimum charges eliminated. Only total job value matters.' : null
  };
}

// ── MAIN RECALC ────────────────────────────────────────────
function recalc() {
  const PRODUCTS = getProducts();
  const lines = [];

  document.querySelectorAll('.surface-line').forEach(el => {
    const id = el.id.replace('surface-line-','');
    const type = document.getElementById('type-'+id)?.value;
    const sys  = document.getElementById('sys-'+id)?.value;
    const sqm  = parseFloat(document.getElementById('sqm-'+id)?.value) || 0;
    const name = document.getElementById('name-'+id)?.value || ('Surface ' + id);
    const levelled = document.getElementById('levelled-'+id)?.checked && type === 'Floor';
    const plasterboard = document.getElementById('plaster-'+id)?.checked && type === 'Feature Wall';
    if (type && sqm > 0) lines.push({ id, name, type, sys, sqm, levelled, plasterboard });
  });

  const hasLines = lines.length > 0;
  const emptyEl = document.getElementById('empty-state');
  const resultsEl = document.getElementById('results-content');
  if (emptyEl) emptyEl.style.display = hasLines ? 'none' : 'block';
  if (resultsEl) resultsEl.style.display = hasLines ? 'block' : 'none';
  if (!hasLines) { clearResults(); return; }

  // ── CALCULATE MATERIALS PER SURFACE ──
  const totalSqm = lines.reduce((s, l) => s + l.sqm, 0);

  // Aggregate pooled material sqm needs
  let primerRRSqm = 0, wbBlockerSqm = 0, meshSqm = 0, microSealSqm = 0, wp120Sqm = 0, polymerSqm = 0;
  let pu100Sqm = 0, sealRSqm = 0, idealPUSqm = 0;

  const surfaceCalcs = lines.map(l => {
    const rules = getSystemRules(l.sys, l.type, l.plasterboard, l.levelled);

    if (rules.needsPrimerRR) primerRRSqm += l.sqm;
    if (rules.needsWBBlocker) wbBlockerSqm += l.sqm;
    if (rules.needsMesh) meshSqm += l.sqm;
    if (rules.needsMicroSeal) microSealSqm += l.sqm;
    if (rules.needsWP120) wp120Sqm += l.sqm;
    if (rules.needsPolymer) polymerSqm += l.sqm;
    if (rules.needsPU100) pu100Sqm += l.sqm;
    if (rules.needsSealR) sealRSqm += l.sqm;
    if (rules.needsIdealPU) idealPUSqm += l.sqm;

    // Base coat: always 1 coat
    let baseProduct, topProduct;
    if (l.sys === 'solidro') {
      baseProduct = PRODUCTS.solidro_zero;
      topProduct = PRODUCTS.solidro_top;
    } else if (l.sys === 'microcement') {
      baseProduct = PRODUCTS.mt_zero;
      topProduct = PRODUCTS.mt_w;
    } else { // rusico
      baseProduct = PRODUCTS.rusico_base;
      topProduct = PRODUCTS.rusico_top;
    }

    const baseKg = l.sqm / baseProduct.sqmPerKg;
    const topCoats = l.levelled ? 1 : 2;
    const topKg = (l.sqm / topProduct.sqmPerKg) * topCoats;
    const basePacks = Math.ceil(baseKg / baseProduct.packKg);
    const topPacks = Math.ceil(topKg / topProduct.packKg);
    const bCost = basePacks * baseProduct.packCost;
    const tCost = topPacks * topProduct.packCost;

    return {
      ...l, rules, baseProduct, topProduct,
      baseKg: baseKg.toFixed(2), topKg: topKg.toFixed(2),
      basePacks, topPacks, bCost, tCost, topCoats,
      lineCost: bCost + tCost
    };
  });

  // ── POOLED MATERIALS ──
  const primerRR = packsNeeded(primerRRSqm, 100);
  // WB Mesh Blocker 10kg covers 200 sqm per pack (20 sqm/kg × 10kg)
  const wbBlocker = packsNeeded(wbBlockerSqm, 200);
  // PU100: Solidro + Micro Cement ONLY (pu100Sqm tracks only those systems)
  const pu100 = packsNeeded(pu100Sqm, 100);
  // SEAL-R NEW: Rusico ONLY
  const sealR = packsNeeded(sealRSqm, 100);
  // IDEALPU-PRIMER Easy 5kg: Rusico ONLY (100 sqm per 5kg pack)
  const idealPU = packsNeeded(idealPUSqm, 100);
  const mseal = packsNeeded(microSealSqm, 27.5);
  const mesh = packsNeeded(meshSqm, 50);
  const wp120 = packsNeeded(wp120Sqm, 20);
  const mtPol = packsNeeded(polymerSqm, 46.75);

  // IDEAL BINDER — Rusico system only
  // 1 can per 4 bucket mixes (base coat + finish coat each use 1 mix per surface)
  // For each Rusico surface: 1 mix for base + 1 mix for top = 2 mixes per surface
  // packCoverage = 4 mixes per 25L can
  const rusicoSqm = lines.filter(l => l.sys === 'rusico').reduce((s,l) => s+l.sqm, 0);
  const rusicoSurfaces = lines.filter(l => l.sys === 'rusico').length;
  const totalRusicoMixes = rusicoSurfaces * 2; // 1 base mix + 1 top mix per surface
  const idealBinderCans = rusicoSurfaces > 0 ? Math.ceil(totalRusicoMixes / 4) : 0;
  const idealBinder = { packs: idealBinderCans, leftover: 0 };

  // COLOUR PACK — all systems, 1 pack per 50 sqm
  const colourPack = packsNeeded(totalSqm, 50);

  const pooledCost =
    (primerRR.packs * PRODUCTS.primer_rr.packCost) +
    (wbBlocker.packs * PRODUCTS.wb_blocker.packCost) +
    (pu100.packs * PRODUCTS.pu100.packCost) +
    (sealR.packs * PRODUCTS.seal_r.packCost) +
    (idealPU.packs * PRODUCTS.idealpu.packCost) +
    (mseal.packs * PRODUCTS.micro_seal.packCost) +
    (mesh.packs * PRODUCTS.mesh.packCost) +
    (wp120.packs * PRODUCTS.wp120.packCost) +
    (mtPol.packs * PRODUCTS.mt_pol.packCost) +
    (idealBinder.packs * PRODUCTS.ideal_binder.packCost) +
    (colourPack.packs * PRODUCTS.colour_pack.packCost) +
    CONSUMABLES;

  // ── SURFACE COAT COSTS ──
  const totalCoatCost = surfaceCalcs.reduce((s, l) => s + l.lineCost, 0);
  const totalMatCost = totalCoatCost + pooledCost;

  // ── LABOUR ──
  const configs = getCrewConfigs();
  crewConfig = configs[document.querySelector('#crew-grid .crew-option.active')?.dataset?.crew || 'dual'] || crewConfig;

  const floorSqm = lines.filter(l => l.type === 'Floor' || l.type === 'External').reduce((s,l) => s+l.sqm, 0);
  const nonFloorSqm = lines.filter(l => l.type !== 'Floor' && l.type !== 'External').reduce((s,l) => s+l.sqm, 0);
  const floorDays = floorSqm > 0 ? Math.ceil(floorSqm / crewConfig.sqmPerDay) : 0;
  const wallDays = nonFloorSqm > 0 ? Math.ceil(nonFloorSqm / (crewConfig.sqmPerDay * 1.25)) : 0;
  const prepDays = totalSqm > 0 ? Math.ceil(totalSqm / 80) : 0;
  const sealerDays = totalSqm > 0 ? Math.ceil(totalSqm / 100) : 0;
  const rawDays = prepDays + floorDays + wallDays + sealerDays;
  const adjustedDays = Math.ceil(rawDays * prepMultiplier);
  const MIN_JOB_DAYS = getMinJobDays();
  const totalDays = Math.max(adjustedDays, MIN_JOB_DAYS); // MINIMUM PROCESS DAYS
  const labourHrs = totalDays * 8;
  const labourCost = labourHrs * crewConfig.rate;

  // ── VARIATIONS ──
  const calcVars = getCalcVariations();
  updateCalcVariationDisplay(calcVars);
  const variationCost = calcVars.totalCost;
  const variationRevenue = calcVars.totalRevenue;

  // ── MATERIAL TABLE (render FIRST to calculate adjusted material cost) ──
  const matData = {
    primerRR, wbBlocker, pu100, sealR, idealPU, mseal, mesh, wp120, mtPol, idealBinder, colourPack,
    primerRRSqm, wbBlockerSqm, pu100Sqm, sealRSqm, idealPUSqm, microSealSqm, meshSqm, wp120Sqm, polymerSqm, totalSqm, rusicoSqm,
    surfaceCalcs, totalCoatCost, pooledCost, totalMatCost
  };
  renderMaterialTable('mat-table-wrap', matData);

  // Render system-specific material tables for Micro Cement and Rusico cards
  const activeSystems = [...new Set(lines.map(l => l.sys))];
  const solidroCard = document.getElementById('mat-solidro-card');
  const mcCard = document.getElementById('mat-microcement-card');
  const rusicoCard = document.getElementById('mat-rusico-card');
  if (solidroCard) solidroCard.style.display = activeSystems.includes('solidro') ? '' : 'none';
  if (mcCard) {
    if (activeSystems.includes('microcement')) {
      mcCard.style.display = '';
      renderMaterialTable('mt-table-wrap', matData);
    } else {
      mcCard.style.display = 'none';
    }
  }
  if (rusicoCard) {
    if (activeSystems.includes('rusico')) {
      rusicoCard.style.display = '';
      renderMaterialTable('rusico-table-wrap', matData);
    } else {
      rusicoCard.style.display = 'none';
    }
  }

  // ── TOTALS (including variations + order qty overrides) ──
  const effectiveMatCost = (window._adjustedMatCost !== undefined && Object.keys(materialOrderOverrides).length > 0) ? window._adjustedMatCost : totalMatCost;
  const baseJobCost = effectiveMatCost + labourCost;
  const totalJobCost = baseJobCost + variationCost;

  // ── MCK RECOMMENDED SELL PRICE ──
  const recSell = calculateRecommendedSellPrice(lines);

  // ── VARIATION IMPACT DISPLAY ──
  const varImpactEl = document.getElementById('calc-var-impact');
  if (varImpactEl) {
    if (variationCost > 0) {
      const netVarMargin = variationRevenue - variationCost;
      varImpactEl.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:16px;padding:10px 0;font-size:13px;">`
        + `<span><strong style="color:var(--gold);">VARIATION COST:</strong> ${fmt(variationCost)}</span>`
        + `<span><strong style="color:var(--green);">VARIATION REVENUE:</strong> ${fmt(variationRevenue)}</span>`
        + `<span><strong style="color:#fff;">NET VARIATION MARGIN:</strong> ${fmt(netVarMargin)}</span>`
        + `<span><strong style="color:#fff;">TOTAL JOB COST (incl. variations):</strong> <span style="color:var(--gold);font-size:15px;">${fmt(totalJobCost)}</span></span>`
        + `</div>`;
      varImpactEl.style.display = 'block';
    } else {
      varImpactEl.style.display = 'none';
    }
  }

  // ── UPDATE SUMMARY CARDS ──
  setText('r-mat-cost', fmt(effectiveMatCost));
  setText('r-mat-sub', getSystemLabel(lines) + ' system');
  setText('r-lab-cost', fmt(labourCost));
  setText('r-lab-sub', totalDays + ' days × 8hrs × ' + fmt(crewConfig.rate) + '/hr' + (totalDays === MIN_JOB_DAYS && adjustedDays < MIN_JOB_DAYS ? ' (MIN 4-DAY PROCESS)' : ''));
  setText('r-job-cost', fmt(totalJobCost) + (variationCost > 0 ? ' (incl. ' + fmt(variationCost) + ' variations)' : ''));
  setText('r-sqm-cost', fmt(totalJobCost / totalSqm) + '/sqm cost price');
  setText('r-total-sqm', totalSqm.toFixed(1) + ' sqm');

  // ── SYSTEM COMPARISON TABLE ──
  renderSystemComparison(surfaceCalcs, pooledCost, labourCost, totalSqm);

  // ── SURFACE BREAKDOWN ──
  renderSurfaceBreakdown(surfaceCalcs);

  // ── RECOMMENDED SELL PRICE ──
  renderRecommendedSellPrice(recSell, totalJobCost, totalSqm);

  // ── MARGIN BANDS ──
  renderMarginBands(totalJobCost, totalSqm);

  // ── MARKET SANITY ──
  renderMarketCheck(totalJobCost, lines);

  // ── LABOUR BREAKDOWN ──
  renderLabourBreakdown(prepDays, floorDays, wallDays, sealerDays, totalDays, adjustedDays, labourHrs, labourCost);

  // ── CUSTOM SELL PRICE ──
  const customSell = parseFloat(document.getElementById('custom-sell')?.value) || 0;
  const customDisplay = document.getElementById('custom-margin-display');
  if (customDisplay) {
    if (customSell > 0) {
      const totalSellWithVar = customSell + variationRevenue;
      const margin = ((totalSellWithVar - totalJobCost) / totalSellWithVar * 100);
      const cls = margin >= 40 ? 'var(--green)' : margin >= 35 ? 'var(--amber)' : 'var(--red)';
      const varNote = variationCost > 0 ? ` &nbsp; <span style="font-size:12px;color:#aaa;">(incl. variation revenue ${fmt(variationRevenue)})</span>` : '';
      customDisplay.innerHTML =
        `<span style="color:${cls};font-size:18px;">${margin.toFixed(1)}% margin</span> &nbsp; Profit: ${fmt(totalSellWithVar - totalJobCost)} &nbsp; $/sqm sell: ${fmt(customSell/totalSqm)}${varNote}`;
    } else {
      customDisplay.textContent = 'Enter a sell price to see your actual margin';
      customDisplay.style.color = 'var(--grey-light)';
    }
  }

  // ── MARGIN ALERT SYSTEM ──
  renderMarginAlerts(totalJobCost, totalSqm, recSell, customSell);
}

// ── HELPER: SET TEXT ──────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getSystemLabel(lines) {
  const systems = [...new Set(lines.map(l => l.sys))];
  const labels = { solidro: 'Solidro', microcement: 'Micro Cement', rusico: 'Rusico' };
  return systems.map(s => labels[s] || s).join(' + ');
}

// ── RENDER SYSTEM COMPARISON ──────────────────────────────
function renderSystemComparison(surfaceCalcs, pooledCost, labourCost, totalSqm) {
  const PRODUCTS = getProducts();
  const systems = ['solidro', 'microcement', 'rusico'];
  const prefixes = { solidro: 'cmp-sol', microcement: 'cmp-mc', rusico: 'cmp-ru' };

  const sysCosts = {};
  systems.forEach(sys => {
    let coatCost = 0;
    surfaceCalcs.forEach(l => {
      let bp, tp;
      if (sys === 'solidro') { bp = PRODUCTS.solidro_zero; tp = PRODUCTS.solidro_top; }
      else if (sys === 'microcement') { bp = PRODUCTS.mt_zero; tp = PRODUCTS.mt_w; }
      else { bp = PRODUCTS.rusico_base; tp = PRODUCTS.rusico_top; }
      const bKg = l.sqm / bp.sqmPerKg;
      const tKg = (l.sqm / tp.sqmPerKg) * l.topCoats;
      coatCost += Math.ceil(bKg / bp.packKg) * bp.packCost;
      coatCost += Math.ceil(tKg / tp.packKg) * tp.packCost;
    });
    const matTotal = coatCost + pooledCost;
    const jobTotal = matTotal + labourCost;
    sysCosts[sys] = { matTotal, jobTotal };
  });

  systems.forEach(sys => {
    const p = prefixes[sys];
    const el = (id) => document.getElementById(id);
    const c = sysCosts[sys];
    if (el(p+'-mat')) el(p+'-mat').textContent = fmt(c.matTotal);
    if (el(p+'-lab')) el(p+'-lab').textContent = fmt(labourCost);
    if (el(p+'-total')) el(p+'-total').textContent = fmt(c.jobTotal);
    if (el(p+'-40')) el(p+'-40').textContent = fmt(c.jobTotal / 0.60);
    if (el(p+'-50')) el(p+'-50').textContent = fmt(c.jobTotal / 0.50);
  });
}

// ── MATERIAL ORDER QTY OVERRIDES ──────────────────────────
let materialOrderOverrides = {}; // key: product identifier, value: order qty

function onOrderQtyChange(key, calcQty, packCost) {
  const input = document.getElementById('oq-' + key);
  if (!input) return;
  const val = parseInt(input.value);
  if (isNaN(val) || val === calcQty) {
    delete materialOrderOverrides[key];
  } else {
    materialOrderOverrides[key] = val;
  }
  recalcMaterialCostFromOverrides();
}

function resetOrderQty(key) {
  delete materialOrderOverrides[key];
  recalc();
}

function resetAllOrderQty() {
  materialOrderOverrides = {};
  recalc();
}

function recalcMaterialCostFromOverrides() {
  // Re-run recalc to pick up overrides
  recalc();
}

function getOrderQty(key, calcQty) {
  return materialOrderOverrides[key] !== undefined ? materialOrderOverrides[key] : calcQty;
}

// ── RENDER MATERIAL TABLE ──────────────────────────────────
function renderMaterialTable(wrapperId, d) {
  const PRODUCTS = getProducts();

  let html = `<div style="margin-bottom:10px;text-align:right;"><button onclick="resetAllOrderQty()" class="add-surface-btn" style="font-size:10px;padding:6px 14px;">RESET ALL TO CALCULATED</button></div>`;
  html += `<table class="mat-table">
    <thead><tr>
      <th>PRODUCT</th><th>APPLIES TO</th><th class="right">CALC QTY</th>
      <th class="right" style="min-width:90px;">ORDER QTY</th>
      <th class="right">LEFTOVER</th><th class="right">UNIT COST</th><th class="right">LINE COST</th>
    </tr></thead><tbody>`;

  let adjustedTotalMatCost = 0;
  const matLineItems = [];

  // SURFACE COATS (grouped by system)
  const sysSurfaces = {};
  d.surfaceCalcs.forEach(l => {
    if (!sysSurfaces[l.sys]) sysSurfaces[l.sys] = [];
    sysSurfaces[l.sys].push(l);
  });

  Object.entries(sysSurfaces).forEach(([sys, surfaces]) => {
    const sysLabel = { solidro:'SOLIDRO', microcement:'MICRO CEMENT', rusico:'RUSICO' }[sys];
    html += `<tr class="system-header-row"><td colspan="7" style="color:var(--gold);font-weight:700;text-transform:uppercase;padding:12px 10px;background:rgba(201,168,76,0.08);">${sysLabel} SYSTEM</td></tr>`;

    // Base coat
    let totalBasePacks = 0, totalBaseKg = 0;
    surfaces.forEach(l => { totalBasePacks += l.basePacks; totalBaseKg += parseFloat(l.baseKg); });
    const bp = surfaces[0].baseProduct;
    const baseKey = sys + '_base';
    const baseOrderQty = getOrderQty(baseKey, totalBasePacks);
    const baseLeftoverKg = (baseOrderQty * bp.packKg) - totalBaseKg;
    const baseLeftoverSqm = baseLeftoverKg * bp.sqmPerKg;
    const baseCost = baseOrderQty * bp.packCost;
    adjustedTotalMatCost += baseCost;
    const baseChanged = baseOrderQty !== totalBasePacks;
    html += `<tr>
      <td>${bp.name}</td>
      <td>Base coat — ${surfaces.map(l=>l.name).join(', ')} (1 coat)</td>
      <td class="right">${totalBasePacks}</td>
      <td class="right"><input type="number" id="oq-${baseKey}" value="${baseOrderQty}" min="0" style="width:55px;background:#1a1a1a;color:${baseChanged?'var(--amber)':'#fff'};border:1px solid ${baseChanged?'var(--amber)':'#333'};padding:4px 6px;text-align:center;font-size:12px;border-radius:3px;" oninput="onOrderQtyChange('${baseKey}',${totalBasePacks},${bp.packCost})"> ${baseChanged?'<button onclick="resetOrderQty(\''+baseKey+'\')" style="background:transparent;border:none;color:var(--amber);cursor:pointer;font-size:10px;padding:2px 4px;" title="Reset">↺</button>':''}</td>
      <td class="right">${baseLeftoverSqm.toFixed(1)} sqm</td>
      <td class="right">${fmt(bp.packCost)}</td>
      <td class="right" style="${baseChanged?'color:var(--amber);font-weight:700;':''}">${fmt(baseCost)}</td>
    </tr>`;

    // Top coat
    let totalTopPacks = 0, totalTopKg = 0;
    surfaces.forEach(l => { totalTopPacks += l.topPacks; totalTopKg += parseFloat(l.topKg); });
    const tp = surfaces[0].topProduct;
    const topKey = sys + '_top';
    const topOrderQty = getOrderQty(topKey, totalTopPacks);
    const topLeftoverKg = (topOrderQty * tp.packKg) - totalTopKg;
    const topLeftoverSqm = topLeftoverKg * tp.sqmPerKg;
    const topCost = topOrderQty * tp.packCost;
    adjustedTotalMatCost += topCost;
    const topChanged = topOrderQty !== totalTopPacks;
    html += `<tr>
      <td>${tp.name}</td>
      <td>Top coat — ${surfaces.map(l=>l.name + (l.levelled?' (1 coat)':' (2 coats)')).join(', ')}</td>
      <td class="right">${totalTopPacks}</td>
      <td class="right"><input type="number" id="oq-${topKey}" value="${topOrderQty}" min="0" style="width:55px;background:#1a1a1a;color:${topChanged?'var(--amber)':'#fff'};border:1px solid ${topChanged?'var(--amber)':'#333'};padding:4px 6px;text-align:center;font-size:12px;border-radius:3px;" oninput="onOrderQtyChange('${topKey}',${totalTopPacks},${tp.packCost})"> ${topChanged?'<button onclick="resetOrderQty(\''+topKey+'\')" style="background:transparent;border:none;color:var(--amber);cursor:pointer;font-size:10px;padding:2px 4px;" title="Reset">↺</button>':''}</td>
      <td class="right">${topLeftoverSqm.toFixed(1)} sqm</td>
      <td class="right">${fmt(tp.packCost)}</td>
      <td class="right" style="${topChanged?'color:var(--amber);font-weight:700;':''}">${fmt(topCost)}</td>
    </tr>`;
  });

  // POOLED PRODUCTS
  html += `<tr class="system-header-row"><td colspan="7" style="color:var(--gold);font-weight:700;padding:12px 10px;background:rgba(201,168,76,0.08);">POOLED MATERIALS</td></tr>`;

  const pooledRows = [
    { p: PRODUCTS.primer_rr, key:'primer_rr', label:'PRIMER-RR 22.5kg', sqm: d.primerRRSqm, data: d.primerRR, desc:'Surfaces requiring primer' },
    { p: PRODUCTS.wb_blocker, key:'wb_blocker', label:'WB Mesh Blocker 10kg', sqm: d.wbBlockerSqm, data: d.wbBlocker, desc:'Floors/Wet Areas/Plasterboard walls' },
    { p: PRODUCTS.mesh, key:'mesh', label:'Fibreglass Mesh', sqm: d.meshSqm, data: d.mesh, desc:'Floors/Wet Areas/Benchtops (not levelled)' },
    { p: PRODUCTS.pu100, key:'pu100', label:'PU100 Sealer 20L', sqm: d.pu100Sqm, data: d.pu100, desc:'Solidro + Micro Cement ONLY' },
    { p: PRODUCTS.seal_r, key:'seal_r', label:'SEAL-R NEW 20L', sqm: d.sealRSqm, data: d.sealR, desc:'Rusico ONLY' },
    { p: PRODUCTS.idealpu, key:'idealpu', label:'IDEALPU-PRIMER Easy 5kg', sqm: d.idealPUSqm, data: d.idealPU, desc:'Rusico ONLY (before SEAL-R)' },
    { p: PRODUCTS.micro_seal, key:'micro_seal', label:'Micro Seal 5.5L', sqm: d.microSealSqm, data: d.mseal, desc:'Solidro + Micro Cement floors/wet areas' },
    { p: PRODUCTS.wp120, key:'wp120', label:'Velosit WP120', sqm: d.wp120Sqm, data: d.wp120, desc:'Wet areas only' },
    { p: PRODUCTS.mt_pol, key:'mt_pol', label:'MT-POL Polymer 17L', sqm: d.polymerSqm, data: d.mtPol, desc:'Micro Cement system only' },
    { p: PRODUCTS.ideal_binder, key:'ideal_binder', label:'Ideal Binder 25L', sqm: d.rusicoSqm, data: d.idealBinder, desc:'Rusico system only (4 mixes per 25L can)' },
    { p: PRODUCTS.colour_pack, key:'colour_pack', label:'Colour Pack', sqm: d.totalSqm, data: d.colourPack, desc:'All systems (1 per 50 sqm)' },
  ];

  pooledRows.forEach(r => {
    const applies = r.sqm > 0 ? `${r.desc} (${r.sqm.toFixed(0)} sqm)` : 'Not required';
    const calcPacks = r.data.packs;
    const orderQty = getOrderQty(r.key, calcPacks);
    const lineCost = orderQty * r.p.packCost;
    adjustedTotalMatCost += lineCost;
    const changed = orderQty !== calcPacks;
    const leftover = r.sqm > 0 ? ((orderQty * (r.p.packCoverage || 1)) - r.sqm).toFixed(1) + ' sqm' : '—';
    html += `<tr>
      <td>${r.p.name} <span class="pooled-badge">POOLED</span></td>
      <td>${applies}</td>
      <td class="right">${calcPacks}</td>
      <td class="right"><input type="number" id="oq-${r.key}" value="${orderQty}" min="0" style="width:55px;background:#1a1a1a;color:${changed?'var(--amber)':'#fff'};border:1px solid ${changed?'var(--amber)':'#333'};padding:4px 6px;text-align:center;font-size:12px;border-radius:3px;" oninput="onOrderQtyChange('${r.key}',${calcPacks},${r.p.packCost})"> ${changed?'<button onclick="resetOrderQty(\''+r.key+'\')" style="background:transparent;border:none;color:var(--amber);cursor:pointer;font-size:10px;padding:2px 4px;" title="Reset">↺</button>':''}</td>
      <td class="right">${leftover}</td>
      <td class="right">${fmt(r.p.packCost)}</td>
      <td class="right" style="${changed?'color:var(--amber);font-weight:700;':''}">${fmt(lineCost)}</td>
    </tr>`;
  });

  // CONSUMABLES
  adjustedTotalMatCost += CONSUMABLES;
  html += `<tr>
    <td>Consumables (flat per job)</td><td>All jobs</td>
    <td class="right">—</td><td class="right">—</td>
    <td class="right">—</td><td class="right">—</td><td class="right">${fmt(CONSUMABLES)}</td>
  </tr>`;

  // Check if any overrides exist
  const hasOverrides = Object.keys(materialOrderOverrides).length > 0;
  const origTotal = d.totalMatCost;
  const diff = adjustedTotalMatCost - origTotal;

  html += `</tbody><tfoot>
    <tr class="total-row">
      <td colspan="6">TOTAL MATERIAL COST${hasOverrides ? ' (ADJUSTED)' : ''}</td>
      <td class="right" style="${hasOverrides?'color:var(--amber);':''}">` + fmt(adjustedTotalMatCost) + `</td>
    </tr>
  </tfoot></table>`;

  if (hasOverrides) {
    html += `<div style="margin-top:8px;font-size:12px;color:var(--amber);">
      ORDER QTY ADJUSTED — Material cost ${diff >= 0 ? 'increased' : 'decreased'} by ${fmt(Math.abs(diff))} from calculated ${fmt(origTotal)}
    </div>`;
  }

  document.getElementById(wrapperId).innerHTML = html;

  // Store adjusted material cost for margin recalc
  window._adjustedMatCost = adjustedTotalMatCost;
}

// ── RENDER SURFACE BREAKDOWN ───────────────────────────────
function renderSurfaceBreakdown(surfaceCalcs) {
  const wrap = document.getElementById('surface-breakdown-wrap');
  if (!wrap) return;
  if (!surfaceCalcs.length) { wrap.innerHTML = ''; return; }

  const sysLabels = { solidro:'Solidro', microcement:'Micro Cement', rusico:'Rusico' };

  let html = `<table class="breakdown-table">
    <thead><tr>
      <th>SURFACE</th><th>TYPE</th><th>SYSTEM</th><th>SQM</th>
      <th>BASE</th><th>TOP</th><th>COATS</th>
      <th>PRIMER</th><th>BLOCKER</th><th>MESH</th><th>SEAL</th><th>WP120</th>
      <th>LINE COST</th>
    </tr></thead><tbody>`;

  surfaceCalcs.forEach(l => {
    const r = l.rules;
    const yn = (v) => v ? '<span style="color:var(--green);font-weight:700;">YES</span>' : '<span style="color:var(--grey-light);">NO</span>';
    html += `<tr>
      <td>${l.name}</td>
      <td>${l.type}${l.levelled?' (Lev)':''}${l.plasterboard?' (PB)':''}</td>
      <td>${sysLabels[l.sys]}</td>
      <td>${l.sqm}</td>
      <td>${l.basePacks}</td>
      <td>${l.topPacks}</td>
      <td>${l.topCoats}</td>
      <td>${yn(r.needsPrimerRR)}</td>
      <td>${yn(r.needsWBBlocker)}</td>
      <td>${yn(r.needsMesh)}</td>
      <td>${yn(r.needsMicroSeal)}</td>
      <td>${yn(r.needsWP120)}</td>
      <td>${fmt(l.lineCost)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
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

  if (recSell.isCombined) {
    html += `<div class="callout callout-gold" style="margin-top:14px;">
      <strong>COMBINED AREAS:</strong> ${recSell.combinedNote}
    </div>`;
  }

  // Tiered breakdown table
  html += `<table class="mat-table" style="margin-top:14px;">
    <thead><tr>
      <th>SURFACE TYPE</th><th class="right">SQM</th>
      <th class="right">TIER RATE</th><th class="right">LINE PRICE</th><th>STATUS</th>
    </tr></thead><tbody>`;

  recSell.breakdown.forEach(b => {
    const statusColor = b.minApplied ? 'var(--amber)' : 'var(--green)';
    const statusText = b.minApplied ? 'MIN CHARGE APPLIED' : b.tierLabel;
    html += `<tr>
      <td>${b.type}</td>
      <td class="right">${b.sqm.toFixed(1)}</td>
      <td class="right">${fmt(b.rate)}/sqm</td>
      <td class="right">${fmt(b.linePrice)}</td>
      <td style="color:${statusColor};font-weight:700;font-size:11px;">${statusText}</td>
    </tr>`;
  });

  html += `</tbody><tfoot>
    <tr class="total-row">
      <td colspan="3">TOTAL RECOMMENDED SELL PRICE (EX GST)</td>
      <td class="right">${fmt(recSell.totalRecommended)}</td>
      <td></td>
    </tr>
  </tfoot></table>`;

  // MCK Pricing reference
  html += `<div class="callout callout-info" style="margin-top:14px;">
    <strong>MCK PRICING STRUCTURE (ALL SYSTEMS — EX GST, INCLUDES MATERIALS)</strong><br>
    <strong>Floors:</strong> 0–25sqm = $365/sqm | 25–70sqm = $305/sqm | 70+ sqm = $250/sqm | Min $3,000<br>
    <strong>Feature Walls:</strong> 15–30sqm = $300/sqm | 30–60sqm = $260/sqm | 60+ sqm = $220/sqm | Min $3,000<br>
    <strong>Wet Areas / Bathrooms / Benchtops:</strong> 15–30sqm = $460/sqm | 30–60sqm = $360/sqm | 60–100sqm = $320/sqm | 100+ sqm = $280/sqm | Min $7,000<br>
    <strong>Combined areas:</strong> Individual minimums eliminated — only total job value matters
  </div>`;

  wrap.innerHTML = html;
}

// ── RENDER MARGIN BANDS ────────────────────────────────────
function renderMarginBands(totalCost, totalSqm) {
  const wrap = document.getElementById('margin-bands-wrap');
  if (!wrap) return;
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
  wrap.innerHTML = html;
}

// ── RENDER MARKET SANITY CHECK ─────────────────────────────
function renderMarketCheck(totalCost, lines) {
  const wrap = document.getElementById('market-check-wrap');
  if (!wrap) return;
  if (!lines.length) { wrap.innerHTML = ''; return; }

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
  </div></div>`;

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

  wrap.innerHTML = html;
}

// ── RENDER LABOUR BREAKDOWN ────────────────────────────────
function renderLabourBreakdown(prepDays, floorDays, wallDays, sealerDays, totalDays, adjustedDays, hrs, cost) {
  const wrap = document.getElementById('labour-wrap');
  if (!wrap) return;
  const crewLabel = document.querySelector('#crew-grid .crew-option.active .crew-label')?.textContent || '';
  const prepLabel = document.querySelector('#prep-grid .crew-option.active .crew-label')?.textContent || '';
  const minNote = totalDays > adjustedDays ? `<div class="callout callout-gold" style="margin-top:10px;"><strong>MINIMUM 4-DAY PROCESS APPLIED</strong> — Calculated ${adjustedDays} days, enforced minimum of ${getMinJobDays()} days (prep + base coat + top coat + seal)</div>` : '';

  wrap.innerHTML = `
    <div class="results-grid wide">
      <div class="stat-card"><div class="stat-label">CREW</div><div class="stat-value" style="font-size:16px;">${crewLabel}</div><div class="stat-sub">${fmt(crewConfig.rate)}/hr combined</div></div>
      <div class="stat-card"><div class="stat-label">PREP LEVEL</div><div class="stat-value" style="font-size:16px;">${prepLabel}</div><div class="stat-sub">x${prepMultiplier.toFixed(1)} multiplier</div></div>
      <div class="stat-card" style="border-color:var(--gold);"><div class="stat-label">TOTAL LABOUR COST</div><div class="stat-value gold">${fmt(cost)}</div><div class="stat-sub">${totalDays} days x 8hrs x ${fmt(crewConfig.rate)}/hr</div></div>
    </div>
    ${minNote}
    <table class="mat-table" style="margin-top:14px;">
      <thead><tr><th>PHASE</th><th class="right">DAYS</th><th class="right">HOURS</th><th class="right">COST</th></tr></thead>
      <tbody>
        <tr><td>Prep (masking, grinding, substrate prep)</td><td class="right">${prepDays}</td><td class="right">${prepDays*8}</td><td class="right">${fmt(prepDays*8*crewConfig.rate)}</td></tr>
        <tr><td>Floor / External Application</td><td class="right">${floorDays}</td><td class="right">${floorDays*8}</td><td class="right">${fmt(floorDays*8*crewConfig.rate)}</td></tr>
        <tr><td>Wall / Feature / Bench Top / Wet Area</td><td class="right">${wallDays}</td><td class="right">${wallDays*8}</td><td class="right">${fmt(wallDays*8*crewConfig.rate)}</td></tr>
        <tr><td>Sealer Days (Primer + PU100 + Micro Seal)</td><td class="right">${sealerDays}</td><td class="right">${sealerDays*8}</td><td class="right">${fmt(sealerDays*8*crewConfig.rate)}</td></tr>
      </tbody>
      <tfoot><tr class="total-row"><td colspan="3">TOTAL LABOUR (${totalDays} days, incl. prep x${prepMultiplier.toFixed(1)}${totalDays > adjustedDays ? ', MIN 4-DAY':''})</td><td class="right">${fmt(cost)}</td></tr></tfoot>
    </table>`;
}

// ═══════════════════════════════════════════════════════════
// CALCULATOR VARIATIONS ENGINE
// ═══════════════════════════════════════════════════════════

let calcVarCount = 0;

function addCalcVariation() {
  calcVarCount++;
  const id = calcVarCount;
  const defaultRate = crewConfig ? crewConfig.rate : 120;
  const defaultMatAllowance = 100;
  const html = `
  <tr id="calc-var-${id}">
    <td><input type="text" class="cv-desc" placeholder="e.g. Extra prep — damaged substrate" value="" style="width:100%;background:#1a1a1a;color:#fff;border:1px solid #333;padding:6px 8px;font-size:12px;"></td>
    <td><input type="number" class="cv-hrs" value="2" min="0" step="0.5" oninput="recalc()" style="width:60px;background:#1a1a1a;color:#fff;border:1px solid #333;padding:6px;text-align:center;font-size:12px;"></td>
    <td><input type="number" class="cv-rate" value="${defaultRate}" min="0" step="5" oninput="recalc()" style="width:70px;background:#1a1a1a;color:#fff;border:1px solid #333;padding:6px;text-align:center;font-size:12px;"></td>
    <td><input type="number" class="cv-mat" value="${defaultMatAllowance}" min="0" step="10" oninput="recalc()" style="width:70px;background:#1a1a1a;color:#fff;border:1px solid #333;padding:6px;text-align:center;font-size:12px;"></td>
    <td class="cv-line-total right" style="font-weight:700;color:var(--gold);">$0.00</td>
    <td class="cv-line-rev right" style="font-weight:700;color:var(--green);">$0.00</td>
    <td><button onclick="removeCalcVariation(${id})" style="background:transparent;border:1px solid #555;color:#ff5555;cursor:pointer;padding:4px 8px;font-size:14px;border-radius:4px;">&times;</button></td>
  </tr>`;
  const body = document.getElementById('calc-variation-body');
  if (body) body.insertAdjacentHTML('beforeend', html);
  recalc();
}

function removeCalcVariation(id) {
  const row = document.getElementById('calc-var-' + id);
  if (row) row.remove();
  recalc();
}

function getCalcVariations() {
  const rows = document.querySelectorAll('#calc-variation-body tr');
  let totalCost = 0;
  let totalRevenue = 0;
  const items = [];

  rows.forEach(row => {
    const desc = row.querySelector('.cv-desc')?.value || '';
    const hrs = parseFloat(row.querySelector('.cv-hrs')?.value) || 0;
    const rate = parseFloat(row.querySelector('.cv-rate')?.value) || 0;
    const mat = parseFloat(row.querySelector('.cv-mat')?.value) || 0;
    const lineCost = (hrs * rate) + mat;
    // Revenue: charge $400 per $300 cost (1.333x markup)
    const lineRevenue = lineCost * (4/3);

    const costEl = row.querySelector('.cv-line-total');
    const revEl = row.querySelector('.cv-line-rev');
    if (costEl) costEl.textContent = fmt(lineCost);
    if (revEl) revEl.textContent = fmt(lineRevenue);

    totalCost += lineCost;
    totalRevenue += lineRevenue;
    items.push({ desc, hrs, rate, mat, lineCost, lineRevenue });
  });

  return { totalCost, totalRevenue, items };
}

// updateCalcVariations is called from within recalc() to update the variation summary display
function updateCalcVariationDisplay(v) {
  const totalEl = document.getElementById('calc-var-total-cost');
  const revEl = document.getElementById('calc-var-total-rev');
  const marginEl = document.getElementById('calc-var-margin');

  if (totalEl) totalEl.textContent = fmt(v.totalCost);
  if (revEl) revEl.textContent = fmt(v.totalRevenue);
  if (marginEl) {
    const netMargin = v.totalRevenue - v.totalCost;
    const marginPct = v.totalRevenue > 0 ? ((netMargin / v.totalRevenue) * 100).toFixed(1) : '0.0';
    const cls = parseFloat(marginPct) >= 25 ? 'var(--green)' : 'var(--amber)';
    marginEl.innerHTML = `<span style="color:${cls};font-weight:700;">${marginPct}% margin</span> &mdash; Net: ${fmt(netMargin)}`;
  }
}

function clearResults() {
  ['r-mat-cost','r-lab-cost','r-job-cost','r-sqm-cost','r-mat-sub','r-lab-sub','r-total-sqm'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—';
  });
  ['mat-table-wrap','surface-breakdown-wrap','margin-bands-wrap',
   'market-check-wrap','labour-wrap','rec-sell-wrap','mt-table-wrap','rusico-table-wrap'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  // Reset variation impact
  const varImpact = document.getElementById('calc-var-impact');
  if (varImpact) varImpact.style.display = 'none';
  // Reset comparison cards
  ['cmp-sol-mat','cmp-sol-lab','cmp-sol-total','cmp-sol-40','cmp-sol-50',
   'cmp-mc-mat','cmp-mc-lab','cmp-mc-total','cmp-mc-40','cmp-mc-50',
   'cmp-ru-mat','cmp-ru-lab','cmp-ru-total','cmp-ru-40','cmp-ru-50'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '\u2014';
  });
  // Reset margin alerts
  const marginAlertWrap = document.getElementById('margin-alert-wrap');
  if (marginAlertWrap) marginAlertWrap.innerHTML = '';
  window._marginBlocked = false;
}

// ── MARGIN ALERT SYSTEM ────────────────────────────────────
// Tracks margin per surface and blocks quote generation if below 20%
window._marginBlocked = false;
window._marginOverrideReason = '';

function renderMarginAlerts(totalJobCost, totalSqm, recSell, customSell) {
  let wrap = document.getElementById('margin-alert-wrap');
  if (!wrap) {
    // Create the alert container dynamically after the custom sell section
    const customWrap = document.getElementById('custom-margin-display');
    if (customWrap && customWrap.parentElement) {
      wrap = document.createElement('div');
      wrap.id = 'margin-alert-wrap';
      wrap.style.cssText = 'margin-top:16px;';
      customWrap.parentElement.after(wrap);
    } else return;
  }

  const alerts = [];
  let hasBelow35 = false;
  let hasBelow20 = false;

  // Check per-surface margins from recommended sell price breakdown
  if (recSell && recSell.breakdown) {
    recSell.breakdown.forEach(b => {
      // Calculate surface-level margin: (sell - cost) / sell
      // We approximate cost per surface proportionally
      const surfaceCostRatio = b.sqm / totalSqm;
      const surfaceCost = totalJobCost * surfaceCostRatio;
      const surfaceMargin = b.linePrice > 0 ? ((b.linePrice - surfaceCost) / b.linePrice * 100) : 0;

      if (surfaceMargin < 20) {
        hasBelow20 = true;
        hasBelow35 = true;
        alerts.push({ type: b.type, sqm: b.sqm, margin: surfaceMargin, level: 'critical' });
      } else if (surfaceMargin < 35) {
        hasBelow35 = true;
        alerts.push({ type: b.type, sqm: b.sqm, margin: surfaceMargin, level: 'warning' });
      }
    });
  }

  // Also check overall margin from custom sell price
  if (customSell > 0) {
    const overallMargin = ((customSell - totalJobCost) / customSell * 100);
    if (overallMargin < 20) {
      hasBelow20 = true;
      hasBelow35 = true;
    } else if (overallMargin < 35) {
      hasBelow35 = true;
    }
  }

  let html = '';

  if (alerts.length > 0) {
    html += '<div style="margin-top:14px;">';
    alerts.forEach(a => {
      const bgColor = a.level === 'critical' ? 'rgba(231,76,60,0.15)' : 'rgba(243,156,18,0.15)';
      const borderColor = a.level === 'critical' ? '#e74c3c' : '#f39c12';
      const icon = a.level === 'critical' ? '\u26D4' : '\u26A0\uFE0F';
      const msg = a.level === 'critical'
        ? `MARGIN BELOW 20% — QUOTE BLOCKED. Review pricing before quoting.`
        : `MARGIN BELOW MINIMUM — review pricing before quoting.`;
      html += `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:6px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">`
        + `<span style="font-size:18px;">${icon}</span>`
        + `<div><strong style="color:${borderColor};font-size:12px;letter-spacing:1px;">${a.type} (${a.sqm.toFixed(1)} sqm) — ${a.margin.toFixed(1)}% MARGIN</strong>`
        + `<div style="color:#ccc;font-size:11px;margin-top:2px;">${msg}</div></div></div>`;
    });
    html += '</div>';
  }

  // Block quote generation if below 20% (unless overridden)
  if (hasBelow20 && !window._marginOverrideReason) {
    window._marginBlocked = true;
    html += `<div style="background:rgba(231,76,60,0.2);border:2px solid #e74c3c;border-radius:6px;padding:16px;margin-top:12px;">`
      + `<div style="color:#e74c3c;font-weight:800;font-size:13px;letter-spacing:1px;margin-bottom:8px;">\u26D4 QUOTE GENERATION BLOCKED</div>`
      + `<div style="color:#ccc;font-size:12px;margin-bottom:12px;">One or more surfaces have a margin below 20%. You must provide an override reason to generate a quote at this price.</div>`
      + `<div style="display:flex;gap:8px;align-items:center;">`
      + `<input type="text" id="margin-override-reason" placeholder="Override reason (e.g. strategic pricing, loss leader)" `
      + `style="flex:1;background:#1a1a1a;border:1px solid #e74c3c;color:#fff;padding:10px 12px;font-size:12px;border-radius:4px;font-family:inherit;">`
      + `<button onclick="applyMarginOverride()" style="background:#e74c3c;color:#fff;border:none;padding:10px 20px;font-size:11px;font-weight:800;letter-spacing:1px;cursor:pointer;border-radius:4px;white-space:nowrap;">OVERRIDE & UNLOCK</button>`
      + `</div></div>`;
  } else if (hasBelow20 && window._marginOverrideReason) {
    window._marginBlocked = false;
    html += `<div style="background:rgba(243,156,18,0.15);border:1px solid #f39c12;border-radius:6px;padding:12px 16px;margin-top:12px;">`
      + `<strong style="color:#f39c12;">MARGIN OVERRIDE ACTIVE:</strong> <span style="color:#ccc;">${window._marginOverrideReason}</span>`
      + ` <button onclick="clearMarginOverride()" style="background:transparent;border:1px solid #666;color:#aaa;padding:4px 10px;font-size:10px;cursor:pointer;border-radius:3px;margin-left:8px;">CLEAR</button></div>`;
  } else {
    window._marginBlocked = false;
  }

  // Highlight surface rows in the surface breakdown table
  if (hasBelow35) {
    highlightLowMarginRows(alerts);
  }

  wrap.innerHTML = html;
}

function applyMarginOverride() {
  const input = document.getElementById('margin-override-reason');
  const reason = input ? input.value.trim() : '';
  if (!reason) {
    input.style.borderColor = '#ff0000';
    input.placeholder = 'You must enter a reason to override';
    return;
  }
  window._marginOverrideReason = reason;
  window._marginBlocked = false;
  recalc();
}

function clearMarginOverride() {
  window._marginOverrideReason = '';
  recalc();
}

function highlightLowMarginRows(alerts) {
  // Highlight rows in the recommended sell price table that have low margins
  const recWrap = document.getElementById('rec-sell-wrap');
  if (!recWrap) return;
  const rows = recWrap.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const typeCell = row.querySelector('td:first-child');
    if (!typeCell) return;
    const type = typeCell.textContent.trim();
    const alert = alerts.find(a => a.type === type);
    if (alert) {
      const color = alert.level === 'critical' ? 'rgba(231,76,60,0.2)' : 'rgba(243,156,18,0.15)';
      row.style.background = color;
    }
  });
}

// ── INIT ───────────────────────────────────────────────────
addSurfaceLine('Floor', 'solidro');
