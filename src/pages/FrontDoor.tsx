// iOPEX AI FrontDoor — End User Portal
// Visual DNA: iopex-frontdoor-framework.jsx (navy #0B1120, gold #E8A020, Cormorant Garamond)
// Functional pattern: DepartmentAIAssistant + WorkflowExecutionHistory + useAuditLog

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Send, Loader2, Sparkles, ChevronRight, Clock, CheckCircle2,
  X, LogOut, Monitor, Users, DollarSign, Settings, Laptop, Key,
  Lock, Shield, AlertTriangle, Calendar, Heart, User, UserPlus,
  UserMinus, ShoppingCart, Receipt, BarChart2, Building, Plane,
  MessageCircle, ArrowRight
} from "lucide-react";

/* ── Google Fonts injection (matches JSX) ─────────────────────────── */
if (!document.getElementById("iopex-fonts")) {
  const link = document.createElement("link");
  link.id = "iopex-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

/* ── Design tokens (from iopex-frontdoor-framework.jsx) ──────────── */
const T = {
  navy:        "#0B1120",
  surface:     "rgba(255,255,255,0.03)",
  border:      "rgba(255,255,255,0.06)",
  gold:        "#E8A020",
  goldDim:     "rgba(232,160,32,0.12)",
  goldBorder:  "rgba(232,160,32,0.22)",
  text:        "#D4DCE8",
  muted:       "#4A5A70",
  bright:      "#EEF2F8",
  teal:        "#06B6D4",
  violet:      "#8B5CF6",
  rose:        "#F43F5E",
  emerald:     "#10B981",
};

/* ── Layer accent colors (matches framework layers) ──────────────── */
const LAYER_COLORS: Record<string, string> = {
  IT:         T.teal,
  HR:         T.violet,
  Finance:    T.emerald,
  Operations: T.gold,
  Unknown:    T.muted,
};

/* ── Icon map ─────────────────────────────────────────────────────── */
const ICONS: Record<string, React.ElementType> = {
  monitor: Monitor, users: Users, "dollar-sign": DollarSign, settings: Settings,
  laptop: Laptop, key: Key, lock: Lock, shield: Shield,
  "alert-triangle": AlertTriangle, calendar: Calendar, heart: Heart,
  user: User, "user-plus": UserPlus, "user-minus": UserMinus,
  "shopping-cart": ShoppingCart, receipt: Receipt, "bar-chart": BarChart2,
  building: Building, plane: Plane, "message-circle": MessageCircle,
};
const Icon = ({ name, style }: { name: string; style?: React.CSSProperties }) => {
  const C = ICONS[name] || MessageCircle;
  return <C size={16} style={style} />;
};

/* ── Request status config ───────────────────────────────────────── */
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

/* ── Types ───────────────────────────────────────────────────────── */
type View = "home" | "chat" | "catalog" | "requests";
interface Msg { id: string; role: "user" | "assistant"; content: string; isTyping?: boolean; match?: any }

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function FrontDoor() {
  const navigate = useNavigate();
  const [user, setUser]               = useState<any>(null);
  const [customer, setCustomer]       = useState<any>(null);
  const [branding, setBranding]       = useState<any>(null);
  const [catalog, setCatalog]         = useState<any[]>([]);
  const [requests, setRequests]       = useState<any[]>([]);
  const [view, setView]               = useState<View>("home");
  const [selCat, setSelCat]           = useState<any>(null);
  const [input, setInput]             = useState("");
  const [messages, setMessages]       = useState<Msg[]>([]);
  const [sending, setSending]         = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUser(session.user);

    const { data: cust } = await supabase
      .from("customers").select("*").eq("user_id", session.user.id).single();
    if (!cust) return;
    setCustomer(cust);

    const [{ data: b }, { data: cats }, { data: reqs }] = await Promise.all([
      supabase.from("customer_branding").select("*").eq("customer_id", cust.id).single(),
      supabase.from("service_catalog").select("*, catalog_items(*)").eq("customer_id", cust.id).eq("is_active", true).order("sort_order"),
      supabase.from("employee_requests").select("*").eq("submitted_by", session.user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setBranding(b);
    setCatalog(cats || []);
    setRequests(reqs || []);
  }

  async function refreshRequests() {
    if (!user) return;
    const { data } = await supabase.from("employee_requests").select("*")
      .eq("submitted_by", user.id).order("created_at", { ascending: false }).limit(20);
    if (data) setRequests(data);
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setView("chat");
    setMessages(p => [
      ...p,
      { id: crypto.randomUUID(), role: "user", content: msg },
      { id: crypto.randomUUID(), role: "assistant", content: "", isTyping: true },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke("intelligent-assistant", {
        body: { query: msg, customerId: customer?.id, userId: user?.id },
      });
      setMessages(p => p.filter(m => !m.isTyping));
      if (error || !data) throw new Error("classifier error");

      const reply = data.responseText || buildReply(data);
      setMessages(p => [...p, { id: crypto.randomUUID(), role: "assistant", content: reply, match: data.catalogMatch }]);
      if (data.requestId) { await refreshRequests(); toast.success("Request logged — we're on it."); }
    } catch {
      setMessages(p => [...p.filter(m => !m.isTyping), {
        id: crypto.randomUUID(), role: "assistant",
        content: "I couldn't process that right now. Try rephrasing or browse the catalog below.",
      }]);
    } finally { setSending(false); }
  }

  function buildReply(d: any) {
    if (d.confidence < 0.7) return "Could you give me a bit more detail? I want to make sure this goes to the right place.";
    if (d.catalogMatch) return `Got it — I've logged your **${d.catalogMatch.name}** request and it's being routed now. Check "My Requests" for status updates.`;
    return `Your ${d.domain?.toLowerCase() || ""} request has been captured and is being reviewed.`;
  }

  /* ── Derived ──────────────────────────────────────────────────── */
  const accent      = branding?.primary_color || T.gold;
  const companyName = branding?.company_display_name || customer?.company_name || "iOPEX FrontDoor";
  const tagline     = branding?.portal_tagline  || "How can we help you today?";
  const welcome     = branding?.welcome_message || "Describe what you need — our AI will route it in under 300ms.";
  const openCount   = requests.filter(r => !["completed","cancelled"].includes(r.status)).length;

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ background: T.navy, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: `1px solid ${T.border}`,
        background: `${T.navy}F0`, backdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: T.goldDim, border: `1px solid ${T.goldBorder}`, fontSize: 16,
            }}>⬡</div>
            <div>
              <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>iOPEX Technologies</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.bright, lineHeight: 1 }}>{companyName}</div>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 2 }}>
            {(["home","catalog","requests"] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                background: view === v ? "rgba(255,255,255,0.07)" : "transparent",
                color: view === v ? T.bright : T.muted,
                transition: "all 0.15s",
              }}>
                {v === "requests" ? `My Requests${openCount > 0 ? ` (${openCount})` : ""}` : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", padding: 6 }}>
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* ════════════ HOME ════════════════════════════════════ */}
        {view === "home" && (
          <div>
            {/* Hero */}
            <div style={{ textAlign: "center", padding: "24px 0 40px" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                AI FrontDoor · Powered by iOPEX
              </p>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 700, color: T.bright, letterSpacing: "-0.01em", lineHeight: 1.15, marginBottom: 10 }}>
                {tagline}
              </h1>
              <p style={{ fontSize: 13, color: T.muted, maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.6 }}>{welcome}</p>

              {/* Chat input — hero */}
              <div style={{ maxWidth: 560, margin: "0 auto" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "12px 16px",
                  transition: "border-color 0.2s",
                }}>
                  <Sparkles size={15} color={T.muted} style={{ flexShrink: 0 }} />
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="I need a new laptop… PTO next week… Salesforce access…"
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.bright,
                    }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || sending}
                    style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: 7, border: "none",
                      background: input.trim() ? accent : "rgba(255,255,255,0.06)",
                      cursor: input.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}>
                    {sending ? <Loader2 size={13} color="white" style={{ animation: "spin 1s linear infinite" }} />
                             : <Send size={13} color="white" />}
                  </button>
                </div>
                <p style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#2A3A4A", marginTop: 8 }}>
                  Signal Engine · &lt;300ms routing · TrustCore audit
                </p>
              </div>
            </div>

            {/* Catalog category tiles */}
            {catalog.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Browse by category</p>
                  <button onClick={() => setView("catalog")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {catalog.map(cat => (
                    <button key={cat.id} onClick={() => { setSelCat(cat); setView("catalog"); }}
                      style={{
                        padding: "16px 18px", borderRadius: 10, textAlign: "left",
                        background: T.surface, border: `1px solid ${T.border}`,
                        cursor: "pointer", transition: "all 0.18s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}44`; (e.currentTarget as HTMLElement).style.background = `${cat.color}08`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.surface; }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, marginBottom: 10,
                        background: `${cat.color}18`, border: `1px solid ${cat.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name={cat.icon} style={{ color: cat.color }} />
                      </div>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: T.bright, marginBottom: 3 }}>{cat.name}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{cat.catalog_items?.length || 0} services</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent requests strip */}
            {requests.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Recent activity</p>
                  <button onClick={() => setView("requests")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {requests.slice(0, 3).map(req => {
                    const s = STATUS[req.status] || STATUS.submitted;
                    return (
                      <div key={req.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                      }}>
                        <span style={{
                          fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600, padding: "2px 8px",
                          borderRadius: 20, border: `1px solid ${s.color}30`,
                          background: `${s.color}12`, color: s.color, whiteSpace: "nowrap",
                        }}>{s.label}</span>
                        <p style={{ flex: 1, fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.title}</p>
                        <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>
                          {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Architecture hint — 5 layers */}
            <div style={{ marginTop: 48, padding: "20px 24px", background: T.goldDim, border: `1px solid ${T.goldBorder}`, borderRadius: 12 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: T.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Powered by iOPEX AI FrontDoor Architecture
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Engagement Gateway", color: T.teal },
                  { label: "Signal Engine",       color: T.gold },
                  { label: "WorkStream",          color: T.violet },
                  { label: "TrustCore",           color: T.rose },
                  { label: "Nexus Plane",         color: T.emerald },
                ].map(l => (
                  <span key={l.label} style={{
                    fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "3px 10px",
                    borderRadius: 20, border: `1px solid ${l.color}30`,
                    background: `${l.color}10`, color: l.color,
                  }}>{l.label}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ CHAT ════════════════════════════════════ */}
        {view === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: 80 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: T.muted }}>Signal Engine ready</p>
                  <p style={{ fontSize: 12, color: "#2A3A4A", marginTop: 4 }}>Describe what you need</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={{
                    maxWidth: 520, padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                    background: msg.role === "user" ? accent : "rgba(255,255,255,0.05)",
                    color: msg.role === "user" ? "white" : T.text,
                    borderTopRightRadius: msg.role === "user" ? 4 : 12,
                    borderTopLeftRadius:  msg.role === "user" ? 12 : 4,
                  }}>
                    {msg.isTyping ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.muted, animation: `bounce 1s ${i*0.15}s infinite` }} />)}
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        {msg.match && (
                          <button onClick={() => send(`I'd like to submit a "${msg.match.name}" request.`)}
                            style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.gold, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            <ArrowRight size={12} /> Submit {msg.match.name}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>

            {/* Input */}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "12px 16px",
              }}>
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Type your request…"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.bright }}
                />
                <button onClick={() => send()} disabled={!input.trim() || sending}
                  style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: 7, border: "none",
                    background: input.trim() ? accent : "rgba(255,255,255,0.06)",
                    cursor: input.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {sending ? <Loader2 size={13} color="white" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} color="white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ CATALOG ═════════════════════════════════ */}
        {view === "catalog" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              {selCat && (
                <button onClick={() => setSelCat(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}>
                  <X size={15} />
                </button>
              )}
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: T.bright }}>
                {selCat ? selCat.name : "Service Catalog"}
              </h1>
            </div>

            {!selCat ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {catalog.map(cat => (
                  <button key={cat.id} onClick={() => setSelCat(cat)}
                    style={{ padding: "20px", borderRadius: 10, textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, cursor: "pointer", transition: "all 0.18s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}44`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cat.color}18`, border: `1px solid ${cat.color}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <Icon name={cat.icon} style={{ color: cat.color }} />
                      </div>
                      <ChevronRight size={14} color={T.muted} />
                    </div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: T.bright, marginBottom: 4 }}>{cat.name}</p>
                    <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 8 }}>{cat.description}</p>
                    <p style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#2A3A4A" }}>{cat.catalog_items?.length || 0} services available</p>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {(selCat.catalog_items || []).map((item: any) => (
                  <button key={item.id} onClick={() => send(`I'd like to submit a "${item.name}" request.`)}
                    style={{ padding: "16px", borderRadius: 10, textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, cursor: "pointer", transition: "all 0.18s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${selCat.color}44`; (e.currentTarget as HTMLElement).style.background = `${selCat.color}08`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.surface; }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${selCat.color}15`, border: `1px solid ${selCat.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name={item.icon} style={{ color: selCat.color }} />
                      </div>
                      <ArrowRight size={13} color={T.muted} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.bright, marginBottom: 3 }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.4, marginBottom: 8 }}>{item.description}</p>
                    {item.estimated_sla_hours && (
                      <p style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#2A3A4A", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={10} />
                        {item.estimated_sla_hours < 24 ? `${item.estimated_sla_hours}h` : `${Math.round(item.estimated_sla_hours / 24)}d`}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ MY REQUESTS ═════════════════════════════ */}
        {view === "requests" && (
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: T.bright, marginBottom: 24 }}>My Requests</h1>

            {requests.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 80 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: T.muted }}>No requests yet</p>
                <button onClick={() => setView("home")} style={{
                  marginTop: 16, padding: "8px 20px", borderRadius: 8, border: "none",
                  background: T.goldDim, border: `1px solid ${T.goldBorder}`,
                  color: T.gold, cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                }}>Submit your first request</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {requests.map(req => {
                  const s = STATUS[req.status] || STATUS.submitted;
                  return (
                    <div key={req.id} style={{ padding: "14px 18px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: T.bright, marginBottom: 4 }}>{req.title}</p>
                          {req.description && <p style={{ fontSize: 12, color: T.muted, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as any}>{req.description}</p>}
                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            {req.domain && (
                              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: "2px 8px", borderRadius: 20, background: `${LAYER_COLORS[req.domain] || T.muted}12`, border: `1px solid ${LAYER_COLORS[req.domain] || T.muted}25`, color: LAYER_COLORS[req.domain] || T.muted }}>{req.domain}</span>
                            )}
                            <span style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
                              {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            {req.external_ticket_ref && <span style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{req.external_system} · {req.external_ticket_ref}</span>}
                          </div>
                          {req.sla_due_at && !["completed","cancelled"].includes(req.status) && (
                            <p style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: req.sla_breached ? T.rose : "#2A3A4A", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={10} />{req.sla_breached ? "SLA breached · " : "Due "}
                              {new Date(req.sla_due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600, whiteSpace: "nowrap",
                          padding: "3px 10px", borderRadius: 20, border: `1px solid ${s.color}30`,
                          background: `${s.color}12`, color: s.color,
                        }}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Keyframe styles ───────────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(232,160,32,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}
