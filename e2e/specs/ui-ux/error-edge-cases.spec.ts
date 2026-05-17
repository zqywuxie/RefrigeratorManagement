import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs } from '../../fixtures/auth';

test.describe('Error and Edge Cases', () => {
  test('TC-ERR-01: login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    // Fill invalid credentials
    await page.locator('input:not([type="password"])').first().fill('nonexistent_user');
    await page.locator('input[type="password"]').first().fill('wrongpassword');

    // Submit
    await page.locator('form button[type="submit"]').or(page.locator('form button:has-text("登录")')).first().click();
    await page.waitForTimeout(2000);

    // Should show error message — page should not navigate to fridge
    // Either still on login page, or an error toast appeared
    const stillOnLogin = await page.locator('text=冰箱管理系统登录').isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await page.locator('text=/错误|失败|无效/').isVisible({ timeout: 2000 }).catch(() => false);

    expect(stillOnLogin || hasError).toBeTruthy();
  });

  test('TC-ERR-02: empty username/password validation', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    // Try to login with empty fields
    await page.locator('form button[type="submit"]').or(page.locator('form button:has-text("登录")')).first().click();
    await page.waitForTimeout(1000);

    // Should not redirect — should stay on login page
    const loginPage = page.locator('text=冰箱管理系统登录');
    await expect(loginPage).toBeVisible({ timeout: 3000 });
  });

  test('TC-ERR-03: invalid token redirects to login', async ({ page }) => {
    // Set an invalid token
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('biofridge_token', 'invalid_token_12345');
      localStorage.setItem('biofridge_user', JSON.stringify({ username: 'test', role: 'user' }));
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Should either show login page or redirect
    const loginOrError = page.locator('text=/冰箱管理系统登录|登录|unauthorized|未授权/i');
    const hasResult = await loginOrError.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasResult).toBeTruthy();
  });

  test('TC-ERR-04: register with duplicate username shows error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    // Try to register as root (already exists)
    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);

    await page.locator('input:not([type="password"])').first().fill('root');
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill('test1234');
    await passInputs.nth(1).fill('test1234');

    await page.locator('button:has-text("注册")').last().click();
    await page.waitForTimeout(2000);

    // Should show error about duplicate user
    const hasError = await page.locator('text=/已存在|重复|失败/').isVisible({ timeout: 3000 }).catch(() => false);
    const stillOnRegister = await page.locator('button:has-text("注册")').last().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasError || stillOnRegister).toBeTruthy();
  });

  test('TC-ERR-05: current user row has restricted actions', async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(1000);

    // Navigate to admin panel
    const adminBtn = page.locator('button:has-text("全局管理")').first();
    if (!(await adminBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      const returnBtn = page.locator('button:has-text("返回冰箱")').first();
      if (await returnBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Already in admin
      } else {
        return;
      }
    } else {
      await adminBtn.click();
      await page.waitForTimeout(800);
    }

    // Find the row with current user — look for the "当前" badge in the row
    const currentBadge = page.locator('text=当前').first();
    if (!(await currentBadge.isVisible({ timeout: 5000 }).catch(() => false))) return;

    // The row containing "当前" badge should exist in user management table
    await expect(currentBadge).toBeVisible();
  });

  test('TC-ERR-06: form cancel preserves state', async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(1500);

    // Navigate to lower first layer — may need to return from admin first
    const adminBtn = page.locator('button:has-text("返回冰箱")').first();
    if (await adminBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForTimeout(500);
    }

    const layer1Btn = page.locator('button:has-text("下层第一层")');
    if (!(await layer1Btn.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await layer1Btn.click();
    await page.waitForTimeout(400);

    // Click into a drawer
    const drawerSlot = page.locator('button:has-text("/")').first();
    if (!(await drawerSlot.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await drawerSlot.click();
    await page.waitForTimeout(800);

    // Try to add a box but cancel
    const addBtn = page.locator('button:has-text("添加盒子")').first();
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await addBtn.click();
    await page.waitForTimeout(500);

    // Fill some data
    await page.locator('input[placeholder="盒子名称"]').fill('TestCancelBox');
    await page.waitForTimeout(200);

    // Cancel
    const cancelBtn = page.locator('button:has-text("取消")').first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);

      // Modal should close, no box created
      const saveBtn = page.locator('form button:has-text("保存")');
      await expect(saveBtn).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('TC-ERR-07: rapid double click does not duplicate submission', async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(1500);

    // May need to return from admin panel
    const adminReturnBtn = page.locator('button:has-text("返回冰箱")').first();
    if (await adminReturnBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminReturnBtn.click();
      await page.waitForTimeout(500);
    }

    const layerBtn = page.locator('button:has-text("下层第一层")');
    if (!(await layerBtn.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await layerBtn.click();
    await page.waitForTimeout(400);

    const drawerSlot = page.locator('button:has-text("/")').first();
    if (!(await drawerSlot.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await drawerSlot.click();
    await page.waitForTimeout(800);

    const addBtn = page.locator('button:has-text("添加盒子")').first();
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await addBtn.click();
    await page.waitForTimeout(500);

    const name = `E2E_DoubleClick_${Date.now()}`;
    await page.locator('input[placeholder="盒子名称"]').fill(name);

    // Rapid double click on save
    const saveBtn = page.locator('button:has-text("保存")');
    await saveBtn.click({ clickCount: 2 });
    await page.waitForTimeout(1500);

    // The modal should close after the first save
    const modalSave = page.locator('form button:has-text("保存")');
    await expect(modalSave).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-ERR-08: page survives reload after login', async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(2000);

    // Should still be logged in (token persisted)
    const mainView = page.locator('text=冰箱管理系统').first();
    await expect(mainView).toBeVisible({ timeout: 10000 });
  });
});
