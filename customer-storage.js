// ═══════════════════════════════════════════════════════════
// MCK CUSTOMER / PROJECT STORAGE v1.0
// Three-tier model:  CUSTOMER ─▶ PROJECT ─▶ QUOTE(S)
//
//   Customer  = who we bill (often a builder / repeat B2B account)
//   Project   = one job or site (e.g. a block of units, a reno)
//   Quote(s)  = one or more distinct quotes inside a project.
//               Each quote may carry its OWN end-client / sub-customer
//               (e.g. each unit owner in the block), plus variations.
//
// Stored as JSON files in the same GitHub repo as quotes:
//   customers/CUST-XXXXXX.json
//   projects/PROJ-XXXXXX.json
//   customers/_index.json   (fast list for the dashboard)
//   projects/_index.json
//
// All writes go through MCK_QUOTE_STORAGE.ghUpdateFile() which does a
// read-modify-write with conflict retry — the safeguard against two
// staff members / agents overwriting each other.
//
// SCHEMA — Customer
// {
//   "customerId": "CUST-AB12CD",
//   "type": "business" | "individual",
//   "name": "ACME Builders Pty Ltd",
//   "abn": "12 345 678 901",
//   "brand": "MCK" | "RENDERKING",      // which business this belongs to
//   "contacts": [ { "name", "email", "phone", "role" } ],
//   "billingAddress": "…",
//   "defaultTerms": { depositPct, matPct, … },   // optional overrides
//   "tags": ["repeat", "builder"],
//   "notes": "…",
//   "projectIds": ["PROJ-…"],
//   "createdAt", "updatedAt", "createdBy"
// }
//
// SCHEMA — Project
// {
//   "projectId": "PROJ-AB12CD",
//   "customerId": "CUST-AB12CD",
//   "name": "Teemangum St — block of 15 units",
//   "siteAddress": "5/4 Teemangum Street, Tugun QLD",
//   "brand": "MCK",
//   "status": "open" | "won" | "lost" | "complete",
//   "notes": "…",
//   "quoteRefs": [                       // denormalised quote summaries
//     { "quoteId", "jobName", "endClientName", "subtotal",
//       "grandTotal", "status", "version", "updatedAt" }
//   ],
//   "createdAt", "updatedAt", "createdBy"
// }
// ═══════════════════════════════════════════════════════════

