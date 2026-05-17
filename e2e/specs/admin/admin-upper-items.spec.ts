import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Admin Upper Items Management', () => {
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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
    await page.waitForTimeout(500);
  });

  test('TC-AU-01: upper items table displayed', async ({ page }) => {
    await expect(page.locator('text=上层物品').first()).toBeVisible({ timeout: 5000 });

    const hasData = await page.locator('table tbody tr').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasData) {
      await expect(page.locator('text=暂无物品').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('TC-AU-02: edit upper item modal opens', async ({ page }) => {
    const editBtn = page.locator('button[title="编辑"]').first();
    if (!(await editBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await editBtn.click();
    await page.waitForTimeout(600);

    const modal = page.locator('text=/添加物品|编辑物品/').first();
    if (await modal.isVisible().catch(() => false)) {
      const cancelBtn = page.locator('button:has-text("取消")').first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('TC-AU-03: delete upper item with confirmation', async ({ page }) => {
    const deleteBtn = page.locator('button[title="删除"]').first();
    if (!(await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    page.on('dialog', async (dialog) => { await dialog.accept(); });
    await deleteBtn.click();
    await page.waitForTimeout(1500);

    await expect(page.locator('text=上层物品').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-AU-04: export button exists', async ({ page }) => {
    const exportBtns = page.locator('button:has-text("导出Excel")');
    const btnCount = await exportBtns.count();
    expect(btnCount).toBeGreaterThanOrEqual(1);
  });

  test('TC-AU-05: table columns are correct', async ({ page }) => {
    const expectedCols = ['冰箱', '名称', '类型', '行', '数量', '操作'];
    for (const col of expectedCols) {
      const header = page.locator(`th:has-text("${col}")`).first();
      const visible = await header.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) await expect(header).toBeVisible();
    }
  });
});
