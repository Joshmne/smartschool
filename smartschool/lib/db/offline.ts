// lib/db/offline.ts — Dexie (IndexedDB) for offline-first sync
import Dexie, { type Table } from 'dexie';
import type { ScoreEntry, PulseRating, Expense, SyncQueueItem, Student, Subject, ClassInfo } from '@/lib/types';

export interface LocalScore {
  id: string;          // `${studentId}_${subjectId}_${termId}`
  studentId: string;
  subjectId: string;
  termId: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  isDirty: boolean;    // needs sync
  updatedAt: number;
}

export interface LocalPulse {
  id: string;          // `${studentId}_${weekOf}`
  studentId: string;
  weekOf: string;
  neatness: number;
  conduct: number;
  punctuality: number;
  isDirty: boolean;
  submittedAt: number;
}

export class SmartSchoolDB extends Dexie {
  scores!:     Table<LocalScore>;
  pulses!:     Table<LocalPulse>;
  students!:   Table<Student>;
  subjects!:   Table<Subject>;
  classes!:    Table<ClassInfo>;
  syncQueue!:  Table<SyncQueueItem>;

  constructor() {
    super('SmartSchoolDB');
    this.version(1).stores({
      scores:    'id, studentId, subjectId, termId, isDirty, updatedAt',
      pulses:    'id, studentId, weekOf, isDirty',
      students:  'id, classId',
      subjects:  'id, classId',
      classes:   'id',
      syncQueue: 'id, type, createdAt',
    });
  }
}

// Singleton
let _db: SmartSchoolDB | null = null;

export function getOfflineDb(): SmartSchoolDB {
  if (typeof window === 'undefined') throw new Error('Offline DB only available client-side');
  if (!_db) _db = new SmartSchoolDB();
  return _db;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export async function upsertScore(score: LocalScore) {
  const db = getOfflineDb();
  await db.scores.put(score);
}

export async function getDirtyScores(): Promise<LocalScore[]> {
  const db = getOfflineDb();
  return db.scores.where('isDirty').equals(1).toArray();
}

export async function markScoreClean(id: string) {
  const db = getOfflineDb();
  await db.scores.update(id, { isDirty: false });
}

export async function upsertPulse(pulse: LocalPulse) {
  const db = getOfflineDb();
  await db.pulses.put(pulse);
}

export async function getDirtyPulses(): Promise<LocalPulse[]> {
  const db = getOfflineDb();
  return db.pulses.where('isDirty').equals(1).toArray();
}

export async function seedStudents(students: Student[]) {
  const db = getOfflineDb();
  await db.students.bulkPut(students);
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const db = getOfflineDb();
  return db.students.where('classId').equals(classId).toArray();
}
