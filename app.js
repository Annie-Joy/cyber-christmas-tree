import * as THREE from './vendor/three.module.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070b18, .022);
const camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
camera.position.set(0, 2.5, 14.8);
const tree = new THREE.Group(); scene.add(tree);
const photoGroup = new THREE.Group(); tree.add(photoGroup);
const themes = {mint:['#55f4ca','#bafdec','#f4cf83'],pink:['#ff6fba','#ffc5e7','#83d9ff'],blue:['#67baff','#c3ebff','#f3f8ff'],gold:['#f5bc66','#ffe2a2','#fff3d7']};
let theme='mint', spread=0, targetSpread=0, zoom=14.8, targetRot=.23, rot=.23, focused=null, activeGesture='', candidateGesture='', gestureFrames=0, lastGestureAt=0;
const points=[], colors=[], sizes=[], bases=[], scatters=[], kinds=[];
function addPoint(x,y,z,kind,size){const i=kinds.length,arm=i%4,angle=(i*2.399963229728653)+arm*Math.PI/2,rad=.7+Math.sqrt(Math.random())*6.8,swirl=angle+rad*.55;const gx=Math.cos(swirl)*rad,gy=Math.sin(swirl)*rad*.48,gz=(Math.random()-.5)*2.3; bases.push(x,y,z);scatters.push(gx-x,gy-y,gz-z);points.push(x,y,z);kinds.push(kind);sizes.push(size);colors.push(1,1,1)}
for(let i=0;i<5200;i++){
  const h=Math.random(), y=-3.1+h*6.4, radius=(1-h)*2.52;
  const theta=Math.random()*Math.PI*2, inner=.72+Math.random()*.28;
  addPoint(Math.cos(theta)*radius*inner,y,Math.sin(theta)*radius*inner,Math.random()<.075?2:Math.random()<.18?1:0,Math.random()<.07?4.5:1.2+Math.random()*1.9);
}
for(let i=0;i<1250;i++){
  const h=i/1250, y=-3.12+h*6.45, theta=h*Math.PI*22, r=(1-h)*2.58+.04;
  addPoint(Math.cos(theta)*r,y,Math.sin(theta)*r,2,1.7+Math.random()*2.6);
}
for(let i=0;i<650;i++){
  const h=Math.random(), a=Math.random()*Math.PI*2,r=2.9+Math.random()*7;
  addPoint(Math.cos(a)*r,(Math.random()-.5)*9,Math.sin(a)*r,3,.6+Math.random()*1.5);
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
geo.setAttribute('aColor',new THREE.Float32BufferAttribute(colors,3));
geo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
const material = new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`attribute vec3 aColor; attribute float aSize; varying vec3 vColor; varying float vPulse; uniform float uTime; void main(){vColor=aColor;vPulse=.72+.28*sin(uTime*2.0+position.y*4.0+position.x*3.0);vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(18.0,aSize*(145.0/-mv.z));gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 vColor;varying float vPulse;void main(){float d=length(gl_PointCoord-.5);float glow=exp(-d*d*18.0);float core=smoothstep(.19,.0,d);float a=(glow*.55+core*.8)*vPulse;if(a<.02)discard;gl_FragColor=vec4(vColor,a);}`});
const particleCloud = new THREE.Points(geo,material); tree.add(particleCloud);
// Translucent triangular fragments form a rotating galaxy when the tree opens.
const shardVertices=[],shardColors=[];for(let i=0;i<950;i++){const arm=i%4,rad=1+Math.sqrt(Math.random())*7.4,a=arm*Math.PI/2+rad*.58+(Math.random()-.5)*.9,px=Math.cos(a)*rad,py=Math.sin(a)*rad*.48,pz=(Math.random()-.5)*2.8,s=.025+Math.random()*.13,tilt=Math.random()*Math.PI*2;for(const [dx,dy] of [[0,s],[s*.5,-s*.7],[-s*.5,-s*.7]]){shardVertices.push(px+dx*Math.cos(tilt)-dy*Math.sin(tilt),py+dx*Math.sin(tilt)+dy*Math.cos(tilt),pz);shardColors.push(i%5===0?1:.36,i%5===0?.73:.94,i%5===0?.82:.87)}}
const shardGeo=new THREE.BufferGeometry();shardGeo.setAttribute('position',new THREE.Float32BufferAttribute(shardVertices,3));shardGeo.setAttribute('color',new THREE.Float32BufferAttribute(shardColors,3));const shardMat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});const shards=new THREE.Mesh(shardGeo,shardMat);scene.add(shards);
const nebulaMap=makeGlow();const nebulae=[];for(let i=0;i<5;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:nebulaMap,color:i%2?0x53eac9:0x8a8bff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));s.position.set((i-2)*2.6,Math.sin(i*2)*1.4,-2-i*.4);s.scale.set(5.8,3.2,1);scene.add(s);nebulae.push(s)}
function applyTheme(){const palette=themes[theme].map(c=>new THREE.Color(c)), attr=geo.attributes.aColor;for(let i=0;i<kinds.length;i++){let c=kinds[i]===3?new THREE.Color('#768eb4'):palette[Math.min(kinds[i],2)];attr.setXYZ(i,c.r,c.g,c.b)}attr.needsUpdate=true;document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('selected',b.dataset.theme===theme))}applyTheme();
// A small luminous star floats above the particle crown.
const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.16:.36;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y)}starShape.closePath();
const starMesh=new THREE.Mesh(new THREE.ShapeGeometry(starShape),new THREE.MeshBasicMaterial({color:0xffe4a7,side:THREE.DoubleSide}));starMesh.position.y=3.43;tree.add(starMesh);
const starGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:makeGlow(),color:0xffd99b,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));starGlow.position.y=3.43;starGlow.scale.set(2.4,2.4,1);tree.add(starGlow);
function makeGlow(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,3,64,64,64);g.addColorStop(0,'#fff');g.addColorStop(.2,'#fff9');g.addColorStop(1,'#fff0');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
const MAX_PHOTOS=12;let photos=[];const photoSlots=Array.from({length:MAX_PHOTOS},(_,i)=>[(i*2.399963229728653+.2)%(Math.PI*2),-2.25+(i%4)*1.35]);
function photoTexture(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#122534';x.fillRect(0,0,256,256);const s=Math.min(img.width,img.height),sx=(img.width-s)/2,sy=(img.height-s)/2;x.drawImage(img,sx,sy,s,s,17,17,222,222);x.strokeStyle='#a3ffdf';x.lineWidth=9;x.strokeRect(8,8,240,240);x.strokeStyle='#fff9';x.lineWidth=2;x.strokeRect(16,16,224,224);resolve(new THREE.CanvasTexture(c))};img.onerror=reject;img.src=src})}
async function rebuildPhotos(){while(photoGroup.children.length){const m=photoGroup.children[0];photoGroup.remove(m);m.material.map.dispose();m.material.dispose();m.geometry.dispose()}for(let i=0;i<photos.length;i++){const [theta,y]=photoSlots[i],r=(1-(y+3.1)/6.4)*2.52+.34;const tex=await photoTexture(photos[i]);const m=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:true}));m.position.set(Math.sin(theta)*r,y,Math.cos(theta)*r);m.rotation.y=theta;m.userData.home=m.position.clone();m.userData.homeRotation=theta;m.userData.index=i;photoGroup.add(m)}$('photoCount').textContent=`${photos.length} / ${MAX_PHOTOS}`;$('photoStrip').innerHTML='';photos.forEach((src,i)=>{const div=document.createElement('div');div.className='photo-thumb';const img=document.createElement('img');img.src=src;img.alt=`照片 ${i+1}`;img.onclick=()=>focusPhoto(i);const btn=document.createElement('button');btn.textContent='×';btn.setAttribute('aria-label',`移除照片 ${i+1}`);btn.onclick=()=>{photos.splice(i,1);focused=null;updateFocus();rebuildPhotos()};div.append(img,btn);$('photoStrip').append(div)});if(focused!==null&&focused>=photos.length){focused=null;updateFocus()}}
function compress(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const s=Math.min(img.width,img.height);x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,128,128);resolve(c.toDataURL('image/jpeg',.43))};img.src=reader.result};reader.readAsDataURL(file)})}
function toast(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2700)}
$('uploadHero').onclick=$('uploadPanel').onclick=()=>$('photoInput').click();
$('photoInput').onchange=async e=>{const files=[...e.target.files].slice(0,MAX_PHOTOS-photos.length);for(const file of files){try{photos.push(await compress(file))}catch{toast('这张照片无法读取')}}await rebuildPhotos();if(files.length)toast(`已挂上 ${files.length} 张照片`);e.target.value=''};
document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{theme=b.dataset.theme;applyTheme()});
$('wishText').oninput=e=>$('wishDisplay').textContent=e.target.value||'愿每个平凡日子都闪闪发光';
$('scatterBtn').onclick=()=>{targetSpread=targetSpread>.5?0:1;$('scatterBtn').querySelector('span').textContent=targetSpread?'聚合':'散开'};
$('resetBtn').onclick=()=>{targetRot=.23;zoom=14.8;targetSpread=0;focused=null;updateFocus()};
function updateFocus(){const box=$('photoFocus');box.classList.toggle('hidden',focused===null);if(focused!==null){$('focusImage').src=photos[focused];$('focusCounter').textContent=`${focused+1} / ${photos.length}`;box.style.setProperty('--focus-scale','1')}}
function focusPhoto(i){if(!photos.length)return;focused=i===focused?null:i;targetSpread=0;updateFocus();toast(focused===null?'回到圣诞树':`正在聚焦照片 ${i+1}`)}
$('focusClose').onclick=()=>{focused=null;updateFocus()};$('focusPrev').onclick=()=>{focused=(focused-1+photos.length)%photos.length;updateFocus()};$('focusNext').onclick=()=>{focused=(focused+1)%photos.length;updateFocus()};
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,dragged=false,pinchDistance=0;
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,rot:targetRot};dragged=false;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>4)dragged=true;targetRot=down.rot+dx*.006;camera.position.y=THREE.MathUtils.clamp(2.5+dy*.009,-1.4,5.4)});
canvas.addEventListener('pointerup',e=>{if(!dragged){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(photoGroup.children)[0];if(hit)focusPhoto(hit.object.userData.index);else{targetSpread=1;setTimeout(()=>targetSpread=0,650)}}down=null});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.012,9,22)},{passive:false});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinchDistance)zoom=THREE.MathUtils.clamp(zoom+(pinchDistance-d)*.025,9,22);pinchDistance=d}},{passive:true});canvas.addEventListener('touchend',()=>pinchDistance=0);
$('musicInput').onchange=e=>{const file=e.target.files[0];if(!file)return;const audio=$('music');if(audio.src.startsWith('blob:'))URL.revokeObjectURL(audio.src);audio.src=URL.createObjectURL(file);$('musicToggle').disabled=false;audio.play().then(()=>toast('音乐已开始播放')).catch(()=>toast('点击播放音乐'))};$('musicToggle').onclick=()=>{const a=$('music');a.paused?a.play():a.pause()};
function encodeState(){const state={v:1,t:theme,w:$('wishText').value,p:photos};return btoa(unescape(encodeURIComponent(JSON.stringify(state))))}
function decodeState(s){return JSON.parse(decodeURIComponent(escape(atob(s))))}
try{if(location.hash.startsWith('#tree=')){const data=decodeState(location.hash.slice(6));if(themes[data.t]){theme=data.t;applyTheme()}if(typeof data.w==='string'){$('wishText').value=data.w.slice(0,36);$('wishDisplay').textContent=$('wishText').value}if(Array.isArray(data.p)){photos=data.p.filter(x=>typeof x==='string'&&x.startsWith('data:image/jpeg;base64,')).slice(0,MAX_PHOTOS);rebuildPhotos()}}}catch{toast('分享链接无法读取')}
$('shareBtn').onclick=async()=>{const url=location.origin+location.pathname+'#tree='+encodeState();if(url.length>60000){toast('照片较多，链接过长；请减少照片后分享');return}try{if(navigator.share)await navigator.share({title:'我的赛博圣诞树',text:'来看看我挂在星光里的回忆',url});else{await navigator.clipboard.writeText(url);toast('专属链接已复制')}}catch(e){if(e.name!=='AbortError'){try{await navigator.clipboard.writeText(url);toast('专属链接已复制')}catch{toast('复制失败，请检查浏览器权限')}}}};
const modal=$('gestureModal');$('gestureHero').onclick=()=>modal.classList.remove('hidden');$('closeModal').onclick=()=>modal.classList.add('hidden');modal.onclick=e=>{if(e.target===modal)modal.classList.add('hidden')};
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s)})}
let handTracker=null,stream=null,tracking=false;
$('startCamera').onclick=async()=>{const msg=$('gestureMessage');msg.textContent='正在请求摄像头并加载识别模型…';try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});const video=$('camera');video.srcObject=stream;await video.play();if(!window.Hands)await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js');handTracker=new window.Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`});handTracker.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:.65,minTrackingConfidence:.6});handTracker.onResults(onHand);tracking=true;modal.classList.add('hidden');$('cameraBadge').classList.add('active');$('cameraBadge').innerHTML='<i></i>手势已开启';toast('摄像头已开启，试试握拳或张手');trackLoop()}catch(e){msg.textContent=e.name==='NotAllowedError'?'摄像头权限被拒绝，请在浏览器设置中允许。':'无法启动手势识别，请检查网络和摄像头。';stream?.getTracks().forEach(t=>t.stop())}};
async function trackLoop(){if(!tracking)return;try{await handTracker.send({image:$('camera')})}catch{tracking=false;$('cameraBadge').classList.remove('active');$('cameraBadge').innerHTML='<i></i>手势已停止';toast('手势识别已停止')}if(tracking)requestAnimationFrame(trackLoop)}
function onHand(res){const lm=res.multiHandLandmarks?.[0];if(!lm){candidateGesture='';gestureFrames=0;return}const now=performance.now(),w=lm[0],tip=[8,12,16,20],pip=[6,10,14,18];const fingers=tip.map((id,i)=>Math.hypot(lm[id].x-w.x,lm[id].y-w.y)>Math.hypot(lm[pip[i]].x-w.x,lm[pip[i]].y-w.y)*1.1);const extended=fingers.filter(Boolean).length,palm=Math.max(.04,Math.hypot(lm[5].x-lm[17].x,lm[5].y-lm[17].y));const pinchRatio=Math.hypot(lm[4].x-lm[8].x,lm[4].y-lm[8].y)/palm;const thumbUp=extended<=1&&lm[4].y<lm[3].y-.06&&lm[4].y<lm[5].y-.1;let gesture='move';if(thumbUp)gesture='thumb';else if(extended===0&&pinchRatio>.42)gesture='fist';else if(photos.length&&pinchRatio<.58)gesture='pinch';else if(fingers[0]&&fingers[1]&&!fingers[2]&&!fingers[3])gesture='victory';else if(extended>=4)gesture='open';else if(extended===0)gesture='fist';
  targetRot+=(.5-lm[9].x)*.018;if(focused!==null&&pinchRatio<1.15&&gesture!=='fist'&&gesture!=='open')$('photoFocus').style.setProperty('--focus-scale',String(THREE.MathUtils.clamp(.9+pinchRatio*.85,1,1.8)));
  if(gesture===candidateGesture)gestureFrames++;else{candidateGesture=gesture;gestureFrames=1}if(gestureFrames<3||gesture===activeGesture||now-lastGestureAt<600)return;activeGesture=gesture;lastGestureAt=now;
  if(gesture==='open'){targetSpread=1;focused=null;updateFocus();toast('碎片银河已展开')}
  if(gesture==='fist'){targetSpread=0;focused=null;updateFocus();toast('星光重新聚合')}
  if(gesture==='pinch'&&photos.length){focused=focused===null?0:focused;targetSpread=0;updateFocus();toast('改变指距即可缩放照片')}
  if(gesture==='victory'&&photos.length){focused=focused===null?0:(focused+1)%photos.length;targetSpread=0;updateFocus();toast('已切换到下一张照片')}
  if(gesture==='thumb'){targetSpread=1;setTimeout(()=>targetSpread=0,850);toast('星光绽放 ✨')}
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
const baseArray=new Float32Array(bases),scatterArray=new Float32Array(scatters);let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;material.uniforms.uTime.value=now*.001;spread+=(targetSpread-spread)*Math.min(1,dt*3.7);rot+=(targetRot-rot)*Math.min(1,dt*4);tree.rotation.y=rot+now*.000035;const pos=geo.attributes.position.array;for(let i=0;i<pos.length;i++){pos[i]=baseArray[i]+scatterArray[i]*spread}geo.attributes.position.needsUpdate=true;camera.position.z+=(zoom-camera.position.z)*Math.min(1,dt*4);starGlow.material.opacity=.7+Math.sin(now*.002)*.2;shards.rotation.z=now*.00006;shardMat.opacity=spread*.76;nebulae.forEach((n,i)=>{n.material.opacity=spread*(.13+Math.sin(now*.0008+i)*.04)});for(const m of photoGroup.children){m.position.lerp(m.userData.home,Math.min(1,dt*4));m.rotation.y+=(m.userData.homeRotation-m.rotation.y)*Math.min(1,dt*4);m.scale.lerp(new THREE.Vector3(1,1,1),Math.min(1,dt*4))}renderer.render(scene,camera)}requestAnimationFrame(animate);
