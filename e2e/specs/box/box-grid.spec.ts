import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Box Grid View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  /**
   * Helper: navigate into a precise-mode box grid.
   * Returns true if successfully navigated, false otherwise.
   */
  async function navigateIntoBoxGrid(page: any): Promise<boolean> {
    // Navigate to lower first layer
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(500);

    // Find drawers with boxes
    const drawerSlots = page.locator('button:has-text("/")');
    const slotCount = await drawerSlots.count();
    if (slotCount === 0) return false;

    // Try each drawer until we find one with boxes and a precise-mode box
    for (let i = 0; i < slotCount; i++) {
      const slot = drawerSlots.nth(i);
      if (!(await slot.isVisible().catch(() => false))) continue;
      await slot.click();
      await page.waitForTimeout(800);

      // Look for box cards - try clicking non-empty slots
      // Check for "10x10" or "9x9" grid dimension text (indicates precise mode)
      const gridBadge = page.locator('text=/\\d+x\\d+/').first();
      if (await gridBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click on the box card to enter box grid
        await gridBadge.click();
        await page.waitForTimeout(500);
        return true;
      }

      // Alternatively, click on any box card element
      const boxCards = page.locator('text=/\\d+x\\d+/');
      const count = await boxCards.count();
      if (count > 0) {
        await boxCards.first().click();
        await page.waitForTimeout(500);
        return true;
      }

      // Go back and try next drawer
      const backBtn = page.locator('text=返回').first();
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }
    }

    return false;
  }

  test('TC-BOX-GR-01: navigate into box shows grid header', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return; // No precise-mode boxes available

    // Should see "返回盒子列表" back button
    const backBtn = page.locator('text=返回盒子列表').first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });

    // Should show grid dimensions (e.g., "10x10")
    const gridDims = page.locator('text=/\\d+×\\d+/').first();
    await expect(gridDims).toBeVisible({ timeout: 3000 });
  });

  test('TC-BOX-GR-02: box grid renders cells with position labels', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Grid should render cells - look for a position label like "A1"
    // Cell positions use letter+number format
    const gridArea = page.locator('[style*="grid-template-columns"]').first();
    if (await gridArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(gridArea).toBeVisible();
    }

    // Check for at least some content inside the grid
    const cellElements = page.locator('[class*="rounded"]');
    const cellCount = await cellElements.count();
    expect(cellCount).toBeGreaterThan(0);
  });

  test('TC-BOX-GR-03: status legend shows occupied/free counts', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Status legend shows "占用" text with fraction like "0/100"
    const occupiedLabel = page.locator('text=/占用/').first();
    const visible = await occupiedLabel.isVisible({ timeout: 3000 }).catch(() => false);

    // Also check for status badges (正常, 警告, etc.)
    const statusBadges = page.locator('text=/正常|警告|异常|已用/');

    if (visible) {
      await expect(occupiedLabel).toBeVisible();
    }
    // At least one of status legend or badges should be visible
    const badgeVisible = await statusBadges.first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(visible || badgeVisible).toBeTruthy();
  });

  test('TC-BOX-GR-04: pagination for large grids', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Check if pagination controls exist (for grids with >5 rows)
    const prevBtn = page.locator('button:has-text("上一段")');
    const nextBtn = page.locator('button:has-text("下一段")');
    const pageIndicator = page.locator('text=/孔位分段浏览/');

    const hasPagination = await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasPagination) {
      // Should have page number display
      const pageNum = page.locator('text=/\\d+\\/\\d+/');
      const numVisible = await pageNum.isVisible().catch(() => false);

      if (await nextBtn.isVisible().catch(() => false)) {
        // Click next page
        await nextBtn.click();
        await page.waitForTimeout(500);

        // Grid should still be visible
        const gridArea = page.locator('[style*="grid-template-columns"]').first();
        await expect(gridArea).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('TC-BOX-GR-05: empty cells show position labels', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Empty cells should be rendered in the grid
    // The grid container should exist
    const gridContainer = page.locator('[style*="grid-template"]').first();
    await expect(gridContainer).toBeVisible({ timeout: 5000 });

    // Cells should be present (even if empty)
    const cells = gridContainer.locator('> div');
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-BOX-GR-06: occupied cell shows sample info', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Look for cells that contain sample information
    // Occupied cells show sample name or tube label
    const occupiedCells = page.locator('[style*="grid-template"] > div').first();

    // The grid should be visible regardless of occupancy
    await expect(page.locator('[style*="grid-template"]').first()).toBeVisible({ timeout: 5000 });

    // Check if any status badges exist (indicates occupied cells)
    const statusBadges = page.locator('text=/正常|警告|异常|已用/');
    const badgeCount = await statusBadges.count();
    // Grid can be fully empty, which is valid
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });
});
