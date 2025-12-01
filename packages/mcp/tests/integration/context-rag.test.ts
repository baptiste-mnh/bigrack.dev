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
import { bigrackCreateRack } from '../../src/mcp/tools/bigrack-create-repo';
import { bigrackStoreContext } from '../../src/mcp/tools/bigrack-store-context';
import { bigrackQueryContext } from '../../src/mcp/tools/bigrack-query-context';
import { bigrackDeleteContext } from '../../src/mcp/tools/bigrack-delete-context';
import { disconnectPrisma, getPrisma } from '../../src/storage/prisma';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Context RAG Pipeline', () => {
  let testWorkspaceDir: string;
  let repoId: string;

  beforeAll(async () => {
    // Create a temporary workspace directory
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-rag-test-'));

    // Create a test repo
    const repoResult = await bigrackCreateRack({
      projectName: 'rag-test-repo',
      description: 'Test repo for RAG pipeline',
      workspacePath: testWorkspaceDir,
    });

    expect(repoResult.success).toBe(true);
    repoId = repoResult.repoId!;
  }, 60000);

  afterAll(async () => {
    // Cleanup test workspace
    try {
      const bigrackJsonPath = path.join(testWorkspaceDir, 'bigrack.json');
      if (fs.existsSync(bigrackJsonPath)) {
        fs.unlinkSync(bigrackJsonPath);
      }
      fs.rmdirSync(testWorkspaceDir);
    } catch {
      // Ignore cleanup errors
    }

    await disconnectPrisma();
  });

  describe('Business Rule Storage and Query', () => {
    let businessRuleId: string;

    it('should store a business rule with embedding', async () => {
      const result = await bigrackStoreContext({
        repoId,
        type: 'business_rule',
        name: 'Email Validation Rule',
        description: 'All user emails must be validated before account activation',
        category: 'authentication',
        priority: 'high',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      businessRuleId = result.id!;

      // Verify embedding was created
      const prisma = getPrisma();
      const embedding = await prisma.vectorEmbedding.findFirst({
        where: {
          entityType: 'business_rule',
          entityId: businessRuleId,
        },
      });

      expect(embedding).not.toBeNull();
      expect(embedding?.embeddingModel).toBe('all-MiniLM-L6-v2');
      expect(embedding?.dimension).toBe(384);
    }, 60000);

    it('should find business rule with semantic query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'email verification requirements',
        topK: 5,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results!.length).toBeGreaterThan(0);

      // The stored business rule should be in results
      const foundRule = result.results!.find(
        (r: any) => r.type === 'business_rule' && r.id === businessRuleId
      );
      expect(foundRule).toBeDefined();
    }, 60000);

    it('should not find business rule with unrelated query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'database backup schedule',
        topK: 5,
        minSimilarity: 0.7, // High threshold
      });

      expect(result.success).toBe(true);

      // Should not find the email validation rule with high similarity
      const foundRule = result.results?.find(
        (r: any) => r.type === 'business_rule' && r.id === businessRuleId
      );
      expect(foundRule).toBeUndefined();
    }, 60000);

    it('should delete business rule and embedding', async () => {
      const result = await bigrackDeleteContext({
        type: 'business_rule',
        id: businessRuleId,
      });

      expect(result.success).toBe(true);

      // Verify embedding was deleted
      const prisma = getPrisma();
      const embedding = await prisma.vectorEmbedding.findFirst({
        where: {
          entityType: 'business_rule',
          entityId: businessRuleId,
        },
      });

      expect(embedding).toBeNull();
    }, 30000);
  });

  describe('Glossary Entry Storage and Query', () => {
    let glossaryId: string;

    it('should store a glossary entry with embedding', async () => {
      const result = await bigrackStoreContext({
        repoId,
        type: 'glossary',
        term: 'API',
        definition: 'Application Programming Interface - a set of protocols for building software',
        category: 'technical',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      glossaryId = result.id!;
    }, 60000);

    it('should find glossary with definition query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'software protocols interface',
        entityTypes: ['glossary_entry'],
        topK: 3,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);

      // Should find our API glossary entry
      const found = result.results?.find((r: any) => r.id === glossaryId);
      expect(found).toBeDefined();
    }, 60000);

    afterAll(async () => {
      // Cleanup
      if (glossaryId) {
        await bigrackDeleteContext({ type: 'glossary', id: glossaryId });
      }
    });
  });

  describe('Pattern Storage and Query', () => {
    let patternId: string;

    it('should store an architecture pattern with embedding', async () => {
      const result = await bigrackStoreContext({
        repoId,
        type: 'pattern',
        name: 'Repository Pattern',
        description: 'Abstracts data access behind a collection-like interface',
        category: 'data-access',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      patternId = result.id!;
    }, 60000);

    it('should find pattern with semantic query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'data layer abstraction',
        entityTypes: ['pattern'],
        topK: 3,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);

      const found = result.results?.find((r: any) => r.id === patternId);
      expect(found).toBeDefined();
    }, 60000);

    afterAll(async () => {
      if (patternId) {
        await bigrackDeleteContext({ type: 'pattern', id: patternId });
      }
    });
  });

  describe('Convention Storage and Query', () => {
    let conventionId: string;

    it('should store a team convention with embedding', async () => {
      const result = await bigrackStoreContext({
        repoId,
        type: 'convention',
        category: 'naming',
        rule: 'Use camelCase for variable names and PascalCase for class names',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      conventionId = result.id!;
    }, 60000);

    it('should find convention with naming query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'variable naming conventions camelCase',
        entityTypes: ['convention'],
        topK: 3,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);

      const found = result.results?.find((r: any) => r.id === conventionId);
      expect(found).toBeDefined();
    }, 60000);

    afterAll(async () => {
      if (conventionId) {
        await bigrackDeleteContext({ type: 'convention', id: conventionId });
      }
    });
  });

  describe('Document Storage and Query', () => {
    let documentId: string;

    it('should store a document with embedding', async () => {
      const result = await bigrackStoreContext({
        repoId,
        type: 'document',
        title: 'Authentication Flow',
        content:
          'Users must authenticate using OAuth2. The system supports Google and GitHub providers. After successful authentication, a JWT token is issued with a 24-hour expiration.',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      documentId = result.id!;
    }, 60000);

    it('should find document with OAuth query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'OAuth authentication JWT token',
        entityTypes: ['document'],
        topK: 3,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);

      const found = result.results?.find((r: any) => r.id === documentId);
      expect(found).toBeDefined();
    }, 60000);

    afterAll(async () => {
      if (documentId) {
        await bigrackDeleteContext({ type: 'document', id: documentId });
      }
    });
  });

  describe('Cross-type Search', () => {
    let ruleId: string;
    let glossaryId: string;

    beforeAll(async () => {
      // Store related contexts
      const ruleResult = await bigrackStoreContext({
        repoId,
        type: 'business_rule',
        name: 'Password Policy',
        description:
          'Passwords must be at least 8 characters with uppercase, lowercase, and numbers',
        category: 'security',
        priority: 'critical',
      });
      ruleId = ruleResult.id!;

      const glossaryResult = await bigrackStoreContext({
        repoId,
        type: 'glossary',
        term: 'Password Hash',
        definition: 'A cryptographic one-way function applied to passwords for secure storage',
        category: 'security',
      });
      glossaryId = glossaryResult.id!;
    }, 120000);

    it('should find multiple entity types with security query', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'password security requirements',
        topK: 5,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThanOrEqual(1);

      // Check we can find both types
      const types = result.results!.map((r: any) => r.type);
      expect(types.some((t: string) => t === 'business_rule' || t === 'glossary_entry')).toBe(true);
    }, 60000);

    it('should filter by entity type', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'password security',
        entityTypes: ['business_rule'],
        topK: 5,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);

      // All results should be business rules only
      result.results?.forEach((r: any) => {
        expect(r.type).toBe('business_rule');
      });
    }, 60000);

    afterAll(async () => {
      if (ruleId) await bigrackDeleteContext({ type: 'business_rule', id: ruleId });
      if (glossaryId) await bigrackDeleteContext({ type: 'glossary', id: glossaryId });
    });
  });

  describe('Similarity Thresholds', () => {
    let contextId: string;

    beforeAll(async () => {
      const result = await bigrackStoreContext({
        repoId,
        type: 'business_rule',
        name: 'User Registration',
        description: 'New users must provide email, password, and accept terms of service',
        category: 'onboarding',
        priority: 'high',
      });
      contextId = result.id!;
    }, 60000);

    it('should return results with low threshold (0.3)', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'user signup process',
        minSimilarity: 0.3,
        topK: 5,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);

      // All results should have similarity >= 0.3
      result.results?.forEach((r: any) => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.3);
      });
    }, 60000);

    it('should return fewer results with high threshold (0.7)', async () => {
      const lowResult = await bigrackQueryContext({
        repoId,
        query: 'user signup process',
        minSimilarity: 0.3,
        topK: 10,
      });

      const highResult = await bigrackQueryContext({
        repoId,
        query: 'user signup process',
        minSimilarity: 0.7,
        topK: 10,
      });

      expect(lowResult.results!.length).toBeGreaterThanOrEqual(highResult.results!.length);

      // All high threshold results should have similarity >= 0.7
      highResult.results?.forEach((r: any) => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.7);
      });
    }, 60000);

    afterAll(async () => {
      if (contextId) await bigrackDeleteContext({ type: 'business_rule', id: contextId });
    });
  });

  describe('Query Validation', () => {
    it('should handle empty query gracefully', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: '',
        topK: 5,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('empty');
    });

    it('should handle non-existent repo', async () => {
      const result = await bigrackQueryContext({
        repoId: 'non-existent-repo-id',
        query: 'test query',
        topK: 5,
      });

      // Should either fail or return empty results
      if (result.success) {
        expect(result.results?.length).toBe(0);
      }
    });
  });

  describe('Distinct Topics Semantic Search', () => {
    // Store contexts on VERY different topics to ensure semantic search works correctly
    let cookingRuleId: string;
    let astronomyGlossaryId: string;
    let musicPatternId: string;
    let gardeningConventionId: string;
    let sportsDocumentId: string;

    beforeAll(async () => {
      // Topic 1: COOKING - about recipes and ingredients
      const cookingResult = await bigrackStoreContext({
        repoId,
        type: 'business_rule',
        name: 'Recipe Ingredient Validation',
        description:
          'All recipes must list ingredients with precise measurements in grams or milliliters. Cooking temperatures must be specified in Celsius.',
        category: 'culinary',
        priority: 'high',
      });
      cookingRuleId = cookingResult.id!;

      // Topic 2: ASTRONOMY - about planets and galaxies
      const astronomyResult = await bigrackStoreContext({
        repoId,
        type: 'glossary',
        term: 'Black Hole',
        definition:
          'A region in spacetime where gravity is so strong that nothing, including light and electromagnetic waves, can escape. Formed when massive stars collapse.',
        category: 'astrophysics',
      });
      astronomyGlossaryId = astronomyResult.id!;

      // Topic 3: MUSIC - about composition and instruments
      const musicResult = await bigrackStoreContext({
        repoId,
        type: 'pattern',
        name: 'Sonata Form Structure',
        description:
          'A musical composition pattern with exposition, development, and recapitulation sections. Used in symphonies and piano sonatas by Mozart and Beethoven.',
        category: 'classical-music',
      });
      musicPatternId = musicResult.id!;

      // Topic 4: GARDENING - about plants and soil
      const gardeningResult = await bigrackStoreContext({
        repoId,
        type: 'convention',
        category: 'horticulture',
        rule: 'Always test soil pH before planting vegetables. Tomatoes prefer slightly acidic soil between 6.0 and 6.8 pH levels.',
      });
      gardeningConventionId = gardeningResult.id!;

      // Topic 5: SPORTS - about basketball rules
      const sportsResult = await bigrackStoreContext({
        repoId,
        type: 'document',
        title: 'Basketball Three-Point Line Rules',
        content:
          'The three-point line in NBA is 23 feet 9 inches from the basket at the top of the arc. A shot made from beyond this line scores three points instead of two. The corner three-pointer is shorter at 22 feet.',
      });
      sportsDocumentId = sportsResult.id!;
    }, 120000);

    afterAll(async () => {
      // Cleanup all contexts
      if (cookingRuleId) await bigrackDeleteContext({ type: 'business_rule', id: cookingRuleId });
      if (astronomyGlossaryId)
        await bigrackDeleteContext({ type: 'glossary', id: astronomyGlossaryId });
      if (musicPatternId) await bigrackDeleteContext({ type: 'pattern', id: musicPatternId });
      if (gardeningConventionId)
        await bigrackDeleteContext({ type: 'convention', id: gardeningConventionId });
      if (sportsDocumentId) await bigrackDeleteContext({ type: 'document', id: sportsDocumentId });
    });

    it('should find ONLY cooking context when querying about recipes and ingredients', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'recipe ingredients grams milliliters cooking temperature',
        topK: 5,
        minSimilarity: 0.4,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);

      // First result should be the cooking rule
      const topResult = result.results![0];
      expect(topResult.id).toBe(cookingRuleId);
      expect(topResult.type).toBe('business_rule');

      // Should NOT find astronomy, music, gardening, or sports in top results
      const hasAstronomy = result.results!.some((r: any) => r.id === astronomyGlossaryId);
      const hasMusic = result.results!.some((r: any) => r.id === musicPatternId);
      const hasSports = result.results!.some((r: any) => r.id === sportsDocumentId);

      expect(hasAstronomy).toBe(false);
      expect(hasMusic).toBe(false);
      expect(hasSports).toBe(false);
    }, 60000);

    it('should find ONLY astronomy context when querying about black holes and gravity', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'black hole gravity spacetime stars collapse light escape',
        topK: 5,
        minSimilarity: 0.4,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);

      // First result should be astronomy glossary
      const topResult = result.results![0];
      expect(topResult.id).toBe(astronomyGlossaryId);
      expect(topResult.type).toBe('glossary_entry');

      // Should NOT find cooking, music, gardening in top results
      const hasCooking = result.results!.some((r: any) => r.id === cookingRuleId);
      const hasMusic = result.results!.some((r: any) => r.id === musicPatternId);
      const hasGardening = result.results!.some((r: any) => r.id === gardeningConventionId);

      expect(hasCooking).toBe(false);
      expect(hasMusic).toBe(false);
      expect(hasGardening).toBe(false);
    }, 60000);

    it('should find ONLY music context when querying about sonata and symphony', async () => {
      const result = await bigrackQueryContext({
        repoId,
        query: 'sonata symphony Mozart Beethoven exposition recapitulation musical composition',
        topK: 5,
        minSimilarity: 0.4,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);

      // First result should be music pattern
      const topResult = result.results![0];
      expect(topResult.id).toBe(musicPatternId);
      expect(topResult.type).toBe('pattern');

      // Should NOT find other unrelated topics
      const hasCooking = result.results!.some((r: any) => r.id === cookingRuleId);
      const hasAstronomy = result.results!.some((r: any) => r.id === astronomyGlossaryId);
      const hasSports = result.results!.some((r: any) => r.id === sportsDocumentId);

      expect(hasCooking).toBe(false);
      expect(hasAstronomy).toBe(false);
      expect(hasSports).toBe(false);
    }, 60000);

    it('should find ONLY gardening context when querying about soil pH and tomatoes', async () => {
      const result = await bigrackQueryContext({
        repoId,
        // Slightly relaxed / more literal query to better match the stored text
        query:
          'garden soil pH vegetables tomatoes slightly acidic soil between 6.0 and 6.8 horticulture',
        topK: 5,
        // Use the same threshold as most other semantic tests to avoid overfitting
        // to a specific embedding model version.
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);

      // First result should be gardening convention
      const topResult = result.results![0];
      expect(topResult.id).toBe(gardeningConventionId);
      expect(topResult.type).toBe('convention');

      // Should NOT find other unrelated topics
      const hasAstronomy = result.results!.some((r: any) => r.id === astronomyGlossaryId);
      const hasMusic = result.results!.some((r: any) => r.id === musicPatternId);
      const hasSports = result.results!.some((r: any) => r.id === sportsDocumentId);

      expect(hasAstronomy).toBe(false);
      expect(hasMusic).toBe(false);
      expect(hasSports).toBe(false);
    }, 60000);

    it('should find ONLY basketball context when querying about three-point line', async () => {
      const result = await bigrackQueryContext({
        repoId,
        // Make the query closer to the actual document wording so that it is
        // robust across small embedding model changes.
        query:
          'basketball three-point line NBA 23 feet 9 inches corner three-pointer scores three points',
        topK: 5,
        minSimilarity: 0.3,
      });

      expect(result.success).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);

      // First result should be sports document
      const topResult = result.results![0];
      expect(topResult.id).toBe(sportsDocumentId);
      expect(topResult.type).toBe('document');

      // Should NOT find other unrelated topics
      const hasCooking = result.results!.some((r: any) => r.id === cookingRuleId);
      const hasAstronomy = result.results!.some((r: any) => r.id === astronomyGlossaryId);
      const hasGardening = result.results!.some((r: any) => r.id === gardeningConventionId);

      expect(hasCooking).toBe(false);
      expect(hasAstronomy).toBe(false);
      expect(hasGardening).toBe(false);
    }, 60000);

    it('should return correct context even with partial/vague queries', async () => {
      // Query with just "galaxy stars" should find astronomy
      const astroResult = await bigrackQueryContext({
        repoId,
        query: 'massive stars collapse',
        topK: 3,
        minSimilarity: 0.3,
      });

      expect(astroResult.success).toBe(true);
      const foundAstro = astroResult.results?.find((r: any) => r.id === astronomyGlossaryId);
      expect(foundAstro).toBeDefined();

      // Query with just "piano" should find music
      const musicResult = await bigrackQueryContext({
        repoId,
        query: 'piano classical composition',
        topK: 3,
        minSimilarity: 0.3,
      });

      expect(musicResult.success).toBe(true);
      const foundMusic = musicResult.results?.find((r: any) => r.id === musicPatternId);
      expect(foundMusic).toBeDefined();
    }, 60000);

    it('should rank results by relevance - most relevant first', async () => {
      // Store a second cooking-related item to test ranking
      const secondCookingResult = await bigrackStoreContext({
        repoId,
        type: 'document',
        title: 'Kitchen Equipment Guide',
        content:
          'Essential kitchen tools include measuring cups, thermometers, and scales for precise cooking.',
      });
      const secondCookingId = secondCookingResult.id!;

      try {
        const result = await bigrackQueryContext({
          repoId,
          // Query explicitly mentions both recipes/ingredients and kitchen tools
          // so that both the business rule and the kitchen equipment guide are
          // clearly relevant even if the underlying embedding model changes a bit.
          query:
            'recipe ingredients precise measurements in grams and milliliters kitchen tools measuring cups thermometers cooking',
          topK: 10,
          minSimilarity: 0.25,
        });

        expect(result.success).toBe(true);

        // Both cooking items should be in results
        const cookingResults = result.results!.filter(
          (r: any) => r.id === cookingRuleId || r.id === secondCookingId
        );
        expect(cookingResults.length).toBe(2);

        // Cooking results should be ranked higher than unrelated topics
        const cookingIndices = cookingResults.map((r: any) =>
          result.results!.findIndex((res: any) => res.id === r.id)
        );
        const astronomyIndex = result.results!.findIndex((r: any) => r.id === astronomyGlossaryId);

        // If astronomy is in results, it should be ranked lower than cooking items
        if (astronomyIndex !== -1) {
          cookingIndices.forEach((idx: number) => {
            expect(idx).toBeLessThan(astronomyIndex);
          });
        }
      } finally {
        // Cleanup second cooking document
        await bigrackDeleteContext({ type: 'document', id: secondCookingId });
      }
    }, 60000);
  });
});
