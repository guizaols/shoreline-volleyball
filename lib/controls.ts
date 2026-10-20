// Convert a circular thumb gesture into world movement in the court's perspective.
export function stickDirection(dx:number,dy:number,radius:number,flat=false) {
  const distance=Math.hypot(dx,dy);
  if(!Number.isFinite(distance)||radius<=0||distance<radius*.08)return {x:0,z:0};
  const strength=Math.min(1,(distance/radius-.08)/.62);
  const x=flat?dx:.66*dx-.20*dy,z=flat?dy:.035*dx+.77*dy,length=Math.hypot(x,z);
  return {x:x/length*strength,z:z/length*strength};
}
