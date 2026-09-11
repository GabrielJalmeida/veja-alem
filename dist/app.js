'use strict';
const $ = s => document.querySelector(s);
const models = {
  orbit: { id:'69401ad8d4fa435987ae056cfc559573', name:'Orbit', price:3290, finish:'Polar white' },
  sight: { id:'9f10cc6a97e74d8082e368e66b075860', name:'Sight', price:2890, finish:'Augmented reality' },
  everyday: { id:'d4f3e1fdfc8543a1aa6324da9c1cbef9', name:'Everyday', price:1890, finish:'Smart living' }
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const viewers = new Map();
let orbitAnnotations = [{name:'Sensors',content:{raw:'2 built in sensors'}},{name:'Earphones',content:{raw:''}}], orbitHome = null, orbitPhase = -1, orbitAppliedPhase = -1, selection = [], toastTimer;
const money = value => value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const plainText = value => typeof value === 'string' ? new DOMParser().parseFromString(value, 'text/html').body.textContent.trim() : '';
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500)}
function failViewer(wrapper,message){wrapper.classList.add('failed');wrapper.querySelector('.viewer-error').hidden=false;if(message)wrapper.querySelector('.viewer-error p').textContent=message;if(wrapper.dataset.model==='orbit'){$('#orbit-journey').classList.add('without-3d');updateOrbitJourney()}}
function initViewer(wrapper){
 const key=wrapper.dataset.model;
 if(viewers.get(key)?.loading||viewers.get(key)?.ready)return;
 wrapper.classList.remove('failed');wrapper.querySelector('.viewer-error').hidden=true;
 if(typeof Sketchfab==='undefined'){failViewer(wrapper,'Não foi possível conectar ao Sketchfab.');return}
 const state={loading:true,ready:false,wrapper,api:null};viewers.set(key,state);
 const timeout=setTimeout(()=>{if(viewers.get(key)===state&&!state.ready){state.loading=false;failViewer(wrapper,'O carregamento está demorando. Você pode tentar novamente.')}},45000);
 const client=new Sketchfab('1.12.1',wrapper.querySelector('iframe'));
 client.init(models[key].id,{autostart:1,preload:1,camera:0,transparent:1,autospin:0,ui_infos:0,ui_controls:0,ui_hint:0,ui_stop:0,ui_annotations:0,annotations_visible:0,ui_watermark:1,ui_watermark_link:1,scrollwheel:0,annotation_tooltip_visible:0,
  success(api){if(viewers.get(key)!==state)return;state.api=api;api.addEventListener('viewerready',()=>{
   if(viewers.get(key)!==state)return;
   clearTimeout(timeout);state.loading=false;state.ready=true;wrapper.classList.remove('failed');wrapper.querySelector('.viewer-error').hidden=true;
   wrapper.classList.add('ready');
   api.setBackground({transparent:true});
   // Background transparency does not remove the model author's screen-space vignette.
   api.setPostProcessing({vignetteEnable:false,grainEnable:false,chromaticAberrationEnable:false,dofEnable:false});
   api.setEnableCameraConstraints(false);
   if(key==='sight'){

    api.getEnvironment((error,environment)=>{if(!error&&viewers.get(key)===state){api.setEnvironment({enabled:true,exposure:Math.min(3,Math.max(1.5,(Number(environment.exposure)||1)*2)),lightIntensity:Math.max(1,Number(environment.lightIntensity)||1)})}});
   }
   if(key==='orbit')setupOrbit(api);
   else if(key==='sight')api.recenterCamera(()=>poseCollection(api,key));
   else poseCollection(api,key);

  });api.start();},
  error(error){if(viewers.get(key)!==state)return;console.warn("Sketchfab initialization",key,error);clearTimeout(timeout);state.loading=false;failViewer(wrapper,String(error).includes('Webgl')?'Este navegador está sem suporte a 3D.':undefined)}
 });
}
function annotationTitle(annotation,index){const title=plainText(annotation.name||annotation.title);return ({Sensors:'Sensores integrados',Earphones:'Áudio integrado'})[title]||title||'Explorar detalhe '+String(index+1).padStart(2,'0')}
function annotationCopy(annotation){const title=plainText(annotation.name||annotation.title);if(title==='Sensors')return 'Dois sensores integrados ao desenho do Orbit. Descubra como a tecnologia se integra à armação.';if(title==='Earphones')return 'O áudio faz parte da experiência. Explore os fones incorporados ao design: imagem e som no mesmo objeto, com menos acessórios entre você e a imersão.';const c=annotation.content;if(typeof c==='string')return plainText(c);if(c&&typeof c==='object')return plainText(c.rendered||c.raw||'');return ''}
// Native scroll selects four authored camera stops; it never traps wheel/touch input.
function phaseForProgress(progress){return Math.min(3,Math.max(0,Math.floor(progress*4)))}
function updateOrbitJourney(){
 const journey=$('#orbit-journey'),pin=journey.querySelector('.orbit-pin');
 const range=Math.max(1,journey.offsetHeight-pin.offsetHeight);
 const progress=Math.max(0,Math.min(1,-journey.getBoundingClientRect().top/range));
 journey.style.setProperty('--journey-progress',progress);
 const phase=phaseForProgress(progress);
 if(phase!==orbitPhase){
  orbitPhase=phase;
  setHologramPhase(phase);
  const annotation=orbitAnnotations[phase-1];
  $('#detail-number').textContent=['01 / ORBIT','02 / SENSORES','03 / ÁUDIO','04 / VISÃO COMPLETA'][phase];
  $('#detail-title').textContent=phase===0?'Um universo por dentro.':phase===3?'Tudo no mesmo olhar.':annotationTitle(annotation||{},phase-1);
  $('#detail-description').textContent=phase===0?'Continue rolando para conhecer os sensores e o áudio integrado.':phase===3?'Sensores, áudio e design em um só objeto. Seu próximo universo está pronto para acompanhar você.':annotationCopy(annotation||{});
  document.querySelectorAll('.orbit-steps li').forEach((item,index)=>{if(index===phase)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current')});
 }
 applyOrbitPhase();
}
function applyOrbitPhase(){
 const state=viewers.get('orbit');
 if(!state?.ready||!state.annotationsReady||!orbitHome||orbitAppliedPhase===orbitPhase)return;
 orbitAppliedPhase=orbitPhase;
 const api=state.api;
 if(orbitPhase===1||orbitPhase===2){
  if(!orbitAnnotations[orbitPhase-1])return;
  api.gotoAnnotation(orbitPhase-1,{preventCameraAnimation:reducedMotion.matches,preventCameraMove:false});
 }else{
  api.unselectAnnotation();
  api.setCameraLookAt(orbitHome.position,orbitHome.target,reducedMotion.matches?0:1.1);
 }
}
const hologramData=[
 {position:[-6.385571371547586,-4.267754834526344,.7415544837071536],code:'ORBIT / SENSOR ARRAY',title:'Sensores integrados',description:'Duas unidades incorporadas à armação. Tecnologia presente em cada detalhe.',tag:'02 SENSORES'},
 {position:[-6.1354339361661125,3.6781193775574543,-1.045647696331365],code:'ORBIT / AUDIO SYSTEM',title:'Som que acompanha você',description:'Fones integrados às hastes. Imagem e áudio na mesma experiência.',tag:'ÁUDIO INTEGRADO'}
];
let hologramFrame=0,hologramBusy=false,hologramLast=0,hologramGeneration=0;
function setHologramPhase(phase){
 const layer=$('#orbit-hologram');
 ++hologramGeneration;cancelAnimationFrame(hologramFrame);hologramBusy=false;
 layer.classList.remove('is-visible');layer.dataset.phase=phase;
 if(phase!==1&&phase!==2)return;
 const info=hologramData[phase-1];
 $('#holo-code').textContent=info.code;$('#holo-title').textContent=info.title;
 $('#holo-description').textContent=info.description;$('#holo-tag').textContent=info.tag;
 hologramLast=0;hologramFrame=requestAnimationFrame(trackHologram);
}
function trackHologram(time){
 if(orbitPhase!==1&&orbitPhase!==2)return;
 hologramFrame=requestAnimationFrame(trackHologram);
 const state=viewers.get('orbit'),layer=$('#orbit-hologram');
 if(!state?.ready||!state.annotationsReady||document.hidden){layer.classList.remove('is-visible');return}
 if(hologramBusy||time-hologramLast<100)return;
 hologramLast=time;hologramBusy=true;
 const generation=hologramGeneration;
 const annotation=orbitAnnotations[orbitPhase-1];
 const position=Array.isArray(annotation?.position)?annotation.position:hologramData[orbitPhase-1].position;
 state.api.getWorldToScreenCoordinates(position,coordinates=>{
  if(generation!==hologramGeneration)return;
  hologramBusy=false;
  const point=coordinates?.canvasCoord;
  const w=layer.clientWidth,h=layer.clientHeight;
  if(!point||!Number.isFinite(point[0])||!Number.isFinite(point[1])||point[0]<0||point[0]>w||point[1]<0||point[1]>h){layer.classList.remove('is-visible');return}
  const panel=layer.querySelector('.holo-panel'),rect=panel.getBoundingClientRect(),bounds=layer.getBoundingClientRect();
  const x=point[0],y=point[1],left=rect.left-bounds.left;
  const endX=x<left?left:left+rect.width,endY=rect.top-bounds.top+Math.min(28,rect.height/2);
  const elbowX=endX+(x<left?-24:24);
  layer.querySelector('.holo-line').setAttribute('d',`M ${x} ${y} L ${elbowX} ${endY} L ${endX} ${endY}`);
  for(const circle of layer.querySelectorAll('circle')){circle.setAttribute('cx',x);circle.setAttribute('cy',y)}
  layer.classList.add('is-visible');
 });
}
function setupOrbit(api){
 orbitAppliedPhase=-1;orbitHome=null;
 $('#orbit-journey').classList.remove('without-3d');
 api.setUserInteraction(false);
 api.getCameraLookAt((error,camera)=>{if(!error&&viewers.get('orbit')?.api===api){orbitHome={position:[...camera.position],target:[...camera.target]};updateOrbitJourney()}});
 api.getAnnotationList((error,list)=>{
  if(viewers.get('orbit')?.api!==api)return;
  if(!error&&Array.isArray(list)&&list.length>=2){orbitAnnotations=list;viewers.get('orbit').annotationsReady=true;orbitPhase=-1;updateOrbitJourney()}
  else{$('#orbit-journey').classList.add('without-3d')}
 });
}
function poseCollection(api,key){
 // Preserve yaw and distance; present Sight from above and Everyday from below.
 api.getCameraLookAt((error,camera)=>{
  if(error)return;
  const target=camera.target,d=camera.position.map((v,i)=>v-target[i]);
  const distance=Math.hypot(...d),yaw=Math.atan2(d[1],d[0]),pitch=key==='sight'?.32:-.28;
  api.setCameraLookAt([target[0]+distance*Math.cos(pitch)*Math.cos(yaw),target[1]+distance*Math.cos(pitch)*Math.sin(yaw),target[2]+distance*Math.sin(pitch)],target,0);
 });
}
let scrollQueued=false;
function queueOrbitUpdate(){if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;updateOrbitJourney()})}
window.addEventListener('scroll',queueOrbitUpdate,{passive:true});
window.addEventListener('resize',queueOrbitUpdate);
reducedMotion.addEventListener('change',()=>{orbitAppliedPhase=-1;queueOrbitUpdate()});
queueOrbitUpdate();
const lazyObserver=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){initViewer(e.target);lazyObserver.unobserve(e.target)}}},{rootMargin:'200px'});
document.querySelectorAll('.viewer').forEach(v=>{v.querySelector('.retry').addEventListener('click',()=>{const s=viewers.get(v.dataset.model);if(s){s.loading=false;s.ready=false}initViewer(v)});lazyObserver.observe(v)});
function renderSelection(){
 $('#count').textContent=String(selection.length).padStart(2,'0');const items=$('#selection-items');items.replaceChildren();
 if(!selection.length){const p=document.createElement('p');p.textContent='Seu próximo olhar ainda está esperando por você.';p.className='demo-note';items.append(p)}
 selection.forEach((key,index)=>{const m=models[key],row=document.createElement('div');row.className='selection-item';const info=document.createElement('div'),name=document.createElement('strong'),sub=document.createElement('small');name.textContent=m.name;sub.textContent=m.finish+' / '+money(m.price);info.append(name,sub);const remove=document.createElement('button');remove.textContent='Remover';remove.setAttribute('aria-label','Remover '+m.name);remove.onclick=()=>{selection.splice(index,1);renderSelection()};row.append(info,remove);items.append(row)});
 $('#selection-total').textContent=selection.length?'Total ilustrativo: '+money(selection.reduce((sum,key)=>sum+models[key].price,0)):'';
}
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{selection.push(b.dataset.add);renderSelection();toast(models[b.dataset.add].name+' adicionado à sua seleção.')}));
$('#bag').addEventListener('click',()=>{renderSelection();$('#selection').showModal()});$('#close-selection').onclick=$('#continue').onclick=()=>$('#selection').close();$('#selection').addEventListener('click',e=>{if(e.target===$('#selection')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
// Floating readouts follow the visitor within each product's own environment.
if(matchMedia('(pointer:fine)').matches){document.querySelectorAll('.world').forEach(world=>{world.addEventListener('pointermove',event=>{if(reducedMotion.matches)return;const rect=world.getBoundingClientRect();world.style.setProperty('--look-x',((event.clientX-rect.left)/rect.width-.5)*14+'px');world.style.setProperty('--look-y',((event.clientY-rect.top)/rect.height-.5)*10+'px')});world.addEventListener('pointerleave',()=>{world.style.setProperty('--look-x','0px');world.style.setProperty('--look-y','0px')})})}
