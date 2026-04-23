'use client';
// app/md/expenses/page.tsx — SmartSpend (MD approval view + teacher request form)
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, Camera, MapPin, Loader2, ChevronDown } from 'lucide-react';
import { useExpenses, useApproveExpense, useCreateExpense } from '@/lib/hooks/useQueries';
import { useAuthStore } from '@/lib/store';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, BottomSheet, CardSkeleton, EmptyState, useConfetti } from '@/components/ui/shared';
import { formatNaira } from '@/lib/utils/api';
import type { Expense, ExpenseStatus } from '@/lib/types';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Diesel / Generator','Stationery','Repairs & Maintenance',
  'Feeding / Canteen','Sports Equipment','Cleaning Supplies',
  'Transportation','Salaries & Wages','Utilities','Other',
];

const STATUS_CONFIG: Record<ExpenseStatus, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-warning/10',  color: 'text-warning'  },
  approved: { label: 'Approved', bg: 'bg-success/10',  color: 'text-success'  },
  declined: { label: 'Declined', bg: 'bg-danger/10',   color: 'text-danger'   },
};

const EXPENSE_EMOJIS: Record<string, string> = {
  'Diesel / Generator': '⛽',
  'Stationery':         '📦',
  'Repairs & Maintenance': '🔧',
  'Feeding / Canteen':  '🍽️',
  'Sports Equipment':   '⚽',
  'Cleaning Supplies':  '🧹',
  'Transportation':     '🚌',
  'Salaries & Wages':   '💵',
  'Utilities':          '💡',
  'Other':              '📋',
};

