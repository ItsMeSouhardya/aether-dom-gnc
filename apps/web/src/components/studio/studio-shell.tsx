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

export function StudioShell({ document, reload }: { document: CdomDocument; reload: () => void }) {
  const [store] = useState(() => createStudioStore(document));
  const selection = useStore(store, state => state.selection);
  const dispatch = store.getState().dispatch;
  const branch = document.branches.find(branch => branch.id === document.project.activeBranchId);
  const selectedLayer = getShotLayers(document, selection.shotId).find(layer => layer.id === selection.layerId);
  return <main id="studio" className="studio">
    <header className="studio-header">
      <div className="studio-wordmark"><Icon name="brand" /><span>AETHER-DOM</span></div>
      <div className="studio-project-heading"><h1>{document.project.title}</h1><span className="studio-branch">{branch?.name ?? 'Branch unavailable'}</span></div>
      <div className="studio-header-actions"><Link className="studio-text-link" href="/document">Document overview</Link><button className="studio-button" onClick={reload} aria-label="Reload document"><Icon name="refresh" /><span>Reload</span></button></div>
    </header>
    <div className="studio-workbench">
      <ProjectNavigator document={document} selection={selection} dispatch={dispatch} />
      <LayerStage document={document} selection={selection} dispatch={dispatch} />
      <LayerInspector document={document} selection={selection} clear={() => dispatch({ type: 'clear-layer' })} />
      <Timeline document={document} shotId={selection.shotId} />
      <Diagnostics note={document.provenance.notes} />
    </div>
    <footer className="studio-statusbar"><span>Snapshot validated · Revision {document.project.revision}</span><span>{selectedLayer ? `${layerName(document, selectedLayer)} selected` : 'No layer selected'}</span><span>Read-only studio · .cdom {document.schemaVersion}</span></footer>
    <p className="sr-only" role="status">{selectedLayer ? `Selected layer ${layerName(document, selectedLayer)}` : selection.shotId ? 'Shot selected. Select a layer to inspect.' : 'No shot selected.'}</p>
  </main>;
}
