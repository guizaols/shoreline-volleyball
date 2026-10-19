import * as Phaser from 'phaser';
import {project} from './court-projection';
import {FLOOR,type Player} from './game';
import {netGuide,stepNet,type NetMatch,type BeachInput} from './net';
import {stepSoccer,type Soccer} from './soccer';
import {aimDrift,powerRisk} from './arcade';
import {matchAudio} from './match-audio';
import {timingMeter} from './timing-meter';
import {bakeAthletes,addCrowd,addReferee,ATHLETE_SIZE,ATHLETE_FEET,ATHLETE_FRAMES} from './athlete-render';

export function mountBeach(parent:HTMLElement,getGame:()=>NetMatch|Soccer,input:()=>BeachInput,level:()=>string,changed:()=>void,ready:()=>void,failed:(message:string)=>void){
 const sound=matchAudio(parent.closest<HTMLElement>('.game-shell')||parent);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 class Beach extends Phaser.Scene{
  bodies:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];labels:Phaser.GameObjects.Text[]=[];
  ball!:Phaser.GameObjects.Container;ballShadow!:Phaser.GameObjects.Ellipse;ring!:Phaser.GameObjects.Ellipse;aim!:Phaser.GameObjects.Ellipse;landing!:Phaser.GameObjects.Ellipse;impact!:Phaser.GameObjects.Arc;
  trail:Phaser.GameObjects.Arc[]=[];trailPoints:{x:number;y:number}[]=[];freeze=0;
  accumulator=0;lastContact=0;lastScore='';lastView='';meter!:ReturnType<typeof timingMeter>;crowd!:ReturnType<typeof addCrowd>;cheer=0;previous!:{ball:NetMatch['ball'];players:Player[]};
  preload(){this.load.image('beach','/art/beach.png');this.load.on('loaderror',()=>failed('Não foi possível carregar a praia. Recarregue a página.'));}
  create(){
   this.add.image(0,0,'beach').setOrigin(0).setDisplaySize(1000,620);
   const ground=this.add.graphics(),corners=[project(35,25),project(965,25),project(965,425),project(35,425)];
   ground.fillStyle(0xeac38c,.5);ground.fillPoints(corners,true);ground.lineStyle(3,0xfff2d5);ground.strokePoints(corners,true,true);
   if(getGame().sport!=='soccer'){
   const netHeight=getGame().sport==='tennis'?316:274;
   const net=this.add.graphics().setDepth(260),a=project(500,25),b=project(500,425),c=project(500,425,netHeight),d=project(500,25,netHeight);
   net.fillStyle(0x1c3c49,.17);net.fillPoints([a,b,c,d],true);net.lineStyle(1,0x234754,.65);
   for(let z=25;z<=425;z+=22){const bottom=project(500,z),top=project(500,z,netHeight);net.lineBetween(bottom.x,bottom.y,top.x,top.y);}
   for(let y=netHeight+8;y<450;y+=18){const left=project(500,25,y),right=project(500,425,y);net.lineBetween(left.x,left.y,right.x,right.y);}
   net.lineStyle(5,0xfff3d5);net.lineBetween(c.x,c.y,d.x,d.y);
   for(const z of [25,425]){const bottom=project(500,z),top=project(500,z,netHeight-12),post=this.add.graphics().setDepth(z===25?1:600);post.lineStyle(6,0x244351);post.lineBetween(bottom.x,bottom.y,top.x,top.y);}
   }else{
    const centerA=project(500,25),centerB=project(500,425);ground.lineStyle(2,0xfff1d5,.7);ground.lineBetween(centerA.x,centerA.y,centerB.x,centerB.y);
    const circle=Array.from({length:40},(_,i)=>project(500+Math.cos(i*Math.PI/20)*65,225+Math.sin(i*Math.PI/20)*65));ground.strokePoints(circle,true,true);
    for(const x of [35,965]){
     const frame=this.add.graphics().setDepth(460),far=x===35?5:995;
     const bottomA=project(x,150),bottomB=project(x,300),topA=project(x,150,355),topB=project(x,300,355),backA=project(far,150,355),backB=project(far,300,355);
     frame.fillStyle(0x234754,.15);frame.fillPoints([topA,topB,backB,backA],true);frame.lineStyle(1,0xdaf1e0,.8);
     for(let z=150;z<=300;z+=15){const a=project(x,z,355),b=project(far,z);frame.lineBetween(a.x,a.y,b.x,b.y);}
     frame.lineStyle(5,0xfff5d9);frame.strokePoints([bottomA,topA,topB,bottomB],false);
     const edge=x===35?155:845;ground.lineStyle(2,0xfff1d5,.7);ground.strokePoints([project(x,115),project(edge,115),project(edge,335),project(x,335)],false);
    }
   }
   const athleteKeys=bakeAthletes(this,getGame().sport,getGame().players.map((p,i)=>({team:p.team,keeper:getGame().sport==='soccer'&&i%3===0})));
   this.crowd=addCrowd(this,project);if(getGame().sport!=='soccer')addReferee(this,getGame().sport,project);
   for(let i=0;i<getGame().players.length;i++){
    this.shadows.push(this.add.ellipse(0,0,36,12,0x593e24,.23));this.bodies.push(this.add.sprite(0,0,athleteKeys[i],'idle-0').setOrigin(.5,ATHLETE_FEET/ATHLETE_SIZE).setFlipX(getGame().players[i].team===1));
    this.labels.push(this.add.text(0,0,`${getGame().players[i].team?'PRAIA':'VOCÊ'} ${getGame().sport==='soccer'?i%3===0?'GOL':i%3:i%2+1}`,{fontFamily:'sans-serif',fontSize:'10px',color:'#fff4d6',backgroundColor:getGame().players[i].team?'#874536':'#14565b',padding:{x:5,y:3}}).setOrigin(.5));
   }
   this.ring=this.add.ellipse(0,0,47,18).setStrokeStyle(2,0x4ce3cf).setDepth(2);
   this.aim=this.add.ellipse(0,0,32,16).setStrokeStyle(2,0xffe385).setDepth(2);
   this.landing=this.add.ellipse(0,0,58,22,0x56d9d2,.13).setStrokeStyle(2,0x7fe5da).setDepth(2);
   this.ballShadow=this.add.ellipse(0,0,17,7,0x513c24,.3).setDepth(2);
   // Unlocked ball skins (lib/beach-progress.ts) recolour the ball; the classic one keeps each sport's colours.
   const skin=({gold:[0xffd23f,0xb8860b,0xfff1a8],fire:[0xff6d00,0xffdb00,0xdb2400],champion:[0xffffff,0x8a2be2,0xffd23f]} as Record<string,number[]>)[getGame().ballSkin];
   this.ball=this.add.container(0,0,[this.add.circle(0,0,10,skin?.[0]??(getGame().sport==='tennis'?0xffec68:0xfff5d9)).setStrokeStyle(2,0x153d4b),this.add.arc(0,0,7,-65,100,false,skin?.[1]??(getGame().sport==='tennis'?0xfff5d9:0x219ca4)),this.add.arc(0,0,6,140,270,false,skin?.[2]??0xe7b743)]);
   for(let i=0;i<7;i++)this.trail.push(this.add.circle(0,0,7-i*.7,0xffdc69).setVisible(false));
   this.impact=this.add.circle(0,0,12).setStrokeStyle(2,0xffffd9).setDepth(800);this.meter=timingMeter(this);
   this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const sx=pointer.x-95,sy=pointer.y-245,x=(sx*.66-sy*.2)/(.77*.66+.2*.035),z=(sy*.77+sx*.035)/(.77*.66+.2*.035);if(x>535&&x<965&&z>25&&z<425){const g=getGame();g.aim=g.sport==='soccer'?{x:965,z:Math.max(165,Math.min(285,z))}:{x,z};}});
   this.previous=this.snapshot();ready();
  }
  snapshot(){const g=getGame();return {ball:{...g.ball},players:g.players.map(p=>({...p}))};}
  update(_time:number,delta:number){
   if(!this.ball)return;const frozen=this.freeze>0;this.freeze=Math.max(0,this.freeze-delta/1000);if(!frozen)this.accumulator+=Math.min(delta/1000,.1);
   while(this.accumulator>=1/120){this.previous=this.snapshot();const g=getGame();if(g.sport==='soccer')stepSoccer(g,1/120,input(),level());else stepNet(g,1/120,input(),level());this.accumulator-=1/120;}
   const g=getGame(),alpha=this.accumulator*120,lerp=(a:number,b:number)=>g.status==='playing'||g.status==='tossing'||g.restartDelay>0?a+(b-a)*alpha:b;
   g.players.forEach((p,i)=>{
    const old=this.previous.players[i],x=lerp(old.x,p.x),z=lerp(old.z,p.z),y=lerp(old.y,p.y),pos=project(x,z,y),ground=project(x,z);
    const speed=Math.hypot(p.vx,p.vz),oldSpeed=Math.hypot(old.vx,old.vz),queued=g.sport!=='soccer'&&i===g.active&&g.shotWindow>0&&!p.actionTime,striking=p.actionTime>0||p.windup>0||queued;
    let pose=p.y<FLOOR?'jump':p.landing>0?'land':speed>45?(oldSpeed>speed+2?'brake':'run'):p.preparation>.1?'ready':'idle';
    if(g.sport==='soccer'&&g.owner===i&&pose==='run')pose='dribble';
    let frame=pose==='run'||pose==='dribble'?Math.floor(p.stride/Math.PI/2*ATHLETE_FRAMES)%ATHLETE_FRAMES:pose==='land'?Math.round((1-p.landing/.18)*11):pose==='jump'?Math.max(0,Math.min(11,Math.round((p.vy+430)/860*11))):reduced?0:Math.floor(g.clock*2+i*3)%ATHLETE_FRAMES;
    if(striking){
     const action=queued?g.sport==='tennis'||g.lastTeam===p.team&&g.touches>=2?'spike':g.lastTeam===p.team?'set':'bump':p.action;
     pose=action==='dive'?(g.sport==='tennis'?'dive':g.sport==='soccer'&&i%3!==0?'slide':'save'):g.sport==='tennis'?(p.y<FLOOR?'smash':g.attackStyle==='roll'&&(p.windup>0||queued)||g.lastHit===i&&g.feedback.startsWith('LOB')?'lob':'forehand'):action==='shark'?'shark':action==='bump'?'kick':action==='set'?'chest':'header';
     if(g.sport==='soccer'&&p.action!=='dive')pose='kick';
     if(g.sport==='footvolley'&&(g.specialShot&&g.specialPlayer===i||p.team===0&&g.specialArmed&&p.windup>0&&p.action==='spike'))pose='bicycle';
     const progress=queued?.4+.6*(1-g.shotWindow/.32):p.windup>0?.4*(1-Math.min(1,p.windup/(g.sport==='soccer'?.1:.3))):pose==='save'||pose==='slide'||pose==='dive'?1-p.actionTime/(pose==='save'?.5:pose==='dive'?.7:.42):.4+.6*(1-p.actionTime/.36);
     frame=Math.max(0,Math.min(11,Math.round(progress*11)));
    }
    const sprite=this.bodies[i],ballSide=(g.ball.x-p.x)*.77+(g.ball.z-p.z)*.2,moveSide=p.vx*.77+p.vz*.2;
    if(striking){
     const passTarget=g.sport==='soccer'&&g.owner===i&&g.pendingKick==='pass'?g.players[g.kickTarget]:undefined;
     const facing=g.sport==='soccer'?g.players[i].facingX*.77+g.players[i].facingZ*.2:p.team?-1:1;
     const kickSide=passTarget?(passTarget.x-p.x)*.77+(passTarget.z-p.z)*.2:g.sport==='soccer'&&g.owner===i&&g.pendingKick==='shot'?p.team?-1:(g.aim.x-p.x)*.77+(g.kickAimZ-p.z)*.2:g.lastHit===i&&Math.hypot(g.ball.vx,g.ball.vz)>100?g.ball.vx*.77+g.ball.vz*.2:facing;
     sprite.setFlipX(p.action==='dive'&&pose==='slide'?p.diveX*.77+p.diveZ*.2<0:g.sport==='soccer'&&p.action!=='dive'?kickSide<0:p.team===1);
    }
    else if(speed>45)sprite.setFlipX(moveSide<0);else if(p.preparation>.1&&g.sport!=='soccer')sprite.setFlipX(ballSide<0);
    sprite.setFrame(`${pose}-${frame}`).setPosition(pos.x,pos.y).setScale(1).setDepth(z+20);
    this.shadows[i].setPosition(ground.x,ground.y).setScale(y<FLOOR?.72:striking&&p.action==='dive'?1.35:1).setAlpha(y<FLOOR?.14:.23).setDepth(1);
    this.labels[i].setPosition(ground.x,ground.y+19).setDepth(z+21).setVisible(g.active===i);
    if(g.active===i)this.ring.setPosition(ground.x,ground.y).setStrokeStyle(g.specialArmed?3:2,g.specialArmed?0xffdc69:0x4ce3cf);
   });
   const b=g.ball,old=this.previous.ball,pos=project(lerp(old.x,b.x),lerp(old.z,b.z),lerp(old.y,b.y)),shadow=project(b.x,b.z);
   this.ball.setPosition(pos.x,pos.y).setDepth(b.z+30);if(g.status==='playing'&&!reduced)this.ball.rotation+=delta*.003;
   this.ballShadow.setPosition(shadow.x,shadow.y).setAlpha(Math.max(.08,.3-(FLOOR-b.y)*.0005));
   const power=g.shotWindow>0?g.shotCharge:g.charge,drift=g.shotWindow>0?g.shotDrift:aimDrift(power,g.clock);
   const aimedShot=g.sport==='soccer'&&(g.pendingKick==='shot'&&g.owner>=0&&g.owner<3||g.owner<0&&g.lastHit>=0&&g.lastHit<3&&/^(CHUTE|CANHÃO|COBERTURA)/.test(g.feedback));
   const aim=project(g.aim.x,aimedShot&&g.sport==='soccer'?g.kickAimZ:g.aim.z+drift);this.aim.setPosition(aim.x,aim.y).setStrokeStyle(2,power>.65?0xff795d:0xffe385).setScale(1+powerRisk(power)*.7);
   const guide=g.sport==='soccer'?{x:g.ball.x,z:g.ball.z,team:0,time:1}:netGuide(g),landing=project(guide.x,guide.z);this.landing.setPosition(landing.x,landing.y).setVisible(g.status==='playing'&&guide.team===0).setStrokeStyle(guide.time<.32?3:2,guide.time<.32?0xffe385:0x7fe5da);
   const impact=project(g.impact.x,g.impact.z,g.impact.y);this.impact.setPosition(impact.x,impact.y).setVisible(g.hitFlash>0&&!reduced).setAlpha(g.hitFlash/.16).setScale(2-g.hitFlash/.16);
   if(g.contactSerial!==this.lastContact){
    this.lastContact=g.contactSerial;this.trailPoints=[];
    const f=g.feedback,perfect=/PERFEITO/.test(f);
    const kind=g.specialShot?'special':g.sport==='tennis'?'racket':g.sport==='soccer'?(/^(CHUTE|CANHÃO|DE PRIMEIRA|COBERTURA)/.test(f)?'kick':f.startsWith('DEFESA')?'hand':'foot'):f.startsWith('CABEÇA')?'head':f.startsWith('PEITO')?'chest':'foot';
    sound.play(kind,perfect);
    // Hitstop scales with the contact: specials and perfect touches freeze longest, then strong hits, then good ones.
    if(!reduced){this.freeze=g.specialShot?.055:perfect?.04:g.lastPower>.6||kind==='kick'?.028:/BOM/.test(f)?.016:0;if(g.specialShot||perfect)this.cameras.main.shake(g.specialShot?90:70,g.specialShot?.003:.0018);}
   }
   const score=g.score.join(',')+(g.sport==='soccer'?'':':'+g.points.join(','));
   this.cheer=Math.max(0,this.cheer-delta/1000);this.crowd(this.cheer>0,g.clock);
   if(score!==this.lastScore){if(this.lastScore){sound.play('point');this.cheer=1.4;if(g.sport==='soccer'&&!reduced)this.cameras.main.shake(140,.004);}this.lastScore=score;}
   const hitter=g.players[g.lastHit],above=hitter&&project(hitter.x,hitter.z,hitter.y-150);
   this.meter(above?.x??0,above?.y??0,g.timing!==null&&g.feedbackTime>.8&&hitter?.team===0?g.timing:null);
   if(g.status==='playing'&&(g.specialShot||Math.hypot(b.vx,b.vz)>430)&&!reduced)this.trailPoints.unshift({x:pos.x,y:pos.y});else this.trailPoints=[];
   this.trailPoints.length=Math.min(7,this.trailPoints.length);
   this.trail.forEach((dot,i)=>{const point=this.trailPoints[i];dot.setVisible(!!point);if(point)dot.setPosition(point.x,point.y).setDepth(b.z+29).setFillStyle(g.specialShot?0xffde68:0xff9573).setAlpha((1-i/7)*.45);});
   const view=`${g.status}:${Math.ceil(g.restartDelay)}:${g.score.join(',')}:${g.sport==='soccer'?'':g.points.join(',')}:${g.active}:${g.feedback}:${g.feedbackTime>0}:${Math.floor(g.charge*20)}:${g.shotWindow>0}:${g.energy.join(',')}:${g.combo.join(',')}:${g.specialArmed}`;
   if(view!==this.lastView){this.lastView=view;changed();}
  }
 }
 const engine=new Phaser.Game({type:Phaser.AUTO,parent,width:1000,height:620,backgroundColor:'#dfbd85',pixelArt:true,scene:Beach,fps:{target:60},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
 engine.events.once('destroy',()=>sound.destroy());return engine;
}
