import { test, expect } from '@playwright/test';

test('home page renders Rare Oud', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
