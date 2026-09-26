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
  await page.getByRole('button', { name: 'help', exact: true }).click();
  await expect(output(page)).toContainText('直接浏览内容');
  await page.getByRole('button', { name: '清屏', exact: true }).click();
  await expect(output(page)).not.toContainText('直接浏览内容');
  await run(page, 'cd contact');
  await page.getByRole('button', { name: '回到根目录', exact: true }).click();
  await expect(page.locator('[data-terminal-path]')).toHaveText('~');
  await page
    .getByRole('navigation', { name: '主页内容' })
    .getByRole('link', { name: '项目', exact: true })
    .click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(
    page.getByRole('heading', { name: '项目', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'GitHub', exact: true }),
  ).toHaveAttribute('href', 'https://github.com/zhu-chen');
});
