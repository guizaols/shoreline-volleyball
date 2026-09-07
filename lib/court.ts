import * as Phaser from 'phaser';
import { step, DIVE_DURATION, setAim, guidance, landingX, landingZ, FLOOR, type Game, type Player } from './game';

export function project(x: number, z: number, y = FLOOR) {
  return { x: 95 + x * .77 + z * .20, y: 245 + z * .66 - x * .035 - (FLOOR - y) * .68 };
}
const rows = ['idle', 'run', 'bump', 'set', 'spike', 'dive'];
// Frames use explicit bounds because the illustrated poses have different heights.
const bounds = [
  [[52,79,101,120],[266,81,87,119],[453,80,98,120],[677,84,95,116],[887,84,88,115],[1100,83,86,116]],
  [[44,251,105,128],[242,254,115,124],[441,253,108,126],[663,253,107,126],[872,253,112,126],[1113,254,68,126]],
  [[58,447,80,112],[262,444,88,110],[457,451,85,98],[668,448,91,106],[889,449,91,106],[1104,450,76,105]],
  [[62,615,74,135],[265,622,73,130],[460,621,77,130],[666,601,72,150],[888,606,71,145],[1096,616,77,136]],
  [[48,816,90,114],[243,813,99,121],[465,804,94,137],[677,776,78,175],[891,799,73,134],[1102,838,71,104]],
  [[37,1050,115,71],[204,1051,133,70],[426,1045,139,42],[634,1073,163,49],[893,1039,91,89],[1101,1037,75,94]],
];
export function mountCourt(parent: HTMLElement, getGame: () => Game, keys: Set<string>, getLevel: () => string,
  changed: () => void, ready: () => void, failed: (message: string) => void) {
  class Court extends Phaser.Scene {
    athletes: Phaser.GameObjects.Sprite[] = [];
    shadows: Phaser.GameObjects.Ellipse[] = [];
    labels: Phaser.GameObjects.Text[] = [];
    ball!: Phaser.GameObjects.Container;
    ballShadow!: Phaser.GameObjects.Ellipse;
    ring!: Phaser.GameObjects.Ellipse;
    arrow!: Phaser.GameObjects.Triangle;
    impact!: Phaser.GameObjects.Arc;
    target!: Phaser.GameObjects.Container;
    landing!: Phaser.GameObjects.Ellipse;
    receive!: Phaser.GameObjects.Ellipse;
    hint!: Phaser.GameObjects.Text;
    guideLine!: Phaser.GameObjects.Graphics;
    accumulator = 0;
    previous!: Game;
    lastView = '';
    preload() {
      this.load.image('athlete', '/art/athlete-clean.png');
      this.load.image('beach', '/art/beach.png');
      this.load.on('loaderror', () => failed('Não foi possível carregar a arte. Recarregue a página.'));
    }
    create() {
      if(!this.textures.exists('athlete')||!this.textures.exists('beach')) return;
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
      const texture=this.textures.get('athlete');
      for(let row=0;row<6;row++)for(let col=0;col<6;col++){
        const [x,y,w,h]=bounds[row][col];texture.add(`${rows[row]}-${col}`,0,x-2,y-2,w+4,h+4);
      }
      for(const name of ['idle','run'])this.anims.create({key:name,frames:Array.from({length:6},(_,i)=>({key:'athlete',frame:`${name}-${i}`})),frameRate:name==='run'?12:5,repeat:-1});
      for(let i=0;i<4;i++){
        this.shadows.push(this.add.ellipse(0,0,35,11,0x593e24,.24).setDepth(1));
        this.athletes.push(this.add.sprite(0,0,'athlete','idle-0').setOrigin(.5,1));
        this.labels.push(this.add.text(0,0,`${i<2?'YOU':'COAST'} ${i%2+1}`,{fontFamily:'monospace',fontSize:'9px',color:i<2?'#164b48':'#852d2e',backgroundColor:'#fff0cc',padding:{x:4,y:2}}).setOrigin(.5,0));
      }
      this.ring=this.add.ellipse(0,0,44,15).setStrokeStyle(2,0x1eac90).setDepth(2);
      this.arrow=this.add.triangle(0,0,0,0,10,0,5,7,0xffdb6e).setDepth(1000);
      this.ballShadow=this.add.ellipse(0,0,16,6,0x563b26,.3).setDepth(2);
      this.ball=this.add.container(0,0,[this.add.circle(0,0,8,0xfff9df).setStrokeStyle(1,0x624f3f),this.add.arc(0,0,6,-60,110,false,0x3a93b5),this.add.arc(0,0,5,140,280,false,0xe4b841)]).setDepth(900);
      this.impact=this.add.circle(0,0,12).setStrokeStyle(2,0xffffd3).setDepth(901);
      const circle=this.add.ellipse(0,0,34,17).setStrokeStyle(2,0xffee75);
      const cross=this.add.graphics().lineStyle(2,0xffee75);cross.lineBetween(-10,0,10,0);cross.lineBetween(0,-8,0,8);
      this.target=this.add.container(0,0,[circle,cross]).setDepth(3);
      const aimPointer=(pointer:Phaser.Input.Pointer)=>{
        const sx=pointer.x-95,sy=pointer.y-245,det=.77*.66+.2*.035;
        const x=(sx*.66-sy*.2)/det,z=(sy*.77+sx*.035)/det;
        if(x>=535&&x<=965&&z>=25&&z<=425){setAim(getGame(),x,z);changed();}
      };
      this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{aimPointer(pointer);if(getGame().practice)keys.add('mouse-attack');});
      this.input.on('pointermove',aimPointer);
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
      if(!this.ball)return;
      this.accumulator+=Math.min(delta/1000,.1);
      while(this.accumulator>=1/120){this.previous=this.snapshot();step(getGame(),1/120,(keys.has('right')?1:0)-(keys.has('left')?1:0),keys.has('jump'),getLevel(),keys.has('attack')||keys.has('mouse-attack'),keys.has('dive'),(keys.has('down')?1:0)-(keys.has('up')?1:0),keys.has('block'));this.accumulator-=1/120;}
      const g=getGame(),alpha=this.accumulator*120, lerp=(a:number,b:number)=>a+(b-a)*alpha;
      const render=(p:Player,i:number)=>{
        const old=this.previous.players[i];
        const x=g.status==='playing'?lerp(old.x,p.x):p.x,z=g.status==='playing'?lerp(old.z,p.z):p.z,y=g.status==='playing'?lerp(old.y,p.y):p.y;
        const ground=project(x,z),pos=project(x,z,y),sprite=this.athletes[i];
        sprite.setPosition(pos.x,pos.y).setScale(.56).setFlipX(p.action==='dive'?p.diveX<0:p.team===1).setDepth(z+20);
        // A subtle warm tint and labels distinguish the opposing team.
        sprite.setTint(i<2?0xffffff:0xffdbd1);
        const moving=Math.hypot(p.vx,p.vz)>25;
        if(p.action==='idle'&&(p.y<FLOOR||p.windup>0||p.landing>0)){
          sprite.stop();sprite.setFrame(`spike-${p.windup>0?0:p.landing>0?5:p.vy<0?2:4}`);
        }else if(p.action==='idle'){
          sprite.play(moving?'run':'idle',true);sprite.anims.timeScale=moving?Math.max(.4,Math.hypot(p.vx,p.vz)/220):1;
        }else{
          sprite.stop();const duration=p.action==='dive'?DIVE_DURATION:.55;
          sprite.setFrame(`${p.action}-${Math.min(5,Math.floor((1-p.actionTime/duration)*6))}`);
        }
        if(g.status==='paused')sprite.anims.pause();else sprite.anims.resume();
        this.shadows[i].setPosition(ground.x,ground.y-1).setScale(y<FLOOR?.75:1);
        this.labels[i].setPosition(ground.x,ground.y+9).setDepth(z+21).setAlpha(i===g.active?1:.65);
        if(i===g.active){this.ring.setPosition(ground.x,ground.y);this.arrow.setPosition(pos.x,pos.y-110);}
      };
      g.players.forEach(render);
      const guide=guidance(g),show=g.status==='playing'&&guide.team===0;
      this.landing.setVisible(g.status==='playing');this.receive.setVisible(show);this.hint.setVisible(show);this.guideLine.clear();
      const fall=project(landingX(g,437),landingZ(g,437));this.landing.setPosition(fall.x,fall.y);
      if(show){
        const spot=project(guide.x,guide.z),p=g.players[g.active],pos=project(p.x,p.z);
        const close=Math.hypot(p.x-guide.x,p.z-guide.z)<50;
        this.receive.setPosition(spot.x,spot.y).setStrokeStyle(3,close?0xa4ef7a:0x49ded2);
        this.guideLine.lineStyle(2,0x49ded2,.7).lineBetween(pos.x,pos.y,spot.x,spot.y);
        this.hint.setPosition(spot.x,spot.y+38).setText(g.practice?(close?'MOUSE MIRA · SEGURE PARA PREPARAR':'VÁ AO CÍRCULO'):guide.attack?(close&&guide.time<.5?'PULE AGORA · ESPAÇO':'ATAQUE · VÁ AO CÍRCULO'):close?'BEM POSICIONADO':'VÁ AO CÍRCULO');
      }
      const target=project(g.aim.x,g.aim.z);this.target.setPosition(target.x,target.y);
      const old=this.previous.ball,b=g.ball;
      const x=g.status==='playing'?lerp(old.x,b.x):b.x,z=g.status==='playing'?lerp(old.z,b.z):b.z,y=g.status==='playing'?lerp(old.y,b.y):b.y;
      const bp=project(x,z,y),shadow=project(x,z);
      this.ball.setPosition(bp.x,bp.y).setDepth(z+30);if(g.status==='playing')this.ball.rotation+=delta*(g.shot==='FLOAT SERVE'?.0002:.004);
      this.ballShadow.setPosition(shadow.x,shadow.y).setAlpha(Math.max(.08,.3-(FLOOR-y)*.0005));
      this.impact.setPosition(bp.x,bp.y).setVisible(g.hitFlash>0).setAlpha(g.hitFlash/.16).setScale(1+(1-g.hitFlash/.16));
      const view=`${g.status}:${g.rally}:${g.active}:${g.score}:${g.shot}:${g.feedbackTime>0}:${Math.floor(g.tossTime*20)}:${Math.round(g.wind)}:${Math.floor((g.players[g.active]?.preparation||0)*20)}`;if(view!==this.lastView){this.lastView=view;changed();}
    }
  }
  return new Phaser.Game({type:Phaser.AUTO,parent,width:1000,height:620,pixelArt:true,roundPixels:true,backgroundColor:'#dfbd85',scene:Court,
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:false},audio:{noAudio:true}});
}
