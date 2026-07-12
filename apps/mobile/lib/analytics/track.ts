import { supabase } from "@/lib/supabase";

/** Fire-and-forget analytics — no PII in properties (08-ANALYTICS-EVENTS). */
export async function track(
  eventName: string,
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  try {
    const { error } = await supabase.rpc("track_event", {
      p_event_name: eventName,
      p_properties: properties,
    });
    if (error) console.warn("[track]", eventName, error.message);
  } catch (e) {
    console.warn("[track]", eventName, e);
  }
}
