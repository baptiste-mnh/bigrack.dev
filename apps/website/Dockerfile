FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json turbo.json ./
COPY apps/website/package.json ./apps/website/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN npm ci

COPY apps/website ./apps/website
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config

RUN npm run build:website

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/website/package.json ./apps/website/

RUN npm ci --omit=dev --ignore-scripts --workspace=@bigrack/website

COPY --from=builder /app/apps/website/.next ./apps/website/.next
COPY --from=builder /app/apps/website/public ./apps/website/public
COPY --from=builder /app/apps/website/next.config.js ./apps/website/
COPY --from=builder /app/packages/shared ./packages/shared

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app/apps/website

EXPOSE 3001

CMD ["npm", "start"]
