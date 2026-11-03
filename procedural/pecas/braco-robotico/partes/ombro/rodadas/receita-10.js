/* braco-robotico/ombro — volta ao desenho aceito pela pessoa em 2026-09-29
 * (receita do commit ec06c461) no tamanho da opção B de 2026-11-03: 190 mm de
 * largura, eixo da junta a 115 mm da boca de baixo e topo a 210 mm.
 *
 * O corpo é a união de dois lofts. A parte de pé sobe da boca de baixo, com a
 * frente recuada em relação à parte deitada (o degrau em L). A parte deitada
 * atravessa o topo de trás até a saída redonda, de raio igual à meia largura,
 * por isso nada da saída sobra por baixo nem bate na frente da parte de pé. Na
 * faixa junto ao anel a seção passa de quase quadrada a redonda variando o
 * expoente da superelipse em muitas estações com raio constante, em vez de
 * duas seções longas. O encontro de baixo, entre a frente da parte de pé e a
 * face de baixo da parte deitada, leva um arredondamento leve. O anel é uma
 * faixa fina escura que encosta na face da saída sem entrar nela.
 *
 * Portas:
 *   apoio        — anel, eixo +Y, centro no meio da boca de baixo, borda de
 *                  baixo do pé. Senta no `topo` do anel da cintura.
 *   juntaDoOmbro — cilindro, eixo +Z, centro no meio da face da frente do
 *                  anel, raio do anel.
 */

export const TABELA = {
  /* Vem do anel da cintura pela montagem. */
  raioDoPescoco: 105,
  /* Altura do eixo da saída acima da boca de baixo (opção B). */
  alturaDoEixo: 115,
  /* Meia largura da seção de cima: 190 mm de largura. O topo fica em
     alturaDoEixo + meiaLargura = 210 mm. */
  meiaLargura: 95,
  /* Expoente da superelipse da seção quase quadrada: 2 é círculo, 4 é
     quadrado de cantos arredondados. */
  expoenteDoTopo: 4,
  /* Quanto a frente da parte de pé fica recuada em relação à frente da parte
     deitada: o degrau do L. */
  recuoDaFrente: 30,
  /* Trecho do braço, antes da saída, em que a seção passa de quase quadrada a
     redonda, em estações de expoente decrescente. */
  transicaoDaSaida: 25,
  /* Anel da junta: faixa fina, mesmo raio da saída. */
  espessuraDoAnel: 28,
  /* Raio da concordância no encontro de baixo entre a frente da parte de pé e
     a parte deitada. */
  raioDoEncontro: 8,
  chanfroDoPescoco: 2,
  /* Estações da transição quadrado-redondo. */
  estacoesDaSaida: 7,
  /* Seções intermediárias de cada loft, para os triângulos da emenda ficarem
     curtos: triângulo longo faz o sombreamento suave virar degrau. */
  estacoes: 6,
  lados: 48,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
/* `n` valores igualmente espaçados estritamente entre `de` e `ate`. */
const entre = (de, ate, n) => Array.from({ length: n }, (_, k) => de + ((ate - de) * (k + 1)) / (n + 1));
const ID = { coluna: 100, anel: 200, braco: 300, corpo: 400, concordancia: 500 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoPescoco);
  const yEixo = m(t.alturaDoEixo);
  const h = m(t.meiaLargura);
  /* A frente da parte deitada e a saída ficam em z = h. */
  const zFace = h;
  const zTransicao = zFace - m(t.transicaoDaSaida);
  /* A saída redonda tem o diâmetro da largura do bloco (raio = meia largura):
     nada dela sobra por baixo nem pelos lados. */
  const Rs = h;
  const Ra = Rs;
  const e = m(t.espessuraDoAnel);
  const c = m(t.chanfroDoPescoco);
  return { R, yEixo, h, zFace, zTransicao, Rs, Ra, e, c };
}

/* Contorno de superelipse com `lados` pontos, u no eixo X do mundo. */
function contorno(r, n, lados) {
  const pts = [];
  for (let k = 0; k < lados; k++) {
    const th = (2 * Math.PI * k) / lados;
    const cs = Math.cos(th), sn = Math.sin(th);
    pts.push([r * Math.sign(cs) * Math.abs(cs) ** (2 / n), r * Math.sign(sn) * Math.abs(sn) ** (2 / n)]);
  }
  return pts;
}

/* Seção da parte de pé: frente arredondada como a do braço, mas recuada, e
   lado de trás reto, de cantos vivos, para a parede de trás descer do braço
   até o pé. */
function contornoColuna(r, nFrente, lados, recuo) {
  const pts = [];
  const frente = lados - 2;
  for (let k = 0; k < frente; k++) {
    const th = (Math.PI * k) / (frente - 1);
    const cs = Math.cos(th), sn = Math.sin(th);
    const v = r * Math.sign(sn) * Math.abs(sn) ** (2 / nFrente);
    pts.push([r * Math.sign(cs) * Math.abs(cs) ** (2 / nFrente), v * (1 - recuo / r)]);
  }
  pts.push([-r, -r], [r, -r]);
  return pts;
}

