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
import { generateEmbedding } from '../../embeddings';
import { addToVectorIndex } from '../../search';
import { createHash } from 'crypto';

const logger = daemonLogger.child({ module: 'bigrack-update-task' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackUpdateBoxArgs {
  projectId: string; // Required - Pallet ID (DB: projectId)
  taskId?: string; // Optional - Box ID (DB: taskId) - either taskId or taskTitle required
  taskTitle?: string; // Optional - Box title - either taskId or taskTitle required
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  estimatedTime?: string;
  assignee?: string;
  gitBranch?: string;
  tags?: string[];
  validationCriteria?: string[];
  dependencies?: string[]; // Box titles (will be resolved to IDs)
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  externalId?: string; // Original ticket ID (e.g., "#125")
  objectives?: string[]; // Checklist of objectives
  relatedTickets?: string[]; // Related ticket IDs (e.g., ["#107", "#126"])
}

export interface BigrackUpdateBoxResult {
  success: boolean;
  message: string;
  task?: {
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    type?: string;
    estimatedTime?: string;
    assignee?: string;
    gitBranch?: string;
    tags?: string[];
    validationCriteria?: string[];
    dependencies: string[]; // Task IDs
    externalId?: string;
    objectives?: string[];
    relatedTickets?: string[];
    updatedAt: string;
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackUpdateBox(
  args: BigrackUpdateBoxArgs
): Promise<BigrackUpdateBoxResult> {
  const { projectId, taskId, taskTitle, ...updateFields } = args;

  logger.info({ projectId, taskId, taskTitle }, 'Updating box');

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

    // Step 2: Build update data object (only include provided fields)
    const updateData: any = {};

    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }

    if (updateFields.priority !== undefined) {
      updateData.priority = updateFields.priority;
    }

    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description;
    }

    if (updateFields.estimatedTime !== undefined) {
      updateData.estimatedTime = updateFields.estimatedTime;
    }

    if (updateFields.assignee !== undefined) {
      updateData.assignee = updateFields.assignee;
    }

    if (updateFields.gitBranch !== undefined) {
      updateData.gitBranch = updateFields.gitBranch;
    }

    if (updateFields.type !== undefined) {
      updateData.type = updateFields.type;
    }

    if (updateFields.tags !== undefined) {
      updateData.tags = JSON.stringify(updateFields.tags);
    }

    if (updateFields.validationCriteria !== undefined) {
      updateData.validationCriteria = JSON.stringify(updateFields.validationCriteria);
    }

    if (updateFields.externalId !== undefined) {
      updateData.externalId = updateFields.externalId;
    }

    if (updateFields.objectives !== undefined) {
      updateData.objectives = JSON.stringify(updateFields.objectives);
    }

    if (updateFields.relatedTickets !== undefined) {
      updateData.relatedTickets = JSON.stringify(updateFields.relatedTickets);
    }

    // Step 3: Handle dependencies (resolve titles to IDs)
    if (updateFields.dependencies !== undefined) {
      const depTasks = await prisma.task.findMany({
        where: {
          projectId,
          title: { in: updateFields.dependencies },
        },
        select: { id: true, title: true },
      });

      // Check if all dependencies were found
      const foundTitles = new Set(depTasks.map((t) => t.title));
      const missingDeps = updateFields.dependencies.filter((title) => !foundTitles.has(title));

      if (missingDeps.length > 0) {
        return {
          success: false,
          message: 'Some dependencies not found',
          error: `The following dependency tasks were not found: ${missingDeps.join(', ')}`,
        };
      }

      const depIds = depTasks.map((t) => t.id);

      // Check for circular dependencies
      if (depIds.includes(task.id)) {
        return {
          success: false,
          message: 'Circular dependency detected',
          error: 'A task cannot depend on itself',
        };
      }

      updateData.dependsOn = JSON.stringify(depIds);
    }

    // Step 4: Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    // Step 5: Update the task
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: updateData,
    });

    // Step 5.5: Update embedding if content changed
    const contentFieldsChanged =
      updateFields.description !== undefined ||
      updateFields.type !== undefined ||
      updateFields.priority !== undefined ||
      updateFields.objectives !== undefined ||
      updateFields.validationCriteria !== undefined ||
      updateFields.tags !== undefined;

    if (contentFieldsChanged) {
      try {
        // Get project to access repoId
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { repoId: true },
        });

        if (project) {
          await updateTaskEmbedding(updatedTask, project.repoId, projectId);
        }
      } catch (error: any) {
        logger.warn(
          { taskId: updatedTask.id, error: error.message },
          'Failed to update embedding for box, continuing...'
        );
      }
    }

    // Step 6: Format response
    // Check if status was changed to "completed"
    const wasCompleted = task.status === 'completed';
    const isNowCompleted = updatedTask.status === 'completed';
    const statusChangedToCompleted = !wasCompleted && isNowCompleted;

    let message = `Box "${updatedTask.title}" updated successfully`;

    // Add suggestion to add a comment if status changed to completed
    if (statusChangedToCompleted) {
      message += `\n\n💡 **Suggestion:** The ticket has been marked as completed. Consider adding a comment to document what was accomplished. You can use \`bigrack_ticket_comment_create\` with the taskId "${updatedTask.id}" to add a comment. The comment content supports Markdown formatting, so feel free to include details about what was implemented, any challenges encountered, or next steps.`;
    }

    const result: BigrackUpdateBoxResult = {
      success: true,
      message,
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description || undefined,
        priority: updatedTask.priority,
        status: updatedTask.status,
        type: updatedTask.type || undefined,
        estimatedTime: updatedTask.estimatedTime || undefined,
        assignee: updatedTask.assignee || undefined,
        gitBranch: updatedTask.gitBranch || undefined,
        tags: updatedTask.tags ? JSON.parse(updatedTask.tags) : undefined,
        validationCriteria: updatedTask.validationCriteria
          ? JSON.parse(updatedTask.validationCriteria)
          : undefined,
        dependencies: updatedTask.dependsOn ? JSON.parse(updatedTask.dependsOn) : [],
        externalId: updatedTask.externalId || undefined,
        objectives: updatedTask.objectives ? JSON.parse(updatedTask.objectives) : undefined,
        relatedTickets: updatedTask.relatedTickets
          ? JSON.parse(updatedTask.relatedTickets)
          : undefined,
        updatedAt: updatedTask.updatedAt.toISOString(),
      },
    };

    logger.info(
      { taskId: updatedTask.id, fieldsUpdated: Object.keys(updateData), statusChangedToCompleted },
      'Task updated successfully'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to update task');
    return {
      success: false,
      message: 'Failed to update task',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================================================
// Helper Functions - Embedding Management
// ============================================================================

/**
 * Update embedding for a task/box
 * Checks contentHash to see if embedding needs updating
 */
async function updateTaskEmbedding(task: any, repoId: string, projectId: string): Promise<void> {
  // 1. Build text for embedding
  const text = buildTextForTaskEmbedding(task);

  // 2. Calculate new content hash
  const newContentHash = createHash('sha256').update(text).digest('hex');

  // 3. Check if embedding exists and if content changed (check first chunk)
  const existingEmbedding = await prisma.vectorEmbedding.findUnique({
    where: {
      entityType_entityId_chunkIndex: {
        entityType: 'task',
        entityId: task.id,
        chunkIndex: 0,
      },
    },
  });

  if (existingEmbedding && existingEmbedding.contentHash === newContentHash) {
    logger.debug({ taskId: task.id }, 'Content unchanged, skipping embedding update');
    return;
  }

  // 4. Generate new embedding
  const embedding = await generateEmbedding(text);

  // 5. Update or create VectorEmbedding
  if (existingEmbedding) {
    await prisma.vectorEmbedding.update({
      where: { id: existingEmbedding.id },
      data: {
        embedding: JSON.stringify(embedding),
        contentHash: newContentHash,
        category: task.type || null,
        priority: task.priority || null,
        updatedAt: new Date(),
      },
    });

    // Update vector index
    await addToVectorIndex(existingEmbedding.id, embedding);

    logger.debug({ taskId: task.id }, 'Updated embedding for box');
  } else {
    // Create new embedding if it doesn't exist
    const { v4: uuidv4 } = await import('uuid');
    const embeddingRecord = await prisma.vectorEmbedding.create({
      data: {
        id: uuidv4(),
        entityType: 'task',
        entityId: task.id,
        repoId,
        projectId,
        embedding: JSON.stringify(embedding),
        embeddingModel: 'all-MiniLM-L6-v2',
        dimension: 384,
        contentHash: newContentHash,
        category: task.type || null,
        priority: task.priority || null,
      },
    });

    await addToVectorIndex(embeddingRecord.id, embedding);

    logger.debug({ taskId: task.id }, 'Created embedding for box');
  }
}

/**
 * Build text representation for task/box embedding
 */
function buildTextForTaskEmbedding(task: any): string {
  const parts: string[] = [];

  // Title is most important
  parts.push(`Task: ${task.title}`);

  // Description
  if (task.description) {
    parts.push(`Description: ${task.description}`);
  }

  // Type and priority
  if (task.type) {
    parts.push(`Type: ${task.type}`);
  }
  parts.push(`Priority: ${task.priority}`);

  // Objectives
  if (task.objectives) {
    try {
      const objectives = JSON.parse(task.objectives);
      if (Array.isArray(objectives) && objectives.length > 0) {
        parts.push(`Objectives: ${objectives.join('; ')}`);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Validation criteria
  if (task.validationCriteria) {
    try {
      const criteria = JSON.parse(task.validationCriteria);
      if (Array.isArray(criteria) && criteria.length > 0) {
        parts.push(`Validation: ${criteria.join('; ')}`);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Tags
  if (task.tags) {
    try {
      const tags = JSON.parse(task.tags);
      if (Array.isArray(tags) && tags.length > 0) {
        parts.push(`Tags: ${tags.join(', ')}`);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return parts.join('. ');
}
