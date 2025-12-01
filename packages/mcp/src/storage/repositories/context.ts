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
 * Repository for business context entities
 * Handles: BusinessRule, GlossaryEntry, ArchitecturePattern, TeamConvention, Document
 */

import type {
  BusinessRule,
  GlossaryEntry,
  ArchitecturePattern,
  TeamConvention,
  Document,
  CreateBusinessRuleInput,
  UpdateBusinessRuleInput,
  CreateGlossaryEntryInput,
  UpdateGlossaryEntryInput,
  CreateArchitecturePatternInput,
  UpdateArchitecturePatternInput,
  CreateTeamConventionInput,
  UpdateTeamConventionInput,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '@bigrack/shared';
import { generateId, parseDate, query, queryOne, execute } from '../database';

// ============================================================================
// BUSINESS RULES
// ============================================================================

function mapBusinessRule(row: any): BusinessRule {
  return {
    id: row.id,
    repoId: row.repoId,
    name: row.name,
    description: row.description,
    validationLogic: row.validationLogic,
    examples: row.examples,
    relatedDomains: row.relatedDomains,
    category: row.category,
    priority: row.priority,
    isActive: Boolean(row.isActive),
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    createdBy: row.createdBy,
    version: row.version,
    lastModifiedBy: row.lastModifiedBy,
  };
}

export function createBusinessRule(input: CreateBusinessRuleInput): BusinessRule {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO business_rules (
      id, repoId, name, description, validationLogic, examples, relatedDomains,
      category, priority, isActive, createdAt, updatedAt, createdBy, version
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.repoId,
    input.name,
    input.description,
    input.validationLogic || null,
    input.examples || null,
    input.relatedDomains || null,
    input.category || null,
    input.priority || 'medium',
    input.isActive !== false ? 1 : 0,
    now,
    now,
    input.createdBy || null,
    1,
  ]);

  return getBusinessRuleById(id)!;
}

export function getBusinessRuleById(id: string): BusinessRule | null {
  const sql = 'SELECT * FROM business_rules WHERE id = ?';
  return queryOne(sql, [id], mapBusinessRule);
}

export function findBusinessRules(repoId: string, category?: string): BusinessRule[] {
  let sql = 'SELECT * FROM business_rules WHERE repoId = ?';
  const params: any[] = [repoId];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY createdAt DESC';
  return query(sql, params, mapBusinessRule);
}

export function updateBusinessRule(
  id: string,
  input: UpdateBusinessRuleInput
): BusinessRule | null {
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

  if (input.validationLogic !== undefined) {
    updates.push('validationLogic = ?');
    params.push(input.validationLogic);
  }

  if (input.examples !== undefined) {
    updates.push('examples = ?');
    params.push(input.examples);
  }

  if (input.relatedDomains !== undefined) {
    updates.push('relatedDomains = ?');
    params.push(input.relatedDomains);
  }

  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }

  if (input.priority !== undefined) {
    updates.push('priority = ?');
    params.push(input.priority);
  }

  if (input.isActive !== undefined) {
    updates.push('isActive = ?');
    params.push(input.isActive ? 1 : 0);
  }

  if (input.lastModifiedBy !== undefined) {
    updates.push('lastModifiedBy = ?');
    params.push(input.lastModifiedBy);
    updates.push('version = version + 1');
  }

  if (updates.length === 0) {
    return getBusinessRuleById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE business_rules SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getBusinessRuleById(id);
}

export function deleteBusinessRule(id: string): boolean {
  const sql = 'DELETE FROM business_rules WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

// ============================================================================
// GLOSSARY ENTRIES
// ============================================================================

function mapGlossaryEntry(row: any): GlossaryEntry {
  return {
    id: row.id,
    repoId: row.repoId,
    term: row.term,
    definition: row.definition,
    synonyms: row.synonyms,
    relatedTerms: row.relatedTerms,
    examples: row.examples,
    category: row.category,
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    createdBy: row.createdBy,
  };
}

export function createGlossaryEntry(input: CreateGlossaryEntryInput): GlossaryEntry {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO glossary_entries (
      id, repoId, term, definition, synonyms, relatedTerms, examples,
      category, createdAt, updatedAt, createdBy
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.repoId,
    input.term,
    input.definition,
    input.synonyms || null,
    input.relatedTerms || null,
    input.examples || null,
    input.category || null,
    now,
    now,
    input.createdBy || null,
  ]);

  return getGlossaryEntryById(id)!;
}

