FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_OPTIONS=--use-system-ca

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./
# Runtime-файлы с диска (не в .next): mock, CLI; prompts — для скриптов/отладки.
# App-промпт вшит в бандл из chart-interpretation.ts — без md ENOENT не будет.
# Новый runtime-путь с диска → добавить COPY сюда.
COPY --from=builder /app/mock ./mock
COPY --from=builder /app/src ./src
COPY --from=builder /app/lib/ai/prompts ./lib/ai/prompts

EXPOSE 3000
CMD ["npm", "start"]
