import {getSessionToken} from './sessionAuth';
export interface Source { metadata?:{period?:string;costBasis?:'fixed'|'total'|'variable'}; id: string; original: string; english: string; language: string; detectedLanguage: string; translationUncertain: boolean }
export interface Fact { displayValues?:Record<string,string>; confirmed?: boolean; isEstimate?: boolean; field: string; value: string | null; status: string; claims: {value: string; evidence: string; source_id: string;period?:string;costBasis?:'fixed'|'total'|'variable'; amount: number | null; currency: string | null; unit: string | null}[]; validation: {valid: boolean; errors: string[]} }
export interface Question { id: string; field: string; text: string; rationale: string; guidance: string; localizedGuidance?: Record<string,string>; localizedRationale?: Record<string,string>; status: string; answer?: string; translations: Record<string,string> }
export interface Score { assessmentType?: string; stale?: boolean; status: string; overallScore: number; completeness: number; confidence: string; feasibility: string; scoreMeaning: string; domains: Record<string,{weight: number; rating: number; supportedFields: string[]; missingFields: string[]}>; unitContribution: {amount: number; currency: string; unit: string; label: string} | null }
export interface Report { strengths: string[]; weaknesses: string[]; recommendations: string[]; explanation: string; remainingUnknowns: string[] }
export interface Plan {sections:Record<string,string>;method:string;language:string}
export interface Financials {calculations:Record<string,{amount:number;formula:string;unit:string}>;warnings:string[];assumptions:string[];scenarios:{scenario:string;quantity:number;revenue:number;profit:number}[]}
export interface ScreeningRecord { category?:{name:string|null;status:'DETECTED'|'NEEDS_CLARIFICATION';evidence:string|null;sourceField:string;method:string}; mediaIds?:string[];updatedAt?:string;createdAt?:string; cohortId?:string;region?:string;trade?:string;criticalMissing?:string[];
 financialTranslations?:Record<string,Financials>;financials?:Financials;businessPlan?:Plan;businessPlanTranslations?:Record<string,Plan>;assessmentVersions?:Score[];
 recommendation?:{feedbackLanguage?:string;translations?:Record<string,string>;recommendation:string;reason:string;feedbackTranslated:string};
 adminDecision?:{explanationLanguage?:string;translations?:Record<string,string>;decision:string;reason:string;explanationTranslated:string;scope:string};
 humanQuestions?:{targetLanguage?:string;translations?:Record<string,string>;id:string;question:string;translated:string;answer?:string;status:string}[];
 roadmap?:{localizedLanguage?:string;translations?:Record<string,Record<string,string>>;id:string;title:string;reason:string;instruction:string;evidenceNeeded:string;day:number;status:string;localized?:Record<string,string>}[];
 id: string; owner: string; assessor: string | null; title: string; maxQuestions: number; state: string; assessorReview?: {feedback: string; feedbackTranslated: string; language: string; decision: string; finalScore: number; at: string}; language: string; sources: Source[]; facts: Record<string,Fact>; questions: Question[]; provisionalScore?: Score; currentScore?: Score; finalScore?: Score; report?: Report; reportTranslations?: Record<string,Report>; submittedAt?: string; history: {state: string; at: string}[] }

