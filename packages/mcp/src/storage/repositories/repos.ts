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
 * Repository for Repo entity operations (Database: repos table)
 */

import type { Repo, CreateRepoInput, UpdateRepoInput, FindRepoOptions } from '@bigrack/shared';
import { generateId, parseDate, formatDate, query, queryOne, execute } from '../database';

/**
 * Map database row to Repo type
 */
function mapRepo(row: any): Repo {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    gitRepository: row.gitRepository,
    gitDefaultBranch: row.gitDefaultBranch,
    ownerId: row.ownerId,
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    lastSyncAt: parseDate(row.lastSyncAt),
    syncVersion: row.syncVersion,
    vectorClock: row.vectorClock,
  };
}

/**
 * Create a new repo (saves to repos table)
 */
export function createRepo(input: CreateRepoInput): Repo {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO repos (
      id, name, description, visibility, gitRepository, gitDefaultBranch,
      ownerId, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.name,
    input.description || null,
    input.visibility || 'private',
    input.gitRepository || null,
    input.gitDefaultBranch || 'main',
    input.ownerId,
    now,
    now,
  ]);

  return getRepoById(id)!;
}

/**
 * Get repo by ID
 */
export function getRepoById(id: string): Repo | null {
  const sql = 'SELECT * FROM repos WHERE id = ?';
  return queryOne(sql, [id], mapRepo);
}

/**
 * Get repo by name and owner
 */
export function getRepoByName(name: string, ownerId: string): Repo | null {
  const sql = 'SELECT * FROM repos WHERE name = ? AND ownerId = ?';
  return queryOne(sql, [name, ownerId], mapRepo);
}

/**
 * Find repos with options
 */
export function findRepos(options: FindRepoOptions = {}): Repo[] {
  let sql = 'SELECT * FROM repos WHERE 1=1';
  const params: any[] = [];

  if (options.ownerId) {
    sql += ' AND ownerId = ?';
    params.push(options.ownerId);
  }

  if (options.visibility) {
    sql += ' AND visibility = ?';
    params.push(options.visibility);
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

  return query(sql, params, mapRepo);
}

/**
 * Update repo
 */
export function updateRepo(id: string, input: UpdateRepoInput): Repo | null {
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

  if (input.visibility !== undefined) {
    updates.push('visibility = ?');
    params.push(input.visibility);
  }

  if (input.gitRepository !== undefined) {
    updates.push('gitRepository = ?');
    params.push(input.gitRepository);
  }

  if (input.gitDefaultBranch !== undefined) {
    updates.push('gitDefaultBranch = ?');
    params.push(input.gitDefaultBranch);
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
    return getRepoById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE repos SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getRepoById(id);
}

/**
 * Delete repo
 */
export function deleteRepo(id: string): boolean {
  const sql = 'DELETE FROM repos WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

/**
 * Count repos
 */
export function countRepos(ownerId?: string): number {
  let sql = 'SELECT COUNT(*) as count FROM repos';
  const params: any[] = [];

  if (ownerId) {
    sql += ' WHERE ownerId = ?';
    params.push(ownerId);
  }

  const result = queryOne<{ count: number }>(sql, params);
  return result?.count || 0;
}
