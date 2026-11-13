import { afterEach, describe, expect, it, vi } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import { loadProject, submitCommand, parseProjectSnapshot, ProjectApiError } from '../src/lib/project-api';
import { emptyAnalysis } from './fixtures/analysis';
import type { CdomDocument } from '@aether-dom/schema';

const snapshot = { document: sample, history: { canUndo: false, canRedo: false, entries: [] }, analysis: emptyAnalysis(sample as CdomDocument) };
const command = { commandId: 'cmd_one', projectId: 'proj_neon_shogun', branchId: 'branch_main', expectedRevision: 0, actor: { kind: 'human', id: 'local_creator' }, reason: 'Move Kael', op: 'setLayerTransform', targetId: 'layer_kael', args: { x: 0.2 } };
afterEach(() => vi.unstubAllGlobals());

describe('persisted project boundary', () => {
  it('loads only the explicitly requested branch and rejects a mismatched response', async () => {
    const fetcher = vi.fn(async () => Response.json(snapshot)); vi.stubGlobal('fetch', fetcher);
    await expect(loadProject('proj_neon_shogun', 'alternate')).rejects.toThrow('requested branch');
    expect(String((fetcher.mock.calls as unknown as [string, RequestInit][])[0][0])).toContain('/branches/alternate/document');
  });
  it('requires approval provenance to match the explicitly approved proposal', async () => {
    const document = structuredClone(sample) as CdomDocument;
    document.project.revision = 1; document.branches[0].headRevision = 1;
    const approve = { ...command, op: 'approveProposal', targetId: 'proposal_one', args: {} };
    const receipt = { commandId: command.commandId, revision: 1, op: 'approveProposal', targetId: 'proposal_one', reason: 'Approve', createdAt: '2026-11-12T14:00:00Z', changedEntityIds: ['layer_kael'], proposalId: 'different_proposal', provider: 'local_mock', modelVersion: 'mock-v1', approvedBy: 'local_creator' };
    vi.stubGlobal('fetch', async () => Response.json({ document, receipt, history: { canUndo: true, canRedo: false, entries: [receipt] }, analysis: emptyAnalysis(document) }));
    await expect(submitCommand(approve)).rejects.toThrow('did not match');
  });
  it.each(['setShotCamera','setLayerAppearance','importSvgLayer','editSvgElement','setLayerKeyframe','deleteLayerKeyframe','setShotTension'])('accepts %s receipts in compatible document histories', op => {
    const document = structuredClone(sample) as CdomDocument;
    document.schemaVersion = '0.2.0'; document.project.revision = 1; document.branches[0].headRevision = 1;
    const receipt = {commandId:'stage',revision:1,op,targetId:'layer_kael',reason:'Edit',createdAt:'2026-11-12T10:00:00Z',changedEntityIds:['layer_kael']};
    expect(parseProjectSnapshot({document,history:{canUndo:true,canRedo:false,entries:[receipt]},analysis:emptyAnalysis(document)}).history.entries[0].op).toBe(op);
    expect(() => parseProjectSnapshot({document,history:{canUndo:true,canRedo:false,entries:[{...receipt,op:'restoreStageSnapshot'}]},analysis:emptyAnalysis(document)})).toThrow('project contract');
  });
  it('requires analysis coverage of nested keyframes and rejects missing or unrelated frame IDs', () => {
    const document = structuredClone(sample) as CdomDocument;
    document.schemaVersion = '0.2.0';
    document.layers[1].keyframes = [{id:'kf_灯',timeMs:1000,transform:document.layers[1].transform}];
    const analysis = emptyAnalysis(document);
    if (!analysis.graph.nodes.some(node => node.id === 'kf_灯')) analysis.graph.nodes.push({id:'kf_灯',kind:'keyframe',label:'Frame'});
    expect(parseProjectSnapshot({...snapshot,document,analysis}).document.layers[1].keyframes?.[0].id).toBe('kf_灯');
    expect(() => parseProjectSnapshot({...snapshot,document,analysis:{...analysis,graph:{...analysis.graph,nodes:analysis.graph.nodes.filter(node => node.id !== 'kf_灯')}}})).toThrow('analysis contract');
    expect(() => parseProjectSnapshot({...snapshot,document,analysis:{...analysis,graph:{...analysis.graph,nodes:analysis.graph.nodes.map(node => node.id === 'kf_灯' ? {...node,id:'unrelated-frame'} : node)}}})).toThrow('analysis contract');
  });
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
  it('rejects missing, stale and unrelated analysis instead of showing false diagnostics', () => {
    expect(() => parseProjectSnapshot({ ...snapshot, analysis: undefined })).toThrow('analysis contract');
    expect(() => parseProjectSnapshot({ ...snapshot, analysis: { ...snapshot.analysis, revision: 7 } })).toThrow('analysis contract');
    expect(() => parseProjectSnapshot({ ...snapshot, analysis: { ...snapshot.analysis, graph: { ...snapshot.analysis.graph, nodes: [{ id: 'unrelated', kind: 'layer', label: 'Other project' }] } } })).toThrow('analysis contract');
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
    vi.stubGlobal('fetch', async () => Response.json({ document, history: { canUndo: true, canRedo: false, entries: [receipt] }, receipt, analysis: emptyAnalysis(document as CdomDocument) }));
    const saved = await submitCommand(command);
    expect(saved.document.project.revision).toBe(1);
    expect(saved.document.layers[1].transform.x).toBe(0.2);
    expect(saved.receipt.commandId).toBe('cmd_one');
  });
});
