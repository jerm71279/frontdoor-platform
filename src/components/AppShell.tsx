/**
 * iOPEX FrontDoor — Unified App Shell
 * Top nav present on every page. One app, all surfaces.
 * Includes demo user switcher in the top-right for quick persona switching.
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const T = {
  navyDeep:   "#080E1A",
  gold:       "#E8A020",
  goldDim:    "rgba(232,160,32,0.10)",
  goldBorder: "rgba(232,160,32,0.22)",
  muted:      "#3D5068",
  text:       "#C8D4E4",
  bright:     "#ECF1FA",
  border:     "rgba(255,255,255,0.06)",
  teal:       "#06B6D4",
  violet:     "#8B5CF6",
  emerald:    "#10B981",
  amber:      "#F59E0B",
  rose:       "#F43F5E",
  navy:       "#0B1120",
  navyCard:   "#111927",
};

const DEMO_USERS = [
  { name: "Jordan Lee",       email: "jordan.lee@acmecorp.com",       dept: "IT",         avatar: "JL", color: "#06B6D4" },
  { name: "Maya Patel",       email: "maya.patel@acmecorp.com",       dept: "HR",         avatar: "MP", color: "#8B5CF6" },
  { name: "Carlos Rodriguez", email: "carlos.rodriguez@acmecorp.com", dept: "Finance",    avatar: "CR", color: "#10B981" },
  { name: "Sarah Kim",        email: "sarah.kim@acmecorp.com",        dept: "Legal",      avatar: "SK", color: "#F59E0B" },
  { name: "Marcus Thompson",  email: "marcus.thompson@acmecorp.com",  dept: "Facilities", avatar: "MT", color: "#38BDF8" },
  { name: "Priya Singh",      email: "priya.singh@acmecorp.com",      dept: "Security",   avatar: "PS", color: "#F43F5E" },
  { name: "David Chen",       email: "david.chen@acmecorp.com",       dept: "Operations", avatar: "DC", color: "#84CC16" },
  { name: "Rachel Foster",    email: "rachel.foster@acmecorp.com",    dept: "Marketing",  avatar: "RF", color: "#EC4899" },
  { name: "James Wilson",     email: "james.wilson@acmecorp.com",     dept: "IT",         avatar: "JW", color: "#06B6D4" },
  { name: "Aisha Johnson",    email: "aisha.johnson@acmecorp.com",    dept: "HR",         avatar: "AJ", color: "#8B5CF6" },
];
const DEMO_PASSWORD = "Acme@2026!";
const SUPA_URL = "https://kroqooyprcvzzgkclvmy.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtyb3Fvb3lwcmN2enpna2Nsdm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTQ5ODEsImV4cCI6MjA4OTUzMDk4MX0.yqmJ_7Ka2qgITspGqhFCpET4fM7-LEvtfrTQo8EsHEk";

const NAV_ITEMS = [
  { label: "Employee Portal",   path: "/",                           icon: "◎", color: T.teal },
  { label: "AI Control Tower",  path: "/governance/control-tower",   icon: "⬡", color: T.gold },
  { label: "Failure Recovery",  path: "/governance/failure-recovery",icon: "⟳", color: T.violet },
  { label: "End User Journey",  path: "/journey",                    icon: "◈", color: T.emerald },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate        = useNavigate();
  const { pathname }    = useLocation();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeItem = NAV_ITEMS.slice().reverse().find(n =>
    pathname === n.path || pathname.startsWith(n.path + "/")
  ) || NAV_ITEMS[0];

  const currentUser = profile
    ? DEMO_USERS.find(u => u.email === profile.email) ?? null
    : null;

  const switchTo = async (email: string) => {
    setSwitching(email);
    setOpen(false);
    try {
      const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
        body: JSON.stringify({ email, password: DEMO_PASSWORD }),
      });
      if (!res.ok) { setSwitching(null); return; }
      const data = await res.json();
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      navigate("/portal");
    } finally {
      setSwitching(null);
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/auth");
  };

  const avatarColor = currentUser?.color ?? T.gold;
  const avatarText  = currentUser?.avatar ?? (profile ? profile.avatar : "?");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* ── Unified top bar ── */}
      <div style={{
        background: T.navyDeep,
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px",
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 300,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => navigate("/")}>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="none" stroke={T.gold} strokeWidth="1.5" />
            <polygon points="16,8 24,12.5 24,21.5 16,26 8,21.5 8,12.5" fill={T.goldDim} stroke={T.gold} strokeWidth="0.7" />
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: T.gold }}>
            iOPEX FrontDoor
          </span>
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = item === activeItem;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px",
                  background: active ? item.color + "12" : "transparent",
                  border: `1px solid ${active ? item.color + "35" : "transparent"}`,
                  borderRadius: 6,
                  color: active ? item.color : T.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = T.text; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = "transparent"; } }}
              >
                <span style={{ fontSize: 11 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right: live indicator + user switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
            <span style={{ color: T.emerald, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>LIVE</span>
          </div>

          {/* User avatar / switcher button */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: open ? "rgba(255,255,255,0.06)" : "transparent",
                border: `1px solid ${open ? T.goldBorder : T.border}`,
                borderRadius: 8, padding: "4px 10px 4px 6px",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {switching ? (
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.goldDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: T.gold, fontFamily: "'DM Mono',monospace" }}>…</div>
              ) : (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: avatarColor + "22", border: `1px solid ${avatarColor}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: avatarColor, fontFamily: "'DM Mono',monospace",
                }}>{avatarText}</div>
              )}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.bright, lineHeight: 1.2 }}>
                  {currentUser?.name ?? profile?.full_name ?? "Guest"}
                </div>
                <div style={{ fontSize: 9, color: T.muted, fontFamily: "'DM Mono',monospace" }}>
                  {currentUser?.dept ?? profile?.department ?? "DEMO"}
                </div>
              </div>
              <span style={{ color: T.muted, fontSize: 9, marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
            </button>

            {/* Dropdown */}
            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                width: 220, background: T.navyCard,
                border: `1px solid ${T.goldBorder}`,
                borderRadius: 10, padding: "6px 0",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                zIndex: 400,
              }}>
                <div style={{ padding: "4px 12px 8px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 9, color: T.gold, fontFamily: "'DM Mono',monospace",
                    letterSpacing: "0.07em", marginBottom: 4 }}>SWITCH EMPLOYEE</div>
                </div>
                {DEMO_USERS.map(u => {
                  const isActive = u.email === profile?.email;
                  return (
                    <button
                      key={u.email}
                      onClick={() => !isActive && switchTo(u.email)}
                      disabled={!!switching || isActive}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 9,
                        padding: "7px 12px", background: isActive ? u.color + "12" : "transparent",
                        border: "none", cursor: isActive ? "default" : "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: u.color + "22", border: `1px solid ${u.color}${isActive ? "80" : "40"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: u.color, fontFamily: "'DM Mono',monospace",
                      }}>
                        {switching === u.email ? "…" : u.avatar}
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: isActive ? u.color : T.bright,
                          fontWeight: isActive ? 600 : 400, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                        <div style={{ fontSize: 9, color: T.muted, fontFamily: "'DM Mono',monospace" }}>{u.dept}</div>
                      </div>
                      {isActive && (
                        <span style={{ marginLeft: "auto", fontSize: 9, color: u.color,
                          fontFamily: "'DM Mono',monospace" }}>ACTIVE</span>
                      )}
                    </button>
                  );
                })}
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 4, paddingTop: 4 }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: "100%", padding: "7px 12px", background: "transparent",
                      border: "none", cursor: "pointer", textAlign: "left" as const,
                      fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.rose)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                  >
                    <span style={{ fontSize: 12 }}>⊗</span> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
