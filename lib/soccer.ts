import {createArcade,aimDrift,stepArcade,rewardArcade,takeSpecial,shotTiming} from './arcade.ts';
import {createGame,FLOOR} from './game.ts';
import {clamp,moveRunner,type BeachInput} from './net.ts';
import type {rivals} from './rivals.ts';
const soccerHints:Record<string,string>={attack:'Chutam de longe. Feche o meio.',block:'Goleiro forte. Chute no canto baixo.',defense:'Correm muito. Toque rápido e de primeira.',placement:'Tocam até achar o espaço. Dê o bote cedo.'};

export function createSoccer(rival?:typeof rivals[number]){
 const base=createGame().players[0];
 const players=Array.from({length:6},(_,i)=>({...base,tackleTime:0,tackleReaction:0,tackleCooldown:0,dribbleTime:0,trickCooldown:0,touchDelay:0,keeperTargetZ:225,facingX:i<3?1:-1,facingZ:0,team:i<3?0:1,x:[85,300,390,915,700,610][i],z:[225,145,310,225,310,145][i]}));
 return {...createArcade(),sport:'soccer' as const,cpuStyle:rival?.style??'normal',rivalName:rival?.name.toUpperCase()??'PRAIA',rivalHint:rival?soccerHints[rival.style]??'':'',players,ball:{x:318,z:145,y:437,vx:0,vz:0,vy:0},owner:1,active:1,autoSwitch:true,autoSwitchSerial:-1,score:[0,0],status:'ready',resumeStatus:'playing',clock:0,cooldown:0,cpuWait:0,lastHit:1,contactSerial:0,impact:{x:0,z:0,y:0},hitFlash:0,feedback:'',feedbackTime:0,contactHint:'',aim:{x:965,z:225},aimPreset:1,attackStyle:'power',message:'Passe, avance e chute. Primeiro a cinco gols.',rally:0,touches:0,restartDelay:0,pendingKick:'' as ''|'pass'|'shot',kickDelay:0,shotAge:1,kickPower:0,kickAimZ:225,kickTarget:-1,passReceiver:-1,firstTimeEta:0};
}
export type Soccer=ReturnType<typeof createSoccer>;
export function startSoccer(g:Soccer){if(g.status==='ready'){g.status='playing';g.restartDelay=0;}}
function impact(g:Soccer,i:number,message:string){
 g.contactSerial++;g.impact={...g.ball};g.hitFlash=.16;g.lastHit=i;g.feedback=message;g.feedbackTime=1.5;g.contactHint='';g.timing=null;
}
function possess(g:Soccer,i:number){
 g.owner=i;g.lastHit=i;g.charge=0;g.lastPower=0;g.cpuWait=0;g.cooldown=.25;g.pendingKick='';g.kickTarget=-1;g.passReceiver=-1;
 g.ball.vx*=i%3===0?0:.2;g.ball.vz*=i%3===0?0:.2;g.ball.vy=0;g.players[i].touchDelay=.1;
 if(g.players[i].team===0&&g.active>=0&&g.autoSwitch)g.active=i;
}
function laneSpace(g:Soccer,from:{x:number;z:number},to:{x:number;z:number},team:number){
 const dx=to.x-from.x,dz=to.z-from.z,d=dx*dx+dz*dz||1;
 return Math.min(...g.players.filter(p=>p.team!==team).map(p=>{const t=clamp(((p.x-from.x)*dx+(p.z-from.z)*dz)/d,0,1);return Math.hypot(p.x-from.x-dx*t,p.z-from.z-dz*t);}));
}
function passTarget(g:Soccer,i:number,direction?:{x:number;z:number}){
 const p=g.players[i],forward=p.team?-1:1,human=direction!==undefined||i===g.active;
 const aim=direction??(human?{x:p.facingX,z:p.facingZ}:{x:forward,z:0}),length=Math.hypot(aim.x,aim.z),x=length?aim.x/length:forward,z=length?aim.z/length:0;
 const score=(q:Soccer['players'][number])=>{const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz)||1,space=laneSpace(g,g.ball,q,p.team);return (dx*x+dz*z)/d*(human?260:40)+dx*forward*.3-d*.08+Math.min(90,space)*.8-Math.max(0,32-space)*(human?3:7);};
 return g.players.map((q,id)=>({q,id})).filter(({q,id})=>q.team===p.team&&id!==i).sort((a,b)=>score(b.q)-score(a.q))[0]?.id??-1;
}
export function passSoccer(g:Soccer,direction?:{x:number;z:number}){if(direction&&![direction.x,direction.z].every(Number.isFinite))return;prepareKick(g,'pass',direction);}
export function shootSoccer(g:Soccer,direction?:{x:number;z:number}){if(direction&&![direction.x,direction.z].every(Number.isFinite))return;prepareKick(g,'shot',direction);}
export function tackleSoccer(g:Soccer,i=g.active){
 const p=g.players[i];
 if(g.status!=='playing'||!p||p.tackleCooldown||p.y<FLOOR||g.owner>=0&&g.players[g.owner].team===p.team)return;
 const dx=g.ball.x-p.x,dz=g.ball.z-p.z,d=Math.hypot(dx,dz);
 p.diveX=d>0&&d<90?dx/d:p.facingX;p.diveZ=d>0&&d<90?dz/d:p.facingZ;
 p.tackleTime=.18;p.tackleCooldown=.8;p.action='dive';p.actionTime=.42;p.windup=0;p.preparation=0;p.vx=p.diveX*430;p.vz=p.diveZ*430;
 if(i===g.active){g.feedback='BOTE';g.feedbackTime=.6;g.contactHint='Alcance a bola; um bote errado deixa espaço';}
}
function prepareKick(g:Soccer,kind:'pass'|'shot',direction?:{x:number;z:number}){
 if(g.status!=='playing'||g.owner<0||g.pendingKick)return;
 const p=g.players[g.owner],human=g.owner===g.active||direction!==undefined;
 g.kickPower=g.owner===g.active?g.charge:Math.min(.85,g.cpuWait*.5);
 g.kickAimZ=(direction?.z?225+clamp(direction.z,-1,1)*58:human?g.aim.z:g.players[(1-p.team)*3].z>225?175:275)+(g.owner===g.active?aimDrift(g.charge,g.clock):0);
 g.kickTarget=kind==='pass'?passTarget(g,g.owner,direction):-1;
 // The CPU keeps dribbling instead of passing into a defender standing on the lane (it used to hand over goals).
 if(kind==='pass'&&g.owner!==g.active&&g.owner%3!==0&&direction===undefined&&g.kickTarget>=0&&g.cpuWait<1.5&&laneSpace(g,g.ball,g.players[g.kickTarget],p.team)<26){g.kickTarget=-1;return;}
 g.pendingKick=kind;g.kickDelay=kind==='shot'?.075:.1;
 p.action='bump';p.windup=g.kickDelay;
}
function strikePass(g:Soccer,input:BeachInput){
 if(g.status!=='playing'||g.owner<0)return;
 const i=g.owner,p=g.players[i],target=g.players[g.kickTarget],targetId=g.kickTarget;
 if(!target||target.team!==p.team)return;
 const handoff=!p.team&&g.autoSwitch&&g.active>=0,length=Math.max(1,Math.hypot(input.x,input.z)),vx=handoff?input.x/length*295:0,vz=handoff?input.z/length*295:0;
 const rx=target.x-g.ball.x,rz=target.z-g.ball.z,speed=660,a=speed*speed-vx*vx-vz*vz,dot=rx*vx+rz*vz,flight=(dot+Math.sqrt(dot*dot+a*(rx*rx+rz*rz)))/a;
 const dx=clamp(target.x+vx*flight+(target.vx-vx)*.04,45,955)-g.ball.x,dz=clamp(target.z+vz*flight+(target.vz-vz)*.04,35,415)-g.ball.z,d=Math.hypot(dx,dz)||1;
 // Keepers distribute with a lofted ball over nearby attackers, which also breaks save-intercept-shoot loops.
 g.specialShot=false;g.specialPlayer=-1;g.lastPower=0;g.ball.vx=dx/d*speed;g.ball.vz=dz/d*speed;g.ball.vy=i%3===0?-260:-65;if(i%3===0)g.ball.y=Math.min(g.ball.y,390);g.owner=-1;g.passReceiver=targetId;g.cooldown=.2;g.charge=0;p.action='bump';p.actionTime=.36;p.windup=0;
 impact(g,i,'PASSE');
 if(!p.team&&g.autoSwitch&&g.active>=0){g.active=targetId;g.autoSwitchSerial=g.contactSerial;}
}
function strikeShot(g:Soccer){
 if(g.status!=='playing'||g.owner<0)return;
 const i=g.owner,p=g.players[i],target=p.team?35:965,style=p.team?'power':g.attackStyle;
 const special=takeSpecial(g,p.team,i);if(special&&p.team===0)g.specials++;
 const targetZ=g.kickAimZ;
 const dx=target-g.ball.x,dz=targetZ-g.ball.z,d=Math.hypot(dx,dz)||1,power=.35+g.kickPower*.65;g.lastPower=g.kickPower;
 g.ball.vx=dx/d*(special?1100:500+power*450);g.ball.vz=dz/d*(special?1100:500+power*450);g.ball.vy=style==='roll'?-300:-80-power*35;
 g.shotAge=0;g.owner=-1;g.passReceiver=-1;g.cooldown=.18;g.charge=0;p.action='bump';p.actionTime=.36;p.windup=0;impact(g,i,special?'CANHÃO!':g.kickPower>.85?'CHUTE · NO LIMITE':style==='roll'?'COBERTURA':'CHUTE');
}
// A pass arriving at the human's receiver can be struck first time. Pressing ~0.16 s before the ball arrives is perfect; sooner opens the shot, later hits the keeper.
export function firstTimeSoccer(g:Soccer,direction?:{x:number;z:number}){
 if(g.status!=='playing'||g.owner>=0||g.active<0||g.passReceiver!==g.active)return false;
 const p=g.players[g.active],b=g.ball,v2=b.vx*b.vx+b.vz*b.vz,falling=b.y<FLOOR-30||b.vy<-50;
 // A lifted ball (chapéu) is timed by its fall to kicking height; a rolling pass by its arrival.
 g.firstTimeEta=falling?(-b.vy+Math.sqrt(b.vy*b.vy+4*310*Math.max(0,412-b.y)))/620:v2?((p.x-b.x)*b.vx+(p.z-b.z)*b.vz)/v2:1;
 g.shotWindow=.45;g.kickAimZ=direction?.z?225+clamp(direction.z,-1,1)*58:g.aim.z;return true;
}
// Chapéu: standing still with the ball, B flicks it up to yourself so A can volley it first time.
export function chapeuSoccer(g:Soccer){
 if(g.status!=='playing'||g.owner<0||g.owner!==g.active||g.pendingKick)return false;
 const i=g.owner,p=g.players[i];if(Math.hypot(p.vx,p.vz)>60)return false;
 g.ball={x:p.x+p.facingX*8,z:p.z+p.facingZ*8,y:Math.min(g.ball.y,430),vx:p.facingX*6,vz:p.facingZ*6,vy:-330};
 g.owner=-1;g.passReceiver=i;g.cooldown=.35;p.action='bump';p.actionTime=.36;impact(g,i,'CHAPÉU');return true;
}
function firstTimeShot(g:Soccer,i:number,timing:ReturnType<typeof shotTiming>){
 g.owner=i;g.kickPower=timing.perfect?1:.45;
 if(timing.early)g.kickAimZ+=(g.kickAimZ>=225?1:-1)*70;
 if(timing.late)g.kickAimZ=225+(g.kickAimZ-225)*.3;
 strikeShot(g);g.shotWindow=0;g.timing=timing.offset;if(timing.perfect)g.perfects++;
 if(g.feedback!=='CANHÃO!')g.feedback=`DE PRIMEIRA · ${timing.perfect?'PERFEITO':timing.early?'CEDO · ABRIU':'TARDE · NO GOLEIRO'}`;
}
// Street-style dribble with the ball at your feet (jump button): CANETA through a defender in front, ELÁSTICO past one beside.
// A good trick beats the tackle (it whiffs), fills the special bar and briefly protects the ball.
export function trickSoccer(g:Soccer,i=g.active){
 const p=g.players[i];if(g.status!=='playing'||g.owner!==i||p.y<FLOOR||p.trickCooldown>0||g.pendingKick)return false;
 const near=g.players.map((q,id)=>({q,id,d:Math.hypot(q.x-p.x,q.z-p.z)})).filter(o=>o.q.team!==p.team&&o.id%3!==0&&o.d<80).sort((a,b)=>a.d-b.d)[0];
 if(!near)return false;
 const fx=p.facingX||(p.team?-1:1),fz=p.facingZ,dx=(near.q.x-p.x)/near.d,dz=(near.q.z-p.z)/near.d,ahead=fx*dx+fz*dz>.55;
 if(ahead){p.vx=fx*430;p.vz=fz*430;g.ball.x=clamp(near.q.x+fx*34,45,955);g.ball.z=clamp(near.q.z+fz*34,35,415);}
 else{const side=fx*dz-fz*dx>0?-1:1;p.vx=-fz*side*420;p.vz=fx*side*420;}
 near.q.tackleTime=0;near.q.tackleReaction=0;near.q.tackleCooldown=Math.max(near.q.tackleCooldown,.7);
 p.dribbleTime=.5;p.trickCooldown=.9;p.action='bump';p.actionTime=.3;p.touchDelay=0;
 impact(g,i,ahead?'CANETA!':'ELÁSTICO!');
 // The nutmeg sends the ball rolling on behind the defender; the elastic keeps it at your feet.
 if(ahead){g.owner=-1;g.passReceiver=-1;g.ball.vx=fx*260;g.ball.vz=fz*260;g.ball.vy=0;}else g.owner=i;rewardArcade(g,p.team,1);g.energy[p.team]=Math.min(100,g.energy[p.team]+10);
 return true;
}
function restart(g:Soccer,team:number,message:string,x?:number,z?:number){
 g.specialShot=false;g.specialPlayer=-1;g.specialArmed=false;const active=g.active,fresh=createSoccer();g.players=fresh.players;
 if(x!==undefined){g.players[team*3+1].x=clamp(x,80,920);g.players[team*3+1].z=clamp(z??225,40,410);}
 const receiver=g.players[team*3+1];g.ball={x:receiver.x+(team?-18:18),z:receiver.z,y:437,vx:0,vz:0,vy:0};
 // Opponents give the restart room (playtest 2026-10-19: the restart pass went straight to a waiting striker for a goal every 2 s).
 for(const id of [(1-team)*3+1,(1-team)*3+2]){const q=g.players[id],dx=q.x-g.ball.x,dz=q.z-g.ball.z,d=Math.hypot(dx,dz)||1;if(d<150){q.x=clamp(g.ball.x+dx/d*150,45,955);q.z=clamp(g.ball.z+dz/d*150,35,415);}}
 possess(g,team*3+1);g.status='ready';g.restartDelay=1.2;g.message=message;g.active=active<0?-1:g.owner<3?g.owner:1;
}
export function stepSoccer(g:Soccer,dt:number,input:BeachInput,level:string){
 if(!Number.isFinite(dt)||dt<=0||![input.x,input.z].every(Number.isFinite))return;
 if(g.status==='ready'&&g.restartDelay>0){g.restartDelay=Math.max(0,g.restartDelay-Math.min(dt,.05));if(!g.restartDelay)startSoccer(g);return;}
 if(g.status!=='playing')return;
 dt=Math.min(dt,.05);g.clock+=dt;stepArcade(g,dt);g.shotAge+=dt;g.cooldown=Math.max(0,g.cooldown-dt);g.hitFlash=Math.max(0,g.hitFlash-dt);g.feedbackTime=Math.max(0,g.feedbackTime-dt);
 const nearest=[1,4];
 for(const team of [0,1]){const ids=[team*3+1,team*3+2];nearest[team]=ids.reduce((a,b)=>Math.hypot(g.players[a].x-g.ball.x,g.players[a].z-g.ball.z)<Math.hypot(g.players[b].x-g.ball.x,g.players[b].z-g.ball.z)?a:b);}
 if(g.owner<0&&g.passReceiver>=0)nearest[g.players[g.passReceiver].team]=g.passReceiver;
 if(g.autoSwitch&&g.active>=0&&g.owner<0){
  const current=g.players[g.active],next=g.players[nearest[0]],engaged=input.x!==0||input.z!==0||input.prepare||input.jump||current.y<FLOOR||current.actionTime>0||current.windup>0;
  if(!engaged&&g.autoSwitchSerial!==g.contactSerial&&Math.hypot(current.x-g.ball.x,current.z-g.ball.z)>Math.hypot(next.x-g.ball.x,next.z-g.ball.z)+45){g.active=nearest[0];g.autoSwitchSerial=g.contactSerial;}
 }
 for(let i=0;i<6;i++){
  const p=g.players[i],human=i===g.active,keeper=i%3===0,direction=p.team?-1:1,own=g.owner===i;
  p.windup=own&&g.pendingKick?g.kickDelay:0;
  p.tackleCooldown=Math.max(0,p.tackleCooldown-dt);p.dribbleTime=Math.max(0,p.dribbleTime-dt);p.trickCooldown=Math.max(0,p.trickCooldown-dt);p.touchDelay=Math.max(0,p.touchDelay-dt);
  if(p.tackleTime>0){p.tackleTime=Math.max(0,p.tackleTime-dt);if(!p.tackleTime&&human&&g.owner!==i){g.feedback='ERROU O BOTE';g.feedbackTime=.7;g.contactHint='Recupere a posição antes de tentar de novo';}}
  const distance=Math.hypot(p.x-g.ball.x,p.z-g.ball.z),reaction=p.team&&level==='Chill'?.3:p.team&&level==='Pro'?.16:.22;
  const threat=!human&&g.owner>=0&&g.players[g.owner].team!==p.team&&(keeper||nearest[p.team]===i)&&!p.tackleCooldown&&distance<70;
  p.tackleReaction=threat?Math.min(reaction,p.tackleReaction+dt):0;
  if(threat&&p.tackleReaction<reaction){p.windup=reaction-p.tackleReaction;p.action='dive';const d=distance||1;p.diveX=(g.ball.x-p.x)/d;p.diveZ=(g.ball.z-p.z)/d;}
  if(threat&&p.tackleReaction>=reaction&&distance<55){tackleSoccer(g,i);p.tackleReaction=0;}
  const hasBall=g.owner>=0&&g.players[g.owner].team===p.team;
  let targetX=p.team?915:85,targetZ=clamp(g.ball.z+g.ball.vz*Math.min(.35,Math.abs((targetX-g.ball.x)/(g.ball.vx||1))),150,300);
  if(keeper){if(g.shotAge>.22)p.keeperTargetZ=targetZ;targetZ=p.keeperTargetZ;}
  if(!keeper){
   if(own){
    targetX=p.team?210:790;
    const defender=g.players.filter(q=>q.team!==p.team).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
    targetZ=Math.hypot(defender.x-p.x,defender.z-p.z)<130?(defender.z>p.z?100:350):225;
   }
   else if(nearest[p.team]===i&&!hasBall){targetX=g.ball.x+g.ball.vx*.12;targetZ=g.ball.z+g.ball.vz*.12;}
   else{targetX=clamp((hasBall?g.ball.x+direction*140:g.ball.x-direction*130),180,820);targetZ=(i%3===1?100:350);if(p.team)targetZ=450-targetZ;}
  }
  let dx=human?input.x:clamp((targetX-p.x)/45,-1,1),dz=human?input.z:clamp((targetZ-p.z)/45,-1,1);
  if(own&&g.pendingKick){dx*=.25;dz*=.25;}
  if(own)p.preparation=human?g.charge:Math.min(.85,g.cpuWait*.5);else p.preparation=0;
  if(human&&input.jump&&!p.jumpHeld&&p.y===FLOOR&&p.action!=='dive'&&!(own&&trickSoccer(g,i)))p.vy=-390;p.jumpHeld=human&&input.jump;
  // Rival style: defenders run more, a blocking side has a quicker keeper.
  const speedLimit=human?295:keeper?(p.team&&g.cpuStyle==='block'?195:155):(level==='Chill'&&p.team?205:270)*(p.team&&g.cpuStyle==='defense'?1.1:1);
  if(p.tackleTime>0){dx=p.diveX;dz=p.diveZ;}
  moveRunner(p,dx,dz,dt,p.tackleTime>0?470:p.action==='dive'&&p.actionTime>0?speedLimit*.45:speedLimit);
  const speed=Math.hypot(p.vx,p.vz);if(speed>35){p.facingX=p.vx/speed;p.facingZ=p.vz/speed;}
  p.x=clamp(p.x,keeper?(p.team?835:50):45,keeper?(p.team?950:165):955);p.z=clamp(p.z,35,415);
  if(p.x===(keeper?(p.team?835:50):45)&&p.vx<0||p.x===(keeper?(p.team?950:165):955)&&p.vx>0)p.vx=0;
  if(p.z===35&&p.vz<0||p.z===415&&p.vz>0)p.vz=0;
 }
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
  const a=g.players[i],b=g.players[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
  if(d>0&&d<27){const push=Math.min((27-d)/2,100*dt);a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push;}
 }
 if(g.pendingKick&&g.owner>=0&&g.players[g.owner].y===FLOOR){
  g.kickDelay=Math.max(0,g.kickDelay-dt);g.players[g.owner].windup=g.kickDelay;
  if(!g.kickDelay){const kick=g.pendingKick;g.pendingKick='';if(kick==='pass')strikePass(g,input);else strikeShot(g);}
 }
 if(g.owner>=0){
  const p=g.players[g.owner],distance=Math.hypot(g.ball.x-p.x,g.ball.z-p.z),speed=Math.hypot(p.vx,p.vz);
  const turning=speed>35&&g.ball.vx*p.vx+g.ball.vz*p.vz<0;
  if(distance<64&&(!p.touchDelay||turning)&&!g.pendingKick&&p.y===FLOOR&&g.ball.y>FLOOR-42){
   const reach=18+speed*.035;
   g.lastHit=g.owner;g.ball.vx=p.vx+(p.x+p.facingX*reach-g.ball.x)*9;g.ball.vz=p.vz+(p.z+p.facingZ*reach-g.ball.z)*9;g.ball.vy=speed>50?-24:0;p.touchDelay=.1;
  }
  if(g.owner===g.active){g.charge=input.prepare?Math.min(1,g.charge+dt*1.15):g.charge;}
  else{
   g.cpuWait+=dt;g.charge=0;
   const pressure=g.players.some(q=>q.team!==p.team&&Math.hypot(q.x-p.x,q.z-p.z)<65);
   if(pressure&&g.cpuWait>.35&&g.contactSerial%5===0&&trickSoccer(g,g.owner)){/* The CPU shows off too. */}
   else if(g.cpuWait>.8||pressure&&g.cpuWait>.3){if(g.owner%3===0)passSoccer(g);else if((p.team?p.x<(g.cpuStyle==='attack'?560:470):p.x>530)||g.cpuWait>2){shootSoccer(g);}else if(pressure||g.cpuWait>1.2){passSoccer(g);}}
  }
  if(g.owner>=0&&!g.cooldown){
   const owner=g.owner,carrier=g.players[owner];
   const tackler=carrier.dribbleTime>0?-1:g.players.findIndex(q=>q.team!==carrier.team&&q.tackleTime>0&&Math.hypot(q.x-g.ball.x,q.z-g.ball.z)<30&&g.ball.y>FLOOR-45);
   if(tackler>=0){carrier.tackleCooldown=.9;possess(g,tackler);g.players[tackler].tackleTime=0;g.players[tackler].action='dive';g.players[tackler].actionTime=.42;rewardArcade(g,g.players[tackler].team);g.combo[carrier.team]=0;g.comboTime[carrier.team]=0;g.specialShot=false;impact(g,tackler,'DESARME');}
  }
  if(g.owner>=0&&Math.hypot(g.ball.x-g.players[g.owner].x,g.ball.z-g.players[g.owner].z)>75){g.owner=-1;g.pendingKick='';}
 }
 const b=g.ball,old={...b};b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt+310*dt*dt;b.vy+=620*dt;
 if(b.y>=437){b.y=437;b.vy=Math.abs(b.vy)<70?0:-b.vy*.4;b.vx*=Math.exp(-dt*(g.owner>=0?4:.8));b.vz*=Math.exp(-dt*(g.owner>=0?4:.8));}
 if(g.owner<0){
  const dx=b.x-old.x,dz=b.z-old.z;
  for(let i=0;i<6;i++){
   if(i===g.lastHit&&g.cooldown>0)continue;
   const p=g.players[i],t=clamp(((p.x-old.x)*dx+(p.z-old.z)*dz)/(dx*dx+dz*dz||1),0,1);
   const height=FLOOR-(old.y+(b.y-old.y)*t),keeper=i%3===0;
   if(Math.hypot(p.x-old.x-dx*t,p.z-old.z-dz*t)<(keeper?30:23)&&height<=(keeper?105:40)+(FLOOR-p.y)){
    b.x=old.x+dx*t;b.z=old.z+dz*t;b.y=old.y+(b.y-old.y)*t;
    const team=g.players[g.lastHit].team,incomingSpecial=g.specialShot;
    if(g.lastHit!==i)rewardArcade(g,p.team);
    if(team!==p.team){g.combo[team]=0;g.comboTime[team]=0;if(incomingSpecial)g.energy[p.team]=Math.min(100,g.energy[p.team]+20);}
    if(i===g.active&&p.team===0&&g.shotWindow>0){firstTimeShot(g,i,shotTiming((g.firstTimeEta-.16)/.17));return;}
    if(Math.hypot(b.vx,b.vz)>850){
     b.vx*=-.4;b.vz*=-.4;b.vy=-170;g.cooldown=.22;g.specialShot=false;p.action=keeper?'dive':'bump';p.actionTime=.5;impact(g,i,'DEFESA · REBOTE!');return;
    }
    possess(g,i);g.specialShot=false;g.specialPlayer=-1;p.action=keeper?'dive':'bump';p.actionTime=keeper?.5:.36;p.windup=0;p.diveZ=Math.sign(b.vz)||1;impact(g,i,keeper?'DEFESA DO GOLEIRO':'DOMÍNIO');return;
   }
  }
 }
 soccerBoundary(g,old);
}
function soccerBoundary(g:Soccer,old:Soccer['ball']){
 const b=g.ball;
 if(b.x<35||b.x>965){
  const right=b.x>965,t=((right?965:35)-old.x)/(b.x-old.x),z=old.z+(b.z-old.z)*t,y=old.y+(b.y-old.y)*t;
  const winner=right?0:1,scored=z>=150&&z<=300&&y>=355;
  if(scored){g.energy[winner]=Math.min(100,g.energy[winner]+20);g.combo[1-winner]=0;g.comboTime[1-winner]=0;g.score[winner]++;restart(g,1-winner,winner===0?'GOL! Saída da Praia.':'Gol da Praia. Sua saída.');if(g.score[winner]>=5)g.status='over';}
  else restart(g,right?1:0,'Tiro de meta');
 }else if(b.z<25||b.z>425){restart(g,1-g.players[g.lastHit].team,'Lateral · reposição com os pés',b.x,clamp(b.z,45,405));}
}
