# syntax=docker/dockerfile:1

# Сборка: контракт, SDK, сервер и статический фронтенд.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci

COPY . .
RUN npm run build

# Зависимости рантайма: только production, без тулчейна сборки.
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev && npm cache clean --force

# Запуск: Fastify отдаёт API и собранный SPA на одном порту.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/package.json server/
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"

# `PORT` читает server/src/index.ts; приложение стартует сразу при запуске контейнера.
CMD ["node", "server/dist/index.js"]
