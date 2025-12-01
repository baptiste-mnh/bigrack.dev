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

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { TextType } from './TextType';
import Cubes from './Cubes';
import DecryptedText from './DecryptedText';

interface ExampleData {
  prompt: string;
  keywords: string[];
  results: Array<{ title: string; description: string }>;
  ticket: { title: string; description: string };
}

const examples: ExampleData[] = [
  {
    prompt: 'Create a user authentication feature with login and registration',
    keywords: ['authentication', 'login', 'registration', 'user management'],
    results: [
      {
        title: 'Auth Pattern',
        description: 'Use JWT tokens, store passwords with bcrypt, implement refresh tokens...',
      },
      {
        title: 'Security Convention',
        description: 'Always validate inputs, use rate limiting, implement CSRF protection...',
      },
    ],
    ticket: { title: 'Create user authentication feature', description: 'Feature' },
  },
  {
    prompt: 'Add a payment system with our payment provider integration',
    keywords: ['payment', 'billing', 'subscription', 'provider'],
    results: [
      {
        title: 'Payment Integration Pattern',
        description:
          'Use our payment provider webhooks, handle payment intents, implement idempotency...',
      },
      {
        title: 'Billing Convention',
        description: 'Store payment methods securely, log all transactions, handle refunds...',
      },
    ],
    ticket: { title: 'Add payment system with our payment provider', description: 'Feature' },
  },
  {
    prompt: 'Build a dashboard with charts and user analytics',
    keywords: ['dashboard', 'analytics', 'charts', 'metrics'],
    results: [
      {
        title: 'Dashboard Pattern',
        description: 'Use Chart.js, implement real-time updates, cache expensive queries...',
      },
      {
        title: 'Analytics Convention',
        description: 'Track user events, aggregate data daily, use time-series database...',
      },
    ],
    ticket: { title: 'Build dashboard with charts', description: 'Feature' },
  },
  {
    prompt: 'Implement API rate limiting following our team conventions',
    keywords: ['rate limiting', 'API', 'security', 'throttling'],
    results: [
      {
        title: 'Rate Limiting Pattern',
        description: 'Use Redis for counters, implement sliding window, set per-user limits...',
      },
      {
        title: 'API Security Convention',
        description: 'Rate limit by IP and user, return 429 status, log violations...',
      },
    ],
    ticket: { title: 'Implement API rate limiting', description: 'Feature' },
  },
];

