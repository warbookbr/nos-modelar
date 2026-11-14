/* vela-de-ignicao — vela de ignição de 85 mm, M14 x 1,25, em seis partes empilhadas no mesmo eixo: terminal, isolador, sextavado,
 * arruela, rosca e eletrodos.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e o eixo da vela em x = 0, z = 0. A vela está de ponta para baixo no chão:
 * o eletrodo de massa toca y = 0 e o terminal fecha o topo em y = 85. A TABELA, em milímetro, é a única fonte das medidas;
 * `derivar` empilha as cotas de baixo para cima (cada parte começa onde a de baixo termina) e `gerarPassos` escreve, por parte,
 * os geradores e a `parte` com o nome.
 *
 * Encaixes: o nariz da cerâmica (parte `eletrodos`) assenta na face de baixo do corpo roscado; a rosca termina na arruela, a
 * arruela no sextavado, o sextavado na base do isolador e o isolador no pé do terminal, todos por face plana em y. A perna do
 * eletrodo de massa sobe até a mesma face de baixo da rosca, ao lado do nariz.
 *
 * Decisões. (1) Rosca: filete helicoidal de verdade, um `loft` de seção triangular ao longo de uma hélice de passo 1,25 mm, sobre
 * um núcleo cilíndrico de raio 6,2 mm; o filete enterra 0,3 mm no núcleo para a costura não deixar fresta. (2) Sextavado: prisma
 * de 16 mm entre faces cortado por um `lathe` de chanfro de 30 graus nas duas bordas (`intersectar`), como a porca real; as letras
 * da referência ficam de fora. (3) Interior: o miolo das partes é maciço (o isolador não atravessa o sextavado por dentro); só a
 * superfície visível importa na vela e o encaixe é por face. (4) Arruela: disco com borda abaulada, sem furo, pelo mesmo motivo.
 */

export const TABELA = {
  comprimento_total: 85,

  // eletrodos
  braco_espessura: 1.4,
  braco_largura: 2.4,
  folga_eletrodos: 1,
  ponta_central_exposta: 1.1,
  nariz_altura: 2,
  nariz_raio: 3,
  central_raio: 0.7,
  perna_x0: 3.6,
  perna_x1: 5.4,
  braco_alcance: 1.2,

  // rosca
  rosca_comprimento: 19,
  rosca_raio_nucleo: 6.2,
  rosca_raio_externo: 7,
  rosca_passo: 1.25,
  rosca_base_filete: 1.1,
  rosca_enterro: 0.3,
  rosca_margem: 0.8,
  rosca_secoes_por_volta: 16,
  rosca_chanfro: 0.4,

  // arruela
  arruela_altura: 2,
  arruela_raio: 8.7,
  arruela_abaulado: 0.5,

  // sextavado
  sextavado_entre_faces: 16,
  sextavado_altura: 9.5,
  sextavado_chanfro: 1.1,

  // isolador
  isolador_altura: 35,
  isolador_raio_base: 5.4,
  isolador_base_lisa: 8,
  nervuras: 5,
  nervura_passo: 4,
  nervura_largura: 2.2,
  nervura_raio: 5.6,
  vale_raio: 4.6,
  isolador_raio_pescoco: 3.8,
  isolador_lados: 48,

  // terminal
  terminal_raio_pe: 3.6,
  terminal_altura_pe: 2,
  terminal_raio: 3,
  ranhura_raio: 2.2,
  ranhura_altura: 1.4,
  ranhura_dist_topo: 3.2,
  terminal_chanfro: 0.6,
  terminal_lados: 32,
};

