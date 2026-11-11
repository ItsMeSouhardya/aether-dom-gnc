import DocumentOverview from './document-overview';

export default function Page() {
  return <>
    <a className="skip-link" href="#document">Skip to document</a>
    <header className="workspace-header">
      <span className="brand"><svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><path d="M5 25V7h22v18M10 25V12h12v13M15 25v-8h2v8" stroke="currentColor" strokeWidth="1.5" /></svg>AETHER-DOM</span>
      <span className="workspace-label">Local workspace</span>
    </header>
    <main id="document" className="workspace-main"><DocumentOverview /></main>
    <footer className="workspace-footer"><span>Creator-owned stories. One connected document.</span><span>Task 00 · Read-only foundation</span></footer>
  </>;
}