export function getGlossaryEntryById(id: string): GlossaryEntry | null {
  const sql = 'SELECT * FROM glossary_entries WHERE id = ?';
  return queryOne(sql, [id], mapGlossaryEntry);
}

export function findGlossaryEntries(repoId: string, category?: string): GlossaryEntry[] {
  let sql = 'SELECT * FROM glossary_entries WHERE repoId = ?';
  const params: any[] = [repoId];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY term ASC';
  return query(sql, params, mapGlossaryEntry);
}

export function updateGlossaryEntry(
  id: string,
  input: UpdateGlossaryEntryInput
): GlossaryEntry | null {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.term !== undefined) {
    updates.push('term = ?');
    params.push(input.term);
  }

  if (input.definition !== undefined) {
    updates.push('definition = ?');
    params.push(input.definition);
  }

  if (input.synonyms !== undefined) {
    updates.push('synonyms = ?');
    params.push(input.synonyms);
  }

  if (input.relatedTerms !== undefined) {
    updates.push('relatedTerms = ?');
    params.push(input.relatedTerms);
  }

  if (input.examples !== undefined) {
    updates.push('examples = ?');
    params.push(input.examples);
  }

  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }

  if (updates.length === 0) {
    return getGlossaryEntryById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE glossary_entries SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getGlossaryEntryById(id);
}

export function deleteGlossaryEntry(id: string): boolean {
  const sql = 'DELETE FROM glossary_entries WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

// ============================================================================
// ARCHITECTURE PATTERNS
// ============================================================================

function mapArchitecturePattern(row: any): ArchitecturePattern {
  return {
    id: row.id,
    repoId: row.repoId,
    name: row.name,
    description: row.description,
    whenToUse: row.whenToUse,
    example: row.example,
    benefits: row.benefits,
    tradeoffs: row.tradeoffs,
    category: row.category,
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    createdBy: row.createdBy,
  };
}

export function createArchitecturePattern(
  input: CreateArchitecturePatternInput
): ArchitecturePattern {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO architecture_patterns (
      id, repoId, name, description, whenToUse, example, benefits, tradeoffs,
      category, createdAt, updatedAt, createdBy
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.repoId,
    input.name,
    input.description,
    input.whenToUse || null,
    input.example || null,
    input.benefits || null,
    input.tradeoffs || null,
    input.category || null,
    now,
    now,
    input.createdBy || null,
  ]);

  return getArchitecturePatternById(id)!;
}

export function getArchitecturePatternById(id: string): ArchitecturePattern | null {
  const sql = 'SELECT * FROM architecture_patterns WHERE id = ?';
  return queryOne(sql, [id], mapArchitecturePattern);
}

export function findArchitecturePatterns(repoId: string, category?: string): ArchitecturePattern[] {
  let sql = 'SELECT * FROM architecture_patterns WHERE repoId = ?';
  const params: any[] = [repoId];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY name ASC';
  return query(sql, params, mapArchitecturePattern);
}

export function updateArchitecturePattern(
  id: string,
  input: UpdateArchitecturePatternInput
): ArchitecturePattern | null {
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

  if (input.whenToUse !== undefined) {
    updates.push('whenToUse = ?');
    params.push(input.whenToUse);
  }

  if (input.example !== undefined) {
    updates.push('example = ?');
    params.push(input.example);
  }

  if (input.benefits !== undefined) {
    updates.push('benefits = ?');
    params.push(input.benefits);
  }

  if (input.tradeoffs !== undefined) {
    updates.push('tradeoffs = ?');
    params.push(input.tradeoffs);
  }

  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }

  if (updates.length === 0) {
    return getArchitecturePatternById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE architecture_patterns SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getArchitecturePatternById(id);
}

