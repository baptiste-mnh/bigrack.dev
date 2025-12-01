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

import chalk from 'chalk';

// ============================================================================
// Text Formatting
// ============================================================================

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

// ============================================================================
// Status Formatting
// ============================================================================

/**
 * Format status with emoji and color
 */
export function formatStatus(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green('✅ completed  ');
    case 'in-progress':
      return chalk.cyan('🔄 in-progress');
    case 'pending':
      return chalk.gray('⏸️  pending   ');
    case 'blocked':
      return chalk.red('🚫 blocked    ');
    default:
      return chalk.gray('⚪ unknown   ');
  }
}

/**
 * Format status (short version without padding)
 */
export function formatStatusShort(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green('✅ completed');
    case 'in-progress':
      return chalk.cyan('🔄 in-progress');
    case 'pending':
      return chalk.gray('⏸️ pending');
    case 'blocked':
      return chalk.red('🚫 blocked');
    default:
      return chalk.gray('⚪ unknown');
  }
}

// ============================================================================
// Priority Formatting
// ============================================================================

/**
 * Format priority with emoji and color
 */
export function formatPriority(priority: string): string {
  switch (priority) {
    case 'critical':
      return chalk.red('🔴 critical');
    case 'high':
      return chalk.yellow('🟠 high    ');
    case 'medium':
      return chalk.blue('🟡 medium ');
    case 'low':
      return chalk.green('🟢 low     ');
    default:
      return chalk.gray('⚪ unknown');
  }
}

/**
 * Format priority (short version without padding)
 */
export function formatPriorityShort(priority: string): string {
  switch (priority) {
    case 'critical':
      return chalk.red('🔴 critical');
    case 'high':
      return chalk.yellow('🟠 high');
    case 'medium':
      return chalk.blue('🟡 medium');
    case 'low':
      return chalk.green('🟢 low');
    default:
      return chalk.gray('⚪ unknown');
  }
}

// ============================================================================
// Type Formatting
// ============================================================================

/**
 * Format task type
 */
export function formatType(type: string | null): string {
  if (!type) return chalk.gray('none');
  switch (type) {
    case 'setup':
      return chalk.magenta('setup         ');
    case 'implementation':
      return chalk.blue('implementation');
    case 'testing':
      return chalk.yellow('testing       ');
    case 'documentation':
      return chalk.cyan('documentation ');
    default:
      return chalk.gray(type.padEnd(14));
  }
}

/**
 * Format task type (short version without padding)
 */
export function formatTypeShort(type: string | null): string {
  if (!type) return chalk.gray('none');
  switch (type) {
    case 'setup':
      return chalk.magenta('setup');
    case 'implementation':
      return chalk.blue('implementation');
    case 'testing':
      return chalk.yellow('testing');
    case 'documentation':
      return chalk.cyan('documentation');
    default:
      return chalk.gray(type);
  }
}

// ============================================================================
// ID Formatting
// ============================================================================

/**
 * Format task ID (external ID or order number)
 */
export function formatTaskId(externalId: string | null, order: number): string {
  return externalId || `#${order}`;
}

/**
 * Format task ID with color
 */
export function formatTaskIdColored(externalId: string | null, order: number): string {
  return chalk.cyan(formatTaskId(externalId, order));
}
