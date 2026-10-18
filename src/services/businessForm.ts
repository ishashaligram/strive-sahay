import {ScreeningRecord} from './screeningApi';
export const BUSINESS_MODULES={
 overview:['businessName','trade','productService','proposedLocation','businessStage'],
 market:['targetCustomers','customerProblem','demandEvidence','competition','differentiation','salesChannels'],
 finance:['initialInvestment','availableCapital','unitCost','sellingPrice','expectedSales','revenueAssumptions','monthlyExpenses','requestedFunding'],
 operations:['equipment','suppliers','capacity','skills','staffing','distribution'],
 risk:['marketRisks','financialRisks','operationalRisks','mitigation','compliance'],
} as const;
export const BUSINESS_FIELDS=Object.entries(BUSINESS_MODULES).flatMap(([module,fields])=>fields.map(field=>module+'.'+field));
export const CRITICAL_FIELDS=['overview.productService','overview.proposedLocation','market.targetCustomers','finance.initialInvestment','finance.unitCost','finance.sellingPrice','finance.monthlyExpenses','finance.expectedSales'];
export interface FactDraft {value:string;amount?:number;currency?:string;unit?:string;period?:string;estimate?:boolean;costBasis?:'fixed'|'total'|'variable'}
export function draftFromRecord(record?:ScreeningRecord):Record<string,FactDraft>{
 if(!record)return {};
 return Object.fromEntries(Object.entries(record.facts).filter(([,fact])=>fact.status==='PROVIDED'&&fact.validation.valid&&fact.value!==null).map(([key,fact])=>{
  const claim=fact.claims[0];
  const draft:FactDraft={value:fact.value!,estimate:fact.isEstimate||false};
  if(claim){
   const source=record.sources.find(source=>source.id===claim.source_id);
   const metadata=source?.metadata;
   if(claim.amount!=null)draft.amount=claim.amount;
   if(claim.currency)draft.currency=claim.currency;
   if(claim.unit)draft.unit=claim.unit;
   if(claim.period||metadata?.period)draft.period=claim.period||metadata?.period;
   if(claim.costBasis||metadata?.costBasis)draft.costBasis=claim.costBasis||metadata?.costBasis;
  }
  return [key,draft];
 }));
}
function canonical(value:FactDraft){return JSON.stringify({value:value.value,amount:value.amount??null,currency:value.currency||null,unit:value.unit||null,period:value.period||null,costBasis:value.costBasis||null,estimate:!!value.estimate});}
export function changedFields(values:Record<string,FactDraft>,original:Record<string,FactDraft>={}){
 return Object.fromEntries(Object.entries(values).filter(([key,value])=>value.value.trim()&&(!original[key]||canonical(value)!==canonical(original[key]))));
}
export function validateDraft(values:Record<string,FactDraft>):string|null{
 for(const value of Object.values(values)){
  if(value.amount!==undefined){
   if(!Number.isFinite(value.amount)||value.amount<0)return 'Enter a valid non-negative amount';
   const ascii=value.value.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x0966)).replace(/[০-৯]/g,c=>String(c.charCodeAt(0)-0x09e6)).replace(/[౦-౯]/g,c=>String(c.charCodeAt(0)-0x0c66)).replace(/[೦-೯]/g,c=>String(c.charCodeAt(0)-0x0ce6)).replace(/[௦-௯]/g,c=>String(c.charCodeAt(0)-0x0be6)).replaceAll(',','');
   if(!(ascii.match(/\d+(?:\.\d+)?/g)||[]).some(n=>Number(n)===value.amount))return 'The amount must match a number in the field text';
  }
 }
 return null;
}
export const LOCKED_STATES=new Set(['READY_FOR_ASSESSOR','SUBMITTED','ADMIN_REVIEW','PROGRAM_DECIDED']);
export function fieldName(key:string){return 'field_'+key.split('.').pop();}
export function canSubmitForAssessment(record:ScreeningRecord){
 const score=record.finalScore;
 return record.state==='READY_FOR_ASSESSOR'&&!!score&&!score.stale&&score.assessmentType==='QWEN_EVIDENCE_RATING'&&score.overallScore>=7&&CRITICAL_FIELDS.every(key=>record.facts[key]?.confirmed&&record.facts[key]?.validation.valid&&record.facts[key]?.status==='PROVIDED');
}
export function translationPending(language:string,localized:unknown){return language!=='en'&&!localized;}

export function clearedFields(values:Record<string,FactDraft>,original:Record<string,FactDraft>){
 return Object.keys(original).filter(key=>Object.prototype.hasOwnProperty.call(values,key)&&original[key].value.trim()&&!values[key].value.trim());
}
