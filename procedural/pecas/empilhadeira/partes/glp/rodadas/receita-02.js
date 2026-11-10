/* empilhadeira/glp — o cilindro de GLP da empilhadeira, deitado de través sobre a tampa do capô, com o berço e as duas cintas, numa
 * peça rígida sobre o contrapeso.
 *
 * Etapa da montagem `../../montagem.json` depois do volante (fatia 7 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`, item 7
 * das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida, com duas exceções: os círculos com 96 lados (no
 * rascunho, 48 e 24), e a chapa do berço, que no rascunho era reta de 1.146 a 1.162 e entrava 3,5 mm na tampa do capô; aqui ela segue a
 * face de cima da tampa como a malha da carcaça a tem, de lado, 0,5 mm acima dela, com os mesmos 16 mm de espessura. O berço tomba para
 * trás no alinhamento; a montagem v5 não tem articulação entre instâncias, e ele fica na pose de transporte. O rascunho chama
 * `montarGlp` daqui.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). O cilindro: de trás, cinza claro das colunas 450 a 618 (675 mm) e das linhas 190 a 270 (320
 * mm); de cima, das colunas 820 a 900 (324 mm de diâmetro, centro em z -1.841) e das linhas 185 a 375 (731 mm, centro em x -69, com a
 * válvula do lado -x); de lado (região `cilindro`), centro em y 1.359. A ficha dá Ø 320 x 700. Adotado: Ø 320, 700 do fim da cúpula ao
 * fim da válvula, centro em z -1.840, y 1.345 e x 30, com a cúpula do lado da válvula mais larga. As cintas: de trás, as faixas escuras
 * nas colunas 497 a 510 e 553 a 565; duas de 40 mm, a 120 mm do meio, só pela metade de cima.
 *
 * O ENCAIXE. A origem é a da máquina. A montagem põe o GLP pela porta `naTampa` (o plano horizontal da base da chapa no nó do apoio, com
 * a normal para baixo) na porta `apoioDoGlp` da carcaça, com o afastamento de 0,5 mm da folga, e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarGlp` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA, apoiosDoPosto } from '../../carcaca/receita.js';
import { ferramentas, interpolar } from '../../carcaca/receita/ferramentas.js';

export const TABELA = {
  /* As cores do rascunho: o cinza claro do cilindro (vistas de cima e de trás), o escuro das cintas e o cinza do berço. */
  cores: { gas: '#b4b8ba', cinta: CARCACA.cores.escuro, berco: CARCACA.cores.cinza },
  /* Lados dos círculos. */
  lados: 96,

  /* O CILINDRO: uma revolução em x pelo centro em x 30, com o corpo de raio 160 de -290 a +280 (a partir do centro) e as duas cúpulas
     abauladas, meias elipses que fecham no eixo: a do lado +x até +315 e a do lado da válvula até -345, as pontas do rascunho; e a
     válvula de raio 35 de -385 a -335. No rascunho as cúpulas eram dois discos (raio 125 de +280 a +315 e 135 de -345 a -290), em
     degrau. Cada cúpula tem 16 trechos no perfil. */
  cilindro: {
    centro: { x: 30, y: 1345, z: -1840 }, raio: 160,
    corpo: [-290, 280],
    pontas: [-345, 315],
    trechosDaCupula: 16,
    valvula: { raio: 35, x: [-385, -335] },
  },

  /* AS CINTAS: duas, a 120 mm do meio do cilindro, de 40 mm, do raio 159 (1 mm dentro do corpo) ao 170, só pela metade de cima (cruzadas
     com o bloco de y 1.250 a 1.600 e 300 mm para cada lado em z); o corte do miolo sai 5 mm além da cinta de cada lado. */
  cintas: { aoMeio: 120, meia: 20, raio: [159, 170], alemNoCorte: 5, bloco: { y: [1250, 1600], emZ: 300 } },

  /* O BERÇO: a chapa de 520 mm em x (260 para cada lado do centro do cilindro), de 350 em z, o comprimento dos apoios, com 16 mm de
     espessura, sobre a face de cima da tampa do capô (no rascunho, 300 em z: os apoios passavam 25 mm de cada ponta dela com o fundo
     reto, e a chapa curva descia abaixo deles, em degrau); e dois apoios sob as cintas, de 50 mm em x, de 350 em z, de 1.150 a 1.262, entalhados pelo círculo do
     cilindro (o corte sai 5 mm além de cada lado e vem depois de os apoios se unirem à chapa). A base da chapa: a face de cima da
     tampa da carcaça, o mais alto dela de x -235 a 295, medido na malha a cada 1 mm de z por sonda vertical (2026-11-10) e
     simplificado a 0,3 mm (o desvio da reta para cima dela fica em 0,1 mm), de z -1.660 a -2.020, com o nó de z -1.840 no ponto do
     apoio do GLP da carcaça, mais a folga, que é também o afastamento da posição na montagem. Sob os apoios, o mais alto da face é 1.149,5. */
  berco: {
    chapa: { meia: 260, emZ: 175, espessura: 16 },
    base: [[-1660, 1149.1], [-1740, 1149.5], [-1821, 1149.1], [-1840, 1148.7], [-1893, 1147.7], [-1945, 1145.3], [-1981, 1142.3], [-2007, 1138.5],
      [-2020, 1135.7]],
    folga: 0.5,
    apoios: { meia: 25, emZ: 175, y: [1150, 1262], alemNoCorte: 5 },
  },
};

