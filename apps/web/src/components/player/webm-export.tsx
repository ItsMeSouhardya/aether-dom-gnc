'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { validatePlayerManifest, type ExportUse, type PlayerManifest } from '@aether-dom/schema';
import type { Aspect } from '../../features/stage/composition';
import { decisionsForUse } from '../../features/export/asset-use';
import { recordWebM, webMSupport } from '../../features/export/record-webm';

const subscribe = () => () => {};
const serverCodec = () => null;
const browserCodec = () => webMSupport().codec;

export function WebMExport({ manifest, shotId, aspect, onStart }: { manifest: PlayerManifest; shotId: string; aspect: Aspect; onStart: () => void }) {
  const shot = manifest.document.shots.find(shot => shot.id === shotId);
  const maxMs = Math.min(shot?.durationMs ?? 0, 30000);
  const [duration, setDuration] = useState(String(Math.min(maxMs, 3000) / 1000));
  const [use, setUse] = useState<ExportUse>(manifest.exportUse ?? 'private_preview');
  const decisions = decisionsForUse(manifest, use);
  const allowed = decisions.every(decision => decision.allowed);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ error: false, message: '' });
  const [result, setResult] = useState<{ url: string; name: string; size: number; sourceUrl: string } | null>(null);
  const controller = useRef<AbortController | null>(null), outputUrl = useRef<string | null>(null), sourceUrl = useRef<string | null>(null);
  const codec = useSyncExternalStore(subscribe, browserCodec, serverCodec);
  const helpId = useId();
  const durationMs = Number(duration) * 1000;
  const valid = duration.trim() !== '' && Number.isFinite(durationMs) && durationMs >= 1 && durationMs <= maxMs;
  useEffect(() => {
    // Changing shot/aspect or opening another file unmounts this scope.
    const cancel = () => controller.current?.abort();
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener('pagehide', cancel); document.addEventListener('visibilitychange', hidden);
    return () => { const operation = controller.current; controller.current = null; operation?.abort(); window.removeEventListener('pagehide', cancel); document.removeEventListener('visibilitychange', hidden); if (outputUrl.current) URL.revokeObjectURL(outputUrl.current); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); };
  }, []);

  function clearResult() {
    if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    outputUrl.current = null; sourceUrl.current = null; setResult(null);
  }

  async function record() {
    if (controller.current || !valid || !codec || !allowed) return;
    const captured = manifest.manifestVersion === '1.0.0' ? manifest : { ...manifest, exportUse: use };
    const validation = validatePlayerManifest(captured);
    if (!validation.valid) { setStatus({ error: true, message: validation.issues[0]?.message ?? 'This use is blocked.' }); return; }
    const operation = new AbortController(); controller.current = operation;
    clearResult(); setBusy(true); setProgress(0);
    setStatus({ error: false, message: 'Preparing embedded sources…' });
    try {
      onStart();
      const blob = await recordWebM(validation.manifest, { shotId, aspect, durationMs, includeAudio, signal: operation.signal, onProgress: fraction => {
        if (controller.current !== operation) return;
        setProgress(fraction); setStatus({ error: false, message: fraction < 1 ? 'Encoding in this browser. Keep this tab visible.' : 'Encoding complete.' });
      } });
      if (operation.signal.aborted) return;
      const url = URL.createObjectURL(blob); outputUrl.current = url;
      const jsonUrl = URL.createObjectURL(new Blob([JSON.stringify(validation.manifest)], { type: 'application/json' })); sourceUrl.current = jsonUrl;
      setResult({ url, sourceUrl: jsonUrl, name: `${manifest.document.project.id}-${manifest.document.project.activeBranchId}-${shotId}-${aspect.replace(':', 'x')}.webm`, size: blob.size });
      setStatus({ error: false, message: 'WebM is ready to download.' });
    } catch (error) {
      if (controller.current !== operation) return;
      if (operation.signal.aborted) setStatus({ error: false, message: 'Recording canceled. No partial file was saved.' });
      else setStatus({ error: true, message: error instanceof Error ? error.message : 'WebM recording failed. Try again or export portable JSON from the studio.' });
    } finally {
      if (controller.current === operation) { controller.current = null; setBusy(false); }
    }
  }

  return <section className="player-export" aria-label="WebM preview export" aria-busy={busy}>
    <div className="player-export-heading"><h2>WebM preview</h2><p>Encode this saved {aspect} shot from the start in this browser.</p></div>
    <label className="player-export-use">Export use <select value={use} disabled={busy} onChange={event => { clearResult(); setUse(event.target.value as ExportUse); }}><option value="private_preview">Private preview</option><option value="public_distribution">Public distribution</option><option value="commercial_pack">Commercial pack</option></select></label>
    {decisions.filter(decision => !decision.allowed).map(decision => <p role="alert" key={decision.assetId}>Asset {decision.assetId}: {decision.reasons.join('; ')}. Review asset evidence in the studio or open a corrected file.</p>)}
    {decisions.flatMap(decision => decision.attribution.map(text => <p key={`${decision.assetId}:${text}`}>Attribution: {text}</p>))}
    <div className="player-export-controls">
      <label>Clip duration <span className="player-export-unit">(seconds)</span><input aria-label="WebM clip duration" type="number" inputMode="decimal" min={.001} max={maxMs / 1000} step={.001} value={duration} disabled={busy} aria-invalid={!valid} aria-describedby={helpId} onChange={event => { clearResult(); setDuration(event.target.value); }} /></label>
      <label className="player-export-audio"><input type="checkbox" checked={includeAudio} disabled={busy} onChange={event => { clearResult(); setIncludeAudio(event.target.checked); }} />Include audio</label>
      <button className="player-button" type="button" disabled={busy || !codec || !valid || !allowed} onClick={() => { void record(); }}>{busy ? 'Recording…' : 'Record WebM'}</button>
      {busy ? <button className="player-button" type="button" onClick={() => controller.current?.abort()}>Cancel recording</button> : null}
      {result ? <a className="player-button" href={result.url} download={result.name}>Download WebM <span className="player-export-size">({(result.size / 1024 / 1024).toFixed(1)} MiB)</span></a> : null}
    </div>
    {result ? <div className="player-export-companion"><a className="player-button" href={result.sourceUrl} download="source-and-evidence.cdom.json">Source + evidence JSON</a><p>The WebM itself carries no evidence ledger. This full portable bundle includes the saved project, embedded media and evidence. Retain it privately with the video for records; required attribution is shown above.</p></div> : null}
    {busy ? <progress aria-label="WebM recording progress" max={1} value={progress} /> : null}
    <p id={helpId} className="player-export-note">Up to {Math.min(maxMs / 1000, 30)} seconds of this shot; maximum 30 seconds and 64 MiB. {codec ? `${codec} · 24fps · up to 720p.` : 'WebM needs a supported desktop browser; portable JSON remains available in the studio.'} Recording runs in real time; empty video or incomplete audio triggers local VP8/Opus frame encoding, which may run faster. Audio uses the saved stereo mix at the default listening level. Reactive glow is excluded. Custom or inherited SVG fonts require text converted to paths or an explicit generic font.</p>
    {status.message ? <p role={status.error ? 'alert' : 'status'} className="player-export-status">{status.message}</p> : null}
    {!valid ? <p role="alert" className="player-export-status">Enter a duration from 0.001 to {maxMs / 1000} seconds.</p> : null}
  </section>;
}
