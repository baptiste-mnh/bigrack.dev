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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { daemonLogger } from '../logger';
import { broadcastNotification } from '../cli/gui/broadcast';

export class MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'bigrack-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      daemonLogger.debug('Received tools/list request');

      return {
        tools: [
          {
            name: 'bigrack_create_repo',
            description:
              'Create a new BigRack repo in the current directory. This will create a bigrack.json file and register the repo in the database. Repo name defaults to the folder name if not provided. This is the first step to initialize a repo for BigRack.',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Repo name (optional, defaults to current folder name)',
                },
                description: {
                  type: 'string',
                  description:
                    'Repo description (optional, defaults to Git remote URL if available)',
                },
                workspacePath: {
                  type: 'string',
                  description:
                    'Workspace path where to create the repo (optional, defaults to process.cwd()). Use this if the MCP server is running from a different directory than your workspace.',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_create_project',
            description:
              'Create a new Project within a Repo. Projects are used to organize tickets and track progress. Requires a repo (use bigrack_create_repo first or provide repoId).',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Project name (required)',
                },
                description: {
                  type: 'string',
                  description: 'Project description (optional)',
                },
                repoId: {
                  type: 'string',
                  description: 'Repo ID (optional, will use bigrack.json if not provided)',
                },
                workspacePath: {
                  type: 'string',
                  description:
                    'Workspace path where to find bigrack.json (optional, defaults to process.cwd()). Use this if the MCP server is running from a different directory than your workspace.',
                },
                type: {
                  type: 'string',
                  enum: ['feature', 'bugfix', 'refactor', 'test', 'docs', 'spike'],
                  description: 'Project type (optional, default: feature)',
                },
                inheritsFromRepo: {
                  type: 'boolean',
                  description:
                    'Whether project inherits context from repo (optional, default: true)',
                },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_update_repo',
            description:
              'Update a BigRack repo. Updates repo information in the database and optionally updates bigrack.json if name or description changed. If repoId is not provided, it will be read from bigrack.json at the workspace root.',
            inputSchema: {
              type: 'object',
              properties: {
                repoId: {
                  type: 'string',
                  description: 'Repo ID (optional, will use bigrack.json if not provided)',
                },
                workspacePath: {
                  type: 'string',
                  description:
                    'Workspace path where to find bigrack.json (optional, defaults to process.cwd()). Use this if the MCP server is running from a different directory than your workspace.',
                },
                name: {
                  type: 'string',
                  description: 'Repo name (optional)',
                },
                description: {
                  type: 'string',
                  description: 'Repo description (optional)',
                },
                visibility: {
                  type: 'string',
                  enum: ['private', 'team'],
                  description: 'Repo visibility (optional)',
                },
                gitRepository: {
                  type: 'string',
                  description: 'Git repository URL (optional)',
                },
                gitDefaultBranch: {
                  type: 'string',
                  description: 'Git default branch (optional)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_update_project',
            description:
              'Update a BigRack project. Updates project information in the database. If projectId is not provided, it will be read from bigrack.json at the workspace root.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Project ID (optional, will use bigrack.json if not provided)',
                },
                workspacePath: {
                  type: 'string',
                  description:
                    'Workspace path where to find bigrack.json (optional, defaults to process.cwd()). Use this if the MCP server is running from a different directory than your workspace.',
                },
                name: {
                  type: 'string',
                  description: 'Project name (optional)',
                },
                description: {
                  type: 'string',
                  description: 'Project description (optional)',
                },
                type: {
                  type: 'string',
                  enum: ['feature', 'bugfix', 'refactor', 'test', 'docs', 'spike'],
                  description: 'Project type (optional)',
                },
                status: {
                  type: 'string',
                  enum: ['planned', 'in-progress', 'testing', 'completed', 'cancelled'],
                  description: 'Project status (optional)',
                },
                progress: {
                  type: 'number',
                  description: 'Project progress (0-100) (optional)',
                },
                gitBranch: {
                  type: 'string',
                  description: 'Git branch (optional)',
                },
                gitBaseBranch: {
                  type: 'string',
                  description: 'Git base branch (optional)',
                },
                inheritsFromRepo: {
                  type: 'boolean',
                  description: 'Whether project inherits context from repo (optional)',
                },
                visibility: {
                  type: 'string',
                  enum: ['private', 'team'],
                  description: 'Project visibility (optional)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_store_context',
            description:
              'Store business context (business rules, glossary entries, architecture patterns, team conventions, or documents) to a BigRack repo. This helps maintain persistent business knowledge that Claude can query later. Context can be stored at repo-level (default) or project-specific level (requires projectId and inheritsFromRepo=true). Automatically generates vector embeddings for semantic search.',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['business_rule', 'glossary', 'pattern', 'convention', 'document'],
                  description: 'Type of context to store',
                },
                repoId: {
                  type: 'string',
                  description:
                    'Repo ID (optional, will use bigrack.json or project if not provided)',
                },
                projectId: {
                  type: 'string',
                  description:
                    'Project ID (optional, stores as project-specific context if provided. Requires project.inheritsFromRepo=true)',
                },
                name: {
                  type: 'string',
                  description: 'Name (for business_rule, pattern)',
                },
                description: {
                  type: 'string',
                  description: 'Description (for business_rule, pattern)',
                },
                term: {
                  type: 'string',
                  description: 'Term (for glossary)',
                },
                definition: {
                  type: 'string',
                  description: 'Definition (for glossary)',
                },
                category: {
                  type: 'string',
                  description: 'Category (optional)',
                },
                rule: {
                  type: 'string',
                  description: 'Convention rule (for convention)',
                },
                title: {
                  type: 'string',
                  description: 'Document title (for document)',
                },
                content: {
                  type: 'string',
                  description: 'Document content (for document)',
                },
              },
              required: ['type'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_update_context',
            description:
              'Update business context (rules, glossary, patterns, conventions, documents). Automatically updates vector embeddings if content changes (detected via contentHash). Allows partial updates of context fields.',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['business_rule', 'glossary', 'pattern', 'convention', 'document'],
                  description: 'Type of context to update',
                },
                id: {
                  type: 'string',
                  description: 'ID of the context entity to update',
                },
                name: {
                  type: 'string',
                  description: 'Update name (for business_rule, pattern)',
                },
                description: {
                  type: 'string',
                  description: 'Update description (for business_rule, pattern)',
                },
                term: {
                  type: 'string',
                  description: 'Update term (for glossary)',
                },
                definition: {
                  type: 'string',
                  description: 'Update definition (for glossary)',
                },
                category: {
                  type: 'string',
                  description: 'Update category',
                },
                priority: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                  description: 'Update priority (for business_rule)',
                },
                rule: {
                  type: 'string',
                  description: 'Update convention rule (for convention)',
                },
                title: {
                  type: 'string',
                  description: 'Update document title (for document)',
                },
                content: {
                  type: 'string',
                  description: 'Update document content (for document)',
                },
              },
              required: ['type', 'id'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_delete_context',
            description:
              'Delete business context (rules, glossary, patterns, conventions, documents). Automatically removes vector embeddings via SQL triggers. This operation is irreversible.',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['business_rule', 'glossary', 'pattern', 'convention', 'document'],
                  description: 'Type of context to delete',
                },
                id: {
                  type: 'string',
                  description: 'ID of the context entity to delete',
                },
              },
              required: ['type', 'id'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_query_context',
            description:
              'Query business context using semantic search (RAG). Returns relevant business rules, glossary terms, patterns, conventions, and documents based on natural language queries. If projectId is not provided, searches only in repo-level context (global context). If projectId is provided, searches in both repo-level and project-specific context (with inheritance).',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language query (e.g., "authentication validation rules")',
                },
                repoId: {
                  type: 'string',
                  description: 'Repo ID (optional, will use bigrack.json if not provided)',
                },
                projectId: {
                  type: 'string',
                  description:
                    'Project ID to filter results (optional). If not provided, searches only in repo-level context, not in project-specific context.',
                },
                entityTypes: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['business_rule', 'glossary_entry', 'pattern', 'convention', 'document'],
                  },
                  description: 'Filter by entity types (optional)',
                },
                topK: {
                  type: 'number',
                  description: 'Number of results to return (default: 5)',
                },
                minSimilarity: {
                  type: 'number',
                  description: 'Minimum similarity score 0-1 (default: 0.5)',
                },
                includeMetadata: {
                  type: 'boolean',
                  description: 'Include metadata in results (default: true)',
                },
              },
              required: ['query'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_get_context',
            description:
              'Get context items (business rules, glossary entries, patterns, conventions, documents) with pagination and filters. Returns item names, IDs, and metadata without content. This is a simple query-based retrieval (not semantic search). Use bigrack_query_context for semantic search.',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['business_rule', 'glossary_entry', 'pattern', 'convention', 'document'],
                  },
                  description: 'Filter by context type(s) (optional)',
                },
                repoId: {
                  type: 'string',
                  description: 'Filter by repo ID (optional)',
                },
                projectId: {
                  type: 'string',
                  description: 'Filter by project ID for project-specific context (optional)',
                },
                category: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by category (optional)',
                },
                priority: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                  },
                  description: 'Filter by priority (optional, only for business rules)',
                },
                offset: {
                  type: 'number',
                  description: 'Pagination offset (default: 0)',
                },
                limit: {
                  type: 'number',
                  description: 'Results per page (default: 10, max: 100)',
                },
                orderBy: {
                  type: 'string',
                  enum: ['createdAt', 'updatedAt', 'name', 'title', 'term', 'category'],
                  description: 'Sort field (default: createdAt)',
                },
                orderDirection: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort direction (default: desc)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_decompose_feature',
            description:
              'Get context and guidelines for decomposing a feature into tickets. Returns relevant business rules, patterns, conventions from RAG, plus decomposition guidelines. You (Claude) will then create the tickets and call bigrack_store_tickets.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Project ID to decompose feature for',
                },
                featureDescription: {
                  type: 'string',
                  description: 'High-level description of the feature to implement',
                },
                acceptanceCriteria: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Success criteria for the feature (optional)',
                },
                technicalConstraints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Technical limitations or requirements (optional)',
                },
              },
              required: ['projectId', 'featureDescription'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_store_tickets',
            description:
              'Store decomposed tickets with dependencies in the database. Use this after decomposing a feature into atomic tickets. IMPORTANT: Before creating tickets, you MUST verify the context by querying repo and project context using bigrack_query_context. Set isContextVerified to true only if you have actually verified the context. This ensures tickets align with existing business rules, patterns, and conventions.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Project ID to store tasks for',
                },
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: {
                        type: 'string',
                        description: 'Task title',
                      },
                      description: {
                        type: 'string',
                        description: 'Detailed task description (optional)',
                      },
                      dependencies: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'List of task titles this task depends on (optional)',
                      },
                      estimatedTime: {
                        type: 'string',
                        description: 'Estimated time (e.g., "2h", "30min", "1d") (optional)',
                      },
                      type: {
                        type: 'string',
                        enum: ['setup', 'implementation', 'testing', 'documentation'],
                        description: 'Task type (optional)',
                      },
                      validationCriteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'How to verify task completion (optional)',
                      },
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags for categorization (optional)',
                      },
                      externalId: {
                        type: 'string',
                        description:
                          'Original ticket ID (e.g., "#125") for migration/backward compatibility (optional)',
                      },
                      objectives: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Checklist of objectives (optional)',
                      },
                      relatedTickets: {
                        type: 'array',
                        items: { type: 'string' },
                        description:
                          'Related ticket IDs as an array of strings (optional). Example: array of ticket IDs like "#107" or "#126"',
                      },
                      priority: {
                        type: 'string',
                        enum: ['critical', 'high', 'medium', 'low'],
                        description: 'Task priority (optional, default: medium)',
                      },
                    },
                    required: ['title'],
                  },
                  description: 'Array of tasks to store',
                },
                isContextVerified: {
                  type: 'boolean',
                  description:
                    'Set to true only if you have verified the context using bigrack_query_context before creating these tickets. You must query both repo-level context (repoId) and project-level context (projectId) to check for relevant business rules, patterns, conventions, and glossary terms. Default is false.',
                },
              },
              required: ['projectId', 'tasks'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_get_repo_state',
            description:
              'Get repo state: list of projects and repo-level context. Returns the repo information, all projects in the repo with their IDs and names, and repo-level context (business rules, glossary, patterns, conventions, documents). Use this to get an overview of the repo. If repoId is not provided, it will be read from bigrack.json at the workspace root.',
            inputSchema: {
              type: 'object',
              properties: {
                repoId: {
                  type: 'string',
                  description:
                    'Repo ID (optional, will use bigrack.json if not provided). You can find the repo ID in the bigrack.json file at the workspace root.',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_get_project_info',
            description:
              'Get detailed project information: tickets, execution plan, checkpoints, and project-specific context. Returns project details, ticket list with dependencies, execution plan (which tickets can be started), checkpoints, and project-specific context elements. Use this to get detailed information about a specific project. If projectId is not provided, it will be read from bigrack.json at the workspace root.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description:
                    'Project ID to get info for (optional, will use bigrack.json if not provided). You can find the project ID in the bigrack.json file at the workspace root.',
                },
                includeCompletedTasks: {
                  type: 'boolean',
                  description: 'Include completed tasks in the list (default: false)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_get_project_state',
            description:
              '⚠️ DEPRECATED: Use bigrack_get_repo_state or bigrack_get_project_info instead. Get current project state including tickets, progress, execution plan, and checkpoints. Shows which tickets are available to start, blocked, or completed. Returns both repo-level context (business rules, glossary, patterns, conventions, documents) and project-specific context. If projectId is not provided, it will be read from bigrack.json at the workspace root.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description:
                    'Project ID to get state for. Optional: if not provided, will be read from bigrack.json file at the workspace root (e.g., /path/to/workspace/bigrack.json). The file contains a "projects" array with project IDs.',
                },
                includeCompletedTasks: {
                  type: 'boolean',
                  description: 'Include completed tasks in the list (default: false)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_get_next_step',
            description:
              'Get intelligent recommendations for the next ticket(s) to work on based on priority, dependencies, and current project state. Returns only available (non-blocked) tickets sorted by priority. If projectId is not provided, it will use the currentProject from bigrack.json. If no currentProject is set and multiple projects exist, it will ask you to select a project first using bigrack_select_project.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description:
                    'Project ID to get recommendations for (optional, will use bigrack.json if not provided). You can find the project ID in the bigrack.json file at the workspace root.',
                },
                limit: {
                  type: 'number',
                  description: 'Number of tasks to return (default: 3)',
                },
                includeTesting: {
                  type: 'boolean',
                  description: 'Include testing tasks in recommendations (default: true)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_search_ticket',
            description:
              'Search for tickets using semantic search (RAG pipeline with vector embeddings). Supports filtering by project, repo, status, priority, type, and pagination.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query',
                },
                projectId: {
                  type: 'string',
                  description: 'Filter by project ID (optional)',
                },
                repoId: {
                  type: 'string',
                  description: 'Filter by repo ID (optional)',
                },
                status: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['pending', 'in-progress', 'completed', 'blocked'],
                  },
                  description: 'Filter by status (optional)',
                },
                priority: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                  },
                  description: 'Filter by priority (optional)',
                },
                type: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['setup', 'implementation', 'testing', 'documentation'],
                  },
                  description: 'Filter by type (optional)',
                },
                offset: {
                  type: 'number',
                  description: 'Pagination offset (default: 0)',
                },
                limit: {
                  type: 'number',
                  description: 'Results per page (default: 10, max: 50)',
                },
                minSimilarity: {
                  type: 'number',
                  description: 'Minimum similarity score 0-1 (default: 0.5)',
                },
              },
              required: ['query'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_get_tickets',
            description:
              'Get tickets with pagination and filters. Supports filtering by ticket ID(s), project, repo, status, priority, type, and sorting. This is a simple query-based retrieval (not semantic search).',
            inputSchema: {
              type: 'object',
              properties: {
                taskId: {
                  oneOf: [
                    {
                      type: 'string',
                      description: 'Filter by a single ticket ID',
                    },
                    {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Filter by multiple ticket IDs',
                    },
                  ],
                  description: 'Filter by ticket ID(s) (optional)',
                },
                projectId: {
                  type: 'string',
                  description: 'Filter by project ID (optional)',
                },
                repoId: {
                  type: 'string',
                  description: 'Filter by repo ID (optional)',
                },
                status: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['pending', 'in-progress', 'completed', 'blocked'],
                  },
                  description: 'Filter by status (optional)',
                },
                priority: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                  },
                  description: 'Filter by priority (optional)',
                },
                type: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['setup', 'implementation', 'testing', 'documentation'],
                  },
                  description: 'Filter by type (optional)',
                },
                offset: {
                  type: 'number',
                  description: 'Pagination offset (default: 0)',
                },
                limit: {
                  type: 'number',
                  description: 'Results per page (default: 10, max: 100)',
                },
                orderBy: {
                  type: 'string',
                  enum: ['createdAt', 'updatedAt', 'order', 'priority', 'status'],
                  description: 'Sort field (default: order)',
                },
                orderDirection: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort direction (default: asc)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_select_project',
            description:
              'Select a project as the current project in bigrack.json. This makes it easier to work with a specific project without passing projectId every time. You can provide either projectId or projectName to select the project.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Project ID to select (optional if projectName is provided)',
                },
                projectName: {
                  type: 'string',
                  description: 'Project name to select (optional if projectId is provided)',
                },
                repoId: {
                  type: 'string',
                  description: 'Repo ID (optional, will use bigrack.json if not provided)',
                },
              },
              required: [],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_update_ticket',
            description:
              'Update ticket properties (priority, status, description, git branch, assignee, etc.). Similar to Linear, allows partial updates of ticket metadata.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Project ID containing the task',
                },
                taskId: {
                  type: 'string',
                  description: 'Task ID to update (either taskId or taskTitle required)',
                },
                taskTitle: {
                  type: 'string',
                  description: 'Task title to update (either taskId or taskTitle required)',
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'in-progress', 'completed', 'blocked'],
                  description: 'Update task status (optional)',
                },
                priority: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                  description: 'Update task priority (optional)',
                },
                description: {
                  type: 'string',
                  description: 'Update task description (optional)',
                },
                estimatedTime: {
                  type: 'string',
                  description: 'Update estimated time (e.g., "2h", "1d") (optional)',
                },
                assignee: {
                  type: 'string',
                  description: 'Update assignee (optional)',
                },
                gitBranch: {
                  type: 'string',
                  description: 'Update git branch tracking (optional)',
                },
                type: {
                  type: 'string',
                  enum: ['setup', 'implementation', 'testing', 'documentation'],
                  description: 'Update task type (optional)',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Update tags (optional)',
                },
                validationCriteria: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Update validation criteria (optional)',
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Update dependencies (task titles) (optional)',
                },
                externalId: {
                  type: 'string',
                  description: 'Update original ticket ID (e.g., "#125") (optional)',
                },
                objectives: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Update checklist of objectives (optional)',
                },
                relatedTickets: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Update related ticket IDs as an array of strings (optional). Example: array of ticket IDs like "#107" or "#126"',
                },
              },
              required: ['projectId'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_delete_ticket',
            description:
              'Delete a ticket from a project. If other tickets depend on this ticket, their dependencies will be automatically updated to remove the deleted ticket. The ticket can be identified by either taskId or taskTitle.',
            inputSchema: {
              type: 'object',
              properties: {
                projectId: {
                  type: 'string',
                  description: 'Project ID containing the task',
                },
                taskId: {
                  type: 'string',
                  description: 'Task ID to delete (either taskId or taskTitle required)',
                },
                taskTitle: {
                  type: 'string',
                  description: 'Task title to delete (either taskId or taskTitle required)',
                },
                force: {
                  type: 'boolean',
                  description:
                    'Force deletion even if other tickets depend on it (optional, default: false). If false and dependencies exist, deletion will proceed but dependencies will be updated.',
                },
              },
              required: ['projectId'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_ticket_comment_list',
            description:
              'List comments for a ticket. Returns comments with pagination support. Comment content supports Markdown formatting.',
            inputSchema: {
              type: 'object',
              properties: {
                taskId: {
                  type: 'string',
                  description: 'Ticket/task ID to get comments for (required)',
                },
                offset: {
                  type: 'number',
                  description: 'Pagination offset (default: 0)',
                },
                limit: {
                  type: 'number',
                  description: 'Results per page (default: 20, max: 100)',
                },
                orderBy: {
                  type: 'string',
                  enum: ['createdAt', 'updatedAt'],
                  description: 'Sort field (default: createdAt)',
                },
                orderDirection: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort direction (default: desc)',
                },
              },
              required: ['taskId'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_ticket_comment_create',
            description:
              'Create a new comment on a ticket. Comment content supports Markdown formatting. Use this to document work done, add notes, or provide updates on the ticket.',
            inputSchema: {
              type: 'object',
              properties: {
                taskId: {
                  type: 'string',
                  description: 'Ticket/task ID to add comment to (required)',
                },
                content: {
                  type: 'string',
                  description:
                    'Comment content (required). Supports Markdown formatting for rich text.',
                },
                createdBy: {
                  type: 'string',
                  description: 'User ID who created the comment (optional)',
                },
              },
              required: ['taskId', 'content'],
              additionalProperties: false,
            },
          },
          {
            name: 'bigrack_ticket_comment_update',
            description:
              'Update an existing comment on a ticket. Comment content supports Markdown formatting.',
            inputSchema: {
              type: 'object',
              properties: {
                commentId: {
                  type: 'string',
                  description: 'Comment ID to update (required)',
                },
                content: {
                  type: 'string',
                  description:
                    'Updated comment content (required). Supports Markdown formatting for rich text.',
                },
              },
              required: ['commentId', 'content'],
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        daemonLogger.info({ tool: request.params.name }, 'Tool called');

        const { name, arguments: args } = request.params;

        // Validate arguments are an object (should already be parsed by SDK)
        if (args && typeof args !== 'object') {
          daemonLogger.error({ args, argsType: typeof args }, 'Invalid arguments type');
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid arguments type. Expected object, got ${typeof args}`,
              },
            ],
            isError: true,
          };
        }

        // Log arguments for debugging (safely stringify)
        try {
          daemonLogger.debug(
            {
              tool: name,
              argsKeys: args ? Object.keys(args) : [],
              argsType: typeof args,
            },
            'Processing tool call'
          );
        } catch (logError) {
          daemonLogger.warn({ err: logError }, 'Failed to log arguments');
        }

        switch (name) {
          case 'bigrack_create_repo':
            return await this.handleBigrackCreateRepo(args || {});

          case 'bigrack_create_project':
            return await this.handleBigrackCreateProject(args || {});

          case 'bigrack_update_repo':
            return await this.handleBigrackUpdateRepo(args || {});

          case 'bigrack_update_project':
            return await this.handleBigrackUpdateProject(args || {});

          case 'bigrack_store_context':
            return await this.handleBigrackStoreContext(args || {});

          case 'bigrack_update_context':
            return await this.handleBigrackUpdateContext(args || {});

          case 'bigrack_delete_context':
            return await this.handleBigrackDeleteContext(args || {});

          case 'bigrack_query_context':
            return await this.handleBigrackQueryContext(args || {});

          case 'bigrack_get_context':
            return await this.handleBigrackGetContext(args || {});

          case 'bigrack_decompose_feature':
            return await this.handleBigrackDecomposeFeature(args || {});

          case 'bigrack_store_tickets':
            return await this.handleBigrackStoreTasks(args || {});

          case 'bigrack_get_repo_state':
            return await this.handleBigrackGetRepoState(args || {});

          case 'bigrack_get_project_info':
            return await this.handleBigrackGetProjectInfo(args || {});

          case 'bigrack_get_project_state':
            return await this.handleBigrackGetProjectState(args || {});

          case 'bigrack_get_next_step':
            return await this.handleBigrackGetNextStep(args || {});

          case 'bigrack_search_ticket':
            return await this.handleBigrackSearchTicket(args || {});

          case 'bigrack_get_tickets':
            return await this.handleBigrackGetTickets(args || {});

          case 'bigrack_update_ticket':
            return await this.handleBigrackUpdateTask(args || {});

          case 'bigrack_delete_ticket':
            return await this.handleBigrackDeleteBox(args || {});

          case 'bigrack_select_project':
            return await this.handleBigrackSelectProject(args || {});

          case 'bigrack_ticket_comment_list':
            return await this.handleBigrackTicketCommentList(args || {});

          case 'bigrack_ticket_comment_create':
            return await this.handleBigrackTicketCommentCreate(args || {});

          case 'bigrack_ticket_comment_update':
            return await this.handleBigrackTicketCommentUpdate(args || {});

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        daemonLogger.error({ err: error, tool: request.params.name }, 'Error handling tool call');
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleBigrackCreateRepo(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_create_repo');

    const { bigrackCreateRack } = await import('./tools');
    const result = await bigrackCreateRack(args);

    // Broadcast notification if successful
    if (result.success && result.repoId) {
      broadcastNotification({
        type: 'repo_created',
        action: 'create',
        entityId: result.repoId,
        entityType: 'repo',
        title: `Repo "${result.projectName || 'Unnamed'}" created`,
        description: result.message,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.message : `❌ ${result.message}`,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleBigrackCreateProject(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_create_project');

    const { bigrackCreatePallet } = await import('./tools');
    const result = await bigrackCreatePallet(
      args as unknown as Parameters<typeof bigrackCreatePallet>[0]
    );

    // Broadcast notification if successful
    if (result.success && result.projectId) {
      broadcastNotification({
        type: 'project_created',
        action: 'create',
        entityId: result.projectId,
        entityType: 'project',
        title: `Project "${args.name}" created`,
        description: result.message,
        repoId: args.repoId,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.message : `❌ ${result.message}`,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleBigrackUpdateRepo(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_update_repo');

    const { bigrackUpdateRepo } = await import('./tools');
    const result = await bigrackUpdateRepo(args);

    // Broadcast notification if successful
    if (result.success && result.repo) {
      broadcastNotification({
        type: 'repo_updated',
        action: 'update',
        entityId: result.repo.id,
        entityType: 'repo',
        title: `Repo "${result.repo.name}" updated`,
        description: result.message,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.message : `❌ ${result.message}\n\n${result.error || ''}`,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleBigrackUpdateProject(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_update_project');

    const { bigrackUpdateProject } = await import('./tools');
    const result = await bigrackUpdateProject(args);

    // Broadcast notification if successful
    if (result.success && result.project) {
      broadcastNotification({
        type: 'project_updated',
        action: 'update',
        entityId: result.project.id,
        entityType: 'project',
        title: `Project "${result.project.name}" updated`,
        description: result.message,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.message : `❌ ${result.message}\n\n${result.error || ''}`,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleBigrackStoreContext(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_store_context');

    const { bigrackStoreContext } = await import('./tools');
    const result = await bigrackStoreContext(
      args as unknown as Parameters<typeof bigrackStoreContext>[0]
    );

    // Broadcast notification if successful
    if (result.success && result.id) {
      const entityName =
        (args.name as string) || (args.term as string) || (args.title as string) || 'Context';
      const contextType = args.type as string;
      broadcastNotification({
        type: 'context_added',
        action: 'create',
        entityId: result.id,
        entityType: contextType,
        title: `${contextType.replace('_', ' ')} "${entityName}" added`,
        description: result.message || 'Context stored successfully',
        repoId: args.repoId,
        projectId: args.projectId,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleBigrackUpdateContext(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_update_context');

    const { bigrackUpdateContext } = await import('./tools');
    const result = await bigrackUpdateContext(
      args as unknown as Parameters<typeof bigrackUpdateContext>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification
    if (result.success && result.id) {
      broadcastNotification({
        type: 'context_updated',
        action: 'update',
        entityId: result.id,
        entityType: result.type,
        title: `Context updated`,
        description: result.message,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ ${result.message}\n\n**ID:** ${result.id}\n**Type:** ${result.type}${result.embeddingUpdated ? '\n**Embedding:** Updated ✓' : ''}`,
        },
      ],
    };
  }

  private async handleBigrackDeleteContext(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_delete_context');

    const { bigrackDeleteContext } = await import('./tools');
    const result = await bigrackDeleteContext(
      args as unknown as Parameters<typeof bigrackDeleteContext>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification
    if (result.success && args.id) {
      const contextId = args.id as string;
      const contextType = args.type as string;
      broadcastNotification({
        type: 'context_deleted',
        action: 'delete',
        entityId: contextId,
        entityType: contextType,
        title: `Context deleted`,
        description: result.message,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ ${result.message}\n\n**ID:** ${result.id}\n**Type:** ${result.type}${result.embeddingDeleted ? '\n**Embedding:** Deleted ✓' : ''}`,
        },
      ],
    };
  }

  private async handleBigrackQueryContext(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_query_context');

    const { bigrackQueryContext } = await import('./tools');
    const result = await bigrackQueryContext(
      args as unknown as Parameters<typeof bigrackQueryContext>[0]
    );

    return {
      content: [
        {
          type: 'text',
          text: result.message + '\n\n' + result.results.map((r) => r.content).join('\n\n---\n\n'),
        },
      ],
    };
  }

  private async handleBigrackGetContext(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_get_context');

    const { bigrackGetContext } = await import('./tools');
    const result = await bigrackGetContext(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { results } = result;

    if (!results || results.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `## 📚 Context Items

**Results:** 0 items found

No context items match your filters.`,
          },
        ],
      };
    }

    const formatted = `## 📚 Context Items

**Total Results:** ${results.total}
**Showing:** ${results.offset + 1}-${Math.min(results.offset + results.limit, results.total)} of ${results.total}
${results.hasMore ? '**Has More:** Yes (use offset parameter to paginate)' : ''}

${results.items
  .map((item, i) => {
    const typeIcon =
      item.type === 'business_rule'
        ? '📋'
        : item.type === 'glossary_entry'
          ? '📖'
          : item.type === 'pattern'
            ? '🏗️'
            : item.type === 'convention'
              ? '⚙️'
              : '📄';
    const priorityLabel = item.priority ? ` [${item.priority}]` : '';
    const categoryLabel = item.category ? ` - ${item.category}` : '';
    const projectLabel = item.projectId ? ` (project-specific)` : '';

    return `${results.offset + i + 1}. ${typeIcon} **${item.name}**${priorityLabel}${categoryLabel}${projectLabel}
   **ID:** ${item.id}
   **Type:** ${item.type}
   **Created:** ${new Date(item.createdAt).toLocaleDateString()}
   **Updated:** ${new Date(item.updatedAt).toLocaleDateString()}`;
  })
  .join('\n\n')}

${results.hasMore ? `\n**To see more results:** Use \`offset: ${results.offset + results.limit}\` parameter` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackDecomposeFeature(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_decompose_feature');

    const { bigrackDecomposeFeature } = await import('./tools');
    const result = await bigrackDecomposeFeature(
      args as unknown as Parameters<typeof bigrackDecomposeFeature>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { context } = result;
    const formatted = `## 📋 Feature Decomposition - Available Context

**Project:** ${context!.projectName} (${context!.repoName})
**Feature:** ${context!.featureDescription}

${
  context!.acceptanceCriteria && context!.acceptanceCriteria.length > 0
    ? `
### ✅ Acceptance Criteria
${context!.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`
    : ''
}

${
  context!.technicalConstraints && context!.technicalConstraints.length > 0
    ? `
### ⚠️ Technical Constraints
${context!.technicalConstraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`
    : ''
}

---

### 📚 Available Context (${context!.availableContext.totalCount} items)

${
  context!.availableContext.businessRules.length > 0
    ? `
**Business Rules (${context!.availableContext.businessRules.length}):**
${context!.availableContext.businessRules.map((r) => `- ${r}`).join('\n')}
`
    : ''
}

${
  context!.availableContext.patterns.length > 0
    ? `
**Architecture Patterns (${context!.availableContext.patterns.length}):**
${context!.availableContext.patterns.map((p) => `- ${p}`).join('\n')}
`
    : ''
}

${
  context!.availableContext.conventions.length > 0
    ? `
**Team Conventions (${context!.availableContext.conventions.length}):**
${context!.availableContext.conventions.map((c) => `- ${c}`).join('\n')}
`
    : ''
}

---

### 🔧 Available Tools

**1. ${context!.availableTools.queryContext.name}**
${context!.availableTools.queryContext.description}

Usage: \`bigrack_query_context({ query: "PCI compliance payment", repoId: "${context!.repoId}" })\`

**2. ${context!.availableTools.storeTasks.name}**
${context!.availableTools.storeTasks.description}

---

### 🎯 Decomposition Guidelines

${context!.decompositionGuidelines.join('\n')}

---

### 💡 Suggested Workflow

1. Review the available context items listed above
2. If needed, call **${context!.availableTools.queryContext.name}** to get full details on specific rules/patterns
3. Decompose the feature into atomic tasks based on the context
4. Call **${context!.availableTools.storeTasks.name}** to save the tasks

Example:
\`\`\`
bigrack_store_tickets({
  projectId: "${context!.projectId}",
  isContextVerified: true,
  tasks: [
    { title: "Setup dependencies", dependencies: [], type: "setup" },
    { title: "Implement core logic", dependencies: ["Setup dependencies"], type: "implementation" }
  ]
})
\`\`\`

⚠️ **Important**: Always set \`isContextVerified: true\` only after you have actually queried the context using \`bigrack_query_context\` with both the repo (repoId) and project (projectId) to check for relevant business rules, patterns, and conventions.
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackStoreTasks(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_store_tickets');

    const { bigrackStoreBoxes } = await import('./tools');
    const result = await bigrackStoreBoxes(
      args as unknown as Parameters<typeof bigrackStoreBoxes>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification for each created ticket
    if (result.tasks && result.tasks.length > 0) {
      result.tasks.forEach((task) => {
        broadcastNotification({
          type: 'ticket_created',
          action: 'create',
          entityId: task.id,
          entityType: 'ticket',
          title: `Ticket "${task.title}" created`,
          description: `Ticket created in project`,
          projectId: args.projectId,
        });
      });
    }

    const formatted = `## ✅ Tasks Stored Successfully

**Stored:** ${result.taskCount} tasks

### 📋 Task List

${result.tasks!.map((t, i) => `${i + 1}. ${t.title} (ID: ${t.id.substring(0, 8)}...)`).join('\n')}

All tasks have been saved to the project with their dependencies.
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackGetRepoState(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_get_repo_state');

    const { bigrackGetRackState } = await import('./tools');
    const result = await bigrackGetRackState(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { state } = result;

    const formatted = `## 📦 Repo State - ${state!.rack.name}

### 📚 Repo Info
- **ID:** ${state!.rack.id}
${state!.rack.description ? `- **Description:** ${state!.rack.description}` : ''}
- **Created:** ${new Date(state!.rack.createdAt).toLocaleDateString()}

### 📁 Projects (${state!.pallets.total})
${
  state!.pallets.list.length > 0
    ? state!.pallets.list
        .map((project) => {
          const statusIcon =
            project.status === 'completed'
              ? '✅'
              : project.status === 'in-progress'
                ? '🔄'
                : project.status === 'testing'
                  ? '🧪'
                  : '📋';
          return `
${statusIcon} **${project.name}** (ID: \`${project.id}\`)
  - Type: ${project.type}
  - Status: ${project.status}
  - Progress: ${project.progress}%
${project.description ? `  - ${project.description}` : ''}
`;
        })
        .join('\n')
    : 'No projects yet. Create one with bigrack_create_project.'
}

### 📖 Repo-Level Context (${state!.context.total})
- **Business Rules:** ${state!.context.byType.business_rule}
- **Glossary Entries:** ${state!.context.byType.glossary_entry}
- **Architecture Patterns:** ${state!.context.byType.pattern}
- **Team Conventions:** ${state!.context.byType.convention}
- **Documents:** ${state!.context.byType.document}

${
  state!.context.list.length > 0
    ? `
### 📚 Context Elements

${state!.context.list
  .map((ctx) => {
    const typeIcon =
      ctx.type === 'business_rule'
        ? '📋'
        : ctx.type === 'glossary_entry'
          ? '📖'
          : ctx.type === 'pattern'
            ? '🏗️'
            : ctx.type === 'convention'
              ? '⚙️'
              : '📄';
    return `${typeIcon} **${ctx.title}** (${ctx.type})${ctx.category ? ` - ${ctx.category}` : ''}${ctx.priority ? ` [${ctx.priority}]` : ''}`;
  })
  .join('\n')}
`
    : ''
}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackGetProjectInfo(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_get_project_info');

    const { bigrackGetProjectInfo } = await import('./tools');
    const result = await bigrackGetProjectInfo(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { info } = result;

    const formatted = `## 📊 Project Info - ${info!.project.name}

### 🏗️ Project Details
- **Repo:** ${info!.project.repoName}
- **Type:** ${info!.project.type}
- **Status:** ${info!.project.status}
- **Progress:** ${info!.project.progress}% complete
- **Inherits from Repo:** ${info!.project.inheritsFromRepo ? 'Yes' : 'No'}
${info!.project.description ? `- **Description:** ${info!.project.description}` : ''}
${info!.project.gitBranch ? `- **Branch:** ${info!.project.gitBranch}` : ''}
${info!.project.gitLastCommit ? `- **Last Commit:** ${info!.project.gitLastCommit}` : ''}

### 📋 Tasks Overview
- **Total:** ${info!.tasks.total}
- **Pending:** ${info!.tasks.byStatus.pending}
- **In Progress:** ${info!.tasks.byStatus.inProgress}
- **Completed:** ${info!.tasks.byStatus.completed}
- **Blocked:** ${info!.tasks.byStatus.blocked}

### 🎯 Execution Plan
- **Available to start:** ${info!.executionPlan.availableTasks.length} tasks
- **Blocked:** ${info!.executionPlan.blockedTasks.length} tasks
${info!.executionPlan.nextRecommended ? `- **✨ Next recommended:** ${info!.tasks.list.find((t) => t.id === info!.executionPlan.nextRecommended)?.title}` : ''}

### 📝 Task List
${info!.tasks.list
  .map((task) => {
    const statusIcon =
      task.status === 'completed'
        ? '✅'
        : task.status === 'in-progress'
          ? '🔄'
          : task.isBlocked
            ? '🚫'
            : task.canStart
              ? '🟢'
              : '⚪';
    const priorityLabel = task.priority !== 'medium' ? ` [${task.priority}]` : '';
    return `${statusIcon} **${task.title}**${priorityLabel}
${task.description ? `   ${task.description}` : ''}
   Status: ${task.status}${task.dependencies.length > 0 ? ` | Deps: ${task.dependencies.length}` : ''}${task.isBlocked ? ' | BLOCKED' : ''}`;
  })
  .join('\n\n')}

${
  info!.projectContext.total > 0
    ? `
### 📚 Project-Specific Context (${info!.projectContext.total})

${info!.projectContext.list
  .map((ctx) => {
    return `📄 **${ctx.contentType}**
${ctx.content.substring(0, 200)}${ctx.content.length > 200 ? '...' : ''}
`;
  })
  .join('\n')}
`
    : ''
}

${
  info!.checkpoints.length > 0
    ? `
### 🔖 Recent Checkpoints
${info!.checkpoints.map((cp) => `- ${new Date(cp.createdAt).toLocaleString()}${cp.message ? `: ${cp.message}` : ''}${cp.gitCommitSha ? ` (${cp.gitCommitSha.substring(0, 7)})` : ''}`).join('\n')}
`
    : ''
}

${
  info!.localConfig
    ? `
### 📄 Local Config (bigrack.json)
- **Repo Name:** ${info!.localConfig.name}
- **Repo ID:** ${info!.localConfig.repoId}
${info!.localConfig.description ? `- **Description:** ${info!.localConfig.description}` : ''}
${info!.localConfig.projects && info!.localConfig.projects.length > 0 ? `- **Projects:** ${info!.localConfig.projects.length} project(s)` : ''}
${info!.localConfig.currentProject ? `- **Current Project:** ${info!.localConfig.currentProject}` : ''}
- **Created:** ${new Date(info!.localConfig.createdAt).toLocaleString()}
`
    : ''
}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackGetProjectState(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_get_project_state [DEPRECATED]');

    const { bigrackGetProjectState } = await import('./tools');
    const result = await bigrackGetProjectState(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { state } = result;

    const formatted = `## 📊 Project State - ${state!.project.name}

### 🏗️ Project Info
- **Repo:** ${state!.project.repoName}
- **Type:** ${state!.project.type}
- **Status:** ${state!.project.status}
- **Progress:** ${state!.project.progress}% complete
${state!.project.gitBranch ? `- **Branch:** ${state!.project.gitBranch}` : ''}
${state!.project.gitLastCommit ? `- **Last Commit:** ${state!.project.gitLastCommit}` : ''}

### 📋 Tasks Overview
- **Total:** ${state!.tasks.total}
- **Pending:** ${state!.tasks.byStatus.pending}
- **In Progress:** ${state!.tasks.byStatus.inProgress}
- **Completed:** ${state!.tasks.byStatus.completed}
- **Blocked:** ${state!.tasks.byStatus.blocked}

### 🎯 Execution Plan
- **Available to start:** ${state!.executionPlan.availableTasks.length} tasks
- **Blocked:** ${state!.executionPlan.blockedTasks.length} tasks
${state!.executionPlan.nextRecommended ? `- **✨ Next recommended:** ${state!.tasks.list.find((t) => t.id === state!.executionPlan.nextRecommended)?.title}` : ''}

### 📝 Task List
${state!.tasks.list
  .map((task) => {
    const statusIcon =
      task.status === 'completed'
        ? '✅'
        : task.status === 'in-progress'
          ? '🔄'
          : task.isBlocked
            ? '🚫'
            : task.canStart
              ? '🟢'
              : '⚪';
    const priorityIcon =
      task.priority === 'critical'
        ? '🔴'
        : task.priority === 'high'
          ? '🟠'
          : task.priority === 'medium'
            ? '🟡'
            : '🟢';
    return `${statusIcon} ${priorityIcon} **${task.title}** (${task.status})
   ${task.description ? `   ${task.description}` : ''}
   ${task.dependencies.length > 0 ? `   Dependencies: ${task.dependencies.length}` : ''}
   ${task.isBlocked ? `   ⚠️ Blocked by dependencies` : ''}
   ${task.canStart ? `   ✅ Ready to start` : ''}`;
  })
  .join('\n\n')}

${state!.checkpoints.length > 0 ? `### 🔖 Recent Checkpoints\n${state!.checkpoints.map((cp) => `- ${cp.createdAt}: ${cp.message || 'Checkpoint'}`).join('\n')}` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackGetNextStep(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_get_next_step');

    const { bigrackGetNextStep } = await import('./tools');
    const result = await bigrackGetNextStep(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { recommendations, reminders } = result;

    if (!recommendations || recommendations.tasks.length === 0) {
      const remindersText =
        reminders && reminders.length > 0 ? `\n\n---\n\n${reminders.join('\n')}` : '';
      return {
        content: [
          {
            type: 'text',
            text: `## 🎯 Next Step Recommendations - ${recommendations?.projectName || 'Project'}

No tasks available to start right now. All pending tasks are blocked by dependencies.${remindersText}`,
          },
        ],
      };
    }

    const formatted = `## 🎯 Next Step Recommendations - ${recommendations.projectName}

**Available tasks:** ${recommendations.totalAvailable}
**Showing:** ${recommendations.tasks.length} recommended task(s)

${recommendations.tasks
  .map((task, i) => {
    const priorityIcon =
      task.priority === 'critical'
        ? '🔴'
        : task.priority === 'high'
          ? '🟠'
          : task.priority === 'medium'
            ? '🟡'
            : '🟢';

    return `### ${i + 1}. ${priorityIcon} ${task.title}

${task.description ? `**Description:** ${task.description}\n` : ''}
**Priority:** ${task.priority}${task.type ? ` | **Type:** ${task.type}` : ''}${task.estimatedTime ? ` | **Estimated:** ${task.estimatedTime}` : ''}
**Dependencies:** ${task.dependencies.length > 0 ? `${task.dependencies.length} (all completed ✅)` : 'None'}
${task.reason ? `**Recommendation:** ${task.reason}` : ''}
${
  task.validationCriteria && task.validationCriteria.length > 0
    ? `
**Validation Criteria:**
${task.validationCriteria.map((c) => `- ${c}`).join('\n')}
`
    : ''
}`;
  })
  .join('\n\n---\n\n')}
${reminders && reminders.length > 0 ? `\n\n---\n\n${reminders.join('\n')}` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackSearchTicket(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_search_ticket');

    const { bigrackSearchBox } = await import('./tools');
    const result = await bigrackSearchBox(
      args as unknown as Parameters<typeof bigrackSearchBox>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { results } = result;

    if (!results || results.tasks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `## 🔍 Search Results

**Query:** "${results?.query || args.query}"
**Results:** 0 tasks found

No tasks match your search criteria.`,
          },
        ],
      };
    }

    const formatted = `## 🔍 Search Results

**Query:** "${results.query}"
**Total Results:** ${results.total}
**Showing:** ${results.offset + 1}-${Math.min(results.offset + results.limit, results.total)} of ${results.total}
${results.hasMore ? '**Has More:** Yes (use offset parameter to paginate)' : ''}

${results.tasks
  .map((task, i) => {
    const priorityIcon =
      task.priority === 'critical'
        ? '🔴'
        : task.priority === 'high'
          ? '🟠'
          : task.priority === 'medium'
            ? '🟡'
            : '🟢';
    const statusIcon =
      task.status === 'completed'
        ? '✅'
        : task.status === 'in-progress'
          ? '🔄'
          : task.status === 'blocked'
            ? '🚫'
            : '⚪';

    return `### ${results.offset + i + 1}. ${statusIcon} ${priorityIcon} ${task.title}

${task.description ? `**Description:** ${task.description}\n` : ''}
**Status:** ${task.status} | **Priority:** ${task.priority}${task.type ? ` | **Type:** ${task.type}` : ''}
**Similarity:** ${(task.similarity * 100).toFixed(0)}%${task.estimatedTime ? ` | **Estimated:** ${task.estimatedTime}` : ''}
**Project:** ${task.projectName} (${task.repoName})
**Created:** ${new Date(task.createdAt).toLocaleDateString()}`;
  })
  .join('\n\n---\n\n')}

${results.hasMore ? `\n**To see more results:** Use \`offset: ${results.offset + results.limit}\` parameter` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackGetTickets(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_get_tickets');

    const { bigrackGetTickets } = await import('./tools');
    const result = await bigrackGetTickets(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { results } = result;

    if (!results || results.tickets.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `## 📋 Tickets

**Results:** 0 tickets found

No tickets match your filters.`,
          },
        ],
      };
    }

    const formatted = `## 📋 Tickets

**Total Results:** ${results.total}
**Showing:** ${results.offset + 1}-${Math.min(results.offset + results.limit, results.total)} of ${results.total}
${results.hasMore ? '**Has More:** Yes (use offset parameter to paginate)' : ''}

${results.tickets
  .map((ticket, i) => {
    const priorityIcon =
      ticket.priority === 'critical'
        ? '🔴'
        : ticket.priority === 'high'
          ? '🟠'
          : ticket.priority === 'medium'
            ? '🟡'
            : '🟢';
    const statusIcon =
      ticket.status === 'completed'
        ? '✅'
        : ticket.status === 'in-progress'
          ? '🔄'
          : ticket.status === 'blocked'
            ? '🚫'
            : '⚪';

    return `${results.offset + i + 1}. ${statusIcon} ${priorityIcon} **${ticket.title}**
   **ID:** ${ticket.id}
   **Status:** ${ticket.status} | **Priority:** ${ticket.priority}${ticket.type ? ` | **Type:** ${ticket.type}` : ''}
   **Project:** ${ticket.projectName || ticket.projectId}${ticket.repoName ? ` (${ticket.repoName})` : ''}
   ${ticket.estimatedTime ? `**Estimated:** ${ticket.estimatedTime}\n   ` : ''}**Comments:** ${ticket.commentaryAmount || 0}
   **Created:** ${new Date(ticket.createdAt).toLocaleDateString()}`;
  })
  .join('\n\n')}

${results.hasMore ? `\n**To see more results:** Use \`offset: ${results.offset + results.limit}\` parameter` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackUpdateTask(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_update_ticket');

    const { bigrackUpdateBox } = await import('./tools');
    const result = await bigrackUpdateBox(
      args as unknown as Parameters<typeof bigrackUpdateBox>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification
    const { task } = result;
    if (task) {
      broadcastNotification({
        type: 'ticket_updated',
        action: 'update',
        entityId: task.id,
        entityType: 'ticket',
        title: `Ticket "${task.title}" updated`,
        description: `Status: ${task.status}, Priority: ${task.priority}`,
        projectId: args.projectId,
      });
    }

    const formatted = `## ✅ Task Updated Successfully

${result.message}

**Task:** ${task!.title}
**ID:** ${task!.id}

### Updated Fields
- **Status:** ${task!.status}
- **Priority:** ${task!.priority}
${task!.description ? `- **Description:** ${task!.description}\n` : ''}
${task!.type ? `- **Type:** ${task!.type}\n` : ''}
${task!.estimatedTime ? `- **Estimated Time:** ${task!.estimatedTime}\n` : ''}
${task!.assignee ? `- **Assignee:** ${task!.assignee}\n` : ''}
${task!.gitBranch ? `- **Git Branch:** ${task!.gitBranch}\n` : ''}
${task!.tags && task!.tags.length > 0 ? `- **Tags:** ${task!.tags.join(', ')}\n` : ''}
${task!.dependencies.length > 0 ? `- **Dependencies:** ${task!.dependencies.length} task(s)\n` : ''}
${task!.validationCriteria && task!.validationCriteria.length > 0 ? `- **Validation Criteria:** ${task!.validationCriteria.length} item(s)\n` : ''}

**Last Updated:** ${new Date(task!.updatedAt).toLocaleString()}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackDeleteBox(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_delete_ticket');

    const { bigrackDeleteBox } = await import('./tools');
    const result = await bigrackDeleteBox(
      args as unknown as Parameters<typeof bigrackDeleteBox>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification
    if (result.deletedTask) {
      broadcastNotification({
        type: 'ticket_deleted',
        action: 'delete',
        entityId: result.deletedTask.id,
        entityType: 'ticket',
        title: `Ticket "${result.deletedTask.title}" deleted`,
        description: `Ticket deleted from project`,
        projectId: args.projectId,
      });
    }

    let responseText = `## ✅ Ticket Deleted Successfully\n\n**Ticket:** ${result.deletedTask!.title}\n**ID:** ${result.deletedTask!.id}\n\n`;

    if (result.dependentTasks && result.dependentTasks.length > 0) {
      responseText += `### ⚠️ Dependent Tasks Updated\n\n`;
      responseText += `The following ${result.dependentTasks.length} task(s) had their dependencies updated:\n`;
      result.dependentTasks.forEach((task) => {
        responseText += `- ${task.title}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  }

  private async handleBigrackSelectProject(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_select_project');

    const { bigrackSelectProject } = await import('./tools');
    const result = await bigrackSelectProject(args);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.message : `❌ ${result.message}`,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleBigrackTicketCommentList(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_ticket_comment_list');

    const { bigrackTicketCommentList } = await import('./tools');
    const result = await bigrackTicketCommentList(
      args as unknown as Parameters<typeof bigrackTicketCommentList>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    const { results } = result;

    if (!results || results.comments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `## 💬 Comments

**Results:** 0 comments found

No comments found for this ticket.`,
          },
        ],
      };
    }

    const formatted = `## 💬 Comments

**Total Results:** ${results.total}
**Showing:** ${results.offset + 1}-${Math.min(results.offset + results.limit, results.total)} of ${results.total}
${results.hasMore ? '**Has More:** Yes (use offset parameter to paginate)' : ''}

${results.comments
  .map((comment, i) => {
    return `### ${results.offset + i + 1}. Comment (${new Date(comment.createdAt).toLocaleString()})
${comment.createdBy ? `**Author:** ${comment.createdBy}\n` : ''}
${comment.content}

---
**ID:** ${comment.id}
**Created:** ${new Date(comment.createdAt).toLocaleString()}
**Updated:** ${new Date(comment.updatedAt).toLocaleString()}`;
  })
  .join('\n\n')}

${results.hasMore ? `\n**To see more results:** Use \`offset: ${results.offset + results.limit}\` parameter` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackTicketCommentCreate(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_ticket_comment_create');

    const { bigrackTicketCommentCreate } = await import('./tools');
    const result = await bigrackTicketCommentCreate(
      args as unknown as Parameters<typeof bigrackTicketCommentCreate>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification
    if (result.comment) {
      broadcastNotification({
        type: 'comment_created',
        action: 'create',
        entityId: result.comment.id,
        entityType: 'comment',
        title: `Comment added to ticket`,
        description: result.message,
        taskId: result.comment.taskId,
      });
    }

    const formatted = `## ✅ Comment Created Successfully

**Comment ID:** ${result.comment!.id}
**Ticket ID:** ${result.comment!.taskId}

### Content
${result.comment!.content}

**Created:** ${new Date(result.comment!.createdAt).toLocaleString()}
${result.comment!.createdBy ? `**Author:** ${result.comment!.createdBy}` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  private async handleBigrackTicketCommentUpdate(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    daemonLogger.debug({ args }, 'Handling bigrack_ticket_comment_update');

    const { bigrackTicketCommentUpdate } = await import('./tools');
    const result = await bigrackTicketCommentUpdate(
      args as unknown as Parameters<typeof bigrackTicketCommentUpdate>[0]
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${result.message}\n\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }

    // Broadcast notification
    if (result.comment) {
      broadcastNotification({
        type: 'comment_updated',
        action: 'update',
        entityId: result.comment.id,
        entityType: 'comment',
        title: `Comment updated`,
        description: result.message,
        taskId: result.comment.taskId,
      });
    }

    const formatted = `## ✅ Comment Updated Successfully

**Comment ID:** ${result.comment!.id}
**Ticket ID:** ${result.comment!.taskId}

### Updated Content
${result.comment!.content}

**Created:** ${new Date(result.comment!.createdAt).toLocaleString()}
**Updated:** ${new Date(result.comment!.updatedAt).toLocaleString()}
${result.comment!.createdBy ? `**Author:** ${result.comment!.createdBy}` : ''}
`;

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  }

  async start(): Promise<void> {
    // Check and apply pending migrations before starting
    try {
      const { hasPendingMigrations, getPendingMigrations, isDatabaseInitialized, runMigrations } =
        await import('../storage/migrations');
      const { disconnectPrisma } = await import('../storage/prisma');

      if (isDatabaseInitialized() && (await hasPendingMigrations())) {
        const pending = await getPendingMigrations();
        daemonLogger.info(
          { count: pending.length, migrations: pending.map((m) => m.name) },
          'Pending migrations detected, applying automatically...'
        );

        // Disconnect Prisma Client before running migrations to avoid database lock
        await disconnectPrisma();

        try {
          // Apply migrations automatically
          runMigrations();
          daemonLogger.info(
            { count: pending.length, migrations: pending.map((m) => m.name) },
            'Migrations applied successfully'
          );
          // Log to stderr so it's visible to the user
          console.error(
            `\n✅ Applied ${pending.length} pending migration(s) automatically:\n${pending.map((m) => `   • ${m.name}`).join('\n')}\n`
          );
        } catch (migrationError) {
          daemonLogger.error(
            { err: migrationError, migrations: pending.map((m) => m.name) },
            'Failed to apply migrations automatically'
          );
          // Log to stderr so it's visible to the user
          console.error(
            `\n⚠️  Warning: Failed to apply ${pending.length} pending migration(s) automatically. Run "bigrack update" manually to apply them.\n`
          );
          // Don't fail startup, but warn the user
        }
      }
    } catch (err) {
      // Don't fail startup if migration check fails, just log it
      daemonLogger.debug({ err }, 'Failed to check for pending migrations');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    daemonLogger.info('MCP Server started on stdio');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      daemonLogger.info('Received SIGINT, shutting down...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      daemonLogger.info('Received SIGTERM, shutting down...');
      await this.server.close();
      process.exit(0);
    });
  }
}
