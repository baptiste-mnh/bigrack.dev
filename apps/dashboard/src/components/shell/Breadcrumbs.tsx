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
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

type Repo = { id: string; name: string };
type Project = { id: string; name: string };

export function Breadcrumbs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const segments = location.pathname.split('/').filter(Boolean);

  // Extract ids from /repos/:repoId/projects/:projectId/...
  const repoId = useMemo(() => {
    const idx = segments.indexOf('repos');
    return idx !== -1 && segments[idx + 1] ? segments[idx + 1] : undefined;
  }, [segments]);

  const projectId = useMemo(() => {
    const idx = segments.indexOf('projects');
    return idx !== -1 && segments[idx + 1] ? segments[idx + 1] : undefined;
  }, [segments]);

  const [repoName, setRepoName] = useState<string | undefined>(undefined);
  const [projectName, setProjectName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const loadNames = async () => {
      try {
        if (repoId) {
          const repos = await apiClient.get<Repo[]>('/repos');
          const repo = repos.find((r) => r.id === repoId);
          if (!cancelled) setRepoName(repo?.name || repoId);
          if (projectId && repo) {
            const projects = await apiClient.get<Project[]>(`/projects/${repo.id}`);
            const proj = projects.find((p) => p.id === projectId);
            if (!cancelled) setProjectName(proj?.name || projectId);
          } else if (projectId) {
            if (!cancelled) setProjectName(projectId);
          }
        } else {
          setRepoName(undefined);
          setProjectName(undefined);
        }
      } catch {
        if (!cancelled) {
          setRepoName(repoId);
          setProjectName(projectId);
        }
      }
    };
    loadNames();
    return () => {
      cancelled = true;
    };
  }, [repoId, projectId]);

  const toTitle = (segment: string) => {
    if (segment === 'repos') return 'Repos';
    if (segment === repoId && repoName) return repoName;
    if (segment === 'projects') return 'Projects';
    if (segment === projectId && projectName) return projectName;
    if (segment === 'tickets') return 'Tickets';
    return decodeURIComponent(segment);
  };

  const buildPath = (index: number) => {
    return '/' + segments.slice(0, index + 1).join('/');
  };

  // Optional trailing breadcrumb from tab
  const tab = searchParams.get('tab');
  const tabCrumb = tab === 'context' ? 'Context' : undefined;

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link to="/" className="text-white/70 hover:text-white transition-colors">
        Home
      </Link>
      {segments.map((seg, idx) => {
        const path = buildPath(idx);
        const isLast = idx === segments.length - 1 && !tabCrumb;
        return (
          <span key={path} className="flex items-center gap-2">
            <span className="text-white/30">/</span>
            {isLast ? (
              <span className="text-white">{toTitle(seg)}</span>
            ) : (
              <Link to={path} className="text-white/70 hover:text-white transition-colors">
                {toTitle(seg)}
              </Link>
            )}
          </span>
        );
      })}
      {tabCrumb && (
        <span className="flex items-center gap-2">
          <span className="text-white/30">/</span>
          <span className="text-white">{tabCrumb}</span>
        </span>
      )}
    </nav>
  );
}
