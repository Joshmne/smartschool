'use client';
// app/error.tsx — Global error boundary
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry / console in production
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full text-center flex flex-col items-center gap-5"
      >
        <div className="text-6xl">😕</div>
        <div>
          <h1 className="text-xl font-bold text-ink mb-2">Something went wrong</h1>
          <p className="text-sm text-muted leading-relaxed">
            An unexpected error occurred. Your data is safe — everything was saved locally.
          </p>
          {error.digest && (
            <p className="text-xs text-border mt-2 font-mono">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={reset}
            className="flex-1 h-12 bg-primary text-white font-bold text-sm rounded-xl"
          >
            Try again
          </button>
          <a
            href="https://wa.me/2348000000000?text=SmartSchool error: error"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-12 border-2 border-border text-muted font-bold text-sm rounded-xl flex items-center justify-center"
          >
            WhatsApp support
          </a>
        </div>
      </motion.div>
    </div>
  );
}
