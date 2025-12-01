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

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig } from '../../config';
import open from 'open';
import nodeFetch from 'node-fetch';

const PID_FILE = path.join(os.homedir(), '.bigrack', 'gui-server.pid');
const PORT_FILE = path.join(os.homedir(), '.bigrack', 'gui-server.port');

interface ProcessInfo {
  pid: number;
  port: number;
}

/**
 * Start the GUI server in background
 */
export async function startGuiServerBackground(options: {
  port?: number;
  dashboard?: string;
  useLocal?: boolean;
}): Promise<ProcessInfo & { wasAlreadyRunning?: boolean }> {
  const PORT = options.port || 3333;
  const useLocal = options.useLocal === true; // Default to false (use external dashboard)
  let dashboardUrl =
    options.dashboard || (useLocal ? `http://localhost:${PORT}` : loadConfig().dashboard.url);
  // Normalize dashboard URL: add http:// if no protocol is specified
  if (dashboardUrl && !dashboardUrl.startsWith('http://') && !dashboardUrl.startsWith('https://')) {
    dashboardUrl = `http://${dashboardUrl}`;
  }

  // Check if server is already running
  const existing = getProcessInfo();
  if (existing) {
    try {
      // Try to ping the server
      const response = await nodeFetch(`http://localhost:${existing.port}/bigrack`);
      if (response.ok) {
        // Server is already running, just open the browser
        const actualPort = existing.port;
        let actualDashboardUrl =
          options.dashboard || (useLocal ? `http://localhost:${actualPort}` : dashboardUrl);
        // Normalize dashboard URL: add http:// if no protocol is specified
        if (
          actualDashboardUrl &&
          !actualDashboardUrl.startsWith('http://') &&
          !actualDashboardUrl.startsWith('https://')
        ) {
          actualDashboardUrl = `http://${actualDashboardUrl}`;
        }
        const separator = actualDashboardUrl.includes('?') ? '&' : '?';
        const dashboardWithHost = `${actualDashboardUrl}${separator}hostUrl=localhost:${actualPort}`;
        await open(dashboardWithHost);
        return {
          pid: existing.pid,
          port: actualPort,
          wasAlreadyRunning: true,
        };
      }
    } catch {
      // If server not responding, assume it's dead and remove PID file
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      if (fs.existsSync(PORT_FILE)) {
        fs.unlinkSync(PORT_FILE);
      }
      // Continue to start a new server
    }
  }

  // Build command to start server
  // Create a temporary script file that starts the server
  const tempScript = path.join(os.tmpdir(), `bigrack-gui-server-${PORT}.js`);
  const serverModulePath = path.join(__dirname, 'server.js').replace(/\\/g, '/');

  const scriptContent = `
const { startGuiServer } = require('${serverModulePath}');
startGuiServer({ port: ${PORT}, noOpen: true }).catch((err) => {
  console.error('GUI server error:', err);
  process.exit(1);
});
`;

  fs.writeFileSync(tempScript, scriptContent, 'utf-8');

  // Spawn process in detached mode
  const child = spawn('node', [tempScript], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });

  // Unref to allow parent process to exit
  child.unref();

  // Wait a bit to ensure server starts
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Save PID and port
  const processInfo: ProcessInfo = {
    pid: child.pid!,
    port: PORT,
  };

  // Ensure .bigrack directory exists
  const bigrackDir = path.dirname(PID_FILE);
  if (!fs.existsSync(bigrackDir)) {
    fs.mkdirSync(bigrackDir, { recursive: true });
  }

  fs.writeFileSync(PID_FILE, child.pid!.toString(), 'utf-8');
  fs.writeFileSync(PORT_FILE, PORT.toString(), 'utf-8');

  // Open browser with dashboard URL and host parameter
  // Add hostUrl query parameter so the GUI knows where to connect
  const separator = dashboardUrl.includes('?') ? '&' : '?';
  const dashboardWithHost = `${dashboardUrl}${separator}hostUrl=localhost:${PORT}`;
  await open(dashboardWithHost);

  return {
    ...processInfo,
    wasAlreadyRunning: false,
  };
}

/**
 * Stop the GUI server
 */
export function stopGuiServer(): boolean {
  const processInfo = getProcessInfo();
  if (!processInfo) {
    return false;
  }

  try {
    // Try to kill the process
    process.kill(processInfo.pid, 'SIGTERM');

    // Wait a bit, then force kill if still running
    setTimeout(() => {
      try {
        process.kill(processInfo.pid, 'SIGKILL');
      } catch {
        // Process already dead
      }
    }, 2000);

    // Remove PID file
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    if (fs.existsSync(PORT_FILE)) {
      fs.unlinkSync(PORT_FILE);
    }

    return true;
  } catch (error) {
    console.error('Failed to stop GUI server:', error);
    return false;
  }
}

/**
 * Get GUI server status
 */
export async function getGuiServerStatus(): Promise<{
  running: boolean;
  pid?: number;
  port?: number;
  uptime?: number;
  connectedClients?: number;
}> {
  const processInfo = getProcessInfo();
  if (!processInfo) {
    return { running: false };
  }

  try {
    // Try to ping the server
    const response = await nodeFetch(`http://localhost:${processInfo.port}/bigrack`);
    if (response.ok) {
      const data = (await response.json()) as {
        uptime?: number;
        connectedClients?: number;
      };
      return {
        running: true,
        pid: processInfo.pid,
        port: processInfo.port,
        uptime: data.uptime,
        connectedClients: data.connectedClients,
      };
    }
  } catch {
    // Server not responding
  }

  // Process exists but server not responding
  return {
    running: false,
    pid: processInfo.pid,
    port: processInfo.port,
  };
}

/**
 * Get process info from PID file
 */
function getProcessInfo(): ProcessInfo | null {
  try {
    if (!fs.existsSync(PID_FILE) || !fs.existsSync(PORT_FILE)) {
      return null;
    }

    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
    const port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8'), 10);

    // Check if process is still running
    try {
      process.kill(pid, 0); // Signal 0 doesn't kill, just checks if process exists
    } catch {
      // Process doesn't exist, remove files
      fs.unlinkSync(PID_FILE);
      fs.unlinkSync(PORT_FILE);
      return null;
    }

    return { pid, port };
  } catch {
    return null;
  }
}
