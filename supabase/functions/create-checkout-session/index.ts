import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    const {
      bookingId,
      contactName,
      contactEmail,
      totalPrice,
      themeName,
      themeEmoji,
      childName,
      date,
      startTime,
      endTime,
      successUrl,
      cancelUrl,
    } = await req.json();

    if (!bookingId || !totalPrice || !contactEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: contactEmail,
      line_items: [
        {
          price_data: {
            currency: "sek",
            product_data: {
              name: `${themeEmoji} ${themeName} – Barnkalas`,
              description: `${childName} · ${date} · ${startTime} – ${endTime}`,
            },
            unit_amount: Math.round(totalPrice * 100), // öre
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
      },
      success_url: successUrl || "https://kitchen-club-reimagined.lovable.app/boka/tack?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl || "https://kitchen-club-reimagined.lovable.app/boka?cancelled=true",
    });

    // Store session ID on booking
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ stripe_session_id: session.id }),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
