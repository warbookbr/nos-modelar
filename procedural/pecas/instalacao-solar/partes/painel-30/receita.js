/* instalacao-solar/painel-30 — o painel solar de 1722 por 1134 mm com moldura de alumínio de 30 mm de altura.
 *
 * Peça avulsa da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`, "Medidas e quantidades da
 * obra"): um destes vai na obra, numa posição do meio da fileira. O painel em si é só a peça; a posição na fileira vem da montagem, depois.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo da moldura), o lado comprido ao longo de x, de 0 a
 * `comprimento`, e o curto ao longo de z, de 0 a `largura`. O vidro fica rente ao topo da moldura, em y = `altura`. A obra põe o
 * painel em pé; a montagem o gira.
 *
 * Camadas, de cima para baixo: o vidro de 3,2 mm rente ao topo da moldura; uma folga de `folgaEntreCamadas`; a camada das
 * células, de 0,4 mm, em grade de `celulasEmX` por `celulasEmZ` (meias-células: as colunas estreitas ao longo do lado comprido);
 * outra folga; e a folha de trás, de 0,4 mm, que assenta no degrau da moldura. As camadas não se tocam (a folga evita superfícies
 * coincidentes, que a bancada mostra como manchas), e por baixo da folha de trás, no recesso da moldura, ficam a caixa de junção
 * preta e dois cabos curtos que saem dela ao longo de x.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o painel por baixo): a espessura e a largura da aba, a espessura da parede da
 * moldura, o degrau do vidro, as camadas do laminado, a grade de células (6 × 18, típica nesta medida), a caixa de junção e os cabos.
 * O comprimento, a largura e a altura da moldura são os do documento da pessoa.
 *
 * Técnica: a moldura são três anéis de `extrusao` em y (parede, aba de baixo e degrau do vidro) fundidos por `unir`; o vidro, a folha de
 * trás e as células são `extrusao` e `cubo` de y a y; a caixa é um `cubo` e cada cabo um `cilindro` de eixo x.
 */

export const TABELA = {
  /* Medida do painel, do documento da pessoa. */
  comprimento: 1722,
  largura: 1134,
  /* A moldura: altura é do documento; o resto é a CONFIRMAR. */
  altura: 30,
  parede: 3,
  /* A CONFIRMAR: aba de baixo, que entra 30 mm para dentro da parede, e a espessura dela. */
  aba: 30,
  espessuraDaAba: 3,
  /* A CONFIRMAR: o degrau onde assenta o laminado, a largura dele para dentro da parede e a espessura. */
  degrau: 6,
  espessuraDoDegrau: 3,
  quinaDaMoldura: 3,
  /* A CONFIRMAR: distância entre os dois trilhos, que ficam centrados no lado comprido (cerca de 90 cm, do documento da pessoa). */
  distanciaEntreTrilhos: 900,
  /* A CONFIRMAR: o laminado. */
  vidro: 3.2,
  camadaDeCelulas: 0.4,
  folhaDeTras: 0.4,
  /* A CONFIRMAR: folga entre o vidro e as células e entre as células e a folha de trás. */
  folgaEntreCamadas: 3,
  /* A CONFIRMAR: a grade de células (6 × 18), a margem delas até a moldura e a fresta entre elas. */
  celulasEmX: 18,
  celulasEmZ: 6,
  margemDasCelulas: 22,
  frestaEntreCelulas: 2,
  /* A CONFIRMAR: caixa de junção atrás (x, y e z), na altura da folha de trás, no meio do painel. */
  caixaX: 110,
  caixaY: 15,
  caixaZ: 65,
  /* A CONFIRMAR: dois cabos curtos que saem da caixa ao longo de +x: raio, comprimento e afastamento do meio em z. */
  raioDoCabo: 2.5,
  comprimentoDoCabo: 260,
  afastamentoDosCabos: 18,
  ladosDoCabo: 12,
};

