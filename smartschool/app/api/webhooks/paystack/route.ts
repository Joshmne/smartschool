// app/api/webhooks/paystack/route.ts — Paystack payment webhook
// Handles: charge.success, transfer.success events
// Must NOT require auth — Paystack calls this directly

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { fees, students, terms } from '@/lib/db/schema';
import { verifyPaystackWebhook } from '@/lib/utils/paystack';
import { sendWhatsApp, WhatsAppTemplates } from '@/lib/utils/whatsapp';
import { notifyMDNewPayment } from '@/lib/utils/notifications';
import { formatNaira } from '@/lib/utils/api';

// Paystack sends JSON with this shape for charge.success
interface PaystackEvent {
  event: string;
  data: {
    reference:   string;
    amount:      number;   // kobo
    status:      string;
    paid_at:     string;
    customer:    { email: string; phone: string };
    metadata: {
      studentId?:   string;
      termId?:      string;
      schoolId?:    string;
      parentPhone?: string;
      parentName?:  string;
      studentName?: string;
    };
  };
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  // Verify webhook authenticity
  if (!verifyPaystackWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle successful charges
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true });
  }

  const { reference, amount, metadata } = event.data;
  const { studentId, termId, parentPhone, parentName, studentName } = metadata ?? {};

  if (!studentId || !termId) {
    console.warn('[Webhook] Missing studentId/termId in metadata for ref:', reference);
    return NextResponse.json({ received: true });
  }

  const db = getDb();
  const amountNaira = amount / 100;

  try {
    // Update fee record
    await db
      .update(fees)
      .set({
        amountPaid:      amountNaira,
        paymentRef:      reference,
        paymentChannel:  'paystack',
        lastPaymentDate: new Date().toISOString(),
      })
      .where(and(eq(fees.studentId, studentId), eq(fees.termId, termId)));

    // Get student + school info for notifications
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    // WhatsApp receipt to parent
    if (parentPhone ?? student?.parentPhone) {
      await sendWhatsApp({
        to:   parentPhone ?? student.parentPhone,
        body: WhatsAppTemplates.resultUnlocked({
          parentName:  parentName ?? 'Parent',
          studentName: studentName ?? student?.name ?? 'your ward',
          schoolName:  'Sunshine Academy',
          amount:      amountNaira,
          ref:         reference,
        }),
      });
    }

    // Notify MD of new payment
    const mdPhone = process.env.MD_WHATSAPP_PHONE;
    if (mdPhone) {
      await notifyMDNewPayment({
        schoolId:    metadata.schoolId ?? '',
        studentName: studentName ?? student?.name ?? 'A student',
        amount:      amountNaira,
        mdPhone,
      });
    }

    console.log(`[Webhook] Payment confirmed: ${formatNaira(amountNaira)} for student ${studentId}`);
  } catch (e) {
    console.error('[Webhook] Failed to process payment:', e);
    // Return 200 anyway — Paystack will retry on non-2xx
  }

  return NextResponse.json({ received: true });
}
