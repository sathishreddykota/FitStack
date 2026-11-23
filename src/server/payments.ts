import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { HttpError } from "./http";
import { extendPeriod, PRO_GRANT_DAYS, PRO_PRICE_PAISE } from "./entitlements";

// ─────────────────────────────────────────────
// Razorpay one-time orders → PRO time.
//
// Flow: createProOrder (we record the order + amount) → Razorpay Checkout →
// client calls /verify AND Razorpay calls the webhook. Both end in markOrderPaid,
// which is idempotent: a payment is only ever granted once.
// ─────────────────────────────────────────────

function keys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new HttpError(503, "Payments are not configured.", "PAYMENT");
  return { keyId, keySecret };
}

function client() {
  const { keyId, keySecret } = keys();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/** Constant-time comparison of two hex signatures. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createProOrder(userId: string) {
  const order = await client().orders.create({
    amount: PRO_PRICE_PAISE,
    currency: "INR",
    // Razorpay receipts are limited to 40 chars (the old `receipt_<cuid>_<ms>` was 47 and could fail).
    receipt: `fs_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    notes: { userId, plan: "pro_30d" },
  });

  await prisma.paymentOrder.create({
    data: {
      userId,
      razorpayOrderId: order.id,
      amountPaise: PRO_PRICE_PAISE,
      currency: "INR",
      grantDays: PRO_GRANT_DAYS,
    },
  });

  return {
    orderId: order.id,
    amount: PRO_PRICE_PAISE,
    currency: "INR",
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? keys().keyId,
  };
}

/** Checkout handler signature: HMAC(order_id|payment_id, key_secret). */
export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  return safeEqualHex(hmacHex(keys().keySecret, `${orderId}|${paymentId}`), signature);
}

export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(secret, rawBody), signature);
}

export type GrantResult = { status: "granted" | "already_paid"; proUntil: Date | null };

/**
 * Mark an order paid and grant its PRO days — exactly once.
 * @param expectedUserId when called from the browser, the signed-in user must own the order.
 * @param paidAmountPaise when known (webhook), must match what we charged.
 */
export async function markOrderPaid(opts: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  expectedUserId?: string;
  paidAmountPaise?: number;
}): Promise<GrantResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({ where: { razorpayOrderId: opts.razorpayOrderId } });
    if (!order) throw new HttpError(404, "Unknown order.", "PAYMENT");
    if (opts.expectedUserId && order.userId !== opts.expectedUserId) {
      throw new HttpError(403, "This order belongs to another account.", "FORBIDDEN");
    }
    if (opts.paidAmountPaise !== undefined && opts.paidAmountPaise < order.amountPaise) {
      throw new HttpError(400, "Paid amount does not match the order.", "PAYMENT");
    }

    // Conditional update = the idempotency guard (safe if verify + webhook race).
    const { count } = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: { not: "PAID" } },
      data: { status: "PAID", razorpayPaymentId: opts.razorpayPaymentId, paidAt: new Date() },
    });
    const sub = await tx.subscription.findUnique({ where: { userId: order.userId } });
    if (count === 0) return { status: "already_paid", proUntil: sub?.currentPeriodEnd ?? null };

    const activeEnd = sub?.status === "active" ? sub.currentPeriodEnd : null;
    const { start, end } = extendPeriod(activeEnd, order.grantDays);
    const data = {
      tier: "PRO" as const,
      status: "active",
      currentPeriodStart: activeEnd && activeEnd > start ? sub!.currentPeriodStart : start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: true, // one-time payments never auto-renew
    };
    await tx.subscription.upsert({ where: { userId: order.userId }, create: { userId: order.userId, ...data }, update: data });
    await tx.user.update({ where: { id: order.userId }, data: { subscriptionTier: "PRO" } });
    return { status: "granted", proUntil: end };
  });
}

export async function markOrderFailed(razorpayOrderId: string) {
  await prisma.paymentOrder.updateMany({ where: { razorpayOrderId, status: "CREATED" }, data: { status: "FAILED" } });
}

export async function paymentHistory(userId: string) {
  return prisma.paymentOrder.findMany({
    where: { userId, status: "PAID" },
    orderBy: { paidAt: "desc" },
    select: { id: true, amountPaise: true, currency: true, grantDays: true, paidAt: true, razorpayPaymentId: true },
  });
}
