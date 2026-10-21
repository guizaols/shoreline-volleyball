export type SoundKind='foot'|'chest'|'head'|'hand'|'spike'|'racket'|'kick'|'special'|'point'|'step'|'land'|'dive';
// What a scene's athletes expose for movement sounds (every sport's runner has these).
type Mover={vx:number;vz:number;vy:number;stride:number;landing:number;action:string};
// [wave, start Hz, end Hz, seconds, gain, noise mix]: one short synthesized voice per kind of contact.
const voices:Record<Exclude<SoundKind,'point'|'step'|'land'|'dive'>,[OscillatorType,number,number,number,number,number]>={
 foot:['sine',190,70,.09,.09,0],chest:['sine',120,55,.12,.1,.25],head:['sine',330,130,.07,.08,0],
 hand:['triangle',260,140,.05,.05,.6],spike:['triangle',200,80,.08,.08,.9],racket:['square',640,380,.05,.03,.35],
 kick:['sine',150,42,.15,.13,.5],special:['triangle',880,110,.28,.07,0],
};
export function matchAudio(parent:HTMLElement){
 let context:AudioContext|undefined,noiseBuffer:AudioBuffer|undefined,crowd:GainNode|undefined,enabled=true,music=true,disposed=false,beat:ReturnType<typeof setInterval>|undefined;
 const seen:{action:string;landing:number;step:number}[]=[];
 const button=document.createElement('button');button.className='match-sound';
 // One button cycles: sound and music → effects only → off.
 const label=()=>{button.textContent=!enabled?'Som desligado':music?'Som e música':'Só efeitos';button.setAttribute('aria-pressed',String(enabled));};
 try{const saved=localStorage.getItem('shoreline-sound');enabled=saved!=='off';music=saved!=='fx';}catch{/* Storage is optional. */}
 label();parent.appendChild(button);
 const unlock=()=>{if(!enabled||disposed)return;try{if(!context){context=new AudioContext();arena(context);band(context);}void context.resume().catch(()=>{});}catch{/* Audio is optional. */}};
 button.addEventListener('click',()=>{
  if(!enabled){enabled=true;music=true;}else if(music)music=false;else enabled=false;
  label();try{localStorage.setItem('shoreline-sound',!enabled?'off':music?'on':'fx');}catch{/* Keep the session preference. */}if(!enabled)void context?.suspend().catch(()=>{});unlock();
 });
 parent.addEventListener('pointerdown',unlock);parent.addEventListener('keydown',unlock);
 const tone=(ctx:AudioContext,type:OscillatorType,from:number,to:number,duration:number,volume:number,at=0,out:AudioNode=ctx.destination)=>{
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+at;
  oscillator.type=type;oscillator.frequency.setValueAtTime(from,time);oscillator.frequency.exponentialRampToValueAtTime(to,time+duration);
  gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration+.03);
  oscillator.connect(gain);gain.connect(out);oscillator.start(time);oscillator.stop(time+duration+.04);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 };
 const noiseOf=(ctx:AudioContext)=>{
  if(!noiseBuffer){noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  return noiseBuffer;
 };
 // The arena under the game: waves rolling in (low noise swelling every ~11 s) and a murmuring crowd that roars on points.
 const arena=(ctx:AudioContext)=>{
  const loop=(frequency:number,type:BiquadFilterType,volume:number)=>{const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noiseOf(ctx);source.loop=true;filter.type=type;filter.frequency.value=frequency;gain.gain.value=volume;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();return gain;};
  const waves=loop(450,'lowpass',.014),swell=ctx.createOscillator(),depth=ctx.createGain();swell.frequency.value=.09;depth.gain.value=.011;swell.connect(depth);depth.connect(waves.gain);swell.start();
  crowd=loop(1000,'bandpass',.004);
 };
  // Beach music, played live by a tiny band: a bossa/samba groove at 112 BPM over C△7 · Am7 · Dm7 · G7, with
 // surdo on beats 2 and 4, a shaker on every sixteenth, bossa chord stabs, a walking bass and a short whistled tune.
 const band=(ctx:AudioContext)=>{
  const bus=ctx.createGain();bus.gain.value=.55;bus.connect(ctx.destination);
  const hz=(midi:number)=>440*2**((midi-69)/12),sixteenth=60/112/4;
  const chords=[[48,60,64,67,71],[45,57,60,64,67],[50,57,60,62,65],[43,55,59,62,65]];
  const tune:Record<number,number>={0:72,3:69,6:67,8:69,16:64,19:67,22:69,26:67,32:65,35:69,38:72,42:74,48:71,52:67,56:62};
  let step=0,next=ctx.currentTime+.1;
  const play=(n:number,at:number)=>{
   const when=at-ctx.currentTime,s=n%16,[root,...chord]=chords[Math.floor(n/16)%4];
   noise(ctx,.04,s%4===2?.02:.009,6000,'highpass',when,bus);
   if(s===4||s===12)tone(ctx,'sine',s===12?95:80,48,.22,s===12?.16:.1,when,bus);
   const bass=({0:0,6:7,8:12,14:7} as Record<number,number>)[s];if(bass!==undefined)tone(ctx,'triangle',hz(root-12+bass),hz(root-12+bass),.18,.09,when,bus);
   if([0,3,6,10,13].includes(s))for(const note of chord)tone(ctx,'triangle',hz(note),hz(note),.12,.012,when,bus);
   const melody=tune[n%64];if(melody)tone(ctx,'sine',hz(melody),hz(melody)*.995,.24,.035,when,bus);
  };
  // Look-ahead scheduling: every 25 ms, queue the notes of the next 120 ms.
  beat=setInterval(()=>{
   if(ctx.state!=='running')return;if(next<ctx.currentTime)next=ctx.currentTime+.05;
   while(next<ctx.currentTime+.12){if(music)play(step,next);step++;next+=sixteenth;}
  },25);
 };
 const noise=(ctx:AudioContext,duration:number,volume:number,frequency:number,type:BiquadFilterType,at=0,out:AudioNode=ctx.destination)=>{
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),time=ctx.currentTime+at;
  source.buffer=noiseOf(ctx);filter.type=type;filter.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+Math.min(.01,duration/3));gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(gain);gain.connect(out);source.start(time);source.stop(time+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 };
 return {
  play(kind:SoundKind,perfect=false){
   if(!enabled||!context||context.state!=='running')return;
   if(kind==='point'){tone(context,'sine',660,660,.1,.05);tone(context,'sine',990,990,.14,.05,.1);noise(context,.7,.03,700,'lowpass',.05);
    if(crowd){const now=context.currentTime;crowd.gain.cancelScheduledValues(now);crowd.gain.setValueAtTime(crowd.gain.value,now);crowd.gain.linearRampToValueAtTime(.035,now+.25);crowd.gain.linearRampToValueAtTime(.004,now+2);}return;}
   // Sand: a soft crunch per step, a thump on landing, a long scrape on a dive.
   if(kind==='step'){noise(context,.045,.012,1800+Math.random()*1400,'highpass');return;}
   if(kind==='land'){tone(context,'sine',110,50,.1,.06);noise(context,.12,.035,600,'lowpass');return;}
   if(kind==='dive'){tone(context,'sine',90,40,.12,.07);noise(context,.3,.06,900,'lowpass');return;}
   const [type,from,to,duration,volume,mix]=voices[kind];
   tone(context,type,from,to,duration,volume);
   if(mix)noise(context,.05,volume*mix,kind==='chest'?500:1800,kind==='chest'?'lowpass':'highpass');
   if(perfect)tone(context,'sine',1320,1320,.1,.04,.02);
  },
  // Call every frame with the scene's athletes: steps for the one you control, landings and dives for everyone.
  moves(players:Mover[],you:number){
   players.forEach((p,i)=>{
    const was=seen[i]??={action:p.action,landing:p.landing,step:0},step=Math.floor(p.stride/Math.PI);
    if(p.action==='dive'&&was.action!=='dive')this.play('dive');else if(p.landing>0&&was.landing<=0)this.play('land');
    if(i===you&&step!==was.step&&!p.vy&&Math.hypot(p.vx,p.vz)>45)this.play('step');
    was.action=p.action;was.landing=p.landing;was.step=step;
   });
  },
  destroy(){disposed=true;clearInterval(beat);parent.removeEventListener('pointerdown',unlock);parent.removeEventListener('keydown',unlock);button.remove();if(context)void context.close().catch(()=>{});}
 };
}
