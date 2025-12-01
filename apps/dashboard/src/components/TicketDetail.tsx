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

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { useToast } from '@bigrack/shared';
import ReactMarkdown from 'react-markdown';
import { CommentsList } from './CommentsList';

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

interface TicketDetailProps {
  ticket?: Ticket;
  comments?: Comment[];
  loading?: boolean;
  onClose?: () => void;
  showBackButton?: boolean;
}

export function TicketDetail({
  ticket: propTicket,
  comments: propComments,
  loading: propLoading,
  onClose,
  showBackButton = true
}: TicketDetailProps = {}) {
  const { repoId, projectId, ticketId } = useParams<{
    repoId: string;
    projectId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(propTicket || null);
  const [comments, setComments] = useState<Comment[]>(propComments || []);
  const [loading, setLoading] = useState(propLoading ?? true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Only load ticket if not provided via props
  const loadTicket = useCallback(async (projectId: string, id: string) => {
    try {
      setLoading(true);
      setError(null);
      // Load ticket with comments
      const data = await apiClient.getTicketWithComments(projectId, id);
      setTicket(data.ticket);
      setComments(data.comments);
    } catch (err) {
      console.error('Failed to load ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If ticket provided via props, use it
    if (propTicket) {
      setTicket(propTicket);
      setComments(propComments || []);
      setLoading(false);
    } else if (ticketId && projectId) {
      loadTicket(projectId, ticketId);
    } else {
      setLoading(false);
      setError('Missing required parameters');
    }
  }, [ticketId, projectId, propTicket, propComments, loadTicket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500/40 to-green-600/40 text-white border border-green-500/60';
      case 'in-progress':
        return 'bg-gradient-to-r from-blue-500/40 to-blue-600/40 text-white border border-blue-500/60';
      case 'blocked':
        return 'bg-gradient-to-r from-red-500/40 to-red-600/40 text-white border border-red-500/60';
      default:
        return 'bg-gradient-to-r from-gray-500/40 to-gray-600/40 text-white border border-gray-500/60';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const copyTicketId = async (ticketId: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading ticket...</div>
      </div>
    );
  }

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (repoId && projectId) {
      navigate(`/repos/${repoId}/projects/${projectId}`);
    } else {
      navigate('/');
    }
  };

  if (error || !ticket) {
    return (
      <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
        <p className="text-destructive">Error: {error || 'Ticket not found'}</p>
        <button
          onClick={handleBack}
          className="mt-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          Back to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header with glassmorphism effect */}
      {showBackButton && (
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
          <svg
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">Back to Tickets</span>
        </button>

        <button
          onClick={() => copyTicketId(ticket.id)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all"
          title="Copy ticket ID"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy ID
        </button>
      </div>
      )}

      {/* Main Card with modern styling */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl overflow-hidden">
        {/* Header Section with gradient */}
        <div className="relative bg-gradient-to-br from-card via-card to-muted/20 p-8 border-b border-border/50">
          <div className="mb-6">
            <h1 className="text-4xl font-bold font-title mb-6 text-foreground leading-tight">
              {ticket.title}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(ticket.status)} shadow-sm`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                {ticket.status}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${getPriorityColor(ticket.priority)} bg-background/50 backdrop-blur-sm shadow-sm`}
              >
                {ticket.priority}
              </span>
              {ticket.type && (
                <span className="px-4 py-1.5 bg-background/80 backdrop-blur-sm text-foreground rounded-full text-sm font-medium border border-border/50 shadow-sm">
                  {ticket.type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8">
          {ticket.description && (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold font-title text-card-foreground flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                Description
              </h2>
              <div className="markdown-content text-card-foreground bg-muted/30 rounded-lg p-6 border border-border/50">
                <ReactMarkdown>{ticket.description}</ReactMarkdown>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Details
              </h3>
              <dl className="space-y-3 text-sm bg-muted/20 rounded-lg p-5 border border-border/30">
                {ticket.estimatedTime && (
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <dt className="flex items-center gap-2 text-muted-foreground">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Estimated Time
                    </dt>
                    <dd className="font-semibold text-card-foreground">{ticket.estimatedTime}</dd>
                  </div>
                )}
                {ticket.assignee && (
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <dt className="flex items-center gap-2 text-muted-foreground">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Assignee
                    </dt>
                    <dd className="font-semibold text-card-foreground">{ticket.assignee}</dd>
                  </div>
                )}
                {ticket.gitBranch && (
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <dt className="flex items-center gap-2 text-muted-foreground">
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
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      Git Branch
                    </dt>
                    <dd className="font-mono text-xs text-card-foreground bg-muted px-2 py-1 rounded">
                      {ticket.gitBranch}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Created
                  </dt>
                  <dd className="text-muted-foreground text-xs">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Updated
                  </dt>
                  <dd className="text-muted-foreground text-xs">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {ticket.tags && Array.isArray(ticket.tags) && ticket.tags.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {ticket.objectives &&
            Array.isArray(ticket.objectives) &&
            ticket.objectives.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  Objectives
                </h3>
                <ul className="space-y-2">
                  {ticket.objectives.map((objective, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/30"
                    >
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-card-foreground">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {ticket.validationCriteria &&
            Array.isArray(ticket.validationCriteria) &&
            ticket.validationCriteria.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Validation Criteria
                </h3>
                <ul className="space-y-2">
                  {ticket.validationCriteria.map((criterion, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/30"
                    >
                      <svg
                        className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-card-foreground">{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {ticket.dependencies &&
            Array.isArray(ticket.dependencies) &&
            ticket.dependencies.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Dependencies
                </h3>
                <ul className="space-y-2">
                  {ticket.dependencies.map((dep, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border/30"
                    >
                      <svg
                        className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                        />
                      </svg>
                      <span className="text-card-foreground">{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>

      {/* Comments Section with modern styling */}
      <div className="mt-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-card via-card to-muted/20 p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-title text-card-foreground flex items-center gap-2">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Activity & Comments
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-full border border-border/50">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-muted-foreground">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CommentsList comments={comments} loading={loading} />
        </div>
      </div>
    </div>
  );
}
