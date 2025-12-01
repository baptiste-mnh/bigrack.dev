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

export default function GettingStartedPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl font-bold">Quick Start Guide</h1>

      <section className="mb-12">
        <p className="mb-4 text-lg">
          Let&apos;s get you started. This isn&apos;t a rigid tutorial—think of it as a friendly
          walkthrough. You&apos;ll feel how BigRack works, then you&apos;ll naturally find your own
          flow.
        </p>
      </section>

      <section className="mb-12 p-5 rounded-lg border">
        <h2 className="mb-3 text-xl font-semibold">💻 Visual Dashboard</h2>
        <p className="mb-3">
          Want to see your projects and tasks visually? Start the dashboard with this command:
        </p>
        <pre className="p-3 rounded-lg border mb-3 text-sm  bg-gray-100  text-gray-900 font-mono overflow-x-auto">
          <code>bigrack gui start</code>
        </pre>
        <p className="mb-4 text-lg">
          The dashboard opens automatically in your browser. Perfect for exploring your repos,
          projects, and tasks visually.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Step 1: Initialize BigRack</h2>
        <p className="mb-4 text-lg">
          First things first—let&apos;s set up BigRack on your machine. This is a one-time thing:
        </p>
        <pre className="p-4 rounded-lg bg-gray-100 border mb-4 text-sm text-gray-900 font-mono overflow-x-auto">
          <code>bigrack init</code>
        </pre>
        <p className="mb-4 text-lg">
          This sets up the BigRack database and downloads the embedding model (~80MB).
        </p>

        <h3 className="mb-3 text-xl font-semibold">Create Your First Repo</h3>
        <p className="mb-4 text-lg">
          A Repo is where your project&apos;s context lives. Think of it as your project&apos;s
          memory. Let&apos;s create one:
        </p>

        <h4 className="mb-2 text-lg font-semibold">Via AI Assistant (MCP) - Recommended</h4>
        <p className="mb-4 text-lg">
          The easiest way? Just ask your AI. It knows how to use{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_create_repo</code>:
        </p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Just say:</strong>
          </p>
          <p className="text-sm italic">&quot;Create a new BigRack repo for this project&quot;</p>
        </div>

        <h4 className="mb-2 text-lg font-semibold">Via CLI</h4>
        <p className="mb-4 text-lg">
          <strong>Note:</strong> Repo creation via CLI is not yet available. Please use the{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_create_repo</code> MCP
          tool. CLI commands for repo management are planned for a future release.
        </p>
        <p className="mb-4 text-lg">
          This creates a <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack.json</code>{' '}
          file and registers your Repo in the local database (~/.bigrack/).
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Step 2: Add Business Context</h2>
        <p className="mb-4 text-lg">
          Now let&apos;s give your project some memory. Add the rules, patterns, and context that
          matter:
        </p>

        <h3 className="mb-3 text-xl font-semibold">Via AI Assistant (MCP) - Recommended</h3>
        <p className="mb-4 text-lg">
          Just talk to your AI naturally. It&apos;ll use{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_store_context</code>{' '}
          behind the scenes:
        </p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Just say:</strong>
          </p>
          <p className="text-sm italic">
            &quot;Store a business rule: Stock cannot be negative. Priority: critical&quot;
          </p>
        </div>

        <h3 className="mb-3 text-xl font-semibold">Via CLI</h3>
        <p className="mb-4 text-lg">
          <strong>Note:</strong> Context management via CLI is not yet available. Please use the MCP
          tools in your AI assistant (Claude Desktop, Cursor, etc.) to add business context. CLI
          commands for context management are planned for a future release.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Step 3: Create a Project</h2>
        <p className="mb-4 text-lg">
          Projects are where the magic happens. Each one is a focused work unit—a feature, a bugfix,
          whatever you&apos;re building. Let&apos;s create one:
        </p>

        <h3 className="mb-3 text-xl font-semibold">Via AI Assistant (MCP)</h3>
        <p className="mb-4 text-lg">
          Again, just ask your AI. It handles{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_create_project</code> for
          you:
        </p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Just say:</strong>
          </p>
          <p className="text-sm italic">
            &quot;Create a new project called &apos;Payment Integration&apos; of type feature&quot;
          </p>
        </div>

        <h3 className="mb-3 text-xl font-semibold">Via CLI</h3>
        <p className="mb-4 text-lg">
          <strong>Note:</strong> Project creation via CLI is not yet available. Please use the{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_create_project</code> MCP
          tool in your AI assistant. CLI commands for project management are planned for a future
          release.
        </p>
        <p className="mb-4 text-lg">
          The Project automatically inherits business context from the parent Repo.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Step 4: Decompose a Feature</h2>
        <p className="mb-4 text-lg">
          Got a big feature? Break it down naturally. Your AI uses{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_decompose_feature</code>{' '}
          to turn complexity into manageable tasks:
        </p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Just say:</strong>
          </p>
          <p className="text-sm italic">
            &quot;Decompose the feature &apos;Payment Integration&apos; into atomic tasks with their
            dependencies&quot;
          </p>
        </div>
        <p className="mb-4 text-lg">
          BigRack reads your context, understands the dependencies, and builds a smart task graph.
          It just works.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Step 5: Use Semantic Search</h2>
        <p className="mb-4 text-lg">
          Need to remember something? Just ask. BigRack&apos;s semantic search finds what you need:
        </p>

        <h3 className="mb-3 text-xl font-semibold">Via AI Assistant (MCP)</h3>
        <p className="mb-4 text-lg">
          Your AI automatically uses{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_query_context</code> when
          you ask questions:
        </p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Just ask:</strong>
          </p>
          <p className="text-sm italic">
            &quot;What are the authentication requirements for this project?&quot;
          </p>
        </div>
        <p className="mb-4 text-lg">
          Behind the scenes, BigRack uses <strong>vector embeddings</strong> to find exactly what
          you need. It&apos;s like having a perfect memory.
        </p>

        <h3 className="mb-3 text-xl font-semibold">Via CLI</h3>
        <p className="mb-4 text-lg">
          <strong>Note:</strong> Context querying via CLI is not yet available. Please use the{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_query_context</code> MCP
          tool in your AI assistant. CLI commands for context querying are planned for a future
          release.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Step 6: Track Progress</h2>
        <p className="mb-4 text-lg">
          Wondering what to work on next? BigRack knows. It tracks dependencies and suggests the
          right tasks:
        </p>

        <h3 className="mb-3 text-xl font-semibold">Via AI Assistant (MCP)</h3>
        <p className="mb-4 text-lg">
          Your AI uses{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_get_next_step</code> to
          give you smart recommendations:
        </p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Just ask:</strong>
          </p>
          <p className="text-sm italic">
            &quot;What should I work on next for the Payment Integration project?&quot;
          </p>
        </div>

        <h3 className="mb-3 text-xl font-semibold">Via CLI</h3>
        <pre className="p-4 rounded-lg bg-gray-100 border mb-4 text-sm text-gray-900 font-mono overflow-x-auto">
          <code>bigrack status</code>
        </pre>
        <p className="mb-4 text-lg">
          You can also use{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack ticket next</code> to get
          recommended next tasks from the command line.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Next Steps</h2>
        <p className="mb-4 text-lg">
          You&apos;ve got the basics. Now explore deeper, find your flow, and make BigRack yours:
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>
            <a href="/docs/concepts" className="text-primary underline">
              Core Concepts
            </a>
            : Understand Repos, Projects, and Context Management
          </li>
          <li>
            <a href="/docs/installation" className="text-primary underline">
              Installation Guide
            </a>
            : Advanced setup with Cursor and other AI assistants
          </li>
        </ul>
      </section>
    </>
  );
}
