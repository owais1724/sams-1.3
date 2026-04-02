# SAMS Deployment Guide for Render

This guide will help you deploy the Security Agency Management System (SAMS) to Render.

## Prerequisites

- GitHub account with your SAMS repository
- Render account (sign up at https://render.com)
- PostgreSQL database (we'll create one on Render)

## Architecture

- **Backend**: NestJS API (Node.js)
- **Frontend**: Next.js (Node.js)
- **Database**: PostgreSQL

---

## Step 1: Create PostgreSQL Database

1. Go to https://dashboard.render.com
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `sams-database`
   - **Database**: `sams_db`
   - **User**: `sams_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click **Create Database**
5. Wait for database to be created
6. Copy the **Internal Database URL** (starts with `postgresql://`)

---

## Step 2: Deploy Backend (NestJS API)

### 2.1 Create Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository
3. Select the `sams-1.3` repository
4. Configure:
   - **Name**: `sams-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```bash
     npx prisma migrate deploy && npm run start:prod
     ```
   - **Plan**: Free (or paid for production)

### 2.2 Add Environment Variables

Click **Environment** tab and add:

```env
DATABASE_URL=<paste-internal-database-url-from-step-1>
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
PORT=3000
```

**Important**: Replace `<paste-internal-database-url-from-step-1>` with the actual database URL.

### 2.3 Deploy

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Once deployed, copy the backend URL (e.g., `https://sams-backend.onrender.com`)

---

## Step 3: Deploy Frontend (Next.js)

### 3.1 Create Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository
3. Select the `sams-1.3` repository
4. Configure:
   - **Name**: `sams-frontend`
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     npm run start
     ```
   - **Plan**: Free (or paid for production)

### 3.2 Add Environment Variables

Click **Environment** tab and add:

```env
NEXT_PUBLIC_API_URL=<paste-backend-url-from-step-2>
BACKEND_URL=<paste-backend-url-from-step-2>
NODE_ENV=production
```

**Example**:
```env
NEXT_PUBLIC_API_URL=https://sams-backend.onrender.com
BACKEND_URL=https://sams-backend.onrender.com
NODE_ENV=production
```

### 3.3 Deploy

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Once deployed, you'll get your frontend URL (e.g., `https://sams-frontend.onrender.com`)

---

## Step 4: Seed Initial Data (Optional)

If you need to seed the database with initial data:

1. Go to your backend service on Render
2. Click **Shell** tab
3. Run:
   ```bash
   npx prisma db seed
   ```

---

## Step 5: Test Your Deployment

1. Visit your frontend URL: `https://sams-frontend.onrender.com`
2. Try logging in with super admin credentials
3. Test creating an agency and users

---

## Important Notes

### Free Tier Limitations

- **Cold Starts**: Free services spin down after 15 minutes of inactivity
- **First Request**: May take 30-60 seconds to wake up
- **Database**: 90-day expiration on free tier

### Production Recommendations

1. **Upgrade to Paid Plans** for:
   - No cold starts
   - Better performance
   - Persistent database
   - Custom domains

2. **Add Custom Domain**:
   - Go to service → Settings → Custom Domain
   - Add your domain (e.g., `app.yourdomain.com`)

3. **Enable Auto-Deploy**:
   - Already enabled by default
   - Pushes to `main` branch auto-deploy

4. **Monitor Logs**:
   - Click **Logs** tab to see real-time logs
   - Check for errors after deployment

---

## Troubleshooting

### Backend Won't Start

**Check logs for**:
- Database connection errors → Verify `DATABASE_URL`
- Migration errors → Run migrations manually in Shell
- Port errors → Ensure `PORT=3000` is set

**Fix**:
```bash
# In backend Shell tab
npx prisma migrate deploy
npx prisma generate
```

### Frontend Can't Connect to Backend

**Check**:
- `NEXT_PUBLIC_API_URL` is set correctly
- Backend URL is accessible (visit `/` endpoint)
- CORS is enabled in backend

### Database Connection Issues

**Check**:
- Database is running (green status)
- `DATABASE_URL` is the **Internal** URL (not External)
- Database and backend are in same region

### Cold Start Issues

**Solutions**:
- Upgrade to paid plan (no cold starts)
- Use a cron job to ping your service every 10 minutes
- Accept 30-60s first load time on free tier

---

## Render vs Railway Comparison

| Feature | Render | Railway |
|---------|--------|---------|
| Free Tier | 750 hours/month | $5 credit/month |
| Cold Starts | Yes (15 min) | Yes (varies) |
| Database | 90 days free | Paid only |
| Build Time | Slower | Faster |
| Logs | Good | Better |
| Pricing | Predictable | Usage-based |

---

## Next Steps

1. ✅ Deploy database
2. ✅ Deploy backend
3. ✅ Deploy frontend
4. ✅ Test application
5. 🔄 Monitor logs
6. 🔄 Add custom domain (optional)
7. 🔄 Upgrade to paid plan (recommended for production)

---

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- SAMS Issues: https://github.com/owais1724/sams-1.3/issues

---

**Deployment Complete! 🚀**

Your SAMS application is now live on Render.
