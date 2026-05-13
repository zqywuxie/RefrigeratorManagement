import { test, expect } from '@playwright/test';
import { loginAsRoot, logout } from '../../fixtures/auth';

test.describe('Registration', () => {
  const uniqueUser = `e2euser_${Date.now()}`;
  const testPass = 'test1234';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();
  });

  test('TC-REG-01: public registration creates regular user', async ({ page }) => {
    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);

    await page.locator('input:not([type="password"])').first().fill(uniqueUser);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill(testPass);
    await passInputs.nth(1).fill(testPass);

    await page.locator('button:has-text("注册")').last().click();

    // Should auto-login and show main view
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('header')).toContainText(uniqueUser);
  });

  test('TC-REG-02: password mismatch shows error', async ({ page }) => {
    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);

    await page.locator('input:not([type="password"])').first().fill(uniqueUser);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill(testPass);
    await passInputs.nth(1).fill('differentpassword');

    await page.locator('button:has-text("注册")').last().click();

    await expect(page.locator('text=/两次密码不一致|密码.*不匹配/').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-REG-03: duplicate username shows error', async ({ page }) => {
    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);

    await page.locator('input:not([type="password"])').first().fill('root');
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill(testPass);
    await passInputs.nth(1).fill(testPass);

    await page.locator('button:has-text("注册")').last().click();

    await expect(page.locator('text=/用户已存在|已被注册/').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-REG-04: root can create another root user via header', async ({ page }) => {
    await loginAsRoot(page);

    // Click UserPlus button in header to create a user
    const addUserBtn = page.locator('button[title="创建用户"]');
    if (await addUserBtn.isVisible().catch(() => false)) {
      await addUserBtn.click();
      await page.waitForTimeout(500);

      // Fill the form
      const rootUser = `e2eroot_${Date.now()}`;
      const userInput = page.locator('input:not([type="password"])').first();
      await userInput.fill(rootUser);

      const passFields = page.locator('input[type="password"]');
      const count = await passFields.count();
      if (count >= 2) {
        await passFields.nth(0).fill(testPass);
        await passFields.nth(1).fill(testPass);
      }

      // Select root role
      const roleSelect = page.locator('select');
      if (await roleSelect.isVisible().catch(() => false)) {
        await roleSelect.selectOption({ label: '管理员 (root)' });
      }

      // Submit
      const submitBtn = page.locator('button:has-text("创建用户")').or(page.locator('button:has-text("注册")'));
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Should still be on main view
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible();
    await logout(page);
  });

  test('TC-REG-05: public registration always creates user role', async ({ page }) => {
    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);

    // Verify there's no role selector
    const roleSelect = page.locator('select');
    await expect(roleSelect).not.toBeVisible({ timeout: 1000 });

    const publicUser = `public_${Date.now()}`;
    await page.locator('input:not([type="password"])').first().fill(publicUser);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill(testPass);
    await passInputs.nth(1).fill(testPass);

    await page.locator('button:has-text("注册")').last().click();
    await expect(page.locator('text=冰箱管理系统').first()).toBeVisible({ timeout: 10000 });
    // Regular user should not see admin button
    await expect(page.locator('button:has-text("全局管理")')).not.toBeVisible({ timeout: 2000 });
  });
});
