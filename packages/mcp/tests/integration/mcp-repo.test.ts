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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { bigrackCreateRack } from '../../src/mcp/tools/bigrack-create-repo';
import { disconnectPrisma, getPrisma } from '../../src/storage/prisma';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Test server that exposes MCP tools via HTTP
function createTestServer(): Express {
  const app = express();
  app.use(express.json());

  // POST /api/mcp/create-repo - Create a new repo
  app.post('/api/mcp/create-repo', async (req, res) => {
    try {
      const result = await bigrackCreateRack(req.body);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/mcp/repos - List all repos (using Prisma)
  app.get('/api/mcp/repos', async (_req, res) => {
    try {
      const prisma = getPrisma();
      const repos = await prisma.repo.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({
        success: true,
        repos,
        count: repos.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return app;
}

describe('MCP Repo API', () => {
  let app: Express;
  let testWorkspaceDir: string;

  beforeAll(async () => {
    // Ensure DATABASE_URL is set for tests (from .env.test)
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:bigrack-test.db';
    }

    // Disconnect any existing Prisma connection to avoid conflicts
    await disconnectPrisma();

    // Note: Prisma migrations are run in vitest.global-setup.ts via `prisma db push`

    app = createTestServer();

    // Create a temporary workspace directory for tests
    testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-'));
    process.chdir(testWorkspaceDir);
  });

  afterAll(async () => {
    // Cleanup: remove test workspace directory and bigrack.json if it exists
    try {
      const bigrackJsonPath = path.join(testWorkspaceDir, 'bigrack.json');
      if (fs.existsSync(bigrackJsonPath)) {
        fs.unlinkSync(bigrackJsonPath);
      }
      fs.rmdirSync(testWorkspaceDir);
    } catch {
      // Ignore cleanup errors
    }

    // Disconnect Prisma
    await disconnectPrisma();
  });

  describe('POST /api/mcp/create-repo', () => {
    it('should create a new repo successfully', async () => {
      // Use a unique workspace for this test
      const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-create-'));
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const response = await request(app)
          .post('/api/mcp/create-repo')
          .send({
            projectName: 'test-repo',
            description: 'Test repository for MCP testing',
            workspacePath: testDir,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('repoId');
        expect(response.body).toHaveProperty('projectName', 'test-repo');
        expect(response.body).toHaveProperty('message');
        expect(response.body.repoId).toBeTruthy();
      } finally {
        process.chdir(originalCwd);
        // Cleanup
        const bigrackJsonPath = path.join(testDir, 'bigrack.json');
        if (fs.existsSync(bigrackJsonPath)) {
          fs.unlinkSync(bigrackJsonPath);
        }
        fs.rmdirSync(testDir);
      }
    });

    it('should create a repo with default name from folder', async () => {
      const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-default-'));
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const response = await request(app)
          .post('/api/mcp/create-repo')
          .send({
            description: 'Another test repo',
            workspacePath: testDir,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('repoId');
        expect(response.body).toHaveProperty('projectName');
      } finally {
        process.chdir(originalCwd);
        const bigrackJsonPath = path.join(testDir, 'bigrack.json');
        if (fs.existsSync(bigrackJsonPath)) {
          fs.unlinkSync(bigrackJsonPath);
        }
        fs.rmdirSync(testDir);
      }
    });

    it('should return error if repo already exists', async () => {
      const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-dup-'));
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // First create a repo
        await request(app)
          .post('/api/mcp/create-repo')
          .send({
            projectName: 'duplicate-repo',
            description: 'First repo',
            workspacePath: testDir,
          })
          .expect(201);

        // Try to create the same repo again
        const response = await request(app)
          .post('/api/mcp/create-repo')
          .send({
            projectName: 'duplicate-repo',
            description: 'Duplicate repo',
            workspacePath: testDir,
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('already initialized');
      } finally {
        process.chdir(originalCwd);
        const bigrackJsonPath = path.join(testDir, 'bigrack.json');
        if (fs.existsSync(bigrackJsonPath)) {
          fs.unlinkSync(bigrackJsonPath);
        }
        fs.rmdirSync(testDir);
      }
    });
  });

  describe('GET /api/mcp/repos', () => {
    it('should list all repos', async () => {
      const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-list-'));

      try {
        // Create a repo first
        const createResponse = await request(app)
          .post('/api/mcp/create-repo')
          .send({
            projectName: 'list-test-repo',
            description: 'Repo for listing test',
            workspacePath: testDir,
          })
          .expect(201);

        const repoId = createResponse.body.repoId;

        // List all repos
        const response = await request(app).get('/api/mcp/repos').expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('repos');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.repos)).toBe(true);
        expect(response.body.count).toBeGreaterThan(0);

        // Verify the created repo is in the list
        const foundRepo = response.body.repos.find((repo: any) => repo.id === repoId);
        expect(foundRepo).toBeDefined();
        expect(foundRepo.name).toBe('list-test-repo');
      } finally {
        const bigrackJsonPath = path.join(testDir, 'bigrack.json');
        if (fs.existsSync(bigrackJsonPath)) {
          fs.unlinkSync(bigrackJsonPath);
        }
        try {
          fs.rmdirSync(testDir);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should return list of repos', async () => {
      // This test just checks that the endpoint works
      const response = await request(app).get('/api/mcp/repos').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('repos');
      expect(Array.isArray(response.body.repos)).toBe(true);
    });
  });

  describe('Integration: Create and List', () => {
    it('should create multiple repos and list them all', async () => {
      const testDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-int1-'));
      const testDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'bigrack-test-int2-'));

      try {
        // Create first repo
        const repo1 = await request(app)
          .post('/api/mcp/create-repo')
          .send({
            projectName: 'integration-repo-1',
            description: 'First integration repo',
            workspacePath: testDir1,
          })
          .expect(201);

        // Create second repo
        const repo2 = await request(app)
          .post('/api/mcp/create-repo')
          .send({
            projectName: 'integration-repo-2',
            description: 'Second integration repo',
            workspacePath: testDir2,
          })
          .expect(201);

        // List all repos
        const listResponse = await request(app).get('/api/mcp/repos').expect(200);

        expect(listResponse.body.count).toBeGreaterThanOrEqual(2);

        // Verify both repos are in the list (may have other repos from previous tests)
        const repos = listResponse.body.repos;
        const repo1Id = repo1.body.repoId;
        const repo2Id = repo2.body.repoId;

        const foundRepo1 = repos.find((r: any) => r.id === repo1Id);
        const foundRepo2 = repos.find((r: any) => r.id === repo2Id);

        expect(foundRepo1).toBeDefined();
        if (foundRepo1) {
          expect(foundRepo1.name).toBe('integration-repo-1');
        }
        expect(foundRepo2).toBeDefined();
        if (foundRepo2) {
          expect(foundRepo2.name).toBe('integration-repo-2');
        }
      } finally {
        // Cleanup
        [testDir1, testDir2].forEach((testDir) => {
          const bigrackJsonPath = path.join(testDir, 'bigrack.json');
          if (fs.existsSync(bigrackJsonPath)) {
            fs.unlinkSync(bigrackJsonPath);
          }
          try {
            fs.rmdirSync(testDir);
          } catch {
            // Ignore cleanup errors
          }
        });
      }
    });
  });
});
