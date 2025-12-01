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
import {
  getRepoIdFromBigrackJson,
  getBigrackConfig,
  saveBigrackConfig,
} from '../../utils/bigrack-config';

const logger = daemonLogger.child({ module: 'bigrack-update-repo' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackUpdateRepoArgs {
  repoId?: string; // Optional, will use bigrack.json if not provided
  workspacePath?: string; // Optional workspace path, defaults to process.cwd()
  name?: string;
  description?: string;
  visibility?: 'private' | 'team';
  gitRepository?: string;
  gitDefaultBranch?: string;
}

export interface BigrackUpdateRepoResult {
  success: boolean;
  message: string;
  repo?: {
    id: string;
    name: string;
    description?: string;
    visibility: string;
    gitRepository?: string;
    gitDefaultBranch?: string;
    updatedAt: string;
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Update a BigRack repo
 *
 * This tool:
 * 1. Gets repoId from argument or bigrack.json
 * 2. Verifies repo exists
 * 3. Updates repo in database
 * 4. Optionally updates bigrack.json if name or description changed
 */
export async function bigrackUpdateRepo(
  args: BigrackUpdateRepoArgs
): Promise<BigrackUpdateRepoResult> {
  const {
    repoId: providedRepoId,
    workspacePath,
    name,
    description,
    visibility,
    gitRepository,
    gitDefaultBranch,
  } = args;

  logger.info({ providedRepoId, workspacePath, name, description }, 'Updating repo');

  try {
    // Get repoId from argument or bigrack.json
    let repoId: string;
    let bigrackConfig = null;

    if (providedRepoId) {
      repoId = providedRepoId;
    } else {
      const repoIdResult = getRepoIdFromBigrackJson(workspacePath);
      if (!repoIdResult.success || !repoIdResult.repoId) {
        return {
          success: false,
          message: 'Repo ID not provided and no bigrack.json found',
          error:
            repoIdResult.error ||
            'Missing repoId. Either provide it as an argument or ensure a bigrack.json file exists in the workspace root.',
        };
      }
      repoId = repoIdResult.repoId;

      // Get full config to potentially update it
      const configResult = getBigrackConfig(workspacePath);
      if (configResult.success && configResult.config) {
        bigrackConfig = configResult.config;
      }
    }

    // Verify repo exists
    const existingRepo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!existingRepo) {
      return {
        success: false,
        message: 'Repo not found',
        error: `Repo with ID ${repoId} does not exist. Check the repo ID in bigrack.json.`,
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

    if (visibility !== undefined) {
      updateData.visibility = visibility;
    }

    if (gitRepository !== undefined) {
      updateData.gitRepository = gitRepository || null;
    }

    if (gitDefaultBranch !== undefined) {
      updateData.gitDefaultBranch = gitDefaultBranch || null;
    }

    // Check if there are any updates
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: 'No fields to update',
        error:
          'At least one field (name, description, visibility, gitRepository, gitDefaultBranch) must be provided.',
      };
    }

    // Update repo in database
    const updatedRepo = await prisma.repo.update({
      where: { id: repoId },
      data: updateData,
    });

    // Update bigrack.json if name or description changed and config exists
    if (bigrackConfig && (name !== undefined || description !== undefined)) {
      if (name !== undefined) {
        bigrackConfig.name = name;
      }
      if (description !== undefined) {
        bigrackConfig.description = description;
      }

      const saveResult = saveBigrackConfig(bigrackConfig, workspacePath);
      if (saveResult.success) {
        logger.info({ repoId }, 'Updated bigrack.json with repo changes');
      } else {
        logger.warn({ err: saveResult.error }, 'Failed to update bigrack.json');
      }
    }

    logger.info({ repoId, updatedFields: Object.keys(updateData) }, 'Repo updated successfully');

    return {
      success: true,
      message: `✅ Repo "${updatedRepo.name}" updated successfully!`,
      repo: {
        id: updatedRepo.id,
        name: updatedRepo.name,
        description: updatedRepo.description || undefined,
        visibility: updatedRepo.visibility,
        gitRepository: updatedRepo.gitRepository || undefined,
        gitDefaultBranch: updatedRepo.gitDefaultBranch || undefined,
        updatedAt: updatedRepo.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to update repo');
    return {
      success: false,
      message: 'Failed to update repo',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
