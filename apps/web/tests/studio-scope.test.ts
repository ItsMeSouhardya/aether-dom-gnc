import { expect, it } from 'vitest';
import { studioScope, studioHref } from '../src/features/studio/scope';
it('defaults to seed but preserves an explicitly chosen branch on reload', () => {
  expect(studioScope({})).toEqual({ projectId: 'proj_neon_shogun', branchId: 'branch_main' });
  expect(studioScope({ projectId: 'p', branchId: 'alternate' })).toEqual({ projectId: 'p', branchId: 'alternate' });
  expect(studioHref('p', 'alternate')).toBe('/?projectId=p&branchId=alternate');
});
it.each([{ branchId: 'child' }, { projectId: 'p', branchId: '..' }, { projectId: ['p'], branchId: 'child' }, { projectId: 'p', branchId: 'child\n' }, { projectId: 'p', branchId: 'child', uri: 'secret' }])('rejects malformed studio scope', query => {
  expect(studioScope(query)).toHaveProperty('error');
});
