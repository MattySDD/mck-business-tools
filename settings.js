// ═══════════════════════════════════════════════════════════
// MCK SETTINGS v4.0 — PASSWORD-PROTECTED ADMIN PANEL
// Tiered pricing (corrected bands), dynamic crew/teams,
// dynamic product systems, Rusico, variation defaults
// ═══════════════════════════════════════════════════════════

const MCK_SETTINGS_PASSWORD = 'MCK2026';
const MCK_SETTINGS_KEY = 'mck_settings';
const MCK_AUTH_KEY = 'mck_settings_auth';

// ── DEFAULT VALUES ───────────────────────────────────────
const MCK_DEFAULTS = {
  // SECTION A — Sell Pricing: Floors (tiered) — min charge at top
  floor_min_charge: 7500,
  floor_0_25_rate: 365,
  floor_25_70_rate: 305,
  floor_70_120_rate: 250,
  floor_120_plus_rate: 220,

  // SECTION A — Sell Pricing: Feature Walls (tiered) — min charge at top
  wall_min_charge: 3000,
  wall_0_15_rate: 350,
  wall_15_30_rate: 300,
  wall_30_60_rate: 260,
  wall_60_plus_rate: 220,

  // SECTION A — Sell Pricing: Wet Areas / Bathrooms / Benchtops (tiered) — min charge at top
  wet_min_charge: 7500,
  wet_0_15_rate: 500,
  wet_15_30_rate: 460,
  wet_30_60_rate: 360,
  wet_60_100_rate: 320,
  wet_100_plus_rate: 280,

  // SECTION B — Labour Rates (individual members)
  patty_rate: 65,
  hayden_rate: 55,
  labourer_rate: 35,

  // SECTION B — Crew Presets (auto-calculated from members)
  solo_rate: 65,       // Patty
  dual_rate: 120,      // Patty ($65) + Hayden/Micky ($55)
  full_rate: 155,      // Patty ($65) + Hayden/Micky ($55) + Labourer ($35)

  // SECTION B — Productivity
  sqm_per_day_solo: 15,
  sqm_per_day_dual: 30,
  sqm_per_day_full: 40,

  // SECTION B — Dynamic crew members (JSON array stored as string)
  crew_members: JSON.stringify([
    { name: 'Patty', rate: 65 },
    { name: 'Hayden', rate: 55 },
    { name: 'Micky', rate: 55 },
    { name: 'Labourer', rate: 35 }
  ]),

  // SECTION B — Dynamic teams (JSON array stored as string)
  crew_teams: JSON.stringify([
    { name: 'Solo — Patty', members: ['Patty'], sqmPerDay: 15 },
    { name: 'Dual — Patty + Hayden/Micky', members: ['Patty', 'Hayden'], sqmPerDay: 30 },
    { name: 'Full — 3 Man + Labourer', members: ['Patty', 'Hayden', 'Labourer'], sqmPerDay: 40 }
  ]),

  // SECTION C — Material Costs: Solidro
  solidro_zero_20kg: 745.80,
  solidro_top_10kg: 627.00,

  // SECTION C — Material Costs: Micro Cement (Microtopping)
  mt_zero_25kg: 259.17,
  mt_w_17_5kg: 211.80,
  mt_pol_17l: 586.67,

  // SECTION C — Material Costs: Rusico (Hard-Neu + Rasico Touch)
  rusico_base_20kg: 580.00,
  rusico_top_10kg: 520.00,
  ideal_binder_25l: 761.68,
  seal_r_20l: 529.28,

  // SECTION C — Material Costs: Colour Pack (all systems)
  colour_pack_cost: 85.00,

  // SECTION C — Material Costs: Shared/Pooled
  primer_rr_5kg: 161.78,
  wb_blocker_5kg: 161.78,
  idealpu_5kg: 411.81,
  pu100_20l: 624.00,
  micro_seal_5_5l: 198.00,
  mesh_50sqm: 120.00,
  wp120_20kg: 151.63,
  consumables_flat: 100.00,

  // SECTION C2 — Spread Rates (sqm per kg) — LOCKED DEFAULTS
  solidro_zero_spread: 1.3,
  solidro_top_spread: 3.0,
  mt_zero_spread: 1.3,
  mt_w_spread: 3.0,
  rusico_base_spread: 1.1,
  rusico_top_spread: 1.3,

  // SECTION C3 — Dynamic Product Systems (JSON)
  custom_systems: JSON.stringify([]),

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
function getMCKSettings() {
  try {
    const stored = localStorage.getItem(MCK_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...MCK_DEFAULTS, ...parsed };
    }
  } catch (e) {}
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

// ── DYNAMIC CREW HELPERS ─────────────────────────────
function getCrewMembers() {
  try {
    const raw = getSetting('crew_members');
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) { return []; }
}

function saveCrewMembers(members) {
  const s = getMCKSettings();
  s.crew_members = JSON.stringify(members);
  saveMCKSettings(s);
}

function getCrewTeams() {
  try {
    const raw = getSetting('crew_teams');
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) { return []; }
}

function saveCrewTeams(teams) {
  const s = getMCKSettings();
  s.crew_teams = JSON.stringify(teams);
  saveMCKSettings(s);
}

function calculateTeamRate(team) {
  const members = getCrewMembers();
  let total = 0;
  (team.members || []).forEach(name => {
    const m = members.find(m => m.name === name);
    if (m) total += m.rate;
  });
  return total;
}

// ── DYNAMIC PRODUCT SYSTEMS ──────────────────────────
function getCustomSystems() {
  try {
    const raw = getSetting('custom_systems');
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) { return []; }
}

function saveCustomSystems(systems) {
  const s = getMCKSettings();
  s.custom_systems = JSON.stringify(systems);
  saveMCKSettings(s);
}

// ── LOCK & RESTORE PRICES ────────────────────────────
function lockPrices() {
  const current = getMCKSettings();
  localStorage.setItem(MCK_SETTINGS_BACKUP_KEY, JSON.stringify(current));
  updateSettingsStatus('PRICES LOCKED — Backup saved. You can restore from this backup at any time.');
  const btn = event?.target;
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'LOCKED';
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
      btn.textContent = 'RESTORED';
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
function checkSettingsPassword() { unlockSettings(); }

function showSettingsPanel() {
  const gate = document.getElementById('settings-gate') || document.getElementById('settings-auth-gate');
  const panel = document.getElementById('settings-content') || document.getElementById('settings-panel');
  if (gate) gate.style.display = 'none';
  if (panel) panel.style.display = 'block';
  loadSettingsToForm();
  renderCrewMembersUI();
  renderCrewTeamsUI();
  renderCustomSystemsUI();
}

// ── ID MAPPING (settings key → HTML input ID) ───────────
const SETTINGS_ID_MAP = {
  // Floors
  floor_min_charge: 'set-floor-min',
  floor_0_25_rate: 'set-floor-0-25',
  floor_25_70_rate: 'set-floor-25-70',
  floor_70_120_rate: 'set-floor-70-120',
  floor_120_plus_rate: 'set-floor-120-plus',
  // Feature Walls
  wall_min_charge: 'set-wall-min',
  wall_0_15_rate: 'set-wall-0-15',
  wall_15_30_rate: 'set-wall-15-30',
  wall_30_60_rate: 'set-wall-30-60',
  wall_60_plus_rate: 'set-wall-60-plus',
  // Wet Areas
  wet_min_charge: 'set-wet-min',
  wet_0_15_rate: 'set-wet-0-15',
  wet_15_30_rate: 'set-wet-15-30',
  wet_30_60_rate: 'set-wet-30-60',
  wet_60_100_rate: 'set-wet-60-100',
  wet_100_plus_rate: 'set-wet-100-plus',
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

// Keys that are JSON strings, not numeric — skip in numeric form load/save
const JSON_SETTINGS_KEYS = ['crew_members', 'crew_teams', 'custom_systems'];

// ── LOAD / SAVE FORM ─────────────────────────────────────
function loadSettingsToForm() {
  const s = getMCKSettings();
  Object.keys(s).forEach(key => {
    if (JSON_SETTINGS_KEYS.includes(key)) return;
    const htmlId = SETTINGS_ID_MAP[key] || ('setting-' + key);
    const input = document.getElementById(htmlId);
    if (input) input.value = s[key];
  });
  updateSettingsStatus('Settings loaded from storage');
}

function saveSettingsFromForm() {
  const s = getMCKSettings(); // start from current to preserve JSON keys
  Object.keys(MCK_DEFAULTS).forEach(key => {
    if (JSON_SETTINGS_KEYS.includes(key)) return; // skip JSON fields
    const htmlId = SETTINGS_ID_MAP[key] || ('setting-' + key);
    const input = document.getElementById(htmlId);
    if (input) {
      const val = parseFloat(input.value);
      s[key] = isNaN(val) ? MCK_DEFAULTS[key] : val;
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
  renderCrewMembersUI();
  renderCrewTeamsUI();
  renderCustomSystemsUI();
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

// ── DYNAMIC CREW MEMBERS UI ─────────────────────────────
function renderCrewMembersUI() {
  const wrap = document.getElementById('crew-members-dynamic');
  if (!wrap) return;
  const members = getCrewMembers();
  let html = '';
  members.forEach((m, i) => {
    html += `<div class="settings-row" style="display:flex;gap:8px;align-items:center;">
      <input type="text" value="${m.name}" onchange="updateCrewMember(${i},'name',this.value)" style="flex:1;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:3px;color:#fff;font-family:inherit;font-size:13px;">
      <input type="number" value="${m.rate}" onchange="updateCrewMember(${i},'rate',parseFloat(this.value))" style="width:80px;padding:8px 12px;background:var(--dark);border:1px solid var(--border);border-radius:3px;color:#fff;font-family:inherit;font-size:13px;text-align:center;">
      <span style="color:var(--grey-mid);font-size:11px;">$/hr</span>
      <button onclick="removeCrewMember(${i})" style="background:none;border:1px solid #ff4444;color:#ff4444;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:22px;">&times;</button>
    </div>`;
  });
  wrap.innerHTML = html;
}

function addCrewMember() {
  const members = getCrewMembers();
  members.push({ name: 'New Member', rate: 35 });
  saveCrewMembers(members);
  renderCrewMembersUI();
}

function updateCrewMember(idx, field, value) {
  const members = getCrewMembers();
  if (members[idx]) {
    members[idx][field] = value;
    saveCrewMembers(members);
    renderCrewTeamsUI(); // refresh team rates
  }
}

function removeCrewMember(idx) {
  const members = getCrewMembers();
  members.splice(idx, 1);
  saveCrewMembers(members);
  renderCrewMembersUI();
  renderCrewTeamsUI();
}

// ── DYNAMIC CREW TEAMS UI ────────────────────────────────
function renderCrewTeamsUI() {
  const wrap = document.getElementById('crew-teams-dynamic');
  if (!wrap) return;
  const teams = getCrewTeams();
  const members = getCrewMembers();
  let html = '';
  teams.forEach((t, i) => {
    const rate = calculateTeamRate(t);
    const memberCheckboxes = members.map(m => {
      const checked = (t.members || []).includes(m.name) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#ccc;margin-right:8px;"><input type="checkbox" ${checked} onchange="toggleTeamMember(${i},'${m.name}',this.checked)"> ${m.name} ($${m.rate})</label>`;
    }).join('');
    html += `<div style="background:var(--dark);border:1px solid var(--border);border-radius:4px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="text" value="${t.name}" onchange="updateCrewTeam(${i},'name',this.value)" style="flex:1;padding:8px 12px;background:#111;border:1px solid var(--border);border-radius:3px;color:#fff;font-family:inherit;font-size:13px;">
        <input type="number" value="${t.sqmPerDay || 0}" onchange="updateCrewTeam(${i},'sqmPerDay',parseFloat(this.value))" style="width:70px;padding:8px;background:#111;border:1px solid var(--border);border-radius:3px;color:#fff;font-size:13px;text-align:center;" title="sqm/day">
        <span style="color:var(--grey-mid);font-size:11px;">sqm/day</span>
        <button onclick="removeCrewTeam(${i})" style="background:none;border:1px solid #ff4444;color:#ff4444;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;">&times;</button>
      </div>
      <div style="margin-bottom:6px;">${memberCheckboxes}</div>
      <div style="font-size:12px;color:var(--gold);font-weight:700;">COMBINED RATE: $${rate}/hr &nbsp; | &nbsp; PRODUCTIVITY: ${t.sqmPerDay || 0} sqm/day</div>
    </div>`;
  });
  wrap.innerHTML = html;
}

function addCrewTeam() {
  const teams = getCrewTeams();
  teams.push({ name: 'New Team', members: [], sqmPerDay: 20 });
  saveCrewTeams(teams);
  renderCrewTeamsUI();
}

function updateCrewTeam(idx, field, value) {
  const teams = getCrewTeams();
  if (teams[idx]) {
    teams[idx][field] = value;
    saveCrewTeams(teams);
    renderCrewTeamsUI();
  }
}

function toggleTeamMember(teamIdx, memberName, checked) {
  const teams = getCrewTeams();
  if (!teams[teamIdx]) return;
  if (!teams[teamIdx].members) teams[teamIdx].members = [];
  if (checked) {
    if (!teams[teamIdx].members.includes(memberName)) teams[teamIdx].members.push(memberName);
  } else {
    teams[teamIdx].members = teams[teamIdx].members.filter(n => n !== memberName);
  }
  saveCrewTeams(teams);
  renderCrewTeamsUI();
}

function removeCrewTeam(idx) {
  const teams = getCrewTeams();
  teams.splice(idx, 1);
  saveCrewTeams(teams);
  renderCrewTeamsUI();
}

// ── DYNAMIC PRODUCT SYSTEMS UI ───────────────────────────
function renderCustomSystemsUI() {
  const wrap = document.getElementById('custom-systems-dynamic');
  if (!wrap) return;
  const systems = getCustomSystems();
  let html = '';
  systems.forEach((sys, i) => {
    let productsHtml = '';
    (sys.products || []).forEach((p, j) => {
      productsHtml += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
        <input type="text" value="${p.name || ''}" placeholder="Product name" onchange="updateCustomSystemProduct(${i},${j},'name',this.value)" style="flex:2;padding:6px 10px;background:#111;border:1px solid var(--border);border-radius:3px;color:#fff;font-size:12px;">
        <input type="number" value="${p.packCost || 0}" placeholder="Pack cost" onchange="updateCustomSystemProduct(${i},${j},'packCost',parseFloat(this.value))" style="width:80px;padding:6px;background:#111;border:1px solid var(--border);border-radius:3px;color:#fff;font-size:12px;text-align:center;">
        <input type="number" value="${p.packCoverage || 0}" placeholder="Coverage sqm" onchange="updateCustomSystemProduct(${i},${j},'packCoverage',parseFloat(this.value))" style="width:80px;padding:6px;background:#111;border:1px solid var(--border);border-radius:3px;color:#fff;font-size:12px;text-align:center;">
        <button onclick="removeCustomSystemProduct(${i},${j})" style="background:none;border:1px solid #ff4444;color:#ff4444;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;">&times;</button>
      </div>`;
    });
    html += `<div style="background:var(--dark);border:1px solid var(--border);border-radius:4px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="text" value="${sys.name || ''}" placeholder="System name (e.g. Dulux Arcra Stone)" onchange="updateCustomSystem(${i},'name',this.value)" style="flex:1;padding:8px 12px;background:#111;border:1px solid var(--border);border-radius:3px;color:#fff;font-family:inherit;font-size:13px;">
        <button onclick="removeCustomSystem(${i})" style="background:none;border:1px solid #ff4444;color:#ff4444;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;">&times;</button>
      </div>
      <div style="font-size:10px;color:var(--gold);font-weight:700;margin-bottom:6px;letter-spacing:1px;">PRODUCTS (Name | Pack Cost $ | Coverage sqm)</div>
      ${productsHtml}
      <button onclick="addCustomSystemProduct(${i})" style="background:none;border:1px dashed var(--border);color:var(--gold);padding:4px 12px;font-size:11px;cursor:pointer;border-radius:3px;margin-top:4px;">+ ADD PRODUCT</button>
    </div>`;
  });
  wrap.innerHTML = html;
}

function addCustomSystem() {
  const systems = getCustomSystems();
  systems.push({ name: '', products: [] });
  saveCustomSystems(systems);
  renderCustomSystemsUI();
}

function updateCustomSystem(idx, field, value) {
  const systems = getCustomSystems();
  if (systems[idx]) {
    systems[idx][field] = value;
    saveCustomSystems(systems);
  }
}

function removeCustomSystem(idx) {
  const systems = getCustomSystems();
  systems.splice(idx, 1);
  saveCustomSystems(systems);
  renderCustomSystemsUI();
}

function addCustomSystemProduct(sysIdx) {
  const systems = getCustomSystems();
  if (!systems[sysIdx]) return;
  if (!systems[sysIdx].products) systems[sysIdx].products = [];
  systems[sysIdx].products.push({ name: '', packCost: 0, packCoverage: 0 });
  saveCustomSystems(systems);
  renderCustomSystemsUI();
}

function updateCustomSystemProduct(sysIdx, prodIdx, field, value) {
  const systems = getCustomSystems();
  if (systems[sysIdx] && systems[sysIdx].products[prodIdx]) {
    systems[sysIdx].products[prodIdx][field] = value;
    saveCustomSystems(systems);
  }
}

function removeCustomSystemProduct(sysIdx, prodIdx) {
  const systems = getCustomSystems();
  if (systems[sysIdx] && systems[sysIdx].products) {
    systems[sysIdx].products.splice(prodIdx, 1);
    saveCustomSystems(systems);
    renderCustomSystemsUI();
  }
}

// ── PART 4: STOP-CHECK RULE ──────────────────────────────
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

const MCK_SETTINGS_VERSION = 'v8-2026-04-16';

function checkSettingsDrift() {
  const stored = getMCKSettings();
  const drifted = [];

  Object.entries(MCK_LOCKED_CRITICAL).forEach(([key, lockedVal]) => {
    const storedVal = stored[key];
    if (storedVal === undefined || storedVal === null) return;
    if (Math.abs(Number(storedVal) - Number(lockedVal)) > 0.001) {
      drifted.push({ key, storedVal, lockedVal });
    }
  });

  const banner = document.getElementById('settings-drift-banner');
  if (!banner) return;

  if (drifted.length > 0) {
    const driftList = drifted.map(d => `${d.key}: stored=${d.storedVal}, locked=${d.lockedVal}`).join(' | ');
    banner.innerHTML = `<strong>SETTINGS MODIFIED FROM LOCKED VALUES</strong> — ${drifted.length} value(s) differ from defaults. Go to Settings to review. <span style="font-size:11px;opacity:0.7;">[${driftList}]</span>`;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function mergeNewDefaults() {
  try {
    const stored = localStorage.getItem(MCK_SETTINGS_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    let changed = false;
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

  mergeNewDefaults();
  checkSettingsDrift();
});
