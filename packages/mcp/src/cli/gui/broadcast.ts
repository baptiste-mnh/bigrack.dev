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
 * Broadcast module for WebSocket notifications
 * Can be imported and used from MCP handlers to send notifications to GUI clients
 *
 * This module supports two modes:
 * 1. Direct WebSocket (when MCP and GUI server are in the same process)
 * 2. HTTP fallback (when MCP and GUI server are in separate processes)
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import nodeFetch from 'node-fetch';

// WebSocket server instance (set by GUI server)
let wss: WebSocketServer | null = null;

const PORT_FILE = path.join(os.homedir(), '.bigrack', 'gui-server.port');

/**
 * Get the GUI server port from the port file
 */
function getGuiServerPort(): number | null {
  try {
    if (fs.existsSync(PORT_FILE)) {
      const port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8'), 10);
      return isNaN(port) ? null : port;
    }
  } catch {
    // Ignore errors reading port file
  }
  return null;
}

/**
 * Send notification via HTTP to GUI server
 */
async function sendNotificationViaHttp(data: {
  type: string;
  action: string;
  entityId?: string;
  entityType?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}): Promise<void> {
  const port = getGuiServerPort();
  if (!port) {
    // GUI server not running or port file not found
    return;
  }

  try {
    const response = await nodeFetch(`http://localhost:${port}/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(
        `Failed to send notification via HTTP: ${response.status} ${response.statusText}`
      );
    }
  } catch {
    // Silently fail if GUI server is not reachable
    // This is expected when GUI server is not running
  }
}

/**
 * Set the WebSocket server instance (called by GUI server on startup)
 */
export function setWebSocketServer(server: WebSocketServer | null): void {
  wss = server;
}

/**
 * Broadcast a notification to all connected WebSocket clients
 * This is called from MCP handlers when actions occur
 *
 * If WebSocket server is not available in the same process, falls back to HTTP
 */
export function broadcastNotification(data: {
  type: string;
  action: string;
  entityId?: string;
  entityType?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}): void {
  // Try direct WebSocket first (same process)
  if (wss) {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch {
          console.error('Failed to send WebSocket message');
        }
      }
    });

    if (sentCount > 0) {
      console.log(`Broadcast notification to ${sentCount} client(s):`, data.type);
    }
    return;
  }

  // Fallback to HTTP (separate process)
  // Use setImmediate to avoid blocking the current operation
  setImmediate(() => {
    sendNotificationViaHttp(data).catch(() => {
      // Silently fail - GUI server might not be running
    });
  });
}
