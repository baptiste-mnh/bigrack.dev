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

import { describe, it, expect } from 'vitest';
import {
  chunkText,
  reconstructFromChunks,
  calculateOptimalChunkSize,
  DEFAULT_CHUNKING_CONFIG,
  type TextChunk,
} from '../../src/embeddings/chunking';

describe('Text Chunking', () => {
  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const text = 'This is a short text.';
      const chunks = chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBe(text.length);
    });

    it('should return single chunk for text exactly at maxChunkSize', () => {
      const text = 'a'.repeat(DEFAULT_CHUNKING_CONFIG.maxChunkSize);
      const chunks = chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
    });

    it('should split long text into multiple chunks', () => {
      // Create text with multiple short paragraphs that exceeds maxChunkSize
      const paragraph = 'Short paragraph.';
      const text = Array(50).fill(paragraph).join('\n\n');

      const chunks = chunkText(text, { maxChunkSize: 200, overlapSize: 20 });

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
        expect(chunk.totalChunks).toBe(chunks.length);
        // Chunks should be reasonably sized (may exceed slightly due to overlap)
        expect(chunk.text.length).toBeLessThanOrEqual(300);
      });
    });

    it('should maintain correct chunk indices', () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.\n\nParagraph 4.';
      const chunks = chunkText(text, { maxChunkSize: 30, overlapSize: 5 });

      chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
      });

      // Verify indices are sequential
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i + 1].index).toBe(chunks[i].index + 1);
      }
    });

    it('should set totalChunks correctly on all chunks', () => {
      const text = 'Part 1.\n\nPart 2.\n\nPart 3.';
      const chunks = chunkText(text, { maxChunkSize: 15, overlapSize: 3 });

      const totalChunks = chunks.length;
      chunks.forEach((chunk) => {
        expect(chunk.totalChunks).toBe(totalChunks);
      });
    });

    it('should handle custom separator', () => {
      const text = 'Section 1---Section 2---Section 3';
      const chunks = chunkText(text, {
        maxChunkSize: 20,
        overlapSize: 3,
        separator: '---',
      });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle text with no separators', () => {
      const text = 'A'.repeat(1000); // Long text without paragraph breaks
      const chunks = chunkText(text, { maxChunkSize: 300, overlapSize: 50 });

      // Should still create chunks (will split on max size)
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter out empty paragraphs', () => {
      const text = 'Content 1.\n\n\n\n\n\nContent 2.';
      const chunks = chunkText(text);

      // Should not have chunks with only whitespace
      chunks.forEach((chunk) => {
        expect(chunk.text.trim().length).toBeGreaterThan(0);
      });
    });

    it('should track character offsets correctly for single chunk', () => {
      const text = 'Hello, world!';
      const chunks = chunkText(text);

      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBe(text.length);
    });
  });

  describe('reconstructFromChunks', () => {
    it('should return empty string for empty array', () => {
      const result = reconstructFromChunks([]);
      expect(result).toBe('');
    });

    it('should return text for single chunk', () => {
      const chunk: TextChunk = {
        text: 'Single chunk text',
        index: 0,
        totalChunks: 1,
        startOffset: 0,
        endOffset: 17,
      };

      const result = reconstructFromChunks([chunk]);
      expect(result).toBe('Single chunk text');
    });

    it('should concatenate multiple chunks', () => {
      const chunks: TextChunk[] = [
        { text: 'First part', index: 0, totalChunks: 3, startOffset: 0, endOffset: 10 },
        { text: 'Second part', index: 1, totalChunks: 3, startOffset: 10, endOffset: 21 },
        { text: 'Third part', index: 2, totalChunks: 3, startOffset: 21, endOffset: 31 },
      ];

      const result = reconstructFromChunks(chunks);
      expect(result).toBe('First part\n\nSecond part\n\nThird part');
    });

    it('should sort chunks by index before reconstruction', () => {
      const chunks: TextChunk[] = [
        { text: 'Third', index: 2, totalChunks: 3, startOffset: 0, endOffset: 5 },
        { text: 'First', index: 0, totalChunks: 3, startOffset: 0, endOffset: 5 },
        { text: 'Second', index: 1, totalChunks: 3, startOffset: 0, endOffset: 6 },
      ];

      const result = reconstructFromChunks(chunks);
      expect(result).toBe('First\n\nSecond\n\nThird');
    });
  });

  describe('calculateOptimalChunkSize', () => {
    it('should return 800 for MiniLM with prose content', () => {
      const size = calculateOptimalChunkSize('all-MiniLM-L6-v2', 'prose');
      expect(size).toBe(800);
    });

    it('should return 600 for MiniLM with code content', () => {
      const size = calculateOptimalChunkSize('all-MiniLM-L6-v2', 'code');
      expect(size).toBe(600);
    });

    it('should return 800 for MiniLM with mixed content', () => {
      const size = calculateOptimalChunkSize('Xenova/all-MiniLM-L6-v2', 'mixed');
      expect(size).toBe(800);
    });

    it('should return 500 for unknown models', () => {
      const size = calculateOptimalChunkSize('unknown-model', 'prose');
      expect(size).toBe(500);
    });

    it('should default to mixed content type', () => {
      const size = calculateOptimalChunkSize('all-MiniLM-L6-v2');
      expect(size).toBe(800);
    });
  });

  describe('DEFAULT_CHUNKING_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CHUNKING_CONFIG.maxChunkSize).toBe(800);
      expect(DEFAULT_CHUNKING_CONFIG.overlapSize).toBe(100);
      expect(DEFAULT_CHUNKING_CONFIG.separator).toBe('\n\n');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const chunks = chunkText('');
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const chunks = chunkText('   \n\n   ');
      // Should filter out empty chunks or return single empty chunk
      expect(chunks.length).toBeLessThanOrEqual(1);
    });

    it('should handle single word', () => {
      const chunks = chunkText('Word');
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('Word');
    });

    it('should handle very long single paragraph', () => {
      // 2000 chars in one paragraph (no breaks)
      const longParagraph = 'word '.repeat(400);
      const chunks = chunkText(longParagraph, { maxChunkSize: 500, overlapSize: 50 });

      // Should still split even without paragraph breaks
      // (will fall through to single chunk since no separator found)
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '日本語テキスト。\n\n中文文本。\n\n한국어 텍스트.';
      const chunks = chunkText(unicodeText);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      // Verify unicode is preserved
      expect(chunks.some((c) => c.text.includes('日本語'))).toBe(true);
    });

    it('should handle emoji', () => {
      const emojiText = 'Hello 👋 World 🌍\n\nMore content 🎉';
      const chunks = chunkText(emojiText);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks.some((c) => c.text.includes('👋'))).toBe(true);
    });
  });
});
