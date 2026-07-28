import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://liberatingscripture.org',
  trailingSlash: 'always',
  compressHTML: true,
  vite: {
    build: {
      // Astro 7 / Vite 8 minify CSS with Lightning CSS, which by default emits
      // Media Queries Level 4 range syntax (`@media (width<=640px)`). Browsers
      // older than Safari 16.4 / Chrome 104 / Firefox 102 ignore those rules
      // outright — every breakpoint on the site would drop and phones would get
      // the desktop layout. Pinning the target keeps the legacy
      // `(max-width: …)` form. Astro 6's minifier emitted it unconditionally.
      cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
    },
  },
  integrations: [
    sitemap({
      // noindex utility pages: the contact form's no-JS success redirect, and
      // the newsletter unsubscribe form (reached from email footers, not search)
      filter: (page) =>
        !page.includes('/contact/thanks/') && !page.includes('/unsubscribe/'),
    }),
  ],
});
