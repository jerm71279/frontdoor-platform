/**
 * iOPEX AI FrontDoor — Employee Daily Portal
 * Hybrid: greeting + chat bar + dept quick actions + request feed
 * Full flow: submit → AI routes → in progress → approval → complete
 */
import { useState, useEffect, useRef } from "react";

/* ── Fonts ───────────────────────────────────────────────────────── */
const _link = document.createElement("link");
_link.rel = "stylesheet";
_link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
document.head.appendChild(_link);

/* ── Tokens ──────────────────────────────────────────────────────── */
const T = {
  navy:      "#0B1120",
  navyMid:   "#0F1829",
  navyCard:  "#131E2F",
  navyHover: "#1a2640",
  gold:      "#E8A020",
  goldDim:   "rgba(232,160,32,0.10)",
  goldBorder:"rgba(232,160,32,0.25)",
  teal:      "#06B6D4",
  tealDim:   "rgba(6,182,212,0.10)",
  violet:    "#8B5CF6",
  violetDim: "rgba(139,92,246,0.10)",
  emerald:   "#10B981",
  emeraldDim:"rgba(16,185,129,0.10)",
  rose:      "#F43F5E",
  roseDim:   "rgba(244,63,94,0.10)",
  amber:     "#F59E0B",
  amberDim:  "rgba(245,158,11,0.10)",
  text:      "#D4DCE8",
  muted:     "#4A5A72",
  bright:    "#EEF2F8",
  border:    "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.04)",
};

/* ── Demo Employee ───────────────────────────────────────────────── */
const EMPLOYEE = {
  id:         "EMP-8841",
  name:       "Alex Chen",
  first:      "Alex",
  dept:       "Engineering",
  role:       "Senior Software Engineer",
  manager:    "Sarah Park",
  avatar:     "AC",
  location:   "Austin, TX",
  tenure:     "3 yrs 4 mo",
};

/* ── Request Status Config ───────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  submitted:   { label: "Submitted",       color: T.teal,    bg: T.tealDim },
  routing:     { label: "AI Routing…",     color: T.violet,  bg: T.violetDim },
  in_progress: { label: "In Progress",     color: T.teal,    bg: T.tealDim },
  pending:     { label: "Pending Approval",color: T.amber,   bg: T.amberDim },
  approved:    { label: "Approved",        color: T.emerald, bg: T.emeraldDim },
  completed:   { label: "Completed",       color: T.emerald, bg: T.emeraldDim },
  cancelled:   { label: "Cancelled",       color: T.muted,   bg: "rgba(255,255,255,0.04)" },
};

/* ── Domain Config ───────────────────────────────────────────────── */
const DOMAIN_CFG: Record<string, { color: string; icon: string; label: string }> = {
  IT:          { color: T.teal,    icon: "⚙",  label: "IT" },
  HR:          { color: T.violet,  icon: "👤", label: "HR" },
  Finance:     { color: T.emerald, icon: "💰", label: "Finance" },
  Operations:  { color: T.amber,   icon: "🏢", label: "Operations" },
};

/* ── Pre-seeded Requests ─────────────────────────────────────────── */
const SEED_REQUESTS = [
  {
    id: "REQ-0039", title: "Salesforce access — Sales dashboard",
    domain: "IT", status: "completed", created: "Mar 14",
    summary: "Read access to Sales Cloud granted. License assigned.",
    steps: [
      { label: "Submitted",         done: true,  time: "Mar 14 9:02am" },
      { label: "AI routed → IT",    done: true,  time: "Mar 14 9:02am" },
      { label: "License verified",  done: true,  time: "Mar 14 9:08am" },
      { label: "Access provisioned",done: true,  time: "Mar 14 9:15am" },
      { label: "Completed",         done: true,  time: "Mar 14 9:15am" },
    ],
  },
  {
    id: "REQ-0040", title: "PTO request — Mar 25–28 (4 days)",
    domain: "HR", status: "approved", created: "Mar 16",
    summary: "PTO approved by Sarah Park. Calendar updated. 4 days deducted.",
    steps: [
      { label: "Submitted",         done: true,  time: "Mar 16 2:11pm" },
      { label: "AI routed → HR",    done: true,  time: "Mar 16 2:11pm" },
      { label: "Balance checked",   done: true,  time: "Mar 16 2:11pm" },
      { label: "Manager approval",  done: true,  time: "Mar 16 2:44pm" },
      { label: "Calendar updated",  done: true,  time: "Mar 16 2:44pm" },
    ],
  },
];

