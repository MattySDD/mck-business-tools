'use strict';

const GST_RATE = 0.10;
const MINIMUM_CHARGE_EX_GST = 2500;

const BRAND = Object.freeze({
  name: 'Micro Cement King',
  shortName: 'MCK',
  domain: 'microcementking.au',
  email: 'projects@microcementking.au',
  phone: '0468 053 819',
  colours: {
    gold: '#C9A84C',
    black: '#0A0A0A',
    white: '#FFFFFF'
  }
});

const RATE_TABLE = Object.freeze([
  { surfaceType: 'Floors', substrate: 'Concrete (standard)', rate: 280, notes: 'Standard prep' },
  { surfaceType: 'Floors', substrate: 'Existing tiles', rate: 350, notes: 'Elevated for tile prep and bonding' },
  { surfaceType: 'Floors', substrate: 'Timber/plywood', rate: 320, notes: 'Requires mesh and flex primer' },
  { surfaceType: 'Walls', substrate: 'Plasterboard', rate: 260, notes: 'Standard' },
  { surfaceType: 'Walls', substrate: 'Rendered/brick', rate: 300, notes: 'Extra prep' },
  { surfaceType: 'Benchtops', substrate: 'Any', rate: 380, notes: 'High detail, small area premium' },
  { surfaceType: 'Bathroom (wet area)', substrate: 'Any', rate: 350, notes: 'Includes waterproofing allowance' },
  { surfaceType: 'Pool surrounds', substrate: 'Concrete', rate: 320, notes: 'Outdoor sealer system' },
  { surfaceType: 'Stairs', substrate: 'Any', rate: 400, notes: 'Complex geometry premium' },
  { surfaceType: 'Fireplace', substrate: 'Any', rate: 420, notes: 'Heat-resistant system' },
  { surfaceType: 'Commercial (one coat)', substrate: 'Any', rate: 180, notes: 'Single coat system for tables, bars, counters, refresh jobs' }
]);

