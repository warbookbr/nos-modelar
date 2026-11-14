/* radiador: radiador de alumínio de fluxo cruzado, núcleo de 600 x 400 x 40 mm entre dois tanques de 50 mm, peça inteira. Referencial do
 * acervo: Y para cima, chão em y 0 (a ponta dos pinos de fixação embaixo dos tanques), centro do núcleo em x 0 e z 0, tanque do gargalo
 * em -x, tanque dos bocais em +x, os bocais saem para trás (-z). A TABELA está em milímetro e a conversão para metro acontece só em `m()`.
 *
 * Seis partes:
 * - nucleo: 40 camadas iguais de 10 mm (arranja linear de uma extrusão em z). Cada camada é uma placa 600 x 10 vazada por uma fileira de
 *   janelas; o que sobra é o tubo achatado (1 mm embaixo e 1 mm em cima, 2 mm de altura) e as lâminas verticais finas entre as janelas.
 * - placas: duas placas coletoras verticais (extrusão) e duas chapas em U, em cubos unidos, uma em cima e outra embaixo do núcleo.
 * - tanqueEsquerdo: caixa extrudada de quinas arredondadas, unida ao gargalo de enchimento com tampa (lathe) e ao tubo de respiro curvo (loft).
 * - tanqueDireito: caixa extrudada de quinas arredondadas.
 * - bocais: dois tubos de 32 mm (lathe em z) com rebordo na ponta e o bujão de dreno sextavado (lathe de seis lados).
 * - suportes: dois pinos com bucha de borracha (lathe) e quatro abas com furo (extrusão em z).
 */
export const TABELA = {
  base: 20, /* y da face de baixo dos tanques: a altura dos pinos */
  nucleo: { largura: 600, altura: 400, prof: 40, tubos: 40, passo: 10, tubo: 2, borda: 5, laminaPasso: 7.5, laminaEsp: 0.6 },
  placa: { esp: 4 }, /* solda por encosto: núcleo, placa e tanque se tocam nas faces, sem sobreposição */
  chapa: { esp: 2, aba: 6, abaEsp: 1.5 },
  tanque: { largura: 50, prof: 46, canto: 8, segmentosCanto: 6, aresta: 3, paineis: 3 },
  gargalo: { raio: 16, topo: 18, tampaRaio: 22, tampaAltura: 8, canto: 3, penetra: 1.5, lados: 40 },
  respiro: { raio: 3, reta: 2, curva: 3, saida: 6.5, secoes: 8, lados: 10 },
  bocal: { raio: 16, comprimento: 60, rebordoRaio: 18.5, rebordoLargura: 4, rebordoRecuo: 8, alturaDoTanque: 45, lados: 32 },
  dreno: { circunraio: 6.5, altura: 9, z: -12 },
  pino: { raio: 4, z: 12, bucha: { interno: 3.8, externo: 9, de: 8, altura: 12 }, lados: 24 },
  aba: { saliencia: 10, altura: 24, esp: 3, furo: 3, alturaDoTanque: 60 },
};

