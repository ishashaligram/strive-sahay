import React from 'react';
import {SupportedLanguage} from '../types';
import {ui} from '../services/uiI18n';
export function JourneyProgress({state,language}:{state:string;language:SupportedLanguage}){
 const t=ui(language);
 const stages=['Submit idea','Review facts','Clarify','Assessment','Human review','Program decision'];
 const index=({DRAFT:0,EXTRACTED:1,PROVISIONALLY_SCORED:2,CLARIFICATION:2,FINAL_SCORED:3,READY_FOR_ASSESSOR:4,SUBMITTED:4,CLARIFICATION_REQUIRED:4,AWAITING_BENEFICIARY:4,MENTORING_REQUIRED:2,ADMIN_REVIEW:5,PROGRAM_DECIDED:5} as Record<string,number>)[state]??0;
 return <nav aria-label={t('Business readiness journey')} className="bg-white border rounded-2xl p-4 overflow-x-auto"><ol className="grid grid-cols-3 lg:grid-cols-6 gap-3">{stages.map((stage,i)=><li key={stage} aria-current={i===index?'step':undefined} className={'rounded-xl border p-3 text-sm '+(i===index?'bg-teal-50 border-teal-500 text-teal-900':i<index?'border-slate-200 text-slate-700':'border-slate-100 text-slate-400')}><span className="block text-xs mb-1">{i<index?'✓ ':''}{i+1}</span>{t(stage)}</li>)}</ol></nav>;
}
