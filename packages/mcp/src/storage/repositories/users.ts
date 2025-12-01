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
 * Repository for User entity operations
 */

import type { User, CreateUserInput, UpdateUserInput } from '@bigrack/shared';
import { generateId, parseDate, queryOne, execute } from '../database';

/**
 * Map database row to User type
 */
function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
  };
}

/**
 * Create a new user
 */
export function createUser(input: CreateUserInput): User {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO users (id, email, username, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `;

  execute(sql, [id, input.email || null, input.username || null, now, now]);

  return getUserById(id)!;
}

/**
 * Get user by ID
 */
export function getUserById(id: string): User | null {
  const sql = 'SELECT * FROM users WHERE id = ?';
  return queryOne(sql, [id], mapUser);
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
  const sql = 'SELECT * FROM users WHERE email = ?';
  return queryOne(sql, [email], mapUser);
}

/**
 * Get or create default user
 * For local-first usage, we use a default system user
 */
export function getOrCreateDefaultUser(): User {
  const defaultId = 'default-user';
  let user = getUserById(defaultId);

  if (!user) {
    user = createUser({
      id: defaultId,
      username: 'system',
    });
  }

  return user;
}

/**
 * Update user
 */
export function updateUser(id: string, input: UpdateUserInput): User | null {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.email !== undefined) {
    updates.push('email = ?');
    params.push(input.email);
  }

  if (input.username !== undefined) {
    updates.push('username = ?');
    params.push(input.username);
  }

  if (updates.length === 0) {
    return getUserById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getUserById(id);
}

/**
 * Delete user
 */
export function deleteUser(id: string): boolean {
  const sql = 'DELETE FROM users WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}
