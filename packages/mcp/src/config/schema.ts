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

import { z } from 'zod';

export const configSchema = z.object({
  // Daemon settings
  daemon: z
    .object({
      port: z.number().int().min(1024).max(65535).default(3123),
      host: z.string().default('127.0.0.1'),
      autoStart: z.boolean().default(true),
    })
    .default({}),

  // Storage settings
  storage: z
    .object({
      databasePath: z.string().default('~/.bigrack/bigrack.db'),
      cacheSize: z.number().int().min(10).max(1000).default(100), // MB
      vacuumInterval: z.number().int().default(86400), // seconds (1 day)
    })
    .default({}),

  // Vector search settings
  vectorSearch: z
    .object({
      enabled: z.boolean().default(true),
      modelPath: z.string().default('~/.bigrack/models/'),
      modelName: z.string().default('Xenova/all-MiniLM-L6-v2'),
      maxResults: z.number().int().min(1).max(100).default(20),
      embeddingDimensions: z.number().int().default(384), // 384 for MiniLM, 768 for MPNet
    })
    .default({}),

  // Sync settings
  sync: z
    .object({
      enabled: z.boolean().default(false),
      apiUrl: z.string().url().default('https://api.bigrack.dev'),
      interval: z.number().int().min(60).max(86400).default(300), // seconds
      autoSync: z.boolean().default(true),
    })
    .default({}),

  // Security settings
  security: z
    .object({
      encryptionAlgorithm: z.enum(['aes-256-gcm']).default('aes-256-gcm'),
      keyDerivationIterations: z.number().int().min(10000).default(100000),
    })
    .default({}),

  // Logging settings
  logging: z
    .object({
      level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
      logDir: z.string().default('~/.bigrack/logs/'),
      maxFiles: z.number().int().min(1).max(100).default(10),
    })
    .default({}),

  // Feature flags
  features: z
    .object({
      experimentalPlugins: z.boolean().default(false),
      telemetry: z.boolean().default(false),
    })
    .default({}),

  // User preferences
  preferences: z
    .object({
      defaultEditor: z.string().default('$EDITOR'),
      colorOutput: z.boolean().default(true),
    })
    .default({}),

  // User info
  user: z
    .object({
      username: z.string().optional(),
    })
    .default({}),

  // Dashboard settings
  dashboard: z
    .object({
      url: z.string().url().default('https://dashboard.bigrack.dev'),
    })
    .default({}),

  // Version (for config migration)
  version: z.string().default('1.0.0'),
});

export type Config = z.infer<typeof configSchema>;
