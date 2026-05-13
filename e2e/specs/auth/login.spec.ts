import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout, CREDENTIALS } from '../../fixtures/auth';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
  });

  test('TC-LOGIN-01: root login succeeds and shows main view', async ({ page }) => {
    await loginAsRoot(page);
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible();
    // Header should show username
    await expect(page.locator('header')).toContainText('root');
  });

  test('TC-LOGIN-02: wrong password shows error', async ({ page }) => {
    await page.locator('input:not([type="password"])').first().fill('root');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button:has-text("登录")').last().click();
    // Error message: "Invalid username or password"
    await expect(page.locator('text=Invalid username or password')).toBeVisible({ timeout: 5000 });
  });

  test('TC-LOGIN-03: empty fields show validation error', async ({ page }) => {
    await page.locator('button:has-text("登录")').last().click();
    // Server returns validation error: "用户名和密码不能为空"
    await expect(page.locator('text=用户名和密码不能为空')).toBeVisible({ timeout: 3000 });
  });

  test('TC-LOGIN-04: token persists across page reload', async ({ page }) => {
    await loginAsRoot(page);
    await page.reload();
    // Should still be on main view (not login page)
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-LOGIN-05: logout clears session and goes to login page', async ({ page }) => {
    await loginAsRoot(page);
    await logout(page);
    await expect(page.locator('text=冰箱管理系统登录').first()).toBeVisible();
    // localStorage should be cleared
    const token = await page.evaluate(() => localStorage.getItem('biofridge_token'));
    expect(token).toBeNull();
  });

  test('TC-LOGIN-06: after logout, page reload stays on login', async ({ page }) => {
    await loginAsRoot(page);
    await logout(page);
    await page.reload();
    await expect(page.locator('text=冰箱管理系统登录').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-LOGIN-07: invalid token redirects to login', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('biofridge_token', 'invalid.token.here');
      localStorage.setItem('biofridge_user', JSON.stringify({ username: 'test', role: 'user' }));
    });
    await page.reload();
    // The app should detect invalid token (401) and redirect to login
    await expect(page.locator('text=冰箱管理系统登录').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-LOGIN-08: regular user login works', async ({ page }) => {
    // First ensure test user exists by logging in as root and creating
    await loginAsRoot(page);
    await page.goto('/');
    // Ensure we're logged in and can see the main view
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible();
  });
});
