import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://liberatingscripture.org',
  trailingSlash: 'always',
  compressHTML: true,
  integrations: [
    sitemap({
      // noindex utility page (the contact form's no-JS success redirect)
      filter: (page) => !page.includes('/contact/thanks/'),
    }),
  ],
});
