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
import { searchByText } from '../../search';
import { daemonLogger } from '../../logger';

const logger = daemonLogger.child({ module: 'bigrack-decompose-feature' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackDecomposeFeatureArgs {
  projectId: string;
  featureDescription: string;
  acceptanceCriteria?: string[];
  technicalConstraints?: string[];
}

export interface BigrackDecomposeFeatureResult {
  success: boolean;
  message: string;
  context?: {
    projectId: string;
    projectName: string;
    repoName: string;
    repoId: string;
    featureDescription: string;
    acceptanceCriteria?: string[];
    technicalConstraints?: string[];
    availableContext: {
      businessRules: string[]; // Just names/titles
      patterns: string[]; // Just names/titles
      conventions: string[]; // Just summaries
      totalCount: number;
    };
    availableTools: {
      queryContext: {
        name: 'bigrack_query_context';
        description: string;
        usage: string;
      };
      storeTasks: {
        name: 'bigrack_store_tasks';
        description: string;
        usage: string;
      };
    };
    decompositionGuidelines: string[];
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackDecomposeFeature(
  args: BigrackDecomposeFeatureArgs
): Promise<BigrackDecomposeFeatureResult> {
  const { projectId, featureDescription, acceptanceCriteria, technicalConstraints } = args;

  logger.info({ projectId, featureDescription }, 'Listing decomposition context');

  try {
    // Step 1: Validate project exists
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
        error: `Project with ID ${projectId} does not exist`,
      };
    }

    logger.debug({ project: project.name, repo: project.repo.name }, 'Project validated');

    // Step 2: Query RAG for relevant context (just get titles/names)
    const contextListing = await listAvailableContext(
      project.repoId,
      projectId,
      featureDescription,
      acceptanceCriteria
    );

    logger.debug(
      {
        businessRules: contextListing.businessRules.length,
        patterns: contextListing.patterns.length,
        conventions: contextListing.conventions.length,
      },
      'Context listing prepared'
    );

    // Step 3: Build result with context listing and tool names
    const result: BigrackDecomposeFeatureResult = {
      success: true,
      message: `Found ${contextListing.totalCount} relevant context items. Use bigrack_query_context to get details.`,
      context: {
        projectId,
        projectName: project.name,
        repoName: project.repo.name,
        repoId: project.repoId,
        featureDescription,
        acceptanceCriteria,
        technicalConstraints,
        availableContext: contextListing,
        availableTools: {
          queryContext: {
            name: 'bigrack_query_context',
            description: 'Query specific business rules, patterns, or conventions for details',
            usage:
              'Use this tool to get full details about any business rule, pattern, or convention that looks relevant',
          },
          storeTasks: {
            name: 'bigrack_store_tasks',
            description: 'Store the decomposed tasks with dependencies in the database',
            usage: 'After decomposing the feature into atomic tasks, use this tool to save them',
          },
        },
        decompositionGuidelines: [
          '1. Review the available context items listed above',
          '2. Use bigrack_query_context to get details on relevant business rules/patterns',
          '3. Break down the feature into atomic tasks (each < 4 hours)',
          '4. Define clear dependencies between tasks (DAG structure)',
          '5. Include validation criteria for each task',
          '6. Consider business rules and patterns when creating tasks',
          '7. Group tasks by type: setup → implementation → testing → documentation',
          '8. Use bigrack_store_tasks to save the decomposed tasks',
        ],
      },
    };

    logger.info(
      { success: true, totalContext: contextListing.totalCount },
      'Context listing prepared'
    );
    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to list decomposition context');
    return {
      success: false,
      message: 'Failed to list decomposition context',
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ContextListing {
  businessRules: string[];
  patterns: string[];
  conventions: string[];
  totalCount: number;
}

async function listAvailableContext(
  repoId: string,
  projectId: string,
  featureDescription: string,
  acceptanceCriteria?: string[]
): Promise<ContextListing> {
  const query = `${featureDescription} ${acceptanceCriteria?.join(' ') || ''}`;

  const ragResults = await searchByText(query, {
    repoId,
    projectId,
    entityTypes: ['business_rule', 'pattern', 'convention'],
    topK: 20, // Get more results since we're just listing names
    minSimilarity: 0.4, // Lower threshold to show more options
  });

  const businessRules: string[] = [];
  const patterns: string[] = [];
  const conventions: string[] = [];

  for (const result of ragResults) {
    const similarity = Math.round(result.similarity * 100);

    if (result.entityType === 'business_rule' && result.data) {
      businessRules.push(`${result.data.name} (${similarity}% match)`);
    } else if (result.entityType === 'pattern' && result.data) {
      patterns.push(`${result.data.name} (${similarity}% match)`);
    } else if (result.entityType === 'convention' && result.data) {
      const preview =
        result.data.rule.length > 60 ? result.data.rule.substring(0, 60) + '...' : result.data.rule;
      conventions.push(`${preview} (${similarity}% match)`);
    }
  }

  return {
    businessRules,
    patterns,
    conventions,
    totalCount: businessRules.length + patterns.length + conventions.length,
  };
}
