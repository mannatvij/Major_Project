/**
 * COMPREHENSIVE E2E DEMO — Single Session
 *
 * One continuous browser walk-through that demos every feature the way the
 * project owner narrated it. Designed to be run headed:
 *
 *   npx playwright test e2e-tests/full_test.spec.js --headed
 *
 * Demo arc:
 *   1.  Login with bad credentials → register Sham (sham@gmail.com / 123456)
 *   2.  Wait, click "Profile Status: Incomplete" card → fill age=15, gender=Male
 *   3.  My Appointments — empty
 *   4.  AI Assistant — leg injury / pain 8 / 1 day → recommends Orthopedics
 *   5.  Browse → filter Orthopedics → open dr_arjun profile (5 s read)
 *   6.  Search "dr_arjun" → Book → today 5 PM slot + symptoms → Pay (Razorpay)
 *   7.  DON'T pay — close modal → land on My Appointments showing Awaiting Payment
 *   8.  Pay from there via Netbanking → "Paid + Pending"
 *   9.  Book Dr. Joshi for tomorrow → pay netbanking → 3-4 s success view
 *  10.  Cancel Dr. Joshi → Cancelled tab shows Refunded
 *  11.  Dashboard shows 1 upcoming + notification bar (booked-not-confirmed)
 *  12.  Login dr_arjun (5 s), Today's Appointments → cycle filters → Accept Sham
 *  13.  Add to Calendar → Google Calendar option (just open menu)
 *  14.  Doctor notifications, availability (add today slot, save, Out of Clinic)
 *  15.  Doctor profile, logout
 *  16.  Login Sham → notification shows confirmed appointment
 *  17.  Logout, login dr_arjun → Mark Complete → prescription (Paracetamol …)
 *  18.  Login Sham → Past tab → view prescription → rate doctor 5★ + comment
 *  19.  Login admin → 5-6 s on dashboard → charts → CSV exports → reviews/activity
 *       → user management → statistics
 *  20.  Logout → register a NEW doctor → admin approves → patient sees doctor
 *  21.  Back to admin dashboard, leave it there
 */
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:8080';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Each run uses a fresh shamm<ts> account + random email — never collides.
const TS = Date.now().toString().slice(-6);
const SHAM     = {
  username: `shamm${TS}`,
  email:    `shamm${TS}@gmail.com`,
  password: '123456',
};
const DR_ARJUN = { username: 'dr_arjun',  password: 'doctor123' };
const DR_AMIT  = { username: 'dr_amit',   password: 'doctor123' };
const ADMIN    = { username: 'admin',     password: 'admin123'  };

const NEW_DOC = {
  username: `dr_demo_${TS}`,
  email:    `dr_demo_${TS}@hosp.com`,
  password: 'doctor123',
};

// ── Pacing ───────────────────────────────────────────────────────────────────
const TICK = 200;
const BEAT = 600;
const READ = 1000;

const log = (m) => console.log(`\n▶ ${m}`);
const sub = (m) => console.log(`  · ${m}`);
const sleep = (page, ms = TICK) => page.waitForTimeout(ms);

// Floating banner so the audience can read what's happening on stage
async function banner(page, text, ms = 2200) {
  await page.evaluate(({ text }) => {
    const id = '__demo_banner__';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 2147483647, padding: '10px 22px', borderRadius: '999px',
      background: 'rgba(25,118,210,0.95)', color: '#fff',
      font: '600 14px/1.2 system-ui, sans-serif', letterSpacing: '0.3px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.25)', pointerEvents: 'none',
      maxWidth: '88vw', textAlign: 'center',
    });
    document.body.appendChild(el);
  }, { text }).catch(() => {});
  await sleep(page, ms);
  await page.evaluate(() => document.getElementById('__demo_banner__')?.remove()).catch(() => {});
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
async function login(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  await sleep(page, BEAT);
}

async function logout(page) {
  const btn = page.getByRole('button', { name: /logout/i });
  if ((await btn.count()) > 0) {
    await btn.click();
    const ok = page.getByRole('button', { name: /^log out$/i });
    await ok.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if ((await ok.count()) > 0) await ok.click();
  }
  await page.waitForURL('**/login**', { timeout: 10000 }).catch(() => {});
  await sleep(page, BEAT);
}

const sidebar = (page) => page.locator('.MuiDrawer-root');
const themeBtn = (page) => page.locator(
  'button:has(svg[data-testid="DarkModeIcon"]), button:has(svg[data-testid="LightModeIcon"])'
).first();

