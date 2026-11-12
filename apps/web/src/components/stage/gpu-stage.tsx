'use client';

import { useEffect, useRef } from 'react';
import { createStageRenderer, type GpuStageProps, type StageRenderer } from '../../features/stage/gpu-renderer';

export type { GpuStageProps } from '../../features/stage/gpu-renderer';

export function GpuStage(props: GpuStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StageRenderer | null>(null);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; rendererRef.current?.update(props); }, [props]);
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = createStageRenderer(canvasRef.current, latest.current);
    rendererRef.current = renderer;
    return () => { renderer.dispose(); rendererRef.current = null; };
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
