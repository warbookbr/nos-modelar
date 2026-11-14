/* junta-do-cabecote — junta de cabeçote multicamada de aço para motor de quatro cilindros em linha, peça inteira.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo da camada de aço de baixo), a junta deitada no plano xz,
 * com o comprimento do motor em x e a largura em z. Origem em x = 0 e z = 0, no meio do conjunto dos quatro cilindros.
 *
 * A chapa é uma extrusão em y (o padrão) de um contorno por trechos retos com concordâncias, com as reentrâncias entre os
 * cilindros e uma orelha em cada canto, e com os furos declarados (cilindros, parafusos, pino-guia, água e óleo). Os frisos são
 * anéis e uma moldura de relevo de 0,3 a 0,5 mm sobre a face de cima da chapa, assentados na face dela (vão 0) para que encostem de
 * verdade. A camada exposta é uma placa fina sob a chapa que sai dela nas duas pontas, com a aba de identificação à esquerda.
 */

export const TABELA = {
  /* Escala do alvo. */
  entreCentros: 88,
  furoCilindro: 82,
  chapaEspessura: 1.2,
  /* Contorno: semicomprimento e semilargura do corpo, e o raio das concordâncias de todos os cantos. */
  semiComprimento: 196,
  semiLargura: 70,
  cantoRaio: 3,
  /* Orelhas dos cantos: quanto passam do corpo em x e em z, e o trecho do corpo que ocupam em x e em z. */
  orelhaSobraX: 9,
  orelhaSobraZ: 8,
  orelhaX: 10,
  orelhaZ: 8,
  pinoGuiaFuro: 7,
  /* Reentrâncias da borda longa, centradas nos cilindros: largura e profundidade. */
  reentranciaLargura: 30,
  reentranciaProfundidade: 8,
  /* Furos de parafuso do cabeçote: cinco de cada lado, passo em x, posição em z e diâmetro. */
  parafusoPasso: 88,
  parafusoZ: 52,
  parafusoFuro: 11,
  /* Água e óleo: redondos entre os cilindros (z e raio), redondos junto às reentrâncias, e ovais (z, comprimento, largura, x). */
  aguaMeioZ: 22,
  aguaMeioRaio: 3,
  aguaBordaZ: 51,
  aguaBordaRaio: 3.5,
  ovalZ: 50,
  ovalComprimento: 14,
  ovalLargura: 6,
  ovalX1: 66,
  ovalX2: 110,
  /* Frisos: anel de vedação e vinco em volta de cada cilindro (raio interno e externo de cada um), altura de cada um, e quanto
     assentam na chapa (0, vão zero). */
  anelInterno: 41.4,
  anelExterno: 42.8,
  anelAltura: 0.5,
  vincoInterno: 43.1,
  vincoExterno: 43.8,
  vincoAltura: 0.3,
  frisoAfundado: 0,
  /* Friso de água: folga do furo, largura do anel e altura. */
  aguaFrisoFolga: 0.4,
  aguaFrisoLargura: 1,
  aguaFrisoAltura: 0.3,
  /* Moldura do contorno: recuo da borda, largura e altura. */
  molduraRecuo: 0.6,
  molduraLargura: 0.9,
  molduraAltura: 0.3,
  /* Camada exposta: espessura, quanto entra na chapa, e as pontas (semilargura, quanto sai da chapa, quanto entra sob ela). */
  camadaEspessura: 0.6,
  camadaEntra: 0,
  pontaSemiLargura: 30,
  pontaSai: 8,
  pontaSob: 15,
  /* Aba de identificação na ponta esquerda: semilargura e comprimento além da ponta. */
  abaSemiLargura: 12,
  abaComprimento: 8,
  segmentosArco: 12,
};

const m = (mm) => mm / 1000;

