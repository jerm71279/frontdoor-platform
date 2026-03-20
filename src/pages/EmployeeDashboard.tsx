/**
 * iOPEX AI FrontDoor — One Platform · One Data Model · Every Corner of Your Business
 * Employee daily portal: unified AI surface across IT, HR, Finance, Legal, Facilities, Security, Ops
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ── Tokens ── */
const T = {
  navy:       "#0B1120",
  navyMid:    "#0F1829",
  navyCard:   "#111927",
  navyHover:  "#18253A",
  navyDeep:   "#080E1A",
  gold:       "#E8A020",
  goldDim:    "rgba(232,160,32,0.10)",
  goldBorder: "rgba(232,160,32,0.22)",
  goldGlow:   "rgba(232,160,32,0.06)",
  teal:       "#06B6D4",   tealDim:    "rgba(6,182,212,0.10)",
  violet:     "#8B5CF6",   violetDim:  "rgba(139,92,246,0.10)",
  emerald:    "#10B981",   emeraldDim: "rgba(16,185,129,0.10)",
  rose:       "#F43F5E",   roseDim:    "rgba(244,63,94,0.10)",
  amber:      "#F59E0B",   amberDim:   "rgba(245,158,11,0.10)",
  sky:        "#38BDF8",   skyDim:     "rgba(56,189,248,0.10)",
  pink:       "#EC4899",   pinkDim:    "rgba(236,72,153,0.10)",
  lime:       "#84CC16",   limeDim:    "rgba(132,204,22,0.10)",
  text:       "#C8D4E4",
  muted:      "#3D5068",
  bright:     "#ECF1FA",
  border:     "rgba(255,255,255,0.06)",
  borderMid:  "rgba(255,255,255,0.03)",
};

/* ── Employee fallback (demo / unauthenticated) ── */
const EMP_DEMO = {
  id: "EMP-8841", name: "Alex Chen", first: "Alex",
  dept: "Engineering", role: "Sr. Software Engineer",
  manager: "Sarah Park", avatar: "AC", location: "Austin, TX",
  tenure: "3 yrs 4 mo", pto: 14, costCenter: "ENG-204",
  email: "",
};

/* ── Every Corner of the Business ── */
const DOMAINS = [
  { id: "IT",          label: "IT & Tech",      icon: "⚙",  color: T.teal,    dim: T.tealDim,
    desc: "Devices, access, software, VPN, helpdesk" },
  { id: "HR",          label: "HR & People",    icon: "◎",  color: T.violet,  dim: T.violetDim,
    desc: "Leave, benefits, payroll, onboarding, policy" },
  { id: "Finance",     label: "Finance",        icon: "◈",  color: T.emerald, dim: T.emeraldDim,
    desc: "Expenses, POs, reimbursements, invoices" },
  { id: "Legal",       label: "Legal",          icon: "⊡",  color: T.amber,   dim: T.amberDim,
    desc: "Contracts, NDAs, compliance, IP" },
  { id: "Facilities",  label: "Facilities",     icon: "⬡",  color: T.sky,     dim: T.skyDim,
    desc: "Office, badges, parking, room booking" },
  { id: "Security",    label: "Security",       icon: "◬",  color: T.rose,    dim: T.roseDim,
    desc: "Access review, incidents, MFA, audits" },
  { id: "Operations",  label: "Operations",     icon: "◉",  color: T.lime,    dim: T.limeDim,
    desc: "Procurement, vendors, policies, logistics" },
  { id: "Marketing",   label: "Marketing",      icon: "◌",  color: T.pink,    dim: T.pinkDim,
    desc: "Brand, creative, campaigns, assets" },
];

/* ── Status ── */
const S: Record<string, { label: string; color: string; bg: string }> = {
  submitted:   { label: "Submitted",        color: T.teal,    bg: T.tealDim },
  routing:     { label: "AI Routing…",      color: T.violet,  bg: T.violetDim },
  in_progress: { label: "In Progress",      color: T.sky,     bg: T.skyDim },
  pending:     { label: "Pending Approval", color: T.amber,   bg: T.amberDim },
  approved:    { label: "Approved",         color: T.emerald, bg: T.emeraldDim },
  completed:   { label: "Completed",        color: T.emerald, bg: T.emeraldDim },
  cancelled:   { label: "Cancelled",        color: T.muted,   bg: T.borderMid },
};

/* ── Announcements ── */
const NOTICES = [
  { domain:"HR",       color: T.violet,  text:"Open enrollment closes March 31. Update benefits before the deadline." },
  { domain:"IT",       color: T.teal,    text:"Scheduled maintenance Sat Mar 22 11pm–2am. Brief VPN downtime expected." },
  { domain:"Finance",  color: T.emerald, text:"Q1 expense reports due April 4. Submit via FrontDoor or Finance portal." },
  { domain:"Security", color: T.rose,    text:"Annual access review due March 28. Check your entitlements in Security." },
];

/* ── RAG Knowledge Corpus display metadata ── */
const RAG_CORPUS: Record<string, { corpus: string; docs: string; chunks: string }> = {
  IT:         { corpus: "IT Runbooks · Device Catalog · ServiceNow KB",  docs: "38K",  chunks: "8"  },
  HR:         { corpus: "Workday Docs · HR Policy · Benefits KB",        docs: "52K",  chunks: "7"  },
  Finance:    { corpus: "SAP GL Docs · Finance Policy · Vendor Registry",docs: "29K",  chunks: "4"  },
  Legal:      { corpus: "Contract Templates · Legal Policy · NDA Corpus",docs: "14K",  chunks: "4"  },
  Facilities: { corpus: "Facilities Runbooks · Room System · Badge Ops", docs: "8K",   chunks: "4"  },
  Security:   { corpus: "IAM Policies · SOC Runbooks · Access Matrix",   docs: "21K",  chunks: "5"  },
  Operations: { corpus: "Ops SOPs · Vendor Registry · Process Library",  docs: "17K",  chunks: "4"  },
  Marketing:  { corpus: "Brand Guidelines · Creative Briefs · Asset Lib",docs: "11K",  chunks: "3"  },
};

