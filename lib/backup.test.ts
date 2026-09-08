import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newProgress,recordProgress,cupGame,readProgress} from './cup.ts';
import {point} from './game.ts';
import {exportCareer,importCareer} from './backup.ts';
let p=newProgress();p.career.players[0].name='João';const g=cupGame(p);
for(let i=0;i<7;i++)point(g,0);p=recordProgress(p,g);
assert.deepEqual(importCareer(exportCareer(p)),p);
assert.deepEqual(importCareer(exportCareer(readProgress(JSON.stringify(p)))),p);
for(const raw of ['{}','not json',JSON.stringify({format:'shoreline-career',version:2,progress:p}),exportCareer({...p,stage:99}),exportCareer({...p,career:{...p.career,country:'BAD'}}),' '.repeat(200001)])assert.throws(()=>importCareer(raw));
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
for(const size of [192,512]){
 const png=readFileSync(`public/icons/icon-${size}.png`);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
}
assert.ok(readFileSync('public/offline.html','utf8').includes('Conecte-se'));
console.log('Passed: backup round-trip, invalid import rejection, installation manifest and icon dimensions.');
