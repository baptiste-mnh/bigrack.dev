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
import { v4 as uuidv4 } from 'uuid';

const logger = daemonLogger.child({ module: 'bigrack-ticket-comment-create' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackTicketCommentCreateArgs {
  taskId: string; // Required - ticket/task ID
  content: string; // Required - comment content (Markdown supported)
  createdBy?: string; // Optional - user ID
}

export interface BigrackTicketCommentCreateResult {
  success: boolean;
  message: string;
  comment?: {
    id: string;
    taskId: string;
    content: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackTicketCommentCreate(
  args: BigrackTicketCommentCreateArgs
): Promise<BigrackTicketCommentCreateResult> {
  const { taskId, content, createdBy } = args;

  logger.info({ taskId, contentLength: content.length, createdBy }, 'Creating ticket comment');

  try {
    // Validate inputs
    if (!taskId) {
      return {
        success: false,
        message: 'taskId is required',
        error: 'Missing required parameter: taskId',
      };
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        message: 'content is required and cannot be empty',
        error: 'Missing or empty required parameter: content',
      };
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true },
    });

    if (!task) {
      return {
        success: false,
        message: 'Task not found',
        error: `Task with ID ${taskId} does not exist`,
      };
    }

    // Create comment
    const commentary = await prisma.commentary.create({
      data: {
        id: uuidv4(),
        taskId,
        content: content.trim(),
        createdBy: createdBy || null,
      },
    });

    const result: BigrackTicketCommentCreateResult = {
      success: true,
      message: `Comment created successfully on ticket "${task.title}"`,
      comment: {
        id: commentary.id,
        taskId: commentary.taskId,
        content: commentary.content,
        createdBy: commentary.createdBy || undefined,
        createdAt: commentary.createdAt.toISOString(),
        updatedAt: commentary.updatedAt.toISOString(),
      },
    };

    logger.info(
      { success: true, commentId: commentary.id, taskId },
      'Comment created successfully'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to create ticket comment');
    return {
      success: false,
      message: 'Failed to create ticket comment',
      error: error.message || 'Unknown error',
    };
  }
}
