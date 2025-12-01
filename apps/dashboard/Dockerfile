# Étape 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les fichiers de config du monorepo
COPY package*.json turbo.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Installer toutes les dépendances
RUN npm ci

# Copier le code source
COPY apps/dashboard ./apps/dashboard
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config

# Build le dashboard (Turborepo va aussi build les dépendances)
RUN npm run build:dashboard

# Étape 2: Production
FROM node:22-alpine

WORKDIR /app

# Installer serve pour servir le build statique
RUN npm install -g serve

# Copier uniquement le build
COPY --from=builder /app/apps/dashboard/dist ./dist

EXPOSE 3000

# Servir le build
CMD ["serve", "-s", "dist", "-l", "3000"]
