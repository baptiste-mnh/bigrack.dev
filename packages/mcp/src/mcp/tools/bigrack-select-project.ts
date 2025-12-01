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

import * as fs from 'fs';
import { prismaClient as prisma } from '../../storage';
import { daemonLogger } from '../../logger';
import {
  getBigrackJsonPath,
  getBigrackConfig,
  saveBigrackConfig,
  getRepoIdFromBigrackJson,
} from '../../utils/bigrack-config';

const logger = daemonLogger.child({ module: 'bigrack-select-project' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackSelectProjectArgs {
  projectId?: string; // Project ID to select (optional, will use bigrack.json to get repo)
  projectName?: string; // Project name to select (alternative to projectId)
  repoId?: string; // Optional repo ID (will use bigrack.json if not provided)
}

export interface BigrackSelectProjectResult {
  success: boolean;
  message: string;
  projectId?: string;
  projectName?: string;
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Select a project as the current project in bigrack.json
 * This makes it easier to work with a specific project without passing projectId every time
 */
export async function bigrackSelectProject(
  args: BigrackSelectProjectArgs
): Promise<BigrackSelectProjectResult> {
  const { projectId: providedProjectId, projectName, repoId: providedRepoId } = args;

  logger.info({ providedProjectId, projectName, providedRepoId }, 'Selecting project');

  try {
    // Get repoId from argument or bigrack.json
    let repoId: string;

    if (providedRepoId) {
      repoId = providedRepoId;
    } else {
      const repoIdResult = getRepoIdFromBigrackJson();
      if (!repoIdResult.success || !repoIdResult.repoId) {
        return {
          success: false,
          message: 'No bigrack.json found',
          error:
            repoIdResult.error ||
            'No bigrack.json found in current directory. Run bigrack_create_repo first or provide repoId explicitly.',
        };
      }
      repoId = repoIdResult.repoId;
    }

    // Find project by ID or name
    let projectId: string;
    let project;

    if (providedProjectId) {
      projectId = providedProjectId;
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { repo: true },
      });
    } else if (projectName) {
      // Search by name in the repo
      project = await prisma.project.findFirst({
        where: {
          repoId,
          name: projectName,
        },
        include: { repo: true },
      });

      if (!project) {
        return {
          success: false,
          message: 'Project not found',
          error: `Project with name "${projectName}" not found in repo.`,
        };
      }

      projectId = project.id;
    } else {
      return {
        success: false,
        message: 'Project identifier required',
        error: 'Either projectId or projectName must be provided.',
      };
    }

    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        error: `Project with ID ${projectId} does not exist`,
      };
    }

    // Verify project belongs to the repo
    if (project.repoId !== repoId) {
      return {
        success: false,
        message: 'Project belongs to different repo',
        error: `Project "${project.name}" belongs to repo ${project.repoId}, not ${repoId}`,
      };
    }

    // Read current bigrack.json
    const bigrackJsonPath = getBigrackJsonPath();

    if (!fs.existsSync(bigrackJsonPath)) {
      return {
        success: false,
        message: 'bigrack.json not found',
        error:
          'bigrack.json not found in current directory. Run bigrack_create_repo first to create it.',
      };
    }

    const configResult = getBigrackConfig();
    if (!configResult.success || !configResult.config) {
      return {
        success: false,
        message: 'Failed to parse bigrack.json',
        error: configResult.error || 'Error reading bigrack.json',
      };
    }

    const bigrackConfig = configResult.config;

    // Verify repoId matches
    if (bigrackConfig.repoId !== repoId) {
      return {
        success: false,
        message: 'Repo ID mismatch',
        error: `bigrack.json repoId (${bigrackConfig.repoId}) does not match provided repoId (${repoId})`,
      };
    }

    // Update currentProject
    bigrackConfig.currentProject = projectId;

    // Ensure project is in projects array
    if (!bigrackConfig.projects) {
      bigrackConfig.projects = [];
    }

    if (!bigrackConfig.projects.includes(projectId)) {
      bigrackConfig.projects.push(projectId);
    }

    // Write updated config back to file
    const saveResult = saveBigrackConfig(bigrackConfig);
    if (!saveResult.success) {
      return {
        success: false,
        message: 'Failed to write bigrack.json',
        error: saveResult.error || 'Error writing bigrack.json',
      };
    }

    logger.info(
      { projectId, projectName: project.name },
      'Updated bigrack.json with currentProject'
    );

    return {
      success: true,
      projectId: project.id,
      projectName: project.name,
      message: `✅ Project "${project.name}" is now the current project.\n\nProject ID: ${project.id}\nRepo: ${project.repo.name}\nType: ${project.type}\n\nThis project will be used by default in other BigRack tools when projectId is not provided.`,
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to select project');
    return {
      success: false,
      message: 'Failed to select project',
      error: error.message || 'Unknown error',
    };
  }
}
