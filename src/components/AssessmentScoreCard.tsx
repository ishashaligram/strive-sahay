import React from 'react';
import {ScreeningRecord} from '../services/screeningApi';
import {canFinalize} from '../services/businessForm';
import {SupportedLanguage} from '../types';
import {ui} from '../services/uiI18n';

export function AssessmentScoreCard({record,language}:{record:ScreeningRecord;language:SupportedLanguage}){
 const t=ui(language);
 const demo=record.synthetic&&record.currentScore?.assessmentType==='SYNTHETIC_DEMO_SCORE';
 const score=demo?record.currentScore:record.finalScore?.assessmentType==='QWEN_EVIDENCE_RATING'&&!record.finalScore.stale&&canFinalize(record)?record.finalScore:undefined;
 return <section aria-label={t('Assessment score')} className="rounded-2xl border-2 border-teal-600 bg-teal-50 p-5 flex flex-wrap items-center justify-between gap-4">
  <div><h3 className="font-bold text-teal-950">{t(demo?'Demo score received':'Assessment score received')}</h3><p className="text-sm text-slate-600">{t(demo?'Predefined synthetic example — not a live AI assessment.':score?'Based on reviewed business facts and assessment answers.':'Complete and confirm required facts and category answers, then generate the final assessment.')}</p></div>
  <p className="text-3xl font-extrabold text-teal-900">{score?<><span>{Number(score.overallScore.toFixed(2))}</span><span className="text-xl font-medium"> / 10</span></>:<span className="text-lg">{t('Not yet assessed')}</span>}</p>
 </section>;
}
