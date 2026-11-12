/* instalacao-solar/suporte-l — o suporte em L de alumínio que liga a haste ao perfil, com a borracha do pé e o parafuso do rasgo.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 8 na obra, um por
 * haste. O pé, a perna da haste, assenta na haste entre duas porcas, com uma borracha preta fina por baixo; a perna vertical, a do perfil,
 * sobe ao lado do trilho e fica encostada na face estriada dele. O parafuso allen passa pelo rasgo oblongo vertical da perna, que deixa
 * ajustar a altura, e uma placa-porca quadrada, do outro lado, corre no rasgo lateral do perfil. As duas faces da perna são estriadas na horizontal.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo da borracha), o canto de fora do L em x = 0, o pé ao longo de +x
 * (de 0 a `pernaDaHaste`), a perna do perfil para cima e a largura em z, centrada. O L começa em y = `borracha`.
 *
 * MEDIDAS REAIS (a pessoa mediu): altura total do L de 85 mm (a perna sobe 80 mm acima do pé de 5 mm), 50 mm de largura (a face), pé de
 * 5 mm de espessura. A CONFIRMAR: o comprimento do pé (45 mm), o raio da dobra, o furo da haste de 10,5 mm a 25 mm da face, a borracha de
 * 1,5 mm, o oblongo de 8,5 por 30 mm com o centro a 66 mm do chão, a posição do parafuso na metade de cima do rasgo (três quartos do
 * comprimento), o parafuso allen M8 e a placa-porca de 9 por 9 por 3 mm, os frisos de 0,5 mm a cada 3 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno em L, com a dobra arredondada (arco por pontos calculados em `derivar`) e os frisos nas
 * duas faces da perna, e dois cortes por `subtrair`: um cilindro em y para o furo da haste e um prisma em x de contorno arredondado para o
 * oblongo; a borracha é uma `extrusao` de retângulo com furo; o parafuso é um `unir` da haste, da cabeça allen (círculo com furo sextavado) e da placa-porca.
 */

export const TABELA = {
  /* Medidas do documento da pessoa: altura total do L (perna do perfil), largura da face e espessura da chapa. */
  pernaDoPerfil: 85,
  largura: 50,
  espessura: 5,
  /* A CONFIRMAR: comprimento do pé, raio de dentro da dobra (o de fora é ele mais a espessura) e a borracha preta fina por baixo do pé. */
  pernaDaHaste: 45,
  raioDaDobra: 4,
  segmentosDaDobra: 6,
  borracha: 1.5,
  /* A CONFIRMAR: furo da haste (diâmetro e distância do canto de fora ao centro dele, ao longo de x). */
  furoDaHaste: 10.5,
  centroDoFuroDaHaste: 25,
  /* A CONFIRMAR: oblongo vertical da perna do perfil (largura, comprimento total e altura do centro dele, contada do chão) e onde o parafuso
     fica nele, de 0 (embaixo) a 1 (em cima): na metade de cima. */
  oblongoLargura: 8.5,
  oblongoComprimento: 30,
  oblongoCentro: 66,
  posicaoDoParafuso: 0.75,
  /* A CONFIRMAR: frisos horizontais das duas faces da perna (crista, vale, fundura) e onde começam, acima da dobra. */
  frisoCrista: 1.5,
  frisoVale: 1.5,
  frisoFundura: 0.5,
  /* A CONFIRMAR: parafuso allen M8 (cabeça de 13 mm por 8 mm, chave de 6 mm no soquete), a placa-porca quadrada e a fundura do rasgo do perfil
     onde ela assenta (a placa encosta no fundo dele). */
  raioDoParafuso: 4,
  raioDaCabeca: 6.5,
  alturaDaCabeca: 8,
  chaveDoSoquete: 6,
  placaLado: 9,
  placaEspessura: 3,
  fundoDoRasgoDoPerfil: 4,
  lados: 24,
};

export const MATERIAIS = {
  aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 },
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
  borracha: { cor: '#1b1c1e', aspereza: 0.85 },
};

const m = (mm) => mm / 1000;
const ID = { l: 100, furoHaste: 101, oblongo: 102, furado: 103, haste: 104, cabeca: 105, placa: 106, parafuso: 107, borracha: 108 };

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [[`cil${ID.furoHaste}`, cilindroInteiro(ID.furoHaste)]];

