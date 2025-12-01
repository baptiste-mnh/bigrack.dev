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

import { join } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import Database from 'better-sqlite3';
import * as vss from 'sqlite-vss';

// Use /tmp directory for test database to keep project clean
const testDbDir = join(tmpdir(), 'bigrack-tests');
const testDbPath = join(testDbDir, 'bigrack-test.db');
const testDbUrl = `file:${testDbPath}`;

/**
 * Global setup function called once before all tests
 * Configures the test environment and runs Prisma migrations
 */
export default async function setupConfig(): Promise<void> {
  // Set DATABASE_URL with absolute path
  process.env.DATABASE_URL = testDbUrl;

  // Ensure test directory exists
  if (!existsSync(testDbDir)) {
    mkdirSync(testDbDir, { recursive: true });
  }

  // Remove existing test database for a clean slate
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }

  // Run Prisma db push to create the schema (Prisma 7 syntax)
  try {
    execSync('npx prisma db push --accept-data-loss', {
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to run Prisma db push:', error);
    throw error;
  }

  // Initialize sqlite-vss tables for vector search
  try {
    const db = new Database(testDbPath);
    vss.load(db);

    // Create the rowid mapping table (required by vector-search.ts)
    db.exec(`
      CREATE TABLE IF NOT EXISTS vector_embeddings_rowid_map (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        embedding_id TEXT NOT NULL UNIQUE
      );
    `);

    // Create virtual table for vector search
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vss_embeddings USING vss0(
        embedding(384)
      );
    `);

    db.close();
    console.log('sqlite-vss tables initialized');
  } catch (error) {
    console.error('Failed to initialize sqlite-vss:', error);
    throw error;
  }

  console.log(`Test database configured: ${testDbPath}`);
}
