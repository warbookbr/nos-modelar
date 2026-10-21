/* lavadora-secadora-branca — lavadora e secadora de roupa branca de porta frontal: caixa branca com um rebaixo na frente-topo que
 * guarda o painel escuro (com a gaveta do sabão à esquerda e o seletor de aço escovado à direita), a porta redonda grande no
 * centro-baixo (aro preto com um fio prateado e o vidro escuro recuado), a tampa redonda do filtro no canto direito de baixo,
 * cinco rasgos rasos em cada lateral, na metade de trás, e quatro pés.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do aparelho em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha de frente. Origem no chão, centrada em x e em z. A TABELA, em milímetro, é a única fonte das medidas; `derivar`
 * calcula as posições e `gerarPassos` converte para metro, num lugar só (`m`).
 *
 * Medidas aprovadas pela pessoa: 600 mm de largura, 850 mm de altura (contando os pés) e 620 mm de profundidade. A caixa tem
 * 835 mm de altura, de y 15 a y 850, sobre pés de 15 mm.
 *
 * Razões medidas em frontal.png (858 por 1200 px; aparelho de x 39 a 814 e de y 56 a 1137 com os pés, escala de 0,774 mm/px em
 * x e 0,786 mm/px em y) e em painel.png (1133 por 252 px):
 *   porta: 635 px de largura (113 a 748) e 641 px de altura (246 a 887), 491 a 504 mm, 0,82 da largura; diâmetro usado 496 mm.
 *     O centro da porta fica em x +3 mm do centro do aparelho, dentro do erro da medida; a porta é centrada em x. O centro fica a
 *     448 mm do chão.
 *   painel escuro: de y 57 a 200 px, 113 mm de altura na foto, 0,133 da altura total; usado 106 mm (a pessoa pede 10 mm de caixa
 *     por cima do painel, e a foto tem o painel quase no topo). A borda de baixo do rebaixo (o beiral branco sob o painel) fica
 *     em y 230 px, a 713 mm do chão; usado y 715, com o rebaixo de 125 mm de altura e a fresta de 19 mm sob o painel.
 *   rebaixo: 580 mm de largura (10 mm de caixa de cada lado) e 30 mm de profundidade, de z 280 a 310. A profundidade não se mede
 *     em frontal.png; vem do beiral da isometrica-medidas.png, que mostra poucos centímetros, e fica como estimativa.
 *   gaveta do sabão: a linha de junção cai em x 292 px de 48 a 810, a 0,32 da largura do painel; a pessoa disse 40%, e a foto
 *     (painel.png: x 372 de 30 a 1100, 0,32) dá 32%. Usado 33% (192 mm da borda esquerda), x -98. Decisão: UMA placa só com uma
 *     fresta fina de 1,5 mm de largura e 1,5 mm de fundo, aberta por `subtrair`, e não duas placas encostadas.
 *   seletor: diâmetro 48 mm, centro em x +173 e y 796 (painel.png: 88 px de diâmetro a 0,542 mm/px), saliente 7 mm.
 *   tampa do filtro: centro em x +170 e y 98, diâmetro 120 mm na foto; usado 110 mm, o máximo da faixa que a pessoa deu.
 *   pés: centros a 263 mm do eixo em x na foto; usado 40 mm de recuo do centro às bordas (x ±260, z ±270).
 *   rasgos laterais: a isometrica-medidas.png mostra os rasgos de 21% a 89% da profundidade da lateral, medida a partir da frente
 *     (já com a perspectiva); usado o recuo de 130 mm da frente ao primeiro rasgo, com 5 rasgos de 40 mm e vão de 50 mm entre
 *     eles, 400 mm no total: de z 180 a z -220, e 90 mm sobram até a traseira.
 *
 * Vertical dos rasgos: a pessoa deu 70 mm do topo da caixa ao topo do rasgo, 750 mm de altura e 30 mm do fundo da caixa ao fundo
 * do rasgo, somando 850; a caixa tem 835. Resolvido mantendo 70 e 30 e tirando os 15 mm da altura do rasgo, que fica com 735 mm,
 * de y 45 a y 780. A soma 70 + 735 + 30 fecha os 835 mm da caixa.
 *
 * Simplificações em relação à imagem:
 *  - arredondamento da caixa (7 mm de raio, 4 painéis): as duas verticais da frente e as quatro de cima, por
 *    `arredondarAresta` com `sel.onde`. As verticais de trás ficam vivas.
 *  - o painel tem cantos de 8 mm de raio no plano da frente e não é curvo em z; a face da frente é lisa e plana, a 2 mm atrás do
 *    plano da frente da caixa. O beiral e a curva do rebaixo na foto não são modelados.
 *  - o fio prateado da porta é um anel fino de 3 mm de largura e 3 mm de altura; a foto mostra uma linha de poucos décimos.
 *  - o vidro é um cilindro plano, sem curvatura nem reflexo; a borracha da vedação não aparece na foto e não é modelada.
 *  - a tampa do filtro é um disco branco com uma pequena aba no topo; o fio de junção ao redor e o entalhe da aba não são
 *    modelados.
 *  - o pé é um tronco de cone de 15 mm; a haste e a porca da foto não entram.
 *
 * Texto e ícones que a imagem escreve e que NÃO entram como geometria, porque o núcleo não modela texto. Ficam para um futuro
 * decalque: "Lava 11kg / Seca 7kg" na gaveta do sabão; os nomes de programa em volta do seletor ("Super Rápido", "Rápido",
 * "Centrifugar", "Enxaguar + Centrifugar", "Desodorizar", "Secar somente", "1 Hora Lava/Seca 1kg", "Normal", "Intensivo",
 * "Algodão", "Roupas Intimas", "Delicadas", "Lã", "Silencioso", "Antialérgico", "Limpeza Sistema"); os rótulos e ícones da faixa de
 * teclas ("Temperatura", "Rotação", "Adiciona enxágue", "Pré-lavagem", "Programa", "Iniciar/Pausa", "Ligar/Desligar"), os dois
 * ícones coloridos de iniciar e ligar, e o ícone do seletor. Fica sem nome de fabricante no repositório.
 */

