'use client';
// components/layouts/BottomNav.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Activity, MessageCircle, BarChart2 } from 'lucide-react';
import { useUIStore } from '@/lib/store';

interface NavItem { label: string; icon: React.ElementType; href: string; }

const TEACHER_NAV: NavItem[] = [
  { label: 'Home',     icon: Home,          href: '/teacher' },
  { label: 'Scores',   icon: BookOpen,      href: '/teacher/scores' },
  { label: 'Pulse',    icon: Activity,      href: '/teacher/pulse' },
  { label: 'Analytics',icon: BarChart2,     href: '/teacher/analytics' },
  { label: 'Messages', icon: MessageCircle, href: '/teacher/messages' },
];

const MD_NAV: NavItem[] = [
  { label: 'Dashboard', icon: Home,          href: '/md' },
  { label: 'Spend',     icon: BookOpen,      href: '/md/expenses' },
  { label: 'Messages',  icon: MessageCircle, href: '/md/messages' },
];

export function BottomNav({ role = 'teacher' }: { role?: 'teacher' | 'md' }) {
  const pathname  = usePathname();
  const isOffline = useUIStore(s => s.isOffline);
  const navItems  = role === 'md' ? MD_NAV : TEACHER_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-border z-40"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
      <div className="flex justify-around items-center h-[60px] px-2">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/teacher' && item.href !== '/md' && pathname.startsWith(item.href));
          const Icon     = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-success bg-success/10 shadow-[0_0_14px_rgba(0,166,81,.2)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
