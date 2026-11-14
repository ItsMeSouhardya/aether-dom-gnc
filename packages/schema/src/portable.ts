/** JSON text must round-trip through UTF-8 without unpaired UTF-16 surrogates. */
export function hasNonScalarText(value: unknown): boolean {
  if (typeof value === 'string') return /[\uD800-\uDFFF]/u.test(value);
  if (Array.isArray(value)) return value.some(hasNonScalarText);
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.entries(value).some(([key, child]) => hasNonScalarText(key) || hasNonScalarText(child))
  );
}

const encoder = new TextEncoder();
/** Bound and reject cycles/non-JSON values before recursive validation/serialization. */
export function portableJsonWithin(value: unknown, maxBytes: number): boolean {
  const active = new Set<object>();
  const stack: { value: unknown; depth: number; exit?: boolean }[] = [{ value, depth: 0 }];
  let nodes = 0,
    textBytes = 0;
  while (stack.length) {
    const entry = stack.pop()!;
    const child = entry.value;
    if (entry.exit) {
      active.delete(child as object);
      continue;
    }
    if (++nodes > 200000 || entry.depth > 32) return false;
    if (typeof child === 'string') {
      if (/[\uD800-\uDFFF]/u.test(child)) return false;
      textBytes += encoder.encode(child).length;
      if (textBytes > maxBytes) return false;
    } else if (typeof child === 'number') {
      if (!Number.isFinite(child)) return false;
    } else if (child !== null && typeof child === 'object') {
      if (
        active.has(child) ||
        (!Array.isArray(child) &&
          Object.getPrototypeOf(child) !== Object.prototype &&
          Object.getPrototypeOf(child) !== null)
      )
        return false;
      active.add(child);
      stack.push({ value: child, depth: entry.depth, exit: true });
      for (const [key, item] of Object.entries(child)) {
        if (/[\uD800-\uDFFF]/u.test(key)) return false;
        textBytes += encoder.encode(key).length;
        stack.push({ value: item, depth: entry.depth + 1 });
      }
      if (textBytes > maxBytes) return false;
    } else if (child !== null && typeof child !== 'boolean') return false;
  }
  try {
    return encoder.encode(JSON.stringify(value)).length <= maxBytes;
  } catch {
    return false;
  }
}
