# Privacy, Access Logging & Backup — recommendations

This covers three things you raised: (1) keeping a log of who accesses the
tools, (2) backing the data up to Google Drive per brand, and (3) making the
GitHub repo private so staff (Stefi, etc.) can use it but the public can't —
**without breaking the quote links you send to clients.**

These are recommendations + what's already wired. Nothing here changes pricing,
terms, or the quote documents.

---

## 1. Access logging (built — staff tools only)

`access-log.js` writes one entry per action to `access-logs/YYYY-MM-DD.json`:

```json
{ "ts": "...", "user": "Stefi", "action": "open|create|export",
  "target": "CUST-AB12CD", "view": "", "meta": {...}, "ua": "..." }
```

It prompts each staff member for their name once per browser. The customer
database logs opens, customer/project creation, and exports.

**Deliberate limit:** it does **not** log public client opens of a quote. Today
the GitHub write token is shipped in the browser bundle, so anything the public
page can do, the public can do — letting anonymous visitors trigger commits
would let them spam/abuse the repo. Client **open / read-receipt** tracking (the
"you can see they opened it and read the terms" feature) should go through a
small backend instead — see §4.

---

## 2. ⚠️ Rotate the embedded API token first

The repo currently ships a GitHub **personal-access token inside client-side
JavaScript** (`quote-storage.js`). Anyone who opens the site can read it from
their browser and gain write access to the repo. Before going private — or
honestly, regardless — that token should be **revoked and reissued**, and ideally
moved off the client entirely (see §4). Going "private" while the token is still
exposed in the page gives a false sense of security.

---

## 3. Going private without breaking client links — the catch

The tension: **staff tools** (generator, dashboards, customer DB, margins) should
be private, but **clients** must open their quote link with no login. So you
can't just flip the whole site to "members only."

How the app reads quotes today:
- GitHub **API** with the embedded token, **and**
- a fallback to **`raw.githubusercontent.com`** (public, works only while the
  repo is public).

If you make the repo private, the public `raw` fallback stops working, and
GitHub Pages from a private repo is gated behind paid/Enterprise plans anyway.

### Recommended setup

**Split public client-viewing from private staff tools, and move the token to a backend.**

1. **Host on Vercel** (the repo already has `vercel.json`; the Vercel
   integration is available). Put the repo **private**; Vercel still deploys it.
2. **Gate the staff pages** — `index.html`, `quotes-dashboard.html`,
   `customers.html`, `backend-editor.html`, `settings` — behind
   **Vercel password protection / Vercel Authentication** (or Cloudflare Access).
   Only staff with the password/login get in.
3. **Keep the client quote viewer public** — `quote-viewer.html` + the read-only
   `quotes/<id>.html` it routes to. Clients open these with no login.
4. **Move the GitHub token into a Vercel serverless function** (a tiny
   `/api/save-quote`, `/api/save-customer` proxy). The browser calls your API;
   the token lives as a server env var and never ships to the client. This is
   what makes "private" actually mean private, and it's what lets you safely add
   client open/read-receipt logging (§4).

Lighter-weight stopgap (not as strong): keep GitHub Pages, leave the client
viewer public, and rely on the existing password gate on the staff pages. That
hides the *UI* but not the underlying JSON or the token, so treat it as interim
only.

---

## 4. Client open / read-receipt tracking (the missing audit piece)

You asked to see when a client **opened** the quote and **read the payment
terms**. The current system records **accepted** and **signed** (timestamp +
signature) but **not opened/read** — see the health-check notes. To add it
safely you need the backend from §3 step 4, then:

- On `quote-viewer.html` load → `POST /api/log-open` → append `{ openedAt, ip,
  ua }` to the quote's event log.
- Add a **"I have read the payment terms & conditions"** checkbox on the T&C
  view, and a scroll-to-bottom check, → `POST /api/log-terms-read` with a
  timestamp, before the signature pad unlocks.
- Surface an **event timeline** per quote on the dashboard: Opened → Terms read →
  Signed → Accepted, each with a time.

Doing this client-only with the exposed token is unsafe (anyone could forge
events or spam commits), so it's intentionally left for the backend step.

---

## 5. Google Drive backup (per brand)

**Available now:** the **EXPORT** button on each customer (and
`MCK_AGENT_API.exportCustomerBundle(customerId)`) produces a single JSON bundle
— customer + all projects + all quotes — which can be saved straight into the
brand's Drive folder. Micro Cement King and Render King bundles are tagged by
`brand`, so they route to separate Drive folders.

**Recommended automation (next step):** a scheduled job (Vercel Cron or a small
agent run) that nightly:
1. lists all customers,
2. builds each brand's bundles,
3. writes them to the matching Google Drive folder
   (`MCK 👑/backups/…` vs `Render King 👑/backups/…`),
4. so Drive mirrors what's in GitHub — backups left, right and centre.

GitHub stays the live database for now; Drive becomes the off-site mirror. When
you're ready to wire the live Drive sync, the export format above is already the
right shape to drop in.
