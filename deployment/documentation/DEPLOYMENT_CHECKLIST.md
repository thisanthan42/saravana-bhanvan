# Pre-Flight Deployment Checklist

- [ ] All code committed to Git on branch `main`.
- [ ] Managed PostgreSQL database provisioned (Neon, Supabase, or Render).
- [ ] Database migrations executed (`npm run migrate`).
- [ ] Backend deployed on Render with `NODE_ENV=production`.
- [ ] Frontend deployed on Vercel with `VITE_API_URL` set to Render backend.
- [ ] Backend `CORS_ORIGIN` and `PUBLIC_APP_URL` updated with Vercel frontend URL.
- [ ] Table QR generated from Manager Portal encodes live HTTPS domain.
- [ ] Physical smartphone scanned QR and confirmed end-to-end feedback submission.
