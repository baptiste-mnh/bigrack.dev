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

const path = require('path');
const os = require('os');

// Default database path for CLI/migrations
const defaultDbPath = path.join(os.homedir(), '.bigrack', 'bigrack.db');

module.exports = {
  schema: 'prisma/schema.prisma',
  datasource: {
    // Use DATABASE_URL from env or default to ~/.bigrack/bigrack.db
    url: process.env.DATABASE_URL || `file:${defaultDbPath}`,
  },
};