const SERVICE_CATALOGUE = Object.freeze([
  'Floors (residential, any substrate)',
  'Walls (interior)',
  'Bathrooms (full wet area including waterproofing)',
  'Kitchens (benchtops, splashbacks, island benches)',
  'Pool surrounds and outdoor areas',
  'Stairs and feature walls',
  'Fireplaces and hearths',
  'Commercial one-coat refresh (tables, bars, counters, reception desks, retail fixtures)',
  'Feature panels and furniture pieces',
  'Shower niches and bathroom shelving'
]);

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function money(value) {
  const number = Number(value || 0);
  return `$${number.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function roundOne(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10;
}

function findRate(surfaceType, substrate) {
  const st = normalise(surfaceType);
  const sub = normalise(substrate);
  const direct = RATE_TABLE.find(row => normalise(row.surfaceType) === st && normalise(row.substrate) === sub);
  if (direct) return direct;

  const anyMatch = RATE_TABLE.find(row => normalise(row.surfaceType) === st && normalise(row.substrate) === 'any');
  if (anyMatch) return anyMatch;

  if (st === 'floors' && sub.includes('concrete')) return RATE_TABLE.find(row => row.surfaceType === 'Floors' && row.substrate === 'Concrete (standard)');
  if (st === 'floors' && sub.includes('tile')) return RATE_TABLE.find(row => row.surfaceType === 'Floors' && row.substrate === 'Existing tiles');
  if (st === 'floors' && (sub.includes('timber') || sub.includes('ply') || sub.includes('wood'))) return RATE_TABLE.find(row => row.surfaceType === 'Floors' && row.substrate === 'Timber/plywood');
  if (st === 'walls' && (sub.includes('plaster') || sub.includes('board') || sub.includes('villaboard'))) return RATE_TABLE.find(row => row.surfaceType === 'Walls' && row.substrate === 'Plasterboard');
  if (st === 'walls' && (sub.includes('render') || sub.includes('brick') || sub.includes('block'))) return RATE_TABLE.find(row => row.surfaceType === 'Walls' && row.substrate === 'Rendered/brick');
  if (st === 'pool surrounds' && sub.includes('concrete')) return RATE_TABLE.find(row => row.surfaceType === 'Pool surrounds' && row.substrate === 'Concrete');

  return null;
}

function systemTypeFor(item) {
  const surface = normalise(item.surfaceType);
  const substrate = normalise(item.substrate);
  const description = normalise(item.description);

  if (surface.includes('commercial')) return 'commercial_one_coat';
  if (surface.includes('bathroom') || description.includes('bathroom') || description.includes('wet area')) return 'wet_area';
  if (surface.includes('benchtop') || description.includes('bench') || description.includes('counter')) return 'benchtop';
  if (surface.includes('pool') || description.includes('outdoor')) return 'outdoor_pool';
  if (substrate.includes('tile')) return 'tile_substrate';
  return 'standard';
}

function materialRateFor(item) {
  const type = systemTypeFor(item);
  if (type === 'commercial_one_coat') return 25;
  if (type === 'wet_area') return 60;
  if (type === 'benchtop') return 50;
  if (type === 'outdoor_pool') return 55;
  if (type === 'tile_substrate') return 55;
  return 45;
}

function labourRateFor(item) {
  const surface = normalise(item.surfaceType);
  const type = systemTypeFor(item);
  if (surface.includes('stairs') || surface.includes('fireplace')) return 120;
  if (type === 'commercial_one_coat') return 50;
  if (type === 'wet_area') return 100;
  return 80;
}

function labourHoursPerSqm(item) {
  const surface = normalise(item.surfaceType);
  const type = systemTypeFor(item);
  if (surface.includes('stairs') || surface.includes('fireplace')) return 1.5;
  if (type === 'wet_area') return 1.25;
  if (type === 'commercial_one_coat') return 0.55;
  if (type === 'benchtop') return 1.1;
  return 1;
}

function materialItemsFor(item) {
  const sqm = Number(item.sqm || 0);
  const type = systemTypeFor(item);
  const wasteFactor = 1.10;
  const adjustedSqm = roundOne(sqm * wasteFactor);
  const base = [
    { item: 'Microcement base coat', quantity: `${Math.ceil(adjustedSqm / 10)} x 10kg pails`, basis: `${adjustedSqm} sqm including 10% waste` },
    { item: 'Microcement finish coat', quantity: `${Math.ceil(adjustedSqm / 12)} x 10kg pails`, basis: `${adjustedSqm} sqm including 10% waste` },
    { item: 'Primer', quantity: `${Math.ceil(adjustedSqm / 25)} x 5L units`, basis: `${adjustedSqm} sqm including 10% waste` },
    { item: 'Sealer system', quantity: `${Math.ceil(adjustedSqm / 20)} x 5L kits`, basis: `${adjustedSqm} sqm including 10% waste` },
    { item: 'Masking, abrasives, consumables', quantity: 'Allowance', basis: 'Project allowance' }
  ];

  if (type === 'tile_substrate') {
    base.unshift({ item: 'Bonding agent for tile substrate', quantity: `${Math.ceil(adjustedSqm / 20)} x 5L units`, basis: 'Tile preparation allowance' });
  }

  if (type === 'wet_area') {
    base.unshift({ item: 'Waterproofing membrane allowance', quantity: `${Math.ceil(adjustedSqm / 12)} x 15L units`, basis: 'Wet area waterproofing allowance' });
    base.push({ item: 'Wet area detail tape and penetrations', quantity: 'Allowance', basis: 'Corners, wastes, niches, shelving and junctions' });
  }

  if (type === 'commercial_one_coat') {
    return [
      { item: 'Commercial one-coat microcement finish', quantity: `${Math.ceil(adjustedSqm / 15)} x 10kg pails`, basis: `${adjustedSqm} sqm including 10% waste` },
      { item: 'Surface preparation primer', quantity: `${Math.ceil(adjustedSqm / 25)} x 5L units`, basis: 'Timber and counter refresh preparation' },
      { item: 'Commercial topcoat sealer', quantity: `${Math.ceil(adjustedSqm / 20)} x 5L kits`, basis: 'Hospitality surface protection allowance' },
      { item: 'Masking, abrasives, consumables', quantity: 'Allowance', basis: 'After-hours commercial refresh pack' }
    ];
  }

  if (type === 'benchtop') {
    base.push({ item: 'Benchtop detail tools and edge consumables', quantity: 'Allowance', basis: 'Corners, edges, joins and small area detail' });
  }

  if (type === 'outdoor_pool') {
    base.push({ item: 'Outdoor UV stable sealer upgrade', quantity: `${Math.ceil(adjustedSqm / 18)} x 5L kits`, basis: 'Pool surround and exterior exposure allowance' });
  }

  return base;
}

function mergeMaterialItems(items) {
  const merged = [];
  items.forEach(item => {
    const existing = merged.find(row => row.item === item.item && row.quantity === item.quantity);
    if (existing) {
      existing.basis = `${existing.basis}; ${item.basis}`;
    } else {
      merged.push({ ...item });
    }
  });
  return merged;
}

function calculateQuote(rawQuote) {
  const quote = JSON.parse(JSON.stringify(rawQuote || {}));
  quote.lineItems = Array.isArray(quote.lineItems) ? quote.lineItems : [];

  const calculatedItems = quote.lineItems.map((item, index) => {
    const match = findRate(item.surfaceType, item.substrate);
    const rate = item.rateOverride != null ? Number(item.rateOverride) : (match ? match.rate : 0);
    const sqm = Number(item.sqm || 0);
    const displaySqm = roundOne(sqm);
    const revenue = roundCurrency(sqm * rate);
    const materialRate = materialRateFor(item);
    const labourRate = labourRateFor(item);
    const materialCost = roundCurrency(sqm * materialRate);
    const labourCost = roundCurrency(sqm * labourRate);
    const labourHours = roundOne(sqm * labourHoursPerSqm(item));

    return {
      id: item.id || `LI-${index + 1}`,
      description: item.description || `${item.surfaceType} over ${item.substrate}`,
      surfaceType: item.surfaceType,
      substrate: item.substrate || 'Unknown',
      sqm: displaySqm,
      rate,
      notes: item.notes || (match ? match.notes : 'Rate requires review'),
      systemType: systemTypeFor(item),
      revenue,
      materialRate,
      materialCost,
      labourRate,
      labourCost,
      labourHours,
      labourDays: roundOne(labourHours / 16),
      crewSize: 2,
      materialItems: materialItemsFor(item),
      rateStatus: match ? 'matched' : 'review_required'
    };
  });

  const rawSubtotal = roundCurrency(calculatedItems.reduce((sum, item) => sum + item.revenue, 0));
  const minimumAdjustment = rawSubtotal > 0 && rawSubtotal < MINIMUM_CHARGE_EX_GST ? roundCurrency(MINIMUM_CHARGE_EX_GST - rawSubtotal) : 0;
  const subtotalExGst = roundCurrency(rawSubtotal + minimumAdjustment);
  const gst = roundCurrency(subtotalExGst * GST_RATE);
  const totalIncGst = roundCurrency(subtotalExGst + gst);
  const materialCost = roundCurrency(calculatedItems.reduce((sum, item) => sum + item.materialCost, 0));
  const labourCost = roundCurrency(calculatedItems.reduce((sum, item) => sum + item.labourCost, 0));
  const totalCost = roundCurrency(materialCost + labourCost);
  const grossProfit = roundCurrency(subtotalExGst - totalCost);
  const marginPercent = subtotalExGst > 0 ? roundOne((grossProfit / subtotalExGst) * 100) : 0;
  const marginStatus = marginPercent >= 40 ? 'PASS' : marginPercent >= 35 ? 'FLAG' : 'HARD STOP';
  const canSend = marginStatus !== 'HARD STOP' || Boolean(quote.override && quote.override.approved);
  const totalSqm = roundOne(calculatedItems.reduce((sum, item) => sum + Number(item.sqm || 0), 0));
  const crewSize = totalSqm >= 30 ? 1 : 2;
  const dailyHoursPerPerson = 8;
  const totalCrewHoursPerDay = crewSize * dailyHoursPerPerson;
  const rawLabourHours = roundOne(calculatedItems.reduce((sum, item) => sum + item.labourHours, 0));
  const rawLabourDays = Math.ceil(rawLabourHours / totalCrewHoursPerDay);
  const MINIMUM_DAYS = 3;
  const labourDays = Math.max(rawLabourDays, MINIMUM_DAYS);
  const totalLabourHours = roundOne(labourDays * totalCrewHoursPerDay);

  const paymentSchedule = [
    { stage: 'BOOKING DEPOSIT', percent: subtotalExGst > 20000 ? 5 : 10, exGst: roundCurrency(subtotalExGst * (subtotalExGst > 20000 ? 0.05 : 0.10)) },
    { stage: 'MATERIAL PAYMENT', percent: subtotalExGst > 20000 ? 45 : 40, exGst: roundCurrency(subtotalExGst * (subtotalExGst > 20000 ? 0.45 : 0.40)) },
    { stage: 'COMMENCEMENT', percent: 40, exGst: roundCurrency(subtotalExGst * 0.40) },
    { stage: 'FINAL (SEALER)', percent: 10, exGst: roundCurrency(subtotalExGst * 0.10) }
  ].map(stage => ({
    ...stage,
    gst: roundCurrency(stage.exGst * GST_RATE),
    incGst: roundCurrency(stage.exGst * (1 + GST_RATE))
  }));

  const allMaterials = mergeMaterialItems(calculatedItems.flatMap(item => item.materialItems));

  return {
    ...quote,
    brand: BRAND,
    calculatedAt: new Date().toISOString(),
    lineItems: calculatedItems,
    minimumAdjustment,
    totals: {
      rawSubtotal,
      subtotalExGst,
      gst,
      totalIncGst,
      materialCost,
      labourCost,
      totalCost,
      grossProfit,
      marginPercent,
      marginStatus,
      canSend
    },
    allowances: {
      materialOrderList: allMaterials,
      totalLabourHours,
      labourDays,
      crewSize,
      dailyHoursPerPerson,
      totalCrewHoursPerDay,
      totalSqm,
      minimumDaysApplied: rawLabourDays < MINIMUM_DAYS
    },
    paymentSchedule
  };
}

function formatCalculationSummary(calculatedQuote) {
  const t = calculatedQuote.totals;
  return [
    `REVENUE EX GST: ${money(t.subtotalExGst)}`,
    `MATERIALS: ${money(t.materialCost)}`,
    `LABOUR: ${money(t.labourCost)}`,
    `TOTAL COST: ${money(t.totalCost)}`,
    `MARGIN: ${t.marginPercent}%`,
    `STATUS: ${t.marginStatus}`
  ].join('\n');
}

const MCK_PRICING_ENGINE = {
  GST_RATE,
  MINIMUM_CHARGE_EX_GST,
  BRAND,
  RATE_TABLE,
  SERVICE_CATALOGUE,
  money,
  roundCurrency,
  roundOne,
  findRate,
  systemTypeFor,
  materialRateFor,
  labourRateFor,
  labourHoursPerSqm,
  calculateQuote,
  formatCalculationSummary
};

// UMD: usable from Node (agent) and the browser (static app)
if (typeof module !== 'undefined' && module.exports) module.exports = MCK_PRICING_ENGINE;
if (typeof window !== 'undefined') window.MCK_PRICING_ENGINE = MCK_PRICING_ENGINE;
