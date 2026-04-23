'use client';
// app/md/page.tsx — MD / Proprietress Dashboard
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useNetCash } from '@/lib/hooks/useQueries';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/layouts/BottomNav';
import { CircularProgress, ProgressBar, CardSkeleton } from '@/components/ui/shared';
import { formatNaira } from '@/lib/utils/api';

// Animated number that ticks up when value changes
function LiveNumber({ value, prefix = '', className = '' }: { value: number; prefix?: string; className?: string }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    // Animate from current to new value
    const diff  = value - displayed;
    if (Math.abs(diff) < 100) { setDisplayed(value); return; }

    const steps = 20;
    let   step  = 0;
    const iv    = setInterval(() => {
      step++;
      setDisplayed(prev => prev + Math.round(diff / steps));
      if (step >= steps) { setDisplayed(value); clearInterval(iv); }
    }, 40);
    return () => clearInterval(iv);
  }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {prefix}{displayed.toLocaleString('en-NG')}
    </motion.span>
  );
}

function MetricCard({
  label, value, color, bg, trend, pct,
}: {
  label: string; value: string; color: string; bg: string; trend?: number; pct?: number;
}) {
  return (
    <div className={`card ${bg}`}>
      <p className="text-[11px] font-semibold text-muted mb-1">{label}</p>
      <p className={`text-lg font-extrabold ${color} leading-tight`}>{value}</p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span className="text-[10px] font-bold">{Math.abs(trend)}% vs last term</span>
        </div>
      )}
      {pct !== undefined && (
        <div className="mt-2">
          <ProgressBar value={pct} color={color.replace('text-', '#').replace('success','#00A651').replace('trust','#0047AB').replace('danger','#EF4444').replace('accent','#F4A261')} height={4} />
        </div>
      )}
    </div>
  );
}

export default function MDDashboard() {
  const user                    = useAuthStore(s => s.user);
  const { data: finance, isLoading, refetch, dataUpdatedAt } = useNetCash();
  const [pulsing, setPulsing]   = useState(false);
  const [lastNet, setLastNet]   = useState(0);

  // Detect when net cash increases (payment arrived)
  useEffect(() => {
    if (!finance) return;
    if (lastNet > 0 && finance.totalCollected > lastNet) {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 1200);
    }
    setLastNet(finance.totalCollected);
  }, [finance?.totalCollected]);

  return (
    <div className="phone-safe pb-20 bg-surface">
      {/* Top bar */}
      <div className="bg-white px-5 py-3 flex justify-between items-center border-b border-border sticky top-0 z-40">
        <div>
          <p className="text-[11px] text-muted">God-mode view 🔑</p>
          <p className="text-sm font-bold text-ink">{user?.schoolName ?? 'Dashboard'}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className="text-muted" />
        </button>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5">
        {/* Hero net cash */}
        <motion.div
          className={`rounded-3xl p-5 text-white ${pulsing ? 'animate-pulse-glow' : ''}`}
          style={{ background: 'linear-gradient(135deg,#1F2937,#374151)' }}
          animate={pulsing ? { scale: [1, 1.01, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <p className="text-white/55 text-xs font-semibold mb-1">Net Cash Today</p>
          {isLoading ? (
            <div className="h-10 bg-white/10 rounded-xl animate-pulse w-48" />
          ) : (
            <LiveNumber
              value={finance?.disposableCash ?? 0}
              prefix="₦"
              className="text-4xl font-extrabold block leading-tight"
            />
          )}
          <p className="text-white/35 text-[10px] mt-1.5">
            Live · Auto-refreshes every 10s
            {dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}` : ''}
          </p>

          {/* Quick summary row */}
          {finance && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/15">
              {[
                { l: 'Collected',  v: formatNaira(finance.totalCollected) },
                { l: 'Expenses',   v: formatNaira(finance.totalExpenses)  },
                { l: 'Recovery',   v: `${finance.recoveryPercent}%`       },
              ].map(s => (
                <div key={s.l} className="flex-1 text-center">
                  <p className="text-white font-extrabold text-base">{s.v}</p>
                  <p className="text-white/45 text-[9px] mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Metric cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : finance ? (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Expected Fees"     value={formatNaira(finance.totalExpected)}    color="text-trust"   bg="bg-trust/5"   pct={100}                    />
            <MetricCard label="Collected"         value={formatNaira(finance.totalCollected)}   color="text-success" bg="bg-success/5" pct={finance.recoveryPercent} trend={12} />
            <MetricCard label="Expenses (Approved)" value={formatNaira(finance.totalExpenses)} color="text-danger"  bg="bg-danger/5"  pct={Math.round((finance.totalExpenses / finance.totalExpected) * 100)} />
            <MetricCard label="Disposable Cash"   value={formatNaira(finance.disposableCash)}   color="text-accent"  bg="bg-accent/5"  pct={Math.round((finance.disposableCash / finance.totalExpected) * 100)} />
          </div>
        ) : null}

        {/* Fee Recovery Gauge */}
        {finance && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-ink">Fee Recovery Gauge</h3>
              <span className="text-sm font-extrabold text-success">{finance.recoveryPercent}%</span>
            </div>
            <div className="flex justify-center">
              <CircularProgress
                pct={finance.recoveryPercent}
                size={150}
                stroke={14}
                color="#00A651"
                label="TERM 1 2025"
              />
            </div>
            <div className="mt-4 bg-accent/10 rounded-xl p-3 flex gap-2 items-center border border-accent/20">
              <span className="text-lg">🏆</span>
              <span className="text-xs text-accent font-bold">
                Result Gate recovered {formatNaira(finance.resultGateRecovered)} this term
              </span>
            </div>
          </div>
        )}

        {/* Quick action buttons */}
        <div className="flex gap-3">
          <Link
            href="/md/expenses"
            className="flex-1 btn-primary flex items-center justify-center gap-2 h-12 text-sm rounded-xl"
          >
            Approve SmartSpend
          </Link>
          <Link
            href="/md/ledger"
            className="flex-1 h-12 text-sm rounded-xl border-2 border-trust text-trust font-bold flex items-center justify-center gap-2 bg-white transition-colors active:bg-trust/5"
          >
            View Ledger <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <BottomNav role="md" />
    </div>
  );
}
