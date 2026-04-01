# Railway Deployment Guide

## Backend Environment Variables

Set these in Railway backend service:

```
DATABASE_URL=<your-railway-postgres-url>
JWT_SECRET=sams_v1_secure_prod_secret_92837401293847
JWT_EXPIRATION=1d
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://happy-joy-production.up.railway.app
SUPER_ADMIN_EMAIL=admin@sams.com
SUPER_ADMIN_PASSWORD=<set-a-strong-password>
SUPER_ADMIN_NAME=SAMS GLOBAL ADMIN
```

## Frontend Environment Variables

Set these in Railway frontend service:

```
BACKEND_URL=https://sams-13-production-4f1f.up.railway.app
NEXT_PUBLIC_API_URL=https://sams-13-production-4f1f.up.railway.app
NODE_ENV=production
```

## Deployment Steps

### Backend
1. Push code to GitHub
2. Railway will auto-deploy using `railway.toml` and `nixpacks.toml`
3. Build command: `npm ci && npx prisma generate && npm run build`
4. Start command: `node dist/src/main.js`
5. Run migrations manually if needed: `npx prisma db push`

### Frontend
1. Push code to GitHub
2. Railway will auto-deploy
3. Build command: `npm ci && npm run build`
4. Start command: `npm start`

## Troubleshooting

### 502 Bad Gateway
- Check backend logs in Railway dashboard
- Verify DATABASE_URL is correct
- Verify CORS_ORIGINS includes frontend URL
- Check if backend is listening on PORT from environment

### CORS Errors
- Verify CORS_ORIGINS in backend includes exact frontend URL
- Check browser console for blocked origin

### Database Issues
- Run `npx prisma db push` manually in Railway backend shell
- Check DATABASE_URL format
- Verify Postgres service is running
