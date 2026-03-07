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

function createBrowserClient() {
  validateEnvVars();
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase =
  existingBrowserClient ?? createBrowserClient();

if (!existingBrowserClient) {
  globalStore[SUPABASE_BROWSER_KEY] = supabase;
}

// Create or reuse Supabase client for server-side usage (with service role key).
// Lazy so the client is only created when first used (e.g. in API routes), not when
// the module loads in the browser where SUPABASE_SERVICE_ROLE_KEY is not available.
function createAdminClient(): ReturnType<typeof createClient<Database>> {
  const cached = globalStore[SUPABASE_ADMIN_KEY] as ReturnType<typeof createClient<Database>> | undefined;
  if (cached) return cached;
  validateEnvVars();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  const client = createClient<Database>(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  globalStore[SUPABASE_ADMIN_KEY] = client;
  return client;
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop) {
    return (createAdminClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Helper function to validate environment variables before making requests
export const validateSupabaseConfig = () => {
  validateEnvVars();
};

// Export the database type for use in other files
export type { Database } from '@/types/database';
