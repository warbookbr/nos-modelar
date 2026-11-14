/* escrivaninha-com-gaveta — escrivaninha de carvalho de 1200 por 600 mm de tampo e 750 mm de altura, com quatro pés retos, uma saia
 * de quatro travessas, tampo com balanço de 40 mm e uma gaveta central de frente faceando a saia, com puxador de botão.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente da escrivaninha em +z e x cresce para a direita de quem olha de
 * frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` as transforma em caixas e `gerarPassos` as converte para
 * metro, uma vez, com `m()`.
 *
 * `derivar` tem duas camadas. A primeira, `quadro`, só calcula medidas (face de fora e de dentro dos pés, altura da face de baixo
 * do tampo, face de dentro da saia) e é o que um dia seria parâmetro de uma família de mesa. A segunda escreve as caixas e as
 * operações que dependem do quadro, e é o que é próprio desta escrivaninha: a abertura na travessa da frente, a caixa da gaveta e
 * o botão.
 *
 * Movimento: a gaveta corre em +z, para a frente, de 0 a 350 mm (`MOVIMENTOS`). O projeto só declara articulação entre instâncias
 * de uma montagem v5 que publicam portas com eixo, e a montagem persistida não guarda a declaração; por isso o curso fica aqui
 * como dado, e quem o confere é a medida por sólidos feita fora da receita, com a gaveta e o puxador levados juntos a cada posição.
 *
 * Encaixes: o pé topa na face de baixo do tampo, em y 722; as travessas penduram do tampo, de y 612 a 722; a travessa da frente e
 * a de trás vão entre os pés e as das laterais também, todas faceando por fora o pé; a frente da gaveta preenche a espessura da
 * travessa da frente (z 240 a 260) com 2 mm de folga em volta; o corpo da gaveta nasce atrás da frente e é mais estreito que a
 * abertura, para correr por dentro dela sem tocá-la; o puxador assenta na face da frente da gaveta.
 */

export const TABELA = {
  /* o quadro: o que seria parâmetro da família de mesa */
  altura_total: 750,
  tampo_largura: 1200,
  tampo_profundidade: 600,
  tampo_espessura: 28,
  tampo_chanfro: 3,
  balanco: 40, /* tampo além da face de fora dos pés, nos quatro lados */
  pe_lado: 50,
  pe_chanfro: 2,
  saia_espessura: 20,
  saia_altura: 110,

  /* o próprio desta escrivaninha: gaveta e puxador */
  gaveta_frente_largura: 500,
  gaveta_frente_altura: 85,
  gaveta_folga: 2, /* folga em volta da frente na abertura */
  gaveta_corpo_profundidade: 450,
  gaveta_parede: 12,
  gaveta_corpo_recuo_lado: 12, /* o corpo é mais estreito que a frente, de cada lado */
  gaveta_corpo_recuo_vertical: 5, /* e mais baixo, em cima e embaixo */
  gaveta_curso: 350,
  puxador_diametro: 30,
  puxador_haste_diametro: 12,
  puxador_projecao: 23,
};

/* Quadro: as medidas que a família de mesa levaria como parâmetro, só contas, sem operação. Em milímetro. */
export function quadro(T) {
  const meioX = T.tampo_largura / 2 - T.balanco; /* face de fora do pé, em x */
  const meioZ = T.tampo_profundidade / 2 - T.balanco; /* face de fora do pé, em z */
  const tampoY0 = T.altura_total - T.tampo_espessura;
  return {
    meioX,
    meioZ,
    tampoY0,
    saiaY0: tampoY0 - T.saia_altura,
    peInternoX: meioX - T.pe_lado, /* face de dentro do pé, em x */
    peInternoZ: meioZ - T.pe_lado,
    saiaInternoX: meioX - T.saia_espessura, /* face de dentro da travessa lateral */
    saiaInternoZ: meioZ - T.saia_espessura, /* face de dentro da travessa da frente */
  };
}

