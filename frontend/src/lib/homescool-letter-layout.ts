/**
 * Deterministic pagination for the Homescool US Letter renderer.
 *
 * The caller provides a real-DOM fit predicate, so this engine never relies on
 * character counts to decide where a print page ends.
 */
export type LetterPageBatch<T> = T[];

/**
 * Greedily fills a page with whole blocks. A block which cannot fit on an
 * otherwise empty page is still emitted, so the caller can replace it with
 * smaller continuation blocks instead of entering a pagination loop.
 */
export function calculateLetterPages<T>(
  blocks: readonly T[],
  fits: (candidate: readonly T[]) => boolean,
): LetterPageBatch<T>[] {
  const pages: LetterPageBatch<T>[] = [];
  let current: T[] = [];

  for (const block of blocks) {
    const candidate = [...current, block];
    if (fits(candidate)) {
      current = candidate;
      continue;
    }

    if (current.length) {
      pages.push(current);
      current = [block];
      continue;
    }

    // Preserve progress. The renderer will split this block before capture.
    pages.push([block]);
  }

  if (current.length) pages.push(current);
  return pages;
}
