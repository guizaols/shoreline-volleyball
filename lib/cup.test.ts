import assert from 'node:assert/strict';
import {newProgress,readProgress,cupGame,recordProgress,challengeGame,opponents} from './cup.ts';
import {point,step,contactPoint,FLOOR} from './game.ts';
const dt=1/120;
let p=newProgress();
for(let stage=0;stage<3;stage++){
 const g=cupGame(p);
 assert.equal(g.cpuStyle,opponents[stage].style);
 for(let i=0;i<6;i++)point(g,0);
 assert.equal(g.status,'ready');
 const saved=recordProgress(p,g),restored=cupGame(readProgress(JSON.stringify(saved)));
 assert.deepEqual(restored.score,[6,0]);assert.equal(restored.cupStage,stage);
 point(g,0);assert.equal(g.status,'over');
 p=recordProgress(p,g);assert.equal(p.stage,stage+1);
 assert.deepEqual(recordProgress(p,g),p,'A result must not advance two stages');
}
assert.ok(p.champion&&p.gold);
assert.deepEqual(readProgress(JSON.stringify(p)),p);
const lost=cupGame(newProgress());for(let i=0;i<7;i++)point(lost,1);
const lossProgress=recordProgress(newProgress(),lost);
assert.equal(lossProgress.stage,0);assert.equal(cupGame(lossProgress).status,'over');
assert.equal(cupGame({...lossProgress,score:[0,0],server:0}).score[1],0,'Rematch starts clean');
const deuce=cupGame(newProgress());deuce.score=[6,6];point(deuce,0);assert.equal(deuce.status,'ready');point(deuce,0);assert.equal(deuce.status,'over');
for(const raw of [null,'broken','{}',JSON.stringify({...p,stage:8}),JSON.stringify({...p,score:[-1,0]})])assert.deepEqual(readProgress(raw),newProgress());

const movement=challengeGame(0);
for(let i=0;i<120;i++)step(movement,dt,0,false,'Club');
assert.equal(movement.status,'playing','Movement lesson must not complete itself');
for(let i=0;i<240&&movement.status==='playing';i++){
 const player=movement.players[0],dx=350-player.x,dz=225-player.z,d=Math.hypot(dx,dz);
 step(movement,dt,dx/d,false,'Club',false,false,dz/d);
}
assert.equal(movement.status,'challenge-complete');
for(const index of [1,2]){
 const g=challengeGame(index);
 if(index===2){
   for(let i=0;i<750;i++)step(g,dt,0,false,'Club',false,false,0,false,true);
   assert.notEqual(g.status,'challenge-complete','The tip lesson requires choosing a tip');
   g.attackStyle='tip';
 }
 for(let i=0;i<1600&&g.status!=='challenge-complete';i++)step(g,dt,0,false,'Club',false,false,0,false,true);
 assert.equal(g.status,'challenge-complete',`Lesson ${index} should be achievable`);
 assert.equal(recordProgress(newProgress(),g).training,index+1);
}
const blocker=cupGame({...newProgress(),stage:1}),defender=cupGame(newProgress());
for(const g of [blocker,defender]){
 g.status='playing';g.lastTeam=0;g.ball={x:200,z:225,y:100,vx:0,vz:0,vy:0};
 step(g,dt,0,false,'Club');
}
assert.ok(blocker.players[2].x<defender.players[2].x,'Muralha positions a blocker near the net');
function cpuAttack(stage:number){
 const g=cupGame({...newProgress(),stage});g.status='playing';g.lastTeam=1;g.lastHit=3;g.touches=2;
 Object.assign(g.players[2],{x:600,z:225,y:FLOOR-150,action:'spike',actionTime:.3});
 g.ball={...contactPoint(g.players[2]),vx:0,vz:0,vy:1};step(g,dt,0,false,'Club');return g;
}
assert.ok(Math.abs(cpuAttack(2).ball.vx)>Math.abs(cpuAttack(0).ball.vx),'Tempestade attacks faster');
console.log('Passed: full cup, saved score, rematch, deuce, reward, invalid saves, three playable lessons and opponent behaviors.');
