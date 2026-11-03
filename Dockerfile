FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_OPTIONS=--use-system-ca

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
# Лимит кучи на случай сборки на слабой машине (CI обычно ок и без этого)
ENV NODE_OPTIONS="--use-system-ca --max-old-space-size=1536"
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
# Runtime files read from disk (не только .next) — см. docs/deployment.md § Docker runner
COPY --from=builder /app/mock ./mock
COPY --from=builder /app/src ./src
COPY --from=builder /app/lib/ai/prompts ./lib/ai/prompts

EXPOSE 3000
CMD ["npm", "start"]
