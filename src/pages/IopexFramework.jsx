import { useState, useEffect } from "react";

const css = document.createElement("style");
css.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:rgba(232,160,32,0.2);border-radius:2px;}

  :root{
    --gold:#E8A020;
    --gold-dim:rgba(232,160,32,0.12);
    --gold-border:rgba(232,160,32,0.22);
    --navy:#0B1120;
    --surface:rgba(255,255,255,0.03);
    --border:rgba(255,255,255,0.06);
    --text:#D4DCE8;
    --muted:#4A5A70;
    --bright:#EEF2F8;
  }

  .root{
    font-family:'DM Sans',sans-serif;
    background:var(--navy);color:var(--text);
    min-height:100vh;position:relative;overflow:hidden;
  }
  .root::before{
    content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
    background:
      radial-gradient(ellipse 70% 50% at 50% -10%, rgba(232,160,32,0.07) 0%,transparent 60%),
      radial-gradient(ellipse 40% 30% at 5% 80%,  rgba(232,160,32,0.03) 0%,transparent 50%);
  }
  .noise{
    position:fixed;inset:0;pointer-events:none;z-index:0;opacity:0.018;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .layer-card{
    border-radius:10px;
    border:1px solid var(--border);
    background:var(--surface);
    transition:all 0.22s ease;
    cursor:pointer;position:relative;overflow:hidden;
  }
  .layer-card::before{
    content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
    border-radius:3px 0 0 3px;
    transition:opacity 0.22s;opacity:0;
  }
  .layer-card:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.045);}
  .layer-card.active{border-color:var(--gold-border);background:rgba(232,160,32,0.04);}
  .layer-card.active::before{opacity:1;}

  /* Layer accent colors */
  .lc-gold  ::before{background:var(--gold);}
  .lc-teal  ::before{background:#06B6D4;}
  .lc-violet::before{background:#8B5CF6;}
  .lc-rose  ::before{background:#F43F5E;}
  .lc-emerald::before{background:#10B981;}

  .lens-btn{
    font-family:'DM Mono',monospace;font-size:10px;font-weight:500;
    padding:5px 14px;border-radius:20px;cursor:pointer;
    background:transparent;border:1px solid var(--border);
    color:var(--muted);transition:all 0.15s;letter-spacing:0.06em;text-transform:uppercase;
  }
  .lens-btn:hover{border-color:rgba(255,255,255,0.12);color:var(--text);}
  .lens-btn.active-cto  {background:rgba(6,182,212,0.1); color:#06B6D4;border-color:rgba(6,182,212,0.3);}
  .lens-btn.active-chro {background:rgba(139,92,246,0.1);color:#8B5CF6;border-color:rgba(139,92,246,0.3);}
  .lens-btn.active-cfo  {background:rgba(16,185,129,0.1);color:#10B981;border-color:rgba(16,185,129,0.3);}

  .tag{
    display:inline-flex;align-items:center;gap:4px;
    padding:2px 9px;border-radius:20px;
    font-size:10px;font-weight:600;font-family:'DM Mono',monospace;letter-spacing:0.04em;
  }
  .t-gold   {background:rgba(232,160,32,0.12);  color:#E8A020;border:1px solid rgba(232,160,32,0.25);}
  .t-teal   {background:rgba(6,182,212,0.1);    color:#06B6D4;border:1px solid rgba(6,182,212,0.22);}
  .t-violet {background:rgba(139,92,246,0.1);   color:#8B5CF6;border:1px solid rgba(139,92,246,0.22);}
  .t-rose   {background:rgba(244,63,94,0.1);    color:#F43F5E;border:1px solid rgba(244,63,94,0.22);}
  .t-emerald{background:rgba(16,185,129,0.1);   color:#10B981;border:1px solid rgba(16,185,129,0.22);}
  .t-slate  {background:rgba(255,255,255,0.04); color:#6A7A8A;border:1px solid rgba(255,255,255,0.07);}

  .chip{
    display:inline-flex;align-items:center;gap:5px;
    padding:5px 11px;border-radius:7px;font-size:11px;font-weight:500;
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
    color:#6A7A8A;cursor:pointer;transition:all 0.15s;white-space:nowrap;
  }
  .chip:hover{background:rgba(232,160,32,0.08);border-color:var(--gold-border);color:#E8A020;}
  .chip.sel{background:rgba(232,160,32,0.12);border-color:var(--gold-border);color:#E8A020;}

  .logo-tag{
    display:inline-flex;align-items:center;gap:5px;
    padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;
    background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
    color:#5A6A7A;transition:all 0.15s;
  }
  .logo-tag.lit{background:rgba(232,160,32,0.08);border-color:rgba(232,160,32,0.2);color:#E8A020;}

  .detail-box{
    background:rgba(6,10,24,0.96);
    border:1px solid var(--gold-border);
    border-radius:12px;padding:20px 22px;
    animation:slideIn 0.2s ease;
  }
  @keyframes slideIn{from{opacity:0;transform:translateX(8px);}to{opacity:1;transform:translateX(0);}}

  .fade{animation:fadeUp 0.3s ease forwards;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

  .conn{width:2px;height:14px;margin:0 auto;}
  .conn-label{text-align:center;font-size:9px;font-family:'DM Mono',monospace;
    color:#2A3A4A;letter-spacing:0.08em;margin:1px 0;}

  .metric-row{display:flex;justify-content:space-between;align-items:center;
    padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
  .metric-row:last-child{border-bottom:none;}

  .progress{height:2px;background:rgba(255,255,255,0.06);border-radius:1px;overflow:hidden;margin-top:4px;}
  .progress-fill{height:100%;border-radius:1px;transition:width 0.8s ease;}

  .glow-gold{box-shadow:0 0 24px rgba(232,160,32,0.08),0 0 0 1px rgba(232,160,32,0.15);}
  .pulse-gold{animation:pulseG 3s ease infinite;}
  @keyframes pulseG{
    0%,100%{box-shadow:0 0 0 0 rgba(232,160,32,0);}
    50%{box-shadow:0 0 0 6px rgba(232,160,32,0);}
  }
`;
document.head.appendChild(css);

/* ── FRAMEWORK DEFINITION ─────────────────────────────────────────── */
const FRAMEWORK = [
  {
    id:"gateway",
    name:"Engagement Gateway",
    tagline:"Where work begins — any channel, any modality",
    tag:{cls:"t-teal",label:"Experience Layer"},
    accent:"#06B6D4", accentCls:"lc-teal",
    modes:["Voice","Chat","Data Query","Visual Input","Mobile","Web"],
    desc:"The Engagement Gateway is the employee-facing surface — a unified conversational interface that accepts requests in any format across any device. It abstracts the complexity of downstream systems entirely.",
    cto:{title:"Secure multimodal ingestion",body:"TLS-encrypted request pipeline with Azure Entra SSO gating every session. MFA-enforced, session-scoped tokens. No raw credential exposure at the surface layer.",kpis:[["Latency","<80ms p99"],["Auth overhead","12ms avg"],["Uptime SLA","99.99%"]]},
    chro:{title:"Zero-friction employee experience",body:"Employees don't navigate portals or fill forms. They describe what they need — in plain language — and the platform handles the rest. Benefits updates, PTO requests, lifecycle events: all from a single surface.",kpis:[["Adoption rate","87% DAU"],["Self-service deflection","94%"],["Avg task time","↓ 73%"]]},
    cfo:{title:"Channel consolidation ROI",body:"Replacing 4–6 departmental portals with a single engagement layer eliminates licensing, training, and support costs across the employee base.",kpis:[["Portal licenses retired","4–6 avg"],["Helpdesk deflection","$420/ticket saved"],["Productivity gain","1.8h/employee/wk"]]},
  },
  {
    id:"signal",
    name:"Signal Engine",
    tagline:"Understanding intent — not just keywords",
    tag:{cls:"t-gold",label:"AI Reasoning"},
    accent:"#E8A020", accentCls:"lc-gold",
    modes:["Intent Classification","Context Assembly","Priority Scoring","Routing Decision","Confidence Threshold","Fallback Logic"],
    desc:"The Signal Engine is the AI reasoning core — it interprets natural language, assembles enterprise context from connected systems, scores intent confidence, and makes routing decisions in under 300ms.",
    cto:{title:"Deterministic AI routing with fallback",body:"Confidence threshold gates determine when AI acts autonomously vs. escalates to human review. Full prompt/response logging. No hallucination risk for high-stakes transactions.",kpis:[["Intent accuracy","97.2%"],["Routing latency","<300ms"],["Fallback trigger rate","0.8%"]]},
    chro:{title:"Context-aware HR decisions",body:"The engine understands HR policy context — open enrollment windows, eligibility rules, org hierarchy — before routing. Employees never get routed to the wrong team or denied without explanation.",kpis:[["Policy mismatch rate","↓ 96%"],["Wrong-team routing","<0.3%"],["Employee satisfaction","4.8/5"]]},
    cfo:{title:"AI that pays for itself",body:"Autonomous intent resolution eliminates tier-1 triage labor. Each correctly routed request avoids a $15–40 manual classification cost at enterprise scale.",kpis:[["Annual triage savings","$2.1M (5k employees)"],["Auto-resolve rate","91%"],["Cost per resolution","↓ 68%"]]},
  },
  {
    id:"workstream",
    name:"WorkStream Orchestrator",
    tagline:"Execution across every domain — no human relay",
    tag:{cls:"t-violet",label:"Workflow Engine"},
    accent:"#8B5CF6", accentCls:"lc-violet",
    modes:["IT & Security","Human Resources","Finance & Procurement","CRM & Customer","Risk & Compliance","Application Delivery"],
    desc:"The WorkStream Orchestrator executes multi-step workflows across any enterprise domain — creating tickets, updating records, triggering approvals, and confirming completions — with no human relay in the loop.",
    cto:{title:"Multi-system workflow orchestration",body:"Stateful workflow execution with circuit breakers, retry logic, and compensation patterns. Failed steps trigger automatic re-routing rather than silent failure. Full state machine visibility.",kpis:[["Workflow completion rate","99.1%"],["Auto-retry success","94%"],["MTTR on failure","<3 min"]]},
    chro:{title:"HR lifecycle automation",body:"New hire provisioning, benefits elections, dependent changes, offboarding — all executed end-to-end without HR operations touching a keyboard. Approval chains preserved and audited.",kpis:[["Onboarding time","↓ 60%"],["HR ops manual tasks","↓ 78%"],["Benefits error rate","↓ 91%"]]},
    cfo:{title:"Straight-through processing at scale",body:"Automating approval chains and system updates eliminates the $80–120 cost of manual data re-keying per transaction. Particularly high ROI in Finance and Procurement workflows.",kpis:[["Manual re-keying eliminated","83%"],["PO cycle time","↓ 4.2 days avg"],["Approval SLA compliance","98.7%"]]},
  },
  {
    id:"trustcore",
    name:"TrustCore",
    tagline:"Governed AI — every decision auditable, every model accountable",
    tag:{cls:"t-rose",label:"Governance & Trust"},
    accent:"#F43F5E", accentCls:"lc-rose",
    modes:["Audit Trail","Policy Enforcement","Model Registry","Compliance Mapping","Risk Scoring","Access Control"],
    desc:"TrustCore is the governance fabric — it registers every AI model, enforces policy decisions in real time, maintains immutable audit logs, and maps every action to compliance frameworks. The antidote to black-box AI.",
    cto:{title:"Zero-trust AI governance",body:"Every model call logged with inputs, outputs, latency, and policy outcome. Prompt injection detection. Model drift alerting. RBAC enforced at the action level — not just the login.",kpis:[["Policy decision latency","<15ms"],["Audit log retention","90 days+"],["Threat blocks (30d)","23 avg"]]},
    chro:{title:"AI employees can trust",body:"TrustCore surfaces the reasoning behind every AI decision to the employee — no black box. Sensitive HR data masked in transit and at rest. Manager override paths clearly defined.",kpis:[["PII masking coverage","100%"],["AI decision explainability","Active"],["GDPR/HIPAA controls","Mapped"]]},
    cfo:{title:"Compliance you can prove",body:"Pre-built mappings to NIST AI RMF, EU AI Act, SOC 2, ISO 42001. Audit-ready reports generated on demand — no manual evidence collection. Avoids the $4.5M average cost of an AI compliance failure.",kpis:[["Frameworks mapped","NIST · EU AI Act · SOC 2"],["Audit report time","<5 min"],["Open risk issues","Tracked live"]]},
  },
  {
    id:"nexus",
    name:"Nexus Integration Plane",
    tagline:"Connect what you own — no rip and replace",
    tag:{cls:"t-emerald",label:"Integration Layer"},
    accent:"#10B981", accentCls:"lc-emerald",
    systems:[
      {label:"Azure / Entra",lit:true},{label:"ServiceNow",lit:true},{label:"Workday",lit:true},
      {label:"SAP",lit:false},{label:"Salesforce",lit:false},{label:"AWS",lit:false},
      {label:"Google Cloud",lit:false},{label:"Oracle",lit:false},{label:"Any REST/SOAP",lit:false},
    ],
    desc:"The Nexus Integration Plane normalizes data and actions across every enterprise system. Adapter-based architecture means new systems are added in days, not quarters. No vendor lock-in. Your existing investments become AI-native.",
    cto:{title:"Adapter-based, vendor-agnostic",body:"Source/Target adapter abstraction means each system is independently pluggable. Circuit breakers prevent cascade failures. Schema drift detection catches breaking changes before they propagate.",kpis:[["New connector time","3–5 days avg"],["Supported protocols","REST · SOAP · JDBC · GraphQL"],["Schema drift detection","Active"]]},
    chro:{title:"Preserves existing HR investments",body:"Workday, SAP SuccessFactors, Oracle HCM — TrustCore works in front of what you have. Employees get a modern experience without replacing the systems HR depends on.",kpis:[["HCM systems supported","Workday · SAP · Oracle"],["Data sync latency","<2s real-time"],["Legacy migration risk","None"]]},
    cfo:{title:"No rip-and-replace cost",body:"The Nexus plane adds AI capability on top of existing systems — protecting prior investments. Typical enterprise avoids $3–8M in ERP/HCM replacement cost.",kpis:[["ERP/HCM replacement risk","Eliminated"],["Integration cost vs. custom","↓ 65%"],["Time to first value","<8 weeks"]]},
  },
];

const LENS_META = {
  cto: {label:"CTO / IT",  color:"#06B6D4", cls:"active-cto",  icon:"⚙️"},
  chro:{label:"CHRO / HR", color:"#8B5CF6", cls:"active-chro", icon:"👤"},
  cfo: {label:"CFO",       color:"#10B981", cls:"active-cfo",  icon:"📊"},
};

/* ── DETAIL PANEL ─────────────────────────────────────────────────── */
function Detail({layer, lens, onClose}){
  if(!layer) return null;
  const lensData = layer[lens];
  const lm = LENS_META[lens];
  return(
    <div className="detail-box">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <span className={`tag ${layer.tag.cls}`}>{layer.tag.label}</span>
            <span className="tag t-slate">{lm.icon} {lm.label} view</span>
          </div>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,
            color:layer.accent,lineHeight:1.2}}>{layer.name}</h3>
          <p style={{fontSize:11,color:"var(--muted)",marginTop:3,fontStyle:"italic"}}>{layer.tagline}</p>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"var(--muted)",
          cursor:"pointer",fontSize:20,lineHeight:1,marginLeft:10}}>×</button>
      </div>

      <p style={{fontSize:12,color:"#8A9EB4",lineHeight:1.65,marginBottom:14,
        borderLeft:`2px solid ${layer.accent}44`,paddingLeft:10}}>{layer.desc}</p>

      <div style={{marginBottom:14,padding:"12px 14px",
        background:`${layer.accent}08`,border:`1px solid ${layer.accent}22`,borderRadius:8}}>
        <p style={{fontSize:11,fontWeight:700,color:lm.color,marginBottom:6,
          fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>{lensData.title}</p>
        <p style={{fontSize:12,color:"#7A8A9A",lineHeight:1.55}}>{lensData.body}</p>
      </div>

      <div>
        <p style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:"var(--muted)",
          letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Key Metrics</p>
        {lensData.kpis.map(([k,v])=>(
          <div key={k} className="metric-row">
            <span style={{fontSize:11,color:"#5A6A7A"}}>{k}</span>
            <span style={{fontSize:12,fontWeight:600,color:lm.color,fontFamily:"'DM Mono',monospace"}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── MAIN ─────────────────────────────────────────────────────────── */
export default function IopexFrontDoor(){
  const [active,setActive]=useState(null);
  const [lens,setLens]=useState("cto");
  const [selModes,setSelModes]=useState({});

  const toggle=(id)=>setActive(p=>p===id?null:id);
  const toggleMode=(layer,mode)=>setSelModes(p=>({...p,[layer]:{...p[layer],[mode]:!p[layer]?.[mode]}}));

  return(
    <div className="root" style={{minHeight:"100vh",overflowY:"auto"}}>
      <div className="noise"/>
      <div style={{position:"relative",zIndex:1,maxWidth:1140,margin:"0 auto",padding:"24px 20px 50px"}}>

        {/* ── HEADER ── */}
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
            flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:8,
                  background:"rgba(232,160,32,0.12)",border:"1px solid rgba(232,160,32,0.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⬡</div>
                <div>
                  <p style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--muted)",
                    letterSpacing:"0.12em",textTransform:"uppercase"}}>iOPEX Technologies</p>
                  <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,
                    color:"var(--bright)",letterSpacing:"-0.01em",lineHeight:1.1}}>
                    AI FrontDoor
                    <span style={{color:"var(--gold)",marginLeft:6,fontSize:22}}>Framework</span>
                  </h1>
                </div>
              </div>
              <p style={{fontSize:12,color:"var(--muted)",maxWidth:500,lineHeight:1.5}}>
                A proprietary five-layer architecture for enterprise AI workforce transformation.
                Click any layer · toggle the lens to see the C-suite value story.
              </p>
            </div>

            {/* Lens switcher */}
            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
              <p style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:"var(--muted)",
                letterSpacing:"0.1em",textTransform:"uppercase"}}>Buyer Lens</p>
              <div style={{display:"flex",gap:6}}>
                {Object.entries(LENS_META).map(([k,m])=>(
                  <button key={k} className={`lens-btn${lens===k?" "+m.cls:""}`}
                    onClick={()=>setLens(k)}>{m.icon} {m.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Lens headline */}
          <div className="fade" key={lens} style={{marginTop:14,padding:"10px 16px",
            background:`${LENS_META[lens].color}08`,border:`1px solid ${LENS_META[lens].color}22`,
            borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>{LENS_META[lens].icon}</span>
            <div>
              <p style={{fontSize:11,fontWeight:600,color:LENS_META[lens].color,marginBottom:1}}>
                {lens==="cto"?"Technical depth · security · integration architecture":
                 lens==="chro"?"Employee experience · HR lifecycle · workforce transformation":
                 "ROI modeling · cost elimination · time-to-value"}
              </p>
              <p style={{fontSize:11,color:"var(--muted)"}}>
                {lens==="cto"?"Showing: latency, auth patterns, API protocols, resilience metrics":
                 lens==="chro"?"Showing: adoption rates, HR automation coverage, employee satisfaction":
                 "Showing: cost savings, productivity gains, license consolidation ROI"}
              </p>
            </div>
          </div>
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16,alignItems:"start"}}>

          {/* Left: layers */}
          <div>
            {FRAMEWORK.map((layer,i)=>{
              const isActive=active===layer.id;
              return(
                <div key={layer.id}>
                  {i>0&&(
                    <div>
                      <div className="conn" style={{background:`linear-gradient(to bottom,${FRAMEWORK[i-1].accent}33,${layer.accent}33)`}}/>
                      <div className="conn-label">↓</div>
                      <div className="conn" style={{background:`linear-gradient(to bottom,${FRAMEWORK[i-1].accent}33,${layer.accent}33)`}}/>
                    </div>
                  )}

                  <div className={`layer-card ${layer.accentCls}${isActive?" active":""}`}
                    onClick={()=>toggle(layer.id)}
                    style={{padding:"16px 20px",marginBottom:0,
                      borderColor:isActive?`${layer.accent}44`:"var(--border)"}}>

                    {/* Layer header */}
                    <div style={{display:"flex",alignItems:"flex-start",
                      justifyContent:"space-between",marginBottom:10}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <span className={`tag ${layer.tag.cls}`}>{layer.tag.label}</span>
                          <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",
                            color:"var(--muted)",letterSpacing:"0.06em"}}>L{i+1}</span>
                        </div>
                        <h2 style={{fontFamily:"'Cormorant Garamond',serif",
                          fontSize:18,fontWeight:700,color:isActive?layer.accent:"var(--bright)",
                          transition:"color 0.2s",lineHeight:1.2}}>{layer.name}</h2>
                        <p style={{fontSize:11,color:"var(--muted)",marginTop:2,fontStyle:"italic"}}>
                          {layer.tagline}</p>
                      </div>
                      <div style={{fontSize:18,opacity:isActive?1:0.5,transition:"all 0.2s",
                        transform:isActive?"rotate(45deg)":"none"}}>+</div>
                    </div>

                    {/* Modes / chips */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {(layer.modes||layer.systems?.map(s=>s.label)||[]).map((m,mi)=>{
                        const isSystem=!!layer.systems;
                        const sysLit=isSystem&&layer.systems[mi]?.lit;
                        const isSel=selModes[layer.id]?.[m];
                        return(
                          <span key={m}
                            className={`${isSystem?"logo-tag":"chip"}${sysLit||isSel?" sel lit":""}`}
                            style={sysLit?{borderColor:`${layer.accent}33`,
                              background:`${layer.accent}0A`,color:layer.accent}:{}}
                            onClick={e=>{e.stopPropagation();if(!isSystem)toggleMode(layer.id,m);}}>
                            {m}
                          </span>
                        );
                      })}
                    </div>

                    {/* Expanded desc + lens KPI preview */}
                    {isActive&&(
                      <div className="fade" style={{marginTop:12,paddingTop:12,
                        borderTop:`1px solid ${layer.accent}22`}}>
                        <p style={{fontSize:12,color:"#7A8A9A",lineHeight:1.6,marginBottom:10}}>
                          {layer.desc}
                        </p>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                          {layer[lens].kpis.map(([k,v])=>(
                            <div key={k} style={{padding:"8px 10px",
                              background:`${layer.accent}08`,
                              border:`1px solid ${layer.accent}18`,borderRadius:7}}>
                              <p style={{fontSize:9,fontFamily:"'DM Mono',monospace",
                                color:"var(--muted)",letterSpacing:"0.06em",marginBottom:3}}>{k}</p>
                              <p style={{fontSize:12,fontWeight:700,color:LENS_META[lens].color,
                                fontFamily:"'DM Mono',monospace"}}>{v}</p>
                            </div>
                          ))}
                        </div>
                        <p style={{marginTop:8,fontSize:11,color:`${layer.accent}88`,
                          fontFamily:"'DM Mono',monospace"}}>
                          → Click right panel to explore full {LENS_META[lens].label} context
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Foundation bar */}
            <div style={{marginTop:6}}>
              <div className="conn" style={{background:"linear-gradient(to bottom,rgba(16,185,129,0.3),rgba(232,160,32,0.4))"}}/>
              <div className="conn-label">foundation</div>
              <div className="conn" style={{background:"linear-gradient(to bottom,rgba(16,185,129,0.3),rgba(232,160,32,0.4))"}}/>
            </div>
            <div className="glow-gold pulse-gold" style={{borderRadius:10,overflow:"hidden",
              border:"1px solid rgba(232,160,32,0.25)",
              background:"linear-gradient(135deg,rgba(232,160,32,0.08),rgba(232,160,32,0.04))",
              padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"var(--gold)"}}>
                  iOPEX AI FrontDoor Platform
                </p>
                <p style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                  Proprietary orchestration · governance · ITSM/HRSD execution · enterprise-grade SLAs
                </p>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <span className="tag t-gold">Original IP</span>
                <span className="tag t-emerald">© iOPEX</span>
              </div>
            </div>
          </div>

          {/* Right: detail + nav */}
          <div style={{position:"sticky",top:20,display:"flex",flexDirection:"column",gap:12}}>
            {active ? (
              <Detail layer={FRAMEWORK.find(l=>l.id===active)} lens={lens}
                onClose={()=>setActive(null)}/>
            ) : (
              <div style={{padding:"20px",background:"var(--surface)",
                border:"1px solid var(--border)",borderRadius:12,textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:10}}>⬡</div>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,
                  color:"var(--bright)",marginBottom:6}}>Explore any layer</p>
                <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.5,marginBottom:14}}>
                  Click a layer card to see the full value story — scoped to the active buyer lens.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {FRAMEWORK.map(l=>(
                    <button key={l.id} onClick={()=>setActive(l.id)}
                      style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",
                        borderRadius:7,padding:"8px 12px",cursor:"pointer",textAlign:"left",
                        color:l.accent,fontSize:12,fontFamily:"'Cormorant Garamond',serif",
                        fontWeight:700,transition:"all 0.15s",display:"flex",
                        alignItems:"center",justifyContent:"space-between"}}
                      onMouseEnter={e=>e.currentTarget.style.background=`${l.accent}0A`}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}>
                      <span>{l.name}</span>
                      <span className={`tag ${l.tag.cls}`} style={{fontSize:9}}>{l.tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* IP statement */}
            <div style={{padding:"12px 14px",background:"rgba(232,160,32,0.04)",
              border:"1px solid rgba(232,160,32,0.12)",borderRadius:10}}>
              <p style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--gold)",
                letterSpacing:"0.06em",marginBottom:6}}>ORIGINAL FRAMEWORK</p>
              <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>
                The iOPEX AI FrontDoor Framework is proprietary — all layer names, taxonomy,
                and metrics are original iOPEX IP. Architecturally informed by enterprise
                best practices, not derived from any vendor's platform.
              </p>
            </div>

            {/* Lens summary */}
            <div className="fade" key={lens} style={{padding:"12px 14px",
              background:`${LENS_META[lens].color}06`,
              border:`1px solid ${LENS_META[lens].color}18`,borderRadius:10}}>
              <p style={{fontSize:10,fontFamily:"'DM Mono',monospace",
                color:LENS_META[lens].color,letterSpacing:"0.06em",marginBottom:8}}>
                {LENS_META[lens].icon} {lens.toUpperCase()} SUMMARY
              </p>
              {lens==="cto"&&<>
                <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>
                  5-layer security-first architecture · Azure Entra SSO · zero-trust policy enforcement · 
                  adapter-based integrations · sub-300ms routing · 99.99% SLA.
                </p>
              </>}
              {lens==="chro"&&<>
                <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>
                  87% DAU adoption · 94% self-service deflection · HR ops manual tasks ↓78% · 
                  PII masked 100% · full audit trail for every employee action.
                </p>
              </>}
              {lens==="cfo"&&<>
                <p style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>
                  $2.1M annual triage savings (5k employees) · 4–6 portals consolidated · 
                  1.8h/week per employee reclaimed · &lt;8 weeks to first value.
                </p>
              </>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
