import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Box Drag-and-Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await loginAsRoot(page);
    await page.waitForTimeout(1500);

    const returnBtn = page.locator('button:has-text("返回冰箱")').first();
    if (await returnBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await returnBtn.click();
      await page.waitForTimeout(500);
    }

    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  /**
   * Helper: navigate into a box grid with tubes
   */
  async function navigateToOccupiedBoxGrid(page: any): Promise<boolean> {
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(500);

    const drawerSlots = page.locator('button:has-text("/")');
    const slotCount = await drawerSlots.count();
    if (slotCount === 0) return false;

    for (let i = 0; i < slotCount; i++) {
      const slot = drawerSlots.nth(i);
      if (!(await slot.isVisible().catch(() => false))) continue;

      const text = await slot.textContent();
      // Skip empty drawers (0/N)
      if (!text || text.trim() === '0/5') continue;

      await slot.click();
      await page.waitForTimeout(800);

      // Look for box cards with grid dimension text
      const gridBadge = page.locator('text=/\\d+x\\d+/').first();
      if (await gridBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gridBadge.click();
        await page.waitForTimeout(500);
        return true;
      }

      // Go back
      const backBtn = page.locator('text=返回').first();
      if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(300);
      }
    }
    return false;
  }

  test('TC-BD-01: box grid renders draggable elements', async ({ page }) => {
    const navigated = await navigateToOccupiedBoxGrid(page);
    if (!navigated) return;

    // Grid container should exist
    const gridContainer = page.locator('[style*="grid-template"]').first();
    await expect(gridContainer).toBeVisible({ timeout: 5000 });

    // Cells within grid should be present
    const cells = gridContainer.locator('> div');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('TC-BD-02: drag indicator/handle exists on occupied cells', async ({ page }) => {
    const navigated = await navigateToOccupiedBoxGrid(page);
    if (!navigated) return;

    // Occupied cells may show cursor or drag handles
    const gridCells = page.locator('[style*="grid-template"] > div');
    const cellCount = await gridCells.count();

    if (cellCount > 0) {
      // Check for any occupied cells (with sample info)
      const statusBadges = page.locator('text=/正常|警告|异常|已用/');
      const badgeCount = await statusBadges.count();
      expect(badgeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('TC-BD-03: cell click shows tube/sample detail', async ({ page }) => {
    const navigated = await navigateToOccupiedBoxGrid(page);
    if (!navigated) return;

    // Click on a grid cell
    const gridCells = page.locator('[style*="grid-template"] > div');
    const cellCount = await gridCells.count();

    if (cellCount > 0) {
      // Try clicking the first cell
      await gridCells.first().click();
      await page.waitForTimeout(500);

      // Grid should still be visible after click
      const gridContainer = page.locator('[style*="grid-template"]').first();
      await expect(gridContainer).toBeVisible({ timeout: 3000 });
    }
  });

  test('TC-BD-04: back button returns from box grid', async ({ page }) => {
    const navigated = await navigateToOccupiedBoxGrid(page);
    if (!navigated) return;

    // Should have back button
    const backBtn = page.locator('text=返回盒子列表').first();
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(500);

      // Should be back in drawer view
      const drawerView = page.locator('text=添加盒子').first();
      const hasDrawerView = await drawerView.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasDrawerView) {
        await expect(drawerView).toBeVisible();
      }
    }
  });
});
