// ═══════════════════════════════════════════════════════════
// MCK AGENT API v1.0 — External AI Agent Integration
// ═══════════════════════════════════════════════════════════
//
// This module provides a JavaScript API for external AI agents
// to create, update, and retrieve quotes programmatically.
//
// Since this is a static GitHub Pages site (no server), agents
// interact directly with the GitHub API via MCK_QUOTE_STORAGE.
//
// USAGE FROM EXTERNAL AGENT:
// ─────────────────────────
// 1. Include quote-storage.js and agent-api.js in your page/script
// 2. Call MCK_AGENT_API.createQuote(quoteData) to create a new quote
// 3. Call MCK_AGENT_API.getQuote(quoteId) to retrieve a quote
// 4. Call MCK_AGENT_API.updateQuote(quoteId, updates) to update fields
//
// EXAMPLE — Create a quote:
// ─────────────────────────
// const result = await MCK_AGENT_API.createQuote({
//   clientName: 'John Smith',
//   clientPhone: '0400 000 000',
//   clientEmail: 'john@example.com',
//   projectAddress: '123 Gold Coast Hwy, Surfers Paradise QLD 4217',
//   colourFinish: 'Grigio Cemento — Matte',
//   substrate: 'Existing tiles',
//   scope: 'Supply and install microcement to bathroom floors and walls',
//   lineItems: [
//     { desc: 'Micro Cement Application — Bathroom Floors', qty: 24, unit: 'sqm', rate: 280 },
//     { desc: 'Micro Cement Application — Bathroom Walls', qty: 18, unit: 'sqm', rate: 320 }
//   ],
//   inclusions: ['Supply of all Solidro microcement materials', 'Professional application'],
//   exclusions: ['Tile removal', 'Plumbing work'],
//   specialConditions: ['Access required by 7am daily']
// });
//
// console.log(result);
// // {
// //   success: true,
// //   quoteId: 'MCK-2026-4821',
// //   urls: {
// //     client: 'https://mattysdd.github.io/mck-business-tools/quote-viewer.html?id=MCK-2026-4821&view=client',
// //     tc: 'https://mattysdd.github.io/mck-business-tools/quote-viewer.html?id=MCK-2026-4821&view=tc',
// //     internal: 'https://mattysdd.github.io/mck-business-tools/quote-viewer.html?id=MCK-2026-4821'
// //   }
// // }
//
// EXAMPLE — Retrieve a quote:
// ─────────────────────────
// const quote = await MCK_AGENT_API.getQuote('MCK-2026-4821');
// // { success: true, data: { ... full quote object ... } }
//
// EXAMPLE — Update a quote (e.g. add client signature):
// ─────────────────────────
// const updated = await MCK_AGENT_API.updateQuote('MCK-2026-4821', {
//   clientAcceptedAt: new Date().toISOString(),
//   status: 'ACCEPTED'
// });
// // { success: true }
//
// ═══════════════════════════════════════════════════════════

