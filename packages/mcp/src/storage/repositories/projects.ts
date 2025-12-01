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

/**
 * Repository for Project entity operations (Database: projects table)
 */

import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  FindProjectOptions,
} from '@bigrack/shared';
import { generateId, parseDate, formatDate, query, queryOne, execute } from '../database';

/**
 * Map database row to Project type
 */
function mapProject(row: any): Project {
  return {
    id: row.id,
    repoId: row.repoId,
    name: row.name,
    description: row.description,
    type: row.type,
    gitBranch: row.gitBranch,
    gitBaseBranch: row.gitBaseBranch,
    gitLastCommitSha: row.gitLastCommitSha,
    gitLastCommitMessage: row.gitLastCommitMessage,
    gitLastCommitAt: parseDate(row.gitLastCommitAt),
    status: row.status,
    progress: row.progress,
    createdBy: row.createdBy,
    assignedTo: row.assignedTo,
    visibility: row.visibility,
    inheritsFromRepo: Boolean(row.inheritsFromRepo),
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    completedAt: parseDate(row.completedAt),
    lastSyncAt: parseDate(row.lastSyncAt),
    syncVersion: row.syncVersion,
    vectorClock: row.vectorClock,
  };
}

/**
 * Create a new project (saves to projects table)
 */
export function createProject(input: CreateProjectInput): Project {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO projects (
      id, repoId, name, description, type, gitBranch, gitBaseBranch,
      status, progress, createdBy, assignedTo, visibility, inheritsFromRepo,
      createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.repoId,
    input.name,
    input.description || null,
    input.type || 'feature',
    input.gitBranch || null,
    input.gitBaseBranch || null,
    input.status || 'planned',
    input.progress || 0,
    input.createdBy,
    input.assignedTo || null,
    input.visibility || 'private',
    input.inheritsFromRepo !== false ? 1 : 0,
    now,
    now,
  ]);

  return getProjectById(id)!;
}

/**
 * Get project by ID
 */
export function getProjectById(id: string): Project | null {
  const sql = 'SELECT * FROM projects WHERE id = ?';
  return queryOne(sql, [id], mapProject);
}

/**
 * Get project by name in repo
 */
export function getProjectByName(name: string, repoId: string): Project | null {
  const sql = 'SELECT * FROM projects WHERE name = ? AND repoId = ?';
  return queryOne(sql, [name, repoId], mapProject);
}

/**
 * Find projects with options
 */
export function findProjects(options: FindProjectOptions = {}): Project[] {
  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params: any[] = [];

  if (options.repoId) {
    sql += ' AND repoId = ?';
    params.push(options.repoId);
  }

  if (options.createdBy) {
    sql += ' AND createdBy = ?';
    params.push(options.createdBy);
  }

  if (options.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }

  if (options.type) {
    sql += ' AND type = ?';
    params.push(options.type);
  }

  sql += ' ORDER BY createdAt DESC';

  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    sql += ' OFFSET ?';
    params.push(options.offset);
  }

  return query(sql, params, mapProject);
}

/**
 * Update project
 */
export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }

  if (input.type !== undefined) {
    updates.push('type = ?');
    params.push(input.type);
  }

  if (input.gitBranch !== undefined) {
    updates.push('gitBranch = ?');
    params.push(input.gitBranch);
  }

  if (input.gitBaseBranch !== undefined) {
    updates.push('gitBaseBranch = ?');
    params.push(input.gitBaseBranch);
  }

  if (input.gitLastCommitSha !== undefined) {
    updates.push('gitLastCommitSha = ?');
    params.push(input.gitLastCommitSha);
  }

  if (input.gitLastCommitMessage !== undefined) {
    updates.push('gitLastCommitMessage = ?');
    params.push(input.gitLastCommitMessage);
  }

  if (input.gitLastCommitAt !== undefined) {
    updates.push('gitLastCommitAt = ?');
    params.push(formatDate(input.gitLastCommitAt));
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }

  if (input.progress !== undefined) {
    updates.push('progress = ?');
    params.push(input.progress);
  }

  if (input.assignedTo !== undefined) {
    updates.push('assignedTo = ?');
    params.push(input.assignedTo);
  }

  if (input.visibility !== undefined) {
    updates.push('visibility = ?');
    params.push(input.visibility);
  }

  if (input.inheritsFromRepo !== undefined) {
    updates.push('inheritsFromRepo = ?');
    params.push(input.inheritsFromRepo ? 1 : 0);
  }

  if (input.completedAt !== undefined) {
    updates.push('completedAt = ?');
    params.push(formatDate(input.completedAt));
  }

  if (input.lastSyncAt !== undefined) {
    updates.push('lastSyncAt = ?');
    params.push(formatDate(input.lastSyncAt));
  }

  if (input.syncVersion !== undefined) {
    updates.push('syncVersion = ?');
    params.push(input.syncVersion);
  }

  if (input.vectorClock !== undefined) {
    updates.push('vectorClock = ?');
    params.push(input.vectorClock);
  }

  if (updates.length === 0) {
    return getProjectById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getProjectById(id);
}

/**
 * Delete project
 */
export function deleteProject(id: string): boolean {
  const sql = 'DELETE FROM projects WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

/**
 * Count projects
 */
export function countProjects(repoId?: string): number {
  let sql = 'SELECT COUNT(*) as count FROM projects';
  const params: any[] = [];

  if (repoId) {
    sql += ' WHERE repoId = ?';
    params.push(repoId);
  }

  const result = queryOne<{ count: number }>(sql, params);
  return result?.count || 0;
}
