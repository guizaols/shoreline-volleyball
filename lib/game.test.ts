import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, serve, step, point, switchPlayer, landingX, landingZ, contactPoint, FLOOR } from './game.ts';
const atlas=readFileSync(new URL('../public/art/athlete-clean.png',import.meta.url));
assert.equal(atlas.readUInt32BE(16),1254,'Sprite frame coordinates require the original atlas width');
assert.equal(atlas[25],6,'Athlete atlas must have true alpha transparency');
const tick = 1 / 120;
const g = createGame();
assert.equal(g.players.length, 4);
assert.deepEqual(g.players.map(p => p.team), [0, 0, 1, 1]);
serve(g); assert.equal(g.status, 'playing');
for (let i = 0; i < 150; i++) step(g, tick, 0, false, 'Club');
assert.ok(g.ball.x > 500 && g.ball.y < 274, 'Serve clears the net');
g.ball = { x: 80, z: 40, y: 439, vx: 0, vz: 0, vy: 50 }; step(g, tick, 0, false, 'Club');
assert.deepEqual(g.score, [0, 1]); assert.equal(g.server, 1);
g.score = [10, 10]; point(g, 0); assert.equal(g.status, 'ready'); point(g, 0); assert.equal(g.status, 'over');
const p = createGame(); serve(p); p.status = 'paused'; const old = JSON.stringify(p); step(p, tick, 1, true, 'Pro'); assert.equal(JSON.stringify(p), old);
const n = createGame(); serve(n); n.ball = { x: 480, z: 200, y: 340, vx: 240, vz: 0, vy: 0 }; step(n, 1 / 30, 0, false, 'Club'); assert.ok(n.ball.vx < 0, 'Net bounces the ball');
const m = createGame(); serve(m); step(m, tick, 1, false, 'Club');
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
assert.deepEqual(actions.slice(0,6),['RECEPTION','SET','ATTACK','RECEPTION','SET','ATTACK']);
assert.equal(participants.size,4,'All four athletes participate across the net');
assert.equal(combo.status,'playing','Complete combinations must clear the net and remain in bounds');
console.log('Passed: doubles, smooth movement, jump edge, switching, three-touch combinations, faults, dive, CPU teamwork, serve, net, pause and scoring.');
