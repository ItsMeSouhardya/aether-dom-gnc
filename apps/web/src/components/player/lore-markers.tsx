'use client';
import type { LoreHotspot } from '@aether-dom/schema';

export function LoreMarkers({ hotspots, aspect, size, select, selectedId }: { hotspots: LoreHotspot[]; aspect: '16:9' | '9:16'; size: { width: number; height: number }; select: (hotspot: LoreHotspot, button: HTMLButtonElement) => void; selectedId: string | null }) {
  return <>{hotspots.map(hotspot => {
    const position = hotspot.positions[aspect];
    const width = Math.min(140, Math.max(44, size.width));
    const x = Math.max(width / 2, Math.min(size.width - width / 2, position.x * size.width));
    const y = Math.max(22, Math.min(size.height - 22, position.y * size.height));
    return <button key={hotspot.id} className="lore-marker" style={{ left: x, top: y, width }} title={hotspot.label} aria-label={`Lore: ${hotspot.label}`} aria-expanded={selectedId === hotspot.id} onClick={event => select(hotspot, event.currentTarget)}><span className="lore-marker-label" aria-hidden="true">{hotspot.label}</span></button>;
  })}</>;
}
