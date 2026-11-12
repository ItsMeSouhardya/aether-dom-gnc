'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CdomDocument } from '@aether-dom/schema';
import type { SelectionAction, StudioSelection } from '@/features/studio/selection';
import { getShotLayers, layerName } from '@/features/studio/view-model';
import { nextLayerDepth, projectLayer, unprojectDelta, type Transform } from '@/features/stage/geometry';
import { stageRenderPlan } from '@/features/stage/render-plan';
import type { Playback } from '@/features/stage/playback';
import { assetKey, type AssetState } from '@/features/stage/use-svg-assets';
import type { CommandOperation } from '@/features/commands/draft';
import { GpuStage } from '../stage/gpu-stage';
import { SvgContent } from '../stage/svg-content';
import { CameraEditor, SvgImport } from '../stage/stage-editors';

export type StageMode = 'layout' | 'animation' | 'svg';
type Props = { document: CdomDocument; selection: StudioSelection; dispatch: (action: SelectionAction) => void; assets: Record<string, AssetState>;
  playback: Playback; mode: StageMode; setMode: (mode: StageMode) => void; selectedElement: string | null; selectElement: (id: string) => void;
  busy: boolean; blocked: boolean; run: (operation: CommandOperation, reason: string, revision?: number) => Promise<boolean> };
type Drag = { id: string; pointerId: number; startX: number; startY: number; transform: Transform; revision: number; draft: Transform };

