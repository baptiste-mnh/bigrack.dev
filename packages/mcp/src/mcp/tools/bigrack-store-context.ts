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

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getPrisma } from '../../storage/prisma';
import { storageLogger } from '../../logger';
import { generateEmbedding } from '../../embeddings';
import { chunkText, DEFAULT_CHUNKING_CONFIG } from '../../embeddings';
import { addToVectorIndex } from '../../search';

export interface BigrackStoreContextArgs {
  type: 'business_rule' | 'glossary' | 'pattern' | 'convention' | 'document';
  repoId?: string; // Optional: will use bigrack.json if not provided
  projectId?: string; // Optional: store as project-specific context (requires inheritsFromRepo=true on project)

  // Business Rule fields
  name?: string;
  description?: string;
  validationLogic?: string;
  examples?: string[];
  relatedDomains?: string[];
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';

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

export interface BigrackStoreContextResult {
  success: boolean;
  id?: string;
  type?: string;
  message: string;
}

interface BigrackJson {
  repoId: string;
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * Store business context (rules, glossary, patterns, conventions, documents) to a repo
 */
export async function bigrackStoreContext(
  args: BigrackStoreContextArgs
): Promise<BigrackStoreContextResult> {
  const { type, repoId: providedRepoId, projectId } = args;

  storageLogger.info({ type, providedRepoId, projectId }, 'Storing business context');

  try {
    const prisma = getPrisma();

    // Get repoId from argument, project, or bigrack.json
    let repoId: string;
    let project: { repoId: string; inheritsFromRepo: boolean; name: string } | null = null;

    if (providedRepoId) {
      repoId = providedRepoId;
    } else if (projectId) {
      // If projectId is provided, get repoId from project and validate inheritance
      project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { repoId: true, inheritsFromRepo: true, name: true },
      });

      if (!project) {
        return {
          success: false,
          message: `Project not found: ${projectId}`,
        };
      }

      // Verify project inherits from repo (required for context inheritance)
      if (!project.inheritsFromRepo) {
        return {
          success: false,
          message: `Project "${project.name}" has inheritsFromRepo=false. Enable inheritance to store project-specific context.`,
        };
      }

      repoId = project.repoId;
    } else {
      // Try to read from bigrack.json in current directory
      const cwd = process.cwd();
      const bigrackJsonPath = path.join(cwd, 'bigrack.json');

      if (!fs.existsSync(bigrackJsonPath)) {
        return {
          success: false,
          message:
            'No bigrack.json found in current directory. Run bigrack_create_project first or provide repoId explicitly.',
        };
      }

      const bigrackConfig = JSON.parse(fs.readFileSync(bigrackJsonPath, 'utf-8')) as BigrackJson;

      repoId = bigrackConfig.repoId;
    }

    // Verify repo exists
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      return {
        success: false,
        message: `Repo not found: ${repoId}`,
      };
    }

