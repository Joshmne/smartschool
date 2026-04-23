'use client';
// app/teacher/results/page.tsx — Result Gate (generate + lock/unlock)
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Download, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useResults, useGenerateReports, useUnlockResult, useClasses, useTerms } from '@/lib/hooks/useQueries';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, useConfetti, BottomSheet, CardSkeleton, EmptyState } from '@/components/ui/shared';
import { formatNaira } from '@/lib/utils/api';
import type { ReportCard } from '@/lib/types';
import toast from 'react-hot-toast';

// ─── Generation progress screen ───────────────────────────────────────────────
function GeneratingScreen({ total, onDone }: { total: number; onDone: () => void }) {
  const [pct, setPct] = useState(0);

  useState(() => {
    const iv = setInterval(() => {
      setPct(p => {
        if (p >= 100) { clearInterval(iv); setTimeout(onDone, 700); return 100; }
        return p + 1.5;
      });
    }, 60);
    return () => clearInterval(iv);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-8"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="text-6xl"
      >📋</motion.div>

      <div className="text-center">
        <h2 className="text-lg font-bold text-ink mb-1">Generating Report Cards…</h2>
        <p className="text-sm text-muted">{total} beautiful PDF reports</p>
      </div>

      <div className="w-full">
        <div className="w-full h-3 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-success rounded-full shadow-glow"
            animate={{ width: `${pct}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted">Processing…</span>
          <span className="text-xs font-bold text-success">{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Animated PDF stack */}
      <div className="flex gap-2.5 mt-2">
        {Array.from({ length: 5 }, (_, i) => (
          <motion.div
            key={i}
            className="w-10 h-14 rounded-lg"
            style={{ background: pct > i * 20 ? '#00A651' : '#E5E7EB', transform: `rotate(${(i-2)*5}deg)` }}
            animate={{ background: pct > i * 20 ? '#00A651' : '#E5E7EB' }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Payment sheet ────────────────────────────────────────────────────────────
function PaymentSheet({
  card, open, onClose, onPaid,
}: { card: ReportCard; open: boolean; onClose: () => void; onPaid: () => void }) {
  const { mutateAsync: unlock, isPending } = useUnlockResult();
  const fire = useConfetti();

  const pay = async (channel: string) => {
    try {
      await unlock({
        studentId:  card.studentId,
        termId:     card.termId,
        paymentRef: `REF_${Date.now()}`,
        channel,
      });
      fire();
      onPaid();
      onClose();
    } catch {
      toast.error('Payment failed. Try again.');
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Unlock Result 🔓">
      <div className="flex flex-col gap-4">
        <div className="bg-surface rounded-2xl p-4">
          <p className="text-sm font-bold text-ink">{card.studentName}</p>
          <p className="text-xs text-muted mt-0.5">{card.className}</p>
          <p className="text-2xl font-extrabold text-accent mt-2">{formatNaira(card.feesOwed)}</p>
          <p className="text-xs text-muted">Outstanding balance</p>
        </div>

        <div className="bg-success/8 border border-success/20 rounded-xl p-3 text-xs text-success font-semibold flex gap-2">
          <span>💡</span>
          <span>Pay once — result downloads instantly. WhatsApp receipt sent automatically.</span>
        </div>

        <button
          onClick={() => pay('paystack')}
          disabled={isPending}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 size={18} className="animate-spin" /> : null}
          Pay via Paystack / Card
        </button>

        <button
          onClick={() => pay('flutterwave')}
          disabled={isPending}
          className="btn-outline flex items-center justify-center gap-2 border-trust text-trust"
        >
          Pay via Flutterwave
        </button>

        <button
          onClick={() => pay('bank')}
          disabled={isPending}
          className="btn-outline flex items-center justify-center gap-2"
        >
          Bank Transfer (Manual)
        </button>

        <button onClick={onClose} className="text-sm text-muted py-2 text-center">Cancel</button>
      </div>
    </BottomSheet>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({
  card, onPayClick,
}: { card: ReportCard; onPayClick: (card: ReportCard) => void }) {
  const isUnlocked = !card.isLocked;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`card flex flex-col gap-3 border-2 ${
        isUnlocked ? 'border-success/30' : 'border-accent/30'
      }`}
    >
      {/* Student avatar + name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
          {card.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{card.studentName}</p>
          <p className="text-xs text-muted">
            Position {card.position}/{card.outOf} · Avg {card.overallAverage}%
          </p>
        </div>
      </div>

      {/* Status badge */}
      {isUnlocked ? (
        <div className="flex items-center gap-1.5 bg-success/8 rounded-lg px-3 py-1.5">
          <CheckCircle2 size={14} className="text-success" />
          <span className="text-xs font-bold text-success">Result unlocked</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-accent/10 rounded-lg px-3 py-1.5">
          <Lock size={13} className="text-accent" />
          <span className="text-xs font-bold text-accent">
            Locked · {formatNaira(card.feesOwed)} owed
          </span>
        </div>
      )}

      {/* Action button */}
      {isUnlocked ? (
        <button className="btn-primary h-10 text-sm rounded-xl flex items-center justify-center gap-2">
          <Download size={15} /> Download PDF
        </button>
      ) : (
        <button
          onClick={() => onPayClick(card)}
          className="btn-accent h-10 text-sm rounded-xl flex items-center justify-center gap-2"
        >
          <Unlock size={15} /> Pay & Unlock
        </button>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const [classId] = useState('cls_p3');
  const [termId]  = useState('term_1');
  const [phase,   setPhase]   = useState<'list' | 'generating' | 'ready'>('list');
  const [payFor,  setPayFor]  = useState<ReportCard | null>(null);
  const fire = useConfetti();

  const { data: results, isLoading, refetch } = useResults(classId, termId);
  const { mutateAsync: generate } = useGenerateReports();

  const handleGenerate = async () => {
    setPhase('generating');
    try {
      await generate({ classId, termId });
    } catch {
      toast.error('Generation failed. Try again.');
    }
  };

  const handleGenerateDone = useCallback(() => {
    setPhase('ready');
    fire();
    refetch();
  }, [fire, refetch]);

  return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader
        title="Result Gate"
        subtitle={`${results?.length ?? 0} students · Term 1`}
        right={
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-surface">
            <RefreshCw size={16} className="text-muted" />
          </button>
        }
      />

      {phase === 'generating' && (
        <GeneratingScreen total={34} onDone={handleGenerateDone} />
      )}

      {phase !== 'generating' && (
        <>
          {/* Generate button */}
          {phase === 'list' && (
            <div className="px-5 py-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                className="btn-primary flex items-center justify-center gap-2 animate-pulse-glow"
              >
                🎓 Generate Report Cards for {results?.length ?? 34} Students
              </motion.button>
            </div>
          )}

          {phase === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-5 mt-4 bg-success rounded-2xl p-4 text-white text-center"
            >
              <p className="text-lg font-extrabold">All Report Cards Ready 🎉</p>
              <p className="text-white/75 text-xs mt-1">
                {results?.filter(r => !r.isLocked).length ?? 0} unlocked ·{' '}
                {results?.filter(r => r.isLocked).length ?? 0} locked
              </p>
            </motion.div>
          )}

          {/* Summary stats */}
          {results && results.length > 0 && (
            <div className="px-5 py-3 grid grid-cols-3 gap-3">
              {[
                { l: 'Total',    v: results.length,                          c: 'text-ink'     },
                { l: 'Unlocked', v: results.filter(r => !r.isLocked).length, c: 'text-success' },
                { l: 'Locked',   v: results.filter(r => r.isLocked).length,  c: 'text-accent'  },
              ].map(s => (
                <div key={s.l} className="card text-center py-3">
                  <p className={`text-xl font-extrabold ${s.c}`}>{s.v}</p>
                  <p className="text-[10px] text-muted mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          )}

          {/* Results grid */}
          <div className="px-5 pb-4 grid grid-cols-1 gap-3">
            {isLoading
              ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
              : results?.length === 0
              ? <EmptyState emoji="📋" title="No reports yet" description="Generate report cards above to see them here." />
              : results?.map(card => (
                  <ResultCard key={card.studentId} card={card} onPayClick={setPayFor} />
                ))
            }
          </div>
        </>
      )}

      {payFor && (
        <PaymentSheet
          card={payFor}
          open={!!payFor}
          onClose={() => setPayFor(null)}
          onPaid={() => { refetch(); setPayFor(null); }}
        />
      )}

      <BottomNav role="teacher" />
    </div>
  );
}
