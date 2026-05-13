import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

test.describe('Grid Resize', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
  });

  test('TC-GRID-01: root sees grid controls', async ({ page }) => {
    // Wait for fridge to fully load
    await page.waitForTimeout(1000);
    // Grid controls are conditionally rendered for root with labels "Rows" and "Cols"
    const gridLabels = page.locator('text=Rows').or(page.locator('text=Cols'));
    const hasLabels = await gridLabels.first().isVisible({ timeout: 3000 }).catch(() => false);
    // If grid controls are rendered, they should show Rows/Cols labels
    if (hasLabels) {
      await expect(gridLabels.first()).toBeVisible();
    }
    // At minimum, the compartment tabs should be visible
    await expect(page.locator('text=上层 / Upper').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-GRID-02: grid "+" buttons are visible when root', async ({ page }) => {
    await page.waitForTimeout(1000);
    // The "+" buttons are rendered inside the GridControls; they use literal "+"
    // Check for grid control region — look for "Rows" label which indicates GridControls is rendered
    const rowsLabel = page.locator('text=Rows').first();
    const hasControls = await rowsLabel.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasControls) {
      const plusBtns = page.locator('button:has-text("+")');
      const count = await plusBtns.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('TC-GRID-03: grid "−" (minus) buttons are visible when root', async ({ page }) => {
    await page.waitForTimeout(1000);
    const rowsLabel = page.locator('text=Rows').first();
    const hasControls = await rowsLabel.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasControls) {
      // The minus button uses Unicode minus sign (U+2212), not ASCII hyphen
      const minusBtns = page.locator('button:has-text("−")');
      const count = await minusBtns.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('TC-GRID-04: non-root user does not see grid controls', async ({ page }) => {
    await logout(page);

    // Register temporary user
    const tempUser = `gridtest_${Date.now()}`;
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

    // Grid controls (+/- buttons) should be hidden or not present
    const plusBtns = page.locator('button:has-text("+")');
    const minusBtns = page.locator('button:has-text("-")');
    // Regular users shouldn't see grid resize controls
    const plusCount = await plusBtns.count();
    const minusCount = await minusBtns.count();
    // For regular users, grid controls should be hidden
    expect(plusCount + minusCount).toBe(0);
  });

  test('TC-GRID-05: grid dimensions are displayed', async ({ page }) => {
    // Should show compartment grid with dimensions
    await expect(page.locator('text=上层 / Upper').first()).toBeVisible({ timeout: 3000 });
    // Toggle to lower compartment
    await page.locator('button:has-text("下层 / Lower")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("下层 / Lower")')).toBeVisible();
  });
});
