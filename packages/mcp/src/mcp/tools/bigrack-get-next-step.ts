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

import { prismaClient as prisma } from '../../storage';
import { daemonLogger } from '../../logger';
import { getProjectIdFromBigrackJson } from '../../utils/bigrack-config';

const logger = daemonLogger.child({ module: 'bigrack-get-next-step' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackGetNextStepArgs {
  projectId?: string; // Optional: will use bigrack.json if not provided
  limit?: number; // Default: 3
  includeTesting?: boolean; // Default: true
}

interface RecommendedTask {
  id: string;
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime?: string;
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  validationCriteria?: string[];
  dependencies: string[]; // Task IDs (all completed)
  reason?: string; // Why this task is recommended
}

export interface BigrackGetNextStepResult {
  success: boolean;
  message: string;
  reminders?: string[]; // Reminders to include in the response
  recommendations?: {
    projectId: string;
    projectName: string;
    totalAvailable: number; // Total tasks available to start
    tasks: RecommendedTask[];
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackGetNextStep(
  args: BigrackGetNextStepArgs
): Promise<BigrackGetNextStepResult> {
  const { projectId: providedProjectId, limit = 3, includeTesting = true } = args;

  logger.info({ providedProjectId, limit, includeTesting }, 'Getting next step recommendation');

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

    // Step 1: Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { repo: true },
    });

    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        error: `Project with ID ${projectId} does not exist`,
      };
    }

    // Step 2: Get all tasks (we need all to build dependency graph)
    const allTasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    if (allTasks.length === 0) {
      return {
        success: true,
        message: 'No tasks found in project',
        recommendations: {
          projectId: project.id,
          projectName: project.name,
          totalAvailable: 0,
          tasks: [],
        },
      };
    }

    // Step 3: Build dependency graph
    const graph = buildDependencyGraph(allTasks);
    const completedIds = new Set(allTasks.filter((t) => t.status === 'completed').map((t) => t.id));

    // Step 4: Find available tasks (pending + all deps completed)
    const availableTasks = allTasks.filter((task) => {
      if (task.status !== 'pending') return false;

      const node = graph.get(task.id);
      if (!node) return true; // No deps = available

      // Check if all dependencies are completed
      const allDepsCompleted = node.dependencies.every((depId) => completedIds.has(depId));
      return allDepsCompleted;
    });

    // Step 5: Filter out testing tasks if requested
    let filteredTasks = availableTasks;
    if (!includeTesting) {
      filteredTasks = availableTasks.filter((task) => task.type !== 'testing');
    }

    // Step 6: Sort by priority (critical > high > medium > low)
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    filteredTasks.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] ?? 999;
      const priorityB = priorityOrder[b.priority] ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Secondary sort by order
      return a.order - b.order;
    });

    // Step 7: Take top N tasks
    const recommendedTasks = filteredTasks.slice(0, limit);

    // Step 8: Format tasks
    const formattedTasks: RecommendedTask[] = recommendedTasks.map((task) => {
      const node = graph.get(task.id);
      const deps = node?.dependencies || [];

      let reason = '';
      if (task.priority === 'critical') {
        reason =
          deps.length > 0
            ? 'Critical priority, all dependencies completed'
            : 'Critical priority, no blockers';
      } else if (task.priority === 'high') {
        reason =
          deps.length > 0
            ? 'High priority, all dependencies completed'
            : 'High priority, no blockers';
      } else {
        reason = deps.length > 0 ? 'All dependencies completed' : 'No blockers';
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        priority: task.priority as 'critical' | 'high' | 'medium' | 'low',
        estimatedTime: task.estimatedTime || undefined,
        type: (task.type as 'setup' | 'implementation' | 'testing' | 'documentation') || undefined,
        validationCriteria: task.validationCriteria
          ? JSON.parse(task.validationCriteria)
          : undefined,
        dependencies: deps,
        reason,
      };
    });

    // Step 9: Build result with reminders
    const reminders = [
      '⚠️ IMPORTANT: Before starting work on a ticket, you MUST update its status to "in-progress" using bigrack_update_ticket',
      '✅ REMINDER: When completing a ticket, update its status to "completed" and add a brief implementation summary in the description',
    ];

    const result: BigrackGetNextStepResult = {
      success: true,
      message:
        formattedTasks.length > 0
          ? `Found ${formattedTasks.length} recommended task(s)\n\n${reminders.join('\n')}`
          : `No available tasks to start right now\n\n${reminders.join('\n')}`,
      reminders,
      recommendations: {
        projectId: project.id,
        projectName: project.name,
        totalAvailable: filteredTasks.length,
        tasks: formattedTasks,
      },
    };

    logger.info(
      { success: true, availableCount: filteredTasks.length, returnedCount: formattedTasks.length },
      'Next step recommendation completed'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to get next step');
    return {
      success: false,
      message: 'Failed to get next step recommendation',
      error: error.message || 'Unknown error',
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

function buildDependencyGraph(tasks: any[]): Map<string, DependencyGraph> {
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
