/* filtro-de-oleo: filtro de óleo de rosca de 76 x 80 mm, de pé sobre a junta. Referencial do acervo: Y para cima, chão em y 0 (a face de
 * baixo da junta), eixo do filtro em x 0 e z 0. A TABELA está em milímetro e a conversão para metro acontece só em `m()`, em gerarPassos.
 *
 * Três partes, cada uma uma peça de revolução ou de extrusão:
 * - carcaca: lathe de uma seção fechada em forma de copo (parede externa, fundo de cima com cantos arredondados por concordância, parede
 *   interna 1 mm para dentro), com o rebordo de baixo como meia-cana de arco calculado em `derivar` e uma aba que volta para dentro por
 *   baixo da borda da tampa; o sextavado estampado no topo é um cilindro de seis lados unido ao copo.
 * - tampa: placa de aço (extrusão com o círculo externo e oito furos de entrada em círculo) unida a um colar de lathe cuja parede
 *   interna é um dente de serra, a rosca de 3/4 pol - 16 em anéis (sem hélice).
 * - junta: anel de seção retangular em lathe, por baixo da tampa.
 */
export const TABELA = {
  diametro: 76, altura: 80,
  lados: 64, segmentosCurva: 8, segmentosBorda: 12,
  parede: 1,
  /* rebordo: meia-cana de raio `raio` e a aba de baixo (`abaLargura` para dentro, `abaEspessura` de altura) que sustenta a tampa */
  rebordo: { raio: 2.5, labio: 1.0, abaEspessura: 1.5, abaLargura: 1.0 },
  cantoDoTopo: 10,
  sextavado: { circunraio: 14, altura: 1.5, penetracao: 0.5 },
  tampa: { espessura: 2.5, folga: 0.1, furos: 8, raioDosFuros: 19, raioDoFuro: 3.2, colar: { raio: 13, topo: 9, furoDaPlaca: 12 } },
  rosca: { maior: 9.525, menor: 8.9, passo: 1.5875, filetes: 4 },
  junta: { interno: 27.5, externo: 34 },
};

export function derivar(t = TABELA) {
  const R = t.diametro / 2;
  const rb = t.rebordo;
  const centroRebordo = [R - rb.raio, rb.labio + rb.raio];
  const paredeExterna = centroRebordo[0] + t.parede;
  const paredeInterna = centroRebordo[0];
  const yAbaTopo = rb.labio + rb.abaEspessura;
  const yTopoDaCasca = t.altura - t.sextavado.altura;
  /* a meia-cana vai do fundo (ângulo -90) até onde o arco chega à parede externa */
  const anguloFim = Math.acos((paredeExterna - centroRebordo[0]) / rb.raio);
  const arco = [];
  for (let k = 0; k <= t.segmentosBorda; k++) {
    const a = -Math.PI / 2 + ((anguloFim + Math.PI / 2) * k) / t.segmentosBorda;
    arco.push([centroRebordo[0] + rb.raio * Math.cos(a), centroRebordo[1] + rb.raio * Math.sin(a)]);
  }
  const abaInterna = centroRebordo[0] - rb.abaLargura;
  const carcaca = [
    [abaInterna, rb.labio], ...arco,
    [paredeExterna, yTopoDaCasca, t.cantoDoTopo], [0, yTopoDaCasca],
    [0, yTopoDaCasca - t.parede], [paredeInterna, yTopoDaCasca - t.parede, t.cantoDoTopo - t.parede],
    [paredeInterna, yAbaTopo], [abaInterna, yAbaTopo],
  ];
  const tp = t.tampa;
  const yTampa = yAbaTopo;
  const raioDaTampa = paredeInterna - tp.folga;
  const furos = [];
  for (let k = 0; k < tp.furos; k++) {
    const a = (2 * Math.PI * k) / tp.furos;
    furos.push([tp.raioDosFuros * Math.cos(a), tp.raioDosFuros * Math.sin(a)]);
  }
  /* o colar: parede externa reta, furo roscado em dente de serra de cima para baixo */
  const rs = t.rosca;
  const colar = [[tp.colar.raio, yTampa], [tp.colar.raio, tp.colar.topo], [rs.menor, tp.colar.topo]];
  for (let k = 0; k < rs.filetes; k++) {
    const y = tp.colar.topo - k * rs.passo;
    colar.push([rs.maior, y - rs.passo / 2], [rs.menor, y - rs.passo]);
  }
  colar.push([rs.menor, yTampa]);
  const junta = [[t.junta.interno, 0], [t.junta.externo, 0], [t.junta.externo, yTampa], [t.junta.interno, yTampa]];
  return { carcaca, yTopoDaCasca, raioDaTampa, yTampa, furos, colar, junta, abaInterna };
}

const m = (mm) => mm / 1000;
const ID = { carcaca: 1, sextavado: 2, casco: 3, placa: 10, colar: 11, tampa: 12, junta: 20 };
const ANGULO_LISO = 30;

