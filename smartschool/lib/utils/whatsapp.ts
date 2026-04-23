// lib/utils/whatsapp.ts
// Supports: Twilio WhatsApp Sandbox (dev) + Meta Cloud API (prod)
// Automatically picks the right provider based on env vars

export interface WhatsAppMessage {
  to:      string;   // Nigerian phone e.g. "08012345678" or "+2348012345678"
  body:    string;
  mediaUrl?: string; // Optional image/PDF attachment URL
}

export interface WhatsAppResult {
  success:    boolean;
  messageId?: string;
  error?:     string;
}

// ─── Normalize Nigerian phone to E.164 ───────────────────────────────────────
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return `+${digits}`;
  if (digits.startsWith('0'))   return `+234${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('8') || digits.startsWith('9')) {
    return `+234${digits}`;
  }
  return `+${digits}`;
}

// ─── Twilio provider ─────────────────────────────────────────────────────────
async function sendViaTwilio(msg: WhatsAppMessage): Promise<WhatsAppResult> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

  if (!sid || !token) return { success: false, error: 'Twilio credentials not configured' };

  const to   = `whatsapp:${toE164(msg.to)}`;
  const body = new URLSearchParams({ From: from, To: to, Body: msg.body });
  if (msg.mediaUrl) body.append('MediaUrl', msg.mediaUrl);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );

  const data = await res.json();
  if (!res.ok) return { success: false, error: data.message ?? 'Twilio error' };
  return { success: true, messageId: data.sid };
}

// ─── Meta Cloud API provider ─────────────────────────────────────────────────
async function sendViaMeta(msg: WhatsAppMessage): Promise<WhatsAppResult> {
  const token   = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId) return { success: false, error: 'Meta credentials not configured' };

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to:                toE164(msg.to),
    type:              'text',
    text:              { body: msg.body },
  };

  if (msg.mediaUrl) {
    payload.type  = 'image';
    payload.image = { link: msg.mediaUrl, caption: msg.body };
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error?.message ?? 'Meta API error' };
  return { success: true, messageId: data.messages?.[0]?.id };
}

// ─── Main dispatcher (auto-selects provider) ─────────────────────────────────
export async function sendWhatsApp(msg: WhatsAppMessage): Promise<WhatsAppResult> {
  // Prefer Meta Cloud API in prod, fallback to Twilio
  if (process.env.META_WHATSAPP_TOKEN) {
    const result = await sendViaMeta(msg);
    if (result.success) return result;
    console.warn('[WhatsApp] Meta failed, trying Twilio fallback:', result.error);
  }

  if (process.env.TWILIO_ACCOUNT_SID) {
    return sendViaTwilio(msg);
  }

  // Dev mode: just log the message
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WhatsApp DEV] To: ${msg.to}\n${msg.body}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  return { success: false, error: 'No WhatsApp provider configured' };
}

// ─── Pre-built message templates ─────────────────────────────────────────────
export const WhatsAppTemplates = {
  feeReminder: (params: {
    parentName: string;
    studentName: string;
    schoolName: string;
    amount: number;
    termName: string;
  }) => `Dear ${params.parentName},

This is a reminder that *${params.studentName}*'s Term ${params.termName} school fees of *₦${params.amount.toLocaleString()}* are outstanding at ${params.schoolName}.

🔒 *Result Gate:* Your ward's report card will be released upon payment.

Reply *PAY* to get payment details or visit our portal.

Thank you 🙏`,

  resultUnlocked: (params: {
    parentName: string;
    studentName: string;
    schoolName: string;
    amount: number;
    ref: string;
    pdfUrl?: string;
  }) => `✅ *Payment Confirmed!*

Dear ${params.parentName}, we have received ₦${params.amount.toLocaleString()} for *${params.studentName}*.

🎉 *Result Gate Opened!* Your ward's report card is now available.

${params.pdfUrl ? `📥 Download: ${params.pdfUrl}` : 'Please visit the school portal to download the report card.'}

Reference: ${params.ref}
— ${params.schoolName}`,

  pulseReport: (params: {
    parentName: string;
    studentName: string;
    weekOf: string;
    neatness: number;
    conduct: number;
    punctuality: number;
    teacherName: string;
  }) => {
    const avg   = (params.neatness + params.conduct + params.punctuality) / 3;
    const stars  = '⭐'.repeat(Math.round(avg));
    const remark = avg >= 4 ? 'had an excellent week' : avg >= 3 ? 'had a good week' : 'needs some encouragement next week';

    return `📊 *Weekly Pulse – ${params.weekOf}*

Dear ${params.parentName},

*${params.studentName}* ${remark} ${stars}

• Neatness:    ${'⭐'.repeat(params.neatness)}${'☆'.repeat(5 - params.neatness)} (${params.neatness}/5)
• Conduct:     ${'⭐'.repeat(params.conduct)}${'☆'.repeat(5 - params.conduct)} (${params.conduct}/5)
• Punctuality: ${'⭐'.repeat(params.punctuality)}${'☆'.repeat(5 - params.punctuality)} (${params.punctuality}/5)

_From ${params.teacherName}_`;
  },

  newsletter: (params: {
    schoolName: string;
    title: string;
    body: string;
  }) => `📢 *${params.schoolName}*

*${params.title}*

${params.body}

_This message was sent to all parents/guardians._`,

  expenseApproved: (params: {
    requesterName: string;
    amount: number;
    purpose: string;
    approverName: string;
  }) => `✅ *SmartSpend Approved*

Dear ${params.requesterName},

Your imprest request of *₦${params.amount.toLocaleString()}* for "${params.purpose}" has been *approved* by ${params.approverName}.

Funds will be released shortly.`,
};

// ─── Bulk sender with concurrency control ────────────────────────────────────
export async function sendBulkWhatsApp(
  messages: WhatsAppMessage[],
  concurrency = 5
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < messages.length; i += concurrency) {
    const batch   = messages.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(m => sendWhatsApp(m)));
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.success) sent++;
      else failed++;
    });
    // Small delay between batches
    if (i + concurrency < messages.length) {
      await new Promise(res => setTimeout(res, 300));
    }
  }

  return { sent, failed };
}
