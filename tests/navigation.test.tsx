import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import App from '../src/App.tsx';
import {navigationPath,validActiveUser} from '../src/services/navigation.ts';
import {AccountLogin} from '../src/components/AccountLogin.tsx';
import {ui} from '../src/services/uiI18n.ts';
import {PageErrorBoundary} from '../src/components/PageErrorBoundary.tsx';

const values=new Map<string,string>();
const browserStorage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key),clear:()=>values.clear(),key:()=>null,get length(){return values.size;}};
Object.defineProperty(globalThis,'localStorage',{value:browserStorage,configurable:true});
Object.defineProperty(globalThis,'sessionStorage',{value:browserStorage,configurable:true});
for(const [role,paths] of Object.entries({beneficiary:['/beneficiary/dashboard','/beneficiary/mentor','/beneficiary/improvement'],assessor:['/assessor/dashboard'],admin:['/admin/dashboard']})){
 for(const path of paths)test('authenticated route renders content: '+path,()=>{
  values.clear();values.set('strive_sahay_active_user_v1',JSON.stringify({id:'test-account',name:'Test account',role}));
  const html=renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>);
  assert.match(html,/STRIVE SAHAY/);
  assert.match(html,role==='admin'?/Program operations/:/Sign in with your phone number/);
 });
}
for(const path of ['/','/beneficiary/language','/beneficiary/auth','/assessor/login','/admin/login'])test('public route renders content: '+path,()=>{
 values.clear();const html=renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>);assert.match(html,/STRIVE SAHAY/);assert.ok(html.length>500);if(path.endsWith('/login')||path.endsWith('/auth')){assert.match(html,/Phone number/);assert.match(html,/Register/);assert.doesNotMatch(html,/Account access token/);}
});
test('dashboard navigation stays in the signed-in portal',()=>{
 assert.equal(navigationPath('admin','dashboard'),'/admin/dashboard');
 assert.equal(navigationPath('assessor','dashboard'),'/assessor/dashboard');
 assert.equal(navigationPath('beneficiary','mentor'),'/beneficiary/mentor');
 assert.equal(navigationPath('beneficiary','invalid'),'/beneficiary/dashboard');
});
test('invalid old session values cannot enter a redirect loop',()=>{
 for(const value of [null,{},[],{role:'unknown',id:'x',name:'x'},{role:'beneficiary',id:5,name:'x'}])assert.equal(validActiveUser(value),false);
});
test('page recovery offers reload and home without deleting saved data',()=>{
 const boundary=new PageErrorBoundary({children:null});boundary.state={failed:true};const html=renderToStaticMarkup(boundary.render());assert.match(html,/Reload page/);assert.match(html,/Go to start page/);assert.match(html,/has not been deleted/);
});

for(const language of ['en','hi','mr','te','ta','kn','bn'] as const)test('phone login is translated without token input: '+language,()=>{
 const html=renderToStaticMarkup(<MemoryRouter><AccountLogin role="beneficiary" currentLang={language} onLoginSuccess={()=>{}}/></MemoryRouter>);
 assert.ok(html.includes(ui(language)('Phone number')));
 assert.ok(html.includes(ui(language)('Register')));
 assert.ok(html.includes(ui(language)('demoPhoneNotice')));
 assert.doesNotMatch(html,/type="password"/);
});
