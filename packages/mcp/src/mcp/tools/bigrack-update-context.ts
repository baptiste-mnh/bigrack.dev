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

import { getPrisma } from '../../storage/prisma';
import { storageLogger } from '../../logger';
import { generateEmbedding, chunkText, DEFAULT_CHUNKING_CONFIG } from '../../embeddings';
import { addToVectorIndex, removeFromVectorIndex } from '../../search';
import { createHash } from 'crypto';

export interface BigrackUpdateContextArgs {
  type: 'business_rule' | 'glossary' | 'pattern' | 'convention' | 'document';
  id: string; // ID of the context entity to update

  // Business Rule fields
  name?: string;
  description?: string;
  validationLogic?: string;
  examples?: string[];
  relatedDomains?: string[];
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  isActive?: boolean;

  // Glossary Entry fields
  term?: string;
  definition?: string;
  synonyms?: string[];
  relatedTerms?: string[];

  // Architecture Pattern fields
  whenToUse?: string;
  example?: string;
  benefits?: string[];
  tradeoffs?: string[];

  // Team Convention fields
  rule?: string;
  enforced?: boolean;

  // Document fields
  title?: string;
  content?: string;
  tags?: string[];
  mimeType?: string;
  documentType?: 'api-doc' | 'decision' | 'postmortem' | 'general';
}

export interface BigrackUpdateContextResult {
  success: boolean;
  id?: string;
  type?: string;
  message: string;
  embeddingUpdated?: boolean;
}

/**
 * Update business context (rules, glossary, patterns, conventions, documents)
 * Automatically updates embeddings if content changes
 */