// Public routing configuration only. Credentials must stay in server environment variables.
export function apiUrl(path:string){
 const base=(import.meta.env?.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
 return base+'/'+path.replace(/^\//,'');
}
export class ApiError extends Error{
 constructor(message:string,public status:number,public code:string){super(message);this.name='ApiError';}
}
let diagnosticSequence=0;
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const diagnosticId=++diagnosticSequence;
  const label=path.split('?')[0].replace(/\b[0-9a-f-]{16,}\b/gi,':id');
  const started=performance.now();
  const method=body===undefined?'GET':'POST';
  console.info(`[STRIVE API #${diagnosticId}] START`,{method,route:label});
  const waiting=window.setInterval(()=>console.info(`[STRIVE API #${diagnosticId}] WAITING`,{route:label,elapsedSeconds:Math.round((performance.now()-started)/1000)}),15000);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 600000);
  try {
    const token = await getSessionToken();
    const response = await fetch(apiUrl(path), {method: body === undefined ? 'GET' : 'POST', headers: {Authorization: 'Bearer ' + token, ...(body instanceof FormData ? {} : {'Content-Type': 'application/json'})}, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: controller.signal});
    const durationMs=Math.round(performance.now()-started);
    const summary={route:label,status:response.status,durationMs,requestId:response.headers.get('X-Request-ID')};
    if(durationMs>10000)console.warn(`[STRIVE API #${diagnosticId}] SLOW RESPONSE`,summary);
    else console.info(`[STRIVE API #${diagnosticId}] RESPONSE`,summary);
    const data = await response.json().catch(() => {throw new Error('Backend returned an unreadable response');});
    if (!response.ok) {
      const details=typeof data.detail==='string'?data.detail:Array.isArray(data.detail)?data.detail.map((item:{msg?:string})=>item.msg||'Invalid input').join('; '):'Request failed';
      throw new ApiError(details,response.status,response.status===401||response.status===403?'AUTH':response.status===409?'WORKFLOW':response.status>=500?'SERVICE':'VALIDATION');
    }
    return data as T;
  } catch (error) {
    console.error(`[STRIVE API #${diagnosticId}] FAILED`,{route:label,elapsedMs:Math.round(performance.now()-started),type:error instanceof ApiError?error.code:error instanceof Error?error.name:'UnknownError'});
    if (error instanceof TypeError) throw new Error('Backend unavailable. Start the screening API and retry.');
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Processing timed out. Refresh saved progress before retrying.');
    throw error;
  } finally { window.clearTimeout(timer);window.clearInterval(waiting); }
}

export async function downloadOriginal(id:string){
 const token = await getSessionToken();
 const response=await fetch(apiUrl('/media/'+encodeURIComponent(id)),{headers:{Authorization:'Bearer '+token}});
 if(!response.ok)throw new Error('Original upload is unavailable or access was denied');
 const blob=await response.blob();const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='original-upload';a.click();URL.revokeObjectURL(url);
}

function object(value:unknown):value is Record<string,any>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function strings(value:unknown){return Array.isArray(value)&&value.every(item=>typeof item==='string');}
export function assertScreeningRecord(value:unknown):asserts value is ScreeningRecord{
 const fail=()=>{throw new ApiError('Backend response does not match the screening contract',502,'CONTRACT');};
 if(!object(value)||typeof value.id!=='string'||typeof value.state!=='string'||typeof value.title!=='string'||!object(value.facts)||!Array.isArray(value.sources)||!Array.isArray(value.questions))return fail();
 for(const source of value.sources)if(!object(source)||typeof source.original!=='string'||typeof source.id!=='string')return fail();
 for(const fact of Object.values(value.facts))if(!object(fact)||typeof fact.status!=='string'||!(fact.value===null||typeof fact.value==='string')||!Array.isArray(fact.claims)||!fact.claims.every(object)||!object(fact.validation)||typeof fact.validation.valid!=='boolean'||!strings(fact.validation.errors))return fail();
 for(const question of value.questions)if(!object(question)||typeof question.id!=='string'||typeof question.field!=='string'||typeof question.text!=='string'||typeof question.status!=='string'||!object(question.translations))return fail();
 for(const score of [value.currentScore,value.provisionalScore,value.finalScore].filter(item=>item!=null)){
  if(!object(score)||!Number.isFinite(score.overallScore)||!object(score.domains))return fail();
  for(const domain of Object.values(score.domains))if(!object(domain)||!Number.isFinite(domain.rating)||!Number.isFinite(domain.weight)||!strings(domain.supportedFields)||!strings(domain.missingFields))return fail();
 }
 for(const report of [value.report,...Object.values(value.reportTranslations||{})].filter(item=>item!=null))if(!object(report)||typeof report.explanation!=='string'||!['strengths','weaknesses','recommendations','remainingUnknowns'].every(key=>strings(report[key])))return fail();
 for(const plan of [value.businessPlan,...Object.values(value.businessPlanTranslations||{})].filter(item=>item!=null))if(!object(plan)||!object(plan.sections)||!Object.values(plan.sections).every(text=>typeof text==='string'))return fail();
 for(const finances of [value.financials,...Object.values(value.financialTranslations||{})].filter(item=>item!=null))if(!object(finances)||!object(finances.calculations)||!Object.values(finances.calculations).every(object)||!strings(finances.warnings)||!strings(finances.assumptions)||!Array.isArray(finances.scenarios)||!finances.scenarios.every(object))return fail();
 for(const key of ['roadmap','humanQuestions'])if(value[key]!=null&&(!Array.isArray(value[key])||!value[key].every(object)))return fail();
}
