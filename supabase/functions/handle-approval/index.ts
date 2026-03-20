/**
 * iOPEX AI FrontDoor — handle-approval
 * Processes approve/reject clicks from the manager approval email.
 * Route: GET /handle-approval?token=<uuid>&action=approve|reject
 * Returns a styled HTML confirmation page.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL          = Deno.env.get("APP_URL") || "https://frontdoor-platform.onrender.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url    = new URL(req.url);
  const token  = url.searchParams.get("token");
  const action = url.searchParams.get("action"); // 'approve' | 'reject'
  const reason = url.searchParams.get("reason") || "";

  if (!token || !["approve","reject"].includes(action || "")) {
    return htmlResponse("Invalid Request", "Missing or invalid token/action.", false);
  }

  // Look up request by approval token
  const { data: wfReq, error } = await supabase
    .from("workflow_requests")
    .select("id, title, domain, status, user_id")
    .eq("approval_token", token)
    .single();

  if (error || !wfReq) {
    return htmlResponse("Not Found", "This approval link is invalid or has already been used.", false);
  }

  if (wfReq.status === "approved" || wfReq.status === "completed") {
    return htmlResponse("Already Approved", `Request "${wfReq.title}" was already approved.`, true);
  }

  if (wfReq.status === "cancelled") {
    return htmlResponse("Request Cancelled", `Request "${wfReq.title}" has been cancelled.`, false);
  }

  const isApprove = action === "approve";
  const now = new Date().toISOString();

  // Update the request
  await supabase.from("workflow_requests").update({
    status:          isApprove ? "approved" : "cancelled",
    approved_by:     "manager",
    approved_at:     now,
    rejection_reason: !isApprove ? (reason || "Rejected by manager") : null,
  }).eq("approval_token", token);

  const title   = isApprove ? "Request Approved" : "Request Rejected";
  const message = isApprove
    ? `"${wfReq.title}" has been approved. The employee will be notified and the request will be fulfilled.`
    : `"${wfReq.title}" has been rejected. The employee will be notified.`;

  return htmlResponse(title, message, isApprove, APP_URL);
});

function htmlResponse(title: string, message: string, success: boolean, appUrl?: string): Response {
  const color = success ? "#10B981" : "#F43F5E";
  const icon  = success ? "✓" : "✗";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — iOPEX FrontDoor</title>
</head>
<body style="margin:0;padding:0;background:#0B1120;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;padding:40px 24px;max-width:440px;">
    <div style="width:72px;height:72px;border-radius:50%;background:${color}18;border:2px solid ${color}40;
      display:flex;align-items:center;justify-content:center;margin:0 auto 24px;
      font-size:30px;color:${color};">${icon}</div>
    <div style="font-size:11px;font-family:monospace;color:#E8A020;letter-spacing:0.08em;margin-bottom:8px;">
      iOPEX AI FRONTDOOR</div>
    <h1 style="font-size:24px;font-weight:700;color:#ECF1FA;margin:0 0 14px;">${title}</h1>
    <p style="font-size:14px;color:#C8D4E4;line-height:1.6;margin:0 0 28px;">${message}</p>
    ${appUrl ? `<a href="${appUrl}/portal" style="display:inline-block;background:#E8A020;color:#0B1120;
      font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">
      Back to Portal →</a>` : ""}
    <div style="margin-top:32px;font-size:11px;font-family:monospace;color:#3D5068;">
      Powered by iOPEX AI FrontDoor · TrustCore</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
