/* freezer-horizontal — freezer horizontal de tampo: corpo branco sobre o chão, junta escura que cobre o topo do corpo, tampo
 * arredondado assentado sobre a junta, puxador na frente do tampo, duas dobradiças presas na face de trás e quatro grades de
 * ventilação na face de trás do corpo.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do freezer em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha o freezer de frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em caixas
 * e `gerarPassos` escreve, por parte, a forma (`cubo` com `arredondarAresta` nas doze arestas, ou `chamferBox` nas partes
 * pequenas), a `parte` e o `material` logo depois.
 *
 * Forma e medidas: a base é a receita externa de freezer convertida em passos com alinhamento das caixas. Pela regra da conversão,
 * a face de cima do corpo (680 na alinhada, 668 na crua, 12 mm de diferença) e as duas faces em x do puxador (7,2 mm de diferença)
 * vêm da versão crua, porque a diferença passa de 6 mm. As demais faces vêm da alinhada. Desde a segunda rodada, a receita sai da
 * base em três pontos pedidos pela pessoa, cada um com o motivo abaixo.
 *
 * Mudanças em relação à base, cada uma com o motivo:
 *  - os nomes das partes passam para camelCase em português: dobradica0 vira dobradicaDir (x +340), dobradica1 vira dobradicaEsq
 *    (x -300), e grade0 a grade3 viram gradeUm, gradeDois, gradeTres e gradeQuatro, da maior x para a menor.
 *  - as medidas passam a ser inteiras em milímetro (a base tinha décimos de milímetro).
 *  - tampa mais fina em duas etapas (pedido da pessoa): primeiro 10 mm, depois mais 30 mm. O tampo vai de y 680 a 776, com 96 mm de
 *    espessura, em vez de 680 a 816 (136 mm) da base. A altura total em y passa de 816 para 776 mm. A profundidade total em z não
 *    muda (787 mm, de z -530 a 257), porque é dada pelas dobradiças e pelo puxador. O puxador segue 35 mm acima da face de baixo do
 *    tampo (y 715 a 740): o centro do tampo fica em y 728 e o do puxador em 727,5, então ele já está centralizado e não muda. As
 *    dobradiças não mudam de posição, pois seus 20 mm de encosto no tampo continuam dentro dele (de y 680 a 720). O arredondamento de
 *    8 mm cabe nos 96 mm, com 16 mm de arredondamento em cada lado e 80 mm de face plana.
 *  - arestas arredondadas em vez de chanfro de uma face (pedido da pessoa): o corpo e o tampo têm raio de 8 mm nas doze arestas, em
 *    quatro painéis, por `arredondarAresta` com `sel.onde`, como no micro-ondas e na lava-louças do acervo. O corpo tinha chanfro de
 *    12 mm e o tampo de 27,18 mm. O raio de 8 mm fica acima de 6 mm para não gerar faixas finas em arestas longas. A junta mantém o
 *    chanfro de 4 mm, que já era pequeno, e o puxador e as dobradiças passam de 5 e 6 mm para 2 mm. As grades mantêm 1 mm.
 *  - material do gabinete (pedido da pessoa): corpo, tampo e puxador usam `branco`, com a cor #f3f3ee e desgaste 0,02. Testei o
 *    tipo `liso` e `metal` com `acabamento: 'pintado'` nas duas vistas com textura. O `metal` pintado saiu cinza e com cara de chapa,
 *    e o `liso` saiu mais branco e mais limpo, então o gabinete fica em `liso`. O lustro entra como `brilho` 0,7 no material `branco`, que o .mtl grava em Ns e Ks.
 *    As dobradiças também passam a `branco` (pedido da pessoa), e o `metal` sai da lista de materiais. A junta e as grades mantêm
 *    `liso` escuro, como estavam.
 *  - a receita original não traz a tabela `cores`. A cor da junta e das grades é uma escolha de material, tirada da descrição da
 *    própria receita ("junta escura"). O desgaste 0,6 que a original declarava para o metal deixa de valer, porque o metal saiu.
 *
 * Assimetria da base, mantida sem correção: o corpo tem o eixo em x -2,5 mm, as dobradiças caem em +340 e -300 mm e o puxador tem
 * o centro em +5 mm. A origem do referencial fica no chão, em x e z da base convertida, sem deslocamento.
 */

