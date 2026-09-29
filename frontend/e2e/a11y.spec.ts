import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const paths = [
  '/',
  '/learn/',
  '/library/',
  '/library/how-organizations-work/',
  '/tools/',
  '/tools/organization-observation-sheet/',
  '/questions/',
  '/questions/what-changes-first/',
  '/about/',
];

for (const path of paths) {
  test(`axe has no serious or critical issues on ${path}`, async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
    const results = await new AxeBuilder({ page }).analyze();
    const blocked = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(blocked, JSON.stringify(blocked, null, 2)).toEqual([]);
  });
}
