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
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  Settings,
  FileText,
  Home,
  LayoutGrid,
  ListTodo,
  ChevronRight,
  ChevronDown,
  Scale,
  FileCheck,
} from 'lucide-react';
import LogoImage from '../assets/logo.png';
import { apiClient } from '../lib/api-client';

interface Repo {
  id: string;
  name: string;
  description?: string;
  _count?: {
    projects: number;
    documents: number;
  };
}

interface Project {
  id: string;
  name: string;
}

interface ContextItem {
  id: string;
  entityType: 'business_rule' | 'glossary_entry' | 'pattern' | 'convention' | 'document';
  name?: string;
  title?: string;
  term?: string;
  projectId?: string;
}

const MAX_CONTEXT_DISPLAY = 5;

interface AppSidebarProps {
  apiStatus?: string;
}

export function AppSidebar({ apiStatus }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // IMPORTANT: AppSidebar is rendered outside of <Routes>, so useParams() won't work here.
  // We compute ids from the current pathname to ensure sidebar reacts to route changes.
  const pathSegments = useMemo(
    () => location.pathname.split('/').filter(Boolean),
    [location.pathname]
  );
  const repoId = useMemo(() => {
    const idx = pathSegments.indexOf('repos');
    return idx !== -1 && pathSegments[idx + 1] ? pathSegments[idx + 1] : undefined;
  }, [pathSegments]);
  const projectId = useMemo(() => {
    const idx = pathSegments.indexOf('projects');
    return idx !== -1 && pathSegments[idx + 1] ? pathSegments[idx + 1] : undefined;
  }, [pathSegments]);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [projectContextItems, setProjectContextItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [repoName, setRepoName] = useState<string | undefined>(undefined);
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const [isRepoContextExpanded, setIsRepoContextExpanded] = useState(false);
  const [isProjectContextExpanded, setIsProjectContextExpanded] = useState(false);
  const [showAllRepoContext, setShowAllRepoContext] = useState(false);
  const [showAllProjectContext, setShowAllProjectContext] = useState(false);

  // Determine current view based on route
  const isHomePage = location.pathname === '/';
  const isSettingsPage = location.pathname === '/settings';
  const isLegalPage = location.pathname === '/legal';
  const isLicensesPage = location.pathname === '/licenses';
  const isRepoPage = repoId && !projectId;
  const isProjectPage = repoId && projectId && !location.pathname.includes('/tickets/');
  const isTicketPage = repoId && projectId && location.pathname.includes('/tickets/');
  const isKanbanView = location.search.includes('tab=kanban');
  const isListView = location.search.includes('tab=list');
  const isRepoContextPage = isRepoPage && location.search.includes('tab=context');
  const isProjectContextPage = isProjectPage && location.search.includes('tab=context');

  // Debug logs to trace sidebar state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Sidebar] route change', {
      pathname: location.pathname,
      search: location.search,
      repoId,
      projectId,
      isHomePage,
      isSettingsPage,
      isRepoPage,
      isProjectPage,
      isTicketPage,
    });
  }, [
    location.pathname,
    location.search,
    repoId,
    projectId,
    isHomePage,
    isSettingsPage,
    isRepoPage,
    isProjectPage,
    isTicketPage,
  ]);

  useEffect(() => {
    loadRepos();
  }, []);

  // Load repo name
  useEffect(() => {
    if (repoId) {
      const repo = repos.find((r) => r.id === repoId);
      if (repo) {
        setRepoName(repo.name);
      } else if (repos.length > 0) {
        // Repos loaded but not found
        setRepoName(repoId);
      }
      // If repos not loaded yet, wait for loadRepos to complete
    } else {
      setRepoName(undefined);
    }
  }, [repoId, repos]);

  // Load project name
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId);
      setProjectName(project?.name || projectId);
    } else {
      setProjectName(undefined);
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (repoId) {
      loadProjects(repoId);
      loadContext(repoId);
    } else {
      setProjects([]);
      setContextItems([]);
    }
  }, [repoId]);

  useEffect(() => {
    if (projectId && repoId) {
      loadProjectContext(repoId, projectId);
    } else {
      setProjectContextItems([]);
    }
  }, [projectId, repoId]);

  // Load expansion state when repoId or projectId changes
  useEffect(() => {
    if (repoId) {
      const saved = localStorage.getItem(`sidebar-repo-context-expanded-${repoId}`);
      if (saved !== null) {
        setIsRepoContextExpanded(saved === 'true');
      } else {
        // If no saved state, expand if on context page
        setIsRepoContextExpanded(!!isRepoContextPage);
      }
    } else {
      setIsRepoContextExpanded(false);
    }
  }, [repoId, isRepoContextPage]);

  useEffect(() => {
    if (projectId) {
      const saved = localStorage.getItem(`sidebar-project-context-expanded-${projectId}`);
      if (saved !== null) {
        setIsProjectContextExpanded(saved === 'true');
      } else {
        // If no saved state, expand if on context page
        setIsProjectContextExpanded(!!isProjectContextPage);
      }
    } else {
      setIsProjectContextExpanded(false);
    }
  }, [projectId, isProjectContextPage]);

  // Auto-expand context list when on context page
  useEffect(() => {
    if (isRepoContextPage && repoId) {
      setIsRepoContextExpanded(true);
      localStorage.setItem(`sidebar-repo-context-expanded-${repoId}`, 'true');
    } else if (repoId) {
      // Don't auto-collapse, preserve user preference
      setShowAllRepoContext(false);
    }
  }, [isRepoContextPage, repoId]);

  useEffect(() => {
    if (isProjectContextPage && projectId) {
      setIsProjectContextExpanded(true);
      localStorage.setItem(`sidebar-project-context-expanded-${projectId}`, 'true');
    } else if (projectId) {
      // Don't auto-collapse, preserve user preference
      setShowAllProjectContext(false);
    }
  }, [isProjectContextPage, projectId]);

  // Persist expansion state when user toggles it
  useEffect(() => {
    if (repoId) {
      localStorage.setItem(
        `sidebar-repo-context-expanded-${repoId}`,
        String(isRepoContextExpanded)
      );
    }
  }, [isRepoContextExpanded, repoId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem(
        `sidebar-project-context-expanded-${projectId}`,
        String(isProjectContextExpanded)
      );
    }
  }, [isProjectContextExpanded, projectId]);

  const loadRepos = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Repo[]>('/repos');
      setRepos(data);
    } catch (err) {
      console.error('Failed to load repos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (id: string) => {
    try {
      setLoadingProjects(true);
      // eslint-disable-next-line no-console
      console.log('[Sidebar] loading projects for repo', id);
      const data = await apiClient.get<Project[]>(`/projects/${id}`);
      // eslint-disable-next-line no-console
      console.log('[Sidebar] projects loaded', { count: data?.length ?? 0 });
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadContext = async (id: string) => {
    try {
      const data = await apiClient.get<ContextItem[]>(`/context/${id}`);
      setContextItems(data);
    } catch (err) {
      console.error('Failed to load context:', err);
      setContextItems([]);
    }
  };

  const loadProjectContext = async (_repoId: string, projectId: string) => {
    try {
      // Load project context and filter to only items with matching projectId
      const projectContext = await apiClient.get<ContextItem[]>(`/context/${projectId}`);
      // Filter to only keep items that have the projectId matching
      const filteredContext = projectContext.filter((item) => item.projectId === projectId);
      setProjectContextItems(filteredContext);
    } catch (err) {
      console.error('Failed to load project context:', err);
      setProjectContextItems([]);
    }
  };

  const getContextItemName = (item: ContextItem) => {
    return item.name || item.title || item.term || 'Untitled';
  };

  return (
    <Sidebar>
      <SidebarHeader className="sidebar-header-border">
        <div className="sidebar-header-content">
          <img src={LogoImage} alt="BigRack logo" className="sidebar-logo" />
          <h2 className="sidebar-title">BigRack</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Home - Always visible */}
        <SidebarGroup>
          <SidebarGroupLabel>Home</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/')}
                  isActive={isHomePage}
                  tooltip="Home"
                >
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {repoId && (
          <SidebarGroup>
            <SidebarGroupLabel>Repository</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate(`/repos/${repoId}`)}
                    isActive={true}
                  >
                    {repoName}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Page d'accueil: Liste de tous les repos */}
        {isHomePage && (
          <SidebarGroup>
            <SidebarGroupLabel>Repositories</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {loading ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled>Loading...</SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  <>
                    {repos.map((repo) => (
                      <SidebarMenuItem key={repo.id}>
                        <SidebarMenuButton
                          onClick={() => navigate(`/repos/${repo.id}`)}
                          tooltip={repo.name}
                        >
                          <span>{repo.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {repos.length === 0 && (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>No repositories</SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Page repos ou projet: Repo + Projects + Context */}
        {repoId && (
          <>
            {/* Nom du Repo */}
            {repoId && (
              <SidebarGroup>
                <SidebarGroupLabel>
                  {(repoName || repoId).charAt(0).toUpperCase() + (repoName || repoId).slice(1)}{' '}
                  Projects
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Context du repo */}
                    <SidebarMenuItem>
                      <div className="flex items-center w-full">
                        <SidebarMenuButton
                          onClick={() => {
                            if (isRepoContextPage) {
                              setIsRepoContextExpanded(!isRepoContextExpanded);
                            } else {
                              navigate(`/repos/${repoId}?tab=context`);
                            }
                          }}
                          isActive={!!(isRepoPage && location.search.includes('tab=context'))}
                          tooltip="Context"
                          className="flex-1"
                        >
                          <FileText />
                          <span>Context</span>
                        </SidebarMenuButton>
                        {contextItems.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsRepoContextExpanded(!isRepoContextExpanded);
                            }}
                            className="p-1.5 hover:bg-sidebar-accent rounded transition-colors flex-shrink-0"
                            aria-label="Toggle context list"
                            title="Toggle context list"
                          >
                            {isRepoContextExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {contextItems.length > 0 && isRepoContextExpanded && (
                        <SidebarMenuSub>
                          {(showAllRepoContext
                            ? contextItems
                            : contextItems.slice(0, MAX_CONTEXT_DISPLAY)
                          ).map((item) => (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton
                                onClick={() => navigate(`/repos/${repoId}/context/${item.id}`)}
                                isActive={
                                  location.pathname === `/repos/${repoId}/context/${item.id}`
                                }
                                style={{ cursor: 'pointer' }}
                              >
                                <span>{getContextItemName(item)}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          {contextItems.length > MAX_CONTEXT_DISPLAY && !showAllRepoContext && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton onClick={() => setShowAllRepoContext(true)}>
                                <span>+{contextItems.length - MAX_CONTEXT_DISPLAY} more</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>

                    {/* Projects */}
                    {loadingProjects ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>Loading projects...</SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      <>
                        {projects.map((project) => (
                          <SidebarMenuItem key={project.id}>
                            <SidebarMenuButton
                              onClick={() => navigate(`/repos/${repoId}/projects/${project.id}`)}
                              isActive={projectId === project.id}
                              tooltip={project.name}
                            >
                              <span>{project.name}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                        {projects.length === 0 && (
                          <SidebarMenuItem>
                            <SidebarMenuButton disabled>No projects</SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Page du projet: Nom du projet + Context/Kanban/Todos */}
            {isProjectPage && projectId && (
              <SidebarGroup>
                <SidebarGroupLabel>{projectName || projectId}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Context du projet (repo + projet) */}
                    <SidebarMenuItem>
                      <div className="flex items-center w-full">
                        <SidebarMenuButton
                          onClick={() => {
                            if (isProjectContextPage) {
                              setIsProjectContextExpanded(!isProjectContextExpanded);
                            } else {
                              navigate(`/repos/${repoId}/projects/${projectId}?tab=context`);
                            }
                          }}
                          isActive={isProjectPage && location.search.includes('tab=context')}
                          tooltip="Project Context"
                          className="flex-1"
                        >
                          <FileText />
                          <span>Context</span>
                        </SidebarMenuButton>
                        {projectContextItems.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsProjectContextExpanded(!isProjectContextExpanded);
                            }}
                            className="p-1.5 hover:bg-sidebar-accent rounded transition-colors flex-shrink-0"
                            aria-label="Toggle context list"
                            title="Toggle context list"
                          >
                            {isProjectContextExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {projectContextItems.length > 0 && isProjectContextExpanded && (
                        <SidebarMenuSub>
                          {(showAllProjectContext
                            ? projectContextItems
                            : projectContextItems.slice(0, MAX_CONTEXT_DISPLAY)
                          ).map((item) => (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton
                                onClick={() => navigate(`/repos/${repoId}/context/${item.id}`)}
                                isActive={
                                  location.pathname === `/repos/${repoId}/context/${item.id}`
                                }
                                style={{ cursor: 'pointer' }}
                              >
                                <span>{getContextItemName(item)}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          {projectContextItems.length > MAX_CONTEXT_DISPLAY &&
                            !showAllProjectContext && (
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  onClick={() => setShowAllProjectContext(true)}
                                >
                                  <span>
                                    +{projectContextItems.length - MAX_CONTEXT_DISPLAY} more
                                  </span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>

                    {/* Kanban */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() =>
                          navigate(`/repos/${repoId}/projects/${projectId}?tab=kanban`)
                        }
                        isActive={isKanbanView}
                        tooltip="Kanban View"
                      >
                        <LayoutGrid />
                        <span>Kanban</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Todos/List */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => navigate(`/repos/${repoId}/projects/${projectId}?tab=list`)}
                        isActive={isListView}
                        tooltip="List View"
                      >
                        <ListTodo />
                        <span>List</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="sidebar-footer-border">
        <SidebarMenu>
          {apiStatus && (
            <SidebarMenuItem>
              <SidebarMenuButton disabled tooltip={apiStatus}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: apiStatus.includes('✅') ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)',
                  }}
                >
                  {apiStatus}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/settings')}
              isActive={isSettingsPage}
              tooltip="Settings"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/legal')}
              isActive={isLegalPage}
              tooltip="Legal"
            >
              <Scale />
              <span>Legal</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/licenses')}
              isActive={isLicensesPage}
              tooltip="Licenses"
            >
              <FileCheck />
              <span>Licenses</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