export const TABELA = {
  corpo_x0: -473,
  corpo_x1: 468,
  corpo_y1: 668,
  corpo_z0: -488,
  corpo_z1: 225,
  corpo_raio: 8,

  junta_x0: -485,
  junta_x1: 480,
  junta_y0: 655,
  junta_y1: 680,
  junta_z0: -500,
  junta_z1: 237,
  junta_chanfro: 4,

  tampo_x0: -485,
  tampo_x1: 480,
  tampo_y0: 680,
  tampo_y1: 776,
  tampo_z0: -500,
  tampo_z1: 237,
  tampo_raio: 8,

  puxador_x0: -175,
  puxador_x1: 185,
  puxador_y0: 715,
  puxador_y1: 740,
  puxador_z0: 237,
  puxador_z1: 257,
  puxador_chanfro: 2,

  dobradica_x_dir: 340,
  dobradica_x_esq: -300,
  dobradica_largura: 50,
  dobradica_y0: 620,
  dobradica_y1: 720,
  dobradica_z0: -530,
  dobradica_z1: -500,
  dobradica_chanfro: 2,

  grade_x_primeira: 400,
  grade_passo: 50,
  grade_largura: 20,
  grade_y0: 40,
  grade_y1: 170,
  grade_z0: -502,
  grade_z1: -488,
  grade_chanfro: 1,

  arredondamento_paineis: 4,
};

/* As doze arestas de uma caixa: [normal da face vizinha, eixo e lado do extremo]. `sel.onde` a escolhe sem citar id. */
const CIMA = [0, 1, 0];
const BAIXO = [0, -1, 0];
const FRENTE = [0, 0, 1];
const TRAS = [0, 0, -1];
const ARESTAS_DA_CAIXA = [
  ...[CIMA, BAIXO].flatMap((n) => [['x', 'max'], ['x', 'min'], ['z', 'max'], ['z', 'min']].map(([e, l]) => [n, e, l])),
  ...[FRENTE, TRAS].flatMap((n) => [['x', 'max'], ['x', 'min']].map(([e, l]) => [n, e, l])),
];

/* Caixas em milímetro: { nome, forma, x0, x1, y0, y1, z0, z1, material, ... }. `forma` é cubo (com `arestas` e `raio` quando
 * arredondado) ou chamferBox (com `chanfro`). O corpo começa no chão, em y 0. */
export function derivar(T) {
  const caixas = [];

  caixas.push({
    nome: 'corpo', forma: 'cubo', x0: T.corpo_x0, x1: T.corpo_x1, y0: 0, y1: T.corpo_y1, z0: T.corpo_z0, z1: T.corpo_z1,
    arestas: ARESTAS_DA_CAIXA, raio: T.corpo_raio, material: 'branco',
  });

  /* junta: faixa escura que cobre o topo do corpo e avança 12 mm além dele em x e em z */
  caixas.push({
    nome: 'junta', forma: 'chamferBox', x0: T.junta_x0, x1: T.junta_x1, y0: T.junta_y0, y1: T.junta_y1, z0: T.junta_z0, z1: T.junta_z1,
    chanfro: T.junta_chanfro, material: 'liso',
  });

  /* tampo: assentado sobre a junta, com a mesma pegada dela, e 96 mm de espessura */
  caixas.push({
    nome: 'tampo', forma: 'cubo', x0: T.tampo_x0, x1: T.tampo_x1, y0: T.tampo_y0, y1: T.tampo_y1, z0: T.tampo_z0, z1: T.tampo_z1,
    arestas: ARESTAS_DA_CAIXA, raio: T.tampo_raio, material: 'branco',
  });

  /* puxador: barra na frente do tampo, com a face de trás encostada na face de frente */
  caixas.push({
    nome: 'puxador', forma: 'chamferBox', x0: T.puxador_x0, x1: T.puxador_x1, y0: T.puxador_y0, y1: T.puxador_y1, z0: T.puxador_z0, z1: T.puxador_z1,
    chanfro: T.puxador_chanfro, material: 'branco',
  });

  /* dobradiças: presas na face de trás da junta e do tampo, e saindo 30 mm para trás */
  for (const [nome, cx] of [['dobradicaDir', T.dobradica_x_dir], ['dobradicaEsq', T.dobradica_x_esq]]) {
    caixas.push({
      nome, forma: 'chamferBox', x0: cx - T.dobradica_largura / 2, x1: cx + T.dobradica_largura / 2, y0: T.dobradica_y0, y1: T.dobradica_y1,
      z0: T.dobradica_z0, z1: T.dobradica_z1, chanfro: T.dobradica_chanfro, material: 'branco',
    });
  }

  /* grades: quatro lâminas na face de trás do corpo, espaçadas de `grade_passo` */
  ['gradeUm', 'gradeDois', 'gradeTres', 'gradeQuatro'].forEach((nome, k) => {
    const cx = T.grade_x_primeira - k * T.grade_passo;
    caixas.push({
      nome, forma: 'chamferBox', x0: cx - T.grade_largura / 2, x1: cx + T.grade_largura / 2, y0: T.grade_y0, y1: T.grade_y1,
      z0: T.grade_z0, z1: T.grade_z1, chanfro: T.grade_chanfro, material: 'liso',
    });
  });

  return caixas;
}

