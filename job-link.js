// ═══════════════════════════════════════════════════════════
// MCK JOB LINK v1.0
// When the generator (index.html) is opened from the customer
// dashboard with ?customer=…&project=…&endClient=… params, this
// stamps that context onto every quote saved in the session so the
// quote is filed under the right Customer ▶ Project, and (for the
// block-of-units case) carries its own end-client.
//
// Consumed by quote.js: extractQuoteData() spreads window._mckJobContext,
// and generateShareableLink() calls MCK_CUSTOMER_STORAGE.attachQuoteToProject.
// ═══════════════════════════════════════════════════════════

(function () {
  function readContext() {
    const p = new URLSearchParams(window.location.search);
    const ctx = {};
    const map = {
      customer: 'customerId',
      project: 'projectId',
      projectName: 'projectName',
      brand: 'brand',
      endClient: 'endClientName',
      endClientEmail: 'endClientEmail',
      endClientPhone: 'endClientPhone',
      jobName: 'jobName'
    };
    let any = false;
    for (const [param, field] of Object.entries(map)) {
      const v = p.get(param);
      if (v) { ctx[field] = v; any = true; }
    }
    return any ? ctx : null;
  }

  function showBanner(ctx) {
    if (document.getElementById('mck-job-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'mck-job-banner';
    bar.style.cssText = 'position:sticky;top:0;z-index:500;background:#1b1b1b;border-bottom:1px solid #c9a84c;color:#c9a84c;font:600 11px/1.4 system-ui,sans-serif;padding:8px 14px;letter-spacing:.5px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;';
    const parts = [];
    parts.push('<span style="color:#888;text-transform:uppercase;">Filing under:</span>');
    if (ctx.projectName) parts.push('PROJECT: <b>' + escapeHtml(ctx.projectName) + '</b>');
    else if (ctx.projectId) parts.push('PROJECT: <b>' + escapeHtml(ctx.projectId) + '</b>');
    if (ctx.endClientName) parts.push('END CLIENT: <b>' + escapeHtml(ctx.endClientName) + '</b>');
    if (ctx.jobName) parts.push('JOB: <b>' + escapeHtml(ctx.jobName) + '</b>');
    parts.push('<a href="customers.html" style="color:#888;margin-left:auto;text-decoration:underline;">clear / back to customers</a>');
    bar.innerHTML = parts.join(' &nbsp; ');
    if (document.body) document.body.insertBefore(bar, document.body.firstChild);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function init() {
    const ctx = readContext();
    if (!ctx) return;
    window._mckJobContext = ctx;
    showBanner(ctx);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
