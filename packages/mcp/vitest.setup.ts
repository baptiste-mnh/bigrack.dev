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

import { afterAll } from 'vitest';
import { join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

// Use /tmp directory for test database (same as vitest.global-setup.ts)
const testDbDir = join(tmpdir(), 'bigrack-tests');
const testDbPath = join(testDbDir, 'bigrack-test.db');
const testDbUrl = `file:${testDbPath}`;

// Ensure DATABASE_URL is set with absolute path
process.env.DATABASE_URL = testDbUrl;

// Global cleanup after all tests (runs once per test file)
afterAll(() => {
  // Note: We don't delete the DB here as it might be used by other test files
  // The global-setup will clean it before each test run
  if (existsSync(testDbPath)) {
    console.log(`Test database at: ${testDbPath}`);
  }
});
