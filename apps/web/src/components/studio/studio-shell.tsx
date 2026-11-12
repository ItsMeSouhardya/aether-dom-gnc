'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { createPlayback } from '@/features/stage/playback';
import { useSvgAssets } from '@/features/stage/use-svg-assets';
import type { StageMode } from './layer-stage';
import { useAudioPreview, useAudioSettings } from '@/features/audio/use-audio-preview';
import { AudioPanel } from '../audio/audio-panel';
import { ProposalPanel } from '../proposals/proposal-panel';
import { LayoutEditor, type LayoutPreview } from '../stage/layout-editor';
import { composeLayers, compositionCamera, type Aspect } from '@/features/stage/composition';
import { assetKey } from '@/features/stage/asset-state';
import { loadPlayerManifest } from '@/lib/player-api';

type Props = { document: CdomDocument; history: ProjectSnapshot['history']; analysis: ProjectSnapshot['analysis']; reload: () => void; busy: boolean; requiresReload: boolean;
  feedback: { error: boolean; message: string } | null; run: (operation: CommandOperation, reason: string, expectedRevision?: number) => Promise<boolean> };
export function StudioShell({ document, history, analysis, reload, busy, requiresReload, feedback, run }: Props) {
  const [store] = useState(() => createStudioStore(document));
  const [drawer, setDrawer] = useState<'diagnostics' | 'dependencies' | 'history' | null>(null);
  const toggle = (name: NonNullable<typeof drawer>) => setDrawer(value => value === name ? null : name);
  const selection = useStore(store, state => state.selection);
  const [mode, setMode] = useState<StageMode>('layout');
  const [audioOpen, setAudioOpen] = useState(false);
  const [proposalsOpen, setProposalsOpen] = useState(false);
  const [aspectChoice, setAspectChoice] = useState<Aspect | null>(null);
  const [layoutPreview, setLayoutPreview] = useState<LayoutPreview | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportRequest = useRef<AbortController | null>(null);
  useEffect(() => () => exportRequest.current?.abort(), []);
  const changeLayoutPreview = useCallback((draft: LayoutPreview | null) => setLayoutPreview(draft), []);
  const [audioSettings, changeAudioSettings] = useAudioSettings();
  const [selectedElement, selectElement] = useState<string | null>(null);
  const shot = document.shots.find(shot => shot.id === selection.shotId);
  const aspect = aspectChoice ?? shot?.camera.aspectRatio ?? '16:9';
  const playback = useMemo(() => createPlayback(shot?.durationMs ?? 0), [shot?.durationMs]);
  // Pause releases the clock while allowing React's development effect replay to reuse this controller.
  useEffect(() => () => playback.pause(), [playback]);
  useEffect(() => { playback.pause(); }, [playback, document.project.revision]);
  useEffect(() => { playback.pause(); playback.seek(0); }, [playback, shot?.id]);
  const assets = useSvgAssets(document);
  const composedDocument = useMemo(() => {
    if (!shot) return document;
    const previewShot = layoutPreview?.shotId === shot.id && layoutPreview.revision === document.project.revision ? { ...shot, layoutOverrides: { ...shot.layoutOverrides, '9:16': { layerTransforms: layoutPreview.layerTransforms ?? {} } } } : shot;
    return { ...document, layers: composeLayers(document.layers, previewShot, aspect), shots: document.shots.map(item => item.id === shot.id ? { ...item, camera: compositionCamera(item, aspect) } : item) };
  }, [document, shot, aspect, layoutPreview]);
  const runtimeSettings = useMemo(() => ({ ...audioSettings, document: composedDocument, shotId: shot?.id ?? null, animate: mode === 'animation' }), [audioSettings, composedDocument, shot?.id, mode]);
  const audio = useAudioPreview(playback, runtimeSettings);
  const dispatch = (action: SelectionAction) => store.getState().dispatch(action, document);
  const branch = document.branches.find(branch => branch.id === document.project.activeBranchId);
  const selectedLayer = getShotLayers(document, selection.shotId).find(layer => layer.id === selection.layerId);
  const sources = Object.fromEntries(document.assets.flatMap(asset => { const svg = assets[assetKey(asset)]?.svg; return svg ? [[asset.id, svg.viewBox]] : []; }));
  const playerQuery = new URLSearchParams({ projectId: document.project.id, branchId: document.project.activeBranchId, revision: String(document.project.revision) });
  const exportJson = async () => {
    if (exporting) return;
    const controller = new AbortController(); exportRequest.current = controller;
    setExporting(true); setExportError('');
    try {
      const manifest = await loadPlayerManifest(document.project.id, document.project.activeBranchId, document.project.revision, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `aether-dom-r${manifest.document.project.revision}.cdom.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { if (!controller.signal.aborted) setExportError(error instanceof Error ? error.message : 'Export failed. Check the local API and retry.'); }
    finally { if (!controller.signal.aborted) setExporting(false); }
  };
  const selectEntity = (id: string) => {
    const layer = document.layers.find(layer => layer.id === id);
    if (layer) { dispatch({ type: 'select-shot', id: layer.shotId }); dispatch({ type: 'select-layer', id }); }
  };
  return <main id="studio" className={`studio${drawer ? ' studio-drawer-open' : ''}`}>
    <header className="studio-header">
      <div className="studio-wordmark"><Icon name="brand" /><span>AETHER-DOM</span></div>
      <div className="studio-project-heading"><h1>{document.project.title}</h1><span className="studio-branch">{branch?.name ?? 'Branch unavailable'}</span></div>
      <div className="studio-header-actions"><Link className="studio-text-link" href={`/player?${playerQuery}`} prefetch={false} title="Play the saved revision; unsaved drafts are excluded">Player</Link><button className="studio-button" onClick={() => { void exportJson(); }} disabled={exporting} title="Download the saved document and local media; unsaved drafts are excluded">{exporting ? 'Preparing JSON…' : 'Export JSON'}</button><button className="studio-button" aria-label="AI proposals" aria-pressed={proposalsOpen} onClick={() => { playback.pause(); setAudioOpen(false); setProposalsOpen(value => !value); }}>Proposals</button><Link className="studio-text-link" href="/document">Seed overview</Link>
        <button className="studio-button" aria-label="Undo" disabled={busy || requiresReload || !history.canUndo} onClick={() => { void run({ op: 'undo' }, 'Undo last edit'); }}>Undo</button>
        <button className="studio-button" aria-label="Redo" disabled={busy || requiresReload || !history.canRedo} onClick={() => { void run({ op: 'redo' }, 'Redo last edit'); }}>Redo</button>
        <button className="studio-button" disabled={busy} onClick={reload} aria-label="Reload document"><Icon name="refresh" /><span>Reload</span></button></div>
    </header>
    <div className="studio-workbench">
      <ProjectNavigator document={document} selection={selection} dispatch={dispatch} />
      <LayerStage key={`${selection.shotId}:${aspect}`} document={document} selection={selection} dispatch={dispatch} assets={assets} playback={playback} mode={mode} setMode={setMode} selectedElement={selectedElement} selectElement={selectElement} busy={busy} blocked={requiresReload} run={run} audio={audio} reactiveGlow={audioSettings.reactiveGlow} aspect={aspect} layoutPreview={layoutPreview?.shotId === shot?.id && layoutPreview?.revision === document.project.revision ? layoutPreview : null} onAspectChange={value => { playback.pause(); setLayoutPreview(null); setAspectChoice(value); setAudioOpen(false); setProposalsOpen(false); setMode('layout'); }} />
      {proposalsOpen ? <aside className="studio-inspector" aria-label="Proposal inspector"><ProposalPanel document={document} layerId={selection.layerId} shotId={selection.shotId} busy={busy} blocked={requiresReload} run={run} onClose={() => setProposalsOpen(false)} /></aside> : audioOpen ? <aside className="studio-inspector" aria-label="Audio inspector"><AudioPanel document={document} shotId={selection.shotId} runtime={audio} settings={audioSettings} onSettingsChange={changeAudioSettings} busy={busy} blocked={requiresReload} run={run} onClose={() => setAudioOpen(false)} /></aside> : aspect === '9:16' && shot ? <aside className="studio-inspector" aria-label="Layout inspector"><LayoutEditor key={`${shot.id}:${layoutPreview?.revision ?? document.project.revision}`} document={document} shot={shot} layerId={selection.layerId} sources={sources} busy={busy} blocked={requiresReload} run={run} onPreview={changeLayoutPreview} /></aside> : <LayerInspector key={selection.layerId ?? 'none'} document={document} selection={selection} clear={() => dispatch({ type: 'clear-layer' })} busy={busy} blocked={requiresReload} run={run}
        assets={assets} mode={mode} selectedElement={selectedElement} selectElement={selectElement} playback={playback}
        save={(targetId, transform, revision) => run({ op: 'setLayerTransform', targetId, args: transform }, `Move ${layerName(document, document.layers.find(layer => layer.id === targetId)!)}`, revision)} />}
      <Timeline document={document} shotId={selection.shotId} playback={playback} mode={mode} setMode={setMode} openAudio={() => { setProposalsOpen(false); setAudioOpen(value => !value); }} audioOpen={audioOpen} />
      <div className="studio-drawers">
        {exportError ? <div className="command-feedback command-feedback-error"><p role="alert" aria-label="Export error">{exportError}</p></div> : null}
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
