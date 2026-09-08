export const goal={left:70,right:930,top:220,bottom:410};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function newFootball(){
 return {status:'ready',score:[0,0],players:[{x:160,y:315,vx:0,vy:0,dive:0,recovery:0},{x:840,y:315,vx:0,vy:0,dive:0,recovery:0}],
 ball:{x:184,y:315,vx:0,vy:0},owner:0,aim:1,charge:0,clock:0,cpuWait:0,cooldown:0,delay:0,message:'Sua praia. Seu gol.',last:'',winner:-1};
}
export type Football=ReturnType<typeof newFootball>;
export function startFootball(g:Football){if(g.status==='ready')g.status='playing';}
export function shootFootball(g:Football,team=0){
 if(g.status!=='playing'||g.owner!==team)return;
 const p=g.players[team],target=team?(g.players[0].y<315?390:240):[240,315,390][g.aim];
 const x=team?goal.left-20:goal.right+20,dx=x-p.x,dy=target-p.y,d=Math.hypot(dx,dy);
 const speed=team?510+70*Math.sin(g.clock*2):400+350*g.charge;
 g.ball={x:p.x+(team?-24:24),y:p.y,vx:dx/d*speed,vy:dy/d*speed};
 g.owner=-1;g.cooldown=.16;g.charge=0;g.last='CHUTE!';g.cpuWait=0;
}
export function diveFootball(g:Football,direction=0){
 const p=g.players[0];if(g.status!=='playing'||g.owner===0||p.recovery>0)return;
 p.dive=.28;p.recovery=1;p.vy=(direction||Math.sign(g.ball.y-p.y)||1)*600;
}
function possession(g:Football,team:number){
 g.owner=team;g.charge=0;g.cpuWait=0;g.cooldown=.2;
 g.ball={x:g.players[team].x+(team?-24:24),y:g.players[team].y,vx:0,vy:0};
}
export function stepFootball(g:Football,dt:number,x:number,y:number,charging=false){
 if(g.status==='goal'){
  g.delay-=dt;if(g.delay<=0){g.status='playing';possession(g,1-g.winner);}return;
 }
 if(g.status!=='playing')return;
 g.clock+=dt;g.cooldown=Math.max(0,g.cooldown-dt);
 const cpu=g.players[1],b=g.ball;
 g.charge=g.owner===0&&charging?Math.min(1,g.charge+dt*.9):g.owner===0?g.charge:0;
 const flight=b.vx>0?Math.max(0,(cpu.x-b.x)/b.vx):0;
 const targetY=g.owner===1?315:clamp(b.y+b.vy*flight+Math.sin(g.clock*1.8)*22,150,480);
 for(let i=0;i<2;i++){
  const a=g.players[i];a.recovery=Math.max(0,a.recovery-dt);
  if(a.dive>0){a.dive=Math.max(0,a.dive-dt);a.vy*=Math.exp(-dt*2);a.vx=0;}
  else{
   let dx=i?(g.owner===1?clamp((760-a.x)/35,-1,1):clamp((840-a.x)/35,-1,1)):x;
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
 const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
 if(b.y<115||b.y>515){b.y=clamp(b.y,115,515);b.vy*=-.85;g.last='NA LATERAL!';}
 for(let i=0;i<2;i++){
  const a=g.players[i],dx=b.x-oldX,dy=b.y-oldY,t=clamp(((a.x-oldX)*dx+(a.y-oldY)*dy)/(dx*dx+dy*dy||1),0,1);
  const distance=Math.hypot(a.x-oldX-dx*t,a.y-oldY-dy*t);
  if(!g.cooldown&&distance<(a.dive>0?43:25)){possession(g,i);g.last=i?'DEFESA ADVERSÁRIA':'BOA DEFESA!';return;}
 }
 if(b.x<goal.left||b.x>goal.right){
  const line=b.x<goal.left?goal.left:goal.right,t=(line-oldX)/(b.x-oldX);
  const crossingY=oldY+(b.y-oldY)*t,attacker=b.x<goal.left?1:0;
  if(crossingY>=goal.top&&crossingY<=goal.bottom){
   g.score[attacker]++;g.winner=attacker;g.status=g.score[attacker]>=5?'over':'goal';g.delay=1.2;
   g.message=attacker?'Gol adversário!':'GOOOL!';g.last=g.message;
   g.players.forEach((p,i)=>Object.assign(p,{x:i?840:160,y:315,vx:0,vy:0,dive:0,recovery:0}));
  }else{possession(g,1-attacker);g.last='FORA · REPOSIÇÃO';}
 }
}
