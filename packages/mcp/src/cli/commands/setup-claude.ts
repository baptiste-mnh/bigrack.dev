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
import { success, error, info, warn, spinner } from '../utils';

interface ClaudeDesktopConfig {
  mcpServers?: {
    [key: string]: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
}

/**
 * Get Claude Desktop config file path based on OS
 */
function getClaudeDesktopConfigPath(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'darwin': // macOS
      return path.join(
        homeDir,
        'Library',
        'Application Support',
        'Claude',
        'claude_desktop_config.json'
      );
    case 'win32': // Windows
      const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
      return path.join(appData, 'Claude', 'claude_desktop_config.json');
    case 'linux':
      return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Read Claude Desktop config file
 */
function readClaudeDesktopConfig(configPath: string): ClaudeDesktopConfig {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to read Claude Desktop config: ${err}`);
  }
}

/**
 * Write Claude Desktop config file
 */
function writeClaudeDesktopConfig(configPath: string, config: ClaudeDesktopConfig): void {
  const dir = path.dirname(configPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write Claude Desktop config: ${err}`);
  }
}

/**
 * Create backup of config file
 */
function backupConfig(configPath: string): string {
  if (!fs.existsSync(configPath)) {
    return '';
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${configPath}.backup.${timestamp}`;

  try {
    fs.copyFileSync(configPath, backupPath);
    return backupPath;
  } catch (err) {
    throw new Error(`Failed to create backup: ${err}`);
  }
}

/**
 * Update or add BigRack MCP server configuration
 */
function updateBigRackConfig(config: ClaudeDesktopConfig): ClaudeDesktopConfig {
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers.bigrack = {
    command: 'bigrack-mcp',
    args: [],
    env: {},
  };

  return config;
}

/**
 * Validate configuration
 */
function validateConfig(config: ClaudeDesktopConfig): boolean {
  if (!config.mcpServers || !config.mcpServers.bigrack) {
    return false;
  }

  const bigrackConfig = config.mcpServers.bigrack;
  return bigrackConfig.command === 'bigrack-mcp';
}

/**
 * Check if 'claude' CLI command is available
 */
function isClaudeCLIAvailable(): boolean {
  try {
    execSync('claude --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export const setupClaudeCommand = new Command('setup-claude')
  .description('Configure Claude Code to use BigRack MCP server')
  .option('--dry-run', 'Show what would be changed without modifying the config')
  .option('--skip-backup', 'Skip creating a backup of the existing config')
  .option('--force-manual', 'Force manual JSON editing even if Claude CLI is available')
  .action((options) => {
    const spin = spinner('Configuring Claude Code...');
    spin.start();

    try {
      // Try using Claude CLI first (preferred method)
      if (!options.forceManual && isClaudeCLIAvailable()) {
        spin.text = 'Claude CLI detected, using official method...';

        if (options.dryRun) {
          spin.stop();
          info('Dry run mode - no changes will be made');
          console.log(
            '\nWould run: claude mcp add bigrack bigrack-mcp --scope user --transport stdio'
          );
          console.log('\nThis will add BigRack MCP server using the official Claude CLI.');
          return;
        }

        try {
          execSync('claude mcp add bigrack bigrack-mcp --scope user --transport stdio', {
            stdio: 'pipe',
          });
          spin.succeed('Configuration updated successfully via Claude CLI');

          console.log('\n');
          success('BigRack MCP server configured');
          console.log('  Method: Claude CLI (official)');
          console.log('  Scope: user (applies to all projects)');
          console.log('  Command: bigrack-mcp');

          // Show instructions
          console.log('\n📋 Next steps:');
          console.log('  1. Verify with: claude mcp list');
          console.log('  2. BigRack MCP tools will be available in Claude Code');
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

          return;
        } catch {
          warn('Claude CLI command failed, falling back to manual configuration...');
          // Fall through to manual method
        }
      }

      // Fallback to manual JSON editing
      spin.text = 'Using manual configuration method...';

      // Get config path
      const configPath = getClaudeDesktopConfigPath();
      spin.text = `Found Claude Desktop config at: ${configPath}`;

      // Read existing config
      const existingConfig = fs.existsSync(configPath) ? readClaudeDesktopConfig(configPath) : {};

      spin.text = 'Reading existing configuration...';

      // Create backup if not skipping
      let backupPath = '';
      if (!options.skipBackup && fs.existsSync(configPath)) {
        spin.text = 'Creating backup...';
        backupPath = backupConfig(configPath);
      }

      // Update config
      spin.text = 'Adding BigRack MCP server...';
      const updatedConfig = updateBigRackConfig({ ...existingConfig });

      if (options.dryRun) {
        spin.stop();
        info('Dry run mode - no changes will be made');
        console.log('\nConfiguration that would be written:');
        console.log(JSON.stringify(updatedConfig, null, 2));
        return;
      }

      // Write config
      spin.text = 'Writing configuration...';
      writeClaudeDesktopConfig(configPath, updatedConfig);

      // Validate
      const isValid = validateConfig(updatedConfig);
      if (!isValid) {
        throw new Error('Configuration validation failed');
      }

      spin.succeed('Configuration updated successfully');

      // Show results
      console.log('\n');
      if (backupPath) {
        success(`Backup created at: ${backupPath}`);
      }
      success(`BigRack MCP server configured`);
      console.log(`  Config path: ${configPath}`);
      console.log(`  Command: bigrack-mcp`);

      // Show instructions
      console.log('\n📋 Next steps:');
      console.log('  1. Verify with: claude mcp list');
      console.log('  2. BigRack MCP tools will be available in Claude Code');
      console.log('  3. Try asking: "Use BigRack to initialize a project"');

      // Check if bigrack-mcp is available
      console.log('\n');
      try {
        // Try to find bigrack-mcp in PATH
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      error(`Failed to configure Claude Desktop: ${errorMessage}`);
      if (err instanceof Error && err.stack && process.env.DEBUG) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });
