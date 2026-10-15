/* O desenho da blocagem: as quatro vistas (isométrica, frontal, lateral e superior) de uma malha triangular que o módulo
   recebe como dado, com a oclusão por pixel da camada, a cor de cada volume e o mesmo quadro do desenho das formas.

   O módulo não importa o núcleo: quem liga o esboço à blocagem (o tradutor do nível zero, em `src/autoria`) fica em
   `tools/mecanifica/esboco-blocagem.mjs`, que entrega aqui, por opção, a malha (`{ vertices: [[x, y, z]], faces: [{ vertices:
   [i, j, k], volume }] }`, triângulos anti-horários vistos de fora) e a lista de volumes a desenhar, na ordem do desenho
   (`{ id, cor, opacidade? }`; um volume que não está na lista não é desenhado, e é assim que a unidade isolada e os volumes
   vizinhos em contorno claro se escolhem). A mesma entrada dá o mesmo desenho, byte a byte.

   O que sai é o que `desenharEsboco(esboco, { camada: true })` devolve (`svg`, `largura`, `altura`, `escala` e, com `camada`, a
   `camada` e o `svgSobreCamada`), de modo que a ferramenta desenha, compõe e grava como já faz. O quadro é o do desenho das formas
   (painel de `QUADRO.painelL` por `QUADRO.painelA`, título, nota e barra de escala), a escala é a mesma conta, `escalaDoQuadro` (a maior
   caixa projetada entre as opções cabe no painel, com a folga das colunas de legenda, ou a da chave em lista quando `lista` está
   ligado), e a tinta é a mesma (`tintaDaFace`), de modo que a mesma geometria cai nos mesmos pixels. Não há legenda, linha de
   centro, corte, explosão, zoom nem prévia: ficam no desenho das formas.

   Os traços são as arestas da malha que o desenho das formas também traça: o vinco (duas faces vizinhas a mais de 30 graus uma
   da outra) e a silhueta (uma face de frente e outra de costas para o olho) de cada volume, só onde alguma das duas faces olha
   para o observador. A face de costas não é desenhada (o volume é fechado e a de frente a cobre), e a face de perfil não cobre
   pixel. O que o próprio volume esconde de si (a parede do furo de um anel, vista de fora) sai pela conta que o desenho das
   formas usa nas formas côncavas, `semOQueOVolumeEsconde` de `oclusao-das-linhas.js`. A oclusão entre volumes é a da camada: o teste de profundidade por pixel, com o viés por índice de volume que desempata
   faces no mesmo plano em favor do volume que vem depois na lista. */
import { barraDeEscala, ErroDeEsboco, escalaDoQuadro, QUADRO, tintaDaFace, textoDoDesenho, VISTAS } from './index.js';
import { formasDoPainel, montarCamada } from './camada.js';
import { semOQueOVolumeEsconde } from './oclusao-das-linhas.js';

const { f1, esc, quebrar } = textoDoDesenho;

/* o cosseno de 30 graus: duas faces vizinhas com normais mais afastadas que isso formam um vinco */
export const COSSENO_DO_VINCO = Math.cos(Math.PI / 6);
/* a face cuja normal tem menos que isto de componente no olho está de perfil */
const PERFIL = 1e-6;
const AREA_MINIMA = 1e-9;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unitario = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };

function exigir(cond, msg) { if (!cond) throw new ErroDeEsboco(msg); }

/* As faces e os traços de um volume para o olho dado: `lados` (as faces de frente, `{ pts, n }`), `linhas` (as arestas a traçar,
   dois pontos 3D cada, sem as que o próprio volume esconde) e os índices dos vértices, para a caixa projetada. */
function facesDoVolume(vertices, triangulos, olho, V) {
  const faces = [];
  const arestas = new Map();
  const usados = new Set();
  for (const [i, j, k] of triangulos) {
    usados.add(i); usados.add(j); usados.add(k);
    const a = vertices[i];
    const n = cruz(sub(vertices[j], a), sub(vertices[k], a));
    if (!(Math.hypot(...n) > AREA_MINIMA)) continue;
    const u = unitario(n);
    const f = { ids: [i, j, k], n: u, frente: dot(u, olho) > PERFIL };
    faces.push(f);
    for (const [p, q] of [[i, j], [j, k], [k, i]]) {
      const chave = p < q ? `${p}:${q}` : `${q}:${p}`;
      const e = arestas.get(chave);
      if (e) e.faces.push(f); else arestas.set(chave, { p, q, faces: [f] });
    }
  }
  const linhas = [];
  for (const { p, q, faces: fs } of arestas.values()) {
    if (!fs.some((f) => f.frente)) continue;
    const dois = fs.length === 2;
    const traca = !dois || fs[0].frente !== fs[1].frente || dot(fs[0].n, fs[1].n) < COSSENO_DO_VINCO;
    if (traca) linhas.push([vertices[p], vertices[q]]);
  }
  const frentes = faces.filter((f) => f.frente);
  return { lados: frentes.map((f) => ({ pts: f.ids.map((i) => vertices[i]), n: f.n })), linhas: semOQueOVolumeEsconde(linhas, frentes, V, olho, { vertices }), usados: [...usados] };
}

