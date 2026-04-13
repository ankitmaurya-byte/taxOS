# Multi-stage build for TaxOS

# ---- API ----
FROM node:20-alpine AS api-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
WORKDIR /app/apps/api
RUN pnpm build

FROM node:20-alpine AS api-runner
WORKDIR /app
COPY apps/api/package.json ./package.json
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod
COPY --from=api-builder /app/apps/api/dist ./dist
COPY apps/api/src/db ./src/db
COPY apps/api/taxos.db* ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]

# ---- WEB ----
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
WORKDIR /app/apps/web
ENV NODE_ENV=production
RUN pnpm build

FROM nginx:alpine AS web-runner
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]