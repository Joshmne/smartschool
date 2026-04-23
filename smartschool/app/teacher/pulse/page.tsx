'use client';
// app/teacher/pulse/page.tsx — Friday Behavioral Pulse
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useStudents, useSubmitPulse } from '@/lib/hooks/useQueries';
import { upsertPulse } from '@/lib/db/offline';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, StarRating, useConfetti, EmptyState, CardSkeleton } from '@/components/ui/shared';
import type { PulseRating } from '@/lib/types';
import toast from 'react-hot-toast';

const CLASS_ID = 'cls_p3';
const PULSE_CATEGORIES = ['Neatness', 'Conduct', 'Punctuality'] as const;
type PulseKey = typeof PULSE_CATEGORIES[number];
const KEY_MAP: Record<PulseKey, keyof PulseRating> = {
  Neatness: 'neatness', Conduct: 'conduct', Punctuality: 'punctuality',
};
const CAT_EMOJI: Record<PulseKey, string> = {
  Neatness: '✨', Conduct: '🤝', Punctuality: '⏰',
};

// Friday of the current week
function getThisFriday(): string {
  const now    = new Date();
  const friday = addDays(startOfWeek(now, { weekStartsOn: 1 }), 4);
  return format(friday, 'yyyy-MM-dd');
}

function isFriday(): boolean {
  return new Date().getDay() === 5;
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ count, onBack }: { count: number; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[70vh] flex flex-col items-center justify-center px-8 gap-5 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14 }}
        className="text-6xl"
      >
        🎉
      </motion.div>
      <h2 className="text-xl font-extrabold text-ink">Parents Notified!</h2>
      <p className="text-sm text-muted leading-relaxed">
        Weekly pulse submitted for <strong>{count} students</strong>.
        Parents got WhatsApp reports instantly 📲
      </p>
      <div className="bg-success/10 rounded-2xl p-4 w-full text-sm text-success font-semibold border border-success/20">
        🌟 Jimi had a great week! All parents notified.
      </div>
      <button onClick={onBack} className="btn-primary mt-2">← Back to Home</button>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PulsePage() {
  const weekOf  = getThisFriday();
  const { data: students, isLoading } = useStudents(CLASS_ID);
  const { mutateAsync: submitPulse, isPending } = useSubmitPulse();
  const fire = useConfetti();

  // ratings: { [studentId]: { neatness, conduct, punctuality } }
  const [ratings, setRatings] = useState<Record<string, Record<PulseKey, number>>>({});
  const [done, setDone]       = useState(false);

  const getRating = (studentId: string, cat: PulseKey): number =>
    ratings[studentId]?.[cat] ?? 0;

  const setRating = async (studentId: string, cat: PulseKey, val: number) => {
    setRatings(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { Neatness: 0, Conduct: 0, Punctuality: 0 }), [cat]: val },
    }));
    // Persist to IndexedDB for offline
    const current = ratings[studentId] ?? { Neatness: 0, Conduct: 0, Punctuality: 0 };
    await upsertPulse({
      id:          `${studentId}_${weekOf}`,
      studentId,
      weekOf,
      neatness:    cat === 'Neatness'    ? val : (current.Neatness ?? 0),
      conduct:     cat === 'Conduct'     ? val : (current.Conduct ?? 0),
      punctuality: cat === 'Punctuality' ? val : (current.Punctuality ?? 0),
      isDirty:     true,
      submittedAt: Date.now(),
    }).catch(() => {});
  };

  const completedCount = useMemo(() =>
    Object.values(ratings).filter(r =>
      PULSE_CATEGORIES.every(c => (r[c] ?? 0) > 0)
    ).length,
  [ratings]);

  const handleSubmit = async () => {
    if (!students) return;
    try {
      const pulseRatings: PulseRating[] = students.map(s => ({
        studentId:   s.id,
        weekOf,
        neatness:    ratings[s.id]?.Neatness    ?? 0,
        conduct:     ratings[s.id]?.Conduct     ?? 0,
        punctuality: ratings[s.id]?.Punctuality ?? 0,
      }));
      await submitPulse({ classId: CLASS_ID, weekOf, ratings: pulseRatings });
      fire();
      setDone(true);
    } catch {
      toast.error('Submission failed. Saved locally — will retry.');
    }
  };

  if (done) return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader title="Friday Pulse" />
      <SuccessScreen count={students?.length ?? 0} onBack={() => setDone(false)} />
      <BottomNav role="teacher" />
    </div>
  );

  return (
    <div className="phone-safe pb-28 bg-surface">
      <BackHeader title="Friday Pulse 📊" subtitle="60-second weekly behavior check" />

      {/* Friday nudge banner */}
      <div className={`px-5 py-3 text-sm font-semibold flex gap-2 items-center ${
        isFriday() ? 'bg-accent/10 text-accent' : 'bg-surface text-muted'
      }`}>
        <span>🔔</span>
        <span>
          {isFriday()
            ? "It's Friday! Rate your class — takes 60 seconds."
            : `Week of ${format(new Date(weekOf), 'MMM d')} — you can rate anytime.`}
        </span>
      </div>

      {/* Progress chip */}
      {students && (
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted font-semibold">
              {completedCount}/{students.length} students rated
            </span>
            <span className="text-xs text-success font-bold">
              {Math.round((completedCount / students.length) * 100)}% done
            </span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-success rounded-full"
              animate={{ width: `${(completedCount / students.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Student cards */}
      <div className="px-5 py-4 flex flex-col gap-3">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
          : students?.map((student, idx) => {
              const allRated = PULSE_CATEGORIES.every(c => getRating(student.id, c) > 0);
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`card border-2 transition-colors duration-300 ${
                    allRated ? 'border-success/30 bg-success/3' : 'border-border'
                  }`}
                >
                  {/* Student header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm font-bold text-ink flex-1">{student.name}</span>
                    {allRated && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12 }}
                        className="text-success text-base"
                      >✓</motion.span>
                    )}
                  </div>

                  {/* Star rows */}
                  <div className="flex flex-col gap-2.5">
                    {PULSE_CATEGORIES.map(cat => (
                      <div key={cat} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 w-28">
                          <span className="text-sm">{CAT_EMOJI[cat]}</span>
                          <span className="text-xs font-semibold text-muted">{cat}</span>
                        </div>
                        <StarRating
                          value={getRating(student.id, cat)}
                          onChange={v => setRating(student.id, cat, v)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })
        }
      </div>

      {/* Sticky submit button */}
      <div className="fixed bottom-[72px] left-0 right-0 max-w-[430px] mx-auto px-5 py-3 bg-surface border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={isPending || completedCount === 0}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isPending
            ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
            : <>✓ Submit for All {students?.length ?? 0} Students <ChevronRight size={16} /></>
          }
        </button>
      </div>

      <BottomNav role="teacher" />
    </div>
  );
}
