// app/api/pulse/route.ts
import { NextRequest } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { pulseRatings, students } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary, genId } from '@/lib/utils/api';
import { sendBulkWhatsApp, WhatsAppTemplates } from '@/lib/utils/whatsapp';
import { z } from 'zod';

const SubmitPulseSchema = z.object({
  classId: z.string(),
  weekOf:  z.string(),
  ratings: z.array(z.object({
    studentId:   z.string(),
    neatness:    z.number().min(1).max(5),
    conduct:     z.number().min(1).max(5),
    punctuality: z.number().min(1).max(5),
  })),
});

export const GET = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();
  const { searchParams } = req.nextUrl;
  const classId = searchParams.get('classId');
  const weekOf  = searchParams.get('weekOf');
  if (!classId || !weekOf) return err('classId and weekOf required', 400);

  const db      = getDb();
  const classStudents = await db.select({ id: students.id }).from(students).where(eq(students.classId, classId));
  const studentIds    = classStudents.map(s => s.id);
  if (!studentIds.length) return ok([]);

  const rows = await db
    .select()
    .from(pulseRatings)
    .where(and(
      inArray(pulseRatings.studentId, studentIds),
      eq(pulseRatings.weekOf, weekOf),
    ));

  return ok(rows);
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  const body    = await req.json();
  const parsed  = SubmitPulseSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 422);

  const { ratings, weekOf } = parsed.data;
  const db = getDb();
  let submitted = 0;

  for (const r of ratings) {
    const id = `${r.studentId}_${weekOf}`;
    await db.insert(pulseRatings).values({
      id,
      studentId:   r.studentId,
      teacherId:   session.user.id,
      weekOf,
      neatness:    r.neatness,
      conduct:     r.conduct,
      punctuality: r.punctuality,
    }).onConflictDoUpdate({
      target: pulseRatings.id,
      set:    { neatness: r.neatness, conduct: r.conduct, punctuality: r.punctuality, submittedAt: new Date().toISOString() },
    });
    submitted++;
  }

  // Fetch student details for WhatsApp notifications
  const allStudents = await db
    .select({ id: students.id, name: students.name, parentPhone: students.parentPhone })
    .from(students)
    .where(inArray(students.id, ratings.map(r => r.studentId)));

  // Dispatch WhatsApp pulse reports to all parents (fire-and-forget)
  const session = await requireSession();
  const messages = allStudents.map(s => {
    const r = ratings.find(r => r.studentId === s.id);
    if (!r || !s.parentPhone) return null;
    return {
      to:   s.parentPhone,
      body: WhatsAppTemplates.pulseReport({
        parentName:  'Parent',
        studentName: s.name,
        weekOf:      new Date(weekOf).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }),
        neatness:    r.neatness,
        conduct:     r.conduct,
        punctuality: r.punctuality,
        teacherName: session.user.name,
      }),
    };
  }).filter((m): m is NonNullable<typeof m> => m !== null);

  sendBulkWhatsApp(messages).catch(e => console.error('[WhatsApp] Pulse batch failed:', e));

  return ok({ submitted, message: `${submitted} parents notified via WhatsApp 📲` });
});
