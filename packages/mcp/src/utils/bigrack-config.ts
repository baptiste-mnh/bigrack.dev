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
import * as path from 'path';
import { daemonLogger } from '../logger';

const logger = daemonLogger.child({ module: 'bigrack-config' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackJson {
  repoId: string;
  name: string;
  description?: string;
  projects?: string[]; // Optional list of project IDs in this repo
  currentProject?: string; // Current selected project ID
  createdAt: string;
}

export interface BigrackConfigResult {
  success: boolean;
  config?: BigrackJson;
  error?: string;
}

export interface ProjectIdResult {
  success: boolean;
  projectId?: string;
  error?: string;
  message?: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the path to bigrack.json in the current working directory
 * @param workspacePath Optional workspace path, defaults to process.cwd()
 */
export function getBigrackJsonPath(workspacePath?: string): string {
  const workspaceDir = workspacePath || process.cwd();
  return path.join(workspaceDir, 'bigrack.json');
}

/**
 * Check if bigrack.json exists in the current directory
 * @param workspacePath Optional workspace path, defaults to process.cwd()
 */
export function bigrackJsonExists(workspacePath?: string): boolean {
  return fs.existsSync(getBigrackJsonPath(workspacePath));
}

/**
 * Read bigrack.json from the current directory
 * @param workspacePath Optional workspace path, defaults to process.cwd()
 */
export function getBigrackConfig(workspacePath?: string): BigrackConfigResult {
  const bigrackJsonPath = getBigrackJsonPath(workspacePath);

  if (!fs.existsSync(bigrackJsonPath)) {
    return {
      success: false,
      error: `No bigrack.json found in current directory (${bigrackJsonPath})`,
    };
  }

  try {
    const content = fs.readFileSync(bigrackJsonPath, 'utf-8');
    const config = JSON.parse(content) as BigrackJson;

    return {
      success: true,
      config,
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to parse bigrack.json');
    return {
      success: false,
      error: `Failed to parse bigrack.json: ${error.message}`,
    };
  }
}

/**
 * Save bigrack.json to the current directory
 * @param config The BigrackJson configuration to save
 * @param workspacePath Optional workspace path, defaults to process.cwd()
 */
export function saveBigrackConfig(
  config: BigrackJson,
  workspacePath?: string
): BigrackConfigResult {
  const bigrackJsonPath = getBigrackJsonPath(workspacePath);

  try {
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(bigrackJsonPath, content, 'utf-8');

    return {
      success: true,
      config,
    };
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to save bigrack.json');
    return {
      success: false,
      error: `Failed to save bigrack.json: ${error.message}`,
    };
  }
}

/**
 * Get projectId from bigrack.json
 *
 * This function handles:
 * - No bigrack.json: returns error
 * - currentProject set: returns it
 * - Multiple projects but no currentProject: returns error asking to select
 * - Single project: auto-selects it and updates bigrack.json
 * - No projects: returns error asking to create a project
 * @param workspacePath Optional workspace path, defaults to process.cwd()
 */
export function getProjectIdFromBigrackJson(workspacePath?: string): ProjectIdResult {
  const configResult = getBigrackConfig(workspacePath);

  if (!configResult.success || !configResult.config) {
    return {
      success: false,
      error: configResult.error,
      message: 'Run "bigrack init" to initialize a project',
    };
  }

  const config = configResult.config;

  // Case 1: currentProject is set
  if (config.currentProject) {
    return {
      success: true,
      projectId: config.currentProject,
    };
  }

  // Case 2: Multiple projects but no currentProject
  if (config.projects && config.projects.length > 1) {
    return {
      success: false,
      error: 'Multiple projects available but no current project set',
      message:
        `Available projects: ${config.projects.join(', ')}\n` +
        'Use "bigrack projects select" or the bigrack_select_pallet MCP tool to select a project',
    };
  }

  // Case 3: Single project - auto-select it
  if (config.projects && config.projects.length === 1) {
    const projectId = config.projects[0];

    // Try to auto-set currentProject in bigrack.json
    try {
      config.currentProject = projectId;
      const saveResult = saveBigrackConfig(config, workspacePath);

      if (saveResult.success) {
        logger.info({ projectId }, 'Auto-set currentProject in bigrack.json');
      } else {
        logger.warn({ err: saveResult.error }, 'Failed to auto-set currentProject');
        // Continue anyway, this is not critical
      }
    } catch (error: any) {
      logger.warn({ err: error }, 'Failed to auto-set currentProject');
      // Continue anyway, this is not critical
    }

    return {
      success: true,
      projectId,
    };
  }

  // Case 4: No projects
  return {
    success: false,
    error: 'No projects found in bigrack.json',
    message:
      'Run "bigrack projects create" or use bigrack_create_pallet MCP tool to create a project',
  };
}

/**
 * Get repoId from bigrack.json
 * @param workspacePath Optional workspace path, defaults to process.cwd()
 */
export function getRepoIdFromBigrackJson(workspacePath?: string): {
  success: boolean;
  repoId?: string;
  error?: string;
} {
  const configResult = getBigrackConfig(workspacePath);

  if (!configResult.success || !configResult.config) {
    return {
      success: false,
      error: configResult.error,
    };
  }

  return {
    success: true,
    repoId: configResult.config.repoId,
  };
}
