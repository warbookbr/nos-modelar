/* mesa-de-jantar — mesa de jantar retangular de carvalho maciço: tampo de 1800 por 900 mm com 30 mm de espessura, quatro pés de
 * 70 mm que afinam até 45 mm no chão só pelas duas faces de dentro, e quatro travessas (saia) de 22 por 90 mm entre os pés.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, o comprimento da mesa em x (centrada em x e z) e a frente em +z. A TABELA,
 * em milímetro, é a única fonte das medidas; `derivar` as transforma em caixas (mm) e `gerarPassos` converte para metro com `m()`
 * num lugar só. O que seria parâmetro de uma família de mesa fica nos grupos tampo_*, balanco, pe_* e saia_* da TABELA e em
 * `derivar`; as operações (gerarPassos) só leem o que `derivar` entrega.
 *
 * Encaixes: o pé vai do chão até a face de baixo do tampo (y 730); a saia pendura do tampo, em y 640 a 730, com as pontas
 * encostadas nas faces de dentro do pé (sem entrar nele) e a face de fora recuada `saia_recuo` da face de fora do pé; o tampo
 * assenta no topo dos pés e das saias e passa `balanco` além da face de fora dos pés.
 *
 * Pé: dois cubos unidos por `unir`. O de cima, reto, vai da face de baixo do tampo à altura da saia; o de baixo vai dali ao chão
 * e tem os vértices do chão da metade de dentro deslocados (`transladar`, uma faixa por face de dentro), de modo que a face de
 * fora fica vertical. As quatro arestas de cada cubo levam `arredondarAresta` de raio `pe_raio` antes do deslocamento.
 */

export const TABELA = {
  altura_total: 760,

  tampo_comprimento: 1800,
  tampo_largura: 900,
  tampo_espessura: 30,
  tampo_raio_cima: 8, /* arredondamento da borda de cima */
  tampo_paineis_cima: 4,
  tampo_chanfro_baixo: 3, /* chanfro leve da borda de baixo */

  balanco: 60, /* quanto o tampo passa da face de fora do pé, em cada lado */

  pe_topo: 70, /* lado do pé no topo, até a altura da saia */
  pe_chao: 45, /* lado do pé no chão: afina só nas duas faces de dentro */
  pe_raio: 2, /* aresta levemente quebrada */
  pe_paineis: 2,

  saia_espessura: 22,
  saia_altura: 90,
  saia_recuo: 10, /* da face de fora do pé à face de fora da saia */
};

const SINAIS = [[-1, -1, 'TrasEsq'], [+1, -1, 'TrasDir'], [-1, +1, 'FrenteEsq'], [+1, +1, 'FrenteDir']];

/* Tudo em milímetro. Devolve o tampo, os pés (cubo reto de cima e cubo de baixo com os desvios do chão) e as saias. */
export function derivar(T) {
  const tampoY1 = T.altura_total;
  const tampoY0 = tampoY1 - T.tampo_espessura;
  const saiaY1 = tampoY0;
  const saiaY0 = saiaY1 - T.saia_altura;

  const tampo = {
    nome: 'tampo', x0: -T.tampo_comprimento / 2, x1: T.tampo_comprimento / 2, y0: tampoY0, y1: tampoY1,
    z0: -T.tampo_largura / 2, z1: T.tampo_largura / 2,
  };

  /* Face de fora do pé: o tampo menos o balanço, em x e em z. */
  const peForaX = tampo.x1 - T.balanco;
  const peForaZ = tampo.z1 - T.balanco;
  const peDentroX = peForaX - T.pe_topo;
  const peDentroZ = peForaZ - T.pe_topo;
  const afina = T.pe_topo - T.pe_chao; /* quanto cada face de dentro anda, do topo ao chão */

  const pes = SINAIS.map(([sx, sz, nome]) => {
    const caixa = (y0, y1) => ({
      x0: sx > 0 ? peDentroX : -peForaX, x1: sx > 0 ? peForaX : -peDentroX,
      z0: sz > 0 ? peDentroZ : -peForaZ, z1: sz > 0 ? peForaZ : -peDentroZ, y0, y1,
    });
    const baixo = caixa(0, saiaY0);
    /* O chão do cubo de baixo afina em dois deslocamentos, um por face de dentro: os vértices da metade de dentro em z andam `afina`
       em z, depois os da metade de dentro em x andam `afina` em x (a faixa em z cobre o que o primeiro deslocamento moveu). Cada faixa
       é uma região em mm, na altura do chão. */
    const meioX = (baixo.x0 + baixo.x1) / 2;
    const meioZ = (baixo.z0 + baixo.z1) / 2;
    const folga = 1;
    const faixasDoChao = [
      { min: [baixo.x0 - folga, -folga, sz > 0 ? baixo.z0 - folga : meioZ], max: [baixo.x1 + folga, folga, sz > 0 ? meioZ : baixo.z1 + folga], desloca: [0, 0, sz * afina] },
      { min: [sx > 0 ? baixo.x0 - folga : meioX, -folga, baixo.z0 - afina - folga], max: [sx > 0 ? meioX : baixo.x1 + folga, folga, baixo.z1 + afina + folga], desloca: [sx * afina, 0, 0] },
    ];
    return { nome: `pe${nome}`, sx, sz, cima: caixa(saiaY0, tampoY0), baixo, faixasDoChao };
  });

  const e = T.saia_espessura;
  const foraSaiaX = peForaX - T.saia_recuo;
  const foraSaiaZ = peForaZ - T.saia_recuo;
  const saias = [
    { nome: 'saiaFrente', x0: -peDentroX, x1: peDentroX, z0: foraSaiaZ - e, z1: foraSaiaZ },
    { nome: 'saiaTras', x0: -peDentroX, x1: peDentroX, z0: -foraSaiaZ, z1: -foraSaiaZ + e },
    { nome: 'saiaDir', x0: foraSaiaX - e, x1: foraSaiaX, z0: -peDentroZ, z1: peDentroZ },
    { nome: 'saiaEsq', x0: -foraSaiaX, x1: -foraSaiaX + e, z0: -peDentroZ, z1: peDentroZ },
  ].map((s) => ({ ...s, y0: saiaY0, y1: saiaY1 }));

  return { tampo, pes, saias };
}

