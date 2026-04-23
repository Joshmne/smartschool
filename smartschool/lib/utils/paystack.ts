// lib/utils/paystack.ts — Paystack payment initialization + webhook verification
import crypto from 'crypto';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? '';
const PAYSTACK_BASE   = 'https://api.paystack.co';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PaystackInitParams {
  email:      string;
  amountKobo: number;   // Amount in KOBO (₦1 = 100 kobo)
  reference:  string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackTransaction {
  reference:   string;
  amount:      number;  // kobo
  status:      'success' | 'failed' | 'abandoned';
  paidAt:      string;
  channel:     string;
  currency:    string;
  customerEmail: string;
  metadata:    Record<string, unknown>;
}

// ─── Initialize transaction ──────────────────────────────────────────────────
export async function initializePaystackTransaction(params: PaystackInitParams) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email:        params.email,
      amount:       params.amountKobo,
      reference:    params.reference,
      callback_url: params.callbackUrl,
      metadata:     params.metadata,
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message ?? 'Paystack init failed');
  return data.data as { authorization_url: string; access_code: string; reference: string };
}

// ─── Verify transaction ──────────────────────────────────────────────────────
export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message ?? 'Verification failed');

  const tx = data.data;
  return {
    reference:     tx.reference,
    amount:        tx.amount,
    status:        tx.status,
    paidAt:        tx.paid_at,
    channel:       tx.channel,
    currency:      tx.currency,
    customerEmail: tx.customer?.email ?? '',
    metadata:      tx.metadata ?? {},
  };
}

// ─── Webhook signature verification ──────────────────────────────────────────
export function verifyPaystackWebhook(
  payload: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

// ─── Generate unique payment reference ───────────────────────────────────────
export function generatePaystackRef(prefix = 'SS'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
