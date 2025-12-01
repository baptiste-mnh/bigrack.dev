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

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../lib/api-client';

interface ContextItem {
  id: string;
  entityType: 'business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document';
  name?: string;
  title?: string;
  term?: string;
  description?: string;
  definition?: string;
  content?: string;
  category?: string;
  priority?: string;
  rule?: string;
  projectId?: string;
}

export function ContextDetail() {
  const { repoId, contextId } = useParams<{ repoId: string; contextId: string }>();
  const navigate = useNavigate();
  const [contextItem, setContextItem] = useState<ContextItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're coming from a project context by looking at the referrer or trying projectId first
  useEffect(() => {
    if (repoId && contextId) {
      loadContextItem(repoId, contextId);
    }
  }, [repoId, contextId]);

  const loadContextItem = async (repoId: string, contextId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from project context first if the item has a projectId
      // We'll try both repo and project contexts
      let item: ContextItem | undefined;

      // First, try loading from repo context
      const repoData = await apiClient.get<ContextItem[]>(`/context/${repoId}`);
      item = repoData.find((item) => item.id === contextId);

      // If not found and item has a projectId, try loading from project context
      if (!item) {
        // Try to find the projectId from the item itself by checking all repo items
        const itemWithProjectId = repoData.find((item) => item.id === contextId && item.projectId);
        if (itemWithProjectId?.projectId) {
          const projectData = await apiClient.get<ContextItem[]>(
            `/context/${itemWithProjectId.projectId}`
          );
          item = projectData.find((item) => item.id === contextId);
        }
      }

      if (item) {
        setContextItem(item);
      } else {
        setError('Context item not found');
      }
    } catch (err) {
      console.error('Failed to load context item:', err);
      setError(err instanceof Error ? err.message : 'Failed to load context item');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'business_rule':
        return '📋';
      case 'glossary_entry':
        return '📖';
      case 'pattern':
        return '🏗️';
      case 'convention':
        return '⚙️';
      case 'document':
        return '📄';
      default:
        return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'business_rule':
        return 'bg-purple-500/10 text-purple-400 dark:bg-purple-500/20 dark:text-purple-300';
      case 'glossary_entry':
        return 'bg-primary/10 text-primary';
      case 'pattern':
        return 'bg-green-500/10 text-green-400 dark:bg-green-500/20 dark:text-green-300';
      case 'convention':
        return 'bg-yellow-500/10 text-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-300';
      case 'document':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMarkdownContent = (item: ContextItem): string => {
    const parts: string[] = [];

    // Title
    const title = item.title || item.name || item.term || 'Untitled';
    parts.push(`# ${title}\n`);

    // Metadata
    if (item.category || item.priority) {
      parts.push('---\n');
      if (item.category) parts.push(`**Category:** ${item.category}\n`);
      if (item.priority) parts.push(`**Priority:** ${item.priority}\n`);
      parts.push('---\n\n');
    }

    // Content based on type
    if (item.content) {
      parts.push(item.content);
    } else if (item.description) {
      parts.push(item.description);
    } else if (item.definition) {
      parts.push(`## Definition\n\n${item.definition}`);
    } else if (item.rule) {
      parts.push(`## Rule\n\n${item.rule}`);
    }

    return parts.join('\n');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/70">Loading context item...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-300">Error: {error}</p>
        <button
          onClick={() => repoId && contextId && loadContextItem(repoId, contextId)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!contextItem) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/70">Context item not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card min-h-0">
      <div className="sticky top-0 bg-card border-b border-border px-4 md:px-6 py-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/repos/${repoId}?tab=context`)}
            className="text-card-foreground/70 hover:text-card-foreground mr-2"
            aria-label="Back to context"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-xl">{getTypeIcon(contextItem.entityType)}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold truncate text-card-foreground">
              {contextItem.title || contextItem.name || contextItem.term || 'Untitled'}
            </h2>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getTypeColor(contextItem.entityType)}`}
          >
            {contextItem.entityType.replace('_', ' ')}
          </span>
          {/* Copy to clipboard button */}
          <button
            onClick={() => copyToClipboard(getMarkdownContent(contextItem))}
            className="p-1.5 text-card-foreground/70 hover:text-card-foreground hover:bg-muted rounded transition-colors"
            aria-label="Copy to clipboard"
            title="Copy to clipboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0 thin-scrollbar">
        <div className="markdown-content text-card-foreground max-w-full break-words">
          <ReactMarkdown>{getMarkdownContent(contextItem)}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