export function gerarPassos(t = TABELA) {
  const { R, yEixo, h, zFace, zTransicao, Rs, Ra, e, c } = derivar(t);
  const L = t.lados;
  const nTopo = t.expoenteDoTopo;
  const sec = (pos, r, n) => ({ pos, contorno: contorno(r, n, L) });
  const recuo = m(t.recuoDaFrente);
  const secColuna = (y, r) => ({ pos: [0, y, 0], contorno: contornoColuna(r, nTopo, L, recuo) });
  /* Parte de pé: sobe da boca de baixo até a altura do eixo, com a seção de
     frente recuada, e termina dentro da parte deitada. */
  const coluna = [
    { pos: [0, 0, 0], raio: 0 },
    secColuna(0.0004, h - c),
    secColuna(c, h),
    ...entre(c, yEixo - 0.0004, t.estacoes).map((y) => secColuna(y, h)),
    secColuna(yEixo - 0.0004, h),
    { pos: [0, yEixo, 0], raio: 0 },
  ];
  /* Parte deitada: atravessa o topo de trás até a saída redonda. A transição
     de quase quadrada a redonda é feita em estações cujo expoente cai de
     forma suave (cosseno), com o raio constante, para as faces não ganharem
     facetas nem torcerem o sombreamento. */
  const ns = t.estacoesDaSaida;
  const transicao = [];
  for (let k = 1; k <= ns; k++) {
    const f = k / (ns + 1);
    const s = 0.5 - 0.5 * Math.cos(Math.PI * f);
    const z = zTransicao + (zFace - c - zTransicao) * f;
    transicao.push(sec([0, yEixo, z], h, nTopo + (2 - nTopo) * s));
  }
  const braco = [
    { pos: [0, yEixo, -h], raio: 0 },
    sec([0, yEixo, -h + 0.0004], h, nTopo),
    ...entre(-h + 0.0004, zTransicao, t.estacoes).map((z) => sec([0, yEixo, z], h, nTopo)),
    sec([0, yEixo, zTransicao], h, nTopo),
    ...transicao,
    sec([0, yEixo, zFace - c], Rs, 2),
    sec([0, yEixo, zFace - 0.0004], Rs - c, 2),
    { pos: [0, yEixo, zFace], raio: 0 },
  ];
  const corpo = { origem: { op: 'unir', id: ID.corpo } };
  const concordancia = { origem: { op: 'arredondarCostura', id: ID.concordancia } };
  const passos = [];
  passos.push(['loft', { origemId: ID.coluna, secoes: coluna, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['loft', { origemId: ID.braco, secoes: braco, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['unir', { origemId: ID.corpo, solidos: [{ origem: { op: 'loft', id: ID.coluna } }, { origem: { op: 'loft', id: ID.braco } }] }]);
  if (t.raioDoEncontro > 0) passos.push(['arredondarCostura', { origemId: ID.concordancia, de: { op: 'unir', id: ID.corpo }, raio: m(t.raioDoEncontro), raioMinimo: 0.003, regiao: { min: [-1, -1, -0.06], max: [1, yEixo + 0.005, 1] } }]);
  passos.push(['parte', { nome: 'pescoco', sel: corpo }]);
  if (t.raioDoEncontro > 0) passos.push(['parte', { nome: 'pescoco', sel: concordancia }]);
  passos.push(['lathe', {
    origemId: ID.anel, eixo: 'z', lados: L, em: [0, yEixo, zFace],
    perfil: [[0, 0], [Ra, 0], [Ra, e], [0, e]],
  }]);
  passos.push(['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['material', { usa: 'anelEscuro', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'unir', id: ID.corpo },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: Math.SQRT2 * h, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'juntaDoOmbro', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [0, yEixo, zFace + e], raio: Ra, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['liso', { sel: corpo, angulo: 20 }]);
  if (t.raioDoEncontro > 0) passos.push(['liso', { sel: concordancia, angulo: 20 }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } }, angulo: 45 }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro: L de ponta-cabeça de 190 mm, frente de pé recuada, saída redonda e anel fino' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da boca de baixo do pescoço; y para cima, a saída para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: ['../../referencias/frontal.contornos.json'],
    escala: { medida: 'diâmetro do anel da cintura, onde o pé assenta', milimetros: 210 },
    partes: [
      { nome: 'pescoco', forma: 'L de ponta-cabeça de 190 mm: parte de pé com a frente recuada 30 mm da parte deitada (degrau), parte deitada atravessando o topo até a saída redonda de diâmetro igual à largura; eixo a 115 mm, topo a 210 mm', tecnica: 'dois lofts de superelipse unidos; seção vira redonda em várias estações de raio constante; arredondarCostura no encontro de baixo; liso com ângulo' },
      { nome: 'anel', forma: 'faixa fina de uns 28 mm, eixo Z, com o mesmo diâmetro da saída (190 mm), encostada na face da saída sem entrar nela, escura', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'parte de pé sem o degrau em relação à parte deitada (frentes no mesmo plano)',
      'saída redonda maior que a largura do bloco, sobrando por baixo ou pelos lados',
      'saída com diâmetro diferente do anel',
      'facetas ou sombreado torcido na faixa em que a seção vira redonda junto ao anel',
      'rasgo, quina viva ou degrau de sombra no encontro de baixo entre a frente da parte de pé e a parte deitada',
      'rasgo ou degrau de sombra nos cantos junto à saída',
      'seção de cima facetada na vista de cima, em polígono em vez de cantos arredondados contínuos',
      'corpo de seção circular em todo o trecho de cima, lendo como cano',
      'anel entrando na saída ou afastado dela',
      'anel grosso como tambor em vez de faixa fina',
      'pé fora do eixo vertical da cintura',
      'ombro mais largo que 190 mm ou com o topo acima de 210 mm do anel da cintura',
    ],
  },
  contatos: [
    { par: ['pescoco', 'anel'], motivo: 'o anel encosta na face da saída, sem entrar nela' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
