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

import { Config } from './schema';

export const defaultConfig: Config = {
  daemon: {
    port: 3123,
    host: '127.0.0.1',
    autoStart: true,
  },
  storage: {
    databasePath: '~/.bigrack/bigrack.db',
    cacheSize: 100,
    vacuumInterval: 86400,
  },
  vectorSearch: {
    enabled: true,
    modelPath: '~/.bigrack/models/',
    modelName: 'Xenova/all-MiniLM-L6-v2',
    maxResults: 20,
    embeddingDimensions: 384,
  },
  sync: {
    enabled: false,
    apiUrl: 'https://api.bigrack.dev',
    interval: 300,
    autoSync: true,
  },
  security: {
    encryptionAlgorithm: 'aes-256-gcm',
    keyDerivationIterations: 100000,
  },
  logging: {
    level: 'info',
    logDir: '~/.bigrack/logs/',
    maxFiles: 10,
  },
  features: {
    experimentalPlugins: false,
    telemetry: false,
  },
  preferences: {
    defaultEditor: process.env.EDITOR || process.env.VISUAL || 'vim',
    colorOutput: true,
  },
  user: {
    username: undefined,
  },
  dashboard: {
    url: 'https://dashboard.bigrack.dev',
  },
  version: '1.0.0',
};
