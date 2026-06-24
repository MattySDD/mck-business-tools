# Multiple Quotes per Customer — Customer ▸ Project ▸ Quotes

This adds a three-tier structure on top of the existing quote system so you can
run **repeat / ongoing work** for a customer without losing track of anything.

```
CUSTOMER            ACME Builders (the account we bill — often a builder)
  └─ PROJECT         Teemangum St — 15-unit block (one job / site)
       ├─ QUOTE      MCK-2026-7298   Unit 1 bathroom   (end client: J. Owner)
       ├─ QUOTE      MCK-2026-8039   Unit 2 bathroom   (end client: K. Owner)
       └─ QUOTE      MCK-2026-8519   Unit 3 ensuite    (end client: L. Owner)
  └─ PROJECT         Burleigh café fitout
       ├─ QUOTE      Option A — full floor
       └─ QUOTE      Option B — feature wall only
```

- A **Customer** is the repeat account (e.g. a builder giving us 100 jobs/year).
- A **Project** groups every quote for one job or site.
- A **Quote** is a single distinct quote. A project can hold many quotes —
  different rooms, different options/variations, **or different end-clients**
  (the block-of-units case: the builder is the customer, but each unit owner is
  the end-client on their own quote).
- Existing `-vN` revisions still work unchanged — they're versions of *one*
  quote; the dashboard shows only the latest version per quote.

Quotes still produce the **same** documents (client quote, T&Cs, internal/margin
view). Nothing about the quote format, calculator, or terms changed — we only
added the grouping layer around it.

## For staff — `customers.html`

1. Open **customers.html**, enter the password (same as settings), and put your
   name in when prompted (this is recorded in the access log).
2. **+ NEW CUSTOMER** — create the builder/account once. Pick the brand
   (Micro Cement King or Render King).
3. Expand the customer → **+ PROJECT** — create the job/site.
4. On a project → **+ NEW QUOTE** — this opens the normal quote generator with a
   gold banner showing which project (and optional end-client) it will be filed
   under. Build and **Share** the quote as usual; it's automatically filed under
   that project.
5. **EXPORT** on a customer downloads a full JSON backup (customer + projects +
   all quotes) ready to drop into that brand's Google Drive folder.

Reaching it: **Pipeline dashboard → CUSTOMERS** button, or open `customers.html`.

## For an AI agent — `MCK_AGENT_API` (v2)

Load `quote-storage.js`, `customer-storage.js`, and `agent-api.js`, then:

### One-shot: create a whole job

```js
const result = await MCK_AGENT_API.createFullJob({
  customer: { name: 'ACME Builders', email: 'ops@acme.com', abn: '12 345 678 901', brand: 'MCK' },
  project:  { name: 'Teemangum St — 15-unit block', siteAddress: '5/4 Teemangum St, Tugun QLD' },
  quotes: [
    { jobName: 'Unit 1 bathroom', endClientName: 'J. Owner',
      lineItems: [{ desc: 'Microcement — floor', qty: 10, unit: 'sqm', rate: 300 }] },
    { jobName: 'Unit 2 bathroom', endClientName: 'K. Owner',
      lineItems: [{ desc: 'Microcement — floor', qty: 12, unit: 'sqm', rate: 300 }] }
  ],
  reuseCustomerByEmail: true   // if a customer with this email exists, reuse it
});
// → { success, customerId, projectId, quotes: [{ quoteId, urls, jobName, endClientName }] }
```

`reuseCustomerByEmail` (default true) means a repeat customer is **not**
duplicated — the second job is added under the existing account.

### Step by step

```js
const c = await MCK_AGENT_API.createCustomer({ name, email, phone, abn, brand });
const p = await MCK_AGENT_API.createProject(c.customerId, { name, siteAddress });
const q = await MCK_AGENT_API.createQuotesForProject(p.projectId, [ quoteA, quoteB ]);
```

### Other methods

| Method | Purpose |
|---|---|
| `findCustomer({ email, name, brand })` | Look up an existing account before creating |
| `getCustomer(customerId)` / `getProject(projectId)` | Read records |
| `createQuote(quoteData)` | Single standalone quote (unchanged, still works) |
| `exportCustomerBundle(customerId)` | Full backup object for Drive/off-site |

### Per-quote fields for the block-of-units case

Any quote object may carry, in addition to the normal quote fields:

- `jobName` — label for this quote within the project (e.g. "Unit 3 ensuite")
- `endClientName`, `endClientEmail`, `endClientPhone` — the sub-customer for
  this specific quote (the unit owner), distinct from the billing customer.
- `customerId`, `projectId`, `brand` — set automatically by the helpers above.

## Where the data lives

| File | Contents |
|---|---|
| `customers/CUST-XXXXXX.json` | One customer/account |
| `projects/PROJ-XXXXXX.json` | One project + denormalised list of its quotes |
| `customers/_index.json`, `projects/_index.json` | Fast lists for the dashboard |
| `quotes/MCK-….json` | Quotes (unchanged) — now carry `customerId`/`projectId` |
| `access-logs/YYYY-MM-DD.json` | Who used the internal tools, and when |

All writes use a **read-modify-write with conflict retry**
(`MCK_QUOTE_STORAGE.ghUpdateFile`) so two staff/agents saving at once don't
overwrite each other.

See **PRIVACY-AND-BACKUP.md** for the Google Drive backup plan and how to take
the repo private without breaking client quote links.
