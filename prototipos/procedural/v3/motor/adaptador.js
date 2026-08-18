/* adaptador.js — projeção visual do neutro; não conhece receitas nem execução. */
import { N_INFLU, norm3, normalDaFace, temNomeDeParte } from './nucleo.js';

/* ----------------------------------------------------------------------------
   ADAPTADOR v3: neutro -> formato do motor. É a ÚNICA peça que muda de mundo
   pra mundo (outro motor = outro adaptador). Monta os triângulos soltos (pos3
   uv2 nrm3), e a cor por face chega via TEXTURA + UV — o formato de vértice
   ainda não tem cor (reservada no passo 0), então NÃO se inventa atributo de
   cor no vértice. Chapado por padrão (normal por face); face `liso` usa a média
   das normais das faces lisas vizinhas.

   PASSO 11a — a FUNDAÇÃO da textura pintável: o antigo SWATCH (uma fita de cores
   distintas, faces da mesma cor compartilhando UM texel) vira um ATLAS POR FACE.
   Cada face ganha uma ILHA própria num quadriculado ~quadrado (N faces ->
   cols=ceil(√N)); o UV de cada canto sai por PROJEÇÃO EM CAIXA *daquela* face (o
   eixo dominante da normal manda; projeta as OUTRAS duas coordenadas de mundo —
   a "caixa" do doc, docs/oficina.md "Pintura: projeção em caixa desde o começo")
   normalizada pela bbox 2D da face e mapeada pro retângulo interno da ilha. Como
   nenhuma cor é compartilhada, o furo da projeção em caixa GLOBAL some: topo (+y)
   e fundo (-y) de um cilindro — que na caixa global empilhariam no MESMO pedaço
   da textura (ambos projetam em XZ) — caem em ilhas DISTINTAS. Pintar um não
   pinta o outro: é a base sem-sobreposição que o pincel macio (passo 11b) exige.
   Em 11a o conteúdo é cor CHAPADA: a ilha inteira é a cor da face, então a face
   renderiza IGUAL ao swatch de hoje (mesmo pixel na tela; provado por medição).
   O mapa por face (retângulo da ilha + a projeção) sai ANEXADO em `atlas` pro
   11b converter superfície (face + ponto de mundo) -> texel e pintar. */
const COR_PADRAO = '#9a8f80';   // madeira neutra pra face sem pincel
function hexRGB(h) {
  const s = String(h).replace('#', '');
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(n.slice(0, 2), 16) || 0, parseInt(n.slice(2, 4), 16) || 0, parseInt(n.slice(4, 6), 16) || 0];
}

/* atlas: tamanho da ILHA (bloco de texels por face) e do GUTTER (borda de folga
   entre ilhas). O motor amostra em NEAREST — não há sangramento por
   interpolação —, então o gutter é MARGEM: mantém todo UV a >= GUTTER texels da
   borda da célula (nenhum canto encosta na vizinha) e sobra a moldura pro pincel
   do 11b dilatar a cor pra fora sem vazar. Ilha chapada em 11a => a moldura é a
   própria cor da face. */
const ATLAS_TILE = 32, ATLAS_GUTTER = 2;

/* eixo dominante da normal (0=x, 1=y, 2=z: o maior |componente|) e os DOIS eixos
   de projeção — os outros dois, em ordem crescente. É a "caixa" do doc, privada
   por face: normal pra cima (y) projeta em (x,z); pro lado (x) em (y,z); pra
   frente (z) em (x,y). */
function eixoDominante(n) {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  if (ax >= ay && ax >= az) return 0;
  if (ay >= az) return 1;
  return 2;
}
const OUTROS_EIXOS = [[1, 2], [0, 2], [0, 1]];   // eixos de projeção por eixo dominante

