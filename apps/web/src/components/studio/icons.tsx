type IconName = 'brand' | 'scene' | 'shot' | 'layers' | 'character' | 'asset' | 'refresh' | 'chevron' | 'inspect';
const paths: Record<IconName, string> = {
  brand: 'M4 20V4h16v16M8 20V8h8v12M11 20v-8h2v8',
  scene: 'M3 6h7l2 2h9v12H3V6Z',
  shot: 'M3 5h18v14H3V5ZM3 9h18M8 5v4M16 5v4',
  layers: 'm12 3 10 5-10 5L2 8l10-5Zm-9 10 9 4 9-4M3 18l9 4 9-4',
  character: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3',
  asset: 'M4 3h11l5 5v13H4V3Zm10 0v6h6M8 14h8M8 18h5',
  refresh: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5',
  chevron: 'm9 5 7 7-7 7',
  inspect: 'M4 4h16v16H4V4Zm10 0v16M17 8h1M17 12h1M17 16h1',
};

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[name]} /></svg>;
}
