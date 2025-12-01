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

/**
 * Prisma Migrate wrapper for BigRack
 * Uses Prisma Migrate to manage database schema migrations
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { storageLogger } from '../../logger';
import { getPrisma } from '../prisma';

/**
 * Get Prisma schema path
 * Works both in development (src/) and production (dist/)
 */
function getPrismaSchemaPath(): string {
  // Find package root - try node_modules in package root first, then workspace root
  const packageRoot = path.join(__dirname, '../../..');
  const workspaceRoot = path.join(__dirname, '../../../../..');

  // Try package root first (for monorepo structure)
  const schemaPathInPackage = path.join(packageRoot, 'prisma/schema.prisma');

  if (fs.existsSync(schemaPathInPackage)) {
    return schemaPathInPackage;
  }

  // Try workspace root (for Docker/compiled builds)
  const schemaPathInWorkspace = path.join(workspaceRoot, 'packages/mcp/prisma/schema.prisma');
  if (fs.existsSync(schemaPathInWorkspace)) {
    return schemaPathInWorkspace;
  }

  // Fallback to relative path from __dirname (for development)
  return path.join(__dirname, '../../prisma/schema.prisma');
}

/**
 * Get database path
 */
function getDatabasePath(): string {
  return (
    process.env.DATABASE_URL?.replace('file:', '') ||
    path.join(os.homedir(), '.bigrack', 'bigrack.db')
  );
}

/**
 * Check if database file exists
 */
export function isDatabaseInitialized(): boolean {
  const dbPath = getDatabasePath();
  try {
    return fs.existsSync(dbPath);
  } catch {
    return false;
  }
}

/**
 * Run Prisma Migrate Deploy (applies pending migrations)
 * This is the production-safe way to apply migrations
 */
export function runMigrations(): void {
  storageLogger.debug('Starting Prisma Migrate Deploy');

  try {
    // Set DATABASE_URL if not already set
    if (!process.env.DATABASE_URL) {
      const dbPath = path.join(os.homedir(), '.bigrack', 'bigrack.db');
      process.env.DATABASE_URL = `file:${dbPath}`;
    }

    // Ensure database directory exists
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    }

    // Run prisma migrate deploy
    // This applies all pending migrations without prompting
    // Find prisma binary - try node_modules in package root first, then workspace root
    const packageRoot = path.join(__dirname, '../../..');
    const workspaceRoot = path.join(__dirname, '../../../../..');
    let prismaPath = path.join(packageRoot, 'node_modules/.bin/prisma');
    if (!fs.existsSync(prismaPath)) {
      prismaPath = path.join(workspaceRoot, 'node_modules/.bin/prisma');
    }

    // Get Prisma schema path
    const schemaPath = getPrismaSchemaPath();

    // Fallback to npx if prisma binary not found
    const command = fs.existsSync(prismaPath)
      ? `"${prismaPath}" migrate deploy --schema="${schemaPath}"`
      : `npx prisma migrate deploy --schema="${schemaPath}"`;

    storageLogger.debug(
      { command, databaseUrl: process.env.DATABASE_URL },
      'Running Prisma Migrate Deploy'
    );

    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    storageLogger.debug('Prisma Migrate Deploy completed successfully');
  } catch (err) {
    storageLogger.error({ err }, 'Prisma Migrate Deploy failed');
    throw err;
  }
}

/**
 * Get list of pending migrations using Prisma
 */
export async function getPendingMigrations(): Promise<
  Array<{ name: string; appliedAt: Date | null }>
> {
  try {
    const prisma = getPrisma();

    // Query Prisma's _prisma_migrations table
    const result = await prisma.$queryRaw<
      Array<{ migration_name: string; applied_steps_count: number }>
    >`
      SELECT migration_name, applied_steps_count 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC
    `;

    // Get all migration files from prisma/migrations directory
    // Get migrations directory relative to schema path
    const schemaPath = getPrismaSchemaPath();
    const migrationsDir = path.join(path.dirname(schemaPath), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();

    const appliedMigrations = new Set(result.map((r) => r.migration_name));

    const pending: Array<{ name: string; appliedAt: Date | null }> = [];

    for (const migrationDir of migrationDirs) {
      const migrationName = migrationDir;
      const isApplied = appliedMigrations.has(migrationName);

      if (!isApplied) {
        pending.push({
          name: migrationName,
          appliedAt: null,
        });
      }
    }

    return pending;
  } catch (err) {
    // If _prisma_migrations table doesn't exist, all migrations are pending
    storageLogger.debug({ err }, 'Could not query pending migrations, assuming all are pending');

    // Get migrations directory relative to schema path
    const schemaPath = getPrismaSchemaPath();
    const migrationsDir = path.join(path.dirname(schemaPath), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();

    return migrationDirs.map((name: string) => ({
      name,
      appliedAt: null,
    }));
  }
}

/**
 * Check if there are pending migrations
 */
export async function hasPendingMigrations(): Promise<boolean> {
  const pending = await getPendingMigrations();
  return pending.length > 0;
}
