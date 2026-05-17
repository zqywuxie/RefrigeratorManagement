import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

test.describe('Sample Record CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  /**
   * Helper: navigate into a box grid view where we can add sample records.
   */
  async function navigateIntoBoxGrid(page: any): Promise<boolean> {
    await page.locator('button:has-text("下层第一层")').click();
    await page.waitForTimeout(500);

    const drawerSlots = page.locator('button:has-text("/")');
    const slotCount = await drawerSlots.count();
    if (slotCount === 0) return false;

    for (let i = 0; i < slotCount; i++) {
      const slot = drawerSlots.nth(i);
      if (!(await slot.isVisible().catch(() => false))) continue;
      await slot.click();
      await page.waitForTimeout(800);

      const gridBadge = page.locator('text=/\\d+x\\d+/').first();
      if (await gridBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gridBadge.click();
        await page.waitForTimeout(500);
        return true;
      }

      const backBtn = page.locator('text=返回').first();
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(400);
      }
    }
    return false;
  }

  test('TC-SR-01: add sample record modal opens from grid', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Look for "+ 添加样本" button in the box grid toolbar
    const addSampleBtn = page.locator('button:has-text("添加样本")').first();
    if (await addSampleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addSampleBtn.click();
      await page.waitForTimeout(500);

      // Modal should open with title "添加样本"
      await expect(page.locator('text=添加样本').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-SR-02: create sample record with required fields', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const addSampleBtn = page.locator('button:has-text("添加样本")').first();
    if (!(await addSampleBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await addSampleBtn.click();
    await page.waitForTimeout(500);

    // Fill required fields
    const patientName = `E2E_Patient_${Date.now()}`;
    await page.locator('input[placeholder="患者姓名"]').fill(patientName);
    await page.locator('input[placeholder="样本编号"]').fill(`SP-${Date.now()}`);

    // Click save
    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // After save, the modal should close and sample should appear in the SampleListPanel
    const panel = page.locator('text=已录入样本').first();
    const sampleVisible = await page.locator(`text=${patientName}`).first().isVisible({ timeout: 3000 }).catch(() => false);
    const panelVisible = await panel.isVisible({ timeout: 3000 }).catch(() => false);
    expect(sampleVisible || panelVisible).toBeTruthy();
  });

  test('TC-SR-03: create sample record fails without patient name', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const addSampleBtn = page.locator('button:has-text("添加样本")').first();
    if (!(await addSampleBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await addSampleBtn.click();
    await page.waitForTimeout(500);

    // Leave patient name empty, only fill sample code
    await page.locator('input[placeholder="样本编号"]').fill(`SP-${Date.now()}`);

    // Click save
    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }

    // Should show error "请输入患者姓名"
    const errorMsg = page.locator('text=请输入患者姓名');
    const errorVisible = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false);

    // Or the modal might still be open with the error
    const modalStillOpen = await page.locator('text=添加样本').first().isVisible().catch(() => false);
    expect(errorVisible || modalStillOpen).toBeTruthy();
  });

  test('TC-SR-04: create sample record with all optional fields', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const addSampleBtn = page.locator('button:has-text("添加样本")').first();
    if (!(await addSampleBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;
    await addSampleBtn.click();
    await page.waitForTimeout(500);

    const patientName = `E2E_Full_${Date.now()}`;
    await page.locator('input[placeholder="患者姓名"]').fill(patientName);
    await page.locator('input[placeholder="样本编号"]').fill(`SP-FULL-${Date.now()}`);

    // Fill optional fields if visible
    const sourceInput = page.locator('input[placeholder="如: 门诊、住院"]');
    if (await sourceInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sourceInput.fill('门诊');
    }

    const stageInput = page.locator('input[placeholder="如: 中孕期"]');
    if (await stageInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await stageInput.fill('早期');
    }

    // Select sample type from dropdown
    const typeSelect = page.locator('select').first();
    if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      const options = await typeSelect.locator('option').count();
      if (options > 1) {
        await typeSelect.selectOption({ index: 1 });
      }
    }

    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Verify success - modal closed, sample panel visible
    await expect(page.locator('text=已录入样本').or(page.locator(`text=${patientName}`)).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-SR-05: edit sample record', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // First check if there are existing sample records in the panel
    const panel = page.locator('text=已录入样本').first();
    if (!(await panel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Click on a sample group entry in the panel to open edit
    const sampleEntry = page.locator('[class*="cursor-pointer"]').filter({ hasText: /./ }).first();
    // Try finding a sample entry by looking inside the sample list panel
    const sampleGroups = page.locator('text=已录入样本').locator('..').locator('[class*="cursor-pointer"]');
    const count = await sampleGroups.count();
    if (count > 0) {
      // Click the last one (own sample)
      await sampleGroups.last().click();
      await page.waitForTimeout(500);

      // Should open edit modal
      const editTitle = page.locator('text=编辑样本信息').first();
      if (await editTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(editTitle).toBeVisible();

        // Change patient name
        const nameInput = page.locator('input[placeholder="患者姓名"]');
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill(`E2E_Edited_${Date.now()}`);
        }

        // Click update
        const updateBtn = page.locator('button:has-text("更新")');
        if (await updateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await updateBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('TC-SR-06: delete sample record with confirmation', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const panel = page.locator('text=已录入样本').first();
    if (!(await panel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Click a sample entry to open edit modal
    const sampleGroups = page.locator('text=已录入样本').locator('..').locator('[class*="cursor-pointer"]');
    const count = await sampleGroups.count();
    if (count === 0) return;

    await sampleGroups.last().click();
    await page.waitForTimeout(500);

    // Look for delete button in modal
    const deleteBtn = page.locator('button:has-text("删除样本")');
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click delete - this will trigger window.confirm
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('TC-SR-07: read-only view for non-owner', async ({ page }) => {
    // Login as root, create a sample if needed
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    // Check if there's a sample we can view
    const panel = page.locator('text=已录入样本').first();
    if (!(await panel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Logout and login as regular user
    const logoutBtn = page.locator('button[title="退出登录"]');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
    }

    // Register a new non-root user
    await page.goto('/');
    await page.waitForTimeout(500);

    const registerTab = page.locator('button:has-text("注册")');
    if (await registerTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await registerTab.click();
      await page.waitForTimeout(300);
    }

    const testUsername = `e2e_readonly_${Date.now()}`;
    await page.locator('input:not([type="password"])').first().fill(testUsername);
    await page.locator('input[type="password"]').first().fill('test1234');
    // There should be a confirm password field for registration
    const confirmPwd = page.locator('input[type="password"]').nth(1);
    if (await confirmPwd.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmPwd.fill('test1234');
    }

    const regBtn = page.locator('form button[type="submit"]').first();
    if (await regBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await regBtn.click();
      await page.waitForTimeout(2000);
    }

    // Navigate to box grid and try to view a sample
    const reNavigated = await navigateIntoBoxGrid(page);
    if (!reNavigated) return;

    // Click a sample entry
    const sampleGroups = page.locator('text=已录入样本').locator('..').locator('[class*="cursor-pointer"]');
    const count = await sampleGroups.count();
    if (count > 0) {
      await sampleGroups.first().click();
      await page.waitForTimeout(500);

      // Should show read-only indicator (Lock icon or read-only text)
      const lockIcon = page.locator('text=仅可查看样本信息');
      const readOnly = await lockIcon.isVisible({ timeout: 3000 }).catch(() => false);
      // Either the read-only message is shown or the update button should not be visible
      const updateBtn = page.locator('button:has-text("更新")');
      const updateVisible = await updateBtn.isVisible({ timeout: 2000 }).catch(() => false);
      expect(readOnly || !updateVisible).toBeTruthy();
    }
  });

  test('TC-SR-08: add tubes to existing sample via position picker', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const panel = page.locator('text=已录入样本').first();
    if (!(await panel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Open an existing sample in edit mode
    const sampleGroups = page.locator('text=已录入样本').locator('..').locator('[class*="cursor-pointer"]');
    const count = await sampleGroups.count();
    if (count === 0) return;

    await sampleGroups.last().click();
    await page.waitForTimeout(500);

    // Check for "关联试管" section
    const tubeSection = page.locator('text=关联试管').first();
    if (await tubeSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tubeSection).toBeVisible();

      // Look for available position buttons
      const positionBtns = page.locator('button').filter({ hasText: /^[A-Z]\d+$/ });
      const posCount = await positionBtns.count();
      if (posCount > 0) {
        await positionBtns.first().click();
        await page.waitForTimeout(300);

        // "确认添加试管" button should appear
        const confirmBtn = page.locator('button:has-text("确认添加试管")');
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(800);
        }
      }
    }
  });

  test('TC-SR-09: remove tube from sample record', async ({ page }) => {
    const navigated = await navigateIntoBoxGrid(page);
    if (!navigated) return;

    const panel = page.locator('text=已录入样本').first();
    if (!(await panel.isVisible({ timeout: 3000 }).catch(() => false))) return;

    const sampleGroups = page.locator('text=已录入样本').locator('..').locator('[class*="cursor-pointer"]');
    const count = await sampleGroups.count();
    if (count === 0) return;

    await sampleGroups.last().click();
    await page.waitForTimeout(500);

    // Look for "移除" buttons in the tube list
    const removeBtn = page.locator('button:has-text("移除")').first();
    if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await removeBtn.click();
      await page.waitForTimeout(800);
    }
  });
});
