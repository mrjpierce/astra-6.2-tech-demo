/* Small WebGL 2 renderer. Meshes share one interleaved vertex format and are
   submitted in batches. Both reflective surfaces own a mirrored camera pass. */
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const scale=(a,s)=>a.map(x=>x*s);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>scale(a,1/(Math.hypot(...a)||1));
export function random(seed=19759){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
function multiply(a,b){const m=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)m[j*4+i]+=a[k*4+i]*b[j*4+k];return m}
export function cameraMatrix(eye,look,aspect,fov){
 const z=unit(sub(eye,look)),x=unit(cross([0,1,0],z)),y=cross(z,x),f=1/Math.tan(fov/2),near=.25,far=480;
 return multiply([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*near*far/(near-far),0],[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
export class Mesh{
 constructor(){this.data=[]}
 quad(a,b,c,d,col,mat=-1,uv=[[0,0],[1,0],[1,1],[0,1]]){
  const n=unit(cross(sub(b,a),sub(d,a))),v=[a,b,c,d];for(const i of [0,1,2,0,2,3])this.data.push(...v[i],...n,...col,...uv[i],mat);
 }
 box(x,y,z,w,h,d,color,side=-1,end=side,top=-1){
  const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
  this.quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],color,end);
  this.quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],color,end);
  this.quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],color,side);
  this.quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],color,side);
  this.quad([a,e,g],[b,e,g],[b,e,f],[a,e,f],color,top);
  this.quad([a,c,f],[b,c,f],[b,c,g],[a,c,g],color,top);
 }
 beam(a,b,w,d,color){
  const axis=unit(sub(b,a)),u=scale(unit(cross(axis,Math.abs(axis[1])>.97?[0,0,1]:[0,1,0])),w/2),v=scale(unit(cross(axis,u)),d/2);
  const ring=p=>[add(add(p,u),v),add(sub(p,u),v),sub(sub(p,u),v),add(sub(p,v),u)],s=ring(a),e=ring(b);
  for(let i=0;i<4;i++){const j=(i+1)%4;this.quad(s[i],s[j],e[j],e[i],color)}
  this.quad(...e,color);this.quad(s[3],s[2],s[1],s[0],color);
 }
 cylinder(x,y,z,r,h,color,n=12){
  for(let i=0;i<n;i++){const t=2*Math.PI*i/n,q=2*Math.PI*(i+1)/n,a=[x+r*Math.cos(t),y-h/2,z+r*Math.sin(t)],b=[x+r*Math.cos(q),y-h/2,z+r*Math.sin(q)],c=add(a,[0,h,0]),d=add(b,[0,h,0]);this.quad(b,a,c,d,color);this.quad(c,d,[x,y+h/2,z],[x,y+h/2,z],color)}
 }
 upload(gl){
  const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.data),gl.STATIC_DRAW);
  let off=0;[3,3,3,2,1].forEach((size,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,48,off);off+=size*4});
  const count=this.data.length/12;this.data=[];return {vao,count};
 }
}
export function program(gl,vs,fs){
 const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 const u={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const name=gl.getActiveUniform(p,i).name;u[name.replace('[0]','')]=gl.getUniformLocation(p,name)}
 return {p,u};
}
export function target(gl,w,h){
 const fb=gl.createFramebuffer(),tex=gl.createTexture(),depth=gl.createRenderbuffer();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Reflection buffer unavailable');return {fb,tex,w,h,dispose(){gl.deleteFramebuffer(fb);gl.deleteTexture(tex);gl.deleteRenderbuffer(depth)}};
}
