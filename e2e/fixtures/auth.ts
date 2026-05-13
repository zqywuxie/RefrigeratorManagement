import { Page } from '@playwright/test';

export const CREDENTIALS = {
  root: { username: 'root', password: 'root123' },
  testUser: { username: 'testuser', password: 'test1234' },
};

export async function loginAs(
  page: Page,
  username: string,
  password: string,
) {
  await page.goto('/');
  // Check if already logged in — look for the username field
  const usernameInput = page.locator('input:not([type="password"])').first();
  const inputVisible = await usernameInput.isVisible({ timeout: 1000 }).catch(() => false);
  if (!inputVisible) {
    // Already logged in — logout first
    const logoutBtn = page.locator('button[title="退出登录"]');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
      await page.goto('/');
    }
  }
  // Now log in — the first non-password input is the username field
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  // Form submit button (inside the login form, not the tab toggle)
  await page.locator('form button[type="submit"]').or(page.locator('form button:has-text("登录")')).first().click();
  // Wait for main view
  await page.waitForSelector('text=冰箱管理系统', { timeout: 15000 });
}

export async function loginAsRoot(page: Page) {
  await loginAs(page, CREDENTIALS.root.username, CREDENTIALS.root.password);
}

export async function loginAsTestUser(page: Page) {
  await loginAs(page, CREDENTIALS.testUser.username, CREDENTIALS.testUser.password);
}

export async function logout(page: Page) {
  const logoutBtn = page.locator('button[title="退出登录"]');
  await logoutBtn.click();
  await page.waitForSelector('text=冰箱管理系统登录', { timeout: 5000 });
}

export async function ensureTestUser(page: Page) {
  // Login as root and create test user if not exists
  await loginAsRoot(page);
  // Try to register testuser — will fail gracefully if exists
  await createUserViaAdmin(page, CREDENTIALS.testUser.username, CREDENTIALS.testUser.password, '普通用户 (user)');
}

export async function createUserViaAdmin(
  page: Page,
  username: string,
  password: string,
  role: string,
) {
  // Navigate to admin panel
  const adminBtn = page.locator('button:has-text("全局管理")');
  if (!(await adminBtn.isVisible().catch(() => false))) return;
  await adminBtn.click();
  await page.waitForTimeout(800);

  // Find the create user form — its heading is "创建用户"
  const createForm = page.locator('h3:has-text("创建用户")').locator('..');
  const userInput = createForm.locator('input:not([type="password"])').first();

  if (await userInput.isVisible().catch(() => false)) {
    await userInput.fill(username);
    // Password input in the create user form
    const passInput = createForm.locator('input[type="password"]').first();
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill(password);
    }

    // Role select
    const roleSelect = createForm.locator('select');
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption({ label: role });
    }

    // Submit button inside the create form
    const createBtn = createForm.locator('button[type="submit"]');
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // Go back to fridge
  const returnBtn = page.locator('button:has-text("返回冰箱")');
  if (await returnBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await returnBtn.click();
    await page.waitForTimeout(500);
  }
}
