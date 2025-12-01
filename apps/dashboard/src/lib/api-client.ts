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

import { getApiEndpoint, getWebSocketUrl } from './api-config';

/**
 * API client for making HTTP requests to the BigRack API
 */
export class ApiClient {
  constructor() {
    // API client uses getApiEndpoint() directly for each request
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string): Promise<T> {
    const url = getApiEndpoint(`/api${path}`);
    console.log('[API Client] GET request to:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      console.log('[API Client] Response status:', response.status, response.statusText);
      console.log('[API Client] Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('[API Client] Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const text = await response.text();
        console.error('[API Client] Request failed:', response.status, response.statusText);
        console.error('[API Client] Response body:', text);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[API Client] Expected JSON but got:', contentType);
        console.error('[API Client] Response body (first 500 chars):', text.substring(0, 500));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const text = await response.text();
      console.log('[API Client] Response text length:', text.length);

      try {
        const data = JSON.parse(text);
        console.log('[API Client] Response data:', data);
        return data;
      } catch (parseError) {
        console.error('[API Client] JSON parse error:', parseError);
        console.error('[API Client] Received text (first 500 chars):', text.substring(0, 500));
        throw new Error(
          `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Received: ${text.substring(0, 100)}...`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to parse JSON')) {
        throw error;
      }
      console.error('[API Client] Request error:', error);
      throw error;
    }
  }

  /**
   * Get ticket by ID with comments
   */
  async getTicketWithComments(projectId: string, ticketId: string): Promise<{
    ticket: any;
    comments: any[];
  }> {
    const [tickets, commentsResponse] = await Promise.all([
      this.get<any[]>(`/tickets/${projectId}`),
      this.get<{ comments: any[] }>(`/tickets/${ticketId}/comments`),
    ]);

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return {
      ticket,
      comments: commentsResponse.comments || [],
    };
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, data?: unknown): Promise<T> {
    const url = getApiEndpoint(`/api${path}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get WebSocket URL
   */
  getWebSocketUrl(): string {
    return getWebSocketUrl();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