export function LayerStage({ document, selection, dispatch, assets, playback, mode, setMode, selectedElement, selectElement, busy, blocked, run }: Props) {
  const shot = document.shots.find(shot => shot.id === selection.shotId);
  const scene = document.scenes.find(scene => scene.id === selection.sceneId);
  const layers = getShotLayers(document, shot?.id ?? null);
  const selected = layers.find(layer => layer.id === selection.layerId);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<{ id: string; transform: Transform } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [renderer, setRenderer] = useState<'webgl2' | 'svg'>('svg');
  const [editor, setEditor] = useState<'camera' | 'import' | null>(null);
  const preview = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);
  const locked = busy || blocked || mode !== 'layout' || preview.playing;
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element); return () => observer.disconnect();
  }, [shot?.id]);
  const cancelDrag = () => { drag.current = null; setDraft(null); };
  const renderLayers = layers.map(layer => {
    const asset = document.assets.find(asset => asset.id === layer.assetId);
    return { ...layer, transform: draft?.id === layer.id ? draft.transform : layer.transform, svg: asset ? assets[assetKey(asset)]?.svg ?? null : null };
  });
  const rendered = stageRenderPlan(renderLayers, preview.timeMs, mode === 'animation');
  const ratio = shot ? { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 }[shot.camera.aspectRatio] : 16 / 9;
  const selectedAsset = document.assets.find(asset => asset.id === selected?.assetId);
  const svgReady = selectedAsset && assets[assetKey(selectedAsset)]?.svg;
  const pending = layers.some(layer => { const asset = document.assets.find(asset => asset.id === layer.assetId); return asset?.kind === 'svg' && !assets[assetKey(asset)]; });
  return <section className="studio-stage" aria-label="Layered stage" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); if (drag.current) cancelDrag(); else if (editor) setEditor(null); else dispatch({ type: 'clear-layer' }); }
  }}>
    <div className="stage-toolbar"><div><h2>{scene?.title ?? 'Stage'}</h2><span>2.5D · {renderer === 'webgl2' ? 'WebGL2' : 'SVG fallback'}</span></div>
      {shot ? <div className="stage-tools">
        <button className="studio-button" aria-label="Layout mode" aria-pressed={mode === 'layout'} onClick={() => { cancelDrag(); playback.pause(); setMode('layout'); }}>Layout</button>
        <button className="studio-button" aria-label="Animation mode" aria-pressed={mode === 'animation'} onClick={() => { cancelDrag(); setMode('animation'); }}>Animate</button>
        <button className="studio-button" disabled={busy || blocked} onClick={() => { cancelDrag(); playback.pause(); setEditor('camera'); }}>Camera</button>
        <button className="studio-button" disabled={busy || blocked} onClick={() => { cancelDrag(); playback.pause(); setEditor('import'); }}>Import SVG</button>
        {svgReady ? <button className="studio-button" aria-pressed={mode === 'svg'} onClick={() => { cancelDrag(); playback.pause(); setMode('svg'); }}>Edit SVG</button> : null}
      </div> : <span>No shot selected</span>}</div>
    {shot ? <>
      {editor ? <div className="stage-editor" key={`${shot.id}:${editor}`}>
        {editor === 'camera' ? <CameraEditor document={document} shot={shot} run={run} busy={busy} blocked={blocked} onClose={() => setEditor(null)} />
          : <SvgImport document={document} shotId={shot.id} run={run} busy={busy} blocked={blocked} onClose={() => setEditor(null)} />}
      </div> : null}
      <div className="stage-workspace"><div ref={canvas} className="stage-canvas stage-canvas-live" style={{ aspectRatio: ratio, width: `min(100cqw, calc(100cqh * ${ratio}))` }} role="group" aria-label="Shot layout blockout">
        <GpuStage width={size.width} height={size.height} camera={shot.camera} layers={renderLayers} playback={playback} animate={mode === 'animation'} hiddenLayerId={mode === 'svg' ? selection.layerId : null} onMode={setRenderer} />
        <svg className="stage-overlay" width="100%" height="100%" viewBox={`0 0 ${size.width || 1} ${size.height || 1}`} aria-label="Editable shot layers">
          {rendered.map(layer => {
            const p = projectLayer(layer.transform, shot.camera, size, layer.svg?.viewBox ?? { x: 0, y: 0, width: 130, height: 200 });
            if (!p) return null;
            const name = layerName(document, layers.find(item => item.id === layer.id)!), isSelected = selection.layerId === layer.id, isolated = mode === 'svg' && isSelected;
            return <g key={layer.id} role="button" tabIndex={0} aria-label={`Select stage layer ${name}`} aria-pressed={isSelected} className="stage-hit" style={{ cursor: locked ? 'pointer' : 'grab' }}
              transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}
              onPointerDown={event => {
                dispatch({ type: 'select-layer', id: layer.id });
                if (locked || event.button !== 0) return;
                event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { id: layer.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, transform: layer.transform, draft: layer.transform, revision: document.project.revision };
              }} onPointerMove={event => {
                const active = drag.current;
                if (!active || active.id !== layer.id || active.pointerId !== event.pointerId) return;
                const delta = unprojectDelta(event.clientX - active.startX, event.clientY - active.startY, active.transform.z, shot.camera, size);
                if (delta) { active.draft = { ...active.transform, x: active.transform.x + delta.x, y: active.transform.y + delta.y }; setDraft({ id: active.id, transform: active.draft }); }
              }} onPointerUp={event => {
                const active = drag.current;
                if (!active || active.pointerId !== event.pointerId) return;
                cancelDrag();
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                if (active.revision !== document.project.revision || busy || blocked) return;
                if (active.draft.x !== active.transform.x || active.draft.y !== active.transform.y) void run({ op: 'setLayerTransform', targetId: active.id, args: { x: active.draft.x, y: active.draft.y } }, `Move ${name}`, active.revision);
              }} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onClick={() => dispatch({ type: 'select-layer', id: layer.id })}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); dispatch({ type: 'select-layer', id: layer.id }); }
                if (locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault(); const step = event.shiftKey ? .25 : .05;
                const x = layer.transform.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
                const y = layer.transform.y + (event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0);
                void run({ op: 'setLayerTransform', targetId: layer.id, args: { x, y } }, `Move ${name}`, document.project.revision);
              }}>
              <rect className="stage-hit-bounds" x={-p.width / 2} y={-p.height / 2} width={p.width} height={p.height} fill="transparent" />
              {(renderer === 'svg' || isolated) && layer.svg ? <svg x={-p.width / 2} y={-p.height / 2} width={p.width} height={p.height} viewBox={`${layer.svg.viewBox.x} ${layer.svg.viewBox.y} ${layer.svg.viewBox.width} ${layer.svg.viewBox.height}`} opacity={layer.opacity ?? 1} pointerEvents={isolated ? 'auto' : 'none'}>
                <SvgContent node={layer.svg.root} scopeId={layer.id} selectedId={isolated ? selectedElement : null} onSelect={isolated ? selectElement : undefined} />
              </svg> : null}
              {!layer.svg ? <text className="stage-missing-label" textAnchor="middle">{name} · source unavailable</text> : null}
              {isSelected ? <rect className="stage-selection" x={-p.width / 2} y={-p.height / 2} width={p.width} height={p.height} fill="none" pointerEvents="none" /> : null}
            </g>;
          })}
        </svg>
        {layers.length === 0 ? <div className="stage-empty"><h3>No layers in this shot</h3><p>Import an SVG to begin composing.</p></div> : null}
      </div></div>
      <div className="stage-caption"><span>{pending ? 'Loading SVG assets…' : `${shot.camera.aspectRatio} · ${mode === 'animation' ? 'Animation preview' : mode === 'svg' ? 'Select a source element' : 'Drag to move · Arrow keys to nudge'}`}</span>
        {selected ? <div className="stage-tools">{(['backward', 'forward'] as const).map(direction => {
          const z = nextLayerDepth(layers, selected.id, direction);
          return <button key={direction} className="studio-button" disabled={locked || z === null} onClick={() => { if (z !== null) void run({ op: 'setLayerTransform', targetId: selected.id, args: { z } }, `Reorder ${layerName(document, selected)}`, document.project.revision); }}>{direction === 'forward' ? 'Bring forward' : 'Send backward'}</button>;
        })}</div> : null}
      </div>
    </> : <div className="stage-empty"><h3>{scene ? 'No shots in this scene' : 'No shot selected'}</h3><p>Choose a shot in the project explorer to view its layers.</p></div>}
  </section>;
}
