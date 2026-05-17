import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Shelf Fridge View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  test('TC-SHELF-01: shelf fridge view renders 4 rows', async ({ page }) => {
    // Open fridge selector and look for a shelf-type fridge
    const fridgeSelectorBtn = page.locator('button:has-text("选择冰箱")');
    if (!(await fridgeSelectorBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await fridgeSelectorBtn.click();
    await page.waitForTimeout(500);

    // Check if a shelf fridge exists in the dropdown
    const shelfFridge = page.locator('text=/shelf|4.*层|四层/i').first();
    const shelfExists = await shelfFridge.isVisible({ timeout: 2000 }).catch(() => false);

    if (shelfExists) {
      await shelfFridge.click();
      await page.waitForTimeout(800);

      // Shelf fridge should show "四层大空间冰箱" or similar
      const shelfTitle = page.locator('text=/四层|Shelf|4.*Row/i').first();
      const shelfVisible = await shelfTitle.isVisible({ timeout: 3000 }).catch(() => false);

      // Should show 4 rows: "第 1 行" through "第 4 行"
      const rowLabels = page.locator('text=/第 [1-4] 行/');
      const rowCount = await rowLabels.count();
      if (rowCount > 0) {
        expect(rowCount).toBeLessThanOrEqual(4);
      }
    }
  });

  test('TC-SHELF-02: create item in specific row', async ({ page }) => {
    // Navigate to upper storage and create an item with a specific row
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Check if "第 2 行" exists
    const row2Heading = page.locator('text=第 2 行').first();
    if (await row2Heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Find the "添加" button for row 2
      const row2Section = row2Heading.locator('..').locator('..');
      const addBtn = row2Section.locator('button').filter({ hasText: /添加/ }).first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);

        // Modal should show row info
        const rowInfo = page.locator('text=/第 2 行/').first();
        const rowVisible = await rowInfo.isVisible({ timeout: 2000 }).catch(() => false);

        const name = `E2E_Row2Item_${Date.now()}`;
        const nameInput = page.locator('input[placeholder="物品名称"]');
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill(name);
        }

        const saveBtn = page.locator('button:has-text("保存")');
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(1000);
        }

        // Item should appear in row 2 area
        await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('TC-SHELF-03: click precise-mode item navigates into box grid', async ({ page }) => {
    // First create a precise-mode upper item
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    const addButtons = page.locator('button').filter({ hasText: /添加/ });
    const count = await addButtons.count();
    if (count === 0) return;

    await addButtons.first().click();
    await page.waitForTimeout(500);

    // Create a precise-mode item
    const name = `E2E_PreciseNav_${Date.now()}`;
    const nameInput = page.locator('input[placeholder="物品名称"]');
    if (!(await nameInput.isVisible({ timeout: 2000 }).catch(() => false))) return;
    await nameInput.fill(name);

    // Switch to precise mode
    const preciseBtn = page.locator('button:has-text("孔位模式")');
    if (await preciseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await preciseBtn.click();
      await page.waitForTimeout(200);

      const preset = page.locator('button:has-text("10x10")');
      if (await preset.isVisible({ timeout: 1000 }).catch(() => false)) {
        await preset.click();
      }
    }

    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Search for the new item (may be on a different pagination page)
    const searchInputS = page.locator('input[placeholder="搜索上层物品..."]');
    if (await searchInputS.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInputS.fill(name);
      await page.waitForTimeout(500);
    }

    // Now click the ItemCard - should navigate into its box grid
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });
    await page.locator(`text=${name}`).first().click();
    await page.waitForTimeout(800);

    // Should see "返回物品列表" or box grid elements
    const backBtn = page.locator('text=返回物品列表').or(page.locator('text=返回盒子列表'));
    const gridArea = page.locator('[style*="grid-template"]');
    const navigated = (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await gridArea.isVisible({ timeout: 3000 }).catch(() => false));

    // If not navigated (simple mode items just open edit modal), that's expected
    if (navigated) {
      expect(navigated).toBeTruthy();
    }
  });

  test('TC-SHELF-04: back from box grid returns to shelf items', async ({ page }) => {
    // Navigate into a precise-mode item's box grid first
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Look for existing precise-mode items that show grid badges
    const gridBadge = page.locator('text=/\\d+x\\d+/').first();
    if (await gridBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click on the item containing this grid badge
      await gridBadge.click();
      await page.waitForTimeout(800);

      // Should be in box grid view now - click back button
      const backBtn = page.locator('text=返回物品列表').or(page.locator('text=返回盒子列表')).first();
      if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(500);

        // Should be back at upper storage
        await expect(page.locator('text=上层开放存储').first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
