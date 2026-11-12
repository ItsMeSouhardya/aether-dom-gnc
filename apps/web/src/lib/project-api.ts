import { validateCdom, validateCommand, validateAnalysis, type DocumentAnalysis, type CdomCommand, type CdomDocument } from '@aether-dom/schema';

export type CommandReceipt = { commandId: string; revision: number; op: CdomCommand['op']; targetId: string | null; reason: string; createdAt: string; changedEntityIds: string[]; proposalId?: string; provider?: string; modelVersion?: string; approvedBy?: string };
export type ProjectSnapshot = { document: CdomDocument; history: { canUndo: boolean; canRedo: boolean; entries: CommandReceipt[] }; analysis: DocumentAnalysis };
export type CommandResult = ProjectSnapshot & { receipt: CommandReceipt };
export const projectBase = (projectId: string, branchId: string) => `/api/v1/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`;
export const seedProjectBase = projectBase('proj_neon_shogun', 'branch_main');

export class ProjectApiError extends Error {
  constructor(message: string, public status: number, public requiresReload: boolean) { super(message); this.name = 'ProjectApiError'; }
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function receipt(value: unknown): value is CommandReceipt {
  return record(value) && typeof value.commandId === 'string' && value.commandId.length > 0
    && typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision > 0
    && ['setLayerTransform', 'setLayerPose', 'recordConstraintRecovery', 'setShotCamera', 'setShotTension', 'setShotLayoutOverride', 'setLayerAppearance', 'importSvgLayer', 'editSvgElement', 'setLayerKeyframe', 'deleteLayerKeyframe', 'approveProposal', 'undo', 'redo'].includes(String(value.op)) && (value.targetId === null || typeof value.targetId === 'string')
    && typeof value.reason === 'string' && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
    && (value.op !== 'approveProposal' || typeof value.proposalId === 'string' && value.proposalId === value.targetId && value.provider === 'local_mock'
      && typeof value.modelVersion === 'string' && value.modelVersion.length > 0 && typeof value.approvedBy === 'string' && value.approvedBy.length > 0)
    && Array.isArray(value.changedEntityIds) && value.changedEntityIds.every(id => typeof id === 'string');
}

export function parseProjectSnapshot(value: unknown): ProjectSnapshot {
  if (!record(value)) throw new Error('The response does not match the project contract.');
  const document = validateCdom(value.document);
  if (!document.valid) throw new Error('The response does not match the document contract.');
  const history = value.history;
  if (!record(history) || typeof history.canUndo !== 'boolean' || typeof history.canRedo !== 'boolean'
    || !Array.isArray(history.entries) || !history.entries.every(receipt)
    || !Number.isSafeInteger(document.document.project.revision)
    || history.entries.some(entry => entry.revision > document.document.project.revision)) throw new Error('The response does not match the project contract.');
  const analysis = validateAnalysis(value.analysis);
  const canon = document.document;
  const ids = new Set([canon.project, ...canon.branches, ...canon.characters, ...canon.characters.flatMap(character => character.constraints), ...canon.events, ...canon.scenes, ...canon.shots, ...canon.layers, ...canon.layers.flatMap(layer => layer.keyframes ?? []), ...canon.assets, ...canon.audioTracks, ...canon.bindings].map(entity => entity.id));
  if (!analysis.valid || analysis.analysis.revision !== canon.project.revision
    || analysis.analysis.graph.nodes.length !== ids.size || analysis.analysis.graph.nodes.some(node => !ids.has(node.id))) throw new Error('The response does not match the analysis contract.');
  return { document: canon, history: { canUndo: history.canUndo, canRedo: history.canRedo, entries: history.entries }, analysis: analysis.analysis };
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const writing = init?.method === 'POST';
  let response: Response;
  try { response = await fetch(path, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) }); }
  catch { throw new ProjectApiError(writing ? 'Save outcome is unknown. Reload latest before making another change.' : 'The local API is unavailable. Start the API, then try again.', 0, writing); }
  let value: unknown;
  try { value = await response.json(); }
  catch { throw new ProjectApiError(writing ? 'The save response was invalid. Reload latest to check the saved revision.' : 'The API did not return valid JSON. Check the API, then try again.', response.status, writing); }
  if (!response.ok) {
    if (response.status === 409) throw new ProjectApiError('The document changed or this action is no longer available. Reload latest before trying again.', 409, true);
    const detail = record(value) && record(value.detail) ? value.detail : null;
    throw new ProjectApiError(typeof detail?.message === 'string' ? detail.message : 'The local API is unavailable. Check the API terminal, then try again.', response.status, writing && response.status !== 422);
  }
  return value;
}

export async function loadProject(): Promise<ProjectSnapshot> {
  return parseProjectSnapshot(await requestJson(`${seedProjectBase}/document`));
}

export async function submitCommand(value: unknown): Promise<CommandResult> {
  const result = validateCommand(value);
  if (!result.valid) throw new ProjectApiError('The command is invalid. Check the transform values.', 422, false);
  const command: CdomCommand = result.command;
  const response = await requestJson(`${projectBase(command.projectId, command.branchId)}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  try {
    const snapshot = parseProjectSnapshot(response);
    if (!record(response) || !receipt(response.receipt) || response.receipt.commandId !== command.commandId
      || response.receipt.op !== command.op || response.receipt.revision !== snapshot.document.project.revision
      || response.receipt.revision !== command.expectedRevision + 1
      || command.op === 'approveProposal' && (response.receipt.targetId !== command.targetId || response.receipt.approvedBy !== command.actor.id)
      || snapshot.document.project.id !== command.projectId || snapshot.document.project.activeBranchId !== command.branchId) throw new Error('Unmatched receipt');
    return { ...snapshot, receipt: response.receipt };
  } catch { throw new ProjectApiError('The save response did not match the command. Reload latest to check the saved revision.', 502, true); }
}
