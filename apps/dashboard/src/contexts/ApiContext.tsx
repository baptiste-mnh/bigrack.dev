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

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiContextType {
  apiUrl: string;
  hostUrl: string | null;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [hostUrl, setHostUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get hostUrl from URL query parameter or localStorage
    const params = new URLSearchParams(window.location.search);
    let urlHostUrl = params.get('hostUrl');

    // If not in URL, try localStorage
    if (!urlHostUrl) {
      urlHostUrl = localStorage.getItem('bigrack_hostUrl');
    }

    // If found, store it and use it
    if (urlHostUrl) {
      setHostUrl(urlHostUrl);
      localStorage.setItem('bigrack_hostUrl', urlHostUrl);

      // Build API URL
      let apiBaseUrl: string;
      if (urlHostUrl.startsWith('http://') || urlHostUrl.startsWith('https://')) {
        apiBaseUrl = urlHostUrl;
      } else {
        apiBaseUrl = `http://${urlHostUrl}`;
      }
      setApiUrl(apiBaseUrl);
      console.log('[ApiContext] Using hostUrl:', urlHostUrl, '-> API URL:', apiBaseUrl);
    } else {
      // Fallback to environment variable or window.location.origin
      const envHost = import.meta.env.VITE_API_HOST;
      if (envHost) {
        const fallbackUrl = envHost.startsWith('http') ? envHost : `http://${envHost}`;
        setApiUrl(fallbackUrl);
        console.log('[ApiContext] Using env host:', fallbackUrl);
      } else {
        const fallbackUrl = window.location.origin;
        setApiUrl(fallbackUrl);
        console.log('[ApiContext] Using fallback (window.location.origin):', fallbackUrl);
      }
    }
  }, []);

  return <ApiContext.Provider value={{ apiUrl, hostUrl }}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
