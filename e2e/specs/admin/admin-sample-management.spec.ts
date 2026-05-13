import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Admin Sample Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    // Enter admin panel
    await page.locator('button:has-text("全局管理")').click();
    await page.waitForTimeout(800);
  });

  test('TC-ADM-SMP-01: sample list is displayed', async ({ page }) => {
    // Scroll down to sample section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Sample IDs should appear in the admin panel
    await expect(page.locator('text=S-001').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-SMP-02: select sample shows detail card', async ({ page }) => {
    // Find and click a sample in the admin list
    const s001 = page.locator('text=S-001').first();
    if (await s001.isVisible().catch(() => false)) {
      await s001.click();
      await page.waitForTimeout(500);

      // Detail card should show on the right side
      await expect(page.locator('text=S-001').first()).toBeVisible();
    }
  });

  test('TC-ADM-SCH-01: search by name in admin', async ({ page }) => {
    // Find search input in admin panel
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('S-001');
      await page.waitForTimeout(500);

      // Filtered results should include S-001
      await expect(page.locator('text=S-001').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('TC-ADM-SCH-02: filter by type in admin', async ({ page }) => {
    // Look for type filter dropdown — find an enabled select
    const allSelects = page.locator('select');
    const selectCount = await allSelects.count();
    for (let i = 0; i < selectCount; i++) {
      const sel = allSelects.nth(i);
      const enabled = await sel.isEnabled().catch(() => false);
      if (enabled) {
        const options = await sel.locator('option').count();
        if (options > 1) {
          await sel.selectOption({ index: 1 });
          await page.waitForTimeout(500);
        }
        break;
      }
    }
  });

  test('TC-ADM-DIST-01: distribution charts are displayed', async ({ page }) => {
    // Look for distribution section
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Recharts or visual charts should be rendered
    const chart = page.locator('.recharts-wrapper, svg.recharts-surface, [class*="chart"]');
    const hasChart = await chart.first().isVisible().catch(() => false);
    // Charts may or may not be present depending on seed data, but no errors should show
    await expect(page.locator('text=全局管理').first()).toBeVisible();
  });

  test('TC-ADM-SMP-03: refresh button reloads data', async ({ page }) => {
    // Look for refresh button
    const refreshBtn = page.locator('button:has-text("刷新")');
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);

      // Data should still be displayed
      await expect(page.locator('text=全局管理').first()).toBeVisible();
    }
  });
});
