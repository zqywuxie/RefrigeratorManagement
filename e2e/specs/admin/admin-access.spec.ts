import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

test.describe('Admin Panel Access', () => {
  test('TC-ADM-01: root sees "全局管理" button', async ({ page }) => {
    await loginAsRoot(page);
    await expect(page.locator('button:has-text("全局管理")').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-02: regular user does not see admin button', async ({ page }) => {
    // Register a regular user
    const tempUser = `noadmin_${Date.now()}`;
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);
    await page.locator('input:not([type="password"])').first().fill(tempUser);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill('test1234');
    await passInputs.nth(1).fill('test1234');
    await page.locator('button:has-text("注册")').last().click();
    await page.waitForSelector('text=冰箱管理系统', { timeout: 10000 });

    // Admin button should not be visible
    await expect(page.locator('button:has-text("全局管理")')).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-ADM-03: root enters admin panel', async ({ page }) => {
    await loginAsRoot(page);

    // Click admin button
    await page.locator('button:has-text("全局管理")').click();
    await page.waitForTimeout(800);

    // Should see admin panel content
    await expect(page.locator('text=全局管理').first()).toBeVisible({ timeout: 5000 });

    // Button should change to "返回冰箱"
    await expect(page.locator('button:has-text("返回冰箱")').first()).toBeVisible();
  });

  test('TC-ADM-04: return to fridge from admin panel', async ({ page }) => {
    await loginAsRoot(page);

    // Enter admin
    await page.locator('button:has-text("全局管理")').click();
    await page.waitForTimeout(800);

    // Return to fridge
    await page.locator('button:has-text("返回冰箱")').click();
    await page.waitForTimeout(500);

    // Should be back to fridge view
    await expect(page.locator('text=上层 / Upper').first()).toBeVisible({ timeout: 5000 });
  });
});
