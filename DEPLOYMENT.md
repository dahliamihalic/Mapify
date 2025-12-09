# Vercel Deployment Guide

This project is now configured for deployment to Vercel with serverless API functions.

## What Changed

### 1. Serverless API Function
- Created `/api/lookup.js` - Serverless function that replaces the Express server
- Handles file uploads and GeoIP lookups using Vercel's serverless infrastructure

### 2. Configuration Files
- **vercel.json**: Configures build settings, routing, and function settings
- **.vercelignore**: Excludes unnecessary files from deployment
- **package.json**: Added `vercel-build` script

### 3. Frontend Updates
- **src/contexts/DataContext.jsx**: API URL now dynamically switches between local dev and production
- **vite.config.js**: Base path updated to "/" for Vercel deployment

### 4. CORS Configuration
- Automatically allows Vercel deployment URLs
- Supports both preview and production deployments

## Deployment Steps

### Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Have a Vercel account (free tier works)

### Deploy to Vercel

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy from your project directory**
   ```bash
   vercel
   ```
   - Follow the prompts to link/create a project
   - First deployment will be a preview

3. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Important Notes

- **GeoIP Database**: The `server/data/GeoLite2-City.mmdb` file must be included in your deployment. Make sure it exists and is not in `.gitignore`.

- **File Size Limits**: The serverless function is configured with:
  - Maximum duration: 60 seconds
  - Memory: 3008 MB
  - File upload limit: 100 MB

- **Environment Variables**: If you need environment-specific variables, add them in the Vercel dashboard under Project Settings → Environment Variables

### Local Development

Local development still works as before:
```bash
npm run dev
```
This runs both the Vite dev server and the Express server concurrently.

### Vercel Dashboard Configuration

After deploying, verify these settings in your Vercel project dashboard:

1. **Build & Development Settings**
   - Framework Preset: Vite
   - Build Command: `npm run vercel-build` (or leave default)
   - Output Directory: `dist`

2. **Root Directory**: Leave as `.` (project root)

3. **Node.js Version**: 18.x or later (recommended)

## Testing the Deployment

Once deployed, Vercel will provide a URL (e.g., `https://your-project.vercel.app`).

Test the API endpoint:
- Upload a file through your application
- The frontend will automatically use `/api/lookup` for API calls
- Check Vercel logs if issues occur

## Troubleshooting

- **API not found**: Ensure the `api/` directory is in your project root
- **CORS errors**: Check Vercel deployment URL is allowed in `api/lookup.js`
- **File upload fails**: Verify the GeoLite2-City.mmdb file is deployed
- **Function timeout**: Large files may exceed 60s - adjust in `vercel.json` if needed (max 300s on Pro plan)

## Monitoring

View logs and function performance in Vercel Dashboard:
- Go to your project
- Click "Deployments"
- Select a deployment to view logs
