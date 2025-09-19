# Supabase Setup Guide

This guide will help you set up Supabase integration for your Next.js project.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Your Next.js project with Supabase client installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Your project name (e.g., "91-loop-app")
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
5. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-ref.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in your project root
2. Add the following variables with your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important Notes:**
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose in client-side code
- `SUPABASE_SERVICE_ROLE_KEY` should be kept secret and only used in server-side code
- Never commit your `.env.local` file to version control

## Step 4: Test Your Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit the test page: `http://localhost:3000/test-supabase`

3. Click "Test Connection" to verify your setup

4. You can also test the API endpoint: `http://localhost:3000/api/test-supabase`

## Step 5: Create Your Database Tables

Once your connection is working, you can create tables in your Supabase project:

1. Go to **Table Editor** in your Supabase dashboard
2. Click "Create a new table"
3. Use the types defined in `src/types/database.ts` as a reference

### Example Tables

Here are some example tables you might want to create:

#### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Companies Table
```sql
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  industry TEXT,
  size TEXT CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Projects Table
```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL,
  company_id UUID NOT NULL REFERENCES companies(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Step 6: Generate TypeScript Types (Optional)

Once you've created your tables, you can generate TypeScript types:

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Generate types:
   ```bash
   supabase gen types typescript --project-id your-project-ref > src/types/database.ts
   ```

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
   - Make sure there are no extra spaces or characters

2. **"Invalid URL" error**
   - Verify your `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Make sure it includes `https://` and ends with `.supabase.co`

3. **Environment variables not loading**
   - Restart your development server after adding `.env.local`
   - Make sure the file is in the project root (same level as `package.json`)

4. **CORS errors**
   - Supabase handles CORS automatically, but if you encounter issues, check your project settings

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [Next.js Documentation](https://nextjs.org/docs)

## Next Steps

Once your Supabase connection is working:

1. Create your database tables
2. Set up Row Level Security (RLS) policies
3. Implement authentication
4. Build your application features
5. Deploy to production

Remember to update your environment variables in your production environment!