/* ── Grounded KB answers fallback (used if RAG edge fn unavailable) ── */
const KB_ANSWERS: Record<string, { answer: string; sources: {doc:string;excerpt:string}[] }> = {
  HR: {
    answer: "Acme Corp PTO policy: 15 days/year (0–2 yrs tenure), 20 days (2–5 yrs), 25 days (5+ yrs). Carry-over cap: 5 days. Requests must be submitted at least 2 business days in advance. Sick leave is separate — 10 days/year, no carry-over.",
    sources: [
      { doc: "HR Policy 2026 · Section 4.2 — Leave Entitlements", excerpt: "Full-time employees accrue PTO at the rate defined by tenure band..." },
      { doc: "Workday Benefits Guide v3.1", excerpt: "PTO balances are updated in Workday every pay cycle..." },
    ],
  },
  IT: {
    answer: "VPN uses Cisco AnyConnect. Download from IT portal: https://intranet.acmecorp.com/it/vpn. Use your corporate SSO credentials + Okta MFA. If MFA fails, reset via Security > MFA Reset in FrontDoor.",
    sources: [
      { doc: "IT Runbooks v4.2 · VPN Setup", excerpt: "Cisco AnyConnect is the approved VPN client for all Acme Corp endpoints..." },
      { doc: "Device Catalog · Remote Access", excerpt: "All remote connections must use the corporate VPN tunnel..." },
    ],
  },
  Finance: {
    answer: "Expense limits: up to $500 no approval needed. $500–$2,000 requires manager approval. Over $2,000 requires VP sign-off. Receipts required for all purchases over $25. Submit within 30 days of expense date.",
    sources: [
      { doc: "Finance Policy FP-12 · Employee Expenses", excerpt: "All business expenses must be submitted through the approved expense system..." },
      { doc: "SAP Concur Guide v2.0", excerpt: "Receipts must be attached digitally. Paper receipts are not accepted..." },
    ],
  },
  Legal: {
    answer: "Standard NDA review takes 3–5 business days. Template NDAs (mutual and one-way) are available for immediate use. Custom NDAs require Legal team review.",
    sources: [
      { doc: "Legal Process Guide · NDAs", excerpt: "Template agreements are pre-approved by Legal and can be executed without review..." },
      { doc: "Contract Templates Library v1.4", excerpt: "Mutual NDA Template MUT-001 covers standard confidentiality obligations..." },
    ],
  },
  Security: {
    answer: "Password requirements: minimum 12 characters, must include uppercase, lowercase, number, and special character. Rotate every 90 days. MFA is mandatory for all systems. Report phishing to security@acmecorp.com.",
    sources: [
      { doc: "IAM Policy v2.4 · Password Standards", excerpt: "All user accounts must comply with NIST SP 800-63B password guidelines..." },
      { doc: "SOC Runbook · Phishing Response", excerpt: "Suspected phishing emails should be forwarded to the Security Operations Center..." },
    ],
  },
  Facilities: {
    answer: "Conference rooms are bookable via Outlook or the Facilities portal. Rooms 101–108 (Floor 3) seat 4–12 people. Max booking: 4 hours. Visitor passes must be requested 24 hours in advance.",
    sources: [
      { doc: "Facilities Runbook · Room Booking", excerpt: "All meeting rooms are managed through the integrated calendar system..." },
      { doc: "Badge & Access Operations Guide", excerpt: "Visitor access requires a sponsor employee to submit a pass request..." },
    ],
  },
  Operations: {
    answer: "Vendor onboarding requires: completed vendor form, W-9 (US) or W-8BEN (international), proof of insurance, and security questionnaire. Standard processing: 5–7 business days.",
    sources: [
      { doc: "Ops SOPs · Vendor Onboarding v2.1", excerpt: "All new vendors must complete the Acme Corp supplier registration process..." },
      { doc: "Procurement Policy PP-08", excerpt: "No purchase order may be raised against an unapproved vendor..." },
    ],
  },
  Marketing: {
    answer: "Brand assets (logos, templates, fonts) are in the Brand Portal at brand.acmecorp.com. For new creative requests, submit a Creative Brief via FrontDoor with at least 5 business days lead time.",
    sources: [
      { doc: "Brand Guidelines 2026 · Visual Identity", excerpt: "The Acme Corp logo must never be stretched, recolored, or placed on busy backgrounds..." },
      { doc: "Creative Brief Template v1.2", excerpt: "All external-facing creative must be reviewed by the Brand team before publication..." },
    ],
  },
};

/* ── Classify domain from text ── */
function classifyDomain(text: string): string {
  const t = text.toLowerCase();
  if (t.match(/laptop|computer|software|figma|vpn|password|device|license|it |tech|monitor|keyboard|slack|zoom|email|git|code|deploy/)) return "IT";
  if (t.match(/pto|leave|vacation|hr|benefit|onboard|address|time off|sick|payroll|401|insurance|direct deposit|people/)) return "HR";
  if (t.match(/expense|receipt|reimburs|purchase|invoice|budget|finance|po |vendor|payment|credit card|travel|spend/)) return "Finance";
  if (t.match(/nda|contract|legal|compliance|ip |intellectual|trademark|patent|privacy|hold|clause/)) return "Legal";
  if (t.match(/badge|room|parking|office|supplies|desk|building|visitor|facilities|move|floor/)) return "Facilities";
  if (t.match(/mfa|security|incident|phish|access review|audit|privileged|dlp|soc|threat|malware/)) return "Security";
  if (t.match(/marketing|brand|creative|campaign|social|swag|event|press|media|logo|asset/)) return "Marketing";
  return "Operations";
}

