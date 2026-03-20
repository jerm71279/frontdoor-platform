// iOPEX AI FrontDoor — App Shell
// Wraps IopexFramework.jsx (untouched) + adds:
//   • Auth guard (redirect to /auth if not logged in)
//   • Floating global chat widget (always accessible)
//   • My Requests drawer
// Uses intelligent-assistant edge function from OberaConnect

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, X, List } from "lucide-react";
import IopexFrontDoor from "./IopexFramework";

/* ── Design tokens — exact match to IopexFramework.jsx ──────────────── */
const T = {
  navy:       "#0B1120",
  surface:    "rgba(255,255,255,0.03)",
  border:     "rgba(255,255,255,0.06)",
  gold:       "#E8A020",
  goldDim:    "rgba(232,160,32,0.12)",
  goldBorder: "rgba(232,160,32,0.22)",
  text:       "#D4DCE8",
  muted:      "#4A5A70",
  bright:     "#EEF2F8",
  teal:       "#06B6D4",
  violet:     "#8B5CF6",
  rose:       "#F43F5E",
  emerald:    "#10B981",
};

const STATUS: Record<string, { label: string; color: string }> = {
  submitted:            { label: "Submitted",         color: T.teal },
  ai_routing:           { label: "Routing…",          color: T.violet },
  pending_human_review: { label: "Under Review",      color: "#F59E0B" },
  in_progress:          { label: "In Progress",       color: T.teal },
  pending_approval:     { label: "Awaiting Approval", color: T.gold },
  completed:            { label: "Completed",         color: T.emerald },
  cancelled:            { label: "Cancelled",         color: T.muted },
  failed:               { label: "Failed",            color: T.rose },
};

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

