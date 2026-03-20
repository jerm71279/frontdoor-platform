/**
 * iOPEX AI Control Tower
 * Functionality mirrors ServiceNow AI Control Tower:
 * State of AI · AI Inventory · Value · Adoption · Risk & Compliance · Security & Privacy · AI Strategy
 */
import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip
} from "recharts";

/* ── Tokens ── */
const T = {
  navy:"#0B1120", navyMid:"#0F1829", navyCard:"#111927", navyHover:"#18253A",
  navyDeep:"#080E1A", gold:"#E8A020", goldDim:"rgba(232,160,32,0.10)",
  goldBorder:"rgba(232,160,32,0.22)", teal:"#06B6D4", tealDim:"rgba(6,182,212,0.10)",
  violet:"#8B5CF6", violetDim:"rgba(139,92,246,0.10)", emerald:"#10B981",
  emeraldDim:"rgba(16,185,129,0.10)", rose:"#F43F5E", roseDim:"rgba(244,63,94,0.10)",
  amber:"#F59E0B", amberDim:"rgba(245,158,11,0.10)", sky:"#38BDF8",
  text:"#C8D4E4", muted:"#3D5068", bright:"#ECF1FA",
  border:"rgba(255,255,255,0.06)", borderMid:"rgba(255,255,255,0.03)",
};

/* ── Sparkline data generators ── */
function genTrend(base, variance, points = 30) {
  return Array.from({ length: points }, (_, i) => ({
    i, v: Math.max(0, base + (Math.random() - 0.4) * variance + (i / points) * base * 0.15)
  }));
}

const PROD_DATA    = genTrend(1600, 400);
const USAGE_DATA   = genTrend(17000, 4000);
const ADOPTION_DATA= genTrend(62, 12);
const VALUE_DATA   = genTrend(420, 80);

/* ── Top AI Assets ── */
const TOP_ASSETS = [
  { name: "Chat Summarization",       usage: 130, color: T.teal },
  { name: "Resolution Notes",         usage: 95,  color: T.violet },
  { name: "Incident Summarization",   usage: 80,  color: T.emerald },
  { name: "HR Case Summarization",    usage: 55,  color: T.gold },
  { name: "Knowledge Base Generation",usage: 35,  color: T.amber },
];

/* ── AI Inventory counts ── */
const INVENTORY = [
  { label: "AI Agents",     value: 124, delta: "+35", color: T.teal,    icon: "◎" },
  { label: "Models",        value: 6,   delta: "+2",  color: T.violet,  icon: "◈" },
  { label: "Workflows",     value: 64,  delta: "+12", color: T.emerald, icon: "⟳" },
  { label: "Data Sources",  value: 144, delta: "+18", color: T.gold,    icon: "◬" },
];

/* ── All Systems ── */
const ALL_SYSTEMS = [
  { provider: "Gemini 2.0 Flash",   system: "Signal Engine / Intent",  calls: "6,101", trend: "+22%", status: "healthy" },
  { provider: "claude-sonnet-4-6",  system: "WorkStream Orchestrator",  calls: "1,847", trend: "+8%",  status: "healthy" },
  { provider: "claude-haiku-4-5",   system: "Fast routing / Notify",    calls: "4,203", trend: "+14%", status: "healthy" },
  { provider: "Workday API",        system: "HR · Benefits · Leave",    calls: "2,341", trend: "+5%",  status: "healthy" },
  { provider: "ServiceNow ITSM",    system: "IT Tickets · Changes",     calls: "1,892", trend: "+11%", status: "healthy" },
  { provider: "Microsoft 365",      system: "Teams · Mail · Calendar",  calls: "3,104", trend: "+19%", status: "healthy" },
  { provider: "Jira / Confluence",  system: "Engineering Requests",     calls: "892",   trend: "+6%",  status: "healthy" },
  { provider: "SAP SuccessFactors", system: "Finance · Procurement",    calls: "541",   trend: "+3%",  status: "degraded" },
];

