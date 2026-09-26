import { expect, test } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('static content remains available', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'zhu-chen' })).toBeVisible();
    await expect(page.getByText('欢迎来到我的主页。')).toBeVisible();
    await expect(page.locator('[data-terminal-screen]')).toBeHidden();
  });
});

test('terminal renders, fits the viewport and raises no runtime errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('.xterm')).toBeVisible();
  await expect(page.locator('[data-terminal-fallback]')).toBeHidden();
  await expect(page.locator('.xterm-accessibility-tree')).toContainText(
    'Welcome to my homepage.',
  );
  await page.screenshot({ path: testInfo.outputPath('homepage.png') });

  for (const width of [390, 360, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.locator('.xterm-screen').evaluate((screen) => {
          const host = screen.closest('[data-terminal-screen]');
          return Boolean(
            host &&
            screen.getBoundingClientRect().right <=
              host.getBoundingClientRect().right + 1,
          );
        }),
      )
      .toBe(true);
  }

  expect(errors).toEqual([]);
});
