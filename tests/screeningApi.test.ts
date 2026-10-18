import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../src/services/screeningApi.ts';

const originalFetch=globalThis.fetch;
const originalWindow=globalThis.window;
const originalStorage=globalThis.sessionStorage;
function setup(fetcher:typeof fetch) {
  globalThis.fetch=fetcher;
  globalThis.window={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval} as unknown as Window & typeof globalThis;
  globalThis.sessionStorage={getItem:()=> 'private-account-token'} as unknown as Storage;
}
test.afterEach(()=>{globalThis.fetch=originalFetch;globalThis.window=originalWindow;globalThis.sessionStorage=originalStorage;});
test('account token stays in authorization header and JSON submission is preserved',async()=>{
  setup(async(input,init)=>{
    assert.equal(input,'/api/pipeline/process-text');
    assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer private-account-token');
    assert.equal(init?.body,JSON.stringify({text:'Original pitch',language:'mr'}));
    return new Response(JSON.stringify({state:'PROVISIONALLY_SCORED'}));
  });
  const result=await api<{state:string}>('/pipeline/process-text',{text:'Original pitch',language:'mr'});
  assert.equal(result.state,'PROVISIONALLY_SCORED');
});
test('backend unavailable rejects without generated facts',async()=>{
  setup(async()=>{throw new TypeError('Failed to fetch');});
  await assert.rejects(api('/submissions'),/Backend unavailable/);
});
test('guard rejection is displayed rather than accepted as submission',async()=>{
  setup(async()=>new Response(JSON.stringify({detail:'Complete screening first'}),{status:409}));
  await assert.rejects(api('/submissions/id/submit-to-assessor',{}),/Complete screening first/);
});
test('document uploads let the browser assign multipart boundaries',async()=>{
  setup(async(_input,init)=>{
    assert.equal((init?.headers as Record<string,string>)['Content-Type'],undefined);
    assert.ok(init?.body instanceof FormData);
    return new Response(JSON.stringify({text:'Actual document text',reviewRequired:true}));
  });
  const form=new FormData();form.append('file',new Blob(['Actual document text']),'plan.txt');
  const result=await api<{reviewRequired:boolean}>('/pipeline/process-document',form);
  assert.equal(result.reviewRequired,true);
});
test('invalid response remains an explicit error',async()=>{
  setup(async()=>new Response('not JSON',{status:503}));
  await assert.rejects(api('/submissions'),/unreadable response/);
});

test('HTTP success with HTML instead of JSON is rejected as a contract error',async()=>{
 setup(async()=>new Response('<html>Vite fallback</html>',{status:200}));
 await assert.rejects(api('/submissions'),/unreadable response/);
});
