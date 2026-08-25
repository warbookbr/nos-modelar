/* Canário N6: casco-base por interseção de silhuetas, não por seções digitadas.
   É uma prova isolada e reprovável; não importa o núcleo procedural. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../../../tools/bancadas/bench/pngstats.mjs';
import { encodePng, sobreposicaoParaPng } from '../../../tools/bancadas/bench/pngwrite.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(aqui, '..', '..', '..');
const alvo = path.join(repo, 'autoria-assistida', 'alvos', 'n6-cupe-esportivo');
const evidencias = path.join(aqui, 'evidencias');
const W = 768, H = 512, margem = 32;
const sha = (b) => createHash('sha256').update(b).digest('hex');
const add = (a,b) => a.map((v,i)=>v+b[i]);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const esc = (a,k) => a.map(v=>v*k);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normal = (a) => { const n=Math.hypot(...a)||1; return a.map(v=>v/n); };
const lim = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const fontes = {
  frontal: 'vistas/frontal.png', lateral: 'vistas/lateral-direita.png', superior: 'vistas/superior.png',
};

function maiorComponente(imagem) {
  const { W: w, H: h, ch, pixels } = imagem, bruto = new Uint8Array(w*h);
  /* 225 incorporava a sombra de estúdio à silhueta e produzia um casco-caixote.
     210 conserva carroceria/pneus, mas descarta o gradiente do chão. */
  for (let i=0;i<bruto.length;i++) { const o=i*ch, l=.299*pixels[o]+.587*pixels[o+1]+.114*pixels[o+2]; bruto[i]=l<210?1:0; }
  const visto=new Uint8Array(bruto.length); let maior=[];
  for(let inicio=0;inicio<bruto.length;inicio++) if(bruto[inicio]&&!visto[inicio]) { const fila=[inicio], componente=[]; visto[inicio]=1;
    for(let p=0;p<fila.length;p++){const id=fila[p],x=id%w,y=(id/w)|0;componente.push(id);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,n=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&bruto[n]&&!visto[n]){visto[n]=1;fila.push(n);}}}
    if(componente.length>maior.length) maior=componente;
  }
  const m=new Uint8Array(w*h); let x0=w,y0=h,x1=-1,y1=-1;
  for(const id of maior){m[id]=1;const x=id%w,y=(id/w)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(!maior.length) throw new Error('silhueta vazia');
  return { W:w,H:h,m,bbox:{x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1}, pixels: imagem.pixels };
}

function dentro(mascara,u,v) { // u/v normalizados dentro da caixa da silhueta
  const { W,H,m,bbox:b }=mascara, x=Math.round(b.x0+lim(u)*Math.max(0,b.w-1)), y=Math.round(b.y0+lim(v)*Math.max(0,b.h-1));
  return x>=0&&x<W&&y>=0&&y<H&&m[y*W+x]===1;
}

function campoDasSilhuetas(mascaras, nx=50, ny=34, nz=82) {
  const valores=new Int8Array(nx*ny*nz), em=(x,y,z)=>(z*ny+y)*nx+x;
  for(let z=0;z<nz;z++) for(let y=0;y<ny;y++) for(let x=0;x<nx;x++) {
    const u=x/(nx-1),v=y/(ny-1),w=z/(nz-1);
    // frontal: x/y; lateral: frente→trás em z/y; superior: x/z.
    valores[em(x,y,z)]=dentro(mascaras.frontal,u,v)&&dentro(mascaras.lateral,1-w,v)&&dentro(mascaras.superior,u,1-w)?1:-1;
  }
  return {nx,ny,nz,valores,em};
}

function criarMalha(campo) {
  const {nx,ny,nz,valores,em}=campo, V=[],F=[], porChave=new Map();
  const ponto=(x,y,z)=>[-1+2*x/(nx-1),-.42+1.34*y/(ny-1),-1.95+3.62*z/(nz-1)];
  const id=(a,b)=>{const p=esc(add(a,b),.5), chave=p.map(v=>v.toFixed(7)).join('|');if(!porChave.has(chave)){porChave.set(chave,V.length);V.push(p);}return porChave.get(chave);};
  const cubos=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const desloc=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++) {
    const ps=desloc.map(([dx,dy,dz])=>ponto(x+dx,y+dy,z+dz)), vs=desloc.map(([dx,dy,dz])=>valores[em(x+dx,y+dy,z+dz)]);
    for(const t of cubos){const pares=[];for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)if(vs[t[a]]!==vs[t[b]])pares.push([t[a],t[b]]);if(pares.length<3)continue;const ids=pares.map(([a,b])=>id(ps[a],ps[b]));const centro=ids.reduce((s,k)=>add(s,V[k]),[0,0,0]).map(v=>v/ids.length);const ordenar=ids.slice().sort((a,b)=>{const va=sub(V[a],centro),vb=sub(V[b],centro);return Math.atan2(va[1],va[0])-Math.atan2(vb[1],vb[0]);});for(let i=1;i<ordenar.length-1;i++){let f=[ordenar[0],ordenar[i],ordenar[i+1]],n=cross(sub(V[f[1]],V[f[0]]),sub(V[f[2]],V[f[0]]));if(dot(n,centro)<0)f=[f[0],f[2],f[1]];F.push(f);}}
  }
  return {V,F};
}

