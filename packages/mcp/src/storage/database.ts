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
 * Database connection and utilities using better-sqlite3
 * Replaces Prisma Client
 */

import Database from 'better-sqlite3';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { storageLogger } from '../logger';

let db: Database.Database | null = null;

/**
 * Get database path
 * Respects DATABASE_URL environment variable for testing
 */
export function getDatabasePath(): string {
  // Check if DATABASE_URL is set (used in tests)
  if (process.env.DATABASE_URL) {
    // Extract path from DATABASE_URL (format: file:/path/to/db.db)
    let dbPath: string;
    const url = process.env.DATABASE_URL;
    if (url.startsWith('file://')) {
      dbPath = url.substring(7); // Remove 'file://' prefix
    } else if (url.startsWith('file:')) {
      dbPath = url.substring(5); // Remove 'file:' prefix
    } else {
      dbPath = url;
    }

    // Resolve relative paths to absolute paths
    // This ensures the path is consistent regardless of current working directory
    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(process.cwd(), dbPath);
    }

    return dbPath;
  }

  return path.join(os.homedir(), '.bigrack', 'bigrack.db');
}

/**
 * Get database connection (singleton)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    }

    // Open database connection
    db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Set busy timeout to handle concurrent access (5 seconds)
    db.pragma('busy_timeout = 5000');

    storageLogger.debug({ dbPath }, 'Database connection established');
  }

  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    storageLogger.debug('Database connection closed');
  }
}

/**
 * Reset database connection (useful for tests)
 * This forces a new connection to be created on next getDatabase() call
 */
export function resetDatabase(): void {
  closeDatabase();
}

/**
 * Transaction helper - wraps a function in a transaction
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  return database.transaction(fn)(database);
}

/**
 * Helper to convert SQLite row dates to Date objects
 * SQLite stores dates as ISO strings or timestamps
 */
export function parseDate(value: string | number | null): Date | null {
  if (!value) return null;
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
}

/**
 * Helper to convert Date to SQLite-compatible format
 */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Helper to generate UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Helper to parse JSON fields (handles null and invalid JSON)
 */
export function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    storageLogger.warn({ value }, 'Failed to parse JSON field');
    return null;
  }
}

/**
 * Helper to stringify JSON fields
 */
export function stringifyJson(value: any): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/**
 * Execute a prepared statement and map results
 */
export function query<T>(sql: string, params: any[] = [], mapper?: (row: any) => T): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  const rows = stmt.all(...params);

  if (mapper) {
    return rows.map(mapper);
  }

  return rows as T[];
}

/**
 * Execute a prepared statement and return first result
 */
export function queryOne<T>(sql: string, params: any[] = [], mapper?: (row: any) => T): T | null {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  const row = stmt.get(...params);

  if (!row) return null;

  if (mapper) {
    return mapper(row);
  }

  return row as T;
}

/**
 * Execute a mutation (INSERT, UPDATE, DELETE)
 */
export function execute(sql: string, params: any[] = []): Database.RunResult {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return stmt.run(...params);
}

/**
 * Execute multiple statements in a transaction
 */
export function executeMany(statements: Array<{ sql: string; params: any[] }>): void {
  transaction((db) => {
    for (const { sql, params } of statements) {
      db.prepare(sql).run(...params);
    }
  });
}

// Note: database instance getter is exported as getDatabase()