const m = (mm) => mm / 1000;

/* Ids de origem. Pé i (0 a 3): cubo de cima 100+10i, de baixo 101+10i, arredondamentos de cima 102+10i a 105+10i... ver idPe. */
const idPe = (i, quem, k = 0) => 100 + i * 100 + { cima: 0, baixo: 10, arredondaCima: 20, arredondaBaixo: 30, aliasCima: 40, aliasBaixo: 41, uniao: 42 }[quem] + k;
const ID_SAIA = (i) => 11 + i;
const ID_TAMPO = 21;
const ID_ARREDONDA = (k) => 31 + k;
const ID_CHANFRO = (k) => 41 + k;

/* As quatro arestas de uma face horizontal do tampo: o eixo extremo e o lado de cada uma. */
const ARESTAS = [['x', 'max'], ['x', 'min'], ['z', 'max'], ['z', 'min']];
const selAresta = (dirY, [eixo, lado]) => ({
  origem: { op: 'cubo', id: ID_TAMPO },
  onde: { alvo: 'aresta', normal: { dir: [0, dirY, 0], ate: 5 }, extremo: { eixo, lado } },
});

const ORIGENS_TAMPO = [
  { origem: { op: 'cubo', id: ID_TAMPO } },
  ...[0, 1, 2, 3].map((k) => ({ origem: { op: 'arredondarAresta', id: ID_ARREDONDA(k) } })),
  ...[0, 1, 2, 3].map((k) => ({ origem: { op: 'filete', id: ID_CHANFRO(k) } })),
];

/* Um pé inteiro, antes da união: o cubo e as quatro arestas arredondadas dele. */
const origensDoCubo = (i, quem) => [
  { origem: { op: 'cubo', id: idPe(i, quem) } },
  ...[0, 1, 2, 3].map((k) => ({ origem: { op: 'arredondarAresta', id: idPe(i, quem === 'cima' ? 'arredondaCima' : 'arredondaBaixo', k) } })),
];

export const ALIASES = [
  ['tampoInteiro', { unir: ORIGENS_TAMPO }],
  ...[0, 1, 2, 3].flatMap((i) => [[`peCima${i}`, { unir: origensDoCubo(i, 'cima') }], [`peBaixo${i}`, { unir: origensDoCubo(i, 'baixo') }]]),
  /* A `unir` consome as faces do encontro e publica o que sobrou na origem dela; a parte se nomeia por essa origem. */
  ['pes', { unir: [0, 1, 2, 3].map((i) => ({ origem: { op: 'unir', id: idPe(i, 'uniao') } })) }],
  ['saia', { unir: [0, 1, 2, 3].map((i) => ({ origem: { op: 'cubo', id: ID_SAIA(i) } })) }],
];

const cubo = (origemId, c) => ['cubo', {
  origemId, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0),
  em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
}];

