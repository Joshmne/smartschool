// lib/db/schema.ts — Drizzle ORM schema (LibSQL / Turso)
import { sql } from 'drizzle-orm';
import {
  sqliteTable, text, integer, real, index, uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ─── Schools ─────────────────────────────────────────────────────────────────
export const schools = sqliteTable('schools', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  address:   text('address').notNull(),
  phone:     text('phone').notNull().unique(),
  logoUrl:   text('logo_url'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:         text('id').primaryKey(),
  schoolId:   text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name:       text('name').notNull(),
  phone:      text('phone').notNull(),
  pinHash:    text('pin_hash').notNull(),
  role:       text('role', { enum: ['teacher', 'md', 'bursar'] }).notNull(),
  isActive:   integer('is_active', { mode: 'boolean' }).default(true),
  createdAt:  text('created_at').default(sql`(datetime('now'))`),
}, (t) => ({
  phoneSchoolIdx: uniqueIndex('users_phone_school').on(t.phone, t.schoolId),
}));

// ─── Classes ─────────────────────────────────────────────────────────────────
export const classes = sqliteTable('classes', {
  id:           text('id').primaryKey(),
  schoolId:     text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  teacherId:    text('teacher_id').references(() => users.id),
  name:         text('name').notNull(),   // e.g. "Primary 3"
  arm:          text('arm'),              // e.g. "A"
  studentCount: integer('student_count').default(0),
});

// ─── Students ────────────────────────────────────────────────────────────────
export const students = sqliteTable('students', {
  id:          text('id').primaryKey(),
  schoolId:    text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId:     text('class_id').notNull().references(() => classes.id),
  name:        text('name').notNull(),
  photoUrl:    text('photo_url'),
  parentPhone: text('parent_phone').notNull(),
  admNo:       text('adm_no'),
  isActive:    integer('is_active', { mode: 'boolean' }).default(true),
  createdAt:   text('created_at').default(sql`(datetime('now'))`),
}, (t) => ({
  classIdx:  index('students_class').on(t.classId),
  schoolIdx: index('students_school').on(t.schoolId),
}));

// ─── Terms ───────────────────────────────────────────────────────────────────
export const terms = sqliteTable('terms', {
  id:        text('id').primaryKey(),
  schoolId:  text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),      // "First Term"
  session:   text('session').notNull(),   // "2024/2025"
  isActive:  integer('is_active', { mode: 'boolean' }).default(false),
  startDate: text('start_date'),
  endDate:   text('end_date'),
});

// ─── Subjects ────────────────────────────────────────────────────────────────
export const subjects = sqliteTable('subjects', {
  id:        text('id').primaryKey(),
  schoolId:  text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId:   text('class_id').notNull().references(() => classes.id),
  name:      text('name').notNull(),
  emoji:     text('emoji').default('📚'),
  orderIdx:  integer('order_idx').default(0),
});

// ─── Scores ──────────────────────────────────────────────────────────────────
export const scores = sqliteTable('scores', {
  id:         text('id').primaryKey(),
  studentId:  text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  subjectId:  text('subject_id').notNull().references(() => subjects.id),
  termId:     text('term_id').notNull().references(() => terms.id),
  teacherId:  text('teacher_id').notNull().references(() => users.id),
  ca1:        real('ca1').default(0),
  ca2:        real('ca2').default(0),
  exam:       real('exam').default(0),
  total:      real('total').generatedAlwaysAs(sql`ca1 + ca2 + exam`),
  updatedAt:  text('updated_at').default(sql`(datetime('now'))`),
}, (t) => ({
  uniqueScore:  uniqueIndex('scores_unique').on(t.studentId, t.subjectId, t.termId),
  studentIdx:   index('scores_student').on(t.studentId),
  subjectIdx:   index('scores_subject').on(t.subjectId),
}));

// ─── Fees ────────────────────────────────────────────────────────────────────
export const fees = sqliteTable('fees', {
  id:              text('id').primaryKey(),
  studentId:       text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  termId:          text('term_id').notNull().references(() => terms.id),
  amountDue:       real('amount_due').notNull(),
  amountPaid:      real('amount_paid').default(0),
  lastPaymentDate: text('last_payment_date'),
  paymentRef:      text('payment_ref'),
  paymentChannel:  text('payment_channel'),  // 'paystack' | 'flutterwave' | 'cash' | 'bank'
  updatedAt:       text('updated_at').default(sql`(datetime('now'))`),
}, (t) => ({
  uniqueFee: uniqueIndex('fees_unique').on(t.studentId, t.termId),
}));

// ─── Expenses / SmartSpend ───────────────────────────────────────────────────
export const expenses = sqliteTable('expenses', {
  id:             text('id').primaryKey(),
  schoolId:       text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  requesterId:    text('requester_id').notNull().references(() => users.id),
  amount:         real('amount').notNull(),
  purpose:        text('purpose').notNull(),
  category:       text('category').notNull(),
  receiptPhotoUrl: text('receipt_photo_url'),
  gpsLocation:    text('gps_location'),
  status:         text('status', { enum: ['pending', 'approved', 'declined'] }).default('pending'),
  approvedById:   text('approved_by_id').references(() => users.id),
  approvedAt:     text('approved_at'),
  createdAt:      text('created_at').default(sql`(datetime('now'))`),
}, (t) => ({
  schoolIdx:  index('expenses_school').on(t.schoolId),
  statusIdx:  index('expenses_status').on(t.status),
}));

// ─── Behavioral Pulse ────────────────────────────────────────────────────────
export const pulseRatings = sqliteTable('pulse_ratings', {
  id:          text('id').primaryKey(),
  studentId:   text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  teacherId:   text('teacher_id').notNull().references(() => users.id),
  weekOf:      text('week_of').notNull(),   // ISO date of Friday
  neatness:    integer('neatness').notNull(),
  conduct:     integer('conduct').notNull(),
  punctuality: integer('punctuality').notNull(),
  submittedAt: text('submitted_at').default(sql`(datetime('now'))`),
}, (t) => ({
  uniquePulse: uniqueIndex('pulse_unique').on(t.studentId, t.weekOf),
}));

// ─── Messages ────────────────────────────────────────────────────────────────
export const messages = sqliteTable('messages', {
  id:             text('id').primaryKey(),
  schoolId:       text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  senderId:       text('sender_id').references(() => users.id),
  type:           text('type').notNull(),
  title:          text('title').notNull(),
  body:           text('body').notNull(),
  recipientCount: integer('recipient_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  sentAt:         text('sent_at').default(sql`(datetime('now'))`),
});

// ─── Sync Queue (offline-first) ──────────────────────────────────────────────
export const syncQueue = sqliteTable('sync_queue', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  type:      text('type').notNull(),
  payload:   text('payload').notNull(),  // JSON
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  retries:   integer('retries').default(0),
});
