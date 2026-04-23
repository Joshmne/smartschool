// lib/hooks/useOfflineSync.ts — Background sync engine
'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/lib/store';
import { getDirtyScores, markScoreClean, getDirtyPulses } from '@/lib/db/offline';
import toast from 'react-hot-toast';

const SYNC_INTERVAL_MS = 8_000;
const MAX_RETRIES      = 5;

export function useOfflineSync() {
  const setOffline    = useUIStore(s => s.setOffline);
  const setPending    = useUIStore(s => s.setPendingSync);
  const isOfflineRef  = useRef(false);
  const syncingRef    = useRef(false);

  // ── Network detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => { isOfflineRef.current = false; setOffline(false); toast.success('Back online – syncing…', { icon: '🌐' }); };
    const onOffline = () => { isOfflineRef.current = true;  setOffline(true);  toast('Offline – saving locally', { icon: '💾' }); };

    setOffline(!navigator.onLine);
    isOfflineRef.current = !navigator.onLine;

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOffline]);

  // ── Sync engine ────────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (isOfflineRef.current || syncingRef.current) return;
    syncingRef.current = true;

    try {
      const [dirtyScores, dirtyPulses] = await Promise.all([getDirtyScores(), getDirtyPulses()]);
      const totalDirty = dirtyScores.length + dirtyPulses.length;
      setPending(totalDirty);
      if (totalDirty === 0) { syncingRef.current = false; return; }

      // Batch sync scores
      if (dirtyScores.length > 0) {
        const res = await fetch('/api/scores/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scores: dirtyScores }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          await Promise.all(dirtyScores.map(s => markScoreClean(s.id)));
        }
      }

      // Batch sync pulses
      if (dirtyPulses.length > 0) {
        const res = await fetch('/api/pulse/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pulses: dirtyPulses }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          setPending(0);
        }
      }
    } catch {
      // Silently fail — will retry on next interval
    } finally {
      syncingRef.current = false;
    }
  }, [setPending]);

  useEffect(() => {
    const interval = setInterval(syncNow, SYNC_INTERVAL_MS);
    syncNow(); // immediate first attempt
    return () => clearInterval(interval);
  }, [syncNow]);

  return { syncNow };
}
