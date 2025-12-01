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
import { MCPServer } from '../../mcp/server';
import { daemonLogger } from '../../logger';
import { success, error } from '../utils';

async function startDaemon(): Promise<void> {
  try {
    daemonLogger.info('BigRack MCP Daemon starting...');
    console.log('Starting BigRack MCP Daemon...');

    const server = new MCPServer();
    await server.start();

    daemonLogger.info('MCP Daemon ready');
    success('BigRack MCP Daemon started and ready');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    daemonLogger.error({ err }, 'Failed to start daemon');
    error(`Failed to start daemon: ${message}`);
    process.exit(1);
  }
}

export const startCommand = new Command('start')
  .description('Start the BigRack MCP daemon')
  .action(async () => {
    await startDaemon();
  });

