import { readWelcomeAsset } from '../../../lib/welcome-assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  return readWelcomeAsset((await context.params).path);
}
