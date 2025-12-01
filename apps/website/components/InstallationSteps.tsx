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
'use client';

import { useState } from 'react';
import { Check, Copy, Terminal, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const steps = [
  {
    command: 'npm i -g @bigrack/mcp',
    description: 'Install the CLI tool globally via npm',
    prefix: '$',
  },
  {
    command: 'bigrack init',
    description: 'Initialize a new repository in your project',
    prefix: '$',
  },
  {
    command: 'bigrack setup-claude',
    description: 'Auto-configure Claude for Desktop',
    prefix: '$',
  },
  {
    command: 'bigrack setup-cursor',
    description: 'Add MCP server to Cursor settings',
    prefix: '$',
  },
  {
    command: 'bigrack gui start',
    description: 'Launch the visual dashboard',
    prefix: '$',
    highlight: true,
  },
];

export function InstallationSteps() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-xl overflow-hidden ring-1 ring-black/5">
      {/* Terminal Header */}
      <div className="bg-muted/50 border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400/80 border border-red-500/20" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80 border border-amber-500/20" />
          <div className="w-3 h-3 rounded-full bg-green-400/80 border border-green-500/20" />
        </div>
        <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 font-medium opacity-70">
          <Terminal className="w-3 h-3" />
          term — bash
        </div>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* Steps */}
      <div className="p-2 md:p-4 bg-background/50">
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                'group relative rounded-lg border p-3 transition-all duration-200',
                step.highlight
                  ? 'bg-primary/5 border-primary/20 shadow-sm'
                  : 'bg-card/50 border-border/40 hover:bg-muted/30 hover:border-border/80'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 w-full">
                  <div className="flex-shrink-0 mt-1">
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ring-1 ring-inset',
                        step.highlight
                          ? 'bg-primary/10 text-primary ring-primary/20'
                          : 'bg-muted text-muted-foreground ring-border'
                      )}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0 w-full">
                    <div className="flex items-center gap-2 font-mono text-sm group/cmd w-full">
                      <span className="text-muted-foreground/50 select-none">{step.prefix}</span>
                      <code
                        className={cn(
                          'truncate font-medium',
                          step.highlight ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {step.command}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {step.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(step.command, idx)}
                  className={cn(
                    'flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md transition-all',
                    'hover:bg-background hover:shadow-sm hover:border hover:border-border',
                    copiedIndex === idx
                      ? 'text-green-500 bg-green-500/10 border-green-500/20'
                      : 'text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100'
                  )}
                  aria-label="Copy command"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}








