# Render Deployment Troubleshooting Guide

## How to Fix Failed Deployments

### Step 1: Delete Failed Services

1. Go to each failed service (sams-backend, sams-frontend)
2. Click **Settings** → **Danger Zone** → **Delete Service**
3. Confirm deletion

### Step 2: Create PostgreSQL Database First

1. Dashboard → **New +** → **PostgreSQL**
2. Configure:
   - Name: `sams-database`
   - Database: `sams_db`
   - User: `sams_user`
   - Region: **Ohio** (same as services)
   - Plan: **Free**
3. Click **Create Database**
4. Wait for it to be ready (green status)
5. **Copy the Internal Database URL** (you'll need this)

### Step 3: Deploy Backend

1. Dashboard → **New +** → **Web Service**
2. Connect GitHub → Select `sams-1.3` repository
3. Configure:
   - **Name**: `sams-backend`
   - **Region**: **Ohio**
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Node**
   - **Build Command**: 
     ```bash
     bash render-build.sh
     ```
   - **Start Command**: 
     ```bash
     bash render-start.sh
     ```
   - **Plan**: **Free**

4. **Environment Variables** (click Advanced):
   ```
   DATABASE_URL=<paste-internal-database-url-here>
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   NODE_ENV=production
   PORT=10000
   ```

5. Click **Create Web Service**
6. Wait 10-15 minutes for build
7. **Copy the backend URL** (e.g., `https://sams-backend.onrender.com`)

### Step 4: Deploy Frontend

1. Dashboard → **New +** → **Web Service**
2. Connect GitHub → Select `sams-1.3` repository
3. Configure:
   - **Name**: `sams-frontend`
   - **Region**: **Ohio**
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: **Node**
   - **Build Command**: 
     ```bash
     bash render-build.sh
     ```
   - **Start Command**: 
     ```bash
     npm run start
     ```
   - **Plan**: **Free**

4. **Environment Variables** (click Advanced):
   ```
   NEXT_PUBLIC_API_URL=<paste-backend-url-here>
   BACKEND_URL=<paste-backend-url-here>
   NODE_ENV=production
   ```

5. Click **Create Web Service**
6. Wait 10-15 minutes for build

---

## Common Errors and Fixes

### Backend Build Errors

#### Error: "Cannot find module '@nestjs/core'"
**Fix**: Build command is wrong
```bash
# Use this build command:
bash render-build.sh
```

#### Error: "Prisma schema not found"
**Fix**: Root directory is wrong
- Set **Root Directory** to `backend` (not empty)

#### Error: "DATABASE_URL is not set"
**Fix**: Add environment variable
- Go to service → Environment → Add `DATABASE_URL`
- Use **Internal** database URL (not External)

#### Error: "Migration failed"
**Fix**: Database not ready
- Wait for database to show green status
- Redeploy backend service

### Frontend Build Errors

#### Error: "NEXT_PUBLIC_API_URL is not defined"
**Fix**: Add environment variable
- Go to service → Environment → Add `NEXT_PUBLIC_API_URL`
- Use backend URL (e.g., `https://sams-backend.onrender.com`)

#### Error: "Build failed: out of memory"
**Fix**: Upgrade to paid plan or reduce build size
- Free tier has 512MB RAM limit
- Paid Starter plan has 2GB RAM

#### Error: "Module not found"
**Fix**: Build command is wrong
```bash
# Use this build command:
bash render-build.sh
```

---

## Verification Steps

### Check Backend is Running

1. Visit: `https://your-backend-url.onrender.com/`
2. Should see: `{"message":"Welcome to SAMS API"}`
3. If not, check logs for errors

### Check Frontend is Running

1. Visit: `https://your-frontend-url.onrender.com/`
2. Should see: Login page
3. If not, check logs for errors

### Check Database Connection

1. Go to backend service → **Shell** tab
2. Run:
   ```bash
   npx prisma db pull
   ```
3. Should see: "Introspected X models"
4. If error, check `DATABASE_URL`

---

## Manual Deployment Commands

If automatic deployment fails, use these commands in the Shell:

### Backend Shell Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Run migrations
npx prisma migrate deploy

# Start server
npm run start:prod
```

### Frontend Shell Commands

```bash
# Install dependencies
npm install

# Build application
npm run build

# Start server
npm run start
```

---

## Important Notes

### Build Times
- Backend: 10-15 minutes (first time)
- Frontend: 10-15 minutes (first time)
- Subsequent builds: 5-10 minutes

### Free Tier Limits
- **Cold Starts**: Services sleep after 15 minutes
- **Build Minutes**: 500 minutes/month
- **Bandwidth**: 100GB/month
- **Database**: 90 days, then expires

### Port Configuration
- Render uses `PORT` environment variable
- Backend must listen on `process.env.PORT || 10000`
- Don't hardcode port 3000

### Database URL Format
```
postgresql://user:password@host:port/database
```

Use **Internal** URL for backend (faster, free)
Use **External** URL only for local development

---

## Still Having Issues?

### Check Logs

1. Go to service → **Logs** tab
2. Look for red error messages
3. Common issues:
   - Missing environment variables
   - Wrong root directory
   - Build command errors
   - Database connection errors

### Get Help

1. Copy error message from logs
2. Search Render docs: https://render.com/docs
3. Ask in Render community: https://community.render.com
4. Create GitHub issue with logs

---

## Success Checklist

- [ ] Database created and running (green status)
- [ ] Backend deployed successfully
- [ ] Backend URL accessible (shows welcome message)
- [ ] Frontend deployed successfully
- [ ] Frontend URL accessible (shows login page)
- [ ] Frontend can connect to backend (no CORS errors)
- [ ] Can login and use application

---

**Once all services are green, your SAMS application is live! 🎉**
