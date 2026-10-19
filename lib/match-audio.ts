export function matchAudio(parent:HTMLElement){
 let context:AudioContext|undefined,enabled=true,disposed=false;
 const button=document.createElement('button');button.className='match-sound';
 const label=()=>{button.textContent=enabled?'Som ligado':'Som desligado';button.setAttribute('aria-pressed',String(enabled));};
 try{enabled=localStorage.getItem('shoreline-sound')!=='off';}catch{/* Storage is optional. */}
 label();parent.appendChild(button);
 const unlock=()=>{if(!enabled||disposed)return;try{context??=new AudioContext();void context.resume().catch(()=>{});}catch{/* Audio is optional. */}};
 button.addEventListener('click',()=>{enabled=!enabled;label();try{localStorage.setItem('shoreline-sound',enabled?'on':'off');}catch{/* Keep the session preference. */}unlock();});
 parent.addEventListener('pointerdown',unlock);parent.addEventListener('keydown',unlock);
 return {
  play(strong:boolean|'special'=false){
   if(!enabled||context?.state!=='running')return;
   const oscillator=context.createOscillator(),gain=context.createGain(),time=context.currentTime;
   oscillator.type=strong==='special'?'triangle':'sine';
   oscillator.frequency.setValueAtTime(strong==='special'?880:strong?220:420,time);oscillator.frequency.exponentialRampToValueAtTime(strong==='special'?110:65,time+(strong==='special'?.24:.09));
   gain.gain.setValueAtTime(.07,time);gain.gain.exponentialRampToValueAtTime(.001,time+(strong==='special'?.28:.12));
   oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(time+(strong==='special'?.3:.13));
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  },
  destroy(){disposed=true;parent.removeEventListener('pointerdown',unlock);parent.removeEventListener('keydown',unlock);button.remove();if(context)void context.close().catch(()=>{});}
 };
}
