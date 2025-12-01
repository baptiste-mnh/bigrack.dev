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

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';

describe('Test setup', () => {
  it('should have DATABASE_URL configured', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('bigrack-test.db');
  });

  it('should have test database file created by Prisma', () => {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.startsWith('file:')) {
      const dbPath = dbUrl.replace('file:', '');
      // Database should be created by vitest.global-setup.ts via prisma db push
      expect(existsSync(dbPath)).toBe(true);
    }
  });
});
