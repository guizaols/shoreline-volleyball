import type * as Phaser from 'phaser';

export const ATHLETE_SIZE=144,ATHLETE_FEET=132,ATHLETE_FRAMES=12;
type Point=[number,number];
type Fx=[string,...number[]];
type Pose={head:Point;neck:Point;hip:Point;eF:Point;hF:Point;eB:Point;hB:Point;kF:Point;fF:Point;kB:Point;fB:Point;racket?:Point;face?:number;fx?:Fx[]};

// Key poses from the approved "Movimentos por esporte" design: a 34×44 pixel grid, facing right, ground at y=37.
const poses:Record<string,Pose>={
 idle:{head:[15,8],neck:[15,13],hip:[14,24],eF:[19,17],hF:[21,20],eB:[10,17],hB:[10,21],kF:[18,30],fF:[21,37],kB:[11,31],fB:[9,37]},
 ready:{head:[15,9],neck:[15,14],hip:[14,24],eF:[19,18],hF:[21,21],eB:[11,18],hB:[12,22],kF:[18,30],fF:[20,37],kB:[11,31],fB:[9,37]},
 brake:{head:[13,10],neck:[14,15],hip:[15,25],eF:[19,18],hF:[22,20],eB:[10,18],hB:[8,21],kF:[20,31],fF:[24,37],kB:[12,31],fB:[10,37],fx:[['dust',25,38,1.6],['dust',21,38,1.2]]},
 runA:{head:[17,8],neck:[16,13],hip:[14,23],eF:[20,17],hF:[22,13],eB:[10,17],hB:[8,21],kF:[19,28],fF:[22,33],kB:[11,30],fB:[7,35]},
 runB:{head:[17,8],neck:[16,13],hip:[14,23],eF:[12,17],hF:[10,21],eB:[19,17],hB:[21,13],kF:[12,30],fF:[8,35],kB:[18,28],fB:[21,33]},
 jump:{head:[16,8],neck:[16,13],hip:[16,23],eF:[19,7],hF:[20,2],eB:[13,7],hB:[12,2],kF:[18,29],fF:[16,34],kB:[13,29],fB:[11,34]},
 land:{head:[15,12],neck:[15,17],hip:[14,27],eF:[19,21],hF:[22,24],eB:[11,21],hB:[9,24],kF:[19,31],fF:[21,37],kB:[10,32],fB:[8,37],fx:[['dust',6,38,1.6],['dust',24,38,1.6]]},
 bump:{head:[14,10],neck:[14,15],hip:[12,24],eF:[18,20],hF:[22,22],eB:[17,21],hB:[21,23],kF:[17,30],fF:[20,37],kB:[9,31],fB:[7,37],fx:[['dust',8,38,1.5],['dust',21,38,1.2]]},
 set:{head:[16,8],neck:[16,13],hip:[16,23],eF:[19,7],hF:[19,2],eB:[13,7],hB:[15,2],kF:[18,30],fF:[19,37],kB:[13,30],fB:[12,37]},
 spike:{head:[15,6],neck:[15,11],hip:[13,21],eF:[19,5],hF:[23,1],eB:[12,14],hB:[16,17],kF:[17,26],fF:[13,31],kB:[10,27],fB:[7,32],fx:[['line',2,26,7,21],['line',1,32,6,27],['star',27,0]]},
 block:{head:[16,6],neck:[16,11],hip:[16,21],eF:[17,4],hF:[18,-2],eB:[14,4],hB:[14,-2],kF:[17,28],fF:[17,34],kB:[14,28],fB:[14,34]},
 dive:{head:[25,27],neck:[21,29],hip:[12,31],eF:[26,31],hF:[30,33],eB:[25,33],hB:[29,35],kF:[6,30],fF:[1,28],kB:[7,33],fB:[2,33],fx:[['dust',10,37,2],['dust',16,37,2.2],['dust',22,37,1.8],['dust',5,37,1.4]]},
 chest:{head:[13,7],neck:[14,12],hip:[16,23],eF:[19,13],hF:[22,10],eB:[10,13],hB:[7,11],kF:[19,30],fF:[21,37],kB:[14,30],fB:[11,37]},
 header:{head:[19,7],neck:[17,12],hip:[14,22],eF:[12,15],hF:[9,18],eB:[11,13],hB:[7,15],kF:[17,28],fF:[13,33],kB:[11,28],fB:[8,32],fx:[['star',24,2]]},
 bicycle:{head:[11,32],neck:[13,27],hip:[16,18],kF:[19,10],fF:[22,3],kB:[13,13],fB:[9,9],eF:[9,30],hF:[6,33],eB:[18,30],hB:[20,34],face:-1,fx:[['line',26,12,30,7],['line',22,14,27,9],['star',27,1]]},
 kick:{head:[13,8],neck:[13,13],hip:[15,23],kF:[21,26],fF:[26,31],kB:[14,30],fB:[13,37],eF:[9,17],hF:[6,20],eB:[17,16],hB:[19,19],fx:[['dust',12,38,1.4],['line',22,24,27,23]]},
 forehand:{head:[17,9],neck:[16,14],hip:[14,24],eF:[20,16],hF:[23,15],racket:[28,11],eB:[12,17],hB:[10,20],kF:[21,31],fF:[25,37],kB:[9,31],fB:[6,37],fx:[['dust',6,38,1.3]]},
 lob:{head:[14,8],neck:[14,13],hip:[14,23],eF:[18,19],hF:[21,23],racket:[25,19],eB:[10,17],hB:[8,20],kF:[19,30],fF:[22,37],kB:[11,30],fB:[9,37],fx:[['line',27,22,29,17]]},
 smash:{head:[15,6],neck:[15,11],hip:[14,21],eF:[17,4],hF:[19,0],racket:[22,-4],eB:[19,12],hB:[22,9],kF:[17,27],fF:[15,33],kB:[11,27],fB:[9,33],fx:[['star',26,-3],['line',4,28,8,24]]},
 save:{head:[22,14],neck:[18,16],hip:[10,20],eF:[25,11],hF:[29,8],eB:[24,14],hB:[28,12],kF:[5,18],fF:[1,15],kB:[6,22],fB:[1,22],fx:[['line',4,27,12,26],['line',6,31,14,30]]},
 shark:{head:[10,8],neck:[11,13],hip:[13,23],kF:[19,15],fF:[25,8],kB:[11,30],fB:[9,35],eF:[7,15],hF:[4,18],eB:[15,15],hB:[17,12],fx:[['line',18,22,22,15],['line',21,24,25,17],['star',29,4]]},
 tennisDive:{head:[23,27],neck:[19,29],hip:[10,31],eF:[24,30],hF:[27,31],racket:[31,27],eB:[18,33],hB:[21,35],kF:[5,30],fF:[1,28],kB:[6,33],fB:[1,33],fx:[['dust',9,37,2],['dust',15,37,2.2],['dust',21,37,1.6]]},
 slide:{head:[8,29],neck:[11,31],hip:[17,33],kF:[24,33],fF:[30,35],kB:[21,36],fB:[26,37],eF:[6,34],hF:[4,36],eB:[13,29],hB:[10,27],fx:[['dust',3,37,2],['dust',9,37,2.4],['dust',15,38,2],['dust',1,35,1.4]]},
};
const joints=['head','neck','hip','eF','hF','eB','hB','kF','fF','kB','fB'] as const;
const mixPose=(a:Pose,b:Pose,t:number):Pose=>{
 const out={...b,fx:undefined} as Pose;
 for(const k of joints)out[k]=[a[k][0]+(b[k][0]-a[k][0])*t,a[k][1]+(b[k][1]-a[k][1])*t];
 if(a.racket&&b.racket)out.racket=[a.racket[0]+(b.racket[0]-a.racket[0])*t,a.racket[1]+(b.racket[1]-a.racket[1])*t];else out.racket=undefined;
 out.face=t<.5?a.face:b.face;return out;
};
const ease=(t:number)=>t*t*(3-2*t);

