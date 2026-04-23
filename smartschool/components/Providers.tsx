'use client';
// components/Providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';
import { useUIStore } from '@/lib/store';
import { useState } from 'react';

// Create QueryClient once outside component to avoid recreation on renders
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:          60_000,
        gcTime:             5 * 60_000,
        retry:              2,
        retryDelay:         attemptIndex => Math.min(1000 * 2 ** attemptIndex, 8000),
        refetchOnWindowFocus: false,
        networkMode:        'offlineFirst', // serve from cache when offline
      },
      mutations: {
        retry:       1,
        networkMode: 'offlineFirst',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// Inner component so useOfflineSync can access QueryClientProvider
function SyncEngine() {
  useOfflineSync();
  return null;
}

function OfflineBanner() {
  const isOffline       = useUIStore(s => s.isOffline);
  const pendingSyncCount = useUIStore(s => s.pendingSyncCount);

  if (!isOffline && pendingSyncCount === 0) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 text-white text-xs font-bold text-center py-2 transition-all duration-300 ${
      isOffline ? 'bg-amber-500' : 'bg-success'
    }`}>
      {isOffline
        ? `⚡ Offline – ${pendingSyncCount > 0 ? `${pendingSyncCount} changes queued` : 'saving locally'}`
        : `🔄 Syncing ${pendingSyncCount} change${pendingSyncCount !== 1 ? 's' : ''}…`}
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SyncEngine />
      <OfflineBanner />
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style:   { fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 600, borderRadius: 12, padding: '10px 16px' },
          success: { iconTheme: { primary: '#00A651', secondary: '#fff' }, duration: 3000 },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' }, duration: 4000 },
        }}
      />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
