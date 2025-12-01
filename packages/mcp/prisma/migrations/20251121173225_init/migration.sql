-- Copyright 2025 BigRack.dev
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--     http://www.apache.org/licenses/LICENSE-2.0
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
-- CreateTable
CREATE TABLE "users"(
    "id" text NOT NULL PRIMARY KEY,
    "email" text,
    "username" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "repos"(
    "id" text NOT NULL PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "visibility" text NOT NULL DEFAULT 'private',
    "gitRepository" text,
    "gitDefaultBranch" text DEFAULT 'main',
    "ownerId" text NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSyncAt" DATETIME,
    "syncVersion" integer NOT NULL DEFAULT 1,
    "vectorClock" text,
    CONSTRAINT "repos_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "repo_members"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "userId" text NOT NULL,
    "role" text NOT NULL DEFAULT 'viewer',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" text,
    CONSTRAINT "repo_members_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "repo_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "business_rules"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "name" text NOT NULL,
    "description" text NOT NULL,
    "validationLogic" text,
    "examples" text,
    "relatedDomains" text,
    "category" text,
    "priority" text NOT NULL DEFAULT 'medium',
    "isActive" boolean NOT NULL DEFAULT TRUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" text,
    "version" integer NOT NULL DEFAULT 1,
    "lastModifiedBy" text,
    CONSTRAINT "business_rules_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "glossary_entries"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "term" text NOT NULL,
    "definition" text NOT NULL,
    "synonyms" text,
    "relatedTerms" text,
    "examples" text,
    "category" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" text,
    CONSTRAINT "glossary_entries_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "architecture_patterns"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "name" text NOT NULL,
    "description" text NOT NULL,
    "whenToUse" text,
    "example" text,
    "benefits" text,
    "tradeoffs" text,
    "category" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" text,
    CONSTRAINT "architecture_patterns_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_conventions"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "category" text NOT NULL,
    "rule" text NOT NULL,
    "enforced" boolean NOT NULL DEFAULT FALSE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" text,
    CONSTRAINT "team_conventions_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "tags" text,
    "type" text NOT NULL DEFAULT 'general',
    "mimeType" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" text,
    CONSTRAINT "documents_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects"(
    "id" text NOT NULL PRIMARY KEY,
    "repoId" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "type" text NOT NULL DEFAULT 'feature',
    "gitBranch" text,
    "gitBaseBranch" text,
    "gitLastCommitSha" text,
    "gitLastCommitMessage" text,
    "gitLastCommitAt" DATETIME,
    "status" text NOT NULL DEFAULT 'planned',
    "progress" integer NOT NULL DEFAULT 0,
    "createdBy" text NOT NULL,
    "assignedTo" text,
    "visibility" text NOT NULL DEFAULT 'private',
    "inheritsFromRepo" boolean NOT NULL DEFAULT TRUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "lastSyncAt" DATETIME,
    "syncVersion" integer NOT NULL DEFAULT 1,
    "vectorClock" text,
    CONSTRAINT "projects_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_contexts"(
    "id" text NOT NULL PRIMARY KEY,
    "projectId" text NOT NULL,
    "content" text NOT NULL,
    "contentType" text NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_contexts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks"(
    "id" text NOT NULL PRIMARY KEY,
    "projectId" text NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "status" text NOT NULL DEFAULT 'pending',
    "priority" text NOT NULL DEFAULT 'medium',
    "order" integer NOT NULL DEFAULT 0,
    "type" text,
    "estimatedTime" text,
    "dependsOn" text,
    "blockedBy" text,
    "assignedTo" text,
    "assignee" text,
    "gitBranch" text,
    "tags" text,
    "validationCriteria" text,
    "externalId" text,
    "objectives" text,
    "relatedTickets" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "commentaries"(
    "id" text NOT NULL PRIMARY KEY,
    "taskId" text NOT NULL,
    "content" text NOT NULL,
    "createdBy" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "commentaries_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "checkpoints"(
    "id" text NOT NULL PRIMARY KEY,
    "projectId" text NOT NULL,
    "state" text NOT NULL,
    "message" text,
    "gitCommitSha" text,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" text,
    CONSTRAINT "checkpoints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_log"(
    "id" text NOT NULL PRIMARY KEY,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "action" text NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" text,
    "syncedToCloud" boolean NOT NULL DEFAULT FALSE,
    "syncedAt" DATETIME,
    "cloudBlobId" text,
    "vectorClock" text,
    "syncAttempts" integer NOT NULL DEFAULT 0,
    "lastSyncError" text
);

-- CreateTable
CREATE TABLE "vector_embeddings"(
    "id" text NOT NULL PRIMARY KEY,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "repoId" text NOT NULL,
    "projectId" text,
    "embedding" text NOT NULL,
    "embeddingModel" text NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    "dimension" integer NOT NULL DEFAULT 384,
    "contentHash" text NOT NULL,
    "category" text,
    "priority" text,
    "chunkIndex" integer NOT NULL DEFAULT 0,
    "totalChunks" integer NOT NULL DEFAULT 1,
    "chunkStartOffset" integer NOT NULL DEFAULT 0,
    "chunkEndOffset" integer NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "repos_ownerId_idx" ON "repos"("ownerId");

-- CreateIndex
CREATE INDEX "repo_members_userId_idx" ON "repo_members"("userId");

-- CreateIndex
CREATE INDEX "repo_members_repoId_idx" ON "repo_members"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "repo_members_repoId_userId_key" ON "repo_members"("repoId", "userId");

-- CreateIndex
CREATE INDEX "business_rules_repoId_idx" ON "business_rules"("repoId");

-- CreateIndex
CREATE INDEX "business_rules_category_idx" ON "business_rules"("category");

-- CreateIndex
CREATE INDEX "glossary_entries_repoId_idx" ON "glossary_entries"("repoId");

-- CreateIndex
CREATE INDEX "architecture_patterns_repoId_idx" ON "architecture_patterns"("repoId");

-- CreateIndex
CREATE INDEX "team_conventions_repoId_idx" ON "team_conventions"("repoId");

-- CreateIndex
CREATE INDEX "documents_repoId_idx" ON "documents"("repoId");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- CreateIndex
CREATE INDEX "projects_repoId_idx" ON "projects"("repoId");

-- CreateIndex
CREATE INDEX "projects_createdBy_idx" ON "projects"("createdBy");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_contexts_projectId_idx" ON "project_contexts"("projectId");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_type_idx" ON "tasks"("type");

-- CreateIndex
CREATE INDEX "commentaries_taskId_idx" ON "commentaries"("taskId");

-- CreateIndex
CREATE INDEX "checkpoints_projectId_idx" ON "checkpoints"("projectId");

-- CreateIndex
CREATE INDEX "sync_log_entityType_entityId_idx" ON "sync_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "sync_log_syncedToCloud_idx" ON "sync_log"("syncedToCloud");

-- CreateIndex
CREATE INDEX "sync_log_timestamp_idx" ON "sync_log"("timestamp");

-- CreateIndex
CREATE INDEX "vector_embeddings_repoId_idx" ON "vector_embeddings"("repoId");

-- CreateIndex
CREATE INDEX "vector_embeddings_projectId_idx" ON "vector_embeddings"("projectId");

-- CreateIndex
CREATE INDEX "vector_embeddings_entityType_idx" ON "vector_embeddings"("entityType");

-- CreateIndex
CREATE INDEX "vector_embeddings_entityType_entityId_idx" ON "vector_embeddings"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "vector_embeddings_contentHash_idx" ON "vector_embeddings"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "vector_embeddings_entityType_entityId_chunkIndex_key" ON "vector_embeddings"("entityType", "entityId", "chunkIndex");

-- ============================================================================
-- TRIGGERS: Cascade delete embeddings when source entities are deleted
-- Since VectorEmbedding uses a polymorphic relationship (entityType + entityId),
-- we cannot use foreign keys. Instead, we use triggers to maintain referential integrity.
-- ============================================================================
-- Trigger: Cascade delete embeddings when BusinessRule is deleted
CREATE TRIGGER IF NOT EXISTS delete_business_rule_embedding
    AFTER DELETE ON business_rules
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'business_rule' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when GlossaryEntry is deleted
CREATE TRIGGER IF NOT EXISTS delete_glossary_embedding
    AFTER DELETE ON glossary_entries
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'glossary_entry' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when ArchitecturePattern is deleted
CREATE TRIGGER IF NOT EXISTS delete_pattern_embedding
    AFTER DELETE ON architecture_patterns
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'pattern' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when TeamConvention is deleted
CREATE TRIGGER IF NOT EXISTS delete_convention_embedding
    AFTER DELETE ON team_conventions
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'convention' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when Document is deleted
CREATE TRIGGER IF NOT EXISTS delete_document_embedding
    AFTER DELETE ON documents
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'document' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when ProjectContext is deleted
CREATE TRIGGER IF NOT EXISTS delete_project_context_embedding
    AFTER DELETE ON project_contexts
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'project_context' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when Task is deleted
CREATE TRIGGER IF NOT EXISTS delete_task_embedding
    AFTER DELETE ON tasks
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    entityType = 'task' AND entityId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when Project is deleted
CREATE TRIGGER IF NOT EXISTS delete_project_embeddings
    AFTER DELETE ON projects
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    projectId = OLD.id;

END;

-- Trigger: Cascade delete embeddings when Repo is deleted
CREATE TRIGGER IF NOT EXISTS delete_repo_embeddings
    AFTER DELETE ON repos
    FOR EACH ROW
BEGIN
    DELETE
FROM
    vector_embeddings
WHERE
    repoId = OLD.id;

END;

-- ============================================================================
-- VSS (Vector Similarity Search) INITIALIZATION
-- ============================================================================
-- sqlite-vss extension provides vector similarity search capabilities
-- Note: The extension must be loaded before using these tables
-- The virtual table vss_embeddings is created dynamically by the application
-- but we create the mapping table here for rowid to UUID mapping
-- Create mapping table for VSS rowid to embedding UUID
-- This table maps integer rowids (used by VSS) to UUID embedding IDs
CREATE TABLE IF NOT EXISTS vector_embeddings_rowid_map(
    rowid integer PRIMARY KEY AUTOINCREMENT,
    embedding_id text NOT NULL,
    CONSTRAINT vector_embeddings_rowid_map_embedding_id_fkey FOREIGN KEY (embedding_id) REFERENCES vector_embeddings(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index on embedding_id (Prisma will create this automatically, but we add it for consistency)
CREATE UNIQUE INDEX IF NOT EXISTS vector_embeddings_rowid_map_embedding_id_key ON vector_embeddings_rowid_map(embedding_id);

