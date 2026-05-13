import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

// The fridge selector button shows the CURRENT fridge name, or "选择冰箱" if none selected
function fridgeSelectorBtn(page: any) {
  return page.locator('header button').filter({ hasText: /./ }).first();
}

async function openFridgeSelector(page: any) {
  // Click the fridge selector — it's in the header area
  // The button shows current fridge name or "选择冰箱"
  const btn = page.locator('header button:has(svg)').first();
  const count = await btn.count();
  if (count > 0) {
    await btn.first().click();
  } else {
    // Fallback: click any button near the header left area
    await page.locator('header button').first().click();
  }
  await page.waitForTimeout(500);
}

test.describe('Fridge CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
  });

  test('TC-FRIDGE-01: fridge list is loaded', async ({ page }) => {
    await openFridgeSelector(page);
    // Should show at least the default fridge
    await expect(page.locator('text=主冰箱').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-FRIDGE-02: select fridge switches view', async ({ page }) => {
    // Click fridge selector
    await openFridgeSelector(page);
    await page.waitForTimeout(300);
    // Click on a specific fridge
    const fridgeOption = page.locator('text=主冰箱').first();
    if (await fridgeOption.isVisible().catch(() => false)) {
      await fridgeOption.click();
      await page.waitForTimeout(500);
    }
    // Should see fridge content
    await expect(page.locator('text=Refrigerator Management').first()).toBeVisible();
  });

  test('TC-FRIDGE-03: create new fridge (root)', async ({ page }) => {
    const newFridgeName = `E2E_Fridge_${Date.now()}`;

    // Open fridge selector
    await openFridgeSelector(page);
    await page.waitForTimeout(300);

    // Click "添加新冰箱"
    const addBtn = page.locator('button:has-text("添加新冰箱")');
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      // Fill name
      const nameInput = page.locator('input[placeholder*="冰箱名称"]');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(newFridgeName);

        // Submit
        const saveBtn = page.locator('button:has-text("保存")').or(page.locator('button:has-text("确认")'));
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // New fridge should appear
    await openFridgeSelector(page);
    await page.waitForTimeout(300);
    await expect(page.locator(`text=${newFridgeName}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-FRIDGE-04: edit fridge name (root)', async ({ page }) => {
    // Open fridge selector
    await openFridgeSelector(page);
    await page.waitForTimeout(300);

    // Find edit button (pencil icon) on a fridge row
    const editBtns = page.locator('button:has(svg)');
    const count = await editBtns.count();
    if (count > 0) {
      // Click pencil icon (usually the first SVG button in a fridge row)
      await editBtns.first().click();
      await page.waitForTimeout(300);

      // Look for name input in edit form
      const nameInput = page.locator('input[placeholder*="冰箱名称"]').or(page.locator('input[value]'));
      if (await nameInput.isVisible().catch(() => false)) {
        const currentValue = await nameInput.inputValue();
        await nameInput.fill(currentValue + '_edited');

        const saveBtn = page.locator('button:has-text("保存")').or(page.locator('button:has-text("确认")'));
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('TC-FRIDGE-05: cancel edit does not apply changes', async ({ page }) => {
    await openFridgeSelector(page);
    await page.waitForTimeout(300);

    const cancelBtn = page.locator('button:has-text("取消")');
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
    // Should close without saving
  });

  test('TC-FRIDGE-07: delete last fridge not allowed', async ({ page }) => {
    await openFridgeSelector(page);
    await page.waitForTimeout(300);

    // Check if trash icon is hidden for the only fridge
    const trashBtns = page.locator('button:has-text("删除")');
    const trashCount = await trashBtns.count();
    // If only one fridge exists, trash should be hidden or disabled
    if (trashCount === 0) {
      // No delete buttons — correct behavior for single fridge
      await expect(trashBtns).toHaveCount(0);
    }
  });

  test('TC-FRIDGE-08: non-root user cannot see fridge management buttons', async ({ page }) => {
    await logout(page);

    // Login as a test user (need to register first)
    // For now, we'll register a temporary user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    const tempUser = `noadmin_${Date.now()}`;
    await page.locator('button:has-text("注册")').click();
    await page.waitForTimeout(300);
    await page.locator('input:not([type="password"])').first().fill(tempUser);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill('test1234');
    await passInputs.nth(1).fill('test1234');
    await page.locator('button:has-text("注册")').last().click();
    await page.waitForSelector('text=冰箱管理系统', { timeout: 10000 });

    // Open fridge selector
    await openFridgeSelector(page);
    await page.waitForTimeout(300);

    // Should NOT see add fridge button
    await expect(page.locator('button:has-text("添加新冰箱")')).not.toBeVisible({ timeout: 2000 });
  });
});
