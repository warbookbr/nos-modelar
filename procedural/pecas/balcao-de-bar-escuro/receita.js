/* balcao-de-bar-escuro — balcão de bar de madeira escura: corpo fechado por duas portas de frente, rodapé recuado, tampo
 * que avança sobre o corpo e dois puxadores verticais, um em cada porta.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do balcão em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha o balcão de frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em caixas
 * e `gerarPassos` escreve, por parte, uma `chamferBox` e a `parte` com o nome e o material que a parte usa.
 *
 * Forma e medidas: a base é a receita externa de balcão convertida em passos (conversão mecânica com alinhamento), e esta
 * reescrita mantém as medidas dela com diferença de 0,0 mm em cada caixa, na caixa total (x ±500, y 0 a 1200, z -440 a 210) e
 * na posição das partes. Mudanças em relação à base: os nomes das partes passam para camelCase em português (corpo, tampo,
 * rodape, portas_x e portas viram portaEsq e portaDir, puxadores e puxadores_x viram puxadorDir e puxadorEsq), as medidas
 * passam a ser redondas em milímetro na TABELA, e cada parte recebe o material declarado em MATERIAIS. O material dos puxadores
 * não tem cor na base; a cor escolhida é uma escolha de material, sem PBR novo.
 */

export const TABELA = {
  corpo_meia_x: 480,
  corpo_y0: 100,
  corpo_altura: 1000,
  corpo_z_tras: -435,
  corpo_z_frente: 165,
  corpo_chanfro: 5,

  tampo_meia_x: 500,
  tampo_y0: 1100,
  tampo_espessura: 100,
  tampo_z_tras: -440,
  tampo_z_frente: 190,
  tampo_chanfro: 8,

  rodape_meia_x: 490,
  rodape_altura: 100,
  rodape_z_tras: -435,
  rodape_z_frente: 175,
  rodape_chanfro: 6,

  porta_x_interno: 10,
  porta_largura: 450,
  porta_y0: 120,
  porta_altura: 980,
  porta_z_frente: 190,
  porta_espessura: 25,
  porta_chanfro: 5,

  puxador_x_do_centro: 55,
  puxador_largura: 30,
  puxador_y0: 790,
  puxador_altura: 150,
  puxador_z_frente: 210,
  puxador_espessura: 20,
  puxador_chanfro: 3,
};

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, chanfro, material }. */
export function derivar(T) {
  const caixas = [];

  /* corpo: o volume fechado, de x ±480, do topo do rodapé até o topo do corpo, do fundo em -435 até a frente em +165. */
  caixas.push({
    nome: 'corpo',
    x0: -T.corpo_meia_x, x1: T.corpo_meia_x,
    y0: T.corpo_y0, y1: T.corpo_y0 + T.corpo_altura,
    z0: T.corpo_z_tras, z1: T.corpo_z_frente,
    chanfro: T.corpo_chanfro, material: 'madeiraCorpo',
  });

  /* tampo: sobre o corpo, com 10 mm de balanço em x e 25 mm à frente, e 5 mm atrás do corpo. */
  caixas.push({
    nome: 'tampo',
    x0: -T.tampo_meia_x, x1: T.tampo_meia_x,
    y0: T.tampo_y0, y1: T.tampo_y0 + T.tampo_espessura,
    z0: T.tampo_z_tras, z1: T.tampo_z_frente,
    chanfro: T.tampo_chanfro, material: 'madeiraTampo',
  });

  /* rodapé: faixa recuada sob o corpo, do chão até a face de baixo do corpo. */
  caixas.push({
    nome: 'rodape',
    x0: -T.rodape_meia_x, x1: T.rodape_meia_x,
    y0: 0, y1: T.rodape_altura,
    z0: T.rodape_z_tras, z1: T.rodape_z_frente,
    chanfro: T.rodape_chanfro, material: 'madeiraRodape',
  });

  /* portas: duas folhas de 450 por 980 mm com 20 mm de vão entre elas, encostadas na face de frente do corpo. */
  const xPorta1 = T.porta_x_interno;
  const xPorta0 = xPorta1 + T.porta_largura;
  const zPorta1 = T.porta_z_frente;
  const zPorta0 = zPorta1 - T.porta_espessura;
  for (const [nome, sinal] of [['portaDir', +1], ['portaEsq', -1]]) {
    const { x0, x1 } = sinal > 0 ? { x0: xPorta1, x1: xPorta0 } : { x0: -xPorta0, x1: -xPorta1 };
    caixas.push({
      nome, x0, x1,
      y0: T.porta_y0, y1: T.porta_y0 + T.porta_altura,
      z0: zPorta0, z1: zPorta1,
      chanfro: T.porta_chanfro, material: 'madeiraPorta',
    });
  }

  /* puxadores: barras de 30 por 150 mm, 20 mm para fora da face de frente de cada porta, de 55 a 85 mm do centro em x. */
  const xPuxador1 = T.puxador_x_do_centro + T.puxador_largura;
  const zPuxador1 = T.puxador_z_frente;
  const zPuxador0 = zPuxador1 - T.puxador_espessura;
  for (const [nome, sinal] of [['puxadorDir', +1], ['puxadorEsq', -1]]) {
    const { x0, x1 } = sinal > 0
      ? { x0: T.puxador_x_do_centro, x1: xPuxador1 }
      : { x0: -xPuxador1, x1: -T.puxador_x_do_centro };
    caixas.push({
      nome, x0, x1,
      y0: T.puxador_y0, y1: T.puxador_y0 + T.puxador_altura,
      z0: zPuxador0, z1: zPuxador1,
      chanfro: T.puxador_chanfro, material: 'puxador',
    });
  }

  return caixas;
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma `chamferBox` por parte, em metro, com a `parte` e o `material` logo depois. `em` é o centro em x e z e a base em y. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    passos.push(['chamferBox', {
      origemId: id,
      larg: m(c.x1 - c.x0),
      alt: m(c.y1 - c.y0),
      prof: m(c.z1 - c.z0),
      chanfro: m(c.chanfro),
      em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
    }]);
    passos.push(['parte', { nome: c.nome, sel: { origem: { op: 'chamferBox', id } } }]);
    passos.push(['material', { sel: { origem: { op: 'chamferBox', id } }, usa: c.material }]);
  });
  return passos;
}

