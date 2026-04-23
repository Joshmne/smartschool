'use client';
// app/md/ledger/page.tsx — Full Fee Ledger (MD view)
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Search, Filter } from 'lucide-react';
import { useClasses, useTerms, useFees } from '@/lib/hooks/useQueries';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, ProgressBar, CardSkeleton, EmptyState } from '@/components/ui/shared';
import { formatNaira } from '@/lib/utils/api';
import type { FeeRecord } from '@/lib/types';

type FilterStatus = 'all' | 'paid' | 'partial' | 'unpaid';

function statusOf(r: FeeRecord): FilterStatus {
  if (r.balance <= 0)             return 'paid';
  if (r.amountPaid > 0)           return 'partial';
  return 'unpaid';
}

const STATUS_STYLE: Record<FilterStatus, { bg: string; color: string; label: string }> = {
  all:     { bg: '', color: '',              label: 'All'     },
  paid:    { bg: 'bg-success/10', color: 'text-success', label: 'Paid'    },
  partial: { bg: 'bg-warning/10', color: 'text-warning', label: 'Partial' },
  unpaid:  { bg: 'bg-danger/10',  color: 'text-danger',  label: 'Unpaid'  },
};

function FeeRow({ record, idx }: { record: FeeRecord; idx: number }) {
  const status = statusOf(record);
  const st     = STATUS_STYLE[status];
  const pct    = record.amountDue > 0
    ? Math.round((record.amountPaid / record.amountDue) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.025 }}
      className="card flex flex-col gap-2.5 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{record.studentName}</p>
          <p className="text-xs text-muted">{record.className}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${st.bg} ${st.color}`}>
          {st.label}
        </span>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-muted">Due: <strong className="text-ink">{formatNaira(record.amountDue)}</strong></span>
        <span className="text-muted">Paid: <strong className="text-success">{formatNaira(record.amountPaid)}</strong></span>
        {record.balance > 0 && (
          <span className="text-muted">Owed: <strong className="text-danger">{formatNaira(record.balance)}</strong></span>
        )}
      </div>

      <ProgressBar
        value={pct}
        color={pct === 100 ? '#00A651' : pct > 0 ? '#F59E0B' : '#EF4444'}
        height={5}
      />
      {record.lastPaymentDate && (
        <p className="text-[10px] text-muted">
          Last payment: {new Date(record.lastPaymentDate).toLocaleDateString('en-NG')}
          {record.paymentRef ? ` · Ref: ${record.paymentRef}` : ''}
        </p>
      )}
    </motion.div>
  );
}

export default function LedgerPage() {
  const [classId, setClassId] = useState('cls_p3');
  const [filter,  setFilter]  = useState<FilterStatus>('all');
  const [query,   setQuery]   = useState('');

  const { data: classes } = useClasses();
  const { data: terms   } = useTerms();
  const activeTerm = terms?.find(t => t.isActive) ?? terms?.[0];
  const { data: feeRecords, isLoading } = useFees(classId, activeTerm?.id ?? '');

  const filtered = (feeRecords ?? [])
    .filter(r => filter === 'all' || statusOf(r) === filter)
    .filter(r => !query || r.studentName.toLowerCase().includes(query.toLowerCase()));

  const totalDue       = (feeRecords ?? []).reduce((s, r) => s + r.amountDue,  0);
  const totalCollected = (feeRecords ?? []).reduce((s, r) => s + r.amountPaid, 0);
  const totalOwed      = (feeRecords ?? []).reduce((s, r) => s + r.balance,    0);

  return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader
        title="Fee Ledger"
        subtitle={activeTerm?.name ?? 'Current Term'}
        right={
          <button className="p-2 rounded-xl bg-surface">
            <Download size={18} className="text-primary" />
          </button>
        }
      />

      {/* Class selector */}
      <div className="px-5 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(classes ?? [
            { id: 'cls_p3', name: 'Primary 3', teacherId: '', studentCount: 34 },
            { id: 'cls_p4', name: 'Primary 4', teacherId: '', studentCount: 28 },
          ]).map(cls => (
            <button
              key={cls.id}
              onClick={() => setClassId(cls.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                classId === cls.id ? 'bg-primary text-white border-primary' : 'border-border text-muted bg-white'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-5 py-3 grid grid-cols-3 gap-2 mt-2">
        {[
          { l: 'Expected',  v: formatNaira(totalDue),       c: 'text-trust'   },
          { l: 'Collected', v: formatNaira(totalCollected),  c: 'text-success' },
          { l: 'Owed',      v: formatNaira(totalOwed),       c: 'text-danger'  },
        ].map(s => (
          <div key={s.l} className="card text-center py-2.5">
            <p className={`text-sm font-extrabold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="px-5 flex flex-col gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10 h-10 text-sm"
            placeholder="Search student name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all','paid','partial','unpaid'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                filter === f ? 'bg-primary text-white border-primary' : 'border-border text-muted bg-white'
              }`}
            >
              {STATUS_STYLE[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Records */}
      <div className="px-5 py-3 flex flex-col gap-2.5">
        {isLoading
          ? Array(5).fill(0).map((_, i) => <CardSkeleton key={i} />)
          : filtered.length === 0
          ? <EmptyState emoji="📊" title="No records" description="No students match this filter." />
          : filtered.map((r, i) => <FeeRow key={r.studentId} record={r} idx={i} />)
        }
      </div>

      <BottomNav role="md" />
    </div>
  );
}
