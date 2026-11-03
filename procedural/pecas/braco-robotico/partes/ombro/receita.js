/* braco-robotico/ombro — ombro escolhido pela pessoa em 2026-09-28 (L de
 * ponta-cabeça sobre o anel da cintura) e redimensionado em 2026-11-03, opção B:
 * seção de cima de 190 mm de largura, eixo da junta a 115 mm da boca de baixo
 * (o topo do anel da cintura) e topo a 210 mm.
 *
 * O corpo é a união de dois sólidos de lofts: a coluna, que sobe do pé redondo
 * no diâmetro do anel da cintura e vira, logo acima dele, a seção quase
 * quadrada de cantos arredondados até o topo; e o braço deitado, que nasce dentro da
 * coluna com a mesma seção, sai para +Z além da frente dela e volta a ser
 * redondo no fim. A saída é o círculo inscrito na seção quadrada, e por isso
 * nada dela sobra por baixo nem bate na frente da coluna; o encontro de baixo,
 * entre a frente da coluna e a face de baixo do braço, é arredondado pelo
 * `arredondarCostura` e o sombreamento é liso com ângulo, para a quina que
 * sobra continuar nítida e a emenda não fazer degrau de sombra. O anel é uma
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
  /* Altura do trecho reto do pé, ainda redondo, acima da boca de baixo. */
  alturaReta: 10,
  /* Altura do eixo da saída acima da boca de baixo (opção B). */
  alturaDoEixo: 115,
  /* Meia largura da seção quadrada de cima: 190 mm de largura. O topo fica em
     alturaDoEixo + meiaLargura = 210 mm, e a face de baixo do braço em
     alturaDoEixo - meiaLargura = 20 mm, onde o pé termina de virar quadrado. */
  meiaLargura: 95,
  /* Raio dos cantos da seção quadrada de cima: lados planos entre quatro
     arcos, para as paredes da coluna e do braço serem planos exatos. */
  raioDosCantos: 32,
  /* Quanto o braço deitado sai para a frente além da frente da coluna. */
  trechoHorizontal: 24,
  /* Comprimento, no fim do braço, em que a seção volta a ser redonda para a
     saída. */
  transicaoDaSaida: 30,
  /* Anel da junta: faixa fina, mesmo raio da saída. */
  espessuraDoAnel: 28,
  /* Raio da concordância no encontro de baixo entre a coluna e o braço. */
  raioDoEncontro: 10,
  chanfroDoPescoco: 2,
  /* Seções intermediárias dos dois lofts, só para os triângulos da emenda
     ficarem curtos: triângulo longo faz o sombreamento suave virar degrau. */
  estacoes: 3,
  lados: 48,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
const ID = { coluna: 100, anel: 200, braco: 300, corpo: 400, concordancia: 500 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoPescoco);
  const a = m(t.alturaReta);
  const yEixo = m(t.alturaDoEixo);
  const h = m(t.meiaLargura);
  /* A frente da coluna está em z = h; o braço passa dela pelo trecho horizontal. */
  const zFace = h + m(t.trechoHorizontal);
  const zTransicao = zFace - m(t.transicaoDaSaida);
  /* A saída é o círculo inscrito na seção quadrada, e o anel tem o raio da
     saída: nada da saída fica fora da seção, nem por baixo dela. */
  const Rs = h;
  const Ra = Rs;
  const e = m(t.espessuraDoAnel);
  const c = m(t.chanfroDoPescoco);
  return { R, a, yEixo, h, zFace, zTransicao, Rs, Ra, e, c };
}