function componentes(malha) { const adj=malha.V.map(()=>[]);for(const f of malha.F)for(let i=0;i<3;i++){adj[f[i]].push(f[(i+1)%3]);adj[f[(i+1)%3]].push(f[i]);}const visto=new Uint8Array(malha.V.length);let total=0;for(let i=0;i<visto.length;i++)if(!visto[i]){total++;const fila=[i];visto[i]=1;for(let p=0;p<fila.length;p++)for(const j of adj[fila[p]])if(!visto[j]){visto[j]=1;fila.push(j);}}return total;}
function normais(malha) { const ns=malha.V.map(()=>[0,0,0]);for(const f of malha.F){const n=normal(cross(sub(malha.V[f[1]],malha.V[f[0]]),sub(malha.V[f[2]],malha.V[f[0]])));for(const i of f)ns[i]=add(ns[i],n);}return ns.map(normal);}
function camera(nome) { const c={frontal:{o:[0,0,-1],u:[1,0,0],v:[0,1,0]},lateral:{o:[1,0,0],u:[0,0,-1],v:[0,1,0]},superior:{o:[0,1,0],u:[1,0,0],v:[0,0,-1]},perspectiva:{o:normal([.75,.42,-.66]),u:normal([.66,0,.75]),v:normal(cross(normal([.66,0,.75]),normal([.75,.42,-.66])))}}[nome];return {o:normal(c.o),u:normal(c.u),v:normal(c.v)};}
function renderizar(malha,nome) { const c=camera(nome), ns=normais(malha), ps=malha.V.map(p=>({x:dot(p,c.u),y:dot(p,c.v),z:dot(p,c.o)})), xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);
  const escala=Math.min((W-2*margem)/(Math.max(...xs)-Math.min(...xs)),(H-2*margem)/(Math.max(...ys)-Math.min(...ys)));
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;const p2=ps.map(p=>({x:W/2+(p.x-cx)*escala,y:H/2-(p.y-cy)*escala,z:p.z}));const pix=Buffer.alloc(W*H*3),zbuf=new Float64Array(W*H).fill(-Infinity),m=new Uint8Array(W*H);for(let i=0;i<W*H;i++){pix[i*3]=240;pix[i*3+1]=243;pix[i*3+2]=244;}
  for(const f of malha.F){const q=f.map(i=>p2[i]),area=(q[1].x-q[0].x)*(q[2].y-q[0].y)-(q[2].x-q[0].x)*(q[1].y-q[0].y);if(Math.abs(area)<1e-8)continue;const xa=Math.max(0,Math.floor(Math.min(...q.map(p=>p.x)))),xb=Math.min(W-1,Math.ceil(Math.max(...q.map(p=>p.x)))),ya=Math.max(0,Math.floor(Math.min(...q.map(p=>p.y)))),yb=Math.min(H-1,Math.ceil(Math.max(...q.map(p=>p.y))));for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){const px=x+.5,py=y+.5,a=((q[1].x-px)*(q[2].y-py)-(q[2].x-px)*(q[1].y-py))/area,b=((q[2].x-px)*(q[0].y-py)-(q[0].x-px)*(q[2].y-py))/area,d=1-a-b;if(a<0||b<0||d<0)continue;const k=y*W+x,prof=a*q[0].z+b*q[1].z+d*q[2].z;if(prof<=zbuf[k])continue;const n=normal(add(add(esc(ns[f[0]],a),esc(ns[f[1]],b)),esc(ns[f[2]],d))),l=lim(.24+.76*dot(n,normal([-.4,.75,-.5]))),r=Math.round(77+110*l),g=Math.round(79+107*l),bb=Math.round(82+104*l);zbuf[k]=prof;m[k]=1;pix[k*3]=r;pix[k*3+1]=g;pix[k*3+2]=bb;}}
  return {W,H,m,pixels:pix};
}
function normalizarMascara(mascara) { const {W:w,H:h,m}=mascara;let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m[y*w+x]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const out=new Uint8Array(W*H),sw=x1-x0+1,sh=y1-y0+1,s=Math.min((W-2*margem)/sw,(H-2*margem)/sh);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sx=Math.floor((x-W/2)/s+x0+sw/2),sy=Math.floor((y-H/2)/s+y0+sh/2);if(sx>=0&&sx<w&&sy>=0&&sy<h)out[y*W+x]=m[sy*w+sx];}return {W,H,m:out};}
function iou(a,b){let i=0,u=0;for(let k=0;k<a.m.length;k++){if(a.m[k]||b.m[k])u++;if(a.m[k]&&b.m[k])i++;}return Number((i/(u||1)).toFixed(4));}

