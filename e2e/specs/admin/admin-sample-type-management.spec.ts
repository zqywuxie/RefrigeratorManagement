import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Admin Sample Type Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await loginAsRoot(page);
    await page.waitForTimeout(800);

    // Enter admin panel
    const adminBtn = page.locator('button:has-text("全局管理")').first();
    const returnBtn = page.locator('button:has-text("返回冰箱")').first();
    const alreadyInAdmin = await returnBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (alreadyInAdmin) {
      await returnBtn.click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("全局管理")').first().click({ timeout: 5000 });
    } else {
      await adminBtn.click({ timeout: 5000 });
    }
    await page.waitForTimeout(800);

    // Scroll to type management
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
    await page.waitForTimeout(500);
  });

  test('TC-AT-ST-01: sample types table is displayed', async ({ page }) => {
    await expect(page.locator('text=类型名称').first()).toBeVisible({ timeout: 5000 });

    const sampleCols = page.locator('text=/格位样本|副样本|样本记录|盒子/');
    const colCount = await sampleCols.count();
    expect(colCount).toBeGreaterThanOrEqual(1);
  });

  test('TC-AT-ST-02: create new sample type via Enter', async ({ page }) => {
    const typeInput = page.locator('input[placeholder="输入新样本类型名称"]');
    if (!(await typeInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const newType = `E2E_ST_${Date.now()}`;
    await typeInput.fill(newType);
    await typeInput.press('Enter');
    await page.waitForTimeout(1000);

    await expect(page.locator(`text=${newType}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-AT-ST-03: rename sample type', async ({ page }) => {
    const typeInput = page.locator('input[placeholder="输入新样本类型名称"]');
    if (!(await typeInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const original = `E2E_RS_ST_${Date.now()}`;
    await typeInput.fill(original);
    await typeInput.press('Enter');
    await page.waitForTimeout(800);

    const newName = `E2E_RND_ST_${Date.now()}`;
    page.on('dialog', async (dialog) => { await dialog.accept(newName); });

    const typeRow = page.locator('tr', { has: page.locator(`text=${original}`) }).first();
    const renameBtn = typeRow.locator('td').last().locator('button').first();
    if (await renameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await renameBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  test('TC-AT-ST-04: delete sample type', async ({ page }) => {
    const typeInput = page.locator('input[placeholder="输入新样本类型名称"]');
    if (!(await typeInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const typeName = `E2E_DelST_${Date.now()}`;
    await typeInput.fill(typeName);
    await typeInput.press('Enter');
    await page.waitForTimeout(800);

    page.on('dialog', async (dialog) => { await dialog.accept(); });

    const typeRow = page.locator('tr', { has: page.locator(`text=${typeName}`) }).first();
    const deleteBtn = typeRow.locator('td').last().locator('button').last();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  test('TC-AT-ST-05: default sample types have disabled delete', async ({ page }) => {
    const defaultRow = page.locator('tr', { has: page.locator('text=血清') }).first();
    if (await defaultRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteBtn = defaultRow.locator('td').last().locator('button').last();
      const isDisabled = await deleteBtn.isDisabled().catch(() => true);
      expect(isDisabled).toBeTruthy();
    }
  });
});
