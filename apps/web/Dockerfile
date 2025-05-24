FROM oven/bun:1.2.14 AS base

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages
RUN bun install

# Build the app
FROM dependencies AS builder
COPY . .
RUN bun run --filter web build

# Production image
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/web/next.config.ts ./
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/src/public ./public
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["bun", "run", "start"]
