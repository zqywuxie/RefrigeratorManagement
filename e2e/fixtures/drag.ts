import { Page, Locator } from '@playwright/test';

/**
 * Simulate HTML5 drag-and-drop using mouse events.
 * Playwright's built-in dragAndDrop does not work reliably with react-dnd's HTML5 backend.
 * We use manual mouse move/down/up sequence with small steps to trigger drag events.
 */
export async function dragElement(
  page: Page,
  source: Locator,
  target: Locator,
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Drag source or target element not found / not visible');
  }

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  // Move to source center, then drag to target center with intermediate steps
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Move in small steps to trigger HTML5 drag events (dragstart, dragover, drop)
  await page.mouse.move(tx, ty, { steps: 10 });
  await page.waitForTimeout(100); // let react-dnd process the drop
  await page.mouse.up();
  await page.waitForTimeout(300); // let API update complete
}

/**
 * Wait for all network requests to settle after a drag operation.
 */
export async function waitForDragSettle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
