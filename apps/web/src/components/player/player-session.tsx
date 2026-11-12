'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CdomDocument, PlayerManifest } from '@aether-dom/schema';
import { useAudioPreview, useAudioSettings } from '../../features/audio/use-audio-preview';
import { composeLayers, compositionCamera, type Aspect } from '../../features/stage/composition';
import { projectLayer } from '../../features/stage/geometry';
import { createPlayback } from '../../features/stage/playback';
import { stageRenderPlan } from '../../features/stage/render-plan';
import { assetKey } from '../../features/stage/asset-state';
import { getShotLayers, layerName } from '../../features/studio/view-model';
import { embeddedAudioLoader, embeddedSvgAssets } from '../../features/player/manifest';
import { GpuStage } from '../stage/gpu-stage';
import { SvgContent } from '../stage/svg-content';
import { AudioGlow } from '../audio/audio-glow';

type Shot = CdomDocument['shots'][number];
const timeLabel = (timeMs: number) => `${(timeMs / 1000).toFixed(1)}s`;

export function PlayerSession({ manifest, source }: { manifest: PlayerManifest; source: string }) {
  const { document } = manifest;
  const [shotId, setShotId] = useState<string | null>(document.shots[0]?.id ?? null);
  const shot = document.shots.find(item => item.id === shotId);
  const [aspect, setAspect] = useState<Aspect>(shot?.camera.aspectRatio ?? '16:9');
  const branch = document.branches.find(branch => branch.id === document.project.activeBranchId);
  return <>
    <div className="player-heading"><div><h1>{document.project.title}</h1><p>{source} · {branch?.name ?? document.project.activeBranchId} · Revision {document.project.revision}</p></div>
      {shot ? <div className="player-selectors"><label>Shot<select aria-label="Player shot" value={shot.id} onChange={event => { const next = document.shots.find(item => item.id === event.target.value); setShotId(next?.id ?? null); setAspect(next?.camera.aspectRatio ?? '16:9'); }}>
        {document.shots.map(item => <option key={item.id} value={item.id}>{document.scenes.find(scene => scene.id === item.sceneId)?.title ?? item.id} · {item.id}</option>)}
      </select></label><label>Aspect<select aria-label="Player aspect ratio" value={aspect} onChange={event => setAspect(event.target.value as Aspect)}><option value="16:9">16:9</option><option value="9:16">9:16</option>{shot.camera.aspectRatio === '1:1' ? <option value="1:1">1:1</option> : null}</select></label></div> : null}
    </div>
    {shot ? <ShotPlayer key={`${shot.id}:${aspect}`} manifest={manifest} shot={shot} aspect={aspect} />
      : <section className="player-message"><h2>No shots to play</h2><p>This saved document has no shots. Choose another exported JSON file or return to the studio.</p></section>}
  </>;
}

