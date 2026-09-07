import assert from 'node:assert/strict';
import {events,newCareer,readCareer,improve} from './career.ts';
import {newProgress,readProgress,cupGame,recordProgress,beginEvent,rematch,applyCareer} from './cup.ts';
import {createGame,point,step,prepareServe,toss,serve,contactPoint} from './game.ts';

const old={stage:1,score:[3,2],server:1,champion:true,gold:true,training:2};
const migrated=readProgress(JSON.stringify(old));
assert.deepEqual(migrated.score,[3,2]);assert.ok(migrated.gold);
assert.deepEqual(migrated.career,newCareer());
let p=newProgress();
assert.equal(beginEvent(p,3),p,'Olympics require qualification');
for(let event=0;event<events.length;event++){
 p=beginEvent(p,event);assert.equal(p.event,event);
 for(let stage=0;stage<3;stage++){
  const g=cupGame(p);g.playerContacts=[12,6];
  for(let i=0;i<7;i++)point(g,0);
  p=recordProgress(p,g);
  assert.deepEqual(recordProgress(p,g),p,'Repeated callbacks must not duplicate rewards');
 }
 assert.ok(p.completed.includes(event));
}
assert.equal(p.career.ranking,480);assert.equal(p.career.history.length,12);
assert.ok(p.career.players[0].xp>p.career.players[1].xp);
assert.ok(p.career.players.every(player=>player.points>0));
assert.deepEqual(readProgress(JSON.stringify(p)),p);

let loss=newProgress();const lost=cupGame(loss);lost.playerContacts=[3,1];
for(let i=0;i<7;i++)point(lost,1);
loss=recordProgress(loss,lost);
const restored=readProgress(JSON.stringify(loss)),restoredGame=cupGame(restored);
assert.deepEqual(restoredGame.playerContacts,[3,1]);
assert.deepEqual(recordProgress(restored,restoredGame),restored,'Reloading a loss must not grant XP again');
loss=rematch(loss);assert.deepEqual(loss.contacts,[0,0]);
assert.notEqual(loss.matchSerial,restored.matchSerial);

const before=p.career,trained=improve(before,0,'mobility');
assert.equal(trained.players[0].stats.mobility,before.players[0].stats.mobility+5);
assert.equal(trained.players[0].points,before.players[0].points-1);
assert.deepEqual(trained.players[1],before.players[1]);
assert.equal(improve(newCareer(),0,'attack').players[0].stats.attack,50);
const friendly=applyCareer(createGame(),p);for(let i=0;i<11;i++)point(friendly,0);
assert.equal(recordProgress(p,friendly),p,'Friendlies never affect career progress');

const profile=readCareer({country:'JP',players:[{name:'  Ren  ',xp:100,points:1,stats:{mobility:55}},{name:'   '}]});
assert.equal(profile.players[0].name,'Ren');assert.equal(profile.players[1].name,'Dani');
assert.equal(profile.country,'JP');
const named=applyCareer(createGame(),{...p,career:profile});
assert.deepEqual(named.names,['Ren','Dani']);assert.equal(named.country,'JP');
function running(mobility:number){
 const g=createGame();g.status='playing';g.assist=false;g.autoSwitch=false;g.attributes[0].mobility=mobility;
 g.ball={x:850,z:400,y:-1000,vx:0,vz:0,vy:0};
 for(let i=0;i<12;i++)step(g,1/120,1,false,'Club');return g.players[0].x;
}
assert.ok(running(100)>running(50),'Mobility upgrades must affect gameplay');
function serving(stat:number){
 const g=createGame();g.attributes[0].serve=stat;prepareServe(g);toss(g);g.tossTime=.55;serve(g);return g.ball.vx;
}
assert.ok(serving(100)>serving(50),'Serve upgrades must affect gameplay');
console.log('Passed: legacy migration, full world circuit and Olympics, individual XP, upgrades, restored contacts, reward deduplication, friendly isolation and profile defaults.');

function receiving(defense:number){
 const g=createGame();g.status='playing';g.autoSwitch=false;g.assist=false;g.windEnabled=false;g.lastTeam=1;g.lastHit=3;g.attributes[0].defense=defense;
 Object.assign(g.players[0],{action:'bump',actionTime:.3});
 g.ball={...contactPoint(g.players[0]),vx:0,vz:0,vy:1};g.ball.z+=32;
 step(g,1/120,0,false,'Club');return g.rally;
}
assert.equal(receiving(50),0);assert.equal(receiving(100),1,'Defense upgrades extend contact range');
function attacking(attack:number){
 const g=createGame();g.status='playing';g.autoSwitch=false;g.windEnabled=false;g.lastTeam=0;g.lastHit=1;g.touches=2;g.attributes[0].attack=attack;
 Object.assign(g.players[0],{x:400,z:225,y:270,action:'spike',actionTime:.3});
 g.ball={...contactPoint(g.players[0]),vx:0,vz:0,vy:1};step(g,1/120,0,false,'Club');return g.ball.vx;
}
assert.ok(attacking(100)>attacking(50),'Attack upgrades increase ball speed');
