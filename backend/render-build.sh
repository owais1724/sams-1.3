#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Generate Prisma Client
npx prisma generate

# Try to apply migrations, if it fails, push schema directly
echo "Attempting to apply migrations..."
npx prisma migrate deploy || {
  echo "Migration failed, attempting db push..."
  npx prisma db push --accept-data-loss --skip-generate
}

# Seed the database with initial data
echo "Seeding database..."
npm run script:seed || echo "Seed failed or already seeded, continuing..."

npm run build
