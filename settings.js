// ═══════════════════════════════════════════════════════════
// MCK SETTINGS v3.0 — PASSWORD-PROTECTED ADMIN PANEL
// Tiered pricing, 3 systems, Rusico, variation defaults
// ═══════════════════════════════════════════════════════════

const MCK_SETTINGS_PASSWORD = 'MCK2026';
const MCK_SETTINGS_KEY = 'mck_settings';
const MCK_AUTH_KEY = 'mck_settings_auth';

// ── DEFAULT VALUES ───────────────────────────────────────
const MCK_DEFAULTS = {
  // SECTION A — Sell Pricing: Floors (tiered)
  floor_0_25_rate: 365,
  floor_25_70_rate: 305,
  floor_70_plus_rate: 250,
  floor_min_charge: 3000,

  // SECTION A — Sell Pricing: Feature Walls (tiered)
  wall_15_30_rate: 300,
  wall_30_60_rate: 260,
  wall_60_plus_rate: 220,
  wall_min_charge: 3000,

  // SECTION A — Sell Pricing: Wet Areas / Bathrooms / Benchtops (tiered)
  wet_15_30_rate: 460,
  wet_30_60_rate: 360,
  wet_60_100_rate: 320,
  wet_100_plus_rate: 280,
  wet_min_charge: 7000,

  // SECTION B — Labour Rates
  solo_rate: 65,       // Patty
  dual_rate: 120,      // Patty ($65) + Hayden/Micky ($55)
  full_rate: 155,      // Patty ($65) + Hayden/Micky ($55) + Labourer ($35)
  patty_rate: 65,
  hayden_rate: 55,
  labourer_rate: 35,
  sqm_per_day_solo: 15,
  sqm_per_day_dual: 30,
  sqm_per_day_full: 40,

  // SECTION C — Material Costs: Solidro
  solidro_zero_20kg: 745.80,
  solidro_top_10kg: 627.00,

  // SECTION C — Material Costs: Micro Cement (Microtopping)
  mt_zero_25kg: 259.17,
  mt_w_17_5kg: 211.80,
  mt_pol_17l: 586.67,

  // SECTION C — Material Costs: Rusico (Hard-Neu + Rasico Touch)
  rusico_base_20kg: 580.00,  // Hard-Neu Colour Hardener 25kg
  rusico_top_10kg: 520.00,   // Rasico Touch Finishing Powder 25kg
  ideal_binder_25l: 761.68,
  seal_r_20l: 529.28,        // SEAL-R NEW 20L — Rusico ONLY

  // SECTION C — Material Costs: Colour Pack (all systems)
  colour_pack_cost: 85.00,

  // SECTION C — Material Costs: Shared/Pooled
  primer_rr_5kg: 161.78,     // PRIMER-RR 22.5kg
  wb_blocker_5kg: 161.78,    // WB Mesh Blocker 10kg
  idealpu_5kg: 411.81,       // IDEALPU-PRIMER Easy 5kg
  pu100_20l: 624.00,         // PU100 Sealer 20L drum
  micro_seal_5_5l: 198.00,   // Micro Seal 5.5L can
  mesh_50sqm: 120.00,
  wp120_20kg: 151.63,
  consumables_flat: 100.00,

  // SECTION C2 — Spread Rates (sqm per kg) — LOCKED DEFAULTS
  // These are the correct production values. Only change via Settings page.
  solidro_zero_spread: 1.3,   // LOCKED: 1.3 sqm/kg
  solidro_top_spread: 3.0,    // LOCKED: 3.0 sqm/kg (NOT 30)
  mt_zero_spread: 1.3,        // LOCKED: 1.3 sqm/kg
  mt_w_spread: 3.0,           // LOCKED: 3.0 sqm/kg
  rusico_base_spread: 1.1,    // LOCKED: 1.1 sqm/kg (Hard-Neu)
  rusico_top_spread: 1.3,     // LOCKED: 1.3 sqm/kg (Rasico Touch)

  // SECTION D — Quote Defaults
  min_days: 4,
  default_validity_hours: 48,
  default_prepared_by: 'King Mannion',
  deposit_threshold: 20000,
  deposit_pct_over: 5,
  deposit_pct_under: 10,
  material_pct: 50,
  upfront_reduction_pct: 5,
  upfront_reduction_cap: 1000,
  credit_limit: 10000,
  variation_rate: 150,
  variation_min_hours: 2,
  variation_material_allowance: 500,
  overdue_admin_fee: 220,
  overdue_interest_pct_week: 3,
  measure_fee: 220,
};

