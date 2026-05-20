import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push via fetch (no external push library — use native Web Push Protocol)
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string, vapidPrivateKey: string, vapidPublicKey: string, subject: string) {
  // Note: Full VAPID signing requires crypto — simplified stub for now
  // In production, use a proper web-push library via npm: or implement VAPID signing
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: payload,
  });
  return response.ok;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 400 });
    }

    // Find debts unsettled > 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleDebts } = await supabase
      .from("payment_splits")
      .select("user_id, amount, currency")
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo);

    if (!staleDebts?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const userIds = [...new Set(staleDebts.map((d: { user_id: string }) => d.user_id))];
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    let sent = 0;
    for (const sub of (subscriptions ?? [])) {
      const payload = JSON.stringify({
        title: "FairPay — Nhắc nợ",
        body: "Bạn có khoản nợ chưa thanh toán hơn 7 ngày. Mở FairPay để thanh toán.",
        url: "/",
      });
      const ok = await sendWebPush(sub, payload, vapidPrivateKey, vapidPublicKey, "mailto:admin@fairpay.app");
      if (ok) sent++;
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
