// ═══════════════════════════════════════════════════════════
// MCK SETTINGS — PASSWORD-PROTECTED ADMIN PANEL
// All values persisted to localStorage
// ═══════════════════════════════════════════════════════════

const MCK_SETTINGS_PASSWORD = 'MCK2026';
const MCK_SETTINGS_KEY = 'mck_settings';
const MCK_AUTH_KEY = 'mck_settings_auth';

// ── DEFAULT VALUES ───────────────────────────────────────
const MCK_DEFAULTS = {
  // SECTION A — Sell Pricing (ex GST)
  floor_over_60_rate: 100,
  floor_under_60_rate: 160,
  floor_min_charge: 7500,
  wall_over_20_rate: 120,
  wall_under_20_rate: 180,
  wall_min_charge: 5000,
  wet_over_20_rate: 160,
  wet_under_20_rate: 300,
  wet_min_charge: 7500,

  // SECTION B — Labour Rates
  solo_rate: 65,
  standard_rate: 120,
  full_rate: 155,
  sqm_per_day_solo: 15,
  sqm_per_day_standard: 20,
  sqm_per_day_full: 28,

  // SECTION C — Material Costs (ex GST)
  solidro_zero_20kg: 745.80,
  solidro_top_10kg: 421.30,
  mt_bc_20kg: 600.00,
  mt_fc_20kg: 600.00,
  mt_pol_10kg: 250.00,
  iw_blocker_5kg: 198.00,
  idealpu_5kg: 198.00,
  pu100_20l: 550.00,
  micro_seal_5_5l: 297.00,
  mesh_50sqm: 165.00,
  wp120_20kg: 132.00,
  consumables_flat: 350.00,

  // SECTION D — Quote Defaults
  default_validity_hours: 48,
  default_prepared_by: 'King Mannion',
  deposit_threshold: 20000,
  deposit_pct_over: 5,
  deposit_pct_under: 10,
  material_pct: 50,
  upfront_discount_pct: 5,
  upfront_discount_cap: 1000,
  credit_limit: 10000,
  variation_rate: 150,
  variation_min_hours: 2,
  overdue_admin_fee: 220,
  overdue_interest_pct_week: 3,
  measure_fee: 220,
};

// ── GET / SET ────────────────────────────────────────────
function getMCKSettings() {
  try {
    const stored = localStorage.getItem(MCK_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...MCK_DEFAULTS, ...parsed };
    }
  } catch (e) {}
  return { ...MCK_DEFAULTS };
}

function saveMCKSettings(settings) {
  localStorage.setItem(MCK_SETTINGS_KEY, JSON.stringify(settings));
}

function getSetting(key) {
  const s = getMCKSettings();
  return s[key] !== undefined ? s[key] : MCK_DEFAULTS[key];
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
// Alias for backward compatibility
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
  floor_over_60_rate: 'set-floor-over',
  floor_under_60_rate: 'set-floor-under',
  floor_min_charge: 'set-floor-min',
  wall_over_20_rate: 'set-wall-over',
  wall_under_20_rate: 'set-wall-under',
  wall_min_charge: 'set-wall-min',
  wet_over_20_rate: 'set-wet-over',
  wet_under_20_rate: 'set-wet-under',
  wet_min_charge: 'set-wet-min',
  solo_rate: 'set-solo-rate',
  standard_rate: 'set-standard-rate',
  full_rate: 'set-full-rate',
  sqm_per_day_solo: 'set-solo-sqm',
  sqm_per_day_standard: 'set-standard-sqm',
  sqm_per_day_full: 'set-full-sqm',
  solidro_zero_20kg: 'set-solidro-zero',
  solidro_top_10kg: 'set-solidro-top',
  mt_bc_20kg: 'set-mt-zero',
  mt_fc_20kg: 'set-mt-w',
  mt_pol_10kg: 'set-mt-pol',
  iw_blocker_5kg: 'set-primer',
  pu100_20l: 'set-pu100',
  micro_seal_5_5l: 'set-microseal',
  mesh_50sqm: 'set-mesh',
  credit_limit: 'set-credit-limit',
  upfront_discount_pct: 'set-upfront-disc',
  upfront_discount_cap: 'set-upfront-cap',
  measure_fee: 'set-measure-fee',
  overdue_admin_fee: 'set-overdue-fee',
  overdue_interest_pct_week: 'set-overdue-int',
  variation_rate: 'set-variation-rate',
  variation_min_hours: 'set-variation-min',
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

  // Flash save confirmation
  const btn = document.getElementById('settings-save-btn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'SAVED ✓';
    btn.style.background = '#27AE60';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
    }, 2000);
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

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Handle Enter key in password field
  const pwInput = document.getElementById('settings-password') || document.getElementById('settings-password-input');
  if (pwInput) {
    pwInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') unlockSettings();
    });
  }
});