function ShotPlayer({ manifest, shot, aspect }: { manifest: PlayerManifest; shot: Shot; aspect: Aspect }) {
  const document = useMemo(() => ({ ...manifest.document, layers: composeLayers(manifest.document.layers, shot, aspect) }), [manifest, shot, aspect]);
  const camera = useMemo(() => compositionCamera(shot, aspect), [shot, aspect]);
  const assets = useMemo(() => embeddedSvgAssets(manifest), [manifest]);
  const dependencies = useMemo(() => ({ loadAsset: embeddedAudioLoader(manifest) }), [manifest]);
  const playback = useMemo(() => createPlayback(shot.durationMs), [shot.durationMs]);
  // Pause releases RAF; the stable controller survives development effect replay.
  useEffect(() => () => playback.pause(), [playback]);
  const preview = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);
  const [settings, updateSettings] = useAudioSettings();
  const audioSettings = useMemo(() => ({ ...settings, document, shotId: shot.id, animate: true }), [settings, document, shot.id]);
  const audio = useAudioPreview(playback, audioSettings, dependencies);
  const audioStatus = useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getSnapshot);
  const hasAudio = document.audioTracks.some(track => track.shotId === shot.id);
  const [renderer, setRenderer] = useState<'webgl2' | 'svg'>('svg');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const layers = useMemo(() => getShotLayers(document, shot.id).map(layer => {
    const asset = document.assets.find(asset => asset.id === layer.assetId);
    return { ...layer, svg: asset ? assets[assetKey(asset)]?.svg ?? null : null };
  }), [document, shot.id, assets]);
  const rendered = stageRenderPlan(layers, preview.timeMs, true);
  const ratio = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 }[aspect];
  const togglePlayback = () => preview.playing ? playback.pause() : playback.play();
  return <section className="player-session" aria-label="Saved composition player">
    <div className="player-workspace"><div ref={frame} className="player-frame" style={{ aspectRatio: ratio, width: `min(100cqw, calc(100cqh * ${ratio}))` }} tabIndex={0} role="group" aria-label="Player stage" aria-describedby="player-keyboard" onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); playback.seek(preview.timeMs + (event.key === 'ArrowRight' ? 1000 : -1000)); }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); playback.seek(event.key === 'Home' ? 0 : shot.durationMs); }
    }}>
      <GpuStage width={size.width} height={size.height} camera={camera} layers={layers} playback={playback} animate={true} onMode={setRenderer} />
      <svg className="player-overlay" width="100%" height="100%" viewBox={`0 0 ${size.width || 1} ${size.height || 1}`} role="img" aria-label={`${aspect} saved shot composition`}>
        {rendered.map(layer => {
          const p = projectLayer(layer.transform, camera, size, layer.svg?.viewBox ?? { x: 0, y: 0, width: 130, height: 200 });
          if (!p) return null;
          return <g key={layer.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}>
            {renderer === 'svg' && layer.svg ? <svg x={-p.width / 2} y={-p.height / 2} width={p.width} height={p.height} viewBox={`${layer.svg.viewBox.x} ${layer.svg.viewBox.y} ${layer.svg.viewBox.width} ${layer.svg.viewBox.height}`} opacity={layer.opacity ?? 1}><SvgContent node={layer.svg.root} scopeId={`player-${layer.id}`} /></svg> : null}
            {layer.svg && document.audioTracks.some(track => track.shotId === shot.id && track.kind === 'foley' && track.boundLayerId === layer.id) ? <AudioGlow runtime={audio} svg={layer.svg} layerId={layer.id} enabled={settings.reactiveGlow} width={p.width} height={p.height} /> : null}
            {!layer.svg ? <text textAnchor="middle" className="player-missing">{layerName(document, document.layers.find(item => item.id === layer.id)!)} · source unavailable</text> : null}
          </g>;
        })}
      </svg>
      {layers.length === 0 ? <div className="player-frame-empty"><h2>No layers in this shot</h2><p>Select another shot to continue.</p></div> : null}
    </div></div>
    <div className="player-transport"><button className="player-button player-play" disabled={!layers.length} onClick={togglePlayback}>{preview.playing ? 'Pause' : 'Play'}</button>
      <label className="player-seek"><span className="sr-only">Seek player</span><input aria-label="Seek player" type="range" min={0} max={shot.durationMs} step={1} value={preview.timeMs} onChange={event => playback.seek(Number(event.target.value))} /></label>
      <output className="player-time" aria-live="off" aria-label="Player time">{timeLabel(preview.timeMs)} / {timeLabel(shot.durationMs)}</output>
      <button className="player-button" disabled={!hasAudio || audioStatus.state === 'loading' || audioStatus.state === 'unsupported'} onClick={() => { if (audioStatus.enabled) audio.disable(); else void audio.enable(); }}>{audioStatus.state === 'loading' ? 'Loading audio…' : audioStatus.enabled ? 'Disable audio' : audioStatus.state === 'error' ? 'Retry audio' : 'Enable audio'}</button>
    </div>
    <div className="player-audio"><p role={audioStatus.state === 'error' ? 'alert' : 'status'}>{hasAudio ? audioStatus.message : 'No audio tracks in this shot.'}</p>
      {hasAudio ? <div className="player-audio-settings"><label>Volume<input type="range" aria-label="Player volume" min={0} max={1} step={.01} value={settings.masterGain} onChange={event => updateSettings({ masterGain: Number(event.target.value) })} /></label><label><input type="checkbox" checked={settings.reactiveGlow} onChange={event => updateSettings({ reactiveGlow: event.target.checked })} />Reactive glow</label></div> : null}
    </div>
    <div className="player-caption"><span>{aspect} · {renderer === 'webgl2' ? 'WebGL2' : 'SVG fallback'} · Revision {document.project.revision}</span><p id="player-keyboard">Focus the stage: Space to play or pause · Arrow keys to seek</p></div>
  </section>;
}
