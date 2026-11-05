"use server";

import { run } from "@/lib/action";
import { confirmPurchase, startPurchase } from "@/lib/data/astro";

/**
 * Step 1 of buying a plan. Demo: bought at once ({ demo: true, period, startsLater }). Live backend: returns the
 * Razorpay order for checkout ({ orderId, keyId, amount, mock, ... }); nothing is active until step 2.
 */
export async function buyPlan(planId) {
  return run((id) => startPurchase(id, String(planId)), "/dashboard/subscription");
}

/** Step 2 (live backend): the server checks the payment with Razorpay and activates the plan once. */
export async function confirmPlan(input) {
  const v = { orderId: String(input?.orderId || ""), razorpayPaymentId: String(input?.razorpayPaymentId || ""), signature: String(input?.signature || "") };
  return run((id) => confirmPurchase(id, v), "/dashboard/subscription");
}
