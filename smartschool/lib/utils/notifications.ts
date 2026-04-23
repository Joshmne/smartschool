// lib/utils/notifications.ts — Web Push + FCM for MD real-time alerts
// Enables: "New payment received", "New expense request", "System alerts"

export interface PushPayload {
  title:   string;
  body:    string;
  icon?:   string;
  badge?:  string;
  url?:    string;
  tag?:    string;
}

// ─── Web Push (VAPID) ─────────────────────────────────────────────────────────
// Generate VAPID keys once: npx web-push generate-vapid-keys
// Add to .env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  try {
    // Dynamic import to keep out of Edge bundle
    const webpush = await import('web-push');
    webpush.default.setVapidDetails(
      process.env.VAPID_SUBJECT ?? 'mailto:admin@smartschool.ng',
      process.env.VAPID_PUBLIC_KEY  ?? '',
      process.env.VAPID_PRIVATE_KEY ?? '',
    );

    await webpush.default.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (e) {
    console.error('[Push] Web push failed:', e);
    return false;
  }
}

// ─── In-app notification logger (always runs) ─────────────────────────────────
// Even without push, we store notifications in DB for the bell icon.
export interface NotificationRecord {
  id:        string;
  userId:    string;
  schoolId:  string;
  title:     string;
  body:      string;
  url?:      string;
  isRead:    boolean;
  createdAt: string;
}

// ─── Event-based notification dispatchers ────────────────────────────────────
export async function notifyMDNewPayment(params: {
  schoolId:    string;
  studentName: string;
  amount:      number;
  mdPhone:     string;
}) {
  const { sendWhatsApp } = await import('./whatsapp');
  await sendWhatsApp({
    to:   params.mdPhone,
    body: `💰 *Payment Received!*\n\n${params.studentName}'s fees of ₦${params.amount.toLocaleString()} just cleared.\n\nNet cash updated. Check your SmartSchool dashboard.`,
  });
}

export async function notifyMDNewExpense(params: {
  mdPhone:       string;
  requesterName: string;
  amount:        number;
  purpose:       string;
}) {
  const { sendWhatsApp } = await import('./whatsapp');
  await sendWhatsApp({
    to:   params.mdPhone,
    body: `📋 *New SmartSpend Request*\n\n${params.requesterName} is requesting ₦${params.amount.toLocaleString()} for "${params.purpose}".\n\nOpen SmartSchool to approve or decline.`,
  });
}
