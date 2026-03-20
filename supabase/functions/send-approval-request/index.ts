/**
 * iOPEX AI FrontDoor — send-approval-request
 * Sends manager approval notifications via:
 *   1. Microsoft Teams (Adaptive Card with Approve/Reject buttons)
 *   2. Email via Resend
 * Both channels are independent — either or both can be active.
 * Approval/reject URLs point directly to the handle-approval edge function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY");
const TEAMS_WEBHOOK    = Deno.env.get("TEAMS_APPROVAL_WEBHOOK_URL"); // Incoming Webhook URL from Teams channel
const APP_URL          = Deno.env.get("APP_URL") || "https://frontdoor-platform-phse2-integration.onrender.com";

// Approval links go directly to the edge function — not the React app
const FUNCTION_BASE    = `${SUPABASE_URL}/functions/v1`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { request_id, approver_email, requester_name, title, domain } = await req.json();

    if (!request_id || !approver_email) {
      return new Response(JSON.stringify({ error: "request_id and approver_email required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Fetch request + approval token
    const { data: wfReq, error } = await supabase
      .from("workflow_requests")
      .select("id, approval_token, title, domain, status")
      .eq("id", request_id)
      .single();

    if (error || !wfReq) {
      return new Response(JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Approval URLs → handle-approval edge function (correct URL)
    const approveUrl = `${FUNCTION_BASE}/handle-approval?token=${wfReq.approval_token}&action=approve`;
    const rejectUrl  = `${FUNCTION_BASE}/handle-approval?token=${wfReq.approval_token}&action=reject`;

    // Move status to pending
    await supabase.from("workflow_requests").update({
      approver_email,
      status: "pending",
    }).eq("id", request_id);

    const ctx = {
      requesterName: requester_name || "An employee",
      title:         wfReq.title,
      domain:        wfReq.domain,
      requestId:     request_id,
      approveUrl,
      rejectUrl,
      portalUrl:     `${APP_URL}/portal`,
    };

    const results: Record<string, unknown> = { request_id, approver_email };

    // ── Channel 1: Teams Adaptive Card ───────────────────────────────────────
    if (TEAMS_WEBHOOK) {
      try {
        const teamsRes = await fetch(TEAMS_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildTeamsCard(ctx)),
        });
        results.teams_sent = teamsRes.ok;
        results.teams_status = teamsRes.status;
        if (!teamsRes.ok) {
          const t = await teamsRes.text();
          console.error("Teams webhook error:", t);
        }
      } catch (e) {
        console.error("Teams send failed:", e);
        results.teams_sent = false;
      }
    } else {
      console.log(`[demo] Teams not configured. Approve URL: ${approveUrl}`);
      results.teams_sent = false;
    }

    // ── Channel 2: Email via Resend ───────────────────────────────────────────
    if (RESEND_API_KEY) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from:    "iOPEX FrontDoor <noreply@iodemo.com>",
            to:      [approver_email],
            subject: `Approval Required: ${wfReq.title}`,
            html:    buildEmailHtml(ctx),
          }),
        });
        const emailData = await emailRes.json();
        results.email_sent = emailRes.ok;
        results.email_id   = emailData.id;
      } catch (e) {
        console.error("Email send failed:", e);
        results.email_sent = false;
      }
    } else {
      results.email_sent = false;
    }

    results.approve_url = approveUrl;
    results.channels_active = [
      TEAMS_WEBHOOK ? "teams" : null,
      RESEND_API_KEY ? "email" : null,
    ].filter(Boolean);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

// ── Teams Adaptive Card (Incoming Webhook format) ─────────────────────────────

function buildTeamsCard({ requesterName, title, domain, requestId, approveUrl, rejectUrl, portalUrl }: {
  requesterName: string; title: string; domain: string;
  requestId: string; approveUrl: string; rejectUrl: string; portalUrl: string;
}) {
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      contentUrl:  null,
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type:    "AdaptiveCard",
        version: "1.4",
        msteams: { width: "Full" },
        body: [
          {
            type: "Container",
            style: "emphasis",
            bleed: true,
            items: [
              {
                type: "ColumnSet",
                columns: [
                  {
                    type: "Column", width: "stretch",
                    items: [
                      { type: "TextBlock", text: "iOPEX AI FRONTDOOR", size: "Small", weight: "Bolder", color: "Warning" },
                      { type: "TextBlock", text: "Manager Approval Required", size: "Large", weight: "Bolder", spacing: "None" },
                    ],
                  },
                  {
                    type: "Column", width: "auto",
                    items: [{
                      type: "TextBlock",
                      text: domain.toUpperCase(),
                      color: "Warning",
                      weight: "Bolder",
                      size: "Small",
                    }],
                  },
                ],
              },
            ],
          },
          {
            type: "Container",
            spacing: "Medium",
            items: [
              { type: "TextBlock", text: `**${requesterName}** has submitted a request that requires your approval.`, wrap: true },
              {
                type: "Container",
                style: "emphasis",
                items: [
                  { type: "TextBlock", text: requestId, size: "Small", color: "Accent", fontType: "Monospace", spacing: "None" },
                  { type: "TextBlock", text: title, weight: "Bolder", size: "Medium", wrap: true, spacing: "Small" },
                ],
              },
            ],
          },
        ],
        actions: [
          { type: "Action.OpenUrl", title: "✓ Approve",       url: approveUrl, style: "positive" },
          { type: "Action.OpenUrl", title: "✗ Reject",        url: rejectUrl,  style: "destructive" },
          { type: "Action.OpenUrl", title: "View in Portal →", url: portalUrl },
        ],
      },
    }],
  };
}

// ── Email HTML ────────────────────────────────────────────────────────────────

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

        <tr><td style="padding:28px 32px;">
          <p style="color:#C8D4E4;font-size:14px;line-height:1.6;margin:0 0 16px;">
            <strong style="color:#ECF1FA;">${requesterName}</strong> has submitted a request that requires your approval:
          </p>
          <div style="background:#0F1829;border:1px solid rgba(255,255,255,0.06);border-left:3px solid #E8A020;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
            <div style="font-size:11px;font-family:monospace;color:#3D5068;margin-bottom:6px;">${requestId}</div>
            <div style="font-size:16px;font-weight:600;color:#ECF1FA;">${title}</div>
          </div>
          <p style="color:#3D5068;font-size:12px;margin:0 0 20px;">
            Click Approve or Reject below. You will be taken to a confirmation page.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="48%">
              <a href="${approveUrl}" style="display:block;text-align:center;background:#E8A020;color:#0B1120;font-size:14px;font-weight:700;padding:13px 0;border-radius:8px;text-decoration:none;">✓ Approve</a>
            </td>
            <td width="4%"></td>
            <td width="48%">
              <a href="${rejectUrl}" style="display:block;text-align:center;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#C8D4E4;font-size:14px;font-weight:600;padding:13px 0;border-radius:8px;text-decoration:none;">✗ Reject</a>
            </td>
          </tr></table>
        </td></tr>

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
