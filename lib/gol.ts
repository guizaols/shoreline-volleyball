export const goal={left:70,right:930,top:220,bottom:410};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function newFootball(){
 return {ballHeight:0,ballLift:0,spin:0,effect:'classic',shotStyle:'direct',lastShooter:0,banks:0,bankGoals:0,saves:[0,0],recorded:false,impact:{x:0,y:0,life:0,kind:''},status:'ready',score:[0,0],players:[{x:160,y:315,vx:0,vy:0,dive:0,recovery:0,kick:0,save:0,jump:0,jumpVelocity:0},{x:840,y:315,vx:0,vy:0,dive:0,recovery:0,kick:0,save:0,jump:0,jumpVelocity:0}],
 ball:{x:184,y:315,vx:0,vy:0},owner:0,aim:1,charge:0,clock:0,cpuWait:0,cooldown:0,delay:0,message:'Sua praia. Seu gol.',last:'',winner:-1};
}
export type Football=ReturnType<typeof newFootball>;
export function startFootball(g:Football){if(g.status==='ready')g.status='playing';}
export function shootFootball(g:Football,team=0){
 if(g.status!=='playing'||g.owner!==team)return;
 const p=g.players[team],target=team?(g.players[0].y<315?390:240):[240,315,390][g.aim];
 const style=team?(g.players[0].x>270?'lob':Math.floor(g.clock)%3===1?'curve-up':'direct'):g.shotStyle;
 const aimed=style==='top'?230-target:style==='bottom'?1030-target:target;
 const origin=p.x+(team?-24:24),x=team?goal.left:goal.right,dx=x-origin,dy=aimed-p.y,d=Math.hypot(dx,dy);
 const speed=team?510+70*Math.sin(g.clock*2):400+350*g.charge;
 g.ball={x:origin,y:p.y,vx:dx/d*speed,vy:dy/d*speed};
 g.ballHeight=0;g.ballLift=0;g.spin=style==='curve-up'?-170:style==='curve-down'?170:0;
 if(style==='lob'){
  const flight=Math.max(1.8,d/(speed*.7));g.ball.vx=dx/flight;g.ball.vy=dy/flight;g.ballLift=(30+210*flight*flight)/flight;
 }else if(g.spin){const flight=dx/g.ball.vx;g.ball.vy-=g.spin*flight*.5;}
 p.kick=.32;g.lastShooter=team;g.banks=0;g.impact={x:origin,y:p.y,life:.3,kind:'kick'};
 g.owner=-1;g.cooldown=.16;g.charge=0;g.last=style==='lob'?'POR COBERTURA!':g.spin?'CHUTE COM CURVA!':['top','bottom'].includes(style)?'CHUTE DE TABELA!':'CHUTE!';g.cpuWait=0;
}
export function diveFootball(g:Football,direction=0){
 const p=g.players[0];if(g.status!=='playing'||g.owner===0||p.recovery>0||p.jump>0||p.jumpVelocity>0)return;
 p.dive=.28;p.recovery=1;p.vy=(direction||Math.sign(g.ball.y-p.y)||1)*600;
}
export function jumpFootball(g:Football,team=0){
 const p=g.players[team];if(g.status!=='playing'||g.owner===team||p.jump>0||p.jumpVelocity>0||p.dive>0)return;
 p.jumpVelocity=350;
}
function possession(g:Football,team:number){
 g.ballHeight=0;g.ballLift=0;g.spin=0;g.owner=team;g.charge=0;g.cpuWait=0;g.cooldown=.2;
 g.ball={x:g.players[team].x+(team?-24:24),y:g.players[team].y,vx:0,vy:0};
}
export function stepFootball(g:Football,dt:number,x:number,y:number,charging=false){
 if(g.status==='goal'){
  g.delay-=dt;if(g.delay<=0){g.status='playing';possession(g,1-g.winner);}return;
 }
 if(g.status!=='playing')return;
 g.impact.life=Math.max(0,g.impact.life-dt);
 g.clock+=dt;g.cooldown=Math.max(0,g.cooldown-dt);
 const cpu=g.players[1],b=g.ball;
 g.charge=g.owner===0&&charging?Math.min(1,g.charge+dt*.9):g.owner===0?g.charge:0;
 const flight=b.vx>0?Math.max(0,(cpu.x-b.x)/b.vx):0;
 const targetY=g.owner===1?315:clamp(b.y+b.vy*flight+.5*g.spin*flight*flight+Math.sin(g.clock*1.8)*22,150,480);
 const predictedHeight=Math.max(0,g.ballHeight+g.ballLift*flight-210*flight*flight);
 if(g.owner<0&&b.vx>0&&flight<.4&&predictedHeight>45&&Math.abs(targetY-cpu.y)<60)jumpFootball(g,1);
 const defensiveX=g.owner===1?760:g.ballHeight>65||g.ballLift>120?890:g.players[0].x>300?800:840;
 for(let i=0;i<2;i++){
  const a=g.players[i];if(a.jumpVelocity||a.jump){a.jumpVelocity-=650*dt;a.jump=Math.max(0,a.jump+a.jumpVelocity*dt);if(!a.jump)a.jumpVelocity=0;}a.kick=Math.max(0,a.kick-dt);a.save=Math.max(0,a.save-dt);a.recovery=Math.max(0,a.recovery-dt);
  if(a.dive>0){a.dive=Math.max(0,a.dive-dt);a.vy*=Math.exp(-dt*2);a.vx=0;}
  else{
   let dx=i?clamp((defensiveX-a.x)/35,-1,1):x;
   let dy=i?clamp((targetY-a.y)/35,-1,1):y;
   const length=Math.max(1,Math.hypot(dx,dy));dx/=length;dy/=length;
   const speed=i?235:300;
   a.vx+=(dx*speed-a.vx)*(1-Math.exp(-dt*22));a.vy+=(dy*speed-a.vy)*(1-Math.exp(-dt*22));
  }
  a.x=clamp(a.x+a.vx*dt,i?550:95,i?905:450);a.y=clamp(a.y+a.vy*dt,125,505);
 }
 if(g.owner>=0){
  const a=g.players[g.owner];b.x=a.x+(g.owner?-24:24);b.y=a.y;
  if(g.owner===1){g.cpuWait+=dt;if(g.cpuWait>1.1)shootFootball(g,1);}return;
 }
 const oldX=b.x,oldY=b.y,oldHeight=g.ballHeight;
 b.x+=b.vx*dt;b.y+=b.vy*dt+.5*g.spin*dt*dt;b.vy+=g.spin*dt;
 g.ballHeight+=g.ballLift*dt-210*dt*dt;
 if(g.ballHeight>0)g.ballLift-=420*dt;else{g.ballHeight=0;g.ballLift=0;}
 if(b.y<115||b.y>515){const wall=b.y<115?115:515;b.y=2*wall-b.y;b.vy*=-.92;b.vx*=.92;g.spin*=-.8;g.banks++;g.impact={x:b.x,y:wall,life:.3,kind:'bank'};g.last='TABELA!';}
 for(let i=0;i<2;i++){
  const a=g.players[i],dx=b.x-oldX,dy=b.y-oldY,t=clamp(((a.x-oldX)*dx+(a.y-oldY)*dy)/(dx*dx+dy*dy||1),0,1);
  const distance=Math.hypot(a.x-oldX-dx*t,a.y-oldY-dy*t);
  const contactHeight=oldHeight+(g.ballHeight-oldHeight)*t;
  if(!g.cooldown&&distance<(a.dive>0?43:25)&&contactHeight>=Math.max(0,a.jump-35)&&contactHeight<=(a.dive>0?24:50+a.jump)){g.saves[i]++;a.save=.35;g.impact={x:a.x,y:a.y,life:.35,kind:'save'};possession(g,i);g.last=i?'DEFESA ADVERSÁRIA':'BOA DEFESA!';return;}
 }
 if(b.x<goal.left||b.x>goal.right){
  const line=b.x<goal.left?goal.left:goal.right,t=(line-oldX)/(b.x-oldX);
  const crossingY=oldY+(b.y-oldY)*t,attacker=b.x<goal.left?1:0;
  const crossingHeight=oldHeight+(g.ballHeight-oldHeight)*t;
  if(crossingY>=goal.top&&crossingY<=goal.bottom&&crossingHeight<=95){
   if(attacker===0&&g.banks>0)g.bankGoals++;
   g.score[attacker]++;g.winner=attacker;g.status=g.score[attacker]>=5?'over':'goal';g.delay=1.2;
   g.message=attacker?'Gol adversário!':g.banks>0?'GOLAÇO DE TABELA!':'GOOOL!';g.last=g.message;
   g.players.forEach((p,i)=>Object.assign(p,{x:i?840:160,y:315,vx:0,vy:0,dive:0,recovery:0,kick:0,save:0,jump:0,jumpVelocity:0}));
  }else{possession(g,1-attacker);g.last=crossingHeight>95?'POR CIMA · REPOSIÇÃO':'FORA · REPOSIÇÃO';}
 }
}

