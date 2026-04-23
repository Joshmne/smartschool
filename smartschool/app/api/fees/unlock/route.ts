// app/api/fees/unlock/route.ts — Result Gate unlock
import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { fees, students } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, parseBody, withErrorBoundary } from '@/lib/utils/api';
import { sendWhatsApp, WhatsAppTemplates } from '@/lib/utils/whatsapp';
import { z } from 'zod';

const UnlockSchema = z.object({
  studentId:  z.string(),
  termId:     z.string(),
  paymentRef: z.string().min(3),
  channel:    z.enum(['paystack', 'flutterwave', 'bank', 'cash']),
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  await requireSession(); // parents can also unlock — relaxed auth here

  const parsed = await parseBody(req, UnlockSchema);
  if ('error' in parsed) return parsed.error;
  const { studentId, termId, paymentRef, channel } = parsed.data;

  const db = getDb();
  const [feeRecord] = await db
    .select()
    .from(fees)
    .where(and(eq(fees.studentId, studentId), eq(fees.termId, termId)))
    .limit(1);

  if (!feeRecord) return err('Fee record not found', 404);

  const balance = feeRecord.amountDue - (feeRecord.amountPaid ?? 0);
  if (balance <= 0) return ok({ unlocked: true, message: 'Already fully paid' });

  // Mark as fully paid (Paystack/Flutterwave webhook would normally do this)
  await db
    .update(fees)
    .set({
      amountPaid:      feeRecord.amountDue,
      paymentRef,
      paymentChannel:  channel,
      lastPaymentDate: new Date().toISOString(),
    })
    .where(and(eq(fees.studentId, studentId), eq(fees.termId, termId)));

  // Send WhatsApp receipt to parent
  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (student?.parentPhone) {
    await sendWhatsApp({
      to:   student.parentPhone,
      body: WhatsAppTemplates.resultUnlocked({
        parentName:  'Parent',
        studentName: student.name,
        schoolName:  'Sunshine Academy',
        amount:      balance,
        ref:         paymentRef,
      }),
    }).catch(e => console.error('[WhatsApp] Receipt failed:', e));
  }

  return ok({ unlocked: true, message: 'Result Gate opened. WhatsApp receipt sent.' });
});