export async function bigrackUpdateContext(
  args: BigrackUpdateContextArgs
): Promise<BigrackUpdateContextResult> {
  const { type, id, ...updates } = args;

  storageLogger.info({ type, id, updateFields: Object.keys(updates) }, 'Updating context');

  try {
    const prisma = getPrisma();

    // Update the entity based on type
    let updatedEntity: any;
    let repoId: string;
    let projectId: string | null = null;

    switch (type) {
      case 'business_rule': {
        const existing = await prisma.businessRule.findUnique({ where: { id } });
        if (!existing) {
          return { success: false, message: `Business rule not found: ${id}` };
        }
        repoId = existing.repoId;

        const updateData: any = { updatedAt: new Date() };
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.validationLogic !== undefined)
          updateData.validationLogic = updates.validationLogic;
        if (updates.examples !== undefined) updateData.examples = JSON.stringify(updates.examples);
        if (updates.relatedDomains !== undefined)
          updateData.relatedDomains = JSON.stringify(updates.relatedDomains);
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

        updatedEntity = await prisma.businessRule.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      case 'glossary': {
        const existing = await prisma.glossaryEntry.findUnique({ where: { id } });
        if (!existing) {
          return { success: false, message: `Glossary entry not found: ${id}` };
        }
        repoId = existing.repoId;

        const updateData: any = { updatedAt: new Date() };
        if (updates.term !== undefined) updateData.term = updates.term;
        if (updates.definition !== undefined) updateData.definition = updates.definition;
        if (updates.synonyms !== undefined) updateData.synonyms = JSON.stringify(updates.synonyms);
        if (updates.relatedTerms !== undefined)
          updateData.relatedTerms = JSON.stringify(updates.relatedTerms);
        if (updates.examples !== undefined) updateData.examples = JSON.stringify(updates.examples);
        if (updates.category !== undefined) updateData.category = updates.category;

        updatedEntity = await prisma.glossaryEntry.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      case 'pattern': {
        const existing = await prisma.architecturePattern.findUnique({ where: { id } });
        if (!existing) {
          return { success: false, message: `Architecture pattern not found: ${id}` };
        }
        repoId = existing.repoId;

        const updateData: any = { updatedAt: new Date() };
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.whenToUse !== undefined) updateData.whenToUse = updates.whenToUse;
        if (updates.example !== undefined) updateData.example = updates.example;
        if (updates.benefits !== undefined) updateData.benefits = JSON.stringify(updates.benefits);
        if (updates.tradeoffs !== undefined)
          updateData.tradeoffs = JSON.stringify(updates.tradeoffs);
        if (updates.category !== undefined) updateData.category = updates.category;

        updatedEntity = await prisma.architecturePattern.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      case 'convention': {
        const existing = await prisma.teamConvention.findUnique({ where: { id } });
        if (!existing) {
          return { success: false, message: `Team convention not found: ${id}` };
        }
        repoId = existing.repoId;

        const updateData: any = { updatedAt: new Date() };
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.rule !== undefined) updateData.rule = updates.rule;
        if (updates.enforced !== undefined) updateData.enforced = updates.enforced;

        updatedEntity = await prisma.teamConvention.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      case 'document': {
        const existing = await prisma.document.findUnique({ where: { id } });
        if (!existing) {
          return { success: false, message: `Document not found: ${id}` };
        }
        repoId = existing.repoId;

        const updateData: any = { updatedAt: new Date() };
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
        if (updates.mimeType !== undefined) updateData.mimeType = updates.mimeType;
        if (updates.documentType !== undefined) updateData.type = updates.documentType;

        updatedEntity = await prisma.document.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      default:
        return { success: false, message: `Invalid context type: ${type}` };
    }

    // Update embedding
    let embeddingUpdated = false;
    try {
      embeddingUpdated = await updateContextEmbedding(type, updatedEntity, repoId, projectId);
    } catch (error: any) {
      storageLogger.warn(
        { type, id, error: error.message },
        'Failed to update embedding, continuing...'
      );
    }

    storageLogger.info({ type, id, embeddingUpdated }, 'Context updated successfully');

    return {
      success: true,
      id,
      type,
      message: `${getTypeLabel(type)} updated successfully${embeddingUpdated ? ' (embedding updated)' : ''}`,
      embeddingUpdated,
    };
  } catch (error: any) {
    storageLogger.error({ type, id, error }, 'Failed to update context');
    return {
      success: false,
      message: `Failed to update context: ${error.message}`,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update embedding for a context entity
 * Returns true if embedding was updated, false if unchanged
 * For documents: handles chunking and updates all chunks
 */
async function updateContextEmbedding(
  type: string,
  entity: any,
  repoId: string,
  projectId: string | null
): Promise<boolean> {
  const prisma = getPrisma();

  // 1. Build text for embedding
  const text = buildTextForEmbedding(type, entity);

  // 2. Calculate new content hash (global hash for documents)
  const newContentHash = createHash('sha256').update(text).digest('hex');

  // 3. Check if embedding exists (first chunk)
  const existingEmbedding = await prisma.vectorEmbedding.findUnique({
    where: {
      entityType_entityId_chunkIndex: {
        entityType: type,
        entityId: entity.id,
        chunkIndex: 0,
      },
    },
  });

  // 4. If content unchanged, skip update
  if (existingEmbedding && existingEmbedding.contentHash === newContentHash) {
    storageLogger.debug(
      { type, entityId: entity.id },
      'Content unchanged, skipping embedding update'
    );
    return false;
  }

  // 5. Content changed → delete all existing chunks and regenerate
  if (existingEmbedding) {
    storageLogger.debug(
      { type, entityId: entity.id },
      'Content changed, deleting all chunks and regenerating'
    );

    // Delete all chunks for this entity
    const allChunks = await prisma.vectorEmbedding.findMany({
      where: {
        entityType: type,
        entityId: entity.id,
      },
    });

    for (const chunk of allChunks) {
      await removeFromVectorIndex(chunk.id);
      await prisma.vectorEmbedding.delete({ where: { id: chunk.id } });
    }

    storageLogger.debug(
      { type, entityId: entity.id, deletedChunks: allChunks.length },
      'Deleted all existing chunks'
    );
  }

  // 6. Generate new embeddings (with chunking for documents)
  if (type === 'document' && text.length > DEFAULT_CHUNKING_CONFIG.maxChunkSize) {
    storageLogger.debug(
      { entityId: entity.id, textLength: text.length },
      'Document exceeds chunk size, chunking...'
    );

    // Chunk the text
    const chunks = chunkText(text, DEFAULT_CHUNKING_CONFIG);

    storageLogger.info(
      { entityId: entity.id, totalChunks: chunks.length },
      'Document chunked for embedding'
    );

    // Generate and store embedding for each chunk
    const { v4: uuidv4 } = await import('uuid');
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text);

      const embeddingRecord = await prisma.vectorEmbedding.create({
        data: {
          id: uuidv4(),
          entityType: type,
          entityId: entity.id,
          repoId,
          projectId: projectId || null,
          embedding: JSON.stringify(embedding),
          embeddingModel: 'all-MiniLM-L6-v2',
          dimension: 384,
          contentHash: newContentHash, // Store global hash for comparison
          category: entity.category || null,
          priority: entity.priority || null,
          chunkIndex: chunk.index,
          totalChunks: chunk.totalChunks,
          chunkStartOffset: chunk.startOffset,
          chunkEndOffset: chunk.endOffset,
        },
      });

      await addToVectorIndex(embeddingRecord.id, embedding);
    }

    storageLogger.debug(
      { type, entityId: entity.id, chunks: chunks.length },
      'Created chunked embeddings'
    );
    return true;
  } else {
    // Single embedding for non-documents or short documents
    const embedding = await generateEmbedding(text);
    const { v4: uuidv4 } = await import('uuid');
    const embeddingRecord = await prisma.vectorEmbedding.create({
      data: {
        id: uuidv4(),
        entityType: type,
        entityId: entity.id,
        repoId,
        projectId: projectId || null,
        embedding: JSON.stringify(embedding),
        embeddingModel: 'all-MiniLM-L6-v2',
        dimension: 384,
        contentHash: newContentHash,
        category: entity.category || null,
        priority: entity.priority || null,
        chunkIndex: 0,
        totalChunks: 1,
        chunkStartOffset: 0,
        chunkEndOffset: text.length,
      },
    });

    await addToVectorIndex(embeddingRecord.id, embedding);

    storageLogger.debug({ type, entityId: entity.id }, 'Created/updated embedding');
    return true;
  }
}

/**
 * Build text representation for embedding
 */
function buildTextForEmbedding(type: string, data: any): string {
  switch (type) {
    case 'business_rule': {
      const parts: string[] = [];
      parts.push(`Business Rule: ${data.name}`);
      parts.push(data.description);
      if (data.validationLogic) parts.push(`Validation: ${data.validationLogic}`);
      if (data.relatedDomains) {
        try {
          const domains = JSON.parse(data.relatedDomains);
          if (domains.length > 0) parts.push(`Domains: ${domains.join(', ')}`);
        } catch {
          // Ignore JSON parse errors
        }
      }
      if (data.examples) {
        try {
          const examples = JSON.parse(data.examples);
          if (examples.length > 0) parts.push(`Examples: ${examples.join('. ')}`);
        } catch {
          // Ignore JSON parse errors
        }
      }
      return parts.join('. ');
    }

    case 'glossary': {
      const parts: string[] = [];
      parts.push(`Term: ${data.term}`);
      parts.push(data.definition);
      if (data.synonyms) {
        try {
          const synonyms = JSON.parse(data.synonyms);
          if (synonyms.length > 0) parts.push(`Synonyms: ${synonyms.join(', ')}`);
        } catch {
          // Ignore JSON parse errors
        }
      }
      return parts.join('. ');
    }

    case 'pattern': {
      const parts: string[] = [];
      parts.push(`Pattern: ${data.name}`);
      parts.push(data.description);
      if (data.whenToUse) parts.push(`When to use: ${data.whenToUse}`);
      if (data.benefits) {
        try {
          const benefits = JSON.parse(data.benefits);
          if (benefits.length > 0) parts.push(`Benefits: ${benefits.join('; ')}`);
        } catch {
          // Ignore JSON parse errors
        }
      }
      return parts.join('. ');
    }

    case 'convention': {
      return `Convention (${data.category}): ${data.rule}`;
    }

    case 'document': {
      // For documents, include full title and content
      // Chunking is handled in updateContextEmbedding
      return `${data.title}\n\n${data.content}`;
    }

    default:
      return '';
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'business_rule':
      return 'Business rule';
    case 'glossary':
      return 'Glossary entry';
    case 'pattern':
      return 'Architecture pattern';
    case 'convention':
      return 'Team convention';
    case 'document':
      return 'Document';
    default:
      return 'Context';
  }
}
