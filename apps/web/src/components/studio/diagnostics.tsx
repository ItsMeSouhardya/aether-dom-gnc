import type { CdomDocument, DocumentAnalysis } from '@aether-dom/schema';
import { StudioDrawer } from './studio-drawer';
import { getSceneShots, getShotLayers } from '@/features/studio/view-model';

export function Diagnostics({ document, analysis, open, toggle, selectEntity }: { document: CdomDocument; analysis: DocumentAnalysis; open: boolean; toggle: () => void; selectEntity: (id: string) => void }) {
  const assets = analysis.issues.filter(issue => issue.code.startsWith('asset.'));
  const issues = analysis.issues.filter(issue => !issue.code.startsWith('asset.'));
  const physical = issues.filter(issue => issue.code === 'CANON_PHYSICAL_CONFLICT').length;
  const selectable = new Set(document.scenes.flatMap(scene => getSceneShots(document, scene.id).flatMap(shot => getShotLayers(document, shot.id).map(layer => layer.id))));
  const renderIssue = (issue: DocumentAnalysis['issues'][number]) => <article key={issue.id} className="diagnostic-issue" aria-label={`${issue.code} ${issue.subjectId}`}>
    <div className="diagnostic-heading"><strong>{issue.severity === 'error' ? 'Error' : 'Warning'}</strong><code>{issue.code}</code></div>
    <p>{issue.message}</p><p className="panel-note"><code>{issue.subjectId}</code> · <code>{issue.path}</code></p>
    <ul className="diagnostic-evidence">{issue.evidence.map((evidence, index) => <li key={`${evidence.entityId}-${index}`}><code>{evidence.entityId}</code><span>{evidence.message}</span><code>{evidence.path}</code></li>)}</ul>
    {selectable.has(issue.subjectId) ? <button className="studio-button" onClick={() => selectEntity(issue.subjectId)}>Select affected layer</button> : document.layers.some(layer => layer.id === issue.subjectId) ? <p className="panel-note">This layer has no navigable shot. Repair its references before selecting it.</p> : null}
  </article>;
  return <StudioDrawer id="diagnostics-content" title="Diagnostics" label="Diagnostics tray" summary={`${physical} continuity · ${analysis.issues.length} total`} open={open} toggle={toggle}>
    <div className="analysis-introduction"><p>Checked revision {analysis.revision}</p><p className="panel-note">Checks use authored limb poses, ordered events, references and bindings. Review a warning before changing the story.</p></div>
    {issues.length ? issues.map(renderIssue) : <p className="panel-note">No continuity or reference issues at this revision.</p>}
    {assets.length ? <details className="asset-diagnostics"><summary>{assets.length} asset files need attention</summary><p className="panel-note">The stage uses layout blocks while source files are unavailable.</p>{assets.map(renderIssue)}</details> : null}
    {document.provenance.notes ? <details className="analysis-document-note"><summary>Original document note</summary><p className="panel-note">This authored note is retained independently of current check results.</p><p>{document.provenance.notes}</p></details> : null}
  </StudioDrawer>;
}
