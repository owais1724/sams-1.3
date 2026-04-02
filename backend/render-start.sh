#!/usr/bin/env bash
# exit on error
set -o errexit

npx prisma migrate deploy
npm run start:prod