/* ── Quick Action Scenarios ──────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: "New laptop",       domain: "IT",         prompt: "I need a new laptop — mine is 4 years old and running slow" },
  { label: "Software access",  domain: "IT",         prompt: "I need access to Figma for a new design project" },
  { label: "Request time off", domain: "HR",         prompt: "I need to request PTO April 7–11 (5 days)" },
  { label: "Expense report",   domain: "Finance",    prompt: "I need to submit an expense report for a client dinner last week — $240" },
  { label: "Badge access",     domain: "Operations", prompt: "I need badge access to the 3rd floor lab" },
  { label: "VPN setup",        domain: "IT",         prompt: "I need help setting up VPN for remote work" },
];

/* ── Department Buttons ──────────────────────────────────────────── */
const DEPT_TILES = [
  { domain: "IT",         desc: "Devices, access, software",    scenarios: ["New laptop", "Software license", "VPN", "Password reset"] },
  { domain: "HR",         desc: "Leave, benefits, onboarding",  scenarios: ["PTO request", "Benefits change", "Address update", "New hire kit"] },
  { domain: "Finance",    desc: "Expenses, POs, reimbursements", scenarios: ["Expense report", "Purchase order", "Invoice query"] },
  { domain: "Operations", desc: "Facilities, badges, supplies",  scenarios: ["Badge access", "Office supplies", "Parking", "Room booking"] },
];

/* ── Announcements ───────────────────────────────────────────────── */
const ANNOUNCEMENTS = [
  { id: 1, tag: "HR",      color: T.violet, text: "Open enrollment closes March 31 — update your benefits before the deadline." },
  { id: 2, tag: "IT",      color: T.teal,   text: "Scheduled maintenance Sat Mar 22 11pm–2am. Expect brief VPN downtime." },
  { id: 3, tag: "Finance", color: T.emerald,text: "Q1 expense reports due April 4. Submit via FrontDoor or Finance portal." },
];

/* ── Flow Simulator ──────────────────────────────────────────────── */
function buildFlow(domain: string, title: string, needsApproval: boolean) {
  const base = [
    { label: "Submitted",                     done: true,  time: "just now",   active: false },
    { label: `AI routed → ${domain}`,         done: false, time: "",           active: true  },
    { label: domain === "IT" ? "Ticket created in ServiceNow" : domain === "HR" ? "Policy check in Workday" : domain === "Finance" ? "GL code validated" : "Facilities notified",
                                              done: false, time: "",           active: false },
  ];
  if (needsApproval) {
    base.push({ label: "Manager approval required", done: false, time: "", active: false });
    base.push({ label: "Approved — processing",      done: false, time: "", active: false });
  }
  base.push({ label: "Completed",                   done: false, time: "", active: false });
  return base;
}

