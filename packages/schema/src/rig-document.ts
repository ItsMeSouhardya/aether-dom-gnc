import { validateRig } from './rigs';
import type { CdomDocumentV5 } from './cdom-v5.generated';
import type { ValidationIssue } from './index';

export function validateDocumentRigs(document: CdomDocumentV5): ValidationIssue[] {
  const fail = (message: string): ValidationIssue[] => [{path:'/layers',message}];
  const ids = new Set<string>();
  let duplicate = false;
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (value && typeof value === 'object') {
      for (const [key,child] of Object.entries(value)) {
        if (key === 'id' && typeof child === 'string') { if (ids.has(child)) duplicate = true; ids.add(child); }
        else walk(child);
      }
    }
  };
  walk(document);
  if (duplicate) return fail('Duplicate canonical entity ID');
  for (const layer of document.layers) {
    if (!layer.rig) continue;
    const valid = validateRig(layer.rig);
    if (!valid.valid) return valid.issues;
    const shots = document.shots.filter(s => s.id === layer.shotId && s.layerIds.includes(layer.id));
    if (layer.kind !== 'character_sprite' || !layer.characterId || !document.characters.some(c => c.id === layer.characterId)
      || !document.assets.some(a => a.id === layer.assetId && a.kind === 'svg') || shots.length !== 1
      || document.shots.filter(s => s.layerIds.includes(layer.id)).length !== 1) return fail('Invalid rig ownership');
    if (layer.rig.bones.some(b => (b.keyframes ?? []).some(f => f.timeMs > shots[0].durationMs))) return fail('Rig frame exceeds shot duration');
  }
  return [];
}