// Frame t of a pose name: strikes reach the key pose at t=.4 (the contact frame the scenes use); dives fly in, hold, recover.
function frame(pose:string,t:number):Pose{
 if(pose==='run'||pose==='dribble'){const p=mixPose(poses.runA,poses.runB,(1-Math.cos(t*Math.PI*2))/2),bob=Math.abs(Math.sin(t*Math.PI*2))*-1;for(const k of joints)p[k]=[p[k][0],p[k][1]+bob];return p;}
 if(pose==='idle'){const p=mixPose(poses.idle,poses.idle,0),bob=Math.sin(t*Math.PI*2)*.4;for(const k of ['head','neck','eF','hF','eB','hB'] as const)p[k]=[p[k][0],p[k][1]+bob];return p;}
 if(pose==='ready'||pose==='brake')return {...poses[pose]};
 if(pose==='jump')return mixPose(poses.ready,poses.jump,Math.sin(Math.min(1,t)*Math.PI*.5+.2));
 if(pose==='land')return {...mixPose(poses.land,poses.ready,t),fx:t<.4?poses.land.fx:undefined};
 const key=poses[pose]??poses.ready;
 if(pose==='dive'||pose==='save'||pose==='slide'||pose==='tennisDive'){
  const flight=t<.2?ease(t/.2):t<.7?1:1-ease((t-.7)/.3)*.6;
  return {...mixPose(poses.ready,key,flight),fx:t>=.15&&t<.75?key.fx:undefined};
 }
 const amount=t<.4?ease(t/.4):1-ease((t-.4)/.6)*.6;
 return {...mixPose(poses.ready,key,amount),fx:Math.abs(t-.4)<.16?key.fx:undefined};
}

