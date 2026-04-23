// app/not-found.tsx — 404 page
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
        <div className="text-6xl">🔍</div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink mb-2">Page not found</h1>
          <p className="text-sm text-muted">
            This page doesn't exist or has moved.
          </p>
        </div>
        <Link
          href="/"
          className="h-12 bg-primary text-white font-bold text-sm rounded-xl px-8 flex items-center justify-center"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
