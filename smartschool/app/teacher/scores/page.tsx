'use client';
// app/teacher/scores/page.tsx — Offline-First Broadsheet
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { useStudents, useSubjects, useScores, useSaveScores, useClasses, useTerms } from '@/lib/hooks/useQueries';
import { useScoreDraftStore, useUIStore } from '@/lib/store';
import { upsertScore } from '@/lib/db/offline';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, gradeColor, CardSkeleton } from '@/components/ui/shared';
import type { Student } from '@/lib/types';
import toast from 'react-hot-toast';

type ScoreField = 'ca1' | 'ca2' | 'exam';

const FIELD_MAX: Record<ScoreField, number> = { ca1: 20, ca2: 20, exam: 60 };

// Subject list screen
function SubjectList({
  classId, onSelect,
}: { classId: string; onSelect: (subjectId: string, name: string) => void }) {
  const { data: subjects, isLoading } = useSubjects(classId);
  const [query, setQuery] = useState('');

  const filtered = subjects?.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  ) ?? [];

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-10"
          placeholder="Search subjects…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {isLoading
        ? Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)
        : filtered.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id, s.name)}
            className="card flex items-center gap-4 active:scale-95 transition-transform text-left h-[68px]"
          >
            <div className="w-11 h-11 bg-trust/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              {s.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate">{s.name}</p>
              <p className="text-xs text-muted">CA1 · CA2 · Exam</p>
            </div>
            <span className="text-muted text-lg font-light">›</span>
          </button>
        ))}
    </div>
  );
}

