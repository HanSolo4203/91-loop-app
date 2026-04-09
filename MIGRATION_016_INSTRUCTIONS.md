# Run Expense Migration (016_create_expenses.sql)

The Supabase CLI is not installed. Use one of these methods:

## Option A: Supabase Dashboard (No CLI needed)

1. Open: https://supabase.com/dashboard/project/bwuslachnnapmtenbdgq/sql/new
2. Copy the contents of `supabase/migrations/016_create_expenses.sql`
3. Paste into the SQL editor
4. Click **Run**

## Option B: Install Supabase CLI and push

```bash
# Install via Homebrew (macOS)
brew install supabase/tap/supabase

# Initialize and link (from project root)
supabase init
supabase link --project-ref bwuslachnnapmtenbdgq

# Apply migration
supabase db push
```
