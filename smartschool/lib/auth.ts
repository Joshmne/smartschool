// lib/auth.ts — JWT auth with jose (Edge-compatible)
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User, AuthSession } from './types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production-min-32-chars!!'
);

const COOKIE_NAME = 'ss_session';
const EXPIRES_IN  = 60 * 60 * 24 * 7; // 7 days

export async function signToken(user: User): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as { user: User }).user;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user) return null;
  return { user, token, expiresAt: Date.now() + EXPIRES_IN * 1000 };
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export function setSessionCookie(token: string, res: Response): Response {
  const headers = new Headers(res.headers);
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${EXPIRES_IN}`
  );
  return new Response(res.body, { ...res, headers });
}

export function clearSessionCookie(): { [key: string]: string } {
  return {
    'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
  };
}
