import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

      // Get Claude API Key
      const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
      let aiSummary = "";
      let aiStrategy = "";

      if (claudeApiKey) {
        try {
          const prompt = `את/ה עוזר/ת פדגוגי/ת מבוסס בינה מלאכותית בפלטפורמת Together. תפקידך הוא לעבד דיווח יומי שנכתב על ידי המשלבת ולייצר שני סיכומים בעברית:
1. סיכום יום להורה (ai_summary): 2-3 משפטים חמים, מרגיעים, מעודדים וברורים (בלי ז'רגון מקצועי מדי).
2. אסטרטגיה למחר למשלבת (ai_strategy): 1-2 משפטים פרקטיים המציעים עצה או דגש לעבודה מחר על בסיס הדיווח של היום.

פרטי הדיווח:
- שם הילד: ${childName}
- שם המשלבת: ${proName}
- תאריך הדיווח: ${record.log_date}
- מצב רוח כללי (סולם 1-5, כאשר 1 קשה ו-5 מצוין): ${record.mood}/5
- מדדים כמותיים (metrics): ${JSON.stringify(record.metrics)}
- הערות חופשיות של המשלבת (notes): ${record.notes || "לא נרשמו הערות נוספות"}

החזר את התשובה כקובץ JSON תקין בלבד (ללא הקדמות או סיומות) במבנה הבא:
{
  "ai_summary": "הסבר חם ומעודד להורה כאן...",
  "ai_strategy": "הצעה אסטרטגית למשלבת כאן..."
}`;

          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": claudeApiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-latest",
              max_tokens: 512,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const contentText = result.content?.[0]?.text;
            if (contentText) {
              const cleanJson = contentText.trim().replace(/^```json/, "").replace(/```$/, "").trim();
              const parsed = JSON.parse(cleanJson);
              aiSummary = parsed.ai_summary || "";
              aiStrategy = parsed.ai_strategy || "";
            }
          } else {
            console.error("Claude API responded with error:", await response.text());
          }
        } catch (aiErr) {
          console.error("AI summarization failed:", aiErr);
        }
      }

      // Fallback: If AI fails or API key is not configured, generate a baseline summary
      if (!aiSummary) {
        const moodText = record.mood >= 4 ? "חיובי מאוד" : record.mood === 3 ? "טוב" : "מאתגר";
        aiSummary = `התקבל דיווח יומי מאת המשלבת ${proName} עבור ${childName}. מצב הרוח הכללי היום היה ${moodText}.`;
      }
      if (!aiStrategy) {
        aiStrategy = "מומלץ להמשיך לעקוב אחר המדדים היומיים ולשמור על עקביות בשיטות השילוב.";
      }

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