export function adaptarV3(neutro, ctx, MATERIAIS = {}) {
  const { V, F } = neutro;
  const faces = [...F.values()].sort((a, b) => a.id - b.id);

  /* normais: por face (chapado) e, pra `liso`, média por vértice das faces
     lisas que o tocam. (Intocado do swatch — o 11a só troca a textura+UV.) */
  const nFace = new Map();
  for (const f of faces) nFace.set(f.id, normalDaFace(V, f.vs));
  const acc = new Map();
  for (const f of faces) if (f.liso) { const n = nFace.get(f.id); for (const v of f.vs) { const s = acc.get(v) || [0, 0, 0]; acc.set(v, [s[0] + n[0], s[1] + n[1], s[2] + n[2]]); } }
  const nSuave = new Map();
  for (const [v, s] of acc) nSuave.set(v, norm3(s[0], s[1], s[2]));

  /* GRADE de ilhas: uma por face (ordem por id), quadriculado ~quadrado. Cada
     ilha ocupa um bloco TILE×TILE; o UV endereça só o retângulo INTERNO (inset
     de GUTTER em todo lado), então nenhum canto toca a borda da célula. */
  const N = faces.length || 1;
  const cols = Math.max(1, Math.ceil(Math.sqrt(N)));
  const rows = Math.max(1, Math.ceil(N / cols));
  const W = cols * ATLAS_TILE, H = rows * ATLAS_TILE;

  /* PROJEÇÃO POR FACE, pré-calculada por ilha: eixo dominante, bbox 2D dos cantos
     no plano dos outros dois eixos, e o retângulo interno da ilha (em UV 0..1 do
     atlas). `projeta(pontoMundo) -> [u,v]` é a FONTE ÚNICA do UV: o mesh e o mapa
     do 11b saem dela, então nunca divergem. bbox degenerada (área ~0 num eixo —
     face de fio, ou canto pendurado) cai no CENTRO daquele eixo: sem divisão por
     zero, e com a ilha chapada a cor sai a mesma. */
  const EPS = 1e-9;
  const atlasFace = new Map();
  faces.forEach((f, i) => {
    const col = i % cols, row = (i / cols) | 0;
    const ix = col * ATLAS_TILE + ATLAS_GUTTER, iy = row * ATLAS_TILE + ATLAS_GUTTER;   // canto do retângulo interno (texels)
    const iw = ATLAS_TILE - 2 * ATLAS_GUTTER, ih = ATLAS_TILE - 2 * ATLAS_GUTTER;
    const u0 = ix / W, v0 = iy / H, u1 = (ix + iw) / W, v1 = (iy + ih) / H;             // o mesmo em UV 0..1 do atlas
    const dom = eixoDominante(nFace.get(f.id));
    const [pa, pb] = OUTROS_EIXOS[dom];
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const v of f.vs) { const p = V.get(v); if (!p) continue; if (p[pa] < aMin) aMin = p[pa]; if (p[pa] > aMax) aMax = p[pa]; if (p[pb] < bMin) bMin = p[pb]; if (p[pb] > bMax) bMax = p[pb]; }
    const aSpan = aMax - aMin, bSpan = bMax - bMin;   // bbox 2D da face no plano dominante
    const projeta = (p) => {
      const s = aSpan > EPS ? (p[pa] - aMin) / aSpan : 0.5;   // 0..1 na bbox (degenerada -> centro)
      const t = bSpan > EPS ? (p[pb] - bMin) / bSpan : 0.5;
      return [u0 + s * (u1 - u0), v0 + t * (v1 - v0)];        // -> retângulo interno da ilha (UV do atlas)
    };
    atlasFace.set(f.id, { ilha: { x: ix, y: iy, w: iw, h: ih }, dom, projeta });
  });

  /* TEXTURA do atlas: base = cor CHAPADA da célula (`f.cor ?? COR_PADRAO`, o 11a),
     célula INTEIRA (miolo + gutter) preenchida; POR CIMA, os DABS do pincel macio
     daquela face. Célula sem face (sobra da última linha) fica na madeira neutra. */
  const corIlha = faces.map((f) => hexRGB(f.cor ?? COR_PADRAO));
  const corVazia = hexRGB(COR_PADRAO);

  /* PINCEL MACIO (11b): pré-computa por ilha (índice = ordem da face) os dabs que a
     face vai rasterizar — o {a,b} FACE-LOCAL vira centro em TEXELS dentro do retângulo
     interno (a MESMA conta que o UV do mesh: texel = ix + a·iw), o `raio` face-local
     vira raio em TEXELS (× a largura da ilha; a ilha é quadrada, iw==ih), e a `dureza`
     vira a fração do raio 100% opaca (o "núcleo duro"). Ordem preservada = ordem de
     pintura. raio 0/inválido -> dab no-op (defensivo, não corrompe). */
  const dabsIlha = faces.map((f) => {
    const il = atlasFace.get(f.id).ilha;
    return (f.tinta || []).map((t) => ({
      cx: il.x + t.a * il.w, cy: il.y + t.b * il.h,        // {a,b}∈[0,1] -> centro no retângulo interno da ilha
      rT: t.raio * il.w,                                    // raio face-local -> texels (ilha quadrada)
      nucleo: Math.min(1, Math.max(0, t.dureza)),           // dureza = fração do raio de opacidade cheia
      rgb: hexRGB(t.cor ?? COR_PADRAO),
    })).filter((d) => d.rT > 0);
  });

  const tex = ctx.tex.texCanvas(W, H, (x, y) => {
    const col = (x / ATLAS_TILE) | 0, row = (y / ATLAS_TILE) | 0, i = row * cols + col;
    if (i >= corIlha.length) return corVazia;               // célula sem face
    const dabs = dabsIlha[i];
    if (!dabs.length) return corIlha[i];                    // face chapada -> IDÊNTICO ao 11a (compat byte-a-byte)
    /* compõe os dabs SÓ desta face (o texel é de UMA célula): o dab fica PRESO na
       célula, nunca vaza pra ilha vizinha — o gutter é a folga pra ele dilatar sem
       clipar. Falloff: q=dist/raio em [0..1]; dentro do núcleo (q<=dureza) opacidade
       cheia, e do núcleo à borda um ombro macio (smoothstep) até 0. Dureza alta =
       núcleo grande + borda curta; baixa = degradê largo. Alpha OVER, mais nova por cima. */
    let r = corIlha[i][0], g = corIlha[i][1], b = corIlha[i][2];
    for (const d of dabs) {
      const q = Math.hypot(x + 0.5 - d.cx, y + 0.5 - d.cy) / d.rT;
      if (q >= 1) continue;                                 // fora do dab
      let a;
      if (q <= d.nucleo) a = 1;                             // núcleo duro
      else { const tt = (1 - q) / (1 - d.nucleo); a = tt * tt * (3 - 2 * tt); }   // ombro macio até 0 na borda
      r += (d.rgb[0] - r) * a; g += (d.rgb[1] - g) * a; b += (d.rgb[2] - b) * a;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  });

  /* PASSO 12a — LOTES POR MATERIAL. Triângulos soltos (leque por face; UV da PRÓPRIA
     ilha, normal chapada ou suave em `liso`) AGRUPADOS por f.material: faces do MESMO
     material (o nome que a op `material` pôs) caem num só lote; faces SEM material vão
     pro lote PADRÃO (params no-op). Todos DIVIDEM a MESMA textura-atlas — cada lote é
     só o subconjunto de triângulos do seu grupo. Peça sem NENHUM material => um único
     grupo (null), na ORDEM de id => mesh BYTE-idêntico ao 11a (compat inegociável). */
  /* PASSO 13a — agrupa pela DUPLA (parte, material). Cada parte nomeada vira lote(s)
     próprio(s) (pra ganhar MATRIZ própria na animação); cada material segue com seus
     params. A chave junta os dois com um separador (\u0000) que nenhum nome contém.
     COMPAT INEGOCIÁVEL: face SEM parte E SEM material => chave '\u0000' pra TODAS =>
     UM só grupo, na ordem de id => mesh BYTE-idêntico ao 12b/11a (a ordem por id se
     mantém — `faces` já vem ordenado). O grupo carrega `parte` (nome|null) pro lote. */
  /* PASSO 14a — ESQUELETO (ADITIVO). SEM esqueleto (todo o jogo + peças de 1..13):
     `skin` é false, o mesh sai em 8 floats/vértice pela MESMA linha de push de antes
     -> BYTE-idêntico (a compat inegociável). COM esqueleto: o mesh ganha 8 floats a
     mais por vértice (índice+peso de OSSO, 4 influências cada) -> 16 floats, e todo
     lote é marcado `esqueleto` pro render usar o caminho skinado SEPARADO. O peso
     viaja com o ID do vértice: `infoV(v)` dá as MESMAS 4 influências pra toda cópia
     dele no mesh loose. boneIndex = posição do osso no ESQUELETO (a MESMA ordem que
     o animador usa). Vértice sem peso -> tudo 0 (o shader cai na identidade = bind
     pose, não deforma — o default seguro). */
  const skin = !!neutro.esqueleto;
  const nOssos = skin ? neutro.esqueleto.ossos.length : 0;
  let infoV = () => null;
  if (skin) {
    const ordemOsso = new Map(neutro.esqueleto.ossos.map((o, k) => [o.nome, k]));
    const infoOssoPorV = new Map();
    for (const [vid, m] of (neutro.pesos || new Map())) {
      const arr = [...m.entries()].filter(([, w]) => w > 0)
        .sort((a, b) => (b[1] - a[1]) || (ordemOsso.get(a[0]) - ordemOsso.get(b[0])));   // maior peso 1º; empate -> ordem do osso (determinístico)
      const top = arr.slice(0, N_INFLU);
      let soma = 0; for (const [, w] of top) soma += w;
      const idx = [0, 0, 0, 0], w = [0, 0, 0, 0];
      if (soma > 0) top.forEach(([osso, wt], k) => { idx[k] = ordemOsso.get(osso); w[k] = wt / soma; });   // TOP-N + NORMALIZA (somam 1)
      infoOssoPorV.set(vid, { idx, w });
    }
    const ZERO = { idx: [0, 0, 0, 0], w: [0, 0, 0, 0] };
    infoV = (v) => infoOssoPorV.get(v) || ZERO;
  }

  const grupos = new Map();   // chave `${parte}\u0000${material}` -> { parte, mat, mesh:{v} }
  for (const f of faces) {
    if (f.vs.some((v) => !V.has(v))) continue;   // defensivo: nunca desenha canto pendurado
    const ch = `${f.parte || ''}\u0000${f.material || ''}`;
    let g = grupos.get(ch);
    if (!g) { g = { parte: f.parte || null, mat: f.material || null, mesh: { v: [] } }; grupos.set(ch, g); }
    const projeta = atlasFace.get(f.id).projeta;
    const nf = nFace.get(f.id);
    const c0 = f.vs[0];
    for (let k = 1; k < f.vs.length - 1; k++) {   // leque a partir do primeiro canto
      for (const v of [c0, f.vs[k], f.vs[k + 1]]) {
        const p = V.get(v);
        const uv = projeta(p);
        const n = f.liso && nSuave.has(v) ? nSuave.get(v) : nf;
        g.mesh.v.push(p[0], p[1], p[2], uv[0], uv[1], n[0], n[1], n[2]);   // 8 floats — INTOCADO (byte-idêntico sem esqueleto)
        if (skin) { const iw = infoV(v); g.mesh.v.push(iw.idx[0], iw.idx[1], iw.idx[2], iw.idx[3], iw.w[0], iw.w[1], iw.w[2], iw.w[3]); }   // +8 floats de OSSO (índice×4, peso×4)
      }
    }
  }

  /* cada grupo -> um lote com a mesh do subconjunto + os PARAMS do material (ausentes
     no grupo padrão -> render no-op). `cor` do material MULTIPLICA a textura (corMul em
     0..1 -> uCorMul); `contorno` é o uRim POR MATERIAL; emissivo/aspereza/semLuz seguem
     o padrão do uRim no render.js (default = efeito nenhum). Os nomes CASAM os uniforms.
     PASSO 12b — MISTURA: `mistura:'transparente'` marca o lote (`transparente:true` +
     `opacidade` 0..1, default 1) pra o render desenhar numa PASSADA EXTRA (blend alpha,
     ordenada de trás pra frente). `opaco`/`recorte`/ausente = opaco como hoje: o lote NÃO
     ganha esses campos, então o render o mantém no passe de cena — byte-idêntico. */
  const lotes = [];
  for (const g of grupos.values()) {
    const L = { mesh: g.mesh, parte: g.parte || null };   // 13a: o NOME da parte do lote (null = sem parte). O render IGNORA (não lê .parte); a animação casa POR ÍNDICE via infoPorLote.
    const m = g.mat ? (MATERIAIS[g.mat] || {}) : null;
    if (m) {
      if (m.cor) L.corMul = hexRGB(m.cor).map((c) => c / 255);
      if (m.emissivo) L.emissivo = +m.emissivo;
      if (m.aspereza) L.aspereza = +m.aspereza;
      if (m.semLuz) L.semLuz = 1;
      if (m.contorno) L.rim = +m.contorno;
      if (m.mistura === 'transparente') { L.transparente = true; L.opacidade = m.opacidade == null ? 1 : Math.min(1, Math.max(0, +m.opacidade)); }   // 12b: só 'transparente' pede a passada extra
    }
    if (skin) { L.esqueleto = true; L.nOssos = nOssos; }   // 14a: lote skinado (mesh 16 floats) -> render usa o caminho skinado SEPARADO
    lotes.push(L);
  }

  /* PASSO 13a — PARTES resolvidas (nome -> {pivo}) pra a animação. O pivô é o EXPLÍCITO
     (`neutro.partes[nome].pivo`, do arquivo) OU, ausente, o CENTROIDE da parte: a média
     das posições dos vértices DISTINTOS de todas as faces dela, no espaço LOCAL do modelo
     (o mesmo espaço do mesh, antes do uModel). É metadado de animação — NÃO entra no mesh
     nem na canon; peça sem parte devolve {} (compat: nenhum consumidor de hoje lê isto). */
  const registro = neutro.partes || {};
  const vertsParte = new Map();   // nome -> Set(ids distintos)
  // `temNomeDeParte`: a mesma pergunta da guarda e do canon (uma definição só).
  for (const f of faces) if (temNomeDeParte(f.parte)) { let s = vertsParte.get(f.parte); if (!s) { s = new Set(); vertsParte.set(f.parte, s); } for (const v of f.vs) s.add(v); }
  const partes = {};
  for (const nome of new Set([...Object.keys(registro), ...vertsParte.keys()])) {
    let pivo = registro[nome] && registro[nome].pivo;   // explícito (já passado por vec no núcleo)
    if (!pivo) {   // default: centroide da parte
      let cx = 0, cy = 0, cz = 0, n = 0;
      for (const v of (vertsParte.get(nome) || [])) { const p = V.get(v); if (!p) continue; cx += p[0]; cy += p[1]; cz += p[2]; n++; }
      pivo = n ? [cx / n, cy / n, cz / n] : [0, 0, 0];
    }
    partes[nome] = { pivo };
  }

  /* atlas: o mapa por face pro passo 11b (superfície -> texel). `daFace(id)` dá a
     ILHA (retângulo interno em texels: {x,y,w,h}, a região pintável) e
     `projeta(pontoMundo) -> [u,v]` no atlas 0..1 (o MESMO UV do mesh). O 11b
     converte pra texel por (round(u*W), round(v*H)) e prende dentro da ilha (a
     pincelada nunca escapa pra vizinha). Anexado ao retorno; `executar`/a peça
     consomem {mesh,tex} e ignoram este campo. */
  const atlas = { W, H, cols, rows, tile: ATLAS_TILE, gutter: ATLAS_GUTTER, daFace: (id) => atlasFace.get(id) };
  return { lotes, tex, atlas, partes, esqueleto: neutro.esqueleto || null };   // 14a: o esqueleto resolvido (ou null) segue pro executar/montarAnimar
}