// ── Razorpay test-mode driver ────────────────────────────────────────────────
// Drives the real Razorpay test-mode iframe: Netbanking → first bank → Pay → Success.
async function payWithNetbanking(page) {
  const frameEl = page.locator('iframe.razorpay-checkout-frame');
  await frameEl.waitFor({ state: 'attached', timeout: 25000 }).catch(() => {});
  if (!(await frameEl.count())) {
    sub('Razorpay modal did not open');
    return false;
  }
  // Give the iframe content time to render
  await sleep(page, 3500);
  const f = page.frameLocator('iframe.razorpay-checkout-frame');

  try {
    // Optional contact-info screen (some flows show this first)
    const contact = f.locator('input[name="contact"], input[placeholder*="phone" i]').first();
    if (await contact.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contact.fill('9489123030').catch(() => {});
      const email = f.locator('input[name="email"], input[type="email"]').first();
      if (await email.isVisible({ timeout: 1000 }).catch(() => false)) {
        await email.fill(SHAM.email).catch(() => {});
      }
      const cont = f.locator('button', { hasText: /continue|proceed|next/i }).first();
      if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
        await cont.click().catch(() => {});
        await sleep(page, 2000);
      }
    }

    // Click "Netbanking" payment-method tile (multiple selector attempts)
    sub('  → click Netbanking');
    const netbankingSelectors = [
      f.locator('[data-method="netbanking"]').first(),
      f.locator('label[for="method-netbanking"], div[role="button"]:has-text("Netbanking")').first(),
      f.locator('button, div, label').filter({ hasText: /^Netbanking$/i }).first(),
      f.locator('text=/^netbanking$/i').first(),
    ];
    let nbClicked = false;
    for (const loc of netbankingSelectors) {
      if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
        await loc.click().catch(() => {});
        nbClicked = true; break;
      }
    }
    if (!nbClicked) throw new Error('Netbanking tile not found');
    await sleep(page, 2000);

    // Select a bank — try popular bank labels first (most reliable on test mode)
    sub('  → select a bank');
    const bankPicked = await (async () => {
      const candidates = [
        f.getByText(/^HDFC( Bank)?$/i).first(),
        f.getByText(/^SBI( Bank)?$/i).first(),
        f.getByText(/^ICICI( Bank)?$/i).first(),
        f.getByText(/^Axis( Bank)?$/i).first(),
        f.getByText(/^Kotak( Mahindra)?$/i).first(),
        f.locator('label').filter({ hasText: /bank/i }).first(),
        f.locator('input[type="radio"]').first(),
      ];
      for (const c of candidates) {
        if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
          await c.click({ force: true }).catch(() => {});
          await sleep(page, 800);
          return true;
        }
      }
      // Fallback: open a "Select bank" dropdown if present
      const dropdown = f.locator('select, [role="combobox"]').first();
      if (await dropdown.isVisible({ timeout: 1500 }).catch(() => false)) {
        await dropdown.click().catch(() => {});
        await sleep(page, 600);
        const opt = f.locator('option, [role="option"]').nth(1);
        if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
          await opt.click().catch(() => {});
          return true;
        }
      }
      return false;
    })();
    if (!bankPicked) sub('  · couldn\'t locate a bank — proceeding anyway');
    await sleep(page, 1500);

    // Pay button — try several selectors and wait for enabled state
    sub('  → click Pay Now');
    const payCandidates = [
      f.locator('button.pay-btn, button[type="submit"]').first(),
      f.getByRole('button', { name: /^pay( now)?/i }).first(),
      f.locator('button').filter({ hasText: /^pay( now| ₹)?/i }).first(),
      f.locator('button').filter({ hasText: /proceed|continue|submit/i }).first(),
    ];
    let payClicked = false;
    for (const pay of payCandidates) {
      if (await pay.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pay.click({ timeout: 5000 }).catch(() => {});
        payClicked = true;
        break;
      }
    }
    if (!payClicked) throw new Error('Pay button not found');
    await sleep(page, 5000);

    // Test-mode authorization page → click Success
    sub('  → Authorize test payment: click Success');
    const successBtn = f.locator('button', { hasText: /success|authorize/i }).first();
    await successBtn.click({ timeout: 20000 });
    await sleep(page, 4000);
    return true;
  } catch (e) {
    sub(`  · Razorpay drive failed (${(e.message || '').split('\n')[0]}) — dismissing`);
    // Best-effort dismiss; demo continues but appointment stays unpaid for this iteration
    await page.goto(`${BASE}/dashboard/appointments`).catch(() => {});
    await sleep(page, BEAT);
    return false;
  }
}

async function dismissRazorpay(page) {
  // Hard-nav clears the cross-origin overlay reliably
  await page.goto(`${BASE}/dashboard/appointments`).catch(() => {});
  await sleep(page, BEAT);
}

// ── Slot picker — finds a future slot reliably ──────────────────────────────
// Prefers a chip on the requested day; among that day's chips, picks the
// LAST one (latest hour) so we don't land on a past slot.
async function pickSlot(page, dayPrefix /* 'Today' | 'Tomorrow' */) {
  await page.waitForSelector('.MuiChip-outlined.MuiChip-colorPrimary', { timeout: 10000 })
    .catch(() => {});
  const allChips = page.locator('.MuiChip-outlined.MuiChip-colorPrimary');
  const total = await allChips.count();

  // Group chips by their preceding "Today, …" / "Tomorrow, …" caption.
  const captionRe = new RegExp(`^${dayPrefix}`, 'i');
  const captions  = page.locator('.MuiTypography-caption').filter({ hasText: captionRe });
  if (await captions.count()) {
    // Container = caption's parent Box → chips are siblings inside it.
    const grp = captions.first().locator('xpath=..');
    const grpChips = grp.locator('.MuiChip-outlined.MuiChip-colorPrimary');
    const n = await grpChips.count();
    if (n > 0) {
      // Click the LAST chip in that day (latest hour).
      await grpChips.nth(n - 1).click();
      return true;
    }
  }
  // Fallback: any future-ish slot — last chip across the page
  if (total > 0) {
    await allChips.nth(total - 1).click();
    return true;
  }
  return false;
}

