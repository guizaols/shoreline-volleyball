export const FLOOR = 450;
const GRAVITY = 620;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export type ServeStyle = 'underhand' | 'float' | 'jump';
export type Action = 'idle' | 'bump' | 'set' | 'spike' | 'dive';
export type Player = {
  x: number; z: number; y: number; vx: number; vz: number; vy: number; team: number;
  action: Action; actionTime: number; stride: number; landing: number;
  windup: number; jumpBuffer: number; jumpHeld: boolean; diveHeld: boolean;
};
function players(): Player[] {
  return [200, 380, 620, 800].map((x, i) => ({ x, z: i % 2 ? 310 : 145, y: FLOOR, vx: 0, vz: 0, vy: 0, team: i < 2 ? 0 : 1,
    action: 'idle', actionTime: 0, stride: 0, landing: 0, windup: 0, jumpBuffer: 0, jumpHeld: false, diveHeld: false }));
}
export function createGame() {
  return { players: players(), active: 0, autoSwitch: true, aim: {x:810,z:225}, power: 1, serveStyle: 'float' as ServeStyle, ball: { x: 200, z: 145, y: 325, vx: 0, vz: 0, vy: 0 }, score: [0, 0],
    server: 0, status: 'ready', message: 'Four players. One perfect rally.', cooldown: 0,
    lastHit: -1, lastTeam: -1, touches: 0, rally: 0, shot: '', hitFlash: 0 };
}
export type Game = ReturnType<typeof createGame>;
export function switchPlayer(g: Game) {
  if (g.status === 'playing' || g.status === 'ready') g.active = 1 - g.active;
}
export function setAim(g: Game, x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  g.aim={x:clamp(x,570,935),z:clamp(z,55,395)};
}
export function setServeStyle(g: Game, style: string) {
  if(style==='underhand'||style==='float'||style==='jump')g.serveStyle=style;
}
// Solve the landing arc and raise it only as much as the whole net band requires.
export function launch(g: Game, target: {x:number;z:number}, preferredFlight: number) {
  const b=g.ball,landingY=FLOOR-13;
  let flight=Math.max(.55,preferredFlight);
  for(const netX of [482,500,518]) {
    const u=(netX-b.x)/(target.x-b.x);
    if(u>0 && u<1) {
      const linearY=b.y+(landingY-b.y)*u;
      const needed=2*(linearY-248)/(GRAVITY*u*(1-u));
      flight=Math.max(flight,Math.sqrt(Math.max(0,needed)));
    }
  }
  b.vx=(target.x-b.x)/flight;b.vz=(target.z-b.z)/flight;
  b.vy=(landingY-b.y-.5*GRAVITY*flight*flight)/flight;
}
function opponentTarget(g: Game) {
  const candidates=[100,260,420].flatMap(x=>[70,225,380].map(z=>({x,z})));
  const space=(t:{x:number;z:number})=>Math.min(...g.players.slice(0,2).map(p=>Math.hypot(t.x-p.x-p.vx*.25,t.z-p.z-p.vz*.25)));
  return candidates.reduce((best,t)=>space(t)>space(best)?t:best);
}
export function serve(g: Game) {
  if (g.status !== 'ready') return;
  const style=g.server?(['float','underhand','jump'] as ServeStyle[])[(g.score[0]+g.score[1])%3]:g.serveStyle;
  const i=g.server?3:0,p=g.players[i];
  p.x=g.server?960:40;p.z=225;p.y=style==='jump'?365:FLOOR;p.vy=style==='jump'?-130:0;
  p.action=style==='underhand'?'bump':'spike';p.actionTime=.26;
  g.ball={...contactPoint(p),vx:0,vz:0,vy:0};
  launch(g,g.server?opponentTarget(g):g.aim,(style==='underhand'?1.9:style==='float'?1.45:1.05)/(g.server?1:g.power));
  g.status='playing';g.message='';g.lastHit=i;g.lastTeam=g.server;g.touches=1;g.cooldown=.3;
  g.shot=style==='underhand'?'UNDERHAND SERVE':style==='float'?'FLOAT SERVE':'JUMP SERVE';
}
export function point(g: Game, winner: number, reason = '') {
  g.score[winner]++; g.server = winner;
  g.status = Math.max(...g.score) >= 11 && Math.abs(g.score[0] - g.score[1]) >= 2 ? 'over' : 'ready';
  g.message = g.status === 'over' ? (winner === 0 ? 'Your team owns the beach!' : 'The beach wants a rematch.')
    : `${winner === 0 ? 'Your point!' : 'Point, Coast.'}${reason ? ` ${reason}` : ' Next ball.'}`;
  g.players = players(); g.ball = { x: winner ? 800 : 200, z: winner ? 310 : 145, y: 325, vx: 0, vz: 0, vy: 0 };
  g.active=0; g.rally = 0; g.touches = 0; g.lastHit = -1; g.lastTeam = -1; g.shot = ''; g.hitFlash = 0;
}
// Predict the descending crossing of a contact height, using the same gravity as the ball.
export function flightTime(g: Game, height = 375) {
  const b = g.ball, discriminant = b.vy * b.vy + 2 * GRAVITY * (height - b.y);
  const t = discriminant < 0 ? 0 : Math.max(0, (-b.vy + Math.sqrt(discriminant)) / GRAVITY);
  return t;
}
export function landingX(g: Game, height = 375) { return g.ball.x + g.ball.vx * flightTime(g,height); }
export function landingZ(g: Game, height = 375) { return g.ball.z + g.ball.vz * flightTime(g,height); }
export function contactPoint(p: Player) {
  const height=p.action==='dive'?28:p.action==='spike'?140:p.action==='set'?116:66;
  return {x:p.x+(p.team?-1:1)*(p.action==='bump'?27:p.action==='dive'?49:12),z:p.z,y:p.y-height};
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
  if (!diving) { p.action = action; p.actionTime = .26; }
  const hand=contactPoint(p);
  b.x=hand.x; b.y=hand.y; b.z=hand.z;
  if (sendOver) {
    const target=p.team?opponentTarget(g):g.aim;
    launch(g,target,(b.y<255?.82:1.3)/(p.team?1:g.power));
  } else {
    b.vy = g.touches === 1 ? -385 : -455;
    const flight = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * (365 - b.y))) / GRAVITY;
    b.vx=(clamp(partner.x,p.team?575:85,p.team?915:425)-b.x)/flight;
    b.vz=(partner.z-b.z)/flight;
  }
  g.shot = diving ? 'DIVING SAVE' : action === 'bump' ? 'RECEPTION' : action === 'set' ? 'SET' : 'ATTACK';
}
export function step(g: Game, dt: number, move: number, jump: boolean, difficulty: string, attack = false, dive = false, depth = 0) {
  if (g.status !== 'playing') return;
  const b = g.ball, receivingTeam = landingX(g) < 500 ? 0 : 1;
  const contactHeight=g.lastTeam===receivingTeam?(g.touches>=2?235:334):384;
  const predicted = landingX(g,contactHeight), predictedZ = landingZ(g,contactHeight);
  const receivers = [0, 2];
  for (const team of [0, 1]) {
    const ids = [team * 2, team * 2 + 1];
    receivers[team] = ids.reduce((a, c) => {
      const cost = (id: number) => Math.hypot(g.players[id].x - predicted, g.players[id].z - predictedZ) + (g.lastTeam === team && g.lastHit === id ? 1000 : 0);
      return cost(a) <= cost(c) ? a : c;
    });
  }
  if(g.autoSwitch && g.active>=0 && receivingTeam===0) {
    const next=receivers[0], current=g.players[g.active];
    const distance=(p:Player)=>Math.hypot(p.x-predicted,p.z-predictedZ);
    // Hysteresis prevents control from flickering between two equally close players.
    if(next!==g.active && (g.lastTeam===0&&g.lastHit===g.active || distance(current)>distance(g.players[next])+65)) {
      g.active=next;g.players[next].jumpHeld=jump;g.players[next].diveHeld=dive;
    }
  }
  for (let i = 0; i < 4; i++) {
    const p = g.players[i], human = i === g.active;
    p.actionTime = Math.max(0, p.actionTime - dt); p.landing = Math.max(0, p.landing - dt);
    if (!p.actionTime) p.action = 'idle';
    let direction = move, depthDirection=depth, wantsJump = jump;
    if (!human) {
      const onBall = receivingTeam === p.team && receivers[p.team] === i;
      const home = i % 2 === 0 ? (p.team ? 620 : 200) : (p.team ? 800 : 380);
      const target = onBall ? clamp(predicted+(p.team?1:-1)*(contactHeight===384?27:12), p.team ? 550 : 45, p.team ? 955 : 450) : home;
      direction = clamp((target - p.x) / 38, -1, 1);
      const targetZ=onBall?clamp(predictedZ,35,415):(i%2?310:145);
      depthDirection=clamp((targetZ-p.z)/38,-1,1);
      wantsJump = onBall && g.lastTeam === p.team && g.touches >= 2 && Math.hypot(b.x - p.x,b.z-p.z) < 85 && b.vy > 0 && b.y > 140 && b.y < 260;
    }
    const magnitude=Math.hypot(direction,depthDirection);
    if(magnitude>1){direction/=magnitude;depthDirection/=magnitude;}
    if (wantsJump && !p.jumpHeld) p.jumpBuffer = .15;
    p.jumpHeld = wantsJump;
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.jumpBuffer > 0 && p.y === FLOOR && p.windup === 0 && p.action !== 'dive') { p.windup = .065; p.jumpBuffer = 0; if(g.lastTeam===p.team&&g.touches>=2){p.action='spike';p.actionTime=.55;} }
    if (p.windup > 0) { p.windup = Math.max(0, p.windup - dt); if (!p.windup) p.vy = -510; }
    const wantsDive = human && dive;
    if (wantsDive && !p.diveHeld && p.y === FLOOR && !p.windup && p.action !== 'dive') {
      p.action = 'dive'; p.actionTime = .6; p.vz=depthDirection*300; p.vx = (direction || (b.x >= p.x ? 1 : -1)) * 490;
    }
    p.diveHeld = wantsDive;
    const speed = human ? 320 : p.team === 0 ? 295 : difficulty === 'Chill' ? 205 : difficulty === 'Pro' ? 310 : 265;
    if (p.action === 'dive') p.vx *= Math.exp(-2.8 * dt);
    else p.vx += (direction * speed - p.vx) * (1 - Math.exp(-(p.y < FLOOR ? 8 : 16) * dt));
    p.vz += (depthDirection * speed - p.vz) * (1 - Math.exp(-14 * dt));
    p.x += p.vx * dt; p.z=clamp(p.z+p.vz*dt,30,420);
    const bounded = clamp(p.x, p.team ? 537 : 40, p.team ? 960 : 463);
    if (bounded !== p.x) p.vx = 0;
    p.x = bounded; p.stride += Math.hypot(p.vx,p.vz) * dt / 23;
    p.vy += 1150 * dt; p.y += p.vy * dt;
    if (p.y >= FLOOR) { if (p.vy > 150) p.landing = .18; p.y = FLOOR; p.vy = 0; }
  }
  // Teammates keep enough room to remain readable and cover separate positions.
  for (const a of [0, 2]) {
    const p = g.players[a], q = g.players[a + 1], distance = q.x - p.x;
    if (Math.abs(distance) < 40 && Math.abs(p.y - q.y) < 55 && Math.abs(p.z-q.z)<40) {
      const correction = (40 - Math.abs(distance)) * .5, sign = distance >= 0 ? 1 : -1;
      p.x = clamp(p.x - sign * correction, p.team ? 537 : 40, p.team ? 960 : 463);
      q.x = clamp(q.x + sign * correction, q.team ? 537 : 40, q.team ? 960 : 463);
    }
  }
  const oldX = b.x, oldY = b.y;
  b.vy += GRAVITY * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
  g.cooldown = Math.max(0, g.cooldown - dt); g.hitFlash = Math.max(0, g.hitFlash - dt);
  if (Math.abs(b.x - 500) < 18 && oldY < 274 && b.y >= 274 && b.vy > 0) { b.y = 274; b.vy *= -.55; }
  else if (b.y >= 274 && b.y < FLOOR && ((oldX <= 482 && b.x > 482) || (oldX >= 518 && b.x < 518))) {
    b.x = oldX < 500 ? 482 : 518; b.vx *= -.65;
  }
  for(let i=0;i<4;i++) {
    const p=g.players[i], eligible=g.lastHit!==i||g.lastTeam!==p.team;
    const near=Math.hypot(b.x-p.x,b.z-p.z)<100;
    if(eligible && near && b.vy>0 && b.y>p.y-210 && b.y<p.y-35 && p.action==='idle') {
      p.action=(g.lastTeam===p.team && g.touches>=2)||(i===g.active&&attack&&p.y<FLOOR-35)?'spike':g.lastTeam===p.team?'set':'bump';
      p.actionTime=.55;
    }
  }
  if (g.cooldown === 0) {
    const contacts = g.players.map((p,i)=>{
      const hand=contactPoint(p);
      return {i,distance:Math.hypot((b.x-hand.x)/1.1,b.z-hand.z,(b.y-hand.y)/1.2)};
    }).filter(c=>{
      const p=g.players[c.i];
      return c.distance<30 && p.action!=='idle' && p.actionTime<=.39 && p.actionTime>=.08;
    }).sort((a,c)=>a.distance-c.distance);
    if(contacts.length) hit(g,contacts[0].i,contacts[0].i===g.active?attack:true);
  }
  if (g.status === 'playing' && b.y >= FLOOR - 13) {
    const out = b.x < 35 || b.x > 965 || b.z<25 || b.z>425;
    point(g, out ? 1 - Math.max(0, g.lastTeam) : b.x < 500 ? 1 : 0, out ? 'Out.' : '');
  }
}