const m = (mm) => mm / 1000;
const idArredonda = (i, k) => 10000 + 100 * i + k;

/* A seleção que a parte usa: a caixa arredondada é a união da caixa com as faixas que o arredondamento cria (alias). */
function selDaParte(c, i) {
  if (c.arestas) return { alias: `${c.nome}Inteiro` };
  return { origem: { op: c.forma, id: i } };
}

export const ALIASES = (() => {
  const aliases = [];
  derivar(TABELA).forEach((c, i0) => {
    if (!c.arestas) return;
    const i = i0 + 1;
    aliases.push([`${c.nome}Inteiro`, { unir: [
      { origem: { op: 'cubo', id: i } },
      ...c.arestas.map((_, k) => ({ origem: { op: 'arredondarAresta', id: idArredonda(i, k) } })),
    ] }]);
  });
  return aliases;
})();

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. `em` é o centro em x e z e a base em y. */
export function gerarPassos(T) {
  const passos = [];
  const centro = (c) => [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)];
  const medidas = (c) => ({ larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0) });
  derivar(T).forEach((c, i0) => {
    const i = i0 + 1;
    const sel = selDaParte(c, i);
    if (c.arestas) {
      passos.push(['cubo', { origemId: i, ...medidas(c), em: centro(c) }]);
      c.arestas.forEach(([dir, eixo, lado], k) => {
        passos.push(['arredondarAresta', {
          origemId: idArredonda(i, k), raio: m(c.raio), paineis: T.arredondamento_paineis,
          sel: { origem: { op: 'cubo', id: i }, onde: { alvo: 'aresta', normal: { dir, ate: 5 }, extremo: { eixo, lado } } },
        }]);
      });
    } else {
      passos.push(['chamferBox', { origemId: i, ...medidas(c), chanfro: m(c.chanfro), em: centro(c) }]);
    }
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
    if (c.arestas) passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

/* Os contatos entre as partes. Cada par se toca pela face indicada no motivo, ou embute o que o motivo diz. */
export const CONTATOS = [
  { par: ['corpo', 'junta'], motivo: 'a junta começa em y 655, 13 mm abaixo do topo do corpo em y 668, e embute esses 13 mm para cobri-lo' },
  { par: ['junta', 'tampo'], motivo: 'a face de cima da junta, em y 680, encosta na face de baixo do tampo, que assenta sobre ela' },
  { par: ['puxador', 'tampo'], motivo: 'a face de trás do puxador, em z 237, encosta na face de frente do tampo, e o puxador sai 20 mm à frente' },
  { par: ['dobradicaDir', 'junta'], motivo: 'a face de trás da junta, em z -500, encosta na face de frente da dobradica, que sai 30 mm para trás' },
  { par: ['dobradicaEsq', 'junta'], motivo: 'a face de trás da junta, em z -500, encosta na face de frente da dobradica, que sai 30 mm para trás' },
  { par: ['dobradicaDir', 'tampo'], motivo: 'a face de trás do tampo, em z -500, encosta na face de frente da dobradica, na faixa de y 680 a 720' },
  { par: ['dobradicaEsq', 'tampo'], motivo: 'a face de trás do tampo, em z -500, encosta na face de frente da dobradica, na faixa de y 680 a 720' },
  { par: ['gradeUm', 'corpo'], motivo: 'a face de frente da grade, em z -488, encosta na face de trás do corpo, e a grade sai 14 mm para trás' },
  { par: ['gradeDois', 'corpo'], motivo: 'a face de frente da grade, em z -488, encosta na face de trás do corpo, e a grade sai 14 mm para trás' },
  { par: ['gradeTres', 'corpo'], motivo: 'a face de frente da grade, em z -488, encosta na face de trás do corpo, e a grade sai 14 mm para trás' },
  { par: ['gradeQuatro', 'corpo'], motivo: 'a face de frente da grade, em z -488, encosta na face de trás do corpo, e a grade sai 14 mm para trás' },
];

export const PASSOS = gerarPassos(TABELA);

const receita = {
  meta: { nome: 'freezer-horizontal', desc: 'freezer horizontal de tampo branco, com corpo arredondado, junta escura, tampo, puxador frontal, duas dobradiças traseiras e quatro grades de ventilação' },
  PARAMS: TABELA,
  MATERIAIS: {
    branco: { tipo: 'liso', cor: '#f3f3ee', desgaste: 0.02, brilho: 0.7 },
    liso: { tipo: 'liso', cor: '#2b2b2b' },
  },
  TOPO: { origem: 'chão, em x e z da base convertida, sem deslocamento; y para cima e a frente do freezer em +z' },
  PLANO: {
    objeto: 'freezer horizontal de tampo, branco, de 965 mm de largura, 787 mm de profundidade e 776 mm de altura, com corpo arredondado, junta escura, tampo, puxador frontal, duas dobradiças traseiras e quatro grades atrás',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do freezer', milimetros: 776 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'corpo', forma: 'caixa de 941 por 668 por 713 mm, arredondamento de 8 mm, de y 0 a 668', tecnica: 'cubo com as doze arestas arredondadas em 4 painéis por arredondarAresta, sobre o chão, com a face de trás em z -488 e a de frente em z 225' },
      { nome: 'junta', forma: 'faixa de 965 por 25 por 737 mm, chanfro de 4 mm, de y 655 a 680', tecnica: 'chamferBox que cobre o topo do corpo e avança 12 mm além dele em x e em z, com a face de cima encostada no tampo' },
      { nome: 'tampo', forma: 'placa de 965 por 96 por 737 mm, arredondamento de 8 mm, de y 680 a 776', tecnica: 'cubo com as doze arestas arredondadas em 4 painéis por arredondarAresta, assentado na face de cima da junta' },
      { nome: 'puxador', forma: 'barra de 360 por 25 por 20 mm, chanfro de 2 mm, de x -175 a 185 e de y 715 a 740', tecnica: 'chamferBox com a face de trás encostada na face de frente do tampo, saindo 20 mm à frente' },
      { nome: 'dobradicaDir', forma: 'peça de 50 por 100 por 30 mm, chanfro de 2 mm, de x 315 a 365 e de y 620 a 720', tecnica: 'chamferBox presa na face de trás da junta e do tampo, saindo 30 mm para trás' },
      { nome: 'dobradicaEsq', forma: 'peça de 50 por 100 por 30 mm, chanfro de 2 mm, de x -325 a -275 e de y 620 a 720', tecnica: 'chamferBox presa na face de trás da junta e do tampo, saindo 30 mm para trás' },
      { nome: 'gradeUm', forma: 'lâmina de 20 por 130 por 14 mm, chanfro de 1 mm, de x 390 a 410 e de y 40 a 170', tecnica: 'chamferBox encostada na face de trás do corpo, saindo 14 mm para trás' },
      { nome: 'gradeDois', forma: 'lâmina de 20 por 130 por 14 mm, chanfro de 1 mm, de x 340 a 360 e de y 40 a 170', tecnica: 'chamferBox encostada na face de trás do corpo, saindo 14 mm para trás' },
      { nome: 'gradeTres', forma: 'lâmina de 20 por 130 por 14 mm, chanfro de 1 mm, de x 290 a 310 e de y 40 a 170', tecnica: 'chamferBox encostada na face de trás do corpo, saindo 14 mm para trás' },
      { nome: 'gradeQuatro', forma: 'lâmina de 20 por 130 por 14 mm, chanfro de 1 mm, de x 240 a 260 e de y 40 a 170', tecnica: 'chamferBox encostada na face de trás do corpo, saindo 14 mm para trás' },
    ],
    criteriosDeReprovacao: [
      'o freezer não toca o chão pelo corpo, ou o corpo não assenta no chão',
      'o tampo não assenta sobre a junta, ou a junta não cobre o topo do corpo',
      'uma dobradiça não fica presa na face de trás da junta e do tampo, ou fica à frente delas',
      'o puxador não fica na face de frente do tampo, ou não sai à frente dele',
      'uma aresta do corpo ou do tampo fica viva, ou uma faixa fina de arredondamento aparece como lasca',
    ],
  },
  contatos: CONTATOS,
  ALIASES,
  PASSOS,
};

export default receita;
