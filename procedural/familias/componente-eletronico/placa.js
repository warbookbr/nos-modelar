/* placa.js — a placa declarada: o contorno, a espessura, os furos de fixação e a lista de componentes da família
   `componente-eletronico`, cada um com posição, giro e lado, viram os passos de uma placa de circuito com as peças montadas.

   O referencial é o da placa: y = 0 é a face de cima e a placa ocupa y de -espessura a 0; o plano dela é xz, e a posição de um
   componente é o par [x, z] desse plano (o mesmo [u, v] da `extrusao`). O componente de cima assenta em y = 0 como a família o
   gera; o de baixo é virado meia volta em torno de x (x fica, y e z trocam de sinal) e assenta em y = -espessura. O giro, em
   graus, é em torno de +y pela regra da mão direita (anti-horário visto de cima), aplicado depois da virada, de modo que ele
   vale igual nas duas faces vistas de cima. A orientação que sai é a da ficha da ponte com a mecatrônica (`eixo` e `angulo` em
   graus, a rotação inteira do componente), e a posição é a da origem do componente no referencial da placa.

   A placa é o laminado entre as duas camadas de cobre, furado onde cada terminal atravessa e nos furos de fixação, e as ilhas
   de cobre das duas faces em volta de cada furo de terminal, mais as ilhas de superfície do componente que deita na placa
   (o SOIC), na face dele. O cobre fica rente às faces: a ilha ocupa a espessura de cobre de fora, e o laminado o miolo. A
   placa inteira (laminado e ilhas) é uma parte, com o id da placa; cada componente é outra parte, com o id dele e a placa
   como pai, e cada elemento do componente segue com o material que a receita escolhe por `comMateriais`. O id do componente é
   o designador de referência em minúsculas (r1, c2, u1, j3): letras e dígitos, que é nome de parte aceito no PLANO e
   identificador aceito na ficha da ponte.

   As medidas da placa são estimativa de fabricação comum e ficam em `PLACA`, com a fonte: o laminado FR-4 de 1,6 mm, o cobre de
   1 oz (0,035 mm), o furo do terminal com a maior medida da seção mais 0,25 mm (IPC-2222, nível B), o anel da ilha de 0,4 mm, a
   ilha de superfície 0,2 mm mais larga e 0,6 mm mais comprida que o pé (próxima da nominal da IPC-7351) e a folga mínima de
   0,15 mm entre cobres e de 0,3 mm do cobre até a borda. Um terminal de seção alongada, com o lado maior 2,5 vezes o menor ou
   mais (a lâmina do jack, a aleta do dissipador), ganha furo oblongo; os outros, furo redondo. Os polígonos dos furos circunscrevem a forma nominal, então a folga
   vale também na malha facetada.

   Recusa antes de gerar passo, com `ErroFamilia` (campo, valor e o aceito): id inválido ou repetido, tipo ou lado
   desconhecido, posição ou giro que não é número, furo ou ilha fora do contorno ou perto da borda, e duas ilhas, ou ilha e furo
   de fixação, mais perto que a folga, citando os dois componentes e os terminais. */
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';
import { ErroFamilia } from '../../../src/autoria/familia.js';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { ENCAPSULAMENTOS, idDoComponente, varianteDe } from './composicoes.js';
import { COMPONENTE_ELETRONICO, comMateriais } from './index.js';
import { alturaDoAssento, terminaisDoComponente } from './terminais.js';

export const PLACA = Object.freeze({
  espessura: 1.6, cobre: 0.035, folgaDoFuro: 0.25, anel: 0.4, ilhaDeSuperficie: Object.freeze({ largura: 0.2, comprimento: 0.6 }),
  folga: 0.15, borda: 0.3, alongado: 2.5, ladosDoFuro: 12,
});

const FAMILIA = 'componente-eletronico';
const ID_DE_PECA = /^[a-z][a-z0-9]*$/;
const LADOS = ['cima', 'baixo'];
const MM = 0.001;
const metro = (mm) => Number((mm * MM).toPrecision(12));
const limpo = (x) => (Math.abs(x) < 1e-12 ? 0 : Number(x.toPrecision(12)));
const recusar = (campo, valor, aceito) => { throw new ErroFamilia({ familia: FAMILIA, campo, valor, aceito }); };
const numero = (v) => typeof v === 'number' && Number.isFinite(v);
const TIPOS = Object.values(ENCAPSULAMENTOS);

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* ---------- geometria plana, em mm, no plano [x, z] da placa ---------- */

