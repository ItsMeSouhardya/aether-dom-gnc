import { afterEach, describe, expect, it, vi } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import { loadProject, submitCommand, parseProjectSnapshot, ProjectApiError } from '../src/lib/project-api';

const snapshot = { document: sample, history: { canUndo: false, canRedo: false, entries: [] } };
const command = { commandId: 'cmd_one', projectId: 'proj_neon_shogun', branchId: 'branch_main', expectedRevision: 0, actor: { kind: 'human', id: 'local_creator' }, reason: 'Move Kael', op: 'setLayerTransform', targetId: 'layer_kael', args: { x: 0.2 } };
afterEach(() => vi.unstubAllGlobals());

describe('persisted project boundary', () => {
  it('loads a validated persisted snapshot with history availability', async () => {
    vi.stubGlobal('fetch', async () => Response.json(snapshot));
    const loaded = await loadProject();
    expect(loaded.document.layers[1].transform.x).toBe(-0.65);
    expect(loaded.history.canUndo).toBe(false);
  });
  it('rejects incomplete history metadata or invalid canon', () => {
    expect(() => parseProjectSnapshot({ ...snapshot, history: { canUndo: 'yes', canRedo: false, entries: [] } })).toThrow('project contract');
    expect(() => parseProjectSnapshot({ ...snapshot, document: { ...sample, schemaVersion: '9.0.0' } })).toThrow('document contract');
  });
  it('preserves a 409 as a conflict requiring a reload', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ detail: { code: 'REVISION_CONFLICT', message: 'Revision changed', currentRevision: 2 } }, { status: 409 }));
    await expect(submitCommand(command)).rejects.toMatchObject({ status: 409, requiresReload: true });
  });
  it('treats a lost response as an unknown save outcome', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('offline'); });
    await expect(submitCommand(command)).rejects.toMatchObject({ requiresReload: true });
  });
  it('rejects a successful response without its matching receipt', async () => {
    vi.stubGlobal('fetch', async () => Response.json(snapshot));
    await expect(submitCommand(command)).rejects.toBeInstanceOf(ProjectApiError);
  });
  it('does not send an invalid command to the server', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(submitCommand({ ...command, args: { scale: 0 } })).rejects.toMatchObject({ requiresReload: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns only the matching committed revision and receipt', async () => {
    const document = structuredClone(sample); document.project.revision = 1; document.branches[0].headRevision = 1; document.layers[1].transform.x = 0.2;
    const receipt = { commandId: 'cmd_one', revision: 1, op: 'setLayerTransform', targetId: 'layer_kael', reason: 'Move Kael', createdAt: '2026-11-11T10:00:00Z', changedEntityIds: ['layer_kael'] };
    vi.stubGlobal('fetch', async () => Response.json({ document, history: { canUndo: true, canRedo: false, entries: [receipt] }, receipt }));
    const saved = await submitCommand(command);
    expect(saved.document.project.revision).toBe(1);
    expect(saved.document.layers[1].transform.x).toBe(0.2);
    expect(saved.receipt.commandId).toBe('cmd_one');
  });
});
