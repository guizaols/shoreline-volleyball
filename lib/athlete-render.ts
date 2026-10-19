import type * as Phaser from 'phaser';

export const ATHLETE_SIZE=144,ATHLETE_FEET=132,ATHLETE_FRAMES=12;
type Point=[number,number];
type Rig={hip:Point;shoulder:Point;head:Point;legs:Point[][];arms:Point[][]};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const blend=(a:Point,b:Point,t:number):Point=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];

function rig(pose:string,t:number,sport:string):Rig{
 const cycle=t*Math.PI*2,wave=Math.sin(cycle),run=pose==='run'||pose==='dribble';
 const crouch=pose==='ready'?5:pose==='brake'?9:pose==='land'?Math.sin(t*Math.PI)*11:0;
 const bob=run?-Math.abs(Math.cos(cycle))*2:pose==='idle'?Math.sin(cycle)*.6:0;
 const lean=run?7:pose==='brake'?-5:0;
 const r:Rig={hip:[lean*.35,-39+crouch+bob],shoulder:[4+lean,-69+crouch+bob],head:[8+lean,-85+crouch+bob],legs:[[[-7,-21],[-13,0]],[[10,-20],[14,0]]],arms:[[[-12,-55],[-11,-42]],[[19,-53],[21,-42]]]};
 if(crouch){r.legs=[[[-17,-18],[-21,0]],[[19,-17],[23,0]]];r.arms=[[[-12,-48],[-5,-43]],[[24,-48],[15,-42]]];}
 if(sport==='tennis'){r.arms=[[[-8,-54],[4,-49]],[[22,-54],[25,-58]]];}
 if(run){
  r.legs=[-1,1].map(side=>{const step=wave*side,lift=Math.max(0,Math.cos(cycle)*side);return [[step*13+4,-23-lift*5],[step*24,-lift*15]];});
  r.arms=[-1,1].map(side=>{const swing=wave*side;return [[r.shoulder[0]-swing*15,-55+bob],[r.shoulder[0]-swing*20+8,-64+bob]];});
  if(sport==='tennis')r.arms[1][1][1]+=10;
 }
 if(pose==='jump'){
  const tuck=Math.sin(t*Math.PI),reach=Math.sin(Math.min(1,t/.8)*Math.PI);
  r.legs=[[[-8-tuck*4,-22-tuck*8],[-13-tuck*7,-tuck*14]],[[12+tuck*5,-22-tuck*7],[17-tuck*8,-tuck*10]]];
  r.arms=[[[-12,-60-reach*16],[-13,-59-reach*32]],[[24,-60-reach*16],[25,-60-reach*35]]];
 }
 const strike=['bump','set','spike','block','forehand','lob','smash','kick','chest','header','bicycle','save','dive','slide'].includes(pose);
 if(!strike)return r;
 const contact=t<.4?t/.4:1-(t-.4)/.6,extension=Math.max(0,contact);
 const back=Math.max(0,1-t/.4),follow=t>.4?Math.sin((t-.4)/.6*Math.PI):0;
 r.hip=[mix(0,3,extension),-35-extension*4];r.shoulder=[4+extension*5,-64-extension*5];r.head=[8+extension*6,-81-extension*5];
 r.legs=[[[-13,-17],[-21,0]],[[17,-18],[23,0]]];
 if(pose==='bump'){
  r.hip[1]+=extension*4;r.shoulder[0]+=extension*6;r.shoulder[1]+=extension*10;r.head[0]+=extension*5;r.head[1]+=extension*11;
  r.arms=[[[5,-47],[15+extension*5,-40-extension*5]],[[16,-47],[19+extension*5,-40-extension*5]]];
 }
 if(pose==='set'||pose==='block'){
  const up=pose==='block'?1:extension;
  if(pose==='set'){r.hip[1]+=extension*6;r.shoulder[1]+=extension*8;r.head[1]+=extension*11;}
  r.arms=[[[r.shoulder[0]-14,-61-up*17],[r.head[0]-7,-72-up*(pose==='block'?28:8)]],[[r.shoulder[0]+18,-61-up*17],[r.head[0]+9,-72-up*(pose==='block'?28:8)]]];
  r.head[0]-=3;r.head[1]+=2;
 }
 if(pose==='spike'||pose==='smash'){
  r.shoulder[0]-=back*4;r.head[0]-=back*2;
  r.arms=[[[-9,-65],[4,-82+follow*27]],[[20-back*9,-82+follow*16],[mix(-6,10,extension)+follow*21,-89-extension*6+follow*50]]];
  if(pose==='smash')r.arms[1][1][1]+=12;
  r.legs=[[[-7,-24],[-16,-8]],[[16,-22],[20,-2]]];
 }
 if(pose==='forehand'||pose==='lob'){
  const up=pose==='lob'?14:0;
  r.shoulder[0]-=back*6;r.head[0]-=back*3;
  r.arms=[[[-12,-57],[-8,-43]],[[mix(-10,24,extension),-55-up*extension],[mix(-18,31,extension)-follow*22,-56-extension*16-up*extension-follow*14]]];
 }
 if(pose==='kick'){
  r.shoulder[0]-=extension*6;r.head[0]-=extension*5;
  r.legs=[[[-10,-18],[-16,0]],[[mix(-5,11,extension),-22-extension*5],[mix(-21,20,extension),-7-extension*(sport==='soccer'?4:16)]]];
  r.arms=[[[-16,-59],[-22,-48]],[[23,-56],[29-extension*11,-45]]];
 }
 if(pose==='chest'||pose==='header'){
  const arch=pose==='chest'?-9:3;r.shoulder[0]+=arch*extension;r.head[0]-=4*extension;
  r.head[1]-=pose==='header'?extension*3:0;
  r.arms=[[[-18,-57],[-26,-47]],[[26,-57],[34,-46]]];
  r.legs[1]=[[16,-20],[25,-2]];
 }
 if(pose==='bicycle'){
  const turn=Math.sin(Math.min(1,t/.8)*Math.PI),hip:Point=[-5,-53],shoulder:Point=[-21,-37];
  r.hip=blend(r.hip,hip,turn);r.shoulder=blend(r.shoulder,shoulder,turn);r.head=blend(r.head,[-34,-34],turn);
  r.legs=[r.legs[0].map((p,i)=>blend(p,i?[22,-54]:[18,-69],turn)),r.legs[1].map((p,i)=>blend(p,i?[7,-111]:[-2,-86],turn))];
  r.arms=[[[r.shoulder[0]-15,-30],[-41,-17]],[[r.shoulder[0]+10,-23],[-6,-11]]];
 }
 if(pose==='dive'||pose==='save'){
  const flight=t<.18?t/.18:t<.7?1:(1-t)/.3;
  r.hip=blend(r.hip,[-16,-17],flight);r.shoulder=blend(r.shoulder,[13,-25],flight);r.head=blend(r.head,[30,-25],flight);
  r.legs=[r.legs[0].map((p,i)=>blend(p,i?[-56,-5]:[-36,-13],flight)),r.legs[1].map((p,i)=>blend(p,i?[-44,-3]:[-30,-5],flight))];
  r.arms=[r.arms[0].map((p,i)=>blend(p,i?[50,-20]:[35,-25],flight)),r.arms[1].map((p,i)=>blend(p,i?[55,-17]:[36,-18],flight))];
 }
 if(pose==='slide'){
  const slide=t<.2?t/.2:t<.65?1:(1-t)/.35;
  r.hip=blend(r.hip,[-8,-13],slide);r.shoulder=blend(r.shoulder,[-25,-31],slide);r.head=blend(r.head,[-28,-49],slide);
  r.legs=[r.legs[0].map((p,i)=>blend(p,i?[6,-2]:[14,-15],slide)),r.legs[1].map((p,i)=>blend(p,i?[47,-2]:[24,-9],slide))];
  r.arms=[r.arms[0].map((p,i)=>blend(p,i?[-40,-3]:[-39,-17],slide)),r.arms[1].map((p,i)=>blend(p,i?[-14,-2]:[-7,-23],slide))];
 }
 return r;
}

