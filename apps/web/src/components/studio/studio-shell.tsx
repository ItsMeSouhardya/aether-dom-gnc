'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from 'zustand';
import type { CdomDocument } from '@aether-dom/schema';
import { createStudioStore } from '@/features/studio/store';
import { getShotLayers, layerName } from '@/features/studio/view-model';
import { ProjectNavigator } from './project-navigator';
import { LayerStage } from './layer-stage';
import { LayerInspector } from './layer-inspector';
import { Timeline } from './timeline';
import { Diagnostics } from './diagnostics';
import { Icon } from './icons';
import type { ProjectSnapshot } from '@/lib/project-api';
import type { CommandOperation } from '@/features/commands/draft';
import type { SelectionAction } from '@/features/studio/selection';
import { CommandHistory } from './command-history';
import { DependencyImpact } from './dependency-impact';

type Props = { document: CdomDocument; history: ProjectSnapshot['history']; analysis: ProjectSnapshot['analysis']; reload: () => void; busy: boolean; requiresReload: boolean;
  feedback: { error: boolean; message: string } | null; run: (operation: CommandOperation, reason: string, expectedRevision?: number) => Promise<boolean> };
export function StudioShell({ document, history, analysis, reload, busy, requiresReload, feedback, run }: Props) {
  const [store] = useState(() => createStudioStore(document));
  const [drawer, setDrawer] = useState<'diagnostics' | 'dependencies' | 'history' | null>(null);
  const toggle = (name: NonNullable<typeof drawer>) => setDrawer(value => value === name ? null : name);
  const selection = useStore(store, state => state.selection);
  const dispatch = (action: SelectionAction) => store.getState().dispatch(action, document);
  const branch = document.branches.find(branch => branch.id === document.project.activeBranchId);
  const selectedLayer = getShotLayers(document, selection.shotId).find(layer => layer.id === selection.layerId);
  const selectEntity = (id: string) => {
    const layer = document.layers.find(layer => layer.id === id);
    if (layer) { dispatch({ type: 'select-shot', id: layer.shotId }); dispatch({ type: 'select-layer', id }); }
  };
  return <main id="studio" className={`studio${drawer ? ' studio-drawer-open' : ''}`}>
    <header className="studio-header">
      <div className="studio-wordmark"><Icon name="brand" /><span>AETHER-DOM</span></div>
      <div className="studio-project-heading"><h1>{document.project.title}</h1><span className="studio-branch">{branch?.name ?? 'Branch unavailable'}</span></div>
      <div className="studio-header-actions"><Link className="studio-text-link" href="/document">Seed overview</Link>
        <button className="studio-button" aria-label="Undo" disabled={busy || requiresReload || !history.canUndo} onClick={() => { void run({ op: 'undo' }, 'Undo last edit'); }}>Undo</button>
        <button className="studio-button" aria-label="Redo" disabled={busy || requiresReload || !history.canRedo} onClick={() => { void run({ op: 'redo' }, 'Redo last edit'); }}>Redo</button>
        <button className="studio-button" disabled={busy} onClick={reload} aria-label="Reload document"><Icon name="refresh" /><span>Reload</span></button></div>
    </header>
    <div className="studio-workbench">
      <ProjectNavigator document={document} selection={selection} dispatch={dispatch} />
      <LayerStage document={document} selection={selection} dispatch={dispatch} />
      <LayerInspector key={selection.layerId ?? 'none'} document={document} selection={selection} clear={() => dispatch({ type: 'clear-layer' })} busy={busy} blocked={requiresReload} run={run}
        save={(targetId, transform, revision) => run({ op: 'setLayerTransform', targetId, args: transform }, `Move ${layerName(document, document.layers.find(layer => layer.id === targetId)!)}`, revision)} />
      <Timeline document={document} shotId={selection.shotId} />
      <div className="studio-drawers">
        {feedback ? <div className={`command-feedback ${feedback.error ? 'command-feedback-error' : ''}`}><p role={feedback.error ? 'alert' : 'status'} aria-label="Save status">{feedback.message}</p>{requiresReload ? <button className="studio-button" onClick={reload}>Reload latest</button> : null}</div> : null}
        <Diagnostics document={document} analysis={analysis} open={drawer === 'diagnostics'} toggle={() => toggle('diagnostics')} selectEntity={selectEntity} />
        <DependencyImpact analysis={analysis} selectedId={selection.layerId} open={drawer === 'dependencies'} toggle={() => toggle('dependencies')} />
        <CommandHistory entries={history.entries} open={drawer === 'history'} toggle={() => toggle('history')} />
      </div>
    </div>
    <footer className="studio-statusbar"><span>{busy ? 'Saving…' : requiresReload ? 'Reload required' : 'Saved locally'} · Revision {document.project.revision}</span><span>{selectedLayer ? `${layerName(document, selectedLayer)} selected` : 'No layer selected'}</span><span>SQLite project · .cdom {document.schemaVersion}</span></footer>
    <p className="sr-only" role="status">{selectedLayer ? `Selected layer ${layerName(document, selectedLayer)}` : selection.shotId ? 'Shot selected. Select a layer to inspect.' : 'No shot selected.'}</p>
  </main>;
}
