import * as Phaser from 'phaser';
import {project} from './court-projection';
import {FLOOR} from './game';
import {stepAltinha,altinhaGuide,passTarget,tricks,trickWindow,type Altinha,type AltinhaInput} from './altinha';
import {matchAudio,type SoundKind} from './match-audio';
import {bakeAthletes,addCrowd,athletePx,ATHLETE_SIZE,ATHLETE_FEET,ATHLETE_FRAMES} from './athlete-render';

export const FRIENDS=['VOCÊ','BIEL','NANDA','TICO','LU'];
// Each trick borrows the futevôlei pose that reads like it: feet, chest, head, or the bicicleta for the tesoura.
const poseOf=(name:string)=>/CABEÇA/.test(name)?'header':/PEITO|OMBRO/.test(name)?'chest':/TESOURA/.test(name)?'bicycle':'kick';
// Timing bar over you after a touch: the green band is where the trick you just tried works, the yellow
// centre is perfect, and the marker is where you were (CEDO left, TARDE right). Same scale as g.timing.
function altinhaMeter(scene:Phaser.Scene){
 const band=scene.add.rectangle(0,0,10,8,0x41c6a4),marker=scene.add.rectangle(0,0,4,16,0xffffff).setStrokeStyle(2,0x1a1028);
 const meter=scene.add.container(0,0,[scene.add.rectangle(0,0,96,12,0x1a1028),scene.add.rectangle(0,0,90,8,0xed6856),band,scene.add.rectangle(0,0,9,8,0xffdb00),marker]).setDepth(900).setVisible(false);
 return (x:number,y:number,timing:number|null,window:number)=>{meter.setVisible(timing!==null);if(timing!==null){meter.setPosition(x,y);band.setSize(window*90,8).setOrigin(.5);marker.setX(-timing*45);}};
}
const soundOf=(pose:string):SoundKind=>pose==='header'?'head':pose==='chest'?'chest':pose==='bicycle'?'special':'foot';

