'use client';
// lib/hooks/useAuth.ts — Client-side auth guard hook
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import type { Role } from '@/lib/types';

interface UseAuthOptions {
  requiredRole?: Role | Role[];
  redirectTo?:   string;
}

/**
 * Use in any page that requires authentication.
 * Redirects to login if no session; redirects to correct home if wrong role.
 *
 * @example
 * export default function TeacherPage() {
 *   const { user, isReady } = useAuth({ requiredRole: 'teacher' });
 *   if (!isReady) return <LoadingScreen />;
 *   return <div>Hello {user.name}</div>;
 * }
 */
export function useAuth(options: UseAuthOptions = {}) {
  const user     = useAuthStore(s => s.user);
  const router   = useRouter();
  const pathname = usePathname();

  const { requiredRole, redirectTo = '/' } = options;

  useEffect(() => {
    // Not yet hydrated from sessionStorage
    if (user === null && typeof window !== 'undefined') {
      router.replace(redirectTo);
      return;
    }

    if (!user) return;

    // Role enforcement
    if (requiredRole) {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowed.includes(user.role)) {
        // Redirect to correct home
        const home = user.role === 'md' || user.role === 'bursar' ? '/md' : '/teacher';
        router.replace(home);
      }
    }
  }, [user, requiredRole, router, redirectTo]);

  return {
    user,
    isReady:   user !== null,
    isTeacher: user?.role === 'teacher',
    isMD:      user?.role === 'md' || user?.role === 'bursar',
  };
}

/**
 * useRequireAuth — strict version that throws if not authenticated.
 * Use in layouts, not pages (pages should handle redirect gracefully).
 */
export function useRequireAuth() {
  const { user, isReady } = useAuth();
  if (typeof window !== 'undefined' && isReady && !user) {
    throw new Error('Not authenticated');
  }
  return { user: user!, isReady };
}