export function derivar(t = TABELA) {
  const n = t.nucleo;
  const y0 = t.base;
  const yNucleo = y0 + t.chapa.esp;
  const yTopoNucleo = yNucleo + n.altura;
  const yTopo = yTopoNucleo + t.chapa.esp;
  const xPlacaIn = n.largura / 2;
  const xPlacaOut = xPlacaIn + t.placa.esp;
  const xTanqueIn = xPlacaOut;
  const xTanqueOut = xTanqueIn + t.tanque.largura;
  const xc = (xTanqueIn + xTanqueOut) / 2;
  /* camada: janelas em fileira, de modo que 1 mm sobre e 1 mm sob cada janela são o tubo achatado */
  const livre = n.largura - 2 * n.borda;
  const janelas = Math.floor((livre + n.laminaEsp) / n.laminaPasso);
  const larguraJanela = n.laminaPasso - n.laminaEsp;
  const ocupado = janelas * n.laminaPasso - n.laminaEsp;
  const x0 = -ocupado / 2 + larguraJanela / 2;
  const centros = [];
  for (let i = 0; i < janelas; i++) centros.push(x0 + i * n.laminaPasso);
  const alturaJanela = n.passo - n.tubo;
  /* respiro: quarto de arco que sai da lateral do gargalo, em x negativo, e desce até o topo do tanque esquerdo */
  const r = t.respiro;
  const gx = -xc;
  const xi = gx - t.gargalo.raio + 1.5; /* começa dentro do gargalo */
  const yi = yTopo + r.saida;
  const secoes = [[xi + 1, yi, 0], [xi, yi, 0], [xi - r.reta, yi, 0]];
  const cx = xi - r.reta, cy = yi - r.curva;
  for (let k = 1; k <= r.secoes; k++) {
    const a = (Math.PI / 2) * (k / r.secoes);
    secoes.push([cx - r.curva * Math.sin(a), cy + r.curva * Math.cos(a), 0]);
  }
  const fim = secoes[secoes.length - 1];
  secoes.push([fim[0], yTopo - 1.5, 0], [fim[0], yTopo - 2.5, 0]);
  const gargalo = [
    [0, yTopo - t.gargalo.penetra], [t.gargalo.raio, yTopo - t.gargalo.penetra],
    [t.gargalo.raio, yTopo + t.gargalo.topo - t.gargalo.tampaAltura],
    [t.gargalo.tampaRaio, yTopo + t.gargalo.topo - t.gargalo.tampaAltura],
    [t.gargalo.tampaRaio, yTopo + t.gargalo.topo, t.gargalo.canto], [0, yTopo + t.gargalo.topo],
  ];
  const b = t.bocal;
  const bocal = [
    [0, 0], [b.raio, 0], [b.raio, b.comprimento - b.rebordoRecuo - b.rebordoLargura],
    [b.rebordoRaio, b.comprimento - b.rebordoRecuo - b.rebordoLargura], [b.rebordoRaio, b.comprimento - b.rebordoRecuo],
    [b.raio, b.comprimento - b.rebordoRecuo], [b.raio, b.comprimento], [0, b.comprimento],
  ];
  const d = t.dreno;
  const bujao = [[0, y0 - d.altura], [d.circunraio, y0 - d.altura], [d.circunraio, y0], [0, y0]];
  const p = t.pino;
  const pino = [[0, 0], [p.raio - 1, 0], [p.raio, 1], [p.raio, y0], [0, y0]];
  const bucha = [[p.bucha.interno, p.bucha.de], [p.bucha.externo, p.bucha.de], [p.bucha.externo, p.bucha.de + p.bucha.altura], [p.bucha.interno, p.bucha.de + p.bucha.altura], [p.bucha.interno, p.bucha.de]];
  return {
    y0, yNucleo, yTopoNucleo, yTopo, xPlacaIn, xPlacaOut, xTanqueIn, xTanqueOut, xc,
    janelas, larguraJanela, alturaJanela, centros, secoes, gargalo, bocal, bujao, pino, bucha,
  };
}

const m = (mm) => mm / 1000;
const ID = {
  camada: 1, camadas: 2, placaE: 10, placaD: 11, chapaBaseWeb: 12, chapaBaseA: 13, chapaBaseB: 14, chapaBase: 15,
  chapaTopoWeb: 16, chapaTopoA: 17, chapaTopoB: 18, chapaTopo: 19,
  tanqueE: 30, gargalo: 31, respiro: 32, tanqueEsq: 33, tanqueD: 40, arrD: 41, arrE: 43,
  bocalEntrada: 50, bocalSaida: 51, bujao: 52,
  pinoE: 60, pinoD: 61, buchaE: 62, buchaD: 63, abaE1: 64, abaE2: 65, abaD1: 66, abaD2: 67,
};

const nomesCamadas = (t) => Array.from({ length: t.nucleo.tubos - 1 }, (_, i) => `camada${String(i + 2).padStart(2, '0')}`);
const sel = (op, id) => ({ origem: { op, id } });

