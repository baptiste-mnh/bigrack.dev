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
 * Repository for Ticket entity operations (Database: tasks table)
 */

import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  FindTicketOptions,
} from '@bigrack/shared';
import { generateId, parseDate, formatDate, query, queryOne, execute } from '../database';

/**
 * Map database row to Ticket type
 */
function mapTicket(row: any): Ticket {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    order: row.order,
    type: row.type,
    estimatedTime: row.estimatedTime,
    dependsOn: row.dependsOn,
    blockedBy: row.blockedBy,
    assignedTo: row.assignedTo,
    assignee: row.assignee,
    gitBranch: row.gitBranch,
    tags: row.tags,
    validationCriteria: row.validationCriteria,
    externalId: row.externalId,
    objectives: row.objectives,
    relatedTickets: row.relatedTickets,
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    completedAt: parseDate(row.completedAt),
  };
}

/**
 * Create a new ticket (saves to tasks table)
 */
export function createTicket(input: CreateTicketInput): Ticket {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO tasks (
      id, projectId, title, description, status, priority, "order", type,
      estimatedTime, dependsOn, blockedBy, assignedTo, assignee, gitBranch,
      tags, validationCriteria, externalId, objectives, relatedTickets,
      createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.projectId,
    input.title,
    input.description || null,
    input.status || 'pending',
    input.priority || 'medium',
    input.order || 0,
    input.type || null,
    input.estimatedTime || null,
    input.dependsOn || null,
    input.blockedBy || null,
    input.assignedTo || null,
    input.assignee || null,
    input.gitBranch || null,
    input.tags || null,
    input.validationCriteria || null,
    input.externalId || null,
    input.objectives || null,
    input.relatedTickets || null,
    now,
    now,
  ]);

  return getTicketById(id)!;
}

/**
 * Get ticket by ID
 */
export function getTicketById(id: string): Ticket | null {
  const sql = 'SELECT * FROM tasks WHERE id = ?';
  return queryOne(sql, [id], mapTicket);
}

/**
 * Get ticket by title in project
 */
export function getTicketByTitle(title: string, projectId: string): Ticket | null {
  const sql = 'SELECT * FROM tasks WHERE title = ? AND projectId = ?';
  return queryOne(sql, [title, projectId], mapTicket);
}

/**
 * Get ticket by external ID
 */
export function getTicketByExternalId(externalId: string, projectId: string): Ticket | null {
  const sql = 'SELECT * FROM tasks WHERE externalId = ? AND projectId = ?';
  return queryOne(sql, [externalId, projectId], mapTicket);
}

/**
 * Find tickets with options
 */
export function findTickets(options: FindTicketOptions = {}): Ticket[] {
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];

  if (options.projectId) {
    sql += ' AND projectId = ?';
    params.push(options.projectId);
  }

  if (options.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }

  if (options.priority) {
    sql += ' AND priority = ?';
    params.push(options.priority);
  }

  if (options.type) {
    sql += ' AND type = ?';
    params.push(options.type);
  }

  if (options.assignee) {
    sql += ' AND (assignee = ? OR assignedTo = ?)';
    params.push(options.assignee, options.assignee);
  }

  sql += ' ORDER BY "order" ASC, createdAt ASC';

  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    sql += ' OFFSET ?';
    params.push(options.offset);
  }

  return query(sql, params, mapTicket);
}

/**
 * Update ticket
 */
export function updateTicket(id: string, input: UpdateTicketInput): Ticket | null {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }

  if (input.priority !== undefined) {
    updates.push('priority = ?');
    params.push(input.priority);
  }

  if (input.order !== undefined) {
    updates.push('"order" = ?');
    params.push(input.order);
  }

  if (input.type !== undefined) {
    updates.push('type = ?');
    params.push(input.type);
  }

  if (input.estimatedTime !== undefined) {
    updates.push('estimatedTime = ?');
    params.push(input.estimatedTime);
  }

  if (input.dependsOn !== undefined) {
    updates.push('dependsOn = ?');
    params.push(input.dependsOn);
  }

  if (input.blockedBy !== undefined) {
    updates.push('blockedBy = ?');
    params.push(input.blockedBy);
  }

  if (input.assignedTo !== undefined) {
    updates.push('assignedTo = ?');
    params.push(input.assignedTo);
  }

  if (input.assignee !== undefined) {
    updates.push('assignee = ?');
    params.push(input.assignee);
  }

  if (input.gitBranch !== undefined) {
    updates.push('gitBranch = ?');
    params.push(input.gitBranch);
  }

  if (input.tags !== undefined) {
    updates.push('tags = ?');
    params.push(input.tags);
  }

  if (input.validationCriteria !== undefined) {
    updates.push('validationCriteria = ?');
    params.push(input.validationCriteria);
  }

  if (input.externalId !== undefined) {
    updates.push('externalId = ?');
    params.push(input.externalId);
  }

  if (input.objectives !== undefined) {
    updates.push('objectives = ?');
    params.push(input.objectives);
  }

  if (input.relatedTickets !== undefined) {
    updates.push('relatedTickets = ?');
    params.push(input.relatedTickets);
  }

  if (input.completedAt !== undefined) {
    updates.push('completedAt = ?');
    params.push(formatDate(input.completedAt));
  }

  if (updates.length === 0) {
    return getTicketById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getTicketById(id);
}

/**
 * Delete ticket
 */
export function deleteTicket(id: string): boolean {
  const sql = 'DELETE FROM tasks WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

/**
 * Count tickets
 */
export function countTickets(projectId?: string, status?: string): number {
  let sql = 'SELECT COUNT(*) as count FROM tasks WHERE 1=1';
  const params: any[] = [];

  if (projectId) {
    sql += ' AND projectId = ?';
    params.push(projectId);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  const result = queryOne<{ count: number }>(sql, params);
  return result?.count || 0;
}
