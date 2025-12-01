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

const logger = daemonLogger.child({ module: 'bigrack-ticket-comment-update' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackTicketCommentUpdateArgs {
  commentId: string; // Required - comment ID
  content: string; // Required - updated comment content (Markdown supported)
}

export interface BigrackTicketCommentUpdateResult {
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

export async function bigrackTicketCommentUpdate(
  args: BigrackTicketCommentUpdateArgs
): Promise<BigrackTicketCommentUpdateResult> {
  const { commentId, content } = args;

  logger.info({ commentId, contentLength: content.length }, 'Updating ticket comment');

  try {
    // Validate inputs
    if (!commentId) {
      return {
        success: false,
        message: 'commentId is required',
        error: 'Missing required parameter: commentId',
      };
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        message: 'content is required and cannot be empty',
        error: 'Missing or empty required parameter: content',
      };
    }

    // Verify comment exists
    const existingComment = await prisma.commentary.findUnique({
      where: { id: commentId },
      select: { id: true, taskId: true },
    });

    if (!existingComment) {
      return {
        success: false,
        message: 'Comment not found',
        error: `Comment with ID ${commentId} does not exist`,
      };
    }

    // Update comment
    const updatedComment = await prisma.commentary.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
    });

    const result: BigrackTicketCommentUpdateResult = {
      success: true,
      message: 'Comment updated successfully',
      comment: {
        id: updatedComment.id,
        taskId: updatedComment.taskId,
        content: updatedComment.content,
        createdBy: updatedComment.createdBy || undefined,
        createdAt: updatedComment.createdAt.toISOString(),
        updatedAt: updatedComment.updatedAt.toISOString(),
      },
    };

    logger.info({ success: true, commentId: updatedComment.id }, 'Comment updated successfully');

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to update ticket comment');
    return {
      success: false,
      message: 'Failed to update ticket comment',
      error: error.message || 'Unknown error',
    };
  }
}

