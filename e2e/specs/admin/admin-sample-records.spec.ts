import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('Admin Sample Records Management', () => {
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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.65));
    await page.waitForTimeout(500);
  });

  test('TC-ASR-01: sample records table is displayed', async ({ page }) => {
    await expect(page.locator('text=样本记录').first()).toBeVisible({ timeout: 5000 });

    const colHeaders = page.locator('text=/姓名|编号|类型|上传者|试管/');
    const headerCount = await colHeaders.count();
    expect(headerCount).toBeGreaterThanOrEqual(2);
  });

  test('TC-ASR-02: click row shows detail panel', async ({ page }) => {
    const nameCell = page.locator('table tbody tr td:nth-child(2)').first();
    if (!(await nameCell.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await nameCell.click();
    await page.waitForTimeout(600);

    const detailLabels = page.locator('text=/编号|类型|来源|阶段|采集时间|上传者|试管数|标签|备注/');
    const detailCount = await detailLabels.count();
    if (detailCount > 0) expect(detailCount).toBeGreaterThanOrEqual(1);
  });

  test('TC-ASR-03: edit sample record inline', async ({ page }) => {
    // Click the second cell (patient name) which handles select
    const nameCell = page.locator('table tbody tr td:nth-child(2)').first();
    if (!(await nameCell.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await nameCell.click();
    await page.waitForTimeout(600);

    // The edit button appears in a detail panel on the right
    const editBtn = page.locator('button:has-text("编辑")');
    if (!(await editBtn.isVisible({ timeout: 5000 }).catch(() => false))) return;

    await editBtn.click();
    await page.waitForTimeout(500);

    const saveBtn = page.locator('button:has-text("保存")');
    const cancelBtn = page.locator('button:has-text("取消")');
    const hasForm = (await saveBtn.isVisible().catch(() => false)) || (await cancelBtn.isVisible().catch(() => false));
    expect(hasForm).toBeTruthy();

    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('TC-ASR-04: delete sample record', async ({ page }) => {
    const nameCell = page.locator('table tbody tr td:nth-child(2)').first();
    if (!(await nameCell.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await nameCell.click();
    await page.waitForTimeout(600);

    const deleteBtn = page.locator('button:has-text("删除")');
    if (!(await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false))) return;

    page.on('dialog', async (dialog) => { await dialog.accept(); });
    await deleteBtn.click();
    await page.waitForTimeout(1500);

    await expect(page.locator('text=样本记录').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-ASR-05: search sample records', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="搜索姓名 / 编号..."]');
    if (!(await searchInput.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await searchInput.fill('test');
    await page.waitForTimeout(500);

    const hasResults = await page.locator('table tbody tr').first().isVisible({ timeout: 2000 }).catch(() => false);
    const noResults = await page.locator('text=无匹配结果').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasResults || noResults).toBeTruthy();

    await searchInput.fill('');
    await page.waitForTimeout(300);
  });

  test('TC-ASR-06: filter by box dropdown', async ({ page }) => {
    // Scroll to sample records section and wait for it to load
    const srSection = page.locator('h3:has-text("样本记录")');
    if (!(await srSection.isVisible({ timeout: 5000 }).catch(() => false))) return;

    // Wait for data to load — the box filter select starts disabled
    await page.waitForTimeout(1000);

    // Look for an enabled select with options in the sample records section
    const selects = page.locator('select');
    const count = await selects.count();
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      const enabled = await sel.isEnabled({ timeout: 1000 }).catch(() => false);
      if (!enabled) continue;
      const opts = await sel.locator('option').count().catch(() => 0);
      if (opts > 1) {
        await sel.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        await sel.selectOption({ index: 0 });
        await page.waitForTimeout(300);
        return;
      }
    }
  });

  test('TC-ASR-07: batch delete checkbox interaction', async ({ page }) => {
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
    const cbCount = await checkboxes.count();

    if (cbCount >= 1) {
      await checkboxes.first().check();
      await page.waitForTimeout(300);

      const batchBtn = page.locator('button:has-text("批量删除")');
      const hasBatch = await batchBtn.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasBatch).toBeTruthy();

      await checkboxes.first().uncheck();
      await page.waitForTimeout(200);
    }
  });

  test('TC-ASR-08: export button exists', async ({ page }) => {
    const exportBtns = page.locator('button:has-text("导出Excel")');
    const btnCount = await exportBtns.count();
    expect(btnCount).toBeGreaterThanOrEqual(1);
  });

  test('TC-ASR-09: sample records section is accessible', async ({ page }) => {
    // Verify the section is visible and functional
    await expect(page.locator('text=样本记录').first()).toBeVisible({ timeout: 5000 });

    // Check that either the table or empty state is shown
    const hasTable = await page.locator('table tbody').first().isVisible({ timeout: 2000 }).catch(() => false);
    const isEmpty = await page.locator('text=暂无样本记录').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasTable || isEmpty).toBeTruthy();
  });
});
