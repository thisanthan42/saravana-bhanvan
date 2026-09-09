# 🚀 Enterprise CI/CD Pipeline Setup & Operations Guide
## Saravana Bhavan Hotel Customer Feedback SaaS Platform

This document describes the automated Continuous Integration and Continuous Deployment (CI/CD) architecture powered by **GitHub Actions** for the Saravana Bhavan Hotel platform.

---

## 🏗️ 1. Pipeline Architecture

The pipeline is defined in [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) and executes automatically on:
- Every `push` to the `main` branch.
- Every `pull_request` targeting `main`.
- Manual on-demand triggers via **GitHub Actions `workflow_dispatch`**.

### Pipeline Flow Diagram

```mermaid
flowchart TD
    subgraph Trigger["1. Triggers"]
        PR["Pull Request to main"]
        PUSH["Push to main"]
        MANUAL["Manual Trigger (workflow_dispatch)"]
    end

    subgraph CI["2. Continuous Integration Quality Gates"]
        direction TB
        subgraph BackendCI["Backend CI (Node 20 + PostgreSQL 16)"]
            PG["PostgreSQL 16 Service Container"] --> MIG["Database Migrations (schema.sql)"]
            MIG --> BTEST["Integration Test Suite (31 checks)"]
            BTEST --> SEC["Security & Audit Scan"]
        end
        subgraph FrontendCI["Frontend CI (Node 20 + Vite 6)"]
            FDEP["Install Dependencies"] --> VITE["Production Vite Build"]
            VITE --> VALID["Dist Bundle Integrity Check"]
            VALID --> ARTIFACT["Upload Frontend Artifact"]
        end
    end

    subgraph Gate["3. Branch Gate"]
        CHECK{"All CI Tests Passed & On main?"}
    end

    subgraph CD["4. Continuous Deployment"]
        direction TB
        DEPRENDER["Render Backend Deployment (Deploy Hook)"]
        DEPVERCEL["Vercel Frontend Deployment (Edge CDN)"]
    end

    Trigger --> CI
    BackendCI --> CHECK
    FrontendCI --> CHECK
    CHECK -->|Yes (Push to main)| CD
    CHECK -->|PR Only| ENDPR["PR Status Checked & Green ✅"]
```

---

## 🔐 2. Configuring GitHub Secrets for Continuous Deployment

The CI pipeline runs all tests and builds without requiring any external secrets. However, to enable automatic deployments to **Render** and **Vercel** when merging to `main`, configure the following repository secrets:

### How to Add Secrets to Your GitHub Repository
1. Open your repository on GitHub: [`https://github.com/thisanthan42/saravana-bhanvan`](https://github.com/thisanthan42/saravana-bhanvan).
2. Click **Settings** (top navigation tab).
3. In the left sidebar, click **Secrets and variables** ➔ **Actions**.
4. Click **New repository secret**.

---

### Secret 1: Render Backend Deployment Hook (`RENDER_DEPLOY_HOOK_URL`)

Render provides an instant webhook URL that triggers a new zero-downtime container build and release.

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Select your `saravana-bhavan-backend` Web Service.
3. Click **Settings** in the left menu.
4. Scroll down to the **Deploy Hook** section.
5. Click **Create Deploy Hook** (or copy existing).
6. In GitHub Secrets, add:
   - **Name**: `RENDER_DEPLOY_HOOK_URL`
   - **Secret**: `https://api.render.com/deploy/srv-xxxx?key=yyyy`

---

### Secrets 2–4: Vercel Frontend Deployment

Vercel credentials allow GitHub Actions to build and deploy the React frontend directly to Vercel's global Edge CDN.

#### Step A: Generate Personal Access Token
1. Go to [Vercel Account Tokens](https://vercel.com/account/tokens).
2. Click **Create Token**, name it `saravana-github-actions`, and set the scope.
3. In GitHub Secrets, add:
   - **Name**: `VERCEL_TOKEN`
   - **Secret**: *(Paste generated token)*

#### Step B: Get Org ID and Project ID
Option 1: Link your project locally:
```bash
cd frontend
npx vercel link
```
Inspect `.vercel/project.json` to find `orgId` and `projectId`.

Option 2: From Vercel Dashboard:
- **Org ID**: Located in your Team Settings URL or Settings ➔ General.
- **Project ID**: Located in your Frontend Project ➔ Settings ➔ General ➔ **Project ID**.

In GitHub Secrets, add:
- **Name**: `VERCEL_ORG_ID`
- **Name**: `VERCEL_PROJECT_ID`

> [!NOTE]
> If any of these secrets are omitted, the CD jobs will automatically log a helpful step-by-step reminder in the **GitHub Actions Step Summary** without breaking the CI test status.

---

## 🛡️ 3. Recommended Branch Protection Rules

To ensure no broken code can ever be pushed to production, configure Branch Protection:

1. In GitHub, go to **Settings** ➔ **Branches**.
2. Click **Add branch protection rule**.
3. Set **Branch name pattern** to `main`.
4. Check **Require a pull request before merging**.
5. Check **Require status checks to pass before merging**:
   - Select `Backend CI (Node 20 + PostgreSQL 16)`.
   - Select `Frontend CI (Vite 6 + React 18)`.
6. Click **Save changes**.

---

## 🧪 4. Simulating CI Locally

Before pushing code or opening a pull request, you can run the exact verification commands locally from the repository root:

```bash
# Run backend integration tests
npm run ci:backend

# Run frontend production build
npm run ci:frontend
```

Both commands should complete with exit code `0`.

---

## 📊 5. Monitoring Workflow Runs

1. Navigate to the **Actions** tab on your GitHub repository.
2. Select **Saravana Bhavan Enterprise CI/CD Pipeline**.
3. Click any run to inspect real-time logs for:
   - PostgreSQL container initialization.
   - Schema migrations.
   - 31 backend integration and security checks.
   - Vite bundle size and asset manifest.
   - Deployment logs and status summaries.
