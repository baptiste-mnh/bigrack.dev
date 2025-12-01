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

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { loadConfig } from '../../config';
import { getPrisma } from '../../storage/prisma';
import { error, json as outputJson } from '../utils';
import { version } from '../../index';

const CONFIG_DIR = path.join(os.homedir(), '.bigrack');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const DB_PATH = path.join(CONFIG_DIR, 'bigrack.db');

interface StatusData {
  initialized: boolean;
  version: string;
  configDir: string;
  user?: {
    username?: string;
  };
  database: {
    status: 'connected' | 'not_found' | 'error';
    path: string;
    sizeMB?: number;
    stats?: {
      repos: number;
      projects: number;
      businessRules: number;
      embeddings: number;
    };
    error?: string;
    migrations?: {
      pending?: number;
      pendingList?: Array<{ version: string; name: string }>;
      current?: string;
    };
  };
  vectorSearch: {
    status: 'ready' | 'not_downloaded' | 'unknown';
    modelName: string;
    modelPath: string;
    dimensions: number;
    sizeMB?: number;
  };
  sync: {
    status: 'not_implemented' | 'enabled' | 'disabled';
    enabled: boolean;
    apiUrl: string;
  };
  claudeDesktop: {
    configured: boolean;
    method?: 'cli' | 'manual';
  };
  cursor: {
    available: boolean;
    configured: boolean;
    scopes?: {
      user: boolean;
      workspace: boolean;
      folder: boolean;
    };
  };
  localRepo?: {
    initialized: boolean;
    repoId?: string;
    name?: string;
    description?: string;
    projects?: Array<{
      id: string;
      name: string;
    }>;
  };
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  timestamp: string;
}

/**
 * Check if BigRack is initialized
 */
function isInitialized(): boolean {
  return fs.existsSync(CONFIG_PATH) && fs.existsSync(CONFIG_DIR);
}

/**
 * Get database status and statistics
 */
async function getDatabaseStatus(): Promise<StatusData['database']> {
  const dbPath = DB_PATH;
  const status: StatusData['database'] = {
    status: 'not_found',
    path: dbPath,
  };

  if (!fs.existsSync(dbPath)) {
    return status;
  }

  try {
    // Get file size
    const stats = fs.statSync(dbPath);
    status.sizeMB = Number((stats.size / (1024 * 1024)).toFixed(2));

    // Try to connect and count entities
    try {
      const prisma = getPrisma();

      const [repos, projects, businessRules, embeddings] = await Promise.all([
        prisma.repo.count().catch(() => 0),
        prisma.project.count().catch(() => 0),
        prisma.businessRule.count().catch(() => 0),
        prisma.vectorEmbedding.count().catch(() => 0),
      ]);

      status.status = 'connected';
      status.stats = {
        repos,
        projects,
        businessRules,
        embeddings,
      };

      // Check for current and pending migrations
      try {
        // Get current migration version
        try {
          const currentMigration = await prisma.$queryRaw<Array<{
            migration_name: string;
            finished_at: Date | null;
          }>>`
            SELECT migration_name, finished_at
            FROM _prisma_migrations
            WHERE finished_at IS NOT NULL
            ORDER BY finished_at DESC
            LIMIT 1
          `;

          if (currentMigration.length > 0) {
            if (!status.migrations) {
              status.migrations = {} as StatusData['database']['migrations'];
            }
            status.migrations!.current = currentMigration[0].migration_name;
          }
        } catch {
          // Ignore if _prisma_migrations table doesn't exist or query fails
        }

        const { getPendingMigrations, isDatabaseInitialized } = await import(
          '../../storage/migrations'
        );
        if (isDatabaseInitialized()) {
          const pending = await getPendingMigrations();
          if (pending.length > 0) {
            if (!status.migrations) {
              status.migrations = {} as StatusData['database']['migrations'];
            }
            status.migrations!.pending = pending.length;
            status.migrations!.pendingList = pending.map((m) => ({
              version: m.name.split('_')[0] || m.name,
              name: m.name,
            }));
          }
        }
      } catch {
        // Ignore migration check errors
      }
    } catch (dbError) {
      status.status = 'error';
      status.error = dbError instanceof Error ? dbError.message : String(dbError);
    }
  } catch (err) {
    status.status = 'error';
    status.error = err instanceof Error ? err.message : String(err);
  }

  return status;
}

/**
 * Check embeddings model status
 */
