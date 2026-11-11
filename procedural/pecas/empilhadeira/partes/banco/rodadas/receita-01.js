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
import { TABELA as CARCACA, apoiosDoPosto } from '../../carcaca/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';
import { derivar as derivarProtetor } from '../../protetor/receita.js';

export const TABELA = {
  /* A cor do rascunho: o escuro do estofado. */
  cores: { estofado: '#2a2d30' },

  /* O ASSENTO. A almofada de z -1.210 a -725 com o topo em 1.143, 500 mm de largura, os cantos de 40 mm de lado e de 60 em planta; a
     seção de frente com o fundo em 980 e cantos de 40. A planta e a seção vão 5 mm além da silhueta em z, e a planta de 960 a 1.150 em
     y, por fora da almofada (no rascunho ela começava em 990, acima da base nova na frente). */
  assento: {
    z: [-1210, -725], topo: 1143, meia: 250, cantoDeLado: 40, cantoEmPlanta: 60,
    topoDosCantos: { de: 1060, acimaDe: 1100 },
    secao: { fundo: 980, canto: 40, z: [-1215, -720] },
    planta: { y: [960, 1150] },
    /* A base: a face de cima da tampa do motor da carcaça, o mais alto dela de x -250 a 250, medido na malha a cada 1 mm de z por sonda
       vertical (2026-11-10) e simplificado a 0,3 mm (o desvio da reta para cima dela fica em 0,1 mm), com o nó de z -950 no ponto do
       apoio do banco da carcaça, mais a folga, que é também o afastamento da posição na montagem. */
    base: [[-1215, 1044.6], [-1207, 1041.1], [-1193, 1037.2], [-1167, 1032.8], [-1124, 1027.7], [-1056, 1021.5], [-950, 1012.9], [-832, 1003.2],
      [-787, 998.7], [-761, 995.3], [-747, 992.3], [-739, 989], [-734, 986.1], [-729, 982.2], [-725, 978.1], [-720, 972]],
    folga: 0.5,
  },

  /* O ENCOSTO: de lado, da linha 256 (px 649 a 682) à 186 (px 681 a 685) da lateral, a frente curva (px 641 na linha 226 e 662 na 196) e
     a costa quase reta (688 a 690); o pé sobre a almofada, de z -1.245 a -1.120 em y 1.135, e a costa até z -1.252 em 1.160. 480 mm de
     largura, os cantos de 60 na seção de trás, de y 1.110 a 1.510, cruzada de z -1.300 a -1.000. */
  encosto: {
    pe: { z: [-1245, -1120], y: 1135 },
    frente: [[649, 256], [641, 226], [645, 210], [662, 196], [675, 188]],
    costa: [[685, 188], [690, 200]],
    costaEm: { z: -1255, py: 240 },
    peDeTras: [-1252, 1160],
    meia: 240, secao: { y: [1110, 1510], canto: 60, z: [-1300, -1000] },
  },
};

const m = (mm) => mm / 1000;
/* o retângulo de cantos redondos, de raio r, com 6 segmentos por canto */
function arredondado(u0, v0, u1, v1, r) {
  const pts = [];
  for (const [cu, cv, a0] of [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]]) {
    for (let k = 0; k <= 6; k += 1) { const a = (a0 + 15 * k) * Math.PI / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  }
  return pts;
}

/** Os perfis e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const { ZL, YL } = derivarProtetor();
  const A = T.assento; const E = T.encosto;
  /* o assento de lado: a base sobre a tampa, de trás para a frente, e os dois cantos de cima */
  const base = A.base.map(([z, y]) => [z, y + A.folga]);
  const ladoAssento = [...base, ...arredondado(A.z[0], A.topoDosCantos.de, A.z[1], A.topo, A.cantoDeLado).filter(([, y]) => y > A.topoDosCantos.acimaDe)];
  const plantaAssento = arredondado(-A.meia, A.z[0], A.meia, A.z[1], A.cantoEmPlanta);
  const secaoAssento = arredondado(-A.meia, A.secao.fundo, A.meia, A.topo, A.secao.canto);
  /* o encosto de lado */
  const ladoEncosto = [[E.pe.z[0], E.pe.y], [E.pe.z[1], E.pe.y], ...E.frente.map(([z, y]) => [ZL(z), YL(y)]), ...E.costa.map(([z, y]) => [ZL(z), YL(y)]),
    [E.costaEm.z, YL(E.costaEm.py)], E.peDeTras];
  const secaoEncosto = arredondado(-E.meia, E.secao.y[0], E.meia, E.secao.y[1], E.secao.canto);
  const apoio = apoiosDoPosto(CARCACA).banco;
  const portas = {
    naTampaDoMotor: { forma: 'plano', papel: 'apoia', ponto: apoio.ponto.map((v, k) => v + apoio.normal[k] * A.folga), normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
  };
  return { ladoAssento, plantaAssento, secaoAssento, ladoEncosto, secaoEncosto, portas };
}

