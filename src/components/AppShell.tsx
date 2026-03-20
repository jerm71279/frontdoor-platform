/**
 * iOPEX FrontDoor — Unified App Shell
 * Top nav present on every page. One app, all surfaces.
 */
import { useNavigate, useLocation } from "react-router-dom";

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
};

const NAV_ITEMS = [
  { label: "Employee Portal",   path: "/",                           icon: "◎", color: T.teal },
  { label: "AI Control Tower",  path: "/governance/control-tower",   icon: "⬡", color: T.gold },
  { label: "Failure Recovery",  path: "/governance/failure-recovery",icon: "⟳", color: T.violet },
  { label: "Framework",         path: "/framework",                  icon: "◈", color: T.emerald },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  // Which nav item is active
  const activeItem = NAV_ITEMS.slice().reverse().find(n =>
    pathname === n.path || pathname.startsWith(n.path + "/")
  ) || NAV_ITEMS[0];

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

        {/* Right: tenant + live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: T.muted, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Acme Corp</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
            <span style={{ color: T.emerald, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>LIVE</span>
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
