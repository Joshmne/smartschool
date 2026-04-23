// scripts/seed.ts — Bootstrap a school for development/demo
// Run: npx tsx scripts/seed.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { hash } from 'bcryptjs';
import * as schema from '../lib/db/schema';
import { genId } from '../lib/utils/api';

const client = createClient({
  url:       process.env.TURSO_DATABASE_URL ?? 'file:./local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding SmartSchool database…\n');

  // ── School ─────────────────────────────────────────────────────────────────
  const schoolId = 'school_sunshine_001';
  await db.insert(schema.schools).values({
    id:      schoolId,
    name:    'Sunshine Academy',
    address: '14 Oba Adesida Road, Ikeja, Lagos',
    phone:   '08012345678',
  }).onConflictDoNothing();
  console.log('✅ School created');

  // ── Users ──────────────────────────────────────────────────────────────────
  const teacherPin = await hash('1234', 10);
  const mdPin      = await hash('9999', 10);

  await db.insert(schema.users).values([
    {
      id:       'user_teacher_ade',
      schoolId,
      name:     'Mr. Adeleke Olatunji',
      phone:    '08012345678',
      pinHash:  teacherPin,
      role:     'teacher',
      isActive: true,
    },
    {
      id:       'user_teacher_ngozi',
      schoolId,
      name:     'Mrs. Ngozi Eze',
      phone:    '08023456789',
      pinHash:  teacherPin,
      role:     'teacher',
      isActive: true,
    },
    {
      id:       'user_md_proprietress',
      schoolId,
      name:     'Dr. Funmi Adeyemi',
      phone:    '08099999999',
      pinHash:  mdPin,
      role:     'md',
      isActive: true,
    },
    {
      id:       'user_bursar_seun',
      schoolId,
      name:     'Mr. Seun Bursar',
      phone:    '08088888888',
      pinHash:  teacherPin,
      role:     'bursar',
      isActive: true,
    },
  ]).onConflictDoNothing();
  console.log('✅ Users created  (teacher PIN: 1234 | MD PIN: 9999)');

  // ── Classes ────────────────────────────────────────────────────────────────
  const classes = [
    { id: 'cls_p1', name: 'Primary 1', studentCount: 28 },
    { id: 'cls_p2', name: 'Primary 2', studentCount: 32 },
    { id: 'cls_p3', name: 'Primary 3', studentCount: 34 },
    { id: 'cls_p4', name: 'Primary 4', studentCount: 30 },
    { id: 'cls_p5', name: 'Primary 5', studentCount: 29 },
    { id: 'cls_p6', name: 'Primary 6', studentCount: 31 },
  ];

  await db.insert(schema.classes).values(
    classes.map(c => ({ ...c, schoolId, teacherId: 'user_teacher_ade', arm: 'A' }))
  ).onConflictDoNothing();
  console.log('✅ Classes created');

  // ── Active term ────────────────────────────────────────────────────────────
  await db.insert(schema.terms).values([
    { id: 'term_1_2025', schoolId, name: 'First Term',  session: '2024/2025', isActive: true,  startDate: '2024-09-09', endDate: '2024-12-13' },
    { id: 'term_2_2025', schoolId, name: 'Second Term', session: '2024/2025', isActive: false, startDate: '2025-01-13', endDate: '2025-04-11' },
    { id: 'term_3_2025', schoolId, name: 'Third Term',  session: '2024/2025', isActive: false, startDate: '2025-04-28', endDate: '2025-07-18' },
  ]).onConflictDoNothing();
  console.log('✅ Terms created');

  // ── Subjects for Primary 3 ─────────────────────────────────────────────────
  const subjectData = [
    { name: 'Mathematics',       emoji: '🔢' },
    { name: 'English Language',  emoji: '📚' },
    { name: 'Basic Science',     emoji: '🔬' },
    { name: 'Social Studies',    emoji: '🌍' },
    { name: 'Yoruba Language',   emoji: '🗣️' },
    { name: 'Agricultural Sci.', emoji: '🌱' },
    { name: 'Computer Science',  emoji: '💻' },
    { name: 'Physical Education',emoji: '🏃' },
    { name: 'Fine Arts',         emoji: '🎨' },
    { name: 'Music',             emoji: '🎵' },
  ];

  const subjects = subjectData.map((s, i) => ({
    id:       `sub_p3_${i + 1}`,
    schoolId,
    classId:  'cls_p3',
    name:     s.name,
    emoji:    s.emoji,
    orderIdx: i,
  }));

  await db.insert(schema.subjects).values(subjects).onConflictDoNothing();
  console.log('✅ Subjects created');

  // ── Students for Primary 3 ─────────────────────────────────────────────────
  const studentNames = [
    ['Adeola Bello',        '08031111111'],
    ['Chukwuemeka Johnson', '08032222222'],
    ['Fatima Abdullahi',    '08033333333'],
    ['James Okonkwo',       '08034444444'],
    ['Kemi Adeleke',        '08035555555'],
    ['Musa Ibrahim',        '08036666666'],
    ['Ngozi Obi',           '08037777777'],
    ['Tunde Fashola',       '08038888888'],
    ['Amina Hassan',        '08039999999'],
    ['David Eze',           '08041111111'],
    ['Chioma Peters',       '08042222222'],
    ['Yusuf Abubakar',      '08043333333'],
    ['Blessing Nwosu',      '08044444444'],
    ['Emmanuel Adeyemi',    '08045555555'],
    ['Hauwa Musa',          '08046666666'],
  ];

  const students = studentNames.map(([name, phone], i) => ({
    id:          `stu_p3_${i + 1}`,
    schoolId,
    classId:     'cls_p3',
    name,
    parentPhone: phone,
    admNo:       `ADM/2024/${String(i + 1).padStart(3, '0')}`,
    isActive:    true,
  }));

  await db.insert(schema.students).values(students).onConflictDoNothing();
  console.log(`✅ ${students.length} students created for Primary 3`);

  // ── Sample scores ──────────────────────────────────────────────────────────
  const sampleScores = students.flatMap((stu, si) =>
    subjects.slice(0, 5).map((sub, subIdx) => {
      const base = 55 + ((si * 7 + subIdx * 11) % 35);
      const ca1  = Math.min(20, Math.max(8,  Math.round(base * 0.20)));
      const ca2  = Math.min(20, Math.max(8,  Math.round(base * 0.20)));
      const exam = Math.min(60, Math.max(25, Math.round(base * 0.60)));
      return {
        id:        `${stu.id}_${sub.id}_term_1_2025`,
        studentId: stu.id,
        subjectId: sub.id,
        termId:    'term_1_2025',
        teacherId: 'user_teacher_ade',
        ca1, ca2, exam,
      };
    })
  );

  await db.insert(schema.scores).values(sampleScores).onConflictDoNothing();
  console.log(`✅ ${sampleScores.length} sample scores inserted`);

  // ── Sample fees ────────────────────────────────────────────────────────────
  const fees = students.map((stu, i) => ({
    id:         `fee_${stu.id}_term_1_2025`,
    studentId:  stu.id,
    termId:     'term_1_2025',
    amountDue:  25000,
    amountPaid: i % 3 === 0 ? 0 : i % 3 === 1 ? 25000 : 12500,
  }));

  await db.insert(schema.fees).values(fees).onConflictDoNothing();
  console.log('✅ Sample fee records created');

  // ── Sample expenses ────────────────────────────────────────────────────────
  await db.insert(schema.expenses).values([
    {
      id: 'exp_001', schoolId, requesterId: 'user_teacher_ade',
      amount: 45000, purpose: 'Generator fuel for the week', category: 'Diesel / Generator',
      status: 'approved', approvedById: 'user_md_proprietress',
      approvedAt: new Date().toISOString(),
    },
    {
      id: 'exp_002', schoolId, requesterId: 'user_teacher_ngozi',
      amount: 12500, purpose: 'Exercise books & pencils', category: 'Stationery',
      status: 'pending',
    },
    {
      id: 'exp_003', schoolId, requesterId: 'user_teacher_ade',
      amount: 78000, purpose: '6 new classroom chairs', category: 'Repairs & Maintenance',
      status: 'approved', approvedById: 'user_md_proprietress',
      approvedAt: new Date().toISOString(),
    },
  ]).onConflictDoNothing();
  console.log('✅ Sample expenses created');

  // ── Sample messages ────────────────────────────────────────────────────────
  await db.insert(schema.messages).values([
    {
      id: 'msg_001', schoolId, senderId: 'user_teacher_ade',
      type: 'fee_reminder', title: 'Term 1 Fee Reminder',
      body: 'Dear Parent, kindly clear outstanding Term 1 fees to access your ward\'s report card. Thank you.',
      recipientCount: 34, deliveredCount: 32,
    },
    {
      id: 'msg_002', schoolId, senderId: 'user_teacher_ade',
      type: 'newsletter', title: 'Sports Day – Friday 13th Dec',
      body: 'Sports Day holds this Friday. Students should come in house colours. Gates open 8am.',
      recipientCount: 180, deliveredCount: 178,
    },
  ]).onConflictDoNothing();
  console.log('✅ Sample messages created');

  console.log('\n🎉 Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Teacher login:  08012345678  PIN: 1234');
  console.log('  MD login:       08099999999  PIN: 9999');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seed().catch(e => { console.error('❌ Seed failed:', e); process.exit(1); });
