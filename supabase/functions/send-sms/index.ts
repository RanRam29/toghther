import "@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:standardwebhooks@1.0.0";

interface SmsHookPayload {
  user: { phone: string };
  sms: { otp: string };
}

function hookSecretRaw(secret: string): string {
  return secret.startsWith("v1,whsec_") ? secret.slice("v1,whsec_".length) : secret;
}

async function sendTwilioSms(
  to: string,
  body: string,
): Promise<{ ok: boolean; status: number; message: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGE_SERVICE_SID");

  if (!accountSid || !authToken) {
    return { ok: false, status: 500, message: "Twilio credentials are not configured" };
  }
  if (!fromNumber && !messagingServiceSid) {
    return {
      ok: false,
      status: 500,
      message: "Set TWILIO_PHONE_NUMBER or TWILIO_MESSAGE_SERVICE_SID",
    };
  }

  const params = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    params.set("From", fromNumber);
  }

  const auth = btoa(`${accountSid}:${authToken}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const payload = await response.json().catch(() => ({})) as {
    status?: string;
    message?: string;
    code?: number;
  };

  if (!response.ok) {
    const detail = payload.message ?? response.statusText;
    console.error("Twilio SMS failed:", response.status, detail);
    return { ok: false, status: response.status, message: detail };
  }

  if (payload.status && payload.status !== "queued" && payload.status !== "sent") {
    return {
      ok: false,
      status: 502,
      message: payload.message ?? `Unexpected Twilio status: ${payload.status}`,
    };
  }

  return { ok: true, status: 200, message: "queued" };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  if (!hookSecret) {
    return Response.json(
      { error: { http_code: 500, message: "SEND_SMS_HOOK_SECRET is not configured" } },
      { status: 500 },
    );
  }

  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  let event: SmsHookPayload;
  try {
    const wh = new Webhook(hookSecretRaw(hookSecret));
    event = wh.verify(payloadText, headers) as SmsHookPayload;
  } catch (err) {
    console.error("SMS hook signature verification failed:", err);
    return Response.json(
      { error: { http_code: 401, message: "Invalid hook signature" } },
      { status: 401 },
    );
  }

  const phone = event.user?.phone;
  const otp = event.sms?.otp;
  if (!phone || !otp) {
    return Response.json(
      { error: { http_code: 400, message: "Missing phone or OTP in hook payload" } },
      { status: 400 },
    );
  }

  const messageBody = `קוד ההתחברות שלך לתמיד ביחד: ${otp}\nTogether login code: ${otp}`;
  const result = await sendTwilioSms(phone, messageBody);

  if (!result.ok) {
    return Response.json(
      { error: { http_code: result.status, message: result.message } },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
