import {ui,knownText} from '../services/uiI18n';
import {fieldName,LOCKED_STATES} from '../services/businessForm';
import {TranslationNotice} from './TranslationNotice';
import React, {useState, useRef, useEffect} from 'react';
import {SupportedLanguage} from '../types';
import {ScreeningRecord, api} from '../services/screeningApi';
import {AudioService} from '../services/audioService';

export function SplitScreenMentor({record, busy, onAction, onUpdate}: {record: ScreeningRecord; busy: boolean; onAction: (path: string, body?: unknown) => Promise<void>; onUpdate: (r: ScreeningRecord) => void}) {
  const t=ui(record.language as SupportedLanguage);
  const pending = record.questions.find(q=>q.status==='pending');
  const [editing,setEditing] = useState('');
  const question = editing ? record.questions.find(q=>q.id===editing) : pending;
  const [answer,setAnswer] = useState('');
  const [recording,setRecording] = useState(false);
  const [voiceBusy,setVoiceBusy] = useState(false);
  const [voiceError,setVoiceError] = useState('');
  const recorder = useRef(new AudioService());
  useEffect(()=>()=>recorder.current.cancelRecording(),[]);
  useEffect(()=>{setAnswer(question?.answer || '');},[record.id,question?.id]);
  const locked = busy || LOCKED_STATES.has(record.state);
  const send = async (dontKnow=false) => {
    if (!question) return;
    try {
      await onAction('/clarification/'+record.id+'/answer',{question_id:question.id,answer,language:record.language,dont_know:dontKnow});
      setAnswer(''); setEditing('');
    } catch { /* Keep the answer available for retry; parent displays the error. */ }
  };
  const voice = async () => {
    setVoiceBusy(true); setVoiceError('');
    try {
      if(!recording) {await recorder.current.startRecording(); setRecording(true);}
      else {setRecording(false); const res=await recorder.current.stopRecording(); const form=new FormData(); form.append('file',res.audioBlob,'answer.webm'); form.append('language',record.language); const transcript=await api<{original_transcript:string}>('/pipeline/process-voice',form); setAnswer(transcript.original_transcript); URL.revokeObjectURL(res.audioUrl);}
    } catch(e) {setVoiceError(t((e as Error).message,{defaultValue:(e as Error).message}));} finally {setVoiceBusy(false);}
  };
  return <div className="grid lg:grid-cols-12 gap-6">
    <section className="lg:col-span-5 bg-white border rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-bold">{t("AI clarification & mentoring")}</h2><p className="text-xs text-slate-500">{record.questions.filter(q=>q.status!=='pending').length} {t('Saved responses')} · {t('Question limit')}: {record.maxQuestions}</p>
      {question && !locked ? <>
        <TranslationNotice language={record.language as SupportedLanguage} pending={!question.translations[record.language]}/><p className="font-semibold">{question.translations[record.language] || question.text}</p>
        <details><summary>{t("Why this matters / AI guidance")}</summary><p>{question.localizedRationale?.[record.language] || question.rationale}</p><p>{question.localizedGuidance?.[record.language] || question.guidance}</p></details>
        <textarea aria-label="Your answer" rows={4} className="border rounded-xl p-3 w-full" value={answer} onChange={e=>setAnswer(e.target.value)}/>
        <div className="flex flex-wrap gap-2"><button disabled={busy || voiceBusy || recording || !answer.trim()} className="bg-teal-600 text-white p-3 rounded-xl disabled:opacity-50" onClick={()=>void send()}>{t("Save answer")}</button><button disabled={busy || voiceBusy || recording} className="border p-3 rounded-xl" onClick={()=>void send(true)}>{t("I don't know yet")}</button><button disabled={busy || voiceBusy} className="border p-3 rounded-xl" onClick={()=>void voice()}>{recording?t("Stop recording"):t("Voice answer")}</button></div>
        {voiceError && <p role="alert">{voiceError}</p>}
      </> : !locked && !record.finalScore && <div className="flex flex-wrap gap-2"><button disabled={busy} className="bg-teal-600 text-white p-3 rounded-xl" onClick={()=>void onAction('/clarification/'+record.id+'/round',{}).catch(()=>{})}>{t("Get contextual question round (up to 5)")}</button><button disabled={busy} className="border p-3 rounded-xl" onClick={()=>void onAction('/submissions/'+record.id+'/finalize',{}).catch(()=>{})}>{t("Generate final report")}</button></div>}
      {record.questions.map(q=><details key={q.id} className="border-t pt-3"><summary>{knownText(q.status,record.language as SupportedLanguage)}: {q.translations[record.language]||q.text}</summary><p className="whitespace-pre-wrap">{q.answer || t('Unknown')}</p>{!locked && q.status!=='pending' && <button disabled={busy} className="text-teal-700" onClick={()=>{setEditing(q.id);setAnswer(q.answer||'');}}>{t("Edit answer")}</button>}</details>)}
      <p className="text-xs text-slate-500">{t('pendingQuestionsNotice')}</p>
    </section>
    <section className="lg:col-span-7 bg-white border rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-bold">{t("Validated business fact sheet")}</h2>
      {Object.entries(record.facts).map(([key,fact])=><div key={key} className="border rounded-xl p-3">
        <div className="flex justify-between gap-2"><strong>{t(fieldName(key),{defaultValue:key})}</strong><span className={fact.status==='PROVIDED'?'text-teal-700 text-xs':'text-amber-700 text-xs'}>{knownText(fact.status,record.language as SupportedLanguage)}</span></div>
        <p>{fact.displayValues?.[record.language] || fact.value || (fact.status==='UNCLEAR'?t('Needs clarification'):fact.status==='CONFLICTING'?t('Conflicting information'):'—')}</p>
        {fact.claims.map((c,i)=><blockquote key={i} className="text-xs text-slate-500 mt-2">“{c.evidence}” · {t('Source')}: {c.source_id}</blockquote>)}
        {fact.validation.errors.map((e,i)=><p key={i} className="text-xs text-amber-700">{e}</p>)}
        {!locked && <button disabled={busy} className="text-xs text-teal-700 mt-2" onClick={()=>void onAction('/submissions/'+record.id+'/correction-question',{field:key}).catch(()=>{})}>{t("Correct / clarify this fact")}</button>}
      </div>)}
    </section>
  </div>;
}
