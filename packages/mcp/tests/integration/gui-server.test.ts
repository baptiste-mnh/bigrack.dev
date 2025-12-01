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
import { createGuiApp } from '../../src/cli/gui/server';
import { bigrackCreateRack } from '../../src/mcp/tools/bigrack-create-repo';
import { bigrackCreatePallet } from '../../src/mcp/tools/bigrack-create-project';
import { bigrackStoreContext } from '../../src/mcp/tools/bigrack-store-context';
import { bigrackStoreBoxes } from '../../src/mcp/tools/bigrack-store-tickets';
import { bigrackTicketCommentCreate } from '../../src/mcp/tools/bigrack-ticket-comment-create';
import { resetDatabase } from '../../src/storage/database';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Express } from 'express';

describe('GUI Server API', () => {
  let app: Express;
  let testWorkspacePath: string;
  let repoId: string;
  let projectId: string;
  let ticketId: string;

  beforeAll(async () => {
    // Reset database connection to ensure it uses the test database
    resetDatabase();

    // Create Express app (without starting the server)
    app = createGuiApp();

    // Create a temporary workspace
    testWorkspacePath = mkdtempSync(join(tmpdir(), 'bigrack-gui-test-'));

    // Create test repo (rack)
    const repoResult = await bigrackCreateRack({
      projectName: 'gui-test-repo',
      description: 'Test repo for GUI API tests',
      workspacePath: testWorkspacePath,
    });
    repoId = repoResult.repoId!;

    // Create test project (pallet)
    const projectResult = await bigrackCreatePallet({
      repoId,
      name: 'gui-test-project',
      description: 'Test project for GUI API tests',
      type: 'feature',
    });
    projectId = projectResult.projectId!;

    // Create test tickets (boxes)
    const ticketResult = await bigrackStoreBoxes({
      projectId,
      isContextVerified: true,
      tasks: [
        {
          title: 'Test ticket 1',
          description: 'First test ticket',
          priority: 'high',
          type: 'implementation',
        },
        {
          title: 'Test ticket 2',
          description: 'Second test ticket',
          priority: 'medium',
          type: 'testing',
        },
      ],
    });
    ticketId = ticketResult.tasks![0].id;

    // Create test comment
    await bigrackTicketCommentCreate({
      taskId: ticketId,
      content: 'This is a test comment',
      createdBy: 'test-user',
    });

    // Store test context
    await bigrackStoreContext({
      repoId,
      type: 'business_rule',
      name: 'Test Rule',
      description: 'A test business rule for GUI tests',
      category: 'testing',
      priority: 'medium',
    });

    await bigrackStoreContext({
      repoId,
      type: 'glossary',
      term: 'GUI',
      definition: 'Graphical User Interface',
      category: 'acronyms',
    });
  }, 120000);

  afterAll(async () => {
    // Cleanup workspace
    if (testWorkspacePath) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }

    // Reset database connection
    resetDatabase();
  });

  describe('GET /api/repos', () => {
    it('should return list of repositories', async () => {
      const response = await request(app).get('/api/repos').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Find our test repo
      const testRepo = response.body.find((r: any) => r.id === repoId);
      expect(testRepo).toBeDefined();
      expect(testRepo.name).toBe('gui-test-repo');
      expect(testRepo._count).toBeDefined();
      expect(testRepo._count.projects).toBeGreaterThanOrEqual(1);
    });

    it('should include context counts for repos', async () => {
      const response = await request(app).get('/api/repos').expect(200);

      const testRepo = response.body.find((r: any) => r.id === repoId);
      expect(testRepo._count.businessRules).toBeGreaterThanOrEqual(1);
      expect(testRepo._count.glossary).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/projects/:repoId', () => {
    it('should return projects for a specific repo', async () => {
      const response = await request(app).get(`/api/projects/${repoId}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Find our test project
      const testProject = response.body.find((p: any) => p.id === projectId);
      expect(testProject).toBeDefined();
      expect(testProject.name).toBe('gui-test-project');
      expect(testProject._count).toBeDefined();
      expect(testProject._count.tasks).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for non-existent repo', async () => {
      const response = await request(app).get('/api/projects/non-existent-repo-id').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/tickets/:projectId', () => {
    it('should return tickets for a specific project', async () => {
      const response = await request(app).get(`/api/tickets/${projectId}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Verify ticket properties
      const ticket = response.body.find((t: any) => t.id === ticketId);
      expect(ticket).toBeDefined();
      expect(ticket.title).toBe('Test ticket 1');
      expect(ticket.priority).toBe('high');
    });

    it('should return empty array for non-existent project', async () => {
      const response = await request(app).get('/api/tickets/non-existent-project-id').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/tickets/:ticketId/comments', () => {
    it('should return comments for a specific ticket', async () => {
      const response = await request(app).get(`/api/tickets/${ticketId}/comments`).expect(200);

      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeGreaterThanOrEqual(1);

      const comment = response.body.comments[0];
      expect(comment.content).toBe('This is a test comment');
      expect(comment.createdBy).toBe('test-user');
    });

    it('should return empty comments array for non-existent ticket', async () => {
      const response = await request(app)
        .get('/api/tickets/non-existent-ticket-id/comments')
        .expect(200);

      expect(response.body.comments).toBeDefined();
      expect(response.body.comments.length).toBe(0);
    });
  });

  describe('GET /api/context/:repoId', () => {
    it('should return all context for a repo', async () => {
      const response = await request(app).get(`/api/context/${repoId}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Find business rule
      const businessRule = response.body.find(
        (c: any) => c.entityType === 'business_rule' && c.name === 'Test Rule'
      );
      expect(businessRule).toBeDefined();
      expect(businessRule.description).toBe('A test business rule for GUI tests');

      // Find glossary entry
      const glossary = response.body.find(
        (c: any) => c.entityType === 'glossary_entry' && c.term === 'GUI'
      );
      expect(glossary).toBeDefined();
      expect(glossary.definition).toBe('Graphical User Interface');
    });

    it('should return empty array for non-existent repo', async () => {
      const response = await request(app).get('/api/context/non-existent-repo-id').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/context/search', () => {
    it('should return 400 when query is missing', async () => {
      const response = await request(app).get('/api/context/search').expect(400);

      expect(response.body.error).toBe('Query parameter is required');
    });

    it('should search context by query', async () => {
      const response = await request(app)
        .get('/api/context/search')
        .query({ query: 'business rule testing', repoId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Results depend on semantic search
    });
  });

  describe('POST /api/broadcast', () => {
    it('should accept valid notification', async () => {
      const response = await request(app)
        .post('/api/broadcast')
        .send({ type: 'test', message: 'Hello' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification broadcasted');
    });

    it('should reject invalid notification format', async () => {
      const response = await request(app)
        .post('/api/broadcast')
        .send('invalid')
        .set('Content-Type', 'text/plain')
        .expect(400);

      expect(response.body.error).toBe('Invalid notification format');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app).get('/api/repos').expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe(
        'GET, POST, PUT, DELETE, OPTIONS'
      );
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app).options('/api/repos').expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include no-cache headers for API routes', async () => {
      const response = await request(app).get('/api/repos').expect(200);

      expect(response.headers['cache-control']).toBe(
        'no-store, no-cache, must-revalidate, private'
      );
      expect(response.headers['pragma']).toBe('no-cache');
    });
  });
});
