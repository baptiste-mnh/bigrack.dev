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

import { Command } from 'commander';
import chalk from 'chalk';
import { prismaClient as prisma } from '../../storage';
import { daemonLogger } from '../../logger';
import { getProjectIdFromBigrackJson } from '../../utils/bigrack-config';
import {
  formatPriority,
  formatStatus,
  formatType,
  formatTaskId,
  truncate,
} from '../utils/formatters';

const logger = daemonLogger.child({ module: 'cli-ticket' });

// ============================================================================
// Commands
// ============================================================================

/**
 * bigrack ticket list
 */
async function listTickets(options: { status?: string; priority?: string; type?: string }) {
  try {
    const projectIdResult = getProjectIdFromBigrackJson();
    if (!projectIdResult.success) {
      console.error(chalk.red('❌ Error:'), projectIdResult.error);
      if (projectIdResult.message) {
        console.log(chalk.gray(projectIdResult.message));
      }
      process.exit(1);
    }

    const projectId = projectIdResult.projectId!;

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { repo: true },
    });

    if (!project) {
      console.error(chalk.red('❌ Error:'), 'Project not found');
      process.exit(1);
    }

    // Build filter
    const where: any = { projectId };
    if (options.status) {
      where.status = options.status;
    }
    if (options.priority) {
      where.priority = options.priority;
    }
    if (options.type) {
      where.type = options.type;
    }

    // Get tasks
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ order: 'asc' }],
    });

    if (tasks.length === 0) {
      console.log(chalk.gray('\n📋 No tasks found'));
      if (options.status || options.priority || options.type) {
        console.log(chalk.gray('Try removing filters or create new tasks'));
      }
      return;
    }

    // Print header
    console.log(chalk.bold(`\n📦 ${project.name}`), chalk.gray(`(${project.type})`));
    console.log(chalk.gray(`Found ${tasks.length} task(s)\n`));

    // Print table header
    console.log(
      chalk.bold('ID    ') +
        '  ' +
        chalk.bold('Status        ') +
        '  ' +
        chalk.bold('Priority  ') +
        '  ' +
        chalk.bold('Type          ') +
        '  ' +
        chalk.bold('Title')
    );
    console.log(chalk.gray('─'.repeat(100)));

    // Print tasks
    for (const task of tasks) {
      const id = formatTaskId(task.externalId, task.order);
      const title = truncate(task.title, 50);

      console.log(
        chalk.cyan(id.padEnd(6)) +
          '  ' +
          formatStatus(task.status) +
          '  ' +
          formatPriority(task.priority) +
          '  ' +
          formatType(task.type) +
          '  ' +
          chalk.white(title)
      );
    }

    console.log(''); // Empty line
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to list tickets');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

/**
 * bigrack ticket get <ID>
 */
