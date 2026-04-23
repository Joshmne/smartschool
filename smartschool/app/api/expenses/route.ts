// app/api/expenses/route.ts
import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { expenses, users } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary, genId } from '@/lib/utils/api';
import { notifyMDNewExpense } from '@/lib/utils/notifications';

export const GET = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();
  const db      = getDb();

  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.schoolId, session.user.schoolId))
    .orderBy(desc(expenses.createdAt))
    .limit(50);

  return ok(rows);
});

export const POST = withErrorBoundary(async (req: NextRequest) => {
  const session = await requireSession();

  let amount: number, purpose: string, category: string, gpsLocation: string | undefined;
  let receiptPhotoUrl: string | undefined;

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    amount      = Number(form.get('amount'));
    purpose     = String(form.get('purpose') ?? '');
    category    = String(form.get('category') ?? '');
    gpsLocation = form.get('gpsLocation') as string | undefined;
    // In prod: upload receipt to Cloudflare R2 / S3
    const file = form.get('receipt') as File | null;
    if (file) receiptPhotoUrl = `/receipts/${genId('receipt')}.jpg`;
  } else {
    const body = await req.json();
    ({ amount, purpose, category, gpsLocation } = body);
  }

  if (!amount || amount < 100) return err('Amount must be at least ₦100', 422);
  if (!purpose || !category)   return err('Purpose and category required', 422);

  const db = getDb();
  const id = genId('exp');

  await db.insert(expenses).values({
    id,
    schoolId:        session.user.schoolId,
    requesterId:     session.user.id,
    amount,
    purpose,
    category,
    gpsLocation,
    receiptPhotoUrl,
    status:          'pending',
  });

  // Notify MD via WhatsApp (fire-and-forget)
  const mdPhone = process.env.MD_WHATSAPP_PHONE;
  if (mdPhone) {
    notifyMDNewExpense({
      mdPhone,
      requesterName: session.user.name,
      amount:        Number(amount),
      purpose:       String(purpose),
    }).catch(e => console.error('[Notify] MD expense alert failed:', e));
  }

  return ok({ id, message: 'Request submitted. MD notified.' }, 201);
});
