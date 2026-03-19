import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Monitor, Users, DollarSign, Settings, Laptop, Key, Lock, Shield,
  AlertTriangle, Calendar, Heart, User, UserPlus, UserMinus,
  ShoppingCart, Receipt, BarChart2, Building, Plane, MessageCircle,
  ArrowRight, Clock, CheckCircle2, Loader2, Send, Sparkles,
  ChevronRight, Bell, Search, LogOut, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Icon map for catalog icons stored as strings ────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  monitor: Monitor, users: Users, "dollar-sign": DollarSign, settings: Settings,
  laptop: Laptop, key: Key, lock: Lock, shield: Shield,
  "alert-triangle": AlertTriangle, calendar: Calendar, heart: Heart,
  user: User, "user-plus": UserPlus, "user-minus": UserMinus,
  "shopping-cart": ShoppingCart, receipt: Receipt, "bar-chart": BarChart2,
  building: Building, plane: Plane, "message-circle": MessageCircle,
};
const DynIcon = ({ name, className }: { name: string; className?: string }) => {
  const Comp = ICON_MAP[name] || MessageCircle;
  return <Comp className={className} />;
};

// ── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted:            { label: "Submitted",         color: "bg-blue-500/10 text-blue-400 border-blue-500/20",    icon: Clock },
  ai_routing:           { label: "Routing…",          color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Sparkles },
  pending_human_review: { label: "Under Review",      color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
  in_progress:          { label: "In Progress",       color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: Loader2 },
  pending_approval:     { label: "Awaiting Approval", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: Clock },
  completed:            { label: "Completed",         color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  cancelled:            { label: "Cancelled",         color: "bg-slate-500/10 text-slate-400 border-slate-500/20",  icon: X },
  failed:               { label: "Failed",            color: "bg-red-500/10 text-red-400 border-red-500/20",       icon: AlertTriangle },
};

// ── Chat message types ───────────────────────────────────────────────────
type ChatRole = "user" | "assistant";
interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  catalogMatch?: { name: string; description: string; icon: string; id: string } | null;
}

