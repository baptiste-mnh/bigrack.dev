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
import {
  startGuiServerBackground,
  stopGuiServer,
  getGuiServerStatus,
} from '../gui/process-manager';
import { loadConfig } from '../../config';
import { success, error, info } from '../utils';

export function registerGuiCommand(program: Command): void {
  const guiCommand = new Command('gui').description('Manage the BigRack GUI server');

  // Start subcommand
  guiCommand
    .command('start')
    .description('Start the GUI server in background')
    .option('-p, --port <port>', 'Port to run the server on', '3333')
    .option('--dashboard <url>', 'Dashboard URL (defaults to external dashboard)')
    .option('--use-local', 'Use local GUI instead of external dashboard', false)
    .action(async (options) => {
      try {
        const port = parseInt(options.port, 10);
        const processInfo = await startGuiServerBackground({
          port,
          dashboard: options.dashboard,
          useLocal: options.useLocal === true,
        });
        if (processInfo.wasAlreadyRunning) {
          success(
            `GUI server is already running on port ${processInfo.port} (PID: ${processInfo.pid})`
          );
          info('Opening browser...');
        } else {
          success(`GUI server started on port ${processInfo.port} (PID: ${processInfo.pid})`);
          const dashboardUrl =
            options.dashboard ||
            (options.useLocal
              ? `http://localhost:${processInfo.port}`
              : loadConfig().dashboard.url);
          const separator = dashboardUrl.includes('?') ? '&' : '?';
          const dashboardWithHost = `${dashboardUrl}${separator}hostUrl=localhost:${processInfo.port}`;
          info(`Opening dashboard: ${dashboardWithHost}`);
        }
      } catch (err) {
        error(`Failed to start GUI server: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  // Stop subcommand
  guiCommand
    .command('stop')
    .description('Stop the GUI server')
    .action(() => {
      try {
        const stopped = stopGuiServer();
        if (stopped) {
          success('GUI server stopped');
        } else {
          info('GUI server is not running');
        }
      } catch (err) {
        error(`Failed to stop GUI server: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  // Status subcommand
  guiCommand
    .command('status')
    .description('Show GUI server status')
    .action(async () => {
      try {
        const status = await getGuiServerStatus();
        if (status.running) {
          success(`GUI server is running`);
          console.log(`  PID: ${status.pid}`);
          console.log(`  Port: ${status.port}`);
          if (status.uptime) {
            const minutes = Math.floor(status.uptime / 60);
            const seconds = Math.floor(status.uptime % 60);
            console.log(`  Uptime: ${minutes}m ${seconds}s`);
          }
          if (status.connectedClients !== undefined) {
            console.log(`  Connected clients: ${status.connectedClients}`);
          }
          console.log(`  URL: http://localhost:${status.port}`);
        } else {
          info('GUI server is not running');
          if (status.pid) {
            console.log(`  (PID file exists but server not responding)`);
          }
        }
      } catch (err) {
        error(
          `Failed to get GUI server status: ${err instanceof Error ? err.message : String(err)}`
        );
        process.exit(1);
      }
    });

  // Default action (no subcommand) - show status
  guiCommand.action(async () => {
    try {
      const status = await getGuiServerStatus();
      if (status.running) {
        success(`GUI server is running on port ${status.port} (PID: ${status.pid})`);
        console.log(`\nUse 'bigrack gui stop' to stop the server.`);
      } else {
        info('GUI server is not running');
        console.log(`\nUse 'bigrack gui start' to start the server.`);
      }
    } catch (err) {
      error(`Failed to get GUI server status: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

  program.addCommand(guiCommand);
}