// Broadsheet grid for a specific subject
function BroadsheetGrid({
  classId, subjectId, termId, subjectName,
}: { classId: string; subjectId: string; termId: string; subjectName: string }) {
  const { data: students,  isLoading: loadingStudents } = useStudents(classId);
  const { data: serverScores } = useScores(classId, subjectId, termId);
  const { mutateAsync: saveScores, isPending: saving }  = useSaveScores();
  const { drafts, setScore, markSaved, isDirty }        = useScoreDraftStore();
  const isOffline  = useUIStore(s => s.isOffline);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();

  // Merge server scores into drafts on load
  useEffect(() => {
    if (!serverScores) return;
    serverScores.forEach(s => {
      const key = `${s.studentId}_${subjectId}`;
      if (!drafts[key]) {
        setScore(s.studentId, subjectId, 'ca1', s.ca1);
        setScore(s.studentId, subjectId, 'ca2', s.ca2);
        setScore(s.studentId, subjectId, 'exam', s.exam);
      }
    });
  }, [serverScores]);

  // Auto-save every 4 seconds
  useEffect(() => {
    if (!isDirty) return;
    autoSaveRef.current = setInterval(handleSave, 4000);
    return () => clearInterval(autoSaveRef.current);
  }, [isDirty]);

  const getScore = (studentId: string, field: ScoreField) =>
    drafts[`${studentId}_${subjectId}`]?.[field] ?? 0;

  const getTotal = (studentId: string) => {
    const d = drafts[`${studentId}_${subjectId}`] ?? { ca1: 0, ca2: 0, exam: 0 };
    return d.ca1 + d.ca2 + d.exam;
  };

  const handleChange = async (studentId: string, field: ScoreField, raw: string) => {
    const max = FIELD_MAX[field];
    const val = Math.min(max, Math.max(0, Number(raw) || 0));
    setScore(studentId, subjectId, field, val);
    // Write to IndexedDB immediately for offline
    await upsertScore({
      id:        `${studentId}_${subjectId}_${termId}`,
      studentId, subjectId, termId,
      ca1:       getScore(studentId, 'ca1'),
      ca2:       getScore(studentId, 'ca2'),
      exam:      getScore(studentId, 'exam'),
      total:     getTotal(studentId),
      isDirty:   true,
      updatedAt: Date.now(),
    }).catch(() => {});
  };

  const handleSave = async () => {
    if (!students || !isDirty) return;
    try {
      const payload = students.map(s => ({
        studentId: s.id,
        subjectId,
        termId,
        ca1:  getScore(s.id, 'ca1'),
        ca2:  getScore(s.id, 'ca2'),
        exam: getScore(s.id, 'exam'),
      }));
      await saveScores({ scores: payload, termId });
      markSaved();
    } catch {
      if (isOffline) toast('Saved locally — will sync when online', { icon: '💾' });
    }
  };

  // Sort students by total descending for position
  const ranked = [...(students ?? [])].sort(
    (a, b) => getTotal(b.id) - getTotal(a.id)
  );

  if (loadingStudents) return (
    <div className="flex flex-col gap-3 p-5">
      {Array(5).fill(0).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );

  return (
    <>
      {/* Save indicator */}
      <div className="px-5 py-2 flex justify-between items-center">
        <span className="text-xs text-muted">
          {ranked.length} students · {subjectName}
        </span>
        <AnimatePresence>
          {isDirty ? (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-accent font-semibold flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Unsaved changes
            </motion.span>
          ) : (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-success font-semibold flex items-center gap-1"
            >
              <CheckCircle2 size={12} /> Saved locally ✓
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Column headers */}
      <div className="px-5 overflow-x-auto grid-scroll">
        <div className="min-w-[360px]">
          <div className="grid grid-cols-[1fr_48px_48px_60px_52px_36px] gap-2 px-1 pb-2 text-[10px] font-bold text-muted uppercase tracking-wider">
            <span>Student</span>
            <span className="text-center">CA1<br/><span className="font-normal">/20</span></span>
            <span className="text-center">CA2<br/><span className="font-normal">/20</span></span>
            <span className="text-center">Exam<br/><span className="font-normal">/60</span></span>
            <span className="text-center">Total</span>
            <span className="text-center">Pos</span>
          </div>

          {ranked.map((student, pos) => {
            const total = getTotal(student.id);
            const tc    = gradeColor(total);
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: pos * 0.03 }}
                className="grid grid-cols-[1fr_48px_48px_60px_52px_36px] gap-2 items-center bg-white rounded-xl px-1 py-2 mb-2 shadow-sm"
              >
                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm flex-shrink-0 font-bold text-primary">
                    {student.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                  </div>
                  <span className="text-xs font-semibold text-ink truncate">
                    {student.name.split(' ')[0]}
                  </span>
                </div>

                {/* Score inputs */}
                {(['ca1','ca2','exam'] as ScoreField[]).map(field => (
                  <input
                    key={field}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={FIELD_MAX[field]}
                    value={getScore(student.id, field) || ''}
                    onChange={e => handleChange(student.id, field, e.target.value)}
                    className="score-cell"
                    placeholder="0"
                  />
                ))}

                {/* Total */}
                <div className="text-center text-sm font-extrabold" style={{ color: tc }}>
                  {total}
                </div>

                {/* Position */}
                <div className="text-center text-[10px] font-bold text-muted">
                  {pos+1}{['st','nd','rd'][pos] ?? 'th'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sticky save + generate */}
      <div className="sticky bottom-[72px] px-5 py-3 bg-surface border-t border-border flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex-1 btn-outline h-12 text-sm rounded-xl flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <a
          href="/teacher/results"
          className="flex-1 btn-primary h-12 text-sm rounded-xl flex items-center justify-center gap-1.5"
        >
          🎓 Generate Reports
        </a>
      </div>
    </>
  );
}

export default function ScoresPage() {
  const [step,        setStep]        = useState<'class'|'subject'|'grid'>('class');
  const [classId,     setClassId]     = useState('');
  const [className,   setClassName]   = useState('');
  const [subjectId,   setSubjectId]   = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [termId,      setTermId]      = useState('term_1');

  const { data: classes } = useClasses();
  const { data: terms   } = useTerms();
  const activeTerm = terms?.find(t => t.isActive) ?? terms?.[0];

  useEffect(() => {
    if (activeTerm) setTermId(activeTerm.id);
  }, [activeTerm]);

  return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader
        title={step === 'grid' ? subjectName : step === 'subject' ? `${className} — Subjects` : 'Broadsheet'}
        subtitle={step === 'grid' ? `${className} · ${activeTerm?.name ?? 'Term 1'}` : undefined}
        right={step !== 'class' ? (
          <button
            onClick={() => setStep(s => s === 'grid' ? 'subject' : 'class')}
            className="text-xs text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/8"
          >
            ← Back
          </button>
        ) : undefined}
      />

      {step === 'class' && (
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-sm text-muted font-medium">Select a class to enter scores</p>
          {(classes ?? [
            { id: 'cls_p3', name: 'Primary 3', studentCount: 34, teacherId: '', arm: 'A' },
            { id: 'cls_p4', name: 'Primary 4', studentCount: 28, teacherId: '', arm: 'A' },
            { id: 'cls_p5', name: 'Primary 5', studentCount: 31, teacherId: '', arm: 'A' },
          ]).map(cls => (
            <button
              key={cls.id}
              onClick={() => { setClassId(cls.id); setClassName(cls.name); setStep('subject'); }}
              className="card flex items-center gap-4 active:scale-95 transition-transform text-left h-[68px]"
            >
              <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center text-xl">🏫</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{cls.name}</p>
                <p className="text-xs text-muted">{cls.studentCount} students</p>
              </div>
              <span className="text-muted text-lg">›</span>
            </button>
          ))}
        </div>
      )}

      {step === 'subject' && (
        <SubjectList
          classId={classId}
          onSelect={(sId, sName) => {
            setSubjectId(sId); setSubjectName(sName); setStep('grid');
          }}
        />
      )}

      {step === 'grid' && (
        <BroadsheetGrid
          classId={classId}
          subjectId={subjectId}
          termId={termId}
          subjectName={subjectName}
        />
      )}

      <BottomNav role="teacher" />
    </div>
  );
}