const MCK_AGENT_API = (() => {

  /**
   * Create a new quote from agent-submitted data.
   * Automatically generates quote ID, calculates totals, and saves to GitHub.
   *
   * @param {object} quoteData - Quote fields (see schema in quote-storage.js)
   * @returns {Promise<{success: boolean, quoteId?: string, urls?: object, error?: string}>}
   */
  async function createQuote(quoteData) {
    if (typeof MCK_QUOTE_STORAGE === 'undefined') {
      return { success: false, error: 'MCK_QUOTE_STORAGE not loaded. Include quote-storage.js first.' };
    }

    // Validate minimum required fields
    if (!quoteData.lineItems || quoteData.lineItems.length === 0) {
      return { success: false, error: 'At least one lineItem is required.' };
    }

    // Generate quote ID if not provided
    const quoteId = quoteData.quoteNumber || MCK_QUOTE_STORAGE.generateQuoteId();
    quoteData.quoteNumber = quoteId;

    // Enrich with calculated fields (totals, payment schedule, defaults)
    const enrichedData = MCK_QUOTE_STORAGE.enrichQuoteData(quoteData);

    // Save to GitHub
    const result = await MCK_QUOTE_STORAGE.saveQuote(quoteId, enrichedData);

    if (result.success) {
      return {
        success: true,
        quoteId: quoteId,
        urls: result.urls,
        data: enrichedData
      };
    } else {
      return { success: false, error: result.error };
    }
  }

  /**
   * Retrieve an existing quote by ID.
   *
   * @param {string} quoteId - e.g. "MCK-2026-4821"
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async function getQuote(quoteId) {
    if (typeof MCK_QUOTE_STORAGE === 'undefined') {
      return { success: false, error: 'MCK_QUOTE_STORAGE not loaded.' };
    }
    return await MCK_QUOTE_STORAGE.loadQuote(quoteId);
  }

  /**
   * Update specific fields of an existing quote.
   *
   * @param {string} quoteId - e.g. "MCK-2026-4821"
   * @param {object} updates - Fields to merge into existing quote
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updateQuote(quoteId, updates) {
    if (typeof MCK_QUOTE_STORAGE === 'undefined') {
      return { success: false, error: 'MCK_QUOTE_STORAGE not loaded.' };
    }
    return await MCK_QUOTE_STORAGE.updateQuote(quoteId, updates);
  }

  /**
   * Check if a quote exists.
   *
   * @param {string} quoteId
   * @returns {Promise<boolean>}
   */
  async function quoteExists(quoteId) {
    if (typeof MCK_QUOTE_STORAGE === 'undefined') return false;
    return await MCK_QUOTE_STORAGE.quoteExists(quoteId);
  }

  /**
   * Generate a new unique quote ID without creating a quote.
   *
   * @returns {string} e.g. "MCK-2026-4821"
   */
  function generateId() {
    if (typeof MCK_QUOTE_STORAGE === 'undefined') {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `MCK-${year}-${rand}`;
    }
    return MCK_QUOTE_STORAGE.generateQuoteId();
  }

  /**
   * Get the JSON schema documentation for quote data.
   *
   * @returns {object} Schema definition
   */
  function getSchema() {
    return {
      version: '1.0',
      description: 'MCK Quote JSON Schema for Agent API',
      required: ['lineItems'],
      properties: {
        quoteNumber: { type: 'string', description: 'Auto-generated if not provided. Format: MCK-YYYY-XXXX' },
        clientName: { type: 'string', description: 'Client full name' },
        clientPhone: { type: 'string', description: 'Client phone number' },
        clientEmail: { type: 'string', description: 'Client email address' },
        projectAddress: { type: 'string', description: 'Full project address' },
        siteContact: { type: 'string', description: 'On-site contact name' },
        colourFinish: { type: 'string', description: 'Selected colour and finish' },
        substrate: { type: 'string', description: 'Substrate type and condition' },
        scope: { type: 'string', description: 'Scope of works description' },
        startDate: { type: 'string', description: 'Estimated start date' },
        duration: { type: 'string', description: 'Estimated duration' },
        completion: { type: 'string', description: 'Estimated completion date' },
        lineItems: {
          type: 'array',
          required: true,
          items: {
            desc: { type: 'string', description: 'Line item description' },
            qty: { type: 'number', description: 'Quantity' },
            unit: { type: 'string', description: 'Unit of measure (sqm, lm, ea, etc.)' },
            rate: { type: 'number', description: 'Rate per unit ex GST' }
          }
        },
        variationItems: { type: 'array', description: 'Optional variation line items' },
        inclusions: { type: 'array', items: 'string', description: 'List of inclusions' },
        exclusions: { type: 'array', items: 'string', description: 'List of exclusions' },
        specialConditions: { type: 'array', items: 'string', description: 'Special conditions (SC.1, SC.2, etc.)' },
        validityHours: { type: 'number', default: 48, description: 'Quote validity in hours' },
        preparedBy: { type: 'string', default: 'King Mannion', description: 'Prepared by name' }
      },
      calculatedFields: [
        'subtotal', 'gst', 'grandTotal', 'depositPct', 'depositAmt',
        'materialAmt', 'finalPct', 'finalAmt', 'upfrontDisc', 'upfrontTotal',
        'baseSubtotal', 'varSubtotal', 'createdAt', 'dateIssued'
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MULTI-QUOTE / CUSTOMER / PROJECT API (v2)
  // Three-tier model: CUSTOMER ─▶ PROJECT ─▶ QUOTE(S)
  // Requires customer-storage.js to be loaded alongside this file.
  // ═══════════════════════════════════════════════════════════

  function _cust() {
    return (typeof MCK_CUSTOMER_STORAGE !== 'undefined') ? MCK_CUSTOMER_STORAGE : null;
  }

  async function createCustomer(data) {
    const c = _cust();
    if (!c) return { success: false, error: 'MCK_CUSTOMER_STORAGE not loaded. Include customer-storage.js.' };
    return c.createCustomer(data);
  }
  async function getCustomer(customerId) {
    const c = _cust(); if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    return c.getCustomer(customerId);
  }
  async function findCustomer(query) {
    const c = _cust(); if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    return c.findCustomer(query || {});
  }
  async function createProject(customerId, data) {
    const c = _cust(); if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    return c.createProject(customerId, data);
  }
  async function getProject(projectId) {
    const c = _cust(); if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    return c.getProject(projectId);
  }
  async function exportCustomerBundle(customerId) {
    const c = _cust(); if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    return c.exportCustomerBundle(customerId);
  }

  /**
   * Create MANY distinct quotes under one project in a single call.
   * This is the core "repeat job" / "block of units" entry point.
   *
   * @param {string} projectId
   * @param {Array<object>} quotes - each is a normal quote object, PLUS
   *        optional per-quote: jobName, endClientName, endClientEmail,
   *        endClientPhone (the sub-customer for this specific quote).
   * @param {object} [opts] - { customerId, brand } applied to every quote.
   * @returns {Promise<{success, projectId, results:[{quoteId, urls, jobName, error?}]}>}
   */
  async function createQuotesForProject(projectId, quotes, opts) {
    const c = _cust();
    if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    if (!Array.isArray(quotes) || quotes.length === 0) {
      return { success: false, error: 'Provide an array of at least one quote.' };
    }
    opts = opts || {};
    const proj = await c.getProject(projectId);
    if (!proj.success) return { success: false, error: 'Project not found: ' + projectId };
    const customerId = opts.customerId || proj.data.customerId;
    const brand = opts.brand || proj.data.brand || 'MCK';

    const results = [];
    for (const q of quotes) {
      const linked = {
        ...q,
        customerId,
        projectId,
        brand,
        projectName: proj.data.name || '',
        projectAddress: q.projectAddress || proj.data.siteAddress || ''
      };
      const created = await createQuote(linked);
      if (created.success) {
        await c.attachQuoteToProject(projectId, created.data);
        results.push({ quoteId: created.quoteId, urls: created.urls, jobName: q.jobName || '', endClientName: q.endClientName || '' });
      } else {
        results.push({ error: created.error, jobName: q.jobName || '' });
      }
    }
    return { success: results.some(r => r.quoteId), projectId, customerId, results };
  }

  /**
   * One-shot helper for an agent: create (or reuse) a customer, create a
   * project, and generate all of its quotes — in a single call.
   *
   * @param {object} payload
   *   { customer: {…}, project: {…}, quotes: [ {…}, … ],
   *     reuseCustomerByEmail?: boolean }
   */
  async function createFullJob(payload) {
    const c = _cust();
    if (!c) return { success: false, error: 'customer-storage.js not loaded' };
    payload = payload || {};
    const custIn = payload.customer || {};
    let customerId = custIn.customerId;

    if (!customerId && payload.reuseCustomerByEmail !== false && (custIn.email || custIn.name)) {
      const found = await c.findCustomer({ email: custIn.email, name: custIn.name, brand: custIn.brand });
      if (found.success && found.found) customerId = found.customerId;
    }
    if (!customerId) {
      const created = await c.createCustomer(custIn);
      if (!created.success) return { success: false, error: 'createCustomer failed: ' + created.error };
      customerId = created.customerId;
    }

    const projRes = await c.createProject(customerId, payload.project || {});
    if (!projRes.success) return { success: false, error: 'createProject failed: ' + projRes.error };

    const quotesRes = await createQuotesForProject(projRes.projectId, payload.quotes || [], { customerId });
    return {
      success: quotesRes.success,
      customerId,
      projectId: projRes.projectId,
      quotes: quotesRes.results || [],
      error: quotesRes.error
    };
  }

  return {
    createQuote,
    getQuote,
    updateQuote,
    quoteExists,
    generateId,
    getSchema,
    // v2 multi-quote / customer / project
    createCustomer,
    getCustomer,
    findCustomer,
    createProject,
    getProject,
    createQuotesForProject,
    createFullJob,
    exportCustomerBundle
  };
})();
