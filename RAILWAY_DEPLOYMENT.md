# 🚂 Railway Deployment Guide

This project is configured as a monorepo containing both the Frontend (Next.js) and Backend (NestJS). To deploy on Railway, you will create **two separate services** pointing to the same GitHub repository.

## 1. Prerequisites
- A [Railway.app](https://railway.app/) account.
- This project pushed to your GitHub repository.

---

## 2. Deploying the Backend (NestJS)

1.  **New Service**: Click **"New Project"** -> **"Deploy from GitHub repo"**.
2.  **Select Repo**: Choose your `security-agency-management-system` repository.
3.  **Configure Service**: Click on the new service card to open "Settings".
4.  **Root Directory**: Scroll down to "Root Directory" and set it to `/backend`.
5.  **Build Command**: Railway should auto-detect `npm run build`. If not, set it manually.
6.  **Start Command**: Set "Start Command" to:
    ```bash
    npm run start:prod
    ```
7.  **Environment Variables**: Go to the "Variables" tab and add:
    -   `DATABASE_URL`: `postgresql://...` (Copy from your local .env or create a new Postgres service in Railway and link it).
    -   `JWT_SECRET`: (Generate a strong random string).
    -   `JWT_EXPIRATION`: `1d`
    -   `PORT`: `${PORT}` (Railway assigns this automatically, but good to double-check code listens on it).
    -   `CORS_ORIGINS`: `https://your-frontend-url.up.railway.app` (You will update this *after* deploying the frontend).
    -   `NODE_ENV`: `production`

---

## 3. Deploying the Frontend (Next.js)

1.  **New Service**: In the same Railway project, click **"New"** -> **"GitHub Repo"** again.
2.  **Select Repo**: Choose the same repository.
3.  **Configure Service**: Click on the new frontend service card.
4.  **Root Directory**: Set "Root Directory" to `/frontend`.
5.  **Build Command**: Railway should auto-detect `npm run build`.
6.  **Start Command**: `npm start`
7.  **Environment Variables**:
    -   `NEXT_PUBLIC_API_URL`: `https://your-backend-url.up.railway.app` (Copy the domain from your Backend service).
    -   `NODE_ENV`: `production`

---

## 4. Final Wiring

1.  **Update CORS**: Once the Frontend is deployed and has a domain (e.g., `web-production.up.railway.app`), go back to your **Backend Service** variables.
2.  **Edit `CORS_ORIGINS`**: Set it to the full frontend URL (no trailing slash).
3.  **Redeploy Backend**: This ensures the backend will accept requests from your new frontend.

## 5. Database (Postgres)
You can use your existing **Neon** database URL, or create a new Postgres database within Railway:
1.  Click **New** -> **Database** -> **Add PostgreSQL**.
2.  In your Backend Service variables, use `${Postgres.DATABASE_URL}` as the value for `DATABASE_URL`.
3.  **Migrations**: To apply migrations, you can run this command locally pointing to the prod DB, or add a deploy command in Railway:
    ```bash
    npx prisma migrate deploy
    ```
