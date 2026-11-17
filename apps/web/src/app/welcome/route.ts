import { readWelcomeDocument } from '../../lib/welcome-assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return readWelcomeDocument();
}
