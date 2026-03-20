/**
 * iOPEX FrontDoor — End User Journey
 * "A day in the life" interactive walkthrough — shows employees the value
 * of a single AI-powered surface for every workplace need.
 */
import { useState } from "react";

const T = {
  navy:       "#080E1A",
  navyMid:    "#0D1829",
  navyCard:   "#111D2E",
  navyBorder: "#162034",
  gold:       "#E8A020",
  goldDim:    "rgba(232,160,32,0.10)",
  goldBorder: "rgba(232,160,32,0.22)",
  teal:       "#06B6D4",
  tealDim:    "rgba(6,182,212,0.10)",
  violet:     "#8B5CF6",
  violetDim:  "rgba(139,92,246,0.10)",
  emerald:    "#10B981",
  emeraldDim: "rgba(16,185,129,0.10)",
  amber:      "#F59E0B",
  rose:       "#F43F5E",
  roseDim:    "rgba(244,63,94,0.10)",
  text:       "#C8D4E4",
  muted:      "#3D5068",
  bright:     "#ECF1FA",
  border:     "rgba(255,255,255,0.06)",
};

// ─── Journey Steps ──────────────────────────────────────────────────────────

const JOURNEY_STEPS = [
  {
    id: "morning",
    time: "8:47 AM",
    label: "Morning Check-in",
    icon: "☀",
    color: T.amber,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "Starts the workday, needs to know what's pending",
    what: "Jordan opens FrontDoor on mobile. A single dashboard shows 2 pending IT tickets, 1 HR approval needed, and a finance reimbursement update — all in one view.",
    before: "Checks email, Teams, ServiceNow, Workday, and a shared spreadsheet — 5 different logins.",
    after: "Everything in one glance. 90 seconds saved.",
    highlight: "One Data Model — all systems, one surface",
    metric: "↓ 5 app switches per morning",
  },
  {
    id: "laptop",
    time: "9:12 AM",
    label: "Laptop Request",
    icon: "💻",
    color: T.teal,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "Needs a new laptop — old one is failing",
    what: "Types \"my laptop keeps crashing, need a new one\" into FrontDoor. AI classifies intent as IT > Hardware Request, auto-fills Jordan's details from HR data, routes to IT queue, creates a ServiceNow ticket in background.",
    before: "Fill out a 12-field IT form. Wait for email confirmation. Call IT helpdesk to check status.",
    after: "One sentence. Ticket created in 4 seconds. Live status tracker in portal.",
    highlight: "Signal Engine — intent-to-action in one step",
    metric: "12 fields → 1 sentence",
  },
  {
    id: "pto",
    time: "10:30 AM",
    label: "PTO Request",
    icon: "🏖",
    color: T.violet,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "Wants to take Friday off",
    what: "Types \"take Friday off\" into FrontDoor. AI checks Jordan's PTO balance in Workday, confirms no conflicts in the team calendar, routes to manager for approval — all automatically.",
    before: "Log into Workday. Find PTO module. Submit request. Email manager separately. Wait.",
    after: "Manager gets Teams ping with one-tap approve. Jordan sees status update in portal within minutes.",
    highlight: "WorkStream Orchestrator — multi-system workflow, zero manual steps",
    metric: "4 systems touched, 0 logins by employee",
  },
  {
    id: "access",
    time: "11:45 AM",
    label: "Software Access",
    icon: "🔐",
    color: T.emerald,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "Needs access to a new SaaS tool for a project",
    what: "Asks \"I need access to Figma for the redesign project\". AI checks Jordan's role and the project's entitlement policy, auto-provisions access via SSO, notifies Jordan with login link — 6 minutes end-to-end.",
    before: "Email IT. Wait for ticket. IT emails manager for approval. Manager emails back. IT provisions. 2-3 days.",
    after: "Provisioned same session. AI enforces policy automatically — no human bottleneck.",
    highlight: "TrustCore — policy enforcement + Nexus provisioning, all logged",
    metric: "3 days → 6 minutes",
  },
  {
    id: "expense",
    time: "2:00 PM",
    label: "Expense Reimbursement",
    icon: "💳",
    color: T.gold,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "Bought a conference book, needs to expense it",
    what: "Snaps photo of receipt, types \"expense this — conference book $47\". AI reads the receipt, maps it to the correct GL code, routes to manager for approval, submits to Finance — all in one flow.",
    before: "Log into expense tool. Upload receipt. Manually enter amount, merchant, GL code, project. Submit. Follow up.",
    after: "Photo + one sentence. Finance sees it. Reimbursed next pay cycle.",
    highlight: "Nexus Integration — connects to Finance GL, no double-entry",
    metric: "8-step process → 2 taps",
  },
  {
    id: "incident",
    time: "3:30 PM",
    label: "IT Incident Escalation",
    icon: "⚡",
    color: T.rose,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "VPN stops working, blocking critical work",
    what: "Types \"VPN just died\". AI detects high-urgency IT incident, auto-escalates (skips normal queue), pings on-call IT engineer via Teams, opens P2 incident in ServiceNow, estimates ETA based on similar past incidents.",
    before: "Call IT helpdesk. Explain the problem. Get a ticket number. Wait. Call back.",
    after: "Escalated in 8 seconds. On-call engineer pinged. Jordan sees live incident status in portal.",
    highlight: "Signal Engine — confidence scoring + urgency detection",
    metric: "Auto-P2 escalation in 8 seconds",
  },
  {
    id: "eod",
    time: "5:15 PM",
    label: "End of Day Summary",
    icon: "✓",
    color: T.emerald,
    persona: "Jordan M. · Software Engineer · IT Dept",
    situation: "End of workday — what happened to everything?",
    what: "FrontDoor shows a daily digest: laptop request approved (shipping Tuesday), PTO approved, Figma access active, expense submitted, VPN resolved. All 5 flows closed in one day.",
    before: "Check 5 systems to find status of each item. Some still unknown.",
    after: "One notification digest. Full closure, every thread.",
    highlight: "One Data Model — single source of truth for every request",
    metric: "5 threads tracked, 0 chasing required",
  },
];

