// lib/store.ts — Zustand global state (auth + UI)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Role } from './types';

// ─── Auth Store ───────────────────────────────────────────────────────────────
interface AuthState {
  user:      User | null;
  token:     string | null;
  isLoading: boolean;
  setUser:   (user: User, token: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:      null,
      token:     null,
      isLoading: false,
      setUser:   (user, token) => set({ user, token }),
      clearUser: () => set({ user: null, token: null }),
    }),
    {
      name:    'ss_auth',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? sessionStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })),
    }
  )
);

// ─── UI Store ────────────────────────────────────────────────────────────────
interface UIState {
  isOffline:        boolean;
  pendingSyncCount: number;
  activeClassId:    string | null;
  activeTermId:     string | null;
  activeSubjectId:  string | null;
  setOffline:       (v: boolean) => void;
  setPendingSync:   (n: number) => void;
  setActiveClass:   (id: string) => void;
  setActiveTerm:    (id: string) => void;
  setActiveSubject: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOffline:        false,
  pendingSyncCount: 0,
  activeClassId:    null,
  activeTermId:     null,
  activeSubjectId:  null,
  setOffline:       (v)  => set({ isOffline: v }),
  setPendingSync:   (n)  => set({ pendingSyncCount: n }),
  setActiveClass:   (id) => set({ activeClassId: id }),
  setActiveTerm:    (id) => set({ activeTermId: id }),
  setActiveSubject: (id) => set({ activeSubjectId: id }),
}));

// ─── Score draft store (offline-first editing) ────────────────────────────────
interface ScoreDraft {
  [key: string]: { ca1: number; ca2: number; exam: number };  // key: `${studentId}_${subjectId}`
}

interface ScoreDraftState {
  drafts:     ScoreDraft;
  isDirty:    boolean;
  lastSaved:  number | null;
  setScore:   (studentId: string, subjectId: string, field: 'ca1'|'ca2'|'exam', value: number) => void;
  clearDraft: () => void;
  markSaved:  () => void;
}

export const useScoreDraftStore = create<ScoreDraftState>()(
  persist(
    (set, get) => ({
      drafts:    {},
      isDirty:   false,
      lastSaved: null,
      setScore:  (studentId, subjectId, field, value) => {
        const key = `${studentId}_${subjectId}`;
        const existing = get().drafts[key] ?? { ca1: 0, ca2: 0, exam: 0 };
        set({
          drafts:  { ...get().drafts, [key]: { ...existing, [field]: value } },
          isDirty: true,
        });
      },
      clearDraft: () => set({ drafts: {}, isDirty: false }),
      markSaved:  () => set({ isDirty: false, lastSaved: Date.now() }),
    }),
    {
      name:    'ss_score_drafts',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })),
    }
  )
);
