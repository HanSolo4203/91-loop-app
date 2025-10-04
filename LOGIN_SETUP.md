# Login System Setup Guide

This guide will help you set up the authentication system for the RSL Express Linen Tracking application.

## Overview

The login system includes:
- A receipt-style login page with blue bokeh background and moving elements
- Supabase authentication integration
- Admin role-based access control
- Protected routes with automatic redirects

## Setup Steps

### 1. Apply Database Migration

First, apply the profiles table migration to your Supabase database:

```sql
-- Run this in your Supabase SQL Editor
-- ==============================================
-- CREATE PROFILES TABLE FOR USER AUTHENTICATION
-- ==============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_updated_at();

-- Grant permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;
```

### 2. Create Admin User

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add user" and create a new user with:
   - Email: `admin@rslexpress.com` (or your preferred admin email)
   - Password: Choose a secure password
   - Email Confirmed: Check this box

4. After creating the user, note the User ID

5. Go to the SQL Editor and run this query (replace the UUID with your actual user ID):

```sql
-- Update the user's role to admin
UPDATE profiles 
SET role = 'admin', full_name = 'Admin User'
WHERE id = 'YOUR_USER_ID_HERE';
```

### 3. Test the Login System

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Try to access the dashboard directly at `http://localhost:3000/dashboard` - it should redirect you to the login page

4. Log in with your admin credentials

5. You should be redirected to the dashboard

## Features

### Login Page Design
- **Receipt-style form**: The login form is styled to look like a receipt with proper typography
- **Blue bokeh background**: Animated blue background with moving elements
- **Responsive design**: Works on desktop and mobile devices
- **Loading states**: Shows loading spinner during authentication
- **Error handling**: Displays error messages for failed login attempts

### Authentication Flow
1. User enters credentials on the login page
2. Supabase authenticates the user
3. System checks if user has admin role in profiles table
4. If admin: redirect to dashboard
5. If not admin: show error and sign out

### Protected Routes
- All dashboard routes are protected by the `AuthGuard` component
- Unauthenticated users are redirected to `/login`
- Non-admin users are signed out and redirected to login
- Session is automatically managed by Supabase

### Navigation
- Logout button added to navigation component
- Works on both desktop and mobile
- Properly signs out user and redirects to login

## File Structure

```
src/
├── app/
│   └── login/
│       └── page.tsx              # Login page component
├── components/
│   ├── auth/
│   │   └── auth-guard.tsx        # Route protection component
│   └── navigation.tsx            # Updated with logout functionality
├── types/
│   └── database.ts               # Updated with profiles table types
└── supabase/
    └── migrations/
        └── 005_create_profiles_table.sql  # Database migration
```

## Security Features

- **Row Level Security (RLS)**: Enabled on profiles table
- **Role-based access**: Only admin users can access the dashboard
- **Automatic sign-out**: Non-admin users are automatically signed out
- **Session management**: Supabase handles session persistence and refresh
- **CSRF protection**: Built into Supabase authentication

## Troubleshooting

### Common Issues

1. **"Access denied" error**: Make sure the user's role is set to 'admin' in the profiles table
2. **Redirect loop**: Check that the profiles table exists and RLS policies are correct
3. **Login not working**: Verify Supabase environment variables are set correctly
4. **Database errors**: Ensure the migration was applied successfully

### Environment Variables

Make sure these are set in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps

After setting up the login system:

1. Test the authentication flow thoroughly
2. Create additional admin users if needed
3. Consider adding user management features
4. Implement password reset functionality if required
5. Add audit logging for admin actions

The login system is now ready to use! 🎉
