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

// BigRack.dev MCP Daemon

export const version = '0.1.0';

// Export logger
export * from './logger';
export { default as logger } from './logger';

// Export config
export * from './config';

// Export storage
export * from './storage';

// Export embeddings
export * from './embeddings';

// Export search
export * from './search';

// Export CLI
export * from './cli';

// Export MCP
export * from './mcp';

export function start() {
  console.log('BigRack MCP daemon starting...');
}
