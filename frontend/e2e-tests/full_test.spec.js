/**
 * COMPREHENSIVE E2E DEMO TEST — Single Session
 *
 * One continuous browser session that walks through every feature like a live demo.
 * No browser restarts between sections — login/logout happens within the same tab.
 *
 * Run with: npx playwright test e2e-tests/full_test.spec.js --headed
 */
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:8080';

// Credentials
const PATIENT  = { username: 'patient1',  password: 'password'   };
const DR_PRIYA = { username: 'dr_priya',  password: 'doctor123'  };
const DOCTOR   = { username: 'dr_sharma', password: 'doctor123'  };
const ADMIN    = { username: 'admin',     password: 'admin123'   };

// Comfortable pause so viewers can see what's happening
const PAUSE   = 1200;
const SHORT   = 600;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function pause(page, ms = PAUSE) {
  await page.waitForTimeout(ms);
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
  // Dismiss any leftover toast
  const closeBtn = page.locator('[role="alert"] button[aria-label="Close"], .MuiAlert-action button');
  if ((await closeBtn.count()) > 0) {
    await closeBtn.first().click().catch(() => {});
    await pause(page, 400);
  }
  await page.fill('input[autocomplete="username"]', username);
  await pause(page, SHORT);
  await page.fill('input[autocomplete="current-password"]', password);
  await pause(page, SHORT);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  await pause(page);
}

