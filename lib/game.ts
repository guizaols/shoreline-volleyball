export const FLOOR = 450;
export type Player = { x: number; y: number; vy: number };
export function createGame() {
  return { players: [{ x: 260, y: FLOOR, vy: 0 }, { x: 740, y: FLOOR, vy: 0 }] as Player[], ball: { x: 260, y: 325, vx: 0, vy: 0 }, score: [0, 0], server: 0, status: 'ready', message: 'Your beach. Your game.', cooldown: 0, lastHit: -1, touches: 0, rally: 0 };
}
export type Game = ReturnType<typeof createGame>;
export function serve(g: Game) {
  if (g.status !== 'ready') return;
  g.status = 'playing'; g.message = ''; g.ball = { x: g.server ? 735 : 265, y: 280, vx: g.server ? -230 : 230, vy: -330 }; g.lastHit = g.server; g.touches = 1; g.cooldown = .3;
}
export function point(g: Game, winner: number) {
  g.score[winner]++; g.server = winner;
  g.status = Math.max(...g.score) >= 11 && Math.abs(g.score[0] - g.score[1]) >= 2 ? 'over' : 'ready';
  g.message = g.status === 'over' ? (winner === 0 ? 'You own the beach!' : 'The beach wants a rematch.') : (winner === 0 ? 'Point, you. Nicely done!' : 'Point, Coast. Next ball.');
  g.players = [{ x: 260, y: FLOOR, vy: 0 }, { x: 740, y: FLOOR, vy: 0 }]; g.ball = { x: winner ? 740 : 260, y: 325, vx: 0, vy: 0 }; g.rally = 0; g.touches = 0;
}
export function step(g: Game, dt: number, move: number, jump: boolean, difficulty: string) {
  if (g.status !== 'playing') return;
  const [you, cpu] = g.players, b = g.ball;
  you.x = Math.max(65, Math.min(465, you.x + move * 310 * dt));
  if (jump && you.y === FLOOR) you.vy = -440;
  const target = b.x > 490 ? Math.max(545, Math.min(935, b.x + b.vx * .18)) : 725;
  const speed = difficulty === 'Chill' ? 145 : difficulty === 'Pro' ? 285 : 215;
  cpu.x += Math.sign(target - cpu.x) * Math.min(Math.abs(target - cpu.x), speed * dt);
  if (b.x > 530 && Math.abs(b.x - cpu.x) < 75 && b.y > 235 && b.y < 345 && b.vy > 0 && cpu.y === FLOOR) cpu.vy = -410;
  for (const p of g.players) { p.vy += 1050 * dt; p.y += p.vy * dt; if (p.y >= FLOOR) { p.y = FLOOR; p.vy = 0; } }
  const oldX = b.x; b.vy += 520 * dt; b.x += b.vx * dt; b.y += b.vy * dt; g.cooldown -= dt;
  if (b.x < 24 || b.x > 976) { b.x = Math.max(24, Math.min(976, b.x)); b.vx *= -.8; }
  if (b.y > 291 && b.y < FLOOR && ((oldX < 500 && b.x >= 487) || (oldX > 500 && b.x <= 513))) { b.x = oldX < 500 ? 486 : 514; b.vx *= -.7; }
  for (let i = 0; i < 2; i++) {
    const p = g.players[i], dx = b.x - p.x, dy = b.y - (p.y - 48);
    if (Math.hypot(dx, dy) < 48 && g.cooldown <= 0) {
      g.touches = g.lastHit === i ? g.touches + 1 : 1; g.lastHit = i;
      if (g.touches > 3) { point(g, 1 - i); return; }
      b.y = p.y - 98; b.vy = -440; b.vx = (i === 0 ? 1 : -1) * (220 + Math.min(70, Math.abs(dx))); g.cooldown = .25; g.rally++;
    }
  }
  if (b.y >= FLOOR - 13) point(g, b.x < 500 ? 1 : 0);
}
