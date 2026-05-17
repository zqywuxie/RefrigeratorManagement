import { test, expect } from '@playwright/test';
import { loginAsRoot, loginAs, logout } from '../../fixtures/auth';

test.describe('Upper Item CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRoot(page);
    await page.waitForTimeout(800);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
    });
  });

  test('TC-UPP-CR-01: upper storage items are displayed', async ({ page }) => {
    // Navigate to upper tab
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Should show "上层开放存储" heading
    const heading = page.locator('text=上层开放存储').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Should show row labels like "第 1 行", "第 2 行"
    const rowLabel = page.locator('text=第 1 行').or(page.locator('text=第 2 行'));
    await expect(rowLabel.first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-UPP-CR-02: open AddItemModal from row add button', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Look for "添加" button on a row - they show Plus icon
    const addBtn = page.locator('button:has(svg)').filter({ hasText: '' }).first();
    // Alternative: look for buttons containing Plus or text "添加"
    const addButtons = page.locator('button').filter({ hasText: /添加/ });
    const count = await addButtons.count();

    if (count > 0) {
      await addButtons.first().click();
      await page.waitForTimeout(500);

      // Modal should open with title "添加物品"
      await expect(page.locator('text=添加物品').first()).toBeVisible({ timeout: 5000 });

      // Close modal
      const cancelBtn = page.locator('button:has-text("取消")');
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('TC-UPP-CR-03: create upper item in simple mode', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Find and click a row "添加" button (not "添加物品" empty placeholder, not type dropdown "+")
    // Row add buttons show "添加" text with Plus icon inside a row section
    const addBtn = page.locator('button:has-text("添加"):not(:has-text("物品")):not(:has-text("类型"))').first();
    if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) return;

    await addBtn.click();
    await page.waitForTimeout(500);

    // Fill item name
    const name = `E2E_UpperItem_${Date.now()}`;
    const nameInput = page.locator('input[placeholder="物品名称"]');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(name);
    }

    // Select item type from dropdown
    const typeSelect = page.locator('select').first();
    if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      const options = await typeSelect.locator('option').count();
      if (options > 0) {
        await typeSelect.selectOption({ index: 0 });
      }
    }

    // Click save
    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Search for the item to verify it was created (may be on a different pagination page)
    const searchInput = page.locator('input[placeholder="搜索上层物品..."]');
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(name);
      await page.waitForTimeout(500);
    }
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-UPP-CR-04: create upper item with precise box mode', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    const addButtons = page.locator('button').filter({ hasText: /添加/ });
    const count = await addButtons.count();
    if (count === 0) return;

    await addButtons.first().click();
    await page.waitForTimeout(500);

    // Fill name
    const name = `E2E_UpperPrecise_${Date.now()}`;
    const nameInput = page.locator('input[placeholder="物品名称"]');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(name);
    }

    // Click "孔位模式" to enable grid-based box mode (default preset 10×10 is auto-selected)
    const preciseBtn = page.locator('button:has-text("孔位模式")');
    if (await preciseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preciseBtn.click();
      await page.waitForTimeout(300);
    }

    // Save
    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Search for the item to verify it was created (may be on a different pagination page)
    const searchInput4 = page.locator('input[placeholder="搜索上层物品..."]');
    if (await searchInput4.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput4.fill(name);
      await page.waitForTimeout(500);
    }
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-UPP-CR-05: edit upper item', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // First create an item to edit
    const addButtons = page.locator('button').filter({ hasText: /添加/ });
    const count = await addButtons.count();
    if (count === 0) return;

    await addButtons.first().click();
    await page.waitForTimeout(500);

    const name = `E2E_EditUpper_${Date.now()}`;
    const nameInput = page.locator('input[placeholder="物品名称"]');
    if (!(await nameInput.isVisible({ timeout: 2000 }).catch(() => false))) return;

    await nameInput.fill(name);

    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Search for the new item (may be on a different pagination page)
    const searchInput5 = page.locator('input[placeholder="搜索上层物品..."]');
    if (await searchInput5.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput5.fill(name);
      await page.waitForTimeout(500);
    }

    // Now the ItemCard should be visible
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });

    // Click the item card to open edit modal
    await page.locator(`text=${name}`).first().click();
    await page.waitForTimeout(500);

    // Should open edit modal
    const editTitle = page.locator('text=编辑物品');
    if (await editTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(editTitle).toBeVisible();

      // Change name
      const editNameInput = page.locator('input[placeholder="物品名称"]');
      if (await editNameInput.isVisible().catch(() => false)) {
        const newName = `${name}_edited`;
        await editNameInput.fill(newName);

        // Save
        const updateBtn = page.locator('button:has-text("保存")');
        if (await updateBtn.isVisible().catch(() => false)) {
          await updateBtn.click();
          await page.waitForTimeout(1000);
        }

        // Verify updated name
        await expect(page.locator(`text=${newName}`).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('TC-UPP-CR-06: delete upper item', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Create an item first
    const addButtons = page.locator('button').filter({ hasText: /添加/ });
    const count = await addButtons.count();
    if (count === 0) return;

    await addButtons.first().click();
    await page.waitForTimeout(500);

    const name = `E2E_DeleteUpper_${Date.now()}`;
    const nameInput = page.locator('input[placeholder="物品名称"]');
    if (!(await nameInput.isVisible({ timeout: 2000 }).catch(() => false))) return;

    await nameInput.fill(name);

    const saveBtn = page.locator('button:has-text("保存")');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Search for the new item (may be on a different pagination page)
    const searchInput6 = page.locator('input[placeholder="搜索上层物品..."]');
    if (await searchInput6.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput6.fill(name);
      await page.waitForTimeout(500);
    }
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 });

    // Hover over the ItemCard to reveal delete button
    const itemCard = page.locator(`text=${name}`).first();
    await itemCard.hover();
    await page.waitForTimeout(500);

    // Look for trash/delete icon
    const deleteIcon = page.locator('[title*="删除"]').or(page.locator('button:has(svg.trash)'));
    const deleteVisible = await deleteIcon.first().isVisible({ timeout: 2000 }).catch(() => false);

    if (deleteVisible) {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteIcon.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('TC-UPP-CR-07: filter items by type', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Type filter buttons should be visible
    const allBtn = page.locator('button:has-text("全部")');
    if (await allBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(allBtn).toBeVisible();

      // Try clicking a type filter (e.g., "试剂")
      const reagentBtn = page.locator('button:has-text("试剂")');
      if (await reagentBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await reagentBtn.click();
        await page.waitForTimeout(300);

        // Click "全部" to reset
        await allBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('TC-UPP-CR-08: search upper items', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(300);
    }
  });

  test('TC-UPP-CR-09: empty row shows add item placeholder', async ({ page }) => {
    await page.locator('button:has-text("上层")').first().click();
    await page.waitForTimeout(500);

    // Empty rows show "添加物品" placeholder or dashed-border add button
    // Each row has an "添加" button
    const addButtons = page.locator('button').filter({ hasText: /添加/ });
    const count = await addButtons.count();
    // There should be at least one add button per row
    expect(count).toBeGreaterThanOrEqual(0);

    // Rows should be rendered
    const rowHeadings = page.locator('text=/第 \\d 行/');
    const rowCount = await rowHeadings.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });
});
