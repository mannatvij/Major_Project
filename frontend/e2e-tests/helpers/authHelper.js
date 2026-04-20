/**
 * Shared auth helpers.
 * The app uses autocomplete attributes on the login inputs and MUI components.
 */
const BASE = 'http://localhost:3000';

/**
 * Register a new user through the UI.
 * @param {import('@playwright/test').Page} page
 * @param {{ username, email, password, role }} user
 */
async function registerUser(page, user) {
  await page.goto(`${BASE}/register`);
  await page.waitForSelector('input', { timeout: 8000 });

  await page.getByLabel(/username/i).fill(user.username);
  await page.getByLabel(/email/i).fill(user.email);

  // Two password fields
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(user.password);
  await pwFields.nth(1).fill(user.password);

  // Role select (MUI Select)
  if (user.role && user.role !== 'PATIENT') {
    const roleSelect = page.locator('[class*="MuiSelect"]').first();
    await roleSelect.click();
    await page.waitForTimeout(400);
    const option = page.getByRole('option', { name: new RegExp(user.role, 'i') });
    if ((await option.count()) > 0) await option.click();
    else await page.keyboard.press('Escape');
  }

  await page.getByRole('button', { name: /create account/i }).click();
  // Wait for success message or redirect to login
  await page.waitForTimeout(2000);
}

/**
 * Log in via the login form and wait for the dashboard.
 * @param {import('@playwright/test').Page} page
 * @param {string} username
 * @param {string} password
 */
async function loginUser(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 8000 });

  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/dashboard**', { timeout: 12000 });
}

/**
 * Click the sidebar Logout button and wait for the login page.
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
  const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
  if ((await logoutBtn.count()) > 0) {
    await logoutBtn.click();
  } else {
    const logoutLink = page.getByText(/logout|sign out/i).first();
    await logoutLink.click();
  }
  await page.waitForURL('**/login**', { timeout: 8000 });
}

module.exports = { registerUser, loginUser, logout };
