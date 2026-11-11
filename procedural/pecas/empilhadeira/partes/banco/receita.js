/* empilhadeira/banco — o banco do operador da empilhadeira: o assento e o encosto, numa peça rígida sobre a tampa do motor.
 *
 * Etapa da montagem `../../montagem.json` depois do protetor (fatia 6 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`, item 6
 * das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida, com uma exceção: a base do assento. No rascunho
 * ela seguia uma reta tirada do contorno da lateral e entrava até 20 mm na tampa do motor; aqui ela segue a face de cima da tampa como a
 * malha da carcaça a tem, medida por sonda vertical, 0,5 mm acima dela. O rascunho passou a chamar `montarBanco` daqui, de modo que a
 * geometria tem uma fonte só.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho; as contas de cada número estão no cabeçalho dele). A lateral de `lateral.contornos.json` entra na
 * escala da carcaça pela calibração da TABELA do protetor (`ZL` e `YL`, em px da imagem dela). O assento vai de z -726 a -1.211 com o
 * topo em y 1.143 (região `banco` da lateral) e tem 500 mm de largura (vista de cima, linhas 232 a 365); o encosto, da linha 256 à 186
 * da lateral, com a frente curva e a costa quase reta, tem 480 mm.
 *
 * O ENCAIXE. A origem é a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem
 * dirige e a frente em +z. A montagem v5 não mede plano sobre plano: ela põe o banco pela porta `naTampaDoMotor` (o plano horizontal
 * da base do assento no nó do apoio, com a normal para baixo) na porta `apoioDoBanco` da carcaça, com o afastamento de 0,5 mm da folga,
 * e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarBanco` escreve os passos em mm num estado
 * { passos, topo, origem } (o mesmo que o rascunho da máquina usa); `gerarPassos` converte para metro com `m()`, campo de medida a campo
 * de medida, num lugar só. */
import { TABELA as CARCACA, apoiosDoPosto } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { derivar as derivarProtetor } from '../protetor/receita.js';
import { gaiolaPorLacos } from '../../../../nucleo/gaiola-por-lacos.js';

export const TABELA = {
  /* A cor do rascunho: o escuro do estofado. */
  cores: { estofado: '#2a2d30' },

  /* O ASSENTO. A almofada de z -1.210 a -725 com o topo em 1.143 e 500 mm de largura, uma gaiola de laços ao longo de z subdividida em
     dois níveis, que arredonda os cantos e as bordas de uma vez (no rascunho, três extrusões cruzadas, de cantos de 40 mm de lado e 60
     em planta, que deixavam quina com chanfro e vinco onde os arredondados se encontravam). Cada laço é o retângulo da seção, com
     pontos a 40 mm de cada canto e, em cima e embaixo, a cada 42 mm no máximo; os laços vão por igual, a 40 mm no máximo, com um laço
     no nó de z -950 da base, o do apoio. Onde a tampa faz bojo entre dois laços, a base deles sobe 1,5 vez o que a tampa passa da reta
     entre eles (`bojo`): sem isso a almofada subdividida entrava 2,6 mm na tampa no nariz, de z -775 a -745. */
  assento: {
    z: [-1210, -725], topo: 1143, meia: 250, canto: 40, passo: 40, passoNaLargura: 42, lacoNoApoio: -950, bojo: 1.5,
    /* A base: a face de cima da tampa do motor da carcaça, o mais alto dela de x -250 a 250, medido na malha a cada 1 mm de z por sonda
       vertical (2026-11-10) e simplificado a 0,3 mm (o desvio da reta para cima dela fica em 0,1 mm), com o nó de z -950 no ponto do
       apoio do banco da carcaça, mais a folga, que é também o afastamento da posição na montagem. */
    base: [[-1215, 1044.6], [-1207, 1041.1], [-1193, 1037.2], [-1167, 1032.8], [-1124, 1027.7], [-1056, 1021.5], [-950, 1012.9], [-832, 1003.2],
      [-787, 998.7], [-761, 995.3], [-747, 992.3], [-739, 989], [-734, 986.1], [-729, 982.2], [-725, 978.1], [-720, 972]],
    folga: 0.5,
  },

  /* O ENCOSTO: de lado, da linha 256 (px 649 a 682) à 186 (px 681 a 685) da lateral, a frente curva (px 641 na linha 226 e 662 na 196) e
     a costa quase reta (688 a 690); o pé sobre a almofada em y 1.135, e a costa até 1.160. 480 mm de largura. É uma gaiola de laços em
     x, cada laço a silhueta de lado, a 60 mm um do outro, com os das pontas encolhidos em volta do meio do pé (0,85 na face de lado e
     0,96 a 20 mm dela), subdividida em dois níveis: ela arredonda os cantos de cima e a quina da lateral com a frente (no rascunho, a silhueta extrudada cruzada com a seção de
     trás de cantos de 60, que deixava os cantos de cima em chanfro e a quina viva). A silhueta tem o pé com 6 trechos e a costa
     reamostrada com os pontos da frente, que a tampa da gaiola liga dois a dois. A frente e o canto de cima passam por uma curva (Catmull-Rom) pelos pontos da lateral, com 8 trechos
     entre cada dois: no rascunho eram seis retas. O encosto inteiro vem 45 mm para a frente do rascunho (o pé de z -1.245 a -1.120 passa
     a -1.200 a -1.075), para o pé assentar na almofada, que acaba em -1.210 com o canto redondo: no rascunho um terço dele ficava em
     balanço atrás dela. */
  encosto: {
    pe: { z: [-1245, -1120], y: 1135 },
    frente: [[649, 256], [641, 226], [645, 210], [662, 196], [675, 188]],
    costa: [[685, 188], [690, 200]],
    costaEm: { z: -1255, py: 240 },
    peDeTras: [-1252, 1160],
    meia: 240, passoEmX: 60, trechosDoPe: 6,
    /* as pontas da gaiola: [distância da face de lado, escala da silhueta] */
    pontas: [[0, 0.85], [20, 0.96], [60, 1]],
    trechosDaCurva: 8,
    avanco: 45,
  },
};

