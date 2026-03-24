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

  return {
    createQuote,
    getQuote,
    updateQuote,
    quoteExists,
    generateId,
    getSchema
  };
})();
