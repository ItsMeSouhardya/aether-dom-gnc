'use client';
import { useEffect, useRef } from 'react';
import type { SvgAsset } from '@aether-dom/schema';
import type { AudioPreview } from '@/features/audio/types';
import { SvgContent } from '../stage/svg-content';

/** Analyser values touch the SVG presentation only; they never enter React/canon. */
export function AudioGlow({ runtime, svg, layerId, enabled, width, height }: { runtime: AudioPreview; svg: SvgAsset; layerId: string; enabled: boolean; width: number; height: number }) {
  const glow = useRef<SVGGElement>(null);
  useEffect(() => {
    const draw = ({ level }: { level: number }) => {
      const element = glow.current; if (!element) return;
      const value = enabled && Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
      element.style.opacity = String(value * .7);
      element.style.filter = `drop-shadow(0 0 ${value * 12}px #b8e7cb)`;
    };
    draw(runtime.getFrame()); return runtime.subscribeFrame(draw);
  }, [runtime, enabled]);
  return <g ref={glow} className="stage-audio-glow" opacity="0" pointerEvents="none" aria-hidden="true">
    <svg x={-width / 2} y={-height / 2} width={width} height={height} viewBox={`${svg.viewBox.x} ${svg.viewBox.y} ${svg.viewBox.width} ${svg.viewBox.height}`}>
      <SvgContent node={svg.root} scopeId={`glow:${layerId}`} />
    </svg>
  </g>;
}
