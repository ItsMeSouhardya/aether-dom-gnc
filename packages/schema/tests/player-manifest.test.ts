import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/sample.cdom.json';
import portable from '../fixtures/player-manifest.json';
import cases from '../fixtures/player-manifest-cases.json';
import { decodeManifestAudio, parsePlayerManifest, validatePlayerManifest, validateCommand } from '../src/index';

describe('portable player boundary', () => {
  it.each(cases)('shared fixture: $name', testCase => {
    const value = structuredClone(portable);
    if (testCase.path.length) {
      let parent: unknown = value;
      for (const key of testCase.path.slice(0,-1)) parent = (parent as Record<string,unknown>)[key];
      (parent as Record<string,unknown>)[testCase.path.at(-1)!] = testCase.value;
    }
    expect(validatePlayerManifest(value).valid).toBe(testCase.valid);
  });
  it('accepts the raw portable fixture and rejects malformed/deep text', () => {
    expect(parsePlayerManifest(JSON.stringify(portable)).valid).toBe(true);
    expect(parsePlayerManifest('{').valid).toBe(false);
    expect(parsePlayerManifest('['.repeat(5000)).valid).toBe(false);
    const audio=portable.assets.find(entry=>entry.kind==='audio')!;
    expect(decodeManifestAudio(audio.dataBase64!).byteLength).toBe(46);
  });
  it('requires full bounded portrait transforms in command0.6', () => {
    const command = {commandId:'portrait', projectId:'p',branchId:'b',expectedRevision:0,
      actor:{kind:'human',id:'creator'},reason:'Portrait',op:'setShotLayoutOverride',targetId:'s',
      args:{aspectRatio:'9:16',layerTransforms:{layer:{x:1,y:2,z:3,scale:1,rotationDeg:0}}}};
    expect(validateCommand(command).valid).toBe(true);
    expect(validateCommand({...command,args:{aspectRatio:'9:16',layerTransforms:null}}).valid).toBe(true);
    expect(validateCommand({...command,args:{aspectRatio:'9:16',layerTransforms:{layer:{x:1}}}}).valid).toBe(false);
    expect(validateCommand({...command,args:{...command.args,layerTransforms:Object.fromEntries(Array.from({length:65},(_,i)=>[String(i),command.args.layerTransforms.layer]))}}).valid).toBe(false);
  });
  it('rejects absent media, cycles and excessive depth before schema recursion', () => {
    expect(validatePlayerManifest({manifestVersion:'1.0.0', document:fixture, assets:[]}).valid).toBe(false);
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(validatePlayerManifest(cyclic).valid).toBe(false);
    let deep: unknown = {}; for (let i=0;i<40;i++) deep = {child:deep};
    expect(validatePlayerManifest(deep).valid).toBe(false);
  });
  it('requires strict canonical base64 and a complete bounded PCM16 WAV', () => {
    for (const value of ['', 'AAAA\n', 'AA=', 'AB==', 'AAAA', '!!!!']) {
      expect(() => decodeManifestAudio(value)).toThrow();
    }
  });
});
