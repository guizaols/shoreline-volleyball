import assert from 'node:assert/strict';
import {drills,trainingMedal} from './training.ts';
import {newProgress,trainingGame,recordProgress,readProgress,cupGame,beginEvent} from './cup.ts';
import {step,guidance,toss,serve,createGame,playerAttribute,switchPlayer} from './game.ts';
import {events,canEnter} from './career.ts';

assert.deepEqual([0,1,2,3,4,5].map(trainingMedal),[0,0,1,2,2,3]);
for(const athlete of [0,1]){
 let progress=newProgress();
 assert.equal(trainingGame(progress,1,athlete),null,'Silver-level training must first be unlocked');
 for(let index=0;index<drills.length;index++){
  const g=trainingGame(progress,index,athlete)!;assert.ok(g);switchPlayer(g);assert.equal(g.active,athlete);
  for(let tick=0;tick<12000&&g.status!=='drill-complete';tick++){
   if(g.status==='serving')toss(g);
   if(g.status==='tossing'&&g.tossTime>=.55)serve(g);
   g.aim={...g.drillTarget};
   const guide=guidance(g),p=g.players[g.active],dx=guide.x-p.x,dz=guide.z-p.z,d=Math.hypot(dx,dz),moving=guide.team===0&&d>15;
   step(g,1/120,moving?dx/d:0,false,'Club',false,false,moving?dz/d:0,false,true);
  }
  assert.equal(g.status,'drill-complete',drills[index].name);
  assert.equal(g.drillAttempts,5);assert.ok(g.drillMedal>=1,'Every level must be achievable');
  assert.equal(g.active,athlete,'The selected athlete must perform the drill');
  progress=recordProgress(progress,g);
  assert.equal(progress.career.players[1-athlete].xp,0);
  assert.equal(progress.career.matches,0);assert.equal(progress.career.ranking,0);
  assert.deepEqual(recordProgress(progress,g),progress,'Repeating a medal must not duplicate XP');
 }
 assert.deepEqual(readProgress(JSON.stringify(progress)),progress);
}
// Only the improvement over a previous medal is paid.
let p=newProgress();const result=trainingGame(p,0,1)!;result.status='drill-complete';result.drillAttempts=5;
for(const medal of [1,2,3]){result.drillMedal=medal;p=recordProgress(p,result);assert.equal(p.career.players[1].xp,[0,20,50,100][medal]);}
assert.equal(p.career.players[1].points,1);assert.equal(p.career.players[0].points,0);
result.drillMedal=1;assert.deepEqual(recordProgress(p,result),p);

// New qualifiers gate only their own finals; existing event IDs keep their meaning.
const entry=newProgress();entry.career.ranking=1000;
assert.equal(beginEvent(entry,5),entry);assert.ok(!canEnter(entry.career,5,[]));
assert.ok(canEnter(entry.career,5,[4]));assert.ok(canEnter(entry.career,7,[6]));
for(let event=0;event<events.length;event++){
 const game=cupGame({...entry,event});
 assert.equal(game.pointGoal,events[event].goal);assert.equal(game.windStrength,events[event].wind);
 assert.equal(game.cpuTier,events[event].tier);assert.equal(game.location,events[event].location);
}
const a=createGame(),b=createGame();a.genders=['female','male'];b.genders=['male','female'];
a.status=b.status='playing';a.windEnabled=b.windEnabled=false;
for(let t=0;t<30;t++){step(a,1/120,1,false,'Club');step(b,1/120,1,false,'Club');}
assert.deepEqual(a.players,b.players,'Gender cannot alter movement');
assert.deepEqual(a.ball,b.ball);
for(const key of ['serve','attack','defense','mobility'] as const)assert.equal(playerAttribute(a,0,key),playerAttribute(b,0,key));
const mixed=newProgress();mixed.career.players[0].gender='female';mixed.career.players[1].gender='male';
assert.deepEqual(readProgress(JSON.stringify(mixed)).career,mixed.career);
console.log('Passed: 18 playable training sessions, medals, individual XP, qualifier gates, conditions, mixed teams and save migration.');
