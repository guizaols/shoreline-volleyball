import * as Phaser from 'phaser';
import {project} from './court-projection';
import {FLOOR} from './game';
import {stepFrescobol,frescobolGuide,shotPlan,type Frescobol,type FrescobolInput} from './frescobol';
import {matchAudio} from './match-audio';
import {PERFECT_ETA} from './arcade';
import {bakeAthletes,addCrowd,athletePx,ATHLETE_SIZE,ATHLETE_FEET,ATHLETE_FRAMES} from './athlete-render';

// Timing bar over you after a hit: green is where the shot you tried works (golpe wide, ataque narrow), yellow perfect.
function meter(scene:Phaser.Scene){
 const band=scene.add.rectangle(0,0,10,8,0x41c6a4),marker=scene.add.rectangle(0,0,4,16,0xffffff).setStrokeStyle(2,0x1a1028);
 const box=scene.add.container(0,0,[scene.add.rectangle(0,0,96,12,0x1a1028),scene.add.rectangle(0,0,90,8,0xed6856),band,scene.add.rectangle(0,0,9,8,0xffdb00),marker]).setDepth(900).setVisible(false);
 return (x:number,y:number,timing:number|null,window:number)=>{box.setVisible(timing!==null);if(timing!==null){box.setPosition(x,y);band.setSize(window*90,8).setOrigin(.5);marker.setX(-timing*45);}};
}
export function mountFrescobol(parent:HTMLElement,getGame:()=>Frescobol,input:()=>FrescobolInput,level:()=>string,changed:()=>void,ready:()=>void,failed:(message:string)=>void){
 const sound=matchAudio(parent.closest<HTMLElement>('.game-shell')||parent);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const arcadeFont=(getComputedStyle(document.body).getPropertyValue('--font-arcade')||'monospace').trim();
 class Beach extends Phaser.Scene{
  bodies:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];swing=[0,0];
  ball!:Phaser.GameObjects.Arc;ballShadow!:Phaser.GameObjects.Ellipse;landing!:Phaser.GameObjects.Ellipse;aim!:Phaser.GameObjects.Graphics;aimRing!:Phaser.GameObjects.Ellipse;
  popup!:Phaser.GameObjects.Text;meter!:ReturnType<typeof meter>;crowd!:ReturnType<typeof addCrowd>;gold!:Phaser.GameObjects.Rectangle;
  dim!:Phaser.GameObjects.Rectangle;banner!:Phaser.GameObjects.Container;bannerText!:Phaser.GameObjects.Text;
  accumulator=0;freeze=0;lastContact=0;lastFeedback='';cheer=0;lastView='';lastWindow=.65;previous!:{ball:Frescobol['ball'];players:Frescobol['players']};
  preload(){this.load.image('beach','/art/beach.png');this.load.on('loaderror',()=>failed('Não foi possível carregar a praia. Recarregue a página.'));}
  create(){
   const g=getGame();
   this.add.image(0,0,'beach').setOrigin(0).setDisplaySize(1000,620);
   const sand=this.add.graphics(),patch=Array.from({length:40},(_,i)=>project(500+Math.cos(i*Math.PI/20)*300,225+Math.sin(i*Math.PI/20)*170));
   sand.fillStyle(0xeac38c,.4).fillPoints(patch,true);
   this.crowd=addCrowd(this,project);
   const keys=bakeAthletes(this,'tennis',g.players.map(p=>({team:p.team})),athletePx());
   g.players.forEach((p,i)=>{this.shadows.push(this.add.ellipse(0,0,36,12,0x593e24,.23).setDepth(1));this.bodies.push(this.add.sprite(0,0,keys[i],'idle-0').setOrigin(.5,ATHLETE_FEET/ATHLETE_SIZE).setFlipX(i===1));});
   this.landing=this.add.ellipse(0,0,58,22,0x56d9d2,.13).setStrokeStyle(2,0x7fe5da).setDepth(2);
   // Live aim: where your shot will land next to your partner (lib/frescobol.ts shotPlan).
   this.aim=this.add.graphics().setDepth(3);this.aimRing=this.add.ellipse(0,0,58,22).setStrokeStyle(3,0xffdb00).setDepth(3);
   this.ballShadow=this.add.ellipse(0,0,14,6,0x513c24,.3).setDepth(2);
   this.ball=this.add.circle(0,0,7,0xe2331e).setStrokeStyle(2,0x1a1028);
   this.popup=this.add.text(0,0,'',{fontFamily:arcadeFont,fontSize:'14px',color:'#ffdb00',stroke:'#1a1028',strokeThickness:5}).setOrigin(.5).setDepth(900).setVisible(false);
   this.meter=meter(this);
   this.gold=this.add.rectangle(500,310,1000,620,0xffc400,.12).setDepth(940).setVisible(false);
   this.dim=this.add.rectangle(500,310,1000,620,0x000000,.45).setDepth(950).setVisible(false);
   this.bannerText=this.add.text(0,0,'',{fontFamily:arcadeFont,fontSize:'34px',color:'#ffdb00',stroke:'#db2400',strokeThickness:6}).setOrigin(.5);
   this.banner=this.add.container(500,290,[this.add.rectangle(0,0,1000,84,0x1a1028,.92).setStrokeStyle(4,0xffdb00),this.bannerText]).setDepth(960).setVisible(false);
   this.previous=this.snapshot();ready();
  }
  snapshot(){const g=getGame();return {ball:{...g.ball},players:g.players.map(p=>({...p}))};}
  update(_time:number,delta:number){
   if(!this.ball)return;const frozen=this.freeze>0;this.freeze=Math.max(0,this.freeze-delta/1000);if(!frozen)this.accumulator+=Math.min(delta/1000,.1);
   while(this.accumulator>=1/120){this.previous=this.snapshot();stepFrescobol(getGame(),1/120,input(),level());this.accumulator-=1/120;}
   const g=getGame(),alpha=this.accumulator*120,live=g.status==='playing',lerp=(a:number,b:number)=>live?a+(b-a)*alpha:b,dt=delta/1000;
   g.players.forEach((p,i)=>{
    const old=this.previous.players[i],x=lerp(old.x,p.x),z=lerp(old.z,p.z),pos=project(x,z),speed=Math.hypot(p.vx,p.vz);
    this.swing[i]=Math.max(0,this.swing[i]-dt);
    let pose=speed>45?'run':g.receiver===i&&live?'ready':'idle',frame=pose==='run'?Math.floor(p.stride/Math.PI/2*ATHLETE_FRAMES)%ATHLETE_FRAMES:reduced?0:Math.floor(g.clock*2+i*3)%ATHLETE_FRAMES;
    if(this.swing[i]>0){pose=g.incoming==='lob'?'lob':g.incoming==='ataque'?'smash':'forehand';frame=Math.round((.4+.6*(1-this.swing[i]/.35))*11);}
    else if(i===0&&g.holding){pose='forehand';frame=Math.round(Math.min(1,g.charge)*4);}
    this.bodies[i].setFrame(`${pose}-${Math.max(0,Math.min(11,frame))}`).setPosition(pos.x,pos.y).setDepth(z+20);
    this.shadows[i].setPosition(pos.x,pos.y);
   });
   const b=g.ball,old=this.previous.ball,pos=project(lerp(old.x,b.x),lerp(old.z,b.z),lerp(old.y,b.y)),shadow=project(b.x,b.z);
   this.ball.setPosition(pos.x,pos.y).setDepth(b.z+30).setFillStyle(g.pancada>0?0xffdb00:0xe2331e);
   this.ballShadow.setPosition(shadow.x,shadow.y).setAlpha(Math.max(.08,.3-(FLOOR-b.y)*.0005));
   const mine=live&&g.receiver===0&&!g.dropTimer,guide=frescobolGuide(g),land=project(guide.x,guide.z);
   this.landing.setVisible(mine).setPosition(land.x,land.y).setStrokeStyle(guide.time<=PERFECT_ETA?3:2,guide.time<=PERFECT_ETA?0xffe385:0x7fe5da);
   this.aim.clear();this.aimRing.setVisible(mine);
   // Once released, the ring stays on the shot you made; before that it follows your direction and charge.
   if(mine){const q=g.queued,plan=q?shotPlan(g,q.aim,q.kind,q.ataque):shotPlan(g,input(),g.holdKind,g.holding&&g.holdKind==='hit'&&g.charge>=.65),a=project(g.players[0].x,g.players[0].z),to=project(plan.to.x,plan.to.z);this.aim.lineStyle(2,plan.shot==='ataque'?0xff795d:0xffdb00,.5).lineBetween(a.x,a.y,to.x,to.y);this.aimRing.setPosition(to.x,to.y).setStrokeStyle(3,plan.shot==='ataque'?0xff795d:0xffdb00);}
   this.gold.setVisible(g.pancada>0);
   if(g.contactSerial<this.lastContact)this.lastContact=g.contactSerial;
   if(g.contactSerial!==this.lastContact){
    this.lastContact=g.contactSerial;const who=g.hitter,perfect=/PERFEITO/.test(g.feedback);this.swing[who]=.35;
    sound.play(g.incoming==='ataque'?'spike':'racket',perfect);this.lastWindow=g.incoming==='ataque'?.3:g.incoming==='lob'?.75:.65;
    const at=project(g.players[who].x,g.players[who].z,FLOOR-185);
    this.popup.setText(g.feedback.replace(' · PERFEITO','')).setPosition(at.x,at.y).setVisible(true).setAlpha(1).setColor(who?'#ffffff':'#ffdb00');
    this.tweens.killTweensOf(this.popup);if(!reduced)this.tweens.add({targets:this.popup,y:at.y-30,alpha:0,delay:300,duration:400});else this.time.delayedCall(700,()=>this.popup.setVisible(false));
    if(!reduced&&(perfect||g.incoming==='ataque')){this.freeze=.04;this.cameras.main.shake(60,.0015);}
    if(g.sequence>0&&g.sequence%10===0)this.cheer=1.4;
   }
   if(g.feedback!==this.lastFeedback){
    if(g.feedback==='PANCADA DE OURO'){
     this.bannerText.setText('PANCADA DE OURO');this.banner.setVisible(true).setX(reduced?500:1500);this.dim.setVisible(true);sound.play('special');this.cheer=2;
     if(!reduced)this.tweens.add({targets:this.banner,x:500,duration:140,ease:'Cubic.easeOut'});this.time.delayedCall(600,()=>{this.banner.setVisible(false);this.dim.setVisible(false);});
    }
    if(g.feedback==='CAIU!')sound.play('point');
    this.lastFeedback=g.feedback;
   }
   this.cheer=Math.max(0,this.cheer-dt);this.crowd(this.cheer>0,g.clock);
   const me=g.players[0],above=project(me.x,me.z,FLOOR-130);
   this.meter(above.x,above.y,g.timing!==null&&g.feedbackTime>.4&&g.hitter===0?g.timing:null,this.lastWindow);
   const view=`${g.status}:${Math.ceil(g.timeLeft)}:${g.score}:${g.sequence}:${Math.floor(g.rhythm)}:${g.pancada>0}:${g.feedback}:${g.feedbackTime>0}:${g.receiver}:${Math.floor(g.charge*10)}`;
   if(view!==this.lastView){this.lastView=view;changed();}
  }
 }
 const engine=new Phaser.Game({type:Phaser.AUTO,parent,width:1000,height:620,backgroundColor:'#dfbd85',pixelArt:true,scene:Beach,fps:{target:60},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
 engine.events.once('destroy',()=>sound.destroy());return engine;
}
