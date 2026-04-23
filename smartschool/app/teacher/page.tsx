'use client';
// app/teacher/page.tsx — Teacher Dashboard
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, Activity, FileText, BarChart2, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useNetCash } from '@/lib/hooks/useQueries';
import { BottomNav } from '@/components/layouts/BottomNav';
import { CircularProgress, ProgressBar, CardSkeleton } from '@/components/ui/shared';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const QUICK_ACTIONS = [
  { label: 'Enter Scores',  emoji: '📝', desc: 'CA1 · CA2 · Exams',   href: '/teacher/scores',    bg: 'bg-trust/8',   icon: BookOpen,  iconColor: 'text-trust' },
  { label: 'Friday Pulse',  emoji: '⭐', desc: 'Behavior ratings',     href: '/teacher/pulse',     bg: 'bg-accent/8',  icon: Activity,  iconColor: 'text-accent' },
  { label: 'View Results',  emoji: '📋', desc: 'Result Gate',          href: '/teacher/results',   bg: 'bg-success/8', icon: FileText,  iconColor: 'text-success' },
  { label: 'Analytics',     emoji: '📊', desc: 'Trendlines & heatmap', href: '/teacher/analytics', bg: 'bg-primary/8', icon: BarChart2, iconColor: 'text-primary' },
] as const;

export default function TeacherHome() {
  const user             = useAuthStore(s => s.user);
  const { data: finance, isLoading } = useNetCash();
  const [pct, setPct]    = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPct(finance?.recoveryPercent ?? 78), 600);
    return () => clearTimeout(t);
  }, [finance]);

  const today = [
    { label: 'Students Present',   value: '142 / 158',  color: 'text-success' },
    { label: 'Pending Scores',     value: '3 subjects', color: 'text-accent' },
    { label: 'Fees Collected Today',value: '₦156,000',  color: 'text-trust' },
  ];

  return (
    <div className="phone-safe pb-20 bg-surface">
      {/* Top bar */}
      <div className="bg-white px-5 py-3 flex justify-between items-center border-b border-border sticky top-0 z-40">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-extrabold text-sm">
          {user?.avatarInitials ?? 'SS'}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted">{getGreeting()} ☀️</p>
          <p className="text-sm font-bold text-ink">{user?.name ?? 'Teacher'}</p>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5">
        {/* Hero fee recovery card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl p-5 text-white flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg,#4B5563,#1F2937)' }}
        >
          <div className="flex-1">
            <p className="text-white/70 text-xs font-semibold mb-1">Fee Recovery · This Term</p>
            <motion.p
              className="text-4xl font-extrabold"
              key={pct}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {pct}%
            </motion.p>
            <p className="text-white/50 text-xs mt-1">↑ +12% vs last term</p>
            <div className="mt-3 bg-white/15 rounded-lg px-3 py-1.5 text-xs font-semibold inline-block">
              🏆 ₦420k via Result Gate
            </div>
          </div>
          <CircularProgress pct={pct} size={92} stroke={9} color="#fff" label="TERM 1" />
        </motion.div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-bold text-ink mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link
                    href={a.href}
                    className={`card flex flex-col gap-3 active:scale-95 transition-transform duration-150 ${a.bg}`}
                  >
                    <div className={`w-10 h-10 ${a.bg} rounded-xl flex items-center justify-center`}>
                      <Icon size={20} className={a.iconColor} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink leading-tight">{a.label}</p>
                      <p className="text-xs text-muted mt-0.5">{a.desc}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Today at a glance */}
        <div className="card">
          <h2 className="text-sm font-bold text-ink mb-3">Today at a Glance</h2>
          <div className="divide-y divide-border">
            {today.map(s => (
              <div key={s.label} className="flex justify-between items-center py-2.5">
                <span className="text-xs text-muted">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 justify-center">
          <Wifi size={13} className="text-success" />
          <span className="text-xs text-muted">Live · Data synced</span>
        </div>
      </div>

      <BottomNav role="teacher" />
    </div>
  );
}
