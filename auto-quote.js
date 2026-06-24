// ═══════════════════════════════════════════════════════════
// MCK AUTO-QUOTE ENGINE v1.0
// Answers ▶ priced quote, margin-aware, "start at the lower end".
//
// Turns a structured set of answers (a job intake) into a complete,
// priced MCK quote WITHOUT a human re-keying it:
//   1. Builds line items from the surfaces answered.
//   2. Costs them with the headless pricing engine (materials + labour).
//   3. Prices at a TARGET MARGIN — defaulting to the FLOOR (lowest
//      compliant price) so quotes "start at the lower end and build to
//      the high end", while never dropping below the hard margin floor.
//   4. Adds job-specific scope, inclusions/exclusions and special
//      conditions (extra coats, extra tiles / substrate prep, wet areas).
//   5. Returns a quote object ready for MCK_AGENT_API.createQuote /
//      createFullJob, and a DECISION (AUTO_APPROVE / REVIEW / HARD_STOP)
//      with a full margin breakdown for record-keeping.
//
// The MCK Payment Terms & Conditions are attached automatically by the
// quote renderer — this engine only needs to produce the quote fields.
//
// ── GUARDRAILS ──────────────────────────────────────────────
//  - Never prices below MARGIN_FLOOR (auto-approve threshold).
//  - Below MARGIN_HARD_STOP → HARD_STOP, quote withheld for a human.
//  - Every decision is returned with the numbers behind it so it can be
//    logged to the tamper-evident ledger (git) and the Drive mirror.
//
// NOTE: the uplift constants below are pricing POLICY defaults — confirm
// them against your real numbers before trusting auto-send.
// ═══════════════════════════════════════════════════════════

