import { afterEach, expect, it, vi } from 'vitest';
import { compareBranches, forkBranch, listBranches } from '../src/lib/branch-api';
const branch = { id: 'child', name: 'Alternate', parentId: 'main', baseRevision: 2, headRevision: 2 };
const command = { commandId: 'fork_1', op: 'forkBranch' as const, projectId: 'p', sourceBranchId: 'main', expectedRevision: 2, newBranchId: 'child', name: 'Alternate', actor: { kind: 'human' as const, id: 'creator' }, reason: 'Explore another ending' };
const result = { branch, receipt: { commandId: 'fork_1', sourceBranchId: 'main', sourceRevision: 2, branchId: 'child', actor: command.actor, reason: command.reason, createdAt: '2026-11-13T12:00:00Z' } };
afterEach(() => vi.unstubAllGlobals());
it('validates branch lists and requires the requested project', async () => {
  const branches = [{ id: 'main', name: 'Main', parentId: null, baseRevision: 0, headRevision: 2 }, branch];
  vi.stubGlobal('fetch', async () => Response.json({ projectId: 'p', branches }));
  expect(await listBranches('p')).toEqual(branches);
  await expect(listBranches('other')).rejects.toThrow('match');
});
it('validates fork provenance against the exact retryable command', async () => {
  const fetcher = vi.fn(async () => Response.json(result)); vi.stubGlobal('fetch', fetcher);
  expect((await forkBranch(command)).branch.id).toBe('child');
  vi.stubGlobal('fetch', async () => Response.json({ ...result, receipt: { ...result.receipt, branchId: 'unrelated' } }));
  await expect(forkBranch(command)).rejects.toMatchObject({ unknownOutcome: true });
});
it('rejects mismatched comparison identities and parses a read-only result', async () => {
  const diff = { projectId: 'p', base: { branchId: 'main', revision: 2 }, left: { branchId: 'main', revision: 3 }, right: { branchId: 'child', revision: 2 }, changes: [], conflictCount: 0 };
  vi.stubGlobal('fetch', async () => Response.json(diff));
  expect(await compareBranches('p', 'main', 'child')).toEqual(diff);
  await expect(compareBranches('p', 'child', 'main')).rejects.toThrow('match');
});
it('does not submit an invalid fork and distinguishes a lost outcome from a stale rejection', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(forkBranch({ ...command, newBranchId: '..' })).rejects.toMatchObject({ unknownOutcome: false }); expect(fetcher).not.toHaveBeenCalled();
  vi.stubGlobal('fetch', async () => { throw new TypeError('offline'); });
  await expect(forkBranch(command)).rejects.toMatchObject({ unknownOutcome: true });
  vi.stubGlobal('fetch', async () => Response.json({ detail: { message: 'Source changed. Reload latest.' } }, { status: 409 }));
  await expect(forkBranch(command)).rejects.toMatchObject({ status: 409, unknownOutcome: false });
});
