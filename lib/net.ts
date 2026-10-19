import {createArcade,aimDrift,stepArcade,rewardArcade,takeSpecial,specialName,cancelArcadeInput,shotTiming,PERFECT_ETA,PERFECT_SPAN} from './arcade.ts';
import {createGame,launch,landingX,landingZ,flightTime,strokeQuality,setAim,FLOOR,type Player,type AttackStyle} from './game.ts';
import type {rivals} from './rivals.ts';

export type NetSport='footvolley'|'tennis';
export type BeachInput={x:number;z:number;prepare:boolean;jump:boolean};
export const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function createNetMatch(sport:NetSport,rival?:typeof rivals[number]){
 return {...createGame(),...createArcade(),sport,cpuStyle:rival?.style??'normal',rivalName:rival?.name.toUpperCase()??'PRAIA',rivalHint:rival?.description??'',windEnabled:false,points:[0,0],shotAimed:false,contactSerial:0,autoSwitchSerial:-1,shotConsumed:false,coverUsed:false,contactAge:0,impact:{x:0,z:0,y:0},message:'Chegue à bola e toque Jogar.',restartDelay:0};
}
export type NetMatch=ReturnType<typeof createNetMatch>;
// Short sessions (approved design: about 3 minutes a match): futevôlei sets go to 7, win by 2.
export const FOOTVOLLEY_POINTS=7;
const RIVAL_SPEED:Record<string,number>={attack:1,block:.95,defense:1.1,placement:1};
export function moveRunner(p:Player,dx:number,dz:number,dt:number,speed=300){
 const length=Math.max(1,Math.hypot(dx,dz));dx/=length;dz/=length;
 const response=p.y<FLOOR?8:!dx&&!dz||p.vx*dx+p.vz*dz<0?30:24;
 speed*=p.actionTime>0?.78:1;
 p.vx+=(dx*speed-p.vx)*(1-Math.exp(-response*dt));p.vz+=(dz*speed-p.vz)*(1-Math.exp(-response*dt));
 p.x+=p.vx*dt;p.z+=p.vz*dt;p.stride+=Math.hypot(p.vx,p.vz)*dt/23;
 p.actionTime=Math.max(0,p.actionTime-dt);if(!p.actionTime&&!p.windup)p.action='idle';
 p.landing=Math.max(0,p.landing-dt);
 p.vy+=1150*dt;p.y+=p.vy*dt;
 if(p.y>=FLOOR){if(p.vy>150)p.landing=.18;p.y=FLOOR;p.vy=0;}
}
export function netContact(g:NetMatch,i:number){
 const p=g.players[i],same=g.lastTeam===p.team;
 const height=g.sport==='tennis'?128:!same?36:g.touches===1?80:124;
 return {x:p.x+(p.team?-1:1)*(g.sport==='tennis'?56:height===36?25:12),z:p.z,y:p.y-height};
}
export function netGuide(g:NetMatch){
 const team=landingX(g,437)<500?0:1,receiving=g.lastTeam!==team,active=g.players[g.active];
 const height=(g.sport==='tennis'?322:receiving?414:g.touches===1?370:326)-(active?.team===team&&g.lastHit!==g.active?FLOOR-active.y:0);
 return {team,height,x:clamp(landingX(g,height)+(team?1:-1)*(g.sport==='tennis'?56:receiving?25:12),team?550:50,team?950:450),z:clamp(landingZ(g,height),35,415),time:flightTime(g,height)};
}
export function pressNet(g:NetMatch,input?:{x:number;z:number}){
 if(g.status==='tossing'){if(input&&(Math.abs(input.x)>.2||Math.abs(input.z)>.2))setAim(g,input.x>.2?890:input.x<-.2?610:g.aim.x,input.z>.2?370:input.z<-.2?80:g.aim.z);serveNet(g,tossQuality(g.tossTime));g.shotConsumed=true;return;}
 if(g.status!=='playing'||g.active<0)return;
 g.shotConsumed=false;g.charge=0;releaseNet(g,input);
}
export function releaseNet(g:NetMatch,input?:{x:number;z:number}){
 if(g.status!=='playing'||g.active<0)return;
 if(g.shotConsumed){g.charge=0;return;}
 g.shotAimed=!!input&&(Math.abs(input.x)>.2||Math.abs(input.z)>.2);
 if(g.shotAimed&&input)setAim(g,input.x>.2?890:input.x<-.2?610:g.aim.x,input.z>.2?370:input.z<-.2?80:g.aim.z);
 g.shotCharge=g.charge;g.shotDrift=aimDrift(g.charge,g.clock);g.shotWindow=.32;g.charge=0;g.pressEta=netGuide(g).time;
}
// The human serve: the ball rises and the hit is timed at its peak (about .5 s after the toss).
export const tossQuality=(t:number)=>clamp(1-Math.max(0,Math.abs(t-.5)-.05)/.25,0,1);
export function beginServe(g:NetMatch){
 if(g.status!=='ready')return;
 if(g.server!==0||g.active<0){serveNet(g);return;}
 const i=g.serviceOrder[0],p=g.players[i];p.x=45;p.z=225;g.active=i;
 g.ball={x:p.x+25,z:p.z,y:p.y-70,vx:0,vz:0,vy:-310};g.tossTime=0;g.restartDelay=0;g.status='tossing';
}
// Each rival style plays its own way, so the CPU cannot be memorised.
function cpuShot(g:NetMatch):{style:AttackStyle;power:number;target:{x:number;z:number}}{
 const open=g.players[0].z+g.players[1].z>450?80:370,turn=g.rally+g.score[0]+g.score[1];
 switch(g.cpuStyle){
  case 'attack':return {style:turn%4===3?'tip':'power',power:.85,target:{x:130,z:open}};
  case 'placement':return {style:turn%2?'tip':'roll',power:.45,target:{x:turn%2?330:110,z:open}};
  case 'defense':return {style:turn%3===2?'power':'roll',power:.4,target:{x:110,z:turn%2?80:370}};
  case 'block':return {style:turn%3===1?'tip':'power',power:.65,target:{x:280,z:open===80?60:390}};
  default:return {style:g.rally%5===3?'roll':g.rally%5===1?'tip':'power',power:.5,target:{x:220,z:open}};
 }
}
function cpuServe(g:NetMatch){
 const turn=g.score[0]+g.score[1],z=turn%2?80:370;
 return g.cpuStyle==='attack'?{x:120,z}:g.cpuStyle==='placement'?{x:turn%3?320:120,z}:g.cpuStyle==='normal'?{x:220,z:145}:{x:200,z};
}
export function serveNet(g:NetMatch,quality?:number){
 if(g.status!=='ready'&&g.status!=='tossing')return;
 const i=g.serviceOrder[g.server],p=g.players[i];p.x=g.server?955:45;p.z=225;
 g.ball={x:p.x+(g.server?-25:25),z:p.z,y:g.sport==='tennis'?310:414,vx:0,vz:0,vy:0};
 const target=g.server?cpuServe(g):{...g.aim},q=quality??1;
 // A mistimed serve drifts to the safe center and floats; a perfect one is faster.
 target.x+=(775-target.x)*(1-q)*.32*(g.server?0:1);target.z+=(225-target.z)*(1-q)*.32*(g.server?0:1);
 // Virtua Tennis style super serve: with the special armed, a well-timed toss becomes a SAQUE BALA (much faster, hard to read).
 const bullet=quality!==undefined&&quality>=.5&&g.server===0&&g.specialArmed&&g.energy[0]>=100;
 // The bullet is struck from the top of a jump, so it can travel flat over the net.
 if(bullet){g.energy[0]=0;g.specialArmed=false;g.ball.y=230;}
 launch(g,target,(g.sport==='tennis'?1.35:1.75)/(quality===undefined?1:.75+q*.35)*(bullet?.55:1),g.sport==='tennis'?298:248,bullet?.36:.55);
 g.restartDelay=0;g.autoSwitchSerial=-1;g.shotConsumed=false;g.coverUsed=false;g.contactAge=0;g.lastPower=0;g.specialShot=bullet;g.specialKind=bullet?'signature':'';g.specialPlayer=bullet?i:-1;g.timing=null;
 p.action=g.sport==='tennis'?'spike':'bump';p.actionTime=.26;g.lastTeam=g.server;g.lastHit=i;g.touches=1;g.status='playing';g.cooldown=.3;
 g.contactSerial++;g.impact={...g.ball};g.hitFlash=.16;g.feedback=bullet?'SAQUE BALA!':quality===undefined?'SAQUE':quality>=.85?'SAQUE · PERFEITO':quality>=.5?'SAQUE · BOM':'SAQUE · FRACO';g.feedbackTime=1.5;
 if(quality!==undefined&&quality>=.85)g.perfects++;
 g.lastPerfect=g.server===0&&quality!==undefined&&quality>=.85;
}
export function netPoint(g:NetMatch,winner:number,reason:string){
 g.energy[winner]=Math.min(100,g.energy[winner]+15);g.combo[1-winner]=0;g.comboTime[1-winner]=0;cancelArcadeInput(g);g.specialShot=false;
 g.lastRally=g.rally;g.bestRally=Math.max(g.bestRally,g.rally);g.pointReason=reason;
 if(g.sport==='footvolley'&&winner!==g.server)g.serviceOrder[g.server]^=1;
 if(g.sport==='tennis'){
  g.points[winner]++;
  if(g.points[winner]>=4){g.score[winner]++;g.points=[0,0];const games=g.score[0]+g.score[1];g.server=games%2;if(games>1)g.serviceOrder[g.server]^=1;}
  g.status=g.score[winner]>=3?'over':'ready';
 }else{
  g.server=winner;g.score[winner]++;
  g.status=g.score[winner]>=FOOTVOLLEY_POINTS&&Math.abs(g.score[0]-g.score[1])>=2?'over':'ready';
 }
 g.message=reason;g.restartDelay=g.status==='ready'?1.6:0;
 for(const p of g.players){p.windup=0;p.preparation=0;p.jumpBuffer=0;}
 g.rally=0;g.touches=0;g.lastTeam=-1;g.lastHit=-1;g.active=g.active<0?-1:0;g.autoSwitchSerial=-1;g.shotConsumed=false;g.coverUsed=false;g.contactAge=0;g.charge=0;g.hitFlash=0;
}
export function strikeNet(g:NetMatch,i:number,quality:number,ahead?:number){
 if(g.status!=='playing')return;
 const p=g.players[i],same=g.lastTeam===p.team;
 const cover=g.sport==='tennis'&&p.team===0&&g.active>=0&&i!==g.active;
 const cpu=p.team&&!cover?cpuShot(g):null,style=cover?'roll':cpu?cpu.style:g.attackStyle;
 if(cover)quality=Math.min(.55,quality);
 if(same&&g.lastHit===i){netPoint(g,1-p.team,'Dois contatos seguidos do mesmo atleta');return;}
 g.touches=same?g.touches+1:1;
 if(g.touches>(g.sport==='tennis'?1:3)){netPoint(g,1-p.team,g.sport==='tennis'?'Segundo contato':'Quarto contato');return;}
 // Shark attack: a futevôlei attack from the air right at the net, steep and fast; a mistimed one goes into the net.
 const shark=g.sport==='footvolley'&&g.touches===3&&!cover&&p.y<FLOOR&&Math.abs(p.x-500)<70;
 const over=g.sport==='tennis'||g.touches===3,body=g.sport==='tennis'?(cover?'LOB · COBERTURA':style==='roll'?'LOB':style==='tip'?'CURTA':p.y<FLOOR?'SMASH':'VOLEIO'):over?(shark?'SHARK ATTACK':'CABEÇA'):g.touches===1?'PÉ':'PEITO';
 p.action=shark?'shark':over?'spike':g.touches===1?'bump':'set';p.actionTime=.36;p.windup=0;
 const timed=i===g.active&&ahead!==undefined&&over&&!cover?shotTiming(ahead):null;
 if(timed)quality=timed.perfect?Math.min(1,quality+.15):timed.late?quality*.85:quality;
 if(shark&&quality<.45){netPoint(g,1-p.team,'Shark attack na rede');return;}
 const b=g.ball,human=i===g.active,power=cover?.2:human?(g.shotWindow>0?g.shotCharge:g.charge):cpu?cpu.power:.5;
 const incomingSpecial=g.specialShot&&g.lastTeam!==p.team;
 const special=over&&!cover?takeSpecial(g,p.team,i):false;
 // Two specials, as in Hyper V-Ball: A fires the signature shot, B the zigzag ball that weaves in the air.
 if(special)g.specialKind=style==='power'?'signature':'zigzag';
 if(!over||cover){g.specialShot=false;g.specialPlayer=-1;}
 g.lastPower=power;g.timing=timed?timed.offset:null;g.lastPerfect=!!timed?.perfect;if(timed?.perfect)g.perfects++;if(special&&p.team===0)g.specials++;
 if(over){
  const target=cover?{x:775,z:225}:cpu?{...cpu.target}:{...g.aim};
  // Without an explicit direction, timing picks the side: early crosses the court, late goes down the line.
  if(timed&&!g.shotAimed&&!timed.perfect)target.z=(p.z>225)===timed.late?370:80;
  const error=(1-quality)*35,drift=human?(g.shotWindow>0?g.shotDrift:aimDrift(power,g.clock)):0;
  target.z=target.z+(p.z>225?error:-error)+drift;
  if(style==='tip'&&!special)target.x=p.team?400:600;
  if(shark&&!special)target.x=p.team?300:700;
  const flight=special?.62:shark?.5:style==='roll'?1.9-power*.2:style==='tip'?1.25-power*.2:(g.sport==='tennis'?1.15:1.45)-power*.7;
  launch(g,target,flight/(special?1:.72+quality*.28),g.sport==='tennis'?(special?309:298):(special?260:248));
 }else{
  const partner=g.players[i^1];
  const flight=(g.touches===1?1.05:1.2)*(.75+quality*.4),height=g.touches===1?370:326;
  b.vx=(clamp(partner.x,p.team?570:80,p.team?920:430)+(p.team?-12:12)-b.x)/flight;b.vz=(partner.z-b.z)/flight;
  b.vy=(height-b.y-310*flight*flight)/flight;
 }
 g.lastTeam=p.team;g.lastHit=i;g.rally++;g.cooldown=.2;g.hitFlash=.16;g.contactSerial++;g.contactAge=0;g.impact={...b};
 rewardArcade(g,p.team,special?.5:quality);
 if(special)g.energy[p.team]=0;
 if(incomingSpecial&&quality>=.7)g.energy[p.team]=Math.min(100,g.energy[p.team]+20);
 g.feedback=`${body} · ${timed?.perfect?'PERFEITO':timed?.early?'CEDO · DIAGONAL':timed?.late?'TARDE · PARALELA':quality>.7?'BOM':quality>.4?'REGULAR':'FORA DO TEMPO'}`;
 g.contactHint=quality>.7?'Contato equilibrado':Math.hypot(p.vx,p.vz)>170?'Chegue e freie antes do contato':'Prepare o golpe antes da bola chegar';
 if(special)g.feedback=g.specialKind==='zigzag'?'ZIGUE-ZAGUE!':specialName(g.sport)+'!';else if(incomingSpecial&&quality>=.7)g.feedback='CONTRA-ESPECIAL!';else if(human&&power>.85)g.feedback+=' · NO LIMITE';
 if(g.combo[p.team]>=3)g.contactHint=`COMBO ×${g.combo[p.team]} · +ESPECIAL`;
 if(cover)g.contactHint='Parceiro cobriu · retorne à posição';
 g.feedbackTime=1.6;p.preparation=0;if(cover)g.coverUsed=true;
 if(human){g.coverUsed=false;g.charge=0;g.shotWindow=0;g.shotCharge=0;g.shotAimed=false;g.shotConsumed=true;g.attackStyle='power';}
}
export function stepNet(g:NetMatch,dt:number,input:BeachInput,level:string){
 if(!Number.isFinite(dt)||dt<=0||![input.x,input.z].every(Number.isFinite))return;
 if(g.status==='ready'&&g.restartDelay>0){
  dt=Math.min(dt,.05);g.restartDelay=Math.max(0,g.restartDelay-dt);g.clock+=dt;
  for(let i=0;i<4;i++){const p=g.players[i],server=i===g.serviceOrder[g.server],x=server?(g.server?955:45):[200,380,620,800][i],z=server?225:i%2?310:145;moveRunner(p,clamp((x-p.x)/40,-1,1),clamp((z-p.z)/40,-1,1),dt,400);}
  const p=g.players[g.serviceOrder[g.server]];g.ball={x:p.x,z:p.z,y:p.y-70,vx:0,vz:0,vy:0};
  if(!g.restartDelay)beginServe(g);return;
 }
 if(g.status==='tossing'){
  dt=Math.min(dt,.05);g.clock+=dt;g.tossTime+=dt;const b=g.ball;b.y+=b.vy*dt+310*dt*dt;b.vy+=620*dt;
  if(g.tossTime>1.05)serveNet(g,0);return;
 }
 if(g.status!=='playing')return;
 dt=Math.min(dt,.05);g.clock+=dt;g.contactAge+=dt;stepArcade(g,dt);
 g.charge=input.prepare?Math.min(1,g.charge+dt*1.1):Math.max(0,g.charge-dt*3);
 g.cooldown=Math.max(0,g.cooldown-dt);g.hitFlash=Math.max(0,g.hitFlash-dt);g.feedbackTime=Math.max(0,g.feedbackTime-dt);
 const guide=netGuide(g),receivers=[0,2],reaction=level==='Chill'?.26:level==='Pro'?.12:.2;
 for(const team of [0,1]){
  const cost=(i:number)=>Math.hypot(g.players[i].x-guide.x,g.players[i].z-guide.z)+(g.lastTeam===team&&g.lastHit===i?2000:0);
  receivers[team]=cost(team*2)<=cost(team*2+1)?team*2:team*2+1;
 }
 if(g.autoSwitch&&g.active>=0&&guide.team===0&&g.autoSwitchSerial!==g.contactSerial){
  g.autoSwitchSerial=g.contactSerial;
  const active=g.players[g.active],next=g.players[receivers[0]];
  const distance=Math.hypot(active.x-guide.x,active.z-guide.z),engaged=input.x||input.z||input.jump||g.shotWindow>0||input.prepare&&distance<120;
  if(g.lastHit===g.active||!engaged&&distance>Math.hypot(next.x-guide.x,next.z-guide.z)+45)g.active=receivers[0];
 }
 for(let i=0;i<4;i++){
  const p=g.players[i],human=i===g.active,onBall=guide.team===p.team&&receivers[p.team]===i;
  const attacking=g.sport==='footvolley'&&g.lastTeam===p.team&&g.touches===1;
  const homeX=attacking?(p.team?575:425):i<2?(i%2?365:200):(i%2?800:635),homeZ=g.sport==='tennis'&&p.team===0&&!human&&g.active>=0?clamp(450-g.players[g.active].z,110,340):i%2?310:145;
  const airTime=flightTime(g,guide.height-65),airX=landingX(g,guide.height-65),aerial=!human&&onBall&&(g.sport==='tennis'||g.lastTeam===p.team&&g.touches===2)&&(p.team?airX>=515:airX<=485)&&(p.y<FLOOR||airTime>.15&&airTime<.6);
  const prediction=Math.min(reaction*.4,guide.time*.3);
  // AI defenders misread attacks, more for strong, perfect or special shots and on easier levels: a fixed per-rally
  // offset (no dice roll), so rallies end instead of running forever (playtest 2026-10-19).
  const attack=human||g.lastTeam<0||g.lastTeam===p.team?0:g.rally===0?.1+(g.lastPerfect?.15:0)+(g.specialShot?.7:0):Math.min(1.4,(g.sport==='tennis'?.4:.25)+g.lastPower*.8+(g.lastPerfect?.5:0)+(g.specialShot?.8:0));
  // Slow balls (lobs, floaty sets) are easy to read whatever the power behind them.
  const misread=attack*clamp((Math.hypot(g.ball.vx,g.ball.vz)-200)/350,.15,1.2)*(level==='Chill'?90:level==='Pro'?42:65);
  const receiveX=clamp((aerial?airX+(p.team?1:-1)*(g.sport==='tennis'?56:12):guide.x)-g.ball.vx*prediction+Math.sin(g.contactSerial*12.9898+i*78.2)*misread,p.team?550:50,p.team?950:450);
  const receiveZ=clamp((aerial?landingZ(g,guide.height-65):guide.z)-g.ball.vz*prediction+Math.cos(g.contactSerial*4.1+i*3.7)*misread,35,415);
  const down=p.action==='dive'&&p.actionTime>0;
  let dx=down?0:human?clamp(input.x,-1,1):clamp(((onBall&&g.contactAge>=reaction?receiveX:homeX)-p.x)/35,-1,1);
  let dz=down?0:human?clamp(input.z,-1,1):clamp(((onBall&&g.contactAge>=reaction?receiveZ:homeZ)-p.z)/35,-1,1);
  if(human&&!down&&level==='Chill'&&g.assist&&g.shotWindow>0&&!dx&&!dz&&onBall&&Math.hypot(guide.x-p.x,guide.z-p.z)<90){
   dx=clamp((guide.x-p.x)/40,-.65,.65);dz=clamp((guide.z-p.z)/40,-.65,.65);
  }
  p.preparation=(!human||input.prepare||g.shotWindow>0)?Math.min(1,p.preparation+dt):Math.max(0,p.preparation-dt*2);
  if(onBall&&(!human||input.prepare||g.shotWindow>0)&&guide.time<.3&&Math.hypot(guide.x-p.x,guide.z-p.z)<115&&!p.actionTime){
   p.windup=Math.max(.015,guide.time);p.action=g.sport==='tennis'||g.lastTeam===p.team&&g.touches===2?'spike':g.lastTeam===p.team?'set':'bump';
  }else if(!p.actionTime)p.windup=0;
  p.jumpBuffer=human&&input.jump&&!p.jumpHeld?.14:Math.max(0,p.jumpBuffer-dt);
  if(p.y===FLOOR&&(p.jumpBuffer>0||aerial&&g.contactAge>=reaction&&airTime<.3&&Math.hypot(receiveX-p.x,receiveZ-p.z)<70)){p.vy=-430;p.jumpBuffer=0;}
  p.jumpHeld=human&&input.jump;
  // Charging roots the athlete: arriving early is the only way to hit hard.
  // Rival style also sets how fast the CPU covers the sand: defenders run most, blockers least.
  moveRunner(p,dx,dz,dt,human?320*(input.prepare?1-.7*g.charge:1):(p.team&&level==='Chill'?235:300)*(p.team?RIVAL_SPEED[g.cpuStyle]??1:1));
  const x=clamp(p.x,p.team?537:40,p.team?960:463),z=clamp(p.z,30,420);
  if(x!==p.x)p.vx=0;if(z!==p.z)p.vz=0;p.x=x;p.z=z;
 }
 const b=g.ball,old={...b};b.x+=b.vx*dt;b.z+=b.vz*dt+(g.specialShot&&g.specialKind==='zigzag'?Math.cos(g.contactAge*12)*520*dt:0);b.y+=b.vy*dt+310*dt*dt;b.vy+=620*dt;
 if(b.y>=(g.sport==='tennis'?316:274)&&((old.x<500&&b.x>=500)||(old.x>500&&b.x<=500))){netPoint(g,1-g.lastTeam,'Bola na rede');return;}
 if(!g.cooldown){
  let contact=-1,closest=Infinity,contactTime=0,contactDive=false;
  for(let i=0;i<4;i++){
   const p=g.players[i];
   if(g.lastHit===i||i===g.active&&!g.shotWindow)continue;
   if(i!==g.active&&g.contactAge<reaction)continue;
   if(g.active>=0&&p.team===0&&i!==g.active&&(g.sport==='tennis'?g.coverUsed||g.lastTeam===0:g.lastTeam!==0))continue;
   if(b.vy<=0&&(g.sport!=='tennis'||i!==g.active||!g.shotWindow))continue;
   const target=netContact(g,i),dx=b.x-old.x,dy=b.y-old.y,dz=b.z-old.z;
   const t=clamp(((target.x-old.x)*dx+(target.y-old.y)*dy+(target.z-old.z)*dz)/(dx*dx+dy*dy+dz*dz||1),0,1);
   const distance=Math.hypot(old.x+dx*t-target.x,old.y+dy*t-target.y,old.z+dz*t-target.z);
   // AI defenders (CPU and your partner) are beaten by pace: a fast, perfect or special shot shrinks their reach, more on easier levels, so points end.
   const threat=i===g.active||g.lastTeam===p.team?0:Math.min(1,clamp((Math.hypot(old.vx,old.vy,old.vz)-380)/480,0,1)*.75+(g.lastPerfect?.35:0)+(g.specialShot?.6:0))*(g.rally===0?.3:1);
   const reach=(i===g.active?(level==='Chill'?48:level==='Pro'?28:38):35*(1-threat*(level==='Chill'?.9:level==='Pro'?.45:.65)))+(g.sport==='tennis'&&p.team===0&&g.specialArmed&&g.energy[0]>=100?18:0);
   // Beach tennis dive: the human can stretch 50 further by diving, but stays down on the sand afterwards.
   // Only once the ball is passing by (closest approach inside this step), so a ball still coming into reach is a normal stroke.
   const dive=g.sport==='tennis'&&i===g.active&&p.y===FLOOR&&p.action!=='dive'&&t<1&&distance>=reach&&distance<reach+50;
   if((distance<reach||dive)&&(contact<0||i===g.active||contact!==g.active&&distance<closest)&&(p.team?old.x+dx*t>=500:old.x+dx*t<=500)){contact=i;closest=distance;contactTime=t;contactDive=dive;}
  }
  if(contact>=0){
   const p=g.players[contact];b.x=old.x+(b.x-old.x)*contactTime;b.y=old.y+(b.y-old.y)*contactTime;b.z=old.z+(b.z-old.z)*contactTime;
   strikeNet(g,contact,contactDive?.55:strokeQuality(closest,Math.max(p.preparation,contact===g.active?.55:0),Math.hypot(p.vx,p.vz)),contact===g.active&&!contactDive?(g.pressEta-PERFECT_ETA)/PERFECT_SPAN:undefined);
   if(contactDive&&g.lastHit===contact){const d=Math.hypot(b.x-p.x,b.z-p.z)||1;p.action='dive';p.actionTime=.7;p.diveX=(b.x-p.x)/d;p.diveZ=(b.z-p.z)/d;p.vx=p.diveX*320;p.vz=p.diveZ*320;g.feedback=`MERGULHO · ${g.feedback.split(' · ').slice(1).join(' · ')}`;}
   if(g.status==='playing'&&g.sport==='tennis'&&p.team===1&&g.autoSwitch&&g.active>=0){
    const next=netGuide(g),active=g.players[g.active],partner=g.players[g.active^1];
    if(!input.x&&!input.z&&!input.jump&&!g.shotWindow&&Math.hypot(partner.x-next.x,partner.z-next.z)+45<Math.hypot(active.x-next.x,active.z-next.z))g.active^=1;
    g.autoSwitchSerial=g.contactSerial;
   }
   return;
  }
 }
 if(b.y>=437){const inside=b.x>=35&&b.x<=965&&b.z>=25&&b.z<=425;netPoint(g,inside?(b.x<500?1:0):1-g.lastTeam,inside?'Bola na areia':'Bola fora');}
}