// ─── Domain Cards ────────────────────────────────────────────────────────────

const DOMAINS = [
  { label: "IT",         icon: "⚙", color: T.teal,   caption: "Devices · Access · Incidents" },
  { label: "HR",         icon: "◉", color: T.violet,  caption: "PTO · Benefits · Onboarding" },
  { label: "Finance",    icon: "◈", color: T.gold,    caption: "Expenses · Budgets · POs" },
  { label: "Legal",      icon: "⬡", color: T.rose,    caption: "Contracts · NDAs · Policies" },
  { label: "Facilities", icon: "⌂", color: T.amber,   caption: "Desks · Rooms · Maintenance" },
  { label: "Security",   icon: "⬛", color: T.emerald, caption: "Access · Certs · Incidents" },
  { label: "Operations", icon: "◎", color: T.teal,    caption: "Ops · Processes · SLAs" },
  { label: "Marketing",  icon: "◇", color: T.violet,  caption: "Assets · Campaigns · Budget" },
];

// ─── Stats ───────────────────────────────────────────────────────────────────

const STATS = [
  { value: "8",    unit: "domains",    label: "One surface for every workplace need" },
  { value: "52K",  unit: "hrs/month",  label: "Productivity returned to employees" },
  { value: "87%",  unit: "auto-routed",label: "Requests handled without human touch" },
  { value: "6 min",unit: "avg resolve",label: "vs. 3 days with legacy portals" },
];

