(function () {
  // ---- Utilities ----
  function normalizePath(path) {
    const stripped = (path || '').replace(/\/+$/, '');
    return stripped === '' ? '/' : stripped;
  }

  // ---- Header behaviors ----
  function setAriaCurrent() {
    const nav = document.getElementById('primaryNav');
    if (!nav) return;

    const currentPath = normalizePath(window.location.pathname);
    const links = nav.querySelectorAll('a');

    links.forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;

      // Ignore hash-only or mailto/tel
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        a.removeAttribute('aria-current');
        return;
      }

      let url;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        a.removeAttribute('aria-current');
        return;
      }

      // Ignore external links
      if (url.origin !== window.location.origin) {
        a.removeAttribute('aria-current');
        return;
      }

      const linkPath = normalizePath(url.pathname);

      if (linkPath === currentPath) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  function setupMenuToggle() {
    const nav = document.getElementById('primaryNav');
    const button = document.querySelector('.menu-toggle');
    if (!nav || !button) return;

    // Toggle on button click
    button.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });

    // Close after clicking a link (mobile sanity)
    nav.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      if (target.closest('a')) {
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape (keyboard sanity)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    // Close when clicking outside nav + toggle (expected behavior)
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;

      const target = e.target;
      if (!(target instanceof Element)) return;

      // Ignore clicks inside nav or on the toggle button
      if (nav.contains(target) || button.contains(target)) return;

      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  // ---- Footer behaviors ----
  function setFooterYear() {
    const y = document.getElementById('footerYear');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  // ---- Partials loader ----
  async function loadPartial(url, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    mount.innerHTML = await res.text();
  }

  async function initSiteChrome() {
    // Header
    try {
      await loadPartial('/partials/header.html', 'siteHeader');
      setAriaCurrent();
      setupMenuToggle();
    } catch (err) {
      console.error('Header failed to load:', err);
    }

    // Footer
    try {
      await loadPartial('/partials/footer.html', 'siteFooter');
      setFooterYear();
    } catch (err) {
      console.error('Footer failed to load:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', initSiteChrome);
})();
