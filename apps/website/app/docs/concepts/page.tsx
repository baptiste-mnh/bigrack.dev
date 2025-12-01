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

export default function ConceptsPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl font-bold">Core Concepts</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">MCP (Model Context Protocol)</h2>
        <p className="mb-4 text-lg">
          The Model Context Protocol (MCP) is a standardized protocol that allows AI assistants like
          Claude to interact with external tools and data. BigRack implements this protocol to
          provide persistent, structured context to AI development tools.
        </p>
        <p className="mb-4 text-lg">
          Via MCP, Claude can query BigRack to get business context, plan tasks, and validate that
          code respects defined rules.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Repos and Projects</h2>

        <div className="mb-6 p-6 rounded-lg border bg-gray-50">
          <h3 className="mb-3 text-xl font-semibold">Hierarchical architecture</h3>
          <pre className="p-4 rounded bg-white border text-sm overflow-x-auto">
            {`BigRack Installation
│
├── Repo: "E-commerce Platform"
│   │
│   ├── 📚 Business Context (shared)
│   │   ├── Business Rules
│   │   ├── Glossary Entries
│   │   ├── Architecture Patterns
│   │   └── Team Conventions
│   │
│   └── 📋 Projects
│       ├── Project: "Payment Integration"
│       │   ├── Task: "Setup payment gateway API keys"
│       │   ├── Task: "Implement payment processing endpoint"
│       │   ├── Task: "Add payment validation logic"
│       │   └── Task: "Write payment integration tests"
│       ├── Project: "Fix Cart Bug"
│       │   ├── Task: "Reproduce the cart bug"
│       │   ├── Task: "Identify root cause"
│       │   ├── Task: "Implement fix"
│       │   └── Task: "Add regression tests"
│       └── Project: "Add Tests"
│           ├── Task: "Setup test framework"
│           ├── Task: "Add unit tests for core modules"
│           └── Task: "Add integration tests"
│
└── Repo: "Marketing Website"
    └── ...`}
          </pre>
        </div>

        <h3 className="mb-3 text-xl font-semibold">Repo</h3>
        <p className="mb-4 text-lg">
          A <strong>Repo</strong> represents a <strong>business domain</strong> or{' '}
          <strong>codebase</strong>. It&apos;s the main container for your business context.
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>Contains context shared by all projects</li>
          <li>Can be linked to a Git repository</li>
          <li>Stores business rules, patterns, and conventions</li>
          <li>One repo per project directory (bigrack.json file)</li>
        </ul>

        <h3 className="mb-3 text-xl font-semibold">Project</h3>
        <p className="mb-4 text-lg">
          A <strong>Project</strong> represents a specific <strong>work unit</strong>
          (feature, bugfix, refactor, etc.).
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>Automatically inherits context from the parent Repo</li>
          <li>Can have its own specific context</li>
          <li>Linked to a Git branch</li>
          <li>Contains tickets with dependencies</li>
        </ul>

        <h3 className="mb-3 text-xl font-semibold">Ticket</h3>
        <p className="mb-4 text-lg">
          A <strong>Ticket</strong> represents an <strong>atomic task</strong> within a project.
          It&apos;s the smallest unit of work that can be planned, tracked, and completed
          independently.
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>Belongs to a specific Project</li>
          <li>Can have dependencies on other tickets (forming a DAG)</li>
          <li>Has a status (pending, in-progress, completed, blocked)</li>
          <li>Can include validation criteria and objectives</li>
          <li>Can be linked to a Git branch for tracking</li>
          <li>Has a type: setup, implementation, testing, or documentation</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Persistent Business Context</h2>
        <p className="mb-4 text-lg">
          Business context is the structured knowledge that allows BigRack to understand your domain
          and validate that your code respects your rules.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="p-6 rounded-lg border bg-gray-50">
            <h3 className="mb-3 text-xl font-semibold">Business Rules</h3>
            <p className="mb-2">Business rules that must be respected by the code.</p>
            <p className="text-sm italic text-gray-600">
              Example: &quot;Stock cannot be negative&quot;, &quot;Discounts max 70%&quot;
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-gray-50">
            <h3 className="mb-3 text-xl font-semibold">Glossary Entries</h3>
            <p className="mb-2">Definitions of terms specific to your domain.</p>
            <p className="text-sm italic text-gray-600">
              Example: &quot;SKU: Stock Keeping Unit&quot;, &quot;Cart: Shopping basket&quot;
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-gray-50">
            <h3 className="mb-3 text-xl font-semibold">Architecture Patterns</h3>
            <p className="mb-2">Patterns and architectural decisions to follow.</p>
            <p className="text-sm italic text-gray-600">
              Example: &quot;Use Repository pattern&quot;, &quot;NestJS for backend&quot;
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-gray-50">
            <h3 className="mb-3 text-xl font-semibold">Team Conventions</h3>
            <p className="mb-2">Code conventions and team standards.</p>
            <p className="text-sm italic text-gray-600">
              Example: &quot;Test coverage &gt; 80%&quot;, &quot;Use Prettier&quot;
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Planning and Decomposition</h2>
        <p className="mb-4 text-lg">
          BigRack can decompose a complex feature into <strong>atomic tickets</strong> with their
          dependencies. This creates a dependency graph (DAG) that guides development.
        </p>
        <p className="mb-4 text-lg">
          Each ticket can have validation criteria, objectives, and be linked to a Git branch.
        </p>
        <div className="p-6 rounded-lg border bg-gray-50">
          <h3 className="mb-3 text-xl font-semibold">Ticket Properties</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Title</strong>: Clear description of the task
            </li>
            <li>
              <strong>Status</strong>: pending, in-progress, completed, blocked
            </li>
            <li>
              <strong>Priority</strong>: critical, high, medium, low
            </li>
            <li>
              <strong>Dependencies</strong>: Other tickets that must be completed first
            </li>
            <li>
              <strong>Type</strong>: setup, implementation, testing, documentation
            </li>
            <li>
              <strong>Validation Criteria</strong>: How to verify the task is complete
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Vector Search & RAG</h2>
        <p className="mb-4 text-lg">
          BigRack uses <strong>vector embeddings</strong> and semantic search to find relevant
          context for your queries. This enables a RAG (Retrieval-Augmented Generation) workflow.
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>All business context is automatically embedded using local ML models</li>
          <li>Natural language queries return the most relevant context</li>
          <li>AI assistants can query context automatically during conversations</li>
          <li>No external API calls - everything runs locally</li>
        </ul>
      </section>
    </>
  );
}
