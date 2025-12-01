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

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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

export function RepoContext() {
  const { repoId, projectId } = useParams<{ repoId: string; projectId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const loadContext = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedItem(null);
      const data = await apiClient.get<ContextItem[]>(`/context/${id}`);

      // If we're on a project page, filter to only show items with matching projectId
      if (projectId) {
        const filteredData = data.filter((item) => item.projectId === projectId);
        setContextItems(filteredData);
        // Auto-select first item if available
        if (filteredData.length > 0) {
          setSelectedItem(filteredData[0]);
        }
      } else {
        setContextItems(data);
        // Auto-select first item if available
        if (data.length > 0) {
          setSelectedItem(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load context');
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

  const filteredItems = useMemo(() => {
    return contextItems.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const title = (item.title || item.name || item.term || '').toLowerCase();
      const description = (item.description || item.definition || item.content || '').toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }, [contextItems, searchQuery]);

  useEffect(() => {
    if (repoId) {
      loadContext(projectId || repoId);
    }
  }, [repoId, projectId]);

  // Handle item selection from URL parameter
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && contextItems.length > 0) {
      const item = contextItems.find((i) => i.id === itemId);
      if (item) {
        setSelectedItem(item);
      }
    }
  }, [searchParams, contextItems]);

  // Update selected item when filter changes - select first filtered item if current selection is not in filtered list
  useEffect(() => {
    if (filteredItems.length > 0) {
      const isSelectedInFiltered =
        selectedItem && filteredItems.some((item) => item.id === selectedItem.id);
      if (!isSelectedInFiltered) {
        setSelectedItem(filteredItems[0]);
      }
    } else if (filteredItems.length === 0 && selectedItem) {
      setSelectedItem(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems]);

  // Reset mobile view state when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, always show both panels
        setShowMobileList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    // Check on mount
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mobile, switch to content view when item is selected
  const handleItemSelect = (item: ContextItem) => {
    setSelectedItem(item);
    // On mobile, hide list and show content
    if (window.innerWidth < 768) {
      setShowMobileList(false);
    }
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    setShowMobileList(true);
  };

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.entityType]) {
        acc[item.entityType] = [];
      }
      acc[item.entityType].push(item);
      return acc;
    },
    {} as Record<string, ContextItem[]>
  );

  // Get markdown content to display
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/70">Loading context...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-300">Error: {error}</p>
        <button
          onClick={() => repoId && loadContext(repoId)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render list view
  const renderListView = () => (
    <div className="w-full md:w-80 md:border-r border-border flex flex-col h-full bg-card">
      {/* Search bar */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <input
          type="text"
          placeholder="Search context..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0 thin-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <p>{searchQuery ? 'No context items match your search.' : 'No context items found.'}</p>
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedItems).map(([type, items]) => (
              <div key={type} className="mb-4">
                <h3 className="text-xs font-semibold mb-2 px-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <span>{getTypeIcon(type)}</span>
                  {type.replace('_', ' ')} ({items.length})
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className={`px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                        selectedItem?.id === item.id
                          ? 'bg-primary/10 border border-primary/40 text-primary'
                          : 'hover:bg-muted border border-transparent text-card-foreground'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs">{getTypeIcon(item.entityType)}</span>
                            <h4 className="font-medium truncate">
                              {item.title || item.name || item.term || 'Untitled'}
                            </h4>
                          </div>
                          {(item.description || item.definition) && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description || item.definition}
                            </p>
                          )}
                          {item.category && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Category: {item.category}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Render content view
  const renderContentView = () => (
    <div className="flex-1 bg-card min-h-0 h-full flex flex-col min-w-0 overflow-x-hidden">
      {selectedItem ? (
        <>
          <div className="sticky top-0 bg-card border-b border-border px-4 md:px-6 py-4 z-10 flex-shrink-0 min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 min-w-0 w-full">
              {/* Back button on mobile */}
              <button
                onClick={handleBackToList}
                className="md:hidden text-card-foreground/70 hover:text-card-foreground mr-2 flex-shrink-0"
                aria-label="Back to list"
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
              <span className="text-xl flex-shrink-0">{getTypeIcon(selectedItem.entityType)}</span>
              <div className="flex-1 min-w-0 w-0 overflow-hidden" style={{ maxWidth: '100%' }}>
                <h2 className="text-lg md:text-xl font-bold truncate text-card-foreground block overflow-hidden text-ellipsis whitespace-nowrap">
                  {selectedItem.title || selectedItem.name || selectedItem.term || 'Untitled'}
                </h2>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 whitespace-nowrap ${getTypeColor(selectedItem.entityType)}`}
              >
                {selectedItem.entityType.replace('_', ' ')}
              </span>
              {/* Fullscreen button */}
              <button
                onClick={() => {
                  if (repoId && selectedItem) {
                    navigate(`/repos/${repoId}/context/${selectedItem.id}`);
                  }
                }}
                className="p-1.5 text-card-foreground/70 hover:text-card-foreground hover:bg-muted rounded transition-colors flex-shrink-0"
                aria-label="Open in fullscreen"
                title="Open in fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
              {/* Copy to clipboard button */}
              <button
                onClick={() => copyToClipboard(getMarkdownContent(selectedItem))}
                className="p-1.5 text-card-foreground/70 hover:text-card-foreground hover:bg-muted rounded transition-colors flex-shrink-0"
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
              <ReactMarkdown>{getMarkdownContent(selectedItem)}</ReactMarkdown>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center px-4">
            <p className="text-lg mb-2">Select a context item to view its content</p>
            <p className="text-sm">Choose an item from the list</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-card h-full max-w-full w-full min-w-0 overflow-x-hidden">
      {/* Desktop: always show list, Mobile: show list when showMobileList is true */}
      <div className={`${showMobileList ? 'flex' : 'hidden'} md:flex flex-shrink-0`}>
        {renderListView()}
      </div>

      {/* Desktop: always show content, Mobile: show content when showMobileList is false */}
      <div
        className={`${showMobileList ? 'hidden' : 'flex'} md:flex flex-1 min-h-0 min-w-0 overflow-x-hidden`}
      >
        {renderContentView()}
      </div>
    </div>
  );
}
