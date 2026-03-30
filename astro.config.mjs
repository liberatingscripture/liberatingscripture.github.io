import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://liberatingscripture.org',
  trailingSlash: 'always',
  compressHTML: true,
  integrations: [
    sitemap(),
  ],
});
