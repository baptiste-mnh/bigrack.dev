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
import { prismaClient as prisma } from '../../storage';
import { daemonLogger } from '../../logger';
import { getRepoIdFromBigrackJson } from '../../utils/bigrack-config';

const logger = daemonLogger.child({ module: 'bigrack-get-repo-state' });

// Type helpers inferred from Prisma queries
type BusinessRule = Awaited<ReturnType<typeof prisma.businessRule.findMany>>[0];
type GlossaryEntry = Awaited<ReturnType<typeof prisma.glossaryEntry.findMany>>[0];
type ArchitecturePattern = Awaited<ReturnType<typeof prisma.architecturePattern.findMany>>[0];
type TeamConvention = Awaited<ReturnType<typeof prisma.teamConvention.findMany>>[0];
type Document = Awaited<ReturnType<typeof prisma.document.findMany>>[0];
type Project = Awaited<ReturnType<typeof prisma.project.findMany>>[0];

// ============================================================================
// Types
// ============================================================================

export interface BigrackGetRackStateArgs {
  repoId?: string; // Optional, will use bigrack.json if not provided
}

interface ContextElement {
  id: string;
  type: 'business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document';
  title: string;
  category?: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface BigrackGetRackStateResult {
  success: boolean;
  message: string;
  state?: {
    rack: {
      // Renamed from 'repo' for clarity
      id: string;
      name: string;
      description?: string;
      createdAt: string;
      updatedAt: string;
    };
    pallets: {
      // Renamed from 'projects' for clarity
      total: number;
      list: ProjectSummary[];
    };
    context: {
      total: number;
      byType: {
        business_rule: number;
        glossary_entry: number;
        pattern: number;
        convention: number;
        document: number;
      };
      list: ContextElement[];
    };
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackGetRackState(
  args: BigrackGetRackStateArgs
): Promise<BigrackGetRackStateResult> {
  const { repoId: providedRepoId } = args;

  logger.info({ providedRepoId }, 'Getting rack state');

  try {
    // Get repoId (rack ID) from argument or bigrack.json
    let repoId: string;

    if (providedRepoId) {
      repoId = providedRepoId;
    } else {
      const repoIdResult = getRepoIdFromBigrackJson();
      if (!repoIdResult.success || !repoIdResult.repoId) {
        return {
          success: false,
          message: 'Rack ID not provided and no bigrack.json found',
          error:
            repoIdResult.error ||
            'Rack ID is required. Either provide it as an argument or ensure a bigrack.json file exists in the workspace root. Run bigrack_create_repo first.',
        };
      }
      repoId = repoIdResult.repoId;
    }

    // Step 1: Get rack (repos table)
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      const cwd = process.cwd();
      const bigrackJsonPath = path.join(cwd, 'bigrack.json');
      const bigrackJsonHint = fs.existsSync(bigrackJsonPath)
        ? `Check the rack ID in ${bigrackJsonPath}`
        : `You can find the rack ID in the bigrack.json file at the workspace root (e.g., ${path.join(cwd, 'bigrack.json')}).`;

      return {
        success: false,
        message: 'Rack not found',
        error: `Rack with ID ${repoId} does not exist. ${bigrackJsonHint}`,
      };
    }

    // Step 2: Get all pallets in the rack (projects table)
    const projects = await prisma.project.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
    });

    logger.debug({ projectCount: projects.length }, 'Pallets loaded');

    // Format projects
    const projectSummaries: ProjectSummary[] = projects.map((project: Project) => ({
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      type: project.type,
      status: project.status,
      progress: project.progress,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }));

    // Step 3: Get all repo-level context elements
    const [businessRules, glossaryEntries, patterns, conventions, documents] = await Promise.all([
      prisma.businessRule.findMany({ where: { repoId } }),
      prisma.glossaryEntry.findMany({ where: { repoId } }),
      prisma.architecturePattern.findMany({ where: { repoId } }),
      prisma.teamConvention.findMany({ where: { repoId } }),
      prisma.document.findMany({ where: { repoId } }),
    ]);

    // Format context elements
    const contextElements: ContextElement[] = [
      ...businessRules.map((br: BusinessRule) => ({
        id: br.id,
        type: 'business_rule' as const,
        title: br.name,
        category: br.category || undefined,
        priority: br.priority || undefined,
        createdAt: br.createdAt.toISOString(),
        updatedAt: br.updatedAt.toISOString(),
      })),
      ...glossaryEntries.map((ge: GlossaryEntry) => ({
        id: ge.id,
        type: 'glossary_entry' as const,
        title: ge.term,
        category: ge.category || undefined,
        createdAt: ge.createdAt.toISOString(),
        updatedAt: ge.updatedAt.toISOString(),
      })),
      ...patterns.map((p: ArchitecturePattern) => ({
        id: p.id,
        type: 'pattern' as const,
        title: p.name,
        category: p.category || undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      ...conventions.map((c: TeamConvention) => ({
        id: c.id,
        type: 'convention' as const,
        title: c.category,
        category: c.category,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      ...documents.map((d: Document) => ({
        id: d.id,
        type: 'document' as const,
        title: d.title,
        category: d.type || undefined,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    ];

    // Count context by type
    const byType = {
      business_rule: businessRules.length,
      glossary_entry: glossaryEntries.length,
      pattern: patterns.length,
      convention: conventions.length,
      document: documents.length,
    };

    // Build result
    const result: BigrackGetRackStateResult = {
      success: true,
      message: `Rack state retrieved: ${projects.length} pallets, ${contextElements.length} context elements`,
      state: {
        rack: {
          id: repo.id,
          name: repo.name,
          description: repo.description || undefined,
          createdAt: repo.createdAt.toISOString(),
          updatedAt: repo.updatedAt.toISOString(),
        },
        pallets: {
          total: projects.length,
          list: projectSummaries,
        },
        context: {
          total: contextElements.length,
          byType,
          list: contextElements,
        },
      },
    };

    logger.info(
      { success: true, projectCount: projects.length, contextCount: contextElements.length },
      'Rack state retrieved'
    );
    return result;
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to get rack state');
    return {
      success: false,
      message: 'Failed to get rack state',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
