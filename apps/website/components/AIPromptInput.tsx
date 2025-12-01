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

import Image from 'next/image';

export function AIPromptInput({ text = 'Create one ticket by tests for my Home Project' }: { text?: string }) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative flex items-center gap-6">
        {/* Main input area */}
        <div className="flex-1 bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
          {/* Text content area */}
          <div className="px-6 py-5 min-h-[120px] flex items-center">
            <p className="text-foreground text-base leading-relaxed font-sans w-full">
              {text}
              <span className="inline-block w-0.5 h-5 bg-foreground ml-1 animate-pulse" />
            </p>
          </div>

          {/* Bottom controls bar */}
          <div className="px-4 py-3 border-t border-border/30 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">∞</span>
                <span>Agent</span>
                <svg
                  className="w-3.5 h-3.5 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Auto</span>
                <svg
                  className="w-3.5 h-3.5 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <span>1x</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Action icons */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-muted/50 border border-border/30 flex items-center justify-center hover:bg-muted transition-colors cursor-not-allowed opacity-50">
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="w-8 h-8 rounded-md bg-muted/50 border border-border/30 flex items-center justify-center hover:bg-muted transition-colors cursor-not-allowed opacity-50">
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div className="w-8 h-8 rounded-md bg-muted/50 border border-border/30 flex items-center justify-center hover:bg-muted transition-colors cursor-not-allowed opacity-50">
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              {/* Send button */}
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center cursor-not-allowed opacity-50">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Connection line */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="w-px h-16 bg-border/50" />
          <div className="w-3 h-3 rounded-full bg-primary/30 border-2 border-primary/50" />
          <div className="w-px h-16 bg-border/50" />
        </div>

        {/* BigRack Logo */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-card border border-border/50 shadow-sm p-3 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="BigRack logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-semibold text-foreground">BigRack</span>
        </div>
      </div>
    </div>
  );
}

