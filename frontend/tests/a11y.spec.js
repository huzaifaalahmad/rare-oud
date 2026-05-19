import { test, expect } from '@playwright/test';

test('homepage exposes main landmark and keyboard skip link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});
