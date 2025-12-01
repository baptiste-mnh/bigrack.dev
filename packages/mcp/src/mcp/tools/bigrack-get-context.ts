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

const logger = daemonLogger.child({ module: 'bigrack-get-context' });

// ============================================================================
// Types
// ============================================================================

export interface BigrackGetContextArgs {
  type?: ('business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document')[]; // Optional - filter by context type(s)
  repoId?: string; // Optional - filter by repo ID
  projectId?: string; // Optional - filter by project ID (for project-specific context)
  category?: string[]; // Optional - filter by category
  priority?: string[]; // Optional - filter by priority (for business rules)
  offset?: number; // Optional - pagination offset (default: 0)
  limit?: number; // Optional - results per page (default: 10, max: 100)
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'title' | 'term' | 'category'; // Optional - sort field (default: 'createdAt')
  orderDirection?: 'asc' | 'desc'; // Optional - sort direction (default: 'desc')
}

interface ContextItem {
  id: string;
  type: 'business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document';
  name: string; // name for business_rule/pattern, term for glossary_entry, category for convention, title for document
  category?: string;
  priority?: string; // Only for business_rule
  repoId: string;
  projectId?: string; // Only for project-specific context
  createdAt: string;
  updatedAt: string;
}

export interface BigrackGetContextResult {
  success: boolean;
  message: string;
  results?: {
    total: number; // Total matching results (before pagination)
    offset: number;
    limit: number;
    hasMore: boolean; // true if more results available
    items: ContextItem[];
  };
  error?: string;
}

// ============================================================================
// Main Function
// ============================================================================

export async function bigrackGetContext(
  args: BigrackGetContextArgs
): Promise<BigrackGetContextResult> {
  const {
    type,
    repoId,
    projectId,
    category,
    priority,
    offset = 0,
    limit = 10,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = args;

  logger.info(
    { type, repoId, projectId, category, priority, offset, limit, orderBy, orderDirection },
    'Getting context items'
  );

  try {
    // Validate inputs
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validOffset = Math.max(0, offset);

    const allItems: ContextItem[] = [];

    // Get repo-level context items
    if (!projectId || (type && !type.includes('document'))) {
      // Business Rules
      if (!type || type.includes('business_rule')) {
        const where: any = {};
        if (repoId) where.repoId = repoId;
        if (category && category.length > 0) where.category = { in: category };
        if (priority && priority.length > 0) where.priority = { in: priority };

        const businessRules = await prisma.businessRule.findMany({
          where,
          select: {
            id: true,
            repoId: true,
            name: true,
            category: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        allItems.push(
          ...businessRules.map((rule) => ({
            id: rule.id,
            type: 'business_rule' as const,
            name: rule.name,
            category: rule.category || undefined,
            priority: rule.priority || undefined,
            repoId: rule.repoId,
            createdAt: rule.createdAt.toISOString(),
            updatedAt: rule.updatedAt.toISOString(),
          }))
        );
      }

      // Glossary Entries
      if (!type || type.includes('glossary_entry')) {
        const where: any = {};
        if (repoId) where.repoId = repoId;
        if (category && category.length > 0) where.category = { in: category };

        const glossaryEntries = await prisma.glossaryEntry.findMany({
          where,
          select: {
            id: true,
            repoId: true,
            term: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        allItems.push(
          ...glossaryEntries.map((entry) => ({
            id: entry.id,
            type: 'glossary_entry' as const,
            name: entry.term,
            category: entry.category || undefined,
            repoId: entry.repoId,
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
          }))
        );
      }

      // Architecture Patterns
      if (!type || type.includes('pattern')) {
        const where: any = {};
        if (repoId) where.repoId = repoId;
        if (category && category.length > 0) where.category = { in: category };

        const patterns = await prisma.architecturePattern.findMany({
          where,
          select: {
            id: true,
            repoId: true,
            name: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        allItems.push(
          ...patterns.map((pattern) => ({
            id: pattern.id,
            type: 'pattern' as const,
            name: pattern.name,
            category: pattern.category || undefined,
            repoId: pattern.repoId,
            createdAt: pattern.createdAt.toISOString(),
            updatedAt: pattern.updatedAt.toISOString(),
          }))
        );
      }

      // Team Conventions
      if (!type || type.includes('convention')) {
        const where: any = {};
        if (repoId) where.repoId = repoId;
        if (category && category.length > 0) where.category = { in: category };

        const conventions = await prisma.teamConvention.findMany({
          where,
          select: {
            id: true,
            repoId: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        allItems.push(
          ...conventions.map((convention) => ({
            id: convention.id,
            type: 'convention' as const,
            name: convention.category,
            category: convention.category,
            repoId: convention.repoId,
            createdAt: convention.createdAt.toISOString(),
            updatedAt: convention.updatedAt.toISOString(),
          }))
        );
      }

      // Documents
      if (!type || type.includes('document')) {
        const where: any = {};
        if (repoId) where.repoId = repoId;

        const documents = await prisma.document.findMany({
          where,
          select: {
            id: true,
            repoId: true,
            title: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        allItems.push(
          ...documents.map((doc) => ({
            id: doc.id,
            type: 'document' as const,
            name: doc.title,
            category: doc.type !== 'general' ? doc.type : undefined,
            repoId: doc.repoId,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
          }))
        );
      }
    }

    // Get project-specific context items
    if (projectId) {
      const where: any = { projectId };
      if (category && category.length > 0) {
        // For project context, category filtering is done on contentType
        // We'll filter after fetching
      }

      const projectContexts = await prisma.projectContext.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          contentType: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Filter by category if needed (category maps to contentType for project contexts)
      const filteredProjectContexts =
        category && category.length > 0
          ? projectContexts.filter((pc) => category.includes(pc.contentType))
          : projectContexts;

      // Get project to find repoId
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { repoId: true },
      });

      allItems.push(
        ...filteredProjectContexts.map((pc) => ({
          id: pc.id,
          type: 'document' as const, // ProjectContext is treated as document type
          name: pc.contentType,
          category: pc.contentType,
          repoId: project?.repoId || '',
          projectId: pc.projectId,
          createdAt: pc.createdAt.toISOString(),
          updatedAt: pc.updatedAt.toISOString(),
        }))
      );
    }

    // Apply sorting
    allItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'name':
        case 'title':
        case 'term':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
      }

      if (orderDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Store total before pagination
    const total = allItems.length;

    // Apply pagination
    const paginatedItems = allItems.slice(validOffset, validOffset + validLimit);
    const hasMore = validOffset + validLimit < total;

    const result: BigrackGetContextResult = {
      success: true,
      message: `Found ${paginatedItems.length} context item(s)${total > paginatedItems.length ? ` (${total} total)` : ''}`,
      results: {
        total,
        offset: validOffset,
        limit: validLimit,
        hasMore,
        items: paginatedItems,
      },
    };

    logger.info(
      { success: true, totalResults: total, returnedResults: paginatedItems.length },
      'Get context completed'
    );

    return result;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to get context');
    return {
      success: false,
      message: 'Failed to get context',
      error: error.message || 'Unknown error',
    };
  }
}
