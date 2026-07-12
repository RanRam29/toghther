import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// Standard CORS headers for mobile clients
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MatchRequest {
  child_id: string;
  limit?: number;
}

export default {
  fetch: withSupabase({ auth: ["publishable", "authenticated"] }, async (req, ctx) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { child_id, limit = 5 } = await req.json() as MatchRequest;

      if (!child_id) {
        return Response.json(
          { error: "child_id is required" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Query database using the user's context (respects RLS)
      // Since we added "authenticated" to auth options, ctx.supabase forwards the JWT
      const { data: matches, error: dbError } = await ctx.supabase.rpc(
        "get_matches_for_child",
        {
          p_child_id: child_id,
          p_limit: limit,
        }
      );

      if (dbError) {
        console.error("Database query error:", dbError);
        return Response.json(
          { error: dbError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      // If no matches found, return empty array immediately
      if (!matches || matches.length === 0) {
        return Response.json({ matches: [] }, { headers: corsHeaders });
      }

      // AI logic removed per D30. Returning DB-generated match_reason directly.
      return Response.json({ matches }, { headers: corsHeaders });

    } catch (err: any) {
      console.error("Edge Function unexpected error:", err);
      return Response.json(
        { error: err.message },
        { status: 500, headers: corsHeaders }
      );
    }
  }),
};
