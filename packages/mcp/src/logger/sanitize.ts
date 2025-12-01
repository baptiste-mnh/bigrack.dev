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
 * Sanitize log data to prevent leaking sensitive information
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'masterpassword',
    'privatekey',
    'publickey',
    'secretkey',
    'encryptionkey',
    'token',
    'apikey',
    'cookie',
    'authorization',
    'recoveryphrase',
    'mnemonic',
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();

    if (sensitiveKeys.some((sk) => keyLower.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
