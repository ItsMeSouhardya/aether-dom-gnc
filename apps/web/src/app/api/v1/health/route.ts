import { proxyApi } from '@/lib/api-proxy';

export const dynamic = 'force-dynamic';
export function GET() { return proxyApi('/api/v1/health'); }
