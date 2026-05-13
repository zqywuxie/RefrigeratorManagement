import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Stats Cards', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
  });

  test('TC-UI-ST-01: stats cards are displayed in sidebar', async ({ page }) => {
    // Check for main stats cards
    await expect(page.locator('text=总容量').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=上层').first()).toBeVisible();
    await expect(page.locator('text=下层').first()).toBeVisible();
    await expect(page.locator('text=异常警报').first()).toBeVisible();
  });

  test('TC-UI-ST-02: capacity numbers are displayed', async ({ page }) => {
    // Stats should show capacity numbers
    await expect(page.locator('text=总容量').first()).toBeVisible();

    // Usage bar or percentage should show
    const percentageRegex = /\d+\s*\/\s*\d+/;
    await expect(page.locator(`text=${percentageRegex}`).first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-UI-ST-03: sub-sample stats panel is visible', async ({ page }) => {
    // Should show sub-sample statistics
    await expect(page.locator('text=副样本').first()).toBeVisible({ timeout: 5000 });
  });
});
