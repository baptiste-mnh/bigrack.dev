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

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config, configSchema } from './schema';
import { defaultConfig } from './defaults';

const CONFIG_DIR = path.join(os.homedir(), '.bigrack');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

/**
 * Load configuration from file, env vars, and defaults
 */
export function loadConfig(): Config {
  let fileConfig: Partial<Config> = {};

  // Ensure config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Load from file if exists
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      fileConfig = JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to load config file, using defaults:', error);
    }
  } else {
    // Create default config
    saveConfig(defaultConfig);
    fileConfig = defaultConfig;
  }

  // Merge with environment variables
  const envConfig = loadFromEnv();

  // Merge: defaults < file < env
  const merged = mergeDeep(defaultConfig, fileConfig, envConfig);

  // Validate and return
  try {
    return configSchema.parse(merged);
  } catch (error) {
    console.error('Invalid configuration, using defaults:', error);
    return defaultConfig;
  }
}

/**
 * Load config overrides from environment variables with BIG_RACK_ prefix
 */
function loadFromEnv(): Partial<Config> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = {};

  if (process.env.BIG_RACK_DAEMON_PORT) {
    env.daemon = { port: parseInt(process.env.BIG_RACK_DAEMON_PORT, 10) };
  }

  if (process.env.BIG_RACK_DAEMON_HOST) {
    env.daemon = { ...env.daemon, host: process.env.BIG_RACK_DAEMON_HOST };
  }

  if (process.env.BIG_RACK_API_URL) {
    env.sync = { apiUrl: process.env.BIG_RACK_API_URL };
  }

  if (process.env.BIG_RACK_LOG_LEVEL) {
    env.logging = { level: process.env.BIG_RACK_LOG_LEVEL };
  }

  if (process.env.BIG_RACK_DB_PATH) {
    env.storage = { databasePath: process.env.BIG_RACK_DB_PATH };
  }

  return env;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config): void {
  try {
    // Validate before saving
    const validated = configSchema.parse(config);

    // Ensure directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(validated, null, 2), 'utf-8');

    // Set permissions to 600 (owner only)
    fs.chmodSync(CONFIG_PATH, 0o600);

    console.log('Configuration saved to', CONFIG_PATH);
  } catch (error) {
    console.error('Failed to save configuration:', error);
    throw error;
  }
}

/**
 * Get config value by dot notation path
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConfigValue(config: Config, keyPath: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return keyPath.split('.').reduce((obj: any, key) => obj?.[key], config);
}

/**
 * Set config value by dot notation path
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setConfigValue(config: Config, keyPath: string, value: any): Config {
  const keys = keyPath.split('.');
  const updated = JSON.parse(JSON.stringify(config)); // Deep clone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = updated;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;

  return configSchema.parse(updated);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  saveConfig(defaultConfig);
}

/**
 * Deep merge objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeDeep(...objects: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isObject = (obj: any) => obj && typeof obj === 'object' && !Array.isArray(obj);

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const prevVal = prev[key];
      const objVal = obj[key];

      if (isObject(prevVal) && isObject(objVal)) {
        prev[key] = mergeDeep(prevVal, objVal);
      } else {
        prev[key] = objVal;
      }
    });

    return prev;
  }, {});
}

/**
 * Expand tilde (~) in paths
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}