export const TABELA = {
  largura_total: 600,
  altura_total: 850,
  profundidade_total: 620,

  pe_altura: 15,
  pe_raio: 20,
  pe_raio_topo: 16,
  pe_chanfro_altura: 6,
  pe_lados: 24,
  pe_recuo_centro: 40,

  caixa_raio: 7,
  caixa_paineis: 4,

  rebaixo_lateral: 10,
  rebaixo_topo: 10,
  rebaixo_altura: 125,
  rebaixo_fundo: 30,
  rebaixo_raio: 8,
  rebaixo_segmentos: 6,

  painel_altura: 106,
  painel_recuo_frente: 2,
  gaveta_fracao: 0.33,
  fresta_gaveta_largura: 1.5,
  fresta_gaveta_fundo: 1.5,

  seletor_raio: 24,
  seletor_altura: 7,
  seletor_chanfro: 2.5,
  seletor_lados: 40,
  seletor_x: 173,
  seletor_y: 796,

  porta_diametro: 496,
  porta_y: 448,
  fio_largura: 3,
  fio_altura: 3,
  aro_largura: 13,
  aro_saliencia: 14,
  aro_chanfro: 3,
  vidro_recuo: 5,
  porta_lados: 72,

  tampa_diametro: 110,
  tampa_saliencia: 3.5,
  tampa_x: 170,
  tampa_y: 98,
  tampa_lados: 48,
  aba_largura: 15,
  aba_altura: 8,
  aba_saliencia: 4.5,

  rasgo_quantidade: 5,
  rasgo_largura: 40,
  rasgo_vao: 50,
  rasgo_fundo: 4.5,
  rasgo_topo: 70,
  rasgo_base: 30,
  rasgo_recuo_frente: 130,
};

