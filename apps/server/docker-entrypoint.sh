#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for PostgreSQL to be ready
for i in $(seq 1 30); do
  echo "Checking database connection attempt $i..."
  if pg_isready -h postgres -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
    echo "Database is ready!"
    break
  fi
  [ "$i" = "30" ] && echo "Database connection timeout" && exit 1
  sleep 2
done

# Ensure migrations directory exists
mkdir -p ./src/db/migrations/meta

# Check if _journal.json exists, create if not
if [ ! -f ./src/db/migrations/meta/_journal.json ]; then
  echo "Creating initial migrations journal..."
  echo '{"version":"5","dialect":"postgresql","entries":[]}' > ./src/db/migrations/meta/_journal.json
fi

# Generate schema
echo "Generating database schema..."
bun run db:generate || echo "Schema generation skipped"

# Run migrations
echo "Running database migrations..."
bun run db:push || echo "Migration push failed, continuing anyway"

# Start the server
echo "Starting server..."
exec "$@"
