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
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { Badge } from '@bigrack/shared';
import { Button } from '@bigrack/shared';
import { ScrollReveal } from './ScrollReveal';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface Repo {
  id: string;
  name: string;
  description?: string;
  _count?: {
    projects: number;
    businessRules: number;
    glossary: number;
    patterns: number;
    conventions: number;
    documents: number;
  };
}

export function RepoList() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<Repo[]>('/repos');
      setRepos(data);
    } catch (err) {
      console.error('Failed to load repos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoClick = (repo: Repo, event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedRepo(repo);
    setIsSheetOpen(true);
  };

  const handleGoToProjects = (repoId: string) => {
    setIsSheetOpen(false);
    navigate(`/repos/${repoId}`);
  };

  const getTotalDocs = (repo: Repo) => {
    if (!repo._count) return 0;
    return (
      repo._count.businessRules +
      repo._count.glossary +
      repo._count.patterns +
      repo._count.conventions +
      repo._count.documents
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading repositories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">Error: {error}</p>
        <Button variant="destructive" onClick={loadRepos}>
          Retry
        </Button>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="empty-state">
        <p>No repositories found.</p>
        <p>
          Run <code className="empty-state-code">bigrack create_repo</code> to create one.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <ScrollReveal direction="up" delay={0}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              flexShrink: 0,
              fontFamily: 'var(--font-title)',
              color: 'hsl(var(--foreground))',
            }}
          >
            Repositories
          </h2>
        </ScrollReveal>
        <div style={{ flex: 1, overflowY: 'auto' }} className="thin-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {repos.map((repo, index) => {
              const totalDocs = getTotalDocs(repo);
              const projectsCount = repo._count?.projects || 0;

              return (
                <ScrollReveal key={repo.id} direction="up" delay={index * 50}>
                  <div onClick={(e) => handleRepoClick(repo, e)} className="repo-list-item">
                    <div className="repo-list-item-content">
                      <div className="repo-list-item-title">
                        <h3 className="repo-list-item-name">{repo.name}</h3>
                      </div>
                      {repo.description && (
                        <p className="repo-list-item-description">{repo.description}</p>
                      )}
                      <div className="repo-list-item-meta">
                        <span>
                          {projectsCount} {projectsCount === 1 ? 'project' : 'projects'}
                        </span>
                        {totalDocs > 0 && <Badge variant="success">{totalDocs} docs</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGoToProjects(repo.id)}
                      >
                        Open repository
                        <ChevronRight
                          className="repo-list-item-arrow"
                          style={{ width: '1.25rem', height: '1.25rem' }}
                        />
                      </Button>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sheet for repo details */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          {selectedRepo && (
            <>
              <SheetHeader>
                <SheetTitle style={{ fontSize: '1.5rem' }}>{selectedRepo.name}</SheetTitle>
                {selectedRepo.description && (
                  <SheetDescription style={{ fontSize: '1rem', marginTop: '1rem' }}>
                    {selectedRepo.description}
                  </SheetDescription>
                )}
              </SheetHeader>

              {/* Action button */}
              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <Button
                  onClick={() => handleGoToProjects(selectedRepo.id)}
                  style={{ width: '100%' }}
                  size="lg"
                >
                  Go to Repository
                  <ArrowRight style={{ marginLeft: '0.5rem', width: '1rem', height: '1rem' }} />
                </Button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                }}
              >
                {/* Statistics */}
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Statistics
                  </h3>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}
                  >
                    <div className="sheet-stat-card">
                      <div className="sheet-stat-value">{selectedRepo._count?.projects || 0}</div>
                      <div className="sheet-stat-label">Projects</div>
                    </div>
                    <div className="sheet-stat-card">
                      <div className="sheet-stat-value">{getTotalDocs(selectedRepo)}</div>
                      <div className="sheet-stat-label">Documents</div>
                    </div>
                  </div>
                </div>

                {/* Detailed counts */}
                {selectedRepo._count && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      Context Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedRepo._count.businessRules > 0 && (
                        <div className="sheet-context-item">
                          <span className="sheet-context-label">Business Rules</span>
                          <Badge variant="secondary">{selectedRepo._count.businessRules}</Badge>
                        </div>
                      )}
                      {selectedRepo._count.glossary > 0 && (
                        <div className="sheet-context-item">
                          <span className="sheet-context-label">Glossary Terms</span>
                          <Badge variant="info">{selectedRepo._count.glossary}</Badge>
                        </div>
                      )}
                      {selectedRepo._count.patterns > 0 && (
                        <div className="sheet-context-item">
                          <span className="sheet-context-label">Patterns</span>
                          <Badge variant="secondary">{selectedRepo._count.patterns}</Badge>
                        </div>
                      )}
                      {selectedRepo._count.conventions > 0 && (
                        <div className="sheet-context-item">
                          <span className="sheet-context-label">Conventions</span>
                          <Badge variant="secondary">{selectedRepo._count.conventions}</Badge>
                        </div>
                      )}
                      {selectedRepo._count.documents > 0 && (
                        <div className="sheet-context-item">
                          <span className="sheet-context-label">Documents</span>
                          <Badge variant="success">{selectedRepo._count.documents}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