export function BigRackFlow() {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [textCompleted, setTextCompleted] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(0); // Number of visible results
  const [ticketPosition, setTicketPosition] = useState<'hidden' | 'todo' | 'transition' | 'doing'>(
    'hidden'
  );

  const currentExample = examples[currentExampleIndex];

  // Sequence: text -> results -> ticket in todo -> ticket in doing
  useEffect(() => {
    if (!textCompleted) return;

    // Show first result after text completes
    const timer1 = setTimeout(() => {
      setResultsVisible(1);
    }, 500);

    // Show second result
    const timer2 = setTimeout(() => {
      setResultsVisible(2);
    }, 1500);

    // Show ticket in Todo
    const timer3 = setTimeout(() => {
      setTicketPosition('todo');
    }, 2500);

    // Move ticket to transition
    const timer4 = setTimeout(() => {
      setTicketPosition('transition');
    }, 4000);

    // Move ticket to Doing
    const timer5 = setTimeout(() => {
      setTicketPosition('doing');
    }, 5000);

    // Cycle to next example
    const cycleTimer = setTimeout(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % examples.length);
      setTextCompleted(false);
      setResultsVisible(0);
      setTicketPosition('hidden');
    }, 10000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(cycleTimer);
    };
  }, [textCompleted, currentExampleIndex]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3">
        {/* AI Prompt Input */}
        <div className="w-full">
          <div className="border-2 border-foreground rounded-sm overflow-hidden">
            <div className="px-4 py-3 min-h-[60px] flex items-center">
              <p className="text-foreground text-sm leading-relaxed font-sans w-full">
                {currentExample && (
                  <TextType
                    text={currentExample.prompt || ''}
                    speed={30}
                    showCursor={false}
                    onComplete={() => setTextCompleted(true)}
                  />
                )}
              </p>
            </div>
            <div className="px-3 py-2 border-t-2 border-foreground flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-foreground">
                <div className="flex items-center gap-1">
                  <span className="text-xs">∞</span>
                  <span>Agent</span>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="flex items-center gap-1">
                  <span>Auto</span>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <span>1x</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-foreground">
                  <svg
                    className="w-3.5 h-3.5 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    Connected to <span className="font-semibold">BigRack MCP</span>
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full border-2 border-foreground flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical line down */}
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-6 bg-foreground" />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground border-2 border-background" />
        </div>

        {/* Tools tree - Vector Database, BigRack Logo, and Kanban with branches */}
        <div className="w-full flex flex-col md:flex-row gap-4 items-start relative">
          {/* Branch lines SVG */}
          <svg
            className="hidden md:block absolute -top-6 left-0 w-full h-full pointer-events-none z-0"
            style={{ overflow: 'visible' }}
          >
            {/* Vertical line from top to branch point */}
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="20%"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            {/* Connection point at branch */}
            <circle cx="50%" cy="20%" r="1.5" fill="currentColor" className="text-foreground" />
            {/* Left branch to Vector Database */}
            <line
              x1="50%"
              y1="20%"
              x2="25%"
              y2="20%"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            {/* Connection point on left branch */}
            <circle cx="25%" cy="20%" r="1.5" fill="currentColor" className="text-foreground" />
            {/* Vertical line down from left branch to Vector Database */}
            <line
              x1="25%"
              y1="20%"
              x2="25%"
              y2="60%"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            {/* Right branch to Kanban */}
            <line
              x1="50%"
              y1="20%"
              x2="75%"
              y2="20%"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            {/* Connection point on right branch */}
            <circle cx="75%" cy="20%" r="1.5" fill="currentColor" className="text-foreground" />
            {/* Vertical line down from right branch to Kanban */}
            <line
              x1="75%"
              y1="20%"
              x2="75%"
              y2="60%"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
          </svg>

          {/* Vector Database */}
          <div className="w-full md:flex-1 border-2 border-foreground rounded-sm p-4 bg-background relative z-10 overflow-hidden min-h-[340px]">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 border-2 border-foreground flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground text-sm">Vector Database</h3>
              </div>

              {/* Search keywords */}
              <div className="mb-3">
                <div className="text-xs text-foreground mb-1.5 font-medium">Searching for:</div>
                <div className="flex flex-wrap gap-1.5">
                  {currentExample.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 text-foreground text-xs border-2 border-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div>
                <div className="text-xs text-foreground mb-1.5 font-medium">Found:</div>
                <div className="space-y-1.5">
                  {currentExample.results.map((result, idx) => {
                    if (idx >= resultsVisible) return null;
                    return (
                      <div
                        key={idx}
                        className="p-2 border-2 border-foreground transition-opacity duration-500 opacity-100"
                      >
                        <div className="text-xs font-medium text-foreground mb-0.5">
                          <DecryptedText
                            text={result.title}
                            speed={30}
                            sequential={true}
                            revealDirection="start"
                            animateOn="view"
                            className="text-foreground"
                            useOriginalCharsOnly
                          />
                        </div>
                        <div className="text-xs text-foreground/70 leading-tight line-clamp-2">
                          <DecryptedText
                            text={result.description}
                            speed={20}
                            sequential={true}
                            revealDirection="start"
                            animateOn="view"
                            className="text-foreground/70"
                            useOriginalCharsOnly
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="w-full md:flex-1 border-2 border-foreground rounded-sm p-4 bg-background relative z-10 min-h-[340px]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 border-2 border-foreground flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground text-sm">Kanban</h3>
            </div>

            <div className="flex flex-col gap-2 relative">
              {/* Todo Section */}
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-foreground mb-0.5">Todo</h4>
                <span className="text-xs text-foreground/70">
                  {ticketPosition === 'todo' ? '1 ticket' : '0 tickets'}
                </span>
              </div>
              <div className="space-y-1.5 min-h-[60px] relative border-2 border-dashed border-foreground/30 p-1.5">
                {ticketPosition === 'todo' && currentExample.ticket && (
                  <div
                    className="p-2 border-2 border-foreground bg-background transition-all duration-500 ease-out"
                    style={{
                      opacity: ticketPosition === 'todo' ? 1 : 0,
                      transform: ticketPosition === 'todo' ? 'scale(1)' : 'scale(0.95)',
                    }}
                  >
                    <div className="text-xs font-medium text-foreground line-clamp-1">
                      {currentExample.ticket.title}
                    </div>
                    <div className="text-xs text-foreground/70 mt-0.5">
                      {currentExample.ticket.description}
                    </div>
                  </div>
                )}
              </div>

              {/* Doing Section */}
              <div className="mb-2 mt-4">
                <h4 className="text-xs font-semibold text-foreground mb-0.5">Doing</h4>
                <span className="text-xs text-foreground/70">
                  {ticketPosition === 'doing' ? '1 ticket' : '0 tickets'}
                </span>
              </div>
              <div className="space-y-1.5 min-h-[60px] relative border-2 border-dashed border-foreground/30 p-1.5">
                {ticketPosition === 'doing' && currentExample.ticket && (
                  <div
                    className="p-2 border-2 border-foreground bg-background animate-in fade-in slide-in-from-top duration-500"
                    style={{
                      animation: 'fadeInSlide 0.5s ease-out',
                    }}
                  >
                    <div className="text-xs font-medium text-foreground line-clamp-1">
                      {currentExample.ticket.title}
                    </div>
                    <div className="text-xs text-foreground/70 mt-0.5">
                      {currentExample.ticket.description}
                    </div>
                  </div>
                )}
              </div>

              {/* Transition ticket - moves from Todo to Doing */}
              {ticketPosition === 'transition' && currentExample.ticket && (
                <div
                  className="absolute top-20 left-0 right-0 p-2 border-2 border-foreground bg-background shadow-lg"
                  style={{
                    transform: 'translateY(calc(100% + 0.5rem)) rotate(2deg) scale(1.02)',
                    transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 20,
                    opacity: 1,
                  }}
                >
                  <div className="text-xs font-medium text-foreground line-clamp-1">
                    {currentExample.ticket.title}
                  </div>
                  <div className="text-xs text-foreground/70 mt-0.5">
                    {currentExample.ticket.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
