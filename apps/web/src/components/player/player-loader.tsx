'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { PlayerManifest } from '@aether-dom/schema';
import { loadPlayerManifest, readPlayerFile } from '../../lib/player-api';
import { Icon } from '../studio/icons';
import { PlayerSession } from './player-session';

type State = { kind: 'loading'; message: string } | { kind: 'error'; message: string } | { kind: 'ready'; manifest: PlayerManifest; source: string; session: number };

export function PlayerLoader({ projectId = 'proj_neon_shogun', branchId = 'branch_main', revision, initialError }: { projectId?: string; branchId?: string; revision?: number; initialError?: string }) {
  const [state, setState] = useState<State>(() => initialError ? { kind: 'error', message: initialError } : { kind: 'loading', message: 'Loading the saved composition and its embedded sources.' });
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0), pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (initialError) return;
    const request = ++generation.current, controller = new AbortController(); pending.current = controller;
    void loadPlayerManifest(projectId, branchId, revision, controller.signal).then(manifest => {
      if (generation.current === request && !controller.signal.aborted) setState({ kind: 'ready', manifest, source: 'Saved project', session: request });
    }).catch((error: unknown) => {
      if (generation.current === request && !controller.signal.aborted) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to load the player. Try again or open a local JSON file.' });
    });
    return () => { controller.abort(); };
  }, [projectId, branchId, revision, initialError, attempt]);

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    pending.current?.abort();
    const request = ++generation.current;
    setState({ kind: 'loading', message: 'Checking the local JSON file and its embedded sources.' });
    try {
      const manifest = await readPlayerFile(file);
      if (mounted.current && generation.current === request) setState({ kind: 'ready', manifest, source: `Local file · ${file.name}`, session: request });
    } catch (error) {
      if (mounted.current && generation.current === request) setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to read this file. Open an exported JSON bundle.' });
    }
  }
  function retry() {
    setState({ kind: 'loading', message: 'Loading the saved composition and its embedded sources.' });
    setAttempt(value => value + 1);
  }
  return <main className="player" id="player">
    <a className="skip-link" href="#player-content">Skip to player</a>
    <header className="player-header"><Link className="studio-wordmark" href="/" aria-label="AETHER-DOM studio"><Icon name="brand" /><span>AETHER-DOM</span></Link>
      <span className="player-header-label">Player</span>
      <nav aria-label="Player actions"><label className="player-file">Open JSON<input type="file" accept=".json,application/json" aria-label="Open local player JSON" onChange={event => { void openFile(event); }} /></label><Link className="player-button" href="/">Back to studio</Link></nav>
    </header>
    <div id="player-content" tabIndex={-1} className="player-content">
      {state.kind === 'ready' ? <PlayerSession key={state.session} manifest={state.manifest} source={state.source} />
        : <section className="player-message" aria-busy={state.kind === 'loading'}><h1>{state.kind === 'loading' ? 'Opening player…' : 'Player unavailable'}</h1><p role={state.kind === 'error' ? 'alert' : 'status'}>{state.message}</p>{state.kind === 'error' && !initialError ? <button className="player-button" onClick={retry}>Try again</button> : null}</section>}
    </div>
    <footer className="player-footer">Read-only playback · Saved compositions only. Drafts stay in the studio. Local files stay on this device.</footer>
  </main>;
}
