import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const courses = [
  ['03', 'task-job-process-outcome', 'job-task-breakdown', 'which-layer-changed'],
  ['04', 'which-layer-ai-changes', 'three-change-sheet', 'task-process-or-relationship'],
  ['05', 'delegation-review-escalation', 'agent-handoff-sheet', 'who-owns-agent-output'],
  ['06', 'who-really-decides', 'decision-scenario-sheet', 'who-can-challenge-the-default'],
  ['07', 'redesign-team-boundaries', 'team-design-comparison', 'which-boundary-should-move'],
  ['08', 'talent-learning-evaluation', 'talent-research-agenda', 'what-counts-as-learning'],
];
for (const [no, article, tool, question] of courses) {
  test(`WP7 ${no}: published article, keyboard diagram and responsive accessibility`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/library/${article}/`);
    await expect(page.locator('.status')).toContainText('已核对发布');
    await expect(page.locator('.sources .todo')).toHaveCount(0);
    expect(await page.locator('.terms .term-card').count()).toBeGreaterThanOrEqual(3);
    const diagram = page.locator('#diagram');
    const buttons = diagram.getByRole('button');
    expect(await buttons.count()).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < await buttons.count(); i++) {
      await buttons.nth(i).focus();
      await expect(buttons.nth(i)).toBeFocused();
      await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      await expect(buttons.nth(i)).toHaveAttribute('aria-pressed', 'true');
      await expect(diagram.locator('[aria-live] p:visible')).toHaveCount(1);
      await expect(buttons.nth(i)).toBeInViewport();
    }
    await page.keyboard.press('Enter');
    await expect(diagram.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect.poll(() => diagram.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    expect(await diagram.locator('[aria-live] p:visible').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        innerWidth, clientWidth: document.documentElement.clientWidth,
        overflow: [...document.querySelectorAll<HTMLElement>('body *')].map(el => ({
          tag: el.tagName, cls: el.className, text: el.textContent?.slice(0, 60),
          left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right,
          minWidth: getComputedStyle(el).minWidth,
        })).filter(el => el.right > innerWidth + 1 || el.left < -1),
      }));
      await expect.poll(
        () => page.evaluate(() => document.documentElement.scrollWidth),
        { message: JSON.stringify(layout) },
      ).toBe(width);
    }
    await expect(page.locator(`a[href="/tools/${tool}"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/questions/${question}"]`).first()).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')), JSON.stringify(result.violations)).toEqual([]);
  });
  test(`WP7 ${no}: worksheet saves, exports and prints all sections`, async ({ page }) => {
    // Capture API payloads; native clipboard permissions and OS print dialogs are manual checks.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as any).__markdown = text; } } });
      window.print = () => { (window as any).__printed = true; };
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/tools/${tool}/`);
    expect(await page.locator('fieldset').count()).toBeGreaterThanOrEqual(3);
    const fields = page.getByRole('textbox');
    for (let i = 0; i < await fields.count(); i++) await fields.nth(i).fill(`WP7 示意答案 ${no}-${i}`);
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await expect(page.locator('[data-saved]')).toHaveText('已保存到本机');
    await page.reload();
    for (let i = 0; i < await fields.count(); i++) await expect(fields.nth(i)).toHaveValue(`WP7 示意答案 ${no}-${i}`);
    await page.getByRole('button', { name: '复制为 Markdown' }).click();
    const markdown = await page.evaluate(() => (window as any).__markdown as string);
    for (let i = 0; i < await fields.count(); i++) expect(markdown).toContain(`WP7 示意答案 ${no}-${i}`);
    expect(markdown.match(/^## /gm)?.length).toBe(await page.locator('fieldset').count());
    await page.getByRole('button', { name: '打印', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__printed)).toBe(true);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-title')).toBeVisible();
    await expect(page.locator('.sheet-bar')).toBeHidden();
    for (const field of await fields.all()) await expect(field).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        innerWidth, clientWidth: document.documentElement.clientWidth,
        overflow: [...document.querySelectorAll<HTMLElement>('body *')].map(el => ({
          tag: el.tagName, cls: el.className, text: el.textContent?.slice(0, 60),
          left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right,
          minWidth: getComputedStyle(el).minWidth,
        })).filter(el => el.right > innerWidth + 1 || el.left < -1),
      }));
      await expect.poll(
        () => page.evaluate(() => document.documentElement.scrollWidth),
        { message: JSON.stringify(layout) },
      ).toBe(width);
    }
    await expect(page.locator(`a[href="/library/${article}"]`)).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')), JSON.stringify(result.violations)).toEqual([]);
  });
  test(`WP7 ${no}: open discussion retains input when API is unavailable`, async ({ page }) => {
    await page.route('**/api/v1/**', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/questions/${question}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: '提交审核' })).toBeVisible();
    const body = page.locator('#c-body');
    const observation = '这是用于验收的观察内容，仅在测试浏览器中模拟服务不可用，不会写入服务器。';
    await body.fill(observation);
    await page.locator('input[name="consent"]').check();
    await page.getByRole('button', { name: '提交审核' }).click();
    await expect(page.locator('[data-error]')).not.toBeEmpty();
    await expect(body).toHaveValue(observation);
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        innerWidth, clientWidth: document.documentElement.clientWidth,
        overflow: [...document.querySelectorAll<HTMLElement>('body *')].map(el => ({
          tag: el.tagName, cls: el.className, text: el.textContent?.slice(0, 60),
          left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right,
          minWidth: getComputedStyle(el).minWidth,
        })).filter(el => el.right > innerWidth + 1 || el.left < -1),
      }));
      await expect.poll(
        () => page.evaluate(() => document.documentElement.scrollWidth),
        { message: JSON.stringify(layout) },
      ).toBe(width);
    }
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')), JSON.stringify(result.violations)).toEqual([]);
  });
}
