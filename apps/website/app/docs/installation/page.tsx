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

export default function InstallationPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl font-bold">Installation and Configuration</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Prerequisites</h2>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>
            <strong>Node.js</strong>: Version 20 or higher
          </li>
          <li>
            <strong>npm</strong>: Version 9 or higher
          </li>
          <li>
            <strong>Claude Desktop or Cursor</strong>: For MCP integration (recommended)
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Installation via npm</h2>
        <p className="mb-4 text-lg">Install BigRack globally on your machine:</p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>npm install -g @bigrack/mcp</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This installation includes the MCP server and CLI to manage your racks and projects.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Installation from GitHub</h2>
        <p className="mb-4 text-xl italic">
          You can install BigRack directly from the GitHub repository by cloning only the MCP
          package folder:
        </p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>
              {`git clone --filter=blob:none --sparse https://github.com/baptiste-mnh/bigrack.dev.git
cd bigrack
git sparse-checkout set packages/mcp
cd packages/mcp
npm install -g .`}
            </code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This will install the latest version from the GitHub repository. The{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">npm install -g .</code> command
          installs the package globally from the current directory.
        </p>

        <h3 className="mb-3 text-xl font-semibold mt-8">Development Installation</h3>
        <p className="mb-4 text-lg">
          If you want to contribute to the project or use the latest development version, you can
          clone and build the repository:
        </p>

        <h3 className="mb-3 text-xl font-semibold">1. Clone the repository</h3>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>git clone https://github.com/baptiste-mnh/bigrack.dev.git{'\n'}cd bigrack</code>
          </pre>
        </div>

        <h3 className="mb-3 text-xl font-semibold">2. Install dependencies</h3>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>npm install</code>
          </pre>
        </div>

        <h3 className="mb-3 text-xl font-semibold">3. Build the project</h3>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>npm run build</code>
          </pre>
        </div>

        <h3 className="mb-3 text-xl font-semibold">4. Link globally</h3>
        <p className="mb-4 text-lg">To use the local version as a global command:</p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>npm run link:mcp</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          Now you can use the <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack</code>{' '}
          command from anywhere. To unlink later, use{' '}
          <code className="text-sm bg-gray-100 px-2 py-1 rounded">npm run unlink:mcp</code>.
        </p>

        <h3 className="mb-3 text-xl font-semibold">Development Mode</h3>
        <p className="mb-4 text-lg">For active development with auto-rebuild on changes:</p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>npm run dev:mcp</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This watches for file changes and automatically rebuilds the package.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Initial Configuration</h2>

        <h3 className="mb-3 text-xl font-semibold">1. Initialize BigRack globally</h3>
        <p className="mb-4 text-lg">
          First, initialize BigRack globally on your machine (run once per machine):
        </p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>bigrack init</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This sets up the BigRack database, downloads the embedding model, and creates the
          configuration directory (~/.bigrack/).
        </p>

        <h3 className="mb-3 text-xl font-semibold">2. Create a Repo in your project</h3>
        <p className="mb-4 text-lg">In your project directory, create a Repo using the MCP tool:</p>
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm mb-2">
            <strong>Ask your AI assistant:</strong>
          </p>
          <p className="text-sm italic">&quot;Create a new BigRack repo for this project&quot;</p>
        </div>
        <p className="mb-4 text-lg">
          This creates a <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack.json</code>{' '}
          file and registers the Repo in the local SQLite database (~/.bigrack/).
        </p>

        <h3 className="mb-3 text-xl font-semibold">3. First-time setup (Vector Search)</h3>
        <p className="mb-4 text-lg">
          During initialization, BigRack downloads the vector embedding model (~80MB):
        </p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>
              {`🔍 Vector:      ✅ Ready
             Model: Xenova/all-MiniLM-L6-v2
             Dim: 384
             Size: ~22.6 MB`}
            </code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This model enables semantic search over your business context. It runs entirely locally
          with no external API calls.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Integration with Claude Desktop</h2>

        <h3 className="mb-3 text-xl font-semibold">Automatic Configuration</h3>
        <p className="mb-4 text-lg">To integrate BigRack with Claude Desktop, use:</p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>bigrack setup-claude</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This command automatically configures Claude Desktop to use BigRack as an MCP server.
        </p>

        <h3 className="mb-3 text-xl font-semibold">Manual Configuration</h3>
        <p className="mb-4 text-lg">
          If you prefer to configure manually, add this to your Claude Desktop configuration file:
        </p>
        <ul className="mb-4 space-y-2 text-lg list-disc list-inside">
          <li>
            <strong>Linux/Mac</strong>:{' '}
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              ~/.config/claude/claude_desktop_config.json
            </code>
          </li>
          <li>
            <strong>Windows</strong>:{' '}
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              %APPDATA%\Claude\claude_desktop_config.json
            </code>
          </li>
        </ul>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm overflow-x-auto">
            {`{
  "mcpServers": {
    "bigrack": {
      "command": "npx",
      "args": ["-y", "@bigrack/mcp"]
    }
  }
}`}
          </pre>
        </div>
        <p className="mb-4 text-lg">
          <strong>Important</strong>: Restart Claude Desktop after configuration for changes to take
          effect.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Integration with Cursor</h2>
        <p className="mb-4 text-lg">To integrate BigRack with Cursor:</p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>bigrack setup-cursor</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          This configures Cursor to use BigRack as an MCP server. Restart Cursor after
          configuration.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Verification</h2>
        <p className="mb-4 text-lg">Verify your installation:</p>
        <div className="p-4 rounded-lg bg-gray-100 border mb-4">
          <pre className="text-sm">
            <code>bigrack --version</code>
          </pre>
        </div>
        <p className="mb-4 text-lg">
          You should see the BigRack version and a confirmation that the MCP server is ready.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-3xl font-semibold">Next Steps</h2>
        <p className="mb-4 text-lg">After installation, you can:</p>
        <ol className="mb-4 space-y-3 text-lg list-decimal list-inside">
          <li>
            Initialize BigRack globally with{' '}
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack init</code>
          </li>
          <li>
            Create a Repo using the{' '}
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_create_repo</code> MCP
            tool in your AI assistant
          </li>
          <li>Add business context with MCP tools in your AI assistant</li>
          <li>
            Create a Project with{' '}
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">bigrack_create_project</code>{' '}
            MCP tool
          </li>
          <li>Decompose features using MCP tools in your AI assistant</li>
        </ol>
        <p className="mb-4 text-lg">
          See the{' '}
          <a href="/docs/getting-started" className="text-primary underline">
            Quick Start Guide
          </a>{' '}
          for a detailed tutorial.
        </p>
      </section>
    </>
  );
}