export const ALIASES = (() => {
  const t = TABELA;
  const camadas = [sel('extrusao', ID.camada), ...nomesCamadas(t).map((nome) => ({ origem: { op: 'arranja', id: ID.camadas, de: { op: 'extrusao', id: ID.camada }, nome } }))];
  return [
    ['nucleoInteiro', { unir: camadas }],
    ['placasInteiras', { unir: [sel('extrusao', ID.placaE), sel('extrusao', ID.placaD), sel('unir', ID.chapaBase), sel('unir', ID.chapaTopo)] }],
    ['bocaisInteiros', { unir: [sel('lathe', ID.bocalEntrada), sel('lathe', ID.bocalSaida), sel('lathe', ID.bujao)] }],
    ['suportesInteiros', { unir: [sel('lathe', ID.pinoE), sel('lathe', ID.pinoD), sel('lathe', ID.buchaE), sel('lathe', ID.buchaD),
      sel('extrusao', ID.abaE1), sel('extrusao', ID.abaE2), sel('extrusao', ID.abaD1), sel('extrusao', ID.abaD2)] }],
    ['tanqueDireitoInteiro', { unir: [sel('extrusao', ID.tanqueD), sel('arredondarAresta', ID.arrD), sel('arredondarAresta', ID.arrD + 1)] }],
    ['tanqueEsquerdoCaixa', { unir: [sel('extrusao', ID.tanqueE), sel('arredondarAresta', ID.arrE), sel('arredondarAresta', ID.arrE + 1)] }],
    ['buchas', { unir: [sel('lathe', ID.buchaE), sel('lathe', ID.buchaD)] }],
  ];
})();

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const n = t.nucleo;
  const P = [];
  const pf = (perfil) => perfil.map(([r, y, c]) => (c === undefined ? [m(r), m(y)] : [m(r), m(y), m(c)]));

  /* nucleo: camada de 10 mm vazada por janelas, 40 cópias empilhadas */
  P.push(['extrusao', {
    origemId: ID.camada, eixo: 'z', perfil: { retangulo: { largura: m(n.largura), profundidade: m(n.passo) } },
    furos: D.centros.map((x) => ({ retangulo: { largura: m(D.larguraJanela), profundidade: m(D.alturaJanela), centro: [m(x), 0] } })),
    altura: m(n.prof), em: [0, m(D.yNucleo + n.passo / 2), m(-n.prof / 2)],
  }]);
  P.push(['arranja', {
    origemId: ID.camadas, derivaDe: { op: 'extrusao', id: ID.camada }, sel: sel('extrusao', ID.camada),
    modo: 'linear', total: n.tubos, d: [0, m(n.passo), 0], nomes: nomesCamadas(t),
  }]);
  const sN = { alias: 'nucleoInteiro' };
  P.push(['parte', { nome: 'nucleo', sel: sN }], ['material', { usa: 'aluminio', sel: sN }]);

  /* placas: duas coletoras e duas chapas em U */
  const cx = (D.xPlacaIn + D.xPlacaOut) / 2;
  const alturaTanque = D.yTopo - D.y0;
  for (const [id, sinal] of [[ID.placaE, -1], [ID.placaD, 1]]) {
    P.push(['extrusao', {
      origemId: id, perfil: { retangulo: { largura: m(t.placa.esp), profundidade: m(t.tanque.prof), centro: [m(sinal * cx), 0] } },
      altura: m(alturaTanque), em: [0, m(D.y0), 0],
    }]);
  }
  const compChapa = 2 * D.xPlacaIn;
  const profChapa = n.prof + 2 * t.chapa.abaEsp;
  const chapa = (web, a, b, uni, yWeb, yAba) => {
    P.push(['cubo', { origemId: web, larg: m(compChapa), alt: m(t.chapa.esp), prof: m(profChapa), em: [0, m(yWeb), 0] }]);
    for (const [id, s] of [[a, 1], [b, -1]]) {
      P.push(['cubo', { origemId: id, larg: m(compChapa), alt: m(t.chapa.aba), prof: m(t.chapa.abaEsp), em: [0, m(yAba), m(s * (n.prof / 2 + t.chapa.abaEsp / 2))] }]);
    }
    P.push(['unir', { origemId: uni, solidos: [sel('cubo', web), sel('cubo', a), sel('cubo', b)] }]);
  };
  chapa(ID.chapaBaseWeb, ID.chapaBaseA, ID.chapaBaseB, ID.chapaBase, D.y0, D.yNucleo);
  chapa(ID.chapaTopoWeb, ID.chapaTopoA, ID.chapaTopoB, ID.chapaTopo, D.yTopoNucleo, D.yTopoNucleo - t.chapa.aba);
  const sP = { alias: 'placasInteiras' };
  P.push(['parte', { nome: 'placas', sel: sP }], ['material', { usa: 'aluminio', sel: sP }]);

  /* tanques */
  const tq = t.tanque;
  const arredonda = (id, base) => ['topo', 'fundo'].forEach((tampa, k) => P.push(['arredondarAresta', { origemId: base + k, de: { op: 'extrusao', id, tampa }, aresta: 0, raio: m(tq.aresta), paineis: tq.paineis, cadeia: true }]));
  const caixa = (id, sinal) => P.push(['extrusao', {
    origemId: id, perfil: { retangulo: { largura: m(tq.largura), profundidade: m(tq.prof), centro: [m(sinal * D.xc), 0], cantos: m(tq.canto) } },
    segmentosArco: tq.segmentosCanto, altura: m(alturaTanque), em: [0, m(D.y0), 0],
  }]);
  caixa(ID.tanqueE, -1);
  arredonda(ID.tanqueE, ID.arrE);
  P.push(['lathe', { origemId: ID.gargalo, lados: t.gargalo.lados, perfil: pf(D.gargalo), em: [m(-D.xc), 0, 0] }]);
  P.push(['loft', { origemId: ID.respiro, lados: t.respiro.lados, secoes: D.secoes.map(([x, y, z], i, todas) => ({ pos: [m(x), m(y), m(z)], raio: i === 0 || i === todas.length - 1 ? 0 : m(t.respiro.raio) })) }]);
  const sE = sel('unir', ID.tanqueEsq);
  P.push(['unir', { origemId: ID.tanqueEsq, solidos: [{ alias: 'tanqueEsquerdoCaixa' }, sel('lathe', ID.gargalo), sel('loft', ID.respiro)] }]);
  P.push(['parte', { nome: 'tanqueEsquerdo', sel: sE }], ['material', { usa: 'aluminio', sel: sE }]);
  caixa(ID.tanqueD, 1);
  arredonda(ID.tanqueD, ID.arrD);
  const sD = { alias: 'tanqueDireitoInteiro' };
  P.push(['parte', { nome: 'tanqueDireito', sel: sD }], ['material', { usa: 'aluminio', sel: sD }]);

  /* bocais e dreno */
  const zb = -tq.prof / 2;
  const bocal = (id, y) => P.push(['lathe', { origemId: id, eixo: 'z', lados: t.bocal.lados, perfil: pf(D.bocal.map(([r, z]) => [r, -z])), em: [m(D.xc), m(y), m(zb)] }]);
  bocal(ID.bocalEntrada, D.yTopo - t.bocal.alturaDoTanque);
  bocal(ID.bocalSaida, D.y0 + t.bocal.alturaDoTanque);
  P.push(['lathe', { origemId: ID.bujao, lados: 6, perfil: pf(D.bujao), em: [m(-D.xc), 0, m(t.dreno.z)] }]);
  const sB = { alias: 'bocaisInteiros' };
  P.push(['parte', { nome: 'bocais', sel: sB }], ['material', { usa: 'aluminio', sel: sB }]);

  /* suportes */
  for (const [idP, idB, s] of [[ID.pinoE, ID.buchaE, -1], [ID.pinoD, ID.buchaD, 1]]) {
    P.push(['lathe', { origemId: idP, lados: t.pino.lados, perfil: pf(D.pino), em: [m(s * D.xc), 0, m(t.pino.z)] }]);
    P.push(['lathe', { origemId: idB, lados: t.pino.lados, perfil: pf(D.bucha), em: [m(s * D.xc), 0, m(t.pino.z)] }]);
  }
  const a = t.aba;
  const xAba = (s) => s * (D.xTanqueOut + a.saliencia / 2);
  for (const [id, s, y] of [[ID.abaE1, -1, a.alturaDoTanque], [ID.abaE2, -1, alturaTanque - a.alturaDoTanque], [ID.abaD1, 1, a.alturaDoTanque], [ID.abaD2, 1, alturaTanque - a.alturaDoTanque]]) {
    P.push(['extrusao', {
      origemId: id, eixo: 'z', perfil: { retangulo: { largura: m(a.saliencia), profundidade: m(a.altura), centro: [m(xAba(s)), 0] } },
      furos: [{ circulo: { raio: m(a.furo), centro: [m(xAba(s)), 0] } }],
      altura: m(a.esp), em: [0, m(D.y0 + y), m(-a.esp / 2)],
    }]);
  }
  const sS = { alias: 'suportesInteiros' };
  P.push(['parte', { nome: 'suportes', sel: sS }], ['material', { usa: 'aco', sel: sS }], ['material', { usa: 'borracha', sel: { alias: 'buchas' } }]);
  return P;
}

