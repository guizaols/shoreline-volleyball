import {bakeAthletes,ATHLETE_SIZE,ATHLETE_FEET,ATHLETE_FRAMES} from './athlete-render';
import {drills} from './training';
import * as Phaser from 'phaser';
import {matchAudio} from './match-audio';
import { step, aimPresets, DIVE_DURATION, setAim, guidance, landingX, landingZ, FLOOR, type Game, type Player } from './game';

import {project} from './court-projection';
export {project} from './court-projection';

export function mountCourt(parent: HTMLElement, getGame: () => Game, keys: Set<string>, getLevel: () => string,
  changed: () => void, ready: () => void, failed: (message: string) => void, getStick:()=>{x:number;z:number}=()=>({x:0,z:0}),onlineAim?:(x:number,z:number)=>void) {
  const sound=matchAudio(parent.closest<HTMLElement>('.game-shell')||parent);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  class Court extends Phaser.Scene {
    lastFlash=0;
    impactPosition={x:0,y:0};
    athletes: Phaser.GameObjects.Sprite[] = [];
    shadows: Phaser.GameObjects.Ellipse[] = [];
    labels: Phaser.GameObjects.Text[] = [];
    ball!: Phaser.GameObjects.Container;
    ballShadow!: Phaser.GameObjects.Ellipse;
    ring!: Phaser.GameObjects.Ellipse;
    arrow!: Phaser.GameObjects.Triangle;
    impact!: Phaser.GameObjects.Arc;
    target!: Phaser.GameObjects.Container;
    objective!: Phaser.GameObjects.Graphics;
    objectiveLabel!: Phaser.GameObjects.Text;
    landing!: Phaser.GameObjects.Ellipse;
    receive!: Phaser.GameObjects.Ellipse;
    hint!: Phaser.GameObjects.Text;
    guideLine!: Phaser.GameObjects.Graphics;
    accumulator = 0;
    previous!: Game;
    lastView = '';
    preload() {
      this.load.image('beach', '/art/beach.png');
      this.load.on('loaderror', () => failed('Não foi possível carregar a arte. Recarregue a página.'));
    }
    create() {
      if(!this.textures.exists('beach')) return;
      this.add.image(0,0,'beach').setOrigin(0).setDisplaySize(1000,620);
      const sand=this.add.graphics();
      const polygon=(points:{x:number;y:number}[],color:number,alpha=1)=>{sand.fillStyle(color,alpha);sand.fillPoints(points,true);};
      const corners=[project(35,25),project(965,25),project(965,425),project(35,425)];
      polygon(corners,0xecc690,.35);
      sand.lineStyle(3,0xfff1d3,.95);sand.strokePoints(corners,true,true);
      const front=project(500,425),back=project(500,25),topFront=project(500,425,274),topBack=project(500,25,274);
      const net=this.add.graphics().setDepth(260);
      net.fillStyle(0x263d43,.14);net.fillPoints([back,front,topFront,topBack],true);
      net.lineStyle(1,0x364d4d,.55);
      for(let z=25;z<=425;z+=22){const a=project(500,z),b=project(500,z,274);net.lineBetween(a.x,a.y,b.x,b.y);}
      for(let h=0;h<=176;h+=14){const a=project(500,25,450-h),b=project(500,425,450-h);net.lineBetween(a.x,a.y,b.x,b.y);}
      net.lineStyle(5,0xfff3d5);net.lineBetween(topBack.x,topBack.y,topFront.x,topFront.y);
      [25,425].forEach((z,i)=>{const a=project(500,z),b=project(500,z,260);const post=this.add.graphics().setDepth(i?600:25);post.lineStyle(7,0x283f4e);post.lineBetween(a.x,a.y,b.x,b.y);post.lineStyle(2,0x829da0);post.lineBetween(a.x-2,a.y,b.x-2,b.y);});
      const athleteTexture=bakeAthletes(this,'volleyball');
      for(let i=0;i<4;i++){
        this.shadows.push(this.add.ellipse(0,0,35,11,0x593e24,.24).setDepth(1));
        this.athletes.push(this.add.sprite(0,0,athleteTexture,`${i<2?0:1}-idle-0`).setOrigin(.5,ATHLETE_FEET/ATHLETE_SIZE).setFlipX(i>=2));
        this.labels.push(this.add.text(0,0,`${i<2?'YOU':'COAST'} ${i%2+1}`,{fontFamily:'monospace',fontSize:'9px',color:i<2?'#164b48':'#852d2e',backgroundColor:'#fff0cc',padding:{x:4,y:2}}).setOrigin(.5,0));
      }
      this.ring=this.add.ellipse(0,0,44,15).setStrokeStyle(2,0x1eac90).setDepth(2);
      this.arrow=this.add.triangle(0,0,0,0,10,0,5,7,0xffdb6e).setDepth(1000);
      this.ballShadow=this.add.ellipse(0,0,16,6,0x563b26,.3).setDepth(2);
      this.ball=this.add.container(0,0,[this.add.circle(0,0,10,0xfff9df).setStrokeStyle(2,0x153d4b),this.add.arc(0,0,7,-60,110,false,0x3a93b5),this.add.arc(0,0,6,140,280,false,0xe4b841)]).setDepth(900);
      this.impact=this.add.circle(0,0,12).setStrokeStyle(2,0xffffd3).setDepth(901);
      const circle=this.add.ellipse(0,0,34,17).setStrokeStyle(2,0xffee75);
      const targetLabel=this.add.text(0,-24,'',{fontSize:'13px',color:'#fff075',backgroundColor:'#193e46',padding:{x:5,y:3}}).setOrigin(.5);
      const cross=this.add.graphics().lineStyle(2,0xffee75);cross.lineBetween(-10,0,10,0);cross.lineBetween(0,-8,0,8);
      this.target=this.add.container(0,0,[circle,cross,targetLabel]).setDepth(3);
      this.objective=this.add.graphics().setDepth(3);this.objectiveLabel=this.add.text(0,0,'ALVO DO TREINO',{fontSize:'12px',color:'#fff2a0',backgroundColor:'#193e46'}).setOrigin(.5).setDepth(3);
      let lastOnlineAim=0;
      const aimPointer=(pointer:Phaser.Input.Pointer)=>{
        const sx=pointer.x-95,sy=pointer.y-245,det=.77*.66+.2*.035;
        const x=(sx*.66-sy*.2)/det,z=(sy*.77+sx*.035)/det;
        if(x>=535&&x<=965&&z>=25&&z<=425){if(getGame().online){const now=performance.now();if(now-lastOnlineAim<40)return;lastOnlineAim=now;onlineAim?.(x,z);}else setAim(getGame(),x,z);changed();}
      };
      this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{aimPointer(pointer);if(getGame().practice)keys.add('mouse-attack');});
      this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(pointer.isDown)aimPointer(pointer);});
      const releasePointer=()=>keys.delete('mouse-attack');
      this.input.on('pointerup',releasePointer);
      this.input.on('pointerupoutside',releasePointer);
      this.input.on('gameout',releasePointer);
      this.landing=this.add.ellipse(0,0,28,14).setStrokeStyle(2,0xffffff).setDepth(3);
      this.receive=this.add.ellipse(0,0,64,25,0x49ded2,.18).setStrokeStyle(3,0x49ded2).setDepth(4);
      this.hint=this.add.text(0,0,'',{fontFamily:'sans-serif',fontSize:'13px',color:'#ffffff',backgroundColor:'#193e46',padding:{x:7,y:5}}).setOrigin(.5).setDepth(950);
      this.guideLine=this.add.graphics().setDepth(3);
      this.previous=this.snapshot();ready();
    }
    snapshot():Game {const g=getGame();return {...g,ball:{...g.ball},players:g.players.map(p=>({...p}))};}
    update(_time:number,delta:number) {
      if(getGame().online)this.accumulator=0;
      if(!this.ball)return;
      this.accumulator+=Math.min(delta/1000,.1);
      while(!getGame().online&&this.accumulator>=1/120){this.previous=this.snapshot();step(getGame(),1/120,Math.max(-1,Math.min(1,getStick().x+(keys.has('right')?1:0)-(keys.has('left')?1:0))),keys.has('jump')||keys.has('touch-jump'),getLevel(),(keys.has('attack')||keys.has('touch-attack')||keys.has('1')||keys.has('2')||keys.has('3')),keys.has('dive'),Math.max(-1,Math.min(1,getStick().z+(keys.has('down')?1:0)-(keys.has('up')?1:0))),keys.has('block'),keys.has('touch-attack')||keys.has('1')||keys.has('2')||keys.has('3')||keys.has('prepare')||keys.has('touch-prepare')||keys.has('mouse-attack'));this.accumulator-=1/120;}
      const g=getGame(),alpha=g.online?Math.min(1,delta/35):this.accumulator*120, lerp=(a:number,b:number)=>a+(b-a)*alpha;
      if(g.online){for(const [i,p] of this.previous.players.entries()){const next=g.players[i];if(Math.hypot(p.x-next.x,p.z-next.z)>180)Object.assign(p,next);else{p.x=lerp(p.x,next.x);p.y=lerp(p.y,next.y);p.z=lerp(p.z,next.z);}}const b=this.previous.ball;if(Math.hypot(b.x-g.ball.x,b.y-g.ball.y)>200)Object.assign(b,g.ball);else{b.x=lerp(b.x,g.ball.x);b.y=lerp(b.y,g.ball.y);b.z=lerp(b.z,g.ball.z);}}
      const render=(p:Player,i:number)=>{
        const old=this.previous.players[i];
        const x=g.status==='playing'?lerp(old.x,p.x):p.x,z=g.status==='playing'?lerp(old.z,p.z):p.z,y=g.status==='playing'?lerp(old.y,p.y):p.y;
        const ground=project(x,z),pos=project(x,z,y),sprite=this.athletes[i];
        const visible=g.drill<0||i===g.drillAthlete;sprite.setVisible(visible);this.shadows[i].setVisible(visible);this.labels[i].setVisible(visible&&i===g.active);
        const speed=Math.hypot(p.vx,p.vz),oldSpeed=Math.hypot(old.vx,old.vz);
        let pose=p.y<FLOOR?'jump':p.landing>0?'land':p.windup>0?'ready':speed>40?(oldSpeed>speed+2?'brake':'run'):p.preparation>.1?'ready':'idle';
        let frame=pose==='run'?Math.floor(p.stride/Math.PI/2*ATHLETE_FRAMES)%ATHLETE_FRAMES:pose==='land'?Math.round((1-p.landing/.18)*11):pose==='jump'?Math.max(0,Math.min(11,Math.round((p.vy+510)/1020*11))):reduced?0:Math.floor(g.clock*2+i*3)%ATHLETE_FRAMES;
        if(p.action!=='idle'){
          pose=p.action==='set'&&p.y<FLOOR&&Math.abs(p.x-500)<100?'block':p.action;
          const progress=p.action==='dive'?1-p.actionTime/DIVE_DURATION:p.actionTime>.26?.4*(1-(p.actionTime-.26)/.29):.4+.6*(1-p.actionTime/.26);
          frame=Math.max(0,Math.min(11,Math.round(progress*11)));
        }else if(p.y<FLOOR&&g.lastTeam!==p.team&&Math.abs(p.x-500)<100)pose='block';
        const direction=p.vx*.77+p.vz*.2;
        if(p.action!=='idle'||p.y<FLOOR)sprite.setFlipX(p.action==='dive'?p.diveX*.77+p.diveZ*.2<0:p.team===1);
        else if(speed>40)sprite.setFlipX(direction<0);else if(p.preparation>.1)sprite.setFlipX(p.team===1);
        const compression=reduced?0:p.landing>0?Math.sin(p.landing/.18*Math.PI)*.05:p.windup>0?.05:0;
        sprite.setPosition(pos.x,pos.y).setFrame(`${p.team}-${pose}-${frame}`).setScale(1+compression*.4,1-compression).setDepth(z+20).setTint(i<2&&g.gold?0xffe194:0xffffff);
        sprite.setRotation(reduced?0:Math.max(-.04,Math.min(.04,p.vx/7000)));
        this.shadows[i].setPosition(ground.x,ground.y-1).setScale(y<FLOOR?.72:p.action==='dive'?1.35:1).setAlpha(y<FLOOR?.14:.24);
        this.labels[i].setText((i<2?g.names[i]:g.opponentPlayers[i-2])+((i<2?g.genders[i]:g.opponentGenders[i-2])==='female'?' ♀':(i<2?g.genders[i]:g.opponentGenders[i-2])==='male'?' ♂':'')).setPosition(ground.x,ground.y+9).setDepth(z+21).setAlpha(i===g.active?1:.65);
        if(i===g.active){this.ring.setPosition(ground.x,ground.y);this.arrow.setPosition(pos.x,pos.y-110);}
      };
      g.players.forEach(render);
      const guide=guidance(g),show=g.status==='playing'&&guide.team===0;
      this.landing.setVisible(g.status==='playing');this.receive.setVisible(show);this.hint.setVisible(show);this.guideLine.clear();
      const fall=project(landingX(g,437),landingZ(g,437));this.landing.setPosition(fall.x,fall.y);
      if(show){
        const spot=project(guide.x,guide.z),p=g.players[g.active],pos=project(p.x,p.z);
        const close=Math.hypot(p.x-guide.x,p.z-guide.z)<50;
        this.receive.setPosition(spot.x,spot.y).setStrokeStyle(3,close&&guide.time<.32?0xffe385:close?0xa4ef7a:0x49ded2);
        this.guideLine.lineStyle(2,0x49ded2,.7).lineBetween(pos.x,pos.y,spot.x,spot.y);
        this.hint.setPosition(spot.x,spot.y+38).setText(g.challenge===0?'MOVA ATÉ O CÍRCULO':close?g.practice?'SEGURE JOGAR / J':'TOQUE JOGAR / J':'VÁ AO CÍRCULO');
      }
      (this.target.list[2] as Phaser.GameObjects.Text).setText(g.aimPreset>=0?aimPresets[g.aimPreset].label:'MIRA');
      const objective=g.drill>=0&&drills[g.drill].kind!=='defense';
      this.objective.clear();this.objectiveLabel.setVisible(objective);
      if(objective){
       const radius=drills[g.drill].radius,points=Array.from({length:32},(_,i)=>project(g.drillTarget.x+Math.cos(i*Math.PI/16)*radius,g.drillTarget.z+Math.sin(i*Math.PI/16)*radius));
       this.objective.fillStyle(0xffd85c,.15).fillPoints(points,true).lineStyle(3,0xffd85c).strokePoints(points,true,true);
       const pos=project(g.drillTarget.x,g.drillTarget.z);this.objectiveLabel.setPosition(pos.x,pos.y+radius*.66+10);
      }
      const target=project(g.aim.x,g.aim.z);this.target.setPosition(target.x,target.y);
      const old=this.previous.ball,b=g.ball;
      const x=g.status==='playing'?lerp(old.x,b.x):b.x,z=g.status==='playing'?lerp(old.z,b.z):b.z,y=g.status==='playing'?lerp(old.y,b.y):b.y;
      const bp=project(x,z,y),shadow=project(x,z);
      this.ball.setPosition(bp.x,bp.y).setDepth(z+30);if(g.status==='playing'&&!reduced)this.ball.rotation+=delta*(g.shot==='FLOAT SERVE'?.0002:.004);
      this.ballShadow.setPosition(shadow.x,shadow.y).setAlpha(Math.max(.08,.3-(FLOOR-y)*.0005));
      if(g.hitFlash>this.lastFlash){this.impactPosition={x:bp.x,y:bp.y};sound.play(g.shot==='ATTACK');}
      this.lastFlash=g.hitFlash;
      this.impact.setPosition(this.impactPosition.x,this.impactPosition.y).setVisible(g.hitFlash>0&&!reduced).setAlpha(g.hitFlash/.16).setScale(1+(1-g.hitFlash/.16));
      const view=`${g.status}:${g.rally}:${g.active}:${g.score.join(',')}:${g.shot}:${g.feedbackTime>0}:${Math.floor(g.tossTime*20)}:${Math.round(g.wind)}:${Math.floor((g.players[g.active]?.preparation||0)*20)}`;if(view!==this.lastView){this.lastView=view;changed();}
    }
  }
  const engine=new Phaser.Game({type:Phaser.AUTO,parent,width:1000,height:620,pixelArt:false,roundPixels:false,backgroundColor:'#dfbd85',scene:Court,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
  engine.events.once('destroy',()=>sound.destroy());return engine;
}
