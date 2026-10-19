import assert from 'node:assert/strict';
import {newBeachProgress,readBeachProgress,recordBeachMatch,bestSkin,nextSkin,circuitStage,dailyChallenge,matchOptions,CIRCUIT_STAGES} from './beach-progress.ts';

const fresh=newBeachProgress();
assert.equal(bestSkin(fresh),'classic');assert.equal(nextSkin(fresh)?.id,'gold');
assert.deepEqual(readBeachProgress('{"wins":-5,"perfects":"x","matches":3}'),{...fresh,matches:3},'Invalid saved values are ignored');
assert.deepEqual(readBeachProgress('not json'),fresh);

let p=fresh;
for(let stage=0;stage<CIRCUIT_STAGES;stage++){
 assert.equal(circuitStage(p).stage,stage);
 p=recordBeachMatch(p,{won:true,perfects:4,specials:1,circuit:true}).progress;
}
assert.equal(p.titles,1,'Five circuit wins make a champion');assert.equal(p.circuit,0);assert.equal(bestSkin(p),'champion');
assert.equal(recordBeachMatch(p,{won:false,perfects:0,specials:0,circuit:true}).progress.circuit,0,'A loss does not advance the circuit');
assert.notEqual(circuitStage(newBeachProgress()).sport.id,circuitStage({...newBeachProgress(),circuit:1}).sport.id,'The circuit rotates sports');

const day=dailyChallenge(100);
let c=recordBeachMatch(fresh,{won:true,perfects:day.goal,specials:0,challenge:{day:100,goal:day.goal}});
assert.equal(c.progress.streak,1);assert.match(c.notes.join(),/Desafio do dia cumprido/);
c=recordBeachMatch(c.progress,{won:true,perfects:9,specials:0,challenge:{day:101,goal:3}});assert.equal(c.progress.streak,2,'Consecutive days build a streak');
c=recordBeachMatch(c.progress,{won:true,perfects:9,specials:0,challenge:{day:101,goal:3}});assert.equal(c.progress.streak,2,'A day counts once');
assert.equal(recordBeachMatch(fresh,{won:true,perfects:1,specials:0,challenge:{day:5,goal:3}}).progress.streak,0,'Missing the goal does not complete the challenge');
assert.deepEqual(matchOptions({rival:'3',meta:'4',dia:'20',circuito:'1'}),{rival:3,goal:4,day:20,circuit:true});
assert.deepEqual(matchOptions({rival:'999',meta:'x'}),{rival:undefined,goal:undefined,day:undefined,circuit:false});
console.log('Passed: beach records, ball unlocks, circuit ladder, daily challenge streak and link options.');