/* Em milímetro: caixas { nome, x0, x1, y0, y1, z0, z1, chanfro?, material }, mais a abertura, a gaveta e o botão. */
export function derivar(T) {
  const Q = quadro(T);

  const tampo = { nome: 'tampo', x0: -T.tampo_largura / 2, x1: T.tampo_largura / 2, y0: Q.tampoY0, y1: T.altura_total, z0: -T.tampo_profundidade / 2, z1: T.tampo_profundidade / 2, chanfro: T.tampo_chanfro, material: 'carvalho' };

  const pes = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [x0, x1] = [sx * Q.peInternoX, sx * Q.meioX].sort((a, b) => a - b);
      const [z0, z1] = [sz * Q.peInternoZ, sz * Q.meioZ].sort((a, b) => a - b);
      pes.push({ nome: 'pes', x0, x1, y0: 0, y1: Q.tampoY0, z0, z1, chanfro: T.pe_chanfro, material: 'carvalho' });
    }
  }

  /* travessas: a da frente e a de trás vão entre os pés em x, as laterais entre os pés em z, todas faceando o pé por fora */
  const saia = { y0: Q.saiaY0, y1: Q.tampoY0, material: 'carvalho' };
  const travessas = [
    { ...saia, nome: 'saia', x0: -Q.peInternoX, x1: Q.peInternoX, z0: Q.saiaInternoZ, z1: Q.meioZ }, /* frente */
    { ...saia, nome: 'saia', x0: -Q.peInternoX, x1: Q.peInternoX, z0: -Q.meioZ, z1: -Q.saiaInternoZ }, /* trás */
    { ...saia, nome: 'saia', x0: Q.saiaInternoX, x1: Q.meioX, z0: -Q.peInternoZ, z1: Q.peInternoZ }, /* direita */
    { ...saia, nome: 'saia', x0: -Q.meioX, x1: -Q.saiaInternoX, z0: -Q.peInternoZ, z1: Q.peInternoZ }, /* esquerda */
  ];

  /* abertura: a frente da gaveta mais a folga em volta, centrada na travessa da frente, vazada de lado a lado */
  const centroY = (Q.saiaY0 + Q.tampoY0) / 2;
  const aberturaL = T.gaveta_frente_largura + 2 * T.gaveta_folga;
  const aberturaA = T.gaveta_frente_altura + 2 * T.gaveta_folga;
  const abertura = { x0: -aberturaL / 2, x1: aberturaL / 2, y0: centroY - aberturaA / 2, y1: centroY + aberturaA / 2, z0: Q.saiaInternoZ - 1, z1: Q.meioZ + 1 };

  /* gaveta fechada: a frente na espessura da travessa da frente; o corpo atrás dela, mais estreito e mais baixo */
  const frente = { x0: -T.gaveta_frente_largura / 2, x1: T.gaveta_frente_largura / 2, y0: centroY - T.gaveta_frente_altura / 2, y1: centroY + T.gaveta_frente_altura / 2, z0: Q.saiaInternoZ, z1: Q.meioZ };
  const corpo = {
    x0: frente.x0 + T.gaveta_corpo_recuo_lado, x1: frente.x1 - T.gaveta_corpo_recuo_lado,
    y0: frente.y0 + T.gaveta_corpo_recuo_vertical, y1: frente.y1 - T.gaveta_corpo_recuo_vertical,
    z0: Q.saiaInternoZ - T.gaveta_corpo_profundidade, z1: Q.saiaInternoZ,
  };
  /* a cavidade sobe e avança além do corpo, para o corte ser passante em cima e na frente (a frente da gaveta fecha o vazio) */
  const cavidade = {
    x0: corpo.x0 + T.gaveta_parede, x1: corpo.x1 - T.gaveta_parede,
    y0: corpo.y0 + T.gaveta_parede, y1: corpo.y1 + 1,
    z0: corpo.z0 + T.gaveta_parede, z1: corpo.z1 + 1,
  };

  /* botão: perfil [raio, altura sobre a face da frente], haste e cabeça abaulada, revolução em z */
  const R = T.puxador_diametro / 2;
  const r = T.puxador_haste_diametro / 2;
  const P = T.puxador_projecao;
  const botao = {
    x: 0, y: centroY, z0: frente.z1,
    perfil: [[0, 0], [r, 0], [r, P - 14], [R, P - 14], [R, P - 9], [R * 0.85, P - 4], [R * 0.5, P - 1], [0, P]],
  };

  return { quadro: Q, tampo, pes, travessas, abertura, frente, corpo, cavidade, botao };
}

