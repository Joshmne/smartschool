// app/api/auth/me/route.ts — Session validation endpoint
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { ok, err, withErrorBoundary } from '@/lib/utils/api';

export const GET = withErrorBoundary(async (_req: NextRequest) => {
  const session = await getSession();
  if (!session) return err('Not authenticated', 401, 'UNAUTHORIZED');
  return ok({ user: session.user, expiresAt: session.expiresAt });
});

// Also export runtime so Next.js doesn't try to use Edge for cookie access
export const runtime = 'nodejs';
