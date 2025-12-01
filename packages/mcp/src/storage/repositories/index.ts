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
 * Database repositories - all CRUD operations
 * Exports all repository modules
 *
 * Note: Type names use new terminology (Repo/Project/Ticket) but database tables
 * remain as repos/projects/tasks for backward compatibility.
 */

// Users
export * from './users';

// Repos (Database: repos table)
export * from './repos';

// Projects (Database: projects table)
export * from './projects';

// Tickets (Database: tasks table)
export * from './tasks';

// Business Context (rules, glossary, patterns, conventions, documents)
export * from './context';
