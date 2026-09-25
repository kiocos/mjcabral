(() => {
  const root = document.documentElement;
  const storageKey = 'cabral-theme';
  let button;

  function apply(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#201e1b' : '#f5eedf');
    if (button) {
      const label = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }

  // Apply a saved preference before the styles and reading page are painted.
  let saved = 'light';
  try { saved = localStorage.getItem(storageKey) || saved; } catch {}
  apply(saved);

  document.addEventListener('DOMContentLoaded', () => {
    button = document.querySelector('.theme-toggle');
    if (!button) return;
    apply(root.dataset.theme);
    button.hidden = false;
    button.addEventListener('click', () => {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(theme);
      try { localStorage.setItem(storageKey, theme); } catch {}
    });
  }, { once: true });

  window.addEventListener('storage', event => {
    if (event.key === storageKey) apply(event.newValue);
  });
})();
