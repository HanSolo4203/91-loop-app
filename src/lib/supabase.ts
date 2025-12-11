import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables (only in browser or when actually using the client)
const validateEnvVars = () => {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
};

// Reuse singletons to avoid multiple GoTrue instances in the browser (prevents auth storage conflicts)
const getGlobalStore = () => globalThis as Record<string, unknown>;
const globalStore = getGlobalStore();

const SUPABASE_BROWSER_KEY = '__SUPABASE_BROWSER_CLIENT__';
const SUPABASE_ADMIN_KEY = '__SUPABASE_ADMIN_CLIENT__';

// Create or reuse Supabase client for client-side usage
const existingBrowserClient = globalStore[SUPABASE_BROWSER_KEY] as ReturnType<
  typeof createClient<Database>
> | undefined;

export const supabase =
  existingBrowserClient ||
  createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

if (!existingBrowserClient) {
  globalStore[SUPABASE_BROWSER_KEY] = supabase;
}

// Create or reuse Supabase client for server-side usage (with service role key)
const existingAdminClient = globalStore[SUPABASE_ADMIN_KEY] as ReturnType<
  typeof createClient<Database>
> | undefined;

export const supabaseAdmin =
  existingAdminClient ||
  createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

if (!existingAdminClient) {
  globalStore[SUPABASE_ADMIN_KEY] = supabaseAdmin;
}

// Helper function to validate environment variables before making requests
export const validateSupabaseConfig = () => {
  validateEnvVars();
};

// Export the database type for use in other files
export type { Database } from '@/types/database';
