/* instalacao-solar/suporte-l — o suporte em L de alumínio que liga a haste ao perfil.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 8 na obra, um por
 * haste. A perna de baixo, a da haste, assenta na haste entre as duas porcas; a perna de cima, a do perfil, fica em pé ao lado do
 * trilho e o parafuso do rasgo lateral do perfil passa pelo furo oblongo dela, que deixa ajustar a altura.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo da perna da haste), o canto de fora do L na origem em x e
 * em y, a perna da haste ao longo de +x (de 0 a `pernaDaHaste`), a perna do perfil para cima (de 0 a `pernaDoPerfil`) e a largura
 * em z, centrada.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o suporte): as pernas de 70 e 60 mm, a largura de 40 mm, a espessura de 5 mm, o raio
 * da dobra, o furo da haste de 10,5 mm e o furo oblongo de 9 por 28 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno em L, com a dobra arredondada (arco por pontos calculados em `derivar`), e dois
 * cortes por `subtrair`: um cilindro em y para o furo da haste e um prisma em x de contorno arredondado para o oblongo.
 */

export const TABELA = {
  /* A CONFIRMAR: pernas (comprimento externo), largura e espessura. */
  pernaDoPerfil: 70,
  pernaDaHaste: 60,
  largura: 40,
  espessura: 5,
  /* A CONFIRMAR: raio de dentro da dobra (o de fora é ele mais a espessura). */
  raioDaDobra: 4,
  segmentosDaDobra: 6,
  /* A CONFIRMAR: furo da haste (diâmetro e distância do canto de fora ao centro dele, ao longo de x). */
  furoDaHaste: 10.5,
  centroDoFuroDaHaste: 38,
  /* A CONFIRMAR: furo oblongo da perna do perfil (largura, comprimento total e altura do centro dele). */
  oblongoLargura: 9,
  oblongoComprimento: 28,
  oblongoCentro: 42,
  lados: 24,
};

export const MATERIAIS = { aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 } };

const m = (mm) => mm / 1000;
const ID = { l: 100, furoHaste: 101, oblongo: 102, furado: 103 };

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [[`cil${ID.furoHaste}`, cilindroInteiro(ID.furoHaste)]];

export function derivar(t = TABELA) {
  const e = t.espessura;
  const ri = t.raioDaDobra;
  const ro = ri + e;
  const c = ro; // o centro comum das duas dobras, em x e y
  const arco = (raio, de, ate) => {
    const n = t.segmentosDaDobra;
    return Array.from({ length: n + 1 }, (_, k) => {
      const a = ((de + ((ate - de) * k) / n) * Math.PI) / 180;
      return [c + raio * Math.cos(a), c + raio * Math.sin(a)];
    });
  };
  /* Contorno em (x, y), anti-horário: de baixo, o fim da dobra de fora, a perna da haste, a dobra de dentro, a perna do perfil e a dobra de fora, que fecha no ponto de baixo. */
  const contorno = [
    [t.pernaDaHaste, 0], [t.pernaDaHaste, e],
    ...arco(ri, 270, 180),
    [e, t.pernaDoPerfil], [0, t.pernaDoPerfil],
    ...arco(ro, 180, 270),
  ];
  return { contorno, ro };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: o furo da haste na face de baixo da perna da haste, e a face de fora da perna do perfil, no centro do oblongo, onde o
   perfil encosta. A referência é a perna da haste (+x) no primeiro caso e a subida da perna do perfil (+y) no segundo. */
export function portas(t = TABELA) {
  return {
    naHaste: { forma: 'plano', papel: 'apoia', ponto: [t.centroDoFuroDaHaste, 0, 0], normal: [0, -1, 0], extensao: [t.furoDaHaste * 2, t.furoDaHaste * 2], referencia: [1, 0, 0] },
    facePerfil: { forma: 'plano', papel: 'recebe', ponto: [0, t.oblongoCentro, 0], normal: [-1, 0, 0], extensao: [t.largura, t.oblongoComprimento], referencia: [0, 1, 0] },
  };
}

export function gerarPassos(t = TABELA) {
  const { contorno } = derivar(t);
  const passos = [];
  /* Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v: o contorno entra com o y trocado de sinal e na ordem inversa. */
  passos.push(['extrusao', { origemId: ID.l, eixo: 'z', altura: m(t.largura), perfil: contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(-t.largura / 2)] }]);
  /* O furo da haste: cilindro em y atravessando a perna de baixo. */
  passos.push(['cilindro', {
    origemId: ID.furoHaste, raio: m(t.furoDaHaste / 2), altura: m(t.espessura + 2), lados: t.lados,
    em: [m(t.centroDoFuroDaHaste), m(-1), 0],
  }]);
  /* O oblongo: prisma em x, estádio de largura `oblongoLargura` e comprimento `oblongoComprimento` ao longo de y, atravessando a perna do perfil. */
  passos.push(['extrusao', {
    origemId: ID.oblongo, eixo: 'x', altura: m(t.espessura + 2), segmentosArco: t.lados / 4,
    perfil: { retangulo: { largura: m(t.oblongoComprimento), profundidade: m(t.oblongoLargura), centro: [m(-t.oblongoCentro), 0], cantos: m(t.oblongoLargura / 2) } },
    em: [m(-1), 0, 0],
  }]);
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.l } }, { alias: `cil${ID.furoHaste}` }, { origem: { op: 'extrusao', id: ID.oblongo } }] }]);
  const sel = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel }], ['material', { usa: 'aluminio', sel }]);
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/suporte-l', desc: 'suporte em L de alumínio de 5 mm, pernas de 70 e 60 mm e 40 mm de largura, com furo oblongo na perna do perfil e furo da haste na outra' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'canto de fora do L, no meio da largura; y para cima (perna do perfil), a perna da haste ao longo de +x, a largura em z' },
  PLANO: {
    objeto: 'suporte em L de alumínio, chapa de 5 mm, pernas de 70 mm (a que prende ao perfil) e 60 mm (a da haste), 40 mm de largura, com furo oblongo na perna do perfil e furo redondo da haste na outra',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'perna do perfil, a mais alta', milimetros: 70 },
    partes: [
      { nome: 'corpo', forma: 'cantoneira de alumínio em L de 5 mm de espessura e 40 mm de largura: perna de baixo de 60 mm com furo redondo de 10,5 mm e perna de cima de 70 mm com furo oblongo vertical de 9 por 28 mm, dobra de dentro arredondada', tecnica: 'extrusão de eixo z do contorno em L com dobra em arco; furo redondo e oblongo por subtrair' },
    ],
    criteriosDeReprovacao: [
      'espessura diferente de 5 mm, ou largura diferente de 40 mm',
      'pernas que não são de 60 mm (haste) e 70 mm (perfil), ou ângulo diferente de 90 graus',
      'furo oblongo ausente na perna do perfil, ou furo redondo ausente na perna da haste',
      'furo oblongo redondo, e não alongado ao longo da perna',
      'furo que não atravessa a chapa',
      'canto da dobra vivo, sem o arredondamento',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