export function construirCascoVisualN6() {
  mkdirSync(evidencias,{recursive:true}); const manifestoAlvo=JSON.parse(readFileSync(path.join(alvo,'manifesto.json'),'utf8')), hashes=new Map(manifestoAlvo.vistas.map(v=>[v.arquivo,v.sha256]));const mascaras={};
  for(const [nome,arquivo] of Object.entries(fontes)){const b=readFileSync(path.join(alvo,arquivo));if(sha(b)!==hashes.get(arquivo))throw new Error(`alvo alterado: ${arquivo}`);mascaras[nome]=maiorComponente(decodePng(b));writeFileSync(path.join(evidencias,`referencia-${nome}.png`),b);const m=mascaras[nome],px=Buffer.alloc(m.W*m.H);for(let i=0;i<m.m.length;i++)px[i]=m.m[i]?25:250;writeFileSync(path.join(evidencias,`mascara-${nome}.png`),encodePng({W:m.W,H:m.H,ch:1,pixels:px}));}
  /* A inspeção individual reprovou este método. A interseção de máscaras só
     infere ocupação: não preserva arcos, cabine, entradas ou topologia da
     carroceria. Estes valores continuam úteis para diagnóstico, jamais para
     promoção de um candidato automotivo. */
  const motivos={
    frontal:'degraus e volumes retos substituem para-lamas, nariz e leitura frontal automotiva',
    lateral:'faixas de tetraedros formam caixote; não há cabine, arcos de roda nem proporção lateral crível',
    superior:'planta perde ombros, cabine e cintura; o contorno não sustenta leitura de cupê',
    perspectiva:'o conjunto parece bloco técnico, não carro; a vista auxiliar confirma o veto das ortográficas',
  };
  const campo=campoDasSilhuetas(mascaras), malha=criarMalha(campo), resultado={formato:'mecanifica.n6-canario-casco-visual@1',estado:'reprovado-inspecao-individual',regra:'interseção binária de silhuetas é apenas diagnóstico negativo; não é receita final nem rota de promoção',qualidadeNumerica:'diagnostico-nao-promocional',fontes:Object.fromEntries(Object.entries(fontes).map(([n,a])=>[n,{arquivo:a,sha256:hashes.get(a),bbox:mascaras[n].bbox}])),malha:{vertices:malha.V.length,triangulos:malha.F.length,componentes:componentes(malha)},vistas:{}};
  for(const nome of ['frontal','lateral','superior','perspectiva']){const render=renderizar(malha,nome);writeFileSync(path.join(evidencias,`render-${nome}.png`),encodePng({W,H,ch:3,pixels:render.pixels}));if(mascaras[nome]){const referencia=normalizarMascara(mascaras[nome]);const sobre=sobreposicaoParaPng(render,referencia);writeFileSync(path.join(evidencias,`sobreposicao-${nome}.png`,),sobre);resultado.vistas[nome]={iouSilhueta:iou(render,referencia),referencia:fontes[nome],render:`render-${nome}.png`,sobreposicao:`sobreposicao-${nome}.png`,veredito:'reprovado',motivo:motivos[nome]};}else resultado.vistas[nome]={render:`render-${nome}.png`,veredito:'reprovado',motivo:motivos[nome]};}
  resultado.inspecaoIndividual={metodo:'abertura nativa, uma imagem por vez; painel e IoU não são evidência de aprovação',vereditoGlobal:'reprovado',evidencias:Object.fromEntries(Object.keys(resultado.vistas).map(nome=>{const render=path.join(evidencias,`render-${nome}.png`);const sobre=path.join(evidencias,`sobreposicao-${nome}.png`);return [nome,{render:{arquivo:`evidencias/render-${nome}.png`,sha256:sha(readFileSync(render))},...(existsSync(sobre)?{sobreposicao:{arquivo:`evidencias/sobreposicao-${nome}.png`,sha256:sha(readFileSync(sobre))}}:{})}]}))};
  writeFileSync(path.join(aqui,'modelo-casco.json'),`${JSON.stringify(malha)}\n`);writeFileSync(path.join(aqui,'resultado.json'),`${JSON.stringify(resultado,null,2)}\n`);return resultado;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(construirCascoVisualN6(),null,2));
