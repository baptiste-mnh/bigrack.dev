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
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const versionFilePath = path.join(__dirname, '../src/version.ts');

const packageJson = require(packageJsonPath);
const content = `// This file is generated automatically. Do not edit.
export const version = '${packageJson.version}';
`;

fs.writeFileSync(versionFilePath, content);
console.log(`Generated src/version.ts with version ${packageJson.version}`);