const m = (mm) => mm / 1000;
const circulo = (cu, cv, r, n) => Array.from({ length: n }, (_, k) => [cu + r * Math.cos(2 * Math.PI * k / n), cv + r * Math.sin(2 * Math.PI * k / n)]);
const retangulo = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

/** O perfil de lado da chapa do berço e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const CG = T.cilindro.centro; const B = T.berco; const CH = B.chapa;
  /* a chapa de lado: a base sobre a tampa, de trás para a frente, os nós da medida dentro dela e as duas pontas, e o topo 16 mm acima */
  const base = [...B.base].sort((a, b) => a[0] - b[0]).map(([z, y]) => [z, y + B.folga]);
  const z0 = CG.z - CH.emZ; const z1 = CG.z + CH.emZ;
  const naBase = (z) => interpolar(base, z);
  const fundo = [[z0, naBase(z0)], ...base.filter(([z]) => z > z0 && z < z1), [z1, naBase(z1)]];
  const ladoChapa = [...fundo, ...[...fundo].reverse().map(([z, y]) => [z, y + CH.espessura])];
  const apoio = apoiosDoPosto(CARCACA).glp;
  const portas = {
    naTampa: { forma: 'plano', papel: 'apoia', ponto: apoio.ponto.map((v, k) => v + apoio.normal[k] * B.folga), normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
  };
  /* o perfil da revolução do cilindro, [raio, x a partir do centro], de ponta a ponta: as meias elipses das cúpulas e o corpo */
  const CI = T.cilindro; const nc = CI.trechosDaCupula;
  const cupula = (de, ponta) => Array.from({ length: nc + 1 }, (_, k) => { const a = (Math.PI / 2) * k / nc; return [k === nc ? 0 : CI.raio * Math.cos(a), de + (ponta - de) * Math.sin(a)]; });
  const perfilGas = [...cupula(CI.corpo[0], CI.pontas[0]).reverse(), ...cupula(CI.corpo[1], CI.pontas[1])];
  return { ladoChapa, perfilGas, xCintas: [CG.x - T.cintas.aoMeio, CG.x + T.cintas.aoMeio], portas };
}

/** Monta o cilindro, as cintas e o berço no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem da
 *  chapa do berço. */