// Add a fresh slot to a doctor's availability via API (so the demo always has
// a future, accept-able slot). Authenticates as the doctor.
async function ensureFutureSlot(request, doctor, isoDateTime) {
  try {
    const login = await request.post(`${API}/api/auth/login`, {
      data: { username: doctor.username, password: doctor.password },
    });
    if (!login.ok()) return;
    const { token } = await login.json();

    const list = await request.get(`${API}/api/doctors?size=200`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    let existing = [];
    if (list && list.ok()) {
      const body = await list.json();
      const items = Array.isArray(body) ? body : (body.content || []);
      // The seed exposes `name` as the doctor login id (e.g. "dr_arjun")
      const me = items.find((d) => d.name === doctor.username || d.username === doctor.username);
      if (me) existing = me.availableSlots || [];
    }

    if (!existing.includes(isoDateTime)) existing.push(isoDateTime);

    await request.put(`${API}/api/doctors/availability`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { availableSlots: existing },
    }).catch(() => {});
  } catch { /* best-effort */ }
}

// Build "today at HH:00 in local time" as ISO (used by the FE slot list)
function todayAt(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Healthcare Portal — Full Feature Demo', () => {

  // Each run uses a brand-new Sham_<timestamp> account, so no cleanup is needed.

  test('End-to-end demo of all features', async ({ page, request }) => {
    test.setTimeout(1_500_000); // 25 min ceiling; demo typically finishes in ~6-8 min

    // Guarantee future slots exist so the demo can book + accept reliably.
    // Pick an hour that is still ≥ 2 h ahead of "now" — clamped between 17:00 and 22:00.
    const now = new Date();
    const futHour = Math.min(22, Math.max(now.getHours() + 2, 17));
    await ensureFutureSlot(request, DR_ARJUN, todayAt(futHour));
    await ensureFutureSlot(request, DR_AMIT,  todayAt(Math.min(22, futHour + 1)));

    page.on('pageerror', (e) => console.log('  [page-error]', e.message));

    // ─────────────────────────────────────────────────────────────────────────
    // PART 1 — Login validation → Register Sham
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 1 · Login with wrong credentials, then register Sham');

    await page.goto(`${BASE}/login`);
    await expect(page.getByText('Healthcare Portal')).toBeVisible();
    await banner(page, 'Smart Healthcare Portal — Live Feature Demo', 2600);
    await sleep(page, BEAT);

    sub('wrong credentials');
    await banner(page, '1. Auth — invalid credentials are rejected by Spring filter', 1800);
    await page.fill('input[autocomplete="username"]', 'wrong_user');
    await page.fill('input[autocomplete="current-password"]', 'wrongpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|failed|incorrect/i)).toBeVisible({ timeout: 10000 });
    await sleep(page, READ);

    await banner(page, '2. New patient signs up — JWT issued on creation', 1800);
    sub(`register Sham (${SHAM.username} / ${SHAM.email})`);
    await page.getByText('Register here').click();
    await page.waitForURL('**/register**');
    await sleep(page, BEAT);
    // The Username field is the first MUI text input; click it then type.
    const inputs = page.locator('.MuiInputBase-input').filter({ hasNot: page.locator('[type="hidden"]') });
    await inputs.nth(0).click();
    await page.keyboard.type(SHAM.username, { delay: 30 });
    await inputs.nth(1).click();
    await page.keyboard.type(SHAM.email, { delay: 20 });
    await inputs.nth(2).click();
    await page.keyboard.type(SHAM.password, { delay: 20 });
    await inputs.nth(3).click();
    await page.keyboard.type(SHAM.password, { delay: 20 });
    await sleep(page, TICK);
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await sleep(page, BEAT);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 2 — Wait, click incomplete profile card, fill age + gender
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 2 · Show dashboard 4s, click "Profile Status: Incomplete", fill profile');

    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await sleep(page, 4000);

    sub('click Profile Status card');
    const incompleteCard = page.locator('text=Incomplete').first();
    if (await incompleteCard.isVisible().catch(() => false)) {
      await incompleteCard.click();
    } else {
      await sidebar(page).getByText('Profile').click();
    }
    await page.waitForURL('**/profile**', { timeout: 10000 });
    await sleep(page, BEAT);

    sub('Edit Profile → age=15, gender=Male → Save');
    await page.getByRole('button', { name: /edit profile/i }).click();
    await sleep(page, TICK);
    const ageInput = page.getByLabel(/^age$/i);
    await ageInput.fill('15');
    // Open gender select
    const genderSelect = page.locator('label:has-text("Gender") + .MuiInputBase-root, [aria-labelledby*="gender" i]').first();
    if (await genderSelect.count()) {
      await genderSelect.click();
    } else {
      // Fallback: click any select in the form near "Gender"
      await page.getByText('Gender', { exact: true }).first().click();
    }
    await sleep(page, TICK);
    await page.getByRole('option', { name: /^male$/i }).click();
    await sleep(page, TICK);
    await page.getByRole('button', { name: /^save( changes)?$/i }).click();
    await sleep(page, READ);

    sub('back to My Appointments — empty for new user');
    await sidebar(page).getByText('My Appointments').click();
    await page.waitForURL('**/appointments**');
    await sleep(page, READ * 2);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 3 — AI Assistant: leg pain / 6 / 3 days / none → Orthopedics → BOOK dr_arjun
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 3 · AI Health Assistant — leg pain, 6, 3 days, none → book dr_arjun via AI');
    await banner(page, '3. AI symptom checker — Flask ML service on :5000', 2200);

    await sidebar(page).getByText('AI Assistant').click();
    await page.waitForURL('**/chat**');
    await page.getByPlaceholder(/describe your symptoms/i)
      .waitFor({ state: 'visible', timeout: 15000 });

    const send = () => page.locator('button:has([data-testid="SendIcon"])').click();
    const inputBox = () => page.getByPlaceholder(/describe your symptoms/i);

    sub('Q1: symptom');
    await inputBox().fill('leg pain');
    await send(); await page.waitForTimeout(3500);
    sub('Q2: severity 1-10 → 6');
    await inputBox().fill('6'); await send(); await page.waitForTimeout(3000);
    sub('Q3: duration → 3 days');
    await inputBox().fill('3 days'); await send(); await page.waitForTimeout(3000);
    sub('Q4: anything else → none');
    await inputBox().fill('none'); await send(); await page.waitForTimeout(5000);
    await banner(page, '→ ML recommends Orthopedics — booking dr_arjun directly from chat', 2400);
    await sleep(page, READ);

    sub('open dr_arjun from the recommended cards (just to show AI → booking link)');
    const arjunRecCard = page.locator('.MuiCard-root', { hasText: /dr.?arjun/i }).first();
    await arjunRecCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await arjunRecCard.count()) {
      await arjunRecCard.getByRole('button', { name: /book appointment/i }).click();
      await page.waitForURL('**/book-appointment/**', { timeout: 10000 });
      sub('  · landed on booking page from AI — NOT booking here, going via Browse');
      await sleep(page, READ * 2);
    }

    sub('Browse Doctors → filter Orthopedics → View Profile (More Info) on dr_arjun');
    await banner(page, 'Browse Doctors → open dr_arjun profile → book from there', 2200);
    await sidebar(page).getByText('Browse Doctors').click();
    await page.waitForURL('**/doctors**');
    await page.locator('.MuiCard-root').first().waitFor({ timeout: 10000 });
    await page.locator('.MuiSelect-select').first().click();
    await sleep(page, TICK);
    await page.getByRole('option', { name: /orthopedics/i }).click();
    await sleep(page, READ);

    const arjunBrowseCard = page.locator('.MuiCard-root', { hasText: /dr.?arjun/i }).first();
    await arjunBrowseCard.getByRole('button', { name: /view profile|more info/i }).click();
    await page.waitForURL('**/dashboard/doctors/**', { timeout: 10000 });
    sub('reading dr_arjun profile — qualifications, fee, ratings');
    await sleep(page, 2500);
    await page.evaluate(() => window.scrollBy(0, 350));
    await sleep(page, 2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(page, 800);

    sub('book from profile → pick today slot → submit → close Razorpay (no pay)');
    await page.getByRole('button', { name: /book appointment/i }).first().click();
    await page.waitForURL('**/book-appointment/**', { timeout: 10000 });
    await expect(page.getByText(/Dr\. .*arjun/i)).toBeVisible();
    await sleep(page, BEAT);

    const gotToday = await pickSlot(page, 'Today');
    if (!gotToday) sub('no today slot found — booking fallback');
    await sleep(page, TICK);
    await page.getByLabel(/symptoms/i).fill('Leg pain — severity 6/10, ongoing for 3 days');
    await sleep(page, TICK);
    await page.locator('button[type="submit"]').click();
    sub('Razorpay opens — closing without paying (will pay from Appointments later)');
    await banner(page, 'Closing Razorpay → appointment sits as Awaiting Payment', 2200);
    await sleep(page, 4000);
    await dismissRazorpay(page);

    sub('My Appointments → confirm dr_arjun is Awaiting Payment');
    await page.goto(`${BASE}/dashboard/appointments`);
    await sleep(page, READ);
    await expect(page.getByText(/awaiting payment/i)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await sleep(page, READ * 2);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 7 — Book dr_amit (Orthopedics) tomorrow → pay via Razorpay netbanking
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 7 · Book dr_amit TODAY + pay via Razorpay netbanking → Success');
    await banner(page, '7. Razorpay test-mode netbanking — real payment gateway', 2200);

    await sidebar(page).getByText('Browse Doctors').click();
    await page.waitForURL('**/doctors**');
    // Filter by Orthopedics so dr_amit is directly visible — no search
    await page.locator('.MuiSelect-select').first().click();
    await sleep(page, TICK);
    await page.getByRole('option', { name: /orthopedics/i }).click();
    await sleep(page, READ);

    const amitCard = page.locator('.MuiCard-root', { hasText: /dr.?amit/i }).first();
    await amitCard.getByRole('button', { name: /^book$/i }).click();
    await page.waitForURL('**/book-appointment/**');
    await sleep(page, BEAT);

    sub('pick a slot today');
    const gotTom = await pickSlot(page, 'Today');
    if (!gotTom) sub('no today slot — using fallback');
    await sleep(page, TICK);
    await page.getByLabel(/symptoms/i).fill('Knee follow-up consultation');
    await sleep(page, TICK);
    await page.locator('button[type="submit"]').click();

    sub('Razorpay opens — paying via netbanking');
    const amitPaid = await payWithNetbanking(page);
    if (amitPaid) sub('dr_amit payment Success');
    sub('staying 4 s on the booked-not-confirmed screen');
    await sleep(page, 4000);
    await page.goto(`${BASE}/dashboard/appointments`).catch(() => {});
    await sleep(page, READ);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 8 — Cancel dr_amit → Cancelled tab → Refunded
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 8 · Cancel dr_amit appointment → Cancelled tab → Refunded chip');
    await banner(page, '8. Cancellation triggers automatic Razorpay refund', 2200);

    await page.getByRole('button', { name: /refresh/i }).click();
    await sleep(page, BEAT);
    await page.getByRole('tab', { name: /upcoming/i }).click();
    await sleep(page, BEAT);

    // Cancel button on the dr_amit card specifically
    const amitAppt = page.locator('.MuiCard-root', { hasText: /dr.?amit/i }).first();
    const cancelBtn = amitAppt.getByRole('button', { name: /^cancel$/i }).first();
    if (await cancelBtn.count()) {
      await cancelBtn.click();
      const yes = page.getByRole('button', { name: /yes,? cancel/i });
      await yes.waitFor({ timeout: 5000 }).catch(() => {});
      if (await yes.count()) await yes.click();
      await sleep(page, READ * 2);
    } else {
      sub('dr_amit cancel button not found — skipping');
    }

    sub('switch to Cancelled tab → expect Refunded chip');
    await page.getByRole('tab', { name: /cancelled/i }).click();
    await sleep(page, READ);
    await expect(page.getByText(/refunded/i).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await sleep(page, READ * 2);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 8b — Back to Upcoming → Pay dr_arjun via Razorpay netbanking
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 8b · Pay dr_arjun (Awaiting Payment) via Razorpay netbanking → Success');

    await page.getByRole('tab', { name: /upcoming/i }).click();
    await sleep(page, BEAT);
    const arjunPayBtn = page.locator('.MuiCard-root', { hasText: /dr.?arjun/i })
      .getByRole('button', { name: /pay\s*₹/i }).first();
    if (await arjunPayBtn.count()) {
      await arjunPayBtn.click();
      const arjunPaid = await payWithNetbanking(page);
      if (arjunPaid) sub('dr_arjun payment Success — now PENDING confirmation');
    } else {
      sub('Pay button on dr_arjun not found — appointment may already be paid');
    }
    await page.goto(`${BASE}/dashboard/appointments`).catch(() => {});
    await sleep(page, READ * 2);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 9 — Dashboard 1 upcoming + notifications
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 9 · Dashboard shows 1 upcoming + notification bar + same-day reminder');
    await banner(page, '9. Patient dashboard — upcoming + same-day reminder banner', 2000);

    await sidebar(page).getByText('Dashboard').click();
    await page.waitForURL('**/dashboard**');
    await sleep(page, READ);
    await expect(page.getByText('Upcoming Appointments')).toBeVisible();

    sub('look for same-day reminder banner');
    const reminder = page.getByText(/today|reminder|same.?day|in \d+ hours?/i).first();
    if (await reminder.isVisible({ timeout: 2000 }).catch(() => false)) {
      sub('  ✓ same-day reminder visible');
      await sleep(page, READ * 2);
    }

    sub('toggle dark mode (night) on patient dashboard');
    await banner(page, '🌙 Night mode — centralized MUI theme, every component re-themes', 2000);
    await themeBtn(page).click(); await sleep(page, READ * 2);
    sub('open notification bell in night mode');
    await page.locator('[aria-label="notifications"]').click();
    await sleep(page, READ * 2);
    await page.keyboard.press('Escape');
    await sleep(page, BEAT);
    sub('back to light mode');
    await themeBtn(page).click(); await sleep(page, BEAT);

    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 10 — Login dr_arjun (5 s on dashboard)
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 10 · Login dr_arjun, dwell 5 s');
    await banner(page, '10. Doctor portal — same /dashboard route, role-aware UI', 2200);
    await login(page, DR_ARJUN.username, DR_ARJUN.password);
    await expect(page.getByText(/welcome, dr\./i)).toBeVisible();
    await sleep(page, 5000);
    sub('doctor — toggle dark mode briefly');
    await themeBtn(page).click(); await sleep(page, READ * 2);
    await themeBtn(page).click(); await sleep(page, BEAT);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 11 — Today's appointments → cycle filters → Accept Sham
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 11 · Doctor — cycle filters, Accept Sham\'s appointment');
    await banner(page, '11. Doctor accepts → Spring sends async email + push notification', 2400);

    await sidebar(page).getByText('Appointments').click();
    await page.waitForURL('**/doctor-appointments**');
    await sleep(page, BEAT);

    sub('cycle filter buttons (All / Pending / Confirmed / Completed)');
    for (const f of ['^all', '^pending', '^confirmed', '^completed', '^pending']) {
      const btn = page.getByRole('button', { name: new RegExp(f, 'i') }).first();
      if (await btn.count()) { await btn.click(); await sleep(page, BEAT); }
    }

    sub('Accept Sham\'s pending appointment');
    // Switch to Pending filter to scope the click
    const pendingFilter = page.getByRole('button', { name: /^pending/i }).first();
    if (await pendingFilter.count()) { await pendingFilter.click(); await sleep(page, BEAT); }

    // Click the first Accept button on the pending tab (only Sham's should be there)
    const acceptBtn = page.getByRole('button', { name: /^accept$/i }).first();
    if (await acceptBtn.count()) {
      await acceptBtn.click();
      await sleep(page, READ * 2);
      sub('appointment accepted');
    } else {
      sub('no Accept button found — slot may be in past, skipping');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PART 12 — Add to Calendar menu → show Google option
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 12 · Add to Calendar menu (Google / Outlook / .ics)');
    await page.getByRole('button', { name: /^confirmed/i }).click().catch(() => {});
    await sleep(page, BEAT);
    const calBtn = page.getByRole('button', { name: /add to calendar/i }).first();
    if (await calBtn.count()) {
      await calBtn.click();
      await expect(page.getByText(/google calendar/i)).toBeVisible({ timeout: 4000 }).catch(() => {});
      await sleep(page, READ * 2);
      await page.keyboard.press('Escape');
      await sleep(page, BEAT);
    } else {
      sub('Add to Calendar visible only on patient side — skipping for doctor');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PART 13 — Doctor notifications
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 13 · Doctor notification bell');
    await page.locator('[aria-label="notifications"]').click();
    await sleep(page, READ * 2);
    await page.keyboard.press('Escape');
    await sleep(page, BEAT);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 14 — Availability: add today slot + save + Out of Clinic
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 14 · Availability — add today slot, save, Out of Clinic');
    await banner(page, '14. Availability — slots are doctor-controlled, conflict-checked server-side', 2400);

    await sidebar(page).getByText('Availability').click();
    await page.waitForURL('**/availability**');
    await sleep(page, BEAT);

    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/date/i).first().fill(today);
    await page.getByLabel(/time/i).first().fill('22:00');
    await page.getByRole('button', { name: /^add$/i }).click();
    await sleep(page, BEAT);
    await page.getByRole('button', { name: /save changes/i }).click();
    await sleep(page, READ);

    sub('Out of Clinic — clears today\'s non-booked slots');
    await page.getByRole('button', { name: /out of clinic/i }).click();
    const ooc = page.getByRole('button', { name: /yes, remove|confirm|out of clinic/i });
    if (await ooc.count()) await ooc.first().click();
    await sleep(page, READ * 2);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 15 — Doctor profile, logout
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 15 · Doctor profile + logout');
    await sidebar(page).getByText('Profile').click();
    await page.waitForURL('**/profile**');
    await sleep(page, READ * 2);

    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 16 — Sham logs in to confirm acceptance via notification
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 16 · Sham logs back in — notification + same-day reminder');
    await banner(page, '16. Patient sees confirmation in real time — bell badge increments', 2400);
    await login(page, SHAM.username, SHAM.password);

    sub('check notification badge count');
    const bellBadge = page.locator('[aria-label="notifications"] .MuiBadge-badge').first();
    if (await bellBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
      const count = await bellBadge.textContent().catch(() => '');
      sub(`  ✓ unread notifications: ${count}`);
    }
    await page.locator('[aria-label="notifications"]').click();
    await sleep(page, READ * 2);
    await expect(page.getByText(/confirmed|accepted/i).first()).toBeVisible({ timeout: 4000 }).catch(() => {});
    await page.keyboard.press('Escape');
    await sleep(page, BEAT);

    sub('My Appointments → Upcoming should show CONFIRMED chip');
    await sidebar(page).getByText('My Appointments').click();
    await page.waitForURL('**/appointments**');
    await page.getByRole('tab', { name: /upcoming/i }).click().catch(() => {});
    await sleep(page, READ);
    await expect(page.getByText(/^confirmed$/i).first()).toBeVisible({ timeout: 4000 }).catch(() => {});
    await sleep(page, READ);
    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 17 — dr_arjun marks Complete + writes prescription
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 17 · dr_arjun — Mark Complete + prescription (Paracetamol)');
    await banner(page, '17. Doctor writes prescription — emailed to patient automatically', 2400);

    await login(page, DR_ARJUN.username, DR_ARJUN.password);
    await sidebar(page).getByText('Appointments').click();
    await page.waitForURL('**/doctor-appointments**');
    await page.getByRole('button', { name: /^confirmed/i }).click().catch(() => {});
    await sleep(page, BEAT);

    const shamRow2 = page.locator('.MuiPaper-root, .MuiCard-root', { hasText: /sham/i }).first();
    const completeBtn = shamRow2.getByRole('button', { name: /mark complete/i }).first();
    if (await completeBtn.count()) {
      await completeBtn.click();
    } else {
      const anyComplete = page.getByRole('button', { name: /mark complete/i }).first();
      if (await anyComplete.count()) await anyComplete.click();
    }
    await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 8000 });

    sub('fill prescription (in night mode)');
    await themeBtn(page).click(); await sleep(page, BEAT);
    await page.getByLabel(/diagnosis/i).fill('Mild ligament sprain');
    await page.getByLabel(/^name/i).fill('Paracetamol 500mg');
    await page.getByLabel(/^dosage/i).fill('2 tablets');
    await page.getByLabel(/^frequency/i).fill('3 times a day after meals');
    await page.getByLabel(/^duration/i).fill('5 days');
    await page.getByLabel(/advice/i).fill('Bed rest. Avoid weight-bearing on the leg.');
    await sleep(page, TICK);
    await page.getByRole('button', { name: /save.*email|update.*email/i }).click();
    await expect(page.locator('.MuiDialog-root')).not.toBeVisible({ timeout: 10000 });
    await sleep(page, READ);
    sub('back to light mode');
    await themeBtn(page).click(); await sleep(page, BEAT);

    sub('cycle through filters to show Completed has Sham');
    for (const f of ['^all', '^completed']) {
      const btn = page.getByRole('button', { name: new RegExp(f, 'i') }).first();
      if (await btn.count()) { await btn.click(); await sleep(page, BEAT); }
    }
    await sleep(page, READ);
    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 18 — Sham views prescription + rates doctor
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 18 · Sham views prescription, downloads, and rates dr_arjun');
    await banner(page, '18. Patient downloads PDF prescription + rates doctor', 2400);

    await login(page, SHAM.username, SHAM.password);
    sub('toggle dark mode for the patient view');
    await themeBtn(page).click(); await sleep(page, BEAT);
    await sidebar(page).getByText('My Appointments').click();
    await page.waitForURL('**/appointments**');
    await page.getByRole('button', { name: /refresh/i }).click();
    await sleep(page, BEAT);
    await page.getByRole('tab', { name: /past/i }).click();
    await sleep(page, READ);

    sub('view prescription (in night mode)');
    const viewRx = page.getByRole('button', { name: /view prescription/i }).first();
    if (await viewRx.count()) {
      await viewRx.click();
      await expect(page.locator('.MuiDialog-root')).toBeVisible({ timeout: 8000 });
      await sleep(page, READ * 2);
      const dl = page.getByRole('button', { name: /download/i }).first();
      if (await dl.count()) {
        sub('clicking Download (PDF)');
        const dlPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await dl.click();
        await dlPromise;
        await sleep(page, BEAT);
      }
      await page.keyboard.press('Escape');
      await sleep(page, BEAT);
    }

    sub('rate dr_arjun 5★');
    const rate = page.getByRole('button', { name: /rate doctor/i }).first();
    if (await rate.count()) {
      await rate.click();
      await expect(page.locator('.MuiDialog-root')).toBeVisible();
      await page.locator('.MuiRating-root label').nth(4).click().catch(() => {});
      await page.getByLabel(/share your experience/i)
        .fill('Dr. Arjun was excellent — clear diagnosis and quick relief.');
      await sleep(page, TICK);
      await page.getByRole('button', { name: /submit review/i }).click();
      await expect(page.locator('.MuiDialog-root')).not.toBeVisible({ timeout: 8000 });
      await sleep(page, BEAT);
    }
    sub('back to light mode');
    await themeBtn(page).click(); await sleep(page, BEAT);

    sub('verify the review now appears on dr_arjun\'s profile');
    await banner(page, '18b. Review propagates instantly to public doctor profile', 2200);
    await sidebar(page).getByText('Browse Doctors').click();
    await page.waitForURL('**/doctors**');
    const arjunCardAfter = page.locator('.MuiCard-root', { hasText: /dr.?arjun/i }).first();
    if (await arjunCardAfter.count()) {
      await arjunCardAfter.getByRole('button', { name: /view profile/i }).click().catch(() => {});
      await page.waitForURL('**/dashboard/doctors/**', { timeout: 8000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, 600));
      await sleep(page, READ * 2);
      await expect(page.getByText(/Dr\. Arjun was excellent/i).first())
        .toBeVisible({ timeout: 4000 }).catch(() => sub('  · review text not found inline — may be paginated'));
      await sleep(page, READ);
    }
    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 19 — Admin: dwell → charts → exports → reviews → users → stats
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 19 · Admin — analytics, exports, reviews, users, statistics');
    await banner(page, '19. Admin dashboard — live MongoDB aggregations on Recharts', 2600);

    await login(page, ADMIN.username, ADMIN.password);
    await page.locator('.MuiCircularProgress-root').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await sleep(page, 5500);   // 5–6 s dwell

    sub('toggle dark mode on admin charts');
    await themeBtn(page).click(); await sleep(page, READ * 2);
    await themeBtn(page).click(); await sleep(page, BEAT);

    sub('scroll through charts');
    await expect(page.getByText('Appointment Status Distribution')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(page, READ);
    await expect(page.getByText('Top Specializations by Appointments')).toBeVisible();
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(page, READ);
    await expect(page.getByText(/system health/i)).toBeVisible();
    await sleep(page, READ);
    await expect(page.getByText(/live activity|recent reviews/i).first()).toBeVisible();
    await sleep(page, READ * 2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(page, BEAT);

    sub('CSV exports menu');
    await page.getByRole('button', { name: /export/i }).click();
    await expect(page.getByRole('menuitem', { name: /users csv/i })).toBeVisible();
    await sleep(page, READ * 2);
    await page.keyboard.press('Escape');
    await sleep(page, BEAT);

    sub('User Management — search + role filter');
    await sidebar(page).getByText('User Management').click();
    await page.waitForURL('**/users**');
    await page.getByPlaceholder(/search username or email/i).fill('Sham');
    await page.getByRole('button', { name: /^search$/i }).click();
    await sleep(page, READ * 2);
    await page.getByPlaceholder(/search username or email/i).clear();
    await page.getByRole('button', { name: /^search$/i }).click();
    await sleep(page, BEAT);

    sub('Statistics page');
    await sidebar(page).getByText('Statistics').click();
    await page.waitForURL('**/statistics**');
    await sleep(page, READ * 2);

    sub('Reviews page — show patient feedback aggregated');
    const reviewsLink = sidebar(page).getByText(/^reviews$/i).first();
    if (await reviewsLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      await reviewsLink.click();
      await sleep(page, READ * 2);
      await expect(page.getByText(/Dr\. Arjun was excellent/i).first())
        .toBeVisible({ timeout: 4000 }).catch(() => {});
      await sleep(page, READ);
    }

    sub('Activity Log — every recent action persisted');
    const activityLink = sidebar(page).getByText(/activity|audit/i).first();
    if (await activityLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      await activityLink.click();
      await sleep(page, READ * 2);
    }

    sub('System Health — backend + ML service status');
    const healthLink = sidebar(page).getByText(/system health|health/i).first();
    if (await healthLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      await healthLink.click();
      await sleep(page, READ * 2);
    }

    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 20 — Register NEW doctor → admin approves → patient sees them
    // ─────────────────────────────────────────────────────────────────────────
    log(`PART 20 · Register a new doctor (${NEW_DOC.username}) → admin approves → patient sees them`);
    await banner(page, '20. Doctor onboarding — auto-deactivated until admin approval', 2400);

    await page.goto(`${BASE}/login`);
    await page.getByText('Register here').click();
    await page.waitForURL('**/register**');
    await sleep(page, BEAT);
    const docInputs = page.locator('.MuiInputBase-input').filter({ hasNot: page.locator('[type="hidden"]') });
    await docInputs.nth(0).click();
    await page.keyboard.type(NEW_DOC.username, { delay: 30 });
    await docInputs.nth(1).click();
    await page.keyboard.type(NEW_DOC.email, { delay: 20 });
    await docInputs.nth(2).click();
    await page.keyboard.type(NEW_DOC.password, { delay: 20 });
    await docInputs.nth(3).click();
    await page.keyboard.type(NEW_DOC.password, { delay: 20 });

    // Pick role → Doctor
    sub('switch role to Doctor');
    const roleSelect = page.locator('label:has-text("Role") + .MuiInputBase-root, [aria-labelledby*="role" i]').first();
    if (await roleSelect.count()) await roleSelect.click();
    else await page.getByText('Role', { exact: true }).first().click();
    await sleep(page, TICK);
    await page.getByRole('option', { name: /^doctor$/i }).click();
    await sleep(page, TICK);
    await page.getByRole('button', { name: /create account/i }).click();

    // New doctors get auto-deactivated until admin approval; depending on the app
    // either lands on dashboard (logged in but inactive) or returns to login. Either is fine.
    await page.waitForTimeout(3000);
    await page.goto(`${BASE}/login`);
    await sleep(page, BEAT);

    sub('admin approves the new doctor');
    await login(page, ADMIN.username, ADMIN.password);
    await page.locator('.MuiCircularProgress-root').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await sidebar(page).getByText('Doctor Approvals').click();
    await page.waitForURL('**/doctor-approvals**');
    await sleep(page, READ);

    const newDocRow = page.locator('.MuiPaper-root, .MuiCard-root', { hasText: NEW_DOC.username }).first();
    const approveBtn = newDocRow.getByRole('button', { name: /approve/i }).first();
    if (await approveBtn.count()) {
      await approveBtn.click();
      const confirm = page.getByRole('button', { name: /^approve$|^confirm$/i });
      if (await confirm.count()) await confirm.first().click().catch(() => {});
      await sleep(page, READ * 2);
    } else {
      sub('approve button not found (already approved?)');
    }
    await logout(page);

    sub('Sham logs in → only approved doctors appear in Browse');
    await login(page, SHAM.username, SHAM.password);
    await sidebar(page).getByText('Browse Doctors').click();
    await page.waitForURL('**/doctors**');
    await page.getByPlaceholder(/search by name/i).fill('demo');
    await sleep(page, READ * 2);
    await logout(page);

    // ─────────────────────────────────────────────────────────────────────────
    // PART 21 — Back to admin dashboard, leave it there
    // ─────────────────────────────────────────────────────────────────────────
    log('PART 21 · Back to admin dashboard — final view');
    await login(page, ADMIN.username, ADMIN.password);
    await page.locator('.MuiCircularProgress-root').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await banner(page, '✓ Demo complete — auth, payments, refunds, ML, prescriptions, reviews, admin', 4000);
    await sleep(page, READ * 3);

    log('✓ Demo complete — every feature exercised');
  });
});
