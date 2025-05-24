FROM oven/bun:1.2.14 AS base

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY packages ./packages
RUN bun install

# Build the app
FROM dependencies AS builder
COPY . .
RUN bun run --filter server build

# Production image
FROM base AS runner

# Install tools for healthcheck and database connectivity
RUN apt-get update && apt-get install -y curl postgresql-client && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/apps/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/apps/server/src/db/migrations ./src/db/migrations
COPY --from=builder /app/apps/server/src/db/schema ./src/db/schema

# Make entrypoint script executable
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
