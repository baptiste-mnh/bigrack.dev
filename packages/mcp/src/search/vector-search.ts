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

import { getPrisma, getDatabasePath } from '../storage/prisma';
import { generateEmbedding } from '../embeddings';
import { logger } from '../logger';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import * as vss from 'sqlite-vss';

/**
 * Result from vector similarity search
 */
export interface VectorSearchResult {
  entityType: string;
  entityId: string;
  distance: number; // Cosine distance [0, 2]
  similarity: number; // Similarity score [0, 1]
  repoId: string;
  projectId?: string;
  category?: string;
  priority?: string;
  // Chunking metadata
  chunkIndex?: number;
  totalChunks?: number;
  chunkStartOffset?: number;
  chunkEndOffset?: number;
}

/**
 * Options for vector search
 */
export interface VectorSearchOptions {
  repoId?: string;
  projectId?: string;
  entityTypes?: string[];
  topK?: number;
  minSimilarity?: number;
}

/**
 * Entity with full data from source table
 */
export interface EntityWithData extends VectorSearchResult {
  data: any; // Full entity data from source table
}

/**
 * Initialize sqlite-vss extension and create virtual table
 */
export async function initializeVectorSearch(db: DatabaseType): Promise<void> {
  try {
    logger.info('Initializing sqlite-vss extension');

    // Load sqlite-vss extension
    vss.load(db);

    // Check if virtual table already exists
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vss_embeddings'")
      .get();

    if (!tableExists) {
      // Create virtual table for vector search
      db.exec(`
        CREATE VIRTUAL TABLE vss_embeddings USING vss0(
          embedding(384)
        );
      `);

      logger.info('Created vss_embeddings virtual table');
    } else {
      logger.debug('vss_embeddings virtual table already exists');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize vector search');
    throw new Error(`Vector search initialization failed: ${error}`);
  }
}

/**
 * Build vector index from VectorEmbedding table
 * Call this after bulk loading embeddings
 */
export async function buildVectorIndex(): Promise<void> {
  const prisma = getPrisma();

  try {
    logger.info('Building vector index from VectorEmbedding table');

    // Get all embeddings
    const embeddings = await prisma.vectorEmbedding.findMany({
      select: {
        id: true,
        embedding: true,
      },
    });

    if (embeddings.length === 0) {
      logger.warn('No embeddings found to index');
      return;
    }

    // Get database path from environment/config
    const dbPath = getDatabasePath();
    const db = new Database(dbPath);

    // Initialize vss
    await initializeVectorSearch(db);

    // Clear existing indexes
    db.prepare('DELETE FROM vss_embeddings').run();
    db.prepare('DELETE FROM vector_embeddings_rowid_map').run();

    // Insert embeddings with rowid mapping
    const insertMapStmt = db.prepare(`
      INSERT INTO vector_embeddings_rowid_map(embedding_id)
      VALUES (?)
    `);

    const insertVssStmt = db.prepare(`
      INSERT INTO vss_embeddings(rowid, embedding)
      VALUES (?, ?)
    `);

    const insertMany = db.transaction((embs: any[]) => {
      for (const emb of embs) {
        // Insert into mapping table to get integer rowid
        const info = insertMapStmt.run(emb.id);
        const rowid = info.lastInsertRowid as number;

        // Insert into vss with integer rowid
        const vector = JSON.parse(emb.embedding);
        insertVssStmt.run(rowid, JSON.stringify(vector));
      }
    });

    insertMany(embeddings);

    db.close();

    logger.info({ count: embeddings.length }, 'Vector index built successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to build vector index');
    throw error;
  }
}

/**
 * Search for similar embeddings using vector similarity
 */
export async function searchSimilarEmbeddings(
  queryEmbedding: number[],
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { repoId, projectId, entityTypes, topK = 10, minSimilarity = 0.0 } = options;

  const prisma = getPrisma();

  try {
    // Check if context inheritance is needed
    let shouldInheritRepoContext = false;
    let projectRepoId = repoId;

    if (projectId && repoId) {
      // Check if project inherits from repo
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { inheritsFromRepo: true, repoId: true },
      });

      if (project && project.inheritsFromRepo) {
        shouldInheritRepoContext = true;
        projectRepoId = project.repoId; // Use project's repoId to ensure consistency
      }
    }

    // Get database path from environment/config
    const dbPath = getDatabasePath();
    let db = new Database(dbPath);

    // Load vss extension
    vss.load(db);

    // Initialize vss if needed
    await initializeVectorSearch(db);

    // Check if vss_embeddings table is empty
    const countResult = db.prepare('SELECT COUNT(*) as count FROM vss_embeddings').get() as any;
    const vssCount = countResult?.count || 0;

    if (vssCount === 0) {
      // Check if there are embeddings in Prisma that need to be indexed
      const prismaEmbeddingCount = await prisma.vectorEmbedding.count();

      if (prismaEmbeddingCount > 0) {
        logger.info(
          { prismaCount: prismaEmbeddingCount, vssCount },
          'Vector index is empty but embeddings exist in Prisma, rebuilding index...'
        );
        db.close();

        // Rebuild index from Prisma embeddings
        await buildVectorIndex();

        // Reopen database connection for search
        db = new Database(dbPath);
        vss.load(db);

        // Verify index was built
        const newCountResult = db
          .prepare('SELECT COUNT(*) as count FROM vss_embeddings')
          .get() as any;
        const newVssCount = newCountResult?.count || 0;

        if (newVssCount === 0) {
          logger.warn('Index rebuild completed but vss_embeddings is still empty');
          db.close();
          return [];
        }

        logger.info({ indexedCount: newVssCount }, 'Vector index rebuilt successfully');
      } else {
        logger.debug(
          'vss_embeddings table is empty and no embeddings in Prisma, returning empty results'
        );
        db.close();
        return [];
      }
    }

    // Search in vss table for top-K similar vectors
    // Get more results to allow filtering and inheritance merging
    const searchLimit = shouldInheritRepoContext ? topK * 3 : topK * 2;
    const vssQuery = `
      SELECT
        rowid,
        distance
      FROM vss_embeddings
      WHERE vss_search(embedding, ?)
      LIMIT ?
    `;

    let vssResults: any[] = [];
    try {
      vssResults = db.prepare(vssQuery).all(JSON.stringify(queryEmbedding), searchLimit) as any[];
    } catch (error: any) {
      // Handle sqlite-vss errors (e.g., "Could not read index at position 0")
      if (error?.message?.includes('Could not read index') || error?.message?.includes('index')) {
        logger.warn({ err: error }, 'Vector index error, returning empty results');
        db.close();
        return [];
      }
      // Re-throw other errors
      db.close();
      throw error;
    }

    // Map rowids to embedding UUIDs
    const rowids = vssResults.map((r: any) => r.rowid);

    if (rowids.length === 0) {
      db.close();
      return [];
    }

    const mappingQuery = `
      SELECT rowid, embedding_id
      FROM vector_embeddings_rowid_map
      WHERE rowid IN (${rowids.map(() => '?').join(',')})
    `;
    const mappings = db.prepare(mappingQuery).all(...rowids) as any[];

    db.close();

    if (mappings.length === 0) {
      return [];
    }

    // Create map of rowid -> embedding_id (UUID)
    const rowidToUuid = new Map(mappings.map((m: any) => [m.rowid, m.embedding_id]));

    // Get embedding IDs (UUIDs)
    const embeddingIds = vssResults
      .map((r: any) => rowidToUuid.get(r.rowid))
      .filter((id): id is string => id !== undefined);

    logger.debug({ embeddingIds, count: embeddingIds.length }, 'Mapped rowids to UUIDs');

    if (embeddingIds.length === 0) {
      logger.warn('No UUIDs found after mapping');
      return [];
    }

    // Build where clause for filters
    // If inheriting, search both project-specific AND repo-level contexts
    const where: any = {
      id: { in: embeddingIds },
      repoId: projectRepoId || repoId, // Always filter by repoId
    };

    if (shouldInheritRepoContext && projectId) {
      // Search both project-specific (projectId = projectId) and repo-level (projectId = null)
      where.OR = [{ projectId: projectId }, { projectId: null }];
    } else if (projectId) {
      // Only search project-specific context
      where.projectId = projectId;
    }
    // If only repoId is provided, search all repo-level context (projectId = null or undefined)
    // No need to filter by projectId in this case

    if (entityTypes && entityTypes.length > 0) {
      where.entityType = { in: entityTypes };
    }

    // Get embeddings with metadata
    logger.debug({ where }, 'Querying Prisma with where clause');

    const embeddings = await prisma.vectorEmbedding.findMany({
      where,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        repoId: true,
        projectId: true,
        category: true,
        priority: true,
        chunkIndex: true,
        totalChunks: true,
        chunkStartOffset: true,
        chunkEndOffset: true,
      },
    });

    logger.debug({ count: embeddings.length }, 'Prisma returned embeddings');

    // Create map of id -> embedding for quick lookup
    const embeddingMap = new Map(embeddings.map((e) => [e.id, e]));

    // Combine results and calculate similarity
    const results: VectorSearchResult[] = vssResults
      .map((vssResult: any) => {
        // Map rowid to UUID first
        const embeddingId = rowidToUuid.get(vssResult.rowid);
        if (!embeddingId) return null;

        const embedding = embeddingMap.get(embeddingId);
        if (!embedding) return null;

        // Convert cosine distance to similarity
        // distance ∈ [0, 2], similarity ∈ [0, 1]
        const similarity = 1 - vssResult.distance / 2;

        const result: VectorSearchResult = {
          entityType: embedding.entityType,
          entityId: embedding.entityId,
          distance: vssResult.distance,
          similarity,
          repoId: embedding.repoId,
          projectId: embedding.projectId || undefined,
          category: embedding.category || undefined,
          priority: embedding.priority || undefined,
          chunkIndex: embedding.chunkIndex || 0,
          totalChunks: embedding.totalChunks || 1,
          chunkStartOffset: embedding.chunkStartOffset || 0,
          chunkEndOffset: embedding.chunkEndOffset || 0,
        };

        return result;
      })
      .filter((r): r is VectorSearchResult => r !== null && r.similarity >= minSimilarity);

    // If inheriting, prioritize project-specific results over repo-level
    // Sort: project-specific first (higher priority), then by similarity
    if (shouldInheritRepoContext && projectId) {
      results.sort((a, b) => {
        const aIsProjectSpecific = a.projectId === projectId;
        const bIsProjectSpecific = b.projectId === projectId;

        // Project-specific results come first
        if (aIsProjectSpecific && !bIsProjectSpecific) return -1;
        if (!aIsProjectSpecific && bIsProjectSpecific) return 1;

        // Then sort by similarity (descending)
        return b.similarity - a.similarity;
      });
    } else {
      // Just sort by similarity
      results.sort((a, b) => b.similarity - a.similarity);
    }

    // Take topK results
    const finalResults = results.slice(0, topK);

    logger.debug(
      {
        count: finalResults.length,
        topK,
        minSimilarity,
        repoId: projectRepoId || repoId,
        projectId,
        inherited: shouldInheritRepoContext,
        entityTypes,
      },
      'Vector search completed'
    );

    return finalResults;
  } catch (error) {
    logger.error({ err: error }, 'Vector search failed');
    throw error;
  }
}

