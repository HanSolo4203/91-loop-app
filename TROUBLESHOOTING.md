# Troubleshooting Guide

## Internal Server Error

If you're getting an internal server error, the most likely cause is missing Supabase environment variables.

### Quick Fix

1. **Check if .env.local exists:**
   ```bash
   ls -la | grep env
   ```

2. **If it doesn't exist, create it:**
   ```bash
   node setup-env.js
   ```

3. **Get your Supabase credentials:**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project (or create a new one)
   - Go to **Settings** → **API**
   - Copy the **Project URL** and **API keys**

4. **Update .env.local with your actual values:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
   ```

5. **Restart your development server:**
   ```bash
   npm run dev
   ```

### Test Your Setup

1. **Test database connection:**
   ```bash
   curl http://localhost:3000/api/test-db
   ```

2. **Seed sample data:**
   ```bash
   curl -X POST http://localhost:3000/api/seed-data
   ```

3. **Visit the debug page:**
   - Open [http://localhost:3000/debug](http://localhost:3000/debug)

### Common Issues

#### "Database connection error: TypeError: fetch failed"
- **Cause:** Missing or incorrect Supabase URL
- **Solution:** Check your `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`

#### "Invalid API key" error
- **Cause:** Missing or incorrect API keys
- **Solution:** Verify your API keys in Supabase dashboard

#### API endpoints hanging/timeout
- **Cause:** Network issues or incorrect Supabase URL
- **Solution:** Check your internet connection and Supabase URL

#### "No such table" errors
- **Cause:** Database tables not created
- **Solution:** Run the seed data endpoint or create tables manually

### Creating Supabase Project

If you don't have a Supabase project yet:

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name:** 91-loop-app
   - **Database Password:** Choose a strong password
   - **Region:** Select closest to your location
6. Click "Create new project"
7. Wait for the project to be created
8. Go to **Settings** → **API** to get your credentials

### Database Setup

After connecting to Supabase, you need to create the database tables:

1. **Option 1: Use the seed data endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/seed-data
   ```

2. **Option 2: Create tables manually in Supabase dashboard**
   - Go to **Table Editor**
   - Click "Create a new table"
   - Use the SQL files in `supabase/migrations/` as reference

### Still Having Issues?

1. Check the browser console for errors
2. Check the terminal where `npm run dev` is running for error messages
3. Verify all environment variables are set correctly
4. Make sure your Supabase project is active and not paused
5. Check your internet connection

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- Check the application logs in your terminal
