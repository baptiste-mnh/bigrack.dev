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
import { searchByText, type EntityWithData } from '../../search';
import { storageLogger } from '../../logger';

/**
 * Arguments for bigrack_query_context MCP tool
 */
export interface BigrackQueryContextArgs {
  query: string;
  repoId?: string;
  projectId?: string;
  entityTypes?: ('business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document')[];
  topK?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
}

/**
 * Single context result
 */
export interface ContextResult {
  type: string;
  id: string; // Entity ID - always included for reference
  similarity: number;
  content: string;
  metadata?: {
    id: string;
    repoId: string;
    category?: string;
    priority?: string;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Result from bigrack_query_context
 */
export interface BigrackQueryContextResult {
  success: boolean;
  results: ContextResult[];
  query: string;
  count: number;
  message: string;
}

interface BigrackJson {
  repoId: string;
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * Query business context using semantic search (RAG)
 */
export async function bigrackQueryContext(
  args: BigrackQueryContextArgs
): Promise<BigrackQueryContextResult> {
  const {
    query,
    repoId: providedRepoId,
    projectId,
    entityTypes,
    topK = 5,
    minSimilarity = 0.5,
    includeMetadata = true,
  } = args;

  storageLogger.info({ query, providedRepoId, topK, minSimilarity }, 'Querying business context');

  try {
    // Validate query
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        results: [],
        query: query || '',
        count: 0,
        message: 'Query cannot be empty',
      };
    }

    // Get repoId from argument, project, or bigrack.json
    let repoId: string;
    let searchProjectId: string | undefined = projectId; // Only use projectId if explicitly provided

    if (providedRepoId) {
      repoId = providedRepoId;
    } else if (projectId) {
      // If projectId is provided, get repoId from project
      const { getPrisma } = await import('../../storage/prisma');
      const prisma = getPrisma();
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { repoId: true },
      });

      if (!project) {
        return {
          success: false,
          results: [],
          query,
          count: 0,
          message: `Project not found: ${projectId}`,
        };
      }

      repoId = project.repoId;
    } else {
      // Try to read from bigrack.json in current directory
      // If projectId is not provided, we only search in repo-level context
      const cwd = process.cwd();
      const bigrackJsonPath = path.join(cwd, 'bigrack.json');

      if (!fs.existsSync(bigrackJsonPath)) {
        return {
          success: false,
          results: [],
          query,
          count: 0,
          message:
            'No bigrack.json found in current directory and no repoId or projectId provided. Run bigrack_create_repo first or provide repoId explicitly.',
        };
      }

      const bigrackConfig = JSON.parse(fs.readFileSync(bigrackJsonPath, 'utf-8')) as BigrackJson;

      repoId = bigrackConfig.repoId;
      // Explicitly set searchProjectId to undefined to ensure we only search repo-level context
      searchProjectId = undefined;
    }

    // Perform semantic search
    // If projectId is not provided, search only in repo-level context (not project-specific context)
    const searchResults = await searchByText(query, {
      repoId,
      projectId: searchProjectId, // undefined = search only repo-level context
      entityTypes,
      topK,
      minSimilarity,
    });

    // Format results with provenance tracking
    // If projectId was not provided, all results are from repo-level context
    const formattedResults: ContextResult[] = searchResults.map((result) => {
      const isProjectSpecific = searchProjectId && result.projectId === searchProjectId;
      const provenance = isProjectSpecific ? 'project-specific' : 'repo';

      return {
        type: result.entityType,
        id: result.entityId, // Always include entity ID
        similarity: result.similarity,
        content: formatEntity(result, provenance),
        metadata: includeMetadata ? buildMetadata(result) : undefined,
      };
    });

    storageLogger.info({ count: formattedResults.length, query }, 'Context query completed');

