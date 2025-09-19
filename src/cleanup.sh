#!/bin/bash
# cleanup.sh - Project cleanup script

echo "🧹 Starting project cleanup..."

# Remove empty directories
echo "📁 Removing empty directories..."
rm -rf src/app/admin/
rm -rf src/app/api/apply-migration/
rm -rf src/app/api/clear-batches/
rm -rf src/app/api/create-test-batch/
rm -rf src/app/debug-dashboard/
rm -rf src/app/test-data/
rm -rf src/components/forms/
rm -rf src/components/layout/
rm -rf src/components/ui/alert/
rm -rf src/components/ui/badge/
rm -rf src/components/ui/dropdown/
rm -rf src/components/ui/footer/
rm -rf src/components/ui/form/
rm -rf src/components/ui/header/
rm -rf src/components/ui/modal/
rm -rf src/components/ui/navigation/
rm -rf src/components/ui/table/

# Remove duplicate components
echo "🔄 Removing duplicate components..."
rm src/components/ui/button/Button.tsx
rm src/components/ui/card/Card.tsx
rm src/components/ui/input/Input.tsx

# Remove unused pages
echo "📄 Removing unused pages..."
rm src/app/about/page.tsx
rm src/app/contact/page.tsx
rm src/app/services/page.tsx

# Remove unused components
echo "�� Removing unused components..."
rm src/components/ui/calendar.tsx
rm src/components/ui/form.tsx

# Remove unused hooks
echo "�� Removing unused hooks..."
rm src/hooks/use-error-handler.ts
rm src/hooks/use-loading-state.ts
rm src/lib/hooks/useDebounce.ts
rm src/lib/hooks/useLocalStorage.ts
rm src/lib/hooks/index.ts

# Remove debug/test API routes
echo "🧪 Removing debug/test API routes..."
rm -rf src/app/api/test-analytics/
rm -rf src/app/api/test-batches/
rm -rf src/app/api/test-pricing/
rm -rf src/app/api/test-supabase/
rm -rf src/app/test-supabase/
rm src/app/debug/page.tsx
rm src/app/migration-helper/page.tsx

echo "✅ Cleanup completed!"
echo "📦 Don't forget to run: npm uninstall @hookform/resolvers date-fns react-hook-form react-day-picker"