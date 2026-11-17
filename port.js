import {Mesh,random} from './engine.js';
import {paints} from './materials.js';
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export function makePort(gl){
 const mesh=new Mesh(),r=random(4029),lights=[],bulbs=[],pendants=[];
 const steel=rgb('#445656'),rust=rgb('#776954'),dark=rgb('#242f32'),concrete=rgb('#6c706c'),rubber=rgb('#202729'),gold=rgb('#a8884d'),ivory=rgb('#a7aca2');
 const warm=[1,.51,.18],cool=[.57,.81,1],red=[1,.12,.07];
 const box=(...v)=>mesh.box(...v),beam=(...v)=>mesh.beam(...v),cyl=(...v)=>mesh.cylinder(...v);
 function bulb(p,c,s=1,power=0){bulbs.push({p,c,s});if(power)lights.push({p,c,power})}
 function container(x,y,z,k,long=12){
  const roof=rgb(paints[k]);box(x,y+1.29,z,2.48,2.58,long, [1,1,1],k,k+8);
  box(x,y+2.59,z,2.49,.07,long,roof);
  for(const j of [-1,1]){box(x+j*1.245,y+2.52,z,.05,.10,long,roof);box(x+j*1.245,y+.07,z,.05,.12,long,roof)}
 }
 // Apron, retaining wall, expansion joints, fenders and quay hardware.
 box(38,-1.88,-56,80,3.65,230,concrete);
 for(let z=-165;z<59;z+=4.3){
  box(-2.11,-.22,z,.32,.47,4.16,r()>.5?rgb('#797b73'):rgb('#666d6b'));
  if(Math.floor((z+165)/4.3)%3===0){box(-2.37,-1.14,z,.6,2.05,1.05,rubber);for(const y of [-1.9,-.45])box(-2.71,y,z,.08,.16,1.12,steel)}
 }
 for(let z=-156;z<56;z+=11.6){
  box(-1.35,.13,z,.85,.24,.76,dark);
  for(let dx of [-.32,.32])for(let dz of [-.25,.25])cyl(-1.35+dx,.265,z+dz,.046,.05,rust,6);
  if(z<-2){box(-2.29,-.38,z,.11,.30,.58,dark);bulb([-2.37,-.36,z],warm,.63)}
  cyl(-1.35,.48,z,.24,.54,dark);cyl(-1.35,.76,z,.34,.17,rust);
 }
 for(let z=-158;z<58;z+=6){box(-1.8,.008,z,.19,.014,3.9,gold)}
 for(let x of [.48,15.5])for(let z=-156;z<56;z+=5.8)box(x,.025,z,.075,.05,5.74,steel);
 // The container yard is laid out on a deterministic bay grid.
 for(let row=0;row<7;row++)for(let bay=0;bay<13;bay++){
  const x=12.6+row*2.62+(row>2?4.4:0),z=15-bay*12.7;
  if((row===0 && (bay===0||bay===3||bay===4)) || (r()<.13&&row>0))continue;
  const count=row===0&&bay===1?3:1+Math.floor(r()*3);
  for(let j=0;j<count;j++)container(x,j*2.63,z,Math.floor(r()*8));
 }
 function rail(x1,x2,y,z){beam([x1,y+.85,z],[x2,y+.85,z],.065,.065,gold);beam([x1,y+.45,z],[x2,y+.45,z],.045,.045,gold);for(let x=x1;x<=x2;x+=2.2)beam([x,y,z],[x,y+.9,z],.055,.055,gold)}
 // Rail-mounted ship-to-shore cranes, including stays, gantry trucks and hoists.
 function crane(z,size=1){
  const h=24*size,top=h+9,paint=rgb('#657974'),trim=rgb('#89948b'),front=z+3.4,back=z-3.4;
  for(let dz of [front,back]){
   for(let [base,head] of [[.48,2.25],[15.5,13.2]]){
    box(base,.73,dz,1.35,1.16,2.5,dark);box(base,1.42,dz,1.45,.4,2.5,rust);
    beam([base,1.5,dz],[head,h,dz],1.09,1.26,paint);
    for(let y of [2.2,3.05,3.9])box(base+(head-base)*y/h,y,dz,1.13,.27,1.30,gold);
   }
   beam([1,8,dz],[15,8,dz],1.0,.86,paint);
   beam([1.4,8,dz],[13.3,h-1,dz],.47,.55,paint);
   beam([15,8,dz],[2.2,h-1,dz],.47,.55,paint);
   beam([2,h,dz],[3.8,top,dz],.84,.9,paint);beam([11,h,dz],[3.8,top,dz],.6,.61,paint);
   const low=x=>h+(2-x)*.054;
   beam([-39,low(-39),dz],[21,low(21),dz],.64,.7,paint);
   beam([-39,low(-39)+1.6,dz],[21,low(21)+1.6,dz],.22,.25,trim);
   for(let i=0;i<24;i++){let x=-39+i*2.5;beam([x,low(x)+(i%2?1.6:0),dz],[x+2.5,low(x+2.5)+(i%2?0:1.6),dz],.16,.15,paint)}
   for(let x of [-36,-22,-7,19])beam([3.8,top,dz],[x,low(x)+1,dz],.13,.14,trim);
   rail(1,20,h+.65,dz+.03);
  }
  for(let x of [0.48,15.5]){box(x,2,z,1.16,.72,8,paint);beam([x,2,back],[x+(x<1?1:-1),8,front],.34,.4,paint)}
  for(let x=-39;x<22;x+=3.7){const y=h+(2-x)*.054;beam([x,y,front],[x,y,back],.17,.17,paint)}
  for(let x of [2.2,13.2])box(x,h,z,1.45,1.3,8.8,paint);
  box(13.4,h+1.75,z,10.4,3.1,6.5,ivory);for(let x=9.4;x<18;x+=.48)box(x,h+1.8,front-.11,.2,1.12,.07,dark);
  box(3.8,top,z,1,.85,7.7,paint);bulb([3.8,top+.65,front],red,.88);
  box(-11,h+.38,z,3.7,.85,7.4,steel);box(-10.8,h-1.1,front,2,2,1.7,ivory);box(-10.8,h-.83,front+.87,1.7,.77,.055,rgb('#455e67'));
  const lift=h*.49;for(let x of [-12.1,-10.0])for(let zz of [z-2.7,z+2.7])beam([x,h,zz],[x,lift,zz],.045,.045,dark);
  box(-11,lift,z,2.9,.49,6.3,gold);for(let zz of [z-2.7,z+2.7])box(-11,lift-.23,zz,3.6,.45,.55,gold);
  // A caged service ladder on the waterside frame.
  for(let dx of [-.27,.27])beam([.48+dx,2.1,front+.8],[2.25+dx,h,front+.8],.065,.065,trim);
  for(let y=2.5;y<h;y+=.48){let x=.48+1.77*(y-2)/(h-2);box(x,y,front+.8,.60,.052,.064,trim)}
  for(let x of [-24,-9,3,14]){const y=h+(2-x)*.054-.43;box(x,y,front,.75,.3,.57,dark);box(x,y-.13,front+.28,.53,.18,.05,x<0?cool:warm,-2,-2,-2);bulb([x,y-.27,front+.30],x<0?cool:warm,x<0?1.45:1.65,x===3?65:0)}
 }
 crane(-29);crane(-79,.91);crane(-127,.84);
 // Lamps are suspended on short articulated drops; their bulbs and local lighting move together.
 function pole(x,z,h,dir){
  cyl(x,h/2,z,.15,h,steel);cyl(x,.37,z,.33,.74,steel);
  beam([x,h-.75,z],[x+dir*2,h+.3,z],.16,.19,steel);beam([x+dir*2,h+.3,z],[x+dir*3.2,h+.3,z],.13,.15,steel);
  pendants.push({anchor:[x+dir*3.2,h+.3,z],phase:r()*6.28,c:warm});
 }
 for(let z of [11,-15,-49,-91,-130])pole(8.7,z,8.6,-1);
 for(let z of [-8,-67,-114])pole(35,z,12,-1);
 // Deepwater container vessel across the berth. Sloping bow, waterline paint, bridge and aerials.
 const shipX=-34,shipZ=-73;
 const outline=[[-5,30],[-4.2,36],[0,43],[4.2,36],[5,30],[5,-36],[4,-39],[-4,-39],[-5,-36]];
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length],point=(p,y,k)=>[shipX+p[0]*k,y,shipZ+p[1]*k];
  mesh.quad(point(a,-3, .90),point(b,-3,.90),point(b,-1.55,1),point(a,-1.55,1),rgb('#723f33'));
  mesh.quad(point(a,-1.55,1),point(b,-1.55,1),point(b,2.9,1.03),point(a,2.9,1.03),rgb('#39484e'));
  mesh.quad(point(a,2.9,1.03),point(b,2.9,1.03),[shipX,2.9,shipZ],[shipX,2.9,shipZ],steel);
 }
 for(let i=0;i<3;i++)for(let j=0;j<5;j++)for(let h=0;h<(j===0?1:2+(i+j)%2);h++)container(shipX+(i-1)*2.55,2.93+h*2.62,shipZ+26-j*10.4,Math.floor(r()*8),10.1);
 for(let j=0;j<4;j++){
  const y=3.65+j*1.65;box(shipX,y,shipZ-28,9.7,1.58,8.7,ivory);
  for(let i=0;i<9;i++){const c=r()>.4?rgb('#96a89c'):dark;box(shipX-4+i,y+.17,shipZ-23.63,.62,.50,.04,c,-1,-1);if(j===3&&i%3===0)bulb([shipX-4+i,y+.17,shipZ-23.55],warm,.32)}
 }
 box(shipX,10.15,shipZ-28,10.8,.35,9.8,ivory);cyl(shipX,12.4,shipZ-28,.14,4.4,ivory);bulb([shipX,14.7,shipZ-28],red,.45);
 // Forecastle mast, safety rails, hull welds and painted draft graduations.
 const bowZ=shipZ+34;
 cyl(shipX,5.9,bowZ,.11,5.9,ivory);box(shipX,8.05,bowZ,2.1,.10,.12,ivory);
 beam([shipX-3,3,bowZ],[shipX,8.65,bowZ],.034,.034,steel);
 beam([shipX+3,3,bowZ],[shipX,8.65,bowZ],.034,.034,steel);
 bulb([shipX,8.99,bowZ],cool,1.55,37);
 for(let side of [-1,1]){
  for(let j=0;j<outline.length;j++){
   let a=outline[j],b=outline[(j+1)%outline.length];if(j%2!==(side>0?1:0))continue;
   const pt=(p,h)=>[shipX+p[0]*1.033,h,shipZ+p[1]*1.033];beam(pt(a,3.56),pt(b,3.56),.045,.045,ivory);
   const n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/2);for(let t=0;t<n;t++){const k=t/n,p=[a[0]*(1-k)+b[0]*k,a[1]*(1-k)+b[1]*k];beam(pt(p,2.91),pt(p,3.56),.045,.045,ivory)}
  }
  for(let z=shipZ-33;z<shipZ+29;z+=5.3){box(shipX+side*5.095,.67,z,.028,3.55,.035,steel);box(shipX+side*5.14,2.47,z,.036,.13,.43,dark)}
  for(let i=0;i<9;i++)box(shipX+side*(5.013+i*.012),-1.4+i*.32,shipZ+27.5,.04,.070,.36,ivory);
  const bx=shipX+side*4.46,bz=shipZ+33;
  cyl(bx,3.18,bz,.18,.51,dark);
  bulb([bx,3.74,bz],side>0?[.27,1,.68]:red,.96);
  for(let dz of [-19,-5,10,25]){
   const x=shipX+side*5.23,z=shipZ+dz;
   box(x,3.08,z,.22,.34,.44,dark);bulb([x+side*.14,3.02,z],warm,1.15,side===1&&dz===25?54:0);
  }
 }
 // Fixed channel marker with a ladder and an amber identification band.
 const buoy=new Mesh();
 buoy.cylinder(0,.16,0,.81,.52,rgb('#343e3b'));buoy.cylinder(0,.60,0,.59,.40,rgb('#745936'));
 buoy.cylinder(0,1.13,0,.24,.85,rgb('#916f3d'));buoy.cylinder(0,1.48,0,.25,.18,ivory);
 for(const i of [-1,1])buoy.beam([i*.28,1.48,0],[i*.16,2.90,0],.051,.061,gold);
 buoy.cylinder(0,2.91,0,.26,.11,dark);buoy.cylinder(0,3.06,0,.115,.20,gold);
 // Port perimeter, warehouses and a distant lit industrial skyline.
 box(-177,-1.05,-83,192,2.05,300,concrete);box(-20,-1.05,-263,530,2.05,214,concrete);
 for(let i=0;i<110;i++){
  let x=-160+r()*315,z=-172-r()*80;if(i<36){x=-87-r()*65;z=18-r()*186}
  const w=3+r()*12,h=2+r()*12,d=4+r()*12;box(x,h/2,z,w,h,d,rgb(r()>.5?'#576466':'#515c61'));
  for(let j=0;j<Math.floor(w/1.7);j++)if(r()>.38){const p=[x-w*.4+j*1.65,h*.78,z+d*.5+.04];box(...p,.65,.32,.06,ivory);bulb(p,r()>.48?warm:cool,.74)}
  if(i%11===0){cyl(x,h+3.5,z,.48,7,steel);bulb([x,h+7.1,z],red,.4)}
 }
 // Low industrial gantries across the channel add overlapping silhouettes.
 for(let j=0;j<4;j++){let x=-98-j*10,z=-24-j*30,h=15+r()*6;
  for(let dx of [-3,3])for(let dz of [-2,2])beam([x+dx,0,z+dz],[x+dx*.7,h,z+dz],.5,.5,steel);
  box(x,h,z,8,1,6,steel);beam([x,h,z],[x+15,h+7,z],.6,.7,steel);beam([x-3,h,z],[x-2,h+8,z],.42,.42,steel);beam([x-2,h+8,z],[x+15,h+7,z],.12,.12,steel);bulb([x,h+1,z+2],warm,1.7);
 }
 const lamp=new Mesh();lamp.beam([0,0,0],[0,-.75,0],.038,.038,dark);lamp.cylinder(0,-.84,0,.32,.21,dark);lamp.cylinder(0,-.97,0,.25,.07,[1,.8,.49],12);
 return {world:mesh.upload(gl),buoy:buoy.upload(gl),lamp:lamp.upload(gl),bulbs,lights,pendants};
}