const m = (mm) => mm / 1000;
/* a curva Catmull-Rom uniforme pelos pontos, com n trechos entre cada dois, das pontas repetidas */
function curva(pts, n) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const saida = [pts[0]];
  for (let i = 1; i < P.length - 2; i += 1) {
    for (let k = 1; k <= n; k += 1) {
      const t = k / n; const t2 = t * t; const t3 = t2 * t;
      saida.push([0, 1].map((e) => 0.5 * (2 * P[i][e] + (-P[i - 1][e] + P[i + 1][e]) * t + (2 * P[i - 1][e] - 5 * P[i][e] + 4 * P[i + 1][e] - P[i + 2][e]) * t2
        + (-P[i - 1][e] + 3 * P[i][e] - 3 * P[i + 1][e] + P[i + 2][e]) * t3)));
    }
  }
  return saida;
}
const interpolar = (tabela, v) => {
  const t = [...tabela].sort((a, b) => a[0] - b[0]);
  if (v <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i += 1) if (v <= t[i][0]) return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * (v - t[i - 1][0]) / (t[i][0] - t[i - 1][0]);
  return t[t.length - 1][1];
};

/** Os laços do assento, os perfis do encosto e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const { ZL, YL } = derivarProtetor();
  const A = T.assento; const E = T.encosto; const c = A.canto;
  /* o assento: os laços em z, cada um o retângulo da seção com a base sobre a tampa */
  const base = A.base.map(([z, y]) => [z, y + A.folga]);
  const [z0, z1] = A.z;
  const marcos = [z0, A.lacoNoApoio, z1];
  const em = [];
  marcos.forEach((z, i) => {
    if (i > 0) { const de = marcos[i - 1]; const n = Math.ceil((z - de) / A.passo); for (let k = 1; k < n; k += 1) em.push(de + (z - de) * k / n); }
    em.push(z);
  });
  /* a base de cada laço: a da tampa no plano dele e, onde a tampa faz bojo entre dois laços (o nariz, de z -800 a -725), erguida o
     tanto que ela passa acima da reta entre os dois, vezes o fator, para a superfície subdividida não descer nela */
  const ybs = em.map((z) => interpolar(base, z));
  for (let i = 1; i < em.length; i += 1) {
    let d = 0;
    for (let z = em[i - 1]; z <= em[i]; z += 1) d = Math.max(d, interpolar(base, z) - (ybs[i - 1] + (ybs[i] - ybs[i - 1]) * (z - em[i - 1]) / (em[i] - em[i - 1])));
    if (d > 0) { ybs[i - 1] += d * A.bojo; ybs[i] += d * A.bojo; }
  }
  const w = A.meia; const yt = A.topo;
  const nl = Math.ceil(2 * (w - c) / A.passoNaLargura);
  const xs = [w, ...Array.from({ length: nl + 1 }, (_, k) => (w - c) - 2 * (w - c) * k / nl), -w];
  const lacos = em.map((z, i) => {
    const yb = ybs[i];
    return { em: z, trechos: {
      dir: [[w, yb], [w, yb + c], [w, yt - c], [w, yt]],
      topo: xs.map((x) => [x, yt]),
      esq: [[-w, yt], [-w, yt - c], [-w, yb + c], [-w, yb]],
      baixo: [...xs].reverse().map((x) => [x, yb]),
    } };
  });
  /* o encosto de lado, 45 mm à frente do rascunho, com a frente e o canto de cima em curva */
  const av = (p) => [p[0] + E.avanco, p[1]];
  const daFrente = curva([[E.pe.z[1], E.pe.y], ...E.frente.map(([z, y]) => [ZL(z), YL(y)]), ...E.costa.map(([z, y]) => [ZL(z), YL(y)])], E.trechosDaCurva);
  const ladoEncosto = [[E.pe.z[0], E.pe.y], ...daFrente, [E.costaEm.z, YL(E.costaEm.py)], E.peDeTras].map(av);
  /* os trechos da silhueta: o pé (de trás para a frente), a frente (até o último ponto da frente), o topo (até o primeiro da costa) e a
     costa (até o pé de trás), reamostrada por comprimento com o mesmo número de pontos da frente */
  const nFrente = (E.frente.length) * E.trechosDaCurva + 1;
  const sil = daFrente.map(av);
  const frente = sil.slice(0, nFrente);
  const topo = sil.slice(nFrente - 1, nFrente + E.trechosDaCurva);
  const costaBruta = [...sil.slice(nFrente - 1 + E.trechosDaCurva), av([E.costaEm.z, YL(E.costaEm.py)]), av(E.peDeTras), av([E.pe.z[0], E.pe.y])];
  const acum = [0]; for (let i = 1; i < costaBruta.length; i += 1) acum.push(acum[i - 1] + Math.hypot(costaBruta[i][0] - costaBruta[i - 1][0], costaBruta[i][1] - costaBruta[i - 1][1]));
  const costa = Array.from({ length: nFrente }, (_, k) => {
    const d = acum[acum.length - 1] * k / (nFrente - 1); let i = 1; while (i < acum.length - 1 && acum[i] < d) i += 1;
    const t = (d - acum[i - 1]) / (acum[i] - acum[i - 1]); return [0, 1].map((e) => costaBruta[i - 1][e] + (costaBruta[i][e] - costaBruta[i - 1][e]) * t);
  });
  const peA = av([E.pe.z[0], E.pe.y]); const peB = av([E.pe.z[1], E.pe.y]);
  const pe = Array.from({ length: E.trechosDoPe + 1 }, (_, k) => [peA[0] + (peB[0] - peA[0]) * k / E.trechosDoPe, E.pe.y]);
  /* os laços em x: nas pontas, a silhueta encolhida em volta do meio do pé (`pontas`, a distância da ponta e a escala), que dá aos cantos
     de cima e às quinas da lateral o arredondado largo; no meio, a cada `passoEmX` */
  const todos = [...pe, ...frente, ...topo, ...costa];
  const zc = (Math.min(...todos.map(([z]) => z)) + Math.max(...todos.map(([z]) => z))) / 2;
  const encolhe = (pts, k) => pts.map(([z, y]) => [zc + (z - zc) * k, E.pe.y + (y - E.pe.y) * k]);
  const yz = (pts) => pts.map(([z, y]) => [y, z]);
  const escalaEm = (x) => { const d = E.meia - Math.abs(x); const p = E.pontas.find(([dp]) => Math.abs(dp - d) < 1e-9); return p ? p[1] : 1; };
  const xsEncosto = [...E.pontas.map(([d]) => -E.meia + d), ...Array.from({ length: Math.floor((E.meia - E.pontas.at(-1)[0]) / E.passoEmX) }, (_, k) => -E.meia + E.pontas.at(-1)[0] + E.passoEmX * (k + 1))]
    .filter((x) => x < 0);
  const emX = [...xsEncosto, 0, ...[...xsEncosto].reverse().map((x) => -x)];
  const lacosEncosto = emX.map((x) => { const k = escalaEm(x); return { em: x, trechos: { pe: yz(encolhe(pe, k)), frente: yz(encolhe(frente, k)), topo: yz(encolhe(topo, k)), costa: yz(encolhe(costa, k)) } }; });
  const apoio = apoiosDoPosto(CARCACA).banco;
  const portas = {
    naTampaDoMotor: { forma: 'plano', papel: 'apoia', ponto: apoio.ponto.map((v, k) => v + apoio.normal[k] * A.folga), normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
  };
  return { lacos, ladoEncosto, lacosEncosto, portas };
}

