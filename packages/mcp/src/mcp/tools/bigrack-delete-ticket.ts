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

import { prismaClient as prisma } from '../../storage';
import { daemonLogger } from '../../logger';
import { removeFromVectorIndex } from '../../search';

const logger = daemonLogger.child({ module: 'bigrack-delete-box' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackDeleteBoxArgs {
  projectId: string; // Required - Pallet ID (DB: projectId)
  taskId?: string; // Optional - Box ID (DB: taskId) - either taskId or taskTitle required
  taskTitle?: string; // Optional - Box title - either taskId or taskTitle required
  force?: boolean; // Optional - Force deletion even if other boxes depend on it
}

export interface BigrackDeleteBoxResult {
  success: boolean;
  message: string;
  deletedTask?: {
    id: string;
    title: string;
  };
  dependentTasks?: Array<{
    id: string;
    title: string;
  }>;
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackDeleteBox(
  args: BigrackDeleteBoxArgs
): Promise<BigrackDeleteBoxResult> {
  const { projectId, taskId, taskTitle, force = false } = args;

  logger.info({ projectId, taskId, taskTitle, force }, 'Deleting box');

  try {
    // Validate that either taskId or taskTitle is provided
    if (!taskId && !taskTitle) {
      return {
        success: false,
        message: 'Either taskId (box ID) or taskTitle (box title) must be provided',
        error: 'Missing required parameter',
      };
    }

    // Step 1: Find the box (tasks table)
    let task = null;

    if (taskId) {
      task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
        },
      });
    } else if (taskTitle) {
      task = await prisma.task.findFirst({
        where: {
          title: taskTitle,
          projectId,
        },
      });
    }

    if (!task) {
      return {
        success: false,
        message: 'Task not found',
        error: taskId
          ? `Task with ID ${taskId} not found in project ${projectId}`
          : `Task with title "${taskTitle}" not found in project ${projectId}`,
      };
    }

    // Step 2: Check for dependent tasks (tasks that depend on this one)
    const allTasks = await prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        dependsOn: true,
      },
    });

    const dependentTasks: Array<{ id: string; title: string }> = [];

    for (const t of allTasks) {
      if (t.dependsOn) {
        try {
          const depIds = JSON.parse(t.dependsOn) as string[];
          if (depIds.includes(task.id)) {
            dependentTasks.push({
              id: t.id,
              title: t.title,
            });
          }
        } catch {
          // Invalid JSON, skip
          logger.warn({ taskId: t.id }, 'Invalid dependsOn JSON, skipping');
        }
      }
    }

    // Step 3: If there are dependencies and force is not set, warn but allow deletion
    if (dependentTasks.length > 0 && !force) {
      const dependentTitles = dependentTasks.map((t) => t.title).join(', ');
      logger.warn(
        { taskId: task.id, dependentTasks: dependentTasks.length },
        `Box "${task.title}" has ${dependentTasks.length} dependent task(s): ${dependentTitles}. Use force=true to delete anyway.`
      );
    }

    // Step 4: Remove this task from dependencies of other tasks
    if (dependentTasks.length > 0) {
      for (const dependentTask of dependentTasks) {
        const dependentTaskFull = await prisma.task.findUnique({
          where: { id: dependentTask.id },
        });

        if (dependentTaskFull && dependentTaskFull.dependsOn) {
          try {
            const depIds = JSON.parse(dependentTaskFull.dependsOn) as string[];
            const updatedDepIds = depIds.filter((id) => id !== task.id);

            await prisma.task.update({
              where: { id: dependentTask.id },
              data: {
                dependsOn: updatedDepIds.length > 0 ? JSON.stringify(updatedDepIds) : null,
              },
            });

            logger.info(
              { taskId: dependentTask.id },
              `Removed dependency on "${task.title}" from task "${dependentTask.title}"`
            );
          } catch {
            logger.warn({ taskId: dependentTask.id }, 'Failed to update dependencies');
          }
        }
      }
    }

    // Step 5: Delete the task embedding if it exists
    try {
      const embedding = await prisma.vectorEmbedding.findUnique({
        where: {
          entityType_entityId_chunkIndex: {
            entityType: 'task',
            entityId: task.id,
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

        logger.debug({ taskId: task.id, embeddingId: embedding.id }, 'Deleted embedding for box');
      }
    } catch (error: any) {
      logger.warn(
        { taskId: task.id, error: error.message },
        'Failed to delete embedding for box, continuing...'
      );
    }

    // Step 6: Delete the task
    const deletedTask = {
      id: task.id,
      title: task.title,
    };

    await prisma.task.delete({
      where: { id: task.id },
    });

    logger.info({ taskId: task.id, title: task.title }, 'Box deleted successfully');

    // Step 7: Format response
    const result: BigrackDeleteBoxResult = {
      success: true,
      message:
        dependentTasks.length > 0
          ? `Box "${task.title}" deleted successfully. ${dependentTasks.length} dependent task(s) had their dependencies updated: ${dependentTasks.map((t) => t.title).join(', ')}`
          : `Box "${task.title}" deleted successfully`,
      deletedTask,
      dependentTasks: dependentTasks.length > 0 ? dependentTasks : undefined,
    };

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to delete box');
    return {
      success: false,
      message: 'Failed to delete box',
      error: error.message || 'Unknown error',
    };
  }
}