function getVectorSearchStatus(): StatusData['vectorSearch'] {
  const config = loadConfig();
  const modelName = config.vectorSearch.modelName;
  const dimensions = config.vectorSearch.embeddingDimensions;
  const modelPath = config.vectorSearch.modelPath.replace('~', os.homedir());

  const status: StatusData['vectorSearch'] = {
    status: 'unknown',
    modelName,
    modelPath,
    dimensions,
  };

  // Check HuggingFace cache (default location for transformers)
  const hfCachePath = path.join(os.homedir(), '.cache', 'huggingface', 'transformers');
  const modelDir = path.join(hfCachePath, modelName.replace('/', '--'));

  let modelFound = false;
  let totalSize = 0;

  // Check HuggingFace cache
  if (fs.existsSync(modelDir)) {
    try {
      const files = fs.readdirSync(modelDir, { recursive: true });
      modelFound = files.length > 0;
      files.forEach((file) => {
        try {
          const filePath = path.join(modelDir, file.toString());
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch {
          // Ignore errors
        }
      });
    } catch {
      // Ignore errors
    }
  }

  // Check custom model path
  if (!modelFound && fs.existsSync(modelPath)) {
    try {
      const files = fs.readdirSync(modelPath, { recursive: true });
      modelFound = files.length > 0;
      files.forEach((file) => {
        try {
          const filePath = path.join(modelPath, file.toString());
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch {
          // Ignore errors
        }
      });
    } catch {
      // Ignore errors
    }
  }

  if (modelFound) {
    status.status = 'ready';
    status.sizeMB = Number((totalSize / (1024 * 1024)).toFixed(1));
  } else {
    status.status = 'not_downloaded';
  }

  return status;
}

/**
 * Get sync configuration status
 */
function getSyncStatus(): StatusData['sync'] {
  const config = loadConfig();

  return {
    status: 'not_implemented', // Always not implemented for now
    enabled: config.sync.enabled,
    apiUrl: config.sync.apiUrl,
  };
}

/**
 * Check Claude Code configuration (via claude mcp list)
 */
function getClaudeDesktopStatus(): StatusData['claudeDesktop'] {
  const status: StatusData['claudeDesktop'] = {
    configured: false,
  };

  try {
    // Check via claude mcp list - look for bigrack-mcp with Connected status
    try {
      const output = execSync('claude mcp list', {
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      // Check if output contains "bigrack" and "Connected"
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.includes('bigrack') || line.includes('bigrack-mcp')) {
          // Check if it's connected (look for ✓ or Connected)
          if (line.includes('✓') || line.includes('Connected')) {
            status.configured = true;
            status.method = 'cli';
            break;
          }
        }
      }
    } catch {
      // CLI not available or command failed
    }
  } catch {
    // Error checking
  }

  return status;
}

/**
 * Get Cursor MCP config file path based on platform
 */
function getCursorMCPConfigPath(scope: 'user' | 'workspace' | 'folder'): string {
  const platform = process.platform;
  const homeDir = os.homedir();

  if (scope === 'workspace' || scope === 'folder') {
    // For workspace/folder, use .cursor/mcp.json in current directory
    return path.join(process.cwd(), '.cursor', 'mcp.json');
  }

  // User scope
  if (platform === 'darwin') {
    return `${homeDir}/Library/Application Support/Cursor/User/globalStorage/mcp.json`;
  } else if (platform === 'win32') {
    const appData = process.env.APPDATA || `${homeDir}/AppData/Roaming`;
    return `${appData}/Cursor/User/globalStorage/mcp.json`;
  } else {
    return `${homeDir}/.config/Cursor/User/globalStorage/mcp.json`;
  }
}

/**
 * Check if Cursor CLI is available
 */
function isCursorAvailable(): boolean {
  try {
    execSync('cursor --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if BigRack is configured in Cursor for a specific scope
 */
function isBigrackConfiguredInCursor(scope: 'user' | 'workspace' | 'folder'): boolean {
  try {
    const configPath = getCursorMCPConfigPath(scope);

    if (!fs.existsSync(configPath)) {
      return false;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    return config.mcpServers && config.mcpServers.bigrack !== undefined;
  } catch {
    return false;
  }
}

/**
 * Check Cursor configuration status
 */
function getCursorStatus(): StatusData['cursor'] {
  const status: StatusData['cursor'] = {
    available: false,
    configured: false,
  };

  // Check if Cursor CLI is available
  status.available = isCursorAvailable();

  if (!status.available) {
    return status;
  }

  // Check configuration in different scopes
  const userConfigured = isBigrackConfiguredInCursor('user');
  const workspaceConfigured = isBigrackConfiguredInCursor('workspace');
  const folderConfigured = isBigrackConfiguredInCursor('folder');

  status.configured = userConfigured || workspaceConfigured || folderConfigured;
  status.scopes = {
    user: userConfigured,
    workspace: workspaceConfigured,
    folder: folderConfigured,
  };

  return status;
}

/**
 * Get local repo status from bigrack.json
 */
async function getLocalRepoStatus(): Promise<StatusData['localRepo']> {
  const cwd = process.cwd();
  const bigrackJsonPath = path.join(cwd, 'bigrack.json');

  if (!fs.existsSync(bigrackJsonPath)) {
    return {
      initialized: false,
    };
  }

  try {
    const content = fs.readFileSync(bigrackJsonPath, 'utf-8');
    const bigrackConfig = JSON.parse(content) as {
      repoId: string;
      name: string;
      description?: string;
      projects?: string[];
    };

    const localRepo: StatusData['localRepo'] = {
      initialized: true,
      repoId: bigrackConfig.repoId,
      name: bigrackConfig.name,
      description: bigrackConfig.description,
    };

    // If there are project IDs, fetch their names from the database
    if (bigrackConfig.projects && bigrackConfig.projects.length > 0) {
      try {
        const prisma = getPrisma();
        const projects = await prisma.project.findMany({
          where: {
            id: { in: bigrackConfig.projects },
          },
          select: {
            id: true,
            name: true,
          },
        });

        localRepo.projects = projects.map((p) => ({
          id: p.id,
          name: p.name,
        }));
      } catch {
        // If database query fails, just keep the IDs without names
        localRepo.projects = bigrackConfig.projects.map((id) => ({
          id,
          name: 'Unknown',
        }));
      }
    } else {
      localRepo.projects = [];
    }

    return localRepo;
  } catch {
    return {
      initialized: false,
    };
  }
}

/**
 * Collect all status information
 */
async function collectStatus(): Promise<StatusData> {
  const initialized = isInitialized();
  const config = loadConfig();

  return {
    initialized,
    version: version,
    configDir: CONFIG_DIR,
    user: config.user,
    database: await getDatabaseStatus(),
    vectorSearch: getVectorSearchStatus(),
    sync: getSyncStatus(),
    claudeDesktop: getClaudeDesktopStatus(),
    cursor: getCursorStatus(),
    localRepo: await getLocalRepoStatus(),
    system: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format status as simple lines (more readable)
 */
function formatTable(status: StatusData): void {
  console.log('\nBigRack Status Report\n');

  // Helper to format paths with ~
  const formatPath = (p: string): string => {
    const home = os.homedir();
    return p.replace(home, '~');
  };

  // Helper to format a simple line - simplified
  const formatLine = (emoji: string, label: string, status: string, details?: string): void => {
    const labelCol = `${emoji} ${label}:`.padEnd(16);
    const statusCol = status.padEnd(20);
    console.log(`${labelCol}${statusCol}${details || ''}`);
  };

  // Initialization
  if (status.initialized) {
    const details = `Dir: ${formatPath(status.configDir)}  Ver: ${status.version}${status.user?.username ? `  User: ${status.user.username}` : ''}`;
    formatLine('🚀', 'Init', '✅ Initialized', details);
  } else {
    formatLine('🚀', 'Init', '❌ Not Initialized', 'Run: bigrack init');
  }

  // Database
  if (status.database.status === 'connected') {
    formatLine(
      '💾',
      'DB',
      '✅ Connected',
      `Path: ${formatPath(status.database.path)}  Size: ${status.database.sizeMB || 0} MB`
    );
    if (status.database.stats) {
      const { repos, projects, businessRules, embeddings } = status.database.stats;
      console.log(
        `               Repos: ${repos}  Projects: ${projects}  Rules: ${businessRules}  Embeddings: ${embeddings.toLocaleString()}`
      );
    }
    // Show current migration version
    if (status.database.migrations && status.database.migrations.current) {
      console.log(
        `               Migration: ${status.database.migrations.current}`
      );
    }
    // Show pending migrations warning
    if (status.database.migrations && status.database.migrations.pending && status.database.migrations.pending > 0) {
      const migrations = status.database.migrations.pendingList || [];
      console.log(
        `               ⚠️  ${status.database.migrations.pending} pending migration(s) detected`
      );
      console.log(`               📋 To apply migrations, run: bigrack update`);
      console.log(`               📋 Or with auto-confirm: bigrack update -y`);
      migrations.forEach((m) => {
        console.log(`                  • ${m.name}`);
      });
    }
  } else if (status.database.status === 'not_found') {
    formatLine('💾', 'DB', '❌ Not Found', 'Run: bigrack init');
  } else {
    formatLine('💾', 'DB', '❌ Error', status.database.error || '');
  }

  // Vector Search
  if (status.vectorSearch.status === 'ready') {
    const size = status.vectorSearch.sizeMB ? `  Size: ~${status.vectorSearch.sizeMB} MB` : '';
    formatLine(
      '🔍',
      'Vector',
      '✅ Ready',
      `Model: ${status.vectorSearch.modelName}  Dim: ${status.vectorSearch.dimensions}${size}`
    );
  } else if (status.vectorSearch.status === 'not_downloaded') {
    formatLine('🔍', 'Vector', '⚠️ Not Downloaded', 'Run: bigrack init');
  } else {
    formatLine('🔍', 'Vector', '⚠️ Unknown', status.vectorSearch.modelName);
  }

  // Sync
  formatLine(
    '☁️',
    'Cloud Sync',
    '⚠️ Not Implemented',
    `Enabled: ${status.sync.enabled ? 'Yes' : 'No'}  API: ${status.sync.apiUrl}`
  );

  // Claude Code
  if (status.claudeDesktop.configured) {
    formatLine('🔌', 'Claude', '✅ Configured', '');
  } else {
    formatLine('🔌', 'Claude', '❌ Not Configured', 'Run: bigrack setup-claude');
  }

  // Cursor
  if (!status.cursor.available) {
    formatLine('🎯', 'Cursor', '⚠️ CLI Not Available', '');
  } else if (status.cursor.configured) {
    const scopes = status.cursor.scopes
      ? Object.entries(status.cursor.scopes)
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(', ')
      : '';
    formatLine('🎯', 'Cursor', '✅ Configured', scopes ? `Scopes: ${scopes}` : '');
  } else {
    formatLine('🎯', 'Cursor', '❌ Not Configured', 'Run: bigrack setup-cursor');
  }

  // Local Repo
  if (status.localRepo?.initialized) {
    const repoInfo = `Repo: ${status.localRepo.name || 'Unknown'} (${status.localRepo.repoId?.substring(0, 8)}...)`;
    formatLine('📁', 'Local Repo', '✅ Initialized', repoInfo);

    if (status.localRepo.projects && status.localRepo.projects.length > 0) {
      const projectsList = status.localRepo.projects
        .map((p) => `  • ${p.name} (${p.id.substring(0, 8)}...)`)
        .join('\n');
      console.log(`               Projects (${status.localRepo.projects.length}):`);
      console.log(projectsList);
    } else {
      console.log('               Projects: None');
    }
  } else {
    formatLine(
      '📁',
      'Local Repo',
      '❌ Not Initialized',
      'No bigrack.json found in current directory'
    );
  }

  // System
  const osName =
    status.system.platform === 'darwin'
      ? 'macOS'
      : status.system.platform === 'win32'
        ? 'Windows'
        : status.system.platform;
  formatLine(
    '📦',
    'System',
    status.system.nodeVersion,
    `OS: ${osName}  Arch: ${status.system.arch}`
  );

  console.log('');
}

/**
 * Format status as quiet (one line)
 */
function formatQuiet(status: StatusData): void {
  const parts: string[] = [];

  if (status.initialized) {
    parts.push('✅ Initialized');
  } else {
    parts.push('❌ Not Initialized');
  }

  if (
    status.database.status === 'connected' &&
    status.database.stats &&
    status.database.sizeMB !== undefined
  ) {
    const { repos, projects } = status.database.stats;
    let dbInfo = `DB: ${status.database.sizeMB}MB (${repos} repos, ${projects} projects)`;
    if (status.database.migrations && status.database.migrations.pending && status.database.migrations.pending > 0) {
      dbInfo += ` [${status.database.migrations.pending} pending migration(s) - run: bigrack update]`;
    }
    parts.push(dbInfo);
  } else {
    parts.push('DB: Not available');
  }

  if (status.vectorSearch.status === 'ready') {
    parts.push('Embeddings: Ready');
  } else {
    parts.push('Embeddings: Not downloaded');
  }

  if (status.claudeDesktop.configured) {
    parts.push('Claude: Configured');
  } else {
    parts.push('Claude: Not configured');
  }

  if (status.cursor.available) {
    if (status.cursor.configured) {
      parts.push('Cursor: Configured');
    } else {
      parts.push('Cursor: Not configured');
    }
  } else {
    parts.push('Cursor: Not available');
  }

  console.log(parts.join(' | '));
}

export const statusCommand = new Command('status')
  .description('Show BigRack system status')
  .option('--json', 'Output as JSON')
  .option('--quiet', 'Minimal output (one line)')
  .action(async (options) => {
    try {
      const status = await collectStatus();

      if (options.json) {
        outputJson(status);
        return;
      }

      if (options.quiet) {
        formatQuiet(status);
        return;
      }

      formatTable(status);
    } catch (err) {
      error(`Failed to collect status: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.stack && process.env.DEBUG) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });
