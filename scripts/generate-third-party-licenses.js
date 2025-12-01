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
 * Generate THIRD-PARTY-LICENSES.md for a specific package in the monorepo
 * Recursively reads package.json files to extract all transitive dependencies
 */

const fs = require('fs');
const path = require('path');

function findPackageJson(packageName, rootDir) {
  // Try direct path
  let packagePath = path.join(rootDir, 'node_modules', packageName, 'package.json');
  if (fs.existsSync(packagePath)) {
    return packagePath;
  }

  // Try scoped package
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    packagePath = path.join(rootDir, 'node_modules', scope, name, 'package.json');
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }
  }

  return null;
}

function readPackageInfo(packageJsonPath, packageName, packageVersion) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const license = pkg.license || (pkg.licenses && pkg.licenses[0]?.type) || 'UNKNOWN';

    let repoUrl = null;
    if (pkg.repository) {
      if (typeof pkg.repository === 'string') {
        repoUrl = pkg.repository.replace(/^git\+/, '').replace(/\.git$/, '');
      } else if (pkg.repository.url) {
        repoUrl = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
      }
    } else if (pkg.homepage) {
      repoUrl = pkg.homepage;
    }

    return {
      name: packageName,
      version: pkg.version || packageVersion,
      license,
      repository: repoUrl,
      dependencies: pkg.dependencies || {}
    };
  } catch (error) {
    console.error(`Error reading ${packageJsonPath}:`, error.message);
    return null;
  }
}

function collectDependencies(packageJson, rootDir, collected = new Map(), depth = 0) {
  const dependencies = packageJson.dependencies || {};

  for (const [depName, depVersion] of Object.entries(dependencies)) {
    // Skip our own packages
    if (depName.startsWith('@bigrack/')) {
      continue;
    }

    // Find package.json
    const depPackageJsonPath = findPackageJson(depName, rootDir);
    if (!depPackageJsonPath) {
      console.warn(`Could not find ${depName} in node_modules`);
      continue;
    }

    // Read package info
    const depInfo = readPackageInfo(depPackageJsonPath, depName, depVersion);
    if (!depInfo) {
      continue;
    }

    // Check if already collected (avoid duplicates)
    const key = `${depName}@${depInfo.version}`;
    if (collected.has(key)) {
      continue;
    }

    // Add to collected
    collected.set(key, {
      name: depName,
      version: depInfo.version,
      license: depInfo.license,
      repository: depInfo.repository
    });

    // Recursively collect transitive dependencies (limit depth to avoid infinite loops)
    if (depth < 10 && depInfo.dependencies) {
      collectDependencies(depInfo, rootDir, collected, depth + 1);
    }
  }

  return collected;
}

function generateMarkdown(licenses, excludePackages = []) {
  const lines = ['# Third-Party Licenses', ''];
  lines.push('> Generated from production dependencies only (including transitive dependencies).');
  lines.push('');

  // Sort by package name
  const sorted = Array.from(licenses.values())
    .filter(l => !excludePackages.includes(l.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const info of sorted) {
    const repoLink = info.repository
      ? `[Repository](${info.repository})`
      : 'No repository';

    lines.push(`- **${info.name}**@${info.version} - ${info.license} - ${repoLink}`);
  }

  return lines.join('\n');
}

function findWorkspaces(rootDir) {
  const rootPackageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const workspaces = rootPackageJson.workspaces || [];
  const workspacePaths = [];

  for (const workspace of workspaces) {
    const globPattern = workspace.replace(/\*/, '**');
    const workspaceDir = path.join(rootDir, workspace.replace(/\*/, ''));

    if (fs.existsSync(workspaceDir)) {
      // Find all subdirectories with package.json
      const entries = fs.readdirSync(workspaceDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packageJsonPath = path.join(workspaceDir, entry.name, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            workspacePaths.push(path.join(workspaceDir, entry.name));
          }
        }
      }
    }
  }

  return workspacePaths;
}

function main() {
  const args = process.argv.slice(2);
  const packagePath = args[0] || 'packages/mcp';
  const outputPath = args[1] || (packagePath === 'root' ? 'THIRD-PARTY-LICENSES.md' : path.join(packagePath, 'THIRD-PARTY-LICENSES.md'));

  const rootDir = path.resolve(__dirname, '..');

  let collected = new Map();
  let excludePackages = [];

  if (packagePath === 'root') {
    // Generate consolidated licenses for all workspaces
    console.log('Generating consolidated THIRD-PARTY-LICENSES.md for all workspaces...');

    const workspacePaths = findWorkspaces(rootDir);
    console.log(`Found ${workspacePaths.length} workspaces`);

    // Collect dependencies from all workspaces
    for (const workspacePath of workspacePaths) {
      const packageJsonPath = path.join(workspacePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        continue;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const packageName = packageJson.name;

      // Skip if no dependencies
      if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
        continue;
      }

      console.log(`  Processing ${packageName}...`);
      collectDependencies(packageJson, rootDir, collected);
      excludePackages.push(packageName);
    }

    excludePackages.push('bigrack-monorepo');
  } else {
    // Generate for a specific package
    const packageDir = path.join(rootDir, packagePath);
    const packageJsonPath = path.join(packageDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.error(`Package.json not found at ${packageJsonPath}`);
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageName = packageJson.name;

    console.log(`Generating THIRD-PARTY-LICENSES.md for ${packageName}...`);

    // Collect all dependencies recursively
    collectDependencies(packageJson, rootDir, collected);
    excludePackages = [packageName];
  }

  console.log(`Found ${collected.size} unique dependencies`);

  // Generate markdown
  const markdown = generateMarkdown(collected, excludePackages);

  // Write to file
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`✓ Generated ${outputPath} with ${collected.size} dependencies`);
}

if (require.main === module) {
  main();
}
