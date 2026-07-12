import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DailyLogRecord {
  id: string;
  match_id: string;
  log_date: string;
  mood: number;
  metrics: Record<string, any>;
  notes: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  table: string;
  schema: string;
  record: DailyLogRecord;
  old_record: DailyLogRecord | null;
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      // Secure endpoint — verify secret authorization (called internally by database webhook)
      if (ctx.authMode !== "secret") {
        return Response.json(
          { error: "Unauthorized. Secret key required." },
          { status: 401, headers: corsHeaders }
        );
      }

      const payload = await req.json() as WebhookPayload;
      const record = payload.record;

      if (!record || !record.match_id) {
        return Response.json(
          { error: "Invalid payload record" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Fetch child name and professional name for personalized AI prompts
      const { data: matchDetails, error: matchError } = await ctx.supabaseAdmin
        .from("matches")
        .select(`
          id,
          child:children(first_name),
          professional:professionals(display_name)
        `)
        .eq("id", record.match_id)
        .single();

      if (matchError || !matchDetails) {
        console.error("Failed to fetch match details:", matchError);
        return Response.json(
          { error: "Match details not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      const childName = (matchDetails as any).child?.first_name || "הילד";
      const proName = (matchDetails as any).professional?.display_name || "המשלבת";

      // Deterministic generation (AI removed per D30)
      const moodText = record.mood >= 4 ? "חיובי וטוב" : record.mood === 3 ? "סביר" : "מלווה באתגרים";
      const aiSummary = `התקבל דיווח יומי מאת המשלבת ${proName} עבור ${childName}. היום עבר באופן ${moodText}.`;
      const aiStrategy = record.mood < 3
        ? "היום היה מעט מאתגר. מומלץ לבדוק את ההערות ולשקול התאמות למחר."
        : "היום עבר בצורה טובה. כדאי להמשיך בשיטות הנוכחיות ולעקוב אחרי ההתקדמות.";

      // Update the daily log record in the database using admin client (bypasses RLS since this is a system cron/webhook)
      const { error: updateError } = await ctx.supabaseAdmin
        .from("daily_logs")
        .update({
          ai_summary: aiSummary,
          ai_strategy: aiStrategy,
        })
        .eq("id", record.id);

      if (updateError) {
        console.error("Failed to update daily log with AI summaries:", updateError);
        return Response.json(
          { error: updateError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      return Response.json(
        { success: true, ai_summary: aiSummary, ai_strategy: aiStrategy },
        { headers: corsHeaders }
      );

    } catch (err: any) {
      console.error("Unexpected error in process-daily-log:", err);
      return Response.json(
        { error: err.message },
        { status: 500, headers: corsHeaders }
      );
    }
  }),
};
