/**
 * Prato fundo de cerâmica branca: uma parte só (`prato`), uma revolução em y de um perfil de seção fechada (casca de 5 mm).
 *
 * O perfil é uma lista de pontos [raio, altura] em milímetro, montada em `derivar` e separada da operação: `gerarPassos` só o
 * converte para metro e o entrega ao `lathe`. A seção percorre a face de dentro do eixo para fora (fundo plano, arco côncavo, parede,
 * ombro convexo, aba inclinada, borda de fora em meia-volta) e volta pela face de baixo, que é a de dentro deslocada em `espessura`
 * (arcos concêntricos com raio somado ou subtraído da espessura), com o anel de apoio descendo abaixo do fundo.
 */
export const TABELA = {
  diametro: 230,
  altura: 45,
  aba_largura: 35,
  poco_diametro: 155,
  poco_profundidade: 35,
  anel_diametro: 95,
  anel_altura: 5,
  anel_largura: 7.5,
  espessura: 5,
  aba_inclinacao_graus: 8,
  raio_fundo: 15,
  raio_ombro: 12,
  passos_arco: 8,
  lados: 72,
};

const rad = (g) => (g * Math.PI) / 180;

/** Perfil [raio, altura] em milímetro, do eixo no fundo de dentro, dando a volta pela face de baixo até o eixo. */
export function derivar(T) {
  const e = T.espessura;
  const a = rad(T.aba_inclinacao_graus);
  const rb = e / 2;
  const R = T.diametro / 2;
  const yf = T.altura - T.poco_profundidade;
  /* Borda de fora: centro da meia-volta, com o ponto mais alto na altura total e o mais afastado no raio total. */
  const bx = R - rb;
  const by = T.altura - rb;
  const topo = [bx - rb * Math.sin(a), by + rb * Math.cos(a)];
  /* Fim do ombro, onde a aba começa, a aba_largura de distância do raio de fora (descontado o raio da borda). */
  const sx = R - rb - T.aba_largura;
  const sy = topo[1] - (topo[0] - sx) * Math.tan(a);
  /* Ombro convexo: centro abaixo e à direita do ponto S. */
  const cx = sx + T.raio_ombro * Math.sin(a);
  const cy = sy - T.raio_ombro * Math.cos(a);
  const paredeX = cx - T.raio_ombro;
  /* Arco côncavo do fundo: centro em (x0, yf + raio_fundo), tangente ao fundo plano e à parede. */
  const x0 = paredeX - T.raio_fundo;
  const yc = yf + T.raio_fundo;
  const N = T.passos_arco;
  const arco = (cxx, cyy, r, g0, g1) => Array.from({ length: N + 1 }, (_, i) => {
    const g = g0 + ((g1 - g0) * i) / N;
    return [cxx + r * Math.cos(g), cyy + r * Math.sin(g)];
  });
  const dentro = [
    [0, yf],
    ...arco(x0, yc, T.raio_fundo, -Math.PI / 2, 0),
    ...arco(cx, cy, T.raio_ombro, Math.PI, Math.PI / 2 + a),
    topo,
    ...arco(bx, by, rb, Math.PI / 2 + a, a - Math.PI / 2),
  ];
  const embaixo = [
    ...arco(cx, cy, T.raio_ombro - e, Math.PI / 2 + a, Math.PI),
    ...arco(x0, yc, T.raio_fundo + e, 0, -Math.PI / 2),
  ];
  const re = T.anel_diametro / 2;
  const anel = [[re, yf - e], [re, yf - e - T.anel_altura], [re - T.anel_largura, yf - e - T.anel_altura], [re - T.anel_largura, yf - e], [0, yf - e]];
  const todos = [...dentro, ...embaixo, ...anel];
  /* Sem pontos repetidos em sequência (as juntas dos arcos coincidem). */
  const perfil = todos.filter((p, i) => i === 0 || Math.hypot(p[0] - todos[i - 1][0], p[1] - todos[i - 1][1]) > 1e-6);
  return { perfil, topo: R, altura: T.altura };
}

const m = (mm) => mm / 1000;
const ANGULO_LISO = 40;

export function gerarPassos(T) {
  const { perfil } = derivar(T);
  const sel = { origem: { op: 'lathe', id: 1 } };
  return [
    ['lathe', { origemId: 1, eixo: 'y', lados: T.lados, perfil: perfil.map(([r, y]) => [m(r), m(y)]) }],
    ['parte', { nome: 'prato', sel }],
    ['material', { usa: 'ceramica', sel }],
    ['liso', { angulo: ANGULO_LISO, sel }],
  ];
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'prato-fundo', desc: 'prato fundo de cerâmica branca, revolução de uma casca de 5 mm com aba inclinada, poço e anel de apoio' },
  PARAMS: TABELA,
  MATERIAIS: { ceramica: { cor: '#f4f2ec', metalicidade: 0, aspereza: 0.25 } },
  TOPO: { origem: 'centro do plano de apoio, sob o anel; y para cima, eixo de revolução em y' },
  PLANO: {
    objeto: 'prato fundo de cerâmica branca de 230 mm de diâmetro e 45 mm de altura, aba de 35 mm, poço de 155 mm e anel de apoio de 95 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro total da peça', milimetros: 230 },
    partes: [
      {
        nome: 'prato',
        forma: 'casca de 5 mm de revolução: aba de 35 mm inclinada para cima com borda de fora redonda, poço de 155 mm e 35 mm de fundo, fundo plano, transição em curva, anel de apoio de 95 mm e 5 mm de altura por baixo',
        tecnica: 'lathe de perfil fechado (lista [raio, altura] em derivar, arcos concêntricos para a espessura) com liso',
      },
    ],
    criteriosDeReprovacao: [
      'prato maciço, sem a cavidade do poço entre as faces de dentro e de baixo',
      'aba plana, sem inclinação ou sem borda de fora arredondada',
      'sem anel de apoio por baixo',
      'transição aba-poço em degrau',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const R = T.diametro / 2;
    return [
      { nome: 'topo da borda', parte: 'prato', medida: 'maximo', em: [R, T.altura, R], toleranciaMm: 0.5 },
      { nome: 'base do anel', parte: 'prato', medida: 'minimo', em: [-R, 0, -R], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