/* ─────────────────────────────────────────────────────────────────
   REQUEST DETAIL DRAWER
───────────────────────────────────────────────────────────────── */
function RequestDrawer({
  req, onClose, onApprove,
}: {
  req: any; onClose: () => void; onApprove?: () => void;
}) {
  const cfg = STATUS_CFG[req.status] || STATUS_CFG.submitted;
  const dom = DOMAIN_CFG[req.domain] || DOMAIN_CFG.IT;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
    }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1,
          width: 420, height: "100vh",
          background: T.navyMid, borderLeft: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: T.muted }}>{req.id}</span>
                <span style={{
                  background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
                  borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                  fontFamily: "'DM Mono', monospace",
                }}>{cfg.label}</span>
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: T.bright, fontWeight: 700, lineHeight: 1.2 }}>
                {req.title}
              </h3>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 20, padding: 4,
            }}>×</button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <span style={{ background: dom.color + "18", color: dom.color, border: `1px solid ${dom.color}30`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
              {dom.icon} {dom.label}
            </span>
            <span style={{ color: T.muted, fontSize: 12 }}>Submitted {req.created}</span>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 14 }}>PROGRESS</div>
          {req.steps.map((step: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < req.steps.length - 1 ? 4 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: step.done ? T.emerald : step.active ? T.gold : "rgba(255,255,255,0.08)",
                  border: `2px solid ${step.done ? T.emerald : step.active ? T.gold : "rgba(255,255,255,0.12)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: step.done ? T.navy : "transparent",
                  boxShadow: step.active ? `0 0 8px ${T.gold}60` : "none",
                }}>
                  {step.done ? "✓" : step.active ? "·" : ""}
                </div>
                {i < req.steps.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 16, background: step.done ? T.emerald + "40" : "rgba(255,255,255,0.06)", marginTop: 3 }} />
                )}
              </div>
              <div style={{ paddingBottom: 16 }}>
                <div style={{ color: step.done ? T.text : step.active ? T.gold : T.muted, fontSize: 13, fontWeight: step.active ? 600 : 400 }}>
                  {step.label}
                </div>
                {step.time && <div style={{ color: T.muted, fontSize: 11, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{step.time}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {req.summary && (
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 8 }}>RESOLUTION</div>
            <p style={{ color: T.text, fontSize: 13, lineHeight: 1.6 }}>{req.summary}</p>
          </div>
        )}

        {/* Approval action */}
        {req.status === "pending" && onApprove && (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ background: T.amberDim, border: `1px solid rgba(245,158,11,0.25)`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ color: T.amber, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Manager Approval Required</div>
              <div style={{ color: T.muted, fontSize: 12 }}>{EMPLOYEE.manager} needs to approve this request before it proceeds.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onApprove} style={{
                flex: 1, padding: "10px 0", borderRadius: 8,
                background: T.gold, border: "none", color: T.navy, fontWeight: 700,
                fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>Simulate: Manager Approves ✓</button>
              <button style={{
                padding: "10px 14px", borderRadius: 8,
                background: "transparent", border: `1px solid ${T.border}`,
                color: T.muted, cursor: "pointer", fontSize: 13,
              }}>Deny</button>
            </div>
          </div>
        )}

        {/* AI routing info */}
        <div style={{ padding: "16px 24px", margin: "0 24px 24px", background: T.violetDim, border: `1px solid rgba(139,92,246,0.18)`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: T.violet, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 8 }}>SIGNAL ENGINE AUDIT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { k: "Domain",     v: req.domain },
              { k: "Confidence", v: req.confidence || "0.94" },
              { k: "Model",      v: "Gemini 2.0 Flash" },
              { k: "Latency",    v: req.latency || "271ms" },
            ].map(({ k, v }) => (
              <div key={k}>
                <div style={{ color: T.muted, fontSize: 10, marginBottom: 2 }}>{k}</div>
                <div style={{ color: T.text, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────────────────────────── */
export default function EmployeeDashboard() {
  const [requests, setRequests]     = useState<any[]>(SEED_REQUESTS);
  const [chatInput, setChatInput]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeReq, setActiveReq]   = useState<any>(null);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [deptModal, setDeptModal]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const openCount = requests.filter(r => !["completed", "cancelled"].includes(r.status)).length;

  /* Simulate request flow progression */
  function progressRequest(id: string) {
    const flow: Record<string, string> = {
      submitted:   "routing",
      routing:     "in_progress",
      in_progress: "pending",
      pending:     "approved",
      approved:    "completed",
    };
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      const nextStatus = flow[r.status];
      if (!nextStatus) return r;
      const nextSteps = r.steps.map((s: any, i: number) => {
        const doneCount = Object.keys(flow).indexOf(nextStatus) + 1;
        return { ...s, done: i < doneCount, active: i === doneCount, time: i < doneCount ? s.time || "just now" : s.time };
      });
      return { ...r, status: nextStatus, steps: nextSteps };
    }));
    // Refresh drawer
    setActiveReq((prev: any) => {
      if (!prev || prev.id !== id) return prev;
      return requests.find(r => r.id === id) || prev;
    });
  }

  /* Submit a new request */
  async function submitRequest(text: string) {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setChatInput("");

    // Classify domain from keywords
    const t = text.toLowerCase();
    const domain =
      t.match(/laptop|computer|software|access|vpn|password|device|figma|license|ticket|email|slack|zoom|adobe|it |tech/) ? "IT" :
      t.match(/pto|leave|vacation|benefit|hr|onboard|address|time off|sick|payroll|401|insurance/) ? "HR" :
      t.match(/expense|receipt|reimburs|purchase|invoice|budget|finance|po |vendor|payment/) ? "Finance" :
      "Operations";

    const needsApproval = domain === "HR" || domain === "Finance" || text.toLowerCase().includes("laptop");
    const id = `REQ-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const steps = buildFlow(domain, text, needsApproval);
    const newReq = {
      id,
      title: text.length > 60 ? text.slice(0, 57) + "…" : text,
      domain,
      status: "submitted",
      created: "just now",
      confidence: (0.88 + Math.random() * 0.1).toFixed(2),
      latency: `${220 + Math.floor(Math.random() * 120)}ms`,
      steps,
    };
    setRequests(prev => [newReq, ...prev]);
    setSubmitting(false);

    // Auto-progress: submitted → routing after 1.2s
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === id
        ? { ...r, status: "routing", steps: r.steps.map((s: any, i: number) => ({ ...s, done: i === 0, active: i === 1, time: i === 0 ? "just now" : s.time })) }
        : r
      ));
    }, 1200);

    // routing → in_progress after 2.8s
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === id
        ? { ...r, status: "in_progress", steps: r.steps.map((s: any, i: number) => ({ ...s, done: i <= 1, active: i === 2, time: i <= 1 ? "just now" : s.time })) }
        : r
      ));
    }, 2800);

    // in_progress → pending (if needed) after 5s
    if (needsApproval) {
      setTimeout(() => {
        setRequests(prev => prev.map(r => r.id === id
          ? { ...r, status: "pending", steps: r.steps.map((s: any, i: number) => ({ ...s, done: i <= 2, active: i === 3, time: i <= 2 ? "just now" : s.time })) }
          : r
        ));
      }, 5000);
    }
  }

  const openRequest = (req: any) => {
    // Re-sync latest state
    const latest = requests.find(r => r.id === req.id) || req;
    setActiveReq(latest);
  };

  // Keep drawer in sync as requests update
  useEffect(() => {
    if (activeReq) {
      const updated = requests.find(r => r.id === activeReq.id);
      if (updated) setActiveReq(updated);
    }
  }, [requests]);

  return (
    <div style={{ background: T.navy, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: T.text }}>

      {/* ── HEADER ── */}
      <div style={{
        background: T.navyMid, borderBottom: `1px solid ${T.border}`,
        padding: "0 28px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="none" stroke={T.gold} strokeWidth="1.5" />
            <polygon points="16,8 24,12.5 24,21.5 16,26 8,21.5 8,12.5" fill={T.goldDim} stroke={T.gold} strokeWidth="0.7" />
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: T.gold }}>iOPEX FrontDoor</span>
          <span style={{ color: T.muted, fontSize: 11, marginLeft: 4 }}>· Acme Corp</span>
        </div>

        {/* Right: notif + profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen(p => !p)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: T.muted, fontSize: 18, padding: 4, position: "relative",
            }}>
              🔔
              {openCount > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 0,
                  width: 16, height: 16, borderRadius: "50%",
                  background: T.gold, color: T.navy, fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{openCount}</span>
              )}
            </button>
            {notifOpen && (
              <div style={{
                position: "absolute", right: 0, top: 36,
                width: 280, background: T.navyCard, border: `1px solid ${T.border}`,
                borderRadius: 10, overflow: "hidden", zIndex: 200,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.muted, fontWeight: 600 }}>NOTIFICATIONS</div>
                {ANNOUNCEMENTS.map(a => (
                  <div key={a.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${T.borderMid}` }}>
                    <span style={{ background: a.color + "18", color: a.color, fontSize: 9, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 3, marginRight: 6 }}>{a.tag}</span>
                    <span style={{ color: T.text, fontSize: 12 }}>{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.gold}40, ${T.gold}20)`,
              border: `1px solid ${T.goldBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: T.gold, fontFamily: "'DM Mono', monospace",
            }}>{EMPLOYEE.avatar}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.bright, lineHeight: 1.2 }}>{EMPLOYEE.name}</div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{EMPLOYEE.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── GREETING + CHAT BAR ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: T.bright, marginBottom: 4 }}>
            {greeting}, {EMPLOYEE.first}.
          </div>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 18 }}>
            {EMPLOYEE.role} · {EMPLOYEE.dept} · {EMPLOYEE.location}
          </div>

          {/* Chat bar */}
          <div style={{
            background: T.navyCard, border: `1px solid ${T.goldBorder}`,
            borderRadius: 12, padding: "4px 6px 4px 18px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: `0 0 32px rgba(232,160,32,0.06)`,
          }}>
            <span style={{ color: T.muted, fontSize: 16 }}>⬡</span>
            <input
              ref={inputRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitRequest(chatInput)}
              placeholder="What do you need today? (e.g. I need a new laptop, request time off, expense report…)"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontSize: 14, color: T.bright, fontFamily: "'DM Sans', sans-serif",
                padding: "10px 0",
              }}
            />
            <button
              onClick={() => submitRequest(chatInput)}
              disabled={!chatInput.trim() || submitting}
              style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: chatInput.trim() ? T.gold : "rgba(255,255,255,0.06)",
                color: chatInput.trim() ? T.navy : T.muted,
                fontWeight: 700, fontSize: 13, cursor: chatInput.trim() ? "pointer" : "default",
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", flexShrink: 0,
              }}
            >
              {submitting ? "Routing…" : "Submit →"}
            </button>
          </div>

          {/* Quick chips */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
            <span style={{ color: T.muted, fontSize: 11, alignSelf: "center" }}>Quick:</span>
            {QUICK_ACTIONS.map(q => {
              const d = DOMAIN_CFG[q.domain];
              return (
                <button key={q.label} onClick={() => submitRequest(q.prompt)} style={{
                  padding: "4px 12px", borderRadius: 20, border: `1px solid ${d.color}25`,
                  background: d.color + "0D", color: d.color,
                  fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                }}>
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2-COLUMN LAYOUT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

          {/* LEFT: Requests + Dept tiles */}
          <div>
            {/* My Requests */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
                  MY REQUESTS
                  {openCount > 0 && <span style={{ color: T.gold, marginLeft: 8 }}>{openCount} active</span>}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {requests.map(req => {
                  const cfg = STATUS_CFG[req.status] || STATUS_CFG.submitted;
                  const dom = DOMAIN_CFG[req.domain] || DOMAIN_CFG.IT;
                  const isActive = !["completed", "cancelled"].includes(req.status);
                  return (
                    <div
                      key={req.id}
                      onClick={() => openRequest(req)}
                      style={{
                        background: T.navyCard, border: `1px solid ${isActive ? T.border : T.borderMid}`,
                        borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                        transition: "all 0.15s",
                        borderLeft: `3px solid ${isActive ? dom.color : "transparent"}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.navyHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = T.navyCard)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: T.bright, fontWeight: 500, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                            {req.title}
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: T.muted }}>{req.id}</span>
                            <span style={{ color: dom.color, fontSize: 11 }}>{dom.icon} {dom.label}</span>
                            <span style={{ color: T.muted, fontSize: 11 }}>{req.created}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{
                            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
                            borderRadius: 4, padding: "3px 9px", fontSize: 11, fontWeight: 600,
                            fontFamily: "'DM Mono', monospace",
                            animation: req.status === "routing" ? "pulse 1.5s ease infinite" : "none",
                          }}>{cfg.label}</span>
                          <span style={{ color: T.muted, fontSize: 14 }}>›</span>
                        </div>
                      </div>

                      {/* Mini progress bar for active requests */}
                      {isActive && req.status !== "submitted" && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 1,
                              background: cfg.color,
                              width: req.status === "routing" ? "25%" :
                                     req.status === "in_progress" ? "50%" :
                                     req.status === "pending" ? "65%" :
                                     req.status === "approved" ? "85%" : "100%",
                              transition: "width 0.8s ease",
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dept Tiles */}
            <div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 14 }}>DEPARTMENTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {DEPT_TILES.map(d => {
                  const dom = DOMAIN_CFG[d.domain];
                  return (
                    <div
                      key={d.domain}
                      onClick={() => setDeptModal(d.domain)}
                      style={{
                        background: T.navyCard, border: `1px solid ${T.border}`,
                        borderRadius: 10, padding: "16px 18px", cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = dom.color + "40"; e.currentTarget.style.background = T.navyHover; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.navyCard; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: dom.color + "18", border: `1px solid ${dom.color}25`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                        }}>{dom.icon}</div>
                        <span style={{ fontWeight: 600, color: dom.color, fontSize: 14 }}>{d.domain}</span>
                      </div>
                      <div style={{ color: T.muted, fontSize: 11, marginBottom: 8 }}>{d.desc}</div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                        {d.scenarios.map(s => (
                          <span key={s} style={{
                            fontSize: 10, color: T.muted,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 4, padding: "2px 6px",
                          }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Profile + Announcements */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
            {/* Profile card */}
            <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.gold}50, ${T.gold}20)`,
                  border: `2px solid ${T.goldBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color: T.gold, fontFamily: "'DM Mono', monospace",
                }}>{EMPLOYEE.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, color: T.bright, fontSize: 15 }}>{EMPLOYEE.name}</div>
                  <div style={{ color: T.muted, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{EMPLOYEE.id}</div>
                </div>
              </div>
              {[
                { k: "Department",  v: EMPLOYEE.dept },
                { k: "Role",        v: EMPLOYEE.role },
                { k: "Manager",     v: EMPLOYEE.manager },
                { k: "Location",    v: EMPLOYEE.location },
                { k: "Tenure",      v: EMPLOYEE.tenure },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.borderMid}` }}>
                  <span style={{ color: T.muted, fontSize: 11 }}>{k}</span>
                  <span style={{ color: T.text, fontSize: 12, textAlign: "right" as const, maxWidth: 140 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Announcements */}
            <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>ANNOUNCEMENTS</div>
              {ANNOUNCEMENTS.map(a => (
                <div key={a.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderMid}` }}>
                  <span style={{ background: a.color + "18", color: a.color, fontSize: 9, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 3, display: "inline-block", marginBottom: 5 }}>{a.tag}</span>
                  <p style={{ color: T.text, fontSize: 12, lineHeight: 1.5 }}>{a.text}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 12 }}>YOUR ACTIVITY</div>
              {[
                { label: "Requests this month", value: String(requests.length + 2), color: T.teal },
                { label: "Avg resolution time",  value: "1.8 hrs",               color: T.emerald },
                { label: "PTO balance",           value: "14 days",               color: T.violet },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.borderMid}` }}>
                  <span style={{ color: T.muted, fontSize: 11 }}>{s.label}</span>
                  <span style={{ color: s.color, fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DEPT MODAL ── */}
      {deptModal && (() => {
        const d = DEPT_TILES.find(t => t.domain === deptModal)!;
        const dom = DOMAIN_CFG[deptModal];
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setDeptModal(null)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div onClick={e => e.stopPropagation()} style={{
              position: "relative", zIndex: 1,
              background: T.navyMid, border: `1px solid ${dom.color}30`,
              borderRadius: 14, padding: 28, width: 360,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 24 }}>{dom.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: dom.color }}>{deptModal}</div>
                  <div style={{ color: T.muted, fontSize: 12 }}>{d.desc}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>COMMON REQUESTS</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {d.scenarios.map(s => (
                  <button key={s} onClick={() => { setDeptModal(null); submitRequest(s); inputRef.current?.focus(); }} style={{
                    padding: "10px 14px", borderRadius: 8, textAlign: "left" as const,
                    background: dom.color + "0D", border: `1px solid ${dom.color}20`,
                    color: T.text, fontSize: 13, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = dom.color + "50"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = dom.color + "20"}
                  >
                    {s} <span style={{ color: dom.color, float: "right" as const }}>→</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setDeptModal(null)} style={{
                marginTop: 16, width: "100%", padding: "8px 0",
                background: "transparent", border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.muted, cursor: "pointer", fontSize: 12,
              }}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ── REQUEST DRAWER ── */}
      {activeReq && (
        <RequestDrawer
          req={activeReq}
          onClose={() => setActiveReq(null)}
          onApprove={activeReq.status === "pending" ? () => {
            progressRequest(activeReq.id);
            setTimeout(() => progressRequest(activeReq.id), 2000);
          } : undefined}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
      `}</style>
    </div>
  );
}
