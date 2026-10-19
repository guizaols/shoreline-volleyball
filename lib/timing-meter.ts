import * as Phaser from 'phaser';

// A short bar over the athlete after a timed contact: CEDO on the left, PERFEITO in the middle, TARDE on the right.
export function timingMeter(scene:Phaser.Scene){
 const marker=scene.add.rectangle(0,0,4,16,0xffffff).setStrokeStyle(2,0x1a1028);
 const meter=scene.add.container(0,0,[
  scene.add.rectangle(0,0,66,12,0x1a1028),
  scene.add.rectangle(-21,0,20,8,0x5aa0f0),scene.add.rectangle(0,0,20,8,0xffdb00),scene.add.rectangle(21,0,20,8,0xff8a1e),
  marker,
 ]).setDepth(900).setVisible(false);
 return (x:number,y:number,offset:number|null)=>{
  meter.setVisible(offset!==null);
  if(offset!==null){meter.setPosition(x,y);marker.setX(-Math.max(-1,Math.min(1,offset))*30);}
 };
}
