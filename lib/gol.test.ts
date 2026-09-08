import assert from 'node:assert/strict';
import {newFootball,startFootball,shootFootball,diveFootball,stepFootball,goal} from './gol.ts';
import {stickDirection} from './controls.ts';
const tick=1/120;
const g=newFootball();shootFootball(g);assert.equal(g.owner,0);assert.equal(g.ball.vx,0);
startFootball(g);
for(let i=0;i<120;i++)stepFootball(g,tick,0,0,true);
assert.ok(g.charge>.89);assert.equal(g.owner,0,'Holding must not shoot automatically');
shootFootball(g);assert.equal(g.owner,-1);assert.ok(g.ball.vx>650);
const shot={...g.ball};shootFootball(g);assert.deepEqual(g.ball,shot,'A player without possession cannot shoot');
g.status='paused';const paused=JSON.stringify(g);stepFootball(g,1,1,1,true);assert.equal(JSON.stringify(g),paused);
function crossing(y:number){
 const g=newFootball();startFootball(g);g.owner=-1;g.ball={x:goal.right-2,y,vx:750,vy:0};stepFootball(g,tick,0,0);return g;
}
const scored=crossing(315);assert.deepEqual(scored.score,[1,0]);assert.equal(scored.status,'goal');
stepFootball(scored,1.3,0,0);assert.equal(scored.owner,1,'The conceding player gets the restart');
const outside=crossing(150);assert.deepEqual(outside.score,[0,0]);assert.equal(outside.owner,1);
const save=newFootball();startFootball(save);save.owner=-1;save.ball={x:170,y:315,vx:-750,vy:0};
stepFootball(save,tick,0,0);assert.equal(save.owner,0,'A keeper intercepts an incoming shot');
const dive=newFootball();startFootball(dive);dive.owner=-1;dive.ball={x:500,y:450,vx:-500,vy:0};
diveFootball(dive,1);const velocity=dive.players[0].vy;assert.ok(velocity>500);
diveFootball(dive,-1);assert.equal(dive.players[0].vy,velocity,'Recovery prevents repeated dives');
for(let i=0;i<300;i++)stepFootball(dive,tick,1,1);
assert.ok(dive.players[0].x<=450&&dive.players[0].y<=505,'The keeper stays in their own half');
const winner=crossing(315);winner.status='playing';winner.score=[4,0];winner.owner=-1;winner.ball={x:929,y:315,vx:750,vy:0};
stepFootball(winner,tick,0,0);assert.equal(winner.status,'over');assert.equal(winner.score[0],5);
const flat=stickDirection(0,-40,40,true);assert.equal(flat.x,0);assert.equal(flat.z,-1);
// Autonomous opponent can take possession, prepare and send a ball toward the human goal.
const cpu=newFootball();startFootball(cpu);cpu.owner=1;
for(let i=0;i<140;i++)stepFootball(cpu,tick,0,0);
assert.equal(cpu.owner,-1);assert.ok(cpu.ball.vx<0);
console.log('Passed: charged shots, swept saves, goals, outs, kickoff, dives, half limits, AI, pause and flat joystick.');

// Bank shots preserve their intended angle when rebounding off the boards.
for(const style of ['top','bottom']){
 const bank=newFootball();startFootball(bank);bank.shotStyle=style;bank.aim=0;bank.charge=1;shootFootball(bank);
 for(let i=0;i<1200&&bank.status==='playing';i++){bank.players[1].y=500;stepFootball(bank,tick,0,0);}
 assert.equal(bank.score[0],1,style+' bank should reach the aimed corner');
 assert.equal(bank.bankGoals,1);assert.match(bank.message,/TABELA/);
}
const {newFootballProgress,recordFootball,effectUnlocked,readFootballProgress}=await import('./gol.ts');
const result=newFootball();result.status='over';result.score=[5,2];result.saves=[5,2];result.bankGoals=3;
const earned=recordFootball(newFootballProgress(),result);
for(const id of ['aqua','comet','electric','aurora'])assert.ok(effectUnlocked(earned,id));
assert.deepEqual(recordFootball(earned,result),earned,'A finished match is recorded only once');
assert.deepEqual(readFootballProgress(JSON.stringify({...earned,effect:'aurora'})),{...earned,effect:'aurora'});
assert.equal(readFootballProgress('{"effect":"aurora"}').effect,'classic','Locked effects cannot be equipped');
assert.deepEqual(readFootballProgress('bad json'),newFootballProgress());
const plain=newFootball(),decorated=newFootball();decorated.effect='comet';startFootball(plain);startFootball(decorated);
plain.charge=decorated.charge=1;shootFootball(plain);shootFootball(decorated);
assert.deepEqual(plain.ball,decorated.ball,'Visual effects do not alter the shot physics');
console.log('Passed: both bank-shot routes, unlocks, persistence, deduplication and cosmetic fairness.');