/* ── Detect question vs. request ── */
function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(what|how|when|where|who|why|can i|do i|is there|are there|show me|tell me|find|search|does|did|will|should i|what's|how's|what is|how do|how many|how long|am i|which)/.test(t);
}

/* ── AI Steps builder ── */
function buildSteps(domain: string, approval: boolean) {
  const systemMap: Record<string, string> = {
    IT:"ServiceNow ticket created", HR:"Workday policy checked",
    Finance:"GL code & budget validated", Legal:"Legal queue assigned",
    Facilities:"Facilities management notified", Security:"IAM review initiated",
    Operations:"Ops team alerted", Marketing:"Creative team notified",
  };
  const steps = [
    {label:"Submitted",                   done:true,  active:false, time:"just now"},
    {label:`AI routed → ${domain}`,       done:false, active:true,  time:""},
    {label:`KB grounded`,                 done:false, active:false, time:""},
    {label:systemMap[domain]||"Processing",done:false,active:false, time:""},
  ];
  if (approval) {
    steps.push({label:"Manager approval", done:false, active:false, time:""});
    steps.push({label:"Approved",         done:false, active:false, time:""});
  }
  steps.push({label:"Completed",          done:false, active:false, time:""});
  return steps;
}

/* ════════════════════════════════════════════════════════════════
   REQUEST DRAWER
════════════════════════════════════════════════════════════════ */
function Drawer({ req, empManager, onClose }: {
  req: any; empManager: string; onClose: () => void;
}) {
  const cfg = S[req.status] || S.submitted;
  const dom = DOMAINS.find(d => d.id === req.domain) || DOMAINS[0];
  const rag = RAG_CORPUS[req.domain] || RAG_CORPUS.Operations;
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",justifyContent:"flex-end"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(2px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",zIndex:1,width:420,height:"100vh",
        background:T.navyMid,borderLeft:`1px solid ${T.border}`,
        display:"flex",flexDirection:"column",overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{padding:"22px 24px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.muted}}>{req.id}</span>
                <span style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}30`,
                  borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>
                  {cfg.label}</span>
              </div>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.bright,fontWeight:700,lineHeight:1.2}}>
                {req.title}</h3>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:22,padding:4}}>×</button>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap" as const}}>
            <span style={{background:dom.color+"18",color:dom.color,border:`1px solid ${dom.color}25`,
              borderRadius:4,padding:"2px 10px",fontSize:11,fontFamily:"'DM Mono',monospace"}}>
              {dom.icon} {dom.label}</span>
            <span style={{color:T.muted,fontSize:12}}>Submitted {req.created}</span>
            {req.sla_label&&<span style={{color:T.muted,fontSize:11}}>SLA: {req.sla_label}</span>}
          </div>
        </div>

        {/* Timeline */}
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",marginBottom:14}}>PROGRESS TIMELINE</div>
          {req.steps.map((step: any, i: number) => (
            <div key={i} style={{display:"flex",gap:12,marginBottom:0}}>
              <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",width:20}}>
                <div style={{
                  width:18,height:18,borderRadius:"50%",flexShrink:0,marginTop:1,
                  background:step.done?T.emerald:step.active?T.gold:"rgba(255,255,255,0.07)",
                  border:`2px solid ${step.done?T.emerald:step.active?T.gold:"rgba(255,255,255,0.1)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:9,color:step.done?T.navy:"transparent",
                  boxShadow:step.active?`0 0 10px ${T.gold}70`:"none",
                  animation:step.active?"pulseStep 1.5s ease infinite":"none",
                }}>{step.done?"✓":""}</div>
                {i<req.steps.length-1&&<div style={{width:2,flex:1,minHeight:20,
                  background:step.done?T.emerald+"40":"rgba(255,255,255,0.05)",marginTop:3}}/>}
              </div>
              <div style={{paddingBottom:18}}>
                <div style={{color:step.done?T.text:step.active?T.gold:T.muted,fontSize:13,fontWeight:step.active?600:400}}>
                  {step.label}</div>
                {step.time&&<div style={{color:T.muted,fontSize:11,marginTop:1,fontFamily:"'DM Mono',monospace"}}>{step.time}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {req.summary&&(
          <div style={{padding:"16px 24px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",marginBottom:8}}>RESOLUTION</div>
            <p style={{color:T.text,fontSize:13,lineHeight:1.65}}>{req.summary}</p>
          </div>
        )}

        {/* Approval pending */}
        {req.status==="pending"&&(
          <div style={{padding:"16px 24px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{background:T.amberDim,border:`1px solid rgba(245,158,11,0.22)`,borderRadius:10,padding:16}}>
              <div style={{color:T.amber,fontSize:13,fontWeight:600,marginBottom:3}}>Approval Email Sent</div>
              <div style={{color:T.muted,fontSize:12,lineHeight:1.5}}>
                An approval request has been sent to <strong style={{color:T.text}}>{req.approver_email || empManager}</strong>.
                Waiting for response…
              </div>
            </div>
          </div>
        )}

        {/* Signal Engine Audit */}
        <div style={{margin:"16px 24px 24px",background:T.violetDim,border:`1px solid rgba(139,92,246,0.18)`,borderRadius:10,padding:16}}>
          <div style={{fontSize:10,color:T.violet,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",marginBottom:12}}>SIGNAL ENGINE AUDIT · TRUSTCORE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[
              {k:"Domain",     v:req.domain},
              {k:"Confidence", v:req.confidence||"0.94"},
              {k:"Model",      v:"Gemini 2.5 Flash"},
              {k:"Latency",    v:req.latency||"271ms"},
              {k:"Data Model", v:"Unified / RLS"},
              {k:"Audit ID",   v:req.id+"-LOG"},
            ].map(({k,v})=>(
              <div key={k}>
                <div style={{color:T.muted,fontSize:10,marginBottom:2}}>{k}</div>
                <div style={{color:T.text,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10}}>
            <div style={{color:T.muted,fontSize:10,marginBottom:2}}>Knowledge sources</div>
            <div style={{color:T.text,fontSize:11,fontFamily:"'DM Mono',monospace",lineHeight:1.5}}>
              {rag.chunks} chunks · {rag.docs} indexed</div>
          </div>
          <div style={{marginTop:10}}>
            <div style={{color:T.muted,fontSize:10,marginBottom:2}}>Corpus</div>
            <div style={{color:T.text,fontSize:11,fontFamily:"'DM Mono',monospace",lineHeight:1.5}}>{rag.corpus}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SERVICE CATALOG MODAL
════════════════════════════════════════════════════════════════ */
function CatalogModal({ domain, items, onClose, onSelect }: {
  domain: string;
  items: any[];
  onClose: () => void;
  onSelect: (item: any) => void;
}) {
  const dom = DOMAINS.find(d => d.id === domain) || DOMAINS[0];
  const domItems = items.filter(i => i.domain === domain && i.active);

  return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(3px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",zIndex:1,
        background:T.navyMid,border:`1px solid ${dom.color}30`,
        borderRadius:14,padding:28,width:440,maxHeight:"80vh",overflow:"auto",
        boxShadow:"0 24px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:44,height:44,borderRadius:12,
            background:dom.color+"18",border:`1px solid ${dom.color}25`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:dom.color}}>
            {dom.icon}</div>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:dom.color}}>
              {dom.label}</div>
            <div style={{color:T.muted,fontSize:12}}>{dom.desc}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,
            cursor:"pointer",fontSize:20,padding:4,marginLeft:"auto"}}>×</button>
        </div>

        {/* Catalog items */}
        {domItems.length > 0 ? (
          <>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.06em",marginBottom:12}}>
              SERVICE CATALOG · {domItems.length} ITEMS</div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
              {domItems.map((item: any) => (
                <button key={item.id} onClick={()=>{onClose();onSelect(item);}} style={{
                  padding:"14px 16px",borderRadius:10,textAlign:"left" as const,
                  background:dom.color+"0D",border:`1px solid ${dom.color}18`,
                  cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=dom.color+"45"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=dom.color+"18"}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:16}}>{item.icon}</span>
                        <span style={{color:T.bright,fontSize:13,fontWeight:600}}>{item.name}</span>
                      </div>
                      <div style={{color:T.muted,fontSize:11,lineHeight:1.5}}>{item.description}</div>
                    </div>
                    <div style={{flexShrink:0,textAlign:"right" as const}}>
                      <div style={{color:dom.color,fontSize:10,fontFamily:"'DM Mono',monospace",marginBottom:4}}>
                        {item.sla_label}</div>
                      {item.requires_approval&&(
                        <span style={{background:T.amberDim,color:T.amber,border:`1px solid rgba(245,158,11,0.25)`,
                          borderRadius:4,padding:"1px 6px",fontSize:9,fontFamily:"'DM Mono',monospace"}}>
                          APPROVAL</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Fallback: free-text prompts when no catalog items for this domain */
          <>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.06em",marginBottom:12}}>
              COMMON REQUESTS</div>
            <div style={{display:"flex",flexDirection:"column" as const,gap:7}}>
              {[
                "Request access","Report an issue","Ask a question","Get help with policy",
              ].map((s:string)=>(
                <button key={s} onClick={()=>{onClose();}} style={{
                  padding:"10px 14px",borderRadius:8,textAlign:"left" as const,
                  background:dom.color+"0D",border:`1px solid ${dom.color}18`,
                  color:T.text,fontSize:13,cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",
                  display:"flex",justifyContent:"space-between" as const,alignItems:"center",
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=dom.color+"45"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=dom.color+"18"}
                >
                  <span>{s}</span><span style={{color:dom.color}}>→</span>
                </button>
              ))}
            </div>
          </>
        )}

        <button onClick={onClose} style={{
          marginTop:16,width:"100%",padding:"8px 0",borderRadius:8,
          background:"transparent",border:`1px solid ${T.border}`,
          color:T.muted,cursor:"pointer",fontSize:12,
        }}>Close</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */
export default function EmployeeDashboard() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();

  const EMP = useMemo(() => profile ? {
    id:         `EMP-${profile.user_id.slice(0,4).toUpperCase()}`,
    name:       profile.full_name  || EMP_DEMO.name,
    first:      profile.first_name || EMP_DEMO.first,
    dept:       profile.department || EMP_DEMO.dept,
    role:       profile.role       || EMP_DEMO.role,
    manager:    profile.manager    || EMP_DEMO.manager,
    avatar:     profile.avatar     || EMP_DEMO.avatar,
    location:   profile.location   || EMP_DEMO.location,
    tenure:     profile.tenure     || EMP_DEMO.tenure,
    pto:        profile.pto_balance ?? EMP_DEMO.pto,
    costCenter: profile.cost_center|| EMP_DEMO.costCenter,
    email:      profile.email      || EMP_DEMO.email,
  } : EMP_DEMO, [profile]);

  const [requests,       setRequests]       = useState<any[]>([]);
  const [catalogItems,   setCatalogItems]   = useState<any[]>([]);
  const [input,          setInput]          = useState("");
  const [sending,        setSending]        = useState(false);
  const [activeReq,      setActiveReq]      = useState<any>(null);
  const [activeDomain,   setActiveDomain]   = useState<string|null>(null);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [kbAnswer,       setKbAnswer]       = useState<{domain:string;answer:string;sources:{doc:string;excerpt:string}[]}|null>(null);
  const [loadingReqs,    setLoadingReqs]    = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const openCount = requests.filter(r=>!["completed","cancelled"].includes(r.status)).length;

  /* ── Load service catalog items from DB ── */
  useEffect(() => {
    supabase.from("service_catalog_items")
      .select("*")
      .eq("tenant_id","demo")
      .eq("active",true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setCatalogItems(data);
      });
  }, []);

  /* ── Load user's workflow requests from DB ── */
  useEffect(() => {
    if (!user) { setLoadingReqs(false); return; }

    supabase.from("workflow_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRequests(data.map(r => ({
            ...r,
            created: new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}),
            steps:   Array.isArray(r.steps) ? r.steps : [],
          })));
        }
        setLoadingReqs(false);
      });
  }, [user]);

  /* Keep drawer in sync when requests change */
  useEffect(()=>{
    if (activeReq) {
      const updated = requests.find(r=>r.id===activeReq.id);
      if (updated) setActiveReq(updated);
    }
  },[requests]);

  function updateLocalRequest(id: string, patch: Partial<any>) {
    setRequests(prev => prev.map(r => r.id===id ? {...r,...patch} : r));
  }

  async function advanceRequest(id: string, toStatus: string, stepIdx: number) {
    const steps = requests.find(r=>r.id===id)?.steps || [];
    const newSteps = steps.map((s:any,i:number)=>({
      ...s, done:i<stepIdx, active:i===stepIdx,
      time: i<stepIdx ? (s.time||new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})) : s.time,
    }));

    updateLocalRequest(id, { status: toStatus, steps: newSteps });

    // Persist to DB
    await supabase.from("workflow_requests")
      .update({ status: toStatus, steps: newSteps })
      .eq("id", id);

    if (toStatus==="completed") {
      const req = requests.find(r=>r.id===id);
      if (req) ingestWorkflow(req);
    }
  }

  function ingestWorkflow(req: any) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string|undefined;
    const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
    if (!supabaseUrl || !anonKey) return;
    fetch(`${supabaseUrl}/functions/v1/ingest-workflow-resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({
        workflow_id: req.id, domain: req.domain,
        title: req.title, resolution: req.summary || null,
        steps: req.steps, tenant_id: "demo",
      }),
    }).catch(()=>{});
  }

  async function triggerApprovalEmail(reqId: string, approverEmail: string, title: string, domain: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string|undefined;
    const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
    if (!supabaseUrl || !anonKey) return;
    fetch(`${supabaseUrl}/functions/v1/send-approval-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({
        request_id: reqId,
        approver_email: approverEmail,
        requester_name: EMP.name,
        title, domain,
      }),
    }).catch(()=>{});
  }

  /* ── Handle catalog item selection ── */
  async function selectCatalogItem(item: any) {
    await submitRequest(item.name, item.domain, item.id, item.requires_approval, item.sla_label);
  }

  /* ── Core submit logic ── */
  async function submitRequest(
    text: string,
    domainOverride?: string,
    catalogItemId?: string,
    requiresApprovalOverride?: boolean,
    slaLabel?: string,
  ) {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");

    const domain = domainOverride || classifyDomain(text);

    /* Question → RAG */
    if (!domainOverride && isQuestion(text)) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string|undefined;
      const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
      if (supabaseUrl && anonKey) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/query-knowledge-base`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
            body: JSON.stringify({ question: text, domain, tenant_id: "demo" }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.answer) {
              setKbAnswer({ domain, answer: data.answer, sources: data.sources || [] });
              setSending(false);
              return;
            }
          }
        } catch (_) {}
      }
      const kb = KB_ANSWERS[domain] || KB_ANSWERS.Operations;
      setKbAnswer({ domain, ...kb });
      setSending(false);
      return;
    }

    const needsApproval = requiresApprovalOverride ?? (["HR","Finance","Legal"].includes(domain) || text.toLowerCase().includes("laptop"));
    const id = `REQ-${String(Math.floor(Math.random()*9000)+1000)}`;
    const steps = buildSteps(domain, needsApproval);

    const newReq: any = {
      id, domain, status:"submitted",
      title: text.length>65 ? text.slice(0,62)+"…" : text,
      created:"just now",
      confidence:(0.88+Math.random()*0.1).toFixed(2),
      latency:`${200+Math.floor(Math.random()*150)}ms`,
      steps,
      catalog_item_id: catalogItemId || null,
      sla_label: slaLabel || null,
      approver_email: "",
      user_id: user?.id,
      tenant_id: "demo",
      description: "",
      metadata: {},
    };

    setRequests(prev=>[newReq,...prev]);
    setSending(false);

    /* Persist to DB */
    if (user) {
      await supabase.from("workflow_requests").insert({
        id,
        user_id:         user.id,
        tenant_id:       "demo",
        domain,
        title:           newReq.title,
        status:          "submitted",
        steps,
        catalog_item_id: catalogItemId || null,
        metadata:        { confidence: newReq.confidence, latency: newReq.latency, sla_label: slaLabel || null },
      });
    }

    /* Animate through states */
    setTimeout(()=>advanceRequest(id,"routing",1), 1200);
    setTimeout(()=>advanceRequest(id,"in_progress",2), 2800);

    if (needsApproval) {
      setTimeout(async()=>{
        await advanceRequest(id,"pending",3);
        /* Send real approval email — use manager email or employee's own email for demo */
        const approverEmail = EMP.email || "demo@acmecorp.com";
        await triggerApprovalEmail(id, approverEmail, newReq.title, domain);
        updateLocalRequest(id, { approver_email: approverEmail });
      }, 5000);
    } else {
      /* Auto-complete non-approval requests */
      setTimeout(()=>advanceRequest(id,"completed", steps.length-1), 6000);
    }
  }

  async function submit(text: string) {
    await submitRequest(text);
  }

  /* Poll for approval status changes on pending requests */
  useEffect(()=>{
    if (!user) return;
    const pendingIds = requests.filter(r=>r.status==="pending").map(r=>r.id);
    if (pendingIds.length===0) return;

    const interval = setInterval(async()=>{
      const { data } = await supabase.from("workflow_requests")
        .select("id,status,approved_at,approved_by")
        .in("id", pendingIds);

      if (data) {
        data.forEach(row=>{
          const local = requests.find(r=>r.id===row.id);
          if (local && local.status !== row.status) {
            if (row.status === "approved") {
              const steps = local.steps.map((s:any,i:number)=>({
                ...s,
                done: i <= local.steps.findIndex((s2:any)=>s2.label==="Approved"),
                active: false,
              }));
              updateLocalRequest(row.id, { status:"approved", steps });
              /* Auto-complete after approval */
              setTimeout(()=>advanceRequest(row.id,"completed",local.steps.length-1), 2000);
            } else if (row.status === "cancelled") {
              updateLocalRequest(row.id, { status:"cancelled" });
            }
          }
        });
      }
    }, 5000);

    return ()=>clearInterval(interval);
  }, [requests, user]);

  /* Escape closes everything */
  useEffect(()=>{
    const handler = (e: KeyboardEvent) => {
      if (e.key==="Escape") {
        setActiveDomain(null); setActiveReq(null);
        setNotifOpen(false); setKbAnswer(null);
      }
    };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{background:T.navy,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:T.text}}>

      <div style={{maxWidth:1140,margin:"0 auto",padding:"28px 24px"}}>

        {/* ── GREETING + CHAT BAR ── */}
        <div style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:700,color:T.bright}}>
              {greeting}, {EMP.first}.
            </div>
            {/* Notification bell */}
            <div style={{position:"relative",flexShrink:0}}>
              <button onClick={()=>setNotifOpen(p=>!p)} style={{
                background:notifOpen?T.navyCard:"none",
                border:`1px solid ${notifOpen?T.border:"transparent"}`,
                borderRadius:8,cursor:"pointer",
                color:T.muted,fontSize:16,padding:"6px 10px",position:"relative",
                transition:"all 0.15s",
              }}>
                🔔
                {NOTICES.length>0&&<span style={{
                  position:"absolute",top:2,right:2,width:14,height:14,borderRadius:"50%",
                  background:T.gold,color:T.navy,fontSize:8,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>{NOTICES.length}</span>}
              </button>
              {notifOpen&&(
                <div style={{
                  position:"absolute",right:0,top:42,width:300,
                  background:T.navyCard,border:`1px solid ${T.border}`,
                  borderRadius:10,overflow:"hidden",zIndex:400,
                  boxShadow:"0 12px 40px rgba(0,0,0,0.5)",
                }}>
                  <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,
                    fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.06em"}}>
                    ANNOUNCEMENTS · Press Esc to close</div>
                  {NOTICES.map((n,i)=>(
                    <div key={i} style={{padding:"10px 16px",borderBottom:`1px solid ${T.borderMid}`}}>
                      <span style={{background:n.color+"18",color:n.color,fontSize:9,
                        fontFamily:"'DM Mono',monospace",padding:"1px 6px",borderRadius:3,marginRight:6}}>
                        {n.domain}</span>
                      <span style={{color:T.text,fontSize:12,lineHeight:1.5}}>{n.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{color:T.muted,fontSize:13,marginBottom:20}}>
            {EMP.role} · {EMP.dept} · {EMP.location} · PTO balance: <span style={{color:T.violet}}>{EMP.pto} days</span>
          </div>

          {/* Unified chat bar */}
          <div style={{
            background:T.navyCard,
            border:`1px solid ${T.goldBorder}`,
            borderRadius:14,padding:"5px 6px 5px 20px",
            display:"flex",alignItems:"center",gap:12,
            boxShadow:`0 0 40px ${T.goldGlow}, 0 0 0 1px ${T.goldBorder}`,
          }}>
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" style={{flexShrink:0}}>
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="none" stroke={T.gold} strokeWidth="1.5"/>
            </svg>
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submit(input)}
              placeholder="What do you need? IT · HR · Finance · Legal · Facilities · Security · Ops · Marketing…"
              style={{
                flex:1,background:"none",border:"none",outline:"none",
                fontSize:14,color:T.bright,fontFamily:"'DM Sans',sans-serif",padding:"11px 0",
              }}
            />
            <button onClick={()=>submit(input)} disabled={!input.trim()||sending} style={{
              padding:"10px 22px",borderRadius:9,border:"none",
              background:input.trim()?T.gold:"rgba(255,255,255,0.05)",
              color:input.trim()?T.navy:T.muted,fontWeight:700,fontSize:13,
              cursor:input.trim()?"pointer":"default",fontFamily:"'DM Sans',sans-serif",
              transition:"all 0.15s",flexShrink:0,
            }}>{sending?"Routing…":"Submit →"}</button>
          </div>
          <div style={{textAlign:"center" as const,marginTop:10,color:T.muted,fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>
            One request. One AI. Every system. — Powered by iOPEX Signal Engine
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:20,alignItems:"start"}}>

          {/* LEFT */}
          <div>

            {/* ── DOMAIN CATALOG GRID ── */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",
                letterSpacing:"0.07em",marginBottom:14}}>EVERY CORNER OF YOUR BUSINESS</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {DOMAINS.map(d=>{
                  const itemCount = catalogItems.filter(i=>i.domain===d.id&&i.active).length;
                  return (
                    <button key={d.id} onClick={()=>setActiveDomain(d.id)} style={{
                      background:T.navyCard,border:`1px solid ${T.border}`,
                      borderRadius:10,padding:"14px 14px 12px",textAlign:"left" as const,
                      cursor:"pointer",transition:"all 0.15s",
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=d.color+"45";e.currentTarget.style.background=T.navyHover;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.navyCard;}}
                    >
                      <div style={{
                        width:30,height:30,borderRadius:8,marginBottom:8,
                        background:d.color+"18",border:`1px solid ${d.color}22`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:15,color:d.color,
                      }}>{d.icon}</div>
                      <div style={{fontWeight:600,fontSize:12,color:d.color,marginBottom:2}}>{d.label}</div>
                      <div style={{fontSize:10,color:T.muted,lineHeight:1.4,marginBottom:itemCount?4:0}}>{d.desc}</div>
                      {itemCount>0&&(
                        <div style={{fontSize:9,color:d.color+"99",fontFamily:"'DM Mono',monospace",marginTop:2}}>
                          {itemCount} service{itemCount>1?"s":""}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── KB ANSWER CARD ── */}
            {kbAnswer&&(()=>{
              const dom = DOMAINS.find(d=>d.id===kbAnswer.domain)||DOMAINS[0];
              const rag = RAG_CORPUS[kbAnswer.domain]||RAG_CORPUS.Operations;
              return (
                <div style={{
                  marginBottom:20,
                  background:T.navyCard,
                  border:`1px solid ${dom.color}30`,
                  borderLeft:`3px solid ${dom.color}`,
                  borderRadius:10,overflow:"hidden",
                  boxShadow:`0 0 24px ${dom.color}08`,
                }}>
                  <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16,color:dom.color}}>{dom.icon}</span>
                      <span style={{fontSize:10,color:dom.color,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em"}}>
                        {dom.label.toUpperCase()} · KNOWLEDGE BASE</span>
                    </div>
                    <button onClick={()=>setKbAnswer(null)} style={{
                      background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:18,padding:4,lineHeight:1
                    }}>×</button>
                  </div>
                  <div style={{padding:"16px 18px"}}>
                    <p style={{color:T.bright,fontSize:13,lineHeight:1.7,marginBottom:14}}>{kbAnswer.answer}</p>
                    <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.06em",marginBottom:8}}>
                      SOURCES · {rag.chunks} CHUNKS · {rag.corpus}</div>
                    <div style={{display:"flex",flexDirection:"column" as const,gap:7}}>
                      {kbAnswer.sources.map((src,i)=>(
                        <div key={i} style={{
                          background:dom.color+"0A",border:`1px solid ${dom.color}18`,
                          borderRadius:7,padding:"9px 12px",
                        }}>
                          <div style={{color:dom.color,fontSize:11,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{src.doc}</div>
                          <div style={{color:T.muted,fontSize:11,lineHeight:1.5,fontStyle:"italic"}}>"{src.excerpt}"</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:12,display:"flex",gap:8}}>
                      <button onClick={()=>{setKbAnswer(null);setInput("I need to ");inputRef.current?.focus();}} style={{
                        padding:"7px 14px",borderRadius:7,background:dom.color,
                        border:"none",color:T.navy,fontWeight:700,fontSize:11,cursor:"pointer",
                        fontFamily:"'DM Sans',sans-serif",
                      }}>Submit a request instead →</button>
                      <button onClick={()=>setKbAnswer(null)} style={{
                        padding:"7px 14px",borderRadius:7,background:"transparent",
                        border:`1px solid ${T.border}`,color:T.muted,fontSize:11,cursor:"pointer",
                        fontFamily:"'DM Sans',sans-serif",
                      }}>Dismiss</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── MY REQUESTS ── */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em"}}>
                  MY REQUESTS
                  {openCount>0&&<span style={{color:T.gold,marginLeft:8}}>{openCount} active</span>}
                </div>
              </div>
              {loadingReqs ? (
                <div style={{textAlign:"center" as const,padding:32,color:T.muted,fontSize:12}}>Loading requests…</div>
              ) : requests.length === 0 ? (
                <div style={{
                  background:T.navyCard,border:`1px solid ${T.border}`,borderRadius:10,
                  padding:"32px 24px",textAlign:"center" as const,
                }}>
                  <div style={{fontSize:24,marginBottom:10}}>✦</div>
                  <div style={{color:T.muted,fontSize:13}}>No requests yet. Use the chat bar above or browse the service catalog.</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                  {requests.map(req=>{
                    const cfg = S[req.status]||S.submitted;
                    const dom = DOMAINS.find(d=>d.id===req.domain)||DOMAINS[0];
                    const live = !["completed","cancelled"].includes(req.status);
                    const pct  = req.status==="routing"?"20%":req.status==="in_progress"?"45%":req.status==="pending"?"65%":req.status==="approved"?"85%":"100%";
                    return (
                      <div key={req.id} onClick={()=>setActiveReq(requests.find(r=>r.id===req.id)||req)}
                        style={{
                          background:T.navyCard,border:`1px solid ${live?T.border:T.borderMid}`,
                          borderRadius:10,padding:"13px 16px",cursor:"pointer",
                          borderLeft:`3px solid ${live?dom.color:"transparent"}`,
                          transition:"all 0.15s",
                        }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.navyHover}
                        onMouseLeave={e=>e.currentTarget.style.background=T.navyCard}
                      >
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,color:T.bright,fontWeight:500,marginBottom:5,
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                              {req.title}</div>
                            <div style={{display:"flex",gap:10,alignItems:"center"}}>
                              <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.muted}}>{req.id}</span>
                              <span style={{color:dom.color,fontSize:11}}>{dom.icon} {dom.label}</span>
                              <span style={{color:T.muted,fontSize:11}}>{req.created}</span>
                              {req.sla_label&&<span style={{color:T.muted,fontSize:10}}>{req.sla_label}</span>}
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            <span style={{
                              background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}30`,
                              borderRadius:4,padding:"3px 9px",fontSize:11,fontWeight:600,
                              fontFamily:"'DM Mono',monospace",
                              animation:req.status==="routing"?"blink 1.2s ease infinite":"none",
                            }}>{cfg.label}</span>
                            <span style={{color:T.muted,fontSize:16}}>›</span>
                          </div>
                        </div>
                        {live&&req.status!=="submitted"&&(
                          <div style={{marginTop:10,height:2,background:"rgba(255,255,255,0.05)",borderRadius:1,overflow:"hidden"}}>
                            <div style={{height:"100%",borderRadius:1,background:cfg.color,width:pct,transition:"width 0.9s ease"}}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>

            {/* Profile */}
            <div style={{background:T.navyCard,border:`1px solid ${T.border}`,borderRadius:10,padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{
                  width:42,height:42,borderRadius:"50%",
                  background:`linear-gradient(135deg,${T.gold}45,${T.gold}15)`,
                  border:`2px solid ${T.goldBorder}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:700,color:T.gold,fontFamily:"'DM Mono',monospace",
                }}>{EMP.avatar}</div>
                <div>
                  <div style={{fontWeight:700,color:T.bright,fontSize:14}}>{EMP.name}</div>
                  <div style={{color:T.muted,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{EMP.id}</div>
                </div>
              </div>
              {[
                {k:"Dept",       v:EMP.dept},
                {k:"Manager",    v:EMP.manager},
                {k:"Location",   v:EMP.location},
                {k:"Cost Center",v:EMP.costCenter},
                {k:"PTO Balance",v:`${EMP.pto} days`,c:T.violet},
                {k:"Tenure",     v:EMP.tenure},
              ].filter(row=>row.v).map(({k,v,c})=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",
                  padding:"5px 0",borderBottom:`1px solid ${T.borderMid}`}}>
                  <span style={{color:T.muted,fontSize:11}}>{k}</span>
                  <span style={{color:c||T.text,fontSize:12}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Sign out */}
            {profile&&(
              <button onClick={async()=>{await signOut();navigate("/auth");}} style={{
                width:"100%",padding:"8px 0",borderRadius:8,background:"transparent",
                border:`1px solid ${T.border}`,color:T.muted,cursor:"pointer",
                fontSize:11,fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",
              }}
                onMouseEnter={e=>e.currentTarget.style.color=T.rose}
                onMouseLeave={e=>e.currentTarget.style.color=T.muted}
              >Sign out</button>
            )}

            {/* One Data Model panel */}
            <div style={{background:T.navyCard,border:`1px solid ${T.goldBorder}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:10,color:T.gold,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",marginBottom:12}}>
                ONE DATA MODEL</div>
              <div style={{color:T.muted,fontSize:11,lineHeight:1.6,marginBottom:12}}>
                Every request flows through a single unified data layer. Identity, role, entitlements, and history resolved once — shared across every domain.
              </div>
              <div style={{display:"flex",flexDirection:"column" as const,gap:6}}>
                {[
                  {label:"Identity resolved",         color:T.emerald},
                  {label:"Entitlements checked",      color:T.emerald},
                  {label:`${catalogItems.length || 10} catalog items active`, color:T.teal},
                  {label:"TrustCore audit active",    color:T.violet},
                  {label:"RLS enforced per tenant",   color:T.gold},
                ].map(row=>(
                  <div key={row.label} style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:row.color,flexShrink:0}}/>
                    <span style={{color:T.muted,fontSize:11}}>{row.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements */}
            <div style={{background:T.navyCard,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
                fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em"}}>
                COMPANY NOTICES</div>
              {NOTICES.map((n,i)=>(
                <div key={i} style={{padding:"10px 14px",borderBottom:`1px solid ${T.borderMid}`}}>
                  <span style={{background:n.color+"18",color:n.color,fontSize:9,
                    fontFamily:"'DM Mono',monospace",padding:"1px 6px",borderRadius:3,
                    display:"inline-block",marginBottom:4}}>{n.domain}</span>
                  <p style={{color:T.text,fontSize:11,lineHeight:1.5}}>{n.text}</p>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div style={{background:T.navyCard,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
              <div style={{fontSize:10,color:T.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"0.07em",marginBottom:10}}>
                YOUR ACTIVITY</div>
              {[
                {label:"Requests this month", v:String(requests.length), c:T.teal},
                {label:"Avg resolution",      v:"1.8 hrs",               c:T.emerald},
                {label:"Domains used",        v:`${new Set(requests.map(r=>r.domain)).size} of 8`, c:T.violet},
                {label:"PTO used YTD",        v:"6 days",                c:T.amber},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",justifyContent:"space-between",
                  padding:"5px 0",borderBottom:`1px solid ${T.borderMid}`}}>
                  <span style={{color:T.muted,fontSize:11}}>{s.label}</span>
                  <span style={{color:s.c,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CATALOG MODAL ── */}
      {activeDomain&&(
        <CatalogModal
          domain={activeDomain}
          items={catalogItems}
          onClose={()=>setActiveDomain(null)}
          onSelect={selectCatalogItem}
        />
      )}

      {/* ── REQUEST DRAWER ── */}
      {activeReq&&(
        <Drawer
          req={activeReq}
          empManager={EMP.manager}
          onClose={()=>setActiveReq(null)}
        />
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
        @keyframes pulseStep { 0%,100%{box-shadow:0 0 8px rgba(232,160,32,0.5);} 50%{box-shadow:0 0 16px rgba(232,160,32,0.9);} }
      `}</style>
    </div>
  );
}
