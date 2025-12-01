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
import { error, info } from '../utils';
import { json as outputJson } from '../utils';

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
 * List MCP servers configured in Cursor
 * Note: This is a placeholder - Cursor might not have a list command yet
 */
function _listCursorMCPs(): any[] {
  try {
    // TODO: When Cursor adds a list command, implement it here
    // For now, we'll try to find the config file location
    const platform = process.platform;
    let configPath: string;

    if (platform === 'darwin') {
      configPath = `${process.env.HOME}/Library/Application Support/Cursor/User/globalStorage/mcp.json`;
    } else if (platform === 'win32') {
      const appData = process.env.APPDATA || `${process.env.HOME}/AppData/Roaming`;
      configPath = `${appData}/Cursor/User/globalStorage/mcp.json`;
    } else {
      configPath = `${process.env.HOME}/.config/Cursor/User/globalStorage/mcp.json`;
    }

    // Try to read config file if it exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        return config.mcpServers ? Object.keys(config.mcpServers) : [];
      } catch {
        return [];
      }
    }

    return [];
  } catch {
    return [];
  }
}

export const listCursorMCPsCommand = new Command('list-cursor-mcps')
  .alias('cursor-list')
  .description('List MCP servers configured in Cursor')
  .option('--json', 'Output as JSON')
  .action((options) => {
    try {
      if (!isCursorAvailable()) {
        error('Cursor CLI not found');
        console.log('\nMake sure Cursor is installed and the `cursor` command is in your PATH.');
        process.exit(1);
      }

      const mcpServers = _listCursorMCPs();

      if (options.json) {
        outputJson({ mcpServers });
        return;
      }

      if (mcpServers.length === 0) {
        info('No MCP servers found or Cursor MCP listing not yet implemented');
        console.log('\nNote: Cursor may not expose a list command yet.');
        console.log('You can check manually in Cursor settings.');
      } else {
        console.log('\nConfigured MCP servers in Cursor:');
        mcpServers.forEach((server, index) => {
          console.log(`  ${index + 1}. ${server}`);
        });
      }
    } catch (err) {
      error(`Failed to list Cursor MCPs: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
