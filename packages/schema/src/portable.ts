/** JSON text must round-trip through UTF-8 without unpaired UTF-16 surrogates. */
export function hasNonScalarText(value: unknown): boolean {
  if (typeof value === 'string') return /[\uD800-\uDFFF]/u.test(value);
  if (Array.isArray(value)) return value.some(hasNonScalarText);
  return typeof value === 'object' && value !== null
    && Object.entries(value).some(([key, child]) => hasNonScalarText(key) || hasNonScalarText(child));
}