const shade=(hex:number,f:number)=>{
 const t=f>0?255:0,a=Math.abs(f),c=(v:number)=>Math.round(v+(t-v)*a);
 return (c(hex>>16)<<16)|(c((hex>>8)&255)<<8)|c(hex&255);
};
type Look={skin:number;shirt:number;shorts:number;hair:number;glasses?:boolean;band?:number};
// Team colours per sport, as in the design: your side in the sport colour, the rival in red (blue when the sport colour is red).
// Every athlete also gets their own skin, hair and accessory (sunglasses or headband), like the players in Kings of the Beach.
const sportShirt:Record<string,number>={volleyball:0x2c6fd6,footvolley:0xff8a1e,tennis:0x14b8a6,soccer:0xe2331e};
const skins=[0xe0a070,0x8a5232,0xb87348,0xf2c29a,0x6d4924,0xc98a5a],hairs=[0x1a1028,0xc9852e,0x6d2400,0x1a1028,0xffdb49,0x3a2010];
export type AthleteRole={team:number;keeper?:boolean;referee?:boolean};
function look(sport:string,role:AthleteRole,index:number):Look{
 const shirt=sportShirt[sport]??0xff8a1e,skin=skins[index%skins.length],hair=hairs[(index*5+1)%hairs.length],glasses=index%2===0,band=index%2?0xffffff:undefined;
 if(role.referee)return {skin:0xe0a070,shirt:0x1a1028,shorts:0xffffff,hair:0x6d6d6d,glasses:true};
 if(role.keeper)return {skin,shirt:role.team?0xffdb00:0x2fb65a,shorts:0x1a1028,hair,glasses};
 return role.team?{skin,shirt:shirt===0xe2331e?0x2c6fd6:0xe2331e,shorts:0x1a1028,hair,glasses,band}:{skin,shirt,shorts:sport==='volleyball'?0x1b2a55:0xffffff,hair,glasses,band};
}

