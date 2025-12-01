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
import { getProjectIdFromBigrackJson, getBigrackConfig } from '../../utils/bigrack-config';

const logger = daemonLogger.child({ module: 'bigrack-get-project-info' });

// Type helpers inferred from Prisma queries
type Task = Awaited<ReturnType<typeof prisma.task.findMany>>[0];
type ProjectContext = Awaited<ReturnType<typeof prisma.projectContext.findMany>>[0];
type Checkpoint = Awaited<ReturnType<typeof prisma.checkpoint.findMany>>[0];

// ============================================================================
// Types
// ============================================================================

export interface BigrackGetProjectInfoArgs {
  projectId?: string; // Optional, will use bigrack.json if not provided
  includeCompletedTasks?: boolean; // Default: false
}

interface FormattedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  order: number;
  dependencies: string[]; // Task IDs
  dependents: string[]; // Task IDs
  isBlocked: boolean;
  canStart: boolean;
}

interface ProjectContextElement {
  id: string;
  contentType: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BigrackGetProjectInfoResult {
  success: boolean;
  message: string;
  info?: {
    project: {
      id: string;
      name: string;
      description?: string;
      repoId: string;
      repoName: string;
      type: string;
      status: string;
      progress: number; // 0-100
      inheritsFromRepo: boolean;
      gitBranch?: string;
      gitLastCommit?: string;
      createdAt: string;
      updatedAt: string;
    };
    tasks: {
      total: number;
      byStatus: {
        pending: number;
        inProgress: number;
        completed: number;
        blocked: number;
      };
      list: FormattedTask[];
    };
    executionPlan: {
      availableTasks: string[]; // Task IDs that can be started now
      blockedTasks: string[]; // Task IDs waiting on dependencies
      nextRecommended?: string; // Suggested next task ID
    };
    checkpoints: Array<{
      id: string;
      message?: string;
      createdAt: string;
      gitCommitSha?: string;
    }>;
    projectContext: {
      total: number;
      list: ProjectContextElement[];
    };
    localConfig?: {
      repoId: string;
      name: string;
      description?: string;
      projects?: string[];
      currentProject?: string;
      createdAt: string;
    };
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackGetProjectInfo(
  args: BigrackGetProjectInfoArgs
): Promise<BigrackGetProjectInfoResult> {
  const { projectId: providedProjectId, includeCompletedTasks = false } = args;

  logger.info({ providedProjectId, includeCompletedTasks }, 'Getting project info');

  try {
    // Get projectId from argument or bigrack.json
    let projectId: string;

    if (providedProjectId) {
      projectId = providedProjectId;
    } else {
      const projectIdResult = getProjectIdFromBigrackJson();
      if (!projectIdResult.success || !projectIdResult.projectId) {
        return {
          success: false,
          message: projectIdResult.error || 'Project ID not provided and no bigrack.json found',
          error: projectIdResult.message || projectIdResult.error,
        };
      }
      projectId = projectIdResult.projectId;
    }

    // Step 1: Get project with repo
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        repo: true,
      },
    });

    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        error: `Project with ID ${projectId} does not exist. Check the project ID in bigrack.json.`,
      };
    }

    // Step 2: Get all tasks
    const allTasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    // Filter out completed tasks if requested
    const tasks = includeCompletedTasks
      ? allTasks
      : allTasks.filter((t: Task) => t.status !== 'completed');

    logger.debug({ taskCount: tasks.length }, 'Tasks loaded');

    // Step 3: Build dependency graph
    const graph = buildDependencyGraph(allTasks); // Use all tasks for graph

    // Step 4: Format tasks with dependency info
    const completedIds = new Set<string>(
      allTasks.filter((t: Task) => t.status === 'completed').map((t: Task) => t.id)
    );

    const formattedTasks = tasks.map((task: Task) => formatTask(task, graph, completedIds));

    // Step 5: Calculate execution plan
    const executionPlan = calculateExecutionPlan(tasks, graph, completedIds);

    // Step 6: Calculate progress
    const progress = calculateProgress(allTasks);

    // Step 7: Get checkpoints
    const checkpoints = await prisma.checkpoint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 5, // Last 5 checkpoints
    });

    // Step 8: Get project-specific context
    const projectContexts = await prisma.projectContext.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    // Format project context elements
    const projectContextElements: ProjectContextElement[] = projectContexts.map(
      (pc: ProjectContext) => ({
        id: pc.id,
        contentType: pc.contentType,
        content: pc.content,
        createdAt: pc.createdAt.toISOString(),
        updatedAt: pc.updatedAt.toISOString(),
      })
    );

    // Step 9: Count tasks by status
    const byStatus = {
      pending: allTasks.filter((t: Task) => t.status === 'pending').length,
      inProgress: allTasks.filter((t: Task) => t.status === 'in-progress').length,
      completed: allTasks.filter((t: Task) => t.status === 'completed').length,
      blocked: formattedTasks.filter((t: FormattedTask) => t.isBlocked).length,
    };

    // Step 10: Get local config from bigrack.json
    const localConfigResult = getBigrackConfig();
    const localConfig =
      localConfigResult.success && localConfigResult.config
        ? {
            repoId: localConfigResult.config.repoId,
            name: localConfigResult.config.name,
            description: localConfigResult.config.description,
            projects: localConfigResult.config.projects,
            currentProject: localConfigResult.config.currentProject,
            createdAt: localConfigResult.config.createdAt,
          }
        : undefined;

    // Step 11: Build result
    const result: BigrackGetProjectInfoResult = {
      success: true,
      message: `Project info retrieved: ${allTasks.length} tasks, ${progress}% complete`,
      info: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description || undefined,
          repoId: project.repoId,
          repoName: project.repo.name,
          type: project.type,
          status: project.status,
          progress,
          inheritsFromRepo: project.inheritsFromRepo,
          gitBranch: project.gitBranch || undefined,
          gitLastCommit: project.gitLastCommitSha
            ? `${project.gitLastCommitSha.substring(0, 7)} - ${project.gitLastCommitMessage || ''}`
            : undefined,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        },
        tasks: {
          total: allTasks.length,
          byStatus,
          list: formattedTasks,
        },
        executionPlan,
        checkpoints: checkpoints.map((c: Checkpoint) => ({
          id: c.id,
          message: c.message || undefined,
          createdAt: c.createdAt.toISOString(),
          gitCommitSha: c.gitCommitSha || undefined,
        })),
        projectContext: {
          total: projectContextElements.length,
          list: projectContextElements,
        },
        ...(localConfig && { localConfig }),
      },
    };

    logger.info(
      {
        success: true,
        progress,
        taskCount: allTasks.length,
        contextCount: projectContextElements.length,
      },
      'Project info retrieved'
    );
    return result;
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to get project info');
    return {
      success: false,
      message: 'Failed to get project info',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface DependencyGraph {
  dependencies: string[];
  dependents: string[];
}

function buildDependencyGraph(tasks: Task[]): Map<string, DependencyGraph> {
  const graph = new Map<string, DependencyGraph>();

  // Initialize graph for all tasks
  for (const task of tasks) {
    graph.set(task.id, {
      dependencies: [],
      dependents: [],
    });
  }

  // Parse dependsOn JSON and build graph
  for (const task of tasks) {
    const deps: string[] = task.dependsOn ? JSON.parse(task.dependsOn) : [];

    const node = graph.get(task.id)!;
    node.dependencies = deps;

    // Build reverse dependencies (dependents)
    for (const depId of deps) {
      const depNode = graph.get(depId);
      if (depNode) {
        depNode.dependents.push(task.id);
      }
    }
  }

  return graph;
}

function formatTask(
  task: Task,
  graph: Map<string, DependencyGraph>,
  completedIds: Set<string>
): FormattedTask {
  const node = graph.get(task.id);
  const allDepsCompleted = node?.dependencies.every((depId) => completedIds.has(depId)) ?? true;

  return {
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    status: task.status,
    priority: task.priority,
    order: task.order,
    dependencies: node?.dependencies || [],
    dependents: node?.dependents || [],
    isBlocked: !allDepsCompleted && task.status !== 'completed',
    canStart: allDepsCompleted && task.status === 'pending',
  };
}

function calculateExecutionPlan(
  tasks: Task[],
  graph: Map<string, DependencyGraph>,
  completedIds: Set<string>
): {
  availableTasks: string[];
  blockedTasks: string[];
  nextRecommended?: string;
} {
  const available: string[] = [];
  const blocked: string[] = [];

  for (const task of tasks) {
    if (task.status === 'completed') continue;

    const node = graph.get(task.id);
    if (!node) continue;

    // Check if all dependencies are completed
    const allDepsCompleted = node.dependencies.every((depId) => completedIds.has(depId));

    if (allDepsCompleted && task.status === 'pending') {
      available.push(task.id);
    } else if (!allDepsCompleted) {
      blocked.push(task.id);
    }
  }

  // Recommend highest priority available task
  let nextRecommended: string | undefined;

  if (available.length > 0) {
    // Try to find critical priority
    nextRecommended =
      tasks.find((t) => available.includes(t.id) && t.priority === 'critical')?.id ||
      tasks.find((t) => available.includes(t.id) && t.priority === 'high')?.id ||
      available[0]; // Fallback to first available
  }

  return { availableTasks: available, blockedTasks: blocked, nextRecommended };
}

function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const completed = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}