const m = (mm) => mm / 1000;
const medidas = (c) => ({ larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0), em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)] });
const cubo = (id, c) => ['cubo', { origemId: id, ...medidas(c) }];
const chanfrado = (id, c) => ['chamferBox', { origemId: id, ...medidas(c), chanfro: m(c.chanfro) }];
const de = (op, id) => ({ origem: { op, id } });

/** Os PASSOS, em metro: tampo, pés, saia (com a abertura), gaveta (frente unida ao corpo vazado) e puxador, cada um com `parte` e `material`. */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  let id = 0;
  const proximo = () => { id += 1; return id; };
  const parte = (nome, sel, material) => passos.push(['parte', { nome, sel }], ['material', { sel, usa: material }]);

  const idTampo = proximo();
  passos.push(chanfrado(idTampo, D.tampo));
  parte('tampo', de('chamferBox', idTampo), D.tampo.material);

  for (const pe of D.pes) {
    const idPe = proximo();
    passos.push(chanfrado(idPe, pe));
    parte('pes', de('chamferBox', idPe), pe.material);
  }

  /* saia: a travessa da frente é cortada pela abertura; as outras três entram inteiras */
  const [frenteDaSaia, ...outras] = D.travessas;
  const idTravessa = proximo();
  passos.push(cubo(idTravessa, frenteDaSaia));
  const idAbertura = proximo();
  passos.push(cubo(idAbertura, D.abertura));
  const idCortada = proximo();
  passos.push(['subtrair', { origemId: idCortada, solidos: [de('cubo', idTravessa), de('cubo', idAbertura)] }]);
  parte('saia', de('subtrair', idCortada), frenteDaSaia.material);
  for (const travessa of outras) {
    const idOutra = proximo();
    passos.push(cubo(idOutra, travessa));
    parte('saia', de('cubo', idOutra), travessa.material);
  }

  /* gaveta: o corpo menos a cavidade, unido à frente */
  const idFrente = proximo();
  passos.push(cubo(idFrente, D.frente));
  const idCorpo = proximo();
  passos.push(cubo(idCorpo, D.corpo));
  const idCavidade = proximo();
  passos.push(cubo(idCavidade, D.cavidade));
  const idCaixa = proximo();
  passos.push(['subtrair', { origemId: idCaixa, solidos: [de('cubo', idCorpo), de('cubo', idCavidade)] }]);
  const idGaveta = proximo();
  passos.push(['unir', { origemId: idGaveta, solidos: [de('cubo', idFrente), de('subtrair', idCaixa)] }]);
  parte('gaveta', de('unir', idGaveta), 'carvalho');

  const idBotao = proximo();
  passos.push(['lathe', {
    origemId: idBotao, eixo: 'z', lados: 24,
    perfil: D.botao.perfil.map(([raio, h]) => [m(raio), m(h)]),
    em: [m(D.botao.x), m(D.botao.y), m(D.botao.z0)],
  }]);
  parte('puxador', de('lathe', idBotao), 'metalEscuro');
  return passos;
}

/* Contatos: o que se toca por face e o que corre dentro da abertura sem tocar. */
export const CONTATOS = [
  { par: ['pes', 'tampo'], motivo: 'o topo de cada pé topa na face de baixo do tampo, em y 722, dentro da área do tampo' },
  { par: ['saia', 'tampo'], motivo: 'o topo das quatro travessas encosta na face de baixo do tampo, em y 722' },
  { par: ['pes', 'saia'], motivo: 'cada travessa topa na face de dentro de dois pés, faceando a de fora, em x ±510 e z ±210' },
  { par: ['gaveta', 'puxador'], motivo: 'a base do botão assenta na face da frente da gaveta, em z 260, no centro dela' },
];

/* A gaveta (com o puxador, que a acompanha) corre dentro da abertura com 2 mm de folga e sem guia modelada: nenhuma parte a toca. */
export const ILHAS = [
  { contem: 'gaveta', motivo: 'a gaveta corre dentro da abertura da saia com 2 mm de folga em volta; a guia que a sustentaria não é modelada, e o puxador a acompanha' },
];

