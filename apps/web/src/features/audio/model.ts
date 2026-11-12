import type { CdomDocument } from '@aether-dom/schema';
import { interpolateTransform, type Transform } from '../stage/geometry';

type Binding = CdomDocument['bindings'][number];
export type DerivedAudioTrack = { id: string; assetId: string; gainDb: number; pan: number; position: { x: number; y: number; z: number }; boundLayerId: string | null };
export type EvaluatedAudio = { tension: number; tracks: DerivedAudioTrack[]; coverage: { supportedBindingIds: string[]; unsupportedBindingIds: string[] } };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const safeDb = (value: number) => Number.isFinite(value) ? clamp(value, -80, 0) : -80;
const normalized = (value: number) => clamp(value, 0, 1);

// Bindings never execute code or traverse arbitrary object paths.
function sourceValue(document: CdomDocument, binding: Binding): number | null {
  const match = /^traits\.([A-Za-z0-9_]+)$/.exec(binding.source.path);
  if (!match) return null;
  const traits = document.characters.find(character => character.id === binding.source.entityId)?.traits;
  const value = traits && Object.hasOwn(traits, match[1]) ? traits[match[1]] : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapValue(binding: Binding, value: number): number | null {
  const mapping = binding.mapping;
  if (mapping.kind === 'identity') return Number.isFinite(value) ? value : null;
  const { inputMin, inputMax, outputMin, outputMax } = mapping;
  const width = inputMax - inputMin;
  if (![inputMin, inputMax, outputMin, outputMax, width].every(Number.isFinite) || width <= 0) return null;
  const fraction = clamp((value - inputMin) / width, 0, 1);
  const result = outputMin * (1 - fraction) + outputMax * fraction;
  return Number.isFinite(result) ? result : null;
}

function blockedBindings(document: CdomDocument): Set<string> {
  const blocked = new Set<string>();
  const edges = new Map<string, string[]>();
  const targets = new Map<string, Binding[]>();
  for (const binding of document.bindings) {
    edges.set(binding.source.entityId, [...(edges.get(binding.source.entityId) ?? []), binding.target.entityId]);
    const key = `${binding.target.entityId}\0${binding.target.path}`;
    targets.set(key, [...(targets.get(key) ?? []), binding]);
  }
  for (const group of targets.values()) if (group.length > 1) group.forEach(binding => blocked.add(binding.id));
  const reaches = (start: string, goal: string) => {
    const pending = [start]; const seen = new Set<string>();
    while (pending.length) {
      const id = pending.pop()!;
      if (id === goal) return true;
      if (seen.has(id)) continue;
      seen.add(id); pending.push(...(edges.get(id) ?? []));
    }
    return false;
  };
  for (const binding of document.bindings) if (reaches(binding.target.entityId, binding.source.entityId)) blocked.add(binding.id);
  return blocked;
}

function musicBindings(document: CdomDocument, shotId: string | null, blocked: Set<string>) {
  const shot = document.shots.find(candidate => candidate.id === shotId);
  return document.bindings.filter(binding => !blocked.has(binding.id) && binding.target.path === 'gainDb'
    && document.audioTracks.some(track => track.id === binding.target.entityId && track.shotId === shotId && track.kind === 'music' && shot?.audioTrackIds.includes(track.id))
    && sourceValue(document, binding) !== null && mapValue(binding, sourceValue(document, binding)!) !== null);
}

export function initialTension(document: CdomDocument, shotId: string | null): number {
  const shot = document.shots.find(candidate => candidate.id === shotId);
  if (!shot) return 0;
  const authored = (shot as typeof shot & { audio?: { tension: number } }).audio?.tension;
  if (typeof authored === 'number' && Number.isFinite(authored)) return normalized(authored);
  const bindings = musicBindings(document, shotId, blockedBindings(document));
  const values = bindings.map(binding => sourceValue(document, binding)!);
  // Multiple different source signals have no defined shared tension.
  return values.length && values.every(value => value === values[0]) ? normalized(values[0]) : 0;
}

export function evaluateAudio(document: CdomDocument, shotId: string | null, timeMs: number, tensionPreview: number | null = null, animate = false, drafts: ReadonlyMap<string, Transform> = new Map()): EvaluatedAudio {
  const shot = document.shots.find(candidate => candidate.id === shotId);
  const tension = tensionPreview !== null && Number.isFinite(tensionPreview) ? normalized(tensionPreview) : initialTension(document, shotId);
  const authoredTension = (shot as typeof shot & { audio?: { tension: number } })?.audio?.tension;
  const overridden = (tensionPreview !== null && Number.isFinite(tensionPreview)) || (typeof authoredTension === 'number' && Number.isFinite(authoredTension));
  const blocked = blockedBindings(document);
  const music = musicBindings(document, shotId, blocked);
  const supported = new Set(music.map(binding => binding.id));
  const tracks = !shot ? [] : shot.audioTrackIds.flatMap(id => {
    const track = document.audioTracks.find(candidate => candidate.id === id && candidate.shotId === shotId);
    if (!track) return [];
    const gainBinding = music.find(binding => binding.target.entityId === id);
    const hasGainBinding = document.bindings.some(binding => binding.target.entityId === id && binding.target.path === 'gainDb');
    let gainDb = safeDb(track.gainDb);
    if (gainBinding) gainDb = safeDb(mapValue(gainBinding, overridden ? tension : sourceValue(document, gainBinding)!)!);
    else if (track.kind === 'music' && !hasGainBinding) gainDb = tension >= 1 ? -80 : safeDb(track.gainDb + 20 * Math.log10(Math.cos(tension * Math.PI / 2)));
    const layer = document.layers.find(candidate => candidate.id === track.boundLayerId && candidate.shotId === shotId && shot.layerIds.includes(candidate.id));
    const transform = layer ? drafts.get(layer.id) ?? (animate ? interpolateTransform(layer, timeMs) : layer.transform) : null;
    const camera = shot.camera.position;
    const position = transform ? { x: transform.x - camera.x, y: transform.y - camera.y, z: transform.z - camera.z } : { x: 0, y: 0, z: -1 };
    if (!Object.values(position).every(Number.isFinite)) Object.assign(position, { x: 0, y: 0, z: -1 });
    for (const binding of document.bindings) {
      if (layer && !blocked.has(binding.id) && binding.source.entityId === layer.id && binding.source.path === 'transform.x' && binding.target.entityId === id && binding.target.path === 'spatial.x' && binding.mapping.kind === 'identity') supported.add(binding.id);
    }
    return [{ id, assetId: track.assetId, gainDb, pan: clamp(position.x / 2, -1, 1), position, boundLayerId: layer?.id ?? null }];
  });
  return { tension, tracks, coverage: {
    supportedBindingIds: document.bindings.filter(binding => supported.has(binding.id)).map(binding => binding.id),
    unsupportedBindingIds: document.bindings.filter(binding => !supported.has(binding.id)).map(binding => binding.id),
  } };
}
