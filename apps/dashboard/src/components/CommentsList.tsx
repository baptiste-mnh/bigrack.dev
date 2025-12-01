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

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Comment {
  id: string;
  content: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentsListProps {
  comments: Comment[];
  loading?: boolean;
}

export function CommentsList({ comments, loading = false }: CommentsListProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleComment = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card/50 border border-border rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-32 mb-2" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
            <div className="h-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 bg-popover/30 border border-border rounded-lg">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-muted-foreground text-sm">No comments yet</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Be the first to add a comment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isExpanded = expandedComments.has(comment.id);
        const contentLines = comment.content.split('\n').length;
        const isLongComment = contentLines > 4 || comment.content.length > 300;

        return (
          <div
            key={comment.id}
            className="group bg-popover/50 border border-border/50 hover:border-border rounded-lg p-4 transition-all duration-200 hover:shadow-md"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-foreground">
                    {comment.createdBy
                      ? comment.createdBy.substring(0, 2).toUpperCase()
                      : 'AI'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-popover-foreground">
                    {comment.createdBy || 'AI Assistant'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.createdAt)}
                    {comment.updatedAt !== comment.createdAt && (
                      <span className="ml-1">(edited)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-popover-foreground transition-colors"
                  title="Copy comment"
                  onClick={() => navigator.clipboard.writeText(comment.content)}
                >
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className={`markdown-content text-sm text-popover-foreground/90 ${
                !isExpanded && isLongComment ? 'line-clamp-4' : ''
              }`}
            >
              <ReactMarkdown>{comment.content}</ReactMarkdown>
            </div>

            {/* Expand/Collapse */}
            {isLongComment && (
              <button
                onClick={() => toggleComment(comment.id)}
                className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Show less
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Show more
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
