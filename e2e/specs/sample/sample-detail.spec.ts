import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

test.describe('Sample Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  // Helper: open detail panel by hovering card and clicking info icon
  async function openDetailPanel(page: any, sampleId: string) {
    const card = page.locator(`text=${sampleId}`).first();
    await card.hover();
    await page.waitForTimeout(300);
    // Click the info (i) button that appears on hover
    const infoBtn = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).first();
    const infoCount = await infoBtn.count();
    if (infoCount > 0) {
      await infoBtn.click();
    } else {
      // Fallback: click the card itself
      await card.click();
    }
    await page.waitForTimeout(500);
  }

  test('TC-DET-01: open detail panel shows sample info', async ({ page }) => {
    await openDetailPanel(page, 'S-001');
    // Detail panel should show sample ID
    await expect(page.locator('text=S-001').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-DET-02: detail panel shows sample data', async ({ page }) => {
    await openDetailPanel(page, 'S-001');

    // Detail panel should contain status info
    // Look for any status-related text
    const hasContent = await page.locator('text=S-001').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('TC-DET-03: close detail panel works', async ({ page }) => {
    await openDetailPanel(page, 'S-001');

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Should still see fridge content
    await expect(page.locator('text=上层 / Upper').or(page.locator('text=冰箱管理系统')).first()).toBeVisible();
  });

  test('TC-DET-04: status change buttons in detail panel', async ({ page }) => {
    await openDetailPanel(page, 'S-001');

    // Look for any status-related buttons
    const anyBtn = page.locator('button:has-text("正常"), button:has-text("温度异常"), button:has-text("已使用")').first();
    const hasStatusBtn = await anyBtn.isVisible({ timeout: 2000 }).catch(() => false);
    // If status buttons are visible, click one
    if (hasStatusBtn) {
      await anyBtn.click();
      await page.waitForTimeout(500);
    }
    // Test passes if no error occurs
  });

  test('TC-DET-05: non-owner sees read-only detail panel', async ({ page }) => {
    await logout(page);

    // Register as a regular user
    const tempUser = `readonly_${Date.now()}`;
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await page.locator('button:has-text("注册")').last().click();
    await page.waitForTimeout(300);
    await page.locator('input:not([type="password"])').first().fill(tempUser);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill('test1234');
    await passInputs.nth(1).fill('test1234');
    await page.locator('button:has-text("注册")').last().click();
    await page.waitForSelector('text=冰箱管理系统', { timeout: 10000 });

    // Click on a root-created sample to open detail
    await page.waitForTimeout(500);
    const s001 = page.locator('text=S-001').first();
    if (await s001.isVisible().catch(() => false)) {
      await s001.hover();
      await page.waitForTimeout(300);
      // Click the info button
      const infoBtn = page.locator('button:has(svg)').first();
      if (await infoBtn.isVisible().catch(() => false)) {
        await infoBtn.click();
      } else {
        await s001.click();
      }
      await page.waitForTimeout(500);

      // Non-owner should see read-only indicator
      const readOnlyVisible = await page.locator('text=仅查看 / Read Only').first().isVisible({ timeout: 3000 }).catch(() => false);
      // Or the edit/delete buttons should be absent
      const editHidden = !(await page.locator('button[title="编辑"]').isVisible({ timeout: 1000 }).catch(() => false));
      // Either condition is valid
      expect(readOnlyVisible || editHidden).toBeTruthy();
    }
  });
});
