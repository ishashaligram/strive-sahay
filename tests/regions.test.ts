import test from 'node:test';
import assert from 'node:assert/strict';
import {regionOptions} from '../src/services/regions';
test('region dropdown keeps existing custom values and deduplicates configured options',()=>{
 assert.deepEqual(regionOptions(['Pune','Pune','Nashik',''],'My district'),['My district','Nashik','Pune']);
});
