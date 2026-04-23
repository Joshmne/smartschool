'use client';
// app/teacher/analytics/page.tsx — Academic Analytics
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend,
} from 'recharts';
import { useStudents, useStudentAnalytics } from '@/lib/hooks/useQueries';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, heatColor, CardSkeleton, EmptyState, Skeleton } from '@/components/ui/shared';

const CLASS_ID = 'cls_p3';

const SUBJECT_COLORS = ['#0047AB','#F4A261','#8B5CF6','#00A651','#EF4444','#F59E0B'] as const;

// ─── Trendline Chart ─────────────────────────────────────────────────────────
function TrendlineChart({ data }: { data: Record<string, number | string>[] }) {
  if (!data || data.length === 0) return (
    <EmptyState emoji="📈" title="No trend data yet" description="Enter scores across multiple terms to see trends." />
  );
  const subjects = Object.keys(data[0] ?? {}).filter(k => k !== 'term');

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-ink mb-1">Performance Trendline</h3>
      <p className="text-xs text-muted mb-4">Score trajectory across terms</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="term" tick={{ fontSize: 9, fontFamily: 'Poppins', fill: '#6B7280' }} />
          <YAxis tick={{ fontSize: 9, fontFamily: 'Poppins', fill: '#6B7280' }} domain={[40, 100]} />
          <Tooltip
            contentStyle={{ fontFamily: 'Poppins', fontSize: 11, borderRadius: 10, border: '1px solid #E5E7EB' }}
            cursor={{ stroke: '#E5E7EB' }}
          />
          {subjects.map((sub, i) => (
            <Line
              key={sub}
              type="monotone"
              dataKey={sub}
              stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
              strokeWidth={i === subjects.length - 1 ? 3 : 2}
              dot={{ r: 3, fill: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex gap-4 flex-wrap mt-3">
        {subjects.map((sub, i) => (
          <div key={sub} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full" style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
            <span className="text-[10px] text-muted">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
function HeatmapChart({ rows }: { rows: { subject: string; scores: number[] }[] }) {
  return (
    <div className="card">
      <h3 className="text-sm font-bold text-ink mb-1">Subject Heatmap</h3>
      <p className="text-xs text-muted mb-4">Score intensity across class students</p>

      <div className="flex flex-col gap-2">
        {rows.map(({ subject, scores }) => (
          <div key={subject} className="flex gap-2 items-center">
            <div className="w-[80px] text-[9px] font-bold text-muted text-right flex-shrink-0 leading-tight">
              {subject}
            </div>
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {scores.slice(0, 10).map((v, i) => {
                const { bg, tx } = heatColor(v);
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[22px] h-7 rounded flex items-center justify-center text-[8px] font-extrabold"
                    style={{ background: bg, color: tx, minWidth: 24 }}
                    title={`Score: ${v}`}
                  >
                    {v}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {[['#EF4444','< 55'],['#F4A261','55–64'],['#FCD34D','65–74'],['#4ADE80','75–84'],['#00A651','85+']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: c }} />
            <span className="text-[9px] text-muted font-semibold">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Class Comparison ────────────────────────────────────────────────────────
function ClassComparisonChart({ data, studentName }: {
  data: { subject: string; studentScore: number; classAverage: number; diff: number }[];
  studentName: string;
}) {
  return (
    <div className="card">
      <h3 className="text-sm font-bold text-ink mb-1">vs. Class Average</h3>
      <p className="text-xs text-muted mb-4">
        {studentName.split(' ')[0]}'s scores vs class benchmark
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: -10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'Poppins', fill: '#6B7280' }} />
          <YAxis dataKey="subject" type="category" tick={{ fontSize: 9, fontFamily: 'Poppins', fill: '#6B7280' }} width={72} />
          <Tooltip
            contentStyle={{ fontFamily: 'Poppins', fontSize: 11, borderRadius: 10 }}
            formatter={(value: number, name: string) => [`${value}%`, name === 'studentScore' ? 'Student' : 'Class avg']}
          />
          <Bar dataKey="classAverage" fill="#E5E7EB" radius={[0, 4, 4, 0]} name="classAverage" />
          <Bar dataKey="studentScore" fill="#0047AB"   radius={[0, 4, 4, 0]} name="studentScore" />
        </BarChart>
      </ResponsiveContainer>

      {/* Diff chips */}
      <div className="flex flex-col gap-1.5 mt-4">
        {data.map(d => (
          <div key={d.subject} className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium w-28 truncate">{d.subject}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-trust">{d.studentScore}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  d.diff >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}
              >
                {d.diff >= 0 ? '+' : ''}{d.diff}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Recommendation card ──────────────────────────────────────────────────
function RecommendationCard({
  text, strength, improvement,
}: { text: string; strength: string; improvement: string }) {
  return (
    <div className="rounded-2xl p-4 border border-success/20" style={{ background: 'linear-gradient(135deg,#EBF9F2,#D1FAE5)' }}>
      <div className="flex gap-3">
        <span className="text-3xl flex-shrink-0">🌟</span>
        <div>
          <p className="text-sm font-bold text-success mb-2">AI Recommendation</p>
          <p className="text-xs text-ink leading-relaxed">{text}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="bg-success/10 rounded-lg px-2.5 py-1 text-[10px] font-bold text-success">
              💪 Strength: {strength}
            </div>
            <div className="bg-accent/10 rounded-lg px-2.5 py-1 text-[10px] font-bold text-accent">
              📖 Focus: {improvement}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student selector ─────────────────────────────────────────────────────────
function StudentPill({
  name, selected, onClick,
}: { name: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-200 ${
        selected
          ? 'bg-primary text-white border-primary shadow-trust'
          : 'bg-white text-muted border-border'
      }`}
    >
      {name.split(' ')[0]}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { data: students, isLoading: loadingStudents } = useStudents(CLASS_ID);
  const [selectedId, setSelectedId] = useState<string>('');

  // Set default student once loaded
  const activeId = selectedId || students?.[0]?.id || '';
  const { data: analytics, isLoading } = useStudentAnalytics(activeId);

  return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader title="Academic Analytics 📊" subtitle="Trendlines · Heatmap · Comparison" />

      {/* Student selector */}
      <div className="px-5 py-3 overflow-x-auto border-b border-border bg-white">
        <div className="flex gap-2 pb-0.5">
          {loadingStudents
            ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="w-20 h-8 rounded-full" />)
            : students?.map(s => (
                <StudentPill
                  key={s.id}
                  name={s.name}
                  selected={activeId === s.id}
                  onClick={() => setSelectedId(s.id)}
                />
              ))
          }
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-4 flex flex-col gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      ) : !analytics ? (
        <EmptyState
          emoji="📊"
          title="No analytics data"
          description="Enter scores for this student to see analytics."
        />
      ) : (
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Rank badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-trust/10 flex items-center justify-center text-2xl font-extrabold text-trust flex-shrink-0">
              #{analytics.overallRank}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{analytics.student.name}</p>
              <p className="text-xs text-muted">
                Rank {analytics.overallRank} of {analytics.overallOutOf} students
              </p>
              <p className="text-xs text-success font-semibold mt-0.5">
                {analytics.classComparison.length > 0
                  ? `${analytics.classComparison.reduce((s, c) => s + c.diff, 0) > 0 ? '+' : ''}${
                      Math.round(analytics.classComparison.reduce((s, c) => s + c.diff, 0) / analytics.classComparison.length)
                    } pts vs class avg`
                  : 'See comparison below'
                }
              </p>
            </div>
          </motion.div>

          <TrendlineChart data={analytics.trend} />
          <HeatmapChart rows={analytics.heatmap} />
          <ClassComparisonChart
            data={analytics.classComparison}
            studentName={analytics.student.name}
          />
          <RecommendationCard
            text={analytics.recommendation}
            strength={analytics.strengthSubject}
            improvement={analytics.improvementSubject}
          />
        </div>
      )}

      <BottomNav role="teacher" />
    </div>
  );
}
