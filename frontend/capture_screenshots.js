/**
 * capture_screenshots.js — final-PPT screenshot tour.
 *
 * Boots a single Playwright browser, walks through patient → doctor → admin
 * portals + Swagger and writes ~22 PNGs to repo root as final_*.png.
 *
 * Usage (run from repo root, after backend + frontend + ML are up):
 *   node frontend/capture_screenshots.js
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://localhost:3000';
const API  = 'http://localhost:8080';

const PATIENT  = { username: 'patient1',  password: 'password'   };
const DR_PRIYA = { username: 'dr_priya',  password: 'doctor123'  };
const ADMIN    = { username: 'admin',     password: 'admin123'   };

const NEW_USER = {
  username: `demo_${Date.now().toString().slice(-6)}`,
  email:    `demo_${Date.now().toString().slice(-6)}@test.com`,
  password: 'demo1234',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  const file = path.join(ROOT, `final_${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${path.basename(file)}`);
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  await sleep(1200);
}

async function logout(page) {
  const logoutBtn = page.getByRole('button', { name: /logout/i });
  if ((await logoutBtn.count()) > 0) {
    await logoutBtn.click();
    const confirmBtn = page.getByRole('button', { name: /^log out$/i });
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if ((await confirmBtn.count()) > 0) await confirmBtn.click();
  }
  await page.waitForURL('**/login**', { timeout: 10000 }).catch(() => {});
  await sleep(600);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Make sure baseline patient exists
  await page.request.post(`${API}/api/auth/register`, {
    data: { username: PATIENT.username, email: 'patient1@test.com', password: PATIENT.password, role: 'PATIENT' },
  }).catch(() => {});

  console.log('\n▶ Auth pages');
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[autocomplete="username"]');
  await sleep(700);
  await shot(page, 'login');

  await page.getByText('Register here').click();
  await page.waitForURL('**/register**');
  await page.getByLabel(/username/i).fill(NEW_USER.username);
  await page.getByLabel(/email/i).fill(NEW_USER.email);
  await page.locator('input[autocomplete="new-password"]').first().fill(NEW_USER.password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(NEW_USER.password);
  await sleep(400);
  await shot(page, 'register');

  // ── Patient portal ────────────────────────────────────────────────────────
  console.log('\n▶ Patient portal');
  await login(page, PATIENT.username, PATIENT.password);
  await sleep(800);
  await shot(page, 'patient_dashboard');

  // Notifications
  const bell = page.locator('[aria-label="notifications"]').first();
  if ((await bell.count()) > 0) {
    await bell.click();
    await sleep(800);
    await shot(page, 'notifications');
    await page.keyboard.press('Escape');
    await sleep(300);
  }

  // Dark mode
  const themeBtn = page.locator('button:has(svg[data-testid="DarkModeIcon"]), button:has(svg[data-testid="LightModeIcon"])').first();
  if ((await themeBtn.count()) > 0) {
    await themeBtn.click();
    await sleep(700);
    await shot(page, 'dark_mode');
    await themeBtn.click();
    await sleep(500);
  }

  const sidebar = () => page.locator('.MuiDrawer-root');

  // Browse doctors
  await sidebar().getByText('Browse Doctors').click();
  await page.waitForURL('**/doctors**');
  await page.locator('.MuiCard-root').first().waitFor({ timeout: 10000 });
  await sleep(800);
  await shot(page, 'doctor_list');

  // Filter to Dr. Priya
  await page.getByPlaceholder(/search by name/i).fill('Priya');
  await sleep(1500);
  await page.locator('.MuiCard-root').first().waitFor({ timeout: 10000 });

  // Visit the real doctor profile page
  await page.getByRole('button', { name: /view profile/i }).first().click();
  await page.waitForURL('**/dashboard/doctors/**', { timeout: 15000 });
  await sleep(1800);
  await shot(page, 'doctor_profile');
  await page.goBack();
  await page.waitForURL('**/doctors**');
  await page.getByPlaceholder(/search by name/i).fill('Priya');
  await sleep(1200);
  await page.locator('.MuiCard-root').first().waitFor({ timeout: 10000 });

  await page.getByRole('button', { name: /^book$/i }).first().click({ timeout: 15000 });
  await page.waitForURL('**/book-appointment/**');
  await sleep(1000);
  await shot(page, 'book_appointment');

  // Pick a slot and submit
  const slotChip = page.locator('.MuiChip-outlined.MuiChip-colorPrimary').first();
  if ((await slotChip.count()) > 0) {
    await slotChip.click();
  } else {
    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/appointment date/i).fill(today);
    await page.getByLabel(/appointment time/i).fill('23:30');
  }
  await page.getByLabel(/symptoms/i).fill('Severe headache and dizziness');
  await sleep(300);
  await page.locator('button[type="submit"]').click();
  await sleep(4000);

  // Booking submit may auto-open Razorpay; capture if shown then dismiss by hard-nav
  const rzpFrame = page.locator('iframe.razorpay-checkout-frame');
  if ((await rzpFrame.count()) > 0) {
    await sleep(1500);
    await shot(page, 'payment');
    await page.goto(`${BASE}/dashboard/appointments`);
    await sleep(1500);
  } else {
    // Maybe redirected to /appointments — grab payment shot from there if Pay button shown
    await page.goto(`${BASE}/dashboard/appointments`);
    await sleep(1500);
    const payBtn = page.getByRole('button', { name: /pay\s*₹/i }).first();
    if ((await payBtn.count()) > 0) {
      await payBtn.click();
      await sleep(3500);
      await shot(page, 'payment');
      await page.goto(`${BASE}/dashboard/appointments`);
      await sleep(1500);
    } else {
      await shot(page, 'payment');
    }
  }

  // My appointments view
  await page.goto(`${BASE}/dashboard/appointments`);
  await sleep(1500);
  await shot(page, 'appointments');

  // AI chatbot — already on /chat; if not, navigate
  if (!page.url().includes('/chat')) {
    await sidebar().getByText('AI Assistant').click();
    await page.waitForURL('**/chat**');
  }
  await page.getByPlaceholder(/describe your symptoms/i).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByPlaceholder(/describe your symptoms/i).fill('Severe chest pain and shortness of breath');
  await page.locator('button:has([data-testid="SendIcon"])').click();
  await sleep(7000);
  await shot(page, 'chatbot');

  await logout(page);

  // ── Doctor portal ─────────────────────────────────────────────────────────
  console.log('\n▶ Doctor portal');
  await login(page, DR_PRIYA.username, DR_PRIYA.password);
  await sleep(900);
  await shot(page, 'doctor_dashboard');

  await page.getByText('Pending Confirmation').click();
  await page.waitForURL('**/doctor-appointments**');
  await sleep(1200);
  await shot(page, 'doctor_appointments');

  const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
  if ((await acceptBtn.count()) > 0) {
    await acceptBtn.click();
    await sleep(1500);
  }

  await page.getByRole('button', { name: /^all/i }).first().click().catch(() => {});
  await sleep(700);
  const completeBtn = page.getByRole('button', { name: /mark complete/i }).first();
  if ((await completeBtn.count()) > 0) {
    await completeBtn.click();
    await page.locator('.MuiDialog-root').waitFor({ timeout: 8000 });
    await page.getByLabel(/diagnosis/i).fill('Tension headache; mild dehydration');
    await page.getByLabel(/^name/i).fill('Paracetamol 500mg');
    await page.getByLabel(/^dosage/i).fill('1 tablet');
    await page.getByLabel(/^frequency/i).fill('Twice a day after meals');
    await page.getByLabel(/^duration/i).fill('3 days');
    await page.getByLabel(/advice/i).fill('Stay hydrated, rest in a dark room.');
    await sleep(700);
    await shot(page, 'prescription_write');
    await page.getByRole('button', { name: /save.*email|update.*email/i }).click();
    await sleep(2500);
  } else {
    await shot(page, 'prescription_write');
  }

  // Availability
  await sidebar().getByText('Availability').click();
  await page.waitForURL('**/availability**');
  await sleep(1200);
  await shot(page, 'doctor_availability');

  await logout(page);

  // ── Patient: view prescription + rate ─────────────────────────────────────
  console.log('\n▶ Patient — prescription view + rating');
  await login(page, PATIENT.username, PATIENT.password);
  await sidebar().getByText('My Appointments').click();
  await page.waitForURL('**/appointments**');
  await page.getByRole('tab', { name: /past/i }).click().catch(() => {});
  await sleep(1500);

  const viewRx = page.getByRole('button', { name: /view prescription/i }).first();
  if ((await viewRx.count()) > 0) {
    await viewRx.click();
    await page.locator('.MuiDialog-root').waitFor({ timeout: 8000 });
    await sleep(1000);
    await shot(page, 'prescription_view');
    await page.keyboard.press('Escape');
    await sleep(400);
  } else {
    await shot(page, 'prescription_view');
  }

  const rateBtn = page.getByRole('button', { name: /rate doctor/i }).first();
  if ((await rateBtn.count()) > 0) {
    await rateBtn.click();
    await page.locator('.MuiDialog-root').waitFor();
    await page.locator('.MuiRating-root label').nth(4).click().catch(() => {});
    await page.getByLabel(/share your experience/i).fill('Very thorough consultation, clear advice.');
    await sleep(500);
    await shot(page, 'reviews');
    await page.getByRole('button', { name: /submit review/i }).click();
    await sleep(1500);
  } else {
    await shot(page, 'reviews');
  }

  // Profile
  await sidebar().getByText('Profile').click();
  await page.waitForURL('**/profile**');
  await sleep(1000);
  await shot(page, 'profile');

  await logout(page);

  // ── Admin portal ──────────────────────────────────────────────────────────
  console.log('\n▶ Admin portal');
  await login(page, ADMIN.username, ADMIN.password);
  await page.locator('.MuiCircularProgress-root').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
  await sleep(2500);
  await shot(page, 'admin_dashboard');

  // Scroll for system health
  await page.evaluate(() => window.scrollBy(0, 600));
  await sleep(800);
  await shot(page, 'admin_health');
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);

  // Doctor approvals
  await sidebar().getByText('Doctor Approvals').click();
  await page.waitForURL('**/doctor-approvals**');
  await sleep(1500);
  await shot(page, 'doctor_approvals');

  // User management
  await sidebar().getByText('User Management').click();
  await page.waitForURL('**/users**');
  await sleep(1500);
  await shot(page, 'admin_user_mgmt');

  await logout(page);

  // ── Swagger ───────────────────────────────────────────────────────────────
  console.log('\n▶ Swagger');
  await page.goto(`${API}/swagger-ui/index.html`);
  await page.waitForSelector('.swagger-ui', { timeout: 20000 }).catch(() => {});
  await sleep(2500);
  await shot(page, 'swagger');

  await browser.close();
  console.log('\n✓ All screenshots written to repo root.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
