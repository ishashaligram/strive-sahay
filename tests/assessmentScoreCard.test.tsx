import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AssessmentScoreCard} from '../src/components/AssessmentScoreCard';
import {ScreeningRecord} from '../src/services/screeningApi';
test('synthetic score is immediately visible with its provenance label',()=>{
 const record={synthetic:true,currentScore:{assessmentType:'SYNTHETIC_DEMO_SCORE',overallScore:8.2}} as ScreeningRecord;
 const html=renderToStaticMarkup(<AssessmentScoreCard record={record} language="en"/>);
 assert.ok(html.includes('8.2'));
 assert.ok(html.includes('Demo score received'));
 assert.ok(html.includes('not a live AI assessment'));
});
test('pitch-only completeness never becomes a received readiness score',()=>{
 const record={currentScore:{assessmentType:'EVIDENCE_COVERAGE_NOT_AI_RATING',overallScore:7}} as ScreeningRecord;
 const html=renderToStaticMarkup(<AssessmentScoreCard record={record} language="en"/>);
 assert.ok(html.includes('Not yet assessed'));
 assert.ok(!html.includes('/ 10'));
});
