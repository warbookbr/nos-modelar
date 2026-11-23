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

   A pose da placa na peça hospedeira é opção da declaração (`pose: { rotacoes: [{ eixo, graus }], posicao: [x, y, z] }`, em
   graus e mm): as rotações, em ordem, em torno dos eixos da peça e da origem dela pela regra da mão direita do núcleo, e depois a
   translação levam a placa inteira, com os componentes, do referencial dela ao da peça. Com pose, a posição e a orientação
   publicadas de cada peça são as do referencial da peça hospedeira (o que a ficha cita), e as do referencial da placa ficam em
   `naPlaca`; os furos, as ilhas e os terminais continuam no plano da placa. Sem pose nada muda.

   Recusa antes de gerar passo, com `ErroFamilia` (campo, valor e o aceito): id inválido ou repetido, tipo ou lado
   desconhecido, posição ou giro que não é número, furo ou ilha fora do contorno ou perto da borda, e duas ilhas, ou ilha e furo
   de fixação, mais perto que a folga, citando os dois componentes e os terminais. */
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';
import { ErroFamilia } from '../../../src/autoria/familia.js';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { ENCAPSULAMENTOS, idDoComponente, varianteDe } from './composicoes.js';
import { COMPONENTE_ELETRONICO, comMateriais } from './index.js';
import { alturaDoAssento, terminaisDoComponente } from './terminais.js';
import { pecasDoTracado, uniaoDePoligonos } from './cobre/geometria.js';
import { conferirCobre } from './cobre/conferir.js';
import { chaveDasEntradas } from './cobre/chave.js';

/* As regras do cobre traçado (plano das trilhas, 2026-11-23), também estimativa de fabricação comum de placa de duas faces: a
   trilha mínima de 0,15 mm e a padrão de 0,25 mm, a via com furo de 0,3 mm e anel de 0,15 mm (0,6 mm de diâmetro), a capacidade
   de 6/6 mil que os fabricantes de protótipo oferecem como padrão e a IPC-2221 aceita para nível B. A distância entre cobres e
   até a borda é a `folga` e a `borda` de cima, a mesma das ilhas. A largura e a distância de uma rede no pedido valem acima
   destas, nunca abaixo. */
