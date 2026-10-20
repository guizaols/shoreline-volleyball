import assert from 'node:assert/strict';
import {readAltinha,unlockedTricks,recordAltinha,lessonFor,markLearned} from './altinha-progress.ts';

const fresh=readAltinha(null);
// Broken or tampered saves start fresh; unknown trick ids are dropped.
for(const raw of ['garbage','{"total":-5}','{"total":1e20}','{"total":"9"}'])assert.deepEqual(readAltinha(raw),fresh);
assert.deepEqual(readAltinha('{"learned":["peito","hack"]}').learned,['peito']);
assert.deepEqual(readAltinha(JSON.stringify({total:320,best:200,rodaBest:30,rounds:2,learned:['embaixadinha']})),{total:320,best:200,rodaBest:30,rounds:2,learned:['embaixadinha']});

// Tricks unlock by the running total of your individual score.
assert.deepEqual(unlockedTricks(0),['embaixadinha','cabeca','coxa']);
assert.ok(unlockedTricks(800).includes('ombro'));assert.ok(!unlockedTricks(800).includes('letra'));

// A round adds to the totals; crossing 300 unlocks the peito and opens its lesson.
const result={rodaBest:34,rodaScore:900,individual:[350,200,100,90,80],king:0,perfects:4,saves:1,drops:3,gamebreakers:1};
const {save,notes,newTricks}=recordAltinha(fresh,result);
assert.equal(save.total,350);assert.equal(save.best,350);assert.equal(save.rodaBest,34);assert.equal(save.rounds,1);
assert.deepEqual(newTricks,['peito']);
assert.ok(notes.includes('Novo trick: PEITO'));assert.ok(notes.includes('Recorde da roda: 34'));assert.ok(notes.includes('Rei da roda!'));
assert.equal(lessonFor(save),'peito');assert.equal(lessonFor(markLearned(save,'peito')),null);

// A weaker round keeps the records and says nothing about them.
const again=recordAltinha(save,{...result,rodaBest:10,individual:[20,400,0,0,0],king:1});
assert.equal(again.save.best,350);assert.equal(again.save.rodaBest,34);assert.equal(again.save.total,370);
assert.ok(!again.notes.some(n=>n.startsWith('Recorde')));assert.ok(!again.notes.includes('Rei da roda!'));

console.log('Passed: altinha save, unlocks and lessons.');
