import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Categories the user may opt out of. Everything else (loop events) is always sent.
type OptOutCategory = "checkin" | "daily_summary";

interface SendPushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // When set to an opt-outable category, notification_prefs is honoured.
  category?: OptOutCategory | string;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const OPT_OUTABLE: ReadonlySet<string> = new Set(["checkin", "daily_summary"]);

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      // Internal-only: invoked by DB triggers / cron with the service key.
      if (ctx.authMode !== "secret") {
        return Response.json(
          { error: "Unauthorized. Secret key required." },
          { status: 401, headers: corsHeaders },
        );
      }

      const { user_id, title, body, data, category } =
        (await req.json()) as SendPushPayload;

      if (!user_id || !title || !body) {
        return Response.json(
          { error: "user_id, title and body are required" },
          { status: 400, headers: corsHeaders },
        );
      }

      // Honour opt-out for the two quiet-hours categories.
      if (category && OPT_OUTABLE.has(category)) {
        const { data: prefs } = await ctx.supabaseAdmin
          .from("notification_prefs")
          .select(category)
          .eq("user_id", user_id)
          .maybeSingle();

        // Default is opted-in; only an explicit `false` suppresses the push.
        if (prefs && (prefs as Record<string, boolean>)[category] === false) {
          return Response.json(
            { skipped: true, reason: `opted_out:${category}` },
            { headers: corsHeaders },
          );
        }
      }

      // Fetch the user's device tokens.
      const { data: tokenRows, error: tokenErr } = await ctx.supabaseAdmin
        .from("push_tokens")
        .select("token")
        .eq("user_id", user_id);

      if (tokenErr) {
        console.error("Failed to load push tokens:", tokenErr);
        return Response.json(
          { error: tokenErr.message },
          { status: 500, headers: corsHeaders },
        );
      }

      const tokens: string[] = (tokenRows ?? []).map((r) => r.token as string);
      if (tokens.length === 0) {
        return Response.json({ sent: 0, reason: "no_tokens" }, { headers: corsHeaders });
      }

      // One Expo message per token so response tickets map back 1:1 by index.
      const messages = tokens.map((to) => ({ to, title, body, sound: "default", data: data ?? {} }));

      const expoRes = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(messages),
      });

      if (!expoRes.ok) {
        const text = await expoRes.text();
        console.error("Expo push API error:", expoRes.status, text);
        return Response.json(
          { error: `Expo push failed: ${expoRes.status}` },
          { status: 502, headers: corsHeaders },
        );
      }

      const result = (await expoRes.json()) as {
        data?: Array<{ status: string; details?: { error?: string } }>;
      };
      const tickets = result.data ?? [];

      // Prune tokens Expo reports as no longer registered.
      const deadTokens: string[] = [];
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          deadTokens.push(tokens[i]);
        }
      });
      if (deadTokens.length > 0) {
        await ctx.supabaseAdmin
          .from("push_tokens")
          .delete()
          .eq("user_id", user_id)
          .in("token", deadTokens);
      }

      const sent = tickets.filter((t) => t.status === "ok").length;
      return Response.json(
        { sent, failed: tickets.length - sent, pruned: deadTokens.length },
        { headers: corsHeaders },
      );
    } catch (err: any) {
      console.error("Unexpected error in send-push:", err);
      return Response.json(
        { error: err.message },
        { status: 500, headers: corsHeaders },
      );
    }
  }),
};