/* o polígono de um círculo, circunscrito (o círculo nominal fica dentro dele), com os vértices começando no ângulo `fase` */
function circulo([cx, cz], raio, fase = 0, lados = PLACA.ladosDoFuro) {
  const r = raio / Math.cos(Math.PI / lados);
  return Array.from({ length: lados }, (_, k) => {
    const a = (2 * Math.PI * k) / lados + fase;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
}
/* a fase dos vértices do furo de índice `k`: a parte fracionária de k vezes a razão áurea, numa volta de um lado do polígono.
   Furos de mesma fase em fileira (ou em coluna) põem lados de furos vizinhos na mesma reta, e a triangulação da tampa do
   laminado devolve triângulo de área nula com três pontos dessa reta (medido no módulo de placa girado de 90 graus); a fase
   diferente em cada furo tira o alinhamento, sem mudar a forma, que continua circunscrevendo o círculo nominal. */
const faseDoFuro = (k) => (((k * 0.6180339887498949) % 1) * 2 * Math.PI) / PLACA.ladosDoFuro;

/* o oblongo de `comprimento` por `largura` ao longo do ângulo `a` (radianos), com as pontas em meio círculo circunscrito: os
   vértices de cada ponta ficam no meio de cada passo de ângulo, e o primeiro e o último caem na reta dos lados */
function oblongo([cx, cz], comprimento, largura, a, lados = PLACA.ladosDoFuro) {
  const raio = largura / 2;
  const meio = (comprimento - largura) / 2;
  const n = lados / 2;
  const passo = Math.PI / n;
  const r = raio / Math.cos(passo / 2);
  const pontos = [];
  for (const sinal of [1, -1]) {
    for (let k = 0; k < n; k += 1) {
      const t = (sinal > 0 ? -Math.PI / 2 : Math.PI / 2) + passo * (k + 0.5);
      pontos.push([sinal * meio + r * Math.cos(t), r * Math.sin(t)]);
    }
  }
  const c = Math.cos(a), s = Math.sin(a);
  return pontos.map(([u, v]) => [cx + u * c - v * s, cz + u * s + v * c]);
}
/* o retângulo de `largura` (no eixo u, girado de `a`) por `profundidade` */
function retangulo([cx, cz], largura, profundidade, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => {
    const u = (i * largura) / 2, v = (j * profundidade) / 2;
    return [cx + u * c - v * s, cz + u * s + v * c];
  });
}
/* o contorno da placa: lista de pontos [x, z], ou { retangulo: { largura, profundidade, cantos? } } centrado na origem */
function contornoDe(contorno) {
  if (Array.isArray(contorno)) {
    if (contorno.length < 3 || !contorno.every((p) => Array.isArray(p) && p.length === 2 && p.every(numero))) recusar('placa.contorno', contorno, 'lista de ao menos três pontos [x, z] em mm, ou { retangulo: { largura, profundidade, cantos? } }');
    return contorno.map(([x, z]) => [x, z]);
  }
  const r = contorno?.retangulo;
  if (!r || !numero(r.largura) || !numero(r.profundidade) || r.largura <= 0 || r.profundidade <= 0) recusar('placa.contorno', contorno, '{ retangulo: { largura, profundidade, cantos? } } com medidas positivas em mm, ou lista de pontos [x, z]');
  const cantos = r.cantos ?? 0;
  if (!numero(cantos) || cantos < 0 || 2 * cantos > Math.min(r.largura, r.profundidade)) recusar('placa.contorno.retangulo.cantos', cantos, `raio de canto em mm, de 0 até a metade do lado menor (${Math.min(r.largura, r.profundidade) / 2})`);
  const L = r.largura / 2, P = r.profundidade / 2;
  if (!cantos) return [[-L, -P], [L, -P], [L, P], [-L, P]];
  const pontos = [];
  const n = 6;
  for (const [cx, cz, a0] of [[L - cantos, -P + cantos, -Math.PI / 2], [L - cantos, P - cantos, 0], [-L + cantos, P - cantos, Math.PI / 2], [-L + cantos, -P + cantos, Math.PI]]) {
    for (let k = 0; k <= n; k += 1) {
      const a = a0 + (Math.PI / 2) * (k / n);
      pontos.push([cx + cantos * Math.cos(a), cz + cantos * Math.sin(a)]);
    }
  }
  return pontos;
}

function dentroDoPoligono([x, z], poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i, i += 1) {
    const [xi, zi] = poligono[i], [xj, zj] = poligono[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}
function distanciaAoSegmento([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
const arestas = (p) => p.map((a, k) => [a, p[(k + 1) % p.length]]);
/* a distância entre dois polígonos convexos: zero se se cruzam (eixo separador de cada aresta), senão a menor de ponto a aresta */
function distanciaEntreConvexos(a, b) {
  for (const poligono of [a, b]) {
    for (const [[x0, z0], [x1, z1]] of arestas(poligono)) {
      const n = [z1 - z0, x0 - x1];
      const proj = (p) => p.map(([x, z]) => x * n[0] + z * n[1]);
      const pa = proj(a), pb = proj(b);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) {
        let menor = Infinity;
        for (const [p, q] of [[a, b], [b, a]]) for (const v of p) for (const [s0, s1] of arestas(q)) menor = Math.min(menor, distanciaAoSegmento(v, s0, s1));
        return menor;
      }
    }
  }
  return 0;
}
const distanciaABorda = (ponto, contorno) => Math.min(...arestas(contorno).map(([a, b]) => distanciaAoSegmento(ponto, a, b)));

/* ---------- a pose de um componente na placa ---------- */

/* a matriz 3x3 da pose: a virada do lado de baixo (meia volta em x) e depois o giro em torno de +y */
function matrizDaPose(giro, lado) {
  const t = (giro * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const ry = [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  const f = lado === 'baixo' ? [1, -1, -1] : [1, 1, 1];
  return ry.map((linha) => linha.map((v, j) => v * f[j]));
}
const aplicar = (m, [x, y, z]) => m.map(([a, b, c]) => a * x + b * y + c * z);

/** Eixo e ângulo (graus, mão direita) de uma matriz de rotação 3x3, como a ficha da ponte escreve a orientação. */
export function eixoEAngulo(m) {
  const traco = m[0][0] + m[1][1] + m[2][2];
  const angulo = Math.acos(Math.max(-1, Math.min(1, (traco - 1) / 2)));
  if (angulo < 1e-9) return { eixo: [0, 1, 0], angulo: 0 };
  let eixo;
  if (Math.PI - angulo < 1e-6) {
    /* meia volta: o eixo sai da diagonal de (m + I) / 2, com o sinal pela maior componente */
    const d = [0, 1, 2].map((k) => Math.sqrt(Math.max(0, (m[k][k] + 1) / 2)));
    const k = d.indexOf(Math.max(...d));
    eixo = [0, 1, 2].map((j) => (j === k ? d[k] : (m[k][j] + m[j][k]) / (4 * d[k])));
  } else {
    const s = 2 * Math.sin(angulo);
    eixo = [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s];
  }
  const n = Math.hypot(...eixo);
  return { eixo: eixo.map((v) => limpo(v / n)), angulo: limpo((angulo * 180) / Math.PI) };
}

/* ---------- a declaração ---------- */

/* os parâmetros completos de um componente: o padrão do contrato, o perfil e o que a declaração escreve, nessa ordem */
function parametrosCompletos(declarados) {
  const contrato = COMPONENTE_ELETRONICO.contrato;
  const doPerfil = declarados.perfil ? contrato.perfis[declarados.perfil].parametros : {};
  return Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, declarados[nome] ?? doPerfil[nome] ?? padrao]));
}

function lerPeca(peca, k, ids) {
  const onde = `placa.pecas[${k}]`;
  if (!peca || typeof peca !== 'object' || Array.isArray(peca)) recusar(onde, peca, '{ id, tipo ou perfil, parametros?, posicao: [x, z], giro?, lado?, materiais? }');
  const { id, tipo, perfil, parametros = {}, posicao, giro = 0, lado = 'cima', materiais = {}, nome, encostaEm = [] } = peca;
  if (typeof id !== 'string' || !ID_DE_PECA.test(id)) recusar(`${onde}.id`, id, 'o designador de referência em minúsculas, letras e dígitos começando por letra (r1, c2, u1, j3)');
  if (ids.has(id)) recusar(`${onde}.id`, id, 'um id que nenhuma outra peça nem a placa usa');
  ids.add(id);
  if (tipo !== undefined && !TIPOS.includes(tipo)) recusar(`${onde}.tipo`, tipo, `um encapsulamento da família: ${TIPOS.join(', ')}`);
  if (tipo === undefined && perfil === undefined) recusar(`${onde}.tipo`, tipo, 'o encapsulamento (tipo) ou um perfil da família');
  if (!Array.isArray(posicao) || posicao.length !== 2 || !posicao.every(numero)) recusar(`${onde}.posicao`, posicao, 'o par [x, z] em mm no plano da placa');
  if (!numero(giro)) recusar(`${onde}.giro`, giro, 'ângulo em graus em torno de +y, anti-horário visto de cima');
  if (!LADOS.includes(lado)) recusar(`${onde}.lado`, lado, "'cima' ou 'baixo'");
  if (!parametros || typeof parametros !== 'object' || Array.isArray(parametros)) recusar(`${onde}.parametros`, parametros, 'objeto { parâmetro da família: valor em mm ou contagem }');
  if (!Array.isArray(encostaEm) || !encostaEm.every((e) => e && typeof e.peca === 'string' && typeof e.motivo === 'string' && e.motivo.trim())) recusar(`${onde}.encostaEm`, encostaEm, 'lista de { peca, motivo }: o componente da placa em que este encosta, como o TO-220 no dissipador, e por quê');
  if ('encapsulamento' in parametros) recusar(`${onde}.parametros.encapsulamento`, parametros.encapsulamento, "nada: o encapsulamento vem do 'tipo' ou do perfil");
  const doPerfil = perfil !== undefined ? COMPONENTE_ELETRONICO.contrato.perfis[perfil]?.parametros.encapsulamento : undefined;
  if (tipo !== undefined && doPerfil !== undefined && ENCAPSULAMENTOS[doPerfil] !== tipo) recusar(`${onde}.tipo`, tipo, `o encapsulamento do perfil '${perfil}', '${ENCAPSULAMENTOS[doPerfil]}', ou nenhum tipo`);
  const brutos = { ...(perfil !== undefined ? { perfil } : { encapsulamento: TIPOS.indexOf(tipo) + 1 }), ...parametros };
  const chamada = comMateriais(chamar(COMPONENTE_ELETRONICO, id, brutos), materiais);
  const completos = parametrosCompletos(brutos);
  const tipoReal = ENCAPSULAMENTOS[completos.encapsulamento];
  return { id, nome, tipo: tipoReal, perfil, parametros: completos, chamada, posicao, giro, lado, encostaEm };
}

/* a forma do furo e da ilha de um terminal, já na placa: oblongo quando a seção é alongada, redonda nas outras */
function cobreDoTerminal(terminal, centro, angulo, P, fase) {
  const { secao } = terminal;
  const [largura, profundidade] = secao.forma === 'redondo' ? [secao.diametro, secao.diametro] : [secao.largura, secao.profundidade];
  const maior = Math.max(largura, profundidade), menor = Math.min(largura, profundidade);
  const a = angulo + (profundidade > largura ? Math.PI / 2 : 0);
  if (!terminal.atravessa) {
    const ilha = retangulo(centro, (largura > profundidade ? largura : profundidade) + P.ilhaDeSuperficie.comprimento, menor + P.ilhaDeSuperficie.largura, a);
    return { furo: null, ilha };
  }
  if (secao.forma === 'redondo' || maior / menor < P.alongado) {
    const raio = (secao.forma === 'redondo' ? secao.diametro : Math.hypot(largura, profundidade)) / 2 + P.folgaDoFuro / 2;
    return { furo: circulo(centro, raio, fase), ilha: circulo(centro, raio + P.anel, fase), raio };
  }
  const larg = menor + P.folgaDoFuro;
  const comp = maior + menor + P.folgaDoFuro;
  return { furo: oblongo(centro, comp, larg, a), ilha: oblongo(centro, comp + 2 * P.anel, larg + 2 * P.anel, a) };
}

/* soma `base` a cada id de origem dos passos de um componente (os ids de origem da família começam em 1 a cada chamada) */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  return v;
};
const m2 = (pontos) => pontos.map(([x, z]) => [metro(x), metro(z)]);

/**
 * Os passos de uma placa declarada e o que ela publica. `declaracao`: `{ id = 'placa', contorno, espessura?, furos?: [{ centro:
 * [x, z], diametro }], pecas: [{ id, tipo ou perfil, parametros?, posicao: [x, z], giro? = 0, lado? = 'cima', materiais?, nome?,
 * encostaEm?: [{ peca, motivo }] }], materiais?: { placa = 'placa', ilha = 'ilha' }, pai? }`, em mm e graus; `opcoes.base` soma
 * um valor aos ids de origem, para a placa entrar numa receita que já tem os dela. Devolve `{ passos, pecas, furos, ilhas,
 * contatos, ilhasDaReceita, materiais }`: `pecas` traz a placa e cada componente com família, variante, posição (mm), orientação
 * e terminais, nos nomes de campo da ficha da ponte; `contatos` e `ilhasDaReceita` vão para `contatos` e `ilhas` da receita;
 * `materiais`, os nomes que a receita precisa declarar em `MATERIAIS`.
 */
export function placaDeclarada(declaracao, { base = 0 } = {}) {
  if (!declaracao || typeof declaracao !== 'object') recusar('placa', declaracao, 'a declaração { id, contorno, espessura, furos, pecas }');
  const P = PLACA;
  const id = declaracao.id ?? 'placa';
  if (typeof id !== 'string' || !ID_DE_PECA.test(id)) recusar('placa.id', id, 'letras minúsculas e dígitos, começando por letra');
  const espessura = declaracao.espessura ?? P.espessura;
  if (!numero(espessura) || espessura <= 2 * P.cobre + 0.1) recusar('placa.espessura', espessura, `espessura em mm maior que ${2 * P.cobre + 0.1} (as duas camadas de cobre e o laminado)`);
  const contorno = contornoDe(declaracao.contorno);
  const nomes = { placa: 'placa', ilha: 'ilha', ...(declaracao.materiais ?? {}) };
  if (!Array.isArray(declaracao.pecas) || !declaracao.pecas.length) recusar('placa.pecas', declaracao.pecas, 'lista de ao menos um componente');
  const ids = new Set([id]);
  const lidas = declaracao.pecas.map((peca, k) => lerPeca(peca, k, ids));

  /* os furos de fixação */
  const fixacao = (declaracao.furos ?? []).map((f, k) => {
    if (!f || !Array.isArray(f.centro) || f.centro.length !== 2 || !f.centro.every(numero) || !numero(f.diametro) || f.diametro <= 0) recusar(`placa.furos[${k}]`, f, '{ centro: [x, z], diametro } em mm');
    return { de: `furo de fixação ${k}`, centro: f.centro, diametro: f.diametro, poligono: circulo(f.centro, f.diametro / 2, faseDoFuro(100000 + k)) };
  });

  /* cada componente: a pose, os terminais na placa e o cobre deles */
  const cobre = [];
  const pecas = lidas.map((p) => {
    const y0 = p.lado === 'baixo' ? -espessura : 0;
    const matriz = matrizDaPose(p.giro, p.lado);
    const origem = [p.posicao[0], y0, p.posicao[1]];
    const angulo = (p.giro * Math.PI) / 180;
    const terminais = terminaisDoComponente(p.parametros).map((t) => {
      const local = [t.x, 0, t.z];
      const [x, y, z] = aplicar(matriz, local).map((v, k) => v + origem[k]);
      /* a seção vista de cima: a virada troca o sinal de z, e o giro gira o eixo u da seção de -angulo no plano [x, z] */
      const c = cobreDoTerminal(t, [x, z], -angulo, P, faseDoFuro(cobre.length));
      cobre.push({ peca: p.id, terminal: t.id, lado: p.lado, atravessa: t.atravessa, ...c });
      return { id: t.id, posicao: local.map(limpo), naPlaca: [x, y, z].map(limpo), atravessa: t.atravessa, secao: t.secao };
    });
    const variante = p.perfil ?? idDoComponente(varianteDe(p.parametros)).slice(FAMILIA.length + 1);
    return {
      id: p.id, ...(p.nome ? { nome: p.nome } : {}), familia: FAMILIA, variante, tipo: p.tipo, lado: p.lado, giro: p.giro,
      posicao: origem.map(limpo), orientacao: eixoEAngulo(matriz), terminais, chamada: p.chamada,
    };
  });

  /* o cobre de cada face: as ilhas dos furos nas duas, as de superfície na do componente */
  const ilhas = [];
  for (const c of cobre) {
    const faces = c.atravessa ? LADOS : [c.lado];
    for (const face of faces) ilhas.push({ peca: c.peca, terminal: c.terminal, face, poligono: c.ilha });
  }
  for (const ilha of ilhas) {
    const onde = `do terminal ${ilha.terminal} de ${ilha.peca}`;
    for (const ponto of ilha.poligono) {
      if (!dentroDoPoligono(ponto, contorno) || distanciaABorda(ponto, contorno) < P.borda) recusar(`placa.pecas.${ilha.peca}.posicao`, lidas.find((l) => l.id === ilha.peca).posicao, `uma posição em que a ilha ${onde} fique dentro do contorno, a ${P.borda} mm ou mais da borda`);
    }
  }
  for (const f of fixacao) {
    if (!f.poligono.every((ponto) => dentroDoPoligono(ponto, contorno) && distanciaABorda(ponto, contorno) >= P.borda)) recusar(`placa.${f.de}`, f.centro, `um centro em que o furo fique dentro do contorno, a ${P.borda} mm ou mais da borda`);
  }
  /* a folga entre cobres da mesma face, e entre cobre e furo de fixação */
  for (const face of LADOS) {
    const daFace = ilhas.filter((i) => i.face === face);
    for (let a = 0; a < daFace.length; a += 1) {
      for (let b = a + 1; b < daFace.length; b += 1) {
        const d = distanciaEntreConvexos(daFace[a].poligono, daFace[b].poligono);
        if (d < P.folga) recusar(`placa.pecas.${daFace[b].peca}.posicao`, lidas.find((l) => l.id === daFace[b].peca).posicao, `uma posição em que a ilha do terminal ${daFace[b].terminal} de ${daFace[b].peca} fique a ${P.folga} mm ou mais da do terminal ${daFace[a].terminal} de ${daFace[a].peca} na face de ${face} (estão a ${limpo(d)} mm)`);
      }
      for (const f of fixacao) {
        const d = distanciaEntreConvexos(daFace[a].poligono, f.poligono);
        if (d < P.folga) recusar(`placa.${f.de}`, f.centro, `um centro a ${P.folga} mm ou mais da ilha do terminal ${daFace[a].terminal} de ${daFace[a].peca} (estão a ${limpo(d)} mm)`);
      }
    }
  }

  /* os contatos que a placa declara à receita: o componente que assenta toca a face da placa, e o que encosta noutro toca esse
     outro; o grupo de componentes que não chega à placa por esses contatos fica preso só pelos terminais, que passam com folga
     pelos furos (a solda não é modelada), e vira ilha declarada */
  const porId = new Map(lidas.map((l) => [l.id, l]));
  const contatos = [];
  const grupo = new Map([[id, id], ...lidas.map((l) => [l.id, l.id])]);
  const raiz = (x) => { while (grupo.get(x) !== x) x = grupo.get(x); return x; };
  const unir = (a, b) => grupo.set(raiz(a), raiz(b));
  lidas.forEach((l, k) => {
    if (alturaDoAssento(l.parametros) === 0) {
      contatos.push({ par: [id, l.id], motivo: `${l.id} (${l.tipo}) assenta na face de ${l.lado} da placa ${id}, em y ${l.lado === 'cima' ? 0 : -espessura} mm` });
      unir(l.id, id);
    }
    l.encostaEm.forEach((e, j) => {
      if (!porId.has(e.peca) || e.peca === l.id) recusar(`placa.pecas[${k}].encostaEm[${j}].peca`, e.peca, `o id de outro componente desta placa: ${lidas.map((o) => o.id).filter((o) => o !== l.id).join(', ')}`);
      contatos.push({ par: [l.id, e.peca], motivo: e.motivo });
      unir(l.id, e.peca);
    });
  });
  const soltos = new Map();
  for (const l of lidas) if (raiz(l.id) !== raiz(id)) soltos.set(raiz(l.id), [...(soltos.get(raiz(l.id)) ?? []), l.id]);
  const ilhasDaReceita = [...soltos.values()].map((ids) => ({
    contem: ids[0],
    motivo: `${ids.join(', ')} fica${ids.length > 1 ? 'm' : ''} acima da placa ${id}, preso${ids.length > 1 ? 's' : ''} só pelos terminais, que atravessam os furos com folga; a solda que os prende não é modelada`,
  }));

  /* os passos: o laminado furado, as ilhas e os componentes */
  const passos = [];
  const pai = declaracao.pai !== undefined ? { pai: declaracao.pai } : {};
  const elemento = (op, idDeOrigem, args, material) => {
    const sel = { origem: { op, id: idDeOrigem } };
    passos.push([op, { origemId: idDeOrigem, ...args }]);
    passos.push(['parte', { nome: id, material, sel, ...pai }]);
    passos.push(['solido', { sel }]);
  };
  const furosDosTerminais = cobre.filter((c) => c.furo);
  /* o miolo do laminado, furado nos terminais e na fixação, e a camada de cada face, aberta onde a ilha entra: a face da placa
     fica plana em y = 0 e em y = -espessura, com as ilhas rentes a ela, e o componente que assenta toca a placa onde quer que
     encoste (na camada ou na ilha) */
  elemento('extrusao', base + 1, {
    perfil: m2(contorno), furos: [...furosDosTerminais.map((c) => m2(c.furo)), ...fixacao.map((f) => m2(f.poligono))],
    altura: metro(espessura - 2 * P.cobre), em: [0, metro(-espessura + P.cobre), 0],
  }, nomes.placa);
  LADOS.forEach((face, k) => elemento('extrusao', base + 2 + k, {
    perfil: m2(contorno), furos: [...ilhas.filter((i) => i.face === face).map((i) => m2(i.poligono)), ...fixacao.map((f) => m2(f.poligono))],
    altura: metro(P.cobre), em: [0, metro(face === 'cima' ? -P.cobre : -espessura), 0],
  }, nomes.placa));
  const baseDasIlhas = base + 1000 * (pecas.length + 1);
  ilhas.forEach((ilha, k) => {
    const doTerminal = cobre.find((c) => c.peca === ilha.peca && c.terminal === ilha.terminal);
    const y = ilha.face === 'cima' ? -P.cobre : -espessura;
    elemento('extrusao', baseDasIlhas + k, {
      perfil: m2(ilha.poligono), ...(doTerminal.furo ? { furos: [m2(doTerminal.furo)] } : {}), altura: metro(P.cobre), em: [0, metro(y), 0],
    }, nomes.ilha);
  });
  pecas.forEach((peca, k) => {
    const deslocamento = base + 1000 * (k + 1);
    const sel = { grupo: peca.id };
    for (const passo of expandirChamadasDeComposicao(familias().registroComposicoes, [peca.chamada]).passos) {
      const [op, args] = comBase(passo, deslocamento);
      passos.push(op === 'parte' ? [op, { ...args, nome: peca.id, pai: id }] : [op, args]);
    }
    if (peca.lado === 'baixo') passos.push(['rotaciona', { eixo: 'x', graus: 180, pivo: [0, 0, 0], sel }]);
    if (peca.giro) passos.push(['rotaciona', { eixo: 'y', graus: peca.giro, pivo: [0, 0, 0], sel }]);
    passos.push(['transladar', { d: peca.posicao.map(metro), sel }]);
  });

  const materiais = [...new Set([nomes.placa, nomes.ilha, ...pecas.flatMap((p) => Object.entries(p.chamada.argumentos).filter(([n]) => n.startsWith('material')).map(([, v]) => v))])].sort();
  const placa = { id, familia: FAMILIA, variante: 'placa-declarada', lado: null, giro: 0, posicao: [0, 0, 0], orientacao: { eixo: [0, 1, 0], angulo: 0 }, espessura, contorno: contorno.map((p) => p.map(limpo)) };
  return {
    passos,
    pecas: [placa, ...pecas.map(({ chamada, ...resto }) => resto)],
    furos: [
      ...furosDosTerminais.map((c) => ({ peca: c.peca, terminal: c.terminal, poligono: c.furo.map((p) => p.map(limpo)) })),
      ...fixacao.map((f, k) => ({ peca: id, terminal: null, fixacao: k, poligono: f.poligono.map((p) => p.map(limpo)) })),
    ],
    ilhas: ilhas.map((i) => ({ ...i, poligono: i.poligono.map((p) => p.map(limpo)) })),
    contatos, ilhasDaReceita, materiais,
  };
}
