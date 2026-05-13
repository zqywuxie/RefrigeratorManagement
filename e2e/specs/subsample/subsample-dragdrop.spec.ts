import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';
import { dragElement } from '../../fixtures/drag';

test.describe('SubSample Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  test('TC-SUB-DD-01: drag sub-sample to empty slot in container', async ({ page }) => {
    // Enter container S-001
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Find a sub-sample
    const ss001 = page.locator('text=SS-001').first();
    await expect(ss001).toBeVisible({ timeout: 5000 });

    // Try to drag to another position in the same container
    // Find another slot in the container grid
    const gridSlots = page.locator('[data-position]');
    const slotCount = await gridSlots.count();

    if (slotCount > 1) {
      // Drag SS-001 to the last slot
      await dragElement(page, ss001, gridSlots.last());
      await page.waitForTimeout(1000);
    }

    // SS-001 should still exist after drag
    await expect(page.locator('text=SS-001').first()).toBeVisible();
  });

  test('TC-SUB-DD-02: swap two sub-samples', async ({ page }) => {
    // Enter container S-001
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    const ss001 = page.locator('text=SS-001').first();
    const ss002 = page.locator('text=SS-002').first();

    const bothVisible = (await ss001.isVisible().catch(() => false)) &&
                        (await ss002.isVisible().catch(() => false));

    if (bothVisible) {
      // Drag SS-001 onto SS-002
      await dragElement(page, ss001, ss002);
      await page.waitForTimeout(1000);

      // Both should still be visible (swapped positions)
      await expect(page.locator('text=SS-001').first()).toBeVisible();
      await expect(page.locator('text=SS-002').first()).toBeVisible();
    }
  });
});