const MCK_CUSTOMER_STORAGE = (() => {
  const S = () => (typeof MCK_QUOTE_STORAGE !== 'undefined' && MCK_QUOTE_STORAGE.ghUpdateFile)
    ? MCK_QUOTE_STORAGE : null;

  const CUST_INDEX = 'customers/_index.json';
  const PROJ_INDEX = 'projects/_index.json';
  const custPath = id => `customers/${id}.json`;
  const projPath = id => `projects/${id}.json`;

  const nowISO = () => new Date().toISOString();

  // Crockford-ish base32, no ambiguous chars (no 0/O/1/I)
  function genId(prefix) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return `${prefix}-${s}`;
  }

  function _need() {
    return { success: false, error: 'MCK_QUOTE_STORAGE generic helpers not loaded. Include quote-storage.js first.' };
  }

  // ── Index maintenance ───────────────────────────────────────
  async function _upsertIndex(indexPath, entry, message) {
    return S().ghUpdateFile(indexPath, (cur) => {
      const list = Array.isArray(cur) ? cur : [];
      const i = list.findIndex(x => x.id === entry.id);
      if (i >= 0) list[i] = { ...list[i], ...entry };
      else list.push(entry);
      return list;
    }, message || `index: ${indexPath}`, { createIfMissing: true, defaultValue: () => [] });
  }

  function _custIndexEntry(c) {
    return {
      id: c.customerId, name: c.name, type: c.type, brand: c.brand,
      projectCount: (c.projectIds || []).length, updatedAt: c.updatedAt
    };
  }
  function _projIndexEntry(p) {
    return {
      id: p.projectId, customerId: p.customerId, name: p.name,
      brand: p.brand, status: p.status,
      quoteCount: (p.quoteRefs || []).length, updatedAt: p.updatedAt
    };
  }

  // ── CUSTOMERS ───────────────────────────────────────────────
  async function createCustomer(data) {
    const s = S(); if (!s) return _need();
    data = data || {};
    const id = data.customerId || genId('CUST');
    const contacts = data.contacts || [{
      name: data.contactName || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || 'Primary'
    }].filter(c => c.name || c.email || c.phone);

    const rec = {
      customerId: id,
      type: data.type || (data.abn ? 'business' : 'individual'),
      name: data.name || '',
      abn: data.abn || '',
      brand: data.brand || 'MCK',
      contacts,
      billingAddress: data.billingAddress || '',
      defaultTerms: data.defaultTerms || {},
      tags: data.tags || [],
      notes: data.notes || '',
      projectIds: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      createdBy: data.createdBy || 'agent'
    };
    const put = await s.ghPutFile(custPath(id), rec, `customer: ${id} - ${rec.name}`);
    if (!put.success) return { success: false, error: put.error };
    await _upsertIndex(CUST_INDEX, _custIndexEntry(rec), `index: + customer ${id}`);
    return { success: true, customerId: id, data: rec };
  }

  async function getCustomer(customerId) {
    const s = S(); if (!s) return _need();
    const r = await s.ghGetFile(custPath(customerId));
    if (!r.success) return { success: false, error: r.error || 'Customer not found' };
    return { success: true, data: r.data };
  }

  async function updateCustomer(customerId, updates) {
    const s = S(); if (!s) return _need();
    const r = await s.ghUpdateFile(custPath(customerId),
      (cur) => ({ ...cur, ...updates, customerId, updatedAt: nowISO() }),
      `customer: update ${customerId}`, { createIfMissing: false });
    if (r.success) await _upsertIndex(CUST_INDEX, _custIndexEntry(r.data));
    return r;
  }

  async function listCustomers() {
    const s = S(); if (!s) return _need();
    const r = await s.ghGetFile(CUST_INDEX);
    if (r.success) return { success: true, customers: r.data };
    if (r.notFound) return { success: true, customers: [] };
    return { success: false, error: r.error };
  }

  // Find an existing customer by email or (fallback) exact name — used to
  // avoid creating duplicate accounts for a repeat client.
  async function findCustomer({ email, name, brand } = {}) {
    const list = await listCustomers();
    if (!list.success) return { success: false, error: list.error };
    const wantEmail = (email || '').trim().toLowerCase();
    const wantName = (name || '').trim().toLowerCase();
    // Index entries don't hold email, so for an email match we load candidates.
    let match = null;
    if (wantName) {
      match = list.customers.find(c => (c.name || '').trim().toLowerCase() === wantName
        && (!brand || c.brand === brand));
    }
    if (!match && wantEmail) {
      for (const c of list.customers) {
        if (brand && c.brand !== brand) continue;
        const full = await getCustomer(c.id);
        if (full.success && (full.data.contacts || []).some(ct => (ct.email || '').trim().toLowerCase() === wantEmail)) {
          return { success: true, found: true, customerId: c.id, data: full.data };
        }
      }
    }
    if (match) {
      const full = await getCustomer(match.id);
      return { success: true, found: true, customerId: match.id, data: full.data };
    }
    return { success: true, found: false };
  }

  // ── PROJECTS ────────────────────────────────────────────────
  async function createProject(customerId, data) {
    const s = S(); if (!s) return _need();
    data = data || {};
    const id = data.projectId || genId('PROJ');
    const cust = await getCustomer(customerId);
    const rec = {
      projectId: id,
      customerId,
      name: data.name || '',
      siteAddress: data.siteAddress || '',
      brand: data.brand || (cust.success ? cust.data.brand : 'MCK') || 'MCK',
      status: data.status || 'open',
      notes: data.notes || '',
      quoteRefs: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      createdBy: data.createdBy || 'agent'
    };
    const put = await s.ghPutFile(projPath(id), rec, `project: ${id} - ${rec.name}`);
    if (!put.success) return { success: false, error: put.error };

    // Link project onto the customer (safe RMW)
    if (cust.success) {
      await s.ghUpdateFile(custPath(customerId), (c) => {
        const ids = new Set(c.projectIds || []); ids.add(id);
        return { ...c, projectIds: [...ids], updatedAt: nowISO() };
      }, `customer: + project ${id}`, { createIfMissing: false });
      const refreshed = await getCustomer(customerId);
      if (refreshed.success) await _upsertIndex(CUST_INDEX, _custIndexEntry(refreshed.data));
    }
    await _upsertIndex(PROJ_INDEX, _projIndexEntry(rec), `index: + project ${id}`);
    return { success: true, projectId: id, data: rec };
  }

  async function getProject(projectId) {
    const s = S(); if (!s) return _need();
    const r = await s.ghGetFile(projPath(projectId));
    if (!r.success) return { success: false, error: r.error || 'Project not found' };
    return { success: true, data: r.data };
  }

  async function updateProject(projectId, updates) {
    const s = S(); if (!s) return _need();
    const r = await s.ghUpdateFile(projPath(projectId),
      (cur) => ({ ...cur, ...updates, projectId, updatedAt: nowISO() }),
      `project: update ${projectId}`, { createIfMissing: false });
    if (r.success) await _upsertIndex(PROJ_INDEX, _projIndexEntry(r.data));
    return r;
  }

  async function listProjects(customerId) {
    const s = S(); if (!s) return _need();
    const r = await s.ghGetFile(PROJ_INDEX);
    let projects = r.success ? r.data : [];
    if (customerId) projects = projects.filter(p => p.customerId === customerId);
    return { success: true, projects };
  }

  // ── LINK A QUOTE INTO A PROJECT ─────────────────────────────
  // Called after a quote is saved. Adds/updates a denormalised summary
  // on the project so the dashboard can render the tree without loading
  // every quote file. De-duplicates by base quote id (latest wins).
  function _quoteRefFromQuote(q) {
    const baseId = q.parentQuoteId || q.quoteNumber;
    return {
      quoteId: q.quoteNumber,
      baseQuoteId: baseId,
      jobName: q.jobName || q.scope ? (q.jobName || '') : '',
      endClientName: q.endClientName || '',
      endClientEmail: q.endClientEmail || '',
      subtotal: q.subtotal || 0,
      grandTotal: q.grandTotal || 0,
      status: q.clientAcceptedAt ? 'ACCEPTED' : (q.status || 'PENDING'),
      accepted: !!q.clientAcceptedAt,
      acceptedAt: q.clientAcceptedAt || null,
      version: q.version || 1,
      updatedAt: q.lastSavedAt || q.updatedAt || nowISO()
    };
  }

  async function attachQuoteToProject(projectId, quote) {
    const s = S(); if (!s) return _need();
    if (!projectId) return { success: false, error: 'projectId required' };
    const ref = _quoteRefFromQuote(quote);
    const r = await s.ghUpdateFile(projPath(projectId), (p) => {
      const refs = Array.isArray(p.quoteRefs) ? p.quoteRefs.slice() : [];
      // Replace any ref with the same baseQuoteId+version, else push.
      const i = refs.findIndex(x => x.quoteId === ref.quoteId);
      if (i >= 0) refs[i] = ref; else refs.push(ref);
      return { ...p, quoteRefs: refs, updatedAt: nowISO() };
    }, `project: link quote ${ref.quoteId}`, { createIfMissing: false });
    if (r.success) await _upsertIndex(PROJ_INDEX, _projIndexEntry(r.data));
    return r;
  }

  // ── EXPORT BUNDLE (for Google Drive / off-site backup) ──────
  // Returns the full customer + all projects + all quote JSONs in one
  // object, ready to be written to a Drive folder by an agent.
  async function exportCustomerBundle(customerId) {
    const s = S(); if (!s) return _need();
    const cust = await getCustomer(customerId);
    if (!cust.success) return cust;
    const bundle = { customer: cust.data, projects: [], exportedAt: nowISO() };
    for (const pid of (cust.data.projectIds || [])) {
      const p = await getProject(pid);
      if (!p.success) continue;
      const proj = { ...p.data, quotes: [] };
      for (const ref of (p.data.quoteRefs || [])) {
        const q = await MCK_QUOTE_STORAGE.loadQuote(ref.quoteId);
        if (q.success) proj.quotes.push(q.data);
      }
      bundle.projects.push(proj);
    }
    return { success: true, bundle };
  }

  return {
    genId,
    createCustomer, getCustomer, updateCustomer, listCustomers, findCustomer,
    createProject, getProject, updateProject, listProjects,
    attachQuoteToProject,
    exportCustomerBundle
  };
})();
