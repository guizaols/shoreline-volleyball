export const FLOOR = 450;
const GRAVITY = 620;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export type AttackStyle = 'power' | 'roll' | 'tip';
export type ServeStyle = 'underhand' | 'float' | 'jump';
export const DIVE_DURATION=.85;
export type Action = 'idle' | 'bump' | 'set' | 'spike' | 'dive';
export type Player = {
  x: number; z: number; y: number; vx: number; vz: number; vy: number; team: number;
  action: Action; actionTime: number; stride: number; landing: number;
  windup: number; jumpBuffer: number; jumpHeld: boolean; diveHeld: boolean; diveX: number; diveZ: number;
};
function players(): Player[] {
  return [200, 380, 620, 800].map((x, i) => ({ x, z: i % 2 ? 310 : 145, y: FLOOR, vx: 0, vz: 0, vy: 0, team: i < 2 ? 0 : 1,
    action: 'idle', actionTime: 0, stride: 0, landing: 0, windup: 0, jumpBuffer: 0, jumpHeld: false, diveHeld: false, diveX: i<2?1:-1, diveZ: 0 }));
}
export function createGame() {
  return { players: players(), active: 0, autoSwitch: true, aim: {x:810,z:225}, power: 1, serveStyle: 'float' as ServeStyle, ball: { x: 200, z: 145, y: 325, vx: 0, vz: 0, vy: 0 }, score: [0, 0],
    attackStyle: 'power' as AttackStyle, tossTime: 0, tossQuality: '', windEnabled: true, wind: 0, clock: 0, resumeStatus: 'playing', assist: true, feedback: '', feedbackTime: 0, server: 0, status: 'ready', message: 'Four players. One perfect rally.', cooldown: 0,
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
export function prepareServe(g: Game) {
  if(g.status!=='ready')return;
  g.status='serving';if(g.active>=0)g.active=0;
  const p=g.players[g.server?3:0];p.x=g.server?960:40;p.z=225;
  g.ball={x:p.x,z:p.z,y:p.y-80,vx:0,vz:0,vy:0};
}
export function contactQuality(distance:number) { return distance<=22?'BOM':'RUIM'; }
export function guidance(g:Game) {
  const team=landingX(g)<500?0:1;
  const height=g.lastTeam===team?(g.touches>=2?235:334):384;
  return {team,height,x:clamp(landingX(g,height)+(team?1:-1)*(height===384?27:12),team?537:40,team?960:463),z:clamp(landingZ(g,height),30,420),time:flightTime(g,height),attack:g.lastTeam===team&&g.touches>=2};
}
export function toss(g:Game) {
  if(g.status!=='serving')return;
  g.status='tossing';g.tossTime=0;g.tossQuality='';
  g.ball.vy=-310;
}
export function setAttackStyle(g:Game,style:string) {
  if(style==='power'||style==='roll'||style==='tip')g.attackStyle=style;
}
export function serve(g: Game) {
  if (g.status !== 'tossing') return;
  if(g.tossTime<.25||g.tossTime>1.05){g.tossQuality='Espere a bola subir';return;}
  g.tossQuality=g.tossTime>=.4&&g.tossTime<=.72?'BOM':'RUIM';
  const style=g.server?(['float','underhand','jump'] as ServeStyle[])[(g.score[0]+g.score[1])%3]:g.serveStyle;
  const i=g.server?3:0,p=g.players[i];
  p.x=g.server?960:40;p.z=225;p.y=style==='jump'?365:FLOOR;p.vy=style==='jump'?-130:0;
  p.action=style==='underhand'?'bump':'spike';p.actionTime=.26;
  g.ball={...contactPoint(p),vx:0,vz:0,vy:0};
  launch(g,g.server?opponentTarget(g):g.aim,(style==='underhand'?1.9:style==='float'?1.45:1.05)/(g.server?1:g.power*(g.tossQuality==='BOM'?1:.8)));
  g.status='playing';g.message='';g.lastHit=i;g.lastTeam=g.server;g.touches=1;g.cooldown=.3;
  g.feedback=`SAQUE ${g.tossQuality}`;g.feedbackTime=1.8;
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
export function landingZ(g: Game, height = 375) { return g.ball.z + g.ball.vz * flightTime(g,height) + .5*g.wind*flightTime(g,height)**2; }
export function contactPoint(p: Player) {
  const height=p.action==='dive'?28:p.action==='spike'?140:p.action==='set'?116:66;
  if(p.action==='dive')return {x:p.x+p.diveX*55,z:p.z+p.diveZ*55,y:p.y-height};
  return {x:p.x+(p.team?-1:1)*(p.action==='bump'?27:12),z:p.z,y:p.y-height};
}
function hit(g: Game, i: number, attack: boolean, distance: number) {
  const p = g.players[i], b = g.ball, sameTeam = g.lastTeam === p.team;
  if (sameTeam && g.lastHit === i && g.touches>0) { point(g, 1 - p.team, 'Double touch.'); return; }
  g.touches = sameTeam ? g.touches + 1 : 1;
  if (g.touches > 3) { point(g, 1 - p.team, 'Four touches.'); return; }
  g.lastTeam = p.team; g.lastHit = i; g.rally++; g.cooldown = .2; g.hitFlash = .16;
  const partner = g.players[i ^ 1];
  const sendOver = g.touches === 3 || attack;
  const action = sendOver ? 'spike' : g.touches === 1 ? 'bump' : 'set';
  const diving = p.action === 'dive';
  if (!diving) { p.action = action; p.actionTime = .26; }
  const hand=contactPoint(p);
  b.x=hand.x; b.y=hand.y; b.z=hand.z;
  if (sendOver) {
    const style=p.team?'power':g.attackStyle;
    const target=p.team?opponentTarget(g):{...g.aim,x:style==='tip'?Math.min(g.aim.x,650):g.aim.x};
    const flight=style==='tip'?1.55:style==='roll'?1.65:b.y<255?.82:1.3;
    launch(g,target,flight/(p.team?1:g.power));
  } else {
    b.vy = g.touches === 1 ? -385 : -455;
    const flight = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * (365 - b.y))) / GRAVITY;
    b.vx=(clamp(partner.x,p.team?575:85,p.team?915:425)-b.x)/flight;
    b.vz=(partner.z-b.z)/flight;
  }
  const quality=contactQuality(distance);
  g.feedback=`${p.team?'COAST':'VOCÊ'} · ${diving?'DEFESA NO CHÃO':sendOver?(p.team===0&&g.attackStyle==='tip'?'LARGADINHA':p.team===0&&g.attackStyle==='roll'?'ATAQUE COLOCADO':'ATAQUE'):g.touches===1?'RECEPÇÃO':'PASSE'} ${quality}`;g.feedbackTime=1.8;
  g.shot = diving ? 'DIVING SAVE' : action === 'bump' ? 'RECEPTION' : action === 'set' ? 'SET' : 'ATTACK';
}
export function step(g: Game, dt: number, move: number, jump: boolean, difficulty: string, attack = false, dive = false, depth = 0, block = false) {
  if(g.status==='tossing'){
    g.tossTime+=dt;g.ball.vy+=GRAVITY*dt;g.ball.y+=g.ball.vy*dt;
    if(g.server&&g.tossTime>=.55){serve(g);return;}
    if(g.tossTime>1.15){g.status='ready';prepareServe(g);g.tossQuality='Tente novamente: espaço lança, espaço bate';}
    return;
  }
  if (g.status !== 'playing') return;
  g.clock+=dt;g.wind=g.windEnabled?18*Math.sin(g.clock*.37)+9*Math.sin(g.clock*.81):0;
  g.feedbackTime=Math.max(0,g.feedbackTime-dt);
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
    if(current.action!=='dive' && next!==g.active && (g.lastTeam===0&&g.lastHit===g.active || distance(current)>distance(g.players[next])+65)) {
      g.active=next;g.players[next].jumpHeld=jump;g.players[next].diveHeld=dive;
    }
  }
  for (let i = 0; i < 4; i++) {
    const p = g.players[i], human = i === g.active;
    p.actionTime = Math.max(0, p.actionTime - dt); p.landing = Math.max(0, p.landing - dt);
    if (!p.actionTime) p.action = 'idle';
    let direction = move, depthDirection=depth, wantsJump = jump || (human && block);
    if (!human) {
      const onBall = receivingTeam === p.team && receivers[p.team] === i;
      const home = i % 2 === 0 ? (p.team ? 620 : 200) : (p.team ? 800 : 380);
      const target = onBall ? clamp(predicted+(p.team?1:-1)*(contactHeight===384?27:12), p.team ? 550 : 45, p.team ? 955 : 450) : home;
      direction = clamp((target - p.x) / 38, -1, 1);
      const targetZ=onBall?clamp(predictedZ,35,415):(i%2?310:145);
      depthDirection=clamp((targetZ-p.z)/38,-1,1);
      wantsJump = onBall && g.lastTeam === p.team && g.touches >= 2 && Math.hypot(b.x - p.x,b.z-p.z) < 85 && b.vy > 0 && b.y > 140 && b.y < 260;
    }
    if(human && g.assist && receivingTeam===0 && receivers[0]===i) {
      const guide=guidance(g),dx=guide.x-p.x,dz=guide.z-p.z;
      if(Math.hypot(dx,dz)<115 && !move && !depth){direction=clamp(dx/45,-1,1)*.7;depthDirection=clamp(dz/45,-1,1)*.7;}
    }
    if(!human&&g.lastTeam!==p.team&&Math.abs(p.x-500)<90&&Math.abs(b.x-500)<130&&Math.abs(b.z-p.z)<65&&b.y<280)wantsJump=true;
    const magnitude=Math.hypot(direction,depthDirection);
    if(magnitude>1){direction/=magnitude;depthDirection/=magnitude;}
    if (wantsJump && !p.jumpHeld) p.jumpBuffer = .15;
    p.jumpHeld = wantsJump;
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.jumpBuffer > 0 && p.y === FLOOR && p.windup === 0 && p.action !== 'dive') { p.windup = .065; p.jumpBuffer = 0; if(g.lastTeam===p.team&&g.touches>=2){p.action='spike';p.actionTime=.55;} }
    if (p.windup > 0) { p.windup = Math.max(0, p.windup - dt); if (!p.windup) p.vy = -510; }
    const lowX=landingX(g,422),lowZ=landingZ(g,422),timeLeft=flightTime(g,422);
    const distanceToLow=Math.hypot(lowX-p.x,lowZ-p.z);
    const cpuDive=!human&&receivers[p.team]===i&&receivingTeam===p.team&&b.vy>0&&timeLeft<.4&&distanceToLow>55&&distanceToLow<190&&distanceToLow>timeLeft*230;
    const wantsDive = human ? dive : cpuDive;
    if (wantsDive && !p.diveHeld && p.y === FLOOR && !p.windup && p.action !== 'dive') {
      let dx=human?move:0,dz=human?depth:0;
      if(!dx&&!dz){dx=lowX-p.x;dz=lowZ-p.z;}
      const length=Math.hypot(dx,dz)||1;p.diveX=dx/length;p.diveZ=dz/length;
      p.action='dive';p.actionTime=DIVE_DURATION;p.vx=p.diveX*540;p.vz=p.diveZ*540;p.jumpBuffer=0;
    }
    p.diveHeld = wantsDive;
    const speed = human ? 320 : p.team === 0 ? 295 : difficulty === 'Chill' ? 205 : difficulty === 'Pro' ? 310 : 265;
    if(p.action==='dive'){const friction=p.actionTime>.3?3:14;p.vx*=Math.exp(-friction*dt);p.vz*=Math.exp(-friction*dt);}
    else {p.vx+=(direction*speed-p.vx)*(1-Math.exp(-(p.y<FLOOR?8:16)*dt));p.vz+=(depthDirection*speed-p.vz)*(1-Math.exp(-14*dt));}
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
  b.vz+=g.wind*dt;
  b.vy += GRAVITY * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
  g.cooldown = Math.max(0, g.cooldown - dt); g.hitFlash = Math.max(0, g.hitFlash - dt);
  for(let i=0;i<4;i++){
    const p=g.players[i],isBlocking=i===g.active?block:g.lastTeam!==p.team;
    if(isBlocking&&g.lastTeam!==p.team&&Math.abs(p.x-500)<90&&p.y<FLOOR-35&&g.cooldown===0&&Math.abs(b.x-p.x)<60&&Math.abs(b.z-p.z)<55&&Math.abs(b.y-(p.y-140))<45){
      b.vx=(p.team?-1:1)*Math.max(150,Math.abs(b.vx)*.6);b.vy=100;g.lastTeam=p.team;g.lastHit=i;g.touches=0;g.cooldown=.35;
      p.action='set';p.actionTime=.26;g.shot='BLOQUEIO';g.feedback=`${p.team?'COAST':'VOCÊ'} · BLOQUEIO BOM`;g.feedbackTime=1.8;g.rally++;
    }
  }
  if (Math.abs(b.x - 500) < 18 && oldY < 274 && b.y >= 274 && b.vy > 0) { b.y = 274; b.vy *= -.55; }
  else if (b.y >= 274 && b.y < FLOOR && ((oldX <= 482 && b.x > 482) || (oldX >= 518 && b.x < 518))) {
    b.x = oldX < 500 ? 482 : 518; b.vx *= -.65;
  }
  for(let i=0;i<4;i++) {
    const p=g.players[i], eligible=g.lastHit!==i||g.lastTeam!==p.team||g.touches===0;
    const near=Math.hypot(b.x-p.x,b.z-p.z)<100;
    if(eligible && near && b.vy>0 && b.y>p.y-210 && b.y<p.y-35 && p.action==='idle') {
      p.action=(g.lastTeam===p.team && g.touches>=2)||(i===g.active&&attack)?'spike':g.lastTeam===p.team?'set':'bump';
      p.actionTime=.55;
    }
  }
  if (g.cooldown === 0) {
    const contacts = g.players.map((p,i)=>{
      const hand=contactPoint(p);
      return {i,distance:Math.hypot((b.x-hand.x)/1.1,b.z-hand.z,(b.y-hand.y)/1.2)};
    }).filter(c=>{
      const p=g.players[c.i];
      if(p.action==='dive')return c.distance<38&&p.actionTime<=DIVE_DURATION-.06&&p.actionTime>=.3;
      return c.distance<(c.i===g.active&&g.assist?48:30) && p.action!=='idle' && p.actionTime<=.39 && p.actionTime>=.08;
    }).sort((a,c)=>a.distance-c.distance);
    if(contacts.length) hit(g,contacts[0].i,contacts[0].i===g.active?attack:false,contacts[0].distance);
  }
  if (g.status === 'playing' && b.y >= FLOOR - 13) {
    const out = b.x < 35 || b.x > 965 || b.z<25 || b.z>425;
    point(g, out ? 1 - Math.max(0, g.lastTeam) : b.x < 500 ? 1 : 0, out ? 'Out.' : '');
  }
}
