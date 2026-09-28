import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
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
