import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../player-manifest.schema.json';
import type { PlayerManifestWire } from './player-manifest.generated';
import { validateCdom, type CdomDocument, type ValidationIssue } from './index';
import { validateSvgAsset } from './svg';
import { hasNonScalarText } from './portable';
import { evaluateAssetUse, type EvidenceBlob, type ExportUse } from './asset-rights';
import { sha256Bytes, svgPayloadHash } from './asset-hash';

export type PlayerAsset = PlayerManifestWire['assets'][number];
export type PlayerManifest = Omit<PlayerManifestWire, 'document'> & { document: CdomDocument };
type Result = {valid:true;manifest:PlayerManifest} | {valid:false;issues:ValidationIssue[]};
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_AUDIO = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const validate = new Ajv2020({strict:true,allErrors:false}).compile<PlayerManifestWire>(schema);
const fail = (message:string): Result => ({valid:false,issues:[{path:'/',message}]});

/** Reject recursion, non-JSON values and excessive work before recursive validators run. */
function bounded(value:unknown): boolean {
  const pending = [{value,depth:0}];
  const seen = new Set<object>();
  let count = 0, bytes = 0;
  while (pending.length) {
    const {value,depth} = pending.pop()!;
    if (++count > 200000 || depth > 32) return false;
    if (typeof value === 'number') { if (!Number.isFinite(value)) return false; bytes += 32; }
    else if (typeof value === 'string') {
      if (hasNonScalarText(value)) return false;
      bytes += encoder.encode(value).length + 2;
    } else if (value !== null && typeof value === 'object') {
      if (seen.has(value) || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return false;
      seen.add(value);
      for (const [key,child] of Object.entries(value)) {
        if (hasNonScalarText(key)) return false;
        bytes += encoder.encode(key).length + 4;
        pending.push({value:child,depth:depth+1});
      }
    } else if (value !== null && typeof value !== 'boolean') return false;
    if (bytes > MAX_BYTES) return false;
  }
  return encoder.encode(JSON.stringify(value)).length <= MAX_BYTES;
}

/** Canonical base64 plus the same bounded PCM16 RIFF rules as the local API reader. */
export function decodeManifestAudio(base64:string): ArrayBuffer {
  const invalid = () => new Error('Audio must be canonical base64 containing a bounded PCM16 mono or stereo WAV.');
  if (typeof base64 !== 'string' || base64.length > Math.ceil(MAX_AUDIO/3)*4 || base64.length%4 || /[^A-Za-z0-9+/=]/.test(base64)) throw invalid();
  const binary = atob(base64);
  if (btoa(binary) !== base64 || binary.length < 44 || binary.length > MAX_AUDIO) throw invalid();
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const tag = (offset:number) => String.fromCharCode(...bytes.subarray(offset,offset+4));
  if (tag(0)!=='RIFF' || tag(8)!=='WAVE' || view.getUint32(4,true)!==bytes.length-8) throw invalid();
  let position=12, format:number[]|undefined, dataSize:number|undefined;
  while (position < bytes.length) {
    if (position+8 > bytes.length) throw invalid();
    const kind=tag(position), size=view.getUint32(position+4,true), start=position+8;
    position=start+size+(size%2);
    if (position>bytes.length) throw invalid();
    if (kind==='fmt ') {
      if (format || size!==16 || dataSize!==undefined) throw invalid();
      format=[view.getUint16(start,true),view.getUint16(start+2,true),view.getUint32(start+4,true),view.getUint32(start+8,true),view.getUint16(start+12,true),view.getUint16(start+14,true)];
    } else if (kind==='data') {
      if (dataSize!==undefined || !format) throw invalid();
      dataSize=size;
    }
  }
  if (!format || dataSize===undefined) throw invalid();
  const [encoding,channels,rate,byteRate,alignment,bits]=format;
  if (encoding!==1 || ![1,2].includes(channels) || rate<8000 || rate>48000 || bits!==16 || alignment!==channels*2 || byteRate!==rate*alignment || !dataSize || dataSize%alignment || dataSize>rate*alignment*30) throw invalid();
  return bytes.buffer;
}

function references(document:CdomDocument): Set<string> {
  const ids=new Set<string>();
  const pending:unknown[]=[document];
  while (pending.length) {
    const value=pending.pop();
    if (value && typeof value==='object') {
      if ('id' in value && typeof value.id==='string') {
        if (ids.has(value.id)) throw new Error('Document IDs must be globally unique.');
        ids.add(value.id);
      }
      for (const child of Object.values(value)) pending.push(child);
    }
  }
  const has = (list:{id:string}[], id:string|null) => id===null || list.some(item=>item.id===id);
  const unique = (list:string[]) => new Set(list).size===list.length;
  if (!has(document.branches,document.project.activeBranchId)) throw new Error('Active branch is missing.');
  for (const branch of document.branches) if (!has(document.branches,branch.parentId)) throw new Error('Branch parent is missing.');
  for (const scene of document.scenes) {
    if (!unique(scene.shotIds) || !unique(scene.eventIds) || scene.shotIds.some(id=>!document.shots.some(shot=>shot.id===id && shot.sceneId===scene.id)) || scene.eventIds.some(id=>!document.events.some(event=>event.id===id && event.sceneId===scene.id))) throw new Error('Scene membership is invalid.');
  }
  for (const event of document.events) if (!document.scenes.some(scene=>scene.id===event.sceneId && scene.eventIds.includes(event.id))) throw new Error('Event membership is invalid.');
  const used=new Set<string>();
  for (const shot of document.shots) {
    if (!document.scenes.some(scene=>scene.id===shot.sceneId && scene.shotIds.includes(shot.id)) || !unique(shot.layerIds) || !unique(shot.audioTrackIds)) throw new Error('Shot membership is invalid.');
    for (const id of shot.layerIds) if (!document.layers.some(layer=>layer.id===id && layer.shotId===shot.id)) throw new Error('Layer membership is invalid.');
    for (const id of shot.audioTrackIds) if (!document.audioTracks.some(track=>track.id===id && track.shotId===shot.id)) throw new Error('Track membership is invalid.');
    for (const override of Object.values(shot.layoutOverrides)) for (const id of Object.keys(override.layerTransforms)) if (!shot.layerIds.includes(id)) throw new Error('Layout override membership is invalid.');
  }
  for (const layer of document.layers) {
    if (!document.shots.some(shot=>shot.id===layer.shotId && shot.layerIds.includes(layer.id)) || !has(document.characters,layer.characterId)) throw new Error('Layer references are invalid.');
    if (layer.kind!=='svg_plane' && layer.kind!=='character_sprite') throw new Error('Only SVG planes and character sprites are supported by this player.');
    if (!document.assets.some(asset=>asset.id===layer.assetId && asset.kind==='svg')) throw new Error('Layer SVG asset is missing.');
    used.add(layer.assetId);
    if (layer.keyframes?.some(frame=>frame.timeMs>document.shots.find(shot=>shot.id===layer.shotId)!.durationMs)) throw new Error('Keyframe exceeds shot duration.');
  }
  for (const track of document.audioTracks) {
    if (!document.shots.some(shot=>shot.id===track.shotId && shot.audioTrackIds.includes(track.id)) || !document.assets.some(asset=>asset.id===track.assetId && asset.kind==='audio') || (track.boundLayerId!==null && !document.layers.some(layer=>layer.id===track.boundLayerId && layer.shotId===track.shotId))) throw new Error('Audio track references are invalid.');
    used.add(track.assetId);
  }
  for (const character of document.characters) for (const constraint of character.constraints) if (!has(document.events,constraint.effectiveFromEventId) || !has(document.events,constraint.resolvedByEventId)) throw new Error('Constraint event is missing.');
  for (const binding of document.bindings) if (!ids.has(binding.source.entityId) || !ids.has(binding.target.entityId)) throw new Error('Binding reference is missing.');
  return used;
}

export function validatePlayerManifest(value:unknown): Result {
  try {
    if (!bounded(value)) return fail('Manifest exceeds portable JSON bounds (32 MiB, depth 32, 200000 nodes), or contains nonportable values.');
    if (!validate(value)) return fail('Invalid player manifest structure.');
    const canonical=validateCdom(value.document);
    if (!canonical.valid) return {valid:false,issues:canonical.issues};
    const used=references(canonical.document), entries=new Set<string>();
    const evidence: EvidenceBlob[] = value.evidence ?? [];
    const exportUse: ExportUse = value.exportUse ?? 'private_preview';
    const requiredEvidence = new Set<string>();
    const hashes = new Set<string>();
    const rawBindings = new Map<string,string>(), payloadBindings = new Map<string,string>();
    for (const blob of evidence) {
      if (hashes.has(blob.sha256) || blob.uri!==`assets/evidence/${blob.sha256}.txt` || encoder.encode(blob.text).length>65536 || sha256Bytes(encoder.encode(blob.text))!==blob.sha256) return fail('Evidence integrity or uniqueness check failed.');
      hashes.add(blob.sha256);
    }
    for (const entry of value.assets) {
      const metadata=canonical.document.assets.find(asset=>asset.id===entry.assetId);
      if (!used.has(entry.assetId) || entries.has(entry.assetId) || !metadata || metadata.kind!==entry.kind || metadata.rights==='unknown') return fail('Manifest assets must exactly match referenced media with known rights.');
      entries.add(entry.assetId);
      const provenance = metadata.provenance;
      const refs = new Set(provenance?.evidence.map(ref=>ref.sha256) ?? []);
      for (const digest of refs) requiredEvidence.add(digest);
      const decision = evaluateAssetUse(metadata, exportUse, evidence.filter(blob=>refs.has(blob.sha256)));
      if (!decision.allowed) return fail(`Asset ${entry.assetId}: ${decision.reasons.join('; ')}`);
      if (provenance) {
        for (const binding of [provenance.original, provenance.current]) {
          const namedDigest = /^assets\/(?:originals|imported)\/([a-f0-9]{64})\.(?:svg|wav)$/.exec(binding.uri);
          if ((rawBindings.has(binding.uri) && rawBindings.get(binding.uri)!==binding.sha256) || (namedDigest && namedDigest[1]!==binding.sha256)) return fail(`Asset ${entry.assetId}: immutable URI/raw hash mismatch.`);
          rawBindings.set(binding.uri,binding.sha256);
        }
        if (payloadBindings.has(provenance.current.uri) && payloadBindings.get(provenance.current.uri)!==provenance.current.payloadSha256) return fail(`Asset ${entry.assetId}: shared current URI/payload hash mismatch.`);
        payloadBindings.set(provenance.current.uri,provenance.current.payloadSha256);
      }
      let payloadHash: string;
      if (entry.kind==='svg') {
        if (entry.svg.assetId!==entry.assetId || entry.svg.uri!==metadata.uri || entry.svg.sourceUri!==(metadata.sourceUri??metadata.uri)) return fail('SVG identity does not match saved metadata.');
        const svg=validateSvgAsset(entry.svg); if (!svg.valid) return svg;
        payloadHash=svgPayloadHash(entry.svg);
      } else payloadHash=sha256Bytes(new Uint8Array(decodeManifestAudio(entry.dataBase64)));
      if (provenance && (payloadHash!==provenance.current.payloadSha256 || (entry.kind==='audio' && payloadHash!==provenance.current.sha256))) return fail(`Asset ${entry.assetId}: media payload integrity check failed.`);
    }
    if (entries.size!==used.size) return fail('Referenced media is missing from the manifest.');
    if (hashes.size!==requiredEvidence.size || [...hashes].some(hash=>!requiredEvidence.has(hash))) return fail('Evidence must exactly cover the included media.');
    return {valid:true,manifest:value as PlayerManifest};
  } catch (error) { return fail(error instanceof Error ? error.message : 'Invalid player manifest.'); }
}

/** Bound raw input and JSON nesting before JSON.parse or recursive validation. */
export function parsePlayerManifest(text:string): Result {
  if (typeof text!=='string' || encoder.encode(text).length>MAX_BYTES) return fail('Manifest JSON exceeds 32 MiB.');
  let depth=0, quoted=false, escaped=false;
  for (const char of text) {
    if (quoted) { if (escaped) escaped=false; else if (char==='\\') escaped=true; else if (char==='"') quoted=false; }
    else if (char==='"') quoted=true;
    else if (char==='{' || char==='[') { if (++depth>33) return fail('Manifest JSON exceeds depth 32.'); }
    else if (char==='}' || char===']') depth--;
  }
  try { return validatePlayerManifest(JSON.parse(text)); } catch { return fail('Manifest JSON is malformed.'); }
}
