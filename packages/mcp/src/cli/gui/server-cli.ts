#!/usr/bin/env node
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
 * CLI entry point for GUI server (used when running as background process)
 */
import { startGuiServer } from './server';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 3333;

const noOpen = args.includes('--no-open');

startGuiServer({
  port,
  noOpen,
}).catch((error) => {
  console.error('Failed to start GUI server:', error);
  process.exit(1);
});
