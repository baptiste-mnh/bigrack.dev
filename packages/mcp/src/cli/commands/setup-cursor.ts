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
import { execSync } from 'child_process';
import * as os from 'os';
import { success, error, info, warn, spinner } from '../utils';
import * as fs from 'fs';
import * as path from 'path';

interface CursorMCPConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
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
 * Get Cursor MCP config file path based on platform
 */
function getCursorMCPConfigPath(scope: 'user' | 'workspace' | 'folder'): string {
  const platform = process.platform;
  const homeDir = os.homedir();

  if (scope === 'workspace' || scope === 'folder') {
    // For workspace/folder, use .cursor/mcp.json in current directory
    return '.cursor/mcp.json';
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
 * Add BigRack MCP to Cursor by directly editing the config file
 */
function addMCPToCursor(scope: 'user' | 'workspace' | 'folder' = 'user'): {
  success: boolean;
  error?: string;
} {
  try {
    const mcpConfig: CursorMCPConfig = {
      name: 'bigrack',
      command: 'bigrack-mcp',
      args: [],
      env: {},
    };

    // Try CLI method first (if Cursor supports it)
    try {
      const jsonConfig = JSON.stringify(mcpConfig);
      let command: string;
      if (scope === 'user') {
        command = `cursor --add-mcp '${jsonConfig}'`;
      } else if (scope === 'workspace') {
        command = `cursor --add-mcp '${jsonConfig}' --mcp-workspace`;
      } else {
        command = `cursor --add-mcp '${jsonConfig}' --mcp-workspace`;
      }

      execSync(command, {
        stdio: 'pipe',
        timeout: 5000,
      });
      return { success: true };
    } catch {
      // CLI method failed, try file-based approach

      const configPath = getCursorMCPConfigPath(scope);
      const dir = path.dirname(configPath);

      // Create directory if it doesn't exist (for workspace/folder scope)
      if (scope !== 'user' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Read existing config or create new one
      let config: any = { mcpServers: {} };
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          config = JSON.parse(content);
          if (!config.mcpServers) {
            config.mcpServers = {};
          }
        } catch {
          // Invalid JSON, create new config
          const backupPath = `${configPath}.backup.${Date.now()}`;
          fs.copyFileSync(configPath, backupPath);
          config = { mcpServers: {} };
        }
      }

      // Add BigRack MCP server
      config.mcpServers.bigrack = {
        command: 'bigrack-mcp',
        args: [],
        env: {},
      };

      // Write config file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Also write to ~/.cursor/mcp.json for user scope (Cursor reads from both locations)
      if (scope === 'user') {
        const altConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
        const altDir = path.dirname(altConfigPath);
        if (!fs.existsSync(altDir)) {
          fs.mkdirSync(altDir, { recursive: true });
        }
        fs.writeFileSync(altConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      }

      return { success: true };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Check if BigRack is already configured in Cursor
 */
function isBigrackConfigured(scope: 'user' | 'workspace' | 'folder' = 'user'): boolean {
  try {

    // Check primary location
    const configPath = getCursorMCPConfigPath(scope);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        if (config.mcpServers && config.mcpServers.bigrack !== undefined) {
          return true;
        }
      } catch {
        // Invalid JSON, continue to check alternative location
      }
    }

    // For user scope, also check ~/.cursor/mcp.json
    if (scope === 'user') {
      const altConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
      if (fs.existsSync(altConfigPath)) {
        try {
          const content = fs.readFileSync(altConfigPath, 'utf-8');
          const config = JSON.parse(content);
          if (config.mcpServers && config.mcpServers.bigrack !== undefined) {
            return true;
          }
        } catch {
          // Invalid JSON
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

export const setupCursorCommand = new Command('setup-cursor')
  .description('Configure Cursor to use BigRack MCP server')
  .option('--dry-run', 'Show what would be changed without modifying the config')
  .option('--workspace', 'Add to workspace instead of user profile')
  .option('--folder', 'Add to current folder instead of user profile')
  .action((options) => {
    const spin = spinner('Configuring Cursor...');
    spin.start();

    try {
      // Check if Cursor is available
      if (!isCursorAvailable()) {
        spin.stop();
        error('Cursor CLI not found');
        console.log('\nMake sure Cursor is installed and the `cursor` command is in your PATH.');
        console.log('Visit https://cursor.sh for installation instructions.');
        process.exit(1);
      }

      spin.text = 'Cursor CLI detected...';

      // Determine scope
      let scope: 'user' | 'workspace' | 'folder' = 'user';
      if (options.folder) {
        scope = 'folder';
      } else if (options.workspace) {
        scope = 'workspace';
      }

      if (options.dryRun) {
        spin.stop();
        info('Dry run mode - no changes will be made');
        console.log('\nWould run:');
        const mcpConfig = {
          name: 'bigrack',
          command: 'bigrack-mcp',
          args: [],
          env: {},
        };
        if (scope === 'user') {
          console.log(`cursor --add-mcp '${JSON.stringify(mcpConfig)}'`);
        } else if (scope === 'workspace') {
          console.log(`cursor --add-mcp '${JSON.stringify(mcpConfig)}' --mcp-workspace`);
        } else {
          console.log(`cursor --add-mcp '${JSON.stringify(mcpConfig)}' --mcp-workspace`);
        }
        console.log(`\nScope: ${scope}`);
        return;
      }

      // Check if already configured (basic check)
      if (isBigrackConfigured(scope)) {
        spin.text = 'BigRack already configured, updating...';
        warn('BigRack is already configured in Cursor');
        warn('Will update the existing configuration');
      }

      // Add MCP
      spin.text = 'Adding BigRack MCP server...';
      const result = addMCPToCursor(scope);

      if (!result.success) {
        throw new Error(
          result.error
            ? `Failed to add MCP server to Cursor: ${result.error}`
            : 'Failed to add MCP server to Cursor'
        );
      }

      spin.succeed('Configuration updated successfully');

      console.log('\n');
      success('BigRack MCP server configured in Cursor');
      console.log(`  Scope: ${scope}`);
      console.log(`  Command: bigrack-mcp`);

      // Show instructions
      console.log('\n📋 Next steps:');
      console.log('  1. Restart Cursor');
      console.log('  2. BigRack MCP tools will be available');
      console.log('  3. Try asking: "Use BigRack to initialize a project"');

      // Check if bigrack-mcp is available
      console.log('\n');
      try {
        if (os.platform() === 'win32') {
          execSync('where bigrack-mcp', { stdio: 'ignore' });
        } else {
          try {
            execSync('which bigrack-mcp', { stdio: 'ignore' });
          } catch {
            execSync('command -v bigrack-mcp', { stdio: 'ignore' });
          }
        }
        success('bigrack-mcp command is available in PATH');
      } catch {
        warn('bigrack-mcp command not found in PATH');
        warn('Make sure @bigrack/mcp is installed globally: npm install -g @bigrack/mcp');
      }
    } catch (err) {
      spin.stop();
      error(`Failed to configure Cursor: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.stack && process.env.DEBUG) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });
