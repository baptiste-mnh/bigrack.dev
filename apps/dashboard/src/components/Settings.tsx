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

import { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api-config';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function Settings() {
  const [hostUrl, setHostUrl] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Load current hostUrl from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('bigrack_hostUrl');
    if (stored) {
      setHostUrl(stored);
    } else {
      // Extract from current API URL
      const currentUrl = getApiUrl();
      try {
        const url = new URL(currentUrl);
        const host = `${url.hostname}${url.port ? `:${url.port}` : ''}`;
        setHostUrl(host);
      } catch {
        setHostUrl('localhost:3333');
      }
    }
    testConnection();
  }, []);

  const testConnection = async (urlToTest?: string): Promise<boolean> => {
    const testUrl = urlToTest || getApiUrl();
    setIsTesting(true);
    setApiStatus('Testing connection...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${testUrl}/bigrack`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setApiStatus(`✅ Connected (PID: ${data.pid}, Port: ${data.port})`);
          setIsConnected(true);
          return true;
        } else {
          setApiStatus(`❌ Server responded with status ${response.status}`);
          setIsConnected(false);
          return false;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('[Settings] API connection error:', error);
      const errorMessage =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Connection timeout'
            : error.message
          : String(error);
      setApiStatus(`❌ Failed to connect: ${errorMessage}`);
      setIsConnected(false);
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    // Normalize hostUrl (remove protocol if present)
    let normalizedHost = hostUrl.trim();
    if (normalizedHost.startsWith('http://') || normalizedHost.startsWith('https://')) {
      try {
        const url = new URL(normalizedHost);
        normalizedHost = `${url.hostname}${url.port ? `:${url.port}` : ''}`;
      } catch {
        // If URL parsing fails, try to extract manually
        normalizedHost = normalizedHost.replace(/^https?:\/\//, '');
      }
    }

    // Store in localStorage
    localStorage.setItem('bigrack_hostUrl', normalizedHost);

    // Build full URL for testing
    const testUrl = normalizedHost.startsWith('http') ? normalizedHost : `http://${normalizedHost}`;

    // Test connection with new URL
    const connected = await testConnection(testUrl);

    // If connection successful, reload to apply new URL
    if (connected) {
      window.location.href = `${window.location.pathname}?hostUrl=${normalizedHost}`;
    }
  };

  const handleTest = () => {
    let testUrl = hostUrl.trim();
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = `http://${testUrl}`;
    }
    testConnection(testUrl);
  };

  return (
    <div
      className="settings-container"
      style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}
    >
      <h1
        className="settings-title"
        style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}
      >
        Settings
      </h1>

      <div className="settings-section" style={{ marginBottom: '2rem' }}>
        <h2
          className="settings-section-title"
          style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}
        >
          Server Configuration
        </h2>
        <div
          className="settings-form"
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label
              htmlFor="hostUrl"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}
            >
              Server URL
            </label>
            <Input
              id="hostUrl"
              type="text"
              value={hostUrl}
              onChange={(e) => setHostUrl(e.target.value)}
              placeholder="localhost:3333"
              disabled={isTesting}
            />
            <p style={{ fontSize: '0.875rem', color: 'rgb(113, 113, 122)', marginTop: '0.5rem' }}>
              Enter the hostname and port (e.g., localhost:3333) or full URL (e.g.,
              http://localhost:3333)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button onClick={handleTest} disabled={isTesting || !hostUrl.trim()}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleSave} disabled={isTesting || !hostUrl.trim()} variant="default">
              Save & Apply
            </Button>
          </div>
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: '2rem' }}>
        <h2
          className="settings-section-title"
          style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}
        >
          Connection Status
        </h2>
        <div
          className="connection-status"
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: isConnected ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
            border: `1px solid ${isConnected ? 'rgb(187, 247, 208)' : 'rgb(252, 165, 165)'}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: isConnected ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)',
              fontWeight: '500',
            }}
          >
            {apiStatus}
          </p>
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: '2rem' }}>
        <h2
          className="settings-section-title"
          style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}
        >
          Legal & Licenses
        </h2>
        <div style={{ fontSize: '0.875rem', color: 'rgb(113, 113, 122)' }}>
          <a
            href="/THIRD-PARTY-LICENSES.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            See open sources licences
          </a>
        </div>
      </div>
    </div>
  );
}
