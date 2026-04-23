// lib/utils/api.ts — Zero-boilerplate API helpers
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import type { ApiResponse } from '@/lib/types';

// ─── Response helpers ─────────────────────────────────────────────────────────
export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, status = 400, code?: string): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

// ─── Zod body parsing with proper errors ─────────────────────────────────────
export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (e) {
    if (e instanceof ZodError) {
      const message = e.errors.map(er => `${er.path.join('.')}: ${er.message}`).join(', ');
      return { error: err(message, 422, 'VALIDATION_ERROR') };
    }
    return { error: err('Invalid request body', 400) };
  }
}

// ─── Route handler wrapper with error boundary ────────────────────────────────
type Handler = (req: NextRequest, ctx?: { params: Record<string, string> }) => Promise<NextResponse>;

export function withErrorBoundary(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';

      if (msg === 'UNAUTHORIZED')   return err('Unauthorized', 401, 'UNAUTHORIZED');
      if (msg === 'FORBIDDEN')      return err('Forbidden', 403, 'FORBIDDEN');
      if (msg === 'NOT_FOUND')      return err('Not found', 404, 'NOT_FOUND');

      console.error('[API Error]', req.method, req.nextUrl.pathname, e);
      return err('Internal server error', 500, 'INTERNAL_ERROR');
    }
  };
}

// ─── In-memory rate limiter (swap for Upstash Redis in prod) ─────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= limit) return false; // blocked
  entry.count++;
  return true;
}

// ─── Grade calculator ─────────────────────────────────────────────────────────
export function getGrade(total: number): string {
  if (total >= 75) return 'A1';
  if (total >= 70) return 'B2';
  if (total >= 65) return 'B3';
  if (total >= 60) return 'C4';
  if (total >= 55) return 'C5';
  if (total >= 50) return 'C6';
  if (total >= 45) return 'D7';
  if (total >= 40) return 'E8';
  return 'F9';
}

export function getRemark(grade: string): string {
  const map: Record<string, string> = {
    A1: 'Excellent', B2: 'Very Good', B3: 'Good',
    C4: 'Credit', C5: 'Credit', C6: 'Credit',
    D7: 'Pass', E8: 'Pass', F9: 'Fail',
  };
  return map[grade] ?? 'N/A';
}

// ─── Nigerian Naira formatter ─────────────────────────────────────────────────
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
}

// ─── Generate unique IDs (CUID-lite, no deps) ─────────────────────────────────
export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
