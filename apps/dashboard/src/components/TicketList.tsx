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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  useToast,
} from '@bigrack/shared';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Plus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiClient } from '../lib/api-client';
import { RepoContext } from './RepoContext';
import { ScrollReveal } from './ScrollReveal';
import { TicketDetail } from './TicketDetail';

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type?: string;
  estimatedTime?: string;
  assignee?: string;
  gitBranch?: string;
  tags?: string[];
  validationCriteria?: string[];
  objectives?: string[];
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  content: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'list' | 'kanban';
type SortOption = 'priority' | 'status' | 'updated' | 'created' | 'title';

export function TicketList() {
  const { projectId } = useParams<{ repoId: string; projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Initial tab parsing: support tab=context | tab=list | tab=kanban
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'tickets' | 'context'>(
    initialTabParam === 'context' ? 'context' : 'tickets'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialTabParam === 'list' ? 'list' : initialTabParam === 'kanban' ? 'kanban' : 'kanban'
  );
  const [statusFilters, setStatusFilters] = useState<Set<string>>(
    new Set(['pending', 'in-progress', 'completed'])
  );
  // Initialize sortBy from URL or default to 'priority'
  const initialSortBy = searchParams.get('sortBy') as SortOption;
  const [sortBy, setSortBy] = useState<SortOption>(
    initialSortBy && ['priority', 'status', 'updated', 'created', 'title'].includes(initialSortBy)
      ? initialSortBy
      : 'priority'
  );
  const [displayedCount, setDisplayedCount] = useState(20);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useWebSocket();
  const { toast } = useToast();
  const ticketId = searchParams.get('ticketId');
  const selectedTicket = ticketId ? tickets.find((t) => t.id === ticketId) : null;
  const [ticketComments, setTicketComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadTickets = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<Ticket[]>(`/tickets/${id}`);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (ticketId: string) => {
    try {
      setLoadingComments(true);
      const response = await apiClient.get<{ comments: Comment[] }>(
        `/tickets/${ticketId}/comments`
      );
      setTicketComments(response.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setTicketComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      loadTickets(projectId);
    }
  }, [projectId, loadTickets]);

  // Load comments when ticket is selected
  useEffect(() => {
    if (ticketId) {
      loadComments(ticketId);
    } else {
      setTicketComments([]);
    }
  }, [ticketId, loadComments]);

  // Subscribe to WebSocket events for ticket updates
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribe((message) => {
      // Reload tickets when a ticket is created or updated for this project
      if (
        message.type === 'ticket_created' ||
        message.type === 'ticket_updated' ||
        message.type === 'ticket_deleted'
      ) {
        if (message.projectId === projectId || message.entityType === 'ticket') {
          console.log('[TicketList] WebSocket event received, reloading tickets:', message);
          loadTickets(projectId);
        }
      }
    });

    return unsubscribe;
  }, [projectId, subscribe, loadTickets]);

  const getPriorityVariant = (
    priority: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
      case 'high':
        return <AlertCircle className="w-3.5 h-3.5 text-orange-400" />;
      case 'medium':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-progress':
        return <CircleDot className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const toggleSection = (status: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name?: string) => {
    if (!name) return 'bg-muted';
    // Generate a consistent color based on the name
    const colors = [
      'bg-green-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-indigo-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getPriorityValue = (priority: string): number => {
    switch (priority) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      default:
        return 1;
    }
  };

  // Filter and sort tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets.filter((ticket) => statusFilters.has(ticket.status));

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityValue(b.priority) - getPriorityValue(a.priority);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tickets, statusFilters, sortBy]);

  // Handle scroll for lazy loading
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode !== 'list') return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (
        scrollHeight - scrollTop <= clientHeight * 1.5 &&
        displayedCount < filteredAndSortedTickets.length
      ) {
        setDisplayedCount((prev) => Math.min(prev + 20, filteredAndSortedTickets.length));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [viewMode, displayedCount, filteredAndSortedTickets.length]);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(20);
  }, [statusFilters, sortBy]);

  // Keep state in sync when URL changes externally (e.g., from sidebar)
  // MUST be before early returns to follow Rules of Hooks
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'context') {
      setActiveTab('context');
    } else if (tab === 'list' || tab === 'kanban') {
      setActiveTab('tickets');
      setViewMode(tab as ViewMode);
    }

    // Sync sortBy from URL
    const urlSortBy = searchParams.get('sortBy') as SortOption;
    if (
      urlSortBy &&
      ['priority', 'status', 'updated', 'created', 'title'].includes(urlSortBy) &&
      urlSortBy !== sortBy
    ) {
      setSortBy(urlSortBy);
    }
  }, [searchParams, sortBy]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Todo';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Done';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive mb-4">Error: {error}</p>
          <Button variant="destructive" onClick={() => projectId && loadTickets(projectId)}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleOpenTicket = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('ticketId', id);
    setSearchParams(params);
  };

  const handleCloseTicket = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('ticketId');
    setSearchParams(params);
  };

  const copyTicketId = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the ticket
    try {
      await navigator.clipboard.writeText(ticketId);
      toast({
        title: 'Copied to clipboard',
        description: `Ticket ID #${ticketId} has been copied to clipboard.`,
      });
    } catch (err) {
      console.error('Failed to copy ticket ID:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy ticket ID to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab Content */}
      {activeTab === 'tickets' ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Controls */}
          <div className="mb-6 space-y-4 flex-shrink-0">
            {/* View mode toggle and filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* View mode toggle */}
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      setViewMode('list');
                      const params = new URLSearchParams(searchParams);
                      params.set('tab', 'list');
                      setSearchParams(params);
                    }}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('kanban');
                      const params = new URLSearchParams(searchParams);
                      params.set('tab', 'kanban');
                      setSearchParams(params);
                    }}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'kanban'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Kanban
                  </button>
                </div>

                {/* Status filters */}
                <div className="flex items-center gap-2">
                  {['pending', 'in-progress', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        statusFilters.has(status)
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {statusFilters.has(status) && (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Sort by:</label>
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value as SortOption);
                    const params = new URLSearchParams(searchParams);
                    params.set('sortBy', value);
                    setSearchParams(params);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select sort option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Last Updated</SelectItem>
                    <SelectItem value="created">Created Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {filteredAndSortedTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tickets found matching the selected filters.</p>
              </div>
            ) : viewMode === 'list' ? (
              <div ref={scrollContainerRef} className="h-full overflow-y-auto thin-scrollbar">
                {/* Group tickets by status */}
                {['in-progress', 'pending', 'completed', 'blocked']
                  .filter((status) => statusFilters.has(status))
                  .map((status) => {
                    const statusTickets = filteredAndSortedTickets.filter(
                      (t) => t.status === status
                    );
                    if (statusTickets.length === 0) return null;

                    const isCollapsed = collapsedSections.has(status);

                    return (
                      <div key={status} className="mb-6">
                        {/* Section Header */}
                        <div
                          className="flex items-center justify-between px-2 py-2.5 bg-muted/50 hover:bg-muted rounded-md mb-2 cursor-pointer transition-colors"
                          onClick={() => toggleSection(status)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            {getStatusIcon(status)}
                            <span className="text-sm font-medium text-foreground">
                              {getStatusLabel(status)}
                            </span>
                            <span className="text-xs text-muted-foreground">{statusTickets.length}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Add new ticket functionality
                            }}
                            className="p-1.5 hover:bg-accent rounded transition-colors"
                            title="Add ticket"
                          >
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>

                        {/* Tickets in this section */}
                        {!isCollapsed && (
                          <div className="space-y-0.5">
                            {statusTickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                onClick={() => handleOpenTicket(ticket.id)}
                                className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 rounded-md cursor-pointer transition-colors border border-transparent hover:border-border"
                              >
                                {/* Priority Icon */}
                                {ticket.status !== 'completed' && (
                                  <div className="flex-shrink-0 w-4 flex items-center justify-center">
                                    {getPriorityIcon(ticket.priority)}
                                  </div>
                                )}

                                {/* Ticket ID */}
                                <button
                                  onClick={(e) => copyTicketId(ticket.id, e)}
                                  className="flex-shrink-0 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copy ticket ID"
                                >
                                  {ticket.id.slice(0, 8)}
                                </button>

                                {/* Status Icon */}
                                <div className="flex-shrink-0">{getStatusIcon(ticket.status)}</div>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-foreground group-hover:text-foreground/90 truncate">
                                    {ticket.title}
                                  </div>
                                </div>

                                {/* Labels/Tags */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {ticket.type && (
                                    <span className="px-2 py-0.5 text-xs rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                      {ticket.type}
                                    </span>
                                  )}
                                  {ticket.tags &&
                                    Array.isArray(ticket.tags) &&
                                    ticket.tags.slice(0, 2).map((tag, idx) => {
                                      // Use different colors for variety
                                      const colors = [
                                        'bg-blue-500/20 text-blue-300 border-blue-500/30',
                                        'bg-green-500/20 text-green-300 border-green-500/30',
                                        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                                      ];
                                      const colorClass = colors[idx % colors.length];
                                      return (
                                        <span
                                          key={idx}
                                          className={`px-2 py-0.5 text-xs rounded-md ${colorClass} border`}
                                        >
                                          {tag}
                                        </span>
                                      );
                                    })}
                                </div>

                                {/* Number indicator (placeholder for cycle number) */}
                                {ticket.estimatedTime && (
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                    {String(ticket.estimatedTime)
                                      .replace(/[^0-9]/g, '')
                                      .slice(0, 2) || '?'}
                                  </div>
                                )}

                                {/* Size indicator (placeholder - could be based on estimatedTime) */}
                                {ticket.estimatedTime &&
                                  (() => {
                                    const estTime = String(ticket.estimatedTime);
                                    const numValue = parseInt(estTime.replace(/[^0-9]/g, '')) || 0;
                                    let size = 'S';
                                    if (estTime.includes('d') || estTime.includes('day')) {
                                      size = 'L';
                                    } else if (estTime.includes('h') && numValue > 4) {
                                      size = 'M';
                                    }
                                    return (
                                      <div className="flex-shrink-0 text-xs text-muted-foreground font-medium">
                                        {size}
                                      </div>
                                    );
                                  })()}

                                {/* Assignee */}
                                {ticket.assignee && (
                                  <div className="flex-shrink-0">
                                    <div
                                      className={`w-6 h-6 rounded-full ${getAvatarColor(ticket.assignee)} flex items-center justify-center text-xs text-white font-medium`}
                                    >
                                      {getInitials(ticket.assignee)}
                                    </div>
                                  </div>
                                )}

                                {/* Date */}
                                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>{formatDate(ticket.updatedAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {filteredAndSortedTickets.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No tickets found matching the selected filters.</p>
                  </div>
                )}
              </div>
            ) : (
              // Kanban view - only show columns for selected statuses
              <div
                className={`grid gap-4 h-full items-stretch ${
                  statusFilters.size === 1
                    ? 'grid-cols-1'
                    : statusFilters.size === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 md:grid-cols-3'
                }`}
              >
                {['pending', 'in-progress', 'completed']
                  .filter((status) => statusFilters.has(status))
                  .map((status) => {
                    const columnTickets = filteredAndSortedTickets.filter(
                      (t) => t.status === status
                    );
                    return (
                      <div key={status} className="flex flex-col h-full min-h-0">
                        <div className="mb-3 flex-shrink-0 pb-2">
                          <h3 className="font-semibold text-sm text-foreground mb-1">
                            {getStatusLabel(status)}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {columnTickets.length} tickets
                          </span>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto min-h-0 thin-scrollbar">
                          {columnTickets.map((ticket, index) => (
                            <ScrollReveal key={ticket.id} direction="up" delay={index * 50}>
                              <Card
                                onClick={() => handleOpenTicket(ticket.id)}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                              >
                                <CardContent className="pt-4 relative">
                                  <button
                                    onClick={(e) => copyTicketId(ticket.id, e)}
                                    className="absolute top-2 right-2 px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Copy ticket ID"
                                  >
                                    ID
                                  </button>
                                  <div className="flex items-start gap-2 mb-2">
                                    {ticket.status !== 'completed' && (
                                      <span className="text-sm">
                                        {getPriorityIcon(ticket.priority)}
                                      </span>
                                    )}
                                    <CardTitle className="text-sm font-medium">
                                      {ticket.title}
                                    </CardTitle>
                                  </div>
                                  {ticket.description && (
                                    <CardDescription className="text-xs line-clamp-2 mb-2">
                                      {ticket.description}
                                    </CardDescription>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      variant={getPriorityVariant(ticket.priority)}
                                      className="text-xs"
                                    >
                                      {ticket.priority}
                                    </Badge>
                                    {ticket.estimatedTime && (
                                      <span className="text-xs text-muted-foreground">
                                        {ticket.estimatedTime}
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </ScrollReveal>
                          ))}
                          {columnTickets.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">No tickets</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <RepoContext />
      )}

      {/* Ticket Detail Dialog */}
      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && handleCloseTicket()}>
        <SheetContent
          side="right"
          className="w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 sm:max-w-none overflow-y-auto border-l border-border/50 p-4"
        >
          {selectedTicket && (
            <TicketDetail
              ticket={selectedTicket}
              comments={ticketComments}
              loading={loadingComments}
              onClose={handleCloseTicket}
              showBackButton={false}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