/* Valida e lê um painel (uma opção). */
function lerPainel(p, k) {
  const onde = `painel ${k + 1}`;
  exigir(p && typeof p === 'object', `${onde}: precisa ser um objeto { titulo, nota, ocultar, lista, malha, volumes }`);
  exigir(p.malha && Array.isArray(p.malha.vertices) && Array.isArray(p.malha.faces), `${onde}: "malha" precisa de "vertices" e "faces"`);
  exigir(Array.isArray(p.volumes) && p.volumes.length > 0, `${onde}: "volumes" precisa listar ao menos um volume a desenhar`);
  const ids = p.volumes.map((v) => v?.id);
  exigir(ids.every((id) => typeof id === 'string') && new Set(ids).size === ids.length, `${onde}: cada volume precisa de um "id" em texto, sem repetição`);
  return { ...p, ocultos: new Set(p.ocultar ?? []) };
}

/* A caixa projetada, os itens da camada e o desenho em SVG puro de cada painel, para a vista dada. */
function projetar(painel, V, olho) {
  const { vertices, faces } = painel.malha;
  const ordem = new Map(painel.volumes.map((v, i) => [v.id, i]));
  const tris = painel.volumes.map(() => []);
  for (const f of faces) {
    const i = ordem.get(f.volume);
    if (i !== undefined) tris[i].push(f.vertices);
  }
  const itens = [];
  let min = [Infinity, Infinity];
  let max = [-Infinity, -Infinity];
  painel.volumes.forEach((v, i) => {
    if (tris[i].length === 0) return;
    const { lados, linhas, usados } = facesDoVolume(vertices, tris[i], olho, V);
    let centro = [0, 0, 0];
    for (const idx of usados) {
      const q = V.p(vertices[idx]);
      min = [Math.min(min[0], q[0]), Math.min(min[1], q[1])];
      max = [Math.max(max[0], q[0]), Math.max(max[1], q[1])];
      centro = centro.map((c, e) => c + vertices[idx][e] / usados.length);
    }
    const r = { id: v.id, cor: v.cor, opacidade: v.opacidade !== undefined && v.opacidade < 1 ? v.opacidade : undefined };
    itens.push({ r, chunks: [{ dentro: [], lados, tampas: [], arcos: [], linhas }], prof: dot(centro, olho), lados, linhas });
  });
  exigir(itens.length > 0, `nenhum dos volumes pedidos tem face na malha (${painel.volumes.slice(0, 6).map((v) => v.id).join(', ')})`);
  return { itens, min, max };
}

/* Um painel de cada vez no quadro: a posição e a conversão do plano da vista (mm) para o pixel. */
function geometria(p, k, escala) {
  const x0 = k * QUADRO.painelL;
  const cx = x0 + QUADRO.painelL / 2 - ((p.min[0] + p.max[0]) / 2) * escala;
  const cy = QUADRO.topo + QUADRO.painelA / 2 - ((p.min[1] + p.max[1]) / 2) * escala;
  return { x0, tela: (q) => [cx + q[0] * escala, cy + q[1] * escala], cx, cy };
}

const caminho = (pts) => `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L')}Z`;

/* `entrada`: { vista, paineis } (ver o topo do arquivo). `camada: true` junta a camada e o `svgSobreCamada`; `perfilDosTracos: false` a entrega sem o perfil das fitas
   (ver `formasDoPainel`), para quem mede só a área das faces. */
