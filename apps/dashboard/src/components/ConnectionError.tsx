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

import { useState } from 'react';
import { Button } from '@bigrack/shared';
import {
  Terminal,
  Copy,
  RefreshCw,
  Scale,
  FileCheck,
  ServerOff,
  Settings2,
  ArrowRight,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils';
import LogoImage from '../assets/logo.png';

interface ConnectionErrorProps {
  apiUrl: string;
  onPortChange: (port: string) => void;
  onRetry?: () => void;
}

export function ConnectionError({ apiUrl, onPortChange, onRetry }: ConnectionErrorProps) {
  const [showPortInput, setShowPortInput] = useState(false);
  const [customPort, setCustomPort] = useState('3333');
  const [isRetrying, setIsRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('bigrack gui start');
      setCopied(true);
      toast.success('Command copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy command');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      setIsRetrying(true);
      onRetry();
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  const handlePortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const port = customPort.trim();
    if (port) {
      onPortChange(`localhost:${port}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <div
          className="text-center space-y-4 animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <ServerOff className="w-6 h-6 text-destructive" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Server Unreachable
            </h1>
            <p className="text-muted-foreground text-sm">
              We couldn't connect to the BigRack API server at{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground border border-border">
                {apiUrl}
              </span>
            </p>
          </div>
        </div>

        {/* Action Card */}
        <div
          className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6 animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          {/* Command Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                Start the server
              </span>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-muted/50 border border-border rounded-lg p-1 pr-1">
                <code className="flex-1 px-3 py-2 font-mono text-sm text-foreground select-all">
                  bigrack gui start
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0 hover:bg-background"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">Copy command</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Retry Button */}
          {onRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full font-medium"
              size="lg"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Connecting...' : 'Retry Connection'}
            </Button>
          )}
        </div>

        {/* Configuration Section */}
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button
            type="button"
            onClick={() => setShowPortInput(!showPortInput)}
            className="mx-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Settings2 className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
            <span>Configure different port</span>
            <ArrowRight
              className={cn(
                'w-3 h-3 transition-transform duration-300',
                showPortInput && 'rotate-90'
              )}
            />
          </button>

          {showPortInput && (
            <form
              onSubmit={handlePortSubmit}
              className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-3 animate-fade-in-up"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Port Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPort}
                    onChange={(e) => setCustomPort(e.target.value)}
                    placeholder="3333"
                    className="flex-1 px-3 py-2 text-sm border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    autoFocus
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Links */}
        <div
          className="flex justify-center items-center gap-6 pt-8 border-t border-border/40 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          <a
            href="https://www.bigrack.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <img src={LogoImage} alt="BigRack" className="w-5 h-5 rounded-sm shadow-sm" />
            <span className="font-medium">BigRack</span>
          </a>
          <div className="h-4 w-px bg-border" />
          <a
            href="/legal"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Scale className="w-4 h-4" />
            Legal
          </a>
          <a
            href="/licenses"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            Licenses
          </a>
        </div>
      </div>
    </div>
  );
}
