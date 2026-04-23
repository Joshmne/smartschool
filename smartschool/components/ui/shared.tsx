'use client';
// components/ui/shared.tsx — All reusable micro-components
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import canvasConfetti from 'canvas-confetti';
import { ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Back Header ──────────────────────────────────────────────────────────────
export function BackHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="page-header">
      <button
        onClick={() => router.back()}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface active:scale-90 transition-all"
        aria-label="Go back"
      >
        <ChevronLeft size={22} strokeWidth={2.5} className="text-ink" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-bold text-ink leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-muted leading-tight">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

// ─── Circular Progress ────────────────────────────────────────────────────────
export function CircularProgress({
  pct, size = 120, stroke = 10, color = '#00A651', label,
}: { pct: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} role="img" aria-label={`${pct}% progress`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
      />
      <text x={size/2} y={size/2+2}  textAnchor="middle" fontSize={18} fontWeight="800" fill={color} fontFamily="Poppins">{pct}%</text>
      {label && <text x={size/2} y={size/2+16} textAnchor="middle" fontSize={9} fill="#6B7280" fontFamily="Poppins">{label}</text>}
    </svg>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
export function StarRating({
  value, onChange, max = 5,
}: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-xl transition-transform duration-100 active:scale-125 focus:outline-none"
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          aria-pressed={value >= n}
        >
          <span className={value >= n ? 'text-accent' : 'text-border'}>
            {value >= n ? '★' : '☆'}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  emoji = '📭', title, description, action,
}: { emoji?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3"
    >
      <span className="text-5xl">{emoji}</span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="text-sm text-muted max-w-[240px]">{description}</p>}
      {action}
    </motion.div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
      <span className="text-4xl">😕</span>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline max-w-[160px] h-10 text-sm rounded-xl">
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Confetti Effect ─────────────────────────────────────────────────────────
export function useConfetti() {
  const fired = useRef(false);
  const fire  = () => {
    if (fired.current) return;
    fired.current = true;
    canvasConfetti({
      particleCount: 140,
      spread:        80,
      origin:        { y: 0.55 },
      colors: ['#00A651','#F4A261','#0047AB','#FFD700','#EC4899'],
    });
  };
  return fire;
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
export function ProgressBar({
  value, color = '#00A651', height = 8,
}: { value: number; color?: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-border overflow-hidden" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

// ─── Modal Sheet ──────────────────────────────────────────────────────────────
export function BottomSheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white rounded-t-3xl z-50 p-6 pb-10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-ink mb-4">{title}</h2>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Grade color helper ───────────────────────────────────────────────────────
export function gradeColor(total: number): string {
  if (total >= 70) return '#00A651';
  if (total >= 50) return '#F4A261';
  return '#EF4444';
}

// ─── Heatmap cell color ───────────────────────────────────────────────────────
export function heatColor(v: number): { bg: string; tx: string } {
  if (v >= 85) return { bg: '#00A651', tx: '#fff' };
  if (v >= 75) return { bg: '#4ADE80', tx: '#1F2937' };
  if (v >= 65) return { bg: '#FCD34D', tx: '#1F2937' };
  if (v >= 55) return { bg: '#F4A261', tx: '#fff' };
  return             { bg: '#EF4444', tx: '#fff' };
}
