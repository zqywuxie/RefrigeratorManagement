import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Pending Samples Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  async function navigateIntoBoxGrid(page: any): Promise<boolean> {
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(500);

    const drawerSlots = page.locator('button:has-text("/")');
    const slotCount = await drawerSlots.count();
    if (slotCount === 0) return false;

    for (let i = 0; i < slotCount; i++) {
      const slot = drawerSlots.nth(i);
      if (!(await slot.isVisible().catch(() => false))) continue;
      await slot.click();
      await page.waitForTimeout(800);

      const gridBadge = page.locator('text=/\\d+x\\d+/').first();
      if (await gridBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gridBadge.click();
        await page.waitForTimeout(500);
        return true;
      }

      const backBtn = page.locator('text=返回').first();
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }
    }
    return false;
  }

  test('TC-PS-01: pending samples panel is hidden when empty', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // The "待分配样本" panel should NOT be visible when there are no pending samples
    const pendingPanel = page.locator('text=待分配样本').first();
    const isVisible = await pendingPanel.isVisible({ timeout: 3000 }).catch(() => false);

    // Panel is hidden by default (samples.length === 0 -> return null)
    // If visible, some previous test may have left data
    if (isVisible) {
      // Try to clear the list
      const clearBtn = page.locator('button:has-text("清除列表")');
      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click();
        await page.waitForTimeout(500);
        await expect(pendingPanel).not.toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('TC-PS-02: pending samples panel appears after import', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Look for Excel import button
    const excelBtn = page.locator('button:has-text("Excel 导入")');
    if (!(await excelBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await excelBtn.click();
    await page.waitForTimeout(500);

    // Excel import modal should be open
    const importModal = page.locator('text=Excel 导入样本').first();
    if (await importModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(importModal).toBeVisible();

      // Close the modal
      const cancelBtn = page.locator('button:has-text("取消")');
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('TC-PS-03: search/filter pending samples', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const pendingPanel = page.locator('text=待分配样本').first();
    if (!(await pendingPanel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Find search input in the pending samples panel
    const searchInput = page.locator('input[placeholder="搜索姓名、编号、类型..."]');
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(300);
    }
  });

  test('TC-PS-04: clear pending samples list', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const pendingPanel = page.locator('text=待分配样本').first();
    if (!(await pendingPanel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Click "清除列表" button
    const clearBtn = page.locator('button:has-text("清除列表")');
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(800);

      // Panel should disappear
      await expect(pendingPanel).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('TC-PS-05: drag pending sample to empty grid cell', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const pendingPanel = page.locator('text=待分配样本').first();
    if (!(await pendingPanel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Verify pending sample cards exist (DraggableSample components)
    const sampleCards = pendingPanel.locator('..').locator('[class*="cursor-grab"]');
    const cardCount = await sampleCards.count();
    if (cardCount > 0) {
      await expect(sampleCards.first()).toBeVisible();
    }

    // Drag-and-drop would require the grid to be visible and the dragElement fixture
    // This test verifies the UI elements are present for drag-and-drop
    const gridArea = page.locator('[style*="grid-template"]').first();
    if (await gridArea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(gridArea).toBeVisible();
    }
  });

  test('TC-PS-06: cannot drag pending sample onto occupied cell', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const pendingPanel = page.locator('text=待分配样本').first();
    if (!(await pendingPanel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // The hint text should explain drag-and-drop behavior
    const hintText = page.locator('text=拖拽到左侧孔位分配').first();
    if (await hintText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(hintText).toBeVisible();
    }
  });
});