/**
 * Search by text query (generates embedding then searches)
 */
export async function searchByText(
  query: string,
  options: VectorSearchOptions = {}
): Promise<EntityWithData[]> {
  try {
    logger.debug({ query, options }, 'Searching by text');

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar embeddings
    const results = await searchSimilarEmbeddings(queryEmbedding, options);

    // Fetch full entity data
    const entitiesWithData = await fetchEntityData(results);

    return entitiesWithData;
  } catch (error) {
    logger.error({ err: error, query }, 'Search by text failed');
    throw error;
  }
}

/**
 * Find similar entities to a given entity
 */
export async function findSimilarEntities(
  entityId: string,
  entityType: string,
  options: Omit<VectorSearchOptions, 'entityTypes'> = {}
): Promise<EntityWithData[]> {
  const prisma = getPrisma();

  try {
    // Get the source entity's embedding (first chunk if chunked)
    const embedding = await prisma.vectorEmbedding.findUnique({
      where: {
        entityType_entityId_chunkIndex: {
          entityType,
          entityId,
          chunkIndex: 0,
        },
      },
    });

    if (!embedding) {
      throw new Error(`Embedding not found for ${entityType}:${entityId}`);
    }

    // Parse embedding vector
    const vector = JSON.parse(embedding.embedding);

    // Search for similar (excluding the source entity itself)
    const results = await searchSimilarEmbeddings(vector, {
      ...options,
      topK: (options.topK || 10) + 1, // Get one extra to exclude self
    });

    // Filter out the source entity
    const filtered = results.filter((r) => r.entityId !== entityId);

    // Fetch full entity data
    const entitiesWithData = await fetchEntityData(filtered.slice(0, options.topK || 10));

    return entitiesWithData;
  } catch (error) {
    logger.error({ err: error, entityId, entityType }, 'Find similar entities failed');
    throw error;
  }
}