function drawAthlete(art:Phaser.GameObjects.Graphics,team:number,sport:string,pose:string,t:number,ox:number,oy:number){
 const r=rig(pose,t,sport),ink=0x173641,skin=team?0xbc7d51:0xe6ab78,shade=team?0x895337:0xb7744c,light=team?0xe5a475:0xffd3a2;
 const jersey=team?0xf27952:0x28bfa9,jerseyShade=team?0xbd473b:0x087d78,jerseyLight=team?0xffb27a:0x80e4c9;
 const points=(p:Point[])=>p.map(([x,y])=>({x:x+ox,y:y+oy}));
 const poly=(p:Point[],color:number,outline=0)=>{art.fillStyle(color);art.fillPoints(points(p),true);if(outline){art.lineStyle(outline,ink);art.strokePoints(points(p),true,true);}};
 const line=(a:Point,b:Point,color:number,width=1)=>{art.lineStyle(width,color);art.lineBetween(a[0]+ox,a[1]+oy,b[0]+ox,b[1]+oy);};
 const ellipse=(p:Point,w:number,h:number,color:number)=>{art.fillStyle(color);art.fillEllipse(p[0]+ox,p[1]+oy,w,h,16);};
 const segment=(a:Point,b:Point,wa:number,wb:number,color:number,lit:boolean)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
  poly([[a[0]+nx*wa/2,a[1]+ny*wa/2],[b[0]+nx*wb/2,b[1]+ny*wb/2],[b[0]-nx*wb/2,b[1]-ny*wb/2],[a[0]-nx*wa/2,a[1]-ny*wa/2]],color,1.4);
  ellipse(a,wa,wa,color);ellipse(b,wb,wb,color);
  if(lit)line([a[0]-nx*wa*.2,a[1]-ny*wa*.2],[b[0]-nx*wb*.2,b[1]-ny*wb*.2],light,2.2);
 };
 const leg=(side:number)=>{
  const [knee,ankle]=r.legs[side],hip:Point=[r.hip[0]+(side?6:-6),r.hip[1]+4],color=side?skin:shade;
  segment(hip,knee,side?13:11,9,color,!!side);segment(knee,[ankle[0],ankle[1]-3],8,5.5,color,!!side);
  poly([[ankle[0]-4,ankle[1]-5],[ankle[0]+3,ankle[1]-4],[ankle[0]+9,ankle[1]-1],[ankle[0]+9,ankle[1]+1],[ankle[0]-4,ankle[1]+1]],color,1.4);
  line([ankle[0]+2,ankle[1]-1],[ankle[0]+7,ankle[1]],side?light:skin,1);
 };
 const arm=(side:number)=>{
  const [elbow,hand]=r.arms[side],shoulder:Point=[r.shoulder[0]+(side?10:-9),r.shoulder[1]+3],color=side?skin:shade;
  segment(shoulder,elbow,side?9:8,6.5,color,!!side);segment(elbow,hand,6.5,4.5,color,!!side);
  const wrist=blend(elbow,hand,.85);line([wrist[0]-2,wrist[1]-1],[wrist[0]+2,wrist[1]+1],0xffefc9,3);
  ellipse(hand,6,7,pose==='save'?0xffe9b3:color);line([hand[0]+1,hand[1]],[hand[0]+3,hand[1]+1],shade,1);
 };
 leg(0);arm(0);leg(1);
 const [hx,hy]=r.hip,[sx,sy]=r.shoulder;
 poly([[hx-12,hy-4],[hx+11,hy-4],[hx+14,hy+12],[hx+3,hy+14],[hx-1,hy+5],[hx-3,hy+13],[hx-14,hy+10]],0x183d56,1.8);
 poly([[hx-11,hy-2],[hx-7,hy-2],[hx-9,hy+10],[hx-12,hy+9]],0x82d8cf);
 line([hx+4,hy+1],[hx+8,hy+11],0x356681,2);line([hx-6,hy+10],[hx-12,hy+8],0xffe7b7,1);
 segment([sx+2,sy-1],[r.head[0],r.head[1]+8],7,6,skin,true);
 poly([[sx-11,sy-3],[sx-5,sy-6],[sx+7,sy-5],[sx+13,sy+1],[hx+10,hy-3],[hx-10,hy-3]],jersey,1.8);
 poly([[sx-11,sy-3],[sx-6,sy-2],[hx-3,hy-3],[hx-10,hy-3]],jerseyShade);
 poly([[sx+4,sy-2],[sx+9,sy+1],[hx+7,hy-6],[hx+3,hy-6]],jerseyLight);
 line([sx-5,sy-5],[sx+1,sy],0xffe9bd,2);line([sx+1,sy],[sx+7,sy-5],0xffe9bd,2);
 line([sx-10,sy+1],[sx-7,sy+7],jerseyLight,2);line([sx+10,sy+3],[sx+8,sy+9],0xffe9bd,1.5);
 const numberX=(sx+hx)/2+1,numberY=(sy+hy)/2;
 line([numberX-1,numberY-4],[numberX+2,numberY-6],0xfff2ca,2.5);line([numberX+2,numberY-6],[numberX+2,numberY+2],0xfff2ca,2.5);
 line([hx-6,hy-7],[hx+4,hy-6],jerseyShade,1);
 arm(1);
 const [headX,headY]=r.head;
 ellipse([headX,headY],18,21,ink);ellipse([headX+.5,headY],16,19,skin);
 poly([[headX-7,headY-7],[headX-5,headY+7],[headX,headY+9],[headX+2,headY+5],[headX-2,headY-4]],shade);
 ellipse([headX+7,headY+1],5,5,skin);ellipse([headX-5,headY+1],4,5,skin);
 line([headX-5,headY],[headX-4,headY+2],shade,1);
 const hair=team?0x3a2625:0x302d2b;
 poly([[headX-9,headY-5],[headX-8,headY-10],[headX-4,headY-12],[headX+5,headY-11],[headX+9,headY-7],[headX+6,headY-4],[headX+1,headY-6],[headX-5,headY-4],[headX-5,headY+1],[headX-8,headY]],hair);
 line([headX-5,headY-9],[headX+3,headY-9],team?0x775045:0x63564b,1.8);
 line([headX+2,headY-3],[headX+6,headY-3],ink,1);ellipse([headX+5,headY-1],1.7,2,ink);
 line([headX+5,headY+6],[headX+8,headY+5],shade,1);line([headX+1,headY+3],[headX+3,headY+5],light,1.5);
 if(sport==='tennis'){
  const hand=r.arms[1][1],hit=['forehand','lob','smash'].includes(pose),angle=hit&&t<.3?-1:1;
  const racket:Point=[hand[0]+angle*12,hand[1]-15];
  line(hand,[racket[0],racket[1]+8],ink,5);line(hand,[racket[0],racket[1]+8],0xffd293,2.5);
  art.lineStyle(3,0x173e4a);art.strokeEllipse(racket[0]+ox,racket[1]+oy,17,23,20);
  art.lineStyle(1.5,0xffd18a);art.strokeEllipse(racket[0]+ox,racket[1]+oy,14,20,20);
  for(let k=-4;k<=4;k+=4){line([racket[0]+k,racket[1]-7],[racket[0]+k,racket[1]+7],0xabcfc4,.7);line([racket[0]-5,racket[1]+k],[racket[0]+5,racket[1]+k],0xabcfc4,.7);}
 }
}

