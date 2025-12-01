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
 * Shared database types and interfaces for BigRack.dev
 * These types match the database schema and are used across repositories
 */

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  id?: string;
  email?: string | null;
  username?: string | null;
}

export interface UpdateUserInput {
  email?: string | null;
  username?: string | null;
}

// ============================================================================
// REPO TYPES (Database: repos table)
// ============================================================================

export interface Repo {
  id: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'team';
  gitRepository: string | null;
  gitDefaultBranch: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
  syncVersion: number;
  vectorClock: string | null; // JSON string
}

export interface CreateRepoInput {
  id?: string;
  name: string;
  description?: string | null;
  visibility?: 'private' | 'team';
  gitRepository?: string | null;
  gitDefaultBranch?: string | null;
  ownerId: string;
}

export interface UpdateRepoInput {
  name?: string;
  description?: string | null;
  visibility?: 'private' | 'team';
  gitRepository?: string | null;
  gitDefaultBranch?: string | null;
  lastSyncAt?: Date | null;
  syncVersion?: number;
  vectorClock?: string | null;
}

export interface FindRepoOptions {
  ownerId?: string;
  visibility?: 'private' | 'team';
  search?: string; // Search in name or description
  limit?: number;
  offset?: number;
}

// ============================================================================
// PROJECT TYPES (Database: projects table)
// ============================================================================

export interface Project {
  id: string;
  repoId: string; // Database field name remains unchanged
  name: string;
  description: string | null;
  type: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'spike';
  gitBranch: string | null;
  gitBaseBranch: string | null;
  gitLastCommitSha: string | null;
  gitLastCommitMessage: string | null;
  gitLastCommitAt: Date | null;
  status: 'planned' | 'in-progress' | 'testing' | 'completed' | 'cancelled';
  progress: number; // 0-100
  createdBy: string;
  assignedTo: string | null; // JSON array of user IDs
  visibility: 'private' | 'team';
  inheritsFromRepo: boolean; // Database field name remains unchanged
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  lastSyncAt: Date | null;
  syncVersion: number;
  vectorClock: string | null; // JSON string
}

export interface CreateProjectInput {
  id?: string;
  repoId: string; // Database field name remains unchanged
  name: string;
  description?: string | null;
  type?: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'spike';
  gitBranch?: string | null;
  gitBaseBranch?: string | null;
  gitLastCommitSha?: string | null;
  gitLastCommitMessage?: string | null;
  gitLastCommitAt?: Date | null;
  status?: 'planned' | 'in-progress' | 'testing' | 'completed' | 'cancelled';
  progress?: number;
  createdBy: string;
  assignedTo?: string | null;
  visibility?: 'private' | 'team';
  inheritsFromRepo?: boolean; // Database field name remains unchanged
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  type?: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'spike';
  gitBranch?: string | null;
  gitBaseBranch?: string | null;
  gitLastCommitSha?: string | null;
  gitLastCommitMessage?: string | null;
  gitLastCommitAt?: Date | null;
  status?: 'planned' | 'in-progress' | 'testing' | 'completed' | 'cancelled';
  progress?: number;
  assignedTo?: string | null;
  visibility?: 'private' | 'team';
  inheritsFromRepo?: boolean; // Database field name remains unchanged
  completedAt?: Date | null;
  lastSyncAt?: Date | null;
  syncVersion?: number;
  vectorClock?: string | null;
}

export interface FindProjectOptions {
  repoId?: string; // Database field name remains unchanged
  createdBy?: string;
  status?: 'planned' | 'in-progress' | 'testing' | 'completed' | 'cancelled';
  type?: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'spike';
  visibility?: 'private' | 'team';
  search?: string; // Search in name or description
  limit?: number;
  offset?: number;
}

// ============================================================================
// TICKET TYPES (Database: tasks table)
// ============================================================================

