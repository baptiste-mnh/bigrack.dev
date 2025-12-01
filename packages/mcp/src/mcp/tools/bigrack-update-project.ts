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
import { getProjectIdFromBigrackJson } from '../../utils/bigrack-config';

const logger = daemonLogger.child({ module: 'bigrack-update-project' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackUpdateProjectArgs {
  projectId?: string; // Optional, will use bigrack.json if not provided
  workspacePath?: string; // Optional workspace path, defaults to process.cwd()
  name?: string;
  description?: string;
  type?: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'spike';
  status?: 'planned' | 'in-progress' | 'testing' | 'completed' | 'cancelled';
  progress?: number; // 0-100
  gitBranch?: string;
  gitBaseBranch?: string;
  inheritsFromRepo?: boolean;
  visibility?: 'private' | 'team';
}

export interface BigrackUpdateProjectResult {
  success: boolean;
  message: string;
  project?: {
    id: string;
    name: string;
    description?: string;
    type: string;
    status: string;
    progress: number;
    gitBranch?: string;
    gitBaseBranch?: string;
    inheritsFromRepo: boolean;
    visibility: string;
    updatedAt: string;
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Update a BigRack project
 *
 * This tool:
 * 1. Gets projectId from argument or bigrack.json
 * 2. Verifies project exists
 * 3. Updates project in database
 */
export async function bigrackUpdateProject(
  args: BigrackUpdateProjectArgs
): Promise<BigrackUpdateProjectResult> {
  const {
    projectId: providedProjectId,
    workspacePath,
    name,
    description,
    type,
    status,
    progress,
    gitBranch,
    gitBaseBranch,
    inheritsFromRepo,
    visibility,
  } = args;

  logger.info(
    { providedProjectId, workspacePath, name, description, type, status },
    'Updating project'
  );

  try {
    // Get projectId from argument or bigrack.json
    let projectId: string;

    if (providedProjectId) {
      projectId = providedProjectId;
    } else {
      const projectIdResult = getProjectIdFromBigrackJson(workspacePath);
      if (!projectIdResult.success || !projectIdResult.projectId) {
        return {
          success: false,
          message: projectIdResult.error || 'Project ID not provided and no bigrack.json found',
          error: projectIdResult.message || projectIdResult.error,
        };
      }
      projectId = projectIdResult.projectId;
    }

    // Verify project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        repo: true,
      },
    });

    if (!existingProject) {
      return {
        success: false,
        message: 'Project not found',
        error: `Project with ID ${projectId} does not exist. Check the project ID in bigrack.json.`,
      };
    }

    // Build update data object (only include provided fields)
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (progress !== undefined) {
      if (progress < 0 || progress > 100) {
        return {
          success: false,
          message: 'Invalid progress value',
          error: 'Progress must be between 0 and 100',
        };
      }
      updateData.progress = progress;
    }

    if (gitBranch !== undefined) {
      updateData.gitBranch = gitBranch || null;
    }

    if (gitBaseBranch !== undefined) {
      updateData.gitBaseBranch = gitBaseBranch || null;
    }

    if (inheritsFromRepo !== undefined) {
      updateData.inheritsFromRepo = inheritsFromRepo;
    }

    if (visibility !== undefined) {
      updateData.visibility = visibility;
    }

    // Check if there are any updates
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: 'No fields to update',
        error: 'At least one field must be provided to update.',
      };
    }

    // Update project in database
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    logger.info(
      { projectId, updatedFields: Object.keys(updateData) },
      'Project updated successfully'
    );

    return {
      success: true,
      message: `✅ Project "${updatedProject.name}" updated successfully!`,
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description || undefined,
        type: updatedProject.type,
        status: updatedProject.status,
        progress: updatedProject.progress,
        gitBranch: updatedProject.gitBranch || undefined,
        gitBaseBranch: updatedProject.gitBaseBranch || undefined,
        inheritsFromRepo: updatedProject.inheritsFromRepo,
        visibility: updatedProject.visibility,
        updatedAt: updatedProject.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to update project');
    return {
      success: false,
      message: 'Failed to update project',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
