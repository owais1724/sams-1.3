FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npx prisma db push --accept-data-loss || true
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

CMD sh -c "npx prisma db push --accept-data-loss && npx prisma db seed && npm run start:prod"
