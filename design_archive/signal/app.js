// Frozen reference interactions. Do not edit without explicit user direction.
function initializeInteractions() {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); };
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  menu.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  nav.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menu.focus(); } });
  const tension = document.querySelector('#tension');
  const studio = document.querySelector('.studio-demo');
  const output = document.querySelector('#tension-value');
  const updateTension = () => {
    const value = Number(tension.value);
    output.value = `${value}%`;
    studio.style.setProperty('--tension', String(value / 100));
    document.querySelector('.gain-output').textContent = `${Math.round(-24 + value * .22)} dB`;
    document.querySelector('[data-impact="character"]').textContent = value > 65 ? 'Distrustful' : value > 30 ? 'Guarded' : 'At ease';
    document.querySelector('[data-impact="lighting"]').textContent = value > 65 ? 'Hard contrast' : value > 30 ? 'Soft ambient' : 'Warm daylight';
    document.querySelector('[data-impact="sound"]').textContent = value > 65 ? 'Rising tension' : 'Low tension';
  };
  tension.addEventListener('input', updateTension);
  document.querySelector('.story-change').addEventListener('click', () => { tension.value = '82'; updateTension(); document.querySelector('.preview-status').textContent = 'Story change previewed · 3 connected elements affected'; });
  document.querySelector('.reset-demo').addEventListener('click', () => { tension.value = '35'; updateTension(); document.querySelector('.preview-status').textContent = 'Preview reset · no project changes saved'; });
  updateTension();
}

initializeInteractions();