    // If projectId was provided but we didn't validate it yet, do it now
    if (projectId && !project) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { repoId: true, inheritsFromRepo: true, name: true },
      });

      if (!project) {
        return {
          success: false,
          message: `Project not found: ${projectId}`,
        };
      }

      if (project.repoId !== repoId) {
        return {
          success: false,
          message: `Project ${projectId} belongs to a different repo (${project.repoId}, expected ${repoId})`,
        };
      }

      if (!project.inheritsFromRepo) {
        return {
          success: false,
          message: `Project "${project.name}" has inheritsFromRepo=false. Enable inheritance to store project-specific context.`,
        };
      }
    }

    // Store context based on type
    let result: { id: string; name?: string; term?: string; title?: string };

    switch (type) {
      case 'business_rule':
        result = await storeBusinessRule(prisma, repoId, args);
        break;

      case 'glossary':
        result = await storeGlossaryEntry(prisma, repoId, args);
        break;

      case 'pattern':
        result = await storeArchitecturePattern(prisma, repoId, args);
        break;

      case 'convention':
        result = await storeTeamConvention(prisma, repoId, args);
        break;

      case 'document':
        result = await storeDocument(prisma, repoId, args);
        break;

      default:
        return {
          success: false,
          message: `Unknown context type: ${type}`,
        };
    }

    storageLogger.info({ type, id: result.id, repoId, projectId }, 'Context stored successfully');

    // Map input type to internal entity type for embedding storage
    // Input: 'glossary' -> Internal: 'glossary_entry'
    const entityType = type === 'glossary' ? 'glossary_entry' : type;

    // Generate and store embedding
    try {
      await generateAndStoreEmbedding(entityType, result, repoId, projectId);
      storageLogger.info({ type, id: result.id, projectId }, 'Embedding generated and stored');
    } catch (embeddingError) {
      // Log error but don't fail the entire operation
      // Entity is still stored, just not searchable yet
      storageLogger.warn(
        { err: embeddingError, type, id: result.id },
        'Failed to generate embedding - entity stored but not searchable'
      );
    }

    const displayName = result.name || result.term || result.title || result.id;
    const contextLevel = projectId ? 'project-specific' : 'repo-level';

    return {
      success: true,
      id: result.id,
      type,
      message: `✅ ${type} "${displayName}" stored successfully as ${contextLevel} context!\n\nID: ${result.id}\nRepo: ${repo.name} (${repoId})${projectId ? `\nProject: ${projectId}` : ''}\n\n${getNextSteps(type, projectId)}`,
    };
  } catch (error) {
    storageLogger.error({ err: error, type }, 'Failed to store context');

    return {
      success: false,
      message: `Failed to store ${type}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Storage Functions
// ============================================================================

async function storeBusinessRule(prisma: any, repoId: string, args: BigrackStoreContextArgs) {
  const { name, description, validationLogic, examples, relatedDomains, category, priority } = args;

  if (!name || !description) {
    throw new Error('Business rule requires name and description');
  }

  // Check for duplicates
  const existing = await prisma.businessRule.findFirst({
    where: {
      repoId,
      name,
    },
  });

  if (existing) {
    throw new Error(`Business rule "${name}" already exists in this repo`);
  }

  const rule = await prisma.businessRule.create({
    data: {
      id: uuidv4(),
      repoId,
      name,
      description,
      validationLogic: validationLogic || null,
      examples: examples ? JSON.stringify(examples) : null,
      relatedDomains: relatedDomains ? JSON.stringify(relatedDomains) : null,
      category: category || null,
      priority: priority || 'medium',
      createdBy: 'default-user',
    },
  });

  return rule;
}

async function storeGlossaryEntry(prisma: any, repoId: string, args: BigrackStoreContextArgs) {
  const { term, definition, synonyms, relatedTerms, examples, category } = args;

  if (!term || !definition) {
    throw new Error('Glossary entry requires term and definition');
  }

  // Check for duplicates
  const existing = await prisma.glossaryEntry.findFirst({
    where: {
      repoId,
      term,
    },
  });

  if (existing) {
    throw new Error(`Glossary term "${term}" already exists in this repo`);
  }

  const entry = await prisma.glossaryEntry.create({
    data: {
      id: uuidv4(),
      repoId,
      term,
      definition,
      synonyms: synonyms ? JSON.stringify(synonyms) : null,
      relatedTerms: relatedTerms ? JSON.stringify(relatedTerms) : null,
      examples: examples ? JSON.stringify(examples) : null,
      category: category || null,
      createdBy: 'default-user',
    },
  });

  return entry;
}

async function storeArchitecturePattern(
  prisma: any,
  repoId: string,
  args: BigrackStoreContextArgs
) {
  const { name, description, whenToUse, example, benefits, tradeoffs, category } = args;

  if (!name || !description) {
    throw new Error('Architecture pattern requires name and description');
  }

  const pattern = await prisma.architecturePattern.create({
    data: {
      id: uuidv4(),
      repoId,
      name,
      description,
      whenToUse: whenToUse || null,
      example: example || null,
      benefits: benefits ? JSON.stringify(benefits) : null,
      tradeoffs: tradeoffs ? JSON.stringify(tradeoffs) : null,
      category: category || null,
      createdBy: 'default-user',
    },
  });

  return pattern;
}

async function storeTeamConvention(prisma: any, repoId: string, args: BigrackStoreContextArgs) {
  const { category, rule, enforced } = args;

  if (!category || !rule) {
    throw new Error('Team convention requires category and rule');
  }

  const convention = await prisma.teamConvention.create({
    data: {
      id: uuidv4(),
      repoId,
      category,
      rule,
      enforced: enforced || false,
      createdBy: 'default-user',
    },
  });

  return convention;
}

async function storeDocument(prisma: any, repoId: string, args: BigrackStoreContextArgs) {
  const { title, content, tags, mimeType, documentType } = args;

  if (!title || !content) {
    throw new Error('Document requires title and content');
  }

  const document = await prisma.document.create({
    data: {
      id: uuidv4(),
      repoId,
      title,
      content,
      tags: tags ? JSON.stringify(tags) : null,
      mimeType: mimeType || 'text/plain',
      type: documentType || 'general',
      createdBy: 'default-user',
    },
  });

  return document;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNextSteps(type: string, projectId?: string): string {
  const queryHint = projectId
    ? `Query with projectId="${projectId}" to search both inherited and project-specific context.`
    : 'Use bigrack_query_context to search for this context.';

  switch (type) {
    case 'business_rule':
      return `Next: ${queryHint} Or add more business rules.`;

    case 'glossary':
      return `Next: ${queryHint} Or add more glossary terms.`;

    case 'pattern':
      return `Next: ${queryHint} Or add more patterns.`;

    case 'convention':
      return `Next: ${queryHint} Or add more conventions to establish team standards.`;

    case 'document':
      return `Next: ${queryHint} Or add more documentation.`;

    default:
      return '';
  }
}

/**
 * Generate embedding and store in VectorEmbedding table
 * For documents: automatically chunks long content
 * For other types: stores single embedding
 */
async function generateAndStoreEmbedding(
  type: string,
  entity: any,
  repoId: string,
  projectId?: string
): Promise<void> {
  const prisma = getPrisma();

  // 1. Build text for embedding
  const text = buildTextForEmbedding(type, entity);

  // 2. For documents, check if chunking is needed
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
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text);
      const contentHash = createHash('sha256').update(chunk.text).digest('hex');

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
          contentHash,
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
  } else {
    // Single embedding for non-documents or short documents
    const embedding = await generateEmbedding(text);
    const contentHash = createHash('sha256').update(text).digest('hex');

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
        contentHash,
        category: entity.category || null,
        priority: entity.priority || null,
        chunkIndex: 0,
        totalChunks: 1,
        chunkStartOffset: 0,
        chunkEndOffset: text.length,
      },
    });

    await addToVectorIndex(embeddingRecord.id, embedding);
  }
}

/**
 * Build text representation for embedding
 */
function buildTextForEmbedding(type: string, data: any): string {
  switch (type) {
    case 'business_rule': {
      let text = `${data.name}: ${data.description}`;

      if (data.validationLogic) {
        text += `. Validation: ${data.validationLogic}`;
      }

      if (data.examples) {
        const examples = JSON.parse(data.examples);
        if (examples.length > 0) {
          text += `. Examples: ${examples.join(', ')}`;
        }
      }

      if (data.relatedDomains) {
        const domains = JSON.parse(data.relatedDomains);
        if (domains.length > 0) {
          text += `. Related domains: ${domains.join(', ')}`;
        }
      }

      return text;
    }

    case 'glossary':
    case 'glossary_entry': {
      let text = `${data.term}: ${data.definition}`;

      if (data.synonyms) {
        const synonyms = JSON.parse(data.synonyms);
        if (synonyms.length > 0) {
          text += `. Synonyms: ${synonyms.join(', ')}`;
        }
      }

      if (data.relatedTerms) {
        const related = JSON.parse(data.relatedTerms);
        if (related.length > 0) {
          text += `. Related: ${related.join(', ')}`;
        }
      }

      if (data.examples) {
        const examples = JSON.parse(data.examples);
        if (examples.length > 0) {
          text += `. Examples: ${examples.join(', ')}`;
        }
      }

      return text;
    }

    case 'pattern': {
      let text = `${data.name}: ${data.description}`;

      if (data.whenToUse) {
        text += `. When to use: ${data.whenToUse}`;
      }

      if (data.benefits) {
        const benefits = JSON.parse(data.benefits);
        if (benefits.length > 0) {
          text += `. Benefits: ${benefits.join(', ')}`;
        }
      }

      if (data.example) {
        text += `. Example: ${data.example}`;
      }

      return text;
    }

    case 'convention': {
      return `${data.category}: ${data.rule}`;
    }

    case 'document': {
      // For documents, include title and content
      // Chunking is handled in generateAndStoreEmbedding
      return `${data.title}\n\n${data.content}`;
    }

    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}
