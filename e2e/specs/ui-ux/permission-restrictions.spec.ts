import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

test.describe('Permission Restrictions', () => {
  test('TC-PERM-01: regular user cannot manage fridges', async ({ page }) => {
    // Register as regular user
    const tempUser = `perm_${Date.now()}`;
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

    // Open fridge selector — button shows current fridge name
    await page.locator('header button:has(svg)').first().click();
    await page.waitForTimeout(300);

    // Should not see add/edit/delete buttons
    await expect(page.locator('button:has-text("添加新冰箱")')).not.toBeVisible({ timeout: 2000 });
  });

  test('TC-PERM-02: regular user does not see grid controls', async ({ page }) => {
    const tempUser = `perm2_${Date.now()}`;
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

    // Grid controls should not be visible
    const plusBtns = page.locator('button:has-text("+")');
    const minusBtns = page.locator('button:has-text("-")');
    const plusCount = await plusBtns.count();
    const minusCount = await minusBtns.count();
    expect(plusCount + minusCount).toBe(0);
  });

  test('TC-PERM-03: regular user cannot access admin panel', async ({ page }) => {
    const tempUser = `perm3_${Date.now()}`;
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

  test('TC-PERM-04: regular user sees read-only detail for others samples', async ({ page }) => {
    const tempUser = `perm4_${Date.now()}`;
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

    // Click on a root-created sample
    const s001 = page.locator('text=S-001').first();
    if (await s001.isVisible().catch(() => false)) {
      await s001.click();
      await page.waitForTimeout(500);

      // Should show read-only indicator (exact text: "仅查看 / Read Only")
      const readOnly = page.locator('text=仅查看 / Read Only');
      await expect(readOnly.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
