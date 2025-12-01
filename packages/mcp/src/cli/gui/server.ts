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

import express, { Request, Response, NextFunction, Express } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { findRepos, findProjects, findTickets } from '../../storage/repositories';
import { bigrackQueryContext } from '../../mcp/tools/bigrack-query-context';
import { getDatabase } from '../../storage/database';
import { setWebSocketServer, broadcastNotification } from './broadcast';

export interface GuiServerOptions {
  port?: number;
  noOpen?: boolean;
}

export interface GuiServerInstance {
  app: Express;
  server: Server;
  wss: WebSocketServer;
  close: () => Promise<void>;
}

// Export broadcast function for backward compatibility
export function broadcast(data: any): void {
  broadcastNotification(data);
}

/**
 * Create the Express app with all routes configured
 * Exported for testing purposes
 */
export function createGuiApp(): Express {
  const app = express();

  // CORS middleware - allow cross-origin requests from Vercel frontend
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control'
    );

    // Disable caching for API routes to prevent 304 responses
    if (req.path.startsWith('/api') || req.path === '/bigrack') {
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });

  // Middleware
  app.use(express.json());

  // ============= API Endpoints =============

  /**
   * GET /api/repos
   * List all repositories with project counts and context
   */
  app.get('/api/repos', async (req: Request, res: Response) => {
    try {
      const repos = findRepos();
      const db = getDatabase();

      // Add counts and context for each repo
      const reposWithData = repos.map((repo) => {
        // Count projects
        const projectCount = db
          .prepare('SELECT COUNT(*) as count FROM projects WHERE repoId = ?')
          .get(repo.id) as { count: number };

        // Get repo-level context counts
        const businessRules = db
          .prepare('SELECT COUNT(*) as count FROM business_rules WHERE repoId = ?')
          .get(repo.id) as { count: number };
        const glossary = db
          .prepare('SELECT COUNT(*) as count FROM glossary_entries WHERE repoId = ?')
          .get(repo.id) as { count: number };
        const patterns = db
          .prepare('SELECT COUNT(*) as count FROM architecture_patterns WHERE repoId = ?')
          .get(repo.id) as { count: number };
        const conventions = db
          .prepare('SELECT COUNT(*) as count FROM team_conventions WHERE repoId = ?')
          .get(repo.id) as { count: number };
        const documents = db
          .prepare('SELECT COUNT(*) as count FROM documents WHERE repoId = ?')
          .get(repo.id) as { count: number };

        return {
          ...repo,
          _count: {
            projects: projectCount.count,
            businessRules: businessRules.count,
            glossary: glossary.count,
            patterns: patterns.count,
            conventions: conventions.count,
            documents: documents.count,
          },
        };
      });

      res.json(reposWithData);
    } catch (error) {
      console.error('Error fetching repos:', error);
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  });

  /**
   * GET /api/projects/:repoId
   * List all projects in a repository with ticket counts and context
   */
  app.get('/api/projects/:repoId', async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const projects = findProjects({ repoId });
      const db = getDatabase();

      // Add counts and context for each project
      const projectsWithData = projects.map((project) => {
        // Count tickets
        const ticketCount = db
          .prepare('SELECT COUNT(*) as count FROM tasks WHERE projectId = ?')
          .get(project.id) as { count: number };

        // Get repo context counts (projects inherit from repo)
        const businessRules = db
          .prepare('SELECT COUNT(*) as count FROM business_rules WHERE repoId = ?')
          .get(repoId) as { count: number };
        const glossary = db
          .prepare('SELECT COUNT(*) as count FROM glossary_entries WHERE repoId = ?')
          .get(repoId) as { count: number };
        const patterns = db
          .prepare('SELECT COUNT(*) as count FROM architecture_patterns WHERE repoId = ?')
          .get(repoId) as { count: number };
        const conventions = db
          .prepare('SELECT COUNT(*) as count FROM team_conventions WHERE repoId = ?')
          .get(repoId) as { count: number };
        const documents = db
          .prepare('SELECT COUNT(*) as count FROM documents WHERE repoId = ?')
          .get(repoId) as { count: number };

        return {
          ...project,
          _count: {
            tasks: ticketCount.count,
            businessRules: businessRules.count,
            glossary: glossary.count,
            patterns: patterns.count,
            conventions: conventions.count,
            documents: documents.count,
          },
        };
      });

      res.json(projectsWithData);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  /**
   * GET /api/tickets/:projectId
   * List all tickets in a project
   */
  app.get('/api/tickets/:projectId', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const tickets = findTickets({ projectId });
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  /**
   * GET /api/tickets/:ticketId/comments
   * Get all comments for a specific ticket
   */
  app.get('/api/tickets/:ticketId/comments', async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      const db = getDatabase();

      const comments = db
        .prepare(
          `SELECT
            id,
            taskId,
            content,
            createdBy,
            createdAt,
            updatedAt
          FROM commentaries
          WHERE taskId = ?
          ORDER BY createdAt ASC`
        )
        .all(ticketId);

      res.json({ comments });
    } catch (error) {
      console.error('Error fetching ticket comments:', error);
      res.status(500).json({ error: 'Failed to fetch ticket comments' });
    }
  });

  /**
   * GET /api/context/search
   * Search context using semantic search (RAG)
   * NOTE: This route MUST be defined BEFORE /api/context/:repoId to avoid route conflicts
   */
  app.get('/api/context/search', async (req: Request, res: Response) => {
    try {
      const { query, projectId, repoId } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const result = await bigrackQueryContext({
        query,
        projectId: projectId as string | undefined,
        repoId: repoId as string | undefined,
        topK: 10,
        minSimilarity: 0.5,
        includeMetadata: true,
      });

      res.json(result.results);
    } catch (error) {
      console.error('Error searching context:', error);
      res.status(500).json({ error: 'Failed to search context' });
    }
  });

  /**
   * GET /api/context/:repoId
   * Get all context for a repo (currently all context is repo-level in BigRack schema)
   */
  app.get('/api/context/:repoId', async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const db = getDatabase();

      let contextItems: any[] = [];

      // Get repo-level context (context is always at repo level in BigRack schema)
      const repoBusinessRules = db
        .prepare("SELECT *, 'business_rule' as entityType FROM business_rules WHERE repoId = ?")
        .all(repoId);
      const repoGlossary = db
        .prepare("SELECT *, 'glossary_entry' as entityType FROM glossary_entries WHERE repoId = ?")
        .all(repoId);
      const repoPatterns = db
        .prepare("SELECT *, 'pattern' as entityType FROM architecture_patterns WHERE repoId = ?")
        .all(repoId);
      const repoConventions = db
        .prepare("SELECT *, 'convention' as entityType FROM team_conventions WHERE repoId = ?")
        .all(repoId);
      const repoDocuments = db
        .prepare("SELECT *, 'document' as entityType FROM documents WHERE repoId = ?")
        .all(repoId);

      contextItems.push(
        ...(repoBusinessRules as any[]),
        ...(repoGlossary as any[]),
        ...(repoPatterns as any[]),
        ...(repoConventions as any[]),
        ...(repoDocuments as any[])
      );

      res.json(contextItems);
    } catch (error) {
      console.error('Error fetching context:', error);
      res.status(500).json({ error: 'Failed to fetch context' });
    }
  });

  /**
   * POST /api/broadcast
   * Receive notifications from MCP server (when running in separate process)
   * and broadcast them to all connected WebSocket clients
   */
  app.post('/api/broadcast', (req: Request, res: Response) => {
    try {
      const notification = req.body;

      // Validate notification structure
      if (!notification || typeof notification !== 'object') {
        return res.status(400).json({ error: 'Invalid notification format' });
      }

      // Broadcast to all connected WebSocket clients
      broadcastNotification(notification);

      res.json({ success: true, message: 'Notification broadcasted' });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      res.status(500).json({ error: 'Failed to broadcast notification' });
    }
  });

  return app;
}

