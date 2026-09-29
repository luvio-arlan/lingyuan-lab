import { expect, test, type Page } from '@playwright/test';

const pages = [
  ['/', '灵鸢实验室'],
  ['/learn/', '学习路径'],
  ['/library/', '知识库'],
  ['/tools/', '工具箱'],
  ['/questions/', '研究讨论'],
  ['/about/', '关于'],
];

async function mockContributions(page: Page, postStatus: number) {
  await page.route('**/api/v1/topics/what-changes-first/contributions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: postStatus,
        contentType: 'application/json',
        body: JSON.stringify(
          postStatus === 201 ? { id: 'wp6', status: 'pending' } : { detail: 'unavailable' },
        ),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    });
  });
}

test('homepage loads and the five primary pages are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('从组织发展出发');
  for (const [href, name] of pages.slice(1)) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(name));
  }
});

test('an article source marker jumps to the source note', async ({ page }) => {
  await page.goto('/library/how-organizations-work/');
  await page.getByRole('link', { name: '来源 1' }).first().click();
  await expect(page.locator('#source-1')).toBeInViewport();
});

test('a tool answer remains after refresh', async ({ page }) => {
  await page.goto('/tools/organization-observation-sheet/');
  const field = page.getByRole('textbox', { name: '用一句话描述这个组织（或团队）当前最重要的目标。' });
  await field.fill('WP6 示意：这个团队当前最重要的目标是按时交齐材料。');
  await expect(page.locator('[data-done]')).toHaveText('1');
  await expect(page.locator('[data-saved]')).toHaveText('已保存到本机');
  await page.reload();
  await expect(field).toHaveValue('WP6 示意：这个团队当前最重要的目标是按时交齐材料。');
});

test('a mocked discussion accepts a contribution and reports a failure', async ({ page }) => {
  await mockContributions(page, 201);
  await page.goto('/questions/what-changes-first/');
  await page.getByRole('textbox', { name: '内容' }).fill('WP6 示意：最先需要重新理解的是复核放在流程的哪一步。');
  await page.getByRole('checkbox', { name: '我已去除可识别信息，并同意投稿在审核后公开展示。' }).check();
  await page.getByRole('button', { name: '提交审核' }).click();
  await expect(page.getByRole('heading', { name: '已收到，谢谢你。' })).toBeVisible();

  await mockContributions(page, 503);
  await page.goto('/questions/what-changes-first/');
  await page.getByRole('textbox', { name: '内容' }).fill('WP6 示意：这条投稿用来确认失败时内容仍留在输入框里。');
  await page.getByRole('checkbox', { name: '我已去除可识别信息，并同意投稿在审核后公开展示。' }).check();
  await page.getByRole('button', { name: '提交审核' }).click();
  await expect(page.getByText('讨论服务暂时出错，你的内容仍保留在输入框中，请稍后再试。')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '内容' })).toHaveValue(
    'WP6 示意：这条投稿用来确认失败时内容仍留在输入框里。',
  );
});

test('the mobile menu opens and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: '打开菜单' });
  await toggle.click();
  await expect(page.getByRole('button', { name: '关闭菜单' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开菜单' })).toHaveAttribute('aria-expanded', 'false');
});