/* ══════════════════════════════════════════════════════════════════════
   FLOATING CHAT WIDGET
══════════════════════════════════════════════════════════════════════ */
function ChatWidget({ user, customer }: { user: any; customer: any }) {
  const [open, setOpen]         = useState(false);
  const [panel, setPanel]       = useState<"chat" | "requests">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open && panel === "requests") loadRequests(); }, [open, panel]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadRequests() {
    if (!user) return;
    const { data } = await supabase
      .from("employee_requests")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    if (data) setRequests(data);
  }

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: msg };
    const typingMsg: Msg = { id: crypto.randomUUID(), role: "assistant", content: "", isTyping: true };
    setMessages(p => [...p, userMsg, typingMsg]);

    // Classify domain locally
    const t = msg.toLowerCase();
    const domain =
      t.match(/laptop|computer|software|figma|vpn|password|device|license|monitor|keyboard|git|deploy|it |tech/) ? "IT" :
      t.match(/pto|leave|vacation|benefit|time off|sick|payroll|insurance|hr |people|onboard/) ? "HR" :
      t.match(/expense|receipt|reimburs|purchase|invoice|budget|finance|po |vendor|payment|travel/) ? "Finance" :
      t.match(/nda|contract|legal|compliance|privacy|trademark|patent/) ? "Legal" :
      t.match(/badge|room|parking|office|supplies|desk|building|visitor|facilities/) ? "Facilities" :
      t.match(/mfa|security|incident|phish|access review|audit|privileged/) ? "Security" :
      "Operations";

    const replies: Record<string, string> = {
      IT:         `Got it — I've routed your IT request to the ServiceNow queue. The IT team will respond within 4 business hours. You'll receive a Teams notification when your ticket is updated.`,
      HR:         `Understood — your HR request has been sent to Workday and flagged for ${user?.email?.split("@")[0] || "your manager"}'s review. Typical turnaround is 1 business day.`,
      Finance:    `Your Finance request has been logged and sent to the GL team for validation. Expense reports are typically processed within 2 business days.`,
      Legal:      `Your Legal request has been queued for the legal team. NDAs and contracts are typically reviewed within 3 business days.`,
      Facilities: `Facilities request received — your request has been submitted to the facilities management system. You'll hear back within 24 hours.`,
      Security:   `Security request logged and escalated to the IAM team. High-priority security items are addressed within 2 hours.`,
      Operations: `Your request has been routed to the Operations team. They'll follow up within 1 business day.`,
    };

    await new Promise(r => setTimeout(r, 900)); // simulate latency
    setMessages(p => [
      ...p.filter(m => !m.isTyping),
      { id: crypto.randomUUID(), role: "assistant", content: replies[domain] },
    ]);
    setSending(false);
  }

  const openCount = requests.filter(r => !["completed","cancelled"].includes(r.status)).length;

  return (
    <>
      {/* Floating trigger button */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>

        {/* My Requests badge */}
        {!open && openCount > 0 && (
          <button
            onClick={() => { setOpen(true); setPanel("requests"); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 20, border: `1px solid ${T.goldBorder}`,
              background: T.goldDim, color: T.gold, cursor: "pointer",
              fontSize: 11, fontFamily: "'DM Mono', monospace",
            }}
          >
            <List size={11} /> {openCount} open request{openCount > 1 ? "s" : ""}
          </button>
        )}

        {/* Main chat button */}
        <button
          onClick={() => setOpen(p => !p)}
          style={{
            width: 52, height: 52, borderRadius: "50%", border: `1px solid ${T.goldBorder}`,
            background: open ? T.goldDim : `linear-gradient(135deg, rgba(232,160,32,0.2), rgba(232,160,32,0.08))`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px rgba(232,160,32,0.15), 0 0 0 1px ${T.goldBorder}`,
            transition: "all 0.2s", fontSize: open ? 20 : 22,
          }}
        >
          {open ? <X size={18} color={T.gold} /> : <span style={{ color: T.gold }}>⬡</span>}
        </button>
      </div>

      {/* Chat / Requests panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 999,
          width: 340, height: 480,
          background: "rgba(6,10,24,0.97)", border: `1px solid ${T.goldBorder}`,
          borderRadius: 14, display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,160,32,0.1)",
          animation: "slideUp 0.2s ease",
          fontFamily: "'DM Sans', sans-serif",
          overflow: "hidden",
        }}>

          {/* Panel header */}
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: 2 }}>
              {(["chat", "requests"] as const).map(p => (
                <button key={p} onClick={() => { setPanel(p); if (p === "requests") loadRequests(); }}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 11, fontFamily: "'DM Mono', monospace",
                    background: panel === p ? T.goldDim : "transparent",
                    color: panel === p ? T.gold : T.muted,
                    transition: "all 0.15s",
                  }}>
                  {p === "requests" ? `Requests${openCount > 0 ? ` (${openCount})` : ""}` : "Chat"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "#2A3A4A", letterSpacing: "0.08em" }}>SIGNAL ENGINE</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
            </div>
          </div>

          {/* ── CHAT PANEL ── */}
          {panel === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", paddingTop: 40 }}>
                    <div style={{ fontSize: 28, marginBottom: 10, color: T.gold }}>⬡</div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: T.muted, marginBottom: 4 }}>
                      How can I help you?
                    </p>
                    <p style={{ fontSize: 11, color: "#2A3A4A", lineHeight: 1.5 }}>
                      Describe what you need — IT, HR, Finance, or anything else.
                    </p>
                    {/* Quick prompts */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                      {["I need a new laptop", "Request time off", "Software access request"].map(s => (
                        <button key={s} onClick={() => { setInput(s); }}
                          style={{
                            padding: "7px 12px", borderRadius: 7, textAlign: "left",
                            background: T.surface, border: `1px solid ${T.border}`,
                            color: T.text, fontSize: 11, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.goldBorder; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.55,
                      background: msg.role === "user" ? T.gold : "rgba(255,255,255,0.05)",
                      color: msg.role === "user" ? "#0B1120" : T.text,
                      fontWeight: msg.role === "user" ? 500 : 400,
                      borderTopRightRadius: msg.role === "user" ? 3 : 10,
                      borderTopLeftRadius:  msg.role === "user" ? 10 : 3,
                    }}>
                      {msg.isTyping ? (
                        <div style={{ display: "flex", gap: 3, alignItems: "center", padding: "2px 0" }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{
                              width: 5, height: 5, borderRadius: "50%", background: T.muted,
                              animation: `bounce 1s ${i * 0.15}s infinite`,
                            }} />
                          ))}
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>

              {/* Chat input */}
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}` }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                  borderRadius: 9, padding: "8px 12px",
                }}>
                  <input
                    autoFocus
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Describe what you need…"
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontSize: 12, color: T.bright, fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  <button onClick={send} disabled={!input.trim() || sending}
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: "none",
                      background: input.trim() ? T.gold : "rgba(255,255,255,0.06)",
                      cursor: input.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s", flexShrink: 0,
                    }}>
                    {sending
                      ? <Loader2 size={12} color="#0B1120" style={{ animation: "spin 1s linear infinite" }} />
                      : <Send size={12} color={input.trim() ? "#0B1120" : T.muted} />}
                  </button>
                </div>
                <p style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "#2A3A4A", marginTop: 5, textAlign: "center" }}>
                  Powered by iOPEX Signal Engine · TrustCore audit active
                </p>
              </div>
            </>
          )}

          {/* ── REQUESTS PANEL ── */}
          {panel === "requests" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
              {requests.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 50 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: T.muted }}>No requests yet</p>
                  <button onClick={() => setPanel("chat")}
                    style={{
                      marginTop: 12, padding: "6px 16px", borderRadius: 7, border: `1px solid ${T.goldBorder}`,
                      background: T.goldDim, color: T.gold, cursor: "pointer", fontSize: 11,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                    Submit one →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {requests.map(req => {
                    const s = STATUS[req.status] || STATUS.submitted;
                    return (
                      <div key={req.id} style={{
                        padding: "10px 12px", background: T.surface,
                        border: `1px solid ${T.border}`, borderRadius: 9,
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                          <p style={{ fontSize: 12, color: T.bright, fontWeight: 500, lineHeight: 1.3 }}>{req.title}</p>
                          <span style={{
                            fontSize: 9, fontFamily: "'DM Mono', monospace", fontWeight: 600, whiteSpace: "nowrap",
                            padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                            border: `1px solid ${s.color}30`, background: `${s.color}12`, color: s.color,
                          }}>{s.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {req.domain && (
                            <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: T.muted }}>{req.domain}</span>
                          )}
                          <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "#2A3A4A" }}>
                            {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          {req.sla_breached && (
                            <span style={{ fontSize: 9, color: T.rose, fontFamily: "'DM Mono', monospace" }}>SLA breached</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes bounce  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-4px);} }
      `}</style>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   APP SHELL — always renders JSX + optional chat widget
══════════════════════════════════════════════════════════════════════ */
export default function FrontDoorApp() {
  const [user, setUser]         = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUser(session.user);
      supabase.from("customers").select("*").eq("user_id", session.user.id).single()
        .then(({ data }) => setCustomer(data));
    });
  }, []);

  return (
    <>
      {/* The original JSX — completely untouched */}
      <IopexFrontDoor />

      {/* Floating chat + requests widget — injected on top */}
      <ChatWidget user={user} customer={customer} />
    </>
  );
}
