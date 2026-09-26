import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://zhu-chen.github.io',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    preview: { strictPort: true },
  },
});
