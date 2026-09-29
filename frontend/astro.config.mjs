import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ly.echoxai.net',
  integrations: [mdx(), sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: process.env.LINGYUAN_API ?? 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  },
});
