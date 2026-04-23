// lib/hooks/useQueries.ts — All React Query hooks
'use client';
import {
  useQuery, useMutation, useQueryClient, UseQueryOptions,
} from '@tanstack/react-query';
import type {
  Student, Subject, ClassInfo, Term, ScoreEntry, ReportCard,
  NetCashSummary, Expense, Message, StudentAnalytics, PulseRating,
  FeeRecord, ApiResponse,
} from '@/lib/types';
import toast from 'react-hot-toast';

// ─── API fetch wrapper with error handling ────────────────────────────────────
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data;
}

// ─── Query keys (type-safe, centralized) ─────────────────────────────────────
export const QK = {
  students:    (classId: string) => ['students', classId] as const,
  subjects:    (classId: string) => ['subjects', classId] as const,
  scores:      (classId: string, subjectId: string, termId: string) => ['scores', classId, subjectId, termId] as const,
  results:     (classId: string, termId: string) => ['results', classId, termId] as const,
  netCash:     () => ['net-cash'] as const,
  expenses:    () => ['expenses'] as const,
  messages:    () => ['messages'] as const,
  analytics:   (studentId: string) => ['analytics', studentId] as const,
  fees:        (classId: string, termId: string) => ['fees', classId, termId] as const,
  pulses:      (classId: string, weekOf: string) => ['pulses', classId, weekOf] as const,
  classes:     () => ['classes'] as const,
  terms:       () => ['terms'] as const,
} as const;

// ─── Students ─────────────────────────────────────────────────────────────────
export function useStudents(classId: string) {
  return useQuery({
    queryKey: QK.students(classId),
    queryFn:  () => apiFetch<Student[]>(`/api/students?classId=${classId}`),
    enabled:  !!classId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
export function useSubjects(classId: string) {
  return useQuery({
    queryKey: QK.subjects(classId),
    queryFn:  () => apiFetch<Subject[]>(`/api/subjects?classId=${classId}`),
    enabled:  !!classId,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Scores ──────────────────────────────────────────────────────────────────
export function useScores(classId: string, subjectId: string, termId: string) {
  return useQuery({
    queryKey: QK.scores(classId, subjectId, termId),
    queryFn:  () => apiFetch<ScoreEntry[]>(`/api/scores?classId=${classId}&subjectId=${subjectId}&termId=${termId}`),
    enabled:  !!classId && !!subjectId && !!termId,
  });
}

export function useSaveScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { scores: Partial<ScoreEntry>[]; termId: string }) =>
      apiFetch<{ saved: number }>('/api/scores', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Scores saved ✓', { icon: '✅' });
      qc.invalidateQueries({ queryKey: ['scores'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Results / Report Cards ───────────────────────────────────────────────────
export function useResults(classId: string, termId: string) {
  return useQuery({
    queryKey: QK.results(classId, termId),
    queryFn:  () => apiFetch<ReportCard[]>(`/api/reports?classId=${classId}&termId=${termId}`),
    enabled:  !!classId && !!termId,
  });
}

export function useGenerateReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { classId: string; termId: string }) =>
      apiFetch<{ generated: number }>('/api/reports/generate', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      toast.success(`${data.generated} report cards generated! 🎉`);
      qc.invalidateQueries({ queryKey: ['results'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnlockResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { studentId: string; termId: string; paymentRef: string; channel: string }) =>
      apiFetch<{ unlocked: boolean }>('/api/fees/unlock', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Result unlocked! 🎉 Receipt sent via WhatsApp');
      qc.invalidateQueries({ queryKey: ['results'] });
      qc.invalidateQueries({ queryKey: ['fees'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Net Cash / MD Dashboard ──────────────────────────────────────────────────
export function useNetCash() {
  return useQuery({
    queryKey: QK.netCash(),
    queryFn:  () => apiFetch<NetCashSummary>('/api/fees/summary'),
    refetchInterval: 10_000, // live refresh every 10s
  });
}

// ─── Fees ────────────────────────────────────────────────────────────────────
export function useFees(classId: string, termId: string) {
  return useQuery({
    queryKey: QK.fees(classId, termId),
    queryFn:  () => apiFetch<FeeRecord[]>(`/api/fees?classId=${classId}&termId=${termId}`),
    enabled:  !!classId && !!termId,
  });
}

// ─── Expenses / SmartSpend ────────────────────────────────────────────────────
export function useExpenses() {
  return useQuery({
    queryKey: QK.expenses(),
    queryFn:  () => apiFetch<Expense[]>('/api/expenses'),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData) =>
      fetch('/api/expenses', { method: 'POST', body: payload }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Request submitted! MD notified 📲');
      qc.invalidateQueries({ queryKey: QK.expenses() });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approved' | 'declined' }) =>
      apiFetch<Expense>('/api/expenses/approve', { method: 'PATCH', body: JSON.stringify({ id, action }) }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'approved' ? 'Funds released ✅' : 'Request declined');
      qc.invalidateQueries({ queryKey: QK.expenses() });
      qc.invalidateQueries({ queryKey: QK.netCash() });
    },
  });
}

// ─── Pulse ───────────────────────────────────────────────────────────────────
export function usePulse(classId: string, weekOf: string) {
  return useQuery({
    queryKey: QK.pulses(classId, weekOf),
    queryFn:  () => apiFetch<PulseRating[]>(`/api/pulse?classId=${classId}&weekOf=${weekOf}`),
    enabled:  !!classId && !!weekOf,
  });
}

export function useSubmitPulse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { classId: string; weekOf: string; ratings: PulseRating[] }) =>
      apiFetch<{ submitted: number }>('/api/pulse', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      toast.success(`${data.submitted} parents notified! 🎉`);
      qc.invalidateQueries({ queryKey: ['pulses'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export function useMessages() {
  return useQuery({
    queryKey: QK.messages(),
    queryFn:  () => apiFetch<Message[]>('/api/messages'),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: string; title: string; body: string; classIds?: string[] }) =>
      apiFetch<Message>('/api/messages', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Message sent to all parents 📲');
      qc.invalidateQueries({ queryKey: QK.messages() });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export function useStudentAnalytics(studentId: string) {
  return useQuery({
    queryKey: QK.analytics(studentId),
    queryFn:  () => apiFetch<StudentAnalytics>(`/api/analytics/student?studentId=${studentId}`),
    enabled:  !!studentId,
    staleTime: 60_000,
  });
}

// ─── Classes & Terms (meta) ───────────────────────────────────────────────────
export function useClasses() {
  return useQuery({
    queryKey: QK.classes(),
    queryFn:  () => apiFetch<ClassInfo[]>('/api/classes'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTerms() {
  return useQuery({
    queryKey: QK.terms(),
    queryFn:  () => apiFetch<Term[]>('/api/terms'),
    staleTime: 30 * 60 * 1000,
  });
}
