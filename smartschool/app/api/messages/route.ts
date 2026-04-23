// app/api/messages/route.ts
import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { messages, students } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary, genId } from '@/lib/utils/api';
import { sendBulkWhatsApp, WhatsAppTemplates } from '@/lib/utils/whatsapp';
import { z } from 'zod';

const SendMessageSchema = z.object({
  type:     z.enum(['fee_reminder','newsletter','pulse_report','result_alert','announcement']),
  title:    z.string().min(3).max(120),
  body:     z.string().min(5).max(1000),
  classIds: z.array(z.string()).optional(),
});

export const GET = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  const db      = getDb();
  const rows    = await db
    .select()
    .from(messages)
    .where(eq(messages.schoolId, session.user.schoolId))
    .orderBy(desc(messages.sentAt))
    .limit(50);
  return ok(rows);
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  const body    = await req.json();
  const parsed  = SendMessageSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0].message, 422);

  const db = getDb();

  // Count recipients
  let recipientCount = 0;
  if (parsed.data.classIds?.length) {
    for (const classId of parsed.data.classIds) {
      const classStudents = await db.select({ id: students.id }).from(students).where(eq(students.classId, classId));
      recipientCount += classStudents.length;
    }
  } else {
    const allStudents = await db.select({ id: students.id }).from(students).where(eq(students.schoolId, session.user.schoolId));
    recipientCount = allStudents.length;
  }

  const id = genId('msg');
  await db.insert(messages).values({
    id,
    schoolId:       session.user.schoolId,
    senderId:       session.user.id,
    type:           parsed.data.type,
    title:          parsed.data.title,
    body:           parsed.data.body,
    recipientCount,
    deliveredCount: 0,
  });

  // Fire-and-forget WhatsApp broadcast to all parent phones
  const parentPhones = allStudents
    .map(s => s.parentPhone)
    .filter((p): p is string => !!p);

  const waMessages = parentPhones.map(phone => ({
    to:   phone,
    body: WhatsAppTemplates.newsletter({
      schoolName: session.user.schoolName,
      title:      parsed.data.title,
      body:       parsed.data.body,
    }),
  }));

  sendBulkWhatsApp(waMessages)
    .then(({ sent, failed }) => {
      // Update delivered count asynchronously
      if (sent > 0) {
        getDb().update(messages).set({ deliveredCount: sent }).where(eq(messages.id, id))
          .catch(() => {});
      }
      if (failed > 0) console.warn(`[WhatsApp] ${failed} messages failed to deliver`);
    })
    .catch(e => console.error('[WhatsApp] Broadcast failed:', e));

  return ok({ id, recipientCount }, 201);
});
