// Selected landing page: Afterlight v2. Archived alternatives live in design_archive/.
// Product engine, persistence, AI generation, and actual audio are outside this preview.
import { creativeDocument, mountCdomMotion } from './cdom-section.js';
const app = document.querySelector('#app');

// The integrated document links to the authenticated /studio route. Standalone
// preview serves its landing at / and offers setup instructions instead.
const integrated = window.location.pathname === '/welcome';
const scopeUrl = new URL(window.location.href);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9]/.test(value) && !/[^A-Za-z0-9_-]/.test(value);
const projectId = scopeUrl.searchParams.get('projectId'), branchId = scopeUrl.searchParams.get('branchId');
const scope = scopeUrl.searchParams.getAll('projectId').length === 1 && scopeUrl.searchParams.getAll('branchId').length === 1 && validId(projectId) && validId(branchId) ? '?' + new URLSearchParams({ projectId, branchId }) : '';
const studioAction = integrated ? { href: '/studio' + scope, label: 'Open studio' } : { href: '#local-setup', label: 'Set up local studio' };
const arrow = (direction = 'right') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="icon ${direction}"><path d="M4 12h15M13 5l7 7-7 7"/></svg>`;
const mark = `<svg class="brand-mark" viewBox="0 0 32 36" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m16 2 14 8v16l-14 8L2 26V10Z"/><path d="m2 10 14 8 14-8M16 18v16M9 6l14 8v16"/></svg>`;
const plus = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><path d="M3 10h14M10 3v14"/></svg>`;

function header(style) {
  return `<header class="site-header ${style}"><a class="brand" href="#main" aria-label="AETHER-DOM home">${mark}<span>AETHER<span class="brand-dash">—</span>DOM</span></a><button class="menu-toggle" aria-expanded="false" aria-controls="site-nav">Menu ${plus}</button><nav id="site-nav" class="site-nav" aria-label="Main navigation"><a href="#idea">The idea</a><a href="#system">Creative system</a><a href="#workflow">Workflow</a><a href="#questions">Questions</a></nav><a class="header-cta" data-studio-action href="${studioAction.href}">${integrated ? 'Log in' : studioAction.label} ${arrow()}</a></header>`;
}

function footer(style) {
  return `<footer class="site-footer ${style}"><div class="footer-top"><a class="brand" href="#main">${mark}<span>AETHER—DOM</span></a><p>An independent creative environment.<br>For the worlds only you can make.</p><a class="text-link" href="#main">Back to the beginning ${arrow('up')}</a></div><div class="footer-bottom"><span>AETHER-DOM · In development</span><span>Story. Image. Sound. Connected.</span><a href="#roadmap">Explore the roadmap</a></div></footer>`;
}

function faq() {
  const items = [
    ['What is AETHER-DOM, exactly?', 'A creative IDE in development for motion comics, animatics, and interactive stories. The idea is to connect your narrative, scene layers, timeline, and sound through one versioned creative document.'],
    ['Is this available to use yet?', 'The local studio supports saved scene edits, rigid bone posing, portrait composition, reactive audio, branches and portable playback. The widget on this page is an illustrative preview. To run the local application after repository setup, use <code>pnpm dev:api</code> and <code>pnpm dev:web</code> in separate terminals; follow the repository README for setup.'],
    ['Where does AI fit into the workflow?', 'The local Director uses a deterministic offline mock at zero provider cost. It proposes scoped edits for your review; approval uses a validated, reversible command. A worker must be started explicitly for queued jobs. Live AI providers and generated media remain future work.'],
    ['Who is it being designed for?', 'Independent visual storytellers and small teams making motion comics, animatics, and branching episodic stories. The initial focus is a coherent, controllable creative workflow.'],
    ['What happens to my original work?', 'The local application preserves source assets, explicit dependencies, saved revision history, evidence and reversible commands. A generated image remains an image; editable layers and rigs are editable only when their source data supports it.']
  ];
  return `<section class="faq section" id="questions"><h2>A few things<br>you might be wondering.</h2><div class="faq-list">${items.map(([q, a], index) => `<details${index === 1 ? ' id="local-setup"' : ''}><summary>${q}${plus}</summary><p>${a}</p></details>`).join('')}</div></section>`;
}

const modules = [
  ['Core', 'One source of creative truth.', 'Your .cdom document connects the whole project. Validated commands, explicit dependencies, revision history, and undo keep meaningful changes inspectable.'],
  ['Lore', 'Characters with a past. Stories with a future.', 'Keep world rules, character states, dialogue, and story branches together. Continuity checks point to the events behind a contradiction.'],
  ['Stage', 'Compose the world, layer by layer.', 'Build a scene with editable layers, supported SVG geometry, a 2.5D camera, and authored animation. Change one element without replacing the whole scene.'],
  ['Audio', 'Let the story shape the sound.', 'Plan stems, dialogue, and spatial Foley on a common timeline. Explicit bindings can connect story tension to the mix and scene coordinates to sound position.'],
  ['Director', 'A collaborator. You keep the final cut.', 'Review scoped AI suggestions with their context and intended effects. Approve the operations you want, while the canonical document stays under your control.'],
  ['Publish', 'One world. More ways to experience it.', 'Plan horizontal and vertical compositions, captions, interactive episodes, and portable exports from the same project, with creator review before publication.']
];

function moduleList(style) {
  return `<section id="system" class="system section ${style}"><div class="section-intro"><h2>Six disciplines.<br>One creative language.</h2><p>The parts of a production belong together. Each workspace is designed around the same living document.</p></div><div class="module-list">${modules.map(([name, title, copy], i) => `<details ${i === 0 ? 'open' : ''}><summary><span class="module-name">Aether ${name}</span><span class="module-title">${title}</span>${plus}</summary><p>${copy}</p></details>`).join('')}</div><p class="fine-print">Local scene editing, rigid rigs, reactive audio, reviewed mock proposals, branches and portable JSON/WebM previews are available. General dialogue authoring, live AI providers and public publishing remain in development.</p></section>`;
}

function waveform() {
  return `<div class="waveform" aria-hidden="true">${Array.from({ length: 54 }, (_, i) => `<i style="--bar:${12 + ((i * 37 + i * i * 7) % 75)}%;--i:${i}"></i>`).join('')}</div>`;
}

function demo(style) {
  return `<section class="demo-section section ${style}" id="explore"><div class="section-intro"><h2>Change the story.<br>Feel the ripple.</h2><p>A betrayal changes more than a line of dialogue. Explore how one story beat could connect the character, the scene, and the sound.</p></div><div class="studio-demo"><div class="studio-top"><span>${mark}<strong>NEON SHOGUN</strong><span class="studio-file">/ rooftop-confrontation.cdom</span></span><span class="demo-badge">Illustrative preview</span></div><div class="studio-body"><aside class="scene-tree"><span class="panel-label">SCENE EXPLORER</span><span class="tree-item active">Rooftop confrontation</span><span class="tree-item indent">Kael</span><span class="tree-item indent">Vance</span><span class="tree-item indent">City atmosphere</span><div class="tree-divider"></div><span class="panel-label">CONNECTED ELEMENTS</span><span class="connection"><i></i>Character state</span><span class="connection"><i></i>Scene lighting</span><span class="connection"><i></i>Tension stem</span><span class="tree-footer">One scene. Shared context.</span></aside><div class="demo-center"><div class="scene-preview"><img src="/welcome-assets/assets/afterlight-world.png" width="1536" height="1024" loading="lazy" alt="Illustrative story-world artwork: a traveler approaching a monumental glowing portal"><span class="scene-caption">World study · The threshold</span><div class="scene-frame" aria-hidden="true"></div><span class="frame-ratio">16:9</span></div><div class="sound-track"><span>TENSION STEM <span class="gain-output">−16 dB</span></span>${waveform()}<div class="timeline-ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span></div></div></div><aside class="impact-inspector"><span class="panel-label">PREVIEW THE IMPACT</span><h3>What if trust<br>becomes suspicion?</h3><p>Kael discovers that Vance has betrayed him.</p><button class="story-change">Preview story change ${arrow()}</button><div class="impact-list"><div><span>Character</span><strong data-impact="character">Guarded</strong></div><div><span>Lighting</span><strong data-impact="lighting">Soft ambient</strong></div><div><span>Sound</span><strong data-impact="sound">Low tension</strong></div></div><label class="tension-label" for="tension">Story tension <output id="tension-value">35%</output></label><input id="tension" type="range" min="0" max="100" value="35" aria-describedby="demo-note"><button class="reset-demo">Reset preview</button></aside></div><div class="studio-bottom"><span class="preview-status" role="status">Explore a connected scene</span><span>Preview → review → apply</span></div></div><p class="fine-print" id="demo-note">A visual illustration of the planned workflow, not a live editor. Sound is visualized; no audio is played. Your project stays yours to direct.</p></section>`;
}

