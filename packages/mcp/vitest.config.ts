import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load .env.test if it exists
const envTestPath = resolve(__dirname, '.env.test');
if (existsSync(envTestPath)) {
  config({ path: envTestPath });
}

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
    globalTeardown: ['./vitest.global-teardown.ts'],
    // Use GitHub Actions reporter in CI environment
    reporters: process.env.GITHUB_ACTIONS ? ['github-actions', 'verbose'] : ['verbose'],
    outputFile: process.env.GITHUB_ACTIONS
      ? {
          json: './test-results.json',
        }
      : undefined,
  } as any, // Type assertion needed for globalSetup/globalTeardown in Vitest 3.x
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