/** Monta o banco no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem do assento. */
export function montarBanco(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, extY, extZ, booleana, parte } = ferramentas(estado);
  const cruzar = (...s) => booleana('intersectar', s);
  const A = T.assento; const E = T.encosto;
  /* ASSENTO: a silhueta de lado extrudada em x, cruzada com a planta extrudada em y e com a seção de frente extrudada em z */
  const assento = cruzar(extX(D.ladoAssento, -A.meia, A.meia), extY(D.plantaAssento, A.planta.y[0], A.planta.y[1]), extZ(D.secaoAssento, A.secao.z[0], A.secao.z[1]));
  parte('assento', assento, T.cores.estofado);
  /* ENCOSTO: a silhueta de lado extrudada em x, cruzada com a seção de trás extrudada em z */
  const encosto = cruzar(extX(D.ladoEncosto, -E.meia, E.meia), extZ(D.secaoEncosto, E.secao.z[0], E.secao.z[1]));
  parte('encosto', encosto, T.cores.estofado);
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

export const CONTATOS = [
  { par: ['assento', 'encosto'], motivo: 'o pé do encosto, em y 1.135 de z -1.245 a -1.120, entra 8 mm na almofada, que tem o topo em 1.143' },
];

const receita = {
  meta: { nome: 'empilhadeira/banco', desc: 'banco do operador da empilhadeira: o assento e o encosto, sobre a tampa do motor' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'o banco do operador de uma empilhadeira de contrapeso de 2,5 t: o assento estofado e o encosto, numa peça rígida assentada na tampa do motor da carcaça',
    referencias: ['../../referencias/cima.ia.png', '../../referencias/tras.ia.png', '../../referencias/carcaca-lado.ia.png'],
    escala: { medida: 'largura do assento (vista de cima, linhas 232 a 365)', milimetros: 500 },
    partes: [
      { nome: 'assento', forma: 'a almofada escura de 500 mm de largura, de z -725 a -1.210, com o topo em 1.143, cantos de 40 mm de lado e de 60 em planta, e a base que segue a face de cima da tampa do motor', tecnica: 'silhueta lateral extrudada em x, cruzada com a planta extrudada em y e com a seção de frente extrudada em z' },
      { nome: 'encosto', forma: 'o encosto escuro de 480 mm, atrás da almofada e sobre ela, de 1.135 a 1.505 mm, com a frente curva e a costa quase reta, cantos de 60 na seção de trás', tecnica: 'silhueta lateral extrudada em x, cruzada com a seção de trás extrudada em z' },
    ],
    criteriosDeReprovacao: [
      'o banco solto da tampa do motor, ou entrando nela',
      'o encosto à frente da almofada, solto dela, ou cruzando as colunas de trás do protetor',
      'o banco fora do centro da largura, ou mais largo que a tampa do motor',
      'cor trocada: o estofado laranja ou cinza claro',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: o topo e a frente do assento e o topo do encosto. A base segue a tampa e fica com as vistas. */
  get PONTOS() {
    const T = this.PARAMS; const A = T.assento; const E = T.encosto; const { ladoEncosto } = derivar(T);
    return [
      { nome: 'assento, em cima, na frente e à esquerda', parte: 'assento', medida: 'maximo', em: [A.meia, A.topo, A.z[1]], toleranciaMm: 0.5 },
      { nome: 'encosto, em cima, na frente e à esquerda', parte: 'encosto', medida: 'maximo', em: [E.meia, Math.max(...ladoEncosto.map(([, y]) => y)), Math.max(...ladoEncosto.map(([z]) => z))], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