// ─── Request form (teacher submits) ─────────────────────────────────────────
function RequestForm({ onClose }: { onClose: () => void }) {
  const [amount,   setAmount]   = useState('');
  const [purpose,  setPurpose]  = useState('');
  const [category, setCategory] = useState('');
  const [photoSet, setPhotoSet] = useState(false);
  const [gps,      setGps]      = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);
  const { mutateAsync: create, isPending } = useCreateExpense();

  const captureGPS = () => {
    if (!navigator.geolocation) { setGps('Location unavailable'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setGps(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
      ()  => setGps('Could not get location'),
      { timeout: 5000 }
    );
  };

  const handleSubmit = async () => {
    if (!amount || !purpose || !category) { toast.error('All fields required'); return; }
    const fd = new FormData();
    fd.append('amount',    amount);
    fd.append('purpose',   purpose);
    fd.append('category',  category);
    if (gps) fd.append('gpsLocation', gps);
    await create(fd);
    setSuccess(true);
  };

  if (success) return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="text-5xl">✅</motion.div>
      <p className="text-base font-bold text-ink">Request Submitted!</p>
      <p className="text-sm text-muted">MD has been notified and will approve shortly</p>
      <button onClick={onClose} className="btn-primary h-12 text-sm px-8 rounded-xl mt-2">Done</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Amount (₦)</label>
        <input type="number" inputMode="numeric" className="input" placeholder="e.g. 45000"
          value={amount} onChange={e => setAmount(e.target.value)} min={100} />
      </div>

      <div>
        <label className="label">Category</label>
        <div className="relative">
          <select className="input appearance-none pr-10" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select category…</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="label">Purpose / Description</label>
        <input className="input" placeholder="Brief description of expense" value={purpose} onChange={e => setPurpose(e.target.value)} maxLength={120} />
      </div>

      {/* Receipt photo */}
      <div>
        <label className="label">Receipt Photo</label>
        <button
          type="button"
          onClick={() => { setPhotoSet(true); captureGPS(); }}
          className={`w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
            photoSet ? 'border-success bg-success/5' : 'border-border bg-surface'
          }`}
        >
          {photoSet ? (
            <><div className="text-4xl">📸</div><p className="text-sm font-bold text-success">Receipt captured ✓</p></>
          ) : (
            <><Camera size={28} className="text-muted" /><p className="text-sm font-semibold text-muted">Tap to snap receipt</p><p className="text-xs text-muted">GPS auto-stamp included</p></>
          )}
        </button>
        {gps && (
          <div className="mt-2 flex gap-2 items-center bg-success/8 rounded-xl px-3 py-2 border border-success/20">
            <MapPin size={12} className="text-success flex-shrink-0" />
            <span className="text-[10px] text-success font-semibold">{gps}</span>
          </div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center justify-center gap-2">
        {isPending ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : 'Submit for MD Approval ↗'}
      </button>
    </div>
  );
}

// ─── Expense card ────────────────────────────────────────────────────────────
function ExpenseCard({ exp, isMD }: { exp: Expense; isMD: boolean }) {
  const { mutateAsync: approve, isPending } = useApproveExpense();
  const fire = useConfetti();
  const cfg  = STATUS_CONFIG[exp.status];

  const handleApprove = async (action: 'approved' | 'declined') => {
    await approve({ id: exp.id, action });
    if (action === 'approved') fire();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex gap-3 items-start"
    >
      <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center text-xl flex-shrink-0">
        {EXPENSE_EMOJIS[exp.category] ?? '📋'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <p className="text-sm font-bold text-ink truncate">{exp.purpose}</p>
          <p className="text-sm font-extrabold text-ink flex-shrink-0">{formatNaira(exp.amount)}</p>
        </div>
        <p className="text-xs text-muted mt-0.5">{exp.requesterName} · {exp.category}</p>
        {exp.gpsLocation && (
          <div className="flex gap-1 items-center mt-1">
            <MapPin size={9} className="text-muted flex-shrink-0" />
            <span className="text-[9px] text-muted truncate">{exp.gpsLocation}</span>
          </div>
        )}

        {/* Status / actions */}
        <div className="flex gap-2 mt-2 items-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          {isMD && exp.status === 'pending' && (
            <div className="flex gap-1.5 ml-auto">
              <button
                onClick={() => handleApprove('declined')}
                disabled={isPending}
                className="w-8 h-8 rounded-xl bg-danger/10 text-danger flex items-center justify-center transition-all active:scale-90"
                aria-label="Decline"
              >
                <X size={14} />
              </button>
              <button
                onClick={() => handleApprove('approved')}
                disabled={isPending}
                className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center transition-all active:scale-90"
                aria-label="Approve"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const user      = useAuthStore(s => s.user);
  const isMD      = user?.role === 'md' || user?.role === 'bursar';
  const [open,    setOpen]  = useState(false);
  const [filter,  setFilter]= useState<'all' | ExpenseStatus>('all');
  const { data: expenses, isLoading } = useExpenses();

  const filtered = expenses?.filter(e => filter === 'all' || e.status === filter) ?? [];
  const pending  = expenses?.filter(e => e.status === 'pending').length ?? 0;
  const total    = expenses?.reduce((s, e) => e.status === 'approved' ? s + e.amount : s, 0) ?? 0;

  return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader
        title="SmartSpend 💰"
        subtitle="Imprest Requests"
        right={
          !isMD ? (
            <button onClick={() => setOpen(true)} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Plus size={13} /> New
            </button>
          ) : null
        }
      />

      {/* Stats strip */}
      <div className="px-5 py-3 bg-trust/5 border-b border-border flex gap-4">
        {[
          { l: 'Requests', v: String(expenses?.length ?? 0) },
          { l: 'Pending',  v: String(pending),                c: pending > 0 ? 'text-warning font-extrabold' : undefined },
          { l: 'Approved', v: formatNaira(total),              c: 'text-success font-extrabold' },
        ].map(s => (
          <div key={s.l} className="flex-1 text-center">
            <p className={`text-base font-extrabold text-ink ${s.c ?? ''}`}>{s.v}</p>
            <p className="text-[10px] text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="px-5 py-3 flex gap-2 border-b border-border bg-white overflow-x-auto">
        {(['all','pending','approved','declined'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filter === f ? 'bg-primary text-white border-primary' : 'border-border text-muted'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-5 py-4 flex flex-col gap-3">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
          : filtered.length === 0
          ? <EmptyState emoji="🧾" title="No requests" description="No expense requests match this filter." />
          : filtered.map(exp => <ExpenseCard key={exp.id} exp={exp} isMD={isMD} />)
        }
      </div>

      {/* Teacher new request sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="New Imprest Request 📋">
        <RequestForm onClose={() => setOpen(false)} />
      </BottomSheet>

      <BottomNav role={isMD ? 'md' : 'teacher'} />
    </div>
  );
}
