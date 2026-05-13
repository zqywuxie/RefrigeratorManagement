import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  test('TC-SCH-01: search by sample ID', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('S-001');
    await page.waitForTimeout(500);

    // Result count should appear
    await expect(page.locator('text=/\\d+ 个匹配/').first()).toBeVisible({ timeout: 3000 });

    // S-001 should be highlighted
    await expect(page.locator('text=S-001').first()).toBeVisible();
  });

  test('TC-SCH-02: search by type', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await searchInput.fill('血清');
    await page.waitForTimeout(500);

    // Results should show match count
    await expect(page.locator('text=/\\d+ 个匹配/').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-SCH-03: search by patient ID', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await searchInput.fill('P-2024');
    await page.waitForTimeout(500);

    await expect(page.locator('text=S-001').first()).toBeVisible();
  });

  test('TC-SCH-04: search by tag', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await searchInput.fill('紧急');
    await page.waitForTimeout(500);

    // Search should work without errors
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible();
  });

  test('TC-SCH-05: search by status label', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await searchInput.fill('正常');
    await page.waitForTimeout(500);

    await expect(page.locator('text=/\\d+ 个匹配/').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-SCH-06: clear search resets results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await searchInput.fill('S-001');
    await page.waitForTimeout(500);

    // Clear the search
    await searchInput.clear();
    // Or click the clear/X button
    const clearBtn = page.locator('button:has-text("×")');
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    }
    await page.waitForTimeout(500);

    // Match count should disappear
    await expect(page.locator('text=/\\d+ 个匹配/')).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-SCH-07: no matches shows zero count', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索样本"]');
    await searchInput.fill('ZZZZ_NONEXISTENT_XXXX');
    await page.waitForTimeout(500);

    // Should show "0 个匹配"
    await expect(page.locator('text=0 个匹配').first()).toBeVisible({ timeout: 3000 });
  });
});
