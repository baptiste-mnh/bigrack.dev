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

import { Button } from '@bigrack/shared';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl font-bold font-title">Introduction to BigRack</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold font-title">What is BigRack?</h2>
        <p className="mb-4 text-lg">
          BigRack.dev is a Model Context Protocol (MCP) server that extends AI development tools
          like Claude Code and Cursor with advanced task management and persistent context
          capabilities.
        </p>
        <p className="mb-4 text-lg">
          By combining business context management and robust task planning, BigRack helps AI
          assistants maintain consistency and quality on complex projects.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold font-title">Why does BigRack exist?</h2>
        <p className="mb-4 text-lg">
          AI assistants like Claude Code are powerful, but face major limitations on complex
          projects:
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>
            <strong>Progressive context loss</strong>: Details mentioned at the beginning are
            forgotten
          </li>
          <li>
            <strong>Insufficient planning</strong>: Difficulty with complex tasks and their
            dependencies
          </li>
          <li>
            <strong>Premature simplification</strong>: Missing edge cases and important validations
          </li>
          <li>
            <strong>Forgotten business rules</strong>: Business constraints disappear during
            conversations
          </li>
        </ul>
        <p className="mb-4 text-lg">
          BigRack solves these problems by providing a{' '}
          <strong>structured persistent context</strong> that AI can always consult.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold font-title">Who is BigRack for?</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-6 rounded-lg border bg-gray-50">
            <h3 className="mb-2 text-xl font-semibold font-title">Solo Developers</h3>
            <p>
              Maintain business context for personal or freelance projects, even during long
              development sessions.
            </p>
          </div>
          <div className="relative p-6 rounded-lg border bg-gray-50 opacity-50 grayscale">
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 rounded-lg">
              <span className="text-2xl font-bold text-gray-600">Incoming</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold font-title">Teams</h3>
            <p>
              Share business context with your team and maintain consistency across AI-assisted
              development.
            </p>
          </div>
          <div className="relative p-6 rounded-lg border bg-gray-50 opacity-50 grayscale">
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 rounded-lg">
              <span className="text-2xl font-bold text-gray-600">Incoming</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold font-title">Enterprises</h3>
            <p>
              Manage complex projects with strict business rules and large-scale collaboration
              requirements.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold font-title">Overview</h2>
        <p className="mb-4 text-lg">
          BigRack works as a <strong>local MCP server</strong> that integrates with Claude Code,
          Cursor, and other AI assistants via the Model Context Protocol.
        </p>
        <div className="p-6 rounded-lg border bg-gray-50 mb-4">
          <h3 className="mb-3 text-xl font-semibold font-title">Key features:</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Repos and Projects</strong>: Organize your context by business domain (Repo)
              and specific work units (Project)
            </li>
            <li>
              <strong>Persistent Business Context</strong>: Store business rules, glossaries,
              architectural patterns, and team conventions
            </li>
            <li>
              <strong>Intelligent Planning</strong>: Decompose complex features into atomic tickets
              with dependencies (DAG)
            </li>
            <li>
              <strong>Semantic Search</strong>: Find relevant context with natural language queries
              using vector embeddings
            </li>
            <li>
              <strong>Local-First</strong>: All data stored locally with SQLite and embedded vector
              search
            </li>
          </ul>
        </div>
        <p className="text-lg">
          BigRack is <strong>open-source</strong> (Apache License 2.0) and runs entirely on your
          local machine.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold font-title">Next steps</h2>
        <p className="mb-4 text-lg">Ready to get started? Check out our quick start guide:</p>
        <div className="flex gap-4">
          <Link href="/docs/getting-started">Quick Start Guide</Link>
          <Link href="/docs/concepts">Core Concepts</Link>
        </div>
      </section>
    </>
  );
}
