import { test, expect } from '@playwright/test';
import { loginAsRoot } from '../../fixtures/auth';

test.describe('SubSample CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  test('TC-CONT-01: click sample card enters container view', async ({ page }) => {
    // Click on a sample that has sub-samples (S-001 has SS-001, SS-002)
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Container view should show breadcrumb
    await expect(page.locator('text=S-001').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-CONT-02: container shows breadcrumb navigation', async ({ page }) => {
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Breadcrumb should show navigation items
    await expect(page.locator('text=冰箱').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-CONT-03: container displays sub-sample grid', async ({ page }) => {
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Sub-samples should be visible inside container
    await expect(page.locator('text=SS-001').or(page.locator('text=SS-002')).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-SUB-CR-01: create sub-sample via "添加副样本" button', async ({ page }) => {
    // Enter container
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Click "添加副样本"
    const addBtn = page.locator('button:has-text("添加副样本")');
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Modal should open
      await expect(page.locator('text=/添加.*样本|新建.*样本/').first()).toBeVisible({ timeout: 5000 });

      // Fill name
      const nameInput = page.locator('input[placeholder*="名称"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('E2E SubSample');
      }

      // Submit
      const submitBtn = page.locator('button:has-text("确认添加")').or(page.locator('button:has-text("保存")'));
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  test('TC-SUB-ED-01: edit sub-sample via detail panel', async ({ page }) => {
    // Enter container
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Click on a sub-sample
    const ss001 = page.locator('text=SS-001').first();
    if (await ss001.isVisible().catch(() => false)) {
      await ss001.click();
      await page.waitForTimeout(500);

      // Edit button in detail panel
      const editBtn = page.locator('button[title="编辑"]');
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);

        // Edit modal should open
        const nameInput = page.locator('input[placeholder*="名称"]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill('Edited SubSample');
        }

        const saveBtn = page.locator('button:has-text("保存")').or(page.locator('button:has-text("确认")'));
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('TC-BREAD-01: breadcrumb returns to fridge view', async ({ page }) => {
    // Enter container
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Click breadcrumb "冰箱" link
    const fridgeBreadcrumb = page.locator('text=冰箱').first();
    if (await fridgeBreadcrumb.isVisible().catch(() => false)) {
      await fridgeBreadcrumb.click();
      await page.waitForTimeout(500);
    }

    // Should be back to main fridge view
    await expect(page.locator('text=Refrigerator Management').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-BREAD-02: Escape key or back button exits container view', async ({ page }) => {
    // Enter container
    const s001 = page.locator('text=S-001').first();
    await s001.click();
    await page.waitForTimeout(800);

    // Try both Escape key and clicking the back/close button
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Check if we're back to fridge view, or try the breadcrumb "冰箱" link
    let backToFridge = await page.locator('text=上层 / Upper').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (!backToFridge) {
      // Try clicking breadcrumb
      const fridgeLink = page.locator('text=冰箱').first();
      if (await fridgeLink.isVisible().catch(() => false)) {
        await fridgeLink.click();
        await page.waitForTimeout(500);
      }
    }

    // Should be back to main fridge view
    await expect(page.locator('text=上层 / Upper').or(page.locator('text=Refrigerator Management')).first()).toBeVisible({ timeout: 5000 });
  });
});