async function logout(page) {
  const logoutBtn = page.getByRole('button', { name: /logout/i });
  if ((await logoutBtn.count()) > 0) {
    await logoutBtn.click();
    await pause(page, SHORT);
    const confirmBtn = page.getByRole('button', { name: /^log out$/i });
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.click();
    }
  }
  await page.waitForURL('**/login**', { timeout: 10000 });
  await pause(page);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE CONTINUOUS DEMO TEST
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Healthcare Portal — Full Demo', () => {

  // Ensure patient user exists before the demo
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/api/auth/register`, {
      data: { username: PATIENT.username, email: 'patient1@test.com', password: PATIENT.password, role: 'PATIENT' },
    }).catch(() => {});
  });

  test('Complete feature walkthrough — single session', async ({ page }) => {

    // Give ourselves plenty of time for the full demo
    test.setTimeout(600_000); // 10 minutes

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 1: LOGIN PAGE — UI & Validation
    // ═══════════════════════════════════════════════════════════════════════════

    await page.goto(`${BASE}/login`);
    await pause(page);

    // -- Show all login page elements --
    await expect(page.getByText('Healthcare Portal')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText('Register here')).toBeVisible();
    await pause(page);

    // -- Password visibility toggle --
    const pwdField = page.locator('input[autocomplete="current-password"]');
    await pwdField.fill('demo');
    await pause(page, SHORT);
    const toggleBtn = pwdField.locator('..').locator('..').locator('button').last();
    await toggleBtn.click();
    await expect(pwdField).toHaveAttribute('type', 'text');
    await pause(page, SHORT);
    await toggleBtn.click();
    await expect(pwdField).toHaveAttribute('type', 'password');
    await pause(page, SHORT);
    await pwdField.clear();

    // -- Try wrong credentials --
    await page.fill('input[autocomplete="username"]', 'wronguser');
    await page.fill('input[autocomplete="current-password"]', 'wrongpass');
    await pause(page, SHORT);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/invalid|failed|incorrect/i)).toBeVisible();
    await pause(page);

    // -- Navigate to Register page and back --
    await page.getByText('Register here').click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await pause(page);
    await page.getByText('Sign in here').click();
    await expect(page).toHaveURL(/\/login/);
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 2: LOGIN AS PATIENT — Explore Dashboard
    // ═══════════════════════════════════════════════════════════════════════════

    await login(page, PATIENT.username, PATIENT.password);

    // -- Dashboard overview --
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByText('Upcoming Appointments')).toBeVisible();
    await expect(page.getByText('Available Doctors')).toBeVisible();
    await expect(page.getByText('Profile Status')).toBeVisible();
    await pause(page);

    // -- Quick Actions section --
    const main = page.locator('main');
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(main.getByRole('button', { name: /book appointment/i })).toBeVisible();
    await expect(main.getByRole('button', { name: /browse doctors/i })).toBeVisible();
    await expect(page.getByText('AI Health Assistant')).toBeVisible();
    await expect(main.getByRole('button', { name: /talk to ai/i })).toBeVisible();
    await pause(page);

    // -- Sidebar navigation items --
    const sidebar = page.locator('.MuiDrawer-root');
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Browse Doctors')).toBeVisible();
    await expect(sidebar.getByText('My Appointments')).toBeVisible();
    await expect(sidebar.getByText('AI Assistant')).toBeVisible();
    await expect(sidebar.getByText('Profile')).toBeVisible();
    await pause(page);

    // -- Top bar elements --
    const toolbar = page.locator('.MuiAppBar-root');
    await expect(toolbar.getByText('Smart Healthcare')).toBeVisible();
    await expect(toolbar.locator('.MuiAvatar-root').first()).toBeVisible();
    await expect(toolbar.getByText(PATIENT.username)).toBeVisible();
    await expect(page.locator('[aria-label="notifications"]')).toBeVisible();
    await expect(toolbar.getByRole('button', { name: /logout/i })).toBeVisible();
    await pause(page);

    // -- Click summary cards --
    await page.getByText('Upcoming Appointments').click();
    await page.waitForURL('**/appointments**');
    await pause(page);
    await page.goBack();
    await pause(page, SHORT);
    await page.getByText('Available Doctors').click();
    await page.waitForURL('**/doctors**');
    await pause(page);
    await page.goBack();
    await pause(page, SHORT);

    // -- Quick action: Browse Doctors --
    await main.getByRole('button', { name: /browse doctors/i }).click();
    await page.waitForURL('**/doctors**');
    await pause(page);
    await page.goBack();
    await pause(page, SHORT);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 3: BROWSE DOCTORS — Search, Filter, View Cards
    // ═══════════════════════════════════════════════════════════════════════════

    await sidebar.getByText('Browse Doctors').click();
    await page.waitForURL('**/doctors**');
    await expect(page.getByRole('heading', { name: /browse doctors/i })).toBeVisible();
    await pause(page);

    // Wait for doctor cards to load
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
    await pause(page);

    // -- Inspect first doctor card --
    const firstCard = page.locator('.MuiCard-root').first();
    await expect(firstCard.getByText(/^Dr\./)).toBeVisible();
    await expect(firstCard.getByText(/years experience/i)).toBeVisible();
    await expect(firstCard.getByText(/\/ 5/)).toBeVisible();
    await expect(firstCard.getByText(/₹/)).toBeVisible();
    await expect(firstCard.getByRole('button', { name: /book appointment/i })).toBeVisible();
    await pause(page);

    // -- Specialization filter --
    await page.locator('.MuiSelect-select').first().click();
    await pause(page, SHORT);
    const cardiology = page.getByRole('option', { name: 'Cardiology' });
    if ((await cardiology.count()) > 0) {
      await cardiology.click();
      await pause(page);
      // Wait for filtered results or empty state
      await page.waitForTimeout(1500);
      await pause(page);
    } else {
      await page.keyboard.press('Escape');
    }

    // Reset filter back to "All Specializations"
    await page.locator('.MuiSelect-select').first().click();
    await pause(page, SHORT);
    const allOption = page.getByRole('option', { name: /all specializations/i });
    if ((await allOption.count()) > 0) {
      await allOption.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1500);
    await pause(page);

    // -- Search by name --
    await page.getByPlaceholder(/search by name/i).fill('Sharma');
    await page.waitForTimeout(800); // debounce is 400ms
    await pause(page);
    await page.getByPlaceholder(/search by name/i).clear();
    await page.waitForTimeout(800);
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 4: BOOK AN APPOINTMENT WITH DR_PRIYA (today)
    // ═══════════════════════════════════════════════════════════════════════════

    // Search for Dr. Priya specifically
    await page.getByPlaceholder(/search by name/i).fill('Priya');
    await page.waitForTimeout(800); // debounce
    await pause(page);

    // Click dr_priya's Book Appointment button
    await page.getByRole('button', { name: /book appointment/i }).first().click();
    await page.waitForURL('**/book-appointment/**');
    await pause(page);

    // -- Show booking page elements --
    await expect(page.getByRole('button', { name: /back to doctors/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /book appointment/i })).toBeVisible();
    // Confirm this is Dr. Priya
    await expect(page.getByText(/Dr\. .*priya/i)).toBeVisible();
    await expect(page.getByLabel(/appointment date/i)).toBeVisible();
    await expect(page.getByLabel(/appointment time/i)).toBeVisible();
    await expect(page.getByLabel(/symptoms/i)).toBeVisible();
    await pause(page);

    // -- Book for TODAY so notifications trigger within 24h --
    const todayDate = new Date().toISOString().split('T')[0];

    // If a today slot chip exists, click it; otherwise fill manually
    const slotChip = page.locator('.MuiChip-outlined.MuiChip-colorPrimary').first();
    if ((await slotChip.count()) > 0) {
      await slotChip.click();
      await pause(page);
    } else {
      await page.getByLabel(/appointment date/i).fill(todayDate);
      await pause(page, SHORT);
      await page.getByLabel(/appointment time/i).fill('23:30');
      await pause(page, SHORT);
    }

    // Fill symptoms
    await page.getByLabel(/symptoms/i).fill('Severe headache and dizziness since morning');
    await pause(page);

    // Submit
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText(/appointment request submitted/i).first()
    ).toBeVisible({ timeout: 20000 });
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 5: MY APPOINTMENTS — See Pending status for Dr. Priya
    // ═══════════════════════════════════════════════════════════════════════════

    // Wait for auto-redirect to appointments page (booking page redirects after 3s)
    await page.waitForURL('**/appointments**', { timeout: 10000 }).catch(() => {});
    await sidebar.getByText('My Appointments').click();
    await page.waitForURL('**/appointments**');
    await expect(page.getByRole('heading', { name: /my appointments/i })).toBeVisible();
    await pause(page);

    // -- Tabs --
    await expect(page.getByRole('tab', { name: /upcoming/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /past/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /cancelled/i })).toBeVisible();
    await pause(page);

    // Should see the appointment we just booked with Pending status
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 5000 });
    await pause(page);

    // Switch tabs
    await page.getByRole('tab', { name: /past/i }).click();
    await pause(page);
    await page.getByRole('tab', { name: /cancelled/i }).click();
    await pause(page);
    await page.getByRole('tab', { name: /upcoming/i }).click();
    await pause(page);

    // -- Refresh button --
    await page.getByRole('button', { name: /refresh/i }).click();
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 6: NOTIFICATION BELL
    // ═══════════════════════════════════════════════════════════════════════════

    await page.locator('[aria-label="notifications"]').click();
    await pause(page);
    // Notification popover shows upcoming appointments within 24 hours
    const notifPopover = page.getByText(/upcoming in the next 24/i);
    if ((await notifPopover.count()) > 0) {
      await expect(notifPopover).toBeVisible();
    }
    await pause(page);
    await page.keyboard.press('Escape');
    await pause(page, SHORT);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 7: AI HEALTH ASSISTANT — Chat, Quick Picks, Recommended Doctors
    // ═══════════════════════════════════════════════════════════════════════════

    await sidebar.getByText('AI Assistant').click();
    await page.waitForURL('**/chat**');
    await expect(page.getByRole('heading', { name: /ai health assistant/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible();
    await pause(page);

    // Wait for chat session to initialize
    await page.getByPlaceholder(/describe your symptoms/i).waitFor({ state: 'visible', timeout: 15000 });
    await pause(page);

    // -- Show quick pick suggestions --
    const quickPicks = page.locator('.MuiChip-outlined');
    const quickPickCount = await quickPicks.count();
    if (quickPickCount > 0) {
      await pause(page);
      // Click a quick pick suggestion
      await quickPicks.first().click();
      await pause(page);
      // Wait for AI response
      await page.waitForTimeout(8000);
      await pause(page);
    }

    // -- Send a custom symptom message --
    await page.getByPlaceholder(/describe your symptoms/i).fill('I have severe chest pain and difficulty breathing');
    await pause(page);
    // Click send button
    await page.locator('button:has([data-testid="SendIcon"])').click();
    await expect(page.getByText('I have severe chest pain and difficulty breathing')).toBeVisible({ timeout: 5000 });
    await pause(page);
    // Wait for AI bot response (may take time)
    await page.waitForTimeout(10000);
    await pause(page);

    // -- Check if recommended doctors appeared --
    const recDoctors = page.getByText(/recommended.*doctors/i);
    if ((await recDoctors.count()) > 0) {
      await expect(recDoctors).toBeVisible();
      await pause(page);
      // Show a recommended doctor card with Book Appointment button
      const bookBtnInRec = page.getByRole('button', { name: /book appointment/i }).first();
      if ((await bookBtnInRec.count()) > 0) {
        await expect(bookBtnInRec).toBeVisible();
        await pause(page);
      }
    }

    // -- New Chat button --
    await page.getByRole('button', { name: /new chat/i }).click();
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 8: PATIENT PROFILE — View, Edit, Change Password
    // ═══════════════════════════════════════════════════════════════════════════

    await sidebar.getByText('Profile').click();
    await page.waitForURL('**/profile**');
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible();
    await pause(page);

    // -- Show profile fields --
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByText('Health Information')).toBeVisible();
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /change password/i })).toBeVisible();
    await pause(page);

    // -- Edit profile --
    await page.getByRole('button', { name: /edit profile/i }).click();
    await pause(page);
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i }).first()).toBeVisible();

    // Fill in some health information
    const ageField = page.getByLabel(/age/i);
    if ((await ageField.count()) > 0) {
      await ageField.clear();
      await ageField.fill('25');
      await pause(page, SHORT);
    }

    // Select gender if available
    const genderSelect = page.getByLabel(/gender/i);
    if ((await genderSelect.count()) > 0) {
      await genderSelect.click();
      await pause(page, SHORT);
      const maleOpt = page.getByRole('option', { name: /male/i });
      if ((await maleOpt.count()) > 0) {
        await maleOpt.click();
        await pause(page, SHORT);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Select blood group if available
    const bgSelect = page.getByLabel(/blood group/i);
    if ((await bgSelect.count()) > 0) {
      await bgSelect.click();
      await pause(page, SHORT);
      const bPos = page.getByRole('option', { name: 'B+' });
      if ((await bPos.count()) > 0) {
        await bPos.click();
        await pause(page, SHORT);
      } else {
        await page.keyboard.press('Escape');
      }
    }

    await pause(page);

    // Cancel editing (don't save — just demo the toggle)
    await page.getByRole('button', { name: /cancel/i }).first().click();
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
    await pause(page);

    // -- Change Password dialog --
    await page.getByRole('button', { name: /change password/i }).click();
    await expect(page.locator('.MuiDialog-root')).toBeVisible();
    await pause(page);
    // Close dialog
    const dialogCloseBtn = page.locator('.MuiDialog-root').getByRole('button', { name: /cancel|close/i }).first();
    if ((await dialogCloseBtn.count()) > 0) {
      await dialogCloseBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 9: LOGOUT CONFIRMATION — Show Stay / Log Out
    // ═══════════════════════════════════════════════════════════════════════════

    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.getByText('Log out?')).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await pause(page);
    // Click Stay
    await page.getByRole('button', { name: /stay/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 10: BOOK A SECOND APPOINTMENT with a different doctor (for cancel demo)
    // ═══════════════════════════════════════════════════════════════════════════

    await sidebar.getByText('Browse Doctors').click();
    await page.waitForURL('**/doctors**');
    await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
    // Clear leftover search and filter by Orthopedics to get a different doctor
    await page.getByPlaceholder(/search by name/i).clear();
    await page.waitForTimeout(800);
    await page.locator('.MuiSelect-select').first().click();
    await pause(page, SHORT);
    const orthoOption = page.getByRole('option', { name: 'Orthopedics' });
    if ((await orthoOption.count()) > 0) {
      await orthoOption.click();
      await page.waitForTimeout(1500);
    } else {
      await page.keyboard.press('Escape');
    }
    await pause(page);

    // Click first Orthopedics doctor's Book Appointment
    await page.getByRole('button', { name: /book appointment/i }).first().click();
    await page.waitForURL('**/book-appointment/**');
    await pause(page);

    // Click an available slot chip — backend requires slot to be in doctor's availableSlots
    const slotChip2 = page.locator('.MuiChip-outlined.MuiChip-colorPrimary').first();
    if ((await slotChip2.count()) > 0) {
      await slotChip2.click();
      await pause(page);
    }
    await page.getByLabel(/symptoms/i).fill('Follow-up: persistent back pain');
    await pause(page);
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText(/appointment request submitted/i).first()
    ).toBeVisible({ timeout: 20000 });
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 11: PATIENT CANCELS ONE APPOINTMENT
    // ═══════════════════════════════════════════════════════════════════════════

    await page.waitForURL('**/appointments**', { timeout: 10000 }).catch(() => {});
    await sidebar.getByText('My Appointments').click();
    await page.waitForURL('**/appointments**');
    await pause(page);

    // Cancel the first Pending appointment
    const cancelBtns = page.getByRole('button', { name: /^cancel$/i });
    const cancelCount = await cancelBtns.count();
    if (cancelCount > 0) {
      await cancelBtns.first().click();
      await pause(page, SHORT);
      // Confirm dialog
      const yesCancel = page.getByRole('button', { name: /yes, cancel/i });
      if ((await yesCancel.count()) > 0) {
        await yesCancel.click();
        await pause(page);
        await page.waitForTimeout(1500);
      }
    }
    await pause(page);

    // Show cancelled tab now has an entry
    await page.getByRole('tab', { name: /cancelled/i }).click();
    await pause(page);
    await page.getByRole('tab', { name: /upcoming/i }).click();
    await pause(page);

    // Now logout patient
    await logout(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 12: LOGIN AS DR_PRIYA — See pending = 1 on dashboard
    // ═══════════════════════════════════════════════════════════════════════════

    await login(page, DR_PRIYA.username, DR_PRIYA.password);

    // -- Doctor dashboard --
    await expect(page.getByText(/welcome, dr\./i)).toBeVisible();
    await expect(page.getByText("Today's Appointments")).toBeVisible();
    await expect(page.getByText('Pending Confirmation')).toBeVisible();
    await expect(page.getByText('Confirmed Today')).toBeVisible();
    await pause(page);

    // -- Doctor sidebar --
    const docSidebar = page.locator('.MuiDrawer-root');
    await expect(docSidebar.getByText('Dashboard')).toBeVisible();
    await expect(docSidebar.getByText('Appointments', { exact: true })).toBeVisible();
    await expect(docSidebar.getByText('Availability')).toBeVisible();
    await expect(docSidebar.getByText('Profile')).toBeVisible();
    await pause(page);

    // -- Quick Actions --
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByRole('button', { name: /view all appointments/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manage availability/i })).toBeVisible();
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 13: CLICK PENDING CARD → Appointments filtered to PENDING, Accept
    // ═══════════════════════════════════════════════════════════════════════════

    // Click the "Pending Confirmation" card (now clickable) — deep-links to pending filter
    await page.getByText('Pending Confirmation').click();
    await page.waitForURL('**/doctor-appointments**');
    await pause(page);

    // -- Summary bar --
    await expect(page.getByText("Today's Appointments")).toBeVisible();
    await expect(page.getByText('Pending Requests')).toBeVisible();
    await expect(page.getByText('Next Appointment')).toBeVisible();
    await pause(page);

    // -- Filter buttons demo --
    await page.getByRole('button', { name: /confirmed/i }).click();
    await pause(page);
    await page.getByRole('button', { name: /completed/i }).click();
    await pause(page);
    await page.getByRole('button', { name: /^all/i }).first().click();
    await pause(page);
    await page.getByRole('button', { name: /pending/i }).click();
    await pause(page);

    // -- Accept the pending appointment from patient1 --
    const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
    if ((await acceptBtn.count()) > 0) {
      await acceptBtn.click();
      await pause(page);
      await page.waitForTimeout(1500);
      await pause(page);
    }

    // -- Refresh to show updated status — pending should now be 0 --
    await page.getByRole('button', { name: /refresh/i }).click();
    await pause(page);

    // Switch to All to show the confirmed appointment
    await page.getByRole('button', { name: /^all/i }).first().click();
    await pause(page);

    // -- Doctor notification bell — should show upcoming appointment today --
    const docNotifBell = page.locator('[aria-label="notifications"]');
    if ((await docNotifBell.count()) > 0) {
      await docNotifBell.click();
      await pause(page);
      await page.keyboard.press('Escape');
      await pause(page, SHORT);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 14: DR_PRIYA PROFILE — Confirm this is the doctor who accepted
    // ═══════════════════════════════════════════════════════════════════════════

    await docSidebar.getByText('Profile').click();
    await page.waitForURL('**/profile**');
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible();
    await expect(page.getByText('Professional Information')).toBeVisible();
    await pause(page);

    // Show the doctor's username — confirms this is dr_priya
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await pause(page);

    // -- Edit profile toggle --
    await page.getByRole('button', { name: /edit profile/i }).click();
    await pause(page);
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).first().click();
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 15: DR_PRIYA AVAILABILITY — Add Slot, Out of Clinic demo
    // ═══════════════════════════════════════════════════════════════════════════

    await docSidebar.getByText('Availability').click();
    await page.waitForURL('**/availability**');
    await expect(page.getByRole('heading', { name: /manage availability/i })).toBeVisible();
    await pause(page);

    // -- Show page elements --
    await expect(page.getByText(/add or remove/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /out of clinic/i })).toBeVisible();
    await expect(page.getByText('Add a Slot')).toBeVisible();
    await pause(page);

    // -- Add a future slot --
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const slotDate = future.toISOString().split('T')[0];

    await page.getByLabel(/date/i).first().fill(slotDate);
    await pause(page, SHORT);
    await page.getByLabel(/time/i).first().fill('15:30');
    await pause(page, SHORT);
    await page.getByRole('button', { name: /^add$/i }).click();
    await pause(page);

    // Verify slot chip appeared
    const slotChips = page.locator('.MuiChip-deletable');
    const chipCount = await slotChips.count();
    expect(chipCount).toBeGreaterThan(0);
    await pause(page);

    // -- Add a TODAY slot so we can demo "Out of Clinic" --
    const todayStr = new Date().toISOString().split('T')[0];
    await page.getByLabel(/date/i).first().fill(todayStr);
    await pause(page, SHORT);
    await page.getByLabel(/time/i).first().fill('18:00');
    await pause(page, SHORT);
    await page.getByRole('button', { name: /^add$/i }).click();
    await pause(page);

    // Save so the today slot is persisted
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(1500);
    await pause(page);

    // -- Out of Clinic Today — removes all of dr_priya's today slots --
    await page.getByRole('button', { name: /out of clinic/i }).click();
    await pause(page);
    // Confirm dialog should appear
    const outOfClinicConfirm = page.getByRole('button', { name: /yes, remove/i });
    if ((await outOfClinicConfirm.count()) > 0) {
      await outOfClinicConfirm.click();
      await pause(page);
      await page.waitForTimeout(1500);
      await pause(page);
    } else {
      await page.keyboard.press('Escape');
      await pause(page);
    }

    // -- Quick action: Manage Availability from dashboard --
    await docSidebar.getByText('Dashboard').click();
    await pause(page);
    await page.getByRole('button', { name: /manage availability/i }).click();
    await page.waitForURL('**/availability**');
    await pause(page);

    // Logout dr_priya
    await logout(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 16: LOGIN AS PATIENT — See that dr_priya confirmed the appointment
    // ═══════════════════════════════════════════════════════════════════════════

    await login(page, PATIENT.username, PATIENT.password);

    await sidebar.getByText('My Appointments').click();
    await page.waitForURL('**/appointments**');
    await pause(page);

    // Refresh to get latest statuses from dr_priya's actions
    await page.getByRole('button', { name: /refresh/i }).click();
    await pause(page);

    // Should see "Doctor has confirmed" status for the appointment dr_priya accepted
    const confirmedText = page.getByText(/doctor has confirmed/i).first();
    if ((await confirmedText.count()) > 0) {
      await expect(confirmedText).toBeVisible();
      await pause(page);
    }

    // Show all tabs
    await page.getByRole('tab', { name: /upcoming/i }).click();
    await pause(page);
    await page.getByRole('tab', { name: /cancelled/i }).click();
    await pause(page);
    await page.getByRole('tab', { name: /upcoming/i }).click();
    await pause(page);

    // -- Patient notification bell — dr_priya's confirmed appointment shows here --
    await page.locator('[aria-label="notifications"]').click();
    await pause(page);
    await page.keyboard.press('Escape');
    await pause(page, SHORT);

    // Logout patient
    await logout(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 17: LOGIN AS ADMIN — Dashboard, User Management, Statistics
    // ═══════════════════════════════════════════════════════════════════════════

    await login(page, ADMIN.username, ADMIN.password);

    // -- Admin dashboard KPI --
    await expect(page.locator('.MuiCircularProgress-root')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText('Total Patients')).toBeVisible();
    await expect(page.getByText('Total Doctors')).toBeVisible();
    await expect(page.getByText('Total Appointments')).toBeVisible();
    await expect(page.getByText('Total Revenue')).toBeVisible();
    await pause(page);

    // -- Charts --
    await expect(page.getByText('Appointment Status Distribution')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Top Specializations by Appointments')).toBeVisible();
    await pause(page);

    // -- Date range filter --
    await page.locator('.MuiSelect-select').first().click();
    await pause(page, SHORT);
    const option30 = page.getByRole('option', { name: /30 days/i });
    if ((await option30.count()) > 0) {
      await option30.click();
      await pause(page);
    } else {
      await page.keyboard.press('Escape');
    }

    // -- Admin sidebar --
    const adminSidebar = page.locator('.MuiDrawer-root');
    await expect(adminSidebar.getByText('Dashboard')).toBeVisible();
    await expect(adminSidebar.getByText('User Management')).toBeVisible();
    await expect(adminSidebar.getByText('Statistics')).toBeVisible();
    // No notification bell for admin
    await expect(page.locator('[aria-label="notifications"]')).not.toBeVisible();
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 18: USER MANAGEMENT — Search, Filter, Table
    // ═══════════════════════════════════════════════════════════════════════════

    await adminSidebar.getByText('User Management').click();
    await page.waitForURL('**/users**');
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    await pause(page);

    // -- Page elements --
    await expect(page.getByPlaceholder(/search username or email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^search$/i })).toBeVisible();
    await expect(page.locator('th').getByText('Username')).toBeVisible();
    await expect(page.getByText(/user.*found/i)).toBeVisible();
    await pause(page);

    // -- Search for patient1 --
    await page.getByPlaceholder(/search username or email/i).fill('patient1');
    await pause(page, SHORT);
    await page.getByRole('button', { name: /^search$/i }).click();
    await pause(page);
    await expect(page.getByText(/user.*found/i)).toBeVisible();
    await pause(page);

    // Clear search
    await page.getByPlaceholder(/search username or email/i).clear();
    await page.getByRole('button', { name: /^search$/i }).click();
    await pause(page);

    // -- Role filter --
    const adminToolbar = page.locator('.MuiToolbar-root');
    await adminToolbar.locator('.MuiSelect-select').first().click();
    await pause(page, SHORT);
    const docOption = page.getByRole('option', { name: /doctor/i });
    if ((await docOption.count()) > 0) {
      await docOption.click();
      await pause(page);
      await expect(page.getByText(/user.*found/i)).toBeVisible();
      await pause(page);
    }

    // -- Action icons in table --
    const iconBtns = page.locator('tbody .MuiIconButton-root');
    const iconCount = await iconBtns.count();
    expect(iconCount).toBeGreaterThan(0);
    await pause(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // PART 19: ADMIN STATISTICS PAGE
    // ═══════════════════════════════════════════════════════════════════════════

    await adminSidebar.getByText('Statistics').click();
    await page.waitForURL('**/statistics**');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText('Total Patients')).toBeVisible();
    await pause(page);

    // Final logout
    await logout(page);

    // ═══════════════════════════════════════════════════════════════════════════
    // DONE — Back at login page
    // ═══════════════════════════════════════════════════════════════════════════

    await expect(page.getByText('Healthcare Portal')).toBeVisible();
    await pause(page);
  });
});
