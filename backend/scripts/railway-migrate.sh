#!/bin/bash
# Railway Database Migration Script

echo "🔄 Running database migrations for Railway..."

# Generate Prisma Client
npx prisma generate

# Push schema to database (safer for production)
npx prisma db push

# Or if you prefer migrations (uncomment below):
# npx prisma migrate deploy

echo "✅ Database migrations completed!"
