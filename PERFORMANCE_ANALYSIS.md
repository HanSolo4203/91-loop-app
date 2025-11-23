# Next.js Performance Bottleneck Analysis

## Top 5 Performance Bottlenecks

### 1. **Missing API Route Caching & Revalidation** ⚠️ CRITICAL

**Impact:** High - Affects both build time and runtime performance

**Issues Found:**
- All API routes (`/api/*`) are missing Next.js caching configuration
- No `export const revalidate` or `export const dynamic` settings
- No cache headers in API responses
- Every request hits the database directly

**Affected Files:**
- `src/app/api/categories/route.ts` - Fetches categories on every request
- `src/app/api/dashboard/reports/route.ts` - No caching for report data
- `src/app/api/dashboard/stats/route.ts` - Stats recalculated on every request
- `src/app/api/batches/route.ts` - Batch queries not cached
- `src/app/api/clients/route.ts` - Client data fetched fresh each time

**Recommendations:**
```typescript
// Add to API routes:
export const revalidate = 60; // Cache for 60 seconds
// OR
export const dynamic = 'force-static'; // For static data
// OR
export const dynamic = 'force-dynamic'; // Explicitly dynamic

// Add cache headers in responses:
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
  }
});
```

**Expected Improvement:** 50-80% reduction in database queries, faster API response times

---

### 2. **Large Dependencies Not Code-Split** ⚠️ CRITICAL

**Impact:** High - Significantly increases bundle size and initial load time

**Issues Found:**
- `jspdf` (3.0.3) - ~200KB+ - Imported statically in `src/lib/services/pdf-generator.ts`
- `xlsx` (0.18.5) - ~500KB+ - Imported statically in `src/app/api/dashboard/reports/export-excel/route.ts`
- `recharts` (3.2.1) - ~300KB+ - Imported statically in `src/app/dashboard/rfid/page.tsx`
- `@react-email/render` (1.3.1) - Imported but may not be needed in client bundle

**Current Usage:**
```typescript
// ❌ Static import - loads entire library upfront
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { LineChart, BarChart, ... } from 'recharts';
```

**Recommendations:**
```typescript
// ✅ Dynamic import - code-split by route/feature
// For PDF generation (server-side):
const { default: jsPDF } = await import('jspdf');

// For Excel export (API route):
const XLSX = await import('xlsx');

// For charts (client-side):
const Recharts = dynamic(() => import('recharts'), { ssr: false });
```

**Expected Improvement:** 
- Initial bundle size reduction: ~1MB+
- Faster First Contentful Paint (FCP)
- Faster Time to Interactive (TTI)

---

### 3. **Inefficient Data Fetching Patterns** ⚠️ HIGH

**Impact:** High - Causes unnecessary network requests and slower page loads

**Issues Found:**

#### A. Sequential API Calls Instead of Parallel
**File:** `src/app/dashboard/page.tsx`
```typescript
// ❌ Sequential calls (lines 153-156)
const [metricsResponse, batchesFetchResponse] = await Promise.all([
  fetch(`/api/dashboard/stats?month=${formattedMonth}&type=monthly`),
  fetch(`/api/dashboard/batches?limit=20&date_from=${startDate}&date_to=${endDate}`)
]);
// Good: Using Promise.all, but could be optimized further
```

#### B. No Request Deduplication
- Multiple components fetch same data independently
- No shared cache between components
- Same API called multiple times on page load

**Files:**
- `src/components/dashboard/reports-table.tsx` - Fetches reports independently
- `src/components/dashboard/reports-analytics.tsx` - Fetches stats independently
- `src/app/dashboard/page.tsx` - Fetches dashboard data

#### C. Missing Data Fetching Library
- No React Query, SWR, or similar
- No automatic caching, deduplication, or background refetching
- Manual state management for loading/error states

**Recommendations:**
1. **Implement React Query or SWR:**
```typescript
// Install: npm install @tanstack/react-query
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['dashboard-stats', month, year],
  queryFn: () => fetch(`/api/dashboard/stats?month=${month}`).then(r => r.json()),
  staleTime: 60000, // Cache for 60 seconds
});
```

2. **Add request deduplication middleware**
3. **Implement shared data cache between components**

**Expected Improvement:** 
- 30-50% reduction in API calls
- Faster page loads
- Better user experience with cached data

---

### 4. **Missing React Performance Optimizations** ⚠️ MEDIUM

