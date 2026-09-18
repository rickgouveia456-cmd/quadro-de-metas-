// ================================================================
// torre3d.engine.js — Condomínio com 3 torres + animação de câmera
// ================================================================
import * as THREE from 'three';

// ── Geometria de cada torre ───────────────────────────────────
const PAV_H  = 3.00;
const APT_W  = 3.60;
const GAP    = 0.25;
const CORE_W = 5.20;
const N_COL  = 4;
const FRONT_D= 5.5;
const BACK_D = 5.5;
const CORE_D = 11.2;
const TOTAL_D= FRONT_D + BACK_D;
const TOTAL_W= GAP + N_COL*(APT_W+GAP) + CORE_W + N_COL*(APT_W+GAP) + GAP;
const CX     = TOTAL_W / 2;
const CORE_CX= GAP + N_COL*(APT_W+GAP) + CORE_W/2;

// Espaçamento entre as 3 torres
const TORRE_SPACING = TOTAL_W + 22;
// Posições X do centro de cada torre (0=TC, 1=TB, 2=TA)
const TORRE_POS = [0, TORRE_SPACING, TORRE_SPACING*2];

function colX(col) {
  if (col < N_COL)   return GAP + col*(APT_W+GAP) + APT_W/2;
  if (col === N_COL) return CORE_CX;
  return GAP + N_COL*(APT_W+GAP) + CORE_W + GAP + (col-N_COL-1)*(APT_W+GAP) + APT_W/2;
}
function getTipo(col) { return [0,3,4,7].includes(col) ? 4 : 3; }

// ── Cores de status ───────────────────────────────────────────
const WIN_COLOR = 0x0d1520;
const STATUS_EMIT = {
  livre:     {color:0x000000, intensity:0    },
  andamento: {color:0xf59e0b, intensity:0.55 },
  concluido: {color:0x22c55e, intensity:0.55 },
  atrasado:  {color:0xef4444, intensity:0.65 },
};
const STATUS_CSS = {
  livre:'#64748b',andamento:'#d97706',concluido:'#16a34a',atrasado:'#dc2626',
};
const TIPO_INFO = {
  3:{nome:'Tipo 3',area:'48,31m²'},
  4:{nome:'Tipo 4',area:'56,69m²'},
};
const CICLOS_DEF = [
  {ciclo:'A'},{ciclo:'B'},{ciclo:'C'},{ciclo:'D'},
];