/* Contorno redondo com `lados` pontos, u no eixo X do mundo. */
function redondo(r, lados) {
  const pts = [];
  for (let k = 0; k < lados; k++) {
    const th = (2 * Math.PI * k) / lados;
    pts.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return pts;
}

/* Quadrado de meio lado `r` com cantos de raio `rc`, com o mesmo número de
   pontos do redondo (quatro arcos de lados/4 pontos, com um lado plano entre
   cada dois), para o loft casar ponto a ponto com o pé. */
function quadrado(r, rc, lados) {
  const por = lados / 4;
  const pts = [];
  for (let q = 0; q < 4; q++) {
    const cx = (r - rc) * Math.sign(Math.cos(q * Math.PI / 2 + Math.PI / 4));
    const cy = (r - rc) * Math.sign(Math.sin(q * Math.PI / 2 + Math.PI / 4));
    for (let k = 0; k < por; k++) {
      const th = q * Math.PI / 2 + (Math.PI / 2) * (k / (por - 1));
      pts.push([cx + rc * Math.cos(th), cy + rc * Math.sin(th)]);
    }
  }
  return pts;
}

/* `n` valores igualmente espaçados estritamente entre `de` e `ate`. */
function entre(de, ate, n) {
  return Array.from({ length: n }, (_, k) => de + ((ate - de) * (k + 1)) / (n + 1));
}

export function gerarPassos(t = TABELA) {
  const { R, a, yEixo, h, zFace, zTransicao, Rs, Ra, e, c } = derivar(t);
  const L = t.lados;
  const rc = m(t.raioDosCantos);
  const round = (pos, r) => ({ pos, contorno: redondo(r, L) });
  /* Seção entre o pé redondo (f = 0) e a seção quadrada de cima (f = 1). */
  const entreContornos = (pos, a0, a1, f) => ({ pos, contorno: a0.map((p, k) => [p[0] + (a1[k][0] - p[0]) * f, p[1] + (a1[k][1] - p[1]) * f]) });
  const mistura = (y, f) => entreContornos([0, y, 0], redondo(R, L), quadrado(h, rc, L), f);
  /* Seção entre a seção quadrada (f = 0) e o círculo da saída (f = 1). */
  const afunila = (z, f) => entreContornos([0, yEixo, z], quadrado(h, rc, L), redondo(Rs, L), f);
  const quad = (pos, r) => ({ pos, contorno: quadrado(r, Math.max(rc - (h - r), 0.001), L) });
  const yTopo = yEixo + h;
  const yBraco = yEixo - h;
  /* O pé termina de virar quadrado um pouco abaixo da face de baixo do braço,
     para as emendas das duas não caírem no mesmo plano. */
  const yPe = yBraco - 0.005;
  /* Coluna: pé redondo no raio do anel da cintura, que vira a seção quase
     quadrada na altura onde começa a face de baixo do braço, e sobe até o topo
     de seção igual. */
  const coluna = [
    { pos: [0, 0, 0], raio: 0 },
    round([0, 0.0004, 0], R - c),
    round([0, c, 0], R),
    round([0, a / 2, 0], R),
    round([0, a, 0], R),
    ...entre(a, yPe, 3).map((y) => mistura(y, (y - a) / (yPe - a))),
    quad([0, yPe, 0], h),
    ...entre(yPe, yTopo - c, t.estacoes).map((y) => quad([0, y, 0], h)),
    quad([0, yTopo - c, 0], h),
    quad([0, yTopo - 0.0004, 0], h - c),
    { pos: [0, yTopo, 0], raio: 0 },
  ];
  /* Braço deitado: nasce dentro da coluna com a mesma seção, sai para +Z e
     fecha a saída em z = zFace, sem passar do plano onde o anel encosta. */
  const braco = [
    { pos: [0, yEixo, 0], raio: 0 },
    quad([0, yEixo, 0.0004], h),
    ...entre(0.0004, zTransicao, t.estacoes).map((z) => quad([0, yEixo, z], h)),
    quad([0, yEixo, zTransicao], h),
    ...entre(zTransicao, zFace - c, 3).map((z) => afunila(z, (z - zTransicao) / (zFace - c - zTransicao))),
    round([0, yEixo, zFace - c], Rs),
    round([0, yEixo, zFace - 0.0004], Rs - c),
    { pos: [0, yEixo, zFace], raio: 0 },
  ];
  const corpo = { origem: { op: 'unir', id: ID.corpo } };
  const concordancia = { origem: { op: 'arredondarCostura', id: ID.concordancia } };
  const passos = [];
  passos.push(['loft', { origemId: ID.coluna, secoes: coluna, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['loft', { origemId: ID.braco, secoes: braco, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['unir', { origemId: ID.corpo, solidos: [{ origem: { op: 'loft', id: ID.coluna } }, { origem: { op: 'loft', id: ID.braco } }] }]);
  /* Só o encontro de baixo: em cima os topos ficam rentes e não há canto a arredondar. */
  if (t.raioDoEncontro > 0) passos.push(['arredondarCostura', { origemId: ID.concordancia, de: { op: 'unir', id: ID.corpo }, raio: m(t.raioDoEncontro), raioMinimo: 0.003, regiao: { min: [-1, -1, 0.02], max: [1, yBraco + rc + 0.005, 1] } }]);
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
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'juntaDoOmbro', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [0, yEixo, zFace + e], raio: Ra, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['liso', { sel: corpo, angulo: 45 }]);
  if (t.raioDoEncontro > 0) passos.push(['liso', { sel: concordancia, angulo: 45 }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } }, angulo: 45 }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro: L de ponta-cabeça de 190 mm com saída redonda e anel fino' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da boca de baixo do pescoço; y para cima, a saída para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: ['../../referencias/frontal.contornos.json'],
    escala: { medida: 'diâmetro do anel da cintura, onde o pé assenta', milimetros: 210 },
    partes: [
      { nome: 'pescoco', forma: 'L de ponta-cabeça de 190 mm: pé redondo no diâmetro do anel da cintura, coluna quase quadrada de cantos arredondados, braço deitado com eixo a 115 mm e topo a 210 mm, saída redonda inscrita; encontro de baixo concordado', tecnica: 'dois lofts de seção quadrada de cantos arredondados (coluna e braço) unidos, com o encontro de baixo arredondado por arredondarCostura e sombreamento liso com ângulo' },
      { nome: 'anel', forma: 'faixa fina de uns 28 mm, eixo Z, com o mesmo diâmetro da saída (190 mm), encostada na face da saída sem entrar nela, escura', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'corpo de seção circular em todo o trecho de cima, lendo como cano',
      'dobra com canto vivo por fora',
      'saída com diâmetro diferente do anel',
      'saída redonda maior que a seção quadrada, sobrando por baixo ou pelos lados',
      'anel entrando na saída ou afastado dela',
      'anel grosso como tambor em vez de faixa fina',
      'pé fora do eixo vertical da cintura ou com diâmetro diferente do anel da cintura',
      'quina viva ou degrau de sombra no encontro de baixo entre a parte de pé e a deitada',
      'ombro mais largo que a base ou com o topo acima de 210 mm do anel da cintura',
    ],
  },
  contatos: [
    { par: ['pescoco', 'anel'], motivo: 'o anel encosta na face da saída, sem entrar nela' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
