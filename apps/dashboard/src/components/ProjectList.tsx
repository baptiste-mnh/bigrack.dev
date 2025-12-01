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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { RepoContext } from './RepoContext';
import { Button } from '@bigrack/shared';
import { Badge } from '@bigrack/shared';
import { ScrollReveal } from './ScrollReveal';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  _count?: {
    tasks: number;
    businessRules: number;
    glossary: number;
    patterns: number;
    conventions: number;
    documents: number;
  };
}

export function ProjectList() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'context'>(
    (searchParams.get('tab') as 'projects' | 'context') || 'projects'
  );

  useEffect(() => {
    if (repoId) {
      loadProjects(repoId);
    }
  }, [repoId]);

  // Sync with URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab') as 'projects' | 'context' | null;
    if (tab === 'projects' || tab === 'context') {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('projects');
    }
  }, [searchParams]);

  const loadProjects = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<Project[]>(`/projects/${id}`);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: Project, event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedProject(project);
    setIsSheetOpen(true);
  };

  const handleGoToTickets = (projectId: string) => {
    setIsSheetOpen(false);
    navigate(`/repos/${repoId}/projects/${projectId}`);
  };

  const getTypeVariant = (
    type: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
    switch (type) {
      case 'feature':
        return 'info';
      case 'bugfix':
        return 'destructive';
      case 'refactor':
        return 'secondary';
      case 'test':
        return 'warning';
      case 'docs':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTotalDocs = (project: Project) => {
    if (!project._count) return 0;
    return (
      project._count.businessRules +
      project._count.glossary +
      project._count.patterns +
      project._count.conventions +
      project._count.documents
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">Error: {error}</p>
        <Button variant="destructive" onClick={() => repoId && loadProjects(repoId)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'projects' ? (
          <>
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>No projects found in this repository.</p>
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
              >
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
                    Projects
                  </h2>
                </ScrollReveal>
                <div style={{ flex: 1, overflowY: 'auto' }} className="thin-scrollbar">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {projects.map((project, index) => {
                      const totalDocs = getTotalDocs(project);
                      const ticketsCount = project._count?.tasks || 0;

                      return (
                        <ScrollReveal key={project.id} direction="up" delay={index * 50}>
                          <div
                            onClick={(e) => handleProjectClick(project, e)}
                            className="project-list-item"
                          >
                            <div className="project-list-item-content">
                              <div className="project-list-item-title">
                                <h3 className="project-list-item-name">{project.name}</h3>
                                <Badge variant={getTypeVariant(project.type)}>{project.type}</Badge>
                              </div>
                              {project.description && (
                                <p className="project-list-item-description">
                                  {project.description}
                                </p>
                              )}
                              <div className="project-list-item-meta">
                                <span>
                                  {ticketsCount} {ticketsCount === 1 ? 'ticket' : 'tickets'}
                                </span>
                                <span>Status: {project.status}</span>
                                {totalDocs > 0 && <Badge variant="success">{totalDocs} docs</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGoToTickets(project.id)}
                              >
                                Open project
                                <ChevronRight
                                  className="project-list-item-arrow"
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
            )}

            {/* Sheet for project details */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetContent>
                {selectedProject && (
                  <>
                    <SheetHeader>
                      <SheetTitle style={{ fontSize: '1.5rem' }}>{selectedProject.name}</SheetTitle>
                      {selectedProject.description && (
                        <SheetDescription style={{ fontSize: '1rem', marginTop: '1rem' }}>
                          {selectedProject.description}
                        </SheetDescription>
                      )}
                    </SheetHeader>

                    {/* Action button */}
                    <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                      <Button
                        onClick={() => handleGoToTickets(selectedProject.id)}
                        style={{ width: '100%' }}
                        size="lg"
                      >
                        Go to Project
                        <ArrowRight
                          style={{ marginLeft: '0.5rem', width: '1rem', height: '1rem' }}
                        />
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
                        <h3
                          style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}
                        >
                          Statistics
                        </h3>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem',
                          }}
                        >
                          <div className="sheet-stat-card">
                            <div className="sheet-stat-value">
                              {selectedProject._count?.tasks || 0}
                            </div>
                            <div className="sheet-stat-label">Tickets</div>
                          </div>
                          <div className="sheet-stat-card">
                            <div className="sheet-stat-value">{getTotalDocs(selectedProject)}</div>
                            <div className="sheet-stat-label">Documents</div>
                          </div>
                        </div>
                      </div>

                      {/* Project Info */}
                      <div>
                        <h3
                          style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}
                        >
                          Project Info
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div className="sheet-context-item">
                            <span className="sheet-context-label">Type</span>
                            <Badge variant={getTypeVariant(selectedProject.type)}>
                              {selectedProject.type}
                            </Badge>
                          </div>
                          <div className="sheet-context-item">
                            <span className="sheet-context-label">Status</span>
                            <Badge variant="secondary">{selectedProject.status}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Detailed counts */}
                      {selectedProject._count && (
                        <div>
                          <h3
                            style={{
                              fontSize: '1.125rem',
                              fontWeight: 600,
                              marginBottom: '0.75rem',
                            }}
                          >
                            Context Details
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedProject._count.businessRules > 0 && (
                              <div className="sheet-context-item">
                                <span className="sheet-context-label">Business Rules</span>
                                <Badge variant="secondary">
                                  {selectedProject._count.businessRules}
                                </Badge>
                              </div>
                            )}
                            {selectedProject._count.glossary > 0 && (
                              <div className="sheet-context-item">
                                <span className="sheet-context-label">Glossary Terms</span>
                                <Badge variant="info">{selectedProject._count.glossary}</Badge>
                              </div>
                            )}
                            {selectedProject._count.patterns > 0 && (
                              <div className="sheet-context-item">
                                <span className="sheet-context-label">Patterns</span>
                                <Badge variant="secondary">{selectedProject._count.patterns}</Badge>
                              </div>
                            )}
                            {selectedProject._count.conventions > 0 && (
                              <div className="sheet-context-item">
                                <span className="sheet-context-label">Conventions</span>
                                <Badge variant="secondary">
                                  {selectedProject._count.conventions}
                                </Badge>
                              </div>
                            )}
                            {selectedProject._count.documents > 0 && (
                              <div className="sheet-context-item">
                                <span className="sheet-context-label">Documents</span>
                                <Badge variant="success">{selectedProject._count.documents}</Badge>
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
        ) : (
          <RepoContext />
        )}
      </div>
    </div>
  );
}
