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

import { daemonLogger } from '../../logger';
import { searchByText } from '../../search';

const logger = daemonLogger.child({ module: 'bigrack-search-ticket' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackSearchBoxArgs {
  query: string; // Required - natural language search query
  projectId?: string; // Optional - filter by pallet (DB: projectId)
  repoId?: string; // Optional - filter by rack (DB: repoId)
  status?: string[]; // Optional - filter by status
  priority?: string[]; // Optional - filter by priority
  type?: string[]; // Optional - filter by type
  offset?: number; // Optional - pagination offset (default: 0)
  limit?: number; // Optional - results per page (default: 10, max: 50)
  minSimilarity?: number; // Optional - minimum similarity score (0-1, default: 0.5)
}

interface SearchedTask {
  id: string;
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  estimatedTime?: string;
  similarity: number; // 0-1 score
  projectName?: string;
  repoName?: string;
  createdAt: string;
}

export interface BigrackSearchBoxResult {
  success: boolean;
  message: string;
  results?: {
    query: string;
    total: number; // Total matching results (before pagination)
    offset: number;
    limit: number;
    hasMore: boolean; // true if more results available
    tasks: SearchedTask[];
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackSearchBox(
  args: BigrackSearchBoxArgs
): Promise<BigrackSearchBoxResult> {
  const {
    query,
    projectId,
    repoId,
    status,
    priority,
    type,
    offset = 0,
    limit = 10,
    minSimilarity = 0.5,
  } = args;

  logger.info({ query, projectId, repoId, offset, limit }, 'Searching boxes (tasks table)');

  try {
    // Validate inputs
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        message: 'Query cannot be empty',
        error: 'Query is required for semantic search',
      };
    }

    const validLimit = Math.min(Math.max(1, limit), 50);

    // Perform semantic search using RAG pipeline
    // Get more results than requested to allow filtering and pagination
    const searchResults = await searchByText(query, {
      repoId,
      projectId,
      entityTypes: ['task'],
      topK: validLimit * 3, // Get more to allow filtering
      minSimilarity,
    });

    // Convert EntityWithData to Task format and apply additional filters
    let filteredTasks: SearchedTask[] = searchResults
      .map((result) => {
        const task = result.data as any;

        // Apply filters that weren't handled by vector search
        if (status && status.length > 0 && !status.includes(task.status)) {
          return null;
        }

        if (priority && priority.length > 0 && !priority.includes(task.priority)) {
          return null;
        }

        if (type && type.length > 0 && !type.includes(task.type)) {
          return null;
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          priority: task.priority as 'critical' | 'high' | 'medium' | 'low',
          status: task.status as 'pending' | 'in-progress' | 'completed' | 'blocked',
          type:
            (task.type as 'setup' | 'implementation' | 'testing' | 'documentation') || undefined,
          estimatedTime: task.estimatedTime || undefined,
          similarity: result.similarity,
          projectName: task.project?.name || task.projectName,
          repoName: task.project?.repo?.name || task.repoName,
          createdAt: task.createdAt?.toISOString() || new Date(task.createdAt).toISOString(),
        } as SearchedTask;
      })
      .filter((t): t is SearchedTask => t !== null);

    // Sort by similarity (descending) - already sorted by searchByText, but ensure it
    filteredTasks.sort((a, b) => b.similarity - a.similarity);

    // Store total before pagination
    const total = filteredTasks.length;

    // Apply pagination
    const paginatedTasks = filteredTasks.slice(offset, offset + validLimit);
    const hasMore = offset + validLimit < total;

    const result: BigrackSearchBoxResult = {
      success: true,
      message: `Found ${paginatedTasks.length} task(s) matching "${query}"${total > paginatedTasks.length ? ` (${total} total)` : ''}`,
      results: {
        query,
        total,
        offset,
        limit: validLimit,
        hasMore,
        tasks: paginatedTasks,
      },
    };

    logger.info(
      { success: true, totalResults: total, returnedResults: paginatedTasks.length },
      'Ticket search completed'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to search tickets');
    return {
      success: false,
      message: 'Failed to search tickets',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================
// Note: Similarity calculation is now handled by the RAG pipeline (searchByText)
// which uses vector embeddings for semantic search
