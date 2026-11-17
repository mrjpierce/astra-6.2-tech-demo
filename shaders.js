const head='#version 300 es\nprecision highp float;\nprecision highp sampler2DArray;\n';
const noise=`
float hash(vec2 v){vec3 p=fract(v.xyx*vec3(.1031,.1030,.0973));p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .50*noise2(p)+.26*noise2(p*2.04+3.7)+.14*noise2(p*4.13+7.2)+.07*noise2(p*8.3+2.1)+.03*noise2(p*16.7);}
`;
const atmosphere=`
vec3 fogColor(vec3 dir){return mix(vec3(.189,.252,.294),vec3(.090,.155,.195),smoothstep(-.85,.8,dir.x)) + vec3(.045,.031,.016)*smoothstep(.35,.9,-dir.z);}
`;
export const skyVS=head+`
out vec2 screen;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);screen=p*2.-1.;gl_Position=vec4(screen,.999999,1.);}
`;
export const skyFS=head+noise+atmosphere+`
in vec2 screen;out vec4 frag;uniform vec3 forward,right,up;uniform vec2 lens;uniform float time;
void main(){
 vec3 d=normalize(forward+right*screen.x*lens.x+up*screen.y*lens.y);
 float h=max(d.y,0.);vec2 p=d.xz/(.12+h)*1.2+vec2(time*.003,0.);
 float clouds=fbm(p+2.8*fbm(p*.65));float textureCloud=fbm(p*2.1+clouds);
 vec3 sky=mix(fogColor(d),vec3(.075,.125,.162),smoothstep(-.03,.68,h));
 sky+=vec3(.17,.19,.195)*(clouds-.43)*1.6*smoothstep(-.02,.24,h);
 sky+=vec3(.065,.075,.085)*(textureCloud-.45);
 sky=mix(fogColor(d),sky,smoothstep(.0,.22,h));
 float light=exp(-8.*length(d- normalize(vec3(-.72,.32,-1.))));sky+=vec3(.24,.27,.28)*light*(.25+clouds);
 sky+=(hash(gl_FragCoord.xy)-.5)*.008;
 frag=vec4(sky,1.);
}`;
export const solidVS=head+`
layout(location=0)in vec3 pos;layout(location=1)in vec3 normal;layout(location=2)in vec3 color;layout(location=3)in vec2 uv;layout(location=4)in float material;
uniform mat4 vp;uniform vec3 offset;uniform float swing;
out vec3 w,n,col;out vec2 tc;flat out float layer;
void main(){float c=cos(swing),s=sin(swing);mat2 rot=mat2(c,s,-s,c);w=vec3(rot*pos.xy,pos.z)+offset;n=vec3(rot*normal.xy,normal.z);col=color;tc=uv;layer=material;gl_Position=vp*vec4(w,1.);}
`;
const lighting=`
uniform highp sampler2DShadow shadowAtlas;uniform mat4 shadowVP[3];
float visibility(int i,vec3 position,float bias){
 if(i>=3)return 1.;
 vec4 h=shadowVP[i]*vec4(position,1.);
 if(h.w<=0.)return 1.;
 vec3 q=h.xyz/h.w*.5+.5;
 if(min(q.x,q.y)<.002||max(q.x,q.y)>.998||q.z>1.)return 1.;
 vec2 at=vec2((q.x+float(i))/3.,q.y);
 return .11+.89*texture(shadowAtlas,vec3(at,q.z-bias));
}
uniform vec3 lp[16],lc[16];uniform float power[16];uniform vec3 eye;
`;
export const solidFS=head+noise+atmosphere+lighting+`
in vec3 w,n,col;in vec2 tc;flat in float layer;out vec4 frag;uniform sampler2DArray atlas;uniform float clipHeight;
void main(){
 if(w.y<clipHeight)discard;
 vec3 N=normalize(n),V=normalize(eye-w),mat=col;
 if(layer>=0.)mat*=texture(atlas,vec3(tc,layer)).rgb;
 float mottle=noise2(w.xz*1.41+w.y*.43)*.10+noise2(w.xy*8.+w.z)*.04;
 float rim=max(dot(N,normalize(vec3(-.6,1.,-.34))),0.);
 vec3 diffuse=vec3(.245,.315,.372)+rim*vec3(.34,.42,.46);
 vec3 spec=vec3(0.);
 for(int i=0;i<16;i++){
  vec3 delta=lp[i]-w;float d2=max(dot(delta,delta),.08);vec3 L=delta*inversesqrt(d2);
  float cone=i<8?mix(.065,1.,smoothstep(-.04,.70,L.y)):1.;float att=power[i]*cone*visibility(i,w,.00065)/(d2+5.);float lam=max(dot(N,L),0.);
  diffuse+=lc[i]*(.12+lam)*att;spec+=lc[i]*pow(max(dot(reflect(-L,N),V),0.),22.)*att*.21;
 }
 vec3 c=mat*(diffuse*(.91+mottle))+spec;
 if(layer< -1.5)c=col*1.4;
 float dist=length(w-eye);float fog=1.-exp(-dist*.0057);c=mix(c,fogColor(-V),fog);
 frag=vec4(c,1.);
}`;
export const surfaceVS=head+`
layout(location=0)in vec3 pos;uniform mat4 vp;out vec3 w;uniform highp int sea;uniform float time,wind;
void main(){w=pos;
 if(sea==1){float x=w.x,z=w.z,t=time;
  w.y+=(.068*sin(x*.43+z*.24+t*1.24)+.044*sin(z*.61-x*.19+t*.96)+.049*sin(x*.27-z*.32-t*.85))*(.45+wind*.037);
 }
 gl_Position=vp*vec4(w,1.);}
`;
export const surfaceFS=head+noise+atmosphere+lighting+`
in vec3 w;out vec4 frag;uniform sampler2D reflected;uniform mat4 mirrorVP;uniform float time,rain,wind;uniform highp int sea;
float chop(vec2 p,float t){
 p+=vec2(sin(p.y*.43+t*.35)*.47,cos(p.x*.67-t*.18)*.38);
 return sin(p.x*1.5+p.y*.32+t)*.35+sin(p.y*2.7-p.x*.9+t*1.27+1.4*sin(p.x*.9))*.21+
 sin(p.y*5.2+p.x*1.7-t*1.7+sin(p.y*1.4))*.12+.30*noise2(p*vec2(3.6,5.7)+t*.69);
}
float rings(vec2 p){
 vec2 id=floor(p),uv=fract(p)-.5;float h=hash(id);uv-=vec2(h-.5,hash(id+3.1)-.5)*.38;
 float age=fract(time*(1.1+h*.35)+h*92.);float rad=length(uv);return exp(-abs(rad-age*.64)*38.)*(1.-age)*sin((rad-age*.64)*91.)*(.35+.65*h);
}
void main(){
 vec2 p=w.xz;vec3 V=normalize(eye-w);float dist=length(eye-w),isSea=float(sea),damp=1./(1.+dist*.016);
 float t=time*(.48+wind*.025);vec2 slope;
 float rough=fbm(p*.44);float grit=noise2(p*35.);float puddle=smoothstep(.29,.68,rough+rain*.09);
 if(sea==1){
  float strength=.075+wind*.003;
  slope=vec2(chop(p+vec2(.08,0),t)-chop(p-vec2(.08,0),t),chop(p+vec2(0,.08),t)-chop(p-vec2(0,.08),t))*strength*6.;
  vec3 face=normalize(cross(dFdx(w),dFdy(w)));slope-=face.xz/max(.4,abs(face.y));
  slope+=vec2(noise2(p*vec2(3.,10.)+t),noise2(p*vec2(8.,3.)-t))*.057-.0285;
 }else{
  slope=vec2(noise2(p*4.),noise2(p*4.+7.))-.5;slope*=.035*(1.15-puddle);
 }
 float ripple=rings(p*(sea==1?2.2:3.1))*rain*damp;slope+=ripple*vec2(.034,.049);
 vec3 N=normalize(vec3(-slope.x,1.,-slope.y));
 vec4 proj=mirrorVP*vec4(w+vec3(slope.x,0.,slope.y)*(sea==1?min(8.,dist*.095):min(5.,dist*.06)),1.);
 vec2 uv=proj.xy/proj.w*.5+.5;
 uv+=slope*vec2(.028,.055)*damp;
 float blur=(sea==1?.0014:.0028*(1.-puddle)+.0007);
 vec3 refl=texture(reflected,uv).rgb*.44;
 refl+=(texture(reflected,uv+vec2(blur,blur*1.8)).rgb+texture(reflected,uv-vec2(blur,blur*1.8)).rgb)*.28;
 vec3 c;float fres=pow(1.-max(dot(N,V),0.),3.);
 if(sea==1){
  c=mix(vec3(.021,.060,.074),refl*vec3(.81,.94,.98),.42+.50*fres);
  c+=vec3(.050,.073,.077)*(slope.y*.9+ripple*.24);
  float shore=exp(-max(0.,-2.-p.x)*2.1);
  float wash=smoothstep(.49,.84,noise2(p*vec2(3.9,2.1)+vec2(t*.8,-t*.2))+.14*sin(p.y*2.+t*1.7));
  c+=vec3(.18,.21,.21)*shore*wash;
 }else{
  vec3 base=mix(vec3(.129,.143,.146),vec3(.212,.225,.224),rough);
  base+=(grit-.5)*.045*damp;
  // Expansion cuts, chipped safety stripes, tire scuffs, and small aggregate.
  vec2 g=abs(fract((p+vec2(.2,0.))/vec2(5.,7.5))-.5)*vec2(5.,7.5);
  base*=.73+.27*smoothstep(.008,.033,min(g.x,g.y)+.009*sin(p.x*12.+p.y));
  float lines=(1.-smoothstep(.07,.105,abs(p.x-7.05)))*step(.23,fract((p.y+2.)/5.4));
  lines+=1.-smoothstep(.045,.085,abs(p.x+.72));base=mix(base,vec3(.53,.394,.18),min(1.,lines)*smoothstep(.18,.62,grit));
  vec2 tracks=(p.x-vec2(4.2,6.0))*2.3;float tire=dot(exp(-tracks*tracks),vec2(1.));base*=1.-tire*.15;
  c=mix(base*vec3(.62,.69,.73),refl,(.15+.62*puddle)*(.44+.56*fres));
 }
 for(int i=0;i<16;i++){
  vec3 delta=lp[i]-w;float d2=dot(delta,delta);vec3 L=delta*inversesqrt(max(d2,.01));
  float att=power[i]*visibility(i,w,.00045)/(d2+4.);float highlight=pow(max(dot(reflect(-L,N),V),0.),sea==1?95.:64.);
  c+=lc[i]*att*(highlight*(sea==1?1.8:1.5)+max(dot(N,L),0.)*(sea==1?.014:.10));
 }
 c=mix(c,fogColor(-V),1.-exp(-dist*.0034));frag=vec4(c,1.);
}`;
export const glowVS=head+`
layout(location=0)in vec3 p;layout(location=1)in vec3 color;layout(location=2)in float size;
uniform mat4 vp;uniform vec3 right,up;out vec2 q;out vec3 col;flat out float shaft;uniform float clipHeight;
void main(){vec2 xy=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:-1.,(gl_VertexID==2||gl_VertexID==4||gl_VertexID==5)?1.:-1.);
 q=xy;col=color;shaft=step(size,0.);
 vec3 v=(right*xy.x+up*xy.y)*abs(size)*3.;
 if(shaft>.5){float down=(1.-xy.y)*.5;v=right*xy.x*(.24+down*abs(size)*2.7)-vec3(0.,down*abs(size)*5.6,0.);}
 gl_Position=vp*vec4(p+v,1.);if(p.y<clipHeight)gl_Position=vec4(2,2,2,1);}
`;
export const glowFS=head+`
in vec2 q;in vec3 col;flat in float shaft;out vec4 frag;
void main(){if(shaft>.5){float down=(1.-q.y)*.5;float haze=exp(-q.x*q.x*4.5)*exp(-down*4.)*(1.-smoothstep(.77,1.,down))*.066;frag=vec4(col*haze,1.);return;}float d=length(q);float fog=exp(-d*4.8)*.34*(1.-smoothstep(.7,1.,d));float core=exp(-d*30.);float ray=exp(-abs(q.y)*110.)*exp(-abs(q.x)*9.)*.2;frag=vec4(col*(fog+core*1.9+ray)+vec3(core*.35),1.);}
`;
export const rainVS=head+`
uniform mat4 vp;uniform vec3 eye,right;uniform float time,wind;out float alpha;
float rnd(float n){return fract(sin(n)*43758.5453);}
void main(){float i=float(gl_InstanceID+1);float h=rnd(i*.691);vec3 p=vec3(rnd(i*2.874),rnd(i*.457),rnd(i*4.33))*vec3(50.,27.,50.);
 p.x+=time*wind*.15;p.y-=time*(12.+h*5.);p.z+=time*.52;
 p=mod(p-eye,vec3(50.,27.,50.))+eye-vec3(25.,9.,25.);
 float end=float(gl_VertexID==2||gl_VertexID==4||gl_VertexID==5);float side=float(gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)*2.-1.;
 p+=vec3(-wind*.012,1.,-.035)*end*(.16+h*.34)+right*side*.009;gl_Position=vp*vec4(p,1.);
 alpha=(.09+h*.21)*(1.-end*.6)*smoothstep(-2.15,-1.75,p.y)*smoothstep(.65,2.5,length(p-eye));}
`;
export const rainFS=head+`
in float alpha;out vec4 frag;void main(){frag=vec4(.67,.76,.79,alpha);}
`;

export const shadowVS=head+`
layout(location=0)in vec3 pos;uniform mat4 vp;
void main(){gl_Position=vp*vec4(pos,1.);}
`;
export const shadowFS=head+`void main(){}`;


