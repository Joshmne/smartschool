// lib/types.ts — Single source of truth for all domain types
import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────────────────
export type Role = 'teacher' | 'md' | 'bursar';

export interface User {
  id: string;
  name: string;
  role: Role;
  schoolId: string;
  schoolName: string;
  phone: string;
  avatarInitials: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

// ─── School ──────────────────────────────────────────────────────────────────
export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

// ─── Students ────────────────────────────────────────────────────────────────
export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  photoUrl?: string;
  parentPhone: string;
  feesPaid: boolean;
  feesOwed: number;
}

// ─── Scores / Academic ───────────────────────────────────────────────────────
export interface ScoreEntry {
  studentId: string;
  subjectId: string;
  termId: string;
  ca1: number;        // max 20
  ca2: number;        // max 20
  exam: number;       // max 60
  total: number;      // computed: ca1+ca2+exam
  grade: string;      // A1–F9
  position: number;
}

export interface Subject {
  id: string;
  name: string;
  emoji: string;
  classId: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  teacherId: string;
  studentCount: number;
  arm?: string;
}

export interface Term {
  id: string;
  name: string;       // 'CA1' | 'CA2' | 'Exam'
  session: string;    // '2024/2025'
  isActive: boolean;
}

// ─── Results / Report Cards ──────────────────────────────────────────────────
export interface ReportCard {
  studentId: string;
  studentName: string;
  className: string;
  termId: string;
  scores: ScoreEntry[];
  overallTotal: number;
  overallAverage: number;
  position: number;
  outOf: number;
  teacherRemark: string;
  principalRemark: string;
  pdfUrl?: string;
  isLocked: boolean;
  feesOwed: number;
}

// ─── Fees / Finance ──────────────────────────────────────────────────────────
export interface FeeRecord {
  studentId: string;
  studentName: string;
  className: string;
  termId: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  lastPaymentDate?: string;
  paymentRef?: string;
}

export interface NetCashSummary {
  totalExpected: number;
  totalCollected: number;
  totalExpenses: number;
  disposableCash: number;
  recoveryPercent: number;
  resultGateRecovered: number;
  lastUpdated: string;
}

// ─── Expenses / SmartSpend ───────────────────────────────────────────────────
export type ExpenseStatus = 'pending' | 'approved' | 'declined';

export interface Expense {
  id: string;
  amount: number;
  purpose: string;
  category: string;
  requesterId: string;
  requesterName: string;
  receiptPhotoUrl?: string;
  gpsLocation?: string;
  status: ExpenseStatus;
  createdAt: string;
  approvedAt?: string;
  approvedById?: string;
}

// ─── Behavioral Pulse ────────────────────────────────────────────────────────
export interface PulseRating {
  studentId: string;
  weekOf: string;        // ISO date of Friday
  neatness: number;      // 1–5
  conduct: number;       // 1–5
  punctuality: number;   // 1–5
  submittedAt?: string;
}

export interface PulseSubmission {
  classId: string;
  teacherId: string;
  weekOf: string;
  ratings: PulseRating[];
}

// ─── Messages / Comms ────────────────────────────────────────────────────────
export type MessageType = 'fee_reminder' | 'newsletter' | 'pulse_report' | 'result_alert' | 'announcement';

export interface Message {
  id: string;
  type: MessageType;
  title: string;
  body: string;
  sentAt: string;
  recipientCount: number;
  deliveredCount: number;
  isRead: boolean;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface TrendPoint {
  term: string;
  [subject: string]: number | string;
}

export interface HeatmapRow {
  subject: string;
  scores: number[];
  studentNames: string[];
}

export interface ClassComparison {
  subject: string;
  studentScore: number;
  classAverage: number;
  diff: number;
}

export interface StudentAnalytics {
  student: Student;
  trend: TrendPoint[];
  heatmap: HeatmapRow[];
  classComparison: ClassComparison[];
  recommendation: string;
  strengthSubject: string;
  improvementSubject: string;
  overallRank: number;
  overallOutOf: number;
}

// ─── Offline Sync ────────────────────────────────────────────────────────────
export interface SyncQueueItem {
  id: string;
  type: 'score' | 'pulse' | 'expense';
  payload: unknown;
  createdAt: number;
  retries: number;
}

// ─── API Response wrappers ───────────────────────────────────────────────────
export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError    { success: false; error: string; code?: string }
export type ApiResponse<T>   = ApiSuccess<T> | ApiError;

// ─── Zod Schemas (validation) ────────────────────────────────────────────────
export const LoginSchema = z.object({
  phone:  z.string().min(10, 'Enter a valid phone number').max(14),
  pin:    z.string().min(4, 'PIN must be at least 4 digits').max(8),
  role:   z.enum(['teacher', 'md', 'bursar']),
});

export const ScoreSchema = z.object({
  ca1:  z.number().min(0).max(20),
  ca2:  z.number().min(0).max(20),
  exam: z.number().min(0).max(60),
});

export const PulseSchema = z.object({
  neatness:    z.number().min(1).max(5),
  conduct:     z.number().min(1).max(5),
  punctuality: z.number().min(1).max(5),
});

export const ExpenseSchema = z.object({
  amount:   z.number().min(100, 'Amount must be at least ₦100'),
  purpose:  z.string().min(3),
  category: z.string().min(1),
});

export type LoginInput   = z.infer<typeof LoginSchema>;
export type ScoreInput   = z.infer<typeof ScoreSchema>;
export type PulseInput   = z.infer<typeof PulseSchema>;
export type ExpenseInput = z.infer<typeof ExpenseSchema>;
