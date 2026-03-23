import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      contactName, contactEmail, childName, childAge,
      date, startTime, endTime, themeName, themeEmoji,
      totalChildren, extraChildren, hotdogCount, candyBagCount,
      totalPrice, message,
    } = body;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "info@kitchenclub.se";

    const bookingDetails = `
Tema: ${themeEmoji} ${themeName}
Datum: ${date}
Tid: ${startTime?.slice(0,5)} – ${endTime?.slice(0,5)}

Kontaktperson: ${contactName}
E-post: ${contactEmail}
Födelsedagsbarn: ${childName}, ${childAge} år

Antal barn: ${totalChildren} (${extraChildren} extra)
Korv: ${hotdogCount} st
Godispåse: ${candyBagCount} st

Totalt: ${totalPrice} kr

Meddelande: ${message || "–"}
    `.trim();

    if (RESEND_API_KEY) {
      // Send customer confirmation
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Kitchen Club <noreply@kitchenclub.se>",
          to: [contactEmail],
          subject: `Bokningsbekräftelse – ${themeEmoji} ${themeName}`,
          text: `Hej ${contactName}!\n\nTack för din bokning hos Kitchen Club!\n\n${bookingDetails}\n\nVi återkommer inom kort med en bekräftelse.\n\nVarma hälsningar,\nKitchen Club`,
        }),
      });

      // Send admin notification
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Kitchen Club <noreply@kitchenclub.se>",
          to: [ADMIN_EMAIL],
          subject: `Ny bokning: ${childName} – ${themeEmoji} ${themeName}`,
          text: `Ny bokning mottagen!\n\n${bookingDetails}`,
        }),
      });
    } else {
      console.log("No RESEND_API_KEY set. Booking details:", bookingDetails);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Email error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
