import { auth } from './firebase';
export interface Source { metadata?:{period?:string;costBasis?:'fixed'|'total'|'variable'}; id: string; original: string; english: string; language: string; detectedLanguage: string; translationUncertain: boolean }
export interface Fact { displayValues?:Record<string,string>; confirmed?: boolean; isEstimate?: boolean; field: string; value: string | null; status: string; claims: {value: string; evidence: string; source_id: string;period?:string;costBasis?:'fixed'|'total'|'variable'; amount: number | null; currency: string | null; unit: string | null}[]; validation: {valid: boolean; errors: string[]} }
export interface Question { id: string; field: string; text: string; rationale: string; guidance: string; localizedGuidance?: Record<string,string>; localizedRationale?: Record<string,string>; status: string; answer?: string; translations: Record<string,string> }
export interface Score { assessmentType?: string; stale?: boolean; status: string; overallScore: number; completeness: number; confidence: string; feasibility: string; scoreMeaning: string; domains: Record<string,{weight: number; rating: number; supportedFields: string[]; missingFields: string[]}>; unitContribution: {amount: number; currency: string; unit: string; label: string} | null }
export interface Report { strengths: string[]; weaknesses: string[]; recommendations: string[]; explanation: string; remainingUnknowns: string[] }
export interface Plan {sections:Record<string,string>;method:string;language:string}
export interface Financials {calculations:Record<string,{amount:number;formula:string;unit:string}>;warnings:string[];assumptions:string[];scenarios:{scenario:string;quantity:number;revenue:number;profit:number}[]}
export interface ScreeningRecord { mediaIds?:string[];updatedAt?:string;createdAt?:string; cohortId?:string;region?:string;trade?:string;criticalMissing?:string[];
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
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 600000);
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : (sessionStorage.getItem('screening_access_token') || '');
    if (token) sessionStorage.setItem('screening_access_token', token);
    const response = await fetch(apiUrl(path), {method: body === undefined ? 'GET' : 'POST', headers: {Authorization: 'Bearer ' + token, ...(body instanceof FormData ? {} : {'Content-Type': 'application/json'})}, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: controller.signal});
    const data = await response.json().catch(() => {throw new Error('Backend returned an unreadable response');});
    if (!response.ok) {
      const details=typeof data.detail==='string'?data.detail:Array.isArray(data.detail)?data.detail.map((item:{msg?:string})=>item.msg||'Invalid input').join('; '):'Request failed';
      throw new ApiError(details,response.status,response.status===401||response.status===403?'AUTH':response.status===409?'WORKFLOW':response.status>=500?'SERVICE':'VALIDATION');
    }
    return data as T;
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Backend unavailable. Start the screening API and retry.');
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Processing timed out. Refresh saved progress before retrying.');
    throw error;
  } finally { window.clearTimeout(timer); }
}

export async function downloadOriginal(id:string){
 const token = auth.currentUser ? await auth.currentUser.getIdToken() : (sessionStorage.getItem('screening_access_token') || '');
 const response=await fetch(apiUrl('/media/'+encodeURIComponent(id)),{headers:{Authorization:'Bearer '+token}});
 if(!response.ok)throw new Error('Original upload is unavailable or access was denied');
 const blob=await response.blob();const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='original-upload';a.click();URL.revokeObjectURL(url);
}

export function assertScreeningRecord(value:unknown):asserts value is ScreeningRecord{
 const record=value as Partial<ScreeningRecord>|null;
 if(!record||typeof record.id!=='string'||typeof record.state!=='string'||!record.facts||typeof record.facts!=='object'||!Array.isArray(record.sources)||!Array.isArray(record.questions)){
  throw new ApiError('Backend response does not match the screening contract',502,'CONTRACT');
 }
}
