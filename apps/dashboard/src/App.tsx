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


import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getApiUrl } from './lib/api-config';
import { ApiProvider } from './contexts/ApiContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { RepoList } from './components/RepoList';
import { ProjectList } from './components/ProjectList';
import { TicketList } from './components/TicketList';
import { TicketDetail } from './components/TicketDetail';
import { ContextDetail } from './components/ContextDetail';
import { ConnectionError } from './components/ConnectionError';
import { AppSidebar } from './components/AppSidebar';
import { AppHeader } from './components/AppHeader';
import { Settings } from './components/Settings';
import { LegalWrapper } from './components/LegalWrapper';
import { LicensesWrapper } from './components/LicensesWrapper';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { Toaster } from '@bigrack/shared';

function App() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [apiUrl, setApiUrl] = useState<string>('');

  const testApi = async (url?: string) => {
    const testUrl = url || getApiUrl();
    setApiUrl(testUrl);
    console.log('[App] Testing API connection to:', testUrl);

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
          // Update URL if connection successful
          if (url) {
            const urlObj = new URL(testUrl);
            const hostUrl = `${urlObj.hostname}:${urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')}`;
            localStorage.setItem('bigrack_hostUrl', hostUrl);
            // Reload to apply new URL
            window.location.href = `${window.location.pathname}?hostUrl=${hostUrl}`;
          }
        } else {
          setApiStatus(`❌ Server responded with status ${response.status}`);
          setIsConnected(false);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('[App] API connection error:', error);
      const errorMessage =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Connection timeout'
            : error.message
          : String(error);
      setApiStatus(`❌ Failed to connect: ${errorMessage}`);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  const handlePortChange = (hostUrl: string) => {
    const newUrl =
      hostUrl.startsWith('http://') || hostUrl.startsWith('https://')
        ? hostUrl
        : `http://${hostUrl}`;
    testApi(newUrl);
  };

  // Pages that don't require API connection
  const publicPages = ['/legal', '/licenses'];
  const currentPath = window.location.pathname;
  const isPublicPage = publicPages.includes(currentPath);

  // Show connection error if not connected (except for public pages)
  if (!isConnected && apiStatus !== 'Checking...' && !isPublicPage) {
    return (
      <div className="app-container">
        <ConnectionError
          apiUrl={apiUrl || 'http://localhost:3333'}
          onPortChange={handlePortChange}
          onRetry={() => testApi()}
        />
        <Toaster />
      </div>
    );
  }

  return (
    <ApiProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <div className="app-container">
            {isPublicPage ? (
              // Public pages (Legal, Licenses) - minimal layout without sidebar
              <main className="main-content">
                <Routes>
                  <Route path="/legal" element={<LegalWrapper />} />
                  <Route path="/licenses" element={<LicensesWrapper />} />
                </Routes>
              </main>
            ) : (
              // Full app layout with sidebar
              <SidebarProvider>
                <AppSidebar apiStatus={apiStatus} />
                <SidebarInset style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                  <AppHeader />
                  <main className="main-content">
                    {isConnected ? (
                      <Routes>
                      <Route path="/" element={<RepoList />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/legal" element={<LegalWrapper />} />
                      <Route path="/licenses" element={<LicensesWrapper />} />
                      <Route path="/repos/:repoId" element={<ProjectList />} />
                        <Route path="/repos/:repoId/context/:contextId" element={<ContextDetail />} />
                        <Route path="/repos/:repoId/projects/:projectId" element={<TicketList />} />
                        <Route
                          path="/repos/:repoId/projects/:projectId/tickets/:ticketId"
                          element={<TicketDetail />}
                        />
                      </Routes>
                    ) : (
                      <div className="loading-spinner-container">
                        <div className="loading-spinner-wrapper">
                          <div className="loading-spinner"></div>
                          <p className="loading-text">{apiStatus}</p>
                        </div>
                      </div>
                    )}
                  </main>
                </SidebarInset>
              </SidebarProvider>
            )}
          </div>
          <Toaster />
        </BrowserRouter>
      </WebSocketProvider>
    </ApiProvider>
  );
}

export default App;
