# Autonomous Quoting + Tamper-Proof Records + Drive Backup

This explains three connected things you asked for:
1. A **consistent, tamper-proof record** of every quote that can't be altered or diluted.
2. **Automatic Google Drive backup** per brand.
3. An **agent that quotes for you** — understands the margin, prices from the
   low end up, and writes job-specific terms — instead of you approving each one.

And it answers the bigger question: **is this even the right setup for it?**

---

## 1. Is this the best scenario? — short answer

The browser-only app was right for a *manual* quote generator. For what you now
want — an agent that quotes on its own, records that can't be tampered with, and
automatic backups — the system should grow a **small backend**. Recommended shape:

```
            ┌─────────────── PRESENTATION ───────────────┐
   Staff →  index.html / customers.html (private, gated)   ← human edits/overrides
   Client → quote-viewer.html (public, read-only)
            └────────────────────┬───────────────────────┘
                                 │ calls /api/*
            ┌──────────────── BACKEND (Vercel functions) ─┐
   Auto-quote agent ── pricing-engine.js + auto-quote.js  │ ← runs server-side,
   Save / accept / log ── holds the GitHub token          │   not in a browser tab
            └──────────┬───────────────────┬──────────────┘
                       │                   │
              GitHub (ledger)      Google Drive (mirror)
              hash-chained,        per-brand folders,
              append-only          PDF + JSON + hash
```

Why a backend: the agent and the backups need to run **consistently** (on every
quote/accept), not only when someone has a tab open — and the GitHub token must
move off the client (see PRIVACY-AND-BACKUP.md). The pricing/auto-quote engines
are already written to run headlessly (Node **or** browser), so they drop
straight into a Vercel function.

The pieces that exist **today** (no backend needed): `pricing-engine.js`,
`auto-quote.js`, `MCK_AGENT_API.autoQuote(...)`, the customer/project model, and
the manual Drive export. The backend is what makes them *automatic* and *secure*.

---

## 2. Tamper-proof record-keeping — how it works

The goal: a saviour copy of every quote that **cannot be tampered with or
diluted**. Layers, strongest first:

1. **Git is already a tamper-evident ledger.** Every save is a commit identified
   by a SHA-256 hash that includes the hash of the commit before it. Changing any
   past quote changes its hash and breaks the chain — it's detectable. Turn on
   **branch protection on `main`** (no force-push, no history rewrite) and that
   chain can't be quietly edited.
2. **Append-only, never destructive.** Revisions are saved as new `-vN` files and
   the customer/project files are updated with safe read-modify-write — history is
   added to, not overwritten.
3. **Content hash at acceptance.** When a client accepts/signs, record a
   SHA-256 of the exact accepted quote JSON (`acceptedHash`). Any later change to
   that quote won't match the stored hash — proof of tampering.
4. **Off-site mirror (Drive).** The backend writes an immutable copy (PDF + JSON +
   the hash) to the brand's Drive folder. Two independent stores must now agree.
5. **Access log.** `access-logs/…` already records who did what, when.

Together: the live record (GitHub) is hash-chained and protected; the accepted
record carries its own fingerprint; and an independent off-site copy exists. To
"dilute" a record you'd have to break all of them at once, which leaves evidence.

---

## 3. Google Drive backup — best way to do it

**Best way:** a **GitHub → Vercel function → Drive** webhook. On every quote
commit (and especially on acceptance), the function:
1. reads the quote JSON,
2. renders/attaches the PDF,
3. computes the content hash,
4. writes all three to the right brand folder, e.g.
   `MCK 👑/quotes/{customerName}/{quoteId}__{timestamp}__{hash}.pdf` (+ `.json`),
5. appends a line to a `backup-manifest.json` in that folder.

This is consistent (fires automatically), routed by brand (`brand` field →
`MCK 👑` vs `Render King 👑`), and the filename carries the hash so a backup can
be verified against the ledger. The agent "documents where it goes" by writing
that manifest.

**To switch it on I need from you:** (a) approval to stand up the Vercel function,
and (b) the Drive folder for each brand (or let me create `MCK 👑/quotes` and
`Render King 👑/quotes`). I have not touched your Drive yet.

---

## 4. The autonomous quoting agent — how it prices

Files: `pricing-engine.js` (cost + margin) and `auto-quote.js` (answers → quote).

### The question set (`MCK_AGENT_API.getAutoQuoteSchema()`)
Per job: brand, customer, project, optional end-client (the block-of-units
sub-customer), and one or more **surfaces** — each with `surfaceType`,
`substrate`, `sqm`, and optional `wetArea`, `extraCoats`, `overTiles`, `location`.
Plus a pricing `tier` (`floor` / `standard` / `premium`) or an explicit
`targetMargin`.

### Pricing — "start at the lower end, build to the high end"
1. Cost each surface from the engine's material + labour rates.
2. **Extra coats** add a per-coat uplift to that surface's cost; **over existing
   tiles** adds a prep/bond cost — both are also written into the special
   conditions, job-specific.
3. Sell the job at the **target margin**. Default tier is **`floor` (40% margin)**
   — the **lowest price that still protects margin** — and it scales up:

   | Tier | Margin | Meaning |
   |---|---|---|
   | floor | 40% | lowest compliant price — start here |
   | standard | 50% | |
   | premium | 55% | high end |

   Every quote returns all three `priceTiers` so you can move up without re-costing.

### The guardrails (so "no approval" is safe)
- **40% floor** = auto-approve threshold. **35% = hard stop.**
- The result carries a `decision`:
  - `AUTO_APPROVE` — margin ≥ 40%, save it.
  - `REVIEW` — between 35–40%, held unless you pass `allowReview`.
  - `HARD_STOP` — below 35%, **never auto-saved**; a human must look.
- Minimum charge ($2,500 ex GST) is enforced.
- The MCK Payment Terms & Conditions (incl. the confidentiality/$30k clause) are
  attached automatically by the renderer — every auto-quote carries them.

### One call, end to end
```js
const r = await MCK_AGENT_API.autoQuote(answers, {
  tier: 'floor',          // lowest compliant price
  projectId: 'PROJ-…',    // optional: file under a project
  customerId: 'CUST-…',
  // dryRun: true,        // price only, don't save
  // allowReview: true,   // also save 35–40% quotes
});
// → { success, decision, reason, economics:{ totalCost, subtotal, marginPercent, priceTiers }, quoteId|results, urls }
```
`dryRun: true` gives you the full price + margin breakdown without saving — ideal
for a "shadow" rollout.

### Recommended rollout
Run it in **shadow mode** first: `dryRun` (or `allowReview` off) for a few weeks,
spot-check the numbers against jobs you'd have priced by hand, and confirm the
policy constants in `auto-quote.js` (`EXTRA_COAT_UPLIFT`, `TILE_PREP_COST_PER_SQM`,
the tier margins). Once you trust it, flip on `AUTO_APPROVE` saving. The hard-stop
floor stays on permanently.

> ⚠️ The uplift/margin constants in `auto-quote.js` are **policy defaults** —
> please confirm them against your real costs before trusting auto-send.
