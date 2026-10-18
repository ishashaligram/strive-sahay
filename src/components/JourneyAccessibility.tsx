import React,{useEffect,useRef,useState} from 'react';
import {api} from '../services/screeningApi';
import {AudioService} from '../services/audioService';
import {VOICE_LANG,JOURNEY_COPY} from '../services/simpleJourney';
import {SupportedLanguage} from '../types';
export function pageTextForSpeech(root:HTMLElement|null):string{
 if(!root)return '';
 const read=(node:Node):string=>{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';
  if(!(node instanceof HTMLElement)||node.hidden||node.getAttribute('aria-hidden')==='true'||node.hasAttribute('data-skip-read'))return '';
  if(node instanceof HTMLSelectElement)return node.selectedOptions[0]?.textContent||'';
  if(node instanceof HTMLTextAreaElement)return node.value+'\n';
  if(node instanceof HTMLInputElement)return ['checkbox','radio'].includes(node.type)?'':node.value+'\n';
  if(node instanceof HTMLDetailsElement&&!node.open)return node.querySelector('summary')?.textContent||'';
  return Array.from(node.childNodes).map(read).join(' ')+(/^(P|DIV|SECTION|H[1-6]|LI|LABEL|BUTTON)$/.test(node.tagName)?'\n':'');
 };
 return read(root).replace(/[ \t]+/g,' ').trim();
}
export function useJourneyCopy(language:SupportedLanguage){
 const [copy,setCopy]=useState(JOURNEY_COPY),[pending,setPending]=useState(false),[translationError,setTranslationError]=useState('');
 useEffect(()=>{let live=true;setTranslationError('');setCopy(JOURNEY_COPY);if(language==='en'){setPending(false);return;}const key='journey-copy-v2-'+language;try{const saved=sessionStorage.getItem(key);if(saved){setCopy(JSON.parse(saved));setPending(false);return;}}catch{}setPending(true);const keys=Object.keys(JOURNEY_COPY) as (keyof typeof JOURNEY_COPY)[];void api<{translated_text:string}>('/translation/translate',{text:keys.map(k=>JOURNEY_COPY[k]).join('\n'),source:'en',target:language}).then(result=>{const values=result.translated_text.split('\n');if(values.length!==keys.length)throw new Error('Translation layout changed');const next=Object.fromEntries(keys.map((k,i)=>[k,values[i]])) as typeof JOURNEY_COPY;if(live){setCopy(next);sessionStorage.setItem(key,JSON.stringify(next));}}).catch(()=>{if(live)setTranslationError('Page translation is unavailable. English is shown; please retry by selecting your language again.');}).finally(()=>{if(live)setPending(false);});return()=>{live=false;};},[language]);
 return {copy,pending,translationError};
}
export function ReadPage({language,text,labels,disabled}:{language:SupportedLanguage;text:()=>string;labels:typeof JOURNEY_COPY;disabled?:boolean}){
 const [reading,setReading]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0),audio=useRef<HTMLAudioElement|null>(null);
 const stop=()=>{sequence.current++;audio.current?.pause();audio.current=null;if('speechSynthesis' in window)window.speechSynthesis.cancel();setReading(false);};
 useEffect(()=>()=>{sequence.current++;audio.current?.pause();if('speechSynthesis' in window)window.speechSynthesis.cancel();},[language]);
 const read=async()=>{
  setError('');if(reading){stop();return;}
  const content=text();const ticket=++sequence.current;setReading(true);
  const synth='speechSynthesis' in window?window.speechSynthesis:null;
  const voice=synth?.getVoices().find(v=>v.lang.split('-')[0]===language);
  if(synth&&(voice||language==='en')){
   synth.cancel();const chunks=content.match(/[^.!?।\n]+[.!?।\n]*/g)||[];
   chunks.forEach((chunk,index)=>{const utterance=new SpeechSynthesisUtterance(chunk);utterance.lang=VOICE_LANG[language];if(voice)utterance.voice=voice;utterance.rate=.85;utterance.onerror=()=>{setReading(false);setError(labels.readUnavailable);};if(index===chunks.length-1)utterance.onend=()=>setReading(false);synth.speak(utterance);});if(!chunks.length)setReading(false);return;
  }
  try{
   let remaining=content;
   while(remaining.trim()&&ticket===sequence.current){
    let end=Math.min(600,remaining.length);if(end<remaining.length){const space=remaining.lastIndexOf(' ',end);if(space>250)end=space;}
    const chunk=remaining.slice(0,end);remaining=remaining.slice(end);
    const response=await api<{audio_base64:string;mime_type:string}>('/speech/read',{text:chunk,language});
    if(ticket!==sequence.current)break;
    const player=new Audio('data:'+response.mime_type+';base64,'+response.audio_base64);audio.current=player;
    await new Promise<void>((resolve,reject)=>{player.onended=()=>resolve();player.onpause=()=>{if(ticket!==sequence.current)resolve();};player.onerror=()=>reject(new Error(labels.readUnavailable));void player.play().catch(reject);});
    player.src='';audio.current=null;
   }
  }catch{if(ticket===sequence.current)setError(labels.readUnavailable);}finally{if(ticket===sequence.current)setReading(false);}
 };
 return <div data-skip-read><button type="button" disabled={disabled} className="border-2 border-teal-700 text-teal-900 rounded-xl px-4 py-3 text-lg" onClick={()=>void read()}>{reading?'■':'🔊'} {reading?labels.stop:labels.listen}</button>{error&&<p role="status" className="text-amber-800 mt-2">{error}</p>}</div>;
}
export function VoiceAnswer({language,onText,labels,disabled}:{language:SupportedLanguage;onText:(text:string)=>void;labels:typeof JOURNEY_COPY;disabled?:boolean}){
 const recorder=useRef(new AudioService());const [recording,setRecording]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');useEffect(()=>()=>recorder.current.cancelRecording(),[]);
 const toggle=async()=>{setError('');try{if(!recording){await recorder.current.startRecording();setRecording(true);}else{setRecording(false);setBusy(true);const audio=await recorder.current.stopRecording();try{const form=new FormData();form.append('file',audio.audioBlob,'answer.webm');form.append('language',language);const result=await api<{original_transcript:string}>('/pipeline/process-voice',form);onText(result.original_transcript);}finally{URL.revokeObjectURL(audio.audioUrl);}}}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <div><button type="button" disabled={disabled||busy} className="border rounded-xl p-3 text-lg disabled:opacity-50" onClick={()=>void toggle()}>{busy?labels.loading:recording?'■ '+labels.stopRecord:'🎙 '+labels.speak}</button>{error&&<p role="alert" className="text-red-700">{error}</p>}</div>;
}

