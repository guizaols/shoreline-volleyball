export type SoundKind='foot'|'chest'|'head'|'hand'|'spike'|'racket'|'kick'|'special'|'point';
// [wave, start Hz, end Hz, seconds, gain, noise mix]: one short synthesized voice per kind of contact.
const voices:Record<Exclude<SoundKind,'point'>,[OscillatorType,number,number,number,number,number]>={
 foot:['sine',190,70,.09,.09,0],chest:['sine',120,55,.12,.1,.25],head:['sine',330,130,.07,.08,0],
 hand:['triangle',260,140,.05,.05,.6],spike:['triangle',200,80,.08,.08,.9],racket:['square',640,380,.05,.03,.35],
 kick:['sine',150,42,.15,.13,.5],special:['triangle',880,110,.28,.07,0],
};
export function matchAudio(parent:HTMLElement){
 let context:AudioContext|undefined,noiseBuffer:AudioBuffer|undefined,enabled=true,disposed=false;
 const button=document.createElement('button');button.className='match-sound';
 const label=()=>{button.textContent=enabled?'Som ligado':'Som desligado';button.setAttribute('aria-pressed',String(enabled));};
 try{enabled=localStorage.getItem('shoreline-sound')!=='off';}catch{/* Storage is optional. */}
 label();parent.appendChild(button);
 const unlock=()=>{if(!enabled||disposed)return;try{context??=new AudioContext();void context.resume().catch(()=>{});}catch{/* Audio is optional. */}};
 button.addEventListener('click',()=>{enabled=!enabled;label();try{localStorage.setItem('shoreline-sound',enabled?'on':'off');}catch{/* Keep the session preference. */}unlock();});
 parent.addEventListener('pointerdown',unlock);parent.addEventListener('keydown',unlock);
 const tone=(ctx:AudioContext,type:OscillatorType,from:number,to:number,duration:number,volume:number,at=0)=>{
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+at;
  oscillator.type=type;oscillator.frequency.setValueAtTime(from,time);oscillator.frequency.exponentialRampToValueAtTime(to,time+duration);
  gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration+.03);
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(time);oscillator.stop(time+duration+.04);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 };
 const noise=(ctx:AudioContext,duration:number,volume:number,frequency:number,type:BiquadFilterType,at=0)=>{
  if(!noiseBuffer){noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),time=ctx.currentTime+at;
  source.buffer=noiseBuffer;filter.type=type;filter.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+Math.min(.01,duration/3));gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(time);source.stop(time+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 };
 return {
  play(kind:SoundKind,perfect=false){
   if(!enabled||!context||context.state!=='running')return;
   if(kind==='point'){tone(context,'sine',660,660,.1,.05);tone(context,'sine',990,990,.14,.05,.1);noise(context,.7,.03,700,'lowpass',.05);return;}
   const [type,from,to,duration,volume,mix]=voices[kind];
   tone(context,type,from,to,duration,volume);
   if(mix)noise(context,.05,volume*mix,kind==='chest'?500:1800,kind==='chest'?'lowpass':'highpass');
   if(perfect)tone(context,'sine',1320,1320,.1,.04,.02);
  },
  destroy(){disposed=true;parent.removeEventListener('pointerdown',unlock);parent.removeEventListener('keydown',unlock);button.remove();if(context)void context.close().catch(()=>{});}
 };
}
