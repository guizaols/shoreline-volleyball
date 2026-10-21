import * as Phaser from 'phaser';
import {project} from './court-projection';
import {FLOOR} from './game';
import {stepUltimate,throwPlan,END_LEFT,END_RIGHT,X_MIN,X_MAX,Z_MIN,Z_MAX,type Ultimate,type UltimateInput} from './ultimate';
import {matchAudio} from './match-audio';
import {bakeAthletes,addCrowd,athletePx,ATHLETE_SIZE,ATHLETE_FEET,ATHLETE_FRAMES} from './athlete-render';

export function mountUltimate(parent:HTMLElement,getGame:()=>Ultimate,input:()=>UltimateInput,level:()=>string,changed:()=>void,ready:()=>void,failed:(message:string)=>void){
 const sound=matchAudio(parent.closest<HTMLElement>('.game-shell')||parent);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const arcadeFont=(getComputedStyle(document.body).getPropertyValue('--font-arcade')||'monospace').trim();
 class Field extends Phaser.Scene{
  bodies:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];throwPose:number[]=[];
  disc!:Phaser.GameObjects.Ellipse;discShadow!:Phaser.GameObjects.Ellipse;ring!:Phaser.GameObjects.Ellipse;aim!:Phaser.GameObjects.Graphics;aimRing!:Phaser.GameObjects.Ellipse;landing!:Phaser.GameObjects.Ellipse;
  stall!:Phaser.GameObjects.Text;crowd!:ReturnType<typeof addCrowd>;dim!:Phaser.GameObjects.Rectangle;banner!:Phaser.GameObjects.Container;bannerText!:Phaser.GameObjects.Text;
  lastFlight:Ultimate['flight']=null;accumulator=0;freeze=0;lastContact=0;lastFeedback='';lastScore='';cheer=0;lastView='';previous!:{disc:Ultimate['disc'];players:Ultimate['players']};
  preload(){this.load.image('beach','/art/beach.png');this.load.on('loaderror',()=>failed('Não foi possível carregar a praia. Recarregue a página.'));}
  create(){
   const g=getGame();
   this.add.image(0,0,'beach').setOrigin(0).setDisplaySize(1000,620);
   const field=this.add.graphics(),box=(x0:number,x1:number)=>[project(x0,Z_MIN),project(x1,Z_MIN),project(x1,Z_MAX),project(x0,Z_MAX)];
   field.fillStyle(0xeac38c,.5).fillPoints(box(X_MIN,X_MAX),true);
   // End zones: yours on the left (blue), theirs on the right (red); you score by catching on the right.
   field.fillStyle(0x2c6fd6,.16).fillPoints(box(X_MIN,END_LEFT),true).fillStyle(0xe2331e,.16).fillPoints(box(END_RIGHT,X_MAX),true);
   field.lineStyle(3,0xfff2d5).strokePoints(box(X_MIN,X_MAX),true,true).lineStyle(2,0xfff2d5,.8);
   for(const x of [END_LEFT,END_RIGHT]){const a=project(x,Z_MIN),b=project(x,Z_MAX);field.lineBetween(a.x,a.y,b.x,b.y);}
   this.crowd=addCrowd(this,project);
   const keys=bakeAthletes(this,'volleyball',g.players.map(p=>({team:p.team})),athletePx());
   g.players.forEach((p,i)=>{this.shadows.push(this.add.ellipse(0,0,36,12,0x593e24,.23).setDepth(1));this.bodies.push(this.add.sprite(0,0,keys[i],'idle-0').setOrigin(.5,ATHLETE_FEET/ATHLETE_SIZE).setFlipX(p.team===1));this.throwPose.push(0);});
   this.ring=this.add.ellipse(0,0,47,18).setStrokeStyle(2,0x4ce3cf).setDepth(2);
   this.landing=this.add.ellipse(0,0,58,22,0x56d9d2,.13).setStrokeStyle(2,0x7fe5da).setDepth(2);
   // Live aim while you hold the disc: a line to the teammate your direction picks.
   this.aim=this.add.graphics().setDepth(3);this.aimRing=this.add.ellipse(0,0,58,22).setStrokeStyle(3,0xffdb00).setDepth(3);
   this.discShadow=this.add.ellipse(0,0,20,7,0x513c24,.3).setDepth(2);
   this.disc=this.add.ellipse(0,0,24,9,0xffdb00).setStrokeStyle(2,0x1a1028);
   this.stall=this.add.text(0,0,'',{fontFamily:arcadeFont,fontSize:'12px',color:'#ffffff',stroke:'#1a1028',strokeThickness:4}).setOrigin(.5).setDepth(900);
   this.dim=this.add.rectangle(500,310,1000,620,0x000000,.45).setDepth(950).setVisible(false);
   this.bannerText=this.add.text(0,0,'',{fontFamily:arcadeFont,fontSize:'34px',color:'#ffdb00',stroke:'#db2400',strokeThickness:6}).setOrigin(.5);
   this.banner=this.add.container(500,290,[this.add.rectangle(0,0,1000,84,0x1a1028,.92).setStrokeStyle(4,0xffdb00),this.bannerText]).setDepth(960).setVisible(false);
   this.previous=this.snapshot();ready();
  }
  snapshot(){const g=getGame();return {disc:{...g.disc},players:g.players.map(p=>({...p}))};}
  cutIn(text:string){
   this.bannerText.setText(text);this.banner.setVisible(true).setX(reduced?500:1500);this.dim.setVisible(true);
   if(!reduced)this.tweens.add({targets:this.banner,x:500,duration:140,ease:'Cubic.easeOut'});
   this.time.delayedCall(600,()=>{this.banner.setVisible(false);this.dim.setVisible(false);});
  }
  update(_time:number,delta:number){
   if(!this.disc)return;const frozen=this.freeze>0;this.freeze=Math.max(0,this.freeze-delta/1000);if(!frozen)this.accumulator+=Math.min(delta/1000,.1);
   while(this.accumulator>=1/120){this.previous=this.snapshot();stepUltimate(getGame(),1/120,input(),level());this.accumulator-=1/120;}
   const g=getGame(),alpha=this.accumulator*120,live=g.status==='playing'&&!g.restartDelay,lerp=(a:number,b:number)=>live?a+(b-a)*alpha:b,dt=delta/1000;
   g.players.forEach((p,i)=>{
    const old=this.previous.players[i],x=lerp(old.x,p.x),z=lerp(old.z,p.z),pos=project(x,z,p.y),ground=project(x,z),speed=Math.hypot(p.vx,p.vz);
    this.throwPose[i]=Math.max(0,this.throwPose[i]-dt);
    let pose=p.dive||p.recover?'dive':speed>45?'run':i===g.holder?'ready':'idle',frame=pose==='run'?Math.floor(p.stride/Math.PI/2*ATHLETE_FRAMES)%ATHLETE_FRAMES:reduced?0:Math.floor(g.clock*2+i*3)%ATHLETE_FRAMES;
    if(pose==='dive')frame=p.dive?Math.round((1-p.dive/.45)*7):11;
    else if(this.throwPose[i]>0){pose='set';frame=Math.round((1-this.throwPose[i]/.35)*11);}
    else if(i===g.holder&&g.holding){pose='spike';frame=Math.round(Math.min(1,g.charge)*4);}
    const facing=p.dive?p.vx<0:speed>45?p.vx<0:p.team===1;
    this.bodies[i].setFrame(`${pose}-${Math.max(0,Math.min(11,frame))}`).setPosition(pos.x,pos.y).setDepth(z+20).setFlipX(facing);
    this.shadows[i].setPosition(ground.x,ground.y);
    if(i===g.active)this.ring.setPosition(ground.x,ground.y).setStrokeStyle(g.specialArmed?3:2,g.specialArmed?0xffdc69:0x4ce3cf);
   });
   const d=g.disc,old=this.previous.disc,pos=project(lerp(old.x,d.x),lerp(old.z,d.z),lerp(old.y,d.y)),shadow=project(d.x,d.z);
   this.disc.setPosition(pos.x,pos.y).setDepth(d.z+30).setFillStyle(g.flight?.fire?0xff6d00:0xffdb00);if(g.flight&&!reduced)this.disc.setScale(1,.8+Math.sin(g.clock*30)*.2);
   this.discShadow.setPosition(shadow.x,shadow.y).setAlpha(Math.max(.08,.3-(FLOOR-d.y)*.0006));
   const f=g.flight,land=f&&project(f.to.x,f.to.z);this.landing.setVisible(!!land);if(land)this.landing.setPosition(land.x,land.y);
   const mine=live&&g.holder>=0&&g.offense===0&&g.active===g.holder;this.aim.clear();this.aimRing.setVisible(mine);
   // The aim is the real throw (lib/ultimate.ts throwPlan): same landing spot, same bend.
   const plan=mine?throwPlan(g,input(),'pass',g.charge>=.65):null;this.aimRing.setVisible(!!plan);
   if(plan){
    const dx=plan.to.x-d.x,dz=plan.to.z-d.z,len=Math.hypot(dx,dz)||1,points=Array.from({length:13},(_,k)=>{const u=k/12,bend=plan.curve*4*u*(1-u);return project(d.x+dx*u-dz/len*bend,d.z+dz*u+dx/len*bend);});
    this.aim.lineStyle(3,plan.kind==='huck'?0xff795d:0xffdb00,.8).strokePoints(points,false);const end=project(plan.to.x,plan.to.z);this.aimRing.setPosition(end.x,end.y);
   }
   // The stall count over the holder, as the marker would shout it.
   const holder=g.players[g.holder],top=holder&&project(holder.x,holder.z,holder.y-120);
   this.stall.setVisible(live&&!!holder&&g.stall>=1).setPosition(top?.x??0,top?.y??0).setText(`STALL ${Math.floor(g.stall)}`).setColor(g.stall>=7?'#ff6d56':'#ffffff');
   if(g.contactSerial!==this.lastContact){this.lastContact=g.contactSerial;if(g.holder>=0){sound.play(/LAYOUT/.test(g.feedback)?'hand':'chest',/LAYOUT|CALLAHAN/.test(g.feedback));if(!reduced&&/LAYOUT|CALLAHAN|INTERCEPT|BLOQUEIO/.test(g.feedback)){this.freeze=.06;this.cameras.main.shake(80,.002);}}}
   if(f&&f!==this.lastFlight){this.throwPose[f.thrower]=.35;sound.play(f.fire?'special':'racket');}this.lastFlight=f;
   if(g.feedback!==this.lastFeedback){
    if(/^(CALLAHAN!|DISCO DE FOGO|EM CHAMAS!|LAYOUT!|LAYOUT D!)$/.test(g.feedback))this.cutIn(g.feedback);
    this.lastFeedback=g.feedback;
   }
   const score=g.score.join(',');if(score!==this.lastScore){if(this.lastScore){sound.play('point');this.cheer=1.6;if(!reduced)this.cameras.main.shake(140,.004);}this.lastScore=score;}
   this.cheer=Math.max(0,this.cheer-dt);this.crowd(this.cheer>0,g.clock);sound.moves(g.players,g.active);
   const view=`${g.status}:${g.restartDelay>0}:${g.score.join(',')}:${g.holder}:${g.active}:${Math.floor(g.stall)}:${g.feedback}:${g.feedbackTime>0}:${Math.floor(g.charge*10)}:${Math.floor(g.energy)}:${g.specialArmed}:${g.onFire}`;
   if(view!==this.lastView){this.lastView=view;changed();}
  }
 }
 const engine=new Phaser.Game({type:Phaser.AUTO,parent,width:1000,height:620,backgroundColor:'#dfbd85',pixelArt:true,scene:Field,fps:{target:60},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
 engine.events.once('destroy',()=>sound.destroy());return engine;
}
