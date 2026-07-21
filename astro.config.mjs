import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://liberatingscripture.org',
  trailingSlash: 'always',
  compressHTML: true,
  integrations: [
    sitemap({
      // noindex utility pages: the contact form's no-JS success redirect, and
      // the newsletter unsubscribe form (reached from email footers, not search)
      filter: (page) =>
        !page.includes('/contact/thanks/') && !page.includes('/unsubscribe/'),
    }),
  ],
});