export const CONTATOS = [
  { par: ['nucleo', 'placas'], motivo: 'as pontas dos tubos encostam na face interna de cada placa coletora (x 300), sem sobreposição, e as chapas em U assentam sobre a camada de cima e de baixo do núcleo' },
  { par: ['placas', 'tanqueEsquerdo'], motivo: 'o tanque esquerdo é soldado na face externa da placa coletora esquerda, por encosto na face, sem sobreposição' },
  { par: ['placas', 'tanqueDireito'], motivo: 'o tanque direito é soldado na face externa da placa coletora direita, por encosto na face, sem sobreposição' },
  { par: ['tanqueDireito', 'bocais'], motivo: 'os dois bocais saem da parede de trás do tanque direito, com a face do tubo encostada na parede, sem entrar' },
  { par: ['tanqueEsquerdo', 'bocais'], motivo: 'o bujão de dreno encosta na face de baixo do tanque esquerdo' },
  { par: ['tanqueEsquerdo', 'suportes'], motivo: 'o pino e a bucha encostam no fundo do tanque esquerdo e as duas abas encostam na face da parede de fora' },
  { par: ['tanqueDireito', 'suportes'], motivo: 'o pino e a bucha encostam no fundo do tanque direito e as duas abas encostam na face da parede de fora' },
];