const MCK_SETTINGS_BACKUP_KEY = 'mck_settings_backup';

// ── GET / SET ────────────────────────────────────────
// FIX 4: NEVER overwrite existing localStorage on page load.
// Only write defaults if localStorage has NO settings at all.
function getMCKSettings() {
  try {
    const stored = localStorage.getItem(MCK_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to fill any NEW keys added in updates
      return { ...MCK_DEFAULTS, ...parsed };
    }
  } catch (e) {}
  // First time ever — no stored settings exist. Save defaults once.
  const defaults = { ...MCK_DEFAULTS };
  localStorage.setItem(MCK_SETTINGS_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveMCKSettings(settings) {
  localStorage.setItem(MCK_SETTINGS_KEY, JSON.stringify(settings));
}

function getSetting(key) {
  const s = getMCKSettings();
  return s[key] !== undefined ? s[key] : MCK_DEFAULTS[key];
}

// ── LOCK & RESTORE PRICES ────────────────────────────
function lockPrices() {
  const current = getMCKSettings();
  localStorage.setItem(MCK_SETTINGS_BACKUP_KEY, JSON.stringify(current));
  updateSettingsStatus('PRICES LOCKED — Backup saved. You can restore from this backup at any time.');
  const btn = event?.target;
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'LOCKED ✓';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }
}

function restoreFromBackup() {
  const backup = localStorage.getItem(MCK_SETTINGS_BACKUP_KEY);
  if (!backup) {
    updateSettingsStatus('NO BACKUP FOUND — Lock prices first to create a backup.');
    return;
  }
  try {
    const parsed = JSON.parse(backup);
    saveMCKSettings(parsed);
    loadSettingsToForm();
    updateSettingsStatus('PRICES RESTORED from backup successfully.');
    const btn = event?.target;
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'RESTORED ✓';
      btn.style.background = '#27AE60';
      setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
    }
  } catch (e) {
    updateSettingsStatus('BACKUP DATA CORRUPTED — Cannot restore.');
  }
}

// ── AUTH ──────────────────────────────────────────────────
function isSettingsAuthenticated() {
  return sessionStorage.getItem(MCK_AUTH_KEY) === 'true';
}

function authenticateSettings() {
  sessionStorage.setItem(MCK_AUTH_KEY, 'true');
}

function checkSettingsAccess() {
  if (isSettingsAuthenticated()) {
    showSettingsPanel();
    return;
  }
  const gate = document.getElementById('settings-gate') || document.getElementById('settings-auth-gate');
  const panel = document.getElementById('settings-content') || document.getElementById('settings-panel');
  if (gate) gate.style.display = 'flex';
  if (panel) panel.style.display = 'none';
}

function unlockSettings() {
  const input = document.getElementById('settings-password') || document.getElementById('settings-password-input');
  const error = document.getElementById('settings-error') || document.getElementById('settings-password-error');
  if (!input) return;

  if (input.value === MCK_SETTINGS_PASSWORD) {
    authenticateSettings();
    showSettingsPanel();
  } else {
    if (error) {
      error.textContent = 'INCORRECT PASSWORD';
      error.style.display = 'block';
    }
    input.value = '';
    input.focus();
  }
}
function submitSettingsPassword() { unlockSettings(); }

function showSettingsPanel() {
  const gate = document.getElementById('settings-gate') || document.getElementById('settings-auth-gate');
  const panel = document.getElementById('settings-content') || document.getElementById('settings-panel');
  if (gate) gate.style.display = 'none';
  if (panel) panel.style.display = 'block';
  loadSettingsToForm();
}

