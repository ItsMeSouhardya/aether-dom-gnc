import { presentationRuntime } from '@/lib/presentation-runtime';

export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(presentationRuntime() ?? { workspace: null, instance: null }, { headers: { 'Cache-Control': 'no-store' } });
}
