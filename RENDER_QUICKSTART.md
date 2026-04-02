# 🚀 Quick Start: Deploy SAMS to Render in 5 Minutes

## Option 1: One-Click Deploy (Recommended)

1. **Fork this repository** to your GitHub account

2. **Click the Deploy Button**:
   
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

3. **Connect GitHub**: Authorize Render to access your repository

4. **Configure**:
   - Select your forked repository
   - Render will auto-detect `render.yaml`
   - Click **Apply**

5. **Wait**: Deployment takes 10-15 minutes
   - Database creates first
   - Backend deploys and runs migrations
   - Frontend deploys last

6. **Done!** Visit your frontend URL to access SAMS

---

## Option 2: Manual Deploy (Step-by-Step)

### Step 1: Create Database (2 minutes)

```
Dashboard → New + → PostgreSQL
Name: sams-database
Plan: Free
Click: Create Database
Copy: Internal Database URL
```

### Step 2: Deploy Backend (5 minutes)

```
Dashboard → New + → Web Service
Repository: sams-1.3
Root Directory: backend
Build Command: npm install && npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm run start:prod

Environment Variables:
DATABASE_URL=<paste-database-url>
JWT_SECRET=<generate-random-string>
NODE_ENV=production
PORT=3000

Click: Create Web Service
Copy: Backend URL
```

### Step 3: Deploy Frontend (5 minutes)

```
Dashboard → New + → Web Service
Repository: sams-1.3
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npm run start

Environment Variables:
NEXT_PUBLIC_API_URL=<paste-backend-url>
BACKEND_URL=<paste-backend-url>
NODE_ENV=production

Click: Create Web Service
```

### Step 4: Test (1 minute)

Visit your frontend URL and login!

---

## Default Credentials

After deployment, create a super admin using the backend shell:

```bash
# In backend service → Shell tab
npx prisma db seed
```

Or manually create via database:

**Super Admin**:
- Email: `admin@sams.global`
- Password: `admin123`

**Agency Admin** (test agency):
- Email: `admin@test.com`
- Password: `admin123`

---

## Troubleshooting

### ❌ Backend won't start
```bash
# Check logs for database connection
# Verify DATABASE_URL is set correctly
```

### ❌ Frontend can't connect
```bash
# Verify NEXT_PUBLIC_API_URL matches backend URL
# Check backend is running (visit backend-url/)
```

### ❌ Database errors
```bash
# Run migrations manually:
# Backend Shell → npx prisma migrate deploy
```

---

## Free Tier Notes

⚠️ **Cold Starts**: Services sleep after 15 minutes of inactivity
- First request takes 30-60 seconds to wake up
- Subsequent requests are fast

💡 **Tip**: Upgrade to paid plan ($7/month) to eliminate cold starts

---

## Need Help?

- 📖 Full Guide: See `RENDER_DEPLOYMENT.md`
- 🐛 Issues: https://github.com/owais1724/sams-1.3/issues
- 💬 Render Support: https://community.render.com

---

**Happy Deploying! 🎉**
