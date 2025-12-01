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

import * as path from 'path';
import * as os from 'os';

export const LOG_DIR = path.join(os.homedir(), '.bigrack', 'logs');

export const loggerConfig = {
  // Log level based on environment
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Base configuration
  base: {
    pid: process.pid,
    hostname: os.hostname(),
  },

  // Timestamp formatting
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'masterPassword',
      'privateKey',
      'secretKey',
      'encryptionKey',
      'token',
      'apiKey',
      'cookie',
      'authorization',
      'recoveryPhrase',
      'mnemonic',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },

  // Serializers for common objects
  serializers: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: (res: any) => ({
      statusCode: res.statusCode,
      headers: res.headers,
    }),
    err: (err: Error) => ({
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
    }),
  },
};
