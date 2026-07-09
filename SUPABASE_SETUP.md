# Supabase Setup Guide for AIStudyHub

This guide will help you set up Supabase for file storage in the AIStudyHub project.

## Prerequisites

- A Supabase account (create one at https://supabase.com)
- Node.js and npm installed
- The AIStudyHub project cloned

## Step 1: Create a Supabase Project

1. Go to [Supabase Console](https://app.supabase.com)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: AIStudyHub (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Select the closest region to you
4. Click "Create new project" and wait for it to complete (this may take a few minutes)

## Step 2: Get Your Credentials

1. Once your project is created, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** → This is your `SUPABASE_URL`
   - **anon public** → This is your `SUPABASE_ANON_KEY`
   - **service_role secret** (optional, for server-side operations) → This is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Create Storage Bucket

1. In the Supabase console, go to **Storage**
2. Click "Create a new bucket"
3. Configure the bucket:
   - **Name**: `documents`
   - **Public bucket**: Keep it **unchecked** (Private is more secure)
4. Click "Create bucket"

## Step 4: Set Up Bucket Policies (Optional but Recommended)

To allow authenticated users to upload files:

1. Click on the `documents` bucket
2. Go to the **Policies** tab
3. Click "New Policy" and select "Create policy from template"
4. Choose "Enable insert for authenticated users"
5. Click "Save policy"

## Step 5: Configure Environment Variables

### Frontend Setup

1. Create a `.env.local` file in the `frontend` directory:

```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_URL=https://aistudyhub-802u.onrender.com
```

2. Replace the placeholders with your actual Supabase credentials

### Backend Setup

1. Open `backend/.env` and update (or add if missing):

```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

2. Replace the placeholders with your actual Supabase credentials

## Step 6: Install Dependencies

### Frontend

```bash
cd frontend
npm install @supabase/supabase-js
```

The `@supabase/supabase-js` package should be added to your `package.json` dependencies.

### Backend

No additional packages needed - the backend uses the Supabase client library for optional server-side operations.

## Step 7: Test the Setup

1. Start the frontend and backend servers:

```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

2. Navigate to `http://localhost:5173`
3. Log in to your account
4. Go to the "Upload" page (click the Upload link in the navbar)
5. Try uploading a test file

## Features

The upload page includes:

✅ **Drag and Drop Support**: Drag files directly into the upload area
✅ **Multiple File Upload**: Upload multiple files at once
✅ **File Type Validation**: Only allows PDF, DOCX, XLSX, TXT, and image files
✅ **File Size Limit**: Max 50MB per file
✅ **Progress Tracking**: See upload status for each file
✅ **Document Metadata**: Add title, subject, and description
✅ **Automatic Database Storage**: Metadata is automatically saved to PostgreSQL
✅ **Responsive Design**: Works on desktop and mobile devices

## File Structure

- **Frontend Upload Component**: `frontend/src/pages/UploadPage.jsx`
- **Supabase Client Config**: `frontend/src/lib/supabase.js`
- **Backend Upload Controller**: `backend/src/controllers/document.controller.js`
- **Backend Upload Routes**: `backend/src/routes/document.routes.js`

## Security Considerations

1. **API Keys**: Keep your `SUPABASE_ANON_KEY` safe - it will be visible in browser requests
2. **Authentication**: Only authenticated users can upload files
3. **File Validation**: Both frontend and backend validate file types and sizes
4. **Bucket Privacy**: Set your storage bucket to private and use policies for controlled access

## Troubleshooting

### "VITE_SUPABASE_URL is not defined"
- Make sure you created `.env.local` in the frontend directory with the correct variable names (must start with `VITE_`)

### "Cannot upload file - 403 Forbidden"
- Check that your storage bucket policies allow authenticated users to upload
- Verify your JWT token is being sent in the Authorization header

### "Document metadata failed to save"
- Ensure your backend server is running on `https://aistudyhub-802u.onrender.com`
- Check that you're authenticated with a valid JWT token
- Verify the PostgreSQL database connection is working

### Uploads succeed but files are private
- Make sure the file URL is being stored correctly in the database
- Consider making the bucket public or using signed URLs for file access

## Next Steps

1. Customize the upload page styling to match your brand
2. Add file preview functionality
3. Implement file deletion from Supabase
4. Add download tracking and statistics
5. Set up automated backup of your Supabase data

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [JavaScript Client Library](https://supabase.com/docs/reference/javascript/introduction)
