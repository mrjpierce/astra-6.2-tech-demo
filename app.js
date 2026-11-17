import {Mesh,sub,unit,cross,cameraMatrix,program,target} from './engine.js';
import {makePort} from './port.js';
import {containerAtlas} from './materials.js';
import * as S from './shaders.js';

const $=id=>document.getElementById(id),canvas=$('scene');
const preset=[
 {name:'Quayside',eye:[5.2,4.35,25],look:[-7.3,5.9,-36],fov:59},
 {name:'Harbor water',eye:[-28,2.4,23],look:[2.8,10.2,-37],fov:59},
 {name:'Gantry deck',eye:[1.9,25.5,-34.1],look:[-10.4,3.2,-75],fov:66}
];
let current=0,yaw=0,pitch=0,zoom=1,paused=false,clock=19,rain=.72,wind=12,context=null,audioNodes=null,sounding=false;
function sliders(){
 rain=Number($('rain').value)/100;wind=Number($('wind').value);
 $('rainValue').innerHTML=Math.round(rain*100)+'<span>%</span>';$('windValue').innerHTML=wind+' <span>kn</span>';
 $('rain').style.setProperty('--value',rain*100+'%');$('wind').style.setProperty('--value',wind/30*100+'%');
 $('weather').textContent=rain===0?'Rain cleared':rain<.33?'Light rain':rain<.67?'Steady rain':'Heavy rain';audioLevels();
}
function view(delta){current=(current+delta+preset.length)%preset.length;yaw=pitch=0;zoom=1;$('viewName').textContent=preset[current].name;$('cameraNumber').textContent=String(current+1).padStart(2,'0')}
$('prev').onclick=()=>view(-1);$('next').onclick=()=>view(1);
$('rain').oninput=$('wind').oninput=sliders;sliders();
$('playback').onclick=()=>{paused=!paused;$('liveText').textContent=paused?'PAUSED':'LIVE RENDER';$('liveText').parentElement.classList.toggle('paused',paused);$('playback').querySelector('use').setAttribute('href',paused?'#play':'#pause');$('playback').querySelector('span').textContent=paused?'Resume':'Pause';$('playback').setAttribute('aria-pressed',String(paused));audioLevels()};
function notice(s){$('notice').textContent=s;$('notice').hidden=false}
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{notice('Fullscreen is unavailable in this browser.');setTimeout(()=>$('notice').hidden=true,3500)}};
document.addEventListener('fullscreenchange',()=>{$('full').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen')});
function audioLevels(){if(!audioNodes)return;const t=context.currentTime;audioNodes.main.gain.setTargetAtTime(sounding&&!paused?.34:0,t,.2);audioNodes.rain.gain.setTargetAtTime(rain*.60,t,.3);audioNodes.wind.gain.setTargetAtTime(.055+wind*.009,t,.4)}
async function initSound(){
 context=new AudioContext();const rate=context.sampleRate,len=rate*5,b=context.createBuffer(1,len,rate),a=b.getChannelData(0);for(let i=0;i<len;i++)a[i]=Math.random()*2-1;
 const src=context.createBufferSource();src.buffer=b;src.loop=true;const main=context.createGain();main.gain.value=0;main.connect(context.destination);
 function band(filter,hz){let f=context.createBiquadFilter();f.type=filter;f.frequency.value=hz;let gain=context.createGain();src.connect(f).connect(gain).connect(main);return gain}
 audioNodes={main,rain:band('highpass',1200),wind:band('lowpass',480)};src.start();
 const swell=context.createOscillator(),amplitude=context.createGain();swell.frequency.value=.105;amplitude.gain.value=100;swell.connect(amplitude);const sea=context.createBiquadFilter();sea.type='lowpass';sea.frequency.value=330;amplitude.connect(sea.frequency);const seaGain=context.createGain();seaGain.gain.value=.33;src.connect(sea).connect(seaGain).connect(main);swell.start();
}
$('audio').onclick=async()=>{try{if(!context)await initSound();await context.resume();sounding=!sounding;audioLevels();$('audio').querySelector('span').textContent=sounding?'Audio on':'Audio off';$('audio').querySelector('use').setAttribute('href',sounding?'#sound':'#mute');$('audio').setAttribute('aria-pressed',String(sounding))}catch{notice('Audio is unavailable in this browser.');setTimeout(()=>$('notice').hidden=true,3500)}};
let drag=null;
canvas.onpointerdown=e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY]};
canvas.onpointermove=e=>{if(!drag)return;yaw=Math.max(-1.35,Math.min(1.35,yaw-(e.clientX-drag[0])*.003));pitch=Math.max(-.68,Math.min(.72,pitch+(e.clientY-drag[1])*.003));drag=[e.clientX,e.clientY]};
canvas.onlostpointercapture=()=>drag=null;
canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.58,Math.min(1.3,zoom+e.deltaY*.0007))};
canvas.onkeydown=e=>{const actions={ArrowLeft:()=>yaw-=.06,ArrowRight:()=>yaw+=.06,ArrowUp:()=>pitch=Math.min(.72,pitch+.05),ArrowDown:()=>pitch=Math.max(-.68,pitch-.05),'+':()=>zoom=Math.max(.58,zoom-.05),'=':()=>zoom=Math.max(.58,zoom-.05),'-':()=>zoom=Math.min(1.3,zoom+.05),' ':()=>$('playback').click()};if(actions[e.key]){e.preventDefault();actions[e.key]()}};
function start(){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
 if(!gl)throw Error('Enable WebGL 2 or hardware acceleration to explore North Quay.');
 const sky=program(gl,S.skyVS,S.skyFS),solid=program(gl,S.solidVS,S.solidFS),surface=program(gl,S.surfaceVS,S.surfaceFS),glow=program(gl,S.glowVS,S.glowFS),drops=program(gl,S.rainVS,S.rainFS);
 const shadow=program(gl,S.shadowVS,S.shadowFS);
 const atlas=containerAtlas(gl),port=makePort(gl),blank=gl.createVertexArray();
 const plane=(x0,x1,y,z0,z1)=>{const m=new Mesh();m.quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],[1,1,1]);return m.upload(gl)};
 // The water mesh resolves the long swell. Short chop and raindrop rings
 // are shaded per pixel so their scale remains independent of this grid.
 const seaLevel=-2.18,waterMesh=new Mesh();
 for(let x=-186;x< -2;x+=2)for(let z=-181;z<145;z+=2){
  waterMesh.quad([x,seaLevel,z+2],[x+2,seaLevel,z+2],[x+2,seaLevel,z],[x,seaLevel,z],[1,1,1]);
 }
 const sea=waterMesh.upload(gl),apron=plane(-2,78,0,-171,59);
 const vao=gl.createVertexArray(),glowBuffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,glowBuffer);
 for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i<2?3:1,gl.FLOAT,false,28,[0,12,24][i]);gl.vertexAttribDivisor(i,1)}
 const lampPos=new Float32Array(48),lampCol=new Float32Array(48),lampPower=new Float32Array(16);
 let moving=[],bulbCount=0,buoyHeight=seaLevel,buoyRoll=0;
 const swell=(x,z,t)=>(.068*Math.sin(x*.43+z*.24+t*1.24)+.044*Math.sin(z*.61-x*.19+t*.96)+.049*Math.sin(x*.27-z*.32-t*.85))*(.45+wind*.037);
 function updateLights(){
  moving=port.pendants.map(({anchor,phase,c})=>{const swing=(Math.sin(clock*1.18+phase)+.42*Math.sin(clock*2.14+phase))*(wind/30)*.16;return {anchor,swing,p:[anchor[0]+Math.sin(swing)*.99,anchor[1]-Math.cos(swing)*.99,anchor[2]],c,s:1.52,power:105}});
  buoyHeight=seaLevel+swell(-24,-8,clock);
  buoyRoll=Math.atan((swell(-23.5,-8,clock)-swell(-24.5,-8,clock)));
  const beacon={p:[-24-3.22*Math.sin(buoyRoll),buoyHeight+3.22*Math.cos(buoyRoll),-8],s:1.18,c:[1,.51,.18],power:14};
  const emit=[...moving,...port.lights,beacon];emit.slice(0,16).forEach(({p,c,power},i)=>{lampPos.set(p,i*3);lampCol.set(c,i*3);lampPower[i]=power});
  const mist=moving.map(l=>({...l,s:-1.7}));
  const all=[...port.bulbs,...moving,beacon,...mist];bulbCount=all.length;const buf=new Float32Array(all.length*7);all.forEach(({p,c,s},i)=>buf.set([...p,...c,s],i*7));gl.bindBuffer(gl.ARRAY_BUFFER,glowBuffer);gl.bufferData(gl.ARRAY_BUFFER,buf,gl.DYNAMIC_DRAW);
 }
 // Three depth tiles share one shadow atlas for the closest working lamps.
 const tile=512,shadowFB=gl.createFramebuffer(),shadowTex=gl.createTexture(),shadowMatrices=new Float32Array(48);
 gl.bindTexture(gl.TEXTURE_2D,shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,tile*3,tile,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
 let shadowsAt=-1,shadowWind=-1;
 function shadowPass(){
  if(Math.abs(clock-shadowsAt)<.14 && shadowWind===wind)return;
  shadowsAt=clock;shadowWind=wind;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFB);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(shadow.p);
  for(let i=0;i<3;i++){
   const eye=moving[i].p,matrix=cameraMatrix(eye,[eye[0]-.08,eye[1]-1.,eye[2]-.04],1,2.58);
   shadowMatrices.set(matrix,16*i);gl.viewport(tile*i,0,tile,tile);gl.uniformMatrix4fv(shadow.u.vp,false,matrix);mesh(port.world);
  }
 }
 function lights(u,eye){gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadowTex);gl.uniform1i(u.shadowAtlas,2);gl.uniformMatrix4fv(u.shadowVP,false,shadowMatrices);gl.uniform3fv(u.lp,lampPos);gl.uniform3fv(u.lc,lampCol);gl.uniform1fv(u.power,lampPower);gl.uniform3fv(u.eye,eye)}
 function mesh(m){gl.bindVertexArray(m.vao);gl.drawArrays(gl.TRIANGLES,0,m.count)}
 function viewData(eye,look,fov){let forward=unit(sub(look,eye)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward);return {eye,look,forward,right,up,fov,vp:cameraMatrix(eye,look,canvas.width/canvas.height,fov)}}
 function scene(v,clip){
  gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(sky.p);let u=sky.u;gl.uniform3fv(u.forward,v.forward);gl.uniform3fv(u.right,v.right);gl.uniform3fv(u.up,v.up);gl.uniform2f(u.lens,Math.tan(v.fov/2)*canvas.width/canvas.height,Math.tan(v.fov/2));gl.uniform1f(u.time,clock);gl.bindVertexArray(blank);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(solid.p);u=solid.u;
  gl.uniformMatrix4fv(u.vp,false,v.vp);gl.uniform1f(u.clipHeight,clip);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,atlas);gl.uniform1i(u.atlas,0);lights(u,v.eye);
  gl.uniform3f(u.offset,0,0,0);gl.uniform1f(u.swing,0);mesh(port.world);
  gl.uniform3f(u.offset,-24,buoyHeight,-8);gl.uniform1f(u.swing,buoyRoll);mesh(port.buoy);
  for(const l of moving){gl.uniform3fv(u.offset,l.anchor);gl.uniform1f(u.swing,l.swing);mesh(port.lamp)}
 }
 function halos(v,clip){
  gl.useProgram(glow.p);gl.uniformMatrix4fv(glow.u.vp,false,v.vp);gl.uniform3fv(glow.u.right,v.right);gl.uniform3fv(glow.u.up,v.up);gl.uniform1f(glow.u.clipHeight,clip);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);gl.bindVertexArray(vao);gl.drawArraysInstanced(gl.TRIANGLES,0,6,bulbCount);gl.disable(gl.BLEND);gl.depthMask(true);
 }
 let refs=[],reflectViews=[],resolution=1,last=0,mean=16,frames=0,transition=1,was=current,camEye=[...preset[0].eye],camTarget=[...preset[0].look],fov=preset[0].fov;
 function resize(){
  const dpr=Math.min(devicePixelRatio,1.5)*resolution,ratio=Math.min(dpr,1800/canvas.clientWidth),w=Math.max(1,Math.round(canvas.clientWidth*ratio)),h=Math.max(1,Math.round(canvas.clientHeight*ratio));
  if(canvas.width===w&&canvas.height===h&&refs.length)return;canvas.width=w;canvas.height=h;refs.forEach(f=>f.dispose());refs=[0,1].map(()=>target(gl,Math.max(1,Math.ceil(w*.68)),Math.max(1,Math.ceil(h*.68))));gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 }
 function frame(now){
  if(gl.isContextLost())return;
  const delta=last?Math.min((now-last)/1000,.12):.016;if(last&&now-last<400)mean=mean*.93+(now-last)*.07;last=now;
  if(++frames%90===0&&mean>36&&resolution>.65)resolution=Math.max(.65,resolution-.12);
  resize();if(!paused)clock+=delta;
  const dest=preset[current];if(was!==current){was=current;transition=0}transition=Math.min(1,transition+delta*1.25);
  const blend=transition===1?1:1-Math.exp(-delta*7);for(let i=0;i<3;i++){camEye[i]+=(dest.eye[i]-camEye[i])*blend;camTarget[i]+=(dest.look[i]-camTarget[i])*blend}fov+=(dest.fov-fov)*blend;
  const dir=unit(sub(camTarget,camEye)),az=Math.atan2(dir[0],-dir[2])+yaw,el=Math.asin(dir[1])+pitch;
  const look=[camEye[0]+Math.sin(az)*Math.cos(el),camEye[1]+Math.sin(el),camEye[2]-Math.cos(az)*Math.cos(el)],angle=fov*zoom*Math.PI/180;
  const v=viewData(camEye,look,angle);updateLights();shadowPass();
  reflectViews=[0,seaLevel].map((y,i)=>{let mirror=p=>[p[0],y*2-p[1],p[2]],mv=viewData(mirror(camEye),mirror(look),angle);let rt=refs[i];gl.bindFramebuffer(gl.FRAMEBUFFER,rt.fb);gl.viewport(0,0,rt.w,rt.h);scene(mv,y+.015);halos(mv,y);return mv});
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);scene(v,-500);
  gl.useProgram(surface.p);let u=surface.u;gl.uniformMatrix4fv(u.vp,false,v.vp);lights(u,v.eye);gl.uniform1f(u.time,clock);gl.uniform1f(u.wind,wind);gl.uniform1f(u.rain,rain);gl.activeTexture(gl.TEXTURE1);gl.uniform1i(u.reflected,1);
  for(let i=0;i<2;i++){gl.bindTexture(gl.TEXTURE_2D,refs[i].tex);gl.uniformMatrix4fv(u.mirrorVP,false,reflectViews[i].vp);gl.uniform1i(u.sea,i);mesh(i?sea:apron)}
  halos(v,-500);
  gl.useProgram(drops.p);u=drops.u;gl.uniformMatrix4fv(u.vp,false,v.vp);gl.uniform3fv(u.eye,v.eye);gl.uniform3fv(u.right,v.right);gl.uniform1f(u.time,clock);gl.uniform1f(u.wind,wind);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.bindVertexArray(blank);gl.drawArraysInstanced(gl.TRIANGLES,0,6,Math.round(rain*6900));gl.depthMask(true);gl.disable(gl.BLEND);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();notice('Graphics paused. Restoring the scene�')});
canvas.addEventListener('webglcontextrestored',()=>{$('notice').hidden=true;boot()});
function boot(){try{start()}catch(e){console.error(e);notice(e.message||'The scene could not initialize.')}}
boot();