/* O curso da gaveta, para a medida por sólidos fora da receita: a gaveta e o puxador andam juntos em +z, de 0 a 350 mm. */
export const MOVIMENTOS = [
  { id: 'abre-gaveta', tipo: 'prismatica', parte: 'gaveta', acompanham: ['puxador'], eixo: [0, 0, 1], unidade: 'mm', curso: { minimo: 0, maximo: TABELA.gaveta_curso }, motivo: 'a gaveta corre para a frente dentro da abertura da travessa da frente, sem tocar a saia nem os pés' },
];

const receita = {
  meta: { nome: 'escrivaninha-com-gaveta', desc: 'escrivaninha de carvalho com quatro pés, saia, tampo com balanço e uma gaveta central com puxador de botão' },
  PARAMS: TABELA,
  MATERIAIS: {
    carvalho: { cor: '#c79a62', metalicidade: 0, aspereza: 0.7 },
    metalEscuro: { cor: '#3a3a3d', metalicidade: 0.8, aspereza: 0.35 },
  },
  TOPO: { origem: 'chão, no meio da escrivaninha em x e em z; y para cima e a frente da escrivaninha em +z' },
  PLANO: {
    objeto: 'escrivaninha de carvalho de 1200 por 600 mm de tampo e 750 mm de altura, quatro pés quadrados de 50 mm, saia de quatro travessas, tampo com balanço e uma gaveta central com puxador',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da peça', milimetros: 750 },
    partes: [
      { nome: 'pes', forma: 'quatro pés retos de seção quadrada de 50 mm, do chão à face de baixo do tampo (y 0 a 722), com aresta levemente quebrada', tecnica: 'quatro chamferBox de chanfro 2 mm, nomeadas num grupo só, faceando por fora a saia' },
      { nome: 'saia', forma: 'quatro travessas de 20 mm de espessura e 110 mm de altura entre os pés, logo abaixo do tampo; a da frente com a abertura da gaveta de 504 por 89 mm', tecnica: 'cubo por travessa, a da frente com subtrair de um cubo para a abertura passante' },
      { nome: 'tampo', forma: 'tábua de 1200 por 28 por 600 mm em y 722 a 750, com balanço de 40 mm nas quatro bordas além dos pés e borda de aresta quebrada', tecnica: 'chamferBox de chanfro 3 mm assentada sobre os pés e a saia' },
      { nome: 'gaveta', forma: 'caixa de gaveta aberta em cima: frente de 500 por 85 por 20 mm faceando a saia, com folga de 2 mm na abertura, corpo de 450 mm de profundidade com laterais, fundo e traseira de 12 mm', tecnica: 'cubo do corpo menos cubo da cavidade (subtrair), unido ao cubo da frente (unir); corre 350 mm em +z' },
      { nome: 'puxador', forma: 'botão redondo de metal escuro, 30 mm de diâmetro de cabeça abaulada sobre haste de 12 mm, 23 mm de projeção, no centro da frente da gaveta', tecnica: 'lathe em torno de z, com a base na face da frente da gaveta' },
    ],
    criteriosDeReprovacao: [
      'gaveta maciça (sem cavidade) ou sem folga de 2 mm em volta da frente na abertura',
      'gaveta que atravessa a saia ou os pés em qualquer posição do curso de 0 a 350 mm',
      'puxador fora do centro da frente da gaveta',
      'tampo sem balanço de 40 mm nas bordas além dos pés',
    ],
  },
  contatos: CONTATOS,
  ilhas: ILHAS,
  MOVIMENTOS,
  get PONTOS() {
    const D = derivar(this.PARAMS);
    const Q = D.quadro;
    return [
      { nome: 'canto de cima do pé frente direita', parte: 'pes', medida: 'maximo', em: [Q.meioX, Q.tampoY0, Q.meioZ], toleranciaMm: 0.5 },
      { nome: 'puxador no centro da frente da gaveta', parte: 'puxador', medida: 'centro', em: [0, D.botao.y, D.botao.z0 + this.PARAMS.puxador_projecao / 2], toleranciaMm: 1 },
      { nome: 'topo do tampo', parte: 'tampo', medida: 'maximo', em: [this.PARAMS.tampo_largura / 2, this.PARAMS.altura_total, this.PARAMS.tampo_profundidade / 2], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
