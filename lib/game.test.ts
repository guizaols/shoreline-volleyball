import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, serve as releaseServe, prepareServe, toss, setAttackStyle, contactQuality, guidance, step, point, switchPlayer, landingX, landingZ, contactPoint, launch, setAim, setServeStyle, FLOOR } from './game.ts';
const atlas=readFileSync(new URL('../public/art/athlete-clean.png',import.meta.url));
assert.equal(atlas.readUInt32BE(16),1254,'Sprite frame coordinates require the original atlas width');
assert.equal(atlas[25],6,'Athlete atlas must have true alpha transparency');
const tick = 1 / 120;
function serve(g:ReturnType<typeof createGame>){g.windEnabled=false;prepareServe(g);toss(g);g.tossTime=.55;releaseServe(g);}
const g = createGame();
assert.equal(g.players.length, 4);
assert.deepEqual(g.players.map(p => p.team), [0, 0, 1, 1]);
serve(g); assert.equal(g.status, 'playing');
for (let i = 0; i < 360 && g.ball.x < 519; i++) step(g, tick, 0, false, 'Club');
assert.ok(g.ball.x > 500 && g.ball.y < 274, 'Serve clears the net');
g.ball = { x: 80, z: 40, y: 439, vx: 0, vz: 0, vy: 50 }; step(g, tick, 0, false, 'Club');
assert.deepEqual(g.score, [0, 1]); assert.equal(g.server, 1);
g.score = [10, 10]; point(g, 0); assert.equal(g.status, 'ready'); point(g, 0); assert.equal(g.status, 'over');
const p = createGame(); serve(p); p.status = 'paused'; const old = JSON.stringify(p); step(p, tick, 1, true, 'Pro'); assert.equal(JSON.stringify(p), old);
const n = createGame(); serve(n); n.ball = { x: 480, z: 200, y: 340, vx: 240, vz: 0, vy: 0 }; step(n, 1 / 30, 0, false, 'Club'); assert.ok(n.ball.vx < 0, 'Net bounces the ball');
const m = createGame(); m.assist=false;serve(m); step(m, tick, 1, false, 'Club');
assert.ok(m.players[0].vx > 0 && m.players[0].vx < 100, 'Movement accelerates rather than snapping');
const speed = m.players[0].vx; step(m, tick, 0, false, 'Club');
assert.ok(m.players[0].vx > 0 && m.players[0].vx < speed, 'Release brakes smoothly');
switchPlayer(m); assert.equal(m.active, 1); switchPlayer(m); assert.equal(m.active, 0);
const j = createGame(); serve(j); let launches = 0, wasGrounded = true;
for (let i = 0; i < 110; i++) {
  // Keep the rally alive and test a held jump across a complete landing.
  j.ball = { x: 900, z: 200, y: 0, vx: 0, vz: 0, vy: 0 };
  step(j, tick, 0, true, 'Club');
  const grounded = j.players[0].y === FLOOR;
  if (wasGrounded && !grounded) launches++;
  wasGrounded = grounded;
}
assert.equal(launches, 1, 'Holding jump must not bunny-hop after landing');
function contact(player: number, lastHit: number, touches: number) {
  const c = createGame(); serve(c); c.cooldown = 0; c.lastHit = lastHit; c.lastTeam = lastHit < 2 ? 0 : 1; c.touches = touches;
  c.players[player].action=lastHit<2?(touches>=2?'spike':'set'):'bump'; c.players[player].actionTime=.28;
  c.ball = { ...contactPoint(c.players[player]), vx: 0, vz:0, vy: 50 };
  step(c, tick, 0, false, 'Club'); return c;
}
const reception = contact(0, 3, 1); assert.equal(reception.touches, 1); assert.equal(reception.shot, 'RECEPTION');
const set = contact(1, 0, 1); assert.equal(set.touches, 2); assert.equal(set.shot, 'SET');
const attack = contact(0, 1, 2); assert.equal(attack.touches, 3); assert.equal(attack.shot, 'ATTACK'); assert.ok(attack.ball.vx > 0);
assert.equal(contact(0, 0, 1).score[1], 1, 'Consecutive contacts by one teammate are a fault');
assert.equal(contact(1, 0, 3).score[1], 1, 'Fourth team touch is a fault');
const d = createGame(); serve(d); step(d, tick, 1, false, 'Club', false, true); assert.equal(d.players[0].action, 'dive'); assert.ok(d.players[0].vx > 400);
// A deterministic rally verifies that both CPU teammates receive and combine.
const rally = createGame(); serve(rally); const cpuHits = new Set<number>(); let previousHits = 0;
for (let i = 0; i < 1800 && rally.status === 'playing'; i++) {
  const target = landingX(rally);
  if (rally.lastTeam === 0 && rally.lastHit === rally.active) switchPlayer(rally);
  const current = rally.players[rally.active];
  step(rally, tick, Math.max(-1, Math.min(1, (target - current.x) / 35)), false, 'Pro',false,false,Math.max(-1,Math.min(1,(landingZ(rally)-current.z)/35)));
  if (rally.rally !== previousHits && rally.lastTeam === 1) cpuHits.add(rally.lastHit);
  previousHits = rally.rally;
  assert.ok(rally.players.every(p => Number.isFinite(p.x) && p.x >= (p.team ? 537 : 40) && p.x <= (p.team ? 960 : 463)));
}
assert.equal(cpuHits.size, 2, 'Both CPU teammates must participate in the rally');
const depthGame=createGame();serve(depthGame);const beforeZ=depthGame.players[0].z;
for(let i=0;i<12;i++)step(depthGame,tick,0,false,'Club',false,false,1);
assert.ok(depthGame.players[0].z>beforeZ,'Movement includes court depth');
const body=createGame();serve(body);body.cooldown=0;body.lastHit=3;body.lastTeam=1;
body.ball={x:body.players[0].x,z:body.players[0].z,y:420,vx:0,vz:0,vy:0};
step(body,tick,0,false,'Club');assert.equal(body.rally,0,'Touching the torso is not a forearm or hand contact');
const combo=createGame();combo.active=-1;serve(combo);const actions:string[]=[];const participants=new Set<number>();let previous=0;
for(let i=0;i<1200;i++){
  step(combo,tick,0,false,'Pro');
  if(combo.rally>previous){actions.push(combo.shot);participants.add(combo.lastHit);previous=combo.rally;}
}
assert.deepEqual(actions.slice(0,6).map(action=>action==='DIVING SAVE'?'RECEPTION':action),['RECEPTION','SET','ATTACK','RECEPTION','SET','ATTACK']);
assert.equal(participants.size,4,'All four athletes participate across the net');
assert.equal(combo.status,'playing','Complete combinations must clear the net and remain in bounds');
// Regression: a low contact far from the net used to hit the tape with a fixed .82s arc.
const low=createGame();serve(low);low.cooldown=0;low.lastTeam=0;low.lastHit=1;low.touches=2;
Object.assign(low.players[0],{x:200,y:385,action:'spike',actionTime:.28});
low.ball={...contactPoint(low.players[0]),vx:0,vz:0,vy:50};setAim(low,900,350);
step(low,tick,0,false,'Club',true);
assert.ok(Math.abs(landingX(low,437)-900)<.001 && Math.abs(landingZ(low,437)-350)<.001,'Attack follows the chosen aim');
const lowBall=low.ball,netTime=(500-lowBall.x)/lowBall.vx;
assert.ok(lowBall.y+lowBall.vy*netTime+310*netTime*netTime<250,'Low attack must clear the tape');
let arcs=0;
for(const team of [0,1])for(const startX of [55,210,440,475])for(const height of [145,245,310,384])for(const targetX of [570,790,935])for(const targetZ of [55,225,395]){
  const shot=createGame();shot.windEnabled=false;shot.status='playing';shot.active=-1;shot.lastTeam=team;shot.cooldown=99;
  shot.ball={x:team?1000-startX:startX,z:225,y:height,vx:0,vz:0,vy:0};
  const target={x:team?1000-targetX:targetX,z:targetZ};launch(shot,target,.65);
  const direction=team?-1:1;let last={...shot.ball};
  for(let i=0;i<900&&shot.status==='playing';i++){
    last={...shot.ball};step(shot,tick,0,false,'Pro');
    if(shot.status==='playing')assert.ok(shot.ball.vx*direction>0,'Trajectory must not bounce from the net');
  }
  assert.equal(shot.status,'ready');assert.equal(shot.score[team],1,'Aimed ball must land inside the opponent court');
  assert.ok(Math.abs(last.x-target.x)<12 && Math.abs(last.z-target.z)<12,'Landing follows the selected target');arcs++;
}
const automatic=contact(0,3,1);step(automatic,tick,0,false,'Club');assert.equal(automatic.active,1,'Control follows the pass to the partner');
for(let i=0;i<20;i++){step(automatic,tick,0,false,'Club');assert.equal(automatic.active,1,'Receiver remains stable during the pass');}
const incoming=createGame();incoming.status='playing';incoming.players[0].x=50;incoming.players[0].z=40;
incoming.ball={x:380,z:310,y:100,vx:0,vz:0,vy:0};step(incoming,tick,0,false,'Club');assert.equal(incoming.active,1);
incoming.autoSwitch=false;incoming.active=0;step(incoming,tick,0,false,'Club');assert.equal(incoming.active,0,'Manual mode stays selected');
const aiming=createGame();setAim(aiming,600,75);serve(aiming);assert.ok(Math.abs(landingX(aiming,437)-600)<.001 && Math.abs(landingZ(aiming,437)-75)<.001);
const other=createGame();setAim(other,925,390);serve(other);assert.ok(Math.abs(landingX(other,437)-925)<.001 && Math.abs(landingZ(other,437)-390)<.001);
setAim(other,NaN,200);assert.deepEqual(other.aim,{x:925,z:390});setAim(other,10000,-100);assert.deepEqual(other.aim,{x:935,z:55});
const styles=new Set<number>();for(const style of ['underhand','float','jump']){const s=createGame();setServeStyle(s,style);serve(s);styles.add(s.ball.vx);assert.ok(Math.abs(landingX(s,437)-s.aim.x)<.001);}
assert.equal(styles.size,3,'Serve styles have different trajectories');
const gentle=createGame(),strong=createGame();gentle.power=.7;strong.power=1.25;serve(gentle);serve(strong);assert.ok(strong.ball.vx>gentle.ball.vx,'Power changes ball speed');
console.log(`Passed: ${arcs} net-clearance and aiming cases, automatic selection, three serves, power, and existing match checks.`);

