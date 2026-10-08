'use client';
import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ArrowUpRight,CheckCircle2,Clock3,Copy,Download,LoaderCircle,Search,X} from 'lucide-react';
import {toast} from 'sonner';
import {logoutAdmin,startResearch} from '@/lib/api';
import type {Claim,Report,ResearchActivity,Source} from '@/lib/research/types';
import {reportMarkdown} from '@/lib/research/export';
import {downloadReportMarkdown} from '@/lib/research/download';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import './research.css';
import {ResearchHistory} from './research-history';
import {LlmSettings} from './llm-settings';

function formatDuration(totalSeconds:number){
 const minutes=Math.floor(totalSeconds/60);const seconds=totalSeconds%60;return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

export default function ResearchWorkspace({admin,authMode}:{admin:{name:string|null};authMode:'owner'|'none'}){
 const {t,i18n}=useTranslation();const tr=(key:string)=>t('research.'+key);
 const [query,setQuery]=useState('');const [running,setRunning]=useState(false);const [stage,setStage]=useState(-1);const [plan,setPlan]=useState<string[]>([]);const [showPlan,setShowPlan]=useState(false);
 const [sources,setSources]=useState<Source[]>([]);const [claims,setClaims]=useState<Claim[]>([]);const [report,setReport]=useState<Report|null>(null);const [error,setError]=useState('');const [source,setSource]=useState<Source|null>(null);
 const [activity,setActivity]=useState<ResearchActivity>('planning');const [activeQuery,setActiveQuery]=useState('');const [currentSource,setCurrentSource]=useState<Source|null>(null);const [elapsed,setElapsed]=useState(0);
 const abort=useRef<AbortController|null>(null);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 useEffect(()=>{if(source)dialog.current?.showModal();else dialog.current?.close();},[source]);
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setElapsed(value=>value+1),1000);return()=>window.clearInterval(timer);},[running]);
 const steps=t('research.steps',{returnObjects:true}) as string[];
 const stageIndex=Math.min(Math.max(stage,0),5);const progressPercent=[8,28,48,68,88,100][stageIndex];const stepLabel=steps[Math.min(stageIndex,steps.length-1)];
 const showLive=running||(!report&&(stage>=0||sources.length>0||claims.length>0));

 function mergeSource(incoming:Source){setSources(current=>[...current.filter(item=>item.id!==incoming.id),incoming].sort((a,b)=>a.id-b.id));}

 async function submit(e:React.FormEvent){
  e.preventDefault();if(running)return;if(query.trim().length<4){setError(tr('invalid'));return;}
  setRunning(true);setError('');setReport(null);setSources([]);setClaims([]);setPlan([]);setStage(0);setActivity('planning');setActiveQuery('');setCurrentSource(null);setElapsed(0);
  const controller=new AbortController();abort.current=controller;
  try{
   await startResearch(query,controller.signal,event=>{
    if(event.type==='saved')toast.success(tr('history.saved'));
    if(event.type==='warning')toast.error(tr('history.saveFailed'));
    if('stage' in event&&event.stage!==undefined)setStage(event.stage);
    if(event.type==='plan'){setPlan(event.plan||[]);setShowPlan(true);}
    if(event.type==='activity'){setActivity(event.activity);if(event.query)setActiveQuery(event.query);if(event.source){setCurrentSource(event.source);mergeSource(event.source);}}
    if(event.type==='sources')setSources(event.sources||[]);
    if(event.type==='claims')setClaims(event.claims||[]);
    if(event.type==='report'){setReport(event.report||null);setStage(5);setActivity('complete');}
   });
  }catch(e){
   const code=e instanceof Error?e.message:'';
   const fallback=code==='research_failed'?t('research.failedAt',{step:stepLabel}):tr(code==='llm_not_configured'?'settingsNotReady':code==='model_unavailable'?'unavailable':code==='login'?'loginNeeded':['busy','timeout'].includes(code)?code:'failed');
   setError(tr(controller.signal.aborted?'cancelled':code==='llm_not_configured'?'settingsNotReady':code==='model_unavailable'?'unavailable':code==='login'?'loginNeeded':['busy','timeout'].includes(code)?code:'failed'));
   if(code==='research_failed')setError(fallback);
  }finally{setRunning(false);}
 }

 async function copy(){if(!report)return;try{await navigator.clipboard.writeText(reportMarkdown(report,sources,claims));toast.success(tr('copied'));}catch{toast.error(tr('copyFailed'));}}
 async function logout(){try{await logoutAdmin();}finally{window.location.assign('/login');}}
 function download(){if(!report)return;downloadReportMarkdown(report,sources,claims);}
 function citations(ids:number[]){return ids.map(id=><button key={id} className="citation" aria-label={`${tr('sources')} ${id}`} onClick={()=>setSource(sources.find(s=>s.id===id)||null)}>{id}</button>);}

 return <div className="research-app">
 <header><div className="brand"><span className="brandmark" aria-hidden="true"/>{tr('brand')}<small>AI RESEARCH AGENT</small></div><div className="topright"><LlmSettings/><ResearchHistory disabled={running} onLoad={r=>{setQuery(r.query);setReport(r.snapshot.report);setSources(r.snapshot.sources);setClaims(r.snapshot.claims);setPlan(r.snapshot.plan);setStage(5);setActivity('complete');setShowPlan(true);setError('');}}/><button className="quiet" onClick={()=>setShowPlan(!showPlan)}>{tr('method')}</button><button className="quiet" onClick={()=>void i18n.changeLanguage(i18n.language.startsWith('zh')?'en-US':'zh-CN')}>{i18n.language.startsWith('zh')?'EN':'中文'}</button>{authMode==='none'?<span className="tag local-mode" title={tr('localModeHint')}>{tr('localMode')}</span>:<button className="tag" aria-label={`${tr('logout')} ${admin.name ?? ''}`.trim()} onClick={()=>void logout()}>{tr('logout')}</button>}</div></header>
 <main className="workspace"><section aria-label={tr('question')}><div className="intro"><div><div className="eyebrow">{tr('eyebrow')}</div><h1>{tr('headline')}</h1></div><div className="note">{tr('note')}<br/>{tr('note2')}</div></div>
 <form onSubmit={submit} className="querybox"><label className="sr-only" htmlFor="query">{tr('question')}</label><Textarea id="query" value={query} disabled={running} onChange={e=>setQuery(e.target.value)} maxLength={600} placeholder={tr('placeholder')} rows={2}/><div className="querybar"><div className="queryhint"><span><i className="dot"/>{tr('web')}</span><span><i className="dot"/>{tr('readonly')}</span><span><i className="dot"/>{tr('markdown')}</span></div>{running?<Button className="primary" type="button" onClick={()=>abort.current?.abort()}><X size={16}/>{tr('cancel')}</Button>:<Button className="primary" type="submit"><Search size={17}/>{tr('start')}</Button>}</div></form>
 <div className="plan"><span className="plan-label">{tr('path')}</span><div className="steps">{steps.map((s,i)=><span key={s} className={`step ${stage===i?'active':''} ${stage>i?'done':''} ${running&&stage===i?'running':''}`}><i>{stage>i?'✓':i+1}</i>{s}</span>)}</div><button className="quiet planmore" aria-expanded={showPlan} onClick={()=>setShowPlan(!showPlan)}>{tr(showPlan?'hide':'plan')} {showPlan?'−':'＋'}</button><div className="mobile-steps">{steps.map((s,i)=><span key={s} className={stage===i?'active':''} style={{fontWeight:stage===i?700:400,opacity:stage<i?.5:1}}>{s}</span>)}</div></div>
 {showPlan&&<div className="plan-expanded"><p>{tr('methodText')}</p><ol>{plan.map((p,i)=><li key={i}>{p}</li>)}</ol></div>}
 {showLive&&<section className={`research-live ${running?'is-running':'is-stopped'}`} data-el="research-live" aria-live="polite">
  <div className="live-head"><div className="live-title">{running?<LoaderCircle className="live-spin" aria-hidden="true"/>:<CheckCircle2 aria-hidden="true"/>}<div><span className="eyebrow">LIVE RESEARCH</span><h3>{t('research.activity.'+activity)}</h3><p>{currentSource?.title||activeQuery||tr('liveWaiting')}</p></div></div><div className="live-clock"><Clock3 aria-hidden="true"/><span>{stepLabel}</span><strong>{formatDuration(elapsed)}</strong></div></div>
  <div className="live-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}><span style={{width:`${progressPercent}%`}}/></div>
  <div className="live-stats"><div><strong>{plan.length}</strong><span>{tr('livePlan')}</span></div><div><strong>{sources.length}</strong><span>{tr('liveSources')}</span></div><div><strong>{sources.filter(s=>s.read).length}</strong><span>{tr('liveRead')}</span></div><div><strong>{claims.length}</strong><span>{tr('liveClaims')}</span></div></div>
  {sources.length>0&&<div className="live-sources"><div className="live-section-title">{tr('liveSourceTitle')}</div>{[...sources].reverse().slice(0,4).map(item=><div className="live-source" key={item.id}><span className={`live-source-state ${item.read?'read':''}`}>{item.read?tr('read'):tr('activity.reading')}</span><div><strong>{item.title||item.url}</strong><small>{(()=>{try{return new URL(item.url).hostname}catch{return item.url}})()}</small></div></div>)}</div>}
  {claims.length>0&&<div className="live-claims"><div className="live-section-title">{tr('liveClaimTitle')}</div>{claims.slice(0,3).map((item,i)=><div className="live-claim" key={`${item.claim}-${i}`}><span className={`claim-state ${item.status}`}>{tr(item.status)}</span><p>{item.claim}</p></div>)}</div>}
 </section>}
 {error&&<div className="error-box" role="alert">{error}</div>}
 </section> <article className="paper open" id="report"><div className="report-head"><div className="report-top"><span className="eyebrow">RESEARCH REPORT / {tr('report')}</span><span className="folio">№ 001</span></div><h2 style={{whiteSpace:'pre-line'}}>{report?.title||tr('emptyTitle')}</h2><div className="subtitle">{report?tr('evidenceNote'):tr('emptySubtitle')}</div><div className="report-meta"><span>{report?tr('completed'):running?steps[Math.min(Math.max(stage,0),steps.length-1)]:tr('ready')}</span>{sources.length>0&&<span>{t('research.sourceCount',{count:sources.length})}</span>}</div></div>
 <div className="report-tools"><span className="status"><i/>{tr(report?'session':'note')}</span>{report&&<><button className="quiet" onClick={()=>document.getElementById('sources')?.scrollIntoView({behavior:'smooth'})}>{tr('sources')}</button><button className="quiet" onClick={copy}><Copy size={14}/>{tr('copy')}</button><button type="button" className="quiet" data-el="download-report" onClick={download}><Download size={14}/>{tr('download')}</button></>}</div>
 <div className="report-body">{!report?<div className="empty-body"><strong>{tr('emptyBody')}</strong><p>{tr('emptyHint')}</p><button className="quiet" disabled={running} onClick={()=>{setQuery(i18n.language.startsWith('zh')?'比较 LangGraph 与 CrewAI 的工作流设计':'Compare LangGraph and CrewAI workflow design');document.getElementById('query')?.focus();}}>{tr('example')} <ArrowUpRight size={14}/></button></div>:<>
 <section className="docrow"><div><span className="section-number">01 / EXECUTIVE SUMMARY</span><h3>{tr('summary')}</h3><div className="copy"><p className="lead">{report.summary}</p><div className="pullquote">{tr('note2')}</div></div></div><aside className="margin-note"><div className="source-mini"><strong>{tr('method')}</strong>{tr('methodText')}</div></aside></section>
 {report.sections.map((section,i)=><section className="docrow" key={i}><div><span className="section-number">{String(i+2).padStart(2,'0')} / RESEARCH</span><h3>{section.title}</h3><div className="copy">{section.paragraphs.map((p,j)=><p key={j}>{p.text}{citations(p.sourceIds)}</p>)}</div></div><aside className="margin-note">{Array.from(new Set(section.paragraphs.flatMap(p=>p.sourceIds))).slice(0,2).map(id=>{const s=sources.find(s=>s.id===id);return s?<div className="source-mini" key={id}><strong>[{id}] {s.title}</strong><button className="quiet" onClick={()=>setSource(s)}>{tr(s.read?'read':'snippet')} ↗</button></div>:null;})}</aside></section>)}
 <section className="docrow"><div><h3>{tr('recommendations')}</h3><p>{report.recommendations}</p><h3>{tr('limitations')}</h3><p>{report.limitations}</p></div><aside className="margin-note"><div className="source-mini">{tr('completed')}</div></aside></section></>}
 {claims.length>0&&<section><h3>{tr('evidence')}</h3>{claims.map((c,i)=><details className="claim" key={i}><summary>{c.claim} · <small>{tr(c.status)}</small></summary><p>{c.evidence}{citations(c.sourceIds)}</p></details>)}</section>}</div>
 {sources.length>0&&<section className="report-foot" id="sources"><span className="section-number">SOURCES</span><h3>{tr('sourceTitle')}</h3><ol className="source-list">{sources.map(s=><li key={s.id}><span className="source-id">{String(s.id).padStart(2,'0')}</span><div><button className="quiet" style={{whiteSpace:'normal',textAlign:'left'}} onClick={()=>setSource(s)}>{s.title} ↗</button><small>{new URL(s.url).hostname}</small></div><span className="source-type">{tr(s.read?'read':'snippet')}</span></li>)}</ol></section>}</article>
 <div className="footerline"><span>{tr('brand')} / AI Research Agent</span><span>{tr('footer')}</span></div></main>
 <dialog ref={dialog} onCancel={()=>setSource(null)} onClick={e=>{if(e.target===dialog.current)setSource(null);}}><button className="close" aria-label={tr('close')} onClick={()=>setSource(null)}>×</button><span className="eyebrow">SOURCE RECORD</span><h3>{source?.title}</h3><p>{tr(source?.read?'read':'snippet')}</p><p>{source?.content.slice(0,2500)}</p><a href={source?.url} target="_blank" rel="noopener noreferrer">{tr('open')} ↗</a></dialog>
 </div>;
}

