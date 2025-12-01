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
 * API configuration utility
 * Reads hostUrl from URL query parameter or defaults to localhost:3333
 * Handles both HTTP and WebSocket URLs
 */

/**
 * Get the API base URL from query parameter, localStorage, or default
 * This function tries to get hostUrl from:
 * 1. URL query parameter (on initial load)
 * 2. localStorage (preserved across navigation)
 * 3. Environment variable
 * 4. Default to localhost:3333
 */
export function getApiUrl(): string {
  // Try URL query parameter first
  const params = new URLSearchParams(window.location.search);
  let hostUrl = params.get('hostUrl');

  // If not in URL, try localStorage (preserved across React Router navigation)
  if (!hostUrl) {
    hostUrl = localStorage.getItem('bigrack_hostUrl');
  }

  if (hostUrl) {
    // Store in localStorage for future use
    localStorage.setItem('bigrack_hostUrl', hostUrl);

    // Ensure it has a protocol
    let apiUrl: string;
    if (hostUrl.startsWith('http://') || hostUrl.startsWith('https://')) {
      apiUrl = hostUrl;
    } else {
      apiUrl = `http://${hostUrl}`;
    }
    console.log('[API Config] Using hostUrl:', hostUrl, '-> API URL:', apiUrl);
    return apiUrl;
  }

  // Fallback to environment variable or default to localhost:3333
  const envHost = import.meta.env.VITE_API_HOST;
  if (envHost) {
    const apiUrl = envHost.startsWith('http') ? envHost : `http://${envHost}`;
    console.log('[API Config] Using env host:', apiUrl);
    return apiUrl;
  }

  // Default to localhost:3333 (BigRack GUI server default port)
  const defaultUrl = 'http://localhost:3333';
  console.log('[API Config] Using default (localhost:3333)');
  return defaultUrl;
}

/**
 * Get the WebSocket URL from query parameter, localStorage, or default
 * This function tries to get hostUrl from:
 * 1. URL query parameter (on initial load)
 * 2. localStorage (preserved across navigation)
 * 3. Environment variable
 * 4. Default to localhost:3333
 */
export function getWebSocketUrl(): string {
  // Try URL query parameter first
  const params = new URLSearchParams(window.location.search);
  let hostUrl = params.get('hostUrl');

  // If not in URL, try localStorage (preserved across React Router navigation)
  if (!hostUrl) {
    hostUrl = localStorage.getItem('bigrack_hostUrl');
  }

  if (hostUrl) {
    // Store in localStorage for future use
    localStorage.setItem('bigrack_hostUrl', hostUrl);

    // Convert HTTP URL to WebSocket URL
    if (hostUrl.startsWith('ws://') || hostUrl.startsWith('wss://')) {
      return hostUrl + '/ws';
    }
    if (hostUrl.startsWith('http://')) {
      return hostUrl.replace('http://', 'ws://') + '/ws';
    }
    if (hostUrl.startsWith('https://')) {
      return hostUrl.replace('https://', 'wss://') + '/ws';
    }
    // Assume it's a hostname:port format
    return `ws://${hostUrl}/ws`;
  }

  // Fallback to environment variable or derive from window.location
  const envHost = import.meta.env.VITE_API_HOST;
  if (envHost) {
    if (envHost.startsWith('ws://') || envHost.startsWith('wss://')) {
      return envHost + '/ws';
    }
    const protocol = envHost.startsWith('https') ? 'wss' : 'ws';
    const base = envHost.replace(/^https?:\/\//, '');
    return `${protocol}://${base}/ws`;
  }

  // Default to localhost:3333 WebSocket
  return 'ws://localhost:3333/ws';
}

/**
 * Get the full API endpoint URL
 */
export function getApiEndpoint(path: string): string {
  const baseUrl = getApiUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