/* Tudo em milímetro. A altura da caixa é a total menos o pé; o rebaixo e os rasgos leem dela. */
export function derivar(T) {
  const meiaX = T.largura_total / 2;
  const meiaZ = T.profundidade_total / 2;
  const caixaY0 = T.pe_altura;
  const caixaY1 = T.altura_total;
  const caixaAltura = caixaY1 - caixaY0;

  /* rebaixo: cortado na frente-topo; o painel o ocupa de cima até a fresta */
  const rebaixoX = meiaX - T.rebaixo_lateral;
  const rebaixoY1 = caixaY1 - T.rebaixo_topo;
  const rebaixoY0 = rebaixoY1 - T.rebaixo_altura;
  const rebaixoZ0 = meiaZ - T.rebaixo_fundo;
  const painelY0 = rebaixoY1 - T.painel_altura;
  const painelZ1 = meiaZ - T.painel_recuo_frente;

  /* rasgos: cada lateral tem os mesmos, a partir da frente. z0 é a borda de trás de cada um. */
  const rasgoY1 = caixaY1 - T.rasgo_topo;
  const rasgoY0 = caixaY0 + T.rasgo_base;
  const rasgos = [];
  for (let k = 0; k < T.rasgo_quantidade; k += 1) {
    const z1 = meiaZ - T.rasgo_recuo_frente - k * (T.rasgo_largura + T.rasgo_vao);
    rasgos.push({ z0: z1 - T.rasgo_largura, z1 });
  }

  const portaRaio = T.porta_diametro / 2;
  const aroRaioExterno = portaRaio - T.fio_largura;
  const aroRaioInterno = aroRaioExterno - T.aro_largura;
  const aroZ1 = meiaZ + T.aro_saliencia;

  const peX = meiaX - T.pe_recuo_centro;
  const peZ = meiaZ - T.pe_recuo_centro;
  const pes = [
    { nome: 'peFrenteEsq', x: -peX, z: peZ },
    { nome: 'peFrenteDir', x: peX, z: peZ },
    { nome: 'peTrasEsq', x: -peX, z: -peZ },
    { nome: 'peTrasDir', x: peX, z: -peZ },
  ];

  return {
    meiaX, meiaZ, caixaY0, caixaY1, caixaAltura,
    rebaixo: { x: rebaixoX, y0: rebaixoY0, y1: rebaixoY1, z0: rebaixoZ0 },
    painel: { x: rebaixoX, y0: painelY0, y1: rebaixoY1, z0: rebaixoZ0, z1: painelZ1 },
    gaveta: { x: -rebaixoX + T.gaveta_fracao * 2 * rebaixoX },
    seletor: { x: T.seletor_x, y: T.seletor_y, z0: painelZ1 },
    rasgos: { y0: rasgoY0, y1: rasgoY1, lista: rasgos },
    porta: { y: T.porta_y, raio: portaRaio, aroRaioExterno, aroRaioInterno, aroZ1, vidroZ1: aroZ1 - T.vidro_recuo, z0: meiaZ },
    tampa: { x: T.tampa_x, y: T.tampa_y, raio: T.tampa_diametro / 2, z0: meiaZ },
    pes,
  };
}

const m = (mm) => mm / 1000;

/* Retângulo de cantos arredondados, em milímetro, centrado em (0, 0), com `seg` segmentos por canto. */
export function retanguloArredondado(largura, altura, raio, seg) {
  const pts = [];
  const cx = largura / 2 - raio;
  const cy = altura / 2 - raio;
  for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]]) {
    for (let k = 0; k <= seg; k += 1) {
      const a = ((a0 + (90 * k) / seg) * Math.PI) / 180;
      pts.push([sx * cx + Math.cos(a) * raio, sy * cy + Math.sin(a) * raio]);
    }
  }
  return pts;
}

const NORMAL_CIMA = [0, 1, 0];
const NORMAL_FRENTE = [0, 0, 1];

/* Ids de origem, por parte. Nenhum é identidade persistida fora da receita. */
const ID = {
  caixa: 1, painel: 2, seletor: 3, aro: 4, fio: 5, vidro: 6, tampa: 7, aba: 8, pe: 10,
  arredonda: 100, cortes: 1000, subtracaoCaixa: 2001, subtracaoPainel: 2002, uniaoTampa: 2003, fresta: 1200,
};