/** Monta o banco no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem do assento. */
export function montarBanco(estado, T = TABELA) {
  const D = derivar(T);
  const { parte } = ferramentas(estado);
  /* ASSENTO: a gaiola de laços em z, tampada nas pontas, subdividida em dois níveis */
  const g = gaiolaPorLacos({ nome: 'assento', eixo: 'z', tampa: { de: 'dir', ate: 'esq' },
    trechos: [{ nome: 'dir', pontos: 4 }, { nome: 'topo', pontos: D.lacos[0].trechos.topo.length }, { nome: 'esq', pontos: 4 }, { nome: 'baixo', pontos: D.lacos[0].trechos.baixo.length }], lacos: D.lacos });
  Object.assign(estado.topo, g.pontosMm);
  estado.origem += 1;
  estado.passos.push(['subdivisao', { origemId: estado.origem, ...g.passo, niveis: 2 }]);
  const assento = { origem: { op: 'subdivisao', id: estado.origem } };
  parte('assento', assento, T.cores.estofado);
  /* ENCOSTO: a gaiola de laços em x, cada um a silhueta de lado, tampada nas pontas, subdividida em dois níveis */
  const L0 = D.lacosEncosto[0].trechos;
  const ge = gaiolaPorLacos({ nome: 'encosto', eixo: 'x', tampa: { de: 'pe', ate: 'topo' },
    trechos: [{ nome: 'pe', pontos: L0.pe.length }, { nome: 'frente', pontos: L0.frente.length }, { nome: 'topo', pontos: L0.topo.length }, { nome: 'costa', pontos: L0.costa.length }], lacos: D.lacosEncosto });
  Object.assign(estado.topo, ge.pontosMm);
  estado.origem += 1;
  estado.passos.push(['subdivisao', { origemId: estado.origem, ...ge.passo, niveis: 2 }]);
  parte('encosto', { origem: { op: 'subdivisao', id: estado.origem } }, T.cores.estofado);
  return { assento };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do apoio. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { assento } = montarBanco(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('naTampaDoMotor', assento)];
}