// ── ID MAPPING (settings key → HTML input ID) ───────────
const SETTINGS_ID_MAP = {
  // Floors
  floor_0_25_rate: 'set-floor-0-25',
  floor_25_70_rate: 'set-floor-25-70',
  floor_70_plus_rate: 'set-floor-70-plus',
  floor_min_charge: 'set-floor-min',
  // Feature Walls
  wall_15_30_rate: 'set-wall-15-30',
  wall_30_60_rate: 'set-wall-30-60',
  wall_60_plus_rate: 'set-wall-60-plus',
  wall_min_charge: 'set-wall-min',
  // Wet Areas
  wet_15_30_rate: 'set-wet-15-30',
  wet_30_60_rate: 'set-wet-30-60',
  wet_60_100_rate: 'set-wet-60-100',
  wet_100_plus_rate: 'set-wet-100-plus',
  wet_min_charge: 'set-wet-min',
  // Labour
  solo_rate: 'set-solo-rate',
  dual_rate: 'set-dual-rate',
  full_rate: 'set-full-rate',
  patty_rate: 'set-patty-rate',
  hayden_rate: 'set-hayden-rate',
  labourer_rate: 'set-labourer-rate',
  sqm_per_day_solo: 'set-solo-sqm',
  sqm_per_day_dual: 'set-dual-sqm',
  sqm_per_day_full: 'set-full-sqm',
  // Solidro
  solidro_zero_20kg: 'set-solidro-zero',
  solidro_top_10kg: 'set-solidro-top',
  // Micro Cement
  mt_zero_25kg: 'set-mt-zero',
  mt_w_17_5kg: 'set-mt-w',
  mt_pol_17l: 'set-mt-pol',
  // Rusico
  rusico_base_20kg: 'set-rusico-base',
  rusico_top_10kg: 'set-rusico-top',
  ideal_binder_25l: 'set-ideal-binder',
  seal_r_20l: 'set-seal-r',
  colour_pack_cost: 'set-colour-pack',
  // Shared
  primer_rr_5kg: 'set-primer-rr',
  wb_blocker_5kg: 'set-wb-blocker',
  idealpu_5kg: 'set-idealpu',
  pu100_20l: 'set-pu100',
  micro_seal_5_5l: 'set-microseal',
  mesh_50sqm: 'set-mesh',
  wp120_20kg: 'set-wp120',
  consumables_flat: 'set-consumables',
  // Spread Rates
  solidro_zero_spread: 'set-solidro-zero-spread',
  solidro_top_spread: 'set-solidro-top-spread',
  mt_zero_spread: 'set-mt-zero-spread',
  mt_w_spread: 'set-mt-w-spread',
  rusico_base_spread: 'set-rusico-base-spread',
  rusico_top_spread: 'set-rusico-top-spread',
  // Quote Defaults
  credit_limit: 'set-credit-limit',
  upfront_reduction_pct: 'set-upfront-disc',
  upfront_reduction_cap: 'set-upfront-cap',
  measure_fee: 'set-measure-fee',
  overdue_admin_fee: 'set-overdue-fee',
  overdue_interest_pct_week: 'set-overdue-int',
  variation_rate: 'set-variation-rate',
  variation_min_hours: 'set-variation-min',
  variation_material_allowance: 'set-variation-mat',
  min_days: 'set-min-days',
};

// ── LOAD / SAVE FORM ─────────────────────────────────────
function loadSettingsToForm() {
  const s = getMCKSettings();
  Object.keys(s).forEach(key => {
    const htmlId = SETTINGS_ID_MAP[key] || ('setting-' + key);
    const input = document.getElementById(htmlId);
    if (input) input.value = s[key];
  });
  updateSettingsStatus('Settings loaded from storage');
}

function saveSettingsFromForm() {
  const s = {};
  Object.keys(MCK_DEFAULTS).forEach(key => {
    const htmlId = SETTINGS_ID_MAP[key] || ('setting-' + key);
    const input = document.getElementById(htmlId);
    if (input) {
      const val = parseFloat(input.value);
      s[key] = isNaN(val) ? MCK_DEFAULTS[key] : val;
    } else {
      s[key] = getMCKSettings()[key];
    }
  });
  saveMCKSettings(s);
  updateSettingsStatus('All settings saved successfully');

  const btn = document.getElementById('settings-save-btn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'SAVED';
    btn.style.background = '#27AE60';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
  }
}

