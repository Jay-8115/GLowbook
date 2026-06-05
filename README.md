# 💼 GlowBook Salon Booking Marketplace

GlowBook is a complete production-ready, SaaS-ready multi-vendor salon booking marketplace. The codebase is organized as a monorepo containing the shared backend, Next.js admin panel, and dual Flutter mobile apps.

---

## 📁 Repository Structure

```text
d:\salon/
├── backend/                  # Next.js Shared Backend API & Socket Server
├── admin_dashboard/          # Next.js Administrator Control Panel
├── customer_app/             # Flutter Customer Mobile App
├── owner_app/                # Flutter Salon Owner Mobile App
├── docker-compose.yml        # Multi-container orchestration
└── nginx.conf                # Load-balancer proxy settings
```

---

## 🚀 Vercel Deployment Guide

Because this repository is a monorepo containing multiple applications, Vercel needs to know which subfolder to build. If you attempt to deploy from the root folder directly without changing settings, you will encounter the error:
`No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies".`

Follow these steps to deploy either the **Admin Dashboard** or the **Backend** on Vercel:

### Step 1: Create a New Vercel Project
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
2. Import your repository `GLowbook`.

### Step 2: Configure the Root Directory (Crucial)
1. On the project configuration screen, look for **Root Directory** (right below the project name).
2. Click **Edit** or **Browse** next to the Root Directory.
3. Select the folder you wish to deploy:
   - For the Admin Panel: Select **`admin_dashboard`**
   - For the Backend Service: Select **`backend`**
4. Click **Continue**. Vercel will now automatically detect the Next.js framework package.json.

### Step 3: Add Environment Variables
Add the respective variables in Vercel's **Environment Variables** section:
* **For `backend`**:
  * `DATABASE_URL` (your production PostgreSQL connection string)
  * `JWT_ACCESS_SECRET`
  * `JWT_REFRESH_SECRET`
* **For `admin_dashboard`**:
  * No database connection required (queries the backend API).

### Step 4: Click Deploy 🚀
Vercel will successfully build and deploy the selected application subfolder.
