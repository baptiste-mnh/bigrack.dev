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
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../storage/prisma';
import { storageLogger } from '../../logger';
import type { BigrackJson } from '../../utils/bigrack-config';

export interface BigrackCreateRackArgs {
  projectName?: string;
  description?: string;
  workspacePath?: string; // Optional workspace path, defaults to process.cwd()
}

export interface BigrackCreateRackResult {
  success: boolean;
  repoId?: string;
  projectName?: string;
  message: string;
}

/**
 * Create a new BigRack repo in the current directory (saves to repos table)
 *
 * Terminology: "Repo" in code, but database table remains "repos" for compatibility.
 *
 * This tool:
 * 1. Checks if bigrack.json already exists
 * 2. Detects repo context (folder name, Git remote)
 * 3. Creates repo in database (repos table)
 * 4. Creates bigrack.json file
 */
export async function bigrackCreateRack(
  args: BigrackCreateRackArgs
): Promise<BigrackCreateRackResult> {
  const { projectName: providedName, description, workspacePath } = args;

  storageLogger.info({ providedName, description, workspacePath }, 'Creating BigRack repo');

  try {
    // Use provided workspacePath or fall back to process.cwd()
    const workspaceDir = workspacePath || process.cwd();
    const bigrackJsonPath = path.join(workspaceDir, 'bigrack.json');

    // Check if bigrack.json already exists
    if (fs.existsSync(bigrackJsonPath)) {
      const existingConfig = JSON.parse(fs.readFileSync(bigrackJsonPath, 'utf-8')) as BigrackJson;

      // Verify if the repo exists in the database
      const prisma = getPrisma();
      const existingRepo = await prisma.repo.findUnique({
        where: { id: existingConfig.repoId },
      });

      if (existingRepo) {
        return {
          success: false,
          message: `Repo already initialized: "${existingConfig.name}" (Repo ID: ${existingConfig.repoId}). Delete bigrack.json to reinitialize.`,
        };
      }

      // Repo doesn't exist in DB, log warning and continue to recreate it
      storageLogger.warn(
        { repoId: existingConfig.repoId },
        'bigrack.json exists but repo not found in database, recreating...'
      );
    }

    // Detect project context
    const folderName = path.basename(workspaceDir);
    const projectName = providedName || folderName;

    // Detect Git remote (optional)
    let gitRemote: string | undefined;
    try {
      const gitDir = path.join(workspaceDir, '.git');
      if (fs.existsSync(gitDir)) {
        const configPath = path.join(gitDir, 'config');
        if (fs.existsSync(configPath)) {
          const gitConfig = fs.readFileSync(configPath, 'utf-8');
          const remoteMatch = gitConfig.match(/url = (.+)/);
          if (remoteMatch) {
            gitRemote = remoteMatch[1].trim();
          }
        }
      }
    } catch {
      // Ignore errors, Git detection is optional
    }

    const finalDescription = description || gitRemote || '';

    // Create repo in database (repos table)
    const prisma = getPrisma();
    const repoId = uuidv4();

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

    const repo = await prisma.repo.create({
      data: {
        id: repoId,
        name: projectName,
        description: finalDescription || null,
        ownerId: defaultUser.id,
      },
    });

    // Create bigrack.json
    const bigrackConfig: BigrackJson = {
      repoId: repo.id,
      name: projectName,
      description: finalDescription,
      createdAt: new Date().toISOString(),
    };

    // Write bigrack.json directly to the workspace directory
    try {
      const content = JSON.stringify(bigrackConfig, null, 2);
      fs.writeFileSync(bigrackJsonPath, content, 'utf-8');
    } catch (error: unknown) {
      return {
        success: false,
        message: `Failed to create bigrack.json: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Optionally add to .gitignore
    const gitignorePath = path.join(workspaceDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignoreContent.includes('bigrack.json')) {
        fs.appendFileSync(gitignorePath, '\n# BigRack\nbigrack.json\n');
        storageLogger.info('Added bigrack.json to .gitignore');
      }
    }

    storageLogger.info({ repoId: repo.id, projectName, workspaceDir }, 'Repo created successfully');

    return {
      success: true,
      repoId: repo.id,
      projectName,
      message: `✅ Repo "${projectName}" created successfully!\n\nRepo ID: ${repo.id}\nFile created: bigrack.json\n\nYou can now use other BigRack MCP tools to create projects in this repo.`,
    };
  } catch (error) {
    storageLogger.error({ err: error, providedName, workspacePath }, 'Failed to create repo');

    return {
      success: false,
      message: `Failed to create repo: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
