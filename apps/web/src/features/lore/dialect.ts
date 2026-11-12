const words = (text: string) => text.normalize('NFKC').replaceAll('’', "'").toLocaleLowerCase('en-US').match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:'[\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu) ?? [];

/** Draft-only lexical check; does not infer speech or mutate a document. */
export function checkDialectDraft(text: string, forbiddenTerms: readonly string[]): string[] {
  const tokens = words(text);
  return [...new Set(forbiddenTerms)].filter(term => {
    const phrase = words(term);
    return phrase.length > 0 && tokens.some((_, index) => phrase.every((word, offset) => word === tokens[index + offset]));
  });
}
