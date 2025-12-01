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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  EmbeddingService,
  getEmbeddingService,
  generateEmbedding,
  generateEmbeddings,
} from '../../src/embeddings/service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    service = new EmbeddingService();
    // Initialize once for all tests (model loading is slow)
    await service.initialize();
  }, 120000); // 2 minute timeout for model download/load

  afterAll(async () => {
    await service.dispose();
  });

  describe('initialization', () => {
    it('should be ready after initialization', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should report correct dimensions (384 for MiniLM)', () => {
      expect(service.getDimensions()).toBe(384);
    });

    it('should report model name', () => {
      const modelName = service.getModelName();
      expect(modelName).toContain('MiniLM');
    });
  });

  describe('embed()', () => {
    it('should generate 384-dimensional embedding for text', async () => {
      const embedding = await service.embed('Hello, world!');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    it('should generate normalized embedding (unit vector)', async () => {
      const embedding = await service.embed('Test text for normalization');

      // Calculate magnitude (should be ~1 for normalized vector)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 2);
    });

    it('should generate different embeddings for different texts', async () => {
      const embedding1 = await service.embed('The cat sat on the mat');
      const embedding2 = await service.embed('Machine learning is fascinating');

      // Embeddings should be different
      const areDifferent = embedding1.some((val, idx) => Math.abs(val - embedding2[idx]) > 0.01);
      expect(areDifferent).toBe(true);
    });

    it('should generate similar embeddings for similar texts', async () => {
      const embedding1 = await service.embed('The cat sat on the mat');
      const embedding2 = await service.embed('A cat was sitting on the mat');

      // Calculate cosine similarity
      const dotProduct = embedding1.reduce((sum, val, idx) => sum + val * embedding2[idx], 0);
      const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
      const similarity = dotProduct / (magnitude1 * magnitude2);

      // Similar sentences should have high similarity (> 0.7)
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle empty string', async () => {
      const embedding = await service.embed('');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    it('should handle very short text', async () => {
      const embedding = await service.embed('Hi');

      expect(embedding.length).toBe(384);
    });

    it('should handle long text', async () => {
      const longText = 'This is a test sentence. '.repeat(100);
      const embedding = await service.embed(longText);

      expect(embedding.length).toBe(384);
    });

    it('should handle unicode text', async () => {
      const embedding = await service.embed('日本語テキスト 中文 한국어');

      expect(embedding.length).toBe(384);
    });

    it('should handle special characters', async () => {
      const embedding = await service.embed('Hello! @#$%^&*() "quotes" \'apostrophe\'');

      expect(embedding.length).toBe(384);
    });
  });

  describe('embedBatch()', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['First text', 'Second text', 'Third text'];
      const embeddings = await service.embedBatch(texts);

      expect(embeddings.length).toBe(3);
      embeddings.forEach((embedding) => {
        expect(embedding.length).toBe(384);
      });
    });

    it('should handle empty array', async () => {
      const embeddings = await service.embedBatch([]);

      expect(embeddings).toEqual([]);
    });

    it('should handle single text in batch', async () => {
      const embeddings = await service.embedBatch(['Single text']);

      expect(embeddings.length).toBe(1);
      expect(embeddings[0].length).toBe(384);
    });

    it('should produce consistent results (same text = same embedding)', async () => {
      const text = 'Consistency test';
      const embeddings = await service.embedBatch([text, text]);

      // Same text should produce identical embeddings
      const maxDiff = embeddings[0].reduce(
        (max, val, idx) => Math.max(max, Math.abs(val - embeddings[1][idx])),
        0
      );
      expect(maxDiff).toBeLessThan(0.0001);
    });
  });

  describe('dispose()', () => {
    it('should set isReady to false after dispose', async () => {
      const tempService = new EmbeddingService();
      await tempService.initialize();

      expect(tempService.isReady()).toBe(true);

      await tempService.dispose();

      expect(tempService.isReady()).toBe(false);
    });
  });
});

describe('Helper functions', () => {
  describe('getEmbeddingService()', () => {
    it('should return singleton instance', () => {
      const service1 = getEmbeddingService();
      const service2 = getEmbeddingService();

      expect(service1).toBe(service2);
    });
  });

  describe('generateEmbedding()', () => {
    it('should generate embedding using singleton service', async () => {
      const embedding = await generateEmbedding('Test text');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    }, 60000);
  });

  describe('generateEmbeddings()', () => {
    it('should generate multiple embeddings using singleton service', async () => {
      const embeddings = await generateEmbeddings(['Text 1', 'Text 2']);

      expect(embeddings.length).toBe(2);
      embeddings.forEach((embedding) => {
        expect(embedding.length).toBe(384);
      });
    }, 60000);
  });
});

describe('Semantic similarity tests', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    service = getEmbeddingService();
    if (!service.isReady()) {
      await service.initialize();
    }
  }, 120000);

  // Helper to calculate cosine similarity
  function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  it('should rank "authentication" closer to "login" than to "database"', async () => {
    const authEmbedding = await service.embed('authentication');
    const loginEmbedding = await service.embed('login');
    const dbEmbedding = await service.embed('database');

    const authToLogin = cosineSimilarity(authEmbedding, loginEmbedding);
    const authToDb = cosineSimilarity(authEmbedding, dbEmbedding);

    expect(authToLogin).toBeGreaterThan(authToDb);
  });

  it('should rank "bug fix" closer to "error correction" than to "new feature"', async () => {
    const bugFixEmbedding = await service.embed('bug fix');
    const errorCorrectionEmbedding = await service.embed('error correction');
    const newFeatureEmbedding = await service.embed('new feature');

    const bugToError = cosineSimilarity(bugFixEmbedding, errorCorrectionEmbedding);
    const bugToFeature = cosineSimilarity(bugFixEmbedding, newFeatureEmbedding);

    expect(bugToError).toBeGreaterThan(bugToFeature);
  });

  it('should find high similarity between synonyms', async () => {
    const pairs = [
      ['user', 'customer'],
      ['create', 'generate'],
      ['delete', 'remove'],
      ['update', 'modify'],
    ];

    for (const [word1, word2] of pairs) {
      const emb1 = await service.embed(word1);
      const emb2 = await service.embed(word2);
      const similarity = cosineSimilarity(emb1, emb2);

      // Synonyms should have reasonably high similarity
      expect(similarity).toBeGreaterThan(0.5);
    }
  });

  it('should handle business context queries', async () => {
    const contextEmbedding = await service.embed(
      'Users must validate their email before accessing the dashboard'
    );
    const queryEmbedding = await service.embed('email validation rules');
    const unrelatedEmbedding = await service.embed('database backup schedule');

    const relevantSimilarity = cosineSimilarity(contextEmbedding, queryEmbedding);
    const unrelatedSimilarity = cosineSimilarity(contextEmbedding, unrelatedEmbedding);

    expect(relevantSimilarity).toBeGreaterThan(unrelatedSimilarity);
  });
});