export const PLACA = Object.freeze({
  espessura: 1.6, cobre: 0.035, folgaDoFuro: 0.25, anel: 0.4, ilhaDeSuperficie: Object.freeze({ largura: 0.2, comprimento: 0.6 }),
  folga: 0.15, borda: 0.3, alongado: 2.5, ladosDoFuro: 12,
  trilhaMinima: 0.15, trilhaPadrao: 0.25, via: Object.freeze({ furo: 0.3, anel: 0.15 }),
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
/* A PLACA EM FAIXAS. A tampa de uma extrusão com furos sai do núcleo em pedaços convexos fundidos dois a dois, e a fusão recomeça
   do primeiro par a cada fusão: o custo cresce com o cubo dos triângulos da tampa. A placa de controle do braço, com 189 furos,
   levava 34 s numa só camada (medido em 2026-11-17), e a placa tem três (o laminado e o cobre das duas faces). Com mais de
   `FUROS_SEM_FAIXA` furos numa camada, o contorno convexo é cortado em faixas de até `FUROS_POR_FAIXA` furos por retas de x
   constante que passam entre os furos, e cada faixa é uma extrusão com os furos dela: as faixas encostam face a face, no mesmo material e na mesma parte, como
   a ilha encosta na camada de cobre. Contorno côncavo, ou furos sem vão entre eles, fica numa extrusão só. */
const FUROS_SEM_FAIXA = 96;
const FUROS_POR_FAIXA = 24;
const VAO_DO_CORTE = 0.2;
function convexoNoPlano(p) {
  let sinal = 0;
  for (let k = 0; k < p.length; k += 1) {
    const [a, b, c] = [p[k], p[(k + 1) % p.length], p[(k + 2) % p.length]];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-12) continue;
    if (sinal && Math.sign(z) !== sinal) return false;
    sinal = Math.sign(z);
  }
  return true;
}
/* o polígono convexo `p` recortado ao semiplano x >= corte (lado = 1) ou x <= corte (lado = -1) */
function recortar(p, corte, lado) {
  const dentro = ([x]) => lado * (x - corte) >= 0;
  const saida = [];
  p.forEach((a, k) => {
    const b = p[(k + 1) % p.length];
    if (dentro(a)) saida.push(a);
    if (dentro(a) !== dentro(b)) {
      const t = (corte - a[0]) / (b[0] - a[0]);
      saida.push([corte, a[1] + t * (b[1] - a[1])]);
    }
  });
  return saida.filter((q, k) => Math.hypot(q[0] - saida[(k + 1) % saida.length][0], q[1] - saida[(k + 1) % saida.length][1]) > 1e-9);
}
function faixasDaCamada(contorno, furos) {
  if (furos.length <= FUROS_SEM_FAIXA || !convexoNoPlano(contorno)) return [{ contorno, furos }];
  const faixa = furos.map((f) => ({ f, min: Math.min(...f.map((q) => q[0])), max: Math.max(...f.map((q) => q[0])) })).sort((a, b) => a.min - b.min || a.max - b.max);
  /* os cortes possíveis: o meio de cada vão de x em que nenhum furo passa */
  const cortes = [];
  let alcance = faixa[0].max;
  for (let k = 1; k < faixa.length; k += 1) {
    if (faixa[k].min - alcance >= VAO_DO_CORTE) cortes.push({ x: (faixa[k].min + alcance) / 2, antes: k });
    alcance = Math.max(alcance, faixa[k].max);
  }
  /* a cada faixa, o último corte que ainda deixa nela no máximo FUROS_POR_FAIXA furos (ou o primeiro, se nenhum deixa) */
  const escolhidos = [];
  let inicio = 0;
  while (faixa.length - inicio > FUROS_POR_FAIXA) {
    const cabem = cortes.filter((c) => c.antes > inicio && c.antes - inicio <= FUROS_POR_FAIXA);
    const corte = cabem.at(-1) ?? cortes.find((c) => c.antes > inicio);
    if (!corte) break;
    escolhidos.push(corte);
    inicio = corte.antes;
  }
  if (!escolhidos.length) return [{ contorno, furos }];
  const limites = [-Infinity, ...escolhidos.map((c) => c.x), Infinity];
  return limites.slice(0, -1).map((x0, k) => {
    const x1 = limites[k + 1];
    let p = contorno;
    if (Number.isFinite(x0)) p = recortar(p, x0, 1);
    if (Number.isFinite(x1)) p = recortar(p, x1, -1);
    return { contorno: p, furos: faixa.filter((f) => f.min > x0 && f.max < x1).map((f) => f.f) };
  });
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
const produto = (a, b) => a.map((linha) => [0, 1, 2].map((j) => linha.reduce((soma, v, k) => soma + v * b[k][j], 0)));
const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/* a matriz de uma rotação do núcleo (`rotaciona`), pela regra da mão direita: x +90 leva +y a +z, y +90 leva +x a -z, z +90 leva
   +y a -x */
function matrizDaRotacao(eixo, graus) {
  const t = (graus * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  if (eixo === 'x') return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (eixo === 'y') return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/* a pose da placa na peça hospedeira: a lista de rotações, aplicadas em ordem, e a posição da origem da placa, em mm */
/* o cobre traçado declarado: `{ tracado, redes }`, com o traçado salvo (formato em `cobre/geometria.js`) e a lista de redes do
   item `ligacoes` do pedido; cada campo malformado é recusado com o caminho e o que é aceito */
const FACES_DO_COBRE = new Set(['cima', 'baixo']);
const ID_DE_REDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const par = (v) => Array.isArray(v) && v.length === 2 && v.every(numero);
function lerCobre(cobre) {
  if (!cobre || typeof cobre !== 'object' || !cobre.tracado || !Array.isArray(cobre.redes)) recusar('placa.cobre', cobre, '{ tracado, redes }: o traçado salvo e a lista de redes');
  const { tracado, redes } = cobre;
  if (tracado.versao !== 1 || !Array.isArray(tracado.redes)) recusar('placa.cobre.tracado', tracado.versao, 'o traçado salvo na versão 1, com a lista de redes');
  tracado.redes.forEach((r, k) => {
    const onde = `placa.cobre.tracado.redes[${k}]`;
    if (!ID_DE_REDE.test(r?.id ?? '')) recusar(`${onde}.id`, r?.id, 'id de rede em minúsculas, dígitos e hífen');
    if (!Array.isArray(r.trechos)) recusar(`${onde}.trechos`, r.trechos, 'lista de trechos');
    r.trechos.forEach((t, j) => {
      if (!FACES_DO_COBRE.has(t?.face)) recusar(`${onde}.trechos[${j}].face`, t?.face, "'cima' ou 'baixo'");
      if (!numero(t.largura) || t.largura <= 0) recusar(`${onde}.trechos[${j}].largura`, t.largura, 'largura em mm maior que zero');
      if (!Array.isArray(t.pontos) || t.pontos.length < 2 || !t.pontos.every(par)) recusar(`${onde}.trechos[${j}].pontos`, t.pontos, 'dois pontos [x, z] em mm ou mais');
    });
    (r.vias ?? []).forEach((v, j) => {
      if (!par(v?.centro) || !numero(v.furo) || v.furo <= 0 || !numero(v.anel) || v.anel <= 0) recusar(`${onde}.vias[${j}]`, v, '{ centro: [x, z], furo, anel } em mm, furo e anel maiores que zero');
    });
  });
  redes.forEach((r, k) => {
    if (!ID_DE_REDE.test(r?.id ?? '') || !Array.isArray(r.terminais) || r.terminais.length < 2) recusar(`placa.cobre.redes[${k}]`, r?.id, '{ id, terminais: [{ peca, porta }, ...] } com dois terminais ou mais');
  });
  return { tracado, redes };
}

function lerPose(pose) {
  if (pose === undefined) return null;
  const aceito = '{ rotacoes?: [{ eixo: \'x\' | \'y\' | \'z\', graus }], posicao: [x, y, z] } em graus e mm, no referencial da peça hospedeira';
  if (!pose || typeof pose !== 'object' || Array.isArray(pose)) recusar('placa.pose', pose, aceito);
  const { rotacoes = [], posicao } = pose;
  if (!Array.isArray(posicao) || posicao.length !== 3 || !posicao.every(numero)) recusar('placa.pose.posicao', posicao, 'o ponto [x, y, z] em mm onde fica a origem da placa (o centro da face de cima)');
  if (!Array.isArray(rotacoes)) recusar('placa.pose.rotacoes', rotacoes, aceito);
  rotacoes.forEach((r, k) => {
    if (!r || !['x', 'y', 'z'].includes(r.eixo) || !numero(r.graus)) recusar(`placa.pose.rotacoes[${k}]`, r, "{ eixo: 'x' | 'y' | 'z', graus }, pela regra da mão direita do núcleo");
  });
  const matriz = rotacoes.reduce((m, r) => produto(matrizDaRotacao(r.eixo, r.graus), m), IDENTIDADE);
  return { rotacoes: rotacoes.map(({ eixo, graus }) => ({ eixo, graus })), posicao: [...posicao], matriz };
}

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
 * encostaEm?: [{ peca, motivo }] }], materiais?: { placa = 'placa', ilha = 'ilha' }, pai?, pose?: { rotacoes?: [{ eixo, graus }],
 * posicao: [x, y, z] } }`, em mm e graus; `opcoes.base` soma
 * um valor aos ids de origem, para a placa entrar numa receita que já tem os dela. Devolve `{ passos, pecas, furos, ilhas,
 * contatos, ilhasDaReceita, materiais }`: `pecas` traz a placa e cada componente com família, variante, posição (mm), orientação
 * e terminais, nos nomes de campo da ficha da ponte (com pose, posição e orientação no referencial da peça hospedeira, e as da
 * placa em `naPlaca`); `pose`, quando declarada, a da placa; `contatos` e `ilhasDaReceita` vão para `contatos` e `ilhas` da receita;
 * `materiais`, os nomes que a receita precisa declarar em `MATERIAIS`; `partesDoPlano`, a entrada { nome, forma, tecnica } de cada
 * parte para o `PLANO.partes` da receita.
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
  const pose = lerPose(declaracao.pose);

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

  /* O COBRE TRAÇADO. Com `cobre: { tracado, redes }`, a placa confere o traçado contra as redes e as regras antes de gerar, e o
     cobre de cada face passa a ser a união das ilhas, das trilhas e dos anéis das vias: cada pedaço unido é uma extrusão com os
     furos dos terminais e das vias que caem nele, e a camada da face abre onde ele está. Sem `cobre`, nada muda. */
  const cobreTracado = declaracao.cobre === undefined ? null : lerCobre(declaracao.cobre);
  /* o traçado que o traçador escreveu leva a chave das entradas; a que não bate é de outra placa, outra lista ou outra regra */
  if (cobreTracado?.tracado.chave !== undefined && cobreTracado.tracado.chave !== chaveDasEntradas(declaracao, cobreTracado.redes, P)) {
    recusar('placa.cobre.tracado.chave', cobreTracado.tracado.chave, 'a chave das entradas de agora: a placa, a lista de redes ou as regras mudaram depois do traçado; trace de novo com tools/modelar/tracar-placa.mjs');
  }
  let regioes = null; let furosDasVias = [];
  if (cobreTracado) {
    const pecasDoCobre = pecasDoTracado(cobreTracado.tracado);
    const atravessam = new Set(cobre.filter((c) => c.furo).map((c) => `${c.peca}.${c.terminal}`));
    const conferencia = conferirCobre({ contorno, ilhas: ilhas.map((i) => ({ ...i, atravessa: atravessam.has(`${i.peca}.${i.terminal}`) })), pecas: pecasDoCobre, lista: cobreTracado.redes, regras: P });
    if (conferencia.violacoes.length) {
      const v = conferencia.violacoes[0];
      recusar(`placa.cobre (${v.regra})`, v.ponto ?? v.terminais, `${v.mensagem}${conferencia.violacoes.length > 1 ? `; e mais ${conferencia.violacoes.length - 1} violação(ões)` : ''}`);
    }
    furosDasVias = pecasDoCobre.filter((q) => q.tipo === 'via' && q.face === 'cima').map((q) => q.furo);
    const furosDoCobre = [...cobre.filter((c) => c.furo).map((c) => c.furo), ...furosDasVias];
    regioes = LADOS.flatMap((face) => uniaoDePoligonos([
      ...ilhas.filter((i) => i.face === face).map((i) => i.poligono),
      ...pecasDoCobre.filter((q) => q.face === face).map((q) => q.poligono),
    ]).map((r, k) => {
      if (r.furos.length) recusar(`placa.cobre.tracado`, `face de ${face}, pedaço ${k}`, 'um traçado em que nenhum cobre cerca uma ilha de laminado; a extrusão não faz o cobre em anel em volta do laminado');
      return { face, externo: r.externo, furos: furosDoCobre.filter((f) => dentroDoPoligono(f[0], r.externo)) };
    }));
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
  /* cada camada numa extrusão, ou em faixas quando tem furos demais; a primeira faixa fica com o id de sempre (base + 1, + 2 e + 3)
     e as outras vêm de base + 100, três por faixa */
  const doCobreDaFace = (face) => (regioes ? regioes.filter((r) => r.face === face).map((r) => r.externo) : ilhas.filter((i) => i.face === face).map((i) => i.poligono));
  const camadas = [
    { furos: [...furosDosTerminais.map((c) => c.furo), ...furosDasVias, ...fixacao.map((f) => f.poligono)], altura: espessura - 2 * P.cobre, y: -espessura + P.cobre },
    ...LADOS.map((face) => ({ furos: [...doCobreDaFace(face), ...fixacao.map((f) => f.poligono)], altura: P.cobre, y: face === 'cima' ? -P.cobre : -espessura })),
  ];
  camadas.forEach((camada, k) => faixasDaCamada(contorno, camada.furos).forEach((faixa, j) => elemento('extrusao', j === 0 ? base + 1 + k : base + 100 + 3 * (j - 1) + k, {
    perfil: m2(faixa.contorno), furos: faixa.furos.map(m2),
    altura: metro(camada.altura), em: [0, metro(camada.y), 0],
  }, nomes.placa)));
  const baseDasIlhas = base + 1000 * (pecas.length + 1);
  if (regioes) {
    regioes.forEach((r, k) => elemento('extrusao', baseDasIlhas + k, {
      perfil: m2(r.externo), ...(r.furos.length ? { furos: r.furos.map(m2) } : {}), altura: metro(P.cobre), em: [0, metro(r.face === 'cima' ? -P.cobre : -espessura), 0],
    }, nomes.ilha));
  } else ilhas.forEach((ilha, k) => {
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
  /* a pose na peça hospedeira, parte por parte (a placa e cada componente), depois de cada uma estar no lugar dela na placa */
  if (pose) {
    for (const nome of [id, ...pecas.map((p) => p.id)]) {
      const sel = { grupo: nome };
      for (const { eixo, graus } of pose.rotacoes) if (graus) passos.push(['rotaciona', { eixo, graus, pivo: [0, 0, 0], sel }]);
      if (pose.posicao.some((v) => v !== 0)) passos.push(['transladar', { d: pose.posicao.map(metro), sel }]);
    }
  }

  const materiais = [...new Set([nomes.placa, nomes.ilha, ...pecas.flatMap((p) => Object.entries(p.chamada.argumentos).filter(([n]) => n.startsWith('material')).map(([, v]) => v))])].sort();
  const placa = { id, familia: FAMILIA, variante: 'placa-declarada', lado: null, giro: 0, posicao: [0, 0, 0], orientacao: { eixo: [0, 1, 0], angulo: 0 }, espessura, contorno: contorno.map((p) => p.map(limpo)) };
  /* com pose, a posição e a orientação de cada peça passam ao referencial da peça hospedeira, e as da placa ficam em naPlaca */
  const naPeca = (p, matriz) => {
    if (!pose) return p;
    const posicao = aplicar(pose.matriz, p.posicao).map((v, k) => limpo(v + pose.posicao[k]));
    return { ...p, posicao, orientacao: eixoEAngulo(produto(pose.matriz, matriz)), naPlaca: { posicao: p.posicao, orientacao: p.orientacao } };
  };
  const matrizes = new Map(lidas.map((l) => [l.id, matrizDaPose(l.giro, l.lado)]));
  /* a entrada de cada parte no PLANO da receita hospedeira, que precisa prometer cada parte que a peça entrega */
  const [largura, profundidade] = [0, 1].map((k) => Math.max(...contorno.map((p) => p[k])) - Math.min(...contorno.map((p) => p[k])));
  const partesDoPlano = [
    {
      nome: id,
      forma: `placa de circuito de ${limpo(largura)} por ${limpo(profundidade)} mm e ${espessura} mm de espessura, com ${fixacao.length} furo(s) de fixação, ${furosDosTerminais.length} furo(s) de terminal e as ilhas de cobre das duas faces`,
      tecnica: 'placa declarada da família componente-eletronico: o laminado e o cobre por extrusão furada',
    },
    ...pecas.map((p) => ({
      nome: p.id,
      forma: `${p.nome ? `${p.nome}: ` : ''}${p.tipo} (${p.variante}) na face de ${p.lado} da placa ${id}, em [${p.posicao[0]}, ${p.posicao[2]}] mm, com giro de ${p.giro} graus`.slice(0, 240),
      tecnica: 'chamada da família componente-eletronico, posta pela placa declarada',
    })),
  ];
  return {
    passos,
    ...(pose ? { pose: { rotacoes: pose.rotacoes, posicao: pose.posicao.map(limpo), orientacao: eixoEAngulo(pose.matriz) } } : {}),
    pecas: [naPeca(placa, IDENTIDADE), ...pecas.map(({ chamada, ...resto }) => naPeca(resto, matrizes.get(resto.id)))],
    furos: [
      ...furosDosTerminais.map((c) => ({ peca: c.peca, terminal: c.terminal, poligono: c.furo.map((p) => p.map(limpo)) })),
      ...fixacao.map((f, k) => ({ peca: id, terminal: null, fixacao: k, poligono: f.poligono.map((p) => p.map(limpo)) })),
    ],
    ilhas: ilhas.map((i) => ({ ...i, poligono: i.poligono.map((p) => p.map(limpo)) })),
    contatos, ilhasDaReceita, materiais, partesDoPlano,
  };
}
