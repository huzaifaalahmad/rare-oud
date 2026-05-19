import { test, expect } from '@playwright/test';
test('public launch smoke flow supports routing and reduced motion', async ({ page }) => { await page.emulateMedia({ reducedMotion:'reduce' }); await page.goto('/'); await expect(page.locator('main')).toBeVisible(); await page.goto('/products'); await expect(page.locator('main')).toBeVisible(); });
