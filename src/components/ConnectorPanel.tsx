/**
 * iOPEX AI FrontDoor — ConnectorPanel
 * Shows the 5 integration connectors with live/mock status.
 * Displayed in the employee portal sidebar.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const T = {
  navyCard:   "#111927",
  gold:       "#E8A020",
  goldBorder: "rgba(232,160,32,0.22)",
  border:     "rgba(255,255,255,0.06)",
  borderMid:  "rgba(255,255,255,0.03)",
  muted:      "#3D5068",
  bright:     "#ECF1FA",
  text:       "#C8D4E4",
  emerald:    "#10B981",
  amber:      "#F59E0B",
  rose:       "#F43F5E",
  sky:        "#38BDF8",
};

interface ConnectorRow {
  id:           string;
  type:         string;
  name:         string;
  status:       string;
  last_sync_at: string | null;
  metadata:     { icon?: string; color?: string; description?: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  live:         { label: "LIVE",    color: T.emerald, dot: T.emerald },
  mock:         { label: "MOCK",    color: T.amber,   dot: T.amber },
  error:        { label: "ERROR",   color: T.rose,    dot: T.rose },
  disconnected: { label: "OFF",     color: T.muted,   dot: T.muted },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return "just now";
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function ConnectorPanel() {
  const { profile } = useAuth();
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const tenantId = profile?.tenant_id ?? "demo";
    supabase
      .from("connectors")
      .select("id, type, name, status, last_sync_at, metadata")
      .eq("tenant_id", tenantId)
      .order("created_at")
      .then(({ data }) => {
        setConnectors((data as ConnectorRow[]) ?? []);
        setLoading(false);
      });
  }, [profile?.tenant_id]);

  const liveCount = connectors.filter(c => c.status === "live").length;
  const mockCount = connectors.filter(c => c.status === "mock").length;

  return (
    <div style={{
      background: T.navyCard,
      border: `1px solid ${T.goldBorder}`,
      borderRadius: 10, padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: T.gold, fontFamily: "'DM Mono',monospace", letterSpacing: "0.07em" }}>
          NEXUS CONNECTORS
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {liveCount > 0 && (
            <span style={{ fontSize: 9, color: T.emerald, fontFamily: "'DM Mono',monospace",
              background: T.emerald + "18", border: `1px solid ${T.emerald}30`,
              borderRadius: 4, padding: "1px 6px" }}>
              {liveCount} LIVE
            </span>
          )}
          {mockCount > 0 && (
            <span style={{ fontSize: 9, color: T.amber, fontFamily: "'DM Mono',monospace",
              background: T.amber + "18", border: `1px solid ${T.amber}30`,
              borderRadius: 4, padding: "1px 6px" }}>
              {mockCount} MOCK
            </span>
          )}
        </div>
      </div>

      {/* Connector rows */}
      {loading ? (
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: "12px 0" }}>Loading…</div>
      ) : connectors.length === 0 ? (
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: "12px 0" }}>
          No connectors configured
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {connectors.map((c, i) => {
            const cfg   = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.disconnected;
            const color = c.metadata?.color ?? T.sky;
            return (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 0",
                borderBottom: i < connectors.length - 1 ? `1px solid ${T.borderMid}` : "none",
              }}>
                {/* Icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: color + "18", border: `1px solid ${color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13,
                }}>
                  {c.metadata?.icon ?? "◉"}
                </div>

                {/* Name + last sync */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.bright, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 9, color: T.muted, fontFamily: "'DM Mono',monospace" }}>
                    {c.last_sync_at ? `synced ${timeAgo(c.last_sync_at)}` : "not yet synced"}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: cfg.dot,
                    boxShadow: c.status === "live" ? `0 0 5px ${cfg.dot}` : "none",
                  }} />
                  <span style={{ fontSize: 9, color: cfg.color, fontFamily: "'DM Mono',monospace" }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.borderMid}` }}>
        <div style={{ fontSize: 9, color: T.muted, lineHeight: 1.5 }}>
          MOCK connectors return realistic data. Provide API credentials to go LIVE.
        </div>
      </div>
    </div>
  );
}