export const ALIASES = [
  ['caixaArredondada', { unir: [
    { origem: { op: 'cubo', id: ID.caixa } },
    ...[0, 1, 2, 3, 4, 5].map((k) => ({ origem: { op: 'arredondarAresta', id: ID.arredonda + k } })),
  ] }],
  ['vidroInteiro', { unir: [
    { origem: { op: 'cilindro', id: ID.vidro } },
    { origem: { op: 'cilindro', id: ID.vidro, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: ID.vidro, tampa: 'topo' } },
  ] }],
];

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  const parte = (nome, sel, material) => {
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { sel, usa: material }]);
  };

  /* caixa: cubo no pé, arestas arredondadas, e depois o rebaixo do painel e os rasgos das duas laterais, tudo por subtrair */
  passos.push(['cubo', {
    origemId: ID.caixa, larg: m(T.largura_total), alt: m(D.caixaAltura), prof: m(T.profundidade_total), em: [0, m(D.caixaY0), 0],
  }]);
  const arestas = [
    [NORMAL_CIMA, 'x', 'max'], [NORMAL_CIMA, 'x', 'min'], [NORMAL_CIMA, 'z', 'min'], [NORMAL_CIMA, 'z', 'max'],
    [NORMAL_FRENTE, 'x', 'max'], [NORMAL_FRENTE, 'x', 'min'],
  ];
  arestas.forEach(([dir, eixo, lado], k) => {
    passos.push(['arredondarAresta', {
      origemId: ID.arredonda + k, raio: m(T.caixa_raio), paineis: T.caixa_paineis,
      sel: { origem: { op: 'cubo', id: ID.caixa }, onde: { alvo: 'aresta', normal: { dir, ate: 5 }, extremo: { eixo, lado } } },
    }]);
  });
  const rebaixoLarg = D.rebaixo.x * 2;
  const rebaixoPerfil = retanguloArredondado(rebaixoLarg, D.rebaixo.y1 - D.rebaixo.y0, T.rebaixo_raio, T.rebaixo_segmentos);
  const rebaixoYc = (D.rebaixo.y0 + D.rebaixo.y1) / 2;
  passos.push(['extrusao', {
    origemId: ID.cortes, eixo: 'z', altura: m(D.meiaZ + 2 - D.rebaixo.z0), perfil: rebaixoPerfil.map(([x, y]) => [m(x), m(y)]),
    em: [0, m(rebaixoYc), m(D.rebaixo.z0)],
  }]);
  const cortadores = [{ origem: { op: 'extrusao', id: ID.cortes } }];
  let idCorte = ID.cortes + 1;
  for (const lado of [-1, 1]) {
    for (const r of D.rasgos.lista) {
      /* cada corte começa 1 mm fora da lateral, para não deixar uma película, e entra `rasgo_fundo` na caixa */
      const xFace = lado * D.meiaX;
      const xi = xFace - lado * T.rasgo_fundo;
      const xo = xFace + lado * 1;
      passos.push(['cubo', {
        origemId: idCorte, larg: m(Math.abs(xo - xi)), alt: m(D.rasgos.y1 - D.rasgos.y0), prof: m(r.z1 - r.z0),
        em: [m((xi + xo) / 2), m(D.rasgos.y0), m((r.z0 + r.z1) / 2)],
      }]);
      cortadores.push({ origem: { op: 'cubo', id: idCorte } });
      idCorte += 1;
    }
  }
  passos.push(['subtrair', { origemId: ID.subtracaoCaixa, solidos: [{ alias: 'caixaArredondada' }, ...cortadores] }]);
  parte('caixa', { origem: { op: 'subtrair', id: ID.subtracaoCaixa } }, 'branco');
  passos.push(['liso', { angulo: 30, sel: { origem: { op: 'subtrair', id: ID.subtracaoCaixa } } }]);

  /* painel: placa escura de cantos arredondados dentro do rebaixo, com a fresta da gaveta na frente */
  const painelPerfil = retanguloArredondado(D.painel.x * 2, D.painel.y1 - D.painel.y0, T.rebaixo_raio, T.rebaixo_segmentos);
  passos.push(['extrusao', {
    origemId: ID.painel, eixo: 'z', altura: m(D.painel.z1 - D.painel.z0), perfil: painelPerfil.map(([x, y]) => [m(x), m(y)]),
    em: [0, m((D.painel.y0 + D.painel.y1) / 2), m(D.painel.z0)],
  }]);
  passos.push(['cubo', {
    origemId: ID.fresta, larg: m(T.fresta_gaveta_largura), alt: m(D.painel.y1 - D.painel.y0 + 2), prof: m(T.fresta_gaveta_fundo + 1),
    em: [m(D.gaveta.x), m(D.painel.y0 - 1), m(D.painel.z1 - T.fresta_gaveta_fundo / 2 + 0.5)],
  }]);
  passos.push(['subtrair', { origemId: ID.subtracaoPainel, solidos: [{ origem: { op: 'extrusao', id: ID.painel } }, { origem: { op: 'cubo', id: ID.fresta } }] }]);
  parte('painel', { origem: { op: 'subtrair', id: ID.subtracaoPainel } }, 'preto');
  passos.push(['liso', { angulo: 30, sel: { origem: { op: 'subtrair', id: ID.subtracaoPainel } } }]);

  /* seletor: cilindro baixo de aço com o chanfro na borda da frente, por revolução com eixo em z */
  const R = T.seletor_raio;
  const h = T.seletor_altura;
  const c = T.seletor_chanfro;
  passos.push(['lathe', {
    origemId: ID.seletor, lados: T.seletor_lados, eixo: 'z',
    perfil: [[0, 0], [m(R), 0], [m(R), m(h - c)], [m(R - c), m(h)], [0, m(h)]],
    em: [m(D.seletor.x), m(D.seletor.y), m(D.seletor.z0)],
  }]);
  parte('seletor', { origem: { op: 'lathe', id: ID.seletor } }, 'aco');

  /* aro: anel preto de revolução, com o chanfro na borda de fora da frente, e o fio prateado em volta dele */
  const aroH = D.porta.aroZ1 - D.porta.z0;
  const ac = T.aro_chanfro;
  const ro = D.porta.aroRaioExterno;
  const ri = D.porta.aroRaioInterno;
  passos.push(['lathe', {
    origemId: ID.aro, lados: T.porta_lados, eixo: 'z',
    perfil: [[m(ri), 0], [m(ro), 0], [m(ro), m(aroH - ac)], [m(ro - ac), m(aroH)], [m(ri), m(aroH)], [m(ri), 0]],
    em: [0, m(D.porta.y), m(D.porta.z0)],
  }]);
  parte('aroDaPorta', { origem: { op: 'lathe', id: ID.aro } }, 'aroPreto');
  passos.push(['lathe', {
    origemId: ID.fio, lados: T.porta_lados, eixo: 'z',
    perfil: [[m(ro), 0], [m(D.porta.raio), 0], [m(D.porta.raio), m(T.fio_altura)], [m(ro), m(T.fio_altura)], [m(ro), 0]],
    em: [0, m(D.porta.y), m(D.porta.z0)],
  }]);
  parte('fioDaPorta', { origem: { op: 'lathe', id: ID.fio } }, 'aco');

  /* vidro: cilindro de eixo z dentro do aro, com a frente recuada em relação à frente do aro */
  passos.push(['cilindro', {
    origemId: ID.vidro, raio: m(ri), altura: m(D.porta.vidroZ1 - D.porta.z0), lados: T.porta_lados, eixo: 'z',
    em: [0, m(D.porta.y), m(D.porta.z0)],
  }]);
  parte('vidroDaPorta', { alias: 'vidroInteiro' }, 'vidro');

  /* tampa do filtro: disco raso com uma aba pequena no topo, unidos num corpo só */
  passos.push(['lathe', {
    origemId: ID.tampa, lados: T.tampa_lados,
    perfil: [[0, 0], [m(D.tampa.raio), 0], [m(D.tampa.raio), m(T.tampa_saliencia)], [0, m(T.tampa_saliencia)]],
    eixo: 'z', em: [m(D.tampa.x), m(D.tampa.y), m(D.tampa.z0)],
  }]);
  passos.push(['cubo', {
    origemId: ID.aba, larg: m(T.aba_largura), alt: m(T.aba_altura), prof: m(T.aba_saliencia),
    em: [m(D.tampa.x), m(D.tampa.y + D.tampa.raio - T.aba_altura - 3), m(D.tampa.z0 + T.aba_saliencia / 2)],
  }]);
  passos.push(['unir', { origemId: ID.uniaoTampa, solidos: [{ origem: { op: 'lathe', id: ID.tampa } }, { origem: { op: 'cubo', id: ID.aba } }] }]);
  parte('tampaDoFiltro', { origem: { op: 'unir', id: ID.uniaoTampa } }, 'branco');

  /* pés: tronco de cone por revolução em y, com o chanfro no topo; o topo encosta na face de baixo da caixa */
  const pr = T.pe_raio;
  const pt = T.pe_raio_topo;
  const ph = T.pe_altura;
  D.pes.forEach((pe, k) => {
    passos.push(['lathe', {
      origemId: ID.pe + k, lados: T.pe_lados,
      perfil: [[0, 0], [m(pr), 0], [m(pr), m(ph - T.pe_chanfro_altura)], [m(pt), m(ph)], [0, m(ph)]],
      em: [m(pe.x), 0, m(pe.z)],
    }]);
    parte(pe.nome, { origem: { op: 'lathe', id: ID.pe + k } }, 'cinzaEscuro');
  });

  return passos;
}