/** Os pontos nomeados da gaiola do assento, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarBanco(estado, T);
  return Object.fromEntries(Object.entries(estado.topo).map(([nome, p]) => [nome, p.map(m)]));
}

export const CONTATOS = [
  { par: ['assento', 'encosto'], motivo: 'o pé do encosto, em y 1.135 de z -1.200 a -1.075, entra 8 mm na almofada, que tem o topo em 1.143' },
];

const receita = {
  meta: { nome: 'empilhadeira/banco', desc: 'banco do operador da empilhadeira: o assento e o encosto, sobre a tampa do motor' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'o banco do operador de uma empilhadeira de contrapeso de 2,5 t: o assento estofado e o encosto, numa peça rígida assentada na tampa do motor da carcaça',
    referencias: ['../../referencias/cima.ia.png', '../../referencias/tras.ia.png', '../../referencias/carcaca-lado.ia.png'],
    escala: { medida: 'largura do assento (vista de cima, linhas 232 a 365)', milimetros: 500 },
    partes: [
      { nome: 'assento', forma: 'a almofada escura de 500 mm de largura, de z -725 a -1.210, com o topo em 1.143, cantos e bordas arredondados como estofado, e a base que segue a face de cima da tampa do motor', tecnica: 'gaiola de laços em z (gaiolaPorLacos), tampada nas pontas, subdividida em dois níveis' },
      { nome: 'encosto', forma: 'o encosto escuro de 480 mm, com o pé assentado na almofada, de 1.135 a 1.500 mm, com a frente em curva contínua, a costa quase reta e os cantos e a quina da lateral arredondados', tecnica: 'gaiola de laços em x (gaiolaPorLacos), cada laço a silhueta de lado com a frente em curva Catmull-Rom, tampada nas pontas, subdividida em dois níveis' },
    ],
    criteriosDeReprovacao: [
      'o banco solto da tampa do motor, ou entrando nela',
      'o encosto à frente da almofada, solto dela, ou cruzando as colunas de trás do protetor',
      'o banco fora do centro da largura, ou mais largo que a tampa do motor',
      'cor trocada: o estofado laranja ou cinza claro',
      'a almofada com quina ou chanfro nos cantos, ou a frente do encosto em polígono',
    ],
    lataria: { partes: ['assento', 'encosto'] },
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: o topo e a frente do assento e o topo do encosto. A base segue a tampa e fica com as vistas. */
  get PONTOS() {
    const T = this.PARAMS; const A = T.assento; const E = T.encosto; const { ladoEncosto } = derivar(T);
    return [
      /* a subdivisão encolhe a tampa da frente da gaiola 1,2 mm em z; o topo e o lado são planos e ficam onde estão */
      { nome: 'assento, em cima, na frente e à esquerda', parte: 'assento', medida: 'maximo', em: [A.meia, A.topo, A.z[1]], toleranciaMm: 1.5 },
      /* a subdivisão encolhe a tampa da ponta da gaiola do encosto 1,5 mm em x */
      { nome: 'encosto, em cima, na frente e à esquerda', parte: 'encosto', medida: 'maximo', em: [E.meia, Math.max(...ladoEncosto.map(([, y]) => y)), Math.max(...ladoEncosto.map(([z]) => z))], toleranciaMm: 2 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
