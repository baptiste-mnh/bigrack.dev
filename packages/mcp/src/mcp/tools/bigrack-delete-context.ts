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
import { removeFromVectorIndex } from '../../search';

export interface BigrackDeleteContextArgs {
  type: 'business_rule' | 'glossary' | 'pattern' | 'convention' | 'document';
  id: string; // ID of the context entity to delete
}

export interface BigrackDeleteContextResult {
  success: boolean;
  id?: string;
  type?: string;
  message: string;
  embeddingDeleted?: boolean;
}

/**
 * Delete business context (rules, glossary, patterns, conventions, documents)
 * Automatically removes embeddings via SQL triggers or manually if needed
 */
export async function bigrackDeleteContext(
  args: BigrackDeleteContextArgs
): Promise<BigrackDeleteContextResult> {
  const { type, id } = args;

  storageLogger.info({ type, id }, 'Deleting context');

  try {
    const prisma = getPrisma();

    // First, try to delete the embedding manually (backup in case triggers fail)
    let embeddingDeleted = false;
    try {
      const embedding = await prisma.vectorEmbedding.findUnique({
        where: {
          entityType_entityId_chunkIndex: {
            entityType: type,
            entityId: id,
            chunkIndex: 0,
          },
        },
      });

      if (embedding) {
        // Remove from vector index
        await removeFromVectorIndex(embedding.id);

        // Delete from VectorEmbedding table
        await prisma.vectorEmbedding.delete({
          where: { id: embedding.id },
        });

        embeddingDeleted = true;
        storageLogger.debug({ type, id, embeddingId: embedding.id }, 'Manually deleted embedding');
      }
    } catch (error: any) {
      storageLogger.warn(
        { type, id, error: error.message },
        'Failed to manually delete embedding (will rely on SQL triggers)'
      );
    }

    // Delete the entity based on type
    let entityName = '';
    let deleted = false;

    switch (type) {
      case 'business_rule': {
        const entity = await prisma.businessRule.findUnique({ where: { id } });
        if (!entity) {
          return { success: false, message: `Business rule not found: ${id}` };
        }
        entityName = entity.name;
        await prisma.businessRule.delete({ where: { id } });
        deleted = true;
        break;
      }

      case 'glossary': {
        const entity = await prisma.glossaryEntry.findUnique({ where: { id } });
        if (!entity) {
          return { success: false, message: `Glossary entry not found: ${id}` };
        }
        entityName = entity.term;
        await prisma.glossaryEntry.delete({ where: { id } });
        deleted = true;
        break;
      }

      case 'pattern': {
        const entity = await prisma.architecturePattern.findUnique({ where: { id } });
        if (!entity) {
          return { success: false, message: `Architecture pattern not found: ${id}` };
        }
        entityName = entity.name;
        await prisma.architecturePattern.delete({ where: { id } });
        deleted = true;
        break;
      }

      case 'convention': {
        const entity = await prisma.teamConvention.findUnique({ where: { id } });
        if (!entity) {
          return { success: false, message: `Team convention not found: ${id}` };
        }
        entityName = entity.category;
        await prisma.teamConvention.delete({ where: { id } });
        deleted = true;
        break;
      }

      case 'document': {
        const entity = await prisma.document.findUnique({ where: { id } });
        if (!entity) {
          return { success: false, message: `Document not found: ${id}` };
        }
        entityName = entity.title;
        await prisma.document.delete({ where: { id } });
        deleted = true;
        break;
      }

      default:
        return { success: false, message: `Invalid context type: ${type}` };
    }

    if (!deleted) {
      return { success: false, message: `Failed to delete ${type}: ${id}` };
    }

    // SQL triggers should have deleted the embedding automatically
    // Verify it's gone
    try {
      const stillExists = await prisma.vectorEmbedding.findUnique({
        where: {
          entityType_entityId_chunkIndex: {
            entityType: type,
            entityId: id,
            chunkIndex: 0,
          },
        },
      });

      if (stillExists) {
        storageLogger.warn(
          { type, id },
          'Embedding still exists after entity deletion (SQL trigger may not have fired)'
        );
      } else {
        storageLogger.debug({ type, id }, 'Embedding successfully deleted by SQL trigger');
      }
    } catch {
      // Ignore errors during verification
    }

    storageLogger.info({ type, id, entityName }, 'Context deleted successfully');

    return {
      success: true,
      id,
      type,
      message: `${getTypeLabel(type)} "${entityName}" deleted successfully`,
      embeddingDeleted,
    };
  } catch (error) {
    storageLogger.error({ type, id, error }, 'Failed to delete context');
    return {
      success: false,
      message: `Failed to delete context: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

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
