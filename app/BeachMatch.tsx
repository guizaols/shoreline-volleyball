'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import TouchControls from './TouchControls';
import {rivals} from '../lib/rivals';
import {createNetMatch,beginServe,pressNet,releaseNet,netGuide,type NetSport} from '../lib/net';
import {createSoccer,startSoccer,shootSoccer,passSoccer,tackleSoccer,firstTimeSoccer,chapeuSoccer} from '../lib/soccer';
import {armSpecial,cancelArcadeInput,specialName} from '../lib/arcade';
import {cycleAim} from '../lib/game';
import {BEACH_PROGRESS_KEY,bestSkin,readBeachProgress,recordBeachMatch} from '../lib/beach-progress';

type MatchOptions={rival?:number;goal?:number;day?:number;circuit?:boolean};
const readSaved=()=>{try{return localStorage.getItem(BEACH_PROGRESS_KEY);}catch{return null;}};
export default function BeachMatch({sport,rival:rivalIndex,goal,day,circuit=false}:{sport:NetSport|'soccer'}&MatchOptions){
 // The first rival is fixed (by the link, or per sport) so server and browser renders match (hydration); later free matches draw a random one.
 const fresh=useCallback((pick=Math.floor(Math.random()*rivals.length))=>{const r=rivals[rivalIndex??pick],g=sport==='soccer'?createSoccer(r):createNetMatch(sport,r);return g;},[sport,rivalIndex]);
 const firstRival=rivalIndex??sport.length%rivals.length;
 const [notes,setNotes]=useState<string[]>([]);
 // Contextual tips for the moves nobody finds on their own, during a player's first matches on this device.
 const [tips]=useState(()=>readBeachProgress(readSaved()).matches<5);
 const game=useRef(fresh(firstRival)),host=useRef<HTMLDivElement>(null),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),level=useRef('Club');
 const recorded=useRef(new WeakSet<object>());
 const [view,setView]=useState(()=>fresh(firstRival)),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[tools,setTools]=useState(false);
 const sync=useCallback(()=>setView({...game.current,score:[...game.current.score],...(game.current.sport==='soccer'?{}:{points:[...game.current.points]})}),[]);
 const clear=useCallback(()=>{keys.current.clear();stick.current={x:0,z:0};cancelArcadeInput(game.current);if(game.current.sport==='soccer')game.current.pendingKick='';},[]);
 const start=useCallback(()=>{clear();setNotes([]);if(game.current.status==='over')game.current=fresh();if(game.current.sport==='soccer')startSoccer(game.current);else beginServe(game.current);sync();},[clear,fresh,sync]);
 const pause=useCallback(()=>{clear();const g=game.current;if(g.status==='paused')g.status=g.resumeStatus;else if(g.status==='playing'||g.status==='tossing'||g.status==='ready'&&g.restartDelay>0){g.resumeStatus=g.status;g.status='paused';}sync();},[clear,sync]);
 const aim=useCallback(()=>{const g=game.current;if(g.sport==='soccer'){g.aimPreset=(g.aimPreset+1)%3;g.aim={x:965,z:[175,225,275][g.aimPreset]};}else cycleAim(g);sync();},[sync]);
 const special=useCallback(()=>{armSpecial(game.current);sync();},[sync]);
 const movement=useCallback(()=>({x:stick.current.x+Number(keys.current.has('d')||keys.current.has('arrowright'))-Number(keys.current.has('a')||keys.current.has('arrowleft')),z:stick.current.z+Number(keys.current.has('s')||keys.current.has('arrowdown'))-Number(keys.current.has('w')||keys.current.has('arrowup'))}),[]);
 const play=useCallback((source='j')=>{const g=game.current;keys.current.add(source);if(g.sport==='soccer'){if(!firstTimeSoccer(g,movement())&&(g.owner<0||g.owner>=3))tackleSoccer(g);}else pressNet(g,movement());sync();},[movement,sync]);
 const choose=useCallback((index:number)=>{game.current.attackStyle=(['power','roll','tip'] as const)[index];sync();},[sync]);
 const release=useCallback((cancelled=false,key='j')=>{
  const held=keys.current.delete(key),g=game.current;
  if(cancelled){cancelArcadeInput(g);if(g.sport==='soccer')g.pendingKick='';return;}
  if(!held||['j','f','touch'].some(k=>keys.current.has(k)))return;if(g.sport==='soccer'){if(g.owner>=0&&g.owner<3)shootSoccer(g,movement());}else releaseNet(g,movement());
 },[movement]);
 const alternate=useCallback((source='f')=>{const g=game.current;if(g.sport==='soccer'){const m=movement();if(g.owner>=0&&g.owner<3){if(!(Math.abs(m.x)<.2&&Math.abs(m.z)<.2&&chapeuSoccer(g)))passSoccer(g,m);}else tackleSoccer(g);sync();return;}g.attackStyle=g.sport==='tennis'?'roll':'tip';keys.current.add(source);pressNet(g,movement());sync();},[movement,sync]);
 // Save records, circuit and daily challenge once per finished match.
 useEffect(()=>{
  const g=game.current;if(view.status!=='over'||recorded.current.has(g))return;recorded.current.add(g);
  const {progress,notes:earned}=recordBeachMatch(readBeachProgress(readSaved()),{won:g.score[0]>g.score[1],perfects:g.perfects,specials:g.specials,circuit,challenge:day!==undefined&&goal!==undefined?{day,goal}:undefined});
  try{localStorage.setItem(BEACH_PROGRESS_KEY,JSON.stringify(progress));}catch{/* Records are optional. */}
  setNotes([`Perfeitos nesta partida: ${g.perfects}`,...earned]);
 },[view.status,circuit,day,goal]);
 useEffect(()=>{
  let disposed=false,engine:{destroy:(removeCanvas:boolean)=>void}|undefined;
  // The scene builds the ball once, so the unlocked skin is set before mounting.
  game.current.ballSkin=bestSkin(readBeachProgress(readSaved()));
  import('../lib/beach-scene').then(({mountBeach})=>{if(!disposed&&host.current)engine=mountBeach(host.current,()=>game.current,()=>({...movement(),prepare:['j','f','touch'].some(key=>keys.current.has(key)),jump:keys.current.has(' ')}),()=>level.current,sync,()=>setLoaded(true),setError);}).catch(()=>setError('Não foi possível abrir a quadra. Recarregue a página.'));
  const down=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement;
   if(target.closest('input,select,textarea,[contenteditable=true]')||target.closest('button,a')&&[' ','Enter'].includes(event.key))return;
   const key=event.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','q','e','f','p','k','1','2','3'].includes(key))return;
   event.preventDefault();if(event.repeat)return;
   if(key==='k'){special();return;}if(key==='p'){pause();return;}if(key==='q'){aim();return;}if(key==='f'){alternate();return;}
   if(['1','2','3'].includes(key)){choose(Number(key)-1);return;}if(key==='j'){play();return;}
   if(key==='e'){game.current.active=game.current.sport==='soccer'?(game.current.active+1)%3:1-game.current.active;game.current.autoSwitch=false;sync();return;}
   if(key===' '&&['ready','over'].includes(game.current.status)){start();return;}keys.current.add(key);
  };
  const up=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='f'&&game.current.sport!=='soccer')release(false,e.key.toLowerCase());else keys.current.delete(e.key.toLowerCase());};
  const blur=()=>{clear();if(game.current.status==='playing'||game.current.status==='ready'&&game.current.restartDelay>0){game.current.resumeStatus=game.current.status;game.current.status='paused';sync();}};
  const hidden=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  return()=>{disposed=true;engine?.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
 },[sport,clear,start,pause,aim,alternate,release,special,sync,movement,play,choose]);
 const charge=view.shotWindow>0?view.shotCharge:view.charge;
 const title=sport==='footvolley'?'FUTEVÔLEI':sport==='tennis'?'BEACH TENNIS':'BEACH SOCCER';
 const rival='rivalName' in view?view.rivalName:'PRAIA';
 const me=view.players[view.active],guide=view.sport==='soccer'||!me?undefined:netGuide(view);
 const tip=!tips||view.status!=='playing'||!me?'':view.sport==='soccer'?(view.owner<0&&view.passReceiver===view.active?'Passe vindo: A = chute de primeira':view.owner===view.active&&Math.hypot(me.vx,me.vz)<60?'Parado com a bola: B = chapéu, depois A':''):view.sport==='footvolley'?(view.lastTeam===0&&view.touches===2?'3º toque: salte colado na rede + A = shark attack':''):guide&&guide.team===0&&guide.time<.5&&Math.hypot(guide.x-me.x,guide.z-me.z)>90?'Bola longe: A = mergulho':'';
 const defending=view.sport==='soccer'&&(view.owner<0||view.owner>=3)&&!(view.owner<0&&view.passReceiver===view.active);
 const shots=sport==='tennis'?['Voleio','Lob','Curta']:sport==='soccer'?['Direto','Cobertura']:['Cabeçada','Colocada','Curta'];
 return <main className={`arcade-app beach-match mobile-game ${tools?'mobile-tools-open':''} ${view.status==='playing'||view.restartDelay>0?'match-live':''}`}>
  <section className="game-shell">
   <button className="mobile-tools-toggle" aria-label="Opções da partida" aria-expanded={tools} onClick={()=>setTools(!tools)}>{tools?'Fechar ×':'☰'}</button><Link className="mobile-exit" href="/">Escolher esporte</Link>
   <div className="game-toolbar"><strong>{title} · {sport==='soccer'?'3 × 3 ARCADE':'DUPLAS'}</strong><div className="tools"><Link href="/">Esportes</Link><button onClick={pause} disabled={!['playing','paused'].includes(view.status)&&!view.restartDelay}>{view.status==='paused'?'Continuar':'Pausar'}</button><button onClick={()=>{clear();game.current=fresh();sync();}}>Reiniciar</button><label>Dificuldade <select defaultValue="Club" onChange={e=>{level.current=e.target.value;}}><option value="Chill">Tranquilo</option><option value="Club">Clube</option><option value="Pro">Profissional</option></select></label></div></div>
   <div className="court"><figure ref={host} className="phaser-court" aria-label={`Quadra de ${title}. WASD move e mira, J golpeia, F faz o golpe alternativo, K especial, espaço salta, P pausa.`}/>
    <div className="scoreboard"><div>VOCÊ <b>{view.sport==='tennis'&&view.status!=='over'?[0,15,30,40][view.points[0]]:view.score[0]}</b></div><span>:</span><div><b>{view.sport==='tennis'&&view.status!=='over'?[0,15,30,40][view.points[1]]:view.score[1]}</b> {rival}</div><small>{view.sport==='tennis'?`${view.score[0]} : ${view.score[1]} GAMES · ATÉ 3 GAMES · PONTO DECISIVO`:view.sport==='soccer'?'PRIMEIRO A 5 GOLS · 3 × 3':'ATÉ 7 · VANTAGEM DE 2'}</small></div>
    <span className="location">PALM COVE · {title}</span>
    {(!loaded||error||view.status!=='playing'&&view.status!=='tossing'&&!(view.status==='ready'&&view.restartDelay>0))&&<div className="overlay"><div className="start-card"><span className="mini-label">SHORELINE · {title}</span><h2>{error||(!loaded?'Preparando a praia…':view.status==='over'?(view.score[0]>view.score[1]?'Seu time venceu!':'Boa partida!'):view.status==='paused'?'Partida pausada':view.contactSerial>0?view.message:sport==='tennis'?'Uma rebatida. Toda a quadra.':sport==='soccer'?'Toque, avance, marque.':'Pé, peito e cabeça.')}</h2>{view.status==='over'&&notes.map(note=><p className="progress-note" key={note}>{note}</p>)}{view.status!=='over'&&goal!==undefined&&<p className="progress-note">DESAFIO DO DIA: vença com {goal} golpes perfeitos</p>}{view.status!=='over'&&circuit&&<p className="progress-note">CIRCUITO DE PRAIA: vença para avançar</p>}{'rivalHint' in view&&view.rivalHint&&view.contactSerial===0&&<p><strong>Rival: {rival}.</strong> {view.rivalHint}</p>}<p>{sport==='soccer'?'J/A chuta; F/B passa. O direcional escolhe o lado. Sem a bola, o botão dá o bote.':sport==='tennis'?'J/A rebate; F/B faz o lob. Chegue ao círculo e toque perto da bola. O direcional coloca o golpe.':'J/A recebe e finaliza; F/B faz a curta. Toque perto da bola. O parceiro prepara o ataque.'} Segure e solte para mais força. Espaço/↑ salta. Boas jogadas carregam K/★ para o especial.</p><button className="primary" disabled={!loaded||!!error} onClick={view.status==='paused'?pause:start}>{view.status==='paused'?'Continuar':view.status==='over'?'Revanche':view.contactSerial>0?sport==='soccer'?'Repor a bola':'Próximo saque':'Jogar agora'}</button></div></div>}
    {view.status==='ready'&&view.restartDelay>0&&<output className="restart-feedback">{view.message}<small>{sport==='soccer'?'Reposição':'Próximo saque'} em {Math.ceil(view.restartDelay)}…</small></output>}
    {tip&&<output className="play-tip">{tip}</output>}{view.status==='tossing'&&<output className="restart-feedback">SAQUE<small>Toque Jogar no alto da bola</small></output>}
    {view.status==='playing'&&view.feedbackTime>0&&<output className={`contact-feedback ${view.feedback.includes('PERFEITO')?'is-perfect':''}`}>{view.feedback}<small>{view.contactHint}</small></output>}
   {loaded&&(view.status==='playing'||view.status==='ready'&&view.restartDelay>0)&&<div className="arcade-hud">
    <div className="arcade-power"><span>FORÇA <b>{Math.round(charge*100)}%</b> · {charge>.85?'NO LIMITE':charge>.65?'MIRA INSTÁVEL':'CONTROLE'}</span><meter className="sr-only" aria-label="Força; acima de 65% perde precisão" min={0} max={100} value={Math.round(charge*100)}/><div className="arcade-power-track" aria-hidden="true"><i style={{left:`${Math.min(98,charge*100)}%`}}/></div><small>{view.combo[0]>=3?`EM CHAMAS · COMBO ×${view.combo[0]}`:view.combo[0]>0?`COMBO ×${view.combo[0]} · CONTINUE!`:'TOQUE PARA GOLPEAR · SEGURE E SOLTE PARA FORÇA'}</small></div>
    <button className={`arcade-special ${view.energy[0]>=100?'is-ready':''}`} onClick={special} aria-pressed={view.specialArmed} disabled={view.status!=='playing'||view.energy[0]<100} aria-label={`Especial ${specialName(sport)}, ${Math.round(view.energy[0])}%`} style={{background:`linear-gradient(90deg,#986326 ${view.energy[0]}%,#173f50 ${view.energy[0]}%)`}}><b>{view.specialArmed?'ARMADO!':view.energy[0]>=100?'ESPECIAL · K':`${Math.round(view.energy[0])}%`}</b><small>{specialName(sport)}</small></button>
    <span className="arcade-rival">{rival} · ESPECIAL {Math.round(view.energy[1])}%</span>
   </div>}
   </div>
   {loaded&&view.status==='playing'&&<div className="shot-bar beach-shots" aria-label="Escolher golpe"><div>{shots.map((label,i)=><button key={label} aria-pressed={view.attackStyle===(['power','roll','tip'] as const)[i]} onClick={()=>choose(i)}><kbd>{i+1}</kbd>{label}</button>)}</div></div>}
   <TouchControls onMove={(x,z)=>{stick.current={x,z};}} onPress={()=>play('touch')} onRelease={cancelled=>release(cancelled,'touch')} onAim={aim} onJump={held=>{if(held)keys.current.add(' ');else keys.current.delete(' ');}} onAlternate={()=>alternate('touch')} alternateLabel={sport==='soccer'?defending?'Desarmar':'Passar':sport==='tennis'?'Lob':'Curta'} label={sport==='soccer'?defending?'Desarmar':'Chutar':view.attackStyle==='roll'?'Lob':view.attackStyle==='tip'?'Curta':sport==='tennis'?'Voleio':'Jogar'} charge={charge} enabled={loaded&&!error&&view.status==='playing'}/>
   <div className="game-bottom"><span>WASD mover · J {sport==='soccer'?'chutar/desarmar':'jogar'} · K especial · F {sport==='soccer'?'passe/desarme':sport==='tennis'?'lob':'curta'} · 1/2/3 golpe · Espaço saltar · E trocar</span><button onClick={()=>{game.current.autoSwitch=!game.current.autoSwitch;sync();}}>Troca {view.autoSwitch?'automática':'manual'}</button></div>
   <span className="sr-only" aria-live="polite">Você {view.score[0]}, Praia {view.score[1]}.</span>
  </section>
 </main>;
}