export function gerarPassos(T) {
  const { tampo, pes, saias } = derivar(T);
  const passos = [];
  const material = (sel) => passos.push(['material', { sel, usa: 'carvalho' }]);

  /* Os dois cubos de cada pé, as quatro arestas verticais arredondadas em cada um, e a união dos dois. */
  /* Aresta vertical da quina (a, b): a da face de normal em x (sinal a) que fica no extremo de z (sinal b). */
  const QUINAS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  pes.forEach((p, i) => {
    for (const quem of ['cima', 'baixo']) {
      const id = idPe(i, quem);
      passos.push(cubo(id, p[quem]));
      QUINAS.forEach(([a, b], k) => {
        passos.push(['arredondarAresta', {
          origemId: idPe(i, quem === 'cima' ? 'arredondaCima' : 'arredondaBaixo', k), raio: m(T.pe_raio), paineis: T.pe_paineis,
          sel: { origem: { op: 'cubo', id }, onde: { alvo: 'aresta', normal: { dir: [a, 0, 0], ate: 8 }, extremo: { eixo: 'z', lado: b > 0 ? 'max' : 'min' } } },
        }]);
      });
    }
    for (const fx of p.faixasDoChao) {
      passos.push(['transladar', { sel: { regiao: { min: fx.min.map(m), max: fx.max.map(m) } }, d: fx.desloca.map(m) }]);
    }
    passos.push(['unir', { origemId: idPe(i, 'uniao'), solidos: [{ alias: `peCima${i}` }, { alias: `peBaixo${i}` }] }]);
  });
  saias.forEach((s, i) => passos.push(cubo(ID_SAIA(i), s)));
  passos.push(cubo(ID_TAMPO, tampo));
  ARESTAS.forEach((a, k) => {
    passos.push(['arredondarAresta', { origemId: ID_ARREDONDA(k), raio: m(T.tampo_raio_cima), paineis: T.tampo_paineis_cima, sel: selAresta(1, a) }]);
  });
  ARESTAS.forEach((a, k) => {
    passos.push(['filete', { origemId: ID_CHANFRO(k), raio: m(T.tampo_chanfro_baixo), sel: selAresta(-1, a) }]);
  });

  for (const nome of ['tampoInteiro', 'pes', 'saia']) {
    passos.push(['parte', { nome: nome === 'tampoInteiro' ? 'tampo' : nome, sel: { alias: nome } }]);
    material({ alias: nome });
  }
  return passos;
}

export const CONTATOS = [
  { par: ['pes', 'saia'], motivo: 'cada ponta de travessa, de 22 por 90 mm, encosta na face de dentro do pé, na faixa reta do pé entre y 640 e 730' },
  { par: ['pes', 'tampo'], motivo: 'o topo de cada pé, em y 730, encosta na face de baixo do tampo, dentro da área do tampo' },
  { par: ['saia', 'tampo'], motivo: 'o topo de cada travessa, em y 730, encosta na face de baixo do tampo' },
];

const receita = {
  meta: { nome: 'mesa-de-jantar', desc: 'mesa de jantar retangular de carvalho maciço, tampo de 1800 por 900 mm, quatro pés afinados por dentro e quatro travessas' },
  PARAMS: TABELA,
  MATERIAIS: { carvalho: { cor: '#b98a55', metalicidade: 0, aspereza: 0.7 } },
  ALIASES,
  TOPO: { origem: 'chão, no meio da mesa em x e em z; y para cima, comprimento em x e a frente da mesa em +z' },
  PLANO: {
    objeto: 'mesa de jantar retangular de carvalho maciço, tampo de 1800 por 900 mm e 30 mm de espessura, 760 mm de altura, quatro pés afinados por dentro e quatro travessas',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da mesa', milimetros: 760 },
    partes: [
      { nome: 'pes', forma: 'quatro pés de seção quadrada, 70 mm no topo e 45 mm no chão, afinando só nas duas faces de dentro a partir da altura da saia, quinas de raio 2', tecnica: 'dois cubos por pé unidos, arredondarAresta nas quinas dos dois e o chão do de baixo afinado por transladar nos vértices de dentro' },
      { nome: 'saia', forma: 'quatro travessas de 22 mm de espessura e 90 mm de altura, em y 640 a 730, recuadas 10 mm da face de fora do pé, de ponta encostada no pé', tecnica: 'cubo por travessa, ponta rente à face de dentro do pé' },
      { nome: 'tampo', forma: 'tábua de 1800 por 30 por 900 mm, em y 730 a 760, com balanço de 60 mm além dos pés, borda de cima arredondada em 8 e chanfro de 3 embaixo', tecnica: 'cubo com arredondarAresta de raio 8 em cima e filete embaixo' },
    ],
    criteriosDeReprovacao: [
      'pé que não afina, ou afina pelo lado de fora',
      'travessa que atravessa o pé ou fica solta dele',
      'tampo sem balanço de 60 mm ou com a borda de cima viva',
      'partes que se interpenetram além do encaixe',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const fx = T.tampo_comprimento / 2 - T.balanco;
    const fz = T.tampo_largura / 2 - T.balanco;
    const y0 = T.altura_total - T.tampo_espessura;
    return [
      { nome: 'topo do tampo', parte: 'tampo', medida: 'maximo', em: [T.tampo_comprimento / 2, T.altura_total, T.tampo_largura / 2], toleranciaMm: 0.5 },
      { nome: 'face de baixo do tampo no canto', parte: 'tampo', medida: 'minimo', em: [-T.tampo_comprimento / 2, y0, -T.tampo_largura / 2], toleranciaMm: 0.5 },
      { nome: 'chão sob o pé de fora, canto de trás à esquerda', parte: 'pes', medida: 'minimo', em: [-fx, 0, -fz], toleranciaMm: 0.5 },
      { nome: 'topo do pé na face de baixo do tampo', parte: 'pes', medida: 'maximo', em: [fx, y0, fz], toleranciaMm: 0.5 },
      { nome: 'canto de fora da saia, recuado do pé', parte: 'saia', medida: 'maximo', em: [fx - T.saia_recuo, y0, fz - T.saia_recuo], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
