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
import { error, info, spinner, success } from '../utils';
import { runMigrations, getPendingMigrations, isDatabaseInitialized } from '../../storage/migrations';
import { disconnectPrisma } from '../../storage/prisma';
import * as os from 'os';
import * as path from 'path';

export const updateCommand = new Command('update')
  .description('Update BigRack database schema by applying pending migrations')
  .option('-y, --yes', 'Skip confirmation prompts (non-interactive mode)')
  .action(async (options) => {
    try {
      await runUpdate(options.yes);
    } catch (err) {
      error(`Update failed: ${err}`);
      process.exit(1);
    }
  });

async function runUpdate(skipPrompts = false): Promise<void> {
  console.log('\n🔄 BigRack Database Update\n');

  // Set DATABASE_URL if not already set
  if (!process.env.DATABASE_URL) {
    const dbPath = path.join(os.homedir(), '.bigrack', 'bigrack.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  // Check if database is initialized
  if (!isDatabaseInitialized()) {
    error('BigRack is not initialized. Please run "bigrack init" first.');
    process.exit(1);
  }

  // Check for pending migrations
  const pending = await getPendingMigrations();

  if (pending.length === 0) {
    success('Database is up to date. No pending migrations.');
    console.log('');
    return;
  }

  // Show pending migrations
  console.log(`Found ${pending.length} pending migration(s):\n`);
  for (const migration of pending) {
    console.log(`  - ${migration.name}`);
  }
  console.log('');

  // Ask for confirmation unless --yes flag is used
  if (!skipPrompts) {
    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Apply these migrations? (y/N)',
        default: false,
      },
    ]);

    if (!confirm) {
      info('Update cancelled.');
      process.exit(0);
    }
  }

  // Disconnect Prisma Client before running migrations to avoid database lock
  await disconnectPrisma();

  // Run migrations
  const updateSpinner = spinner('Applying migrations...').start();
  try {
    runMigrations();
    updateSpinner.succeed('Migrations applied successfully');
  } catch (err) {
    updateSpinner.fail('Failed to apply migrations');
    throw err;
  }

  // Success message
  console.log('\n✅ BigRack database updated successfully!\n');
}

