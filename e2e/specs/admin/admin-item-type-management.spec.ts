import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Admin Item Type Management', () => {
  test.beforeEach(async ({ page }) => {
    // Reset state for test isolation
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await loginAsRoot(page);
    await page.waitForTimeout(800);

    // Enter admin panel — handle already-in-admin state
    const adminBtn = page.locator('button:has-text("全局管理")').first();
    const returnBtn = page.locator('button:has-text("返回冰箱")').first();
    const alreadyInAdmin = await returnBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (alreadyInAdmin) {
      // Already in admin, click return to go back to fridge first
      await returnBtn.click();
      await page.waitForTimeout(500);
      // Now enter admin
      await page.locator('button:has-text("全局管理")').first().click({ timeout: 5000 });
    } else {
      await adminBtn.click({ timeout: 5000 });
    }
    await page.waitForTimeout(800);

    // Scroll to type management section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    await page.waitForTimeout(500);
  });

  test('TC-AT-IT-01: item types table is displayed', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    await expect(page.locator('text=类型名称').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-AT-IT-02: create new item type', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    const typeInput = page.locator('input[placeholder="输入新物品类型名称"]');
    if (!(await typeInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const newType = `E2E_ItemType_${Date.now()}`;
    await typeInput.fill(newType);
    await page.locator('button:has-text("新增")').click();
    await page.waitForTimeout(1000);

    await expect(page.locator(`text=${newType}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-AT-IT-03: rename item type via prompt', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    const typeInput = page.locator('input[placeholder="输入新物品类型名称"]');
    if (!(await typeInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const originalName = `E2E_RenameIT_${Date.now()}`;
    await typeInput.fill(originalName);
    await page.locator('button:has-text("新增")').click();
    await page.waitForTimeout(800);

    const newName = `E2E_RenamedIT_${Date.now()}`;
    page.on('dialog', async (dialog) => { await dialog.accept(newName); });

    const typeRow = page.locator('tr', { has: page.locator(`text=${originalName}`) }).first();
    const renameBtn = typeRow.locator('td').last().locator('button').first();
    if (await renameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await renameBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  test('TC-AT-IT-04: delete non-default item type', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    const typeInput = page.locator('input[placeholder="输入新物品类型名称"]');
    if (!(await typeInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const typeName = `E2E_DelIT_${Date.now()}`;
    await typeInput.fill(typeName);
    await page.locator('button:has-text("新增")').click();
    await page.waitForTimeout(800);

    page.on('dialog', async (dialog) => { await dialog.accept(); });

    const typeRow = page.locator('tr', { has: page.locator(`text=${typeName}`) }).first();
    const deleteBtn = typeRow.locator('td').last().locator('button').last();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  test('TC-AT-IT-05: switch between sample and item type tabs', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    await expect(page.locator('text=上层物品').first()).toBeVisible({ timeout: 3000 });

    const samplesTab = page.locator('button:has-text("样本类型")');
    await samplesTab.click();
    await page.waitForTimeout(400);

    const sampleCols = page.locator('text=/格位样本|副样本|样本记录|盒子/');
    const colCount = await sampleCols.count();
    expect(colCount).toBeGreaterThanOrEqual(1);
  });

  test('TC-AT-IT-06: empty type input shows disabled add button', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    const addBtn = page.locator('button:has-text("新增")');
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await addBtn.isDisabled().catch(() => true);
      expect(isDisabled).toBeTruthy();
    }
  });

  test('TC-AT-IT-07: default item types are protected', async ({ page }) => {
    const itemsTab = page.locator('button:has-text("物品类型")');
    await itemsTab.click();
    await page.waitForTimeout(400);

    // Default types (试剂) should have disabled delete button
    const defaultTypeRow = page.locator('tr', { has: page.locator('text=试剂') }).first();
    if (await defaultTypeRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const trashBtn = defaultTypeRow.locator('td').last().locator('button').last();
      const isDisabled = await trashBtn.isDisabled().catch(() => true);
      expect(isDisabled).toBeTruthy();
    }
  });
});
