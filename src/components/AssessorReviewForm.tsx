import React,{useState} from 'react';
import {ScreeningRecord} from '../services/screeningApi';
export function AssessorReviewForm({record,busy,onAction}:{record:ScreeningRecord;busy:boolean;onAction:(path:string,body:unknown)=>Promise<void>}) {
  const [feedback,setFeedback]=useState('');
  const [decision,setDecision]=useState('NEEDS_FURTHER_REFINEMENT');
  const [overrides,setOverrides]=useState<Record<string,number>>({});
  const [justification,setJustification]=useState('');
  return <form className="bg-white border rounded-2xl p-6 space-y-4" onSubmit={e=>{e.preventDefault();void onAction('/submissions/'+record.id+'/review',{feedback,decision,overrides,justification}).catch(()=>{});}}>
    <h2 className="text-xl font-bold">Human assessor review</h2>
    <label className="block">Decision<select className="block border p-3 rounded-xl w-full" value={decision} onChange={e=>setDecision(e.target.value)}><option value="NEEDS_FURTHER_REFINEMENT">Needs further refinement</option><option value="APPROVED_FOR_INCUBATION">Approved for incubation</option><option value="REJECTED">Rejected</option></select></label>
    <label className="block">Assessor feedback (English)<textarea required minLength={10} maxLength={10000} rows={5} className="block border p-3 rounded-xl w-full" value={feedback} onChange={e=>setFeedback(e.target.value)}/></label>
    <details><summary>Optional score overrides</summary><div className="grid sm:grid-cols-2 gap-3 mt-3">{Object.entries(record.finalScore?.domains||{}).map(([key,d])=><label key={key}>{key} · AI {d.rating}/5<input type="number" min={0} max={5} step={0.1} value={overrides[key]??''} placeholder="Keep AI rating" className="block border rounded p-2 w-full" onChange={e=>setOverrides(prev=>{const next={...prev};if(e.target.value==='')delete next[key];else next[key]=Number(e.target.value);return next;})}/></label>)}</div><label>Justification<textarea className="block border rounded p-2 w-full" value={justification} onChange={e=>setJustification(e.target.value)}/></label></details>
    <button disabled={busy} className="bg-teal-600 text-white rounded-xl p-3">Save human review & translate feedback</button>
  </form>;
}
