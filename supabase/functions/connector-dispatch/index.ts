/**
 * iOPEX AI FrontDoor — connector-dispatch
 * Unified connector gateway. Routes to live API if credentials exist,
 * otherwise returns realistic mock data so demos work out of the box.
 *
 * POST /connector-dispatch
 * Body: { connector, action, payload, tenant_id }
 * Response: { success, mode, external_id, external_url, data }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Optional live credentials (set in Supabase secrets to go live)
const SN_BASE_URL       = Deno.env.get("SERVICENOW_BASE_URL") ?? "";
const SN_USER           = Deno.env.get("SERVICENOW_USER") ?? "";
const SN_PASS           = Deno.env.get("SERVICENOW_PASS") ?? "";
const WD_BASE_URL       = Deno.env.get("WORKDAY_BASE_URL") ?? "";
const WD_CLIENT_ID      = Deno.env.get("WORKDAY_CLIENT_ID") ?? "";
const WD_CLIENT_SECRET  = Deno.env.get("WORKDAY_CLIENT_SECRET") ?? "";
const JIRA_BASE_URL     = Deno.env.get("JIRA_BASE_URL") ?? "";
const JIRA_USER         = Deno.env.get("JIRA_USER") ?? "";
const JIRA_API_TOKEN    = Deno.env.get("JIRA_API_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pad(n: number, len = 7) { return String(n).padStart(len, "0"); }
function isoNow() { return new Date().toISOString(); }
function isoIn(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// ── Mock engines ─────────────────────────────────────────────────────────────

function mockServiceNow(action: string, payload: Record<string, unknown>, tenantSlug: string) {
  const sn_domain = `${tenantSlug}.service-now.com`;
  const base_url  = `https://${sn_domain}`;

  if (action === "create_incident" || action === "create_ticket") {
    const id  = `INC${pad(randInt(1000000, 9999999))}`;
    const sys = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    return {
      mode: "mock", external_id: id,
      external_url: `${base_url}/incident.do?sys_id=${sys}`,
      data: {
        number: id, sys_id: sys,
        short_description: payload.title ?? "Employee Request",
        state: "1",           state_label: "New",
        priority: "3",        priority_label: "Moderate",
        category: payload.category ?? "general",
        assigned_to: "Service Desk",
        opened_at: isoNow(),
        expected_resolution: isoIn(2),
        sys_created_on: isoNow(),
      },
    };
  }

  if (action === "get_ticket") {
    const id = (payload.external_id as string) ?? `INC${pad(randInt(1000000, 9999999))}`;
    return {
      mode: "mock", external_id: id,
      external_url: `${base_url}/incident.do?number=${id}`,
      data: {
        number: id, state: "2", state_label: "In Progress",
        assigned_to: "Tier-1 Support",
        updated_on: isoNow(),
      },
    };
  }

  return { mode: "mock", external_id: null, data: { message: "Action not supported in mock" } };
}

function mockWorkday(action: string, payload: Record<string, unknown>) {
  if (action === "get_employee") {
    const email = (payload.email as string) ?? "";
    const name  = email.split("@")[0].replace(".", " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      mode: "mock", external_id: `WD-${pad(randInt(100000, 999999), 6)}`,
      external_url: null,
      data: {
        employee_id:  `E${randInt(10000, 99999)}`,
        full_name:    name || "Demo Employee",
        email,
        department:   payload.department ?? "General",
        title:        payload.role ?? "Employee",
        manager:      "Jane Smith",
        manager_email:"jane.smith@acmecorp.com",
        cost_center:  `CC-${randInt(1000, 9999)}`,
        location:     "Austin, TX",
        hire_date:    "2022-03-15",
        pto_balance:  randInt(8, 22),
        status:       "Active",
      },
    };
  }

  if (action === "submit_pto") {
    const reqId = `PTO-${pad(randInt(10000, 99999), 5)}`;
    return {
      mode: "mock", external_id: reqId,
      external_url: null,
      data: {
        request_id: reqId, status: "Pending Manager Approval",
        start_date: payload.start_date,  end_date: payload.end_date,
        days_requested: payload.days ?? 1,
        submitted_at: isoNow(),
      },
    };
  }

  if (action === "create_hr_request") {
    const reqId = `HR-${pad(randInt(10000, 99999), 5)}`;
    return {
      mode: "mock", external_id: reqId,
      external_url: null,
      data: {
        request_id: reqId, type: payload.type ?? "General HR",
        status: "Submitted", submitted_at: isoNow(),
        expected_response: isoIn(3),
      },
    };
  }

  return { mode: "mock", external_id: null, data: { message: "Action not supported in mock" } };
}

function mockJira(action: string, payload: Record<string, unknown>, tenantSlug: string) {
  const jira_domain = `${tenantSlug}.atlassian.net`;
  const base_url    = `https://${jira_domain}`;
  const project     = (payload.project as string) ?? "IT";

  if (action === "create_issue") {
    const issueNum = randInt(1000, 9999);
    const key      = `${project}-${issueNum}`;
    return {
      mode: "mock", external_id: key,
      external_url: `${base_url}/browse/${key}`,
      data: {
        key, id: String(randInt(100000, 999999)),
        summary: payload.title ?? "Employee Request",
        status:  "To Do", priority: "Medium",
        issuetype: payload.issuetype ?? "Task",
        assignee:  null,
        created:   isoNow(),
        due:       isoIn(5),
      },
    };
  }

  return { mode: "mock", external_id: null, data: { message: "Action not supported in mock" } };
}

// ── Live engines ─────────────────────────────────────────────────────────────

async function liveServiceNow(action: string, payload: Record<string, unknown>) {
  const auth = btoa(`${SN_USER}:${SN_PASS}`);
  if (action === "create_incident" || action === "create_ticket") {
    const res = await fetch(`${SN_BASE_URL}/api/now/table/incident`, {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        short_description: payload.title,
        description: payload.description,
        category: payload.category ?? "software",
        priority: "3",
      }),
    });
    const json = await res.json();
    const rec  = json.result;
    return {
      mode: "live", external_id: rec.number,
      external_url: `${SN_BASE_URL}/incident.do?sys_id=${rec.sys_id}`,
      data: rec,
    };
  }
  throw new Error("Unsupported action for live ServiceNow");
}

async function liveWorkday(action: string, payload: Record<string, unknown>) {
  // OAuth2 client_credentials → then call Workday REST API
  const tokenRes = await fetch(`${WD_BASE_URL}/ccx/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${WD_CLIENT_ID}&client_secret=${WD_CLIENT_SECRET}`,
  });
  const { access_token } = await tokenRes.json();
  if (action === "get_employee") {
    const res = await fetch(
      `${WD_BASE_URL}/ccx/api/v1/workers?email=${encodeURIComponent(payload.email as string)}`,
      { headers: { "Authorization": `Bearer ${access_token}` } }
    );
    const json = await res.json();
    return { mode: "live", external_id: json?.data?.[0]?.id ?? null, external_url: null, data: json };
  }
  throw new Error("Unsupported action for live Workday");
}

async function liveJira(action: string, payload: Record<string, unknown>) {
  const auth = btoa(`${JIRA_USER}:${JIRA_API_TOKEN}`);
  if (action === "create_issue") {
    const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          project:   { key: payload.project ?? "IT" },
          summary:   payload.title,
          issuetype: { name: payload.issuetype ?? "Task" },
          priority:  { name: "Medium" },
          description: {
            type: "doc", version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: String(payload.description ?? "") }] }],
          },
        },
      }),
    });
    const json = await res.json();
    return {
      mode: "live", external_id: json.key,
      external_url: `${JIRA_BASE_URL}/browse/${json.key}`,
      data: json,
    };
  }
  throw new Error("Unsupported action for live Jira");
}

// ── Domain → connector mapping ───────────────────────────────────────────────

function domainToConnector(domain: string): { connector: string; action: string } {
  switch (domain) {
    case "HR":         return { connector: "workday",      action: "create_hr_request" };
    case "Marketing":  return { connector: "jira",         action: "create_issue" };
    default:           return { connector: "servicenow",   action: "create_ticket" };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const {
      connector:   connectorOverride,
      action:      actionOverride,
      payload      = {},
      tenant_id    = "demo",
      domain,
      request_id,
    } = body;

    // Resolve connector + action (explicit override or infer from domain)
    const resolved      = domain ? domainToConnector(domain) : null;
    const connectorType = connectorOverride ?? resolved?.connector ?? "servicenow";
    const action        = actionOverride    ?? resolved?.action    ?? "create_ticket";

    // Check connector status in DB
    const { data: connRow } = await supabase
      .from("connectors")
      .select("status, base_url, metadata")
      .eq("tenant_id", tenant_id)
      .eq("type", connectorType)
      .maybeSingle();

    const isLive = connRow?.status === "live";

    // Dispatch
    let result: Record<string, unknown>;
    try {
      if (isLive) {
        if (connectorType === "servicenow") result = await liveServiceNow(action, payload);
        else if (connectorType === "workday") result = await liveWorkday(action, payload);
        else if (connectorType === "jira")   result = await liveJira(action, payload);
        else throw new Error(`No live handler for ${connectorType}`);
      } else {
        if (connectorType === "servicenow") result = mockServiceNow(action, payload, tenant_id);
        else if (connectorType === "workday") result = mockWorkday(action, payload);
        else if (connectorType === "jira")   result = mockJira(action, payload, tenant_id);
        else result = { mode: "mock", external_id: null, data: { message: `${connectorType} not implemented` } };
      }
    } catch (dispatchErr: unknown) {
      // Live call failed — fall back to mock
      console.error("Live dispatch failed, falling back to mock:", dispatchErr);
      if (connectorType === "servicenow") result = mockServiceNow(action, payload, tenant_id);
      else if (connectorType === "workday") result = mockWorkday(action, payload);
      else if (connectorType === "jira")   result = mockJira(action, payload, tenant_id);
      else result = { mode: "mock_fallback", external_id: null, data: {} };
    }

    // If there's a request_id, stamp the external ticket reference into workflow_requests.metadata
    if (request_id && result.external_id) {
      await supabase.from("workflow_requests").update({
        metadata: {
          connector:    connectorType,
          external_id:  result.external_id,
          external_url: result.external_url ?? null,
          mode:         result.mode,
          synced_at:    isoNow(),
        },
      }).eq("id", request_id);
    }

    // Update connector last_sync_at
    if (connRow) {
      await supabase.from("connectors")
        .update({ last_sync_at: isoNow() })
        .eq("tenant_id", tenant_id)
        .eq("type", connectorType);
    }

    return new Response(JSON.stringify({ success: true, connector: connectorType, ...result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