function workflow(style = '') {
  return `<section class="workflow section ${style}" id="workflow"><div class="section-intro"><h2>From the first spark<br>to the final frame.</h2><p>A connected process, with room for your own.</p></div><ol class="process-list"><li><span class="step-number">01</span><h3>Give your world a foundation.</h3><p>Establish the premise, characters, and rules. Let your story become a structure you can build on.</p></li><li><span class="step-number">02</span><h3>Bring the scene into focus.</h3><p>Compose layers, shape the timeline, and connect sound. Inspect what changes before you commit.</p></li><li><span class="step-number">03</span><h3>Make it yours. Then share it.</h3><p>Review suggestions, explore branches, and prepare the composition for the way your audience will experience it.</p></li></ol><div class="roadmap" id="roadmap"><span class="roadmap-title">The road ahead</span><p><strong>Foundation</strong><span>Creative studio</span><span>Reactive sound</span><span>Reviewed AI</span><span>Publishing</span></p><span class="fine-print">Local foundation, studio and reactive sound are implemented · AI uses an offline mock · Public publishing is future work</span></div></section>`;
}

function cta(style) {
  return `<section class="closing ${style}"><div><h2>Your world.<br><em>Still becoming.</em></h2><p>Stories are living things.<br>Let’s build a place that treats them that way.</p></div><a class="button" data-studio-action href="${studioAction.href}">${studioAction.label} ${arrow()}</a><span class="closing-note">AETHER-DOM · A creative environment in development</span></section>`;
}

