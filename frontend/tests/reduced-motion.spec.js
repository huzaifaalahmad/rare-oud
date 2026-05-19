import { test, expect } from '@playwright/test';

test('hero respects reduced motion mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const backdrop = page.locator('.hero-backdrop').first();
  await expect(backdrop).toHaveAttribute('data-render-mode', /static|paused/);
});