(function (root, factory) {
  const engine = (typeof require !== 'undefined') ? require('./pricing-engine')
    : (typeof window !== 'undefined' ? window.MCK_PRICING_ENGINE : null);
  const mod = factory(engine);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (typeof window !== 'undefined') window.MCK_AUTO_QUOTE = mod;
})(this, function (PRICING) {
  'use strict';

  // ── Pricing policy (DEFAULTS — confirm against real numbers) ──
  const MARGIN_FLOOR = 0.40;       // lowest margin we will auto-approve at
  const MARGIN_HARD_STOP = 0.35;   // below this → never auto-send
  const MARGIN_TIERS = { floor: 0.40, standard: 0.50, premium: 0.55 };
  const EXTRA_COAT_UPLIFT = 0.18;  // each extra finish coat adds 18% to that surface's cost
  const TILE_PREP_COST_PER_SQM = 25; // extra cost/sqm to prep & bond over existing tiles
  const MIN_CHARGE = (PRICING && PRICING.MINIMUM_CHARGE_EX_GST) || 2500;

  function round2(n) { return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100; }
  function sellAtMargin(cost, margin) { return margin >= 1 ? cost : cost / (1 - margin); }

  // ── The question set an agent (or a form) fills in ──────────
  function getIntakeSchema() {
    return {
      version: '1.0',
      description: 'Answer these to auto-generate a priced MCK quote.',
      brand: { type: 'string', enum: ['MCK', 'RENDERKING'], default: 'MCK' },
      customer: { name: 'string', email: 'string', phone: 'string', abn: 'string?' },
      project: { name: 'string', siteAddress: 'string' },
      endClient: { name: 'string?', email: 'string?', phone: 'string?', note: 'sub-customer for this specific quote (block-of-units case)' },
      pricing: {
        tier: { type: 'string', enum: ['floor', 'standard', 'premium'], default: 'floor', note: 'floor = lowest compliant price' },
        targetMargin: { type: 'number', note: 'override tier; 0.40 = 40%. Never auto-approved below MARGIN_FLOOR.' }
      },
      surfaces: [{
        surfaceType: { type: 'string', enum: PRICING ? PRICING.RATE_TABLE.map(r => r.surfaceType) : [], note: 'e.g. Floors, Walls, Bathroom (wet area), Benchtops' },
        substrate: { type: 'string', note: 'e.g. Concrete (standard), Existing tiles, Plasterboard' },
        sqm: 'number',
        wetArea: 'boolean?',
        extraCoats: { type: 'number', default: 0, note: 'finish coats beyond the standard system' },
        overTiles: { type: 'boolean?', note: 'applying over existing tiles — adds prep/bond cost + condition' },
        location: 'string? (e.g. "Master ensuite")'
      }],
      finish: 'string? (colour / finish)',
      startDate: 'string?',
      notes: 'string?'
    };
  }

  // ── Cost a single surface (materials + labour, incl. extras) ──
  function costSurface(s) {
    const sqm = Number(s.sqm || 0);
    const item = { surfaceType: s.surfaceType, substrate: s.substrate, sqm };
    const matRate = PRICING.materialRateFor(item);
    const labRate = PRICING.labourRateFor(item);
    let materialCost = sqm * matRate;
    let labourCost = sqm * labRate;

    // Extra finish coats add proportionally to that surface's cost.
    const extraCoats = Math.max(0, Number(s.extraCoats || 0));
    if (extraCoats > 0) {
      const uplift = extraCoats * EXTRA_COAT_UPLIFT;
      materialCost *= (1 + uplift);
      labourCost *= (1 + uplift);
    }
    // Over existing tiles → extra prep/bond cost.
    const overTiles = s.overTiles || /tile/i.test(s.substrate || '');
    if (overTiles) materialCost += sqm * TILE_PREP_COST_PER_SQM;

    return { sqm, materialCost: round2(materialCost), labourCost: round2(labourCost), extraCoats, overTiles, matRate, labRate };
  }

  // ── Job-specific scope / conditions from the answers ─────────
  function buildScopeAndConditions(answers, costed) {
    const inclusions = [
      { text: 'Supply of all microcement materials (Ideal Works / Solidro / supplier equivalent)', enabled: true },
      { text: 'Professional surface preparation', enabled: true },
      { text: 'Base coat and finish coat application', enabled: true },
      { text: 'PU100 / sealer system as per surface rules', enabled: true },
      { text: 'Full clean-up and site protection', enabled: true },
      { text: 'Workmanship warranty as per statutory requirements', enabled: true }
    ];
    const exclusions = [
      { text: 'Structural repairs or substrate rectification', enabled: false },
      { text: 'Plumbing, electrical, or other trade work', enabled: false },
      { text: 'Furniture removal or storage', enabled: false }
    ];
    const specialConditions = [];

    costed.forEach(c => {
      if (c.extraCoats > 0) {
        specialConditions.push(`${c.location || c.surfaceType}: ${c.extraCoats} additional finish coat(s) included for coverage/durability.`);
      }
      if (c.overTiles) {
        specialConditions.push(`${c.location || c.surfaceType}: applied over existing tiles — additional preparation and bonding included. Any drummy, loose, or hollow tiles requiring removal/replacement are a variation.`);
      }
      if (c.wetArea) {
        inclusions.push({ text: `Wet area waterproofing allowance — ${c.location || c.surfaceType}`, enabled: true });
      }
    });

    const surfacesText = costed.map(c => `${c.location ? c.location + ' — ' : ''}${c.surfaceType} (${c.sqm} sqm)`).join('; ');
    const scope = `Supply and apply labour and materials for seamless Microcement to: ${surfacesText}. Samples to be approved and signed off prior to commencement. All preparation included as per inclusions.`;

    return { inclusions, exclusions, specialConditions, scope };
  }

  // ── Price the whole job at a target margin ──────────────────
  function priceFromAnswers(answers, opts) {
    answers = answers || {}; opts = opts || {};
    const surfaces = Array.isArray(answers.surfaces) ? answers.surfaces : [];
    if (!PRICING) return { success: false, error: 'pricing-engine not loaded' };
    if (!surfaces.length) return { success: false, error: 'At least one surface is required.' };

    const tier = (answers.pricing && answers.pricing.tier) || opts.tier || 'floor';
    let targetMargin = (answers.pricing && answers.pricing.targetMargin != null)
      ? Number(answers.pricing.targetMargin)
      : (MARGIN_TIERS[tier] != null ? MARGIN_TIERS[tier] : MARGIN_FLOOR);

    const costed = surfaces.map(s => ({ ...costSurface(s), surfaceType: s.surfaceType, substrate: s.substrate, location: s.location, wetArea: s.wetArea || /wet|bathroom/i.test(s.surfaceType || '') }));
    const totalCost = round2(costed.reduce((s, c) => s + c.materialCost + c.labourCost, 0));

    // Sell the whole job at the target margin, then distribute across
    // surfaces by their share of cost, and lift to the minimum charge.
    let sellTotal = round2(sellAtMargin(totalCost, targetMargin));
    const minApplied = sellTotal < MIN_CHARGE;
    if (minApplied) sellTotal = MIN_CHARGE;

    const lineItems = costed.map(c => {
      const lineCost = c.materialCost + c.labourCost;
      const share = totalCost > 0 ? lineCost / totalCost : (1 / costed.length);
      const lineSell = round2(sellTotal * share);
      // Round the per-sqm rate UP so the realised price never falls below the
      // target — this keeps a floor-tier quote at/above the margin floor.
      const rate = c.sqm > 0 ? Math.ceil(lineSell / c.sqm) : Math.ceil(lineSell);
      const total = c.sqm > 0 ? rate * c.sqm : rate;
      return {
        desc: `Microcement Application${c.location ? ' - ' + c.location : ' - ' + c.surfaceType}`,
        qty: c.sqm, unit: 'sqm', rate, total
      };
    });

    const realisedSubtotal = round2(lineItems.reduce((s, l) => s + l.total, 0));
    // Compare the RAW margin against the floor — never the rounded value, or a
    // 39.6% margin would round to 0.40 and falsely pass the 40% floor.
    const realisedMargin = realisedSubtotal > 0 ? (realisedSubtotal - totalCost) / realisedSubtotal : 0;

    // Decision / guardrail
    let decision, reason;
    if (realisedMargin < MARGIN_HARD_STOP) { decision = 'HARD_STOP'; reason = `Margin ${(realisedMargin * 100).toFixed(1)}% below hard stop ${(MARGIN_HARD_STOP * 100)}%.`; }
    else if (realisedMargin < MARGIN_FLOOR) { decision = 'REVIEW'; reason = `Margin ${(realisedMargin * 100).toFixed(1)}% below auto-approve floor ${(MARGIN_FLOOR * 100)}%.`; }
    else { decision = 'AUTO_APPROVE'; reason = `Margin ${(realisedMargin * 100).toFixed(1)}% at/above floor.`; }

    const tiers = Object.fromEntries(Object.entries(MARGIN_TIERS).map(([k, m]) => [k, round2(Math.max(sellAtMargin(totalCost, m), MIN_CHARGE))]));
    const extras = buildScopeAndConditions(answers, costed);

    return {
      success: true,
      tier, targetMargin,
      lineItems,
      ...extras,
      economics: {
        totalCost, subtotal: realisedSubtotal, marginPercent: round2(realisedMargin * 100),
        minimumChargeApplied: minApplied, priceTiers: tiers
      },
      decision, reason
    };
  }

  // ── Build a full quote object ready for the agent API ───────
  function buildQuote(answers, opts) {
    const priced = priceFromAnswers(answers, opts);
    if (!priced.success) return priced;
    const quote = {
      brand: answers.brand || 'MCK',
      clientName: (answers.customer && answers.customer.name) || (answers.endClient && answers.endClient.name) || '',
      clientEmail: (answers.customer && answers.customer.email) || '',
      clientPhone: (answers.customer && answers.customer.phone) || '',
      projectAddress: (answers.project && answers.project.siteAddress) || '',
      jobName: (answers.endClient && answers.endClient.name) ? answers.endClient.name : (answers.project && answers.project.name) || '',
      endClientName: (answers.endClient && answers.endClient.name) || '',
      endClientEmail: (answers.endClient && answers.endClient.email) || '',
      endClientPhone: (answers.endClient && answers.endClient.phone) || '',
      colourFinish: answers.finish || '',
      scope: priced.scope,
      startDate: answers.startDate || '',
      lineItems: priced.lineItems,
      inclusions: priced.inclusions,
      exclusions: priced.exclusions,
      specialConditions: priced.specialConditions,
      preparedBy: 'MCK Auto-Quote',
      _auto: { decision: priced.decision, reason: priced.reason, economics: priced.economics, tier: priced.tier, generatedAt: new Date().toISOString() }
    };
    return { success: true, quote, decision: priced.decision, reason: priced.reason, economics: priced.economics };
  }

  return {
    getIntakeSchema,
    priceFromAnswers,
    buildQuote,
    config: { MARGIN_FLOOR, MARGIN_HARD_STOP, MARGIN_TIERS, EXTRA_COAT_UPLIFT, TILE_PREP_COST_PER_SQM, MIN_CHARGE }
  };
});
