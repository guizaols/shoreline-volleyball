export const FLOOR = 450;
const GRAVITY = 620;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export type Action = 'idle' | 'bump' | 'set' | 'spike' | 'dive';
export type Player = {
  x: number; y: number; vx: number; vy: number; team: number;
  action: Action; actionTime: number; stride: number; landing: number;
  windup: number; jumpBuffer: number; jumpHeld: boolean; diveHeld: boolean;
};
function players(): Player[] {
  return [200, 380, 620, 800].map((x, i) => ({ x, y: FLOOR, vx: 0, vy: 0, team: i < 2 ? 0 : 1,
    action: 'idle', actionTime: 0, stride: 0, landing: 0, windup: 0, jumpBuffer: 0, jumpHeld: false, diveHeld: false }));
}
export function createGame() {
  return { players: players(), active: 0, ball: { x: 200, y: 325, vx: 0, vy: 0 }, score: [0, 0],
    server: 0, status: 'ready', message: 'Four players. One perfect rally.', cooldown: 0,
    lastHit: -1, lastTeam: -1, touches: 0, rally: 0, shot: '', hitFlash: 0 };
}
export type Game = ReturnType<typeof createGame>;
export function switchPlayer(g: Game) {
  if (g.status === 'playing' || g.status === 'ready') g.active = 1 - g.active;
}
export function serve(g: Game) {
  if (g.status !== 'ready') return;
  g.status = 'playing'; g.message = '';
  g.ball = { x: g.server ? 800 : 200, y: 270, vx: g.server ? -255 : 255, vy: -390 };
  g.lastHit = g.server ? 3 : 0; g.lastTeam = g.server; g.touches = 1; g.cooldown = .3;
  g.players[g.lastHit].action = 'spike'; g.players[g.lastHit].actionTime = .4; g.shot = 'SERVE';
}
export function point(g: Game, winner: number, reason = '') {
  g.score[winner]++; g.server = winner;
  g.status = Math.max(...g.score) >= 11 && Math.abs(g.score[0] - g.score[1]) >= 2 ? 'over' : 'ready';
  g.message = g.status === 'over' ? (winner === 0 ? 'Your team owns the beach!' : 'The beach wants a rematch.')
    : `${winner === 0 ? 'Your point!' : 'Point, Coast.'}${reason ? ` ${reason}` : ' Next ball.'}`;
  g.players = players(); g.ball = { x: winner ? 800 : 200, y: 325, vx: 0, vy: 0 };
  g.rally = 0; g.touches = 0; g.lastHit = -1; g.lastTeam = -1; g.shot = ''; g.hitFlash = 0;
}
// Predict the descending crossing of a contact height, using the same gravity as the ball.
export function landingX(g: Game, height = 375) {
  const b = g.ball, discriminant = b.vy * b.vy + 2 * GRAVITY * (height - b.y);
  const t = discriminant < 0 ? 0 : Math.max(0, (-b.vy + Math.sqrt(discriminant)) / GRAVITY);
  return b.x + b.vx * t;
}
function hit(g: Game, i: number, attack: boolean) {
  const p = g.players[i], b = g.ball, sameTeam = g.lastTeam === p.team;
  if (sameTeam && g.lastHit === i) { point(g, 1 - p.team, 'Double touch.'); return; }
  g.touches = sameTeam ? g.touches + 1 : 1;
  if (g.touches > 3) { point(g, 1 - p.team, 'Four touches.'); return; }
  g.lastTeam = p.team; g.lastHit = i; g.rally++; g.cooldown = .2; g.hitFlash = .16;
  const partner = g.players[i ^ 1];
  const sendOver = g.touches === 3 || (attack && p.y < FLOOR - 45);
  const action = sendOver ? 'spike' : g.touches === 1 ? 'bump' : 'set';
  const diving = p.action === 'dive';
  if (!diving) { p.action = action; p.actionTime = .42; }
  b.y = p.y - (diving ? 30 : action === 'bump' ? 65 : 97);
  const target = sendOver ? (p.team ? 190 : 810) : clamp(partner.x, p.team ? 575 : 85, p.team ? 915 : 425);
  if (sendOver) {
    // A high contact can drive down; lower contacts use a safe arc over the net.
    if (b.y < 255) {
      const flight = .7;
      b.vx = (target - b.x) / flight;
      b.vy = (FLOOR - 13 - b.y - .5 * GRAVITY * flight * flight) / flight;
    } else {
      b.vy = -460;
      const flight = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * (375 - b.y))) / GRAVITY;
      b.vx = (target - b.x) / flight;
    }
  } else {
    b.vy = g.touches === 1 ? -385 : -455;
    const flight = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * (365 - b.y))) / GRAVITY;
    b.vx = (target - b.x) / flight;
  }
  g.shot = diving ? 'DIVING SAVE' : action === 'bump' ? 'RECEPTION' : action === 'set' ? 'SET' : 'ATTACK';
}
export function step(g: Game, dt: number, move: number, jump: boolean, difficulty: string, attack = false, dive = false) {
  if (g.status !== 'playing') return;
  const b = g.ball, predicted = landingX(g), receivingTeam = predicted < 500 ? 0 : 1;
  const receivers = [0, 2];
  for (const team of [0, 1]) {
    const ids = [team * 2, team * 2 + 1];
    receivers[team] = ids.reduce((a, c) => {
      const cost = (id: number) => Math.abs(g.players[id].x - predicted) + (g.lastTeam === team && g.lastHit === id ? 1000 : 0);
      return cost(a) <= cost(c) ? a : c;
    });
  }
  for (let i = 0; i < 4; i++) {
    const p = g.players[i], human = i === g.active;
    p.actionTime = Math.max(0, p.actionTime - dt); p.landing = Math.max(0, p.landing - dt);
    if (!p.actionTime) p.action = 'idle';
    let direction = move, wantsJump = jump;
    if (!human) {
      const onBall = receivingTeam === p.team && receivers[p.team] === i;
      const home = i % 2 === 0 ? (p.team ? 620 : 200) : (p.team ? 800 : 380);
      const target = onBall ? clamp(predicted, p.team ? 550 : 45, p.team ? 955 : 450) : home;
      direction = clamp((target - p.x) / 38, -1, 1);
      wantsJump = onBall && g.lastTeam === p.team && g.touches >= 2 && Math.abs(b.x - p.x) < 85 && b.vy > 0 && b.y > 140 && b.y < 260;
    }
    if (wantsJump && !p.jumpHeld) p.jumpBuffer = .15;
    p.jumpHeld = wantsJump;
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.jumpBuffer > 0 && p.y === FLOOR && p.windup === 0 && p.action !== 'dive') { p.windup = .065; p.jumpBuffer = 0; }
    if (p.windup > 0) { p.windup = Math.max(0, p.windup - dt); if (!p.windup) p.vy = -510; }
    const wantsDive = human && dive;
    if (wantsDive && !p.diveHeld && p.y === FLOOR && !p.windup && p.action !== 'dive') {
      p.action = 'dive'; p.actionTime = .6; p.vx = (direction || (b.x >= p.x ? 1 : -1)) * 490;
    }
    p.diveHeld = wantsDive;
    const speed = human ? 320 : p.team === 0 ? 295 : difficulty === 'Chill' ? 205 : difficulty === 'Pro' ? 310 : 265;
    if (p.action === 'dive') p.vx *= Math.exp(-2.8 * dt);
    else p.vx += (direction * speed - p.vx) * (1 - Math.exp(-(p.y < FLOOR ? 8 : 16) * dt));
    p.x += p.vx * dt;
    const bounded = clamp(p.x, p.team ? 537 : 40, p.team ? 960 : 463);
    if (bounded !== p.x) p.vx = 0;
    p.x = bounded; p.stride += Math.abs(p.vx) * dt / 23;
    p.vy += 1150 * dt; p.y += p.vy * dt;
    if (p.y >= FLOOR) { if (p.vy > 150) p.landing = .18; p.y = FLOOR; p.vy = 0; }
  }
  // Teammates keep enough room to remain readable and cover separate positions.
  for (const a of [0, 2]) {
    const p = g.players[a], q = g.players[a + 1], distance = q.x - p.x;
    if (Math.abs(distance) < 40 && Math.abs(p.y - q.y) < 55) {
      const correction = (40 - Math.abs(distance)) * .5, sign = distance >= 0 ? 1 : -1;
      p.x = clamp(p.x - sign * correction, p.team ? 537 : 40, p.team ? 960 : 463);
      q.x = clamp(q.x + sign * correction, q.team ? 537 : 40, q.team ? 960 : 463);
    }
  }
  const oldX = b.x, oldY = b.y;
  b.vy += GRAVITY * dt; b.x += b.vx * dt; b.y += b.vy * dt;
  g.cooldown = Math.max(0, g.cooldown - dt); g.hitFlash = Math.max(0, g.hitFlash - dt);
  if (Math.abs(b.x - 500) < 18 && oldY < 274 && b.y >= 274 && b.vy > 0) { b.y = 274; b.vy *= -.55; }
  else if (b.y >= 274 && b.y < FLOOR && ((oldX <= 482 && b.x > 482) || (oldX >= 518 && b.x < 518))) {
    b.x = oldX < 500 ? 482 : 518; b.vx *= -.65;
  }
  if (g.cooldown === 0) {
    // Resolve the closest contact once per tick; both players share the team's touch count.
    const contacts = g.players.map((p, i) => ({ i, distance: Math.hypot(b.x - p.x, b.y - (p.y - (p.action === 'dive' ? 26 : 64))) }))
      .filter(c => c.distance < (g.players[c.i].action === 'dive' ? 67 : 48))
      .sort((a, c) => a.distance - c.distance);
    if (contacts.length) hit(g, contacts[0].i, contacts[0].i === g.active ? attack : true);
  }
  if (g.status === 'playing' && b.y >= FLOOR - 13) {
    const out = b.x < 35 || b.x > 965;
    point(g, out ? 1 - Math.max(0, g.lastTeam) : b.x < 500 ? 1 : 0, out ? 'Out.' : '');
  }
}