/* o cilindro inteiro é a lateral e as duas tampas */
export const ALIASES = [['sextavadoInteiro', { unir: [
  { origem: { op: 'cilindro', id: ID.sextavado } }, { origem: { op: 'cilindro', id: ID.sextavado, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: ID.sextavado, tampa: 'topo' } },
] }]];

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const P = [];
  const perfilM = (perfil) => perfil.map(([r, y, c]) => (c === undefined ? [m(r), m(y)] : [m(r), m(y), m(c)]));
  const sx = t.sextavado;

  /* carcaca: o copo e o sextavado, um sólido só */
  P.push(['lathe', { origemId: ID.carcaca, lados: t.lados, segmentosCurva: t.segmentosCurva, perfil: perfilM(D.carcaca), furos: [] }]);
  P.push(['cilindro', { origemId: ID.sextavado, raio: m(sx.circunraio), altura: m(sx.altura + sx.penetracao), lados: 6, em: [0, m(D.yTopoDaCasca - sx.penetracao), 0] }]);
  const selCasca = { origem: { op: 'unir', id: ID.casco } };
  P.push(['unir', { origemId: ID.casco, solidos: [{ origem: { op: 'lathe', id: ID.carcaca } }, { alias: 'sextavadoInteiro' }] }]);
  P.push(['parte', { nome: 'carcaca', sel: selCasca }], ['material', { usa: 'azul', sel: selCasca }], ['liso', { angulo: ANGULO_LISO, sel: selCasca }]);

  /* tampa: a placa com os oito furos unida ao colar roscado */
  const tp = t.tampa;
  P.push(['extrusao', {
    origemId: ID.placa, perfil: { circulo: { raio: m(D.raioDaTampa) } }, segmentosArco: t.lados / 4,
    furos: [...D.furos.map(([x, z]) => ({ circulo: { raio: m(tp.raioDoFuro), centro: [m(x), m(z)] } })), { circulo: { raio: m(tp.colar.furoDaPlaca) } }],
    altura: m(tp.espessura), em: [0, m(D.yTampa), 0],
  }]);
  P.push(['lathe', { origemId: ID.colar, lados: t.lados, perfil: perfilM(D.colar), furos: [] }]);
  const selTampa = { origem: { op: 'unir', id: ID.tampa } };
  P.push(['unir', { origemId: ID.tampa, solidos: [{ origem: { op: 'extrusao', id: ID.placa } }, { origem: { op: 'lathe', id: ID.colar } }] }]);
  P.push(['parte', { nome: 'tampa', sel: selTampa }], ['material', { usa: 'aco', sel: selTampa }], ['liso', { angulo: ANGULO_LISO, sel: selTampa }]);

  /* junta */
  const selJunta = { origem: { op: 'lathe', id: ID.junta } };
  P.push(['lathe', { origemId: ID.junta, lados: t.lados, perfil: perfilM(D.junta), furos: [] }]);
  P.push(['parte', { nome: 'junta', sel: selJunta }], ['material', { usa: 'borracha', sel: selJunta }], ['liso', { angulo: ANGULO_LISO, sel: selJunta }]);
  return P;
}

export const CONTATOS = [
  { par: ['carcaca', 'tampa'], motivo: 'a borda da tampa assenta na face de cima da aba do rebordo, em y 2,5, por dentro da parede' },
  { par: ['tampa', 'junta'], motivo: 'a junta fica sob a face de baixo da tampa, em y 2,5' },
];

export const MATERIAIS = {
  azul: { cor: '#1f4ea3', metalicidade: 0.55, aspereza: 0.4 },
  aco: { cor: '#9a9da0', metalicidade: 0.85, aspereza: 0.45 },
  borracha: { cor: '#161616', metalicidade: 0, aspereza: 0.9 },
};

const receita = {
  meta: { nome: 'filtro-de-oleo', desc: 'filtro de óleo de rosca de 76 x 80 mm: carcaça azul com rebordo e sextavado, tampa de aço com oito furos e rosca central, junta de borracha' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'eixo do filtro em x 0 e z 0; face de baixo da junta em y 0; y para cima; a tampa embaixo e o fundo arredondado em cima' },
  PLANO: {
    objeto: 'filtro de óleo de rosca, peça inteira, 76 mm de diâmetro e 80 mm de altura, de pé sobre a junta com a tampa embaixo',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da peça', milimetros: 80 },
    partes: [
      { nome: 'carcaca', forma: 'copo de chapa azul de 1 mm de parede, 76 mm de diâmetro no rebordo arredondado de baixo, fundo de cima arredondado e sextavado estampado de 1,5 mm no topo', tecnica: 'lathe de seção fechada (parede externa e interna) com concordância no fundo e meia-cana no rebordo, unida a um cilindro de seis lados' },
      { nome: 'tampa', forma: 'placa de aço de 2,5 mm com oito furos de entrada em círculo de 19 mm de raio e furo central roscado de 3/4 pol em um colar', tecnica: 'extrusão com oito furos circulares unida a um lathe de colar com rosca em dente de serra' },
      { nome: 'junta', forma: 'anel de borracha preta de seção retangular, 27,5 a 34 mm de raio e 2,5 mm de altura, sob a borda da tampa', tecnica: 'lathe de seção retangular' },
    ],
    criteriosDeReprovacao: [
      'carcaça maciça ou sem o rebordo',
      'tampa sem os oito furos ou sem a rosca central',
      'junta solta ou atravessando a tampa',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const t = this.PARAMS;
    const R = t.diametro / 2;
    const D = derivar(t);
    const tol = 1;
    return [
      { nome: 'topo do sextavado', parte: 'carcaca', medida: 'maximo', em: [R, t.altura, R], toleranciaMm: tol },
      { nome: 'rebordo, borda de baixo', parte: 'carcaca', medida: 'minimo', em: [-R, t.rebordo.labio, -R], toleranciaMm: tol },
      { nome: 'borda da tampa', parte: 'tampa', medida: 'maximo', em: [D.raioDaTampa, t.tampa.colar.topo, D.raioDaTampa], toleranciaMm: tol },
      { nome: 'face de baixo da junta', parte: 'junta', medida: 'minimo', em: [-t.junta.externo, 0, -t.junta.externo], toleranciaMm: tol },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
