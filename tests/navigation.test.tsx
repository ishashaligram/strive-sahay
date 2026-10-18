import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import App from '../src/App.tsx';
import {navigationPath,validActiveUser} from '../src/services/navigation.ts';
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
  assert.match(html,role==='admin'?/Program operations/:/Screening account access token/);
 });
}
for(const path of ['/','/beneficiary/language','/beneficiary/auth','/assessor/login','/admin/login'])test('public route renders content: '+path,()=>{
 values.clear();const html=renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>);assert.match(html,/STRIVE SAHAY/);assert.ok(html.length>500);
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