export function deleteArchitecturePattern(id: string): boolean {
  const sql = 'DELETE FROM architecture_patterns WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

// ============================================================================
// TEAM CONVENTIONS
// ============================================================================

function mapTeamConvention(row: any): TeamConvention {
  return {
    id: row.id,
    repoId: row.repoId,
    category: row.category,
    rule: row.rule,
    enforced: Boolean(row.enforced),
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    createdBy: row.createdBy,
  };
}

export function createTeamConvention(input: CreateTeamConventionInput): TeamConvention {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO team_conventions (
      id, repoId, category, rule, enforced, createdAt, updatedAt, createdBy
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.repoId,
    input.category,
    input.rule,
    input.enforced !== false ? 1 : 0,
    now,
    now,
    input.createdBy || null,
  ]);

  return getTeamConventionById(id)!;
}

export function getTeamConventionById(id: string): TeamConvention | null {
  const sql = 'SELECT * FROM team_conventions WHERE id = ?';
  return queryOne(sql, [id], mapTeamConvention);
}

export function findTeamConventions(repoId: string, category?: string): TeamConvention[] {
  let sql = 'SELECT * FROM team_conventions WHERE repoId = ?';
  const params: any[] = [repoId];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY category ASC';
  return query(sql, params, mapTeamConvention);
}

export function updateTeamConvention(
  id: string,
  input: UpdateTeamConventionInput
): TeamConvention | null {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }

  if (input.rule !== undefined) {
    updates.push('rule = ?');
    params.push(input.rule);
  }

  if (input.enforced !== undefined) {
    updates.push('enforced = ?');
    params.push(input.enforced ? 1 : 0);
  }

  if (updates.length === 0) {
    return getTeamConventionById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE team_conventions SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getTeamConventionById(id);
}

export function deleteTeamConvention(id: string): boolean {
  const sql = 'DELETE FROM team_conventions WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

function mapDocument(row: any): Document {
  return {
    id: row.id,
    repoId: row.repoId,
    title: row.title,
    content: row.content,
    tags: row.tags,
    type: row.type,
    mimeType: row.mimeType,
    createdAt: parseDate(row.createdAt)!,
    updatedAt: parseDate(row.updatedAt)!,
    createdBy: row.createdBy,
  };
}

export function createDocument(input: CreateDocumentInput): Document {
  const id = input.id || generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO documents (
      id, repoId, title, content, tags, type, mimeType,
      createdAt, updatedAt, createdBy
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  execute(sql, [
    id,
    input.repoId,
    input.title,
    input.content,
    input.tags || null,
    input.type || 'general',
    input.mimeType || null,
    now,
    now,
    input.createdBy || null,
  ]);

  return getDocumentById(id)!;
}

export function getDocumentById(id: string): Document | null {
  const sql = 'SELECT * FROM documents WHERE id = ?';
  return queryOne(sql, [id], mapDocument);
}

export function findDocuments(repoId: string, type?: string): Document[] {
  let sql = 'SELECT * FROM documents WHERE repoId = ?';
  const params: any[] = [repoId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY createdAt DESC';
  return query(sql, params, mapDocument);
}

export function updateDocument(id: string, input: UpdateDocumentInput): Document | null {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }

  if (input.content !== undefined) {
    updates.push('content = ?');
    params.push(input.content);
  }

  if (input.tags !== undefined) {
    updates.push('tags = ?');
    params.push(input.tags);
  }

  if (input.type !== undefined) {
    updates.push('type = ?');
    params.push(input.type);
  }

  if (input.mimeType !== undefined) {
    updates.push('mimeType = ?');
    params.push(input.mimeType);
  }

  if (updates.length === 0) {
    return getDocumentById(id);
  }

  updates.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  const sql = `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`;
  execute(sql, params);

  return getDocumentById(id);
}

export function deleteDocument(id: string): boolean {
  const sql = 'DELETE FROM documents WHERE id = ?';
  const result = execute(sql, [id]);
  return result.changes > 0;
}