/**
 * Get related context for a repo based on a query
 */
export async function getRelatedContext(
  repoId: string,
  query: string,
  options: Omit<VectorSearchOptions, 'repoId'> = {}
): Promise<EntityWithData[]> {
  return searchByText(query, {
    ...options,
    repoId,
  });
}

/**
 * Fetch full entity data from source tables
 */
async function fetchEntityData(results: VectorSearchResult[]): Promise<EntityWithData[]> {
  const prisma = getPrisma();

  try {
    const entitiesWithData = await Promise.all(
      results.map(async (result) => {
        let data: any = null;

        try {
          switch (result.entityType) {
            case 'business_rule':
              data = await prisma.businessRule.findUnique({
                where: { id: result.entityId },
              });
              break;

            case 'glossary_entry':
              data = await prisma.glossaryEntry.findUnique({
                where: { id: result.entityId },
              });
              break;

            case 'pattern':
              if (!result.entityId) {
                logger.warn({ result }, 'Missing entityId for pattern');
                break;
              }
              data = await prisma.architecturePattern.findUnique({
                where: { id: result.entityId },
              });
              break;

            case 'convention':
              data = await prisma.teamConvention.findUnique({
                where: { id: result.entityId },
              });
              break;

            case 'document':
              data = await prisma.document.findUnique({
                where: { id: result.entityId },
              });
              break;

            case 'project_context':
              data = await prisma.projectContext.findUnique({
                where: { id: result.entityId },
              });
              break;

            case 'task':
              data = await prisma.task.findUnique({
                where: { id: result.entityId },
                include: {
                  project: {
                    include: {
                      repo: true,
                    },
                  },
                },
              });
              break;

            default:
              logger.warn({ entityType: result.entityType }, 'Unknown entity type');
          }
        } catch (error: any) {
          logger.error(
            {
              err: error,
              entityType: result.entityType,
              entityId: result.entityId,
              errorMessage: error?.message,
              errorStack: error?.stack,
            },
            'Failed to fetch entity data for specific entity'
          );
          // Continue with data = null, will be filtered out
        }

        return {
          ...result,
          data,
        };
      })
    );

    // Filter out entities where data fetch failed
    return entitiesWithData.filter((e) => e.data !== null);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch entity data');
    throw error;
  }
}

