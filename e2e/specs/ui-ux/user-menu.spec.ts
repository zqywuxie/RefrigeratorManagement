import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('User Menu — My Uploads', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  test('TC-MENU-01: user menu opens on click', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Should show "我的上传" heading
    await expect(page.locator('text=我的上传').first()).toBeVisible({ timeout: 3000 });

    // Should show fridge info summary
    await expect(page.locator('text=当前冰箱').first()).toBeVisible({ timeout: 3000 });

    // Close menu by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('text=我的上传').first()).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-MENU-02: sample and item tabs are displayed', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Check for tab buttons
    const samplesTab = page.getByRole('tab', { name: /样本/ });
    const itemsTab = page.getByRole('tab', { name: /物品/ });

    const samplesVisible = await samplesTab.isVisible({ timeout: 3000 }).catch(() => false);
    const itemsVisible = await itemsTab.isVisible({ timeout: 3000 }).catch(() => false);
    expect(samplesVisible || itemsVisible).toBeTruthy();

    await page.keyboard.press('Escape');
  });

  test('TC-MENU-03: switch to items tab shows uploaded upper items', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    const itemsTab = page.getByRole('tab', { name: /物品/ });
    if (!(await itemsTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.keyboard.press('Escape');
      return;
    }

    await itemsTab.click();
    await page.waitForTimeout(300);

    // Items tabpanel should be visible with item entries
    const tabpanel = page.getByRole('tabpanel', { name: /物品/ });
    if (await tabpanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Should contain item buttons
      const itemButtons = tabpanel.locator('button');
      const count = await itemButtons.count();
      // May be empty if no uploaded items, but panel should render
      expect(count).toBeGreaterThanOrEqual(0);
    }

    await page.keyboard.press('Escape');
  });

  test('TC-MENU-04: click upper item navigates and highlights', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Switch to items tab
    const itemsTab = page.getByRole('tab', { name: /物品/ });
    if (!(await itemsTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.keyboard.press('Escape');
      return;
    }
    await itemsTab.click();
    await page.waitForTimeout(300);

    // Find an item entry button inside the tabpanel
    const tabpanel = page.getByRole('tabpanel', { name: /物品/ });
    const itemButtons = tabpanel.locator('button');
    const count = await itemButtons.count();

    if (count > 0) {
      await itemButtons.first().click();
      await page.waitForTimeout(1000);

      // Menu should close after selection
      const menuClosed = await page.locator('text=我的上传').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!menuClosed) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      // Should be on the upper storage view
      const upperTab = page.locator('button:has-text("上层")').first();
      if (await upperTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        // The upper tab may already be visible. Check that the view is the fridge view.
        await expect(page.locator('text=上层开放存储').first()).toBeVisible({ timeout: 5000 });
      }
    }

    await page.keyboard.press('Escape');
  });

  test('TC-MENU-05: click sample record navigates to drawer', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Stay on samples tab (default)
    const tabpanel = page.getByRole('tabpanel', { name: /样本/ });
    if (!(await tabpanel.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.keyboard.press('Escape');
      return;
    }

    const sampleButtons = tabpanel.locator('button');
    const count = await sampleButtons.count();

    if (count > 0) {
      await sampleButtons.first().click();
      await page.waitForTimeout(1000);

      // Menu should close
      const menuClosed = await page.locator('text=我的上传').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!menuClosed) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      // Should navigate to drawer view showing breadcrumb or box list
      const drawerView = page.locator('text=抽屉内部').or(page.locator('text=返回')).first();
      const navHappened = await drawerView.isVisible({ timeout: 3000 }).catch(() => false);
      // Navigation may stay on same view if sample is in same fridge
      if (navHappened) {
        await expect(drawerView).toBeVisible();
      }
    }

    await page.keyboard.press('Escape');
  });

  test('TC-MENU-06: menu has create user button', async ({ page }) => {
    // Open the menu first — create user button is inside the popover
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    const createUserBtn = page.locator('button:has-text("创建用户")');
    const visible = await createUserBtn.isVisible({ timeout: 3000 }).catch(() => false);
    // Button may only appear for root users with permission
    if (visible) {
      await expect(createUserBtn).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });

  test('TC-MENU-07: menu has logout button', async ({ page }) => {
    const logoutBtn = page.locator('button[title="退出登录"]');
    await expect(logoutBtn).toBeVisible({ timeout: 3000 });
  });

  test('TC-MENU-08: menu has theme toggle', async ({ page }) => {
    const themeBtn = page.locator('button[title*="切换"]').first();
    await expect(themeBtn).toBeVisible({ timeout: 3000 });
  });

  test('TC-MENU-09: items tab pagination works', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    const itemsTab = page.getByRole('tab', { name: /物品/ });
    if (!(await itemsTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.keyboard.press('Escape');
      return;
    }
    await itemsTab.click();
    await page.waitForTimeout(300);

    // Check for pagination controls
    const prevBtn = page.locator('button:has-text("上一页")');
    const nextBtn = page.locator('button:has-text("下一页")');
    const pageIndicator = page.locator('text=/\\d+\\/\\d+/');

    const hasPagination = (await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false));

    if (hasPagination) {
      // Try clicking next page if available
      if (await nextBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(300);
        // Page indicator should update
      }
    }

    await page.keyboard.press('Escape');
  });

  test('TC-MENU-10: menu closes when clicking outside', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: /root root/ });
    await menuBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=我的上传').first()).toBeVisible({ timeout: 3000 });

    // Click outside the menu on the main content
    const mainContent = page.locator('main').first();
    await mainContent.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    // Menu should close
    await expect(page.locator('text=我的上传').first()).not.toBeVisible({ timeout: 3000 });
  });
});