export function buildTorre3D({ wrapper, canvas, pavimentos, ciclos=CICLOS_DEF, obraIds, getStatus, onClickApto }) {
  let scene, camera, renderer, raycaster, mouse;
  let winMeshes = [];
  let hoveredMesh = null;
  let isOrbiting=false, orbitStart={x:0,y:0};

  // Órbita — declarada no topo para ser acessível em animate()
  let orbitTheta=0.35, orbitPhi=0.72, orbitRadius=88;
  let orbitTgt={theta:0.35,phi:0.72,radius:88};
  let orbitCenterX=TORRE_POS[0]+CX;

  // Câmera — posição dinâmica
  let camPos = { x: TORRE_POS[0]+CX, y:26, z:95 };
  let camLook= { x: TORRE_POS[0]+CX, y:22, z:0  };
  let camTarget = { ...camPos };
  let camLookTarget = { ...camLook };
  let rafId=null;

  const tooltipEl=document.getElementById('tooltip3d');
  const labelEl  =document.getElementById('label3d');

  // ── Cena ─────────────────────────────────────────────────────
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xb8d4e8);
  scene.fog=new THREE.Fog(0xb8d4e8, 250, 500);

  const W=wrapper.clientWidth||window.innerWidth||800;
  const H=wrapper.clientHeight||window.innerHeight||600;
  camera=new THREE.PerspectiveCamera(35,W/H,0.5,600);
  camera.position.set(camPos.x,camPos.y,camPos.z);
  camera.lookAt(camLook.x,camLook.y,camLook.z);

  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;

  // ResizeObserver — detecta quando o wrapper ganha tamanho real
  const ro = new ResizeObserver(() => onResize());
  ro.observe(wrapper);

  // ── Luzes ─────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff,0.75));
  const sun=new THREE.DirectionalLight(0xfff8f0,1.5);
  sun.position.set(60,120,80);
  sun.shadow.camera.left=-200; sun.shadow.camera.right=200;
  sun.shadow.camera.top=160;   sun.shadow.camera.bottom=-20;
  sun.shadow.bias=-0.001; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xe0f0ff,0xd0e8d0,0.4));

  // ── Cenário de condomínio pronto ──────────────────────────────
  buildCenario();

  // ── 3 Torres ─────────────────────────────────────────────────
  for (let ti=0; ti<3; ti++) {
    buildTorre(ti);
  }

  raycaster=new THREE.Raycaster(); mouse=new THREE.Vector2(-999,-999);
  canvas.addEventListener('mousemove',onMM);
  canvas.addEventListener('click',onClick);
  canvas.addEventListener('mousedown',e=>{if(e.button===0){isOrbiting=true;orbitStart={x:e.clientX,y:e.clientY};}});
  canvas.addEventListener('mouseup',()=>isOrbiting=false);
  canvas.addEventListener('mouseleave',()=>{isOrbiting=false;hideLabel();hideTooltip();});
  canvas.addEventListener('wheel',e=>{
    // Zoom só pelo orbitRadius — sem mexer em camPos diretamente
    const delta = e.deltaY > 0 ? 10 : -10;
    orbitTgt.radius = Math.max(20, Math.min(200, orbitTgt.radius + delta));
  },{passive:true});
  window.addEventListener('resize',onResize);
  animate();

  // ── Cenário ───────────────────────────────────────────────────
  function buildCenario() {
    const totalX = TORRE_POS[2]+TOTAL_W;
    const cx = totalX/2;

    // Gramado geral
    const grass=new THREE.Mesh(
      new THREE.PlaneGeometry(400,300),
      new THREE.MeshStandardMaterial({color:0x4a8a40,roughness:0.95})
    );
    grass.rotation.x=-Math.PI/2; grass.position.set(cx,0,0);
    grass.receiveShadow=true; scene.add(grass);

    // Piso de concreto/paralelepípedo na área do condomínio
    const piso=new THREE.Mesh(
      new THREE.BoxGeometry(totalX+40,0.12,TOTAL_D+60),
      new THREE.MeshStandardMaterial({color:0xc8ccc8,roughness:0.9})
    );
    piso.position.set(cx,0.06,0); piso.receiveShadow=true; scene.add(piso);

    // Calçadas entre torres
    for (let ti=0; ti<2; ti++) {
      const mx=(TORRE_POS[ti]+TOTAL_W+TORRE_POS[ti+1])/2;
      const calc=new THREE.Mesh(
        new THREE.BoxGeometry(TORRE_SPACING-TOTAL_W,0.14,TOTAL_D+20),
        new THREE.MeshStandardMaterial({color:0xb8c0b8,roughness:0.9})
      );
      calc.position.set(mx,0.07,0); scene.add(calc);
    }

    // Piscina
    const piscX=cx, piscZ=-(TOTAL_D/2+18);
    addBloco(scene, piscX, 0.05, piscZ, 20, 0.10, 12, 0xa0b8d0);
    const agua=new THREE.Mesh(
      new THREE.BoxGeometry(18.5,0.08,10.5),
      new THREE.MeshStandardMaterial({color:0x2090d0,metalness:0.3,roughness:0.1,transparent:true,opacity:0.85})
    );
    agua.position.set(piscX,0.14,piscZ); scene.add(agua);
    // Borda piscina
    [[piscX,0.18,piscZ-(10/2+0.15),21,0.25,0.3],[piscX,0.18,piscZ+(10/2+0.15),21,0.25,0.3],
     [piscX-(20/2+0.15),0.18,piscZ,0.3,0.25,11],[piscX+(20/2+0.15),0.18,piscZ,0.3,0.25,11]].forEach(a=>{
      addBloco(scene,...a,0xd8e0d8);
    });

    // Deck ao redor da piscina
    addBloco(scene, piscX, 0.10, piscZ-(10/2+1.2), 22, 0.08, 2.2, 0xc8a870);
    addBloco(scene, piscX, 0.10, piscZ+(10/2+1.2), 22, 0.08, 2.2, 0xc8a870);

    // Churrasqueira / área gourmet
    const goX=TORRE_POS[2]+TOTAL_W+8, goZ=0;
    addBloco(scene,goX,1.5,goZ,10,3.0,8,0xe8e0d8);
    addBloco(scene,goX,3.0,goZ,10.4,0.3,8.4,0xd0c8c0);
    // Janelas gourmet
    [[goX,2,goZ-4.06],[goX,2,goZ+4.06]].forEach(([x,y,z])=>{
      const w=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.5,0.12),
        new THREE.MeshStandardMaterial({color:0x7ab8d8,metalness:0.4,roughness:0.15}));
      w.position.set(x,y,z); scene.add(w);
    });

    // Salão de festas
    const sfX=-12, sfZ=0;
    addBloco(scene,sfX,1.5,sfZ,16,3.0,10,0xe0e8f0);
    addBloco(scene,sfX,3.0,sfZ,16.4,0.3,10.4,0xccd0dc);

    // Portaria
    const portX=cx, portZ=TOTAL_D/2+22;
    addBloco(scene,portX,1.8,portZ,8,3.6,5,0xf0f0e8);
    addBloco(scene,portX,3.6,portZ,8.4,0.3,5.4,0xd8d8d0);
    const portVid=new THREE.Mesh(new THREE.BoxGeometry(5,1.8,0.12),
      new THREE.MeshStandardMaterial({color:0x88ccee,metalness:0.45,roughness:0.1,transparent:true,opacity:0.8}));
    portVid.position.set(portX,1.8,portZ+2.56); scene.add(portVid);

    // Gradil/muro do condomínio
    const muroH=2.2, muroEsp=0.25;
    // Muro frontal com portão
    [-1,1].forEach(side=>{
      const mw=new THREE.Mesh(
        new THREE.BoxGeometry((totalX/2-6)/1,muroH,muroEsp),
        new THREE.MeshStandardMaterial({color:0xd8d0c8,roughness:0.85})
      );
      mw.position.set(cx+side*(totalX/4+3),muroH/2,TOTAL_D/2+28); scene.add(mw);
    });
    // Pilares do portão
    [cx-8,cx+8].forEach(x=>{
      const p=new THREE.Mesh(new THREE.BoxGeometry(1.2,3.5,1.2),
        new THREE.MeshStandardMaterial({color:0xc0b8a8,roughness:0.8}));
      p.position.set(x,1.75,TOTAL_D/2+28); p.castShadow=true; scene.add(p);
    });
    // Muros laterais
    [[-16,muroH/2,0],[totalX+16,muroH/2,0]].forEach(([x,y,z])=>{
      const ml=new THREE.Mesh(
        new THREE.BoxGeometry(muroEsp,muroH,TOTAL_D+60),
        new THREE.MeshStandardMaterial({color:0xd8d0c8,roughness:0.85})
      );
      ml.position.set(x,y,z); scene.add(ml);
    });
    // Muro fundos
    addBloco(scene,cx,muroH/2,-(TOTAL_D/2+28),totalX+32,muroH,muroEsp,0xd8d0c8);

    // Árvores espalhadas
    const treePosArr=[
      [cx-TORRE_SPACING*0.4, 0, piscZ-14],
      [cx+TORRE_SPACING*0.4, 0, piscZ-14],
      [cx, 0, piscZ+14],
      [TORRE_POS[0]-6, 0, 8],
      [TORRE_POS[2]+TOTAL_W+6, 0, 8],
      [TORRE_POS[0]-6, 0, -10],
      [TORRE_POS[2]+TOTAL_W+6, 0, -10],
      [cx, 0, -(TOTAL_D/2+10)],
    ];
    treePosArr.forEach(([x,y,z]) => addTree(scene,x,y,z));

    // Estacionamento atrás
    const estX=cx, estZ=TOTAL_D/2+14;
    addBloco(scene,estX,0.08,estZ,totalX+10,0.08,18,0xb0b8c0);
    // Faixas de vaga
    for (let v=0;v<8;v++) {
      const vx=TORRE_POS[0]+3+v*(TOTAL_W+2)*0.4;
      addBloco(scene,vx,0.10,estZ,0.12,0.02,5,0xffffff);
    }

    // Playground
    addBloco(scene,TORRE_POS[0]-8,0.08,piscZ+8,12,0.08,8,0xe8d08a);
    addTree(scene,TORRE_POS[0]-8,0,piscZ+12);
  }

  // ── Árvore simples ────────────────────────────────────────────
  function addTree(sc,x,y,z) {
    const trunk=new THREE.Mesh(
      new THREE.CylinderGeometry(0.18,0.22,2.2,6),
      new THREE.MeshStandardMaterial({color:0x6b4226,roughness:0.9})
    );
    trunk.position.set(x,y+1.1,z); trunk.castShadow=true; sc.add(trunk);
    const leaves=new THREE.Mesh(
      new THREE.SphereGeometry(2.2,7,5),
      new THREE.MeshStandardMaterial({color:0x2a7a28,roughness:0.9})
    );
    leaves.position.set(x,y+4.0,z); leaves.castShadow=true; sc.add(leaves);
  }

  // ── Construir uma torre ───────────────────────────────────────
  function buildTorre(torreIdx) {
    const ox=TORRE_POS[torreIdx]; // offset X desta torre
    const nPav=pavimentos.filter(p=>p.num!=='COB').length;

    // Corpo branco
    addBloco(scene, ox+CX, 0.8+nPav*PAV_H/2, -TOTAL_D/4, TOTAL_W, nPav*PAV_H+0.4, FRONT_D, 0xf2f4f6);
    addBloco(scene, ox+CX, 0.8+nPav*PAV_H/2, +TOTAL_D/4, TOTAL_W, nPav*PAV_H+0.4, BACK_D,  0xf2f4f6);

    // ── Núcleo: ELV (azul escuro) separado da ESC PCF (cinza grafite) ──
    const elvW = CORE_W * 0.60;
    const escW = CORE_W * 0.40;
    const elvX = ox + GAP + N_COL*(APT_W+GAP) + elvW/2;
    const escX = ox + GAP + N_COL*(APT_W+GAP) + elvW + escW/2;
    const cH   = nPav*PAV_H + 0.4;
    const cY   = 0.8 + cH/2;

    // Bloco elevador — azul escuro
    addBloco(scene, elvX, cY, 0, elvW-0.05, cH, CORE_D, 0x1a3560);
    // Bloco escada PCF — cinza grafite (mais escuro, diferente)
    addBloco(scene, escX, cY, 0, escW-0.05, cH, CORE_D, 0x3a4a5a);

    // Linha divisória clara entre ELV e ESC
    addBloco(scene, elvX+elvW/2, cY, 0, 0.18, cH+0.1, CORE_D+0.1, 0xf0f2f4);

    // Fachada do elevador: painéis de vidro azul (Sul e Norte), por andar
    for (let li=0; li<nPav; li++) {
      const panelY = 0.8 + li*PAV_H + PAV_H*0.52;
      const panelH = PAV_H * 0.62;
      // Painel de vidro azul no elevador — Sul
      const vS = new THREE.Mesh(
        new THREE.BoxGeometry(elvW-0.3, panelH, 0.09),
        new THREE.MeshStandardMaterial({
          color: li%2===0 ? 0x2060b0 : 0x1a4a90,
          metalness:0.55, roughness:0.08,
        })
      );
      vS.position.set(elvX, panelY, -(CORE_D/2+0.05)); scene.add(vS);
      // Norte
      const vN = vS.clone();
      vN.position.z = +(CORE_D/2+0.05); scene.add(vN);

      // Escada: parede de concreto aparente com pequena janelinha
      if (li % 3 === 0) {
        const wE = new THREE.Mesh(
          new THREE.BoxGeometry(escW*0.4, PAV_H*0.28, 0.09),
          new THREE.MeshStandardMaterial({color:0x1a2a3a, metalness:0.3, roughness:0.2})
        );
        wE.position.set(escX, panelY+0.1, -(CORE_D/2+0.05)); scene.add(wE);
      }
    }

    // Labels fixos no meio da torre
    const midY = 0.8 + nPav*PAV_H*0.5;
    addLabel('🛗 ELV',     elvX, midY+1.0, -(CORE_D/2+2.2), 0.20, '#ffffff','#1a3560');
    addLabel('🪜 ESC PCF', escX, midY+1.0, -(CORE_D/2+2.2), 0.18, '#ffffff','#3a4a5a');

    // Lajes
    for (let li=0; li<=nPav; li++) {
      const y=0.8+li*PAV_H;
      addBlocoRec(scene,ox+CX, y+0.11, -TOTAL_D/4, TOTAL_W, 0.22, FRONT_D, 0xd0d8e0);
      addBlocoRec(scene,ox+CX, y+0.11, +TOTAL_D/4, TOTAL_W, 0.22, BACK_D,  0xd0d8e0);
      // Borda escura
      addBloco(scene,ox+CX, y+0.01, -TOTAL_D/4, TOTAL_W+0.04, 0.05, FRONT_D+0.04, 0x8090a0);
      addBloco(scene,ox+CX, y+0.01, +TOTAL_D/4, TOTAL_W+0.04, 0.05, BACK_D+0.04,  0x8090a0);
    }

    // Platibanda azul
    const topH=2.0, topY=0.8+nPav*PAV_H+0.4+topH/2;
    addBloco(scene,ox+CX,topY,0,TOTAL_W+0.3,topH,TOTAL_D+0.3,0x1e3a5f);

    // Pingadeiras laterais
    addBloco(scene,ox-0.12,         0.8+nPav*PAV_H/2, 0, 0.20, nPav*PAV_H+0.4, TOTAL_D+0.3, 0xe0e6ea);
    addBloco(scene,ox+TOTAL_W+0.12, 0.8+nPav*PAV_H/2, 0, 0.20, nPav*PAV_H+0.4, TOTAL_D+0.3, 0xe0e6ea);

    // Frisos horizontais
    for (let li=1; li<nPav; li++) {
      const y=0.8+li*PAV_H;
      addBloco(scene,ox+CX,y+0.26,-TOTAL_D/4,TOTAL_W,0.10,FRONT_D+0.05,0xd0d8e2);
      addBloco(scene,ox+CX,y+0.26,+TOTAL_D/4,TOTAL_W,0.10,BACK_D+0.05, 0xd0d8e2);
    }

    // Nome da torre
    addLabel(['TORRE C','TORRE B','TORRE A'][torreIdx], ox+CX, topY+topH/2+1.0, -(TOTAL_D/2+2), 0.35, '#f59e0b','#1e3a5f');

    // Janelas
    pavimentos.forEach((pav,li) => {
      if (pav.num==='COB') return;
      const yBase=0.8+li*PAV_H;
      const nC=4;
      for (let ci=0; ci<nC; ci++) {
        const c=ciclos[ci]||{ciclo:String.fromCharCode(65+ci)};
        const tipo=getTipo(ci);
        buildJanela(torreIdx,pav,c,tipo,'frente',ox+colX(ci),      yBase,-TOTAL_D/4);
        buildJanela(torreIdx,pav,c,tipo,'fundos',ox+colX(ci),      yBase,+TOTAL_D/4);
        addSacadaFundo(ox+colX(ci),yBase,+TOTAL_D/4+BACK_D/2);
        const ciDir=nC-1-ci;
        const cD=ciclos[ciDir]||{ciclo:String.fromCharCode(65+ciDir)};
        const tipoD=getTipo(N_COL+1+ci);
        buildJanela(torreIdx,pav,cD,tipoD,'frente',ox+colX(N_COL+1+ci),yBase,-TOTAL_D/4);
        buildJanela(torreIdx,pav,cD,tipoD,'fundos',ox+colX(N_COL+1+ci),yBase,+TOTAL_D/4);
        addSacadaFundo(ox+colX(N_COL+1+ci),yBase,+TOTAL_D/4+BACK_D/2);
      }
    });
  }

  // ── Sacada fundo ──────────────────────────────────────────────
  function addSacadaFundo(posX,yBase,faceZ) {
    const s=new THREE.Mesh(new THREE.BoxGeometry(APT_W-0.15,0.13,0.50),
      new THREE.MeshStandardMaterial({color:0xd0d8e0,roughness:0.85}));
    s.position.set(posX,yBase+0.22+0.07,faceZ+0.25); scene.add(s);
    const gc=new THREE.Mesh(new THREE.BoxGeometry(APT_W-0.25,0.06,0.45),
      new THREE.MeshStandardMaterial({color:0x8090a0,metalness:0.4,roughness:0.5}));
    gc.position.set(posX,yBase+0.22+0.82,faceZ+0.25); scene.add(gc);
  }

  // ── Janela melhorada ─────────────────────────────────────────
  function buildJanela(torreIdx,pav,cicloObj,tipo,fachada,posX,yBase,posZ) {
    const st  = getStatus(torreIdx,pav.num,cicloObj.ciclo);
    const em  = STATUS_EMIT[st]||STATUS_EMIT.livre;
    const isF = fachada==='frente';
    const faceZ = posZ + (isF ? -FRONT_D/2-0.02 : +BACK_D/2+0.02);

    const winW  = APT_W - 0.50;
    const winH  = PAV_H * 0.58;
    const parH  = PAV_H * 0.20;  // parapeto (meia-parede abaixo da janela)
    const yWin  = yBase + parH + winH/2 + 0.22;

    // Parapeto — parede abaixo da janela (mesma cor da fachada)
    const par = new THREE.Mesh(
      new THREE.BoxGeometry(APT_W-0.05, parH, 0.18),
      new THREE.MeshStandardMaterial({color:0xeef0f3, roughness:0.8})
    );
    par.position.set(posX, yBase+0.22+parH/2, faceZ); scene.add(par);

    // Moldura / caixilho escuro
    const mold = new THREE.Mesh(
      new THREE.BoxGeometry(winW+0.14, winH+0.14, 0.14),
      new THREE.MeshStandardMaterial({color:0x18242e, roughness:0.4, metalness:0.45})
    );
    mold.position.set(posX, yWin, faceZ); scene.add(mold);

    // Vidro escuro com status
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(winW, winH, 0.07),
      new THREE.MeshStandardMaterial({
        color: WIN_COLOR,
        emissive: new THREE.Color(em.color),
        emissiveIntensity: em.intensity,
        metalness: 0.78, roughness: 0.04,
      })
    );
    win.position.set(posX, yWin, faceZ+(isF?-0.05:0.05));
    win.userData = {type:'janela',torreIdx,pav:pav.num,ciclo:cicloObj.ciclo,fachada,
      pavLabel:pav.label,tipo:TIPO_INFO[tipo]?.nome||'',area:TIPO_INFO[tipo]?.area||''};
    scene.add(win); winMeshes.push(win);

    // 3 painéis — 2 montantes verticais
    [-winW/3, winW/3].forEach(dx => {
      const dv = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, winH, 0.14),
        new THREE.MeshStandardMaterial({color:0x18242e, metalness:0.45, roughness:0.4})
      );
      dv.position.set(posX+dx, yWin, faceZ); scene.add(dv);
    });

    // Travessa horizontal central
    const bh = new THREE.Mesh(
      new THREE.BoxGeometry(winW+0.08, 0.055, 0.12),
      new THREE.MeshStandardMaterial({color:0x18242e, metalness:0.35, roughness:0.5})
    );
    bh.position.set(posX, yWin, faceZ); scene.add(bh);

    // Pingadeira — saliência na base da janela
    const ping = new THREE.Mesh(
      new THREE.BoxGeometry(winW+0.20, 0.07, 0.20),
      new THREE.MeshStandardMaterial({color:0xd0d8e2, roughness:0.75})
    );
    ping.position.set(posX, yBase+0.22+parH-0.04, faceZ+(isF?-0.08:0.08)); scene.add(ping);
  }

  // ── Bloco helper ─────────────────────────────────────────────
  function addBloco(sc,x,y,z,w,h,d,color) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshStandardMaterial({color,roughness:0.75,metalness:0.02}));
    m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; sc.add(m);
  }
  function addBlocoRec(sc,x,y,z,w,h,d,color) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshStandardMaterial({color,roughness:0.9}));
    m.position.set(x,y,z); m.receiveShadow=true; sc.add(m);
  }

  // ── Label sprite ─────────────────────────────────────────────
  function addLabel(text,x,y,z,scale,tc,bg) {
    const cvs=document.createElement('canvas'); cvs.width=512; cvs.height=96;
    const ctx=cvs.getContext('2d');
    ctx.fillStyle=bg||'rgba(255,255,255,.92)';
    rrect(ctx,4,8,504,80,12); ctx.fill();
    ctx.strokeStyle=tc||'#1e3a5f'; ctx.lineWidth=3; rrect(ctx,4,8,504,80,12); ctx.stroke();
    ctx.fillStyle=tc||'#1e3a5f'; ctx.font='bold 36px Segoe UI,Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,256,50);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cvs),transparent:true,depthTest:false}));
    spr.scale.set(scale*5.5,scale*1,1); spr.position.set(x,y,z);
    spr.userData={type:'label'}; scene.add(spr);
  }
  function rrect(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }

  // ── Câmera ────────────────────────────────────────────────────
  function updateCam() {
    // Interpolação suave para o alvo
    const k=0.06;
    camPos.x+=(camTarget.x-camPos.x)*k;
    camPos.y+=(camTarget.y-camPos.y)*k;
    camPos.z+=(camTarget.z-camPos.z)*k;
    camLook.x+=(camLookTarget.x-camLook.x)*k;
    camLook.y+=(camLookTarget.y-camLook.y)*k;
    camLook.z+=(camLookTarget.z-camLook.z)*k;
    camera.position.set(camPos.x,camPos.y,camPos.z);
    camera.lookAt(camLook.x,camLook.y,camLook.z);
  }

  // ── Fly to torre com animação ─────────────────────────────────
  function flyToTorre(idx) {
    const nPav=pavimentos.filter(p=>p.num!=='COB').length;
    const midH=0.8+(nPav*PAV_H)/2;
    const ox=TORRE_POS[idx];
    const cx=ox+CX;
    camTarget    = {x:cx+28, y:midH+22, z:80};
    camLookTarget= {x:cx,    y:midH*0.8, z:0};
  }

  // ── Órbita manual ─────────────────────────────────────────────

  function onMM(e) {
    const rect=renderer.domElement.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    if (isOrbiting) {
      const dx=e.clientX-orbitStart.x, dy=e.clientY-orbitStart.y;
      orbitStart={x:e.clientX,y:e.clientY};
      orbitTgt.theta-=dx*0.005; orbitTgt.phi-=dy*0.005;
      orbitTgt.phi=Math.max(0.05,Math.min(1.48,orbitTgt.phi));
      return;
    }
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(winMeshes,false);
    if (hits.length>0) {
      const m=hits[0].object;
      if (m!==hoveredMesh) {
        restoreHover();
        hoveredMesh=m;
        const st=getStatus(m.userData.torreIdx,m.userData.pav,m.userData.ciclo);
        const ei=STATUS_EMIT[st]||STATUS_EMIT.livre;
        m.material.emissive.setHex(ei.color||0x336699);
        m.material.emissiveIntensity=Math.max(ei.intensity,0.35)+0.25;
        m.scale.setScalar(1.012);
      }
      showLabel(m.userData,e.clientX,e.clientY);
      showTooltip(m.userData,e.clientX,e.clientY);
    } else { restoreHover(); hideLabel(); hideTooltip(); }
  }

  function restoreHover() {
    if (!hoveredMesh) return;
    const st=getStatus(hoveredMesh.userData.torreIdx,hoveredMesh.userData.pav,hoveredMesh.userData.ciclo);
    const ei=STATUS_EMIT[st]||STATUS_EMIT.livre;
    hoveredMesh.material.emissive.setHex(ei.color);
    hoveredMesh.material.emissiveIntensity=ei.intensity;
    hoveredMesh.scale.setScalar(1);
    hoveredMesh=null;
  }

  function onClick() {
    if (isOrbiting) return;
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(winMeshes,false);
    if (hits.length>0) onClickApto(hits[0].object.userData);
  }

  function showLabel(ud,cx,cy) {
    if (!labelEl||ud.type!=='janela') return;
    const cod=(ud.pav==='T'?'T':String(ud.pav))+ud.ciclo;
    const st=getStatus(ud.torreIdx,ud.pav,ud.ciclo);
    labelEl.textContent=cod; labelEl.style.display='block';
    labelEl.style.left=(cx-22)+'px'; labelEl.style.top=(cy-44)+'px';
    labelEl.style.color='#0f172a'; labelEl.style.fontWeight='900';
    labelEl.style.borderColor=STATUS_CSS[st];
    labelEl.style.background='rgba(255,255,255,.97)';
  }
  function hideLabel(){if(labelEl)labelEl.style.display='none';}

  function showTooltip(ud,cx,cy) {
    if (!tooltipEl||ud.type!=='janela') return;
    const cod=(ud.pav==='T'?'T':String(ud.pav))+ud.ciclo;
    const st=getStatus(ud.torreIdx,ud.pav,ud.ciclo);
    const lbl={livre:'Não Iniciado',andamento:'Em Andamento',concluido:'Concluído',atrasado:'Em Atraso'}[st];
    tooltipEl.innerHTML=`
      <div style="font-weight:900;font-size:15px;color:#0f172a">${cod}</div>
      <div style="font-size:10px;color:#475569;margin:2px 0 4px">
        ${ud.pavLabel||''} · ${ud.fachada==='frente'?'Fachada Sul':'Fachada Norte'}
      </div>
      <div style="font-size:11px;color:#374151"><b>${ud.tipo}</b> · ${ud.area}</div>
      <div style="margin-top:5px;font-size:13px;font-weight:800;color:${STATUS_CSS[st]}">${lbl}</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:3px">Clique para detalhes →</div>`;
    tooltipEl.style.cssText=`display:block;position:fixed;left:${cx+16}px;top:${cy-10}px;
      background:rgba(255,255,255,.98);border:1px solid #e2e8f0;border-radius:8px;
      padding:10px 14px;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.14);max-width:220px;z-index:500;`;
  }
  function hideTooltip(){if(tooltipEl)tooltipEl.style.display='none';}

  function onResize(){
    if(!wrapper||!renderer)return;
    const w=wrapper.clientWidth||window.innerWidth;
    const h=wrapper.clientHeight||window.innerHeight;
    if(w<10||h<10)return;
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }

  let lastRender = 0;
  function animate(now=0){
    rafId=requestAnimationFrame(animate);
    // 60fps — renderiza a cada ~16.67ms
    if (now - lastRender < 16) return;
    lastRender = now;
    // Órbita manual suave
    const k=0.07;
    orbitTheta+=(orbitTgt.theta-orbitTheta)*k;
    orbitPhi  +=(orbitTgt.phi  -orbitPhi  )*k;
    orbitRadius+=(orbitTgt.radius-orbitRadius)*k;
    const nPav=pavimentos.filter(p=>p.num!=='COB').length;
    const midH=0.8+(nPav*PAV_H)/2;
    camTarget.x = orbitCenterX + orbitRadius*Math.sin(orbitPhi)*Math.sin(orbitTheta);
    camTarget.y = midH + orbitRadius*Math.cos(orbitPhi);
    camTarget.z = orbitRadius*Math.sin(orbitPhi)*Math.cos(orbitTheta);
    camLookTarget= {x:orbitCenterX, y:midH*0.75, z:0};
    updateCam();
    renderer.render(scene,camera);
  }

  // ── API pública ───────────────────────────────────────────────
  return {
    refresh(fn){
      winMeshes.forEach(m=>{
        const st=fn(m.userData.torreIdx,m.userData.pav,m.userData.ciclo);
        const ei=STATUS_EMIT[st]||STATUS_EMIT.livre;
        m.material.emissive.setHex(ei.color);
        m.material.emissiveIntensity=ei.intensity;
      });
    },
    flyToTorre(idx){
      orbitCenterX=TORRE_POS[idx]+CX;
      orbitTgt={theta:0.35,phi:0.72,radius:88};
    },
    focusPav(torreIdx,pavIdx){
      orbitCenterX=TORRE_POS[torreIdx]+CX;
      orbitTgt.phi=1.20; orbitTgt.radius=42;
    },
    resetCamera(){
      orbitTgt={theta:0.35,phi:0.65,radius:130};
      orbitCenterX=(TORRE_POS[0]+TORRE_POS[2])/2+CX;
    },
    zoomIn() { orbitTgt.radius=Math.max(20,orbitTgt.radius-12); },
    zoomOut(){ orbitTgt.radius=Math.min(200,orbitTgt.radius+12); },
    rotateLeft() { orbitTgt.theta-=0.35; },
    rotateRight(){ orbitTgt.theta+=0.35; },
    dispose(){
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('mousemove',onMM);
      canvas.removeEventListener('click',onClick);
      window.removeEventListener('resize',onResize);
      renderer.dispose();
    },
  };
}