// One atlas per match; animation only selects frames and moves the feet anchor.
export function bakeAthletes(scene:Phaser.Scene,sport:string){
 const key=`athletes-${sport}`,poses=['idle','ready','run','brake','jump','land',...(sport==='volleyball'?['bump','set','spike','block','dive']:sport==='tennis'?['forehand','lob','smash']:sport==='soccer'?['kick','save','dribble','slide']:['kick','chest','header','bicycle'])];
 if(scene.textures.exists(key))return key;
 const art=scene.add.graphics();
 for(const team of [0,1])for(const [row,pose] of poses.entries())for(let frame=0;frame<ATHLETE_FRAMES;frame++){
  const phase=pose==='run'||pose==='dribble'||pose==='idle'?frame/ATHLETE_FRAMES:frame/(ATHLETE_FRAMES-1);
  drawAthlete(art,team,sport,pose,phase,frame*ATHLETE_SIZE+ATHLETE_SIZE/2,(team*poses.length+row)*ATHLETE_SIZE+ATHLETE_FEET);
 }
 art.generateTexture(key,ATHLETE_SIZE*ATHLETE_FRAMES,ATHLETE_SIZE*poses.length*2);art.destroy();
 const texture=scene.textures.get(key);
 for(const team of [0,1])for(const [row,pose] of poses.entries())for(let frame=0;frame<ATHLETE_FRAMES;frame++)texture.add(`${team}-${pose}-${frame}`,0,frame*ATHLETE_SIZE,(team*poses.length+row)*ATHLETE_SIZE,ATHLETE_SIZE,ATHLETE_SIZE);
 return key;
}
