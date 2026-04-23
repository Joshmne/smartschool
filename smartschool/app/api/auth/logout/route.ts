// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorBoundary, ok } from '@/lib/utils/api';

export const POST = withErrorBoundary(async (_req: NextRequest) => {
  const response = ok({ message: 'Logged out' });
  const headers  = new Headers(response.headers);
  headers.append(
    'Set-Cookie',
    'ss_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
  return new NextResponse(response.body, { ...response, headers });
});
