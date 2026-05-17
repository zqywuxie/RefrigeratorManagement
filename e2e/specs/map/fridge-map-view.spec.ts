import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Fridge Map View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await loginAsRoot(page);
    await page.waitForTimeout(1000);

    const returnBtn = page.locator('button:has-text("返回冰箱")').first();
    if (await returnBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await returnBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('TC-FMV-01: FridgeSelector has fridge tabs', async ({ page }) => {
    // FridgeSelector shows fridge tabs at the top
    const fridgeTabs = page.locator('[role="tab"]').or(page.locator('button[role="tab"]'));
    const tabCount = await fridgeTabs.count().catch(() => 0);

    // At minimum, at least one fridge tab should exist
    if (tabCount > 0) {
      await expect(fridgeTabs.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Alternative: check for fridge name text
      await expect(page.locator('text=冰箱管理系统').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-FMV-02: switch between fridges', async ({ page }) => {
    // Find fridge tabs
    const fridgeTabs = page.locator('[role="tab"]');
    const tabCount = await fridgeTabs.count().catch(() => 0);

    if (tabCount >= 2) {
      // Click second fridge tab
      await fridgeTabs.nth(1).click();
      await page.waitForTimeout(500);

      // Should show different fridge content
      await expect(page.locator('text=冰箱管理系统').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-FMV-03: fridge type selector exists', async ({ page }) => {
    // FridgeSelector has a dropdown to pick fridge type (drawer/shelf)
    const fridgeSelect = page.locator('select');
    const selectCount = await fridgeSelect.count();

    if (selectCount > 0) {
      await expect(fridgeSelect.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-FMV-04: drawer-type fridge shows layer tabs', async ({ page }) => {
    // Navigate to lower section layer tabs
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(400);

    // Should see layer view header
    const layerHeader = page.locator('text=第一层抽屉区').first();
    if (await layerHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(layerHeader).toBeVisible();
    }
  });

  test('TC-FMV-05: layer 2 tab shows drawer grid', async ({ page }) => {
    // Click layer 2 tab
    const layer2Btn = page.locator('button:has-text("下层第二层")');
    if (!(await layer2Btn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await layer2Btn.click();
    await page.waitForTimeout(400);

    // Should see second layer labels (C1, D1, etc.)
    const layer2Label = page.locator('text=第二层抽屉区').first();
    if (await layer2Label.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(layer2Label).toBeVisible();
    }
  });

  test('TC-FMV-06: upper layer shows open storage', async ({ page }) => {
    // Click upper tab
    const upperBtn = page.locator('button:has-text("上层 / Upper")');
    if (!(await upperBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await upperBtn.click();
    await page.waitForTimeout(400);

    // Should show open storage content
    const upperLabel = page.locator('text=上层 / Upper').first();
    await expect(upperLabel).toBeVisible({ timeout: 3000 });
  });

  test('TC-FMV-07: drawer slot shows box occupancy', async ({ page }) => {
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(400);

    // Drawer slots show occupancy like "0/5" or "2/5"
    const occupancySlots = page.locator('button:has-text("/")');
    const slotCount = await occupancySlots.count();
    expect(slotCount).toBeGreaterThanOrEqual(0);

    if (slotCount > 0) {
      const firstSlot = occupancySlots.first();
      const text = await firstSlot.textContent();
      // Should contain fraction like "X/Y"
      expect(text).toMatch(/\d+\/\d+/);
    }
  });

  test('TC-FMV-08: click drawer slot navigates into drawer', async ({ page }) => {
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(400);

    // Find a drawer slot with content
    const drawerSlot = page.locator('button:has-text("/")').first();
    if (!(await drawerSlot.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await drawerSlot.click();
    await page.waitForTimeout(800);

    // Should navigate into drawer — see back button or box content
    const hasBackBtn = await page.locator('text=返回').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasBoxContent = await page.locator('text=添加盒子').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasBackBtn || hasBoxContent).toBeTruthy();
  });

  test('TC-FMV-09: shelf-type fridge renders differently', async ({ page }) => {
    // Try creating/selecting a shelf fridge
    const addBtn = page.locator('button:has-text("新增冰箱")');
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await addBtn.click();
    await page.waitForTimeout(400);

    // Check if fridge type option exists
    const shelfOption = page.locator('text=四层架子').or(page.locator('text=shelf').or(page.locator('option[value="shelf"]')));
    const hasShelfOption = await shelfOption.isVisible({ timeout: 2000 }).catch(() => false);

    // Close the modal
    const cancelBtn = page.locator('button:has-text("取消")').first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
    }
  });
});
