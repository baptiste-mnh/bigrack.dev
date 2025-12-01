/*
 * Copyright 2025 BigRack.dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logger } from '../logger';

/**
 * Configuration for text chunking
 */
export interface ChunkingConfig {
  /** Maximum characters per chunk */
  maxChunkSize: number;
  /** Number of characters to overlap between chunks */
  overlapSize: number;
  /** Separator to use for splitting (default: paragraph) */
  separator?: string;
}

/**
 * A text chunk with metadata
 */
export interface TextChunk {
  /** Chunk content */
  text: string;
  /** Zero-based index of the chunk */
  index: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Character offset in original document */
  startOffset: number;
  /** Character end position in original document */
  endOffset: number;
}

/**
 * Default chunking configuration
 * - 800 chars per chunk (safe for all-MiniLM-L6-v2 which handles ~1000)
 * - 100 chars overlap to preserve context across boundaries
 */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 800,
  overlapSize: 100,
  separator: '\n\n', // Split on paragraphs by default
};

/**
 * Split text into overlapping chunks for embedding
 *
 * Strategy:
 * 1. Try to split on natural boundaries (paragraphs, sentences)
 * 2. Keep chunks under maxChunkSize
 * 3. Add overlap between chunks to preserve context
 * 4. Include metadata for reconstruction
 *
 * @param text - Text to chunk
 * @param config - Chunking configuration
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): TextChunk[] {
  const { maxChunkSize, overlapSize, separator = '\n\n' } = config;

  // If text is short enough, return as single chunk
  if (text.length <= maxChunkSize) {
    return [
      {
        text,
        index: 0,
        totalChunks: 1,
        startOffset: 0,
        endOffset: text.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  // Split text into paragraphs (or other separators)
  const paragraphs = text.split(separator).filter((p) => p.trim().length > 0);

  let currentChunk = '';
  let currentChunkStart = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const potentialChunk = currentChunk ? currentChunk + separator + paragraph : paragraph;

    // If adding this paragraph would exceed max size
    if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk,
        index: chunkIndex,
        totalChunks: -1, // Will be set later
        startOffset: currentChunkStart,
        endOffset: currentChunkStart + currentChunk.length,
      });

      chunkIndex++;

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlapSize);
      currentChunk = overlapText + separator + paragraph;
      currentChunkStart =
        currentChunkStart +
        currentChunk.length -
        overlapText.length -
        separator.length -
        paragraph.length;
    } else {
      // Add paragraph to current chunk
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk if any content remains
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk,
      index: chunkIndex,
      totalChunks: -1,
      startOffset: currentChunkStart,
      endOffset: currentChunkStart + currentChunk.length,
    });
  }

  // Set totalChunks for all chunks
  const totalChunks = chunks.length;
  chunks.forEach((chunk) => {
    chunk.totalChunks = totalChunks;
  });

  logger.debug(
    { totalChunks, textLength: text.length, maxChunkSize },
    'Text chunked for embedding'
  );

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 * Tries to break on word boundaries
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  // Get last N characters
  const overlap = text.slice(-overlapSize);

  // Try to find a word boundary (space, newline)
  const lastSpaceIndex = overlap.indexOf(' ');
  if (lastSpaceIndex > 0) {
    return overlap.slice(lastSpaceIndex + 1);
  }

  return overlap;
}

/**
 * Reconstruct original text from chunks (for display/debugging)
 * Note: This is approximate due to overlaps
 */
export function reconstructFromChunks(chunks: TextChunk[]): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0].text;

  // Sort by index
  const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

  // For reconstruction, just concatenate without overlaps
  // (This is approximate - overlaps mean we lose some context)
  return sortedChunks.map((c) => c.text).join('\n\n');
}

/**
 * Calculate optimal chunk size based on model and content type
 */
export function calculateOptimalChunkSize(
  modelName: string,
  contentType: 'code' | 'prose' | 'mixed' = 'mixed'
): number {
  // all-MiniLM-L6-v2 handles ~256 tokens ≈ 800-1000 chars
  if (modelName.includes('MiniLM')) {
    return contentType === 'code' ? 600 : 800;
  }

  // Default conservative size
  return 500;
}
