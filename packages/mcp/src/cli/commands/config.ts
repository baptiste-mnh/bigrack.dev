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

import { Command } from 'commander';
import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  defaultConfig,
} from '../../config';
import { success, error, json } from '../utils';

export const configCommand = new Command('config')
  .description('Manage BigRack configuration')
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .option('--json', 'Output as JSON')
      .action((options) => {
        try {
          const config = loadConfig();
          if (options.json) {
            json(config);
          } else {
            console.log(JSON.stringify(config, null, 2));
          }
        } catch (err) {
          error(`Failed to load configuration: ${err}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get configuration value')
      .argument('<key>', 'Configuration key (e.g., daemon.port)')
      .action((key: string) => {
        try {
          const config = loadConfig();
          const value = getConfigValue(config, key);
          console.log(value);
        } catch (err) {
          error(`Failed to get config value: ${err}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set configuration value')
      .argument('<key>', 'Configuration key (e.g., daemon.port)')
      .argument('<value>', 'New value')
      .action((key: string, value: string) => {
        try {
          const config = loadConfig();

          // Try to parse as JSON first
          let parsedValue: any = value;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            // If not valid JSON, keep as string
          }

          const updated = setConfigValue(config, key, parsedValue);
          saveConfig(updated);
          success(`Set ${key} = ${value}`);
        } catch (err) {
          error(`Failed to set config value: ${err}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('reset')
      .description('Reset configuration to defaults')
      .option('-f, --force', 'Skip confirmation')
      .action((options) => {
        try {
          if (!options.force) {
            warn('This will reset all configuration to defaults. Use --force to confirm.');
            process.exit(0);
          }

          saveConfig(defaultConfig);
          success('Configuration reset to defaults');
        } catch (err) {
          error(`Failed to reset configuration: ${err}`);
          process.exit(1);
        }
      })
  );

function warn(message: string): void {
  console.warn(message);
}
