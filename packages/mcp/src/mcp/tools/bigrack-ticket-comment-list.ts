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
import { prismaClient as prisma } from '../../storage';

const logger = daemonLogger.child({ module: 'bigrack-ticket-comment-list' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackTicketCommentListArgs {
  taskId: string; // Required - ticket/task ID
  offset?: number; // Optional - pagination offset (default: 0)
  limit?: number; // Optional - results per page (default: 20, max: 100)
  orderBy?: 'createdAt' | 'updatedAt'; // Optional - sort field (default: 'createdAt')
  orderDirection?: 'asc' | 'desc'; // Optional - sort direction (default: 'desc')
}

interface Comment {
  id: string;
  taskId: string;
  content: string; // Markdown supported
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BigrackTicketCommentListResult {
  success: boolean;
  message: string;
  results?: {
    total: number; // Total matching results (before pagination)
    offset: number;
    limit: number;
    hasMore: boolean; // true if more results available
    comments: Comment[];
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackTicketCommentList(
  args: BigrackTicketCommentListArgs
): Promise<BigrackTicketCommentListResult> {
  const {
    taskId,
    offset = 0,
    limit = 20,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = args;

  logger.info({ taskId, offset, limit, orderBy, orderDirection }, 'Listing ticket comments');

  try {
    // Validate inputs
    if (!taskId) {
      return {
        success: false,
        message: 'taskId is required',
        error: 'Missing required parameter: taskId',
      };
    }

    const validLimit = Math.min(Math.max(1, limit), 100);
    const validOffset = Math.max(0, offset);

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return {
        success: false,
        message: 'Task not found',
        error: `Task with ID ${taskId} does not exist`,
      };
    }

    // Build orderBy clause
    const orderByClause: any = {};
    orderByClause[orderBy] = orderDirection;

    // Get total count
    const total = await prisma.commentary.count({
      where: { taskId },
    });

    // Get comments with pagination
    const commentaries = await prisma.commentary.findMany({
      where: { taskId },
      orderBy: orderByClause,
      skip: validOffset,
      take: validLimit,
    });

    // Format comments
    const comments: Comment[] = commentaries.map((comment) => ({
      id: comment.id,
      taskId: comment.taskId,
      content: comment.content,
      createdBy: comment.createdBy || undefined,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));

    const hasMore = validOffset + validLimit < total;

    const result: BigrackTicketCommentListResult = {
      success: true,
      message: `Found ${comments.length} comment(s)${total > comments.length ? ` (${total} total)` : ''}`,
      results: {
        total,
        offset: validOffset,
        limit: validLimit,
        hasMore,
        comments,
      },
    };

    logger.info(
      { success: true, taskId, totalResults: total, returnedResults: comments.length },
      'List comments completed'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to list ticket comments');
    return {
      success: false,
      message: 'Failed to list ticket comments',
      error: error.message || 'Unknown error',
    };
  }
}

