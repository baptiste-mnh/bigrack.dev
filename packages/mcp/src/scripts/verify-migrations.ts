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
 * Script to verify Prisma migrations in Docker
 * Checks that migrations are properly applied and tables exist
 */

import { getPrisma } from '../storage/prisma';
import * as os from 'os';
import * as path from 'path';

async function verifyMigrations() {
  console.log('\n🔍 Verifying Prisma Migrations\n');

  // Set DATABASE_URL if not already set
  if (!process.env.DATABASE_URL) {
    const dbPath = path.join(os.homedir(), '.bigrack', 'bigrack.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  try {
    const prisma = getPrisma();

    // Check _prisma_migrations table
    console.log('1. Checking _prisma_migrations table...');
    const migrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
      applied_steps_count: number;
    }>>`
      SELECT migration_name, finished_at, applied_steps_count
      FROM _prisma_migrations
      ORDER BY finished_at DESC
    `;

    console.log(`   Found ${migrations.length} migration(s):`);
    for (const migration of migrations) {
      const status = migration.finished_at ? '✅ Applied' : '⏳ Pending';
      console.log(`   - ${migration.migration_name}: ${status} (steps: ${migration.applied_steps_count})`);
    }

    // Check if init migration exists
    const initMigration = migrations.find(m => m.migration_name.includes('init'));
    if (!initMigration) {
      console.error('   ❌ ERROR: init migration not found!');
      process.exit(1);
    }
    if (!initMigration.finished_at) {
      console.error('   ❌ ERROR: init migration not applied!');
      process.exit(1);
    }
    console.log('   ✅ Init migration found and applied\n');

    // Check if test table exists
    console.log('2. Checking test_migration_table...');
    try {
      const testTableExists = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='test_migration_table'
      `;
      
      if (testTableExists.length > 0) {
        console.log('   ✅ test_migration_table exists');
        
        // Try to query it
        const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM test_migration_table
        `;
        console.log(`   ✅ Table is accessible (rows: ${count[0].count})`);
      } else {
        console.log('   ⚠️  test_migration_table does not exist yet (migration may not be applied)');
      }
    } catch (err) {
      console.log(`   ⚠️  Could not check test_migration_table: ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log('\n✅ Migration verification completed successfully!\n');
  } catch (err) {
    console.error('\n❌ Migration verification failed:');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    const prisma = getPrisma();
    await prisma.$disconnect();
  }
}

verifyMigrations().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