/* Contatos, declarados antes de medir. O painel ocupa o rebaixo de cima, das laterais e do fundo; o vão sob ele é a fresta e não
 * toca a caixa. A porta e a tampa assentam na face da frente da caixa, em z 310; o aro e o fio assentam nela, e o aro envolve o
 * vidro. Os pés assentam na face de baixo da caixa, em y 15. */
export const CONTATOS = [
  { par: ['caixa', 'painel'], motivo: 'o painel ocupa o rebaixo: a face de trás encosta no fundo em z 280, e o topo e as laterais encostam nas paredes de 10 mm da caixa' },
  { par: ['painel', 'seletor'], motivo: 'o seletor assenta na face da frente do painel, em z 308, e sai 7 mm' },
  { par: ['caixa', 'aroDaPorta'], motivo: 'a face de trás do aro assenta na face da frente da caixa, em z 310' },
  { par: ['caixa', 'fioDaPorta'], motivo: 'a face de trás do fio prateado assenta na face da frente da caixa, em z 310' },
  { par: ['caixa', 'vidroDaPorta'], motivo: 'a face de trás do vidro assenta na face da frente da caixa, em z 310, dentro do aro' },
  { par: ['aroDaPorta', 'fioDaPorta'], motivo: 'o fio prateado envolve o aro: a face de dentro do fio encosta na face de fora do aro, no raio 245' },
  { par: ['aroDaPorta', 'vidroDaPorta'], motivo: 'o vidro enche o furo do aro: a lateral do vidro encosta na face de dentro do aro, no raio 232' },
  { par: ['caixa', 'tampaDoFiltro'], motivo: 'a face de trás da tampa assenta na face da frente da caixa, em z 310' },
  ...['peFrenteEsq', 'peFrenteDir', 'peTrasEsq', 'peTrasDir'].map((pe) => ({
    par: [pe, 'caixa'], motivo: 'o topo do pé assenta na face de baixo da caixa, em y 15',
  })),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const D = derivar(T);
  const tol = 0.5;
  return [
    { nome: 'canto de trás, na esquerda, em cima, da caixa', parte: 'caixa', medida: 'minimo', em: [-D.meiaX, D.caixaY0, -D.meiaZ], toleranciaMm: tol },
    { nome: 'canto da frente, na direita, em cima, da caixa', parte: 'caixa', medida: 'maximo', em: [D.meiaX, D.caixaY1, D.meiaZ], toleranciaMm: tol },
    { nome: 'canto de baixo, atrás, à esquerda, do painel', parte: 'painel', medida: 'minimo', em: [-D.painel.x, D.painel.y0, D.painel.z0], toleranciaMm: tol },
    { nome: 'canto de cima da frente, à direita, do painel', parte: 'painel', medida: 'maximo', em: [D.painel.x, D.painel.y1, D.painel.z1], toleranciaMm: tol },
    { nome: 'ponta da frente do seletor', parte: 'seletor', medida: 'maximo', em: [T.seletor_x + T.seletor_raio, T.seletor_y + T.seletor_raio, D.painel.z1 + T.seletor_altura], toleranciaMm: tol },
    { nome: 'ponta da frente do aro', parte: 'aroDaPorta', medida: 'maximo', em: [D.porta.aroRaioExterno, D.porta.y + D.porta.aroRaioExterno, D.porta.aroZ1], toleranciaMm: tol },
    { nome: 'borda de baixo, à esquerda, do fio da porta', parte: 'fioDaPorta', medida: 'minimo', em: [-D.porta.raio, D.porta.y - D.porta.raio, D.porta.z0], toleranciaMm: tol },
    { nome: 'ponta da frente do vidro', parte: 'vidroDaPorta', medida: 'maximo', em: [D.porta.aroRaioInterno, D.porta.y + D.porta.aroRaioInterno, D.porta.vidroZ1], toleranciaMm: tol },
    { nome: 'borda da direita da tampa do filtro', parte: 'tampaDoFiltro', medida: 'maximo', em: [D.tampa.x + D.tampa.raio, D.tampa.y + D.tampa.raio, D.tampa.z0 + T.aba_saliencia], toleranciaMm: tol },
    { nome: 'borda de baixo da frente esquerda do pé da frente esquerda', parte: 'peFrenteEsq', medida: 'minimo', em: [-(D.meiaX - T.pe_recuo_centro) - T.pe_raio, 0, D.meiaZ - T.pe_recuo_centro - T.pe_raio], toleranciaMm: tol },
    { nome: 'borda de baixo de trás direita do pé de trás direito', parte: 'peTrasDir', medida: 'maximo', em: [D.meiaX - T.pe_recuo_centro + T.pe_raio, T.pe_altura, -(D.meiaZ - T.pe_recuo_centro) + T.pe_raio], toleranciaMm: tol },
  ];
}

