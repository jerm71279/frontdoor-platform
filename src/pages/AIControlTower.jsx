import { useState, useEffect, useRef } from "react";
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

/* ── INJECT FONTS & CSS ───────────────────────────────────────────── */
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:3px;height:3px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#F59E0B44;border-radius:2px;}

  .act-root{
    font-family:'IBM Plex Sans',monospace;
    background:#060A14;color:#C8D4E8;
    min-height:100vh;overflow:hidden;position:relative;
  }
  .act-root::before{
    content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
    background:
      radial-gradient(ellipse 60% 40% at 10% 10%, rgba(245,158,11,0.05) 0%,transparent 60%),
      radial-gradient(ellipse 50% 35% at 90% 90%, rgba(6,182,212,0.04) 0%,transparent 55%);
  }
  .scanlines{
    position:fixed;inset:0;pointer-events:none;z-index:1;
    background:repeating-linear-gradient(
      0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px
    );
  }
  .mono{font-family:'IBM Plex Mono',monospace;}

  .panel{
    background:rgba(255,255,255,0.025);
    border:1px solid rgba(245,158,11,0.12);
    border-radius:4px;
  }
  .panel-amber{border-color:rgba(245,158,11,0.25);}
  .panel-teal {border-color:rgba(6,182,212,0.2);}
  .panel-red  {border-color:rgba(239,68,68,0.25);}
  .panel-green{border-color:rgba(16,185,129,0.2);}

  .tab-btn{
    font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;
    padding:5px 14px;border-radius:2px;cursor:pointer;
    background:transparent;border:1px solid transparent;
    color:#5A6A7A;transition:all 0.15s;letter-spacing:0.06em;text-transform:uppercase;
  }
  .tab-btn:hover{color:#C8D4E8;border-color:rgba(245,158,11,0.2);}
  .tab-btn.active{color:#F59E0B;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.06);}

  .risk-high  {color:#EF4444;}
  .risk-med   {color:#F59E0B;}
  .risk-low   {color:#10B981;}
  .risk-info  {color:#06B6D4;}

  .badge{
    display:inline-flex;align-items:center;gap:4px;
    padding:2px 8px;border-radius:2px;font-size:10px;
    font-family:'IBM Plex Mono',monospace;font-weight:500;letter-spacing:0.04em;
  }
  .badge-amber{background:rgba(245,158,11,0.12);color:#F59E0B;border:1px solid rgba(245,158,11,0.25);}
  .badge-green{background:rgba(16,185,129,0.1); color:#10B981;border:1px solid rgba(16,185,129,0.2);}
  .badge-red  {background:rgba(239,68,68,0.1);  color:#EF4444;border:1px solid rgba(239,68,68,0.2);}
  .badge-teal {background:rgba(6,182,212,0.1);  color:#06B6D4;border:1px solid rgba(6,182,212,0.2);}
  .badge-gray {background:rgba(255,255,255,0.05);color:#5A6A7A;border:1px solid rgba(255,255,255,0.08);}

  .blink{animation:blink 1.4s step-start infinite;}
  @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}

  .fade-in{animation:fadeUp 0.3s ease forwards;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

  .ticker{animation:ticker 0.4s ease;}
  @keyframes ticker{from{color:#F59E0B;}to{color:inherit;}}

  .row-hover{transition:background 0.12s;}
  .row-hover:hover{background:rgba(245,158,11,0.04);}

  .compliance-ring{transform:rotate(-90deg);}
  .ring-track{stroke:rgba(255,255,255,0.06);}

  .pulse-dot{
    width:7px;height:7px;border-radius:50%;display:inline-block;
  }
  .pulse-green{background:#10B981;box-shadow:0 0 6px rgba(16,185,129,0.7);}
  .pulse-amber{background:#F59E0B;box-shadow:0 0 6px rgba(245,158,11,0.7);}
  .pulse-red  {background:#EF4444;box-shadow:0 0 6px rgba(239,68,68,0.7);}
  .pulse-teal {background:#06B6D4;box-shadow:0 0 6px rgba(6,182,212,0.7);}

  .divline{border:none;border-top:1px solid rgba(245,158,11,0.1);margin:10px 0;}
`;
document.head.appendChild(style);

/* ── DATA ─────────────────────────────────────────────────────────── */
const genSparkline = (n=20, base=60, variance=30) =>
  Array.from({length:n},(_,i)=>({t:i,v:Math.max(0,base+Math.sin(i/3)*variance+(Math.random()-0.5)*20)}));

const AUDIT_LOGS = [
  {id:"EVT-9912",ts:"14:23:07",user:"J.Smith",sys:"Azure Entra",action:"SSO auth success",risk:"LOW",model:"N/A",policy:"PASS",detail:"MFA verified · Role: Security Engineer"},
  {id:"EVT-9911",ts:"14:23:06",user:"J.Smith",sys:"AI Engine",action:"Intent classification",risk:"LOW",model:"claude-sonnet-4-6",policy:"PASS",detail:"Confidence 97% · Token use: 412"},
  {id:"EVT-9910",ts:"14:23:05",user:"J.Smith",sys:"ServiceNow",action:"CMDB asset lookup",risk:"LOW",model:"N/A",policy:"PASS",detail:"ThinkPad X1 #SN-7741 · Read-only"},
  {id:"EVT-9909",ts:"14:22:58",user:"A.Kumar",sys:"Workday",action:"Benefits data read",risk:"MED",model:"claude-sonnet-4-6",policy:"PASS",detail:"PII accessed · Masked in response"},
  {id:"EVT-9908",ts:"14:22:51",user:"T.Ramos",sys:"Azure IAM",action:"PIM activation request",risk:"HIGH",model:"N/A",policy:"REVIEW",detail:"Salesforce Prod · Awaiting approval"},
  {id:"EVT-9907",ts:"14:22:44",user:"M.Singh",sys:"AI Engine",action:"Prompt injection detected",risk:"HIGH",model:"claude-sonnet-4-6",policy:"BLOCK",detail:"Pattern: SQL injection attempt · Blocked"},
  {id:"EVT-9906",ts:"14:22:37",user:"D.Okonkwo",sys:"ServiceNow",action:"Change ticket create",risk:"LOW",model:"N/A",policy:"PASS",detail:"REQ0088241 · Auto-approved"},
  {id:"EVT-9905",ts:"14:22:30",user:"L.Chen",sys:"Workday",action:"Payroll query DENIED",risk:"HIGH",model:"claude-sonnet-4-6",policy:"BLOCK",detail:"Insufficient clearance · Policy: HR-PAY-03"},
  {id:"EVT-9904",ts:"14:22:22",user:"J.Smith",sys:"Azure Entra",action:"Session refresh",risk:"LOW",model:"N/A",policy:"PASS",detail:"Token renewed · TTL: 3600s"},
  {id:"EVT-9903",ts:"14:22:15",user:"R.Torres",sys:"AI Engine",action:"Model drift alert",risk:"MED",model:"claude-haiku-4-5",policy:"WARN",detail:"Accuracy drop 4.2% · Threshold: 3%"},
];

const POLICY_DECISIONS = [
  {id:"POL-441",ts:"14:23:07",rule:"RBAC-ENFORCE-01",action:"ALLOW",user:"J.Smith",resource:"ServiceNow CMDB",reason:"Role 'Security Eng' has read access",latency:"8ms"},
  {id:"POL-440",ts:"14:22:58",rule:"PII-MASK-03",action:"REDACT",user:"A.Kumar",resource:"Workday Benefits API",reason:"PII fields masked per GDPR policy",latency:"12ms"},
  {id:"POL-439",ts:"14:22:51",rule:"PIM-JIT-02",action:"ESCALATE",user:"T.Ramos",resource:"Salesforce Prod",reason:"Privilege exceeds auto-approve threshold",latency:"3ms"},
  {id:"POL-438",ts:"14:22:44",rule:"THREAT-DETECT-07",action:"BLOCK",user:"M.Singh",resource:"AI Engine",reason:"Injection pattern matched signature TH-0091",latency:"2ms"},
  {id:"POL-437",ts:"14:22:37",rule:"CHANGE-MGMT-01",action:"ALLOW",user:"D.Okonkwo",resource:"ServiceNow",reason:"Change within auto-approve scope",latency:"5ms"},
  {id:"POL-436",ts:"14:22:30",rule:"DATA-CLASS-HR-PAY-03",action:"BLOCK",user:"L.Chen",resource:"Workday Payroll",reason:"User lacks HR-Finance entitlement",latency:"4ms"},
];

const MODELS = [
  {name:"claude-sonnet-4-6",provider:"Anthropic",role:"Primary reasoning",requests:1842,accuracy:96.4,latency:"220ms",cost:"$0.014",drift:1.2,status:"HEALTHY"},
  {name:"claude-haiku-4-5",provider:"Anthropic",role:"Fast classification",requests:4129,accuracy:92.1,latency:"48ms",cost:"$0.002",drift:4.2,status:"WARN"},
  {name:"gpt-4o",provider:"Azure OpenAI",role:"Fallback / redundancy",requests:203,accuracy:94.8,latency:"310ms",cost:"$0.021",drift:0.8,status:"HEALTHY"},
  {name:"text-embedding-3",provider:"Azure OpenAI",role:"Semantic search",requests:9841,accuracy:99.1,latency:"22ms",cost:"$0.0001",drift:0.1,status:"HEALTHY"},
];

const COMPLIANCE = [
  {framework:"NIST AI RMF",score:89,controls:42,open:5,critical:1,color:"#06B6D4"},
  {framework:"EU AI Act",score:76,controls:38,open:9,critical:2,color:"#F59E0B"},
  {framework:"ISO/IEC 42001",score:93,controls:55,open:4,critical:0,color:"#10B981"},
  {framework:"SOC 2 Type II",score:98,controls:61,open:1,critical:0,color:"#A78BFA"},
];

/* ── COMPLIANCE RING ──────────────────────────────────────────────── */
function Ring({score,color,size=64}){
  const r=24,circ=2*Math.PI*r;
  const fill=circ*(1-score/100);
  return(
    <svg width={size} height={size} viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={r} fill="none" strokeWidth="5" stroke="rgba(255,255,255,0.06)"/>
      <circle cx="30" cy="30" r={r} fill="none" strokeWidth="5" stroke={color}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1s ease"}}/>
      <text x="30" y="34" textAnchor="middle" fill={color}
        fontSize="12" fontWeight="600" fontFamily="IBM Plex Mono,monospace">{score}%</text>
    </svg>
  );
}

/* ── LIVE TICKER ──────────────────────────────────────────────────── */
function useTicker(init,interval=3000){
  const [val,setVal]=useState(init);
  useEffect(()=>{
    const t=setInterval(()=>setVal(v=>v+Math.floor(Math.random()*3)),interval);
    return()=>clearInterval(t);
  },[interval]);
  return val;
}

/* ── MAIN ─────────────────────────────────────────────────────────── */
export default function AIControlTower(){
  const [tab,setTab]=useState("overview");
  const [logFilter,setLogFilter]=useState("ALL");
  const [clock,setClock]=useState(new Date());
  const totalReq=useTicker(47823);
  const blocked=useTicker(23);
  const policies=useTicker(1204);
  const [sparkData]=useState(()=>genSparkline(30,80,25));
  const [volData]=useState(()=>genSparkline(24,200,80));
  const [logs,setLogs]=useState(AUDIT_LOGS);

  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t);},[]);

  const TABS=["overview","audit","policy","models","compliance"];
  const filteredLogs=logFilter==="ALL"?logs:logs.filter(l=>l.risk===logFilter||l.policy===logFilter);

  return(
    <div className="act-root" style={{minHeight:"100vh",overflowY:"auto"}}>
      <div className="scanlines"/>
      <div style={{position:"relative",zIndex:2,maxWidth:1200,margin:"0 auto",padding:"16px 16px 40px"}}>

        {/* ── TOPBAR ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,
          borderBottom:"1px solid rgba(245,158,11,0.12)",paddingBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:28,background:"#F59E0B",borderRadius:2}}/>
              <div>
                <p style={{fontSize:14,fontWeight:700,color:"#F59E0B",fontFamily:"IBM Plex Mono",letterSpacing:"0.06em"}}>
                  AI CONTROL TOWER
                </p>
                <p style={{fontSize:10,color:"#3A4A5A",fontFamily:"IBM Plex Mono",letterSpacing:"0.08em"}}>
                  GOVERNANCE · RISK · COMPLIANCE
                </p>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <span className="badge badge-green">● LIVE</span>
              <span className="badge badge-amber">NIST AI RMF</span>
              <span className="badge badge-teal">EU AI Act</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <p className="mono" style={{fontSize:14,color:"#F59E0B",letterSpacing:"0.1em"}}>
              {clock.toLocaleTimeString("en-US",{hour12:false})}
            </p>
            <p className="mono" style={{fontSize:10,color:"#3A4A5A"}}>UTC-05:00 · CONTOSO CORP</p>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:"flex",gap:4,marginBottom:16}}>
          {TABS.map(t=>(
            <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={()=>setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW TAB ══ */}
        {tab==="overview"&&(
          <div className="fade-in">
            {/* KPI Row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                {label:"TOTAL REQUESTS",val:totalReq.toLocaleString(),sub:"Last 24h",color:"#06B6D4",dot:"pulse-teal"},
                {label:"POLICY BLOCKS",val:blocked,sub:"Active threats mitigated",color:"#EF4444",dot:"pulse-red"},
                {label:"POLICIES ENFORCED",val:policies.toLocaleString(),sub:"Across all agents",color:"#10B981",dot:"pulse-green"},
                {label:"OPEN RISK ISSUES",val:"14",sub:"3 critical · 11 medium",color:"#F59E0B",dot:"pulse-amber"},
              ].map(k=>(
                <div key={k.label} className="panel" style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                    <span className={`pulse-dot ${k.dot}`}/>
                    <span className="mono" style={{fontSize:9,color:"#3A4A5A",letterSpacing:"0.08em"}}>{k.label}</span>
                  </div>
                  <p className="mono" style={{fontSize:22,fontWeight:600,color:k.color,letterSpacing:"0.04em"}}>{k.val}</p>
                  <p style={{fontSize:11,color:"#3A4A5A",marginTop:2}}>{k.sub}</p>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
              {/* Request volume chart */}
              <div className="panel" style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <p className="mono" style={{fontSize:11,color:"#5A6A7A",letterSpacing:"0.08em",textTransform:"uppercase"}}>
                    Request Volume · 24h
                  </p>
                  <span className="badge badge-teal">LIVE</span>
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={volData}>
                    <defs>
                      <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#06B6D4" strokeWidth={1.5} fill="url(#vg)" dot={false}/>
                    <XAxis dataKey="t" hide/>
                    <YAxis hide/>
                    <Tooltip
                      contentStyle={{background:"#0A0E1A",border:"1px solid rgba(6,182,212,0.2)",borderRadius:4,fontSize:11,fontFamily:"IBM Plex Mono"}}
                      labelStyle={{color:"#5A6A7A"}} itemStyle={{color:"#06B6D4"}}
                      formatter={v=>[Math.round(v)+" req/h",""]}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Agent health */}
              <div className="panel" style={{padding:"14px 16px"}}>
                <p className="mono" style={{fontSize:11,color:"#5A6A7A",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>
                  Agent Health
                </p>
                {[
                  {name:"EmployeeWorks AI",status:"HEALTHY",load:68,color:"#10B981"},
                  {name:"Intent Router",status:"HEALTHY",load:43,color:"#10B981"},
                  {name:"Workday Connector",status:"WARN",load:91,color:"#F59E0B"},
                  {name:"SN ITSM Agent",status:"HEALTHY",load:37,color:"#10B981"},
                  {name:"Azure IAM Broker",status:"HEALTHY",load:22,color:"#10B981"},
                ].map(a=>(
                  <div key={a.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span className={`pulse-dot ${a.status==="HEALTHY"?"pulse-green":"pulse-amber"}`}/>
                    <span style={{flex:1,fontSize:11,color:"#8A9EB4"}}>{a.name}</span>
                    <div style={{width:60,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:`${a.load}%`,height:"100%",background:a.color,transition:"width 0.8s ease"}}/>
                    </div>
                    <span className="mono" style={{fontSize:10,color:"#3A4A5A",width:28,textAlign:"right"}}>{a.load}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent log preview */}
            <div className="panel" style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <p className="mono" style={{fontSize:11,color:"#5A6A7A",letterSpacing:"0.08em",textTransform:"uppercase"}}>
                  Recent Events
                </p>
                <button className="tab-btn" style={{padding:"3px 10px"}} onClick={()=>setTab("audit")}>
                  View all →
                </button>
              </div>
              {AUDIT_LOGS.slice(0,5).map((log,i)=>(
                <div key={log.id} className="row-hover" style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",
                  borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span className="mono" style={{fontSize:10,color:"#3A4A5A",width:60}}>{log.ts}</span>
                  <span className={`badge badge-${log.policy==="BLOCK"?"red":log.policy==="WARN"?"amber":log.policy==="REVIEW"?"teal":"gray"}`}>
                    {log.policy}
                  </span>
                  <span className="mono" style={{fontSize:10,color:"#4A5A6A",width:70}}>{log.sys}</span>
                  <span style={{flex:1,fontSize:11,color:"#8A9EB4"}}>{log.action}</span>
                  <span style={{fontSize:11,color:"#4A5A6A"}}>{log.user}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ AUDIT LOG TAB ══ */}
        {tab==="audit"&&(
          <div className="fade-in">
            <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#4A5A6A"}}>Filter:</span>
              {["ALL","HIGH","MED","LOW","BLOCK","PASS","WARN"].map(f=>(
                <button key={f} className={`tab-btn${logFilter===f?" active":""}`}
                  style={{padding:"3px 10px"}} onClick={()=>setLogFilter(f)}>{f}</button>
              ))}
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                <span className="blink mono" style={{fontSize:10,color:"#F59E0B"}}>●</span>
                <span className="mono" style={{fontSize:10,color:"#3A4A5A"}}>LIVE STREAM</span>
              </div>
            </div>

            <div className="panel" style={{overflow:"auto",maxHeight:420}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid rgba(245,158,11,0.15)"}}>
                    {["EVENT ID","TIME","USER","SYSTEM","ACTION","RISK","MODEL","POLICY","DETAIL"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:"#3A4A5A",
                        fontFamily:"IBM Plex Mono",letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log,i)=>(
                    <tr key={log.id} className="row-hover" style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                      <td className="mono" style={{padding:"7px 12px",fontSize:10,color:"#F59E0B"}}>{log.id}</td>
                      <td className="mono" style={{padding:"7px 12px",fontSize:10,color:"#3A4A5A"}}>{log.ts}</td>
                      <td style={{padding:"7px 12px",fontSize:11,color:"#8A9EB4"}}>{log.user}</td>
                      <td style={{padding:"7px 12px"}}>
                        <span className={`badge badge-${log.sys.includes("Azure")?"teal":log.sys.includes("Service")?"green":log.sys.includes("Workday")?"amber":"gray"}`}>
                          {log.sys}
                        </span>
                      </td>
                      <td style={{padding:"7px 12px",fontSize:11,color:"#C8D4E8",maxWidth:180}}>{log.action}</td>
                      <td style={{padding:"7px 12px"}}>
                        <span className={`mono risk-${log.risk==="HIGH"?"high":log.risk==="MED"?"med":"low"}`} style={{fontSize:10}}>
                          {log.risk}
                        </span>
                      </td>
                      <td className="mono" style={{padding:"7px 12px",fontSize:9,color:"#4A5A6A",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {log.model}
                      </td>
                      <td style={{padding:"7px 12px"}}>
                        <span className={`badge badge-${log.policy==="PASS"?"green":log.policy==="BLOCK"?"red":log.policy==="WARN"?"amber":"teal"}`}>
                          {log.policy}
                        </span>
                      </td>
                      <td style={{padding:"7px 12px",fontSize:10,color:"#4A5A6A",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {log.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"0 4px"}}>
              <span className="mono" style={{fontSize:10,color:"#3A4A5A"}}>
                Showing {filteredLogs.length} of {AUDIT_LOGS.length} events · Retention: 90 days
              </span>
              <span className="mono" style={{fontSize:10,color:"#3A4A5A"}}>
                Export: CSV · JSON · SIEM
              </span>
            </div>
          </div>
        )}

        {/* ══ POLICY TAB ══ */}
        {tab==="policy"&&(
          <div className="fade-in">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                {label:"ALLOW",val:"1,181",color:"#10B981",pct:98.1},
                {label:"REDACT/MASK",val:"14",color:"#06B6D4",pct:1.2},
                {label:"ESCALATE",val:"6",color:"#F59E0B",pct:0.5},
                {label:"BLOCK",val:"3",color:"#EF4444",pct:0.2},
              ].map(p=>(
                <div key={p.label} className="panel" style={{padding:"12px 14px"}}>
                  <p className="mono" style={{fontSize:9,color:"#3A4A5A",letterSpacing:"0.1em",marginBottom:8}}>{p.label}</p>
                  <p className="mono" style={{fontSize:20,fontWeight:600,color:p.color}}>{p.val}</p>
                  <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1,marginTop:8,overflow:"hidden"}}>
                    <div style={{width:`${p.pct}%`,height:"100%",background:p.color}}/>
                  </div>
                  <p style={{fontSize:10,color:"#3A4A5A",marginTop:4}}>{p.pct}% of decisions</p>
                </div>
              ))}
            </div>

            <div className="panel" style={{overflow:"auto"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(245,158,11,0.1)"}}>
                <p className="mono" style={{fontSize:11,color:"#5A6A7A",letterSpacing:"0.08em",textTransform:"uppercase"}}>
                  Policy Decision Log — Most Recent
                </p>
              </div>
              {POLICY_DECISIONS.map(p=>(
                <div key={p.id} className="row-hover" style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:5}}>
                    <span className="mono" style={{fontSize:10,color:"#F59E0B"}}>{p.id}</span>
                    <span className="mono" style={{fontSize:10,color:"#3A4A5A"}}>{p.ts}</span>
                    <span className={`badge badge-${p.action==="ALLOW"?"green":p.action==="BLOCK"?"red":p.action==="ESCALATE"?"amber":"teal"}`}>
                      {p.action}
                    </span>
                    <span className="mono" style={{fontSize:10,color:"#4A5A6A"}}>{p.rule}</span>
                    <span style={{marginLeft:"auto",fontSize:10,color:"#3A4A5A",fontFamily:"IBM Plex Mono"}}>
                      {p.latency}
                    </span>
                  </div>
                  <div style={{display:"flex",gap:16}}>
                    <span style={{fontSize:11,color:"#8A9EB4"}}>User: <span style={{color:"#C8D4E8"}}>{p.user}</span></span>
                    <span style={{fontSize:11,color:"#8A9EB4"}}>Resource: <span style={{color:"#C8D4E8"}}>{p.resource}</span></span>
                    <span style={{fontSize:11,color:"#6A7A8A"}}>{p.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ MODELS TAB ══ */}
        {tab==="models"&&(
          <div className="fade-in">
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
              {MODELS.map(m=>(
                <div key={m.name} className={`panel panel-${m.status==="WARN"?"amber":m.status==="HEALTHY"?"green":"red"}`}
                  style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <p className="mono" style={{fontSize:12,fontWeight:600,color:"#C8D4E8"}}>{m.name}</p>
                      <p style={{fontSize:11,color:"#4A5A6A",marginTop:2}}>{m.provider} · {m.role}</p>
                    </div>
                    <span className={`badge badge-${m.status==="HEALTHY"?"green":"amber"}`}>{m.status}</span>
                  </div>
                  <hr className="divline"/>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                    {[
                      {label:"REQUESTS",val:m.requests.toLocaleString(),color:"#06B6D4"},
                      {label:"ACCURACY",val:m.accuracy+"%",color:m.accuracy>95?"#10B981":"#F59E0B"},
                      {label:"AVG LATENCY",val:m.latency,color:"#8A9EB4"},
                      {label:"COST/REQ",val:m.cost,color:"#A78BFA"},
                      {label:"MODEL DRIFT",val:m.drift+"%",color:m.drift>3?"#EF4444":"#10B981"},
                      {label:"24H COST",val:"$"+(m.requests*parseFloat(m.cost.slice(1))).toFixed(2),color:"#8A9EB4"},
                    ].map(s=>(
                      <div key={s.label}>
                        <p className="mono" style={{fontSize:9,color:"#3A4A5A",letterSpacing:"0.08em",marginBottom:3}}>{s.label}</p>
                        <p className="mono" style={{fontSize:14,fontWeight:600,color:s.color}}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                  {m.status==="WARN"&&(
                    <div style={{marginTop:10,padding:"7px 10px",background:"rgba(245,158,11,0.06)",
                      border:"1px solid rgba(245,158,11,0.2)",borderRadius:3}}>
                      <p className="mono" style={{fontSize:10,color:"#F59E0B"}}>
                        ⚠ Model drift {m.drift}% exceeds threshold 3.0% · Review scheduled
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ COMPLIANCE TAB ══ */}
        {tab==="compliance"&&(
          <div className="fade-in">
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:14}}>
              {COMPLIANCE.map(c=>(
                <div key={c.framework} className="panel" style={{padding:"18px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                    <Ring score={c.score} color={c.color}/>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,color:"#C8D4E8",marginBottom:3}}>{c.framework}</p>
                      <div style={{display:"flex",gap:8}}>
                        <span style={{fontSize:11,color:"#4A5A6A"}}>{c.controls} controls</span>
                        {c.critical>0&&<span className="badge badge-red">{c.critical} critical</span>}
                        {c.open>0&&<span className="badge badge-amber">{c.open} open</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1,overflow:"hidden"}}>
                    <div style={{width:`${c.score}%`,height:"100%",background:c.color,transition:"width 1s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:10,color:"#3A4A5A"}}>{c.controls-c.open} passing</span>
                    <span className="mono" style={{fontSize:10,color:c.color}}>{c.score}% compliant</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel" style={{padding:"14px 16px"}}>
              <p className="mono" style={{fontSize:11,color:"#5A6A7A",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>
                Open Risk Issues
              </p>
              {[
                {id:"RISK-041",fw:"EU AI Act",severity:"CRITICAL",issue:"Art.13 transparency requirement: AI decision explanations not surfaced to end users",owner:"AI Governance Team",due:"Mar 28"},
                {id:"RISK-040",fw:"EU AI Act",severity:"CRITICAL",issue:"Art.9 risk mgmt: Workday connector bias assessment incomplete",owner:"Data Science",due:"Apr 05"},
                {id:"RISK-039",fw:"NIST AI RMF",severity:"HIGH",issue:"GOVERN 1.1: AI inventory missing 3 shadow AI deployments in Finance",owner:"CISO Office",due:"Mar 25"},
                {id:"RISK-038",fw:"NIST AI RMF",severity:"HIGH",issue:"MEASURE 2.5: Model performance reports not generated for 2 models",owner:"MLOps",due:"Apr 01"},
                {id:"RISK-037",fw:"ISO/IEC 42001",severity:"MED",issue:"A.6.2: Human oversight controls for high-stakes HR decisions need review",owner:"HR Legal",due:"Apr 15"},
              ].map(r=>(
                <div key={r.id} className="row-hover" style={{display:"flex",alignItems:"flex-start",gap:10,
                  padding:"9px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span className="mono" style={{fontSize:10,color:"#F59E0B",width:70,flexShrink:0}}>{r.id}</span>
                  <span className={`badge badge-${r.severity==="CRITICAL"?"red":r.severity==="HIGH"?"amber":"gray"}`} style={{flexShrink:0}}>
                    {r.severity}
                  </span>
                  <span className="badge badge-teal" style={{flexShrink:0}}>{r.fw}</span>
                  <span style={{flex:1,fontSize:11,color:"#8A9EB4",lineHeight:1.4}}>{r.issue}</span>
                  <span style={{fontSize:10,color:"#3A4A5A",whiteSpace:"nowrap"}}>{r.owner}</span>
                  <span className="mono" style={{fontSize:10,color:"#4A5A6A",whiteSpace:"nowrap"}}>Due {r.due}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