/**
 * Add embedding to vector index
 * Call this after storing a new entity
 */
export async function addToVectorIndex(embeddingId: string, vector: number[]): Promise<void> {
  try {
    const dbPath = getDatabasePath();
    const db = new Database(dbPath);

    vss.load(db);

    // Initialize vss if needed
    await initializeVectorSearch(db);

    // Insert into mapping table to get integer rowid
    const insertMapStmt = db.prepare(`
      INSERT INTO vector_embeddings_rowid_map(embedding_id)
      VALUES (?)
    `);
    const info = insertMapStmt.run(embeddingId);
    const rowid = info.lastInsertRowid as number;

    // Insert into vss virtual table with integer rowid
    db.prepare(
      `
      INSERT INTO vss_embeddings(rowid, embedding)
      VALUES (?, ?)
    `
    ).run(rowid, JSON.stringify(vector));

    db.close();

    logger.debug({ embeddingId, rowid }, 'Added embedding to vector index');
  } catch (error) {
    logger.error({ err: error, embeddingId }, 'Failed to add to vector index');
    throw error;
  }
}

/**
 * Remove embedding from vector index
 * Call this when deleting an entity
 */
export async function removeFromVectorIndex(embeddingId: string): Promise<void> {
  try {
    const dbPath = getDatabasePath();
    const db = new Database(dbPath);

    vss.load(db);

    // Get rowid from mapping table
    const mapping = db
      .prepare(`SELECT rowid FROM vector_embeddings_rowid_map WHERE embedding_id = ?`)
      .get(embeddingId) as any;

    if (!mapping) {
      logger.warn({ embeddingId }, 'No rowid mapping found for embedding');
      db.close();
      return;
    }

    const rowid = mapping.rowid;

    // Delete from vss virtual table
    db.prepare(`DELETE FROM vss_embeddings WHERE rowid = ?`).run(rowid);

    // Delete from mapping table (will cascade via FK)
    db.prepare(`DELETE FROM vector_embeddings_rowid_map WHERE rowid = ?`).run(rowid);

    db.close();

    logger.debug({ embeddingId, rowid }, 'Removed embedding from vector index');
  } catch (error) {
    logger.error({ err: error, embeddingId }, 'Failed to remove from vector index');
    throw error;
  }
}