export const PASSOS = gerarPassos(TABELA);

const receita = {
  meta: { nome: 'lavadora-secadora-branca', desc: 'lavadora e secadora de roupa branca de porta frontal, com caixa, painel escuro em rebaixo, seletor, porta redonda com aro e vidro, tampa do filtro, rasgos laterais e quatro pés' },
  PARAMS: TABELA,
  MATERIAIS: {
    branco: { tipo: 'liso', cor: '#f1f0ea' },
    preto: { tipo: 'liso', cor: '#101012' },
    aco: { tipo: 'metal', cor: '#b9bdc3', acabamento: 'escovado' },
    aroPreto: { tipo: 'liso', cor: '#1a1a1c' },
    vidro: { tipo: 'liso', cor: '#0c0e12' },
    cinzaEscuro: { tipo: 'liso', cor: '#3a3c40' },
  },
  TOPO: { origem: 'chão, no meio do aparelho em x e em z; y para cima e a frente do aparelho em +z' },
  PLANO: {
    objeto: 'lavadora e secadora branca de porta frontal, 600 por 850 (com os pés) por 620 mm, com painel escuro em rebaixo, seletor, porta redonda, tampa do filtro, rasgos laterais e quatro pés',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do aparelho com os pés', milimetros: 850 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'caixa', forma: 'bloco branco de 600 por 835 por 620 mm (y 15 a 850), arestas de cima e verticais da frente em 7 mm, rebaixo de 580 por 125 por 30 mm na frente-topo (y 715 a 840) e 5 rasgos rasos por lateral', tecnica: 'cubo com arredondarAresta por sel.onde e um subtrair do rebaixo (extrusão de perfil arredondado) e dos dez rasgos (cubos de 40 por 735 mm, 4,5 mm de fundo)' },
      { nome: 'painel', forma: 'placa preta lisa de 580 por 106 por 28 mm, cantos de 8 mm, y 734 a 840, z 280 a 308, dentro do rebaixo, com fresta de 1,5 mm da gaveta do sabão em x -98', tecnica: 'extrusão em z de perfil arredondado menos um cubo fino por subtrair' },
      { nome: 'seletor', forma: 'cilindro baixo de aço escovado de 48 mm de diâmetro e 7 mm de altura, com chanfro de 2,5 mm na borda da frente, em x 173 e y 796', tecnica: 'lathe com eixo em z, com chanfro no perfil, assentado na frente do painel' },
      { nome: 'aroDaPorta', forma: 'anel preto de 490 mm de diâmetro externo, 464 mm de interno e 14 mm de saliência, com chanfro de 3 mm na borda de fora, centrado em x 0 e y 448', tecnica: 'lathe com eixo em z de um perfil vazado, sobre a face da frente da caixa' },
      { nome: 'fioDaPorta', forma: 'anel prateado fino de 496 mm de diâmetro externo, 3 mm de largura e 3 mm de altura, em volta do aro', tecnica: 'lathe com eixo em z de um perfil vazado' },
      { nome: 'vidroDaPorta', forma: 'disco escuro de 464 mm de diâmetro dentro do aro, com a frente 5 mm atrás da frente do aro', tecnica: 'cilindro de eixo z' },
      { nome: 'tampaDoFiltro', forma: 'disco branco de 110 mm de diâmetro e 3,5 mm de saliência, em x 170 e y 98, com uma aba de 15 por 8 mm no topo, que sai 4,5 mm', tecnica: 'cilindro de eixo z unido a um cubo pequeno' },
      { nome: 'peFrenteEsq', forma: 'tronco de cone de 15 mm de altura, 40 mm de diâmetro embaixo e 32 mm em cima, com o centro 40 mm das bordas, na frente à esquerda', tecnica: 'lathe de perfil com chanfro no topo' },
      { nome: 'peFrenteDir', forma: 'tronco de cone de 15 mm de altura, 40 mm de diâmetro embaixo e 32 mm em cima, com o centro 40 mm das bordas, na frente à direita', tecnica: 'lathe de perfil com chanfro no topo' },
      { nome: 'peTrasEsq', forma: 'tronco de cone de 15 mm de altura, 40 mm de diâmetro embaixo e 32 mm em cima, com o centro 40 mm das bordas, atrás à esquerda', tecnica: 'lathe de perfil com chanfro no topo' },
      { nome: 'peTrasDir', forma: 'tronco de cone de 15 mm de altura, 40 mm de diâmetro embaixo e 32 mm em cima, com o centro 40 mm das bordas, atrás à direita', tecnica: 'lathe de perfil com chanfro no topo' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 600 por 850 por 620 mm, ou algum vértice fica abaixo do chão',
      'o painel fica fora do rebaixo, atravessa a caixa, vira a forma triangular da versão antiga, ou não deixa 10 mm de caixa por cima e de cada lado e a fresta embaixo',
      'a frente do painel não fica no plano da frente da caixa ou levemente recuada',
      'a porta não é um aro preto vazado com o vidro escuro recuado dentro dele, ou não está centrada em x',
      'os cinco rasgos de uma lateral não são iguais aos da outra, ou entram na frente ou na traseira da caixa',
      'a tampa do filtro fica espelhada em x em vez de no canto direito, ou o seletor fica no canto esquerdo',
      'os quatro pés não ficam nos cantos, ou a caixa não assenta sobre eles',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  PASSOS,
};

export default receita;
