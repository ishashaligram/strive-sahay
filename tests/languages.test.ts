import test from 'node:test';
import assert from 'node:assert/strict';
import {ui} from '../src/services/uiI18n.ts';
import {SupportedLanguage} from '../src/types/index.ts';
for(const language of ['en','hi','mr','te','ta','kn','bn'] as SupportedLanguage[]){
 test('core i18next actions exist for '+language,()=>{
   const t=ui(language);
   for(const key of ['workspace','structured','confirmFacts','generatePlan','pdf','financials','escalate','aiScore','roadmap','insights','unconfirmed','save','answer','language','plan','noMarketData']){
     assert.notEqual(t(key),key);
     assert.ok(t(key).length>0);
     if(language!=='en') assert.notEqual(t(key),ui('en')(key));
   }
 });
}
