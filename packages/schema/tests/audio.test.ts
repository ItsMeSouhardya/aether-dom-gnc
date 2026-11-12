import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/sample.cdom.json';
import { validateCdom, validateCommand } from '../src';

describe('authored shot tension', () => {
  it('accepts optional audio only in v3 and preserves stage fields', () => {
    const document = structuredClone(fixture);
    document.schemaVersion = '0.3.0';
    Object.assign(document.shots[0], { audio: { tension: 0.7 } });
    Object.assign(document.layers[0], { visible: false, opacity: 0.5 });
    expect(validateCdom(document).valid).toBe(true);
    document.schemaVersion = '0.2.0';
    expect(validateCdom(document).valid).toBe(false);
    document.schemaVersion = '0.1.0';
    expect(validateCdom(document).valid).toBe(false);
  });
  it.each([{}, { tension: -0.01 }, { tension: 1.01 }, { tension: null }, { tension: true }, { tension: Infinity }, { tension: 0.5, gain: 1 }])('rejects invalid audio %j', audio => {
    const document = structuredClone(fixture);
    document.schemaVersion = '0.3.0';
    Object.assign(document.shots[0], { audio });
    expect(validateCdom(document).valid).toBe(false);
  });
  it('accepts bounded tension commands and rejects hidden operations or extra fields', () => {
    const command = { commandId:'c', projectId:'p', branchId:'b', expectedRevision:0, actor:{kind:'human',id:'u'}, reason:'Tension', op:'setShotTension', targetId:'s', args:{tension:0.7} };
    expect(validateCommand(command).valid).toBe(true);
    for (const args of [{}, {tension:-1}, {tension:2}, {tension:NaN}, {tension:true}, {tension:0.2, gain:1}]) expect(validateCommand({...command,args}).valid).toBe(false);
    expect(validateCommand({...command,op:'restoreAudioSnapshot'}).valid).toBe(false);
  });
});