**Impact:** Medium - Causes unnecessary re-renders and slower UI interactions

**Issues Found:**

#### A. Missing React.memo for Expensive Components
- Large components re-render unnecessarily
- No memoization of expensive calculations

**Affected Components:**
- `src/components/batch/linen-count-grid.tsx` - Large component with many items (615 lines)
- `src/components/dashboard/batches-table.tsx` - Renders many rows
- `src/components/dashboard/reports-table.tsx` - Complex table with nested data
- `src/app/dashboard/rfid/page.tsx` - Large dashboard component (1612 lines)

#### B. Limited useMemo/useCallback Usage
- Some components use these (e.g., `linen-count-grid.tsx` uses `useMemo`), but not consistently
- Callbacks recreated on every render causing child re-renders

**Example from `reports-table.tsx`:**
```typescript
// ❌ Function recreated on every render
const fetchData = async (m: number | null, y: number) => {
  // ...
};

// ✅ Should be:
const fetchData = useCallback(async (m: number | null, y: number) => {
  // ...
}, [/* dependencies */]);
```

**Recommendations:**
1. **Wrap expensive components with React.memo:**
```typescript
export default React.memo(function ReportsTable({ month, year, ... }) {
  // ...
});
```

2. **Use useMemo for expensive calculations:**
```typescript
const filteredCategories = useMemo(() => 
  categories.filter(cat => cat.name.includes(searchTerm)),
  [categories, searchTerm]
);
```

3. **Use useCallback for event handlers passed to children:**
```typescript
const handleClick = useCallback((id: string) => {
  // ...
}, [/* dependencies */]);
```

**Expected Improvement:**
- 20-40% reduction in unnecessary re-renders
- Smoother UI interactions
- Better performance on low-end devices

---

### 5. **Unoptimized Image Configuration** ⚠️ MEDIUM

**Impact:** Medium - Affects image loading performance

**Issues Found:**

#### A. Missing Image Optimization Settings
**File:** `next.config.ts`
- Basic remote patterns configured, but missing:
  - Image quality settings
  - Image format optimization (WebP/AVIF)
  - Sizes configuration
  - Loading optimization

#### B. Potential Unoptimized Image Usage
- Need to verify all images use Next.js `Image` component
- No image placeholder configuration
- Missing blur placeholder for better UX

**Current Config:**
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'bwuslachnnapmtenbdgq.supabase.co',
      // Missing: formats, deviceSizes, imageSizes
    },
  ],
}
```

**Recommendations:**
```typescript
// next.config.ts
images: {
  remotePatterns: [/* ... */],
  formats: ['image/avif', 'image/webp'], // Modern formats
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60,
  dangerouslyAllowSVG: true, // If needed for SVGs
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

**Expected Improvement:**
- 30-50% reduction in image file sizes
- Faster image loading
- Better Core Web Vitals (LCP)

---

## Additional Performance Issues

### 6. **Large Component Files**
- `src/app/dashboard/rfid/page.tsx` - 1612 lines (should be split)
- `src/components/batch/linen-count-grid.tsx` - 615 lines

### 7. **Missing Bundle Analysis**
- No bundle analyzer configured
- Can't identify other large dependencies

### 8. **No Static Generation for Public Pages**
- Dashboard could use ISR (Incremental Static Regeneration)
- Reports pages could be pre-rendered

---

## Quick Wins (Priority Order)

1. ✅ **Add API route caching** (30 min) - Biggest impact
2. ✅ **Code-split large dependencies** (1 hour) - Reduces bundle size
3. ✅ **Implement React Query** (2 hours) - Better data fetching
4. ✅ **Add React.memo to expensive components** (1 hour) - Reduce re-renders
5. ✅ **Optimize image configuration** (15 min) - Better image loading

---

## Metrics to Track

After implementing fixes, measure:
- **Build Time:** Should decrease by 20-30%
- **Bundle Size:** Should decrease by ~1MB+
- **First Contentful Paint (FCP):** Should improve by 30-50%
- **Time to Interactive (TTI):** Should improve by 20-40%
- **API Response Times:** Should improve by 50-80% (with caching)
- **Database Query Count:** Should decrease by 50-70%

---

## Tools for Analysis

1. **Bundle Analyzer:**
```bash
npm install --save-dev @next/bundle-analyzer
```

2. **Lighthouse CI:** For performance audits

3. **Next.js Analytics:** Built-in performance monitoring

