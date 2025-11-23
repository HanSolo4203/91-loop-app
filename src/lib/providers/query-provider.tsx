'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is considered fresh for 60 seconds
            staleTime: 60 * 1000, // 60 seconds
            // Cache time: data stays in cache for 5 minutes
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            // Retry failed requests 1 time
            retry: 1,
            // Refetch on window focus (good for dashboards)
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
          },
          mutations: {
            // Retry failed mutations 1 time
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

