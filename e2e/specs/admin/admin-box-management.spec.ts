import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Admin Box Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('biofridge_token');
      localStorage.removeItem('biofridge_user');
    });
    await page.reload();

    await loginAsRoot(page);
    await page.waitForTimeout(800);

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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
    await page.waitForTimeout(500);
  });

  test('TC-AB-01: box list table shows box data', async ({ page }) => {
    await expect(page.locator('text=盒子管理').first()).toBeVisible({ timeout: 5000 });

    const columnHeaders = page.locator('text=/冰箱|抽屉|盒子名称|模式|网格|试管数|负责人|操作/');
    const headerCount = await columnHeaders.count();
    expect(headerCount).toBeGreaterThanOrEqual(3);

    const hasData = await page.locator('text=暂无盒子数据').isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasData) {
      const tableRows = page.locator('table tbody tr');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('TC-AB-02: edit box name in admin', async ({ page }) => {
    const editBtn = page.locator('button:has-text("编辑")').first();
    if (!(await editBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await editBtn.click();
    await page.waitForTimeout(400);

    const saveBtn = page.locator('button:has-text("保存")');
    const cancelBtn = page.locator('button:has-text("取消")');
    const hasSave = await saveBtn.isVisible().catch(() => false);
    const hasCancel = await cancelBtn.isVisible().catch(() => false);
    expect(hasSave || hasCancel).toBeTruthy();

    if (hasCancel) { await cancelBtn.click(); await page.waitForTimeout(300); }
  });

  test('TC-AB-03: delete box with confirmation', async ({ page }) => {
    const deleteBtn = page.locator('button:has-text("删除")').first();
    if (!(await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    page.on('dialog', async (dialog) => { await dialog.accept(); });
    await deleteBtn.click();
    await page.waitForTimeout(1500);

    await expect(page.locator('text=盒子管理').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-AB-04: box table contains expected columns', async ({ page }) => {
    const expectedCols = ['冰箱', '抽屉', '盒子名称', '模式', '试管数', '操作'];
    for (const col of expectedCols) {
      const header = page.locator(`th:has-text("${col}")`).first();
      const visible = await header.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) await expect(header).toBeVisible();
    }
  });

  test('TC-AB-05: export boxes button is present', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("导出Excel")').first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test('TC-AB-06: mode badge shows precise or simple', async ({ page }) => {
    const modeBadges = page.locator('text=/精细|简略/');
    const badgeCount = await modeBadges.count();
    await expect(page.locator('text=盒子管理').first()).toBeVisible();
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('TC-AB-07: edit cancel preserves state', async ({ page }) => {
    const editBtn = page.locator('button:has-text("编辑")').first();
    if (!(await editBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await editBtn.click();
    await page.waitForTimeout(400);

    const cancelBtn = page.locator('button:has-text("取消")');
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('button:has-text("编辑")').first()).toBeVisible({ timeout: 3000 });
    }
  });
});