const waiting=createGame();releaseServe(waiting);assert.equal(waiting.status,'ready');prepareServe(waiting);
const stationary={...waiting.ball};for(let i=0;i<300;i++)step(waiting,tick,1,true,'Club');
assert.equal(waiting.status,'serving');assert.deepEqual(waiting.ball,stationary);toss(waiting);waiting.tossTime=.55;releaseServe(waiting);assert.equal(waiting.status,'playing');
assert.equal(contactQuality(10),'BOM');assert.equal(contactQuality(40),'RUIM');
const guide=guidance(waiting);assert.ok(Number.isFinite(guide.x)&&Number.isFinite(guide.time));
assert.match(reception.feedback,/RECEPÇÃO BOM/);assert.match(set.feedback,/PASSE BOM/);assert.match(attack.feedback,/ATAQUE BOM/);
const stretched=createGame();serve(stretched);stretched.autoSwitch=false;stretched.active=0;stretched.cooldown=0;stretched.lastTeam=1;stretched.lastHit=3;
stretched.players[0].action='bump';stretched.players[0].actionTime=.28;
stretched.ball={...contactPoint(stretched.players[0]),vx:0,vz:0,vy:0};stretched.ball.z+=39;
step(stretched,tick,0,false,'Club');assert.match(stretched.feedback,/RECEPÇÃO RUIM/,'Assisted edge contact is playable and honestly graded');
const assistance=createGame();serve(assistance);assistance.autoSwitch=false;assistance.lastTeam=1;assistance.lastHit=3;
assistance.ball={x:assistance.players[0].x+70,z:assistance.players[0].z,y:180,vx:0,vz:0,vy:0};
const initialDistance=Math.abs(assistance.players[0].x-guidance(assistance).x);step(assistance,tick,0,false,'Club');
assert.ok(Math.abs(assistance.players[0].x-guidance(assistance).x)<initialDistance,'Assistance moves toward the displayed guide');

