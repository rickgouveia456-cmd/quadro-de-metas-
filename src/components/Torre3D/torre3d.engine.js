// ================================================================
// torre3d.engine.js — Three.js engine isolada (sem React)
// ================================================================
import * as THREE from 'three';

const AW=3.2, AD=4.8, AH=2.8, GAP=0.18, CW=5.4, VAR_S=0.55, VAR_H=0.18;
const ROW_W = GAP + 4*(AW+GAP) + CW + 4*(AW+GAP) + GAP;
const CX    = ROW_W / 2;
const HALF_D = AD/2 + GAP/2;

const STATUS_HEX = { livre:0x94a3b8, andamento:0xf59e0b, concluido:0x16a34a, atrasado:0xef4444 };
const STATUS_CSS = { livre:'#64748b', andamento:'#d97706', concluido:'#15803d', atrasado:'#dc2626' };

function colX(col) {
  if (col < 4)   return GAP + col*(AW+GAP) + AW/2;
  if (col === 4) return GAP + 4*(AW+GAP) + CW/2;
  return GAP + 4*(AW+GAP) + CW + GAP + (col-5)*(AW+GAP) + AW/2;
}
const CORE_CX = colX(4);

const CICLOS_DEF = [
  {ciclo:'A',tipo:'Tipo 4',area:'56,69m²'},{ciclo:'B',tipo:'Tipo 3',area:'48,31m²'},
  {ciclo:'C',tipo:'Tipo 3',area:'48,31m²'},{ciclo:'D',tipo:'Tipo 4',area:'56,69m²'},
];

