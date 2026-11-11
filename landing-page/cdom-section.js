// Afterlight v2 only. The diagram illustrates relationships, not a running CDOM engine.
const pauseIcon = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 4v10M12 4v10"/></svg>';
const playIcon = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 4 8 5-8 5Z"/></svg>';

export function creativeDocument(svg) {
  const diagram = svg
    .replace('class="semantic-graph"', 'class="cdom-graph"')
    .replace('viewBox="0 0 640 570"', 'viewBox="0 68 660 502"')
    .replace('<text x="485" y="296">STAGE</text>', '<text class="cdom-stage-label" x="558" y="320">STAGE</text>')
    .replace('M483 302h-20', 'M510 290l40 40h72')
    .replace('<text x="264" y="546">ONE .CDOM</text>', '<text x="320" y="546" text-anchor="middle">ONE .CDOM</text>')
    .replaceAll('graph-title', 'cdom-graph-title')
    .replaceAll('graph-desc', 'cdom-graph-desc')
    .replace('</svg>', '<g class="cdom-flow" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M320 202v76"/><path d="M320 302v76"/></g></svg>');
  return `<section class="cdom-section section" id="creative-document" aria-labelledby="cdom-heading"><div class="cdom-copy"><h2 id="cdom-heading">One document.<br><span>A whole world.</span></h2><p>The idea behind <code>.cdom</code> is simple: give the story, the scene, and the sound a shared structure. Every part has its place. Every connection carries meaning.</p><dl class="cdom-legend"><div><dt>Narrative</dt><dd>The characters, their history, and what happens next.</dd></div><div><dt>Stage</dt><dd>The layers, light, and composition that bring it into view.</dd></div><div><dt>Audio</dt><dd>The cues and atmosphere that make the moment felt.</dd></div></dl><p class="cdom-principle">Connected by structure.<br>Directed by you.</p></div><figure class="cdom-figure" data-cdom-motion="paused"><div class="cdom-drawing">${diagram}</div><figcaption><span>One shared creative document</span><code>.cdom</code></figcaption><div class="cdom-motion-controls"><span>Illustrative document model</span><button class="cdom-motion-toggle" type="button" aria-pressed="false" aria-label="Pause diagram motion">${pauseIcon}<span>Pause motion</span></button></div></figure></section>`;
}

export function mountCdomMotion(root) {
  const figure = root.querySelector('[data-cdom-motion]');
  if (!figure) return () => {};
  const button = figure.querySelector('.cdom-motion-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  let visible = !('IntersectionObserver' in window);
  const update = () => {
    const reduce = reduced.matches;
    figure.dataset.cdomMotion = reduce ? 'reduced' : !userPaused && visible && !document.hidden ? 'running' : 'paused';
    button.disabled = reduce;
    button.setAttribute('aria-pressed', String(userPaused));
    const label = reduce ? 'Motion reduced' : userPaused ? 'Resume motion' : 'Pause motion';
    button.setAttribute('aria-label', reduce ? 'Diagram motion reduced by your system preference' : `${userPaused ? 'Resume' : 'Pause'} diagram motion`);
    button.innerHTML = `${userPaused ? playIcon : pauseIcon}<span>${label}</span>`;
  };
  const toggle = () => { userPaused = !userPaused; update(); };
  button.addEventListener('click', toggle);
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    update();
  }, { threshold: 0.15 }) : null;
  observer?.observe(figure);
  update();
  return () => {
    observer?.disconnect();
    button.removeEventListener('click', toggle);
    reduced.removeEventListener('change', update);
    document.removeEventListener('visibilitychange', update);
  };
}