export function derivar(t = TABELA) {
  const R = t.furoCilindro / 2;
  const cil = [-1.5, -0.5, 0.5, 1.5].map((k) => k * t.entreCentros);
  const yChapaBase = t.camadaEspessura;
  const yChapaTopo = yChapaBase + t.chapaEspessura;
  const yCamadaTopo = t.camadaEspessura + t.camadaEntra;
  const L = t.semiComprimento;
  const W = t.semiLargura;
  const rn = t.reentranciaLargura / 2;
  const prof = t.reentranciaProfundidade;

  /* Contorno em mm (x, z): a borda de cima (z positivo) da esquerda para a direita com as reentrâncias, a orelha de cada
     canto, e a volta espelhada. */
  const bordaCima = [];
  for (const c of cil) {
    bordaCima.push([c - rn, W], [c - rn, W - prof], [c + rn, W - prof], [c + rn, W]);
  }
  const orelhaDireita = [
    [L - t.orelhaX, W], [L - t.orelhaX, W + t.orelhaSobraZ], [L + t.orelhaSobraX, W + t.orelhaSobraZ],
    [L + t.orelhaSobraX, W - t.orelhaZ], [L, W - t.orelhaZ],
  ];
  const espelhoX = (p) => [-p[0], p[1]];
  const espelhoZ = (p) => [p[0], -p[1]];
  const cima = [...orelhaDireita.map(espelhoX).reverse(), ...bordaCima, ...orelhaDireita];
  const baixo = [...cima].reverse().map(espelhoZ);
  const contorno = [...cima, ...baixo];

  /* Furos do parafuso: x em -176, -88, 0, 88, 176, nos dois lados. */
  const parafusos = [];
  for (const k of [-2, -1, 0, 1, 2]) for (const s of [-1, 1]) parafusos.push([k * t.parafusoPasso, s * t.parafusoZ]);
  const pinos = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pinos.push([sx * L, sz * W]);
  /* Água e óleo: entre os cilindros (mesmos x dos parafusos) e junto às reentrâncias (x nos centros dos cilindros). */
  const aguaMeio = [];
  for (const k of [-2, -1, 0, 1, 2]) for (const s of [-1, 1]) aguaMeio.push([k * t.parafusoPasso, s * t.aguaMeioZ]);
  const aguaBorda = [];
  for (const c of cil) for (const s of [-1, 1]) aguaBorda.push([c, s * t.aguaBordaZ]);
  const ovais = [];
  for (const x of [-t.ovalX2, -t.ovalX1, t.ovalX1, t.ovalX2]) for (const s of [-1, 1]) ovais.push([x, s * t.ovalZ]);

  return { R, cil, yChapaBase, yChapaTopo, yCamadaTopo, contorno, parafusos, pinos, aguaMeio, aguaBorda, ovais };
}

/* Identidade estrutural dos passos. */
const ID = {
  chapa: 1,
  anel: 100, vinco: 110, aguaMeio: 120, aguaBorda: 140, molduraFora: 161, molduraDentro: 162, molduraAro: 163,
  camada: 200,
};

export const ALIASES = [
  ['chapa', { origem: { op: 'extrusao', id: ID.chapa } }],
  ['frisos', { unir: [
    ...[0, 1, 2, 3].flatMap((i) => [
      { origem: { op: 'extrusao', id: ID.anel + i } },
      { origem: { op: 'extrusao', id: ID.vinco + i } },
    ]),
    ...Array.from({ length: 10 }, (_, i) => ({ origem: { op: 'extrusao', id: ID.aguaMeio + i } })),
    ...Array.from({ length: 8 }, (_, i) => ({ origem: { op: 'extrusao', id: ID.aguaBorda + i } })),
    { origem: { op: 'subtrair', id: ID.molduraAro } },
  ] }],
  ['camadaExposta', { unir: [
    { origem: { op: 'extrusao', id: ID.camada } },
    { origem: { op: 'extrusao', id: ID.camada + 1 } },
  ] }],
];