/* Cotas em milímetro, de baixo para cima. */
export function derivar(T) {
  const y = {};
  y.braco0 = 0;
  y.braco1 = y.braco0 + T.braco_espessura;
  y.pontaCentral = y.braco1 + T.folga_eletrodos;
  y.nariz0 = y.pontaCentral + T.ponta_central_exposta;
  y.nariz1 = y.nariz0 + T.nariz_altura;
  y.rosca0 = y.nariz1;
  y.rosca1 = y.rosca0 + T.rosca_comprimento;
  y.arruela0 = y.rosca1;
  y.arruela1 = y.arruela0 + T.arruela_altura;
  y.sext0 = y.arruela1;
  y.sext1 = y.sext0 + T.sextavado_altura;
  y.iso0 = y.sext1;
  y.iso1 = y.iso0 + T.isolador_altura;
  y.term0 = y.iso1;
  y.term1 = T.comprimento_total;

  // sextavado: o raio ao vértice sai da medida entre faces; o vértice 0 fica em +x.
  const rVertice = T.sextavado_entre_faces / 2 / Math.cos(Math.PI / 6);
  const hex = Array.from({ length: 6 }, (_, k) => [rVertice * Math.cos((k * Math.PI) / 3), rVertice * Math.sin((k * Math.PI) / 3)]);

  // eletrodo de massa em L: perna da face de baixo da rosca até o chão, braço por cima do eixo.
  const perna = { x0: T.perna_x0, x1: T.perna_x1, y0: y.braco0, y1: y.rosca0, z: T.braco_largura };
  const braco = { x0: -T.braco_alcance, x1: T.perna_x1, y0: y.braco0, y1: y.braco1, z: T.braco_largura };

  // perfil do nariz com o eletrodo central, [raio, y].
  const nariz = [
    [0, y.pontaCentral], [T.central_raio, y.pontaCentral], [T.central_raio, y.nariz0],
    [T.nariz_raio, y.nariz0], [T.nariz_raio, y.nariz1], [0, y.nariz1],
  ];

  // chanfro do sextavado: círculo inscrito na face e 30 graus até a esquina.
  const rIns = T.sextavado_entre_faces / 2;
  const c = T.sextavado_chanfro;
  const chanfroSext = [
    [0, y.sext0], [rIns, y.sext0], [rIns + c / Math.tan(Math.PI / 6), y.sext0 + c],
    [rIns + c / Math.tan(Math.PI / 6), y.sext1 - c], [rIns, y.sext1], [0, y.sext1],
  ];

  // núcleo da rosca com chanfro na ponta de baixo.
  const nuc = T.rosca_raio_nucleo;
  const nucleo = [[0, y.rosca0], [nuc - T.rosca_chanfro, y.rosca0], [nuc, y.rosca0 + T.rosca_chanfro], [nuc, y.rosca1], [0, y.rosca1]];

  // filete: hélice sobre o raio do núcleo mais a folga do enterro; seção triangular [u axial, w radial].
  const r0 = nuc + T.rosca_enterro;
  const yIni = y.rosca0 + T.rosca_margem + T.rosca_chanfro;
  const yFim = y.rosca1 - T.rosca_margem;
  const voltas = (yFim - yIni) / T.rosca_passo;
  const n = Math.round(voltas * T.rosca_secoes_por_volta);
  const helice = [];
  /* uma seção a mais em cada ponta, que vira polo e fecha o filete em ponta */
  for (let k = -1; k <= n + 1; k++) {
    const t = k / n;
    const ang = t * voltas * 2 * Math.PI;
    helice.push([r0 * Math.cos(ang), yIni + t * (yFim - yIni), r0 * Math.sin(ang)]);
  }
  const meia = T.rosca_base_filete / 2;
  const alturaFilete = T.rosca_raio_externo - r0;
  const secaoFilete = [[-meia, -T.rosca_enterro], [meia, -T.rosca_enterro], [0, alturaFilete]];

  // arruela: disco com a borda abaulada.
  const a = T.arruela_abaulado;
  const arruela = [
    [0, y.arruela0], [T.arruela_raio - a, y.arruela0], [T.arruela_raio, y.arruela0 + a],
    [T.arruela_raio, y.arruela1 - a], [T.arruela_raio - a, y.arruela1], [0, y.arruela1],
  ];

  // isolador: base lisa, cinco nervuras separadas por vales, pescoço até o terminal.
  const iso = [[0, y.iso0], [T.isolador_raio_base, y.iso0]];
  const yBaseLisa = y.iso0 + T.isolador_base_lisa;
  iso.push([T.isolador_raio_base, yBaseLisa]);
  iso.push([T.vale_raio, yBaseLisa + 0.6]);
  const nervuras = [];
  for (let k = 0; k < T.nervuras; k++) {
    const yc = yBaseLisa + 0.6 + T.nervura_largura / 2 + 0.8 + k * T.nervura_passo;
    nervuras.push(yc);
    const h = T.nervura_largura / 2;
    iso.push([T.vale_raio, yc - h - 0.4], [T.nervura_raio, yc - h], [T.nervura_raio, yc + h], [T.vale_raio, yc + h + 0.4]);
  }
  const yUltima = nervuras[nervuras.length - 1] + T.nervura_largura / 2 + 0.4;
  iso.push([T.isolador_raio_pescoco, yUltima + 0.8]);
  iso.push([T.isolador_raio_pescoco, y.iso1]);
  iso.push([0, y.iso1]);

  // terminal: pé alargado, haste com ranhura perto do topo, topo chanfrado.
  const yRanTopo = y.term1 - T.ranhura_dist_topo;
  const yRanBase = yRanTopo - T.ranhura_altura;
  const ch = T.terminal_chanfro;
  const terminal = [
    [0, y.term0], [T.terminal_raio_pe, y.term0], [T.terminal_raio_pe, y.term0 + T.terminal_altura_pe],
    [T.terminal_raio, y.term0 + T.terminal_altura_pe],
    [T.terminal_raio, yRanBase], [T.ranhura_raio, yRanBase], [T.ranhura_raio, yRanTopo], [T.terminal_raio, yRanTopo],
    [T.terminal_raio, y.term1 - ch], [T.terminal_raio - ch, y.term1], [0, y.term1],
  ];

  return { y, hex, perna, braco, nariz, chanfroSext, nucleo, helice, secaoFilete, arruela, iso, nervuras, terminal };
}