/* Os contatos por face do balcão: cada par se toca pela face indicada no motivo. */
export const CONTATOS = [
  { par: ['rodape', 'corpo'], motivo: 'a face de cima do rodapé encosta na face de baixo do corpo, e o rodapé fica recuado' },
  { par: ['corpo', 'tampo'], motivo: 'a face de baixo do tampo assenta na face de cima do corpo, e o tampo avança à frente e aos lados' },
  { par: ['portaDir', 'corpo'], motivo: 'a face de trás da porta encosta na face de frente do corpo, na metade direita' },
  { par: ['portaEsq', 'corpo'], motivo: 'a face de trás da porta encosta na face de frente do corpo, na metade esquerda' },
  { par: ['portaDir', 'tampo'], motivo: 'a face de cima da porta encosta na face de baixo do tampo, sem atravessá-lo' },
  { par: ['portaEsq', 'tampo'], motivo: 'a face de cima da porta encosta na face de baixo do tampo, sem atravessá-lo' },
  { par: ['puxadorDir', 'portaDir'], motivo: 'a face de trás do puxador encosta na face de frente da porta direita' },
  { par: ['puxadorEsq', 'portaEsq'], motivo: 'a face de trás do puxador encosta na face de frente da porta esquerda' },
];

const receita = {
  meta: { nome: 'balcao-de-bar-escuro', desc: 'balcão de bar de madeira escura, com corpo fechado por duas portas, rodapé recuado, tampo e dois puxadores' },
  PARAMS: TABELA,
  MATERIAIS: {
    madeiraCorpo: { cor: '#26211d', metalicidade: 0, aspereza: 0.8 },
    madeiraTampo: { cor: '#403a36', metalicidade: 0, aspereza: 0.8 },
    madeiraRodape: { cor: '#2e2823', metalicidade: 0, aspereza: 0.8 },
    madeiraPorta: { cor: '#302924', metalicidade: 0, aspereza: 0.8 },
    puxador: { cor: '#2b2b2b', metalicidade: 0, aspereza: 0.6 },
  },
  TOPO: { origem: 'chão, no meio do balcão em x e em z; y para cima e a frente do balcão em +z' },
  PLANO: {
    objeto: 'balcão de bar de madeira escura de 1000 mm de largura, 650 mm de profundidade e 1200 mm de altura, com corpo fechado por duas portas e tampo',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do balcão', milimetros: 1200 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'corpo', forma: 'caixa de 960 por 1000 por 600 mm, chanfro de 5 mm, de y 100 a 1100', tecnica: 'chamferBox com a base em y 100, sobre o rodapé' },
      { nome: 'tampo', forma: 'tampo de 1000 por 100 por 630 mm, chanfro de 8 mm, de y 1100 a 1200', tecnica: 'chamferBox assentada na face de cima do corpo, com balanço de 10 mm em x e 25 mm à frente' },
      { nome: 'rodape', forma: 'faixa de 980 por 100 por 610 mm, chanfro de 6 mm, do chão a y 100', tecnica: 'chamferBox recuada sob o corpo, com a face de cima encostada na face de baixo do corpo' },
      { nome: 'portaEsq', forma: 'folha de 450 por 980 por 25 mm, chanfro de 5 mm, na metade esquerda da frente do corpo', tecnica: 'chamferBox com a face de trás na face de frente do corpo, de x -460 a -10' },
      { nome: 'portaDir', forma: 'folha de 450 por 980 por 25 mm, chanfro de 5 mm, na metade direita da frente do corpo', tecnica: 'chamferBox com a face de trás na face de frente do corpo, de x 10 a 460' },
      { nome: 'puxadorEsq', forma: 'barra de 30 por 150 por 20 mm, chanfro de 3 mm, na frente da porta esquerda', tecnica: 'chamferBox com a face de trás na face de frente da porta esquerda, de x -85 a -55' },
      { nome: 'puxadorDir', forma: 'barra de 30 por 150 por 20 mm, chanfro de 3 mm, na frente da porta direita', tecnica: 'chamferBox com a face de trás na face de frente da porta direita, de x 55 a 85' },
    ],
    criteriosDeReprovacao: [
      'o balcão não toca o chão pelo rodapé, ou o corpo não assenta sobre o rodapé',
      'o tampo não assenta sobre o corpo, ou não avança à frente do corpo',
      'uma porta atravessa o corpo ou o tampo em vez de encostar na face de frente',
      'um lado do balcão difere do outro em medida ou posição de peça',
      'um puxador não fica na frente da porta, ou não está de x 55 a 85 mm do centro',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
