import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {MinimalLandingPage} from '../src/pages/MinimalLandingPage';
import {MAJOR_FIELDS,SUPPORT_LINKS,VOICE_LANG} from '../src/services/simpleJourney';
import {CRITICAL_FIELDS} from '../src/services/businessForm';
test('minimal landing offers one beneficiary entry and no staff login cards',()=>{
 const html=renderToStaticMarkup(<MemoryRouter><MinimalLandingPage/></MemoryRouter>);
 assert.ok(html.includes('/beneficiary/language'));
 assert.ok(!html.includes('/admin/login')&&!html.includes('/assessor/login'));
});
test('major questionnaire includes required facts and all regional voice codes',()=>{
 for(const field of CRITICAL_FIELDS)assert.ok(MAJOR_FIELDS.includes(field));
 assert.equal(new Set(MAJOR_FIELDS).size,MAJOR_FIELDS.length);
 assert.equal(Object.keys(VOICE_LANG).length,8);
 for(const link of SUPPORT_LINKS)assert.equal(new URL(link.url).protocol,'https:');
});
