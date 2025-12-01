# Monorepo Version Management

This monorepo uses **Changesets** for version management.

## 📦 Versioned Packages

All packages in the monorepo are versioned with Changesets:

- `@bigrack/mcp` - Main MCP package (publishable to npm, depends on `@bigrack/shared`)
- `@bigrack/shared` - Shared package (private, but versioned because multiple packages depend on it)
- `@bigrack/config` - Shared configuration (private, but versioned because other packages depend on it)
- `@bigrack/api` - Backend API (private application, depends on `@bigrack/shared`, versioned for health checks and version display)
- `@bigrack/dashboard` - Dashboard app (private application, depends on `@bigrack/shared`, versioned for version display)
- `@bigrack/website` - Marketing website (private application, depends on `@bigrack/shared`, versioned for version display)

**Note**: 
- Private packages are versioned by Changesets but won't be published to npm (due to `"private": true` in their package.json)
- Their versions are useful for displaying in health checks, footers, or other UI elements
- Since `@bigrack/mcp`, `@bigrack/api`, `@bigrack/dashboard`, and `@bigrack/website` all depend on `@bigrack/shared`, they are automatically versioned to maintain consistency when `@bigrack/shared` changes

## 🚀 Usage

### 1. Create a changeset

When you modify a versioned package, create a changeset:

```bash
npm run changeset:add
```

This will prompt you for:
- Which packages have changed
- The type of change (major, minor, patch)
- A description of the changes

### 2. Check changeset status

```bash
npm run changeset:status
```

Displays pending changesets and their impact on versions.

### 3. Version packages

```bash
npm run version
```

This command:
1. Applies changesets and updates versions in `package.json` files
2. Generates CHANGELOG.md files

### 4. Complete workflow

```bash
# 1. Make your modifications in the packages
# 2. Create a changeset for modified packages
npm run changeset:add

# 3. Commit the changeset file
git add .changeset/
git commit -m "feat: add new feature"

# 4. When ready to publish, version the packages
npm run version
# This updates package.json files and generates CHANGELOG.md

# 5. Commit the version changes
git add .
git commit -m "chore: version packages"
```

## 📝 Workflow Example

1. **Modify the `@bigrack/shared` package**:
   ```bash
   # Make your modifications in packages/shared/
   ```

2. **Create a changeset**:
   ```bash
   npm run changeset:add
   # Select: @bigrack/shared
   # Type: patch (or minor/major depending on the change)
   # Description: "Add new utility function"
   ```

3. **Commit the changeset**:
   ```bash
   git add .changeset/
   git commit -m "feat(shared): add new utility function"
   ```

4. **When ready to version**:
   ```bash
   npm run version
   # Updates package.json and generates CHANGELOG.md
   ```

5. **Commit the version changes**:
   ```bash
   git add .
   git commit -m "chore: version packages"
   ```

## 🔧 Configuration

Changesets configuration is located in `.changeset/config.json`.

## 📚 Changesets Documentation

For more information about Changesets, see:
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Usage Guide](https://github.com/changesets/changesets/blob/main/docs/common-questions.md)