export async function startGuiServer(options: GuiServerOptions = {}): Promise<GuiServerInstance> {
  const app = createGuiApp();
  const PORT = options.port || 3333;

  // Create HTTP server for WebSocket upgrade
  const server = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Register WebSocket server with broadcast module
  setWebSocketServer(wss);

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  });

  /**
   * GET /bigrack
   * Get server status and process ID (requires wss reference)
   */
  app.get('/bigrack', (req: Request, res: Response) => {
    try {
      res.json({
        status: 'running',
        pid: process.pid,
        port: PORT,
        uptime: process.uptime(),
        connectedClients: wss ? wss.clients.size : 0,
      });
    } catch (error) {
      console.error('Error getting server status:', error);
      res.status(500).json({ error: 'Failed to get server status' });
    }
  });

  // ============= Serve Dashboard Static Files =============
  // Try to find dashboard dist directory
  // IMPORTANT: This must be AFTER all API routes to avoid intercepting API requests
  const dashboardDistPath = path.resolve(__dirname, '../../../../apps/dashboard/dist');
  if (fs.existsSync(dashboardDistPath)) {
    // Serve static files from dashboard/dist, but ONLY for routes that don't start with /api, /ws, or /bigrack
    app.use((req: Request, res: Response, next: NextFunction) => {
      // CRITICAL: Skip API routes, WebSocket, and status endpoint - these must be handled by routes above
      if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/bigrack') {
        return next(); // Let API routes handle this
      }
      // For all other routes, serve static files
      return express.static(dashboardDistPath)(req, res, next);
    });

    // For React Router: serve index.html for all non-API routes that don't match static files
    // This catch-all route will only be reached if:
    // 1. The route doesn't start with /api, /ws, or /bigrack (checked above)
    // 2. No static file was found (express.static called next())
    app.get('*', (req: Request, res: Response) => {
      // Double-check: never serve HTML for API routes (safety check)
      if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/bigrack') {
        return res.status(404).json({ error: 'Not found' });
      }
      // Serve index.html for React Router
      const indexPath = path.join(dashboardDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Dashboard not found');
      }
    });
  }

  // Start server
  return new Promise<GuiServerInstance>((resolve) => {
    server.listen(PORT, () => {
      console.log(`\n🚀 BigRack API server running at http://localhost:${PORT}`);
      console.log(`📡 WebSocket server running at ws://localhost:${PORT}/ws`);
      console.log(`📊 Status endpoint: http://localhost:${PORT}/bigrack`);
      if (fs.existsSync(dashboardDistPath)) {
        console.log(
          `🖥️  Dashboard available at http://localhost:${PORT}?hostUrl=localhost:${PORT}\n`
        );
      } else {
        console.log(`⚠️  Dashboard not found at ${dashboardDistPath}\n`);
      }

      resolve({
        app,
        server,
        wss,
        close: async () => {
          return new Promise<void>((resolveClose, rejectClose) => {
            // Close all WebSocket connections
            wss.clients.forEach((client) => client.close());
            wss.close((wssErr) => {
              server.close((serverErr) => {
                if (wssErr || serverErr) {
                  rejectClose(wssErr || serverErr);
                } else {
                  resolveClose();
                }
              });
            });
          });
        },
      });
    });
  });
}
