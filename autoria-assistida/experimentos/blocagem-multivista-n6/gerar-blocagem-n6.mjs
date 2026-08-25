/* N6.1 — prova isolada de blocagem multivista. Não usa nem altera o núcleo.
   A geometria é uma carroceria fechada contínua; rodas são a única submontagem
   separada e a sua relação com a carroceria é julgada visualmente por vista. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodePng } from '../../../tools/bancadas/bench/pngstats.mjs';
import { encodePng, sobreposicaoParaPng } from '../../../tools/bancadas/bench/pngwrite.mjs';

const raiz = new URL('./', import.meta.url);
const alvo = new URL('../../alvos/n6-cupe-esportivo/', raiz);
const saida = new URL('./evidencias/', raiz);
const W = 768, H = 512;
const vistas = [
  ['frontal', 'frontal.png'], ['lateral-direita', 'lateral-direita.png'],
  ['traseira', 'traseira.png'], ['superior', 'superior.png'],
  ['perspectiva-frontal-direita', 'perspectiva-frontal-direita.png'],
];
const sha = (b) => createHash('sha256').update(b).digest('hex');
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = (a) => { const n = Math.hypot(...a) || 1; return a.map(v => v / n); };
const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b, n));

function novoModelo() {
  const V = [], F = [], materiais = [];
  const vertice = (p) => (V.push(p), V.length - 1);
  const face = (a,b,c, material='carroceria') => { F.push([a,b,c]); materiais.push(material); };
  // z, meia-largura, teto no centro, altura de soleira. A seção muda suave e
  // continuamente: nariz baixo, cabine baixa, ombros/deck traseiro altos.
  const estacoes = [
    [-1.72,.48,.18,-.17],[-1.50,.86,.31,-.19],[-1.15,1.02,.46,-.20],[-.70,1.04,.86,-.20],
    [-.20,1.02,1.02,-.20],[.34,.96,.87,-.19],[.82,.93,.52,-.18],[1.25,.82,.34,-.15],[1.56,.52,.20,-.12],
  ];
  const lados = 18, grade = [];
  for (const [z, largura, topo, base] of estacoes) {
    const linha = [];
    for (let i=0; i<=lados; i++) {
      const t = -1 + 2*i/lados, arqueamento = Math.pow(Math.cos(t*Math.PI/2), .62);
      const y = base + (topo-base)*arqueamento - .10*Math.pow(Math.abs(t), 3);
      linha.push(vertice([t*largura, y, z]));
    }
    grade.push(linha);
  }
  for (let j=0;j<grade.length-1;j++) for(let i=0;i<lados;i++) {
    const a=grade[j][i], b=grade[j][i+1], c=grade[j+1][i+1], d=grade[j+1][i];
    face(a,b,c); face(a,c,d);
  }
  // Fecha a parte inferior, impedindo o efeito de casca/peças soltas.
  const inferior = estacoes.map(([z, largura, , base]) => [vertice([-largura,base,z]), vertice([largura,base,z])]);
  for (let j=0;j<inferior.length-1;j++) { const [a,b]=inferior[j], [c,d]=inferior[j+1]; face(a,c,b); face(b,c,d); }
  for (const ponta of [0, grade.length-1]) for(let i=0;i<lados;i++) { const a=grade[ponta][i],b=grade[ponta][i+1], [c,d]=inferior[ponta]; face(a, ponta ? c : d, b); }
  // Vidro é uma região afundada e contínua sobre a mesma carroceria, não uma peça espacial.
  // Janelas laterais aplicadas na pele externa. São painéis conformados à
  // carroceria (não volumes independentes): sem eles a primeira leitura do
  // bloco vira uma cápsula, e não um cupê com cabine.
  for (const lado of [1]) {
    const janela = [[-.64,.31],[-.30,.70],[.23,.63],[.55,.37]].map(([z,y]) => vertice([lado * 1.035, y, z]));
    face(janela[0],janela[1],janela[2],'vidro'); face(janela[0],janela[2],janela[3],'vidro');
  }
  // Quatro rodas em relação explícita com os arcos: centros dentro da faixa lateral da carroceria.
  const roda = (x,z) => { const raio=.39, profund=.16, n=20, aneis=[]; for(const dx of [-profund, profund]) { const anel=[]; for(let i=0;i<n;i++){const q=2*Math.PI*i/n; anel.push(vertice([x+dx, -.22+Math.sin(q)*raio, z+Math.cos(q)*raio]));} aneis.push(anel); }
    for(let i=0;i<n;i++){const k=(i+1)%n; face(aneis[0][i],aneis[0][k],aneis[1][k],'roda');face(aneis[0][i],aneis[1][k],aneis[1][i],'roda');}
    // Tampas tornam o pneu legível na vista lateral; sem elas, o cilindro
    // aparece apenas como uma lâmina e a prova induz falso "pneu ausente".
    for (const dx of [-profund, profund]) { const centro=vertice([x+dx,-.22,z]), anel=aneis[dx<0?0:1]; for(let i=0;i<n;i++) face(centro,anel[i],anel[(i+1)%n],'roda'); }
  };
  for(const x of [-.80,.80]) for(const z of [-1.03,.93]) roda(x,z);
  return { V,F,materiais, estacoes };
}

function camera(nome) {
  const base = {
    frontal: {olhar:[0,0,-1], u:[1,0,0], v:[0,1,0]},
    'lateral-direita': {olhar:[1,0,0], u:[0,0,1], v:[0,1,0]},
    traseira: {olhar:[0,0,1], u:[-1,0,0], v:[0,1,0]},
    superior: {olhar:[0,1,0], u:[1,0,0], v:[0,0,-1]},
    'perspectiva-frontal-direita': {olhar:norm([.72,.30,-.65]), u:norm([.67,0,.74]), v:norm(cross(norm([.67,0,.74]),norm([.72,.30,-.65])))}
  }[nome];
  return {...base, olhar:norm(base.olhar),u:norm(base.u),v:norm(base.v)};
}
function projetor(modelo, cam) {
  const q=modelo.V.map(p=>({x:dot(p,cam.u),y:dot(p,cam.v),z:dot(p,cam.olhar)}));
  const xs=q.map(p=>p.x),ys=q.map(p=>p.y), margem=34;
  const esc=Math.min((W-2*margem)/(Math.max(...xs)-Math.min(...xs)),(H-2*margem)/(Math.max(...ys)-Math.min(...ys)));
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  return (p)=>({x:W/2+(dot(p,cam.u)-cx)*esc,y:H/2-(dot(p,cam.v)-cy)*esc,z:dot(p,cam.olhar)});
}
function normalFace(a,b,c) { return norm(cross(sub(b,a),sub(c,a))); }
function normaisDosVertices(modelo) {
  const soma = modelo.V.map(() => [0,0,0]);
  for (const f of modelo.F) { const n = normalFace(...f.map(id => modelo.V[id])); for (const id of f) for (let i=0;i<3;i++) soma[id][i] += n[i]; }
  return soma.map(norm);
}
function rasterizar(modelo, nome) {
  const cam=camera(nome), pr=projetor(modelo,cam), nVert=normaisDosVertices(modelo), pixels=Buffer.alloc(W*H*3), zbuf=new Float64Array(W*H).fill(-Infinity), m=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){pixels[i*3]=242;pixels[i*3+1]=245;pixels[i*3+2]=246;}
  modelo.F.forEach((f,indice)=>{ const ps=f.map(id=>pr(modelo.V[id])), ns=f.map(id=>nVert[id]), mat=modelo.materiais[indice]; const area=(ps[1].x-ps[0].x)*(ps[2].y-ps[0].y)-(ps[2].x-ps[0].x)*(ps[1].y-ps[0].y); if(Math.abs(area)<1e-7)return;
    const xa=Math.max(0,Math.floor(Math.min(...ps.map(p=>p.x)))),xb=Math.min(W-1,Math.ceil(Math.max(...ps.map(p=>p.x)))),ya=Math.max(0,Math.floor(Math.min(...ps.map(p=>p.y)))),yb=Math.min(H-1,Math.ceil(Math.max(...ps.map(p=>p.y))));
    for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){const px=x+.5,py=y+.5,w0=((ps[1].x-px)*(ps[2].y-py)-(ps[2].x-px)*(ps[1].y-py))/area,w1=((ps[2].x-px)*(ps[0].y-py)-(ps[0].x-px)*(ps[2].y-py))/area,w2=1-w0-w1;if(w0<0||w1<0||w2<0)continue;const k=y*W+x,depth=w0*ps[0].z+w1*ps[1].z+w2*ps[2].z;if(depth<=zbuf[k])continue;const n=norm([w0*ns[0][0]+w1*ns[1][0]+w2*ns[2][0],w0*ns[0][1]+w1*ns[1][1]+w2*ns[2][1],w0*ns[0][2]+w1*ns[1][2]+w2*ns[2][2]]),ilum=clamp(.25+.75*dot(n,norm([-.4,.8,-.45]))),cor=mat==='roda'?[20,26,31]:mat==='vidro'?[35,72,88]:[Math.round(118+85*ilum),Math.round(20+45*ilum),Math.round(18+32*ilum)];zbuf[k]=depth;m[k]=1;pixels[k*3]=cor[0];pixels[k*3+1]=cor[1];pixels[k*3+2]=cor[2];}
  });
  return {W,H,m,pixels};
}
function mascaraReferencia(buf) {
  const {W:rw,H:rh,ch,pixels}=decodePng(buf); const bruto=new Uint8Array(rw*rh);
  for(let i=0;i<bruto.length;i++){const o=i*ch,l=.3*pixels[o]+.59*pixels[o+1]+.11*pixels[o+2];bruto[i]=l<232?1:0;}
  // elimina rótulos/sujeira: só conserva o maior componente conexo.
  const visto=new Uint8Array(bruto.length); let maior=[];
  for(let s=0;s<bruto.length;s++) if(bruto[s]&&!visto[s]){const fila=[s],comp=[];visto[s]=1;for(let h=0;h<fila.length;h++){const p=fila[h],x=p%rw,y=(p/rw)|0;comp.push(p);for(const d of [-1,1,-rw,rw]){const q=p+d,qx=q%rw,qy=(q/rw)|0;if(q>=0&&q<bruto.length&&Math.abs(qx-x)+(Math.abs(qy-y))===1&&bruto[q]&&!visto[q]){visto[q]=1;fila.push(q);}}}if(comp.length>maior.length)maior=comp;}
  const src=new Uint8Array(rw*rh);for(const p of maior)src[p]=1;const m=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)m[y*W+x]=src[Math.min(rh-1,Math.floor(y*rh/H))*rw+Math.min(rw-1,Math.floor(x*rw/W))];
  const imagem = Buffer.alloc(W * H * 3);
  for (let i = 0; i < m.length; i += 1) imagem.fill(m[i] ? 30 : 245, i * 3, i * 3 + 3);
  return {W,H,m, pixels: imagem};
}
function bbox(m) {let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(m[y*W+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};}
function normalizar(m, alvo) { const b=bbox(m), out=new Uint8Array(W*H); const escala=Math.min(alvo.w/b.w,alvo.h/b.h); for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sx=Math.floor((x-(alvo.x0+alvo.w/2))/escala+b.x0+b.w/2),sy=Math.floor((y-(alvo.y0+alvo.h/2))/escala+b.y0+b.h/2);if(sx>=0&&sx<W&&sy>=0&&sy<H)out[y*W+x]=m[sy*W+sx];}return {W,H,m:out};}
function iou(a,b){let u=0,i=0;for(let p=0;p<a.m.length;p++){if(a.m[p]||b.m[p])u++;if(a.m[p]&&b.m[p])i++;}return Number((i/(u||1)).toFixed(4));}

await mkdir(saida,{recursive:true});
const modelo=novoModelo(), manifesto={formato:'mecanifica.n6.1-blocagem@1', escopo:'experimento isolado; nao altera o nucleo nem aprova a receita', regra:'cada vista e aberta individualmente em tamanho nativo; painel e proibido como evidencia', carroceria:'uma casca fechada continua; rodas sao a unica submontagem separada', vistas:{}, geometria:{vertices:modelo.V.length,triangulos:modelo.F.length,estacoes:modelo.estacoes}};
for(const [nome,arquivo] of vistas){const refBuf=await readFile(new URL(`vistas/${arquivo}`,alvo)),ref=mascaraReferencia(refBuf),render=rasterizar(modelo,nome),rNorm=normalizar(render.m,bbox(ref.m));const renderNorm={...render,m:rNorm.m};const sobre=sobreposicaoParaPng(renderNorm,ref);const refPng=encodePng({W,H,ch:3,pixels:ref.pixels}),renPng=encodePng({W,H,ch:3,pixels:render.pixels});await writeFile(new URL(`referencia-${nome}.png`,saida),refPng);await writeFile(new URL(`render-${nome}.png`,saida),renPng);await writeFile(new URL(`sobreposicao-${nome}.png`,saida),sobre);manifesto.vistas[nome]={referencia:arquivo,hashReferencia:sha(refBuf),hashRender:sha(renPng),hashSobreposicao:sha(sobre),iouSilhueta:iou(renderNorm,ref),bboxReferencia:bbox(ref.m),inspecaoObrigatoria:'abrir referencia, render e sobreposicao separadamente; registrar achado por vista'};}
await writeFile(new URL('manifesto.json',raiz),JSON.stringify(manifesto,null,2)+'\n');
console.log(JSON.stringify({saida:new URL('.',saida).pathname,vistas:Object.fromEntries(Object.entries(manifesto.vistas).map(([k,v])=>[k,v.iouSilhueta]))},null,2));
