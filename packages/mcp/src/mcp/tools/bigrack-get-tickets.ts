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

const logger = daemonLogger.child({ module: 'bigrack-get-tickets' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackGetTicketsArgs {
  taskId?: string | string[]; // Optional - filter by ticket ID(s)
  projectId?: string; // Optional - filter by project ID
  repoId?: string; // Optional - filter by repo ID
  status?: string[]; // Optional - filter by status
  priority?: string[]; // Optional - filter by priority
  type?: string[]; // Optional - filter by type
  offset?: number; // Optional - pagination offset (default: 0)
  limit?: number; // Optional - results per page (default: 10, max: 100)
  orderBy?: 'createdAt' | 'updatedAt' | 'order' | 'priority' | 'status'; // Optional - sort field (default: 'order')
  orderDirection?: 'asc' | 'desc'; // Optional - sort direction (default: 'asc')
}

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  estimatedTime?: string;
  assignee?: string;
  gitBranch?: string;
  tags?: string[];
  externalId?: string;
  projectId: string;
  projectName?: string;
  repoId?: string;
  repoName?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  commentaryAmount: number;
}

export interface BigrackGetTicketsResult {
  success: boolean;
  message: string;
  results?: {
    total: number; // Total matching results (before pagination)
    offset: number;
    limit: number;
    hasMore: boolean; // true if more results available
    tickets: Ticket[];
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackGetTickets(
  args: BigrackGetTicketsArgs
): Promise<BigrackGetTicketsResult> {
  const {
    taskId,
    projectId,
    repoId,
    status,
    priority,
    type,
    offset = 0,
    limit = 10,
    orderBy = 'order',
    orderDirection = 'asc',
  } = args;

  logger.info(
    { taskId, projectId, repoId, status, priority, type, offset, limit, orderBy, orderDirection },
    'Getting tickets'
  );

  try {
    // Validate inputs
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validOffset = Math.max(0, offset);

    // Build where clause
    const where: any = {};

    // Filter by ticket ID(s)
    if (taskId) {
      if (Array.isArray(taskId)) {
        where.id = { in: taskId };
      } else {
        where.id = taskId;
      }
    }

    // Filter by project ID
    if (projectId) {
      where.projectId = projectId;
    }

    // Filter by repo ID (requires join with project)
    if (repoId) {
      where.project = {
        repoId: repoId,
      };
    }

    // Filter by status
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // Filter by priority
    if (priority && priority.length > 0) {
      where.priority = { in: priority };
    }

    // Filter by type
    if (type && type.length > 0) {
      where.type = { in: type };
    }

    // Build orderBy clause
    const orderByClause: any = {};
    orderByClause[orderBy] = orderDirection;

    // Get total count
    const total = await prisma.task.count({
      where,
    });

    // Get tickets with pagination
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          include: {
            repo: true,
          },
        },
        commentaries: true,
      },
      orderBy: orderByClause,
      skip: validOffset,
      take: validLimit,
    });

    // Format tickets
    const tickets: Ticket[] = tasks.map((task) => {
      // Parse JSON fields
      let tags: string[] = [];
      if (task.tags) {
        try {
          tags = JSON.parse(task.tags);
        } catch {
          logger.warn({ taskId: task.id, tags: task.tags }, 'Failed to parse tags JSON');
        }
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        status: task.status as 'pending' | 'in-progress' | 'completed' | 'blocked',
        priority: task.priority as 'critical' | 'high' | 'medium' | 'low',
        type: (task.type as 'setup' | 'implementation' | 'testing' | 'documentation') || undefined,
        estimatedTime: task.estimatedTime || undefined,
        assignee: task.assignee || undefined,
        gitBranch: task.gitBranch || undefined,
        tags: tags.length > 0 ? tags : undefined,
        externalId: task.externalId || undefined,
        projectId: task.projectId,
        projectName: task.project.name,
        repoId: task.project.repoId,
        repoName: task.project.repo.name,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        completedAt: task.completedAt?.toISOString() || undefined,
        commentaryAmount: task.commentaries.length,
      };
    });

    const hasMore = validOffset + validLimit < total;

    // Check if there are any pending tickets that could be started
    const hasPendingTickets = tickets.some((ticket) => ticket.status === 'pending');
    const reminder = hasPendingTickets
      ? '\n\n⚠️ IMPORTANT: Before starting work on a ticket, you MUST update its status to "in-progress" using bigrack_update_ticket'
      : '';

    const result: BigrackGetTicketsResult = {
      success: true,
      message: `Found ${tickets.length} ticket(s)${total > tickets.length ? ` (${total} total)` : ''}${reminder}`,
      results: {
        total,
        offset: validOffset,
        limit: validLimit,
        hasMore,
        tickets,
      },
    };

    logger.info(
      { success: true, totalResults: total, returnedResults: tickets.length },
      'Get tickets completed'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to get tickets');
    return {
      success: false,
      message: 'Failed to get tickets',
      error: error.message || 'Unknown error',
    };
  }
}
