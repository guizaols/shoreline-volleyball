'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useOnline} from './useOnline';
import AchievementToast from '../AchievementToast';
import TouchControls from '../TouchControls';
import {readProgress} from '../../lib/cup';
import {footballEffects,effectUnlocked,newFootballProgress,readFootballProgress,recordFootball,armFootballSpecial,goal,newFootball,startFootball,shootFootball,diveFootball,jumpFootball,stepFootball,type Football} from '../../lib/gol';

function draw(ctx:CanvasRenderingContext2D,g:Football,beach:HTMLImageElement,name:string,trail:{x:number;y:number}[],reduced=false){
 ctx.clearRect(0,0,1000,620);
 if(beach.complete&&beach.naturalWidth)ctx.drawImage(beach,0,0,1000,620);
 else{ctx.fillStyle='#dbbd86';ctx.fillRect(0,0,1000,620);}
 const sand=ctx.createLinearGradient(0,110,0,530);sand.addColorStop(0,'#eacd99');sand.addColorStop(1,'#cfa36b');ctx.fillStyle=sand;ctx.fillRect(45,110,910,410);
 ctx.fillStyle='#87613718';for(let i=0;i<160;i++)ctx.fillRect(55+(i*167)%890,120+(i*53)%390,2,1);
 ctx.fillStyle='#0d3645';ctx.fillRect(45,91,910,18);ctx.fillRect(45,522,910,20);
 ctx.font='bold 10px sans-serif';ctx.fillStyle='#cce5da';for(let i=0;i<6;i++)ctx.fillText('SHORELINE  /  BEACH ARENA',65+i*150,535);
 ctx.strokeStyle='#fff3d380';ctx.lineWidth=2;ctx.beginPath();ctx.arc(500,315,66,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#fff3d370';ctx.font='900 27px sans-serif';ctx.textAlign='center';ctx.fillText('GOL A GOL',500,310);ctx.font='10px sans-serif';ctx.fillText('S H O R E L I N E',500,333);ctx.textAlign='left';
 ctx.strokeStyle='#fff7d8';ctx.lineWidth=3;ctx.strokeRect(70,115,860,400);
 ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(500,115);ctx.lineTo(500,515);ctx.stroke();ctx.setLineDash([]);
 for(const side of [0,1]){
  const x=side?930:30;ctx.fillStyle='#143e4933';ctx.fillRect(x,goal.top,40,190);ctx.strokeStyle='#c9e1da';
  ctx.lineWidth=1;for(let y=goal.top;y<=goal.bottom;y+=15){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40,y);ctx.stroke();}
  for(let col=x;col<=x+40;col+=10){ctx.beginPath();ctx.moveTo(col,goal.top);ctx.lineTo(col,goal.bottom);ctx.stroke();}
  ctx.lineWidth=9;ctx.strokeStyle='#21434b66';ctx.strokeRect(x+4,goal.top+5,40,190);
  ctx.lineWidth=6;ctx.strokeStyle='#faf9e5';ctx.strokeRect(x,goal.top,40,190);
  ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.moveTo(x,goal.top);ctx.lineTo(x+40,goal.top);ctx.stroke();
  ctx.lineWidth=2;ctx.strokeRect(side?790:70,185,140,260);
 }
 if(g.owner===0){
  ctx.strokeStyle='#ffe36b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(925,[240,315,390][g.aim],18,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#173e49';ctx.font='bold 12px sans-serif';ctx.fillText('ALVO',897,[240,315,390][g.aim]-24);
 }
 const effect=footballEffects.find(e=>e.id===g.effect)||footballEffects[0],effectColor=g.specialShot?'#fff078':g.lastShooter===0?effect.color:'#ffac86';
 if(trail.length>1&&!reduced){
  ctx.save();ctx.lineCap='round';ctx.shadowColor=effectColor;ctx.shadowBlur=g.effect==='classic'?0:12;
  for(let i=1;i<trail.length;i++){ctx.globalAlpha=i/trail.length*.65;ctx.strokeStyle=effectColor;ctx.lineWidth=i/trail.length*(g.specialShot?24:g.effect==='classic'?8:14);ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke();}
  ctx.restore();
 }
 g.players.forEach((p,i)=>{
  const speed=Math.hypot(p.vx,p.vy),stride=Math.sin(g.clock*15)*Math.min(10,speed/25),facing=i?-1:1,kick=Math.sin(p.kick/.32*Math.PI);
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='#513a2440';ctx.beginPath();ctx.ellipse(0,14,p.dive>0?35:22,10,0,0,Math.PI*2);ctx.fill();
  ctx.translate(0,-p.jump*.65);
  if(i===0){ctx.strokeStyle=g.owner===0?effect.color:'#5de7d3';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,14,27,12,0,0,Math.PI*2);ctx.stroke();}
  if(i===0&&g.charge>0){ctx.strokeStyle=effect.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-7,43,-Math.PI/2,-Math.PI/2+g.charge*Math.PI*2);ctx.stroke();}
  const defending=g.owner!==i, crouch=defending&&p.jump===0&&p.dive===0?6:0;
  const windup=g.owner===i?g.charge:0;
  ctx.translate(0,crouch);
  ctx.rotate(p.dive>0?Math.sign(p.vy)*1.35:p.vx/300*.08-facing*windup*.12);
  const skin=i?'#b97b50':'#d99e70';
  ctx.lineCap='round';ctx.lineJoin='round';
  const limb=(points:number[][],color:string,width:number)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  // Feet stay on the sand; the striking leg follows through toward the opposing goal.
  for(const side of [-1,1]){
   const striking=side===facing;
   const footX=side*(defending?17:10)+(striking?facing*(kick*35-windup*15):0);
   const footY=14-crouch+side*stride*(p.dive>0?.2:.65)-(striking?kick*18:0);
   const kneeX=side*11+(striking?facing*(kick*15-windup*10):0);
   limb([[side*7,-8],[kneeX,3],[footX,footY]],'#263e42',10);
   limb([[side*7,-8],[kneeX,3],[footX,footY]],skin,7);
   limb([[footX-3,footY],[footX+6*facing,footY]],skin,6);
   limb([[footX-2,footY+2],[footX+5*facing,footY+2]],'#a26b49',2);
  }
  ctx.fillStyle='#152d43';ctx.beginPath();ctx.roundRect(-14,-16,28,16,4);ctx.fill();
  limb([[-11,-12],[-11,-2]],i?'#ffb179':'#71e2cc',3);
  limb([[2,-5],[3,0]],'#091e30',3);
  for(const side of [-1,1]){
   const reaching=p.save>0||p.dive>0;
   const handY=p.jump>0?-65:reaching?-43:defending?-21:-18+side*stride*.5;
   const handX=p.dive>0?Math.sign(p.vy)*12+side*10:reaching?side*19:defending?side*28:side*22-facing*kick*12;
   limb([[side*12,-35],[side*21,-26],[handX,handY]],'#263e42',9);
   limb([[side*12,-35],[side*21,-26],[handX,handY]],skin,6);
   // Contrasting keeper gloves make catches distinct from volleyball touches.
   ctx.fillStyle='#f8eed7';ctx.strokeStyle='#284351';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.ellipse(handX,handY,5,6,side*.3,0,Math.PI*2);ctx.fill();ctx.stroke();
   limb([[handX-3,handY+3],[handX+3,handY+3]],i?'#ef8359':'#38cbb2',2);
  }
  const shirt=ctx.createLinearGradient(-15,-44,15,-15);
  shirt.addColorStop(0,i?'#ff9561':'#56dfc4');shirt.addColorStop(1,i?'#b83e34':'#08787d');
  ctx.fillStyle=shirt;ctx.strokeStyle='#1b4b52';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-9,-44);ctx.lineTo(-19,-36);ctx.lineTo(-15,-27);ctx.lineTo(-12,-29);ctx.lineTo(-13,-15);ctx.lineTo(13,-15);ctx.lineTo(12,-29);ctx.lineTo(15,-27);ctx.lineTo(19,-36);ctx.lineTo(9,-44);ctx.closePath();ctx.fill();ctx.stroke();
  limb([[-7,-43],[0,-38],[7,-43]],'#fff1c9',2);
  ctx.fillStyle='#fff1c9';ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.fillText(i?'9':'1',0,-21);
  ctx.fillStyle=skin;ctx.fillRect(-4,-49,8,8);ctx.beginPath();ctx.ellipse(0,-57,9,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=i?'#3c271e':'#28332d';ctx.beginPath();ctx.ellipse(-1,-63,9,6,-.1,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-9,-63,3,8);
  ctx.fillStyle='#293837';ctx.fillRect(facing*4-1,-59,2,2);ctx.fillStyle='#ab6e50';ctx.fillRect(facing*7,-56,3,3);
  ctx.restore();
  if(!reduced&&speed>80){ctx.fillStyle='#fbe0ac80';for(let j=0;j<5;j++){ctx.beginPath();ctx.arc(p.x-p.vx*.025-j*3,p.y+15+Math.sin(j*2+g.clock*7)*7,2+j*.5,0,Math.PI*2);ctx.fill();}}
  ctx.font='bold 11px sans-serif';ctx.textAlign='center';const label=i?'RIVAL':name;const width=ctx.measureText(label).width+16;
  ctx.fillStyle=i?'#903f37':'#124951';ctx.beginPath();ctx.roundRect(p.x-width/2,p.y+37,width,19,5);ctx.fill();ctx.fillStyle='#fff2d7';ctx.fillText(label,p.x,p.y+50);
 });
 if(g.impact.life>0){
  const phase=1-g.impact.life/.35;ctx.save();ctx.globalAlpha=1-phase;ctx.strokeStyle=g.impact.kind==='save'?'#71efd6':effectColor;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(g.impact.x,g.impact.y,12+phase*35,0,Math.PI*2);ctx.stroke();
  if(!reduced)for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.fillStyle=effectColor;ctx.fillRect(g.impact.x+Math.cos(a)*phase*50,g.impact.y+Math.sin(a)*phase*50,4,4);}
  ctx.restore();
 }
 if(g.status==='goal'&&!reduced){const phase=(1.2-g.delay)/1.2;for(let i=0;i<32;i++){ctx.fillStyle=[effect.color,'#fff2bb','#65dbca'][i%3];ctx.fillRect(70+(i*137)%860,120+phase*350+Math.sin(i)*45,4,9);}}
 const b=g.ball;ctx.fillStyle='#543b3340';ctx.beginPath();ctx.ellipse(b.x+3,b.y+7,11,7,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(0,-g.ballHeight*.65);ctx.fillStyle='#fff';ctx.strokeStyle='#25434a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,10,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#203d44';ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5+g.clock*3;const x=b.x+Math.cos(a)*5,y=b.y+Math.sin(a)*5;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
 ctx.restore();ctx.textAlign='left';
}
export default function GoalToGoal(){
 const canvas=useRef<HTMLCanvasElement>(null),game=useRef(newFootball()),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),held=useRef(false);
 const [view,setView]=useState(newFootball),[name,setName]=useState('Você');
 const progressRef=useRef(newFootballProgress()),[progress,setProgress]=useState(newFootballProgress),[saveError,setSaveError]=useState(''),[unlocks,setUnlocks]=useState<string[]>([]);
 const dismiss=useCallback(()=>setUnlocks(q=>q.slice(1)),[]);
 const persist=(next:ReturnType<typeof newFootballProgress>)=>{progressRef.current=next;setProgress(next);try{localStorage.setItem('shoreline-goal-progress-v1',JSON.stringify(next));setSaveError('');}catch{setSaveError('Não foi possível salvar neste navegador.');}};
 const equip=(id:string)=>{if(!effectUnlocked(progressRef.current,id))return;game.current.effect=id;persist({...progressRef.current,effect:id});sync();};
 const sync=()=>setView({...game.current,score:[...game.current.score]});
 const online=useOnline(game,sync);
 const [mobileTools,setMobileTools]=useState(false);
 const [copyMessage,setCopyMessage]=useState('Copiar convite');
 const copyInvite=async()=>{try{await navigator.clipboard.writeText(online.info.link);setCopyMessage('Link copiado!');}catch{setCopyMessage('Selecione o link para copiar');}};
 const action=(type:string,value?:unknown)=>{if(online.active.current){online.send({type:'action',action:type,value});return;}const g=game.current;if(type==='shoot')shootFootball(g);if(type==='dive')diveFootball(g,Number(value)||0);if(type==='jump')jumpFootball(g);if(type==='special')armFootballSpecial(g);if(type==='aim')g.aim=Number(value);if(type==='style')g.shotStyle=String(value);sync();};
 const press=()=>{if(online.active.current&&game.current.status==='ready')return;if(game.current.status==='ready'){startFootball(game.current);sync();return;}if(game.current.status==='playing'&&game.current.owner===0)held.current=true;};
 const release=()=>{if(held.current)action('shoot');held.current=false;sync();};
 const pause=()=>{held.current=false;if(online.active.current){keys.current.clear();stick.current={x:0,z:0};online.send({type:'input',x:0,y:0,charging:false});return;}game.current.charge=0;keys.current.clear();stick.current={x:0,z:0};if(game.current.status==='playing')game.current.status='paused';else if(game.current.status==='paused')game.current.status='playing';sync();};
 useEffect(()=>{
  let playerName='Você';try{playerName=readProgress(localStorage.getItem('shoreline-career-v2')).career.players[0].name;setName(playerName);}catch{}
  try{const saved=readFootballProgress(localStorage.getItem('shoreline-goal-progress-v1'));progressRef.current=saved;setProgress(saved);game.current.effect=saved.effect;}catch{setSaveError('Progresso disponível apenas nesta sessão.');}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trail:{x:number;y:number}[]=[];
  const ctx=canvas.current!.getContext('2d');if(!ctx)return;
  const beach=new Image();beach.src='/art/beach.png';
  let frame=0,last=0,accumulator=0,lastInput=0,lastView='';
  let display:Football|null=null;
  const animate=(time:number)=>{
   accumulator+=Math.min(.1,(time-last)/1000);last=time;
   while(!online.active.current&&accumulator>=1/120){
    stepFootball(game.current,1/120,stick.current.x+(keys.current.has('d')||keys.current.has('arrowright')?1:0)-(keys.current.has('a')||keys.current.has('arrowleft')?1:0),
     stick.current.z+(keys.current.has('s')||keys.current.has('arrowdown')?1:0)-(keys.current.has('w')||keys.current.has('arrowup')?1:0),held.current);accumulator-=1/120;
   }
   if(online.active.current&&time-lastInput>=33){lastInput=time;accumulator=0;online.send({type:'input',x:Math.max(-1,Math.min(1,stick.current.x+Number(keys.current.has('d')||keys.current.has('arrowright'))-Number(keys.current.has('a')||keys.current.has('arrowleft')))),y:Math.max(-1,Math.min(1,stick.current.z+Number(keys.current.has('s')||keys.current.has('arrowdown'))-Number(keys.current.has('w')||keys.current.has('arrowup')))),charging:held.current});}
   if(game.current.owner<0&&game.current.status==='playing'){trail.push({x:game.current.ball.x,y:game.current.ball.y-game.current.ballHeight*.65});if(trail.length>14)trail.shift();}else trail.length=0;
   if(online.active.current){
    const next=structuredClone(game.current);
    if(display&&display.status===next.status){
     const smooth=(a:number,b:number)=>Math.abs(a-b)>120?b:a+(b-a)*.45;
     next.players.forEach((p,i)=>{p.x=smooth(display!.players[i].x,p.x);p.y=smooth(display!.players[i].y,p.y);p.jump=smooth(display!.players[i].jump,p.jump);});
     if(display.owner===next.owner){next.ball.x=smooth(display.ball.x,next.ball.x);next.ball.y=smooth(display.ball.y,next.ball.y);next.ballHeight=smooth(display.ballHeight,next.ballHeight);}
    }
    display=next;draw(ctx,next,beach,playerName,trail,reduced);
   }else draw(ctx,game.current,beach,playerName,trail,reduced);
   if(!online.active.current&&game.current.status==='over'&&!game.current.recorded){
    const before=progressRef.current,next=recordFootball(before,game.current);
    const earned=footballEffects.filter(e=>!effectUnlocked(before,e.id)&&effectUnlocked(next,e.id));
    if(earned.length)setUnlocks(q=>[...q,...earned.map(e=>e.name)]);
    persist(next);
   }
   const g=game.current,signature=[g.status,g.score.join(),g.owner,g.aim,g.shotStyle,g.effect,g.energy,g.specialArmed,g.difficulty,Math.floor(g.charge*20),g.last].join(':');
   if(signature!==lastView){lastView=signature;sync();}
   frame=requestAnimationFrame(animate);
  };
  const down=(e:KeyboardEvent)=>{
   if((e.target as HTMLElement).closest('select,input,textarea'))return;
   const k=e.key.toLowerCase();
   if(k===' '&&(e.target as HTMLElement).closest('button,a'))return;
   if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','q','k','l','f','p'].includes(k))e.preventDefault();
   keys.current.add(k);
   if(!e.repeat){if(k===' ')press();if(k==='q')action('aim',(game.current.aim+1)%3);if(k==='k')action('dive',(keys.current.has('s')?1:0)-(keys.current.has('w')?1:0));if(k==='f'){action('special');sync();}if(k==='l')action('jump');if(k==='p')pause();}
  };
  const up=(e:KeyboardEvent)=>{keys.current.delete(e.key.toLowerCase());if(e.key===' ')release();};
  const blur=()=>{if(game.current.status==='playing')pause();else{held.current=false;keys.current.clear();stick.current={x:0,z:0};}};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 return <main className={`arcade-app football-app mobile-game ${mobileTools?'mobile-tools-open':''} ${['playing','goal'].includes(view.status)?'match-live':''}`}><section className="game-shell"><button className="mobile-tools-toggle" aria-label="Opções da partida" aria-expanded={mobileTools} onClick={()=>setMobileTools(v=>!v)}>{mobileTools?'Fechar ×':'☰'}</button><a className="mobile-exit" href="/">Sair da partida</a><div className="mobile-rotate-hint">Na horizontal, a quadra fica maior</div>
  <div className="game-toolbar"><a href="/">← Esportes</a><strong>GOL A GOL · AREIA</strong><select disabled={online.info.active} aria-label="Dificuldade" value={view.difficulty} onChange={e=>{game.current.difficulty=e.target.value;sync();}}><option value="arcade">Arcade · assistido</option><option value="pro">Pro</option></select><button disabled={online.info.active} onClick={e=>{pause();e.currentTarget.blur();}}>{view.status==='paused'?'Continuar':'Pausar'}</button></div>
  <div className="football-online">
   {!online.info.active?<button onClick={()=>online.connect('new')}>JOGAR COM AMIGO · CRIAR LINK</button>:<><strong>{online.info.error||`${online.info.players}/2 jogadores · Você joga à esquerda`}</strong>{online.info.link&&<label>Convite <input aria-label="Link de convite" readOnly value={online.info.link} onFocus={e=>e.target.select()}/></label>}<button onClick={copyInvite}>{copyMessage}</button><a href="/gol-a-gol">Sair da sala</a></>}
  </div>
  <div className="court football-court"><canvas ref={canvas} width={1000} height={620} aria-label="Gol a Gol: você protege o gol esquerdo. WASD move, espaço chuta, K mergulha."/>
   <div className="scoreboard"><div>{name}<b>{view.score[0]}</b></div><span>:</span><div><b>{view.score[1]}</b>RIVAL</div><small>PRIMEIRO A 5 GOLS</small></div>
   <div className="football-feedback" role="status">{view.owner===0?'SUA BOLA · MIRE E SEGURE PARA CHUTAR':view.owner===1?'PREPARE A DEFESA':view.last}</div>
   {!online.info.active&&['ready','over','paused'].includes(view.status)&&<div className="overlay"><div className="start-card"><span className="mini-label">SHORELINE · GOL A GOL</span><h2>{view.status==='over'?(view.score[0]===5?'A praia é sua!':'Hora da revanche!'):view.status==='paused'?'Pausa na areia':'DOMINE A ARENA.'}</h2><p>Mire direto ou use a tabela. Carregue, solte, comemore.<br/>Defesas, gols e tabelas carregam o Turbo. Ative no botão Turbo ou com F e solte um chute potente.</p><button className="primary" onClick={e=>{e.currentTarget.blur();setMobileTools(false);if(view.status==='paused')pause();else{const difficulty=game.current.difficulty;game.current=newFootball();game.current.difficulty=difficulty;game.current.effect=progressRef.current.effect;startFootball(game.current);held.current=false;sync();}}}>{view.status==='over'?'Revanche':view.status==='paused'?'Continuar':'Jogar'}</button></div></div>}
   {online.info.active&&(online.info.error||online.info.players<2||['ready','over'].includes(view.status))&&<div className="overlay"><div className="start-card"><span className="mini-label">PARTIDA COM AMIGO</span><h2>{online.info.error?'Conexão encerrada':online.info.players<2?'Convide seu amigo':view.status==='over'?(view.score[0]===5?'Você venceu!':'Boa partida!'):'Todos na arena!'}</h2><p>{online.info.error|| (online.info.players<2?'Compartilhe o link acima. A partida começa quando os dois estiverem prontos.':online.info.ready?'Esperando seu amigo ficar pronto.':'Primeiro a 5 gols. Os dois confirmam para começar.')}</p>{!online.info.error&&<button className="primary" disabled={online.info.players<2||online.info.ready} onClick={()=>online.send({type:'ready'})}>{view.status==='over'?'Quero revanche':'Estou pronto'}</button>}</div></div>}
   {view.status==='goal' &&<div className="football-goal" role="status">{view.message}</div>}
  </div>
  {unlocks[0]&&<AchievementToast key={unlocks[0]} title={`Efeito ${unlocks[0]}`} onDone={dismiss}/>}
  <div className="shot-bar"><button className="football-special" style={{background:`linear-gradient(90deg, #99712c ${view.energy}%, #28535b ${view.energy}%)`}} disabled={view.energy<100||view.owner!==0||view.status!=='playing'} aria-pressed={view.specialArmed} onClick={e=>{action('special');sync();e.currentTarget.blur();}}>{view.specialArmed?'TURBO ARMADO · CHUTE!':view.energy>=100?'ATIVAR TURBO · F':`TURBO · ${view.energy}%`}</button><div className="football-shot-types">{[['direct','Direto'],['top','Tabela ↑'],['bottom','Tabela ↓'],['curve-up','Curva ↑'],['curve-down','Curva ↓'],['lob','Cobertura']].map(([style,label])=><button key={style} aria-pressed={view.shotStyle===style} onClick={e=>{action('style',style);setMobileTools(false);sync();e.currentTarget.blur();}}>{label}</button>)}</div><small>{view.owner===0?'ESCOLHA O CANTO · SEGURE E SOLTE CHUTAR':'DEFESA AUTOMÁTICA AO ALCANÇAR A BOLA'}</small><div>{['Canto ↑','Centro','Canto ↓'].map((label,i)=><button key={i} aria-pressed={view.aim===i} onClick={e=>{action('aim',i);sync();e.currentTarget.blur();}}>{label}</button>)}<button onClick={e=>{action('dive',stick.current.z);e.currentTarget.blur();}} disabled={view.status!=='playing'||view.owner===0}>Mergulhar · K</button><button disabled={view.status!=='playing'||view.owner===0} onClick={e=>{action('jump');e.currentTarget.blur();}}>Pular · L</button><button className="desktop-kick" disabled={view.status!=='playing'||view.owner!==0}
 onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press();}} onPointerUp={release}
 onPointerCancel={()=>{held.current=false;game.current.charge=0;}} onLostPointerCapture={()=>{held.current=false;}}
 onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)press();}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release();}}}>Segure e solte · Chutar</button></div>
 <meter className="football-power" min={0} max={1} value={view.charge} aria-label="Força do chute"/><small>{Math.round(view.charge*100)}% · FORÇA</small></div>
  <TouchControls flat onMove={(x,z)=>{stick.current={x,z};}} onPress={()=>{if(game.current.status==='playing'&&game.current.owner!==0){action(game.current.ballHeight>50?'jump':'dive',stick.current.z);return;}press();}} onRelease={release} onAim={()=>{action('aim',(game.current.aim+1)%3);sync();}} label={view.owner===0?'Chutar':'Defender'} charge={view.charge} enabled={view.status==='playing'}/>
  <p className="football-help">WASD / setas: mover · Espaço: segurar e soltar para chutar · Q: alvo · K: mergulhar · L: pular · A/D: avançar e recuar · F: armar especial · P: pausa</p>
 </section>
 <section className="football-club" aria-label="Desafios e efeitos"><div className="football-club-heading"><div><small>SEU CAMINHO NA AREIA</small><h2>Jogue. Conquiste. Brilhe.</h2></div><p>{progress.wins} vitórias · {progress.goals} gols · {progress.saves} defesas</p></div>
 <p>Efeitos visuais equipáveis. As conquistas são salvas ao terminar a partida.</p>
 <div className="football-unlocks">{footballEffects.map(effect=>{const unlocked=effectUnlocked(progress,effect.id);return <button key={effect.id} disabled={!unlocked} aria-pressed={progress.effect===effect.id} onClick={e=>{equip(effect.id);e.currentTarget.blur();}}>
 <span className="effect-orb" style={{background:effect.color,boxShadow:`0 0 24px ${effect.color}88`}}/><strong>{effect.name}</strong><small>{effect.description}</small><span>{unlocked?(progress.effect===effect.id?'EQUIPADO':'EQUIPAR'):`${Math.min(progress[effect.metric],effect.target)}/${effect.target}`}</span></button>;})}</div>
 <p role="status">{saveError}</p></section></main>;
}