const tossGame=createGame();prepareServe(tossGame);toss(tossGame);releaseServe(tossGame);assert.equal(tossGame.status,'tossing','Cannot strike before the toss rises');
const tossY=tossGame.ball.y;step(tossGame,.1,0,false,'Club');assert.ok(tossGame.ball.y<tossY,'Toss actually moves upward');
for(let i=0;i<150;i++)step(tossGame,tick,0,false,'Club');assert.equal(tossGame.status,'serving','Missed toss returns to preparation');
function secondBall(style:string){const g=createGame();serve(g);g.autoSwitch=false;g.active=0;g.cooldown=0;g.lastTeam=0;g.lastHit=1;g.touches=1;setAttackStyle(g,style);g.players[0].action='spike';g.players[0].actionTime=.28;g.ball={...contactPoint(g.players[0]),vx:0,vz:0,vy:0};step(g,tick,0,false,'Club',true);return g;}
const second=secondBall('power');assert.equal(second.touches,2);assert.equal(second.shot,'ATTACK');assert.ok(landingX(second,437)>500);
const tip=secondBall('tip');assert.ok(landingX(tip,437)<=651);assert.match(tip.feedback,/LARGADINHA/);
const roll=secondBall('roll');assert.match(roll.feedback,/COLOCADO/);assert.notEqual(roll.ball.vx,second.ball.vx);
const blocking=createGame();serve(blocking);blocking.autoSwitch=false;blocking.active=0;blocking.cooldown=0;blocking.lastTeam=1;blocking.lastHit=2;
Object.assign(blocking.players[0],{x:450,z:225,y:350});blocking.ball={x:460,z:225,y:210,vx:-220,vz:0,vy:20};
step(blocking,tick,0,false,'Club',false,false,0,true);assert.equal(blocking.shot,'BLOQUEIO');assert.ok(blocking.ball.vx>0);assert.equal(blocking.touches,0);
const windy=createGame();serve(windy);windy.windEnabled=true;windy.clock=3;windy.ball={x:750,z:225,y:0,vx:0,vz:0,vy:0};step(windy,tick,0,false,'Club');assert.notEqual(windy.ball.vz,0);
const firstWind=windy.wind;windy.clock=12;step(windy,tick,0,false,'Club');assert.notEqual(windy.wind,firstWind);windy.windEnabled=false;step(windy,tick,0,false,'Club');assert.equal(windy.wind,0);
const diagonal=createGame();serve(diagonal);diagonal.autoSwitch=false;diagonal.players[0].x=220;
step(diagonal,tick,-1,false,'Club',false,true,1);
assert.equal(diagonal.players[0].action,'dive');assert.ok(diagonal.players[0].vx<0&&diagonal.players[0].vz>0);
const hands=contactPoint(diagonal.players[0]);assert.ok(hands.x<diagonal.players[0].x&&hands.z>diagonal.players[0].z);
const save=createGame();serve(save);save.autoSwitch=false;save.lastTeam=1;save.lastHit=3;save.cooldown=0;
Object.assign(save.players[0],{x:220,z:225,action:'dive',actionTime:.55,diveX:-1,diveZ:0,vx:0,vz:0});
save.ball={...contactPoint(save.players[0]),vx:0,vz:0,vy:30};step(save,tick,0,false,'Club');
assert.equal(save.shot,'DIVING SAVE');assert.ok(save.ball.vy<0);assert.match(save.feedback,/DEFESA NO CHÃO/);
const recovery=createGame();serve(recovery);recovery.autoSwitch=false;recovery.players[0].action='dive';recovery.players[0].actionTime=.2;recovery.ball={x:900,z:400,y:0,vx:0,vz:0,vy:0};
step(recovery,tick,1,true,'Club');assert.equal(recovery.players[0].vy,0);assert.equal(recovery.players[0].vx,0,'Recovery cannot run or jump');
const cpuSave=createGame();serve(cpuSave);cpuSave.active=-1;cpuSave.cooldown=0;cpuSave.lastTeam=0;cpuSave.lastHit=0;
Object.assign(cpuSave.players[2],{x:620,z:145});cpuSave.ball={x:720,z:145,y:390,vx:0,vz:0,vy:160};
step(cpuSave,tick,0,false,'Pro');assert.equal(cpuSave.players[2].action,'dive','CPU dives for a reachable low ball beyond standing range');


// The assisted drill must complete all three contacts and restart without scoring.
const { startPractice, strokeQuality } = await import('./game.ts');
const drill=createGame();startPractice(drill);
const drillShots:string[]=[];
for(let i=0;i<700&&drill.status==='playing';i++){
  const rally=drill.rally;
  step(drill,1/120,0,false,'Club',true);
  if(drill.rally!==rally)drillShots.push(drill.shot);
}
assert.deepEqual(drillShots,['RECEPTION','SET','ATTACK']);
assert.equal(drill.status,'practice-wait');
assert.equal(drill.repetitions,1);
assert.deepEqual(drill.score,[0,0]);
assert.equal(drill.wind,0);
for(let i=0;i<150;i++)step(drill,1/120,0,false,'Club');
assert.equal(drill.status,'playing');
assert.equal(drill.rally,0);
const targetBefore=drill.aim.x;
step(drill,1/120,1,false,'Club',true);
assert.ok(drill.aim.x>targetBefore);
assert.ok(drill.players[drill.active].preparation>0);
assert.ok(strokeQuality(10,.7,0)>strokeQuality(55,0,320));
assert.ok(strokeQuality(55,0,320)>0);
console.log('Passed: practice sequence, automatic restart, preparation, aiming and graduated quality.');
