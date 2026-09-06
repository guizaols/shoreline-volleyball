import assert from 'node:assert/strict';
import { createGame, serve, step, point, switchPlayer, landingX, FLOOR } from './game.ts';
const tick = 1 / 120;
const g = createGame();
assert.equal(g.players.length, 4);
assert.deepEqual(g.players.map(p => p.team), [0, 0, 1, 1]);
serve(g); assert.equal(g.status, 'playing');
for (let i = 0; i < 150; i++) step(g, tick, 0, false, 'Club');
assert.ok(g.ball.x > 500 && g.ball.y < 274, 'Serve clears the net');
g.ball = { x: 80, y: 439, vx: 0, vy: 50 }; step(g, tick, 0, false, 'Club');
assert.deepEqual(g.score, [0, 1]); assert.equal(g.server, 1);
g.score = [10, 10]; point(g, 0); assert.equal(g.status, 'ready'); point(g, 0); assert.equal(g.status, 'over');
const p = createGame(); serve(p); p.status = 'paused'; const old = JSON.stringify(p); step(p, tick, 1, true, 'Pro'); assert.equal(JSON.stringify(p), old);
const n = createGame(); serve(n); n.ball = { x: 480, y: 340, vx: 240, vy: 0 }; step(n, 1 / 30, 0, false, 'Club'); assert.ok(n.ball.vx < 0, 'Net bounces the ball');
const m = createGame(); serve(m); step(m, tick, 1, false, 'Club');
assert.ok(m.players[0].vx > 0 && m.players[0].vx < 100, 'Movement accelerates rather than snapping');
const speed = m.players[0].vx; step(m, tick, 0, false, 'Club');
assert.ok(m.players[0].vx > 0 && m.players[0].vx < speed, 'Release brakes smoothly');
switchPlayer(m); assert.equal(m.active, 1); switchPlayer(m); assert.equal(m.active, 0);
const j = createGame(); serve(j); let launches = 0, wasGrounded = true;
for (let i = 0; i < 110; i++) {
  // Keep the rally alive and test a held jump across a complete landing.
  j.ball = { x: 900, y: 0, vx: 0, vy: 0 };
  step(j, tick, 0, true, 'Club');
  const grounded = j.players[0].y === FLOOR;
  if (wasGrounded && !grounded) launches++;
  wasGrounded = grounded;
}
assert.equal(launches, 1, 'Holding jump must not bunny-hop after landing');
function contact(player: number, lastHit: number, touches: number) {
  const c = createGame(); serve(c); c.cooldown = 0; c.lastHit = lastHit; c.lastTeam = lastHit < 2 ? 0 : 1; c.touches = touches;
  c.ball = { x: c.players[player].x, y: 385, vx: 0, vy: 50 };
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
  step(rally, tick, Math.max(-1, Math.min(1, (target - current.x) / 35)), false, 'Pro');
  if (rally.rally !== previousHits && rally.lastTeam === 1) cpuHits.add(rally.lastHit);
  previousHits = rally.rally;
  assert.ok(rally.players.every(p => Number.isFinite(p.x) && p.x >= (p.team ? 537 : 40) && p.x <= (p.team ? 960 : 463)));
}
assert.equal(cpuHits.size, 2, 'Both CPU teammates must participate in the rally');
console.log('Passed: doubles, smooth movement, jump edge, switching, three-touch combinations, faults, dive, CPU teamwork, serve, net, pause and scoring.');
