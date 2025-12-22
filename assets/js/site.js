function setupMenuToggle() {
  const nav = document.getElementById('primaryNav');
  const button = document.querySelector('.menu-toggle');
  if (!nav || !button) return;

  // Click toggle
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

    // If click is inside nav or on the button, ignore
    if (nav.contains(target) || button.contains(target)) return;

    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  });
}
