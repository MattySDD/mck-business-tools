// ═══════════════════════════════════════════════════════════
// MCK ACCESS LOG v1.0  — "who is using the tools"
//
// Appends a one-line record to a per-day log file in the repo:
//   access-logs/YYYY-MM-DD.json   (array of entries)
//
// Each entry: { ts, user, action, target, view, meta, ua }
//
// SCOPE / SAFETY:
//  - This logs STAFF use of the internal tools (dashboard, generator,
//    customer database). It deliberately does NOT log public quote-viewer
//    opens, because the GitHub write token is currently exposed in the
//    client bundle — letting anonymous visitors trigger commits would let
//    them spam / abuse the repo. Client open / read-receipt tracking
//    should be added via a real backend (see PRIVACY-AND-BACKUP.md).
//  - Writes are best-effort and must never block the UI.
// ═══════════════════════════════════════════════════════════

const MCK_ACCESS_LOG = (() => {
  const USER_KEY = 'mck_staff_user';

  function _todayPath() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `access-logs/${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}.json`;
  }

  function getUser() {
    try { return localStorage.getItem(USER_KEY) || 'unknown'; }
    catch (e) { return 'unknown'; }
  }
  function setUser(u) {
    try { localStorage.setItem(USER_KEY, u || 'unknown'); } catch (e) {}
  }

  // Prompt once per browser for a staff identity (Stefi, King, etc.)
  function ensureUser() {
    let u = getUser();
    if (!u || u === 'unknown') {
      try {
        u = window.prompt('Your name (for the access log):', '') || 'unknown';
      } catch (e) { u = 'unknown'; }
      setUser(u.trim() || 'unknown');
    }
    return getUser();
  }

  async function log(event) {
    event = event || {};
    const S = (typeof MCK_QUOTE_STORAGE !== 'undefined' && MCK_QUOTE_STORAGE.ghUpdateFile)
      ? MCK_QUOTE_STORAGE : null;
    if (!S) return { success: false, error: 'storage not loaded' };
    const entry = {
      ts: new Date().toISOString(),
      user: event.user || getUser(),
      action: event.action || 'view',
      target: event.target || '',
      view: event.view || '',
      meta: event.meta || {},
      ua: (typeof navigator !== 'undefined' && navigator.userAgent) || ''
    };
    try {
      return await S.ghUpdateFile(_todayPath(),
        (cur) => { const list = Array.isArray(cur) ? cur : []; list.push(entry); return list; },
        `access-log: ${entry.user} ${entry.action} ${entry.target}`.trim(),
        { createIfMissing: true, defaultValue: () => [] });
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  return { log, getUser, setUser, ensureUser };
})();
