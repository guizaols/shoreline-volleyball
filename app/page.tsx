'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, Maximize, Pause, Play, RotateCcw, Volleyball, Wind, Sun, ArrowLeft, ArrowRight, ArrowUp, X } from 'lucide-react';
import { createGame, serve, step, switchPlayer, type Game, type Player } from '../lib/game';

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, number: number, active: boolean) {
  const run = Math.min(1, Math.abs(p.vx) / 260), airborne = p.y < 449;
  const phase = Math.sin(p.stride), facing = p.vx < -12 ? -1 : p.vx > 12 ? 1 : p.team ? -1 : 1;
  const action = Math.sin(Math.min(1, p.actionTime / .42) * Math.PI / 2);
  const blend = Math.min(1, Math.max(0, (.42-p.actionTime)/.07)) * Math.min(1,p.actionTime/.18);
  const lift = Math.min(1, (450-p.y)/25);
  const crouch = p.windup > 0 ? 7 * (1 - p.windup / .065) : p.landing / .18 * 6;
  const bob = airborne ? 0 : Math.abs(phase) * run * 3;
  ctx.save();
  ctx.fillStyle = '#92753b28'; ctx.beginPath(); ctx.ellipse(p.x, 454, airborne ? 22 : 29, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (active) {
    ctx.strokeStyle = '#347d69'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, 455, 34, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#286f67'; ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 112); ctx.lineTo(p.x + 5, p.y - 112); ctx.lineTo(p.x, p.y - 105); ctx.fill();
  }
  ctx.translate(p.x, p.y + crouch - bob); ctx.scale(facing, 1);
  if (p.action === 'dive') { ctx.translate(0, 17); ctx.rotate(1.04 * Math.min(1,(.6-p.actionTime)/.1)*Math.min(1,p.actionTime/.18)); }
  else ctx.rotate(p.vx / 320 * facing * .09);
  const skin = number % 2 ? '#a86f4b' : '#c58e65';
  const limb = (points: number[][], color: string, width: number) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  };
  const swing = airborne ? 9 : phase * run * 17;
  limb([[-7,-28],[-9-swing,-14],[-9+swing,airborne?-9:0]],skin,8);
  limb([[7,-28],[9+swing,-13],[9-swing,airborne?-5:0]],skin,8);
  limb([[-10+swing,airborne?-8:0],[-3+swing,airborne?-8:0]],'#765840',5);
  limb([[8-swing,airborne?-4:0],[16-swing,airborne?-4:0]],'#765840',5);
  ctx.fillStyle = p.team ? '#d87654' : '#286f67'; ctx.beginPath(); ctx.roundRect(-16,-65,32,37,[10,10,4,4]); ctx.fill();
  ctx.fillStyle = p.team ? '#665348' : '#234c48'; ctx.fillRect(-16,-31,32,10);
  for (const side of [-1, 1]) {
    let elbow = [side*22, -48 - phase*run*side*9], hand = [side*21 + phase*run*side*8, -34];
    elbow=[elbow[0]+(side*24-elbow[0])*lift,elbow[1]+(-71-elbow[1])*lift];
    hand=[hand[0]+(side*20-hand[0])*lift,hand[1]+(-89-hand[1])*lift];
    const restElbow=[...elbow], restHand=[...hand];
    if (p.action === 'bump') { elbow=[side*13+16*action,-48]; hand=[28*action,-47-4*action]; }
    if (p.action === 'set') { elbow=[side*24,-67-10*action]; hand=[side*9,-82-14*action]; }
    if (p.action === 'spike') { elbow=side===1?[25,-80]:[-24,-58]; hand=side===1?[30*Math.cos(action*Math.PI),-88-16*Math.sin(action*Math.PI)]:[-18,-42]; }
    if (p.action === 'dive') { elbow=[side*8+12,-79]; hand=[side*5+20,-100]; }
    const weight=p.action==='dive'?Math.min(1,(.6-p.actionTime)/.1)*Math.min(1,p.actionTime/.15):blend;
    elbow=elbow.map((v,i)=>restElbow[i]+(v-restElbow[i])*weight);
    hand=hand.map((v,i)=>restHand[i]+(v-restHand[i])*weight);
    limb([[side*13,-60],elbow,hand],skin,7);
  }
  ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-79,13,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#393b2d';ctx.beginPath();ctx.ellipse(-2,-86,13,8,-.15,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.team?'#f6ce9c':'#b9d6b1';ctx.fillRect(-13,-85,25,3);
  ctx.fillStyle='#373c2d';ctx.fillRect(7,-80,3,2);
  ctx.save();ctx.scale(facing,1);ctx.fillStyle='#fff6d9';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(String(number%2+1),0,-43);ctx.restore();
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, g: Game, time: number) {
  const W=1000,H=510; ctx.clearRect(0,0,W,H);
  const sky=ctx.createLinearGradient(0,0,0,300); sky.addColorStop(0,'#bfe5e2'); sky.addColorStop(1,'#ecf2dc'); ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  ellipse(802,85,38,38,'#fff5c9'); ellipse(802,85,53,53,'#fff5c922');
  for(let i=0;i<4;i++){ const x=140+i*235; ellipse(x,80+i%2*45,46,10,'#ffffff70');ellipse(x+25,74+i%2*45,28,16,'#ffffff70'); }
  ctx.fillStyle='#76b9aa';ctx.beginPath();ctx.moveTo(0,235);ctx.lineTo(0,205);ctx.bezierCurveTo(75,145,85,224,165,211);ctx.bezierCurveTo(220,150,250,213,290,232);ctx.fill();
  ctx.fillStyle='#5bbab7';ctx.fillRect(0,232,W,83);ctx.fillStyle='#8bd0c4';ctx.fillRect(0,262,W,64);
  for(let i=0;i<8;i++){ctx.strokeStyle='#eaffec70';ctx.lineWidth=2;ctx.beginPath();const x=(i*157+time*8)%1150-80;ctx.moveTo(x,278+i%3*14);ctx.lineTo(x+60,278+i%3*14);ctx.stroke();}
  ctx.fillStyle='#eee1b4';ctx.beginPath();ctx.moveTo(0,312);ctx.bezierCurveTo(280,300,650,344,1000,310);ctx.lineTo(1000,H);ctx.lineTo(0,H);ctx.fill();
  ctx.strokeStyle='#fff5d6';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,312);ctx.bezierCurveTo(280,300,650,344,1000,310);ctx.stroke();
  for(let i=0;i<110;i++){ellipse((i*137)%1000,340+(i*73)%170,1.1,.6,'#c6ae7855');}
  ctx.fillStyle='#e7d39e';ctx.beginPath();ctx.moveTo(100,373);ctx.lineTo(900,373);ctx.lineTo(965,472);ctx.lineTo(35,472);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#fff8e1';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.moveTo(500,374);ctx.lineTo(500,472);ctx.stroke();
  // A little shade on either side of the court.
  for(const [x,flip] of [[29,1],[978,-1]]){ctx.save();ctx.translate(x,360);ctx.scale(flip,1);ctx.strokeStyle='#9c8059';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(20,-95,4,-163);ctx.stroke();for(let j=0;j<6;j++){ctx.fillStyle=j%2?'#32796c':'#418e79';ctx.beginPath();ctx.moveTo(4,-163);const angle=-Math.PI+j*.58;ctx.quadraticCurveTo(4+Math.cos(angle)*65,-182+Math.sin(angle)*45,4+Math.cos(angle)*97,-145+Math.sin(angle)*35);ctx.quadraticCurveTo(4+Math.cos(angle)*40,-154,4,-163);ctx.fill();}ctx.restore();}
  // Net mesh and posts.
  ctx.fillStyle='#355c5440';ctx.fillRect(493,291,14,153);ctx.strokeStyle='#466b6265';ctx.lineWidth=1;for(let y=300;y<441;y+=10){ctx.beginPath();ctx.moveTo(492,y);ctx.lineTo(508,y);ctx.stroke();}ctx.fillStyle='#f9f5df';ctx.fillRect(489,286,22,6);ctx.fillStyle='#546e62';ctx.fillRect(497,290,6,161);
  g.players.forEach((p,i)=>drawPlayer(ctx,p,i,i===g.active));
  if(g.hitFlash>0){ctx.strokeStyle=`rgba(255,255,239,${g.hitFlash/.16})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.ball.x,g.ball.y,18+(1-g.hitFlash/.16)*20,0,Math.PI*2);ctx.stroke();}
  const b=g.ball;ellipse(b.x,454,Math.max(5,17-(450-b.y)/40),4,'#92753b30');ctx.save();ctx.translate(b.x,b.y);ctx.rotate(time*2);ellipse(0,0,13,13,'#fff8e6');ctx.strokeStyle='#337d79';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,9,-.8,1.5);ctx.stroke();ctx.strokeStyle='#eaa34f';ctx.beginPath();ctx.arc(0,0,8,2,4.3);ctx.stroke();ctx.restore();
}
export default function Home(){
 const canvas=useRef<HTMLCanvasElement>(null), game=useRef(createGame()), keys=useRef(new Set<string>()), level=useRef('Club'), region=useRef<HTMLDivElement>(null);
 const [view,setView]=useState({...game.current}),[difficulty,setDifficulty]=useState('Club'),[help,setHelp]=useState(false);
 const sync=()=>setView({...game.current,score:[...game.current.score]});
 const start=()=>{if(game.current.status==='over')game.current=createGame();serve(game.current);sync();};
 const pause=()=>{if(game.current.status==='playing')game.current.status='paused';else if(game.current.status==='paused')game.current.status='playing';sync();};
 const reset=()=>{game.current=createGame();keys.current.clear();sync();};
 const changePlayer=()=>{switchPlayer(game.current);sync();};
 useEffect(()=>{let frame=0,last=0,acc=0;
 const snapshot=()=>({...game.current,players:game.current.players.map(p=>({...p})),ball:{...game.current.ball}});
 let previous=snapshot();
 const loop=(t:number)=>{
   const dt=last?Math.min((t-last)/1000,.1):0;last=t;acc+=dt;
   while(acc>=1/120){previous=snapshot();step(game.current,1/120,(keys.current.has('right')?1:0)-(keys.current.has('left')?1:0),keys.current.has('jump'),level.current,keys.current.has('attack'),keys.current.has('dive'));acc-=1/120;}
   const ctx=canvas.current?.getContext('2d');
   if(ctx){
     const alpha=acc*120, g=game.current;
     const lerp=(a:number,b:number)=>a+(b-a)*alpha;
     const rendered=g.status==='playing'&&previous.status==='playing'?{...g,
       ball:{...g.ball,x:lerp(previous.ball.x,g.ball.x),y:lerp(previous.ball.y,g.ball.y)},
       players:g.players.map((p,i)=>({...p,x:lerp(previous.players[i].x,p.x),y:lerp(previous.players[i].y,p.y),stride:lerp(previous.players[i].stride,p.stride)}))}:g;
     paint(ctx,rendered,t/1000);
   }
   setView(v=>v.status!==game.current.status||v.rally!==game.current.rally||v.active!==game.current.active?{...game.current,score:[...game.current.score]}:v);
   frame=requestAnimationFrame(loop);
 };frame=requestAnimationFrame(loop);
 const map=(k:string)=>['a','ArrowLeft'].includes(k)?'left':['d','ArrowRight'].includes(k)?'right':['w','ArrowUp',' '].includes(k)?'jump':k==='j'?'attack':k==='k'?'dive':'';
 const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('select,input')||(e.target as HTMLElement).closest('[role=dialog]'))return;const k=map(e.key.length===1?e.key.toLowerCase():e.key);if(k){e.preventDefault();keys.current.add(k);if(game.current.status==='ready')start();}if(e.key.toLowerCase()==='p'&&!e.repeat)pause();if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();changePlayer();}};const up=(e:KeyboardEvent)=>keys.current.delete(map(e.key.length===1?e.key.toLowerCase():e.key));const blur=()=>{keys.current.clear();if(game.current.status==='playing'){game.current.status='paused';sync();}};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
 const touch=(key:string)=>({onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key);},onPointerUp:()=>keys.current.delete(key),onPointerCancel:()=>keys.current.delete(key),onLostPointerCapture:()=>keys.current.delete(key)});
 return <main><header><a className="brand" href="/" aria-label="Shoreline home"><Volleyball size={30}/><span>shoreline<span className="brand-dot">.</span></span></a><nav><span className="nav-active">The court</span><button onClick={()=>{setHelp(true);if(game.current.status==='playing')pause();}}>How to play <ArrowUpRight size={14}/></button></nav><span className="edition">A LITTLE SUN. A LITTLE COMPETITION.</span></header>
 <section className="heading"><div><div className="eyebrow"><span/> THE BEACH IS CALLING</div><h1>Good days start<br className="mobile-break"/> with a <em>good rally.</em></h1><p>Leave your shoes. Bring your game.</p></div><div className="weather"><Sun size={25}/><div>Endless summer<small>28°C · A perfect day to play</small></div></div></section>
 <section className="game-shell" ref={region}><div className="game-toolbar"><div className="court-label"><span className="live-dot"/> BEACH VOLLEYBALL <span className="tag">2 VS 2</span></div><div className="tools"><button aria-label="Pause or resume game" onClick={pause}>{view.status==='paused'?<Play size={17}/>:<Pause size={17}/>}</button><button aria-label="Restart match" onClick={reset}><RotateCcw size={16}/></button><button aria-label="Toggle fullscreen" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void region.current?.requestFullscreen?.().catch(()=>{});}}><Maximize size={17}/></button></div></div>
 <div className="court"><canvas ref={canvas} width={1000} height={510} aria-label="Beach volleyball court. Use A and D to move, W or space to jump. E switches your teammate. Hold J to attack and K to dive."/><div className="scoreboard"><div><span className="you-dot"/> YOU <b>{view.score[0]}</b></div><span className="score-divider">:</span><div><b>{view.score[1]}</b> COAST <span className="cpu-dot"/></div><small>FIRST TO 11 · WIN BY 2</small></div><span className="location"><span/> PALM COVE, SOMEWHERE SUNNY</span>
 {view.status!=='playing'&&<div className="overlay"><div className="start-card"><span className="mini-label">{view.status==='paused'?'TAKE A BREATHER':view.status==='over'?'THAT’S A MATCH':view.score[0]+view.score[1]>0?'KEEP THE GOOD TIMES GOING':'YOUR DAILY DOSE OF VITAMIN SEA'}</span><h2>{view.status==='paused'?'Back in a splash.':view.message}</h2><p>{view.status==='paused'?'The court will be right here.':view.status==='over'?`${view.score[0]} – ${view.score[1]} · One more for the road?`:'Two on your side. Two across the net. Let’s rally.'}</p><button className="primary" onClick={view.status==='paused'?pause:start}>{view.status==='paused'?'Resume game':view.status==='over'?'Play again':view.score[0]+view.score[1]>0?'Next serve':'Let’s play'} <ArrowUpRight size={18}/></button><small>{view.status==='ready'?'or press space to serve':'Make yourself at home.'}</small></div></div>}
 {view.status==='playing'&&<span className="rally">{view.rally?`${view.shot} · ${view.rally} hits`:'Find the ball. Make it yours.'}</span>}</div>
 <div className="game-bottom"><span><Wind size={15}/> Player {view.active+1} · <button className="switch-player" onClick={changePlayer}>E · Switch</button></span><label>YOUR PACE <select aria-label="Computer difficulty" value={difficulty} onChange={e=>{setDifficulty(e.target.value);level.current=e.target.value;}}><option>Chill</option><option>Club</option><option>Pro</option></select></label></div></section>
 <div className="touch-controls"><div><button aria-label="Move left" {...touch('left')}><ArrowLeft/></button><button aria-label="Move right" {...touch('right')}><ArrowRight/></button></div><div><button onClick={changePlayer} aria-label="Switch controlled player">⇄</button><button {...touch('dive')}>Dive</button><button {...touch('attack')}>Hit</button><button {...touch('jump')}><ArrowUp/> Jump</button></div></div>
 <section className="instructions"><div><span className="instruction-number">01</span><div><h3>Find your feet</h3><p><kbd>A</kbd><kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd> to move</p></div></div><div><span className="instruction-number">02</span><div><h3>Get some air</h3><p><kbd>W</kbd> or <kbd>SPACE</kbd> to jump</p></div></div><div><span className="instruction-number">03</span><div><h3>Play as a pair</h3><p><kbd>E</kbd> switch · <kbd>J</kbd> attack · <kbd>K</kbd> dive</p></div></div></section>
 <footer><span>MADE FOR THE LOVE OF THE GAME.</span><span>Sand now. Hardwood later. <span className="soon">INDOOR COMING LATER <ChevronRight size={12}/></span></span></footer>
 <span className="sr-only" aria-live="polite">You {view.score[0]}, Coast {view.score[1]}. {view.status!=='playing'?view.message:''}</span>
 {help&&<div className="modal-backdrop"><section className="help" role="dialog" aria-modal="true" aria-label="How to play"><button className="close" aria-label="Close instructions" autoFocus onClick={()=>setHelp(false)}><X/></button><Volleyball size={32}/><h2>A little beach etiquette.</h2><p>Move with A/D or the arrow keys. Jump with W, ↑, or space. Press E to switch between your two players; the ring marks who you control. On a phone, use the buttons below the court.</p><p>Receive automatically, pass to your partner, then attack on the third touch. Hold J while jumping for an early attack. Press K to dive for a low ball. Your partner covers the court and sets you up. Each team has three touches; the same player cannot touch twice in a row.</p><p>Land the ball on Coast’s side to score. First to 11 wins, with a two-point lead. Press P to pause.</p><button className="primary" onClick={()=>setHelp(false)}>Got it. Let’s rally <ArrowUpRight size={18}/></button></section></div>}
 </main>;
}
