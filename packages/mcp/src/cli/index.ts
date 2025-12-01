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
  completionCommand,
  configCommand,
  initCommand,
  updateCommand,
  setupClaudeCommand,
  setupCursorCommand,
  listCursorMCPsCommand,
  statusCommand,
  startCommand,
  ticketCommand,
  registerGuiCommand,
} from './commands';
import { version } from '../index';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('bigrack')
    .description('BigRack - Intelligent MCP for complex projects')
    .version(version);

  // Global options
  program
    .option('--verbose', 'Verbose output')
    .option('--quiet', 'Minimal output')
    .option('--json', 'JSON output');

  // Add commands
  program.addCommand(completionCommand);
  program.addCommand(initCommand);
  program.addCommand(updateCommand);
  program.addCommand(configCommand);
  program.addCommand(setupClaudeCommand);
  program.addCommand(setupCursorCommand);
  program.addCommand(listCursorMCPsCommand);
  program.addCommand(statusCommand);
  program.addCommand(startCommand);
  program.addCommand(ticketCommand);
  registerGuiCommand(program);

  return program;
}

export function runCLI(): void {
  const program = createCLI();
  program.parse(process.argv);
}
