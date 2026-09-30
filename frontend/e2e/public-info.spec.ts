import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/about/', '/license/']) {
  test(`public information is usable and accessible on ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    if (path === '/about/') {
      await expect(page.getByRole('heading', { name: '阿兰 · Arlan' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'luvio8888@gmail.com' }).first()).toHaveAttribute('href', 'mailto:luvio8888@gmail.com');
      await expect(page.locator('main')).toContainText('吉林大学');
      await expect(page.locator('main')).toContainText('阿里云');
      await expect(page.locator('main')).not.toContainText('三七互娱');
      expect(await page.locator('main').innerText()).not.toMatch(/\b1[3-9]\d{9}\b/);
    } else {
      await expect(page.getByRole('heading', { name: '内容许可与署名', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '完整法律文本' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/legalcode.zh-hans');
      await expect(page.locator('main')).toContainText('读者投稿');
    }
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await expect(page.locator('footer').getByRole('link', { name: '许可与署名' })).toHaveAttribute('href', '/license');
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  });
}
