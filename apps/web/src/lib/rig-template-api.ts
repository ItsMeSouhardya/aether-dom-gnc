import { parseRigTemplate } from '@/features/rig/template';

export async function loadRigTemplate() {
  const response = await fetch('/api/v1/fixtures/articulated-rig', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error('The original rig template is unavailable.');
  return parseRigTemplate(await response.json());
}
