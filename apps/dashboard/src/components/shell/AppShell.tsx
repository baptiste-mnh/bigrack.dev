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

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  statusText?: string;
  children: ReactNode;
}

export function AppShell({ statusText, children }: AppShellProps) {
  return (
    <div className="h-screen w-screen overflow-hidden text-foreground">
      <div className="grid grid-rows-[auto_1fr] h-full">
        <Topbar statusText={statusText} />
        <div className="grid grid-cols-[260px_1fr] gap-0 h-full min-h-0">
          {/* Left Sidebar */}
          <aside className="border-r border-border bg-card/80 backdrop-blur min-h-0 overflow-hidden">
            <Sidebar />
          </aside>

          {/* Main content */}
          <main className="min-h-0 overflow-hidden">
            <div className="h-full min-h-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-auto thin-scrollbar">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
