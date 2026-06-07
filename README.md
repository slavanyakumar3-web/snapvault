# SnapVault

A full-stack image upload web application built with React, Node.js (Express), and Supabase.

## Features

- User Authentication (Login / Register) with Supabase Auth
- Drag & Drop Image Upload to Supabase Storage
- Real-time Upload Progress Bar
- Image Gallery showing all uploaded images
- Copy-to-clipboard public image links
- Responsive, Mobile-First Dark Theme UI

## Supabase Setup Instructions

To get this app running, you need to configure your own Supabase project:

1. **Create a Supabase Project:**
   - Go to [Supabase](https://supabase.com/) and create an account if you don't have one.
   - Click "New Project", choose an organization, give it a name, and set a fast database password.
   - Wait for the project to provision.

2. **Enable Email Auth:**
   - Go to **Authentication** > **Providers** > **Email**.
   - Make sure "Enable Email provider" is turned on. You can disable "Confirm email" for easier testing.

3. **Create a Storage Bucket:**
   - Go to **Storage** in the left sidebar.
   - Click **New Bucket**.
   - Name the bucket exactly: `images`
   - **Crucial:** Check the **"Public bucket"** toggle so images can be viewed publicly.
   - Save the bucket.

4. **Set Storage Policies (Permissions):**
   - Click on your new `images` bucket and go to **Policies**.
   - Under "Policies under images", click "New policy".
   - Select "For full customization".
   - Allowed Operations: SELECT, INSERT, UPDATE, DELETE.
   - Target Roles: `public` or `authenticated` (if you want only logged-in users to upload).
   - Policy definition: `true` (for easiest setup, though in production you'd want restrictive rules).
   - Save the policy.

5. **Configure Workspace Secrets:**
   - Go to **Project Settings** (gear icon) > **API**.
   - In AI Studio, open the **Secrets** panel.
   - Create the following three secrets with your values from Supabase:
     - `VITE_SUPABASE_URL` = Your Project URL (e.g. `https://xyz.supabase.co`)
     - `VITE_SUPABASE_ANON_KEY` = Your Project API anon key
     - `SUPABASE_SERVICE_ROLE_KEY` = Your Project API service_role secret key (needed for backend uploads)
   - *Note: In your local environment, you would place these in a `.env` file based on `.env.example`.*

## Tech Stack Note
Per platform restrictions, the original request for raw Python (FastAPI) and raw HTML/JS was adapted to use **Node.js (Express)**, **React (Vite/TypeScript)**, and **Tailwind CSS**. It achieves the exact requested functionality, UI, and Supabase integration, but uses the supported cloud-native full-stack container environment.