function resetSettingsToDefaults() {
  if (!confirm('Reset ALL settings to factory defaults? This cannot be undone.')) return;
  saveMCKSettings(MCK_DEFAULTS);
  loadSettingsToForm();
  updateSettingsStatus('All settings reset to defaults');
}

function updateSettingsStatus(msg) {
  const el = document.getElementById('settings-status');
  if (el) {
    el.textContent = msg + ' — ' + new Date().toLocaleTimeString();
    el.style.display = 'block';
    setTimeout(() => { el.style.opacity = '0.5'; }, 3000);
    el.style.opacity = '1';
  }
}

// ── PART 4: STOP-CHECK RULE ──────────────────────────────
// Locked critical values that must NEVER silently drift.
// The ONLY way to change these is via the Settings page with explicit user action.
const MCK_LOCKED_CRITICAL = {
  solidro_zero_spread: 1.3,
  solidro_top_spread: 3.0,
  mt_zero_spread: 1.3,
  mt_w_spread: 3.0,
  rusico_base_spread: 1.1,
  rusico_top_spread: 1.3,
  solidro_zero_20kg: 745.80,
  solidro_top_10kg: 627.00,
  mt_zero_25kg: 259.17,
  mt_w_17_5kg: 211.80,
  rusico_base_20kg: 580.00,
  rusico_top_10kg: 520.00,
  ideal_binder_25l: 761.68,
  seal_r_20l: 529.28,
  pu100_20l: 624.00,
  primer_rr_5kg: 161.78,
  wb_blocker_5kg: 161.78,
  idealpu_5kg: 411.81,
  micro_seal_5_5l: 198.00,
};

const MCK_SETTINGS_VERSION = 'v7-2026-03-19';

function checkSettingsDrift() {
  const stored = getMCKSettings();
  const drifted = [];

  Object.entries(MCK_LOCKED_CRITICAL).forEach(([key, lockedVal]) => {
    const storedVal = stored[key];
    if (storedVal === undefined || storedVal === null) return;
    // Allow tolerance of 0.001 for floating point
    if (Math.abs(Number(storedVal) - Number(lockedVal)) > 0.001) {
      drifted.push({ key, storedVal, lockedVal });
    }
  });

  const banner = document.getElementById('settings-drift-banner');
  if (!banner) return;

  if (drifted.length > 0) {
    const driftList = drifted.map(d => `${d.key}: stored=${d.storedVal}, locked=${d.lockedVal}`).join(' | ');
    banner.innerHTML = `<strong>⚠ SETTINGS MODIFIED FROM LOCKED VALUES</strong> — ${drifted.length} value(s) differ from defaults. Go to Settings to review. <span style="font-size:11px;opacity:0.7;">[${driftList}]</span>`;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// Force-merge any new keys from MCK_DEFAULTS into stored settings
// (handles upgrades where new keys are added)
function mergeNewDefaults() {
  try {
    const stored = localStorage.getItem(MCK_SETTINGS_KEY);
    if (!stored) return; // First time — getMCKSettings() handles this
    const parsed = JSON.parse(stored);
    let changed = false;
    // Add any keys that exist in MCK_DEFAULTS but NOT in stored settings
    Object.keys(MCK_DEFAULTS).forEach(key => {
      if (!(key in parsed)) {
        parsed[key] = MCK_DEFAULTS[key];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(MCK_SETTINGS_KEY, JSON.stringify(parsed));
    }
  } catch(e) {}
}

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const pwInput = document.getElementById('settings-password') || document.getElementById('settings-password-input');
  if (pwInput) {
    pwInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') unlockSettings();
    });
  }

  // Merge any new default keys (e.g. seal_r_20l added in this version)
  mergeNewDefaults();

  // Run drift check on every page load
  checkSettingsDrift();
});
