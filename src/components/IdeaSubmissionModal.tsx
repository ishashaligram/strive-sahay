import {ui} from '../services/uiI18n';
import React, {useRef, useState, useEffect} from 'react';
import {X, Mic, Square, Sparkles} from 'lucide-react';
import {SupportedLanguage} from '../types';
import {api, ScreeningRecord} from '../services/screeningApi';
import {AudioService} from '../services/audioService';

export const IdeaSubmissionModal = ({isOpen, onClose, currentLang, onSubmit}: {isOpen: boolean; onClose: () => void; currentLang: SupportedLanguage; onSubmit: (record: ScreeningRecord) => void}) => {
  const t=ui(currentLang);
  const [title,setTitle] = useState('');
  const [text,setText] = useState('');
  const [language,setLanguage] = useState('auto');
  const [mediaIds,setMediaIds]=useState<string[]>([]);
  const [kind,setKind] = useState<'text'|'audio'|'document'>('text');
  const [busy,setBusy] = useState('');
  const [elapsed,setElapsed] = useState(0);
  const [error,setError] = useState('');
  const [documentWarnings,setDocumentWarnings]=useState<string[]>([]);
  const [recording,setRecording] = useState(false);
  const recorder = useRef(new AudioService());
  useEffect(() => {
    setElapsed(0);
    if(!busy)return;
    const started=Date.now();
    const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);
    return ()=>window.clearInterval(timer);
  },[busy]);
  useEffect(() => () => {recorder.current.cancelRecording();}, []);
  if (!isOpen) return null;
  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label); setError('');
    try {await task();} catch(e) {setError(t((e as Error).message,{defaultValue:(e as Error).message}));} finally {setBusy('');}
  };
  const upload = (file: File) => run(t("Reading document…"), async () => {
    if(file.size>15*1024*1024)throw new Error('File exceeds 15 MB limit');
    if(!/\.(pdf|docx|txt|md)$/i.test(file.name))throw new Error('Unsupported document format');
    const form = new FormData(); form.append('file',file);form.append('language',language);
    const result = await api<{text: string;uploadId:string;warnings?:string[]}>('/pipeline/process-document',form);
    setKind('document'); setText(result.text);setMediaIds([result.uploadId]);setDocumentWarnings(result.warnings||[]);
  });
  const toggleRecording = () => run(recording ? t("Transcribing speech…") : t("Opening microphone…"), async () => {
    if (!recording) {await recorder.current.startRecording(); setRecording(true); return;}
    setRecording(false);
    const result = await recorder.current.stopRecording();
    const form = new FormData(); form.append('file',result.audioBlob,'pitch.webm'); form.append('language',language);
    try{const transcript = await api<{original_transcript: string;uploadId:string}>('/pipeline/process-voice',form);
    setText(transcript.original_transcript); setKind('audio');setMediaIds([transcript.uploadId]);}finally{URL.revokeObjectURL(result.audioUrl);}
  });
  return <div role="dialog" aria-modal="true" aria-labelledby="pitch-title" lang={currentLang} className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-6 flex items-start justify-center">
    <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden">
      <header className="bg-slate-900 text-white p-6 flex justify-between"><div><p className="text-teal-400 text-xs font-bold">STRIVE Pitch Pipeline</p><h2 id="pitch-title" className="text-xl font-bold">{t('Upload / type business pitch')}</h2></div><button aria-label={t("Close")} disabled={!!busy || recording} onClick={onClose}><X/></button></header>
      <form className="p-6 space-y-4" onSubmit={e => {e.preventDefault(); void run(t('Processing…'),async () => {if(text.trim().length<3)throw new Error('Enter at least three characters');const result = await api<ScreeningRecord>('/pipeline/process-text',{title,text,language,input_type:kind,interaction_language:currentLang,media_ids:mediaIds}); onSubmit(result); onClose();});}}>
        <label className="block">{t("Idea title")}<input required maxLength={200} className="block border rounded-xl p-3 w-full" value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label className="block">{t("Source language (override detection if needed)")}<select className="block border rounded-xl p-3 w-full" value={language} onChange={e=>setLanguage(e.target.value)}><option value="auto">{t("Detect automatically")}</option>{Object.entries({en:'English',hi:'हिन्दी',mr:'मराठी',ta:'தமிழ்',te:'తెలుగు',kn:'ಕನ್ನಡ',bn:'বাংলা',or:'ଓଡ଼ିଆ'}).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
        <div className="flex flex-wrap gap-4"><button type="button" disabled={!!busy} onClick={toggleRecording} className="border rounded-xl px-4 py-2 flex gap-2">{recording ? <Square/> : <Mic/>}{recording ? t("Stop and transcribe") : t("Record pitch")}</button><label className="border rounded-xl px-4 py-2 cursor-pointer">{t("Upload PDF / DOCX / text")}<input disabled={!!busy || recording} type="file" accept=".pdf,.docx,.txt,.md" className="block text-xs" onChange={e=>{if(e.target.files?.[0]) void upload(e.target.files[0]);}}/></label></div>
        <label className="block text-sm">{t("Or upload an audio recording")}<input type="file" accept="audio/*,video/mp4,.mp4,.ogg,.m4a,.wav,.mp3,.webm,.flac" disabled={!!busy||recording} onChange={e=>{const file=e.target.files?.[0];if(file)void run(t('Transcribing speech…'),async()=>{if(file.size>15*1024*1024)throw new Error('File exceeds 15 MB limit');const form=new FormData();form.append('file',file);form.append('language',language);const result=await api<{original_transcript:string;uploadId:string}>('/pipeline/process-voice',form);setText(result.original_transcript);setMediaIds([result.uploadId]);setKind('audio');});}}/></label>
        <label className="block">{t("Review your original pitch / transcript")}<textarea required minLength={3} maxLength={40000} rows={8} value={text} onChange={e=>setText(e.target.value)} className="block border rounded-xl p-3 w-full"/></label>
        {documentWarnings.length>0&&<p role="status" className="bg-amber-50 text-amber-900 p-3 rounded-xl">{t('overwrittenDocumentNotice')}</p>}
        <p className="text-xs text-slate-500">{t('reviewTranscriptNotice')}</p>
        {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
        {busy && <div role="status" className="text-teal-700"><p>{busy} {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</p><p className="text-sm text-slate-500">{t('Local AI checks extracted facts against your document. This can take a few minutes. Keep this window open.')}</p></div>}
        <button disabled={!!busy || recording} className="bg-teal-600 text-white p-3 rounded-xl disabled:opacity-50 flex gap-2"><Sparkles/>{t("Extract and review facts")}</button>
      </form>
    </div>
  </div>;
};
