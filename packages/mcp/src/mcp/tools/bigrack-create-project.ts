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

import { getPrisma } from '../../storage/prisma';
import { storageLogger } from '../../logger';
import {
  getBigrackConfig,
  saveBigrackConfig,
  getRepoIdFromBigrackJson,
  type BigrackJson,
} from '../../utils/bigrack-config';

export interface BigrackCreatePalletArgs {
  name: string;
  description?: string;
  repoId?: string; // Optional, will use bigrack.json if not provided
  workspacePath?: string; // Optional workspace path, defaults to process.cwd()
  type?: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'spike';
  inheritsFromRepo?: boolean; // Default: true
}

export interface BigrackCreatePalletResult {
  success: boolean;
  projectId?: string;
  projectName?: string;
  message: string;
  error?: string;
}

/**
 * Create a new Project within a Repo (saves to projects table)
 *
 * Terminology: "Project" in code, but database table remains "projects" for compatibility.
 * Projects are used to organize tickets and track progress.
 *
 * This tool:
 * 1. Gets repoId from argument or bigrack.json
 * 2. Verifies repo exists
 * 3. Creates a Project in the database (projects table)
 * 4. Returns the project ID
 */
export async function bigrackCreatePallet(
  args: BigrackCreatePalletArgs
): Promise<BigrackCreatePalletResult> {
  const {
    name,
    description,
    repoId: providedRepoId,
    workspacePath,
    type = 'feature',
    inheritsFromRepo = true,
  } = args;

  storageLogger.info({ name, providedRepoId, workspacePath, type }, 'Creating BigRack project');

  try {
    const prisma = getPrisma();

    // Get repoId from argument or bigrack.json
    let repoId: string;
    let bigrackConfig: BigrackJson | null = null;

    if (providedRepoId) {
      repoId = providedRepoId;
    } else {
      const configResult = getRepoIdFromBigrackJson(workspacePath);
      if (!configResult.success || !configResult.repoId) {
        return {
          success: false,
          message:
            'No bigrack.json found in current directory and no repoId provided. Run bigrack_create_repo first or provide repoId explicitly.',
          error: configResult.error || 'Missing repoId',
        };
      }

      repoId = configResult.repoId;
      const fullConfigResult = getBigrackConfig(workspacePath);
      if (fullConfigResult.success) {
        bigrackConfig = fullConfigResult.config || null;
      }
    }

    // Verify repo exists
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      return {
        success: false,
        message: `Repo not found: ${repoId}`,
        error: `Repo with ID ${repoId} does not exist`,
      };
    }

    // Ensure default user exists (use upsert to handle race conditions)
    const defaultUser = await prisma.user.upsert({
      where: { id: 'default-user' },
      update: {}, // No update needed if user already exists
      create: {
        id: 'default-user',
        username: 'default-user',
        email: null,
      },
    });

    // Create project in database (projects table)
    const project = await prisma.project.create({
      data: {
        repoId,
        name,
        description: description || null,
        type,
        status: 'planned',
        createdBy: defaultUser.id,
        inheritsFromRepo,
      },
    });

    // Update bigrack.json if it exists
    if (bigrackConfig) {
      if (!bigrackConfig.projects) {
        bigrackConfig.projects = [];
      }

      // Check if project already exists (avoid duplicates)
      if (!bigrackConfig.projects.includes(project.id)) {
        bigrackConfig.projects.push(project.id);

        const saveResult = saveBigrackConfig(bigrackConfig, workspacePath);
        if (saveResult.success) {
          storageLogger.info({ projectId: project.id }, 'Updated bigrack.json with new project');
        } else {
          storageLogger.warn({ err: saveResult.error }, 'Failed to update bigrack.json');
        }
      }
    }

    storageLogger.info({ projectId: project.id, name, repoId }, 'Project created successfully');

    return {
      success: true,
      projectId: project.id,
      projectName: project.name,
      message: `✅ Project "${name}" created successfully!\n\nProject ID: ${project.id}\nRepo: ${repo.name}\nType: ${type}\n\nYou can now use bigrack_store_tickets to add tickets to this project.`,
    };
  } catch (error) {
    storageLogger.error({ err: error, name, providedRepoId }, 'Failed to create project');

    return {
      success: false,
      message: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