export function desenharBlocagem(entrada, { camada: querCamada = false, perfilDosTracos = true } = {}) {
  exigir(entrada && typeof entrada === 'object', 'desenharBlocagem: a entrada precisa ser { vista, paineis }');
  const vista = entrada.vista ?? 'isometrica';
  exigir(VISTAS[vista], `"vista" deve ser uma de ${Object.keys(VISTAS).join(', ')}`);
  exigir(Array.isArray(entrada.paineis) && entrada.paineis.length > 0, 'desenharBlocagem: "paineis" precisa de ao menos uma opção');
  const V = VISTAS[vista];
  const olho = unitario(V.olho);
  const paineis = entrada.paineis.map((p, k) => {
    const lido = lerPainel(p, k);
    return { ...lido, ...projetar(lido, V, olho) };
  });

  /* a mesma escala para todos: a maior opção cabe no painel, com a folga das colunas de legenda ou, em lista, da margem da chave */
  const larg = Math.max(...paineis.map((p) => p.max[0] - p.min[0]));
  const alt = Math.max(...paineis.map((p) => p.max[1] - p.min[1]));
  const escalaColunas = escalaDoQuadro(larg, alt);
  const escalaLista = escalaDoQuadro(larg, alt, { lista: true });
  const temLista = paineis.some((p) => p.lista === true);
  const temColunas = paineis.some((p) => p.lista !== true);
  const escala = temLista ? (temColunas ? Math.min(escalaLista, escalaColunas) : escalaLista) : escalaColunas;

  const largura = QUADRO.painelL * paineis.length;
  const altura = QUADRO.topo + QUADRO.painelA + QUADRO.rodape;
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${largura}" height="${altura}" fill="#ffffff"/>`];
  if (querCamada) partes.push({ camada: false });
  const emForma = (t) => partes.push(querCamada ? { forma: t } : t);
  const formasDaCamada = [];

  paineis.forEach((p, k) => {
    const { x0, tela } = geometria(p, k, escala);
    if (querCamada) {
      formasDaCamada.push(...formasDoPainel(p.itens, { tela: (q) => tela(V.p(q)), olho, previa: false, perfilDosTracos, tinta: (r, n) => tintaDaFace(r.cor, n) }));
    }
    if (k > 0) partes.push(`<line x1="${x0}" y1="20" x2="${x0}" y2="${altura - 20}" stroke="#cccccc" stroke-width="2"/>`);
    if (!p.ocultos.has('titulo')) partes.push(`<text x="${x0 + QUADRO.painelL / 2}" y="44" font-size="26" font-weight="bold" text-anchor="middle">${esc(p.titulo ?? `Opção ${k + 1}`)}</text>`);

    /* o SVG puro: o pintor por volume (do fundo para a frente) e, dentro do volume, por face; aproximado em volume côncavo,
       e o PNG com a camada não o usa para as formas */
    for (const [it] of p.itens.map((x, i) => [x, i]).sort((a, b) => a[0].prof - b[0].prof || a[1] - b[1])) {
      const translucida = it.r.opacidade !== undefined;
      if (translucida) emForma(`<g opacity="${it.r.opacidade}">`);
      const profDe = (f) => f.pts.reduce((s, q) => s + dot(q, olho), 0) / f.pts.length;
      for (const f of [...it.lados].sort((a, b) => profDe(a) - profDe(b))) {
        const c = tintaDaFace(it.r.cor, f.n);
        emForma(`<path d="${caminho(f.pts.map(V.p).map(tela))}" fill="${c}" stroke="${c}" stroke-width="0.8" stroke-linejoin="round"/>`);
      }
      for (const l of it.linhas) {
        const [a, b] = l.map(V.p).map(tela);
        emForma(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="#111111" stroke-width="2" stroke-linecap="round"/>`);
      }
      if (translucida) emForma('</g>');
    }

    if (!p.ocultos.has('nota')) quebrar(p.nota, 58).slice(0, 3).forEach((l, i) => partes.push(`<text x="${x0 + QUADRO.painelL / 2}" y="${QUADRO.topo + QUADRO.painelA + 26 + i * 24}" font-size="19" text-anchor="middle">${esc(l)}</text>`));
  });
  if (!paineis.every((p) => p.ocultos.has('escala'))) {
    const { px: barra, rotulo } = barraDeEscala(escala);
    partes.push(`<line x1="20" y1="${altura - 14}" x2="${f1(20 + barra)}" y2="${altura - 14}" stroke="#111111" stroke-width="3"/><text x="${f1(28 + barra)}" y="${altura - 9}" font-size="14">${rotulo}</text>`);
  }
  partes.push('</svg>');

  const saida = { svg: partes.filter((x) => typeof x === 'string' || x.forma !== undefined).map((x) => (typeof x === 'string' ? x : x.forma)).join('\n'), largura, altura, escala };
  if (querCamada) {
    saida.camada = montarCamada(formasDaCamada, largura, altura);
    saida.svgSobreCamada = partes.filter((x) => typeof x === 'string' || x.camada !== undefined).map((x) => (typeof x === 'string' ? x : `<image x="0" y="0" width="${largura}" height="${altura}" href="__CAMADA__"/>`)).join('\n');
  }
  saida.paineis = paineis.map((p) => ({ min: p.min, max: p.max, volumes: p.itens.length, faces: p.itens.reduce((s, it) => s + it.lados.length, 0), tracos: p.itens.reduce((s, it) => s + it.linhas.length, 0) }));
  return saida;
}
