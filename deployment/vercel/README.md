# Vercel Frontend Deployment Guide

1. Log into [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`thisanthan42/saravana-bhanvan`).
4. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Configure Environment Variable:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://saravana-bhavan-backend.onrender.com`)
6. Click **Deploy**.