export function mountAltinha(parent:HTMLElement,getGame:()=>Altinha,input:()=>AltinhaInput,level:()=>string,changed:()=>void,ready:()=>void,failed:(message:string)=>void){
 const sound=matchAudio(parent.closest<HTMLElement>('.game-shell')||parent);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const arcadeFont=(getComputedStyle(document.body).getPropertyValue('--font-arcade')||'monospace').trim();
 const textFont=(getComputedStyle(document.body).getPropertyValue('--font-arcade-text')||'monospace').trim();
 class Roda extends Phaser.Scene{
  bodies:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];strikes:{pose:string;time:number}[]=[];
  ball!:Phaser.GameObjects.Container;ballShadow!:Phaser.GameObjects.Ellipse;ring!:Phaser.GameObjects.Ellipse;landing!:Phaser.GameObjects.Ellipse;
  passLine!:Phaser.GameObjects.Graphics;passRing!:Phaser.GameObjects.Ellipse;popup!:Phaser.GameObjects.Text;meter!:ReturnType<typeof altinhaMeter>;crowd!:ReturnType<typeof addCrowd>;
  dim!:Phaser.GameObjects.Rectangle;banner!:Phaser.GameObjects.Container;bannerText!:Phaser.GameObjects.Text;gold!:Phaser.GameObjects.Rectangle;
  accumulator=0;freeze=0;lastContact=0;lastFeedback='';cheer=0;lastView='';previous!:{ball:Altinha['ball'];players:Altinha['players']};
  preload(){this.load.image('beach','/art/beach.png');this.load.on('loaderror',()=>failed('Não foi possível carregar a praia. Recarregue a página.'));}
  create(){
   const g=getGame();
   this.add.image(0,0,'beach').setOrigin(0).setDisplaySize(1000,620);
   // A worn circle in the sand where the roda stands.
   const sand=this.add.graphics(),circle=(r:number)=>Array.from({length:48},(_,i)=>project(500+Math.cos(i*Math.PI/24)*r,225+Math.sin(i*Math.PI/24)*r));
   sand.fillStyle(0xeac38c,.45).fillPoints(circle(205),true).lineStyle(2,0xfff2d5,.5).strokePoints(circle(205),true,true);
   this.crowd=addCrowd(this,project);
   const keys=bakeAthletes(this,'footvolley',g.players.map(()=>({team:0})),athletePx());
   g.players.forEach((_,i)=>{this.shadows.push(this.add.ellipse(0,0,36,12,0x593e24,.23).setDepth(1));this.bodies.push(this.add.sprite(0,0,keys[i],'idle-0').setOrigin(.5,ATHLETE_FEET/ATHLETE_SIZE));this.strikes.push({pose:'',time:0});});
   g.players.forEach((p,i)=>{const at=project(p.x,p.z);this.add.text(at.x,at.y+22,FRIENDS[i],{fontFamily:textFont,fontSize:'16px',color:'#fff4d6',backgroundColor:i?'#1a1028':'#2449b6',padding:{x:5,y:1}}).setOrigin(.5).setDepth(5).setAlpha(.85);});
   this.ring=this.add.ellipse(0,0,47,18).setStrokeStyle(2,0x4ce3cf).setDepth(2);
   this.landing=this.add.ellipse(0,0,58,22,0x56d9d2,.13).setStrokeStyle(2,0x7fe5da).setDepth(2);
   // Live pass aim: while the ball is yours, a line points at the friend your direction would pass to.
   this.passLine=this.add.graphics().setDepth(3);this.passRing=this.add.ellipse(0,0,58,22).setStrokeStyle(3,0xffdb00).setDepth(3);
   this.ballShadow=this.add.ellipse(0,0,17,7,0x513c24,.3).setDepth(2);
   this.ball=this.add.container(0,0,[this.add.circle(0,0,10,0xfff5d9).setStrokeStyle(2,0x153d4b),this.add.arc(0,0,7,-65,100,false,0x219ca4),this.add.arc(0,0,6,140,270,false,0xe7b743)]);
   this.popup=this.add.text(0,0,'',{fontFamily:arcadeFont,fontSize:'14px',color:'#ffdb00',stroke:'#1a1028',strokeThickness:5}).setOrigin(.5).setDepth(900).setVisible(false);
   this.meter=altinhaMeter(this);
   this.gold=this.add.rectangle(500,310,1000,620,0xffc400,.12).setDepth(940).setVisible(false);
   this.dim=this.add.rectangle(500,310,1000,620,0x000000,.45).setDepth(950).setVisible(false);
   this.bannerText=this.add.text(0,0,'',{fontFamily:arcadeFont,fontSize:'34px',color:'#ffdb00',stroke:'#db2400',strokeThickness:6}).setOrigin(.5);
   this.banner=this.add.container(500,290,[this.add.rectangle(0,0,1000,84,0x1a1028,.92).setStrokeStyle(4,0xffdb00),this.bannerText]).setDepth(960).setVisible(false);
   this.previous=this.snapshot();ready();
  }
  snapshot(){const g=getGame();return {ball:{...g.ball},players:g.players.map(p=>({...p}))};}
  cutIn(text:string){
   this.bannerText.setText(text);this.banner.setVisible(true).setX(reduced?500:1500);this.dim.setVisible(true);
   if(!reduced)this.tweens.add({targets:this.banner,x:500,duration:140,ease:'Cubic.easeOut'});
   this.time.delayedCall(560,()=>{this.banner.setVisible(false);this.dim.setVisible(false);});
  }
  update(_time:number,delta:number){
   if(!this.ball)return;const frozen=this.freeze>0;this.freeze=Math.max(0,this.freeze-delta/1000);if(!frozen)this.accumulator+=Math.min(delta/1000,.1);
   while(this.accumulator>=1/120){this.previous=this.snapshot();stepAltinha(getGame(),1/120,input(),level());this.accumulator-=1/120;}
   const g=getGame(),alpha=this.accumulator*120,live=g.status==='playing',lerp=(a:number,b:number)=>live?a+(b-a)*alpha:b;
   g.players.forEach((p,i)=>{
    const old=this.previous.players[i],x=lerp(old.x,p.x),z=lerp(old.z,p.z),pos=project(x,z,p.y),ground=project(x,z),speed=Math.hypot(p.vx,p.vz),strike=this.strikes[i];
    strike.time=Math.max(0,strike.time-delta/1000);
    let pose=speed>45?'run':g.receiver===i&&live?'ready':'idle',frame=pose==='run'?Math.floor(p.stride/Math.PI/2*ATHLETE_FRAMES)%ATHLETE_FRAMES:reduced?0:Math.floor(g.clock*2+i*3)%ATHLETE_FRAMES;
    if(strike.time>0){pose=strike.pose;frame=Math.max(0,Math.min(11,Math.round((.4+.6*(1-strike.time/.4))*11)));}
    const ballSide=(g.ball.x-p.x)*.77+(g.ball.z-p.z)*.2;
    this.bodies[i].setFrame(`${pose}-${frame}`).setPosition(pos.x,pos.y).setDepth(z+20).setFlipX(speed>45?p.vx*.77+p.vz*.2<0:ballSide<0);
    this.shadows[i].setPosition(ground.x,ground.y);
    if(!i)this.ring.setPosition(ground.x,ground.y).setStrokeStyle(g.gamebreaker>0?3:2,g.gamebreaker>0?0xffdb00:0x4ce3cf);
   });
   const b=g.ball,old=this.previous.ball,pos=project(lerp(old.x,b.x),lerp(old.z,b.z),lerp(old.y,b.y)),shadow=project(b.x,b.z);
   this.ball.setPosition(pos.x,pos.y).setDepth(b.z+30);if(live&&!reduced)this.ball.rotation+=delta*.003;
   this.ballShadow.setPosition(shadow.x,shadow.y).setAlpha(Math.max(.08,.3-(FLOOR-b.y)*.0005));
   const mine=live&&g.receiver===0&&!g.dropTimer,guide=altinhaGuide(g),landing=project(guide.x,guide.z);
   this.landing.setPosition(landing.x,landing.y).setVisible(mine).setStrokeStyle(guide.time<.2?3:2,guide.time<.2?0xffe385:0x7fe5da);
   this.passLine.clear();this.passRing.setVisible(mine);
   if(mine){
    const me=project(g.players[0].x,g.players[0].z),friend=g.players[passTarget(g,input())],to=project(friend.x,friend.z);
    // Bright when your next touch goes to that friend anyway (last touch of the turn); faint when only F would pass.
    const forced=g.touchesThisTurn+1>=g.maxTouches;
    this.passLine.lineStyle(3,0xffdb00,forced?.8:.25).lineBetween(me.x,me.y,to.x,to.y);this.passRing.setPosition(to.x,to.y).setAlpha(forced?1:.35);
   }
   this.gold.setVisible(g.gamebreaker>0);
   if(g.contactSerial!==this.lastContact){
    this.lastContact=g.contactSerial;const who=g.holder,name=g.feedback,pose=poseOf(name),perfect=/PERFEITO/.test(name),save=name==='SALVADA!';
    this.strikes[who]={pose,time:.4};sound.play(soundOf(pose),perfect);
    const at=project(g.players[who].x,g.players[who].z,g.players[who].y-150);
    this.popup.setText(name.replace(' · PERFEITO','')).setPosition(at.x,at.y).setVisible(true).setAlpha(1).setColor(who?'#ffffff':'#ffdb00');
    this.tweens.killTweensOf(this.popup);if(!reduced)this.tweens.add({targets:this.popup,y:at.y-30,alpha:0,delay:350,duration:450});else this.time.delayedCall(800,()=>this.popup.setVisible(false));
    if(!reduced){this.freeze=save?.12:perfect?.04:0;if(save||perfect)this.cameras.main.shake(save?120:60,save?.003:.0015);}
    if(save)this.cutIn('SALVADA!');
    if(tricks.some(t=>t.points>=70&&name.startsWith(t.name))&&who===0){this.cheer=1.4;sound.play('point');}
   }
   if(g.feedback!==this.lastFeedback){
    if(g.feedback==='ALTINHA DE OURO'){this.cutIn('ALTINHA DE OURO');sound.play('special');this.cheer=2;}
    if(g.feedback==='CAIU!')sound.play('point');
    this.lastFeedback=g.feedback;
   }
   this.cheer=Math.max(0,this.cheer-delta/1000);this.crowd(this.cheer>0,g.clock);sound.moves(g.players,0);
   const me=g.players[0],above=project(me.x,me.z,me.y-112);
   this.meter(above.x,above.y,g.timing!==null&&g.feedbackTime>.4&&g.holder===0?g.timing:null,trickWindow(g.lastTrick));
   const view=`${g.status}:${Math.ceil(g.timeLeft)}:${g.rodaScore}:${g.individual.join(',')}:${g.combo[0]}:${Math.floor(g.style)}:${g.gamebreaker>0}:${g.feedback}:${g.feedbackTime>0}:${g.receiver}:${Math.floor(g.charge*10)}`;
   if(view!==this.lastView){this.lastView=view;changed();}
  }
 }
 const engine=new Phaser.Game({type:Phaser.AUTO,parent,width:1000,height:620,backgroundColor:'#dfbd85',pixelArt:true,scene:Roda,fps:{target:60},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
 engine.events.once('destroy',()=>sound.destroy());return engine;
}