function graph() {
  return `<svg class="semantic-graph" viewBox="0 0 640 570" role="img" aria-labelledby="graph-title graph-desc"><title id="graph-title">A creative document connects story, visuals, and sound</title><desc id="graph-desc">An exploded diagram of three linked planes: narrative, stage, and audio. The shared CDOM document links them.</desc><g class="graph-connectors" fill="none" stroke="currentColor"><path d="M320 75v430M120 235l400 0M120 345h400" stroke-dasharray="3 7" opacity=".25"/><path d="m130 190 190-105 190 105-190 105Z"/><path d="m130 290 190-105 190 105-190 105Z"/><path d="m130 390 190-105 190 105-190 105Z"/><path d="M130 190v200m380-200v200m-190-95v200" opacity=".35"/></g><g class="graph-plane plane-top"><path d="m130 190 190-105 190 105-190 105Z" fill="var(--accent)" stroke="currentColor"/><path d="m205 190 115-64 115 64-115 64Z" fill="none" stroke="currentColor" opacity=".4"/><path d="m275 190 45-25 45 25-45 25Z" fill="currentColor"/><circle cx="205" cy="190" r="6" fill="currentColor"/><circle cx="435" cy="190" r="6" fill="currentColor"/></g><g class="graph-plane plane-middle"><path d="m130 290 190-105 190 105-190 105Z" fill="var(--bg)" fill-opacity=".8" stroke="currentColor"/><path d="m220 290 100-55 100 55-100 55Z" fill="none" stroke="currentColor"/><path d="m270 290 50-28 50 28-50 28Z" fill="currentColor" opacity=".2"/><circle cx="320" cy="290" r="8" fill="currentColor"/></g><g class="graph-plane plane-bottom"><path d="m130 390 190-105 190 105-190 105Z" fill="var(--bg)" fill-opacity=".85" stroke="currentColor"/><path d="m210 390 20-30 20 48 20-58 20 61 20-71 20 77 20-69 20 55 20-39 20 26" fill="none" stroke="currentColor" stroke-width="2"/></g><g fill="currentColor" class="graph-labels"><text x="50" y="145">NARRATIVE</text><text x="485" y="296">STAGE</text><text x="55" y="443">AUDIO</text><text x="264" y="546">ONE .CDOM</text></g><g fill="none" stroke="currentColor" opacity=".5"><path d="M55 155h60l52 35M483 302h-20M55 449h50l45-50M320 510v-15"/></g><g class="graph-node" fill="currentColor"><circle cx="130" cy="190" r="4"/><circle cx="510" cy="290" r="4"/><circle cx="130" cy="390" r="4"/></g></svg>`;
}

