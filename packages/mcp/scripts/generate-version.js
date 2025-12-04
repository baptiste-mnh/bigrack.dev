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