/* Os frisos de uma face reta: de `a` a `b`, a crista no traçado, o vale `fundura` para o lado `dentro`. Começa na crista em `a`. */
export function frisos(a, b, dentro, crista, vale, fundura) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const em = (pos, prof = 0) => [a[0] + u[0] * pos + dentro[0] * prof, a[1] + u[1] * pos + dentro[1] * prof];
  const pts = [a];
  for (let pos = 0; pos + crista + vale < len - 0.2; pos += crista + vale) {
    pts.push(em(pos + crista), em(pos + crista, fundura), em(pos + crista + vale, fundura), em(pos + crista + vale));
  }
  pts.push(b);
  return pts;
}

export function derivar(t = TABELA) {
  const e = t.espessura;
  const ri = t.raioDaDobra;
  const ro = ri + e;
  const c = ro; // o centro comum das duas dobras, em x e y
  const b = t.borracha;
  const topo = t.pernaDoPerfil;
  const arco = (raio, de, ate) => {
    const n = t.segmentosDaDobra;
    return Array.from({ length: n + 1 }, (_, k) => {
      const a = ((de + ((ate - de) * k) / n) * Math.PI) / 180;
      return [c + raio * Math.cos(a), c + raio * Math.sin(a)];
    });
  };
  /* A perna começa acima da dobra: os frisos de cada face vão da dobra ao topo. */
  const dentro = frisos([e, ro], [e, topo], [-1, 0], t.frisoCrista, t.frisoVale, t.frisoFundura);
  const fora = frisos([0, topo], [0, ro], [1, 0], t.frisoCrista, t.frisoVale, t.frisoFundura);
  /* Contorno em (x, y), anti-horário: de baixo, o fim da dobra de fora, o pé, a dobra de dentro, a face de dentro da perna (com frisos), o topo, a
     face de fora (com frisos) e a dobra de fora, que fecha no ponto de baixo. O L começa em y = `borracha`. */
  const contorno = [
    [t.pernaDaHaste, 0], [t.pernaDaHaste, e],
    ...arco(ri, 270, 180),
    ...dentro.slice(1),
    ...fora,
    ...arco(ro, 180, 270).slice(1),
  ].map(([x, y]) => [x, y + b]);
  const yDoParafuso = t.oblongoCentro - t.oblongoComprimento / 2 + t.posicaoDoParafuso * t.oblongoComprimento;
  const R = t.chaveDoSoquete / Math.sqrt(3);
  const soquete = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  return { contorno, ro, yDoParafuso, soquete };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: o furo da haste na face de baixo da borracha, e a face de fora da perna do perfil, na altura do parafuso no oblongo, onde o
   perfil encosta. A referência é a perna da haste (+x) no primeiro caso e a subida da perna do perfil (+y) no segundo. */
export function portas(t = TABELA) {
  const { yDoParafuso } = derivar(t);
  return {
    naHaste: { forma: 'plano', papel: 'apoia', ponto: [t.centroDoFuroDaHaste, 0, 0], normal: [0, -1, 0], extensao: [t.furoDaHaste * 2, t.furoDaHaste * 2], referencia: [1, 0, 0] },
    facePerfil: { forma: 'plano', papel: 'recebe', ponto: [0, yDoParafuso, 0], normal: [-1, 0, 0], extensao: [t.largura, t.oblongoComprimento], referencia: [0, 1, 0] },
  };
}

export function gerarPassos(t = TABELA) {
  const { contorno, ro, yDoParafuso, soquete } = derivar(t);
  const b = t.borracha;
  const passos = [];
  /* Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v: o contorno entra com o y trocado de sinal e na ordem inversa. */
  passos.push(['extrusao', { origemId: ID.l, eixo: 'z', altura: m(t.largura), perfil: contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(-t.largura / 2)] }]);
  /* O furo da haste: cilindro em y atravessando o pé. */
  passos.push(['cilindro', {
    origemId: ID.furoHaste, raio: m(t.furoDaHaste / 2), altura: m(t.espessura + 2), lados: t.lados,
    em: [m(t.centroDoFuroDaHaste), m(b - 1), 0],
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

  /* A borracha preta fina sob o pé, do fim da dobra à ponta, com o furo da haste. */
  passos.push(['extrusao', {
    origemId: ID.borracha, altura: m(b), segmentosArco: t.lados / 4,
    perfil: { retangulo: { largura: m(t.pernaDaHaste - ro), profundidade: m(t.largura), centro: [m((ro + t.pernaDaHaste) / 2), 0] } },
    furos: [{ circulo: { raio: m(t.furoDaHaste / 2), centro: [m(t.centroDoFuroDaHaste), 0] } }],
  }]);
  const selBorracha = { origem: { op: 'extrusao', id: ID.borracha } };
  passos.push(['parte', { nome: 'borracha', sel: selBorracha }], ['material', { usa: 'borracha', sel: selBorracha }]);

  /* O parafuso allen em x: da placa-porca, no rasgo do perfil (x negativo), pela perna e pelo oblongo até a cabeça, dentro da face de dentro
     da perna. A haste vai até a metade da cabeça, para o `unir` fechar um sólido só e o soquete ter fundo. */
  const u = m(-yDoParafuso);
  const xCabeca = t.espessura;
  const xPlaca = -t.fundoDoRasgoDoPerfil;
  passos.push(['extrusao', {
    origemId: ID.haste, eixo: 'x', altura: m(xCabeca + t.alturaDaCabeca / 2 - xPlaca), segmentosArco: t.lados / 4,
    perfil: { circulo: { raio: m(t.raioDoParafuso), centro: [u, 0] } }, em: [m(xPlaca), 0, 0],
  }]);
  passos.push(['extrusao', {
    origemId: ID.cabeca, eixo: 'x', altura: m(t.alturaDaCabeca), segmentosArco: t.lados / 4,
    perfil: { circulo: { raio: m(t.raioDaCabeca), centro: [u, 0] } }, furos: [soquete.map(([p, q]) => [u + m(p), m(q)])],
    em: [m(xCabeca), 0, 0],
  }]);
  passos.push(['extrusao', {
    origemId: ID.placa, eixo: 'x', altura: m(t.placaEspessura),
    perfil: { retangulo: { largura: m(t.placaLado), profundidade: m(t.placaLado), centro: [u, 0] } }, em: [m(xPlaca), 0, 0],
  }]);
  passos.push(['unir', { origemId: ID.parafuso, solidos: [{ origem: { op: 'extrusao', id: ID.haste } }, { origem: { op: 'extrusao', id: ID.cabeca } }, { origem: { op: 'extrusao', id: ID.placa } }] }]);
  const selP = { origem: { op: 'unir', id: ID.parafuso } };
  passos.push(['parte', { nome: 'parafuso', sel: selP }], ['material', { usa: 'inox', sel: selP }]);
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/suporte-l', desc: 'suporte em L de alumínio de 85 mm por 50 mm, chapa de 5 mm com faces estriadas, borracha preta sob o pé, rasgo oblongo na perna e parafuso allen com placa-porca quadrada' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'face de baixo da borracha, no canto de fora do L, no meio da largura; y para cima (perna do perfil), o pé ao longo de +x, a largura em z' },
  PLANO: {
    objeto: 'suporte em L de alumínio de 5 mm, 85 mm de altura e 50 de largura, faces estriadas, com borracha preta sob o pé, rasgo oblongo na perna e parafuso allen com placa-porca quadrada',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'altura total do L, a perna do perfil', milimetros: 85 },
    partes: [
      { nome: 'corpo', forma: 'cantoneira de alumínio em L, chapa de 5 mm, 50 mm de largura: perna de 85 mm com as duas faces estriadas e oblongo vertical de 8,5 por 30 mm no alto; pé de 45 mm com furo de 10,5 mm; dobra de dentro arredondada', tecnica: 'extrusão de eixo z do contorno em L com dobra em arco e frisos nas faces; furo redondo e oblongo por subtrair' },
      { nome: 'borracha', forma: 'borracha preta de 1,5 mm sob o pé, com o mesmo furo da haste', tecnica: 'extrusão de retângulo com furo circular' },
      { nome: 'parafuso', forma: 'parafuso allen de inox M8 em x: cabeça cilíndrica de 13 mm com soquete sextavado na face de dentro da perna, haste no oblongo (metade de cima) e placa-porca quadrada de 9 mm do lado do perfil', tecnica: 'unir de haste, cabeça allen (círculo com furo sextavado) e placa-porca (extrusão de quadrado)' },
    ],
    criteriosDeReprovacao: [
      'espessura diferente de 5 mm, largura diferente de 50 mm ou altura total do L diferente de 85 mm',
      'perna do perfil sem as faces estriadas, ou ângulo diferente de 90 graus',
      'oblongo ausente, redondo, ou furo da haste ausente no pé; furo que não atravessa a chapa',
      'sem a borracha preta sob o pé',
      'parafuso fora do oblongo, na metade de baixo dele, ou cabeça sextavada por fora, e não allen',
      'sem a placa-porca quadrada do lado do perfil',
      'canto da dobra vivo, sem o arredondamento',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'borracha'], motivo: 'a borracha fica sob o pé, rente à face de baixo dele' },
    { par: ['corpo', 'parafuso'], motivo: 'a cabeça do parafuso assenta na face de dentro da perna' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
