# 🗂️ BigRack.dev

**MCP Server for Task & Context Management in AI Development**

> **⚠️ BETA PREVIEW**: This project is currently in public beta. Interfaces and database schemas may change. Use with caution in production environments.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@bigrack/mcp.svg)](https://www.npmjs.com/package/@bigrack/mcp)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

BigRack is a **Model Context Protocol (MCP)** server that extends AI development tools like Claude Code and Cursor with advanced **task/project management** and **persistent context** capabilities.

## 🚀 Setup

### 1. Build the MCP Package

```bash
# From the repository root
npm run build:mcp
```

### 2. Link the Package Globally

```bash
# Link for local development
npm link
```

Or using the npm script:

```bash
npm run link:mcp
```

### 3. Initialize BigRack Globally

```bash
# Run once per machine (initializes ~/.bigrack/)
bigrack init
```

This sets up the global BigRack environment on your machine.

### 4. Configure Your AI Assistant

**For Claude Desktop:**

```bash
bigrack setup-claude
```

Then restart Claude Desktop.

**For Cursor:**

```bash
bigrack setup-cursor
```

## 📖 What's Next?

After setup, you can:

- **Initialize a project**: In your project directory, use Claude/Cursor to call `bigrack_create_repo` - this creates `bigrack.json` and links your project to BigRack
- **Store business context**: Ask Claude/Cursor to store business rules, glossary terms, or architecture patterns
- **Create projects**: Create a new project (Pallet) for a feature or bugfix
- **Decompose features**: Break down complex features into atomic tasks with dependencies
- **Query context**: Use semantic search to find relevant business rules and patterns

## 🎯 The Problem

AI assistants like Claude Code are powerful but face major limitations on complex projects:

- **Progressive context loss**: Details mentioned early in conversations are forgotten
- **Insufficient planning**: Difficulty managing complex tasks with dependencies
- **Premature simplification**: Missing edge cases and important business validations
- **Forgotten business rules**: Critical constraints disappear during development

## 💡 The Solution

BigRack provides a **structured, persistent context** that AI can always consult through the Model Context Protocol. Think of it as giving your AI assistant a **long-term memory** for your project's business rules, architecture decisions, and task dependencies.

## ✨ Key Features

### 📡 MCP Protocol

Standard protocol to extend AI assistants with custom tools. Works with:

- **Claude Code** (Anthropic)
- **Cursor** (Anysphere)
- Any MCP-compatible AI assistant

### 📦 Task Decomposition

- Break down complex features into **atomic tasks**
- Automatic **dependency graph** (DAG) creation
- Intelligent task recommendations based on priority and blockers
- Track progress with `pending`, `in-progress`, `completed`, `blocked` statuses

### 🧠 Context Management

- Store **business rules**, **glossary terms**, **architecture patterns**, and **team conventions**
- **Semantic search** powered by vector embeddings (Xenova/all-MiniLM-L6-v2, 384 dimensions)
- RAG (Retrieval-Augmented Generation) for intelligent context retrieval
- Query context with natural language: _"What are the authentication requirements?"_

### 🏠 Local-First Architecture

- **100% local** - all data stored on your machine with SQLite
- **Embedded vector search** - no external APIs or services required
- **Zero cloud dependency** - works completely offline
- **Privacy-first** - your code never leaves your machine

## 📚 Core Concepts

### Rack (Repository)

A **Rack** represents a business domain or codebase. It's the main container for:

- Business rules
- Glossary terms
- Architecture patterns
- Team conventions
- One Rack per project directory (identified by `bigrack.json`)

### Project

A **Project** represents a specific work unit (feature, bugfix, refactor):

- Automatically inherits context from parent Rack
- Can have project-specific context
- Contains tasks with dependencies
- Linked to Git branches

### Task

An **atomic task** with:

- Title, description, status, priority, type
- Dependencies (other tasks that must be completed first)
- Validation criteria
- Estimated time
- Git branch tracking

### Vector Search & RAG

- All business context is automatically embedded using **Xenova/all-MiniLM-L6-v2** (~22.6 MB)
- **384-dimensional** vector embeddings
- Natural language queries return the most relevant context
- Runs **100% locally** with no external API calls

## 🛠️ CLI Commands

### Global Setup

```bash
bigrack init                    # Initialize BigRack globally (once per machine)
bigrack status                  # Show current repository status
```

### Project Management

```bash
bigrack projects create --name "Feature X" --type feature
bigrack projects list
```

### Task Management

```bash
bigrack ticket list                           # List all tasks
bigrack ticket list --status pending          # Filter by status
bigrack ticket list --priority critical       # Filter by priority
bigrack ticket get <ID>                       # Show task details
```

### Context Management

```bash
bigrack context add --type business_rule --name "Rule" --description "..."
bigrack context query "authentication requirements"
bigrack context list
```

### Configuration

```bash
bigrack config show             # Show current configuration
bigrack config get <key>        # Get config value
bigrack config set <key> <value> # Set config value
```

## 🏗️ Architecture

```
bigrack.dev/
├── apps/
│   ├── website/              # Marketing website (Next.js 14)
│   ├── api/                  # Backend API (future)
│   └── dashboard/            # Web dashboard (future)
├── packages/
│   ├── mcp/                  # @bigrack/mcp - MCP server (THIS IS THE CORE)
│   │   ├── src/
│   │   │   ├── mcp/          # MCP server & tools
│   │   │   ├── cli/          # CLI commands
│   │   │   ├── storage/      # SQLite + Prisma
│   │   │   ├── embeddings/   # Vector embeddings
│   │   │   └── logger/       # Pino logger
│   │   └── prisma/           # Database schema
│   ├── shared/               # Shared types & utilities
│   └── config/               # Shared configs
└── LICENSE                   # Apache License 2.0
```

## 📦 Technology Stack

### MCP Server (Local)

- **Runtime**: Node.js 20+, TypeScript 5.3+
- **Database**: SQLite via Prisma ORM
- **Vector Search**: Xenova/transformers.js (local embeddings)
- **Model**: all-MiniLM-L6-v2 (384 dimensions, ~22.6 MB)
- **CLI**: Commander, Inquirer, Chalk, Ora
- **Logging**: Pino

### Website

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/baptiste-mnh/bigrack.dev.git
cd bigrack

# Install dependencies
npm install

# Build all packages
npm run build

# Build MCP package
npm run build:mcp

# Link MCP package for local development
npm run link:mcp

# Run in development mode with auto-rebuild
npm run dev:mcp
```

### Project Structure

- Monorepo managed with **Turborepo**
- Workspaces: `apps/*` and `packages/*`
- MCP package: `packages/mcp/`

### Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(mcp): add ticket list command
fix(storage): resolve dependency resolution bug
docs(readme): update installation instructions
```

## 📄 License

BigRack is licensed under the [Apache License 2.0](LICENSE).

This means you can:

- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Use privately
- ✅ Sublicense

With protections for:

- 🛡️ Patents (patent grant included)
- 🛡️ Trademarks (you can't use "BigRack" name without permission)

See [LICENSE](LICENSE) for full details.

## ⚠️ Disclaimer

This software is provided as-is, without any warranty.

All data is stored locally on your device.

See the Apache 2.0 license for more details.

## 🌟 Why BigRack?

**For Solo Developers:**

- Maintain context across long development sessions
- Never lose track of business rules and constraints
- Plan complex features with confidence

**For Teams:**

- Share business context across the team
- Consistent AI-assisted development
- Track progress and dependencies

**For Enterprises:**

- Manage complex projects with strict business rules
- Compliance and audit trails
- Self-hosted for data privacy

## 🔗 Links

- **Website**: [bigrack.dev](https://bigrack.dev)
- **Documentation**: [bigrack.dev/docs](https://bigrack.dev/docs)
- **GitHub**: [github.com/baptiste-mnh/bigrack.dev](https://github.com/baptiste-mnh/bigrack.dev)
- **npm Package**: [@bigrack/mcp](https://www.npmjs.com/package/@bigrack/mcp)
- **Issues**: [github.com/baptiste-mnh/bigrack.dev/issues](https://github.com/baptiste-mnh/bigrack.dev/issues)
- **Discussions**: [github.com/baptiste-mnh/bigrack.dev/discussions](https://github.com/baptiste-mnh/bigrack.dev/discussions)

---

**Built with ❤️ by @baptiste-mnh**

_Empowering developers to build complex projects with AI assistance_
