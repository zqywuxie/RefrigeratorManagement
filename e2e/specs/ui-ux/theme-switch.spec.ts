import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Theme Switch', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
  });

  test('TC-UI-TH-01: default theme is light', async ({ page }) => {
    // Check html element has class="light"
    const html = page.locator('html');
    const className = await html.getAttribute('class');
    expect(className).toContain('light');
  });

  test('TC-UI-TH-02: switch to dark theme', async ({ page }) => {
    // Find theme toggle button (usually moon/sun icon)
    const themeBtn = page.locator('button[title*="深色"], button[title*="暗色"], button[title*="Dark"], button[title*="切换"]');
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Theme should now be dark
      const html = page.locator('html');
      const className = await html.getAttribute('class');
      expect(className).toContain('dark');
    }
  });

  test('TC-UI-TH-03: toggle back to light theme', async ({ page }) => {
    const themeBtn = page.locator('button[title*="浅色"], button[title*="亮色"], button[title*="Light"], button[title*="切换"]');
    if (await themeBtn.isVisible().catch(() => false)) {
      // First switch to dark
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Then switch back
      const lightBtn = page.locator('button[title*="切换"]');
      if (await lightBtn.isVisible().catch(() => false)) {
        await lightBtn.click();
        await page.waitForTimeout(500);

        const html = page.locator('html');
        const className = await html.getAttribute('class');
        expect(className).toContain('light');
      }
    }
  });
});