const m = (mm) => mm / 1000;
const pm = (p) => p.map(m);

/** Os PASSOS, em metro. Blocos de origemId: terminal 1, isolador 2, sextavado 3-5, arruela 6, rosca 7-9, eletrodos 10-13. */
export function gerarPassos(T) {
  const d = derivar(T);
  const y = d.y;
  const passos = [];
  const MATERIAL = { terminal: 'zinco', isolador: 'ceramica', sextavado: 'aco', arruela: 'zinco', rosca: 'aco', eletrodos: 'aco' };
  const nomear = (nome, op, id) => {
    const sel = { origem: { op, id } };
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { sel, usa: MATERIAL[nome] }]);
  };

  passos.push(['lathe', { origemId: 1, perfil: d.terminal.map(pm), lados: T.terminal_lados }]);
  nomear('terminal', 'lathe', 1);

  passos.push(['lathe', { origemId: 2, perfil: d.iso.map(pm), lados: T.isolador_lados }]);
  nomear('isolador', 'lathe', 2);

  passos.push(['extrusao', { origemId: 3, perfil: d.hex.map(pm), altura: m(T.sextavado_altura), em: [0, m(y.sext0), 0] }]);
  passos.push(['lathe', { origemId: 4, perfil: d.chanfroSext.map(pm), lados: 48 }]);
  passos.push(['intersectar', { origemId: 5, solidos: [{ origem: { op: 'extrusao', id: 3 } }, { origem: { op: 'lathe', id: 4 } }] }]);
  nomear('sextavado', 'intersectar', 5);

  passos.push(['lathe', { origemId: 6, perfil: d.arruela.map(pm), lados: 48 }]);
  nomear('arruela', 'lathe', 6);

  passos.push(['lathe', { origemId: 7, perfil: d.nucleo.map(pm), lados: 48 }]);
  const secoes = d.helice.map((p, k) => ({ pos: pm(p), ...(k === 0 || k === d.helice.length - 1 ? { raio: 0 } : { contorno: d.secaoFilete.map(pm) }) }));
  passos.push(['loft', { origemId: 8, lados: 3, orientacao: [0, 1, 0], secoes }]);
  passos.push(['unir', { origemId: 9, solidos: [{ origem: { op: 'lathe', id: 7 } }, { origem: { op: 'loft', id: 8 } }] }]);
  nomear('rosca', 'unir', 9);

  passos.push(['lathe', { origemId: 10, perfil: d.nariz.map(pm), lados: 32 }]);
  const caixa = (c, id) => passos.push(['cubo', {
    origemId: id, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z),
    em: [m((c.x0 + c.x1) / 2), m(c.y0), 0],
  }]);
  caixa(d.perna, 11);
  caixa(d.braco, 12);
  passos.push(['unir', { origemId: 13, solidos: [{ origem: { op: 'cubo', id: 11 } }, { origem: { op: 'cubo', id: 12 } }] }]);
  nomear('eletrodos', 'lathe', 10);
  nomear('eletrodos', 'unir', 13);

  return passos;
}

