# @bigrack/mcp

## 0.1.0

### Minor Changes

- **Initial Beta Release**
  - **Core MCP Server**: Full implementation of the Model Context Protocol for Claude and Cursor.
  - **Task Management**: Create, list, update, and delete tickets with dependencies.
  - **Project Management**: Organize work into Projects and Racks (Repositories).
  - **Context Engine**:
    - RAG (Retrieval-Augmented Generation) powered by local vector embeddings (all-MiniLM-L6-v2).
    - Store and query Business Rules, Glossary, Patterns, and Conventions.
  - **CLI Tools**: `bigrack` command-line interface for managing the server and resources.
  - **Local-First**: SQLite database storage and local embedding generation (no external API dependencies).

### Patch Changes

- Updated dependencies
  - @bigrack/shared@0.1.0
