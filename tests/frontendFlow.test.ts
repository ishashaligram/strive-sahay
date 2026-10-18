import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StructuredBusinessForm} from '../src/components/StructuredBusinessForm.tsx';
import {BUSINESS_FIELDS,changedFields,draftFromRecord,validateDraft,canSubmitForAssessment,LOCKED_STATES,canFinalize,unresolvedQuestions,ASSESSMENT_DOMAINS} from '../src/services/businessForm.ts';
import {FIELD_IDS,fieldCopy,interfaceCopy,interfaceKeys,STATIC_RESOURCES} from '../src/services/frontendCopy.ts';
import {ScreeningRecord,assertScreeningRecord} from '../src/services/screeningApi.ts';
import {SupportedLanguage} from '../src/types/index.ts';
import {ui} from '../src/services/uiI18n.ts';

const fixture:ScreeningRecord={
 id:'test-profile',owner:'test-beneficiary',assessor:null,title:'Test submitted pitch',language:'en',state:'EXTRACTED',sources:[{id:'pitch',original:'Cost INR 60 per garment.',english:'Cost INR 60 per garment.',language:'en',detectedLanguage:'en',translationUncertain:false,metadata:{period:'month',costBasis:'fixed'}}],
 facts:{'finance.unitCost':{field:'finance.unitCost',value:'INR 60 per garment',status:'PROVIDED',confirmed:true,claims:[{value:'INR 60 per garment',evidence:'Cost INR 60 per garment.',source_id:'pitch',amount:60,currency:'INR',unit:'garment'}],validation:{valid:true,errors:[]}}},
 maxQuestions:8,questions:[],history:[]
};
for(const language of ['en','hi','mr','te','ta','kn','bn'] as SupportedLanguage[]){
 test('complete static resource arrays are aligned for '+language,()=>{
  assert.equal(fieldCopy[language].length,FIELD_IDS.length);
  assert.equal(interfaceCopy[language].length,interfaceKeys.length);
  for(const [key,value] of Object.entries(STATIC_RESOURCES[language])){
   assert.equal(typeof value,'string',language+': '+key);
   assert.ok(value.trim().length>0,language+': '+key);
  }
  for(const key of BUSINESS_FIELDS) assert.ok(ui(language)('field_'+key.split('.').pop())!=='field_'+key.split('.').pop());
 });
 test('structured business form renders translated actual field labels in '+language,()=>{
  const markup=renderToStaticMarkup(React.createElement(StructuredBusinessForm,{language,record:fixture,onSubmit:()=>{},onClose:()=>{}}));
  assert.ok(markup.includes('lang="'+language+'"'));
  assert.ok(markup.includes(ui(language)('field_unitCost')));
  assert.ok(markup.includes('INR 60 per garment'));
  assert.ok(markup.includes('role="dialog"'));
 });
}
test('prefilled financial facts preserve explicit amount, unit, currency and period',()=>{
 const draft=draftFromRecord(fixture);
 assert.deepEqual(draft['finance.unitCost'],{value:'INR 60 per garment',estimate:false,amount:60,currency:'INR',unit:'garment',period:'month',costBasis:'fixed'});
 assert.deepEqual(changedFields(draft,draft),{});
});
test('editing a field sends only changed values, never unchanged confirmed facts',()=>{
 const initial=draftFromRecord(fixture);
 const edited={...initial,'overview.productService':{value:'Test beneficiary correction'}};
 assert.deepEqual(Object.keys(changedFields(edited,initial)),['overview.productService']);
});
test('unverified or missing values do not prefill the actual form',()=>{
 const record=structuredClone(fixture);
 record.facts['finance.unitCost'].status='UNCLEAR';
 record.facts['finance.unitCost'].value=null;
 assert.deepEqual(draftFromRecord(record),{});
});
test('numeric metadata cannot contradict the quoted form text',()=>{
 assert.ok(validateDraft({'finance.unitCost':{value:'Cost INR 60',amount:600}}));
 assert.equal(validateDraft({'finance.unitCost':{value:'खर्च ६० रुपये',amount:60}}),null);
 assert.equal(validateDraft({'finance.unitCost':{value:'খরচ ৬০ টাকা',amount:60}}),null);
 assert.ok(validateDraft({'finance.unitCost':{value:'60',amount:NaN}}));
});
test('frontend formal-submission guard rejects incomplete, stale and non-AI assessments',()=>{
 assert.equal(canSubmitForAssessment(fixture),false);
 assert.ok(LOCKED_STATES.has('ADMIN_REVIEW'));
 assert.ok(LOCKED_STATES.has('PROGRAM_DECIDED'));
});