const W=34,H=44,OY=5,PX=3,INK=0x1a1028;
// The design's renderer: thick limbs on a pixel grid, three tones per colour, a 1-pixel ink outline, effects behind.
function paint(p:Pose,l:Look,racket:boolean){
 const g:(string|null)[]=Array.from({length:W*H},()=>null),f:(string|null)[]=Array.from({length:W*H},()=>null);
 const put=(x:number,y:number,k:string,L:(string|null)[])=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H)L[y*W+x]=k;};
 const disc=(cx:number,cy:number,r:number,k:string,L=g)=>{cy+=OY;for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)if((x-cx)**2+(y-cy)**2<=r*r+.25)put(x,y,k,L);};
 const seg=(a:Point,b:Point,r:number,k:string,L=g)=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2));for(let i=0;i<=n;i++){const t=i/n;disc(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,r,k,L);}};
 const mid=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 for(const e of p.fx??[]){
  if(e[0]==='dust')disc(e[1],e[2],e[3],'D',f);
  if(e[0]==='line')seg([e[1],e[2]],[e[3],e[4]],.35,'W',f);
  if(e[0]==='star'){seg([e[1]-3,e[2]],[e[1]+3,e[2]],.5,'Y',f);seg([e[1],e[2]-3],[e[1],e[2]+3],.5,'Y',f);}
 }
 // 16-bit proportions: thick limbs, broad torso, big head and feet, so the figure reads at a glance.
 seg(p.neck,p.eB,1.5,'s');seg(p.eB,p.hB,1.3,'s');disc(p.hB[0],p.hB[1],1.5,'s');
 seg(p.hip,p.kB,2,'s');seg(p.kB,p.fB,1.6,'s');disc(p.fB[0]+1,p.fB[1],1.7,'s');
 seg(p.hip,mid(p.hip,p.kB,.5),2.4,'p');
 seg(p.neck,p.hip,3,'T');seg([p.neck[0]-2.6,p.neck[1]+1],[p.neck[0]+2.6,p.neck[1]+1],1.7,'T');disc(p.hip[0],p.hip[1],2.8,'P');
 seg(p.hip,p.kF,2,'S');seg(p.kF,p.fF,1.6,'S');disc(p.fF[0]+1,p.fF[1],1.7,'S');
 seg(p.hip,mid(p.hip,p.kF,.5),2.5,'P');
 seg(p.neck,p.eF,1.5,'S');seg(p.eF,p.hF,1.3,'S');disc(p.hF[0],p.hF[1],1.5,'S');
 seg(p.neck,mid(p.neck,p.eF,.4),2.1,'T');
 if(racket){const tip=p.racket??[p.hF[0]+3,p.hF[1]-6];seg(p.hF,mid(p.hF,tip,.5),.6,'K');disc(tip[0],tip[1],2.4,'R');}
 const dir=p.face??1;
 disc(p.head[0],p.head[1],4,'H');disc(p.head[0]+dir*1.1,p.head[1]+1,3.2,'S');put(p.head[0]+dir*2.5,p.head[1]+OY+.5,'E',g);put(p.head[0]+dir*2.5,p.head[1]+OY-.5,'E',g);
 if(l.glasses)for(let k=0;k<4;k++)put(p.head[0]+dir*(k),p.head[1]+OY,'E',g);
 if(l.band)seg([p.head[0]-3,p.head[1]-2],[p.head[0]+3,p.head[1]-2],.6,'B');
 const pal:Record<string,number>={S:l.skin,s:shade(l.skin,-.18),T:l.shirt,P:l.shorts,p:shade(l.shorts,-.25),H:l.hair,E:INK,R:0xff6d00,K:0x6d4924,B:l.band??0xffffff,D:0xf2dca8,W:0xffffff,Y:0xffdb00};
 const has=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&g[y*W+x]!==null;
 const cells:[number,number,number][]=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const k=g[y*W+x];
  if(k===null){
   if(has(x-1,y)||has(x+1,y)||has(x,y-1)||has(x,y+1))cells.push([x,y,INK]);
   else if(f[y*W+x])cells.push([x,y,pal[f[y*W+x]!]]);
   continue;
  }
  let c=pal[k];
  if(k!=='E'){
   if(y+1>=H||g[(y+1)*W+x]!==k)c=shade(c,-.3);
   else if(y===0||g[(y-1)*W+x]!==k)c=shade(c,.25);
   else if(x+1>=W||g[y*W+x+1]!==k)c=shade(c,-.12);
  }
  cells.push([x,y,c]);
 }
 return cells;
}

