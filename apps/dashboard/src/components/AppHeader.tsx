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

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@bigrack/shared';
import { Moon, Sun } from 'lucide-react';
import LogoImage from '../assets/logo.png';
import { useTheme } from '../hooks/useTheme';

export function AppHeader() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { repoId, projectId } = useParams<{ repoId?: string; projectId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSidebarOpen = state === 'expanded';
  const { isDark, toggleTheme } = useTheme();

  // Determine current route
  const isRepoPage = repoId && !projectId;
  const isProjectPage = repoId && projectId && !location.pathname.includes('/tickets/');

  // Handle tab changes for project page
  const handleTabChange = (tab: 'tickets' | 'context') => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'context') {
      params.set('tab', 'context');
    } else {
      // For tickets, preserve view mode (list/kanban) or default to list
      const currentView = searchParams.get('view') || searchParams.get('tab') || 'list';
      if (currentView === 'list' || currentView === 'kanban') {
        params.set('tab', currentView);
      } else {
        params.set('tab', 'list');
      }
    }
    params.delete('ticketId');
    setSearchParams(params);
  };

  // Determine active tab based on URL
  const urlTab = searchParams.get('tab');
  const activeTab = urlTab || (isProjectPage ? 'list' : isRepoPage ? 'projects' : null);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md flex-shrink-0">
      <div className="flex h-16 items-center gap-4 px-4">
        <SidebarTrigger />
        {!isSidebarOpen && (
          <div className="flex items-center gap-3 flex-1">
            <img
              src={LogoImage}
              alt="BigRack logo"
              className="h-10 w-10 rounded-lg transition-transform duration-200 cursor-pointer hover:scale-105"
            />
            <h1 className="text-2xl font-bold text-foreground font-logo">BigRack</h1>
          </div>
        )}
        {isSidebarOpen && <div className="flex-1" />}

        {/* Back buttons and tabs */}
        <div className="flex items-center gap-4">
          {isRepoPage && (
            <Button variant="ghost" onClick={() => navigate('/')}>
              ← Back to Repositories
            </Button>
          )}
          {isProjectPage && (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate(`/repos/${repoId}`)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Projects
              </Button>
              {/* Tabs */}
              <nav className="flex gap-2">
                <button
                  onClick={() => handleTabChange('tickets')}
                  className={`px-3 py-2 text-sm font-medium transition-all border-b-2 bg-transparent cursor-pointer ${
                    activeTab !== 'context'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  Tickets
                </button>
                <button
                  onClick={() => handleTabChange('context')}
                  className={`px-3 py-2 text-sm font-medium transition-all border-b-2 bg-transparent cursor-pointer ${
                    activeTab === 'context'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  Context
                </button>
              </nav>
            </>
          )}
          {isRepoPage && (
            <nav className="flex gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('tab', 'projects');
                  setSearchParams(params);
                }}
                className={`px-3 py-2 text-sm font-medium transition-all border-b-2 bg-transparent cursor-pointer ${
                  activeTab === 'projects' || !activeTab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('tab', 'context');
                  setSearchParams(params);
                }}
                className={`px-3 py-2 text-sm font-medium transition-all border-b-2 bg-transparent cursor-pointer ${
                  activeTab === 'context'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Context
              </button>
            </nav>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