export const footballEffects=[
 {id:'classic',name:'Areia',color:'#fff1b0',description:'Disponível desde o início',metric:'goals',target:0},
 {id:'aqua',name:'Maré',color:'#4cebdd',description:'Marque 3 gols',metric:'goals',target:3},
 {id:'comet',name:'Cometa',color:'#ff9a53',description:'Vença uma partida',metric:'wins',target:1},
 {id:'electric',name:'Faísca',color:'#c7a1ff',description:'Faça 5 defesas',metric:'saves',target:5},
 {id:'aurora',name:'Aurora',color:'#fa80bb',description:'Marque 3 gols de tabela',metric:'bankGoals',target:3},
] as const;
export function newFootballProgress(){return {matches:0,wins:0,goals:0,saves:0,bankGoals:0,effect:'classic'};}
export type FootballProgress=ReturnType<typeof newFootballProgress>;
export function effectUnlocked(p:FootballProgress,id:string){
 const effect=footballEffects.find(e=>e.id===id);return !!effect&&p[effect.metric]>=effect.target;
}
export function readFootballProgress(raw:string|null):FootballProgress{
 const p=newFootballProgress();
 try{const data=JSON.parse(raw||'null');
  for(const key of ['matches','wins','goals','saves','bankGoals'] as const)if(Number.isSafeInteger(data?.[key])&&data[key]>=0&&data[key]<=10000000)p[key]=data[key];
  if(typeof data?.effect==='string'&&effectUnlocked(p,data.effect))p.effect=data.effect;
 }catch{}return p;
}
export function recordFootball(p:FootballProgress,g:Football):FootballProgress{
 if(g.status!=='over'||g.recorded)return p;g.recorded=true;
 return {...p,matches:p.matches+1,wins:p.wins+Number(g.score[0]>=5),goals:p.goals+g.score[0],saves:p.saves+g.saves[0],bankGoals:p.bankGoals+g.bankGoals};
}
