import React, {useState, useEffect, useCallback, useRef} from 'react';
import {SupportedLanguage} from '../types';
import {ui,knownText,workflowLabel} from '../services/uiI18n';
import {fieldName,LOCKED_STATES,canSubmitForAssessment,canFinalize} from '../services/businessForm';
import {api, ScreeningRecord, downloadOriginal,assertScreeningRecord} from '../services/screeningApi';
import {TranslationNotice} from './TranslationNotice';
import {JourneyProgress} from './JourneyProgress';
import {IdeaSubmissionModal} from './IdeaSubmissionModal';
import {SplitScreenMentor} from './SplitScreenMentor';
import {ProgramCaseTools} from './ProgramCaseTools';
import {StructuredBusinessForm} from './StructuredBusinessForm';
import {AssessmentScoreCard} from './AssessmentScoreCard';

export function ScreeningWorkspace({role,language,onLanguageChange}: {role:'beneficiary'|'assessor'; language:SupportedLanguage;onLanguageChange?:(language:SupportedLanguage)=>void}) {
  const t=ui(role==='assessor'?'en':language);
  const translationAttempt=useRef('');
  const questionAttempt=useRef('');
  const [account,setAccount] = useState<{id:string;role:string}|null>(null);
  const [records,setRecords] = useState<ScreeningRecord[]>([]);
  const [selected,setSelected] = useState('');
  const [modal,setModal] = useState(false);
  const [structured,setStructured] = useState(false);
  const [editStructured,setEditStructured] = useState(false);
  const [queue,setQueue]=useState('Assigned Cases');
  const [preferredCapacity,setPreferredCapacity]=useState(8);
  const [available,setAvailable]=useState(true);
  const [busy,setBusy] = useState('');
  const [error,setError] = useState('');
  const record = records.find(r=>r.id===selected);
  const update = (result: ScreeningRecord) => {assertScreeningRecord(result);setRecords(prev=>[result,...prev.filter(r=>r.id!==result.id)]);setSelected(result.id);};
  const load = useCallback(async () => {
    const session = await api<{id:string;role:string}>('/session');
    if (session.role!==role) throw new Error(t('accountHelp'));
    const list = await api<ScreeningRecord[]>('/submissions');
    if(!Array.isArray(list))throw new Error('Backend response does not match the screening contract');
    list.forEach(assertScreeningRecord);
    setAccount(session); setRecords(list); setSelected(prev=>list.some(r=>r.id===prev)?prev:list[0]?.id||'');
  },[role]);
  const run = async (label:string, task:()=>Promise<void>) => {
    setBusy(label);setError('');
    try {await task();} catch(e) {setError(t((e as Error).message,{defaultValue:(e as Error).message}));} finally {setBusy('');}
  };
  useEffect(()=>{if(sessionStorage.getItem('screening_access_token')) void run(t("Loading saved screening…"),load);},[load]);
  const action = async (path:string,body:unknown={}) => {
    setBusy(t('Processing with the screening service…'));setError('');
    try {update(await api<ScreeningRecord>(path,body));} catch(e) {setError(t((e as Error).message,{defaultValue:(e as Error).message}));throw e;} finally {setBusy('');}
  };
  const safeAction = async (path:string,body:unknown={}) => {try {await action(path,body);} catch{/* error is displayed above */}};
  const openStructured=()=>void run(t('Preparing extracted business facts…'),async()=>{
    if(record&&record.state==='PROVISIONALLY_SCORED'&&!Object.values(record.facts).some(f=>f.validation.valid||f.confirmed)&&!record.questions.some(q=>q.status==='answered')&&record.sources.every(s=>s.english.includes('[Submitted answer]'))){
      update(await api<ScreeningRecord>('/submissions/'+record.id+'/extract',{}));
    }
    setEditStructured(!!record);setStructured(true);
  });
  useEffect(()=>{
    if(record && role==='beneficiary' && record.language!==language && !busy){
      const attempt=record.id+':'+language;
      if(translationAttempt.current!==attempt){translationAttempt.current=attempt;void safeAction('/submissions/'+record.id+'/language',{language});}
    }
  },[language,record?.id,busy]);
  useEffect(()=>{
    if(role==='beneficiary'&&record&&!record.questions.length&&!busy&&['EXTRACTED','PROVISIONALLY_SCORED','CLARIFICATION'].includes(record.state)&&questionAttempt.current!==record.id){
      questionAttempt.current=record.id;
      void safeAction('/clarification/'+record.id+'/round',{});
    }
  },[role,record?.id,record?.questions.length,busy]);
  const viewLanguage=role==='assessor'?'en':language;
  const displayRecord=record?{...record,language:viewLanguage}:undefined;
  const report = record?.reportTranslations?.[viewLanguage] || record?.report;
  const reportPending=viewLanguage!=='en'&&!!record?.report&&!record?.reportTranslations?.[viewLanguage];
  return <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
    <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 text-white">
      <p className="text-teal-400 text-xs font-bold uppercase tracking-wider">Tata STRIVE · Evidence-based screening</p>
      <h1 className="text-2xl font-extrabold mt-2">{role==='assessor'?'Assessor Portal':t('workspace')}</h1>
      <p className="text-slate-300 mt-2 text-sm">{role==='beneficiary'?t('simpleWorkspaceHelp'):['Original pitch','Review facts','Clarify','Assessment','Human review'].map(step=>t(step)).join(' → ')}</p>
    </header>
    {!account ? <section className="bg-white border rounded-2xl p-6 space-y-3"><p>{t('phoneLoginHelp')}</p><a className="inline-block bg-teal-600 text-white rounded-xl p-3" href={role==='beneficiary'?'/beneficiary/auth':'/assessor/login'}>{t('Sign in')}</a></section> : <div className="flex flex-wrap gap-3 items-center">
      {role==='assessor'&&<span className="text-sm text-slate-500">Screening account: {account.id}</span>}
      <select disabled={!!busy} aria-label="Saved submission" className="border rounded-xl p-3 bg-white" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t("Select saved submission")}</option>{records.map(r=><option key={r.id} value={r.id}>{r.title} · {workflowLabel(r.state,role==='assessor'?'en':language)}</option>)}</select>
      <button disabled={!!busy} className="border rounded-xl p-3" onClick={()=>void run(t("Refreshing saved records…"),load)}>{t("Refresh progress")}</button>
      {role==='beneficiary' && <><button disabled={!!busy} className="bg-teal-600 text-white rounded-xl p-3" onClick={()=>setModal(true)}>{t("Upload / type business pitch")}</button><button disabled={!!busy} className="border border-teal-600 text-teal-700 rounded-xl p-3" onClick={openStructured}>{t('structured')}</button></>}
      <button className="text-sm underline" disabled={!!busy} onClick={()=>{void api('/auth/logout',{}).catch(()=>{});sessionStorage.removeItem('screening_access_token');setAccount(null);setRecords([]);setSelected('');}}>{t("Disconnect")}</button>
    </div>}
    {role==='assessor'&&account&&<section className="bg-white border p-4 rounded-2xl space-y-3"><div className="flex flex-wrap gap-2">{['Assigned Cases','Assessment Ready','Clarification Required','Awaiting Beneficiary Response','Reviews Completed'].map(tab=><button key={tab} className={'border p-2 rounded '+(tab===queue?'bg-teal-600 text-white':'')} onClick={()=>setQueue(tab)}>{tab} ({records.filter(r=>tab==='Assigned Cases'||(tab==='Assessment Ready'&&r.state==='SUBMITTED')||(tab==='Clarification Required'&&r.state==='CLARIFICATION_REQUIRED')||(tab==='Awaiting Beneficiary Response'&&r.state==='AWAITING_BENEFICIARY')||(tab==='Reviews Completed'&&!!r.recommendation)).length})</button>)}</div><div className="flex gap-2 flex-wrap"><label>Preferred active cases <input type="number" min={0} className="border p-2 rounded w-20" value={preferredCapacity} onChange={e=>setPreferredCapacity(Number(e.target.value))}/></label><label><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/> Available</label><button onClick={()=>void run('Saving capacity…',async()=>{await api('/assessor/capacity',{id:account.id,data:{preferred:preferredCapacity,available}});})}>Save preference</button></div><div className="flex flex-wrap gap-2">{records.filter(r=>queue==='Assigned Cases'||(queue==='Assessment Ready'&&r.state==='SUBMITTED')||(queue==='Clarification Required'&&r.state==='CLARIFICATION_REQUIRED')||(queue==='Awaiting Beneficiary Response'&&r.state==='AWAITING_BENEFICIARY')||(queue==='Reviews Completed'&&!!r.recommendation)).map(r=><button key={r.id} className="text-teal-700 border p-2 rounded" onClick={()=>setSelected(r.id)}>{r.title} · {r.owner}</button>)}</div></section>}
    {busy && <p role="status" className="bg-teal-50 border border-teal-200 p-4 rounded-xl">{busy}</p>}
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</p>}
    {account && records.length===0 && <p className="bg-white border border-dashed rounded-2xl p-10 text-center text-slate-500">{role==='assessor'?'No submitted assessments assigned to this account.':t('No business idea submitted yet')}</p>}
    {record && displayRecord && <div className="space-y-6"><JourneyProgress state={record.state} language={viewLanguage}/>
      {record.synthetic&&<p role="status" className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-xl">SYNTHETIC DEMO · {record.syntheticBeneficiary} · Fictional pitch and predefined example score. This is not a live Qwen assessment.</p>}
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="flex justify-between flex-wrap gap-3"><h2 className="text-xl font-bold">{record.title}</h2><span className="text-teal-700 font-semibold">{workflowLabel(record.state,role==='assessor'?'en':language)}</span></div>
        <AssessmentScoreCard record={record} language={viewLanguage}/>
        {record.category&&<p className="text-sm bg-teal-50 text-teal-900 rounded-xl p-3"><strong>{t('field_trade')}: </strong>{record.category.status==='DETECTED'?t(record.category.name||'',{defaultValue:record.category.name||''}):t('automaticCategoryNotice')}</p>}
        {role==='beneficiary' && <label>{t('language')}<select disabled={!!busy} className="border rounded-xl p-2 ml-3" value={language} onChange={e=>onLanguageChange?onLanguageChange(e.target.value as SupportedLanguage):void safeAction('/submissions/'+record.id+'/language',{language:e.target.value})}>{Object.entries({en:'English',hi:'हिन्दी',mr:'मराठी',ta:'தமிழ்',te:'తెలుగు',kn:'ಕನ್ನಡ',bn:'বাংলা',or:'ଓଡ଼ିଆ'}).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>}
        {record.mediaIds?.map(id=><button key={id} className="text-teal-700 underline" onClick={()=>void run('Downloading original upload…',()=>downloadOriginal(id))}>{t("Download preserved original document / recording")}</button>)}
        <details><summary className="cursor-pointer text-sm text-teal-700">{t("Original pitch")}</summary><div className="grid md:grid-cols-2 gap-4"><div><h3 className="font-bold">{t('Original pitch')} · {record.sources[0]?.language||record.language}</h3><p className="whitespace-pre-wrap">{record.sources.map(source=>source.original).join('\n\n')||t('Validated business fact sheet')}</p></div><div><h3 className="font-bold">{t("English processing text")}</h3><p className="whitespace-pre-wrap">{record.sources.map(source=>source.english).filter(Boolean).join('\n\n')||t('Translation pending')}</p></div></div></details>
        {record.sources.some(s=>s.translationUncertain) && <p className="text-amber-700">{t('languageReviewNotice')}</p>}
        {['DRAFT','EXTRACTED'].includes(record.state) && <button disabled={!!busy} onClick={()=>void safeAction('/submissions/'+record.id+'/extract',{})} className="border p-3 rounded-xl">{t("Retry extraction")}</button>}
        {record.currentScore && (record.synthetic||role==='assessor'||(record.finalScore&&canFinalize(record))) && <details open={record.synthetic} className="border-t pt-4 space-y-2"><summary className="cursor-pointer font-semibold">{record.synthetic?'Synthetic demo score':t("Transparent score breakdown")}</summary><p className="text-2xl font-bold">{record.currentScore.overallScore}/10 · {knownText(record.currentScore.status,viewLanguage)}{record.currentScore.stale?' · '+t('STALE — reassess required'):''}</p><p>{t(record.currentScore.scoreMeaning,{defaultValue:record.currentScore.scoreMeaning})}</p><p>{t('Evidence completeness')}: {record.currentScore.completeness}% · {t('Confidence')}: {knownText(record.currentScore.confidence,viewLanguage)}</p><p>{knownText(record.currentScore.feasibility,viewLanguage)}</p>{record.currentScore.unitContribution && <p>{record.currentScore.unitContribution.label}: {record.currentScore.unitContribution.currency}{record.currentScore.unitContribution.amount} / {record.currentScore.unitContribution.unit}</p>}
          <details><summary>{t("Transparent score breakdown")}</summary>{Object.entries(record.currentScore.domains).map(([key,d])=><div key={key} className="py-2 border-b"><strong>{t(key,{defaultValue:key})}: {d.rating}/5 · {t('Weight')} {Math.round(d.weight*100)}%</strong><p className="text-xs">{t('Supported')}: {d.supportedFields.map(field=>t(fieldName(field),{defaultValue:field})).join(', ')||t('None')} · {t('Missing')}: {d.missingFields.map(field=>t(fieldName(field),{defaultValue:field})).join(', ')||t('None')}</p></div>)}</details>
          {record.finalScore && <p className="text-sm">{t('Final')}: {record.finalScore.overallScore}/10</p>}
        </details>}
      </div>
      {role==='beneficiary'&&!LOCKED_STATES.has(record.state)&&<div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3"><p className="text-teal-950">{t(canFinalize(record)?'confirmFacts':'missingAnswerNotice')}</p><button disabled={!!busy} className="bg-teal-600 text-white rounded-xl p-3" onClick={openStructured}>{t('Add / correct business facts')}</button></div>}
      {Object.keys(record.facts).length>0 && <SplitScreenMentor record={displayRecord} busy={!!busy || role==='assessor'} onAction={action} onUpdate={update}/>}
      {report && <section className="bg-white border rounded-2xl p-6 space-y-4"><h2 className="text-xl font-bold">{t("Final assessment & mentoring report")}</h2>
        {reportPending&&<p role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3">{t('Translation pending')}: {t('English source content shown until translation is available')}</p>}
        <p>{report.explanation}</p>
        {(['strengths','weaknesses','recommendations'] as const).map(key=><div key={key}><h3 className="font-bold capitalize">{t(key==='strengths'?'Strengths':key==='weaknesses'?'Weaknesses':'AI suggestions')}</h3><ul className="list-disc ml-5">{report[key].map((s,i)=><li key={i}>{s}</li>)}</ul></div>)}
        <p>{t('Remaining unknowns')}: {report.remainingUnknowns.map(key=>t(fieldName(key),{defaultValue:key})).join(', ')||t('None')}</p>
        {role==='beneficiary' && record.state==='FINAL_SCORED' && <button disabled={!!busy||!canFinalize(record)} className="bg-teal-600 text-white p-3 rounded-xl" onClick={()=>void safeAction('/submissions/'+record.id+'/confirm',{})}>{t("I reviewed the final report and confirm it")}</button>}
        {role==='beneficiary' && record.state==='READY_FOR_ASSESSOR' && <button disabled={!!busy||!canSubmitForAssessment(record)} className="bg-teal-600 text-white p-3 rounded-xl" onClick={()=>void safeAction('/submissions/'+record.id+'/submit-to-assessor',{})}>{t("Submit confirmed report to assessor")}</button>}
        {record.submittedAt && <p>{t('Submitted')}: {new Date(record.submittedAt).toLocaleString()}</p>}
      </section>}
      {record.assessorReview && <section className="bg-white border rounded-2xl p-6"><h2 className="text-xl font-bold">Assessor decision: {record.assessorReview.decision}</h2><p>Human score: {record.assessorReview.finalScore}/10</p><TranslationNotice language={viewLanguage} pending={record.assessorReview.language!==viewLanguage}/><p>{role==='beneficiary'&&record.assessorReview.language===viewLanguage?record.assessorReview.feedbackTranslated:record.assessorReview.feedback}</p></section>}
      <ProgramCaseTools key={record.id} record={displayRecord} role={role} busy={!!busy} onAction={action} onUpdate={update}/>
      {role==='assessor' && <details className="bg-white p-6 rounded-2xl border"><summary>Evidence sources, answers and workflow audit</summary><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify({sources:record.sources,questions:record.questions,history:record.history},null,2)}</pre></details>}
    </div>}
    {structured&&<StructuredBusinessForm record={record} language={language} onClose={()=>setStructured(false)} onSubmit={update}/>}
    {modal && <IdeaSubmissionModal isOpen onClose={()=>setModal(false)} currentLang={language} onSubmit={update}/>}
  </div>;
}
