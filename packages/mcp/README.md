# @bigrack/mcp

**BigRack.dev MCP Daemon** - Intelligent context management for Claude Code and AI assistants.

## Overview

This package provides a local MCP (Model Context Protocol) daemon that helps AI assistants maintain persistent context, plan complex tasks, and validate business rules throughout development.

## Features

- 🔐 **End-to-end encryption** - Zero-knowledge architecture
- 💾 **Local-first storage** - SQLite with vector search
- 🔍 **Semantic search** - Local embeddings via Transformers.js
- 🎯 **Task planning** - Decompose complex features into manageable tasks
- ✅ **Business rules validation** - Continuous verification
- 🔄 **Git integration** - Track branches, commits, and repository state

## Installation

```bash
npm install -g @bigrack/mcp
```

## Quick Start

```bash
# Start the daemon
bigrack start

# Initialize a new project
bigrack repos init

# Store business context
bigrack context add "User authentication must use OAuth 2.0"

# Query context
bigrack context query "authentication requirements"
```

## Documentation

For full documentation, visit [bigrack.dev/docs](https://bigrack.dev/docs)

## Architecture

- **Local daemon** - Runs on your machine
- **Encrypted storage** - SQLite with AES-256-GCM
- **Vector search** - sqlite-vss or LanceDB
- **MCP protocol** - stdio (Claude Desktop) and WebSocket (browser)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Lint
npm run lint

# Format code
npm run format
```

## License

Apache-2.0

## Links

- [GitHub Repository](https://github.com/baptiste-mnh/bigrack.dev)
- [Documentation](https://bigrack.dev/docs)
- [Issues](https://github.com/baptiste-mnh/bigrack.dev/issues)
