import { test, expect } from '@playwright/test';
for (const route of ['/', '/products', '/custom-order']) test(`visual baseline ${route}`, async ({ page }) => { await page.goto(route); await expect(page).toHaveScreenshot({ fullPage:true, animations:'disabled' }); });