// ── Main component ───────────────────────────────────────────────────────
export default function EmployeePortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [catalogCategories, setCatalogCategories] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [view, setView] = useState<"home" | "chat" | "catalog" | "requests">("home");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadPortalData(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadPortalData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUser(session.user);

    // Load customer context for this user
    const { data: customer } = await supabase
      .from("customers")
      .select("id, company_name")
      .eq("user_id", session.user.id)
      .single();

    if (customer) {
      // Branding
      const { data: b } = await supabase
        .from("customer_branding")
        .select("*")
        .eq("customer_id", customer.id)
        .single();
      setBranding(b);

      // Service catalog
      const { data: cats } = await supabase
        .from("service_catalog")
        .select("*, catalog_items(*)")
        .eq("customer_id", customer.id)
        .eq("is_active", true)
        .order("sort_order");
      setCatalogCategories(cats || []);

      // My recent requests
      const { data: reqs } = await supabase
        .from("employee_requests")
        .select("*")
        .eq("submitted_by", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setMyRequests(reqs || []);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || isSending) return;
    const input = chatInput.trim();
    setChatInput("");
    setIsSending(true);
    setView("chat");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: input, timestamp: new Date(),
    };
    const typingMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "assistant", content: "", timestamp: new Date(), isTyping: true,
    };
    setMessages(prev => [...prev, userMsg, typingMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("intent-classifier", {
        body: { input, userId: user?.id },
      });

      setMessages(prev => prev.filter(m => !m.isTyping));

      if (error || !data) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: "assistant",
          content: "I had trouble understanding that request. Could you rephrase it? You can also browse the catalog below.",
          timestamp: new Date(),
        }]);
      } else {
        const { domain, intent, confidence, catalogMatch, responseText } = data;
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: "assistant",
          content: responseText || buildResponseText(domain, intent, confidence, catalogMatch),
          timestamp: new Date(), catalogMatch,
        }]);

        // Auto-refresh my requests if one was created
        const { data: reqs } = await supabase
          .from("employee_requests")
          .select("*")
          .eq("submitted_by", user?.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (reqs) setMyRequests(reqs);
      }
    } catch {
      setMessages(prev => [...prev.filter(m => !m.isTyping), {
        id: crypto.randomUUID(), role: "assistant",
        content: "Something went wrong. Please try again or browse the catalog.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
    }
  }

  function buildResponseText(domain: string, intent: string, confidence: number, match: any) {
    if (confidence < 0.7) {
      return `I want to make sure I route this correctly. Could you give me a bit more detail? Or browse the catalog to find exactly what you need.`;
    }
    if (match) {
      return `Got it — this looks like a **${match.name}** request. I've logged it and it's being routed now. You'll see it in "My Requests" and we'll notify you when there's an update.`;
    }
    return `I've captured your ${domain?.toLowerCase() || ""} request and it's being reviewed. You'll receive an update shortly.`;
  }

  function handleCatalogItemClick(item: any) {
    const greeting = `I'd like to submit a "${item.name}" request.`;
    setChatInput(greeting);
    setView("chat");
    setTimeout(() => sendChatMessageWith(greeting), 100);
  }

  async function sendChatMessageWith(input: string) {
    if (isSending) return;
    setIsSending(true);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: input, timestamp: new Date(),
    };
    const typingMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "assistant", content: "", timestamp: new Date(), isTyping: true,
    };
    setMessages(prev => [...prev, userMsg, typingMsg]);

    try {
      const { data } = await supabase.functions.invoke("intent-classifier", {
        body: { input, userId: user?.id },
      });
      setMessages(prev => prev.filter(m => !m.isTyping));
      const { domain, intent, confidence, catalogMatch, responseText } = data || {};
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: responseText || buildResponseText(domain, intent, confidence, catalogMatch),
        timestamp: new Date(), catalogMatch,
      }]);
    } catch {
      setMessages(prev => [...prev.filter(m => !m.isTyping), {
        id: crypto.randomUUID(), role: "assistant",
        content: "Something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
    }
  }

  // ── Derived branding ─────────────────────────────────────────────────
  const primaryColor = branding?.primary_color || "#2563EB";
  const companyName = branding?.company_display_name || "Your Company";
  const portalTagline = branding?.portal_tagline || "How can we help you today?";
  const welcomeMessage = branding?.welcome_message || "Describe what you need and our AI will handle the rest.";

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ── TOP NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={companyName} className="h-7 w-auto" />
            ) : (
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ background: primaryColor }}
              >
                {companyName[0]}
              </div>
            )}
            <span className="font-semibold text-slate-100 text-sm">{companyName}</span>
          </div>

          <div className="flex items-center gap-1">
            {(["home", "catalog", "requests"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  view === v
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {v === "requests" ? `My Requests ${myRequests.length > 0 ? `(${myRequests.filter(r => r.status !== "completed" && r.status !== "cancelled").length})` : ""}` : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── HOME ─────────────────────────────────────────────────── */}
        {view === "home" && (
          <div className="space-y-10">
            {/* Hero */}
            <div className="text-center space-y-4 pt-4">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
                {portalTagline}
              </h1>
              <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                {welcomeMessage}
              </p>

              {/* Chat input — hero placement */}
              <div className="max-w-xl mx-auto mt-6">
                <div className="relative flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-slate-500 transition-colors shadow-lg">
                  <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                    placeholder="I need a new laptop… or PTO next Friday… or Salesforce access…"
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isSending}
                    className="shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style={{ background: chatInput.trim() ? primaryColor : undefined }}
                  >
                    <Send className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-2">Powered by iOPEX AI Signal Engine · routed in &lt;300ms</p>
              </div>
            </div>

            {/* Quick catalog tiles */}
            {catalogCategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Browse by category</h2>
                  <button onClick={() => setView("catalog")} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    View all <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {catalogCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat); setView("catalog"); }}
                      className="group p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}30` }}
                      >
                        <DynIcon name={cat.icon} className="h-4 w-4" style={{ color: cat.color } as any} />
                      </div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{cat.catalog_items?.length || 0} services</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent requests preview */}
            {myRequests.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Recent requests</h2>
                  <button onClick={() => setView("requests")} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    View all <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {myRequests.slice(0, 3).map(req => {
                    const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
                    return (
                      <div key={req.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sc.color}`}>
                          {sc.label}
                        </div>
                        <p className="flex-1 text-sm text-slate-300 truncate">{req.title}</p>
                        <p className="text-xs text-slate-600 shrink-0">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT ─────────────────────────────────────────────────── */}
        {view === "chat" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Describe what you need — I'll route it instantly.</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-lg ${msg.role === "user" ? "order-1" : ""}`}>
                    {msg.isTyping ? (
                      <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0,1,2].map(i => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "text-white rounded-tr-sm"
                          : "bg-slate-800 text-slate-200 rounded-tl-sm"
                      }`} style={msg.role === "user" ? { background: primaryColor } : {}}>
                        {msg.content}
                        {msg.catalogMatch && (
                          <button
                            onClick={() => handleCatalogItemClick(msg.catalogMatch)}
                            className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                          >
                            <ArrowRight className="h-3 w-3" />
                            Submit {msg.catalogMatch.name}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input — sticky bottom */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-slate-500 transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                  placeholder="Type your request…"
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
                  autoFocus
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isSending}
                  className="shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40"
                  style={{ background: chatInput.trim() ? primaryColor : undefined }}
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Send className="h-3.5 w-3.5 text-white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CATALOG ──────────────────────────────────────────────── */}
        {view === "catalog" && (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <button onClick={() => setSelectedCategory(null)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
              <h1 className="text-xl font-semibold text-slate-100">
                {selectedCategory ? selectedCategory.name : "Service Catalog"}
              </h1>
            </div>

            {!selectedCategory ? (
              // Category grid
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catalogCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className="group p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}30` }}
                      >
                        <DynIcon name={cat.icon} className="h-5 w-5" style={{ color: cat.color } as any} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-200 group-hover:text-white">{cat.name}</p>
                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{cat.description}</p>
                        <p className="text-xs text-slate-600 mt-2">{cat.catalog_items?.length || 0} services available</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              // Items in selected category
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedCategory.catalog_items || []).map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => handleCatalogItemClick(item)}
                    className="group p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${selectedCategory.color}15`, border: `1px solid ${selectedCategory.color}25` }}
                      >
                        <DynIcon name={item.icon} className="h-4 w-4" style={{ color: selectedCategory.color } as any} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-200 group-hover:text-white">{item.name}</p>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                        {item.estimated_sla_hours && (
                          <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Usually within {item.estimated_sla_hours < 24
                              ? `${item.estimated_sla_hours}h`
                              : `${Math.round(item.estimated_sla_hours / 24)} day${item.estimated_sla_hours >= 48 ? "s" : ""}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY REQUESTS ──────────────────────────────────────────── */}
        {view === "requests" && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold text-slate-100">My Requests</h1>

            {myRequests.length === 0 ? (
              <div className="text-center py-20">
                <MessageCircle className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">No requests yet.</p>
                <button
                  onClick={() => setView("home")}
                  className="mt-4 text-xs px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ background: primaryColor }}
                >
                  Submit your first request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map(req => {
                  const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-200 text-sm">{req.title}</p>
                          {req.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {req.domain && (
                              <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                                {req.domain}
                              </span>
                            )}
                            {req.external_ticket_ref && (
                              <span className="text-xs text-slate-500">{req.external_system} · {req.external_ticket_ref}</span>
                            )}
                            <span className="text-xs text-slate-600">
                              {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </div>
                      </div>
                      {req.sla_due_at && req.status !== "completed" && req.status !== "cancelled" && (
                        <div className={`mt-3 text-xs flex items-center gap-1.5 ${
                          req.sla_breached ? "text-red-400" : "text-slate-500"
                        }`}>
                          <Clock className="h-3 w-3" />
                          {req.sla_breached ? "SLA breached · " : "Due "}
                          {new Date(req.sla_due_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
