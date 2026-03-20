/**
 * iOPEX AI FrontDoor — send-approval-request
 * Called when a workflow request requires manager/approver sign-off.
 * Sends an approval email via Resend (graceful no-op if key not set).
 * Updates workflow_requests with approver_email + moves status to 'pending'.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");
const APP_URL           = Deno.env.get("APP_URL") || "https://frontdoor-platform.onrender.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { request_id, approver_email, requester_name, title, domain } = await req.json();

    if (!request_id || !approver_email) {
      return new Response(JSON.stringify({ error: "request_id and approver_email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the request to get the approval token
    const { data: wfReq, error: fetchErr } = await supabase
      .from("workflow_requests")
      .select("id, approval_token, title, domain, status")
      .eq("id", request_id)
      .single();

    if (fetchErr || !wfReq) {
      return new Response(JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build approve / reject URLs
    const approveUrl = `${APP_URL}/api/approval?token=${wfReq.approval_token}&action=approve`;
    const rejectUrl  = `${APP_URL}/api/approval?token=${wfReq.approval_token}&action=reject`;

    // Update request: set approver_email + status → pending
    await supabase.from("workflow_requests").update({
      approver_email,
      status: "pending",
    }).eq("id", request_id);

    // Send email via Resend if key available
    if (RESEND_API_KEY) {
      const emailBody = {
        from: "iOPEX FrontDoor <noreply@iodemo.com>",
        to: [approver_email],
        subject: `Approval Required: ${wfReq.title}`,
        html: buildEmailHtml({
          requesterName: requester_name || "An employee",
          title: wfReq.title,
          domain: wfReq.domain,
          requestId: request_id,
          approveUrl,
          rejectUrl,
        }),
      };

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailBody),
      });

      const emailData = await emailRes.json();
      console.log("Resend response:", emailData);
    } else {
      // No email key — log approval URL for demo
      console.log(`[demo] Approval URL for ${request_id}:`, approveUrl);
    }

    return new Response(JSON.stringify({
      success: true,
      request_id,
      approver_email,
      approval_token: wfReq.approval_token,
      approve_url: approveUrl,
      email_sent: !!RESEND_API_KEY,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function buildEmailHtml({ requesterName, title, domain, requestId, approveUrl, rejectUrl }: {
  requesterName: string; title: string; domain: string;
  requestId: string; approveUrl: string; rejectUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Approval Required</title></head>
<body style="margin:0;padding:0;background:#0B1120;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1120;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111927;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#0F1829;padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <table width="100%"><tr>
            <td>
              <span style="font-size:11px;font-family:monospace;color:#E8A020;letter-spacing:0.08em;">iOPEX AI FRONTDOOR</span><br>
              <span style="font-size:20px;font-weight:700;color:#ECF1FA;">Manager Approval Required</span>
            </td>
            <td align="right">
              <span style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#F59E0B;font-size:11px;font-family:monospace;padding:3px 10px;border-radius:4px;">${domain}</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="color:#C8D4E4;font-size:14px;line-height:1.6;margin:0 0 16px;">
            <strong style="color:#ECF1FA;">${requesterName}</strong> has submitted a request that requires your approval:
          </p>

          <div style="background:#0F1829;border:1px solid rgba(255,255,255,0.06);border-left:3px solid #E8A020;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
            <div style="font-size:11px;font-family:monospace;color:#3D5068;margin-bottom:6px;">${requestId}</div>
            <div style="font-size:16px;font-weight:600;color:#ECF1FA;">${title}</div>
          </div>

          <p style="color:#3D5068;font-size:12px;margin:0 0 20px;">
            Please review and take action below. This request will remain pending until approved or rejected.
          </p>

          <!-- Buttons -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="48%">
              <a href="${approveUrl}" style="display:block;text-align:center;background:#E8A020;color:#0B1120;font-size:14px;font-weight:700;padding:13px 0;border-radius:8px;text-decoration:none;">
                ✓ Approve
              </a>
            </td>
            <td width="4%"></td>
            <td width="48%">
              <a href="${rejectUrl}" style="display:block;text-align:center;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#C8D4E4;font-size:14px;font-weight:600;padding:13px 0;border-radius:8px;text-decoration:none;">
                ✗ Reject
              </a>
            </td>
          </tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#3D5068;font-size:11px;font-family:monospace;margin:0;">
            Powered by iOPEX AI FrontDoor · TrustCore Audit Active · Request ID: ${requestId}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
