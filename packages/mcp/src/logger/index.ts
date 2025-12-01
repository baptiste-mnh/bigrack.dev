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

import pino from 'pino';
import createStream from 'pino-rotating-file-stream';
import * as fs from 'fs';
import { loggerConfig, LOG_DIR } from './config';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create rotating file stream
const fileStream = createStream({
  path: LOG_DIR,
  filename: 'bigrack.log',
  size: '10M', // Rotate every 10MB
  interval: '1d', // Rotate daily
  compress: 'gzip', // Compress old logs
  maxFiles: 10, // Keep 10 files
});

// Detect if we're running as MCP server (stdio transport)
// In MCP mode, we must NEVER log to stdout/stderr as it breaks the protocol
const isMCPMode = process.env.MCP_MODE === 'true' || process.argv[1]?.includes('bigrack-mcp');

// Create logger with multiple transports
export const logger = pino(
  loggerConfig,
  process.env.NODE_ENV === 'production' || isMCPMode
    ? fileStream
    : pino.multistream([
        { stream: fileStream },
        {
          stream: pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }),
        },
      ])
);

// Child loggers for different contexts
export const daemonLogger = logger.child({ context: 'daemon' });
export const cliLogger = logger.child({ context: 'cli' });
export const storageLogger = logger.child({ context: 'storage' });
export const cryptoLogger = logger.child({ context: 'crypto' });
export const syncLogger = logger.child({ context: 'sync' });
export const apiLogger = logger.child({ context: 'api' });

export default logger;