function landingPage() {
  return `<div class="page afterlight afterlight-v2">${header('over-image')}<main id="main" tabindex="-1"><section class="cinematic-hero"><img class="hero-art" src="/welcome-assets/assets/afterlight-world.png" width="1536" height="1024" fetchpriority="high" alt="A cloaked traveler on a stone bridge facing a luminous portal in an immense canyon"><div class="hero-shade"></div><div class="hero-copy"><h1>Every story.<br>A world<br>of its own.</h1><p>A creative space where story, image, and sound move as one. Built around your imagination. Connected by design.</p><div class="hero-actions"><a class="button" data-studio-action href="${studioAction.href}">${studioAction.label} ${arrow()}</a></div></div><div class="hero-foot"><span>For independent minds.<br>And the worlds they carry.</span><span class="art-label">WORLD STUDY / THE THRESHOLD<br>Concept artwork · AETHER-DOM</span></div></section><section class="manifesto section" id="idea"><p class="side-note">A space for the whole story.</p><div><h2>Your imagination<br>doesn’t work in silos.<br><span>Neither should your tools.</span></h2><p>A character changes. A scene shifts. The score finds a new tension. AETHER-DOM is being built to hold those connections in one creative document, so you can follow an idea without losing its world.</p></div></section>${creativeDocument(graph())}${demo('dark-demo')}${moduleList('dark-system')}<section class="world-banner"><img src="/welcome-assets/assets/folio-world.png" width="1536" height="1024" loading="lazy" alt="Layered stone and amber glass framing an open doorway into a desert"><div><h2>Nothing exists<br>in isolation.</h2><p>Not a character. Not a frame.<br>Not the way a story makes you feel.</p></div></section>${workflow()}${faq()}${cta('dark-closing')}</main>${footer('dark-footer')}</div>`;
}

function initializeInteractions() {
  document.querySelectorAll('[data-studio-action]').forEach(anchor => {
    if (!integrated) anchor.addEventListener('click', () => { document.querySelector('#local-setup').open = true; });
  });
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


const entryUrl = new URL(window.location.href);
if (entryUrl.searchParams.has('variant')) {
  entryUrl.searchParams.delete('variant');
  window.history.replaceState({}, '', entryUrl);
}
app.innerHTML = landingPage();
initializeInteractions();
if (integrated) {
  const login = document.querySelector('.header-cta');
  login.href = '/login?' + new URLSearchParams({ next: studioAction.href });
  fetch('/api/auth/session', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(session => {
    if (session?.user) { login.href = studioAction.href; login.innerHTML = 'Open studio ' + arrow(); }
  }).catch(() => {});
}
mountCdomMotion(app);