export const MATERIAIS = {
  aluminio: { cor: '#b9bdc2', metalicidade: 0.85, aspereza: 0.4 },
  aco: { cor: '#6f7378', metalicidade: 0.8, aspereza: 0.45 },
  borracha: { cor: '#161616', metalicidade: 0, aspereza: 0.9 },
};

const receita = {
  meta: { nome: 'radiador', desc: 'radiador de alumínio de fluxo cruzado: núcleo de 40 tubos achatados com lâminas entre placas coletoras e chapas em U, tanques com gargalo e bocais, pinos e abas de fixação' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'centro do núcleo em x 0 e z 0; ponta dos pinos em y 0; y para cima; tanque do gargalo em -x, tanque dos bocais em +x, bocais para trás (-z)' },
  PLANO: {
    objeto: 'radiador de alumínio de fluxo cruzado, peça inteira: núcleo de 600 x 400 x 40 mm, tanques laterais de 50 mm e largura total perto de 720 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'largura do núcleo', milimetros: 600 },
    partes: [
      { nome: 'nucleo', forma: 'colmeia de 40 tubos achatados horizontais de 2 mm de altura no passo de 10 mm, com fileiras de lâminas finas verticais entre os tubos', tecnica: 'extrusão de uma camada vazada por janelas, repetida por arranja linear' },
      { nome: 'placas', forma: 'duas placas coletoras verticais onde os tubos entram e duas chapas em U, uma acima e outra abaixo do núcleo', tecnica: 'extrusões para as placas e cubos unidos para as chapas em U' },
      { nome: 'tanqueEsquerdo', forma: 'caixa de alumínio de quinas arredondadas com gargalo de enchimento de tampa redonda e tubo fino de respiro curvo', tecnica: 'extrusão de contorno com cantos, unida a um lathe do gargalo com tampa e a um loft do respiro' },
      { nome: 'tanqueDireito', forma: 'caixa de alumínio de quinas arredondadas', tecnica: 'extrusão de contorno com cantos' },
      { nome: 'bocais', forma: 'bocal de entrada no alto e de saída embaixo do tanque direito, tubos de 32 mm com rebordo na ponta, saindo para trás, e bujão de dreno sextavado embaixo do tanque esquerdo', tecnica: 'lathe em z com rebordo no perfil e lathe de seis lados para o bujão' },
      { nome: 'suportes', forma: 'um pino com bucha de borracha embaixo de cada tanque e duas abas com furo na lateral de cada tanque', tecnica: 'lathe para pinos e buchas, extrusão em z com furo para as abas' },
    ],
    criteriosDeReprovacao: [
      'núcleo como placa lisa sem tubos e aletas em relevo',
      'gargalo sem tampa',
      'bocais sem rebordo',
      'tanques encostando no núcleo sem placa coletora',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const t = this.PARAMS;
    const D = derivar(t);
    const n = t.nucleo;
    const tol = 1;
    const xAbas = D.xTanqueOut + t.aba.saliencia;
    return [
      { nome: 'canto de cima do núcleo', parte: 'nucleo', medida: 'maximo', em: [n.largura / 2, D.yTopoNucleo, n.prof / 2], toleranciaMm: tol },
      { nome: 'canto de baixo do núcleo', parte: 'nucleo', medida: 'minimo', em: [-n.largura / 2, D.yNucleo, -n.prof / 2], toleranciaMm: tol },
      { nome: 'topo do tanque direito', parte: 'tanqueDireito', medida: 'maximo', em: [D.xTanqueOut, D.yTopo, t.tanque.prof / 2], toleranciaMm: tol },
      { nome: 'ponta de fora do tanque esquerdo', parte: 'tanqueEsquerdo', medida: 'minimo', em: [-D.xTanqueOut, D.y0, -t.tanque.prof / 2], toleranciaMm: tol },
      { nome: 'ponta dos bocais', parte: 'bocais', medida: 'minimo', em: [-D.xc - t.dreno.circunraio, D.y0 - t.dreno.altura, -t.tanque.prof / 2 - t.bocal.comprimento], toleranciaMm: tol },
      { nome: 'chão e abas dos suportes', parte: 'suportes', medida: 'minimo', em: [-xAbas, 0, -t.aba.esp / 2], toleranciaMm: tol },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
