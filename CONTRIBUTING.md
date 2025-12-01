# Contributing to BigRack

First off, thank you for considering contributing to BigRack! It's people like you that make BigRack such a great tool for the developer community.

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [contact@bigrack.dev](mailto:contact@bigrack.dev).

### Our Standards

- **Be respectful and inclusive**: Welcome and support people of all backgrounds and identities
- **Be collaborative**: Work together to achieve common goals
- **Be professional**: Accept constructive criticism gracefully
- **Focus on what is best** for the community and the project
- **Show empathy** towards other community members

## 🚀 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue list](https://github.com/baptiste-mnh/bigrack.dev/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce** the problem
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected
- **Include screenshots** if relevant
- **Include your environment details**:
  - BigRack version (`bigrack --version`)
  - Node.js version (`node --version`)
  - Operating system and version
  - AI assistant (Claude Code, Cursor, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as [GitHub issues](https://github.com/baptiste-mnh/bigrack.dev/issues). When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most BigRack users
- **List any alternative solutions or features** you've considered
- **Include examples** of how the feature would be used

### Pull Requests

#### Before Submitting a Pull Request

1. **Check existing PRs**: Make sure no one else is working on the same thing
2. **Open an issue first**: For major changes, discuss your idea with maintainers
3. **Follow the coding style**: Use ESLint and Prettier (configured in the project)
4. **Write tests**: Add tests for new features or bug fixes
5. **Update documentation**: Keep README.md and docs up to date

#### Pull Request Process

1. **Fork the repository** and create your branch from `main`:

   ```bash
   git checkout -b feat/my-new-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following the coding guidelines below

3. **Test your changes**:

   ```bash
   npm run build
   npm run test
   npm run lint
   ```

4. **Commit your changes** using conventional commits:

   ```bash
   git commit -m "feat(mcp): add ticket next command"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feat/my-new-feature
   ```

6. **Open a Pull Request** with:
   - Clear title following conventional commits format
   - Detailed description of changes
   - Reference to related issues (`Closes #123`)
   - Screenshots/videos for UI changes

## 💻 Development Setup

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **Git**: Latest version

### Getting Started

```bash
# 1. Clone your fork
git clone https://github.com/YOUR_USERNAME/bigrack.git
cd bigrack

# 2. Add upstream remote
git remote add upstream https://github.com/baptiste-mnh/bigrack.dev.git

# 3. Install dependencies
npm install

# 4. Build all packages
npm run build

# 5. Link MCP package for local development
npm run link:mcp

# Now you can use `bigrack` command with your local changes
```

### Project Structure

BigRack is a **monorepo** managed with Turborepo:

```
bigrack.dev/
├── apps/
│   └── website/              # Marketing website (Next.js 14)
├── packages/
│   ├── mcp/                  # @bigrack/mcp - Core MCP server
│   │   ├── src/
│   │   │   ├── mcp/          # MCP server & tools
│   │   │   ├── cli/          # CLI commands
│   │   │   ├── storage/      # SQLite + Prisma
│   │   │   ├── vector/       # Vector embeddings
│   │   │   └── logger/       # Logging
│   │   └── prisma/           # Database schema
│   ├── shared/               # Shared types & utils
│   └── config/               # Shared configs
└── LICENSE                   # Apache 2.0
```

### Development Workflow

#### Working on MCP Package

```bash
# Watch mode (auto-rebuilds on changes)
npm run dev:mcp

# Build only
npm run build:mcp

# Test only
npm run test:mcp

# Lint only
npm run lint --filter=@bigrack/mcp
```

#### Working on Website

```bash
# Dev server (http://localhost:3000)
npm run dev:website

# Build
npm run build:website
```

#### Database Changes (Prisma)

```bash
# Navigate to MCP package
cd packages/mcp

# Edit schema
nano prisma/schema.prisma

# Create migration
npx prisma migrate dev --name my_migration_name

# Generate Prisma Client
npx prisma generate
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test:mcp

# Run tests in watch mode
cd packages/mcp && npm run test:watch
```

## 🎨 Coding Guidelines

### TypeScript

- Use **TypeScript** for all new code
- Enable **strict mode** (already configured)
- Prefer `interface` over `type` for object shapes
- Use `const` over `let` when possible
- Avoid `any` - use `unknown` or proper types

### Naming Conventions

- **Files**: kebab-case (`my-component.ts`)
- **Functions**: camelCase (`getUserData()`)
- **Classes**: PascalCase (`UserManager`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **MCP Tools**: snake_case (`bigrack_create_repo`)

### Code Style

- Use **ESLint** and **Prettier** (configured in the project)
- Run before committing:
  ```bash
  npm run lint
  npm run format
  ```
- Max line length: 100 characters
- Use **2 spaces** for indentation
- Always use **semicolons**

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config, etc.)
- `ci`: CI/CD changes

**Scopes:**

- `mcp`: MCP server core
- `cli`: CLI commands
- `storage`: Database/storage layer
- `vector`: Vector embeddings/search
- `website`: Marketing website
- `docs`: Documentation

**Examples:**

```bash
feat(mcp): add ticket next command
fix(storage): resolve task dependency resolution
docs(readme): update installation instructions
test(mcp): add unit tests for get_next_step tool
chore(deps): update @xenova/transformers to v3.0.0
```

### Testing

- Write **unit tests** for business logic
- Write **integration tests** for MCP tools
- Use **descriptive test names**:
  ```typescript
  describe('bigrack_get_next_step', () => {
    it('should return pending tasks sorted by priority', async () => {
      // ...
    });
  });
  ```
- Aim for **>80% code coverage** on critical paths

### Documentation

- Add **JSDoc comments** for public APIs:
  ```typescript
  /**
   * Get recommended next tasks based on priority and dependencies
   * @param args - Arguments containing projectId and filters
   * @returns Promise with recommended tasks
   */
  export async function bigrackGetNextStep(
    args: BigrackGetNextStepArgs
  ): Promise<BigrackGetNextStepResult>;
  ```
- Update **README.md** for user-facing changes
- Update **docs/** for detailed documentation
- Add **inline comments** for complex logic

## 🏗️ Architecture Guidelines

### MCP Tools

When creating new MCP tools:

1. Create tool file in `packages/mcp/src/mcp/tools/`
2. Export from `packages/mcp/src/mcp/tools/index.ts`
3. Register in `packages/mcp/src/mcp/server.ts`
4. Add TypeScript interfaces for args and result
5. Add error handling and logging
6. Write tests in `packages/mcp/tests/`

Example structure:

```typescript
import { prismaClient as prisma } from '../../storage';
import { daemonLogger } from '../../logger';

const logger = daemonLogger.child({ module: 'bigrack-my-tool' });

export interface BigrackMyToolArgs {
  // Input parameters
}

export interface BigrackMyToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function bigrackMyTool(args: BigrackMyToolArgs): Promise<BigrackMyToolResult> {
  logger.info({ args }, 'Executing my tool');

  try {
    // Implementation

    logger.info({ success: true }, 'Tool completed');
    return { success: true, message: 'Success', data: result };
  } catch (error: any) {
    logger.error({ err: error }, 'Tool failed');
    return { success: false, message: 'Failed', error: error.message };
  }
}
```

### CLI Commands

When creating CLI commands:

1. Create command file in `packages/mcp/src/cli/commands/`
2. Export from `packages/mcp/src/cli/commands/index.ts`
3. Register in `packages/mcp/src/cli/index.ts`
4. Use Commander.js for argument parsing
5. Add `--help` documentation
6. Use chalk/ora for beautiful output

### Database Schema

- Use Prisma for database schema
- Create migrations for all schema changes
- Use meaningful field names
- Add indexes for frequently queried fields
- Document complex relationships

### Vector Search

- All context must be automatically embedded
- Use consistent embedding model (all-MiniLM-L6-v2)
- Store content hash to detect changes
- Implement proper error handling for embedding failures

## 🐛 Debugging

### Enable Verbose Logging

```bash
# Set log level to debug
export BIGRACK_LOG_LEVEL=debug

# Or use --verbose flag
bigrack --verbose init
```

### Inspect Database

```bash
cd packages/mcp
npx prisma studio
```

### Reset Development Environment

```bash
# Remove local database
rm -rf ~/.bigrack/

# Rebuild and relink
npm run build:mcp
npm run link:mcp

# Reinitialize
cd your-project
bigrack init
```

## 📦 Publishing (for Maintainers)

Publishing is done via CI/CD when a tag is pushed:

```bash
# Update version
cd packages/mcp
npm version patch  # or minor, major

# Push with tags
git push && git push --tags
```

## 🔢 Version Management

This monorepo uses **Changesets** for version management. When you modify versioned packages (`@bigrack/mcp`, `@bigrack/shared`, or `@bigrack/config`), you need to create a changeset to describe the changes.

**Quick workflow:**

1. Make your code changes
2. Run `npm run changeset:add` to create a changeset
3. Commit the changeset file along with your changes
4. When ready to publish, run `npm run version` to update package versions

For detailed information about version management, see [VERSIONING.md](../VERSIONING.md).

## 🙏 Thank You!

Your contributions make BigRack better for everyone. We appreciate your time and effort!

## 📬 Questions?

- **Discord**: [discord.gg/bigrack](https://discord.gg/bigrack)
- **GitHub Discussions**: [github.com/baptiste-mnh/bigrack.dev/discussions](https://github.com/baptiste-mnh/bigrack.dev/discussions)
- **Email**: [contact@bigrack.dev](mailto:contact@bigrack.dev)

---

**Happy coding! 🚀**