test('plan print layout contains only the selected actual sections and escapes untrusted content',async()=>{
 const {printablePlanHtml}=await import('../src/services/planExport.ts');
 const html=printablePlanHtml({language:'te',method:'TEST_FIXTURE',sections:{'Executive summary':'<script>alert("unsafe")</script>','Product or service':'టైలరింగ్'}},"Test <business>",'te',{'Executive summary':'అవలోకనం'});
 assert.ok(html.includes('lang="te"'));
 assert.ok(html.includes('టైలరింగ్'));
 assert.ok(html.includes('అవలోకనం'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('Account access token'));
});
test('malformed backend records are rejected before entering the workspace',async()=>{
 const {assertScreeningRecord}=await import('../src/services/screeningApi.ts');
 assert.throws(()=>assertScreeningRecord({id:'bad',state:'EXTRACTED'}),/contract/);
 assert.doesNotThrow(()=>assertScreeningRecord(fixture));
});


test('clearing a prefilled value is an explicit rejection, not a silently ignored edit',async()=>{
 const {clearedFields}=await import('../src/services/businessForm.ts');
 const original=draftFromRecord(fixture);
 const values={...original,'finance.unitCost':{...original['finance.unitCost'],value:''}};
 assert.deepEqual(clearedFields(values,original),['finance.unitCost']);
 assert.deepEqual(clearedFields(original,original),[]);
});

test('unknown answers block finalization until their field is supplied and confirmed',()=>{
 const record=structuredClone(fixture);
 for(const key of ['overview.productService','overview.proposedLocation','market.targetCustomers','finance.initialInvestment','finance.unitCost','finance.sellingPrice','finance.monthlyExpenses','finance.expectedSales'])record.facts[key]={...structuredClone(fixture.facts['finance.unitCost']),field:key};
 record.questions=[{id:'unknown',field:'market.competition',status:'unknown',text:'Who are your competitors?',rationale:'',guidance:'',translations:{}}];
 assert.equal(canFinalize(record),false);
 assert.equal(unresolvedQuestions(record)[0].id,'unknown');
 record.facts['market.competition']={...structuredClone(fixture.facts['finance.unitCost']),field:'market.competition',confirmed:false};
 assert.equal(canFinalize(record),false);
 record.facts['market.competition'].confirmed=true;
 for(const fields of Object.values(ASSESSMENT_DOMAINS)){const key=fields[0];record.facts[key]={...structuredClone(fixture.facts['finance.unitCost']),field:key};record.questions.push({id:key,field:key,status:'answered',text:'Test question',answer:'Test answer',rationale:'',guidance:'',translations:{}});}
 assert.equal(canFinalize(record),true);
 record.questions[0].status='pending';
 assert.equal(canFinalize(record),false);
});

test('incomplete nested backend data is rejected before it can crash a page',()=>{
 for(const mutate of [
  (r:any)=>{r.facts['finance.unitCost'].validation=null;},
  (r:any)=>{r.facts['finance.unitCost'].claims=null;},
  (r:any)=>{r.questions=[{id:'broken',field:'finance.unitCost',text:'Question',status:'pending'}];},
  (r:any)=>{r.report={explanation:'Incomplete report'};},
  (r:any)=>{r.currentScore={overallScore:7,domains:{business:{rating:3}}};},
  (r:any)=>{r.financials={calculations:{},warnings:null};},
 ]){const record=structuredClone(fixture);mutate(record);assert.throws(()=>assertScreeningRecord(record),/screening contract/);}
});

test('even fully provided and confirmed pitch facts cannot skip category questions',()=>{
 const record=structuredClone(fixture);
 for(const key of BUSINESS_FIELDS)record.facts[key]={...structuredClone(fixture.facts['finance.unitCost']),field:key};
 assert.equal(canFinalize(record),false);
 for(const fields of Object.values(ASSESSMENT_DOMAINS)){const key=fields[0];record.questions.push({id:key,field:key,status:'answered',text:'Question',answer:'Beneficiary evidence',rationale:'',guidance:'',translations:{}});}
 assert.equal(canFinalize(record),true);
});

test('beneficiary is not asked to choose the business category',()=>{
 const html=renderToStaticMarkup(React.createElement(StructuredBusinessForm,{language:'en',onSubmit:()=>{},onClose:()=>{}}));
 assert.match(html,/Selected automatically from your product or service/);
 assert.doesNotMatch(html,/name="trade"/);
 assert.doesNotMatch(html,/field_overview.trade/);
});
