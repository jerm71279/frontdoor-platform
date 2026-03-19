import { useState, useEffect, useCallback } from "react";

const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:2px;}

  .frf-root{
    font-family:'Syne',sans-serif;
    background:#F4F6FA;color:#1A2230;
    min-height:100vh;overflow:hidden;position:relative;
  }
  .frf-root::before{
    content:'';position:fixed;inset:0;pointer-events:none;
    background:
      radial-gradient(ellipse 60% 40% at 80% 10%, rgba(16,185,129,0.04) 0%,transparent 55%),
      radial-gradient(ellipse 40% 30% at 10% 90%, rgba(239,68,68,0.03) 0%,transparent 50%);
  }

  .card{
    background:#FFFFFF;
    border:1px solid rgba(0,0,0,0.07);
    border-radius:10px;
    box-shadow:0 1px 4px rgba(0,0,0,0.05);
  }
  .card-dark{
    background:#1A2230;
    border:1px solid rgba(255,255,255,0.06);
    border-radius:10px;
  }

  .step-node{
    border-radius:8px;padding:10px 14px;
    transition:all 0.3s ease;position:relative;
    border:1.5px solid transparent;
  }
  .step-idle  {background:#F8FAFC;border-color:#E2E8F0;}
  .step-active{background:#EFF6FF;border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,0.1);}
  .step-pass  {background:#F0FDF4;border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,0.08);}
  .step-fail  {background:#FEF2F2;border-color:#EF4444;box-shadow:0 0 0 3px rgba(239,68,68,0.08);}
  .step-warn  {background:#FFFBEB;border-color:#F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,0.08);}
  .step-skip  {background:#F8FAFC;border-color:#E2E8F0;opacity:0.4;}

  .mono{font-family:'DM Mono',monospace;}

  .badge2{
    display:inline-flex;align-items:center;gap:4px;
    padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;
    font-family:'DM Mono',monospace;
  }
  .b-blue  {background:rgba(59,130,246,0.1); color:#2563EB;border:1px solid rgba(59,130,246,0.2);}
  .b-green {background:rgba(16,185,129,0.1); color:#059669;border:1px solid rgba(16,185,129,0.2);}
  .b-red   {background:rgba(239,68,68,0.1);  color:#DC2626;border:1px solid rgba(239,68,68,0.2);}
  .b-amber {background:rgba(245,158,11,0.1); color:#D97706;border:1px solid rgba(245,158,11,0.2);}
  .b-gray  {background:rgba(0,0,0,0.04);     color:#6B7280;border:1px solid rgba(0,0,0,0.07);}
  .b-purple{background:rgba(139,92,246,0.1); color:#7C3AED;border:1px solid rgba(139,92,246,0.2);}

  .connector{
    width:2px;height:20px;margin:0 auto;
    transition:background 0.3s ease;
  }

  .audit-row{
    padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.04);
    transition:background 0.12s;
  }
  .audit-row:hover{background:#F8FAFC;}

  .progress-track{height:4px;background:#E2E8F0;border-radius:2px;overflow:hidden;}
  .progress-fill2{height:100%;border-radius:2px;transition:width 0.8s ease;}

  .fade-in2{animation:fi2 0.4s ease forwards;}
  @keyframes fi2{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

  .pulse2{animation:p2 2s ease infinite;}
  @keyframes p2{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.3);}50%{box-shadow:0 0 0 8px rgba(59,130,246,0);}}

  .spin{animation:spin 1.2s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}

  .error-shake{animation:shake 0.5s ease;}
  @keyframes shake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-4px);}40%,80%{transform:translateX(4px);}}

  .success-pop{animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1);}
  @keyframes pop{from{transform:scale(0.8);opacity:0;}to{transform:scale(1);opacity:1;}}
`;
document.head.appendChild(style);

/* ── FLOW DEFINITION ─────────────────────────────────────────────── */
const STEPS = [
  {
    id:"auth", label:"Azure Entra SSO", sys:"Azure", icon:"🔐",
    happy:{state:"pass", msg:"Identity verified · Sarah Kim · HR Manager", ms:600},
    recovery:{state:"pass", msg:"Re-authenticated for override approval", ms:400},
  },
  {
    id:"intent", label:"AI Intent Router", sys:"AI Engine", icon:"🧠",
    happy:{state:"pass", msg:"Intent: add dependent · Workday Benefits · Confidence 96%", ms:800},
    recovery:{state:"pass", msg:"Intent: manager exception approval · HRSD Case HR0019823", ms:600},
  },
  {
    id:"workday_read", label:"Workday HCM — Data Read", sys:"Workday", icon:"📋",
    happy:{state:"pass", msg:"Employee record loaded · Plan: BCBS Gold · Enrollment: Open", ms:700},
    recovery:{state:"pass", msg:"Employee record confirmed · Exception flag noted", ms:500},
  },
  {
    id:"workday_write", label:"Workday Benefits — Write", sys:"Workday", icon:"📝",
    happy:{state:"fail",
      msg:"WD-4422: Dependent age validation failed · DOB 2026-02-14 · Must be <26y from plan effective date (2026-04-01) · Rule: BEN-AGE-LIMIT-COBRA",
      ms:1200, error:true},
    recovery:{state:"pass", msg:"Override token applied · Exception REX-0041 accepted · Dependent added", ms:900},
  },
  {
    id:"sn_case", label:"ServiceNow HRSD — Case", sys:"ServiceNow", icon:"🎫",
    happy:{state:"skip", msg:""},
    recovery:{state:"pass", msg:"Case HR0019823 created · Type: Benefits Exception · Routed to S.Kim (manager)", ms:700},
  },
  {
    id:"approval", label:"Manager Approval", sys:"Teams", icon:"✅",
    happy:{state:"skip", msg:""},
    recovery:{state:"pass", msg:"S.Kim approved via Teams · Justification: Newborn DOB < 30d · Override granted", ms:1400},
  },
  {
    id:"audit", label:"Audit Trail & Notify", sys:"Splunk + Email", icon:"📊",
    happy:{state:"skip", msg:""},
    recovery:{state:"pass", msg:"Full recovery path logged · Compliance team notified · Coverage active Apr 1", ms:600},
  },
];

const HAPPY_STEPS = STEPS.filter(s=>s.happy.state!=="skip").map(s=>s.id);
const RECOVERY_STEPS = STEPS.map(s=>s.id);

/* ── STATE ICON ────────────────────────────────────────────────────── */
function StateIcon({state}){
  if(state==="active") return <div className="spin" style={{width:14,height:14,border:"2px solid #3B82F6",borderTopColor:"transparent",borderRadius:"50%"}}/>
  if(state==="pass")   return <span style={{color:"#10B981",fontSize:14}}>✓</span>
  if(state==="fail")   return <span style={{color:"#EF4444",fontSize:14}}>✗</span>
  if(state==="warn")   return <span style={{color:"#F59E0B",fontSize:14}}>⚠</span>
  if(state==="skip")   return <span style={{color:"#CBD5E1",fontSize:12}}>○</span>
  return <span style={{color:"#CBD5E1",fontSize:12}}>○</span>
}

/* ── MAIN ─────────────────────────────────────────────────────────── */
export default function FailureRecovery(){
  const [mode, setMode]         = useState("idle"); // idle | happy | recovery | done-happy | done-recovery
  const [stepStates, setStepStates] = useState({});
  const [stepMessages, setStepMessages] = useState({});
  const [auditLog, setAuditLog] = useState([]);
  const [activeStep, setActiveStep] = useState(null);
  const [showError, setShowError] = useState(false);

  const reset = ()=>{
    setMode("idle"); setStepStates({}); setStepMessages({});
    setAuditLog([]); setActiveStep(null); setShowError(false);
  };

  const addAudit = (entry) => setAuditLog(prev=>[entry,...prev].slice(0,20));

  const runFlow = useCallback((flowType)=>{
    reset();
    const steps = flowType==="happy" ? STEPS.filter(s=>s.happy.state!=="skip") : STEPS;
    setMode(flowType);
    let elapsed = 0;

    steps.forEach((step, i)=>{
      const cfg = flowType==="happy" ? step.happy : step.recovery;
      if(cfg.state==="skip") return;

      const activateAt = elapsed;
      const completeAt = elapsed + cfg.ms;
      elapsed = completeAt + 200;

      setTimeout(()=>{
        setActiveStep(step.id);
        setStepStates(prev=>({...prev,[step.id]:"active"}));
      }, activateAt);

      setTimeout(()=>{
        setStepStates(prev=>({...prev,[step.id]:cfg.state}));
        setStepMessages(prev=>({...prev,[step.id]:cfg.msg}));
        setActiveStep(null);
        if(cfg.error) setShowError(true);
        addAudit({
          ts: new Date().toLocaleTimeString("en-US",{hour12:false}),
          step: step.label, sys: step.sys, state: cfg.state, msg: cfg.msg
        });
      }, completeAt);
    });

    setTimeout(()=>{
      setMode(flowType==="happy"?"done-happy":"done-recovery");
    }, elapsed + 200);
  },[]);

  const getNodeClass = (stepId)=>{
    const s = stepStates[stepId];
    if(!s || s==="skip") return "step-node step-idle";
    if(s==="active") return "step-node step-active";
    if(s==="pass")   return "step-node step-pass";
    if(s==="fail")   return "step-node step-fail";
    return "step-node step-warn";
  };

  const visibleSteps = (mode==="happy"||mode==="done-happy")
    ? STEPS.filter(s=>s.happy.state!=="skip")
    : STEPS;

  const progress = visibleSteps.length===0 ? 0 :
    Object.values(stepStates).filter(s=>s==="pass"||s==="fail").length / visibleSteps.length * 100;

  return(
    <div className="frf-root" style={{minHeight:"100vh",overflowY:"auto"}}>
      <div style={{position:"relative",zIndex:1,maxWidth:1100,margin:"0 auto",padding:"20px 20px 40px"}}>

        {/* ── HEADER ── */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <h1 style={{fontSize:20,fontWeight:800,color:"#1A2230",letterSpacing:"-0.01em"}}>
                Failure Recovery Demo
              </h1>
              <p style={{fontSize:13,color:"#6B7280",marginTop:2}}>
                Enterprise resilience — Workday rejection → AI re-routing → Manager approval → Recovery
              </p>
            </div>
            <div style={{display:"flex",gap:8}}>
              {(mode==="happy"||mode==="recovery"||mode.startsWith("done"))&&(
                <button onClick={reset} style={{background:"transparent",border:"1px solid #E2E8F0",
                  borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:600,color:"#6B7280",cursor:"pointer"}}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── SCENARIO SELECTOR ── */}
        {mode==="idle"&&(
          <div className="fade-in2">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              <div className="card" style={{padding:"24px",cursor:"pointer",border:"1.5px solid #10B981"}}
                onClick={()=>runFlow("happy")}>
                <div style={{fontSize:28,marginBottom:12}}>✅</div>
                <p style={{fontSize:15,fontWeight:700,marginBottom:6}}>Happy Path</p>
                <p style={{fontSize:12,color:"#6B7280",lineHeight:1.5}}>
                  Standard flow — employee adds dependent, Workday validates successfully, coverage activated.
                  No errors, no escalations.
                </p>
                <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                  <span className="badge2 b-blue">Azure Entra</span>
                  <span className="badge2 b-amber">Workday</span>
                  <span className="badge2 b-gray">~4 steps</span>
                </div>
              </div>
              <div className="card" style={{padding:"24px",cursor:"pointer",border:"1.5px solid #EF4444",
                boxShadow:"0 0 0 3px rgba(239,68,68,0.06)"}} onClick={()=>runFlow("recovery")}>
                <div style={{fontSize:28,marginBottom:12}}>🔄</div>
                <p style={{fontSize:15,fontWeight:700,marginBottom:6}}>Failure + Recovery Path</p>
                <p style={{fontSize:12,color:"#6B7280",lineHeight:1.5}}>
                  Workday rejects on a business rule (WD-4422). AI automatically re-routes to ServiceNow HRSD,
                  triggers manager approval, retries with exception override.
                </p>
                <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                  <span className="badge2 b-red">WD-4422 Error</span>
                  <span className="badge2 b-purple">HRSD Case</span>
                  <span className="badge2 b-amber">Mgr Approval</span>
                  <span className="badge2 b-green">Recovery</span>
                </div>
              </div>
            </div>
            <div className="card-dark" style={{padding:"16px 20px"}}>
              <p style={{fontSize:11,fontFamily:"DM Mono",color:"#4A5A6A",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>
                SWOT Weakness Addressed
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {icon:"🔒",title:"Not a black box",desc:"Every AI decision is logged with reasoning, policy citation, and outcome"},
                  {icon:"⚡",title:"Resilient by design",desc:"Business rule failures trigger automated re-routing — no human triage required"},
                  {icon:"📋",title:"Full audit trail",desc:"Compliance teams see the complete recovery path — not just the final result"},
                  {icon:"🛡️",title:"Governance enforced",desc:"Exception overrides require manager approval — AI cannot self-authorize escalation"},
                ].map(w=>(
                  <div key={w.title} style={{padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:7,border:"1px solid rgba(255,255,255,0.06)"}}>
                    <p style={{fontSize:18,marginBottom:5}}>{w.icon}</p>
                    <p style={{fontSize:12,fontWeight:700,color:"#C8D4E8",marginBottom:3}}>{w.title}</p>
                    <p style={{fontSize:11,color:"#4A5A6A",lineHeight:1.4}}>{w.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FLOW VIEW ── */}
        {mode!=="idle"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
            {/* Left: step-by-step flow */}
            <div>
              {/* Progress bar */}
              <div className="card" style={{padding:"12px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#1A2230"}}>
                    {mode==="happy"||mode==="done-happy" ? "✅ Standard Flow" : "🔄 Recovery Flow"}
                  </span>
                  <span style={{fontSize:11,color:"#6B7280",fontFamily:"DM Mono"}}>
                    {Math.round(progress)}% complete
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill2" style={{
                    width:`${progress}%`,
                    background: showError && mode==="recovery"
                      ? "linear-gradient(90deg,#EF4444,#F59E0B,#10B981)"
                      : mode.startsWith("done-happy")
                        ? "#10B981"
                        : "linear-gradient(90deg,#3B82F6,#10B981)",
                  }}/>
                </div>
              </div>

              {/* Steps */}
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {visibleSteps.map((step,i)=>{
                  const cfg = (mode==="happy"||mode==="done-happy") ? step.happy : step.recovery;
                  const state = stepStates[step.id] || "idle";
                  const msg   = stepMessages[step.id] || "";
                  const isActive = activeStep===step.id;
                  const isSkipped = cfg.state==="skip";

                  return(
                    <div key={step.id}>
                      {i>0&&(
                        <div className="connector" style={{
                          background: state==="pass" ? "#10B981"
                            : state==="fail" ? "#EF4444"
                            : state==="active" ? "#3B82F6"
                            : "#E2E8F0"
                        }}/>
                      )}
                      <div className={`${getNodeClass(step.id)}${state==="fail"?" error-shake":""}${state==="pass"&&i===visibleSteps.length-1?" success-pop":""}`}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                          <span style={{fontSize:18,lineHeight:1.3,flexShrink:0}}>{step.icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                              <span style={{fontSize:13,fontWeight:600,color:"#1A2230"}}>{step.label}</span>
                              <span className={`badge2 b-${step.sys==="Azure"?"blue":step.sys==="Workday"?"amber":step.sys==="AI Engine"?"purple":step.sys==="ServiceNow"?"green":"gray"}`}>
                                {step.sys}
                              </span>
                            </div>
                            {isActive&&(
                              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                                <div className="spin" style={{width:10,height:10,border:"1.5px solid #3B82F6",borderTopColor:"transparent",borderRadius:"50%"}}/>
                                <span style={{fontSize:11,color:"#3B82F6",fontFamily:"DM Mono"}}>Processing…</span>
                              </div>
                            )}
                            {msg&&!isActive&&(
                              <p style={{fontSize:11,color:state==="fail"?"#DC2626":state==="pass"?"#059669":"#6B7280",
                                lineHeight:1.4,fontFamily:"DM Mono",marginTop:2}}>
                                {msg}
                              </p>
                            )}
                          </div>
                          <div style={{flexShrink:0,marginTop:2}}><StateIcon state={isActive?"active":state}/></div>
                        </div>

                        {/* Error detail block */}
                        {state==="fail"&&msg&&(
                          <div style={{marginTop:10,padding:"10px 12px",background:"rgba(239,68,68,0.06)",
                            border:"1px solid rgba(239,68,68,0.2)",borderRadius:6}}>
                            <p style={{fontSize:11,fontWeight:700,color:"#DC2626",marginBottom:4}}>
                              ⚠ Workday Business Rule Violation
                            </p>
                            <p style={{fontSize:11,color:"#6B7280",lineHeight:1.5,fontFamily:"DM Mono"}}>{msg}</p>
                            <div style={{marginTop:8,display:"flex",gap:6}}>
                              <span className="badge2 b-red">WD-4422</span>
                              <span className="badge2 b-amber">Auto-routing to HRSD</span>
                            </div>
                          </div>
                        )}

                        {/* Success override badge */}
                        {step.id==="workday_write"&&state==="pass"&&mode!=="happy"&&mode!=="done-happy"&&(
                          <div style={{marginTop:8,padding:"8px 10px",background:"rgba(16,185,129,0.06)",
                            border:"1px solid rgba(16,185,129,0.15)",borderRadius:6}}>
                            <p style={{fontSize:11,color:"#059669",fontFamily:"DM Mono"}}>
                              🔁 Retry #{1} with exception override · REX-0041
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Done banner */}
              {mode==="done-recovery"&&(
                <div className="fade-in2" style={{marginTop:16,padding:"16px 18px",
                  background:"rgba(16,185,129,0.05)",border:"1.5px solid #10B981",borderRadius:10}}>
                  <p style={{fontSize:14,fontWeight:800,color:"#059669",marginBottom:4}}>
                    ✅ Full recovery completed — end-to-end
                  </p>
                  <p style={{fontSize:12,color:"#6B7280",lineHeight:1.5}}>
                    Workday rejection detected → AI re-routed → HRSD case raised → Manager approved →
                    Exception granted → Retry succeeded → Coverage active · <strong>Zero manual triage required</strong>
                  </p>
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    <span className="badge2 b-red">1 rejection</span>
                    <span className="badge2 b-amber">1 escalation</span>
                    <span className="badge2 b-green">1 retry</span>
                    <span className="badge2 b-purple">Full audit trail</span>
                  </div>
                </div>
              )}

              {mode==="done-happy"&&(
                <div className="fade-in2" style={{marginTop:16,padding:"14px 18px",
                  background:"rgba(16,185,129,0.05)",border:"1.5px solid #10B981",borderRadius:10}}>
                  <p style={{fontSize:13,fontWeight:700,color:"#059669",marginBottom:2}}>
                    ✅ Happy path completed — 4 steps · no exceptions required
                  </p>
                  <p style={{fontSize:11,color:"#6B7280"}}>Try the <strong>Recovery Path</strong> to see how failure is handled.</p>
                </div>
              )}
            </div>

            {/* Right: audit trail */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card" style={{padding:"14px 16px"}}>
                <p style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",
                  letterSpacing:"0.08em",fontFamily:"DM Mono",marginBottom:10}}>
                  Live Audit Trail
                </p>
                {auditLog.length===0&&(
                  <p style={{fontSize:11,color:"#CBD5E1",fontFamily:"DM Mono"}}>Awaiting events…</p>
                )}
                <div style={{maxHeight:320,overflowY:"auto"}}>
                  {auditLog.map((a,i)=>(
                    <div key={i} className={`audit-row fade-in2`} style={{padding:"8px 8px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <span style={{fontSize:10,color:"#9CA3AF",fontFamily:"DM Mono"}}>{a.ts}</span>
                        <span className={`badge2 b-${a.state==="pass"?"green":a.state==="fail"?"red":"amber"}`}
                          style={{fontSize:9}}>
                          {a.state.toUpperCase()}
                        </span>
                        <span className={`badge2 b-${a.sys==="Azure"?"blue":a.sys==="Workday"?"amber":a.sys==="AI Engine"?"purple":"green"}`}
                          style={{fontSize:9}}>
                          {a.sys}
                        </span>
                      </div>
                      <p style={{fontSize:11,color:"#374151",lineHeight:1.3,fontFamily:"DM Mono"}}>{a.step}</p>
                      {a.state==="fail"&&(
                        <p style={{fontSize:10,color:"#DC2626",fontFamily:"DM Mono",marginTop:2,lineHeight:1.3}}>
                          {a.msg.slice(0,80)}…
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery stats */}
              {(mode==="recovery"||mode==="done-recovery")&&(
                <div className="card" style={{padding:"14px 16px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",
                    letterSpacing:"0.08em",fontFamily:"DM Mono",marginBottom:10}}>
                    Recovery Metrics
                  </p>
                  {[
                    {label:"Error detected",val:"< 1s",color:"#6B7280"},
                    {label:"Re-route latency",val:"~700ms",color:"#6B7280"},
                    {label:"HRSD case created",val:"Auto",color:"#059669"},
                    {label:"Approval time",val:"~90s",color:"#D97706"},
                    {label:"Total recovery",val:"~3 min",color:"#2563EB"},
                    {label:"Manual steps",val:"0",color:"#059669"},
                  ].map(m=>(
                    <div key={m.label} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:7}}>
                      <span style={{fontSize:12,color:"#6B7280"}}>{m.label}</span>
                      <span style={{fontSize:12,fontWeight:700,color:m.color,fontFamily:"DM Mono"}}>{m.val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Compliance note */}
              <div className="card-dark" style={{padding:"14px 16px"}}>
                <p style={{fontSize:11,fontWeight:700,color:"#4A5A6A",textTransform:"uppercase",
                  letterSpacing:"0.08em",fontFamily:"DM Mono",marginBottom:8}}>
                  Compliance Coverage
                </p>
                {[
                  "Full rejection reason logged · Policy BEN-AGE-LIMIT-COBRA cited",
                  "AI re-routing decision recorded with timestamp",
                  "Manager approval with justification stored",
                  "Exception token REX-0041 tied to audit record",
                  "GDPR: no PII exposed during error handling",
                ].map((c,i)=>(
                  <div key={i} style={{display:"flex",gap:7,marginBottom:6,alignItems:"flex-start"}}>
                    <span style={{color:"#10B981",fontSize:11,flexShrink:0}}>✓</span>
                    <span style={{fontSize:11,color:"#4A5A6A",lineHeight:1.4,fontFamily:"DM Mono"}}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
