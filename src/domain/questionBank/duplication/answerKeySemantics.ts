/**
 * Pure Domain Utility: Answer Key Semantics
 * Evaluates whether two question answer keys are clinically and lexically equivalent,
 * accounting for trailing option spillover (e.g. "E. ST elevation on ECG"),
 * extra descriptive words, or punctuation variation.
 */

export function isAnswerKeySemanticallyEqual(
  keyA?: string | null,
  keyB?: string | null
): boolean {
  if (!keyA || !keyB) return false;
  const a = keyA.toLowerCase().trim();
  const b = keyB.toLowerCase().trim();
  if (a === b) return true;

  // Clean trailing option markers if present (e.g. "... in serum e. st elevation...")
  const cleanA = a.replace(/\s+(?:[([{\s]*[e-f][)\]}:.]|[e-f]\s*[-–—]+)\s+.*$/i, '').trim();
  const cleanB = b.replace(/\s+(?:[([{\s]*[e-f][)\]}:.]|[e-f]\s*[-–—]+)\s+.*$/i, '').trim();
  if (cleanA === cleanB) return true;

  // Substring containment with reasonable length ratio (> 0.35)
  const minLen = Math.min(cleanA.length, cleanB.length);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  if ((cleanA.includes(cleanB) || cleanB.includes(cleanA)) && minLen / maxLen >= 0.35) {
    return true;
  }

  // Token Jaccard overlap >= 0.60
  const wordsA = new Set(cleanA.split(/\s+/).filter(Boolean));
  const wordsB = new Set(cleanB.split(/\s+/).filter(Boolean));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 && intersection / union >= 0.6;
}