const poseNames=(sport:string)=>['idle','ready','run','brake','jump','land',...(sport==='volleyball'?['bump','set','spike','block','dive']:sport==='tennis'?['forehand','lob','smash','dive']:sport==='soccer'?['kick','save','dribble','slide']:['kick','chest','header','bicycle','shark'])];
// One sheet per athlete: rows are poses, columns the 12 frames; the grid's ground row lands on the shared feet anchor.
export function athleteSheet(sport:string,role:AthleteRole,index:number,px=PX){
 const names=poseNames(sport),canvas=document.createElement('canvas');canvas.width=ATHLETE_SIZE*ATHLETE_FRAMES;canvas.height=ATHLETE_SIZE*names.length;
 const ctx=canvas.getContext('2d');if(!ctx)return {canvas,names};
 const ox=ATHLETE_SIZE/2-16*px,oy=ATHLETE_FEET-(37+OY+1)*px;
 for(const [row,name] of names.entries())for(let i=0;i<ATHLETE_FRAMES;i++){
  const t=name==='run'||name==='dribble'||name==='idle'?i/ATHLETE_FRAMES:i/(ATHLETE_FRAMES-1);
  for(const [x,y,c] of paint(frame(sport==='tennis'&&name==='dive'?'tennisDive':name,t),look(sport,role,index),sport==='tennis'&&!role.referee)){ctx.fillStyle=`#${c.toString(16).padStart(6,'0')}`;ctx.fillRect(i*ATHLETE_SIZE+ox+x*px,row*ATHLETE_SIZE+oy+y*px,px,px);}
 }
 return {canvas,names};
}
// Phaser textures, one per athlete; frames are named `${pose}-${frame}`.
export function bakeAthletes(scene:Phaser.Scene,sport:string,roles:AthleteRole[],px=PX){
 return roles.map((role,index)=>{
  const key=`athletes-${sport}-${index}-${px}`;if(scene.textures.exists(key))return key;
  const {canvas,names}=athleteSheet(sport,role,index,px);
  scene.textures.addCanvas(key,canvas);const texture=scene.textures.get(key);texture.setFilter(1);// 1 = Phaser.Textures.FilterMode.NEAREST
  for(const [row,name] of names.entries())for(let i=0;i<ATHLETE_FRAMES;i++)texture.add(`${name}-${i}`,0,i*ATHLETE_SIZE,row*ATHLETE_SIZE,ATHLETE_SIZE,ATHLETE_SIZE);
  return key;
 });
}
// A crowd behind the court, as in Kings of the Beach: small spectators, two frames (sitting / arms up to cheer).
const cheer:Pose={head:[15,10],neck:[15,15],hip:[15,25],eF:[19,10],hF:[20,4],eB:[11,10],hB:[10,4],kF:[19,30],fF:[20,37],kB:[11,30],fB:[10,37]};
export function bakeCrowd(scene:Phaser.Scene,variants=8){
 const key='crowd';if(scene.textures.exists(key))return key;
 const shirts=[0xff6d00,0x2c6fd6,0xffdb00,0xe2331e,0x14b8a6,0xffffff,0xff6db6,0x2fb65a],canvas=document.createElement('canvas'),cell=48;
 canvas.width=cell*2;canvas.height=cell*variants;const ctx=canvas.getContext('2d');if(!ctx)return key;
 for(let v=0;v<variants;v++)for(const [f,pose] of [poses.idle,cheer].entries()){
  const l={skin:skins[v%skins.length],shirt:shirts[v],shorts:0x1b2a55,hair:hairs[(v*3)%hairs.length],glasses:v%3===0};
  for(const [x,y,c] of paint(pose,l,false)){ctx.fillStyle=`#${c.toString(16).padStart(6,'0')}`;ctx.fillRect(f*cell+x+7,v*cell+y,1,1);}
 }
 scene.textures.addCanvas(key,canvas);const texture=scene.textures.get(key);texture.setFilter(1);
 for(let v=0;v<variants;v++)for(const f of [0,1])texture.add(`c${v}-${f}`,0,f*cell,v*cell,cell,cell);
 return key;
}
// Two rows of fans on the sand behind the far line; they cheer after a point and fidget otherwise.
export function addCrowd(scene:Phaser.Scene,place:(x:number,z:number)=>{x:number;y:number}){
 const key=bakeCrowd(scene),fans:{image:Phaser.GameObjects.Image;variant:number}[]=[];
 for(let row=0;row<2;row++)for(let k=0;k<18;k++){
  const at=place(60+k*50+(row?25:0)+(k*37)%11,row?-14:4),variant=(k*3+row*5)%8;
  fans.push({image:scene.add.image(Math.round(at.x),Math.round(at.y),key,`c${variant}-0`).setOrigin(.5,1).setDepth(row?.5:.6),variant});
 }
 return (cheering:boolean,clock:number)=>fans.forEach((fan,i)=>fan.image.setFrame(`c${fan.variant}-${cheering?Math.floor(clock*6+i)%2:Math.sin(clock*.7+i*1.7)>.97?1:0}`));
}
// The umpire on a high chair beside the net (net sports only).
export function addReferee(scene:Phaser.Scene,sport:string,place:(x:number,z:number,y?:number)=>{x:number;y:number}){
 const foot=place(500,-12),seat=place(500,-12,385),chair=scene.add.graphics().setDepth(.7);
 chair.lineStyle(4,0x6d4924);chair.lineBetween(foot.x-10,foot.y,seat.x-6,seat.y);chair.lineBetween(foot.x+10,foot.y,seat.x+6,seat.y);
 chair.lineStyle(3,0x6d4924);chair.lineBetween(seat.x-10,seat.y,seat.x+10,seat.y);chair.lineBetween(foot.x-8,foot.y-22,foot.x+8,foot.y-22);
 const [key]=bakeAthletes(scene,sport,[{team:0,referee:true}],2);
 return scene.add.sprite(Math.round(seat.x),Math.round(seat.y)+6,key,'idle-0').setOrigin(.5,ATHLETE_FEET/ATHLETE_SIZE).setDepth(.8);
}
