const numeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
export function parseRigAngle(text: string): number | null {
  const value = Number(text);
  return numeric.test(text.trim()) && Number.isFinite(value) && Math.abs(value) <= 360 ? value : null;
}
export function parseRigTime(text: string, durationMs: number): number | null {
  const value = Number(text);
  return /^\d+$/.test(text.trim()) && Number.isSafeInteger(value) && value <= durationMs ? value : null;
}
