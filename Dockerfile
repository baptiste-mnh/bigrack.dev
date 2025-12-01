FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3) and sqlite3 CLI
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json turbo.json ./
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN npm ci

COPY . .

RUN npm run build:mcp

RUN npm run link:mcp

USER node
ENV USER=bigrack

RUN bigrack init -y

RUN bigrack setup-claude

RUN bigrack update -y

RUN bigrack status

RUN echo "✅ BigRack database updated successfully!"