# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tests\full_test.spec.js >> Healthcare Portal — Full Feature Demo >> End-to-end demo of all features
- Location: e2e-tests\full_test.spec.js:318:3

# Error details

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Test source

```ts
  1   | /**
  2   |  * COMPREHENSIVE E2E DEMO — Single Session
  3   |  *
  4   |  * One continuous browser walk-through that demos every feature the way the
  5   |  * project owner narrated it. Designed to be run headed:
  6   |  *
  7   |  *   npx playwright test e2e-tests/full_test.spec.js --headed
  8   |  *
  9   |  * Demo arc:
  10  |  *   1.  Login with bad credentials → register Sham (sham@gmail.com / 123456)
  11  |  *   2.  Wait, click "Profile Status: Incomplete" card → fill age=15, gender=Male
  12  |  *   3.  My Appointments — empty
  13  |  *   4.  AI Assistant — leg injury / pain 8 / 1 day → recommends Orthopedics
  14  |  *   5.  Browse → filter Orthopedics → open dr_arjun profile (5 s read)
  15  |  *   6.  Search "dr_arjun" → Book → today 5 PM slot + symptoms → Pay (Razorpay)
  16  |  *   7.  DON'T pay — close modal → land on My Appointments showing Awaiting Payment
  17  |  *   8.  Pay from there via Netbanking → "Paid + Pending"
  18  |  *   9.  Book Dr. Joshi for tomorrow → pay netbanking → 3-4 s success view
  19  |  *  10.  Cancel Dr. Joshi → Cancelled tab shows Refunded
  20  |  *  11.  Dashboard shows 1 upcoming + notification bar (booked-not-confirmed)
  21  |  *  12.  Login dr_arjun (5 s), Today's Appointments → cycle filters → Accept Sham
  22  |  *  13.  Add to Calendar → Google Calendar option (just open menu)
  23  |  *  14.  Doctor notifications, availability (add today slot, save, Out of Clinic)
  24  |  *  15.  Doctor profile, logout
  25  |  *  16.  Login Sham → notification shows confirmed appointment
  26  |  *  17.  Logout, login dr_arjun → Mark Complete → prescription (Paracetamol …)
  27  |  *  18.  Login Sham → Past tab → view prescription → rate doctor 5★ + comment
  28  |  *  19.  Login admin → 5-6 s on dashboard → charts → CSV exports → reviews/activity
  29  |  *       → user management → statistics
  30  |  *  20.  Logout → register a NEW doctor → admin approves → patient sees doctor
  31  |  *  21.  Back to admin dashboard, leave it there
  32  |  */
  33  | const { test, expect } = require('@playwright/test');
  34  | 
  35  | const BASE = 'http://localhost:3000';
  36  | const API  = 'http://localhost:8080';
  37  | 
  38  | // ── Fixtures ─────────────────────────────────────────────────────────────────
  39  | // Each run uses a fresh shamm<ts> account + random email — never collides.
  40  | const TS = Date.now().toString().slice(-6);
  41  | const SHAM     = {
  42  |   username: `shamm${TS}`,
  43  |   email:    `shamm${TS}@gmail.com`,
  44  |   password: '123456',
  45  | };
  46  | const DR_ARJUN = { username: 'dr_arjun',  password: 'doctor123' };
  47  | const DR_AMIT  = { username: 'dr_amit',   password: 'doctor123' };
  48  | const ADMIN    = { username: 'admin',     password: 'admin123'  };
  49  | 
  50  | const NEW_DOC = {
  51  |   username: `dr_demo_${TS}`,
  52  |   email:    `dr_demo_${TS}@hosp.com`,
  53  |   password: 'doctor123',
  54  | };
  55  | 
  56  | // ── Pacing ───────────────────────────────────────────────────────────────────
  57  | const TICK = 200;
  58  | const BEAT = 600;
  59  | const READ = 1000;
  60  | 
  61  | const log = (m) => console.log(`\n▶ ${m}`);
  62  | const sub = (m) => console.log(`  · ${m}`);
> 63  | const sleep = (page, ms = TICK) => page.waitForTimeout(ms);
      |                                         ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  64  | 
  65  | // Floating banner so the audience can read what's happening on stage
  66  | async function banner(page, text, ms = 2200) {
  67  |   await page.evaluate(({ text }) => {
  68  |     const id = '__demo_banner__';
  69  |     document.getElementById(id)?.remove();
  70  |     const el = document.createElement('div');
  71  |     el.id = id;
  72  |     el.textContent = text;
  73  |     Object.assign(el.style, {
  74  |       position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
  75  |       zIndex: 2147483647, padding: '10px 22px', borderRadius: '999px',
  76  |       background: 'rgba(25,118,210,0.95)', color: '#fff',
  77  |       font: '600 14px/1.2 system-ui, sans-serif', letterSpacing: '0.3px',
  78  |       boxShadow: '0 6px 20px rgba(0,0,0,0.25)', pointerEvents: 'none',
  79  |       maxWidth: '88vw', textAlign: 'center',
  80  |     });
  81  |     document.body.appendChild(el);
  82  |   }, { text }).catch(() => {});
  83  |   await sleep(page, ms);
  84  |   await page.evaluate(() => document.getElementById('__demo_banner__')?.remove()).catch(() => {});
  85  | }
  86  | 
  87  | // ── Auth helpers ─────────────────────────────────────────────────────────────
  88  | async function login(page, username, password) {
  89  |   await page.goto(`${BASE}/login`);
  90  |   await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
  91  |   await page.fill('input[autocomplete="username"]', username);
  92  |   await page.fill('input[autocomplete="current-password"]', password);
  93  |   await page.getByRole('button', { name: /sign in/i }).click();
  94  |   await page.waitForURL('**/dashboard**', { timeout: 20000 });
  95  |   await sleep(page, BEAT);
  96  | }
  97  | 
  98  | async function logout(page) {
  99  |   const btn = page.getByRole('button', { name: /logout/i });
  100 |   if ((await btn.count()) > 0) {
  101 |     await btn.click();
  102 |     const ok = page.getByRole('button', { name: /^log out$/i });
  103 |     await ok.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  104 |     if ((await ok.count()) > 0) await ok.click();
  105 |   }
  106 |   await page.waitForURL('**/login**', { timeout: 10000 }).catch(() => {});
  107 |   await sleep(page, BEAT);
  108 | }
  109 | 
  110 | const sidebar = (page) => page.locator('.MuiDrawer-root');
  111 | const themeBtn = (page) => page.locator(
  112 |   'button:has(svg[data-testid="DarkModeIcon"]), button:has(svg[data-testid="LightModeIcon"])'
  113 | ).first();
  114 | 
  115 | // ── Razorpay test-mode driver ────────────────────────────────────────────────
  116 | // Drives the real Razorpay test-mode iframe: Netbanking → first bank → Pay → Success.
  117 | async function payWithNetbanking(page) {
  118 |   const frameEl = page.locator('iframe.razorpay-checkout-frame');
  119 |   await frameEl.waitFor({ state: 'attached', timeout: 25000 }).catch(() => {});
  120 |   if (!(await frameEl.count())) {
  121 |     sub('Razorpay modal did not open');
  122 |     return false;
  123 |   }
  124 |   // Give the iframe content time to render
  125 |   await sleep(page, 3500);
  126 |   const f = page.frameLocator('iframe.razorpay-checkout-frame');
  127 | 
  128 |   try {
  129 |     // Optional contact-info screen (some flows show this first)
  130 |     const contact = f.locator('input[name="contact"], input[placeholder*="phone" i]').first();
  131 |     if (await contact.isVisible({ timeout: 2000 }).catch(() => false)) {
  132 |       await contact.fill('9489123030').catch(() => {});
  133 |       const email = f.locator('input[name="email"], input[type="email"]').first();
  134 |       if (await email.isVisible({ timeout: 1000 }).catch(() => false)) {
  135 |         await email.fill(SHAM.email).catch(() => {});
  136 |       }
  137 |       const cont = f.locator('button', { hasText: /continue|proceed|next/i }).first();
  138 |       if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
  139 |         await cont.click().catch(() => {});
  140 |         await sleep(page, 2000);
  141 |       }
  142 |     }
  143 | 
  144 |     // Click "Netbanking" payment-method tile (multiple selector attempts)
  145 |     sub('  → click Netbanking');
  146 |     const netbankingSelectors = [
  147 |       f.locator('[data-method="netbanking"]').first(),
  148 |       f.locator('label[for="method-netbanking"], div[role="button"]:has-text("Netbanking")').first(),
  149 |       f.locator('button, div, label').filter({ hasText: /^Netbanking$/i }).first(),
  150 |       f.locator('text=/^netbanking$/i').first(),
  151 |     ];
  152 |     let nbClicked = false;
  153 |     for (const loc of netbankingSelectors) {
  154 |       if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
  155 |         await loc.click().catch(() => {});
  156 |         nbClicked = true; break;
  157 |       }
  158 |     }
  159 |     if (!nbClicked) throw new Error('Netbanking tile not found');
  160 |     await sleep(page, 2000);
  161 | 
  162 |     // Select a bank — try popular bank labels first (most reliable on test mode)
  163 |     sub('  → select a bank');
```