export const CONTATOS = [
  { par: ['terminal', 'isolador'], motivo: 'o pé do terminal, em y 71, assenta na face de cima do pescoço do isolador' },
  { par: ['isolador', 'sextavado'], motivo: 'a base do isolador assenta na face de cima do sextavado, em y 36' },
  { par: ['sextavado', 'arruela'], motivo: 'a face de baixo do sextavado apoia na face de cima da arruela, em y 26,5' },
  { par: ['arruela', 'rosca'], motivo: 'a arruela de vedação assenta no topo do corpo roscado, em y 24,5' },
  { par: ['rosca', 'eletrodos'], motivo: 'o nariz da cerâmica e a perna do eletrodo de massa encostam na face de baixo da rosca, em y 5,5' },
];

const receita = {
  meta: { nome: 'vela-de-ignicao', desc: 'vela de ignição M14 x 1,25 de 85 mm: terminal, isolador com cinco nervuras, sextavado, arruela, rosca helicoidal e eletrodos' },
  PARAMS: TABELA,
  MATERIAIS: {
    aco: { cor: '#9a9ea3', metalicidade: 0.9, aspereza: 0.4 },
    ceramica: { cor: '#f1efe8', metalicidade: 0, aspereza: 0.35 },
    zinco: { cor: '#b9b6a8', metalicidade: 0.8, aspereza: 0.45 },
  },
  TOPO: { origem: 'eixo da vela em x 0, z 0; ponta do eletrodo de massa em y 0 e terminal em y 85, y para cima' },
  PLANO: {
    objeto: 'vela de ignição de 85 mm de comprimento, rosca M14 x 1,25, de ponta para baixo no chão e com todas as partes no mesmo eixo',
    referencias: ['referencias/alvo.md', 'referencias/locais/prancha.jpg'],
    escala: { medida: 'comprimento total da vela', milimetros: 85 },
    partes: [
      { nome: 'terminal', forma: 'pino de topo de 6 mm de diâmetro com pé alargado e uma ranhura anelar perto do topo', tecnica: 'lathe com o perfil da ranhura' },
      { nome: 'isolador', forma: 'cerâmica branca com base lisa e cinco nervuras separadas por vales, afinando num pescoço', tecnica: 'lathe de perfil com as cinco nervuras' },
      { nome: 'sextavado', forma: 'porca de 16 mm entre faces com as duas bordas chanfradas, em aço', tecnica: 'extrusao do hexágono intersectada com lathe de chanfro' },
      { nome: 'arruela', forma: 'anel de vedação de 17,4 mm de diâmetro e 2 mm de altura com borda abaulada', tecnica: 'lathe com borda abaulada' },
      { nome: 'rosca', forma: 'corpo roscado M14 x 1,25 de 19 mm, núcleo cilíndrico com filete helicoidal de passo 1,25 mm', tecnica: 'lathe do núcleo unido a loft de seção triangular ao longo de hélice' },
      { nome: 'eletrodos', forma: 'nariz da cerâmica com o eletrodo central e eletrodo de massa em L dobrado sobre ele, com folga de 1 mm', tecnica: 'lathe do nariz e do eletrodo central; duas caixas unidas em L para o eletrodo de massa' },
    ],
    criteriosDeReprovacao: [
      'a rosca é só um cilindro, ou os filetes são anéis e não uma hélice contínua de passo 1,25 mm',
      'o isolador não tem cinco nervuras',
      'o eletrodo de massa toca o eletrodo central, ou a folga entre eles não é de 1 mm',
      'alguma parte tem o eixo fora de x 0, z 0',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