export function montarGlp(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const CI = T.cilindro; const CG = CI.centro; const n = T.lados;
  const tubo = (r, [x0, x1]) => extX(circulo(CG.z, CG.y, r, n), CG.x + x0, CG.x + x1);
  /* a revolução em x do cilindro com as cúpulas */
  estado.origem += 1;
  estado.passos.push(['lathe', { origemId: estado.origem, eixo: 'x', lados: n, perfil: D.perfilGas, em: [CG.x, CG.y, CG.z] }]);
  const gas = { origem: { op: 'lathe', id: estado.origem } };

  /* CILINDRO: o corpo, as duas cúpulas e a válvula, círculos extrudados em x */
  parte('cilindroGlp', unir(gas, tubo(CI.valvula.raio, CI.valvula.x)), T.cores.gas);

  /* CINTAS: o anel de cada uma, cruzado com o bloco da metade de cima */
  const CT = T.cintas;
  const cinta = (xc) => cruzar(
    cortar(extX(circulo(CG.z, CG.y, CT.raio[1], n), xc - CT.meia, xc + CT.meia), extX(circulo(CG.z, CG.y, CT.raio[0], n), xc - CT.meia - CT.alemNoCorte, xc + CT.meia + CT.alemNoCorte)),
    extX(retangulo(CG.z - CT.bloco.emZ, CT.bloco.y[0], CG.z + CT.bloco.emZ, CT.bloco.y[1]), xc - CT.meia - CT.alemNoCorte, xc + CT.meia + CT.alemNoCorte));
  parte('cintas', unir(...D.xCintas.map(cinta)), T.cores.cinta);

  /* BERÇO: a chapa sobre a tampa e os dois apoios sob as cintas, com o entalhe do círculo do cilindro */
  const B = T.berco; const AP = B.apoios;
  const chapa = extX(D.ladoChapa, CG.x - B.chapa.meia, CG.x + B.chapa.meia);
  /* os apoios unidos à chapa primeiro, e o círculo do cilindro tirado depois do conjunto: tirado de cada apoio antes da união, o leque
     dos vértices do arco na face de lado dele cruzava a face de cima da chapa e a enchia de vértices em fila, de triângulo sem área */
  const apoios = D.xCintas.map((xc) => extX(retangulo(CG.z - AP.emZ, AP.y[0], CG.z + AP.emZ, AP.y[1]), xc - AP.meia, xc + AP.meia));
  /* o entalhe é o círculo do cilindro sem o arredondamento de 0,1 mm das outras extrusões, para cair nos vértices da revolução, que
     não arredonda: arredondado, ele deixava a revolução entrar até 0,05 mm no apoio. O perfil vai como `extX` o grava, em [-y, z],
     anti-horário. */
  const entalhe = (x0, x1) => {
    estado.origem += 1;
    estado.passos.push(['extrusao', { origemId: estado.origem, eixo: 'x', altura: x1 - x0, perfil: [...circulo(CG.z, CG.y, CI.raio, n)].reverse().map(([z, y]) => [-y, z]), em: [x0, 0, 0] }]);
    return { origem: { op: 'extrusao', id: estado.origem } };
  };
  const entalhes = D.xCintas.map((xc) => entalhe(xc - AP.meia - AP.alemNoCorte, xc + AP.meia + AP.alemNoCorte));
  parte('berco', cortar(unir(chapa, ...apoios), ...entalhes), T.cores.berco);
  return { chapa };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], lathe: ['perfil', 'em'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do apoio. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { chapa } = montarGlp(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  return [...forma, ['publicarPorta', { id: 'naTampa', de: chapa.origem, interface: Object.fromEntries(Object.entries(portas.naTampa).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]];
}

export const CONTATOS = [
  { par: ['berco', 'cilindroGlp'], motivo: 'o topo de cada apoio do berço é o círculo do cilindro, de raio 160, e o recebe por baixo' },
  { par: ['berco', 'cintas'], motivo: 'as cintas, de y 1.250 para cima, passam pelo vão dos apoios, que sobem a 1.262' },
  { par: ['cilindroGlp', 'cintas'], motivo: 'a face de dentro das cintas, de raio 159, fica 1 mm dentro do corpo do cilindro, de raio 160' },
];

const receita = {
  meta: { nome: 'empilhadeira/glp', desc: 'cilindro de GLP da empilhadeira, deitado de través sobre a tampa do capô, com o berço e as duas cintas' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'o cilindro de GLP de uma empilhadeira de contrapeso de 2,5 t, de Ø 320 por 700 mm, deitado de través sobre a tampa do capô, preso por duas cintas num berço, numa peça rígida',
    referencias: ['../../referencias/tras.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'comprimento do cilindro de GLP, do fim da cúpula ao fim da válvula (ficha da classe)', milimetros: 700 },
    partes: [
      { nome: 'berco', forma: 'o berço cinza: a chapa de 520 por 350 mm e 16 de espessura que segue a face de cima da tampa do capô, e dois apoios de 50 mm sob as cintas, que sobem a 1.262 e recebem o cilindro pelo círculo dele', tecnica: 'silhueta lateral extrudada em x, unida aos retângulos dos apoios extrudados em x, menos o círculo do cilindro' },
      { nome: 'cilindroGlp', forma: 'o cilindro cinza claro de Ø 320, deitado de través em z -1.840 e y 1.345, com as duas cúpulas abauladas e contínuas e a válvula do lado direito (-x)', tecnica: 'revolução em x (lathe de 96 lados) do perfil do corpo com as meias elipses das cúpulas, unida à válvula, círculo extrudado em x' },
      { nome: 'cintas', forma: 'duas cintas escuras de 40 mm, a 120 mm do meio do cilindro, que o abraçam pela metade de cima', tecnica: 'anel de 96 lados extrudado em x cruzado com o bloco da metade de cima' },
    ],
    criteriosDeReprovacao: [
      'o cilindro de GLP sem berço, solto dele, ou entrando na tampa do capô',
      'o cilindro deitado ao comprido, ou fora do meio da largura do capô',
      'as cintas soltas do cilindro, ou fora dos apoios do berço',
      'a válvula do lado esquerdo (+x), do lado oposto ao escape',
      'cor trocada: o cilindro laranja ou escuro',
      'as cúpulas em degraus ou discos planos, ou a chapa do berço em degrau sob os apoios',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: o cilindro com a válvula e o topo das cintas. */
  get PONTOS() {
    const T = this.PARAMS; const CI = T.cilindro; const CG = CI.centro; const CT = T.cintas; const xc = derivar(T).xCintas;
    return [
      { nome: 'válvula, embaixo e atrás', parte: 'cilindroGlp', medida: 'minimo', em: [CG.x + CI.valvula.x[0], CG.y - CI.raio, CG.z - CI.raio], toleranciaMm: 0.5 },
      { nome: 'cúpula da esquerda, em cima e na frente', parte: 'cilindroGlp', medida: 'maximo', em: [CG.x + CI.pontas[1], CG.y + CI.raio, CG.z + CI.raio], toleranciaMm: 0.5 },
      { nome: 'cinta da esquerda, em cima', parte: 'cintas', medida: 'maximo', em: [xc[1] + CT.meia, CG.y + CT.raio[1], CG.z + CT.raio[1]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
