import {random} from './engine.js';
export const paints=['#875337','#31595b','#6a7466','#995743','#3c5267','#a29774','#4a655d','#84483c'];
const brands=['NORTHLINE','PELAGIC','ESSEN','KAI MARU','MISTRAL','INTERPORT','PELAGIC','NORTHLINE'];
export function containerAtlas(gl){
 const W=768,H=256,tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,tex);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,9,gl.RGBA8,W,H,paints.length*2);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d'),rng=random(34812);
 for(let layer=0;layer<16;layer++){
  const k=layer%8,door=layer>=8,base=[1,3,5].map(i=>parseInt(paints[k].slice(i,i+2),16)),im=ctx.createImageData(W,H);
  for(let x=0;x<W;x++){
   const s=x/(door?53:19),rib=Math.max(-1,Math.min(1,Math.sin(s*6.283)*2)),variation=rng()*4,streak=Math.pow(rng(),8)*.3;
   for(let y=0;y<H;y++){
    const edge=Math.max(0,1-Math.min(y,H-y)/22),noise=(rng()-.5)*13,wear=(edge*.33+streak*Math.exp(-y/90))*rng();
    for(let c=0;c<3;c++)im.data[(y*W+x)*4+c]=(base[c]*(1+.14*rib)+variation+noise)*(1-wear)+[129,72,36][c]*wear;
    im.data[(y*W+x)*4+3]=255;
   }
  }
  ctx.putImageData(im,0,0);ctx.fillStyle='#292b2966';ctx.fillRect(0,0,W,9);ctx.fillRect(0,H-10,W,10);
  ctx.fillStyle='#dedccc';ctx.globalAlpha=.76;
  if(!door){
   ctx.font='bold 47px Arial';ctx.fillText(brands[k],69,112);ctx.fillRect(47,75,8,37);ctx.fillRect(35,87,7,25);
   ctx.font='bold 11px monospace';ctx.fillText('BQCU  '+(540120+k*237)+'  4',590,32);ctx.fillText('45G1',590,49);
   ctx.font='9px monospace';ctx.fillText('INTERNATIONAL FREIGHT',70,133);
  }else{
   ctx.save();ctx.scale(2.3,1);ctx.font='bold 14px monospace';ctx.fillText('BQCU '+(204921+k*31),185,55);ctx.font='10px monospace';ctx.fillText('45G1',185,72);ctx.fillText('MAX GROSS',186,133);ctx.fillText('30 480 KG',186,147);ctx.fillText('TARE  3 780 KG',186,162);ctx.restore();
   ctx.fillStyle='#d6ab43';ctx.fillRect(520,184,66,24);ctx.fillStyle='#352e25';ctx.font='bold 13px monospace';ctx.fillText('CAUTION',524,200);
   for(const x of [70,315,453,698]){ctx.fillStyle='#161b1aaa';ctx.fillRect(x-4,7,13,240);ctx.fillStyle='#9a9a85';ctx.fillRect(x,7,5,240);for(const y of [24,98,208]){ctx.fillStyle='#655f50';ctx.fillRect(x-8,y,22,6)}}
   ctx.fillStyle='#212927';ctx.fillRect(381,3,7,250);
  }
  ctx.globalAlpha=1;
  for(let j=0;j<720;j++){const x=rng()*W,y=rng()*H;ctx.fillStyle=rng()>.52?'rgba(31,32,26,.28)':'rgba(184,135,84,.32)';ctx.fillRect(x,y,rng()*3+.3,rng()*rng()*15+.6)}
  for(const x of [2,W-15])for(const y of [2,H-13]){ctx.fillStyle='#5d5b50';ctx.fillRect(x,y,13,11);ctx.fillStyle='#292d29';ctx.fillRect(x+3,y+3,7,4)}
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,W,H,1,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
 }
 gl.generateMipmap(gl.TEXTURE_2D_ARRAY);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D_ARRAY,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);return tex;
}
