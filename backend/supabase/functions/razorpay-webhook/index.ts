// Supabase Edge Function: razorpay-webhook (stub)
// This is a stub implementation; main purpose in Phase 1 is just to exist and log.
// You will deploy this via:
//   supabase functions deploy razorpay-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  console.log("Razorpay webhook received (stub).");
  console.log("Headers:", headers);
  console.log("Body:", rawBody);

  // For now, just return 200 OK so Razorpay/Supabase know it succeeded.
  return new Response(JSON.stringify({ ok: true, stub: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