/* ── My Tasks ── */
const MY_TASKS = [
  { type: "recommendation", title: "8 AI agents have exceeded drift threshold (>3%)",
    detail: "Gemini 2.0 Flash classification accuracy dropped to 91.3%. Review training data or switch routing to claude-haiku.",
    priority: "Medium", by: "Signal Engine", created: "Mar 19, 2026" },
  { type: "task", title: "Onboard 3 new workflow agents for HR onboarding",
    detail: "New hire onboarding flow requires: equipment provisioning agent, Workday profile agent, badge access agent.",
    priority: "Low", by: "Sarah Park", created: "Mar 18, 2026" },
  { type: "alert", title: "SAP SuccessFactors connector degraded",
    detail: "Finance and Procurement requests failing intermittently. 23 requests queued. Check OAuth token expiry.",
    priority: "High", by: "Nexus Monitor", created: "Mar 19, 2026" },
  { type: "recommendation", title: "Enable AI Summarization for Legal domain",
    detail: "Legal requests have 0% AI assist coverage. 45 manual cases last month could be auto-triaged.",
    priority: "Low", by: "AI Strategy", created: "Mar 17, 2026" },
];

/* ── Risk & Compliance items ── */
const RISKS = [
  { framework: "NIST AI RMF",  score: 87, issues: 3, critical: 0, color: T.teal },
  { framework: "EU AI Act",    score: 79, issues: 5, critical: 1, color: T.amber },
  { framework: "ISO 42001",    score: 92, issues: 2, critical: 0, color: T.emerald },
  { framework: "SOC 2 Type II",score: 95, issues: 1, critical: 0, color: T.violet },
];

/* ── Value metrics ── */
const VALUE_METRICS = [
  { label: "Productivity hours saved",    value: "52,179 hrs", delta: "+13%", color: T.teal },
  { label: "Requests auto-resolved",      value: "8,841",      delta: "+22%", color: T.emerald },
  { label: "Avg resolution time",         value: "1.8 hrs",    delta: "-41%", color: T.violet },
  { label: "Manual triage eliminated",    value: "94%",        delta: "+6pts",color: T.gold },
  { label: "Employee satisfaction (NPS)", value: "72",         delta: "+8pts",color: T.sky },
  { label: "Cost savings (est.)",         value: "$1.2M",      delta: "vs manual", color: T.emerald },
];

/* ── Sub-components ── */
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${T.border}`, marginBottom: 0 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding: "10px 18px", background: "none",
          border: "none", borderBottom: active === t ? `2px solid ${T.gold}` : "2px solid transparent",
          color: active === t ? T.gold : T.muted, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active === t ? 600 : 400,
          transition: "all 0.15s", marginBottom: -1,
        }}>{t}</button>
      ))}
    </div>
  );
}

function KPICard({ label, value, delta, deltaUp = true, data, color, children }) {
  return (
    <div style={{
      background: T.navyCard, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "20px 22px", flex: 1,
    }}>
      <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, color: T.bright, marginBottom: 4 }}>
        {value}
      </div>
      {delta && (
        <div style={{ color: deltaUp ? T.emerald : T.rose, fontSize: 12, marginBottom: 12 }}>
          {deltaUp ? "↑" : "↓"} {delta} · last 30 days
        </div>
      )}
      {data && (
        <ResponsiveContainer width="100%" height={48}>
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color || T.emerald} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color || T.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color || T.emerald} strokeWidth={1.5}
              fill={`url(#g-${label})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {children}
    </div>
  );
}

function CounterCard({ label, value, delta, color, icon }) {
  return (
    <div style={{
      background: T.navyCard, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "18px 20px", flex: 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ color: T.muted, fontSize: 12 }}>{label}</div>
        <span style={{ fontSize: 18, color: color }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 34, fontWeight: 700, color: color, marginBottom: 6 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ color: T.emerald, fontSize: 12 }}>↑ {delta} last 30 days</div>
    </div>
  );
}

function PriorityBadge({ level }) {
  const c = { High: T.rose, Medium: T.amber, Low: T.teal }[level] || T.muted;
  return (
    <span style={{
      background: c + "18", color: c, border: `1px solid ${c}30`,
      borderRadius: 4, padding: "2px 8px", fontSize: 10,
      fontFamily: "'DM Mono', monospace", fontWeight: 700,
    }}>{level}</span>
  );
}

