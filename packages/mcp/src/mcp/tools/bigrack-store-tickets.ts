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
import { v4 as uuidv4 } from 'uuid';

const logger = daemonLogger.child({ module: 'bigrack-store-tasks' });

// ============================================================================
// Types (Ticket terminology for tasks)
// ============================================================================

export interface TaskInput {
  title: string;
  description?: string;
  dependencies?: string[]; // Titles of tickets this depends on
  estimatedTime?: string; // e.g., "2h", "30min", "1d"
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  validationCriteria?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[]; // Tags for categorization
  externalId?: string; // Original ticket ID (e.g., "#125")
  objectives?: string[]; // Checklist of objectives
  relatedTickets?: string[]; // Related ticket IDs (e.g., ["#107", "#126"])
}

export interface BigrackStoreBoxesArgs {
  projectId: string; // Project ID (DB: projectId)
  tasks: TaskInput[]; // Tickets to store (DB: tasks table)
  isContextVerified?: boolean; // Indicates if context was verified before creating tickets
}

export interface BigrackStoreBoxesResult {
  success: boolean;
  message: string;
  taskCount?: number;
  tasks?: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  error?: string;
}

// ============================================================================
// Main Function - Store tickets (saves to tasks table)
// ============================================================================

export async function bigrackStoreBoxes(
  args: BigrackStoreBoxesArgs
): Promise<BigrackStoreBoxesResult> {
  const { projectId, tasks, isContextVerified = false } = args;

  logger.info({ projectId, taskCount: tasks.length, isContextVerified }, 'Storing tickets');

  if (!isContextVerified) {
    logger.warn(
      { projectId },
      'Creating tickets without context verification. Consider using bigrack_query_context to verify relevant context from repo and project before creating tickets.'
    );
  }

  try {
    // Step 1: Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        error: `Project with ID ${projectId} does not exist`,
      };
    }

    // Step 2: Validate no circular dependencies
    const cycles = detectCycles(tasks);
    if (cycles.length > 0) {
      return {
        success: false,
        message: 'Circular dependencies detected',
        error: `Cycles found: ${cycles.join(', ')}`,
      };
    }

    // Step 3: Build title-to-index map for dependency resolution
    const titleMap = new Map<string, number>();
    tasks.forEach((task, i) => {
      titleMap.set(task.title, i);
    });

    // Step 4: Create tickets in order and track IDs
    const createdTasks: Array<{ id: string; title: string; order: number }> = [];
    const titleToIdMap = new Map<string, string>();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // Resolve dependencies to box IDs (will update later)
      const dependsOnTitles = task.dependencies || [];

      const created = await prisma.task.create({
        data: {
          projectId,
          title: task.title,
          description: task.description || null,
          status: 'pending',
          priority: task.priority || 'medium',
          order: i,
          dependsOn: JSON.stringify(dependsOnTitles), // Store titles temporarily
          type: task.type || null,
          estimatedTime: task.estimatedTime || null,
          validationCriteria: task.validationCriteria
            ? JSON.stringify(task.validationCriteria)
            : null,
          tags: task.tags ? JSON.stringify(task.tags) : null,
          objectives: task.objectives ? JSON.stringify(task.objectives) : null,
          relatedTickets: task.relatedTickets ? JSON.stringify(task.relatedTickets) : null,
          externalId: task.externalId || null,
        },
      });

      createdTasks.push({
        id: created.id,
        title: created.title,
        order: i,
      });

      titleToIdMap.set(task.title, created.id);

      // Generate and store embedding for this box
      try {
        await generateAndStoreTaskEmbedding(created, project.repoId, projectId);
      } catch (error: any) {
        logger.warn(
          { taskId: created.id, error: error.message },
          'Failed to generate embedding for box, continuing...'
        );
      }
    }

    // Step 5: Update dependencies with real IDs
    for (const createdTask of createdTasks) {
      const task = await prisma.task.findUnique({ where: { id: createdTask.id } });
      if (!task || !task.dependsOn) continue;

      const dependsOnTitles = JSON.parse(task.dependsOn) as string[];
      const dependsOnIds = dependsOnTitles
        .map((title) => titleToIdMap.get(title))
        .filter((id): id is string => id !== undefined);

      await prisma.task.update({
        where: { id: createdTask.id },
        data: {
          dependsOn: dependsOnIds.length > 0 ? JSON.stringify(dependsOnIds) : null,
        },
      });
    }

    logger.info({ taskCount: createdTasks.length }, 'Tickets stored successfully');

    return {
      success: true,
      message: `Successfully stored ${createdTasks.length} tickets in project ${project.name}`,
      taskCount: createdTasks.length,
      tasks: createdTasks,
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to store tickets');
    return {
      success: false,
      message: 'Failed to store tickets',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function detectCycles(tasks: TaskInput[]): string[] {
  const titleMap = new Map<string, number>();
  tasks.forEach((task, i) => {
    titleMap.set(task.title, i);
  });

  const graph = new Map<number, number[]>();
  for (let i = 0; i < tasks.length; i++) {
    graph.set(i, []);
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const deps = task.dependencies || [];
    for (const depTitle of deps) {
      const depIdx = titleMap.get(depTitle);
      if (depIdx !== undefined) {
        const neighbors = graph.get(depIdx) || [];
        neighbors.push(i);
        graph.set(depIdx, neighbors);
      }
    }
  }

  const visited = new Set<number>();
  const recStack = new Set<number>();
  const cycles: string[] = [];

  function dfs(node: number, path: number[]): boolean {
    if (recStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path
        .slice(cycleStart)
        .map((idx) => tasks[idx].title)
        .join(' → ');
      cycles.push(cycle);
      return true;
    }

    if (visited.has(node)) return false;

    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor, [...path])) {
        // Cycle found, continue to find all cycles
      }
    }

    recStack.delete(node);
    return false;
  }

  for (let i = 0; i < tasks.length; i++) {
    if (!visited.has(i)) {
      dfs(i, []);
    }
  }

  return cycles;
}

/**
 * Generate embedding and store in VectorEmbedding table for a task/ticket
 */
async function generateAndStoreTaskEmbedding(
  task: any,
  repoId: string,
  projectId: string
): Promise<void> {
  // 1. Build text for embedding
  const text = buildTextForTaskEmbedding(task);

  // 2. Generate embedding
  const embedding = await generateEmbedding(text);

  // 3. Calculate content hash
  const contentHash = createHash('sha256').update(text).digest('hex');

  // 4. Store in VectorEmbedding table
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
      contentHash,
      category: task.type || null,
      priority: task.priority || null,
    },
  });

  // 5. Add to vector index
  await addToVectorIndex(embeddingRecord.id, embedding);

  logger.debug({ taskId: task.id }, 'Generated and stored embedding for ticket');
}

/**
 * Build text representation for task/ticket embedding
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