    return {
      success: true,
      results: formattedResults,
      query,
      count: formattedResults.length,
      message: buildResultMessage(formattedResults.length, query, topK),
    };
  } catch (error) {
    storageLogger.error({ err: error, query }, 'Failed to query context');

    return {
      success: false,
      results: [],
      query,
      count: 0,
      message: `Failed to query context: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Format entity for Claude consumption
 */
function formatEntity(result: EntityWithData, provenance?: string): string {
  const {
    entityType,
    data,
    similarity,
    chunkIndex,
    totalChunks,
    chunkStartOffset,
    chunkEndOffset,
  } = result;

  if (!data) {
    return `[No data available for ${entityType}]`;
  }

  const similarityPercent = Math.round(similarity * 100);

  // Build chunk info if available
  const chunkInfo =
    chunkIndex !== undefined && totalChunks !== undefined && totalChunks > 1
      ? {
          index: chunkIndex,
          total: totalChunks,
          start: chunkStartOffset || 0,
          end: chunkEndOffset || 0,
        }
      : undefined;

  switch (entityType) {
    case 'business_rule':
      return formatBusinessRule(data, similarityPercent, provenance);

    case 'glossary_entry':
      return formatGlossaryEntry(data, similarityPercent, provenance);

    case 'pattern':
      return formatArchitecturePattern(data, similarityPercent, provenance);

    case 'convention':
      return formatTeamConvention(data, similarityPercent, provenance);

    case 'document':
      return formatDocument(data, similarityPercent, provenance, chunkInfo);

    default:
      return `[Unknown entity type: ${entityType}]`;
  }
}

/**
 * Format Business Rule
 */
function formatBusinessRule(data: any, similarity: number, provenance?: string): string {
  const provenanceLabel = provenance ? ` [${provenance}]` : '';
  let formatted = `📋 Business Rule: ${data.name} (${similarity}% match)${provenanceLabel}`;

  if (data.priority && data.priority !== 'medium') {
    formatted += ` [Priority: ${data.priority}]`;
  }

  formatted += `\n${data.description}`;

  if (data.validationLogic) {
    formatted += `\n\nValidation: ${data.validationLogic}`;
  }

  if (data.examples) {
    const examples = JSON.parse(data.examples);
    if (examples.length > 0) {
      formatted += `\n\nExamples:\n${examples.map((ex: string) => `  • ${ex}`).join('\n')}`;
    }
  }

  if (data.relatedDomains) {
    const domains = JSON.parse(data.relatedDomains);
    if (domains.length > 0) {
      formatted += `\n\nRelated domains: ${domains.join(', ')}`;
    }
  }

  if (data.category) {
    formatted += `\n\nCategory: ${data.category}`;
  }

  return formatted;
}

/**
 * Format Glossary Entry
 */
function formatGlossaryEntry(data: any, similarity: number, provenance?: string): string {
  const provenanceLabel = provenance ? ` [${provenance}]` : '';
  let formatted = `📖 Term: ${data.term} (${similarity}% match)${provenanceLabel}\n${data.definition}`;

  if (data.synonyms) {
    const synonyms = JSON.parse(data.synonyms);
    if (synonyms.length > 0) {
      formatted += `\n\nSynonyms: ${synonyms.join(', ')}`;
    }
  }

  if (data.relatedTerms) {
    const related = JSON.parse(data.relatedTerms);
    if (related.length > 0) {
      formatted += `\n\nRelated terms: ${related.join(', ')}`;
    }
  }

  if (data.examples) {
    const examples = JSON.parse(data.examples);
    if (examples.length > 0) {
      formatted += `\n\nExamples:\n${examples.map((ex: string) => `  • ${ex}`).join('\n')}`;
    }
  }

  if (data.category) {
    formatted += `\n\nCategory: ${data.category}`;
  }

  return formatted;
}

/**
 * Format Architecture Pattern
 */
function formatArchitecturePattern(data: any, similarity: number, provenance?: string): string {
  const provenanceLabel = provenance ? ` [${provenance}]` : '';
  let formatted = `🏗️ Pattern: ${data.name} (${similarity}% match)${provenanceLabel}\n${data.description}`;

  if (data.whenToUse) {
    formatted += `\n\n⏰ When to use:\n${data.whenToUse}`;
  }

  if (data.benefits) {
    const benefits = JSON.parse(data.benefits);
    if (benefits.length > 0) {
      formatted += `\n\n✅ Benefits:\n${benefits.map((b: string) => `  • ${b}`).join('\n')}`;
    }
  }

  if (data.tradeoffs) {
    const tradeoffs = JSON.parse(data.tradeoffs);
    if (tradeoffs.length > 0) {
      formatted += `\n\n⚖️ Trade-offs:\n${tradeoffs.map((t: string) => `  • ${t}`).join('\n')}`;
    }
  }

  if (data.example) {
    formatted += `\n\n💡 Example:\n${data.example}`;
  }

  if (data.category) {
    formatted += `\n\nCategory: ${data.category}`;
  }

  return formatted;
}

/**
 * Format Team Convention
 */
function formatTeamConvention(data: any, similarity: number, provenance?: string): string {
  const provenanceLabel = provenance ? ` [${provenance}]` : '';
  let formatted = `⚙️ Convention: ${data.category} (${similarity}% match)${provenanceLabel}\n${data.rule}`;

  if (data.enforced) {
    formatted += `\n\n✓ This convention is enforced (e.g., via linter or pre-commit hook)`;
  }

  return formatted;
}

/**
 * Format Document
 */
function formatDocument(
  data: any,
  similarity: number,
  provenance?: string,
  chunkInfo?: { index: number; total: number; start: number; end: number }
): string {
  const provenanceLabel = provenance ? ` [${provenance}]` : '';
  let formatted = `📄 Document: ${data.title} (${similarity}% match)${provenanceLabel}`;

  if (data.type && data.type !== 'general') {
    formatted += ` [Type: ${data.type}]`;
  }

  // Show chunk info for chunked documents
  if (chunkInfo && chunkInfo.total > 1) {
    formatted += ` [Chunk ${chunkInfo.index + 1}/${chunkInfo.total}]`;
  }

  // For chunked documents, show the relevant excerpt
  if (chunkInfo && chunkInfo.total > 1 && data.content) {
    const excerpt = data.content.substring(chunkInfo.start, chunkInfo.end);
    formatted += `\n\n${excerpt}`;
    formatted += `\n\n[Note: This is chunk ${chunkInfo.index + 1} of ${chunkInfo.total}. Full document: ${data.title}]`;
  } else {
    formatted += `\n\n${data.content}`;
  }

  if (data.tags) {
    const tags = JSON.parse(data.tags);
    if (tags.length > 0) {
      formatted += `\n\nTags: ${tags.join(', ')}`;
    }
  }

  return formatted;
}

/**
 * Build metadata for result
 */
function buildMetadata(result: EntityWithData): ContextResult['metadata'] {
  const { data } = result;

  if (!data) {
    return undefined;
  }

  return {
    id: data.id,
    repoId: data.repoId,
    category: data.category || undefined,
    priority: data.priority || undefined,
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : '',
    updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : '',
  };
}

/**
 * Build result message
 */
function buildResultMessage(count: number, query: string, topK: number): string {
  if (count === 0) {
    return `No relevant context found for query: "${query}".\n\nTry:\n• Using different keywords\n• Broadening your search\n• Checking if context has been stored with bigrack_store_context`;
  }

  if (count === 1) {
    return `Found 1 relevant context item for: "${query}"`;
  }

  const showing = count === topK ? `top ${count}` : count;
  return `Found ${showing} relevant context items for: "${query}"`;
}
