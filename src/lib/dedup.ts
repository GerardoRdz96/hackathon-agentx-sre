/**
 * Incident Deduplication — PA·co pattern adapted from pgvector-maintenance.md
 * Uses Jaccard similarity on word sets for fast, zero-dependency dedup.
 * In production: upgrade to embedding-based cosine similarity (OpenAI text-embedding-3-small).
 */

export interface DedupResult {
  isDuplicate: boolean;
  similarIncidentId: number | null;
  similarity: number;
  message: string | null;
}

export function findSimilarIncident(
  title: string,
  description: string,
  existingIncidents: Array<{ id: number; title: string; description: string; status: string }>
): DedupResult {
  const newText = `${title} ${description}`.toLowerCase().trim();
  let bestMatch = { id: 0, similarity: 0, title: '' };

  for (const incident of existingIncidents) {
    // Only check against non-resolved incidents (open duplicates matter)
    if (incident.status === 'resolved') continue;

    const existingText = `${incident.title} ${incident.description}`.toLowerCase().trim();
    const sim = jaccardSimilarity(newText, existingText);

    if (sim > bestMatch.similarity) {
      bestMatch = { id: incident.id, similarity: sim, title: incident.title };
    }
  }

  const isDuplicate = bestMatch.similarity > 0.6; // 60% word overlap = likely duplicate

  return {
    isDuplicate,
    similarIncidentId: isDuplicate ? bestMatch.id : null,
    similarity: Math.round(bestMatch.similarity * 100),
    message: isDuplicate
      ? `Similar to open incident #${bestMatch.id}: "${bestMatch.title}" (${Math.round(bestMatch.similarity * 100)}% match)`
      : null,
  };
}

function jaccardSimilarity(a: string, b: string): number {
  // Remove common stop words for better signal
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'and', 'or', 'not', 'it', 'this', 'that']);

  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}