export interface Ticket {
  id: string;
  projectId: string; // Database field name remains unchanged
  title: string;
  description: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  order: number;
  type: 'setup' | 'implementation' | 'testing' | 'documentation' | null;
  estimatedTime: string | null; // e.g., "2h", "1d", "30m"
  dependsOn: string | null; // JSON array of task IDs
  blockedBy: string | null; // JSON array of task IDs
  assignedTo: string | null; // User ID (legacy)
  assignee: string | null; // User ID (preferred)
  gitBranch: string | null;
  tags: string | null; // JSON array of tags
  validationCriteria: string | null; // JSON array of validation criteria
  externalId: string | null; // Original ticket ID (e.g., "#125")
  objectives: string | null; // JSON array of objectives
  relatedTickets: string | null; // JSON array of related ticket IDs
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface CreateTicketInput {
  id?: string;
  projectId: string; // Database field name remains unchanged
  title: string;
  description?: string | null;
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  order?: number;
  type?: 'setup' | 'implementation' | 'testing' | 'documentation' | null;
  estimatedTime?: string | null;
  dependsOn?: string | null;
  blockedBy?: string | null;
  assignedTo?: string | null;
  assignee?: string | null;
  gitBranch?: string | null;
  tags?: string | null;
  validationCriteria?: string | null;
  externalId?: string | null;
  objectives?: string | null;
  relatedTickets?: string | null;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string | null;
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  order?: number;
  type?: 'setup' | 'implementation' | 'testing' | 'documentation' | null;
  estimatedTime?: string | null;
  dependsOn?: string | null;
  blockedBy?: string | null;
  assignedTo?: string | null;
  assignee?: string | null;
  gitBranch?: string | null;
  tags?: string | null;
  validationCriteria?: string | null;
  externalId?: string | null;
  objectives?: string | null;
  relatedTickets?: string | null;
  completedAt?: Date | null;
}

export interface FindTicketOptions {
  projectId?: string; // Database field name remains unchanged
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  assignee?: string;
  search?: string; // Search in title or description
  limit?: number;
  offset?: number;
}

// ============================================================================
// BUSINESS CONTEXT TYPES
// ============================================================================

export interface BusinessRule {
  id: string;
  repoId: string;
  name: string;
  description: string;
  validationLogic: string | null;
  examples: string | null; // JSON array
  relatedDomains: string | null; // JSON array
  category: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  version: number;
  lastModifiedBy: string | null;
}

export interface CreateBusinessRuleInput {
  id?: string;
  repoId: string;
  name: string;
  description: string;
  validationLogic?: string | null;
  examples?: string | null;
  relatedDomains?: string | null;
  category?: string | null;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  isActive?: boolean;
  createdBy?: string | null;
}

export interface UpdateBusinessRuleInput {
  name?: string;
  description?: string;
  validationLogic?: string | null;
  examples?: string | null;
  relatedDomains?: string | null;
  category?: string | null;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  isActive?: boolean;
  lastModifiedBy?: string | null;
}

export interface GlossaryEntry {
  id: string;
  repoId: string;
  term: string;
  definition: string;
  synonyms: string | null; // JSON array
  relatedTerms: string | null; // JSON array
  examples: string | null; // JSON array
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateGlossaryEntryInput {
  id?: string;
  repoId: string;
  term: string;
  definition: string;
  synonyms?: string | null;
  relatedTerms?: string | null;
  examples?: string | null;
  category?: string | null;
  createdBy?: string | null;
}

export interface UpdateGlossaryEntryInput {
  term?: string;
  definition?: string;
  synonyms?: string | null;
  relatedTerms?: string | null;
  examples?: string | null;
  category?: string | null;
}

export interface ArchitecturePattern {
  id: string;
  repoId: string;
  name: string;
  description: string;
  whenToUse: string | null;
  example: string | null;
  benefits: string | null; // JSON array
  tradeoffs: string | null; // JSON array
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateArchitecturePatternInput {
  id?: string;
  repoId: string;
  name: string;
  description: string;
  whenToUse?: string | null;
  example?: string | null;
  benefits?: string | null;
  tradeoffs?: string | null;
  category?: string | null;
  createdBy?: string | null;
}

export interface UpdateArchitecturePatternInput {
  name?: string;
  description?: string;
  whenToUse?: string | null;
  example?: string | null;
  benefits?: string | null;
  tradeoffs?: string | null;
  category?: string | null;
}

export interface TeamConvention {
  id: string;
  repoId: string;
  category: string;
  rule: string;
  enforced: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateTeamConventionInput {
  id?: string;
  repoId: string;
  category: string;
  rule: string;
  enforced?: boolean;
  createdBy?: string | null;
}

export interface UpdateTeamConventionInput {
  category?: string;
  rule?: string;
  enforced?: boolean;
}

export interface Document {
  id: string;
  repoId: string;
  title: string;
  content: string;
  tags: string | null; // JSON array
  type: 'api-doc' | 'decision' | 'postmortem' | 'general';
  mimeType: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateDocumentInput {
  id?: string;
  repoId: string;
  title: string;
  content: string;
  tags?: string | null;
  type?: 'api-doc' | 'decision' | 'postmortem' | 'general';
  mimeType?: string | null;
  createdBy?: string | null;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  tags?: string | null;
  type?: 'api-doc' | 'decision' | 'postmortem' | 'general';
  mimeType?: string | null;
}