async function getTicket(taskIdOrExternal: string) {
  try {
    const projectIdResult = getProjectIdFromBigrackJson();
    if (!projectIdResult.success) {
      console.error(chalk.red('❌ Error:'), projectIdResult.error);
      if (projectIdResult.message) {
        console.log(chalk.gray(projectIdResult.message));
      }
      process.exit(1);
    }

    const projectId = projectIdResult.projectId!;

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      console.error(chalk.red('❌ Error:'), 'Project not found');
      process.exit(1);
    }

    // Try to find task by externalId or by ID
    let task = await prisma.task.findFirst({
      where: {
        projectId,
        OR: [
          { id: taskIdOrExternal },
          { externalId: taskIdOrExternal },
          {
            externalId: taskIdOrExternal.startsWith('#')
              ? taskIdOrExternal
              : `#${taskIdOrExternal}`,
          },
        ],
      },
    });

    if (!task) {
      console.error(chalk.red('❌ Error:'), `Task ${taskIdOrExternal} not found`);
      process.exit(1);
    }

    // Parse JSON fields
    const dependsOn: string[] = task.dependsOn ? JSON.parse(task.dependsOn) : [];
    const objectives: string[] = task.objectives ? JSON.parse(task.objectives) : [];
    const validationCriteria: string[] = task.validationCriteria
      ? JSON.parse(task.validationCriteria)
      : [];
    const relatedTickets: string[] = task.relatedTickets ? JSON.parse(task.relatedTickets) : [];

    // Get dependent tasks (tasks that depend on this one)
    const dependentTasks = await prisma.task.findMany({
      where: {
        projectId,
      },
    });

    const dependents: string[] = [];
    for (const depTask of dependentTasks) {
      const deps: string[] = depTask.dependsOn ? JSON.parse(depTask.dependsOn) : [];
      if (deps.includes(task.id)) {
        dependents.push(formatTaskId(depTask.externalId, depTask.order));
      }
    }

    // Print task details
    console.log(chalk.bold('\n📋 Task Details\n'));

    // Header
    const displayId = formatTaskId(task.externalId, task.order);
    console.log(chalk.cyan.bold(displayId), chalk.gray('•'), chalk.white(task.title));
    console.log('');

    // Status & Priority
    console.log(chalk.gray('Status:     '), formatStatus(task.status));
    console.log(chalk.gray('Priority:   '), formatPriority(task.priority));
    if (task.type) {
      console.log(chalk.gray('Type:       '), formatType(task.type));
    }
    if (task.estimatedTime) {
      console.log(chalk.gray('Estimated:  '), chalk.white(task.estimatedTime));
    }
    console.log('');

    // Description
    if (task.description) {
      console.log(chalk.bold('Description:'));
      console.log(chalk.gray(task.description));
      console.log('');
    }

    // Dependencies
    if (dependsOn.length > 0) {
      console.log(chalk.bold('Dependencies:'), chalk.gray(`(${dependsOn.length})`));
      for (const depId of dependsOn) {
        // Try to find the dependency task to show title
        const depTask = await prisma.task.findFirst({
          where: {
            projectId,
            id: depId,
          },
        });
        if (depTask) {
          const depDisplayId = formatTaskId(depTask.externalId, depTask.order);
          console.log('  ', chalk.cyan(depDisplayId), '-', chalk.gray(truncate(depTask.title, 60)));
        } else {
          console.log('  ', chalk.cyan(depId), chalk.gray('(not found)'));
        }
      }
      console.log('');
    }

    // Dependents
    if (dependents.length > 0) {
      console.log(chalk.bold('Blocks these tasks:'), chalk.gray(`(${dependents.length})`));
      for (const depId of dependents) {
        const depTask = await prisma.task.findFirst({
          where: {
            projectId,
            OR: [{ externalId: depId }, { id: depId }],
          },
        });
        if (depTask) {
          console.log('  ', chalk.cyan(depId), '-', chalk.gray(truncate(depTask.title, 60)));
        }
      }
      console.log('');
    }

    // Objectives
    if (objectives.length > 0) {
      console.log(chalk.bold('Objectives:'));
      for (const objective of objectives) {
        console.log('  •', chalk.gray(objective));
      }
      console.log('');
    }

    // Validation Criteria
    if (validationCriteria.length > 0) {
      console.log(chalk.bold('Validation Criteria:'));
      for (const criterion of validationCriteria) {
        console.log('  ✓', chalk.gray(criterion));
      }
      console.log('');
    }

    // Related Tickets
    if (relatedTickets.length > 0) {
      console.log(chalk.bold('Related Tickets:'));
      for (const relId of relatedTickets) {
        console.log('  ', chalk.cyan(relId));
      }
      console.log('');
    }

    // Git Branch
    if (task.gitBranch) {
      console.log(chalk.bold('Git Branch:'), chalk.cyan(task.gitBranch));
      console.log('');
    }

    // Assignee
    if (task.assignee) {
      console.log(chalk.bold('Assignee:'), chalk.yellow(task.assignee));
      console.log('');
    }

    // Metadata
    console.log(chalk.gray('Created:'), chalk.gray(task.createdAt.toISOString()));
    console.log(chalk.gray('Updated:'), chalk.gray(task.updatedAt.toISOString()));
    console.log('');
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to get ticket');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

/**
 * bigrack ticket next
 *
 * Reuses the MCP tool logic but formats output for CLI
 */
async function getNextTicket(options: { limit?: string }) {
  try {
    const projectIdResult = getProjectIdFromBigrackJson();
    if (!projectIdResult.success) {
      console.error(chalk.red('❌ Error:'), projectIdResult.error);
      if (projectIdResult.message) {
        console.log(chalk.gray(projectIdResult.message));
      }
      process.exit(1);
    }

    const projectId = projectIdResult.projectId!;
    const limit = options.limit ? parseInt(options.limit, 10) : 3;

    // Import MCP tool
    const { bigrackGetNextStep } = await import('../../mcp/tools/bigrack-get-next-step');

    // Call MCP tool
    const result = await bigrackGetNextStep({
      projectId,
      limit,
      includeTesting: true,
    });

    if (!result.success || !result.recommendations) {
      console.error(chalk.red('❌ Error:'), result.error || result.message);
      process.exit(1);
    }

    const { recommendations } = result;

    // Print header
    console.log(chalk.bold(`\n🎯 Next Tasks for ${recommendations.projectName}\n`));
    console.log(chalk.gray(`Available to start: ${recommendations.totalAvailable} task(s)`));
    console.log(chalk.gray(`Showing top ${recommendations.tasks.length} recommendations\n`));

    if (recommendations.tasks.length === 0) {
      console.log(chalk.yellow('⚠️  No tasks available to start right now'));
      console.log(chalk.gray('All tasks may be blocked by dependencies'));
      return;
    }

    // Print tasks
    for (let i = 0; i < recommendations.tasks.length; i++) {
      const task = recommendations.tasks[i];
      const num = i + 1;

      // Get task to display ID
      const fullTask = await prisma.task.findUnique({
        where: { id: task.id },
      });
      const displayId = fullTask ? formatTaskId(fullTask.externalId, fullTask.order) : '?';

      console.log(
        chalk.bold.white(`${num}.`),
        chalk.cyan(`[${displayId}]`),
        formatPriority(task.priority),
        chalk.bold(task.title)
      );

      if (task.description) {
        console.log('   ', chalk.gray(truncate(task.description, 80)));
      }

      console.log(
        '   ',
        chalk.gray('Type:'),
        formatType(task.type || 'none'),
        ' ',
        chalk.gray('Estimated:'),
        chalk.white(task.estimatedTime || 'unknown')
      );

      if (task.dependencies.length > 0) {
        console.log('   ', chalk.gray(`Dependencies: ${task.dependencies.length} (all completed)`));
      }

      console.log('   ', chalk.italic.gray(task.reason));
      console.log('');
    }

    // Helpful hint
    console.log(
      chalk.gray('💡 Use'),
      chalk.cyan('bigrack ticket get <ID>'),
      chalk.gray('to see full task details')
    );
    console.log('');
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to get next ticket');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// ============================================================================
// Command Definition
// ============================================================================

export const ticketCommand = new Command('ticket')
  .description('Manage tasks/tickets in current project')
  .addCommand(
    new Command('list')
      .description('List all tasks in current project')
      .option('--status <status>', 'Filter by status (pending|in-progress|completed|blocked)')
      .option('--priority <priority>', 'Filter by priority (critical|high|medium|low)')
      .option('--type <type>', 'Filter by type (setup|implementation|testing|documentation)')
      .action(listTickets)
  )
  .addCommand(
    new Command('get')
      .description('Get details of a specific task')
      .argument('<id>', 'Task ID or external ID (e.g., #123)')
      .action(getTicket)
  )
  .addCommand(
    new Command('next')
      .description('Get recommended next tasks to work on')
      .option('--limit <number>', 'Number of tasks to show (default: 3)', '3')
      .action(getNextTicket)
  );
