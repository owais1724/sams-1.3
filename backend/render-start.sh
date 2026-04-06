#!/usr/bin/env bash
# exit on error
set -o errexit

# Apply pending Prisma migrations on each boot so Render redeploys
# can fix schema drift without needing an interactive shell.
npx prisma migrate deploy

# Start the application
npm run start:prod