export const MATERIAIS = {
  aluminio: { cor: '#c4c9ce', metalicidade: 0.8, aspereza: 0.4 },
  vidro: { tipo: 'liso', cor: '#e4f0ee', mistura: 'transparente', opacidade: 0.25, aspereza: 0.03, metalicidade: 0 },
  celula: { cor: '#14264a', metalicidade: 0.3, aspereza: 0.3 },
  folha: { cor: '#e7e7e2', aspereza: 0.7 },
  caixa: { cor: '#202326', aspereza: 0.6 },
  cabo: { cor: '#0d0e0f', aspereza: 0.7 },
};

const m = (mm) => mm / 1000;
const ID = { parede: 100, aba: 101, degrau: 102, moldura: 103, vidro: 104, folha: 105, caixa: 106, caboA: 107, caboB: 108, celulas: 1000 };

export function derivar(t = TABELA) {
  const topoDoVidro = t.altura;
  const baseDoVidro = topoDoVidro - t.vidro;
  const baseDasCelulas = baseDoVidro - t.folgaEntreCamadas - t.camadaDeCelulas;
  const baseDaFolha = baseDasCelulas - t.folgaEntreCamadas - t.folhaDeTras;
  const areaX = t.comprimento - 2 * t.margemDasCelulas;
  const areaZ = t.largura - 2 * t.margemDasCelulas;
  const passoX = areaX / t.celulasEmX;
  const passoZ = areaZ / t.celulasEmZ;
  const celulas = [];
  for (let i = 0; i < t.celulasEmX; i++) {
    for (let j = 0; j < t.celulasEmZ; j++) {
      celulas.push([t.margemDasCelulas + passoX * (i + 0.5), t.margemDasCelulas + passoZ * (j + 0.5)]);
    }
  }
  const cx = t.comprimento / 2;
  const cz = t.largura / 2;
  return {
    baseDoVidro, baseDasCelulas, baseDaFolha, celulas,
    celula: [passoX - t.frestaEntreCelulas, passoZ - t.frestaEntreCelulas],
    caixa: { x: cx, z: cz, y0: baseDaFolha - t.caixaY },
    cabos: [-1, 1].map((s) => ({ x0: cx + t.caixaX / 2, y: baseDaFolha - t.caixaY / 2, z: cz + s * t.afastamentoDosCabos })),
    /* Cada anel: recuo do contorno de fora, recuo do furo, y de baixo e y de cima. A aba e o degrau entram 1 mm na parede para
       a união fechar sem fresta. */
    aneis: {
      parede: { fora: 0, furo: t.parede, y0: 0, y1: t.altura },
      aba: { fora: t.parede - 1, furo: t.aba, y0: 0, y1: t.espessuraDaAba },
      degrau: { fora: t.parede - 1, furo: t.degrau + t.parede, y0: baseDaFolha - t.espessuraDoDegrau, y1: baseDaFolha },
    },
  };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: `noTrilho`, o cruzamento do trilho de cima com a borda de baixo, na ponta de z = 0, para o primeiro painel; e as bordas de
   cada lado, nos dois trilhos (A, o de baixo na água, e B, o de cima), na metade da altura da moldura, onde os grampos encostam. O painel em pé tem
   o lado comprido (x) descendo a água, com x = 0 no lado de cima. Os trilhos ficam `distanciaEntreTrilhos` um do outro, centrados no lado comprido. */
export function portas(t = TABELA) {
  const xA = (t.comprimento + t.distanciaEntreTrilhos) / 2;
  const xB = (t.comprimento - t.distanciaEntreTrilhos) / 2;
  const borda = (x, z, sentido) => ({ forma: 'plano', papel: sentido > 0 ? 'recebe' : 'apoia', ponto: [x, t.altura / 2, z], normal: [0, 0, sentido], extensao: [t.altura, 50], referencia: [0, 1, 0] });
  return {
    noTrilho: { forma: 'plano', papel: 'apoia', ponto: [xB, 0, 0], normal: [0, -1, 0], extensao: [100, 100], referencia: [1, 0, 0] },
    bordaEsquerdaA: borda(xA, 0, -1),
    bordaEsquerdaB: borda(xB, 0, -1),
    bordaDireitaA: borda(xA, t.largura, 1),
    bordaDireitaB: borda(xB, t.largura, 1),
  };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const L = t.comprimento;
  const W = t.largura;
  const passos = [];
  const retangulo = (recuo, cantos = 0) => ({ retangulo: { largura: m(L - 2 * recuo), profundidade: m(W - 2 * recuo), centro: [m(L / 2), m(W / 2)], ...(cantos ? { cantos: m(cantos) } : {}) } });
  const anel = (id, a, cantos) => passos.push(['extrusao', {
    origemId: id, perfil: retangulo(a.fora, cantos), furos: [retangulo(a.furo)], altura: m(a.y1 - a.y0), em: [0, m(a.y0), 0],
  }]);
  anel(ID.parede, D.aneis.parede, t.quinaDaMoldura);
  anel(ID.aba, D.aneis.aba, 0);
  anel(ID.degrau, D.aneis.degrau, 0);
  passos.push(['unir', { origemId: ID.moldura, solidos: [ID.parede, ID.aba, ID.degrau].map((id) => ({ origem: { op: 'extrusao', id } })) }]);
  passos.push(['parte', { nome: 'moldura', sel: { origem: { op: 'unir', id: ID.moldura } } }]);
  passos.push(['material', { usa: 'aluminio', sel: { origem: { op: 'unir', id: ID.moldura } } }]);

  const lamina = (id, nome, material, recuo, y0, espessura) => {
    passos.push(['extrusao', { origemId: id, perfil: retangulo(recuo), altura: m(espessura), em: [0, m(y0), 0] }]);
    const sel = { origem: { op: 'extrusao', id } };
    passos.push(['parte', { nome, sel }], ['material', { usa: material, sel }]);
  };
  lamina(ID.vidro, 'vidro', 'vidro', t.parede, D.baseDoVidro, t.vidro);
  lamina(ID.folha, 'fundo', 'folha', t.parede, D.baseDaFolha, t.folhaDeTras);

  D.celulas.forEach(([x, z], k) => {
    const id = ID.celulas + k;
    const sel = { origem: { op: 'cubo', id } };
    passos.push(['cubo', { origemId: id, larg: m(D.celula[0]), alt: m(t.camadaDeCelulas), prof: m(D.celula[1]), em: [m(x), m(D.baseDasCelulas), m(z)] }]);
    passos.push(['parte', { nome: 'celulas', sel }], ['material', { usa: 'celula', sel }]);
  });

  const selCaixa = { origem: { op: 'cubo', id: ID.caixa } };
  passos.push(['cubo', { origemId: ID.caixa, larg: m(t.caixaX), alt: m(t.caixaY), prof: m(t.caixaZ), em: [m(D.caixa.x), m(D.caixa.y0), m(D.caixa.z)] }]);
  passos.push(['parte', { nome: 'caixaJuncao', sel: selCaixa }], ['material', { usa: 'caixa', sel: selCaixa }]);

  D.cabos.forEach((c, k) => {
    const id = k === 0 ? ID.caboA : ID.caboB;
    passos.push(['cilindro', { origemId: id, eixo: 'x', raio: m(t.raioDoCabo), altura: m(t.comprimentoDoCabo), lados: t.ladosDoCabo, em: [m(c.x0), m(c.y), m(c.z)] }]);
    /* A citação sem tampa seleciona só as laterais: as duas tampas entram na mesma parte, uma citação cada. */
    for (const sel of [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }]) {
      passos.push(['parte', { nome: k === 0 ? 'caboA' : 'caboB', sel }], ['material', { usa: 'cabo', sel }]);
    }
  });
  publicar(passos, portas(t), { op: 'unir', id: ID.moldura });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/painel-30', desc: 'painel solar de 1722 por 1134 mm, moldura de alumínio de 30 mm, vidro rente ao topo, grade de células 6 × 18, caixa de junção e dois cabos curtos atrás' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'canto de x = 0, z = 0 da face de baixo da moldura; y para cima, o lado comprido ao longo de +x, o vidro em cima' },
  PLANO: {
    objeto: 'painel solar de 1722 por 1134 mm, deitado, com moldura de alumínio de 30 mm de altura e 30 mm de aba, vidro rente ao topo da moldura, células visíveis numa grade 6 × 18, caixa de junção e dois cabos curtos atrás',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento do painel', milimetros: 1722 },
    partes: [
      { nome: 'moldura', forma: 'moldura retangular de alumínio de 1722 por 1134 mm e 30 mm de altura: parede de 3 mm, aba de baixo de 30 mm para dentro e degrau interno onde assenta o laminado, quinas externas levemente arredondadas', tecnica: 'três anéis de extrusão em y (parede, aba, degrau) fundidos por unir' },
      { nome: 'vidro', forma: 'placa de vidro de 3,2 mm, transparente, rente ao topo da moldura (y igual à altura da moldura), de parede a parede', tecnica: 'extrusão retangular em y' },
      { nome: 'celulas', forma: 'grade de 18 por 6 células azul-escuras de 0,4 mm sob o vidro, com folga clara acima e abaixo, separadas por fresta de 2 mm, as colunas estreitas ao longo do lado comprido', tecnica: 'um cubo por célula, posições da derivar' },
      { nome: 'fundo', forma: 'folha de trás clara de 0,4 mm sob as células, de parede a parede, assentada no degrau da moldura', tecnica: 'extrusão retangular em y' },
      { nome: 'caixaJuncao', forma: 'caixa preta de 110 por 15 por 65 mm colada sob a folha de trás, no meio do painel, dentro do recesso da moldura', tecnica: 'cubo' },
      { nome: 'caboA', forma: 'cabo preto curto, cilindro de 5 mm de diâmetro e 260 mm, saindo da caixa ao longo de +x, de um lado do meio', tecnica: 'cilindro de eixo x' },
      { nome: 'caboB', forma: 'segundo cabo preto curto, igual ao primeiro, do outro lado do meio da caixa', tecnica: 'cilindro de eixo x' },
    ],
    criteriosDeReprovacao: [
      'comprimento ou largura diferentes de 1722 por 1134 mm',
      'moldura de altura diferente de 30 mm',
      'vidro afundado ou saliente em relação ao topo da moldura, e não rente a ele',
      'células sem a grade 6 × 18, ou grade que não ocupa o laminado todo',
      'caixa de junção ou cabos na frente (acima do vidro), e não atrás',
      'só um cabo, ou cabos que não saem da caixa',
      'qualquer parte abaixo do chão (y negativo)',
      'moldura maciça, sem o recesso por baixo do laminado',
    ],
  },
  contatos: [
    { par: ['moldura', 'vidro'], motivo: 'o vidro enche o vão da moldura e encosta nas paredes dela' },
    { par: ['moldura', 'fundo'], motivo: 'a folha de trás assenta no degrau e encosta nas paredes' },
    { par: ['fundo', 'caixaJuncao'], motivo: 'a caixa é colada na face de baixo da folha de trás' },
    { par: ['caixaJuncao', 'caboA'], motivo: 'o cabo sai da face de +x da caixa' },
    { par: ['caixaJuncao', 'caboB'], motivo: 'o cabo sai da face de +x da caixa' },
  ],
  ilhas: [{ contem: 'celulas', motivo: 'as células ficam entre o vidro e a folha de trás, com folga de cada lado para as camadas não coincidirem; na peça real o laminado as une' }],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
