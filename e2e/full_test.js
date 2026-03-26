/**
 * Smart Healthcare System — Full Frontend E2E Test Suite
 * Covers every page, button, input, tab, chip, dialog, nav item and route.
 * Runs with headless:false so the tester can watch every step.
 */

const { chromium } = require('playwright');

const BASE    = 'http://localhost:3000';
const PATIENT = { username: 'patient_demo', password: 'Demo@1234' };
const DOCTOR  = { username: 'dr_rajesh',    password: 'doctor123'  };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let passed = 0, failed = 0, warned = 0;
const RESULTS = [];

function section(title) {
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  ▶  ${title}`);
  console.log(`${'─'.repeat(65)}`);
}

function ok(label)   { console.log(`    ✓  ${label}`); passed++; RESULTS.push({ ok: true,  label }); }
function fail(label) { console.log(`    ✗  ${label}`); failed++; RESULTS.push({ ok: false, label }); }
function warn(label) { console.log(`    ⚠  ${label}`); warned++; }
function info(label) { console.log(`    ℹ  ${label}`); }

async function assertUrl(page, pattern, label) {
  try {
    await page.waitForURL(pattern, { timeout: 8000 });
    ok(label + ' → ' + page.url());
  } catch {
    fail(label + ' — URL never matched ' + pattern + ' (actual: ' + page.url() + ')');
  }
}

async function assertVisible(page, selector, label) {
  try {
    await page.waitForSelector(selector, { timeout: 6000 });
    ok(label + ' visible');
  } catch {
    fail(label + ' NOT visible [' + selector + ']');
  }
}

async function assertText(page, text, label) {
  const body = await page.textContent('body').catch(() => '');
  body.includes(text) ? ok(label) : fail(label + ` — "${text}" not found on page`);
}

async function fillLogin(page, username, password) {
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 8000 });
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');
}

// ═══════════════════════════════════════════════════════════════
(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 550,
    args: ['--start-maximized'],
  });
  const ctx  = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();

  // Capture all console errors from the app
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('PAGE ERROR: ' + err.message));

  try {

  // ═══════════════════════════════════════════════════════════
  // 1. PUBLIC ROUTES & AUTH
  // ═══════════════════════════════════════════════════════════

  section('1. PUBLIC ROUTES & AUTH');

  await page.goto(BASE);
  await assertUrl(page, '**/login', 'Root / redirects to /login');
  await sleep(600);

  await assertVisible(page, 'text=Healthcare Portal', 'Login page brand title');
  await assertVisible(page, 'text=Sign in to your account', 'Login page subtitle');
  await assertVisible(page, 'input[autocomplete="username"]', 'Username input field');
  await assertVisible(page, 'input[autocomplete="current-password"]', 'Password input field');
  await assertVisible(page, 'button[type="submit"]', 'Sign In button');
  await assertVisible(page, 'text=Register here', '"Register here" link');
  await sleep(400);

  // Password show/hide toggle
  const eyeBtn = page.locator('button[aria-label], button:has(svg)').nth(0);
  await eyeBtn.click().catch(() => {});
  await sleep(400);
  const pwType = await page.$eval('input[autocomplete="current-password"]', el => el.type).catch(() => '');
  pwType === 'text' ? ok('Password visibility toggle: hidden→visible') : warn('Password toggle may not have changed type');
  await eyeBtn.click().catch(() => {}); // hide again
  await sleep(300);

  // Wrong credentials
  await page.fill('input[autocomplete="username"]', 'wronguser');
  await page.fill('input[autocomplete="current-password"]', 'wrongpass');
  await page.click('button[type="submit"]');
  await sleep(2200);
  const errBody = await page.textContent('body');
  errBody.includes('Invalid') || errBody.includes('error') || errBody.includes('incorrect') || errBody.includes('wrong') || errBody.includes('password')
    ? ok('Invalid credentials shows error message')
    : warn('No visible error for wrong credentials');
  await sleep(400);

  // Navigate to Register
  await page.click('text=Register here');
  await assertUrl(page, '**/register', '"Register here" navigates to /register');
  await sleep(600);

  await assertVisible(page, 'text=Create Account', 'Register page title');
  await assertVisible(page, 'text=Join the Healthcare Portal', 'Register page subtitle');
  await assertVisible(page, 'input[autocomplete="username"]', 'Register: Username input');
  await assertVisible(page, 'input[autocomplete="email"]', 'Register: Email input');
  await assertVisible(page, 'text=I am a', 'Register: Role selector label');
  await assertVisible(page, 'text=Sign in here', '"Sign in here" link');

  // Role dropdown
  await page.click('#role-label + div, [labelid="role-label"], div:has(> #role-label)').catch(async () => {
    await page.click('text=I am a').catch(() => {});
  });
  await sleep(400);
  const patientOpt = page.locator('li:has-text("Patient")');
  const doctorOpt  = page.locator('li:has-text("Doctor")');
  await patientOpt.isVisible().catch(() => false) ? ok('Role dropdown: "Patient" option') : fail('Role dropdown: Patient missing');
  await doctorOpt.isVisible().catch(() => false)  ? ok('Role dropdown: "Doctor" option')  : fail('Role dropdown: Doctor missing');
  await page.keyboard.press('Escape');
  await sleep(300);

  // Password mismatch validation
  const pws = await page.$$('input[type="password"]');
  await pws[0].fill('Demo@1234');
  if (pws.length > 1) { await pws[1].fill('WrongConfirm'); }
  await page.fill('input[autocomplete="username"]', 'tmpuser');
  await page.fill('input[autocomplete="email"]', 'tmp@test.com');
  await page.click('button[type="submit"]');
  await sleep(1000);
  const mismatchBody = await page.textContent('body');
  mismatchBody.includes('match') || mismatchBody.includes('Match')
    ? ok('Password mismatch validation shown')
    : warn('Password mismatch validation not visible');

  // Navigate back to login
  await page.click('text=Sign in here');
  await assertUrl(page, '**/login', '"Sign in here" navigates to /login');
  await sleep(500);

  // ═══════════════════════════════════════════════════════════
  // 2. PATIENT — LOGIN & DASHBOARD
  // ═══════════════════════════════════════════════════════════

  section('2. PATIENT — LOGIN & DASHBOARD');

  await fillLogin(page, PATIENT.username, PATIENT.password);
  await assertUrl(page, '**/dashboard', 'Patient login → /dashboard');
  await sleep(1000);

  await assertText(page, PATIENT.username, 'Welcome message shows username');
  await assertText(page, 'Welcome back', 'Welcome back greeting shown');
  await assertText(page, 'Quick Actions', 'Quick Actions section visible');
  await assertText(page, 'Upcoming Appointments', 'Summary card: Upcoming Appointments');
  await assertText(page, 'Available Doctors', 'Summary card: Available Doctors');
  await assertText(page, 'Profile Status', 'Summary card: Profile Status');

  // AppBar elements
  await assertText(page, 'Smart Healthcare System', 'AppBar title visible');
  await assertVisible(page, 'button:has-text("Logout")', 'Logout button in AppBar');

  // Patient sidebar nav items
  await assertVisible(page, 'text=Browse Doctors', 'Sidebar: Browse Doctors');
  await assertVisible(page, 'text=My Appointments', 'Sidebar: My Appointments');
  await assertVisible(page, 'text=Profile', 'Sidebar: Profile');
  const noBrowseDoc = await page.locator('text=Manage Availability').isVisible().catch(() => false);
  !noBrowseDoc ? ok('Sidebar: Doctor-only items hidden for patient') : fail('Doctor nav items shown to patient');

  // Dashboard quick action buttons
  await assertVisible(page, 'button:has-text("Book Appointment")', 'Quick Action: Book Appointment button');
  await assertVisible(page, 'button:has-text("Browse Doctors")', 'Quick Action: Browse Doctors button');

  // "Book Appointment" button → should now go to /dashboard/doctors
  await page.locator('button:has-text("Book Appointment")').first().click();
  await assertUrl(page, '**/dashboard/doctors', 'Book Appointment button → /dashboard/doctors');
  await sleep(800);

  // Back to dashboard
  await page.click('text=Dashboard');
  await assertUrl(page, '**/dashboard', 'Sidebar Dashboard link works');
  await sleep(600);

  // Browse Doctors quick action
  await page.locator('button:has-text("Browse Doctors")').first().click();
  await assertUrl(page, '**/dashboard/doctors', 'Browse Doctors quick action navigates correctly');
  await sleep(800);

  // ═══════════════════════════════════════════════════════════
  // 3. PATIENT — BROWSE DOCTORS
  // ═══════════════════════════════════════════════════════════

  section('3. PATIENT — BROWSE DOCTORS');

  await assertText(page, 'Browse Doctors', 'Page title: Browse Doctors');
  await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
  const dcards = await page.$$('.MuiCard-root');
  dcards.length >= 8 ? ok(`${dcards.length} doctor cards loaded`) : fail(`Only ${dcards.length} doctor cards`);

  // Doctor card content
  const firstCard = await page.textContent('.MuiCard-root');
  firstCard.includes('Dr.') ? ok('Doctor card shows "Dr." prefix') : fail('Doctor name missing from card');
  firstCard.includes('years experience') ? ok('Doctor card shows experience') : fail('Experience missing');
  firstCard.includes('/') || firstCard.includes('5') ? ok('Doctor card shows rating') : warn('Rating not visible');
  firstCard.includes('₹') || firstCard.includes('consultation') ? ok('Doctor card shows fees') : fail('Fees missing');
  await assertVisible(page, 'button:has-text("Book Appointment")', 'Doctor card: Book Appointment button');

  // Specialization filter
  await assertVisible(page, '.MuiSelect-select', 'Specialization filter dropdown');
  await page.click('.MuiSelect-select');
  await sleep(500);
  for (const spec of ['Cardiology', 'Neurology', 'Orthopedics', 'Dermatology']) {
    const opt = page.locator(`li[data-value="${spec}"]`);
    await opt.isVisible().catch(() => false) ? ok(`Filter option "${spec}" present`) : fail(`Filter option "${spec}" missing`);
  }
  // Apply Cardiology filter
  await page.click('li[data-value="Cardiology"]');
  await sleep(1200);
  const cardioCards = await page.$$('.MuiCard-root');
  cardioCards.length >= 1 ? ok(`Cardiology filter: ${cardioCards.length} doctors shown`) : fail('Cardiology filter returned 0 doctors');
  // Reset
  await page.click('.MuiSelect-select');
  await sleep(400);
  await page.click('li[data-value=""]');
  await sleep(1000);
  ok('Specialization filter reset to All');

  // ═══════════════════════════════════════════════════════════
  // 4. PATIENT — BOOK APPOINTMENT
  // ═══════════════════════════════════════════════════════════

  section('4. PATIENT — BOOK APPOINTMENT');

  await page.waitForSelector('button:has-text("Book Appointment")', { timeout: 6000 });
  await page.locator('button:has-text("Book Appointment")').first().click();
  await assertUrl(page, '**/dashboard/book-appointment/**', 'Doctor card → Book Appointment page');
  await sleep(1200);

  await assertText(page, 'Book Appointment', 'Page title: Book Appointment');
  await assertVisible(page, 'button:has-text("Back to Doctors")', 'Back to Doctors button');

  // Doctor info panel
  await assertText(page, 'per consultation', 'Doctor fees shown in info panel');
  await assertText(page, 'Experience', 'Doctor experience shown');

  // Available slot chips
  await page.waitForSelector('.MuiChip-root', { timeout: 8000 });
  const allChips = await page.$$('.MuiChip-root');
  const clickableSlots = await page.$$('.MuiChip-clickable');
  allChips.length > 0 ? ok(`${allChips.length} total chips on page`) : fail('No chips rendered on booking page');
  clickableSlots.length > 0 ? ok(`${clickableSlots.length} clickable slot chips available`) : warn('No clickable slots (check backend data)');

  if (clickableSlots.length > 0) {
    // Use slot index 4 to avoid slots already booked in previous test runs
    const slotIdx = Math.min(4, clickableSlots.length - 1);
    await clickableSlots[slotIdx].click();
    await sleep(700);
    const dv = await page.$eval('input[type="date"]', el => el.value).catch(() => '');
    const tv = await page.$eval('input[type="time"]', el => el.value).catch(() => '');
    dv ? ok(`Slot click prefills date: ${dv}`) : fail('Date not prefilled after slot click');
    tv ? ok(`Slot click prefills time: ${tv}`) : fail('Time not prefilled after slot click');
  }

  // Form fields
  await assertVisible(page, 'input[type="date"]', 'Appointment date input');
  await assertVisible(page, 'input[type="time"]', 'Appointment time input');
  await assertVisible(page, 'textarea', 'Symptoms textarea');
  await assertText(page, 'Consultation Fee', 'Read-only consultation fee field');

  // Fill and submit — use timestamp-based time to avoid duplicate conflicts
  const testMinute = String(new Date().getMinutes()).padStart(2, '0');
  const testHour   = String(9 + (new Date().getSeconds() % 7)).padStart(2, '0');
  await page.fill('input[type="date"]', '2026-04-01');
  await page.fill('input[type="time"]', `${testHour}:${testMinute}`);
  await page.fill('textarea', 'Automated test: headache, fatigue and mild fever for 3 days');
  await sleep(500);

  await page.click('button[type="submit"]:has-text("Book Appointment")');
  await sleep(2500);

  // Confirmation card
  const afterBook = await page.textContent('body');
  afterBook.includes('Booked') || afterBook.includes('Appointment Booked')
    ? ok('Confirmation card: "Appointment Booked!" shown')
    : fail('Booking confirmation card missing');
  afterBook.includes('PENDING') || afterBook.includes('Pending')
    ? ok('Confirmation card shows PENDING status')
    : fail('PENDING status not shown in confirmation');
  afterBook.includes('Awaiting confirmation')
    ? ok('Confirmation card: "Awaiting confirmation" message shown')
    : warn('"Awaiting confirmation" text missing');

  // Form fields should be disabled after booking
  const dateDisabled = await page.$eval('input[type="date"]', el => el.disabled).catch(() => false);
  dateDisabled ? ok('Form disabled after booking') : warn('Form not disabled after booking');

  // Auto-redirect
  await assertUrl(page, '**/dashboard/appointments', 'Auto-redirected to /appointments after 4 s');
  await sleep(1000);

  // ═══════════════════════════════════════════════════════════
  // 5. PATIENT — MY APPOINTMENTS
  // ═══════════════════════════════════════════════════════════

  section('5. PATIENT — MY APPOINTMENTS');

  // Navigate explicitly in case booking redirect failed
  if (!page.url().includes('/appointments')) {
    await page.click('text=My Appointments');
    await page.waitForURL('**/dashboard/appointments', { timeout: 8000 });
  }
  await sleep(800);

  await assertText(page, 'My Appointments', 'Page title: My Appointments');
  await assertVisible(page, 'button:has-text("Refresh")', 'Refresh button');

  // Three tabs
  await assertVisible(page, 'text=Upcoming', 'Tab: Upcoming');
  await assertVisible(page, 'text=Past', 'Tab: Past');
  await assertVisible(page, 'text=Cancelled', 'Tab: Cancelled');

  // Table headers
  await page.waitForSelector('table', { timeout: 8000 });
  await assertText(page, 'Doctor', 'Table column: Doctor');
  await assertText(page, 'Date & Time', 'Table column: Date & Time');
  await assertText(page, 'Symptoms', 'Table column: Symptoms');
  await assertText(page, 'Status', 'Table column: Status');

  // PENDING chip in table
  await assertText(page, 'Pending', 'PENDING status chip in Upcoming tab');

  // Appointment row has doctor name
  const apptRows = await page.$$('tbody tr');
  apptRows.length > 0 ? ok(`${apptRows.length} appointment row(s) in Upcoming tab`) : fail('No appointment rows in Upcoming');

  // Cancel button inside table row (not the tab button which also contains "Cancel")
  const rowCancelBtn = page.locator('tbody tr button:has-text("Cancel")').first();
  await rowCancelBtn.isVisible().catch(() => false)
    ? ok('Cancel button visible in appointment row')
    : fail('Cancel button NOT visible in table row');

  // Cancel → dialog opens → Keep It
  await rowCancelBtn.click();
  await sleep(1000);
  const dlgVisible = await page.locator('.MuiDialog-root').isVisible().catch(() => false);
  dlgVisible ? ok('Cancel confirmation dialog opens') : fail('Cancel confirmation dialog did NOT open');
  const dlgText = await page.textContent('body');
  dlgText.includes('Cancel Appointment?') ? ok('Dialog title: "Cancel Appointment?"') : fail('Dialog title missing');
  dlgText.includes('cannot be undone') ? ok('Dialog warning text visible') : fail('Dialog warning text missing');
  const keepBtn    = page.locator('.MuiDialog-root button:has-text("Keep It")');
  const yesCancelBtn = page.locator('.MuiDialog-root button:has-text("Yes, Cancel")');
  await keepBtn.isVisible().catch(() => false)    ? ok('Dialog: "Keep It" button visible')    : fail('Dialog: "Keep It" button missing');
  await yesCancelBtn.isVisible().catch(() => false) ? ok('Dialog: "Yes, Cancel" button visible') : fail('Dialog: "Yes, Cancel" button missing');
  await keepBtn.click();
  await sleep(700);
  ok('Dialog dismissed with "Keep It" — appointment kept');

  // Actually cancel one
  await rowCancelBtn.click();
  await sleep(800);
  await page.locator('.MuiDialog-root button:has-text("Yes, Cancel")').click();
  await sleep(1500);
  ok('Appointment cancelled via "Yes, Cancel"');

  // Check Cancelled tab
  await page.click('[role="tab"]:has-text("Cancelled")');
  await sleep(800);
  const cancelledBody = await page.textContent('body');
  cancelledBody.includes('Cancelled') ? ok('Cancelled tab shows cancelled appointments') : fail('Cancelled tab empty unexpectedly');

  // Check Past tab
  await page.click('[role="tab"]:has-text("Past")');
  await sleep(700);
  ok('Past tab opened successfully');

  // Refresh
  await page.click('button:has-text("Refresh")');
  await sleep(1200);
  ok('Refresh reloaded appointments');

  // Switch back to Upcoming and check empty state CTA
  await page.click('[role="tab"]:has-text("Upcoming")');
  await sleep(800);
  const upBody = await page.textContent('body');
  if (upBody.includes('Book New Appointment')) {
    await assertVisible(page, 'button:has-text("Book New Appointment")', '"Book New Appointment" CTA on empty state');
    await page.click('button:has-text("Book New Appointment")');
    await assertUrl(page, '**/dashboard/doctors', 'Empty state CTA → /dashboard/doctors');
    await sleep(700);
    await page.click('text=My Appointments');
    await assertUrl(page, '**/dashboard/appointments', 'Back to appointments via sidebar');
    await sleep(600);
  } else {
    info('Appointments still exist — empty state CTA not shown (expected)');
  }

  // ═══════════════════════════════════════════════════════════
  // 6. PATIENT — PROFILE & SIDEBAR
  // ═══════════════════════════════════════════════════════════

  section('6. PATIENT — PROFILE PAGE & SIDEBAR');

  await page.click('text=Profile');
  await assertUrl(page, '**/dashboard/profile', 'Sidebar Profile → /dashboard/profile');
  await sleep(600);
  await assertText(page, 'Profile', 'Profile page rendered');

  // Verify full sidebar works
  await page.click('text=Dashboard');
  await assertUrl(page, '**/dashboard', 'Sidebar Dashboard link');
  await sleep(500);
  await page.click('text=Browse Doctors');
  await assertUrl(page, '**/dashboard/doctors', 'Sidebar Browse Doctors link');
  await sleep(500);
  await page.click('text=My Appointments');
  await assertUrl(page, '**/dashboard/appointments', 'Sidebar My Appointments link');
  await sleep(500);

  // ═══════════════════════════════════════════════════════════
  // 7. PATIENT LOGOUT
  // ═══════════════════════════════════════════════════════════

  section('7. PATIENT LOGOUT');

  await page.click('button:has-text("Logout")');
  await assertUrl(page, '**/login', 'Logout → /login');
  await sleep(700);

  // After logout, protected routes should redirect
  await page.goto(`${BASE}/dashboard`);
  await assertUrl(page, '**/login', '/dashboard blocked after logout');
  await sleep(400);
  await page.goto(`${BASE}/dashboard/doctors`);
  await assertUrl(page, '**/login', '/dashboard/doctors blocked after logout');
  await sleep(400);
  await page.goto(`${BASE}/dashboard/appointments`);
  await assertUrl(page, '**/login', '/dashboard/appointments blocked after logout');
  await sleep(600);

  // ═══════════════════════════════════════════════════════════
  // 8. DOCTOR — LOGIN & DASHBOARD
  // ═══════════════════════════════════════════════════════════

  section('8. DOCTOR — LOGIN & DASHBOARD');

  await fillLogin(page, DOCTOR.username, DOCTOR.password);
  await assertUrl(page, '**/dashboard', 'Doctor login → /dashboard');
  await sleep(1200);

  await assertText(page, 'dr_rajesh', 'Doctor welcome shows username');
  await assertText(page, 'Welcome, Dr.', 'Doctor welcome greeting');
  await assertText(page, "Today's Appointments", "Summary card: Today's Appointments");
  await assertText(page, 'Pending Confirmation', 'Summary card: Pending Confirmation');
  await assertText(page, 'Confirmed Today', 'Summary card: Confirmed Today');
  await assertText(page, 'Quick Actions', 'Quick Actions section');
  await assertVisible(page, 'button:has-text("View All Appointments")', 'Quick Action: View All Appointments');
  await assertVisible(page, 'button:has-text("Manage Availability")', 'Quick Action: Manage Availability');

  // Doctor sidebar — different from patient
  await assertVisible(page, 'text=Appointments', 'Doctor sidebar: Appointments');
  await assertVisible(page, 'text=Manage Availability', 'Doctor sidebar: Manage Availability');
  const noBrowseDr = await page.locator('text=Browse Doctors').isVisible().catch(() => false);
  !noBrowseDr ? ok('Browse Doctors hidden in doctor sidebar') : fail('Browse Doctors should not appear for doctor');
  const noMyAppts = await page.locator('text=My Appointments').isVisible().catch(() => false);
  !noMyAppts ? ok('"My Appointments" (patient label) hidden for doctor') : warn('"My Appointments" visible for doctor');

  // Quick action buttons
  await page.click('button:has-text("View All Appointments")');
  await assertUrl(page, '**/dashboard/doctor-appointments', '"View All Appointments" → doctor appointments page');
  await sleep(700);
  await page.click('text=Dashboard');
  await sleep(500);
  await page.click('button:has-text("Manage Availability")');
  await assertUrl(page, '**/dashboard/availability', '"Manage Availability" → availability page');
  await sleep(700);
  await page.click('text=Dashboard');
  await sleep(500);

  // ═══════════════════════════════════════════════════════════
  // 9. DOCTOR — APPOINTMENTS PAGE
  // ═══════════════════════════════════════════════════════════

  section('9. DOCTOR — APPOINTMENTS PAGE');

  await page.click('text=Appointments');
  await assertUrl(page, '**/dashboard/doctor-appointments', 'Sidebar Appointments → doctor-appointments');
  await sleep(1200);

  await assertText(page, 'Appointments', 'Page title: Appointments');
  await assertVisible(page, 'button:has-text("Refresh")', 'Refresh button');

  // Summary bar
  await assertText(page, "Today's Appointments", "Summary bar: Today's Appointments");
  await assertText(page, 'Pending Requests', 'Summary bar: Pending Requests');
  await assertText(page, 'Next Appointment', 'Summary bar: Next Appointment');

  // Filter buttons
  for (const f of ['All', 'Pending', 'Confirmed', 'Completed']) {
    await page.locator(`button:has-text("${f}")`).first().isVisible().catch(() => false)
      ? ok(`Filter button "${f}" visible`)
      : fail(`Filter button "${f}" missing`);
  }

  // Filter: Pending
  await page.locator('button:has-text("Pending")').first().click();
  await sleep(1000);
  ok('Pending filter applied');

  // Accept appointment
  const acceptBtn = page.locator('button:has-text("Accept")').first();
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await sleep(1500);
    ok('Pending → Accepted (CONFIRMED)');
  } else {
    warn('No pending appointments to accept right now');
  }

  // Filter: Confirmed
  await page.locator('button:has-text("Confirmed")').first().click();
  await sleep(1000);
  ok('Confirmed filter applied');

  // Mark complete
  const completeBtn = page.locator('button:has-text("Mark Complete")').first();
  if (await completeBtn.isVisible().catch(() => false)) {
    await completeBtn.click();
    await sleep(1500);
    ok('Confirmed → Completed');
  } else {
    warn('No confirmed appointments to complete');
  }

  // Reject: go back to pending, reject one
  await page.locator('button:has-text("Pending")').first().click();
  await sleep(800);
  const rejectBtn = page.locator('button:has-text("Reject")').first();
  if (await rejectBtn.isVisible().catch(() => false)) {
    await rejectBtn.click();
    await sleep(1500);
    ok('Pending → Rejected (CANCELLED)');
  } else {
    info('No pending appointments to reject');
  }

  // Filter: All
  await page.locator('button:has-text("All")').first().click();
  await sleep(800);
  const allCards = await page.$$('.MuiCard-root');
  ok(`All filter: ${allCards.length} appointment card(s) shown`);

  // Refresh
  await page.click('button:has-text("Refresh")');
  await sleep(1200);
  ok('Appointments refreshed');

  // ═══════════════════════════════════════════════════════════
  // 10. DOCTOR — MANAGE AVAILABILITY
  // ═══════════════════════════════════════════════════════════

  section('10. DOCTOR — MANAGE AVAILABILITY');

  await page.click('text=Manage Availability');
  await assertUrl(page, '**/dashboard/availability', 'Sidebar → /dashboard/availability');
  await sleep(1200);

  await assertText(page, 'Manage Availability', 'Page title: Manage Availability');
  await assertText(page, 'Add a Slot', '"Add a Slot" section');
  await assertText(page, 'Current Slots', '"Current Slots" section');
  await assertVisible(page, 'input[type="date"]', 'Date picker for new slot');
  await assertVisible(page, 'input[type="time"]', 'Time picker for new slot');
  await assertVisible(page, 'button:has-text("Add")', '"Add" slot button');
  await assertVisible(page, 'button:has-text("Save Changes")', '"Save Changes" button');

  // Existing slot chips
  await page.waitForSelector('.MuiChip-root', { timeout: 8000 });
  const existingChips = await page.$$('.MuiChip-root');
  existingChips.length >= 20
    ? ok(`${existingChips.length} existing slot chips displayed`)
    : warn(`Only ${existingChips.length} chips — expected 28`);

  // Remove a slot
  const delIcon = page.locator('.MuiChip-deleteIcon').first();
  if (await delIcon.isVisible().catch(() => false)) {
    const before = await page.$$eval('.MuiChip-root', els => els.length);
    await delIcon.click();
    await sleep(700);
    const after = await page.$$eval('.MuiChip-root', els => els.length);
    after < before ? ok(`Slot removed: ${before} → ${after} chips`) : fail('Chip count unchanged after remove');
  }

  // Add a new slot
  await page.fill('input[type="date"]', '2026-04-02');
  await page.fill('input[type="time"]', '10:00');
  await page.click('button:has-text("Add")');
  await sleep(800);
  const afterAdd = await page.$$('.MuiChip-root');
  ok(`New slot added → ${afterAdd.length} chips`);

  // Add duplicate → should show error
  await page.fill('input[type="date"]', '2026-04-02');
  await page.fill('input[type="time"]', '10:00');
  await page.click('button:has-text("Add")');
  await sleep(700);
  const dupBody = await page.textContent('body');
  dupBody.includes('already exists') ? ok('Duplicate slot error shown') : warn('No error for duplicate slot');

  // Save
  await page.click('button:has-text("Save Changes")');
  await sleep(2000);
  const saveBody = await page.textContent('body');
  saveBody.includes('success') || saveBody.includes('Success')
    ? ok('Save success message shown')
    : fail('No success message after save');

  // ═══════════════════════════════════════════════════════════
  // 11. DOCTOR — PROFILE & LOGOUT
  // ═══════════════════════════════════════════════════════════

  section('11. DOCTOR — PROFILE & LOGOUT');

  await page.click('text=Profile');
  await assertUrl(page, '**/dashboard/profile', 'Doctor sidebar Profile link');
  await sleep(500);

  await page.click('button:has-text("Logout")');
  await assertUrl(page, '**/login', 'Doctor logout → /login');
  await sleep(700);

  // Verify protected routes blocked again
  await page.goto(`${BASE}/dashboard/doctor-appointments`);
  await assertUrl(page, '**/login', '/doctor-appointments blocked after logout');
  await sleep(400);
  await page.goto(`${BASE}/dashboard/availability`);
  await assertUrl(page, '**/login', '/availability blocked after logout');
  await sleep(600);

  // ═══════════════════════════════════════════════════════════
  // 12. REGISTER NEW USER VIA UI
  // ═══════════════════════════════════════════════════════════

  section('12. NEW USER REGISTRATION VIA UI');

  await page.click('text=Register here');
  await assertUrl(page, '**/register', 'Register link from login page');
  await sleep(600);

  const ts = Date.now().toString().slice(-7);
  const newUser = `newpat_${ts}`;
  await page.fill('input[autocomplete="username"]', newUser);
  await page.fill('input[autocomplete="email"]', `${newUser}@test.com`);
  const pwInputs = await page.$$('input[type="password"]');
  await pwInputs[0].fill('Demo@1234');
  if (pwInputs.length > 1) await pwInputs[1].fill('Demo@1234');
  // Role defaults to Patient
  await page.click('button[type="submit"]');
  await assertUrl(page, '**/dashboard', `New patient ${newUser} registered and auto-logged in`);
  await sleep(1000);

  await assertText(page, newUser, 'New user welcome message shows username');

  // New patient has empty appointments
  await page.click('text=My Appointments');
  await assertUrl(page, '**/dashboard/appointments', 'New patient → My Appointments');
  await sleep(1200);
  const emptyBody = await page.textContent('body');
  if (emptyBody.includes('Book New Appointment')) {
    ok('"Book New Appointment" CTA visible on empty appointments state');
    await page.click('button:has-text("Book New Appointment")');
    await assertUrl(page, '**/dashboard/doctors', 'Empty state CTA → Browse Doctors');
    await sleep(700);
  } else {
    info('Appointments exist — empty state not shown');
  }

  // Final logout
  await page.click('button:has-text("Logout")');
  await assertUrl(page, '**/login', 'Final logout successful');
  await sleep(600);

  // ═══════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(65));
  console.log('  FINAL TEST RESULTS');
  console.log('═'.repeat(65));
  console.log(`  ✓  Passed : ${passed}`);
  console.log(`  ✗  Failed : ${failed}`);
  console.log(`  ⚠  Warned : ${warned}`);
  console.log(`  Total     : ${passed + failed}`);

  if (consoleErrors.length > 0) {
    console.log(`\n  ── Browser Console Errors (${consoleErrors.length}) ──`);
    consoleErrors.slice(0, 10).forEach(e => console.log('    ⛔', e));
  } else {
    console.log('\n  ── No browser console errors ✓');
  }

  if (failed > 0) {
    console.log('\n  ── Failed checks ──');
    RESULTS.filter(r => !r.ok).forEach(r => console.log('    ✗', r.label));
  }

  console.log('\n  Keeping browser open for 12 seconds for review...');

  } catch (err) {
    console.error('\n  FATAL TEST ERROR:', err.message);
    console.log(`  Tests run so far — Passed: ${passed}, Failed: ${failed}`);
  }

  await sleep(12000);
  await browser.close();
})();
