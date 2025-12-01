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

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';

// Load .env.test to ensure DATABASE_URL is available
const envTestPath = resolve(__dirname, '.env.test');
if (existsSync(envTestPath)) {
  config({ path: envTestPath });
}

// Get database path from environment
const getTestDatabasePath = (): string => {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('file:')) {
    return dbUrl.replace('file:', '');
  }
  return 'bigrack-test.db';
};

const testDbPath = getTestDatabasePath();

/**
 * Global teardown function called once after all tests
 * Removes the test database file
 */
async function teardown(): Promise<void> {
  cleanup();
}

// Cleanup function
function cleanup(): void {
  if (existsSync(testDbPath)) {
    try {
      unlinkSync(testDbPath);
      console.log(`Test database cleaned up: ${testDbPath}`);
    } catch (error) {
      // Ignore errors if file is locked or doesn't exist
      console.warn(`Failed to delete test database: ${error}`);
    }
  }
}

// Register cleanup on process exit as a fallback
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

export default teardown;

