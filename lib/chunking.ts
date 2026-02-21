export interface TextChunk {
  id: string; // Unique identifier (e.g., 'chunk-0')
  title: string; // Extracted title or fallback (e.g., 'CHAPTER 1' or 'Part 1')
  startIndex: number; // Global word index where this chunk starts
  endIndex: number; // Global word index where this chunk ends (exclusive)
  text: string; // The literal string content of this chunk
}

export const CHUNK_TARGET_SIZE = 5000; // Target words per chunk

/**
 * Checks if a token looks like a major section header.
 * Criteria: ALL CAPS, >4 chars, not a common stopword.
 */
const FALSE_POSITIVE_CAPS = new Set([
  'THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'HAVE', 'BEEN',
  'WILL', 'WHEN', 'WERE', 'THEY', 'THEIR', 'ALSO', 'WHICH', 'INTO',
  'THAN', 'THEN', 'THESE', 'THOSE', 'BOTH', 'EACH', 'SUCH', 'ONLY',
  'SOME', 'MORE', 'MOST', 'OTHER', 'MANY', 'MUCH', 'VERY', 'EVEN',
]);

function isHeaderToken(token: string): boolean {
  const clean = token.replace(/[^A-Z0-9-]/gi, '');
  if (clean.length < 5) return false;
  if (!/^[A-Z0-9][A-Z0-9-]+$/.test(clean)) return false;
  if ((clean.match(/[A-Z]/g) ?? []).length < 2) return false;
  if (FALSE_POSITIVE_CAPS.has(clean)) return false;
  return true;
}

/**
 * Attempts to extract a readable title from the first few words of a chunk.
 */
function extractTitle(words: string[]): string | null {
  // Look at the first 10 words to see if they form a header
  const headerWords = [];
  for (let i = 0; i < Math.min(10, words.length); i++) {
    if (isHeaderToken(words[i])) {
      headerWords.push(words[i]);
    } else if (headerWords.length > 0) {
      break; // Stop collecting if we hit a non-header word after starting
    }
  }

  if (headerWords.length > 0) {
    // Clean up punctuation for the title
    return headerWords.join(' ').replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, ''); 
  }
  return null;
}

/**
 * Splits a massive raw text string into manageable chunks of approximately `CHUNK_TARGET_SIZE` words.
 * It tries to split on natural boundaries (like double newlines or headers) if possible.
 */
export function chunkText(rawText: string): TextChunk[] {
  // 1. Tokenize into words, preserving whitespace structure where possible
  // We use the same regex used in BionicText to ensure word indices match perfectly
  const tokens = rawText.split(/(\s+)/).filter((w) => w.length > 0);
  
  const chunks: TextChunk[] = [];
  let currentChunkTokens: string[] = [];
  let currentWordCount = 0;
  let chunkStartIndex = 0; // The conceptual "word" index (non-whitespace tokens)
  
  // To keep exactly aligned with `BionicText` logic, the `currentWordIndex` in BionicText
  // counts *all tokens* that are not strictly whitespace. 
  // Let's iterate through all tokens.
  // Let's iterate through all tokens.
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isWS = /^\s+$/.test(token);
    
    currentChunkTokens.push(token);
    
    if (!isWS) {
      currentWordCount++;
    }
    
    // Check if we should break here
    // Attempt to find a "natural" break if we are near or past target size
    // A natural break is a double newline or a header token
    let isNaturalBreak = false;
    
    // If we are over 80% of target size, start looking for a natural break
    if (currentWordCount >= CHUNK_TARGET_SIZE * 0.8) {
      if (isWS && token.includes('\n\n')) {
        isNaturalBreak = true;
      }
    }
    
    // Hard break if we get way over target size (120%)
    const isHardBreak = currentWordCount >= CHUNK_TARGET_SIZE * 1.2;

    // We only break if we are at the end of the text, OR if we found a natural break near the target, OR if we hit the hard limit.
    const isLastToken = i === tokens.length - 1;
    
    if (isLastToken || isNaturalBreak || isHardBreak) {
      // Finalize chunk
      const text = currentChunkTokens.join('');
      
      // Calculate next index
      
      // Extract title from non-WS tokens
      const nonWsTokens = currentChunkTokens.filter(t => !/^\s+$/.test(t));
      let title = extractTitle(nonWsTokens);
      if (!title) {
        title = `Part ${chunks.length + 1}`;
      }

      chunks.push({
        id: `chunk-${chunks.length}`,
        title,
        startIndex: chunkStartIndex,
        endIndex: chunkStartIndex + currentWordCount,
        text,
      });

      // Reset for next chunk
      chunkStartIndex += currentWordCount;
      currentChunkTokens = [];
      currentWordCount = 0;
    }
  }

  return chunks;
}