export function gerarPassos(t = TABELA) {
  const G = derivar(t);
  const passos = [];
  /* Na extrusão em y, o ponto (x, z) em mm vira [u, v] = [x, z] em metro. */
  const uv = (p) => [m(p[0]), m(p[1])];
  const circ = (raio, c) => ({ circulo: { raio: m(raio), centro: uv(c) } });

  /* Contorno da chapa: cada vértice ganha a concordância de raio declarado. */
  const [p0, ...resto] = G.contorno;
  const trechos = [];
  for (const p of resto) trechos.push({ reto: uv(p) }, { concordancia: m(t.cantoRaio) });
  trechos.push({ reto: uv(p0) }, { concordancia: m(t.cantoRaio) });
  const contornoObj = { inicio: uv(p0), trechos };

  const furos = [
    ...G.cil.map((c) => circ(G.R, [c, 0])),
    ...G.parafusos.map((c) => circ(t.parafusoFuro / 2, c)),
    ...G.pinos.map((c) => circ(t.pinoGuiaFuro / 2, c)),
    ...G.aguaMeio.map((c) => circ(t.aguaMeioRaio, c)),
    ...G.aguaBorda.map((c) => circ(t.aguaBordaRaio, c)),
    ...G.ovais.map((c) => ({ retangulo: { largura: m(t.ovalComprimento), profundidade: m(t.ovalLargura), centro: uv(c), cantos: m(t.ovalLargura / 2 - 0.1) } })),
  ];
  passos.push(['extrusao', {
    origemId: ID.chapa, altura: m(t.chapaEspessura), em: [0, m(G.yChapaBase), 0],
    perfil: { contorno: contornoObj }, furos, segmentosArco: t.segmentosArco,
  }]);

  /* Frisos: a base assenta exatamente na face de cima da chapa. */
  const yF = G.yChapaTopo - t.frisoAfundado;
  const anel = (id, raioExt, raioInt, c, altura) => passos.push(['extrusao', {
    origemId: id, altura: m(altura + t.frisoAfundado), em: [0, m(yF), 0],
    perfil: circ(raioExt, c), furos: [circ(raioInt, c)], segmentosArco: t.segmentosArco,
  }]);
  G.cil.forEach((c, i) => {
    anel(ID.anel + i, t.anelExterno, t.anelInterno, [c, 0], t.anelAltura);
    anel(ID.vinco + i, t.vincoExterno, t.vincoInterno, [c, 0], t.vincoAltura);
  });
  G.aguaMeio.forEach((c, i) => anel(ID.aguaMeio + i,
    t.aguaMeioRaio + t.aguaFrisoFolga + t.aguaFrisoLargura, t.aguaMeioRaio + t.aguaFrisoFolga, c, t.aguaFrisoAltura));
  G.aguaBorda.forEach((c, i) => anel(ID.aguaBorda + i,
    t.aguaBordaRaio + t.aguaFrisoFolga + t.aguaFrisoLargura, t.aguaBordaRaio + t.aguaFrisoFolga, c, t.aguaFrisoAltura));

  /* Moldura do contorno: a placa recuada da borda menos a placa recuada mais um pouco, o que deixa uma faixa. */
  const placa = (id, recuo, altura, base) => passos.push(['extrusao', {
    origemId: id, altura: m(altura), em: [0, m(base), 0],
    perfil: { contorno: contornoObj }, deslocar: { para: 'dentro', distancia: m(recuo), canto: 'esquadria' },
    segmentosArco: t.segmentosArco,
  }]);
  placa(ID.molduraFora, t.molduraRecuo, t.molduraAltura + t.frisoAfundado, yF);
  placa(ID.molduraDentro, t.molduraRecuo + t.molduraLargura, t.molduraAltura + t.frisoAfundado + 2, yF - 1);
  passos.push(['subtrair', {
    origemId: ID.molduraAro,
    solidos: [{ origem: { op: 'extrusao', id: ID.molduraFora } }, { origem: { op: 'extrusao', id: ID.molduraDentro } }],
  }]);

  /* Camada exposta: duas placas sob a chapa, uma por ponta; a da esquerda leva a aba de identificação. */
  const L = t.semiComprimento;
  const sw = t.pontaSemiLargura;
  const dir = [[L - t.pontaSob, -sw], [L + t.pontaSai, -sw], [L + t.pontaSai, sw], [L - t.pontaSob, sw]];
  const aw = t.abaSemiLargura;
  const esq = [
    [-(L - t.pontaSob), sw], [-(L + t.pontaSai), sw], [-(L + t.pontaSai), aw], [-(L + t.pontaSai + t.abaComprimento), aw],
    [-(L + t.pontaSai + t.abaComprimento), -aw], [-(L + t.pontaSai), -aw], [-(L + t.pontaSai), -sw], [-(L - t.pontaSob), -sw],
  ];
  for (const [i, pts] of [dir, esq].entries()) {
    passos.push(['extrusao', {
      origemId: ID.camada + i, altura: m(G.yCamadaTopo), em: [0, 0, 0], perfil: pts.map(uv),
    }]);
  }

  for (const [nome, material] of [['chapa', 'chapaPreta'], ['frisos', 'frisoMetal'], ['camadaExposta', 'acoClaro']]) {
    passos.push(['parte', { nome, sel: { alias: nome } }]);
    passos.push(['material', { usa: material, sel: { alias: nome } }]);
    passos.push(['liso', { angulo: 35, sel: { alias: nome } }]);
  }
  return passos;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(t = TABELA) {
  const G = derivar(t);
  const L = t.semiComprimento;
  const W = t.semiLargura;
  return [
    { nome: 'chapa, topo no canto da orelha', parte: 'chapa', medida: 'maximo', em: [L + t.orelhaSobraX, G.yChapaTopo, W + t.orelhaSobraZ], toleranciaMm: 0.5 },
    { nome: 'camada exposta, face de baixo na aba', parte: 'camadaExposta', medida: 'minimo', em: [-(L + t.pontaSai + t.abaComprimento), 0, -t.pontaSemiLargura], toleranciaMm: 0.5 },
    { nome: 'frisos, topo do anel e canto da moldura na orelha', parte: 'frisos', medida: 'maximo', em: [L + t.orelhaSobraX - t.molduraRecuo, G.yChapaTopo + t.anelAltura, W + t.orelhaSobraZ - t.molduraRecuo], toleranciaMm: 0.5 },
  ];
}

const receita = {
  meta: { nome: 'junta-do-cabecote', desc: 'junta de cabeçote multicamada de aço, motor de quatro cilindros em linha, 88 mm entre centros, furo de 82 mm, chapa de 1,2 mm' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    chapaPreta: { cor: '#1c1c1f', metalicidade: 0.3, aspereza: 0.7 },
    frisoMetal: { cor: '#a3a8ae', metalicidade: 0.9, aspereza: 0.35 },
    acoClaro: { cor: '#c9cdd1', metalicidade: 0.9, aspereza: 0.4 },
  },
  TOPO: { origem: 'meio do conjunto dos quatro cilindros; y para cima, o chão sob a camada de baixo; comprimento do motor em x e largura em z' },
  PLANO: {
    objeto: 'junta de cabeçote multicamada de aço para motor de quatro cilindros em linha, de uns 400 por 140 mm e 1,2 mm de chapa, deitada no plano xz',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'distância entre os centros dos cilindros, com furo de 82 mm', milimetros: 88 },
    partes: [
      {
        nome: 'chapa',
        forma: 'chapa preta de 1,2 mm com contorno recortado em reentrâncias e orelha com furo de pino-guia em cada canto; quatro furos de cilindro de 82 mm unidos por pontes, dez de parafuso de 11 mm, furos de água e óleo redondos e ovais',
        tecnica: 'extrusão em y de contorno por trechos retos com concordâncias e furos de círculo e de retângulo de cantos redondos, liso com angulo',
      },
      {
        nome: 'frisos',
        forma: 'relevo de 0,3 a 0,5 mm sobre a chapa: anel e vinco em volta de cada cilindro, anéis em volta dos furos de água e moldura acompanhando o contorno externo',
        tecnica: 'extrusões de anel (círculo com furo) assentadas na face da chapa, e moldura por subtrair de duas placas do contorno recuadas por deslocar',
      },
      {
        nome: 'camadaExposta',
        forma: 'placa fina de aço claro sob a chapa que sai dela num degrau nas duas pontas, com uma aba de identificação mais estreita na ponta esquerda',
        tecnica: 'extrusão em y de polígono, uma por ponta, unidas',
      },
    ],
    criteriosDeReprovacao: [
      'chapa retangular sem o contorno recortado',
      'menos de quatro cilindros ou cilindros sem anel',
      'furos de parafuso ausentes',
      'chapa com mais de 2 mm',
    ],
  },
  contatos: [
    { par: ['chapa', 'frisos'], motivo: 'os frisos assentam na face de cima da chapa, assentados na face, sem invadir os furos' },
    { par: ['chapa', 'camadaExposta'], motivo: 'a camada de baixo está sob a chapa e sai dela nas pontas' },
  ],
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
