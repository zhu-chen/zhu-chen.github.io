import { expect, test, type Page } from '@playwright/test';

async function run(page: Page, command: string) {
  const input = page.getByRole('textbox', { name: '命令', exact: true });
  await input.fill(command);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

const output = (page: Page) => page.locator('.xterm-accessibility-tree');

test('commands browse shared content and recover from errors', async ({
  page,
}) => {
  await page.goto('/');
  await run(page, 'ls');
  await expect(output(page)).toContainText('about/');
  await run(page, 'cd about');
  await expect(page.locator('[data-terminal-path]')).toHaveText('~/about');
  await run(page, 'cat README.txt');
  await expect(output(page)).toContainText('个人介绍正在整理中');
  await run(page, 'cd missing');
  await expect(output(page)).toContainText('找不到路径：missing');
  await expect(page.locator('[data-terminal-path]')).toHaveText('~/about');
  await run(page, 'cd ..');
  await run(page, 'pwd');
  await expect(output(page)).toContainText('~ $ pwd');
  await run(page, 'whoami');
  await expect(output(page)).toContainText('zhu-chen');
  await run(page, 'help cat');
  await expect(output(page)).toContainText('cat <文件>');
});

test('history navigation restores drafts and clear keeps the current directory', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '命令', exact: true });
  await run(page, 'cd projects');
  await run(page, 'pwd');
  await input.fill('cat draft');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('pwd');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('cd projects');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('cat draft');
  await run(page, 'clear');
  await expect(output(page)).not.toContainText('cd projects');
  await expect(page.locator('[data-terminal-path]')).toHaveText('~/projects');
  await run(page, 'history');
  await expect(output(page)).toContainText('1  cd projects');
  await expect(output(page)).toContainText('3  clear');
  await page.reload();
  await run(page, 'history');
  await expect(output(page)).toContainText('1  history');
  await expect(output(page)).not.toContainText('cd projects');
  await expect(page.locator('[data-terminal-path]')).toHaveText('~');
});

test('native input preserves IME composition and Tab navigation', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '命令', exact: true });
  await run(page, 'pwd');
  await input.fill('帮助');
  await input.dispatchEvent('compositionstart');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('帮助');
  await page.getByRole('button', { name: '执行', exact: true }).click();
  await expect(input).toHaveValue('帮助');
  await expect(output(page)).not.toContainText('未知命令：帮助');
  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(output(page)).toContainText('未知命令：帮助');
  await input.press('Tab');
  await expect(
    page.getByRole('button', { name: '执行', exact: true }),
  ).toBeFocused();
  await input.fill('cat README.txt');
  await input.press('Home');
  await input.press('Delete');
  await expect(input).toHaveValue('at README.txt');
});

test('quick commands work without typing and ordinary links remain usable', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ls', exact: true }).click();
  await expect(output(page)).toContainText('projects/');
  await expect(output(page)).not.toContainText('publications/');
  await run(page, 'cat ~/projects/README.txt');
  await expect(output(page)).toContainText('项目与论文内容正在整理中。');
  await page.getByRole('button', { name: 'help', exact: true }).click();
  await expect(output(page)).toContainText('直接浏览内容');
  await page.getByRole('button', { name: '清屏', exact: true }).click();
  await expect(output(page)).not.toContainText('直接浏览内容');
  await run(page, 'cd contact');
  await page.getByRole('button', { name: '回到根目录', exact: true }).click();
  await expect(page.locator('[data-terminal-path]')).toHaveText('~');
  await page
    .getByRole('navigation', { name: '主页内容' })
    .getByRole('link', { name: '项目与论文', exact: true })
    .click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(
    page.getByRole('heading', { name: '项目与论文', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'GitHub', exact: true }),
  ).toHaveAttribute('href', 'https://github.com/zhu-chen');
});

test('the live prompt follows output, resets on clear and fits after reflow', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '命令', exact: true });
  const prompt = page.locator('.command-line');
  const surface = page.locator('[data-terminal-surface]');
  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  const initialHeight = (await surface.boundingBox())!.height;

  await run(page, 'pwd');
  await expect
    .poll(async () => (await surface.boundingBox())!.height)
    .toBeGreaterThan(initialHeight);
  await expect(input).toBeFocused();

  await run(page, 'clear');
  await expect
    .poll(async () => {
      const line = (await prompt.boundingBox())!;
      const viewport = (await surface.boundingBox())!;
      return (
        Math.abs(line.y - viewport.y) < 1 &&
        Math.abs(line.height - viewport.height) < 1
      );
    })
    .toBe(true);

  await run(page, 'cd projects');
  await input.fill('x'.repeat(256));
  await input.press('Enter');
  await expect(input).toHaveValue('');
  for (const width of [320, 1024, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await expect
      .poll(async () => {
        const line = (await prompt.boundingBox())!;
        const viewport = (await surface.boundingBox())!;
        return (
          line.x >= viewport.x &&
          line.x + line.width <= viewport.x + viewport.width + 1 &&
          line.y >= viewport.y &&
          Math.abs(line.y + line.height - viewport.y - viewport.height) < 1
        );
      })
      .toBe(true);
    await input.fill('pwd');
    await input.press('Enter');
    await expect(input).toHaveValue('');
    await expect(output(page)).toContainText('/projects');
  }
});

test('scrollback stays readable without the live prompt covering old output', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '命令', exact: true });
  await run(page, 'help');
  await run(page, 'help');
  await expect(output(page)).toContainText('直接浏览内容');
  await page.locator('[data-terminal-surface]').hover();
  await page.mouse.wheel(0, -400);
  await expect(input).toBeHidden();
  await page.mouse.wheel(0, 10000);
  await expect(input).toBeVisible();
  await run(page, 'clear');
  await expect(output(page)).not.toContainText('直接浏览内容');
  await expect(input).toBeVisible();
});