export function buildTorre3D({ wrapper, canvas, pavimentos, ciclos = CICLOS_DEF, getStatus, onClickApto }) {
  let scene, camera, renderer, raycaster, mouse;
  let aptoCubes = [];
  let isOrbiting = false, orbitStart = {x:0,y:0};
  let sph = {theta:0.72,phi:0.82,radius:95};
  let tgt = {theta:0.72,phi:0.82,radius:95};
  let hoveredMesh = null;
  let rafId = null;
  const tooltipEl = document.getElementById('tooltip3d');
  const labelEl   = document.getElementById('label3d');

  // Scene — fundo claro
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eef3);
  scene.fog = new THREE.FogExp2(0xe8eef3, 0.006);

  // Camera
  const W = wrapper.clientWidth || 900;
  const H = wrapper.clientHeight || 620;
  camera = new THREE.PerspectiveCamera(40, W/H, 0.5, 600);
  updateCam();

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Luzes — ambiente claro
  scene.add(new THREE.AmbientLight(0xffffff, 0.70));
  const sun = new THREE.DirectionalLight(0xfff8f0, 1.1);
  sun.position.set(35,70,45); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-60; sun.shadow.camera.right=60;
  sun.shadow.camera.top=100;  sun.shadow.camera.bottom=-15;
  sun.shadow.bias=-0.001;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d8f0, 0.45);
  fill.position.set(-30,40,-25); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xddeeff, 0xc8d4c0, 0.35));

  // Chão — claro
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0xd5e1e8,roughness:.9}));
  plane.rotation.x = -Math.PI/2; plane.position.set(CX,0,0); plane.receiveShadow=true;
  scene.add(plane);
  const grid = new THREE.GridHelper(180,80,0xb0c4ce,0xc8d8e0); grid.position.y=.02; scene.add(grid);
  const base = new THREE.Mesh(new THREE.BoxGeometry(ROW_W+1.8,.7,AD*2+GAP*3+1.4), new THREE.MeshStandardMaterial({color:0xb8cdd6,roughness:.85}));
  base.position.set(CX,.35,0); base.castShadow=base.receiveShadow=true; scene.add(base);

  // Torre
  buildTower();

  // Raycaster
  raycaster = new THREE.Raycaster(); mouse = new THREE.Vector2(-999,-999);

  // Eventos
  canvas.addEventListener('mousemove', onMM);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousedown', e => { if(e.button===0){isOrbiting=true;orbitStart={x:e.clientX,y:e.clientY};} });
  canvas.addEventListener('mouseup', ()=>isOrbiting=false);
  canvas.addEventListener('mouseleave', ()=>{isOrbiting=false;hideLabel();hideTooltip();});
  canvas.addEventListener('wheel', e=>{tgt.radius=Math.max(18,Math.min(160,tgt.radius+e.deltaY*.05));},{passive:true});
  window.addEventListener('resize', onResize);

  animate();

  // ── Construir torre ──────────────────────────────────────────
  function buildTower() {
    aptoCubes = [];
    pavimentos.forEach((pav, li) => {
      const yBase = .7 + li*AH;
      if (pav.num === 'COB') { buildCobertura(yBase); return; }
      if (li > 0) addSlab(yBase);
      ciclos.forEach((c,ci) => buildApto(pav, c, 'frente', colX(ci), yBase));
      ciclos.forEach((c,ci) => buildApto(pav, c, 'fundos', colX(ci+5), yBase));
      buildCore(yBase, li);
    });
  }

  function addSlab(yBase) {
    const totalD = AD*2+GAP*3;
    [
      [new THREE.BoxGeometry(ROW_W,.20,totalD), {color:0x0d1e2e,roughness:.95}, 0],
      [new THREE.BoxGeometry(ROW_W+.12,.28,totalD+.12), {color:0x091520,roughness:1}, 0],
    ].forEach(([geo,mat,_]) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(mat));
      m.position.set(CX,yBase-.10,0); m.receiveShadow=true; scene.add(m);
    });
  }

  function buildApto(pav, cicloObj, fachada, posX, yBase) {
    const st  = getStatus(pav.num, cicloObj.ciclo);
    const col = STATUS_HEX[st] || STATUS_HEX.livre;
    const isF = fachada==='frente';
    const posZ = isF ? -HALF_D : +HALF_D;
    const vDir = isF ? -1 : +1;

    const geo = new THREE.BoxGeometry(AW-GAP, AH-.20, AD-GAP);
    const mat = new THREE.MeshStandardMaterial({
      color:col, roughness:.55, metalness:.05,
      emissive: new THREE.Color(col).multiplyScalar(.04),
    });
    const body = new THREE.Mesh(geo, mat);
    body.position.set(posX, yBase+(AH-.20)/2+.20, posZ);
    body.castShadow=body.receiveShadow=true;
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:.28})));
    body.userData = { type:'apto', pav:pav.num, ciclo:cicloObj.ciclo, fachada, pavLabel:pav.label, tipo:cicloObj.tipo, area:cicloObj.area };
    scene.add(body); aptoCubes.push(body);

    // Varanda
    const varW = AW-GAP-.24;
    const var3 = new THREE.Mesh(new THREE.BoxGeometry(varW,VAR_H,VAR_S), new THREE.MeshStandardMaterial({color:new THREE.Color(col).lerp(new THREE.Color(0x091520),.4),roughness:.82}));
    var3.position.set(posX, yBase+AH-.34, posZ+vDir*(AD/2-GAP/2+VAR_S/2));
    var3.castShadow=true; scene.add(var3);
    const gc = new THREE.Mesh(new THREE.BoxGeometry(varW+.04,.10,VAR_S+.06),new THREE.MeshStandardMaterial({color:0x1e3a4a,metalness:.55,roughness:.4}));
    gc.position.set(posX,yBase+AH-.08,posZ+vDir*(AD/2-GAP/2+VAR_S/2)); scene.add(gc);

    // Janela
    const winW=AW-GAP-.46, winH=AH*.46, faceZ=posZ+vDir*(AD/2-GAP/2+.02);
    const win=new THREE.Mesh(new THREE.PlaneGeometry(winW,winH),new THREE.MeshStandardMaterial({color:0x5e9fba,metalness:.55,roughness:.18,transparent:true,opacity:.78,side:THREE.DoubleSide}));
    win.position.set(posX,yBase+AH*.54,faceZ); if(!isF)win.rotation.y=Math.PI; scene.add(win);
    const frm=new THREE.Mesh(new THREE.BoxGeometry(winW+.14,winH+.14,.07),new THREE.MeshStandardMaterial({color:0x091520,roughness:.9}));
    frm.position.set(posX,yBase+AH*.54,faceZ+vDir*.04); scene.add(frm);
  }

  function buildCore(yBase, li) {
    const coreH=AH-.20, coreY=yBase+coreH/2+.20, hCD=(AD-GAP)/2;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(CW-GAP,coreH,AD-GAP),new THREE.MeshStandardMaterial({color:0x0f2030,roughness:.88,metalness:.12,emissive:new THREE.Color(0x081520)}));
    mesh.position.set(CORE_CX,coreY,0); mesh.castShadow=mesh.receiveShadow=true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CW-GAP,coreH,AD-GAP)),new THREE.LineBasicMaterial({color:0x1a3a52,transparent:true,opacity:.6})));
    mesh.userData={type:'core'}; scene.add(mesh);

    const wall=new THREE.Mesh(new THREE.BoxGeometry(CW-GAP-.1,coreH-.1,.12),new THREE.MeshStandardMaterial({color:0x1a3550}));
    wall.position.set(CORE_CX,coreY,0); scene.add(wall);

    const doorH=AH*.62, doorY=yBase+doorH/2+.20;
    // ELV — fachada Sul
    const elvW=(CW-GAP)*.72, elvZ=-(hCD+.05);
    const elvD=new THREE.Mesh(new THREE.BoxGeometry(elvW,doorH,.10),new THREE.MeshStandardMaterial({color:0x1e4870,metalness:.65,roughness:.28}));
    elvD.position.set(CORE_CX,doorY,elvZ); scene.add(elvD);
    // ESC — fachada Norte
    const escW=(CW-GAP)*.55, escZ=+(hCD+.05);
    const escD=new THREE.Mesh(new THREE.BoxGeometry(escW,doorH,.10),new THREE.MeshStandardMaterial({color:0x2a2a3a,metalness:.3,roughness:.65}));
    escD.position.set(CORE_CX,doorY,escZ); scene.add(escD);

    const ly=yBase+AH-.10;
    addSprite('ELV',    CORE_CX, ly, -(hCD+.6), .24, '#00b4d8');
    addSprite('ESC PCF',CORE_CX, ly, +(hCD+.6), .24, '#f97316');
    if(li%4===0) {
      addSprite('🛗 ELEVADOR',     CORE_CX, ly+.55, -(hCD+.8), .28, '#00b4d8');
      addSprite('🪜 ESCADA PCF',   CORE_CX, ly+.55, +(hCD+.8), .28, '#f97316');
    }
  }

  function buildCobertura(yBase) {
    const totalD=AD*2+GAP*3;
    const laje=new THREE.Mesh(new THREE.BoxGeometry(ROW_W+.5,.30,totalD+.5),new THREE.MeshStandardMaterial({color:0x111f2e,roughness:.88,metalness:.12}));
    laje.position.set(CX,yBase+.15,0); scene.add(laje);
    const cm=new THREE.Mesh(new THREE.BoxGeometry(CW+1.2,3.4,AD+.8),new THREE.MeshStandardMaterial({color:0x0d1c2c,roughness:.9,metalness:.1}));
    cm.position.set(CORE_CX,yBase+.3+.85+1.7,0); cm.castShadow=true; scene.add(cm);
    addSprite('COBERTURA',CX,yBase+.3+.85+3.4+2.2,-(totalD/2+1),.55,'#ffd600');
  }

  function addSprite(text,x,y,z,scale,color) {
    const cvs=document.createElement('canvas'); cvs.width=512; cvs.height=96;
    const ctx=cvs.getContext('2d');
    ctx.fillStyle='rgba(6,16,26,.88)'; rrect(ctx,4,8,504,80,12); ctx.fill();
    ctx.strokeStyle=color||'#ffd600'; ctx.lineWidth=3; rrect(ctx,4,8,504,80,12); ctx.stroke();
    ctx.fillStyle=color||'#ffd600'; ctx.font='bold 36px Segoe UI,Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,256,50);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cvs),transparent:true,depthTest:false}));
    spr.scale.set(scale*5.5,scale*1,1); spr.position.set(x,y,z); spr.userData={type:'label'}; scene.add(spr);
  }

  function rrect(ctx,x,y,w,h,r) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  // ── Câmera ──────────────────────────────────────────────────
  function updateCam() {
    const midY=.7+(16*AH)/2;
    camera.position.set(CX+sph.radius*Math.sin(sph.phi)*Math.sin(sph.theta),midY+sph.radius*Math.cos(sph.phi),sph.radius*Math.sin(sph.phi)*Math.cos(sph.theta));
    camera.lookAt(CX,midY*.82,0);
  }

  // ── Hover / Click ───────────────────────────────────────────
  function onMM(e) {
    const rect=renderer.domElement.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    if(isOrbiting){
      const dx=e.clientX-orbitStart.x, dy=e.clientY-orbitStart.y;
      orbitStart={x:e.clientX,y:e.clientY};
      tgt.theta-=dx*.007; tgt.phi-=dy*.007; tgt.phi=Math.max(.10,Math.min(1.52,tgt.phi));
      return;
    }
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(aptoCubes,false);
    if(hits.length>0){
      const m=hits[0].object;
      if(m!==hoveredMesh){ restoreHover(); hoveredMesh=m; m.material.emissive.setHex(0x2a5a88); m.scale.setScalar(1.028); }
      showLabel(m.userData,e.clientX,e.clientY);
      showTooltip(m.userData,e.clientX,e.clientY);
    } else { restoreHover(); hideLabel(); hideTooltip(); }
  }

  function restoreHover() {
    if(!hoveredMesh)return;
    const col=STATUS_HEX[getStatus(hoveredMesh.userData.pav,hoveredMesh.userData.ciclo)]||STATUS_HEX.livre;
    hoveredMesh.material.color.setHex(col);
    hoveredMesh.material.emissive.setHex(new THREE.Color(col).multiplyScalar(.07).getHex());
    hoveredMesh.scale.setScalar(1); hoveredMesh=null;
  }

  function onClick() {
    if(isOrbiting)return;
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(aptoCubes,false);
    if(hits.length>0&&hits[0].object.userData.type==='apto') onClickApto(hits[0].object.userData);
  }

  function showLabel(ud,cx,cy) {
    if(!labelEl||ud.type!=='apto')return;
    const cod=(ud.pav==='T'?'T':String(ud.pav))+ud.ciclo;
    const st=getStatus(ud.pav,ud.ciclo);
    labelEl.textContent=cod; labelEl.style.display='block';
    labelEl.style.left=(cx-22)+'px'; labelEl.style.top=(cy-42)+'px';
    labelEl.style.color=STATUS_CSS[st]; labelEl.style.borderColor=STATUS_CSS[st];
  }
  function hideLabel(){ if(labelEl) labelEl.style.display='none'; }

  function showTooltip(ud,cx,cy) {
    if(!tooltipEl||ud.type!=='apto')return;
    const cod=(ud.pav==='T'?'T':String(ud.pav))+ud.ciclo;
    const st=getStatus(ud.pav,ud.ciclo);
    tooltipEl.innerHTML=`<div style="font-weight:700;font-size:15px;color:#ffd600">${cod}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.4);margin:2px 0 5px">${ud.pavLabel} · ${ud.fachada==='frente'?'Fachada Sul':'Fachada Norte'}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.55)">${ud.tipo} · ${ud.area}</div>
      <div style="margin-top:6px;font-size:13px;font-weight:600;color:${STATUS_CSS[st]}">${{livre:'Não Iniciado',andamento:'Em Andamento',concluido:'Concluído',atrasado:'Em Atraso'}[st]}</div>
      <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:4px">Clique para detalhes →</div>`;
    tooltipEl.style.display='block'; tooltipEl.style.left=(cx+20)+'px'; tooltipEl.style.top=(cy-14)+'px';
  }
  function hideTooltip(){ if(tooltipEl) tooltipEl.style.display='none'; }

  // ── Resize ──────────────────────────────────────────────────
  function onResize() {
    if(!wrapper||!renderer)return;
    camera.aspect=wrapper.clientWidth/wrapper.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(wrapper.clientWidth,wrapper.clientHeight);
  }

  // ── Loop ────────────────────────────────────────────────────
  function animate() {
    rafId=requestAnimationFrame(animate);
    const k=.09;
    sph.theta+=(tgt.theta-sph.theta)*k; sph.phi+=(tgt.phi-sph.phi)*k; sph.radius+=(tgt.radius-sph.radius)*k;
    updateCam(); renderer.render(scene,camera);
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    refresh(getStatusFn) {
      aptoCubes.forEach(m => {
        if(m.userData.type!=='apto')return;
        const col=STATUS_HEX[getStatusFn(m.userData.pav,m.userData.ciclo)]||STATUS_HEX.livre;
        m.material.color.setHex(col);
        m.material.emissive.setHex(new THREE.Color(col).multiplyScalar(.07).getHex());
      });
    },
    resetCamera() { tgt.theta=.72; tgt.phi=.82; tgt.radius=95; },
    zoomIn()      { tgt.radius=Math.max(18,tgt.radius-8); },
    zoomOut()     { tgt.radius=Math.min(160,tgt.radius+8); },
    rotateLeft()  { tgt.theta-=.32; },
    rotateRight() { tgt.theta+=.32; },
    focusPav(idx) { tgt.phi=1.15; tgt.radius=38; },
    dispose() {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('mousemove',onMM);
      canvas.removeEventListener('click',onClick);
      window.removeEventListener('resize',onResize);
      renderer.dispose();
    },
  };
}
