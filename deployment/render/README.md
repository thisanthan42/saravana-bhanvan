# Render Backend Deployment Guide

1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository (`thisanthan42/saravana-bhanvan`).
4. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: Your cloud PostgreSQL connection string (e.g. Neon, Render DB, Supabase)
   - `JWT_SECRET`: Random 64-character secret
   - `CORS_ORIGIN`: Your frontend Vercel domain (e.g. `https://saravana-bhavan-feedback.vercel.app`)
   - `PUBLIC_APP_URL`: Your frontend Vercel domain
