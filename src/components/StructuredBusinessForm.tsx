import React,{useEffect,useMemo,useState} from 'react';
import {api,ScreeningRecord} from '../services/screeningApi';
import {SupportedLanguage} from '../types';
import {ui} from '../services/uiI18n';
import {BUSINESS_MODULES,CRITICAL_FIELDS,FactDraft,draftFromRecord,changedFields,clearedFields,validateDraft,fieldName} from '../services/businessForm';

export function StructuredBusinessForm({language,onSubmit,onClose,record}:{language:SupportedLanguage;onSubmit:(r:ScreeningRecord)=>void;onClose:()=>void;record?:ScreeningRecord}){
 const t=ui(language);
 const original=useMemo(()=>draftFromRecord(record,false),[record?.id,record?.updatedAt]);
 const [schema,setSchema]=useState<{modules:Record<string,readonly string[]>;critical:readonly string[]}>({modules:BUSINESS_MODULES,critical:CRITICAL_FIELDS});
 const [cohorts,setCohorts]=useState<{id:string;name?:string}[]>([]);
 const [values,setValues]=useState<Record<string,FactDraft>>(()=>draftFromRecord(record));
 const [title,setTitle]=useState(record?.title||''),[region,setRegion]=useState(record?.region||''),[cohort,setCohort]=useState(record?.cohortId||'');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[optionsWarning,setOptionsWarning]=useState(false);
 useEffect(()=>{
  let active=true;
  void Promise.allSettled([api<typeof schema>('/schema'),api<typeof cohorts>('/cohorts')]).then(([schemaResult,cohortResult])=>{
   if(!active)return;
   if(schemaResult.status==='fulfilled'&&schemaResult.value?.modules&&Array.isArray(schemaResult.value?.critical)&&Object.values(schemaResult.value.modules).every(fields=>Array.isArray(fields)&&fields.every(field=>typeof field==='string')))setSchema(schemaResult.value);
   if(cohortResult.status==='fulfilled'&&Array.isArray(cohortResult.value))setCohorts(cohortResult.value);
   setOptionsWarning(schemaResult.status==='rejected'||cohortResult.status==='rejected');
  });
  return ()=>{active=false;};
 },[]);
 useEffect(()=>{const handle=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onClose();};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);},[busy,onClose]);
 const changes=changedFields(values,record?original:{});
 const cleared=record?clearedFields(values,original):[];
 return <div role="dialog" aria-modal="true" aria-labelledby="structured-title" lang={language} className="fixed inset-0 z-50 bg-slate-950/80 overflow-y-auto p-4 sm:p-6">
 <form className="max-w-5xl mx-auto bg-white rounded-2xl p-4 sm:p-6 space-y-5" onSubmit={async e=>{
  e.preventDefault();setError('');
  if(!title.trim()){setError(t('Idea title'));return;}
  const validation=validateDraft(changes);
  if(validation){setError(t(validation));return;}
  if(record&&!Object.keys(changes).length&&!cleared.length){onClose();return;}
  setBusy(true);
  try{
   let result=record;
   if(!record||Object.keys(changes).length)result=await api<ScreeningRecord>(record?'/submissions/'+encodeURIComponent(record.id)+'/fields':'/pipeline/process-structured',{title:title.trim(),language,region,cohortId:cohort||null,fields:changes});
   if(record&&cleared.length)result=await api<ScreeningRecord>('/submissions/'+encodeURIComponent(record.id)+'/confirm-fields',{fields:[],rejected:cleared});
   if(result)onSubmit(result);onClose();
  }catch(e){setError(t((e as Error).message,{defaultValue:(e as Error).message}));}finally{setBusy(false);}
 }}>
 <div className="flex justify-between gap-3"><h2 id="structured-title" className="text-xl font-bold">{t('structured')}</h2><button aria-label={t('Close')} type="button" disabled={busy} onClick={onClose} className="p-2">✕</button></div>
 <p className="text-sm text-slate-500">{t('formIntroduction')}</p>
 {optionsWarning&&<p role="status" className="text-amber-800 bg-amber-50 p-3 rounded-xl">{t('onlineOptionsUnavailable')}</p>}
 <div className="grid sm:grid-cols-2 gap-3">
  <label>{t('Title')}<input autoFocus required disabled={!!record} maxLength={200} className="block border p-2 rounded-xl w-full" value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>{t('Region')}<input disabled={!!record} maxLength={200} className="block border p-2 rounded-xl w-full" value={region} onChange={e=>setRegion(e.target.value)}/></label>
  <div className="text-sm bg-teal-50 rounded-xl p-3"><strong>{t('field_trade')}</strong><p>{record?.trade?t(record.trade,{defaultValue:record.trade}):t('automaticCategoryNotice')}</p></div>
  <label>{t('Cohort')}<select disabled={!!record} className="block border p-2 rounded-xl w-full" value={cohort} onChange={e=>setCohort(e.target.value)}><option value="">{t('Not assigned')}</option>{cohort&&!cohorts.some(c=>c.id===cohort)&&<option value={cohort}>{cohort}</option>}{cohorts.map(c=><option key={c.id} value={c.id}>{c.name||c.id}</option>)}</select></label>
 </div>
 {Object.entries(schema.modules).map(([module,fields])=><fieldset key={module} className="border rounded-xl p-4"><legend className="font-bold">{t(({overview:'Overview',market:'Market',finance:'Finance',operations:'Operations',risk:'Risk'} as Record<string,string>)[module]||module)}</legend><div className="grid sm:grid-cols-2 gap-4">{fields.filter(field=>!(module==='overview'&&field==='trade')).map(field=>{
  const key=module+'.'+field;const current=values[key]||{value:''};const set=(patch:Partial<FactDraft>)=>setValues(previous=>({...previous,[key]:{...current,...patch}}));
  return <div key={key}><label className="block text-sm">{t(fieldName(key),{defaultValue:field})}{schema.critical.includes(key)?' *':''}
   <input maxLength={2000} className="block border rounded p-2 w-full" value={current.value} onChange={e=>set({value:e.target.value})}/>
  </label>
  {current.value&&record?.facts[key]?.reviewValue&&!record.facts[key].validation.valid&&<p className="text-xs text-amber-800 mt-1">{t('Extracted estimate — review before saving')}</p>}
  {record?.facts[key]?.confirmed&&<p className="text-xs text-teal-700 mt-1">{t('Confirmed')} · {t('changesNeedConfirmation')}</p>}
  {module==='finance'&&current.value&&<div className="grid grid-cols-2 gap-2 mt-2 text-xs">
   <label>{t('Explicit amount')}<input type="number" min={0} step="any" aria-label={t(fieldName(key))+' · '+t('Explicit amount')} value={current.amount??''} className="border p-2 rounded w-full" onChange={e=>set({amount:e.target.value===''?undefined:Number(e.target.value)})}/></label>
   <label>{t('Currency e.g. INR')}<input className="border p-2 rounded w-full" maxLength={20} value={current.currency||''} onChange={e=>set({currency:e.target.value||undefined})}/></label>
   <label>{t('Unit e.g. jar')}<input className="border p-2 rounded w-full" maxLength={100} value={current.unit||''} onChange={e=>set({unit:e.target.value||undefined})}/></label>
   <label>{t('Period (if applicable)')}<select className="border p-2 rounded w-full" value={current.period||''} onChange={e=>set({period:e.target.value||undefined})}><option value="">{t('Period (if applicable)')}</option><option value="month">{t('Per month')}</option><option value="once">{t('One-time')}</option></select></label>
   {field==='monthlyExpenses'&&<label className="col-span-2">{t('Choose expense basis (required for profit)')}<select className="border p-2 rounded w-full" value={current.costBasis||''} onChange={e=>set({costBasis:(e.target.value||undefined) as FactDraft['costBasis']})}><option value="">{t('Choose expense basis (required for profit)')}</option><option value="fixed">{t('Fixed costs only')}</option><option value="total">{t('Total operating costs including variable costs')}</option><option value="variable">{t('Variable costs only')}</option></select></label>}
   <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!current.estimate} onChange={e=>set({estimate:e.target.checked})}/>{t('Beneficiary estimate')}</label>
  </div>}
  </div>;
 })}</div></fieldset>)}
 {error&&<p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
 <div className="sticky bottom-0 bg-white border-t py-3 flex justify-between gap-3"><button type="button" disabled={busy} className="border rounded-xl px-4 py-2" onClick={onClose}>{t('Cancel')}</button><button disabled={busy} className="bg-teal-600 text-white rounded-xl px-5 py-3 disabled:opacity-50">{busy?t('Saving…'):t('save')}</button></div>
 </form></div>;
}
