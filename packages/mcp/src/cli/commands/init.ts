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
import inquirer from 'inquirer';
import { error, info, warn, spinner } from '../utils';
import { saveConfig, defaultConfig } from '../../config';

const CONFIG_DIR = path.join(os.homedir(), '.bigrack');
const DB_PATH = path.join(CONFIG_DIR, 'bigrack.db');

export const initCommand = new Command('init')
  .description('Initialize BigRack global environment (run once per machine)')
  .option('-f, --force', 'Reinitialize even if already initialized')
  .option('-y, --yes', 'Skip all prompts and use default values (non-interactive mode)')
  .action(async (options) => {
    try {
      await runInit(options.force, options.yes);
    } catch (err) {
      error(`Initialization failed: ${err}`);
      process.exit(1);
    }
  });

async function runInit(force: boolean, skipPrompts = false): Promise<void> {
  console.log('\n🚀 BigRack Global Initialization\n');

  // Check if already initialized
  let shouldReinitialize = false;
  if (fs.existsSync(DB_PATH)) {
    if (force) {
      warn('⚠️  WARNING: This will delete your existing database and all data!');

      // Skip confirmation prompt if --yes flag is used
      if (!skipPrompts) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reinitialize? (y/N)',
            default: false,
          },
        ]);

        if (!confirm) {
          info('Initialization cancelled.');
          process.exit(0);
        }
      } else {
        info('Skipping confirmation (--yes flag)');
      }

      shouldReinitialize = true;
      // Delete existing database
      fs.unlinkSync(DB_PATH);
      info('Existing database deleted.');
    } else {
      info('BigRack is already initialized.');
      info('Use --force to reinitialize (⚠️  will delete all data).');
      console.log('\n✅ You can start using BigRack MCP!\n');
      console.log('Next steps:');
      console.log('  1. In your project: Use bigrack_create_project MCP tool in Claude');
      console.log('  2. This will create bigrack.json and link your project to BigRack');
      console.log('');
      return;
    }
  }

  // Step 1: Create directory
  const dirSpinner = spinner('Creating ~/.bigrack directory...').start();
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    dirSpinner.succeed('Directory created');
  } catch (err) {
    dirSpinner.fail('Failed to create directory');
    throw err;
  }

  // Step 1.5: Ask for username (always ask, even if config exists)
  // Priority: USER env var (for Docker/custom) > os.userInfo().username > USERNAME (Windows) > hostname
  const systemUsername =
    process.env.USER || os.userInfo().username || process.env.USERNAME || os.hostname();
  const { loadConfig } = await import('../../config');
  const existingConfig = fs.existsSync(path.join(CONFIG_DIR, 'config.json')) ? loadConfig() : null;
  const currentUsername = existingConfig?.user?.username;

  let finalUsername: string;

  // Skip username prompt if --yes flag is used
  if (skipPrompts) {
    finalUsername = currentUsername || systemUsername;
    info(`Using username: ${finalUsername}`);
  } else {
    // Ask for username (show current if exists, default to system username)
    const { username } = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Enter your username:',
        default: currentUsername || systemUsername,
      },
    ]);

    finalUsername = username.trim() || systemUsername;
  }

  // Step 2: Create or update config file with username
  const configSpinner = spinner('Creating configuration file...').start();
  try {
    const configPath = path.join(CONFIG_DIR, 'config.json');
    if (!fs.existsSync(configPath) || shouldReinitialize || force) {
      const configWithUsername = {
        ...defaultConfig,
        user: {
          username: finalUsername,
        },
      };
      saveConfig(configWithUsername);
      configSpinner.succeed('Configuration file created');
    } else {
      // Update existing config with username
      const configWithUsername: typeof defaultConfig = {
        ...defaultConfig,
        ...existingConfig,
        user: {
          username: finalUsername,
        },
      };
      saveConfig(configWithUsername);
      configSpinner.succeed('Configuration updated with username');
    }
  } catch (err) {
    configSpinner.fail('Failed to create configuration');
    throw err;
  }

  // Step 3: Initialize database
  const dbSpinner = spinner('Initializing database...').start();
  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    }

    // Set DATABASE_URL for Prisma
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = `file:${DB_PATH}`;
    }

    // Run Prisma migrations (will create database if needed)
    const { runMigrations } = await import('../../storage/migrations');
    runMigrations();

    dbSpinner.succeed('Database initialized');
  } catch (err) {
    dbSpinner.fail('Failed to initialize database');
    throw err;
  }

  // Step 4: Create models directory
  const modelsSpinner = spinner('Creating models directory...').start();
  try {
    const modelsDir = path.join(CONFIG_DIR, 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true, mode: 0o700 });
    }
    modelsSpinner.succeed('Models directory created');
  } catch (err) {
    modelsSpinner.fail('Failed to create models directory');
    throw err;
  }

  // Step 5: Download embedding model
  const modelSpinner = spinner(
    'Downloading embedding model (this may take a few minutes, ~80MB)...'
  ).start();
  try {
    const { getEmbeddingService } = await import('../../embeddings');
    const embeddingService = getEmbeddingService();

    // Initialize will download the model if not cached
    await embeddingService.initialize();

    modelSpinner.succeed(`Embedding model downloaded: ${embeddingService.getModelName()}`);
  } catch (err) {
    modelSpinner.fail('Failed to download embedding model');
    throw err;
  }

  // Step 6: Create default user
  const userSpinner = spinner('Creating default user...').start();
  try {
    const { getOrCreateDefaultUser } = await import('../../storage/repositories/users');

    // getOrCreateDefaultUser will create it if it doesn't exist
    getOrCreateDefaultUser();

    userSpinner.succeed('Default user created');
  } catch (err) {
    userSpinner.fail('Failed to create default user');
    throw err;
  }

  // Success message
  console.log('\n✅ BigRack initialized successfully!\n');
  console.log('Next steps:');
  console.log('  1. Go to your project directory');
  console.log('  2. In Claude Code/Desktop: Use bigrack_create_project MCP tool');
  console.log('  3. This will create bigrack.json and link your project');
  console.log('');
  info('Configuration directory: ~/.bigrack/');
  info(`Database: ${DB_PATH}`);
  info(`Models directory: ${path.join(CONFIG_DIR, 'models')}`);
  console.log('');
}
