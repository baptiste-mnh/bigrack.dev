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

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import Table from 'cli-table3';

/**
 * Success message (green)
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Error message (red)
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Warning message (yellow)
 */
export function warn(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Info message (blue)
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Create a spinner
 */
export function spinner(text: string): Ora {
  return ora(text);
}

/**
 * Create a table
 */
export function createTable(head: string[], colWidths?: number[]): Table.Table {
  return new Table({
    head: head.map((h) => chalk.cyan(h)),
    colWidths,
    style: {
      head: [],
      border: [],
    },
  });
}

/**
 * Format JSON output
 */
export function json(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}