function RingSmall({ score, color, size = 52 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color + "22"} strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 1s" }} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle"
        fill={color} fontSize={11} fontWeight={700} fontFamily="'DM Mono',monospace">{score}</text>
    </svg>
  );
}

/* ── TAB VIEWS ── */
function OverviewTab() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 3000); return () => clearInterval(t); }, []);
  const prodHrs   = (52179 + tick * 4).toLocaleString();
  const totalUse  = (549254 + tick * 12).toLocaleString();

  return (
    <div>
      {/* Top 3 KPI row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <KPICard label="Productivity" value={prodHrs + " hrs"} delta="13%" data={PROD_DATA} color={T.emerald} />
        <KPICard label="Total AI usage" value={totalUse} delta="20%" data={USAGE_DATA} color={T.teal} />

        {/* Top 5 AI Assets */}
        <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 22px", flex: 1 }}>
          <div style={{ color: T.muted, fontSize: 12, marginBottom: 14 }}>Top 5 AI Assets by usage</div>
          {TOP_ASSETS.map(a => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ color: T.muted, fontSize: 11, width: 160, flexShrink: 0 }}>{a.name}</div>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(a.usage / 130) * 100}%`, background: a.color, borderRadius: 3, transition: "width 1s" }} />
              </div>
              <div style={{ color: a.color, fontSize: 11, fontFamily: "'DM Mono', monospace", width: 40, textAlign: "right" }}>
                {a.usage}k
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory counters row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        {INVENTORY.map(inv => <CounterCard key={inv.label} {...inv} />)}
      </div>

      {/* Bottom 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* All Systems */}
        <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: T.bright, fontSize: 13, fontWeight: 600 }}>All Systems</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["Provider", "Systems", "Past 30 days", "Trend"].map(f => (
                <span key={f} style={{ fontSize: 10, color: T.muted, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>{f}</span>
              ))}
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Provider", "System", "API Calls", "30-day trend", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: T.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_SYSTEMS.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderMid}` }}>
                  <td style={{ padding: "10px 16px", color: T.bright, fontSize: 12 }}>{s.provider}</td>
                  <td style={{ padding: "10px 16px", color: T.muted, fontSize: 11 }}>{s.system}</td>
                  <td style={{ padding: "10px 16px", color: T.text, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{s.calls}</td>
                  <td style={{ padding: "10px 16px", color: T.emerald, fontSize: 12 }}>{s.trend}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      background: s.status === "healthy" ? T.emeraldDim : T.amberDim,
                      color: s.status === "healthy" ? T.emerald : T.amber,
                      border: `1px solid ${s.status === "healthy" ? T.emerald : T.amber}30`,
                      borderRadius: 4, padding: "2px 8px", fontSize: 10,
                      fontFamily: "'DM Mono', monospace",
                    }}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* My Tasks */}
        <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.bright, fontSize: 13, fontWeight: 600 }}>My Tasks</span>
          </div>
          <div style={{ overflowY: "auto", maxHeight: 420 }}>
            {MY_TASKS.map((task, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderMid}` }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span style={{
                    fontSize: 9, fontFamily: "'DM Mono', monospace", padding: "1px 6px", borderRadius: 3,
                    background: task.type === "alert" ? T.roseDim : task.type === "recommendation" ? T.violetDim : T.goldDim,
                    color: task.type === "alert" ? T.rose : task.type === "recommendation" ? T.violet : T.gold,
                    border: `1px solid ${task.type === "alert" ? T.rose : task.type === "recommendation" ? T.violet : T.gold}25`,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{task.type}</span>
                  <PriorityBadge level={task.priority} />
                </div>
                <div style={{ color: T.bright, fontSize: 13, fontWeight: 500, marginBottom: 5, lineHeight: 1.4 }}>{task.title}</div>
                <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>{task.detail}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
                  <span>Raised by: {task.by}</span>
                  <span>{task.created}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AIInventoryTab() {
  const categories = [
    { label: "AI Agents", color: T.teal, items: [
      { name: "EmployeeWorks (HR)",     model: "claude-sonnet-4-6", status: "active",   calls: "2,841", accuracy: "97.2%" },
      { name: "ITStream (IT)",          model: "claude-haiku-4-5",  status: "active",   calls: "4,103", accuracy: "94.8%" },
      { name: "FinFlow (Finance)",      model: "claude-sonnet-4-6", status: "active",   calls: "891",   accuracy: "96.1%" },
      { name: "LegalAssist (Legal)",    model: "claude-haiku-4-5",  status: "inactive", calls: "0",     accuracy: "—" },
      { name: "IntentRouter",           model: "gemini-2.0-flash",  status: "active",   calls: "6,101", accuracy: "91.3%" },
    ]},
    { label: "Models", color: T.violet, items: [
      { name: "claude-sonnet-4-6",  model: "Anthropic", status: "active",   calls: "3,732",  accuracy: "97.2%" },
      { name: "claude-haiku-4-5",   model: "Anthropic", status: "active",   calls: "4,203",  accuracy: "94.8%" },
      { name: "gemini-2.0-flash",   model: "Google",    status: "warning",  calls: "6,101",  accuracy: "91.3%" },
    ]},
  ];
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: T.bright, marginBottom: 4 }}>AI Inventory</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>All AI agents, models, and data sources registered on this tenant.</div>
      {categories.map(cat => (
        <div key={cat.label} style={{ marginBottom: 20 }}>
          <div style={{ color: cat.color, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 10 }}>{cat.label.toUpperCase()}</div>
          <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Name", "Model / Provider", "API Calls", "Accuracy", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: T.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.borderMid}` }}>
                    <td style={{ padding: "12px 16px", color: T.bright, fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: "12px 16px", color: T.muted, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{item.model}</td>
                    <td style={{ padding: "12px 16px", color: T.text, fontFamily: "'DM Mono', monospace" }}>{item.calls}</td>
                    <td style={{ padding: "12px 16px", color: item.accuracy === "—" ? T.muted : T.teal, fontFamily: "'DM Mono', monospace" }}>{item.accuracy}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: item.status === "active" ? T.emeraldDim : item.status === "warning" ? T.amberDim : "rgba(255,255,255,0.04)",
                        color: item.status === "active" ? T.emerald : item.status === "warning" ? T.amber : T.muted,
                        border: `1px solid ${item.status === "active" ? T.emerald : item.status === "warning" ? T.amber : T.muted}30`,
                        borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "'DM Mono', monospace",
                      }}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ValueTab() {
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: T.bright, marginBottom: 4 }}>Value</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Measurable business impact delivered by iOPEX AI FrontDoor.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {VALUE_METRICS.map(m => (
          <div key={m.label} style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.value}</div>
            <div style={{ color: T.emerald, fontSize: 12 }}>↑ {m.delta}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 22px" }}>
        <div style={{ color: T.muted, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: 16 }}>PRODUCTIVITY — LAST 30 DAYS</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={VALUE_DATA}>
            <defs>
              <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.emerald} stopOpacity={0.3} />
                <stop offset="100%" stopColor={T.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ background: T.navyMid, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} />
            <Area type="monotone" dataKey="v" stroke={T.emerald} strokeWidth={2} fill="url(#vg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AdoptionTab() {
  const depts = [
    { name: "IT & Tech",    pct: 94, users: 124, color: T.teal },
    { name: "HR & People",  pct: 88, users: 98,  color: T.violet },
    { name: "Finance",      pct: 72, users: 61,  color: T.emerald },
    { name: "Operations",   pct: 65, users: 54,  color: T.amber },
    { name: "Legal",        pct: 31, users: 18,  color: T.gold },
    { name: "Facilities",   pct: 58, users: 44,  color: T.sky },
    { name: "Security",     pct: 81, users: 72,  color: T.rose },
    { name: "Marketing",    pct: 47, users: 31,  color: T.pink },
  ];
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: T.bright, marginBottom: 4 }}>Adoption</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>AI FrontDoor adoption rate by department across Acme Corp.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 20 }}>
        {depts.map(d => (
          <div key={d.name} style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: d.color, fontWeight: 600, fontSize: 13 }}>{d.name}</span>
              <span style={{ color: T.muted, fontSize: 12 }}>{d.users} active users</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${d.pct}%`, background: d.color, borderRadius: 3, transition: "width 1s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.muted, fontSize: 11 }}>Adoption rate</span>
              <span style={{ color: d.color, fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskTab() {
  const openIssues = [
    { id: "AI-014", framework: "EU AI Act",    severity: "CRITICAL", title: "High-risk AI system classification review overdue",          owner: "AI Governance",  due: "Mar 25" },
    { id: "AI-013", framework: "NIST AI RMF",  severity: "HIGH",     title: "Model drift threshold exceeded — Gemini 2.0 Flash (4.2%)",  owner: "ML Ops",         due: "Mar 22" },
    { id: "AI-012", framework: "NIST AI RMF",  severity: "MED",      title: "Audit log retention gap — 90 days between quarters",        owner: "Security",       due: "Mar 28" },
    { id: "AI-011", framework: "EU AI Act",     severity: "MED",      title: "Human oversight docs not current for 3 agent types",        owner: "AI Governance",  due: "Mar 30" },
  ];
  const sev = { CRITICAL:"#ff4d6d", HIGH:T.rose, MED:T.amber, LOW:T.teal };
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: T.bright, marginBottom: 4 }}>Risk & Compliance</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>AI governance posture across active compliance frameworks.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {RISKS.map(r => (
          <div key={r.framework} style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", display: "flex", gap: 14, alignItems: "center" }}>
            <RingSmall score={r.score} color={r.color} />
            <div>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{r.framework}</div>
              <div style={{ color: T.muted, fontSize: 11 }}>{r.issues} issues</div>
              {r.critical > 0 && <div style={{ color: T.rose, fontSize: 11 }}>{r.critical} critical</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, color: T.bright, fontSize: 13, fontWeight: 600 }}>Open Issues</div>
        {openIssues.map(issue => (
          <div key={issue.id} style={{ display: "flex", gap: 14, padding: "13px 18px", borderBottom: `1px solid ${T.borderMid}`, alignItems: "flex-start" }}>
            <span style={{ background: sev[issue.severity] + "18", color: sev[issue.severity], border: `1px solid ${sev[issue.severity]}30`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700, flexShrink: 0 }}>{issue.severity}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.bright, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{issue.title}</div>
              <div style={{ color: T.muted, fontSize: 11 }}>{issue.framework} · {issue.owner} · Due {issue.due}</div>
            </div>
            <span style={{ color: T.muted, fontFamily: "'DM Mono', monospace", fontSize: 10, flexShrink: 0 }}>{issue.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityTab() {
  const events = [
    { time: "09:14:03", type: "POLICY BLOCK",   user: "frank.lee@acmecorp.com",   action: "DELETE /change-requests/CHG0012 — immutable record",   risk: "HIGH" },
    { time: "09:12:22", type: "DATA REDACT",     user: "carol.wu@acmecorp.com",    action: "GET /payroll/salary — salary fields redacted, role insufficient", risk: "HIGH" },
    { time: "09:10:33", type: "ESCALATE",        user: "eve.torres@acmecorp.com",  action: "PUT /employees/salary-adj — dual approval required",   risk: "HIGH" },
    { time: "09:08:44", type: "PASS",            user: "grace.patel@acmecorp.com", action: "GET /teams/channels — read within tenant boundary",    risk: "LOW" },
    { time: "09:07:19", type: "PASS",            user: "henry.zhao@acmecorp.com",  action: "POST /leave-requests — automated approval <5 days",    risk: "LOW" },
  ];
  const tc = { "POLICY BLOCK": T.rose, "DATA REDACT": T.amber, ESCALATE: T.violet, PASS: T.emerald };
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: T.bright, marginBottom: 4 }}>Security & Privacy</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Real-time policy enforcement log. Every AI decision audited by TrustCore.</div>
      <div style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Time", "Decision", "User", "Action", "Risk"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.muted, fontSize: 10, fontFamily: "'DM Mono', monospace", borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.borderMid}` }}>
                <td style={{ padding: "11px 14px", color: T.muted, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{e.time}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ background: tc[e.type] + "18", color: tc[e.type], border: `1px solid ${tc[e.type]}25`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{e.type}</span>
                </td>
                <td style={{ padding: "11px 14px", color: T.text, fontSize: 11 }}>{e.user}</td>
                <td style={{ padding: "11px 14px", color: T.muted, fontSize: 11, maxWidth: 320 }}>{e.action}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ color: e.risk === "HIGH" ? T.rose : T.teal, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{e.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrategyTab() {
  const initiatives = [
    { title: "Expand Legal domain coverage", status: "planned",     impact: "HIGH",   owner: "AI Strategy", due: "Q2 2026" },
    { title: "Enable Voice Agent (AIx)",     status: "in-progress", impact: "HIGH",   owner: "Product",     due: "Q2 2026" },
    { title: "Workday deep integration",     status: "in-progress", impact: "MED",    owner: "Integrations",due: "Q2 2026" },
    { title: "SAP SuccessFactors repair",    status: "urgent",      impact: "MED",    owner: "Nexus Team",  due: "Mar 22" },
    { title: "AI Lens (screenshot input)",   status: "planned",     impact: "MED",    owner: "Product",     due: "Q3 2026" },
    { title: "Multi-tenant isolation audit", status: "planned",     impact: "HIGH",   owner: "Security",    due: "Q2 2026" },
  ];
  const sc = { planned:"rgba(255,255,255,0.08)", "in-progress":T.tealDim, urgent:T.roseDim };
  const sl = { planned:T.muted, "in-progress":T.teal, urgent:T.rose };
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: T.bright, marginBottom: 4 }}>AI Strategy</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Roadmap and strategic initiatives for expanding AI FrontDoor coverage.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {initiatives.map((item, i) => (
          <div key={i} style={{ background: T.navyCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ background: sc[item.status], color: sl[item.status], border: `1px solid ${sl[item.status]}30`, borderRadius: 4, padding: "2px 10px", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700, flexShrink: 0, minWidth: 90, textAlign: "center" }}>{item.status}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.bright, fontSize: 13, fontWeight: 500 }}>{item.title}</div>
              <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>Owner: {item.owner} · Due: {item.due}</div>
            </div>
            <span style={{ background: item.impact === "HIGH" ? T.roseDim : T.goldDim, color: item.impact === "HIGH" ? T.rose : T.gold, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{item.impact}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */
const TABS = ["Overview", "AI Inventory", "Value", "Adoption", "Risk & Compliance", "Security & Privacy", "AI Strategy"];

export default function AIControlTower() {
  const [tab, setTab] = useState("Overview");
  return (
    <div style={{ background: T.navy, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: T.text }}>

      {/* ── Hero header — consistent with all surfaces ── */}
      <div style={{
        background: `linear-gradient(180deg, ${T.navyMid} 0%, ${T.navy} 100%)`,
        borderBottom: `1px solid ${T.border}`,
        padding: "40px 48px 0",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12,
                background: T.goldDim, border: `1px solid ${T.goldBorder}`,
                borderRadius: 4, padding: "3px 10px",
              }}>
                <span style={{ color: T.gold, fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  TrustCore · AI Governance
                </span>
              </div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 38, fontWeight: 700, color: T.bright,
                margin: "0 0 10px", letterSpacing: "-0.02em",
              }}>
                AI Control Tower
              </h1>
              <p style={{ color: T.muted, fontSize: 14, margin: "0 0 20px", maxWidth: 520, lineHeight: 1.6 }}>
                Monitor the impact, risks, status, and usage of every type of AI in your enterprise.
                Full ServiceNow AI Control Tower parity.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.emerald, boxShadow: `0 0 8px ${T.emerald}` }} />
              <span style={{ color: T.emerald, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>LIVE · Acme Corp</span>
            </div>
          </div>

          {/* Tab navigation — sits at bottom of hero so it feels attached */}
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 48px" }}>

        {/* Tab content */}
        {tab === "Overview"            && <OverviewTab />}
        {tab === "AI Inventory"        && <AIInventoryTab />}
        {tab === "Value"               && <ValueTab />}
        {tab === "Adoption"            && <AdoptionTab />}
        {tab === "Risk & Compliance"   && <RiskTab />}
        {tab === "Security & Privacy"  && <SecurityTab />}
        {tab === "AI Strategy"         && <StrategyTab />}
      </div>
    </div>
  );
}