export default function EndUserJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const step = JOURNEY_STEPS[activeStep];

  return (
    <div style={{
      background: T.navy,
      minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif",
      color: T.text,
    }}>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(180deg, ${T.navyMid} 0%, ${T.navy} 100%)`,
        borderBottom: `1px solid ${T.border}`,
        padding: "40px 48px 32px",
      }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
          }}>
            <span style={{
              background: T.tealDim, border: `1px solid ${T.teal}30`,
              borderRadius: 4, padding: "3px 10px",
              color: T.teal, fontSize: 11, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              End User Value
            </span>
            <span style={{ color: T.muted, fontSize: 11 }}>Acme Corp · Jordan M.</span>
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 38, fontWeight: 700, color: T.bright,
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}>
            A Day in the Life
          </h1>
          <p style={{ color: T.muted, fontSize: 15, margin: 0, maxWidth: 580, lineHeight: 1.6 }}>
            See how a single employee uses iOPEX FrontDoor to handle every workplace need —
            from IT requests to HR approvals — without switching apps or chasing tickets.
          </p>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        borderBottom: `1px solid ${T.border}`,
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            padding: "20px 32px",
            borderRight: i < 3 ? `1px solid ${T.border}` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 26, fontWeight: 700, color: T.bright,
              }}>{s.value}</span>
              <span style={{ color: T.gold, fontSize: 12, fontWeight: 600 }}>{s.unit}</span>
            </div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main: Timeline + Step Detail ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "280px 1fr",
        maxWidth: 1200, margin: "0 auto",
        padding: "40px 48px",
        gap: 32,
      }}>

        {/* ── Timeline column ── */}
        <div>
          <div style={{
            color: T.muted, fontSize: 11, textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'DM Mono', monospace",
          }}>
            Journey Timeline
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {JOURNEY_STEPS.map((s, i) => {
              const active = i === activeStep;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: active ? s.color + "14" : "transparent",
                    border: `1px solid ${active ? s.color + "40" : "transparent"}`,
                    borderRadius: 8, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Step indicator */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: active ? s.color + "20" : T.navyBorder,
                    border: `1px solid ${active ? s.color + "60" : T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, flexShrink: 0,
                  }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      color: active ? T.bright : T.text, lineHeight: 1.2,
                    }}>
                      {s.label}
                    </div>
                    <div style={{
                      fontSize: 11, color: active ? s.color : T.muted,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {s.time}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Domain quick-ref */}
          <div style={{ marginTop: 32 }}>
            <div style={{
              color: T.muted, fontSize: 11, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 12, fontFamily: "'DM Mono', monospace",
            }}>
              8 Domains Covered
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
            }}>
              {DOMAINS.map(d => (
                <div key={d.label} style={{
                  background: T.navyCard,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6, padding: "8px 10px",
                  display: "flex", alignItems: "center", gap: 7,
                }}>
                  <span style={{ color: d.color, fontSize: 13 }}>{d.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{d.label}</div>
                    <div style={{ fontSize: 9, color: T.muted, lineHeight: 1.3 }}>{d.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Step Detail column ── */}
        <div>
          {/* Header */}
          <div style={{
            background: T.navyCard,
            border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "28px 32px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: step.color + "18",
                    border: `1.5px solid ${step.color}50`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.bright }}>{step.label}</div>
                    <div style={{
                      fontSize: 12, color: step.color,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {step.time} · {step.persona}
                    </div>
                  </div>
                </div>
                <p style={{ color: T.muted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                  {step.situation}
                </p>
              </div>

              {/* Metric badge */}
              <div style={{
                background: step.color + "12",
                border: `1px solid ${step.color}30`,
                borderRadius: 8, padding: "10px 16px",
                textAlign: "center", flexShrink: 0, marginLeft: 24,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: step.color,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {step.metric}
                </div>
              </div>
            </div>

            {/* What happened */}
            <div style={{
              background: T.navy,
              border: `1px solid ${step.color}20`,
              borderRadius: 8, padding: "16px 20px",
            }}>
              <div style={{
                fontSize: 11, color: step.color, textTransform: "uppercase",
                letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", marginBottom: 8,
              }}>
                What Happened
              </div>
              <p style={{ color: T.text, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                {step.what}
              </p>
            </div>
          </div>

          {/* Before / After */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 16, marginBottom: 20,
          }}>
            <div style={{
              background: T.navyCard,
              border: `1px solid rgba(244,63,94,0.18)`,
              borderRadius: 10, padding: "18px 20px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7, marginBottom: 10,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: T.roseDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: T.rose,
                }}>✕</div>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: T.rose,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>Before FrontDoor</span>
              </div>
              <p style={{ color: T.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {step.before}
              </p>
            </div>
            <div style={{
              background: T.navyCard,
              border: `1px solid rgba(16,185,129,0.18)`,
              borderRadius: 10, padding: "18px 20px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7, marginBottom: 10,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: T.emeraldDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: T.emerald,
                }}>✓</div>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: T.emerald,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>With FrontDoor</span>
              </div>
              <p style={{ color: T.text, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {step.after}
              </p>
            </div>
          </div>

          {/* Architecture callout */}
          <div style={{
            background: T.goldDim,
            border: `1px solid ${T.goldBorder}`,
            borderRadius: 8, padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ color: T.gold, fontSize: 16 }}>⬡</span>
            <div>
              <span style={{ color: T.muted, fontSize: 12 }}>Platform layer: </span>
              <span style={{ color: T.gold, fontSize: 13, fontWeight: 600 }}>{step.highlight}</span>
            </div>
          </div>

          {/* Navigation */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 24,
          }}>
            <button
              onClick={() => setActiveStep(i => Math.max(0, i - 1))}
              disabled={activeStep === 0}
              style={{
                padding: "8px 20px",
                background: "transparent",
                border: `1px solid ${T.border}`,
                borderRadius: 6, color: activeStep === 0 ? T.muted : T.text,
                fontSize: 13, cursor: activeStep === 0 ? "default" : "pointer",
                opacity: activeStep === 0 ? 0.4 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ← Previous
            </button>

            {/* Step dots */}
            <div style={{ display: "flex", gap: 6 }}>
              {JOURNEY_STEPS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  style={{
                    width: i === activeStep ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === activeStep ? JOURNEY_STEPS[i].color : T.navyBorder,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setActiveStep(i => Math.min(JOURNEY_STEPS.length - 1, i + 1))}
              disabled={activeStep === JOURNEY_STEPS.length - 1}
              style={{
                padding: "8px 20px",
                background: step.color + "14",
                border: `1px solid ${step.color}40`,
                borderRadius: 6,
                color: activeStep === JOURNEY_STEPS.length - 1 ? T.muted : step.color,
                fontSize: 13,
                cursor: activeStep === JOURNEY_STEPS.length - 1 ? "default" : "pointer",
                opacity: activeStep === JOURNEY_STEPS.length - 1 ? 0.4 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        margin: "0 48px",
        padding: "32px 0 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1200 - 96, marginLeft: "auto", marginRight: "auto",
      }}>
        <div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, color: T.bright, marginBottom: 6,
          }}>
            One platform. Every corner of your business.
          </div>
          <div style={{ color: T.muted, fontSize: 13 }}>
            8 domains · 87% auto-resolved · 8-week deployment
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/"
            style={{
              padding: "10px 22px",
              background: T.tealDim,
              border: `1px solid ${T.teal}40`,
              borderRadius: 6, color: T.teal, fontSize: 13, fontWeight: 600,
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Try Employee Portal →
          </a>
          <a
            href="/governance/control-tower"
            style={{
              padding: "10px 22px",
              background: T.goldDim,
              border: `1px solid ${T.goldBorder}`,
              borderRadius: 6, color: T.gold, fontSize: 13, fontWeight: 600,
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            View AI Control Tower →
          </a>
        </div>
      </div>
    </div>
  );
}
