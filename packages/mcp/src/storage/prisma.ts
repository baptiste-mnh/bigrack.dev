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

import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { storageLogger } from '../logger';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the database URL from env or use default
 */
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const dbPath = path.join(os.homedir(), '.bigrack', 'bigrack.db');
  return `file:${dbPath}`;
}

/**
 * Get the database file path (without file: prefix)
 * Useful for components that need direct database access (e.g., sqlite-vss)
 */
export function getDatabasePath(): string {
  const dbUrl = getDatabaseUrl();
  return dbUrl.replace(/^file:/, '');
}

/**
 * Ensure the database directory exists
 */
function ensureDatabaseDirectory(dbUrl: string): void {
  // Extract path from file: URL
  const dbPath = dbUrl.replace(/^file:/, '');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

let prisma: PrismaClient | null = null;

/**
 * Get Prisma Client instance (singleton with lazy initialization)
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    const dbUrl = getDatabaseUrl();

    // Ensure directory exists
    ensureDatabaseDirectory(dbUrl);

    // Create Prisma adapter with URL (Prisma 7 style)
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });

    // Create Prisma client with adapter
    prisma = new PrismaClient({ adapter });

    storageLogger.debug(`Prisma Client initialized with database: ${dbUrl}`);
  }

  return prisma;
}

/**
 * Disconnect Prisma Client and reset the singleton
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    storageLogger.debug('Prisma Client disconnected');
  }
}

/**
 * Proxy object that lazily initializes the Prisma client on first access.
 * This allows DATABASE_URL to be set after module import (e.g., in tests).
 */
export const prismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrisma();
    const value = client[prop as keyof PrismaClient];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
