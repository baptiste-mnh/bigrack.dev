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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

type Repo = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  name: string;
};

type Ticket = {
  id: string;
  title: string;
};

type ContextItem = {
  id: string;
  entityType: 'business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document';
  name?: string;
  title?: string;
  term?: string;
};

type ExpandedState = {
  repos: Record<string, boolean>;
  projects: Record<string, boolean>;
  tickets: Record<string, boolean>; // projectId -> loaded
  context: Record<string, boolean>; // repoId -> expanded
};

export function Sidebar() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [projectsByRepo, setProjectsByRepo] = useState<Record<string, Project[]>>({});
  const [ticketsByProject, setTicketsByProject] = useState<Record<string, Ticket[]>>({});
  const [contextByRepo, setContextByRepo] = useState<Record<string, ContextItem[]>>({});
  const [expanded, setExpanded] = useState<ExpandedState>({
    repos: {},
    projects: {},
    tickets: {},
    context: {},
  });
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});
  const [loadingTickets, setLoadingTickets] = useState<Record<string, boolean>>({});
  const [loadingContext, setLoadingContext] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadRepos = async () => {
      try {
        setLoadingRepos(true);
        const data = await apiClient.get<Repo[]>('/repos');
        setRepos(data);
      } finally {
        setLoadingRepos(false);
      }
    };
    loadRepos();
  }, []);

  const toggleRepo = async (repoId: string) => {
    setExpanded((prev) => ({ ...prev, repos: { ...prev.repos, [repoId]: !prev.repos[repoId] } }));
    // Lazy-load projects
    if (!projectsByRepo[repoId] && !loadingProjects[repoId]) {
      try {
        setLoadingProjects((prev) => ({ ...prev, [repoId]: true }));
        const data = await apiClient.get<Project[]>(`/projects/${repoId}`);
        setProjectsByRepo((prev) => ({ ...prev, [repoId]: data }));
      } finally {
        setLoadingProjects((prev) => ({ ...prev, [repoId]: false }));
      }
    }
  };

  const toggleProject = async (_repoId: string, project: Project) => {
    setExpanded((prev) => ({
      ...prev,
      projects: { ...prev.projects, [project.id]: !prev.projects[project.id] },
    }));
    // Lazy-load tickets when expanding "Project" node
    if (!ticketsByProject[project.id] && !loadingTickets[project.id]) {
      try {
        setLoadingTickets((prev) => ({ ...prev, [project.id]: true }));
        const data = await apiClient.get<Ticket[]>(`/tickets/${project.id}`);
        setTicketsByProject((prev) => ({ ...prev, [project.id]: data }));
      } finally {
        setLoadingTickets((prev) => ({ ...prev, [project.id]: false }));
      }
    }
  };

  const toggleContext = async (repoId: string) => {
    setExpanded((prev) => ({
      ...prev,
      context: { ...prev.context, [repoId]: !prev.context[repoId] },
    }));
    if (!contextByRepo[repoId] && !loadingContext[repoId]) {
      try {
        setLoadingContext((prev) => ({ ...prev, [repoId]: true }));
        const data = await apiClient.get<ContextItem[]>(`/context/${repoId}`);
        setContextByRepo((prev) => ({ ...prev, [repoId]: data }));
      } finally {
        setLoadingContext((prev) => ({ ...prev, [repoId]: false }));
      }
    }
  };

  const goToRepo = (repoId: string) => {
    navigate(`/repos/${repoId}`);
  };

  const goToProjectTickets = (repoId: string, projectId: string) => {
    navigate(`/repos/${repoId}/projects/${projectId}`);
  };

  const openTicket = (repoId: string, projectId: string, ticketId: string) => {
    navigate(`/repos/${repoId}/projects/${projectId}?ticketId=${ticketId}`);
  };

  const openContext = (repoId: string) => {
    navigate(`/repos/${repoId}?tab=context`);
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

  const headerLabel = useMemo(() => {
    return 'Projects';
  }, []);

  return (
    <div className="h-full min-h-0 overflow-auto thin-scrollbar">
      <div className="p-3">
        <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground px-3">
          {headerLabel}
        </div>
        <div className="space-y-1">
          {loadingRepos ? (
            <div className="px-3 py-1.5 text-sm text-muted-foreground">Loading repos...</div>
          ) : repos.length === 0 ? (
            <button
              onClick={() => navigate('/')}
              className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-sm text-muted-foreground"
            >
              No repositories
            </button>
          ) : (
            repos.map((repo) => (
              <div key={repo.id}>
                <button
                  onClick={() => toggleRepo(repo.id)}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-sm text-foreground flex items-center gap-2"
                >
                  <span className="inline-block w-4 text-center">
                    {expanded.repos[repo.id] ? '▾' : '▸'}
                  </span>
                  <span onDoubleClick={() => goToRepo(repo.id)} className="truncate">
                    {repo.name}
                  </span>
                </button>
                {expanded.repos[repo.id] && (
                  <div className="mt-1">
                    {loadingProjects[repo.id] ? (
                      <div
                        className="px-3 py-1.5 text-xs text-muted-foreground"
                        style={{ paddingLeft: 24 }}
                      >
                        Loading projects...
                      </div>
                    ) : (
                      (projectsByRepo[repo.id] || []).map((project) => (
                        <div key={project.id} className="select-none">
                          <button
                            onClick={() => goToProjectTickets(repo.id, project.id)}
                            className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-sm text-foreground flex items-center gap-2"
                            style={{ paddingLeft: 24 }}
                          >
                            <span className="inline-block w-4 text-center">•</span>
                            <span className="truncate">{project.name}</span>
                          </button>

                          {/* Context node with inline file listing */}
                          <div>
                            <button
                              onClick={() => toggleContext(repo.id)}
                              onDoubleClick={() => openContext(repo.id)}
                              className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-xs text-muted-foreground flex items-center gap-2"
                              style={{ paddingLeft: 36 }}
                            >
                              <span className="inline-block w-4 text-center">
                                {expanded.context[repo.id] ? '▾' : '▸'}
                              </span>
                              Context
                            </button>
                            {expanded.context[repo.id] && (
                              <div className="mt-1">
                                {loadingContext[repo.id] ? (
                                  <div
                                    className="px-3 py-1.5 text-xs text-muted-foreground"
                                    style={{ paddingLeft: 48 }}
                                  >
                                    Loading…
                                  </div>
                                ) : (contextByRepo[repo.id] || []).length === 0 ? (
                                  <div
                                    className="px-3 py-1.5 text-xs text-muted-foreground"
                                    style={{ paddingLeft: 48 }}
                                  >
                                    No context items
                                  </div>
                                ) : (
                                  (contextByRepo[repo.id] || []).map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => openContext(repo.id)}
                                      className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-xs text-muted-foreground flex items-center gap-2 truncate"
                                      style={{ paddingLeft: 48 }}
                                      title={item.title || item.name || item.term || 'Untitled'}
                                    >
                                      <span className="inline-block w-4 text-center">
                                        {getTypeIcon(item.entityType)}
                                      </span>
                                      <span className="truncate">
                                        {item.title || item.name || item.term || 'Untitled'}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Project node that contains all tickets */}
                          <button
                            onClick={() => toggleProject(repo.id, project)}
                            className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-xs text-muted-foreground flex items-center gap-2"
                            style={{ paddingLeft: 36 }}
                          >
                            <span className="inline-block w-4 text-center">
                              {expanded.projects[project.id] ? '▾' : '▸'}
                            </span>
                            Project
                          </button>

                          {expanded.projects[project.id] && (
                            <div className="mt-1">
                              {loadingTickets[project.id] ? (
                                <div
                                  className="px-3 py-1.5 text-xs text-muted-foreground"
                                  style={{ paddingLeft: 48 }}
                                >
                                  Loading tickets...
                                </div>
                              ) : (ticketsByProject[project.id] || []).length === 0 ? (
                                <div
                                  className="px-3 py-1.5 text-xs text-muted-foreground"
                                  style={{ paddingLeft: 48 }}
                                >
                                  No tickets
                                </div>
                              ) : (
                                ticketsByProject[project.id].map((ticket) => (
                                  <button
                                    key={ticket.id}
                                    onClick={() => openTicket(repo.id, project.id, ticket.id)}
                                    className="w-full text-left px-3 py-1.5 rounded hover:bg-muted/50 text-xs text-muted-foreground truncate"
                                    style={{ paddingLeft: 48 }}
                                    title={ticket.title}
                                  >
                                    {ticket.title}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
