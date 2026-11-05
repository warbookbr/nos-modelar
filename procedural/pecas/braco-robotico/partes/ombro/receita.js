/* braco-robotico/ombro — volta ao desenho aceito pela pessoa em 2026-09-29
 * (receita do commit ec06c461) no tamanho da opção B de 2026-11-03: 190 mm de
 * largura, eixo da junta a 115 mm da boca de baixo e topo a 210 mm.
 *
 * O corpo é a união de dois lofts. A parte de pé sobe da boca de baixo, com a
 * frente recuada em relação à parte deitada (o degrau em L). A parte deitada
 * atravessa o topo de trás até a saída redonda, de raio igual à meia largura,
 * por isso nada da saída sobra por baixo nem bate na frente da parte de pé. Na
 * faixa junto ao anel a seção passa de quase quadrada a redonda crescendo o
 * raio dos cantos em muitas estações, em vez de
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
  /* Raio dos cantos da seção quase quadrada, igual na parte de pé e na
     deitada. */
  raioDosCantos: 32,
  /* Quanto a frente da parte de pé fica recuada em relação à frente da parte
     deitada: o degrau do L. */
  recuoDaFrente: 30,
  /* Quanto o L inteiro se estende para a frente além do quadrado de 190 mm
     (decisão da pessoa em 2026-11-05: o ombro mais longo na direção da
     junta, com a traseira no lugar). A frente da parte de pé, a da parte
     deitada, o anel e a coluna avançam o mesmo tanto, e o degrau do L fica
     igual. */
  alongamento: 30,
  /* Trecho do braço, antes da saída, em que a seção passa de quase quadrada a
     redonda, com o raio dos cantos crescendo até o círculo. */
  transicaoDaSaida: 45,
  /* Anel da junta: faixa fina, mesmo raio da saída. */
  espessuraDoAnel: 28,
  /* Raio da concordância no encontro de baixo entre a frente da parte de pé e
     a parte deitada. */
  raioDoEncontro: 10,
  chanfroDoPescoco: 2,
  /* Estações da transição quadrado-redondo. */
  estacoesDaSaida: 9,
  /* Seções intermediárias de cada loft, para os triângulos da emenda ficarem
     curtos: triângulo longo faz o sombreamento suave virar degrau. */
  estacoes: 5,
  /* Raio das duas quinas de trás, em planta. */
  raioDaTraseira: 75,
  /* Estações das quinas de trás da parte deitada. */
  estacoesDaTraseira: 24,
  lados: 48,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
/* `n` valores igualmente espaçados estritamente entre `de` e `ate`. */
const entre = (de, ate, n) => Array.from({ length: n }, (_, k) => de + ((ate - de) * (k + 1)) / (n + 1));
/* A parte de pé é 0,3 mm mais estreita que a deitada. */
const folga = 0.0003;
const ID = { coluna: 100, anel: 200, braco: 300, corpo: 400, concordancia: 500 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoPescoco);
  const yEixo = m(t.alturaDoEixo);
  const h = m(t.meiaLargura);
  /* A frente da parte deitada e a saída ficam em z = h + alongamento. */
  const zFace = h + m(t.alongamento);
  const zTransicao = zFace - m(t.transicaoDaSaida);
  /* A saída redonda tem o diâmetro da largura do bloco (raio = meia largura):
     nada dela sobra por baixo nem pelos lados. */
  const Rs = h;
  const Ra = Rs;
  const e = m(t.espessuraDoAnel);
  const c = m(t.chanfroDoPescoco);
  return { R, yEixo, h, zFace, zTransicao, Rs, Ra, e, c };
}

/* Retângulo de meio lado `r` com cantos de raio `rc`, com `lados` pontos
   (quatro arcos de lados/4 pontos, com um lado plano entre cada dois). Com
   rc = r é o círculo. */
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

/* Retângulo de meia largura `w` e meia altura `a`, com cantos de raio `rc`,
   no mesmo sentido e com o mesmo número de pontos do `quadrado`. */
function retangulo(w, a, rc, lados) {
  const por = lados / 4;
  const pts = [];
  for (let q = 0; q < 4; q++) {
    const cx = (w - rc) * Math.sign(Math.cos(q * Math.PI / 2 + Math.PI / 4));
    const cy = (a - rc) * Math.sign(Math.sin(q * Math.PI / 2 + Math.PI / 4));
    for (let k = 0; k < por; k++) {
      const th = q * Math.PI / 2 + (Math.PI / 2) * (k / (por - 1));
      pts.push([cx + rc * Math.cos(th), cy + rc * Math.sin(th)]);
    }
  }
  return pts;
}

/* Círculo com `lados` pontos, no mesmo sentido e com o mesmo número de pontos
   do retângulo, para a transição misturar ponto a ponto. */
function redondo(r, lados) {
  return Array.from({ length: lados }, (_, k) => [r * Math.cos((2 * Math.PI * k) / lados), r * Math.sin((2 * Math.PI * k) / lados)]);
}

/* Seção da parte de pé: frente plana em z = zf com os dois cantos arredondados
   no mesmo raio `rc` dos cantos da parte deitada (por isso o cruzamento dos
   dois cantos é uma meia-esquadria plana) e lado de trás reto, com as duas
   quinas de trás arredondadas no raio `rq` em planta (decisão da pessoa em
   2026-11-04: as quinas passavam 29 mm além do anel da cintura; com 75 mm
   ficam 1,7 mm para dentro dele). */
function contornoColuna(r, rc, lados, zf, rq) {
  const pts = [];
  const por = lados / 4;
  for (let q = 0; q < 2; q++) {
    const cx = (r - rc) * (q === 0 ? 1 : -1);
    for (let k = 0; k < por; k++) {
      const th = q * Math.PI / 2 + (Math.PI / 2) * (k / (por - 1));
      pts.push([cx + rc * Math.cos(th), zf - rc + rc * Math.sin(th)]);
    }
  }
  for (let q = 0; q < 2; q++) {
    const cx = (r - rq) * (q === 0 ? -1 : 1);
    for (let k = 0; k < por; k++) {
      const th = Math.PI + q * Math.PI / 2 + (Math.PI / 2) * (k / (por - 1));
      pts.push([cx + rq * Math.cos(th), -(r - rq) + rq * Math.sin(th)]);
    }
  }
  return pts;
}

export function gerarPassos(t = TABELA) {
  const { R, yEixo, h, zFace, zTransicao, Rs, Ra, e, c } = derivar(t);
  const L = t.lados;
  const rc = m(t.raioDosCantos);
  const sec = (pos, rr) => ({ pos, contorno: quadrado(h, rr, L) });
  const zf = h + m(t.alongamento) - m(t.recuoDaFrente);
  /* A parte de pé é 0,3 mm mais estreita que a deitada: paredes coplanares
     quebram a união. */
  const rq = m(t.raioDaTraseira);
  const secColuna = (y, r) => ({ pos: [0, y, 0], contorno: contornoColuna(r - folga, Math.min(rc - 0.003, r - folga), L, zf * (r - folga) / h, Math.min(rq, r - folga)) });
  /* Parte de pé: sobe da boca de baixo até a altura do eixo, com a frente
     recuada, e termina dentro da parte deitada. */
  const coluna = [
    { pos: [0, 0, 0], raio: 0 },
    secColuna(0.0004, h - c),
    secColuna(c, h),
    ...entre(c, yEixo - 0.0004, t.estacoes).map((y) => secColuna(y, h)),
    secColuna(yEixo - 0.0004, h),
    { pos: [0, yEixo, 0], raio: 0 },
  ];
  /* Parte deitada: atravessa o topo de trás até a saída redonda. Na
     transição o raio dos cantos cresce de rc até a meia largura (círculo),
     com o lado constante, em estações de subida suave (cosseno). A saída
     termina reta, sem chanfro, para o anel encostar sem linha de luz. */
  const ns = t.estacoesDaSaida;
  const transicao = [];
  for (let k = 1; k <= ns; k++) {
    const f = k / (ns + 1);
    const s = 0.5 - 0.5 * Math.cos(Math.PI * f);
    const z = zTransicao + (zFace - 0.0004 - zTransicao) * f;
    const q0 = quadrado(h, rc, L);
    const q1 = redondo(Rs, L);
    transicao.push({ pos: [0, yEixo, z], contorno: q0.map((p, i) => [p[0] + (q1[i][0] - p[0]) * s, p[1] + (q1[i][1] - p[1]) * s]) });
  }
  /* Quinas de trás da parte deitada, em planta: nos últimos `rq` antes da
     traseira a largura acompanha o arco das quinas (meia largura
     h - rq + rq sen ψ, em z = -h + rq - rq cos ψ). */
  const nt = t.estacoesDaTraseira;
  const traseira = [];
  for (let k = 0; k <= nt; k++) {
    const psi = (Math.PI / 2) * (k / nt);
    const w = h - rq + rq * Math.sin(psi);
    /* a seção estreita na largura e mantém o canto de cima redondo no raio rc,
       sem achatar: achatado, ele marcava a quina de trás vista de cima. Onde a
       seção fica mais estreita que o canto, o raio do canto cai aos poucos (o
       mínimo suave entre rc e a meia largura menos 2 mm): cortado de uma vez,
       marcava uma dobra no topo; igual à meia largura, deixava dois cantos no
       mesmo ponto, face sem área, e a união não fechava. */
    traseira.push({ pos: [0, yEixo, -h + rq - rq * Math.cos(psi)], contorno: retangulo(w, h, (rc ** -6 + (w - 0.002) ** -6) ** (-1 / 6), L) });
  }
  const braco = [
    { pos: [0, yEixo, -h - 0.0004], raio: 0 },
    ...traseira,
    ...entre(-h + rq, zTransicao, t.estacoes).map((z) => sec([0, yEixo, z], rc)),
    sec([0, yEixo, zTransicao], rc),
    ...transicao,
    { pos: [0, yEixo, zFace - 0.0004], contorno: redondo(Rs, L) },
    { pos: [0, yEixo, zFace], raio: 0 },
  ];
  const corpo = { origem: { op: 'unir', id: ID.corpo } };
  const concordancia = { origem: { op: 'arredondarCostura', id: ID.concordancia } };
  const passos = [];
  passos.push(['loft', { origemId: ID.coluna, secoes: coluna, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['loft', { origemId: ID.braco, secoes: braco, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['unir', { origemId: ID.corpo, solidos: [{ origem: { op: 'loft', id: ID.coluna } }, { origem: { op: 'loft', id: ID.braco } }] }]);
  if (t.raioDoEncontro > 0) passos.push(['arredondarCostura', { origemId: ID.concordancia, de: { op: 'unir', id: ID.corpo }, raio: m(t.raioDoEncontro), raioMinimo: 0.003, regiao: { min: [-1, -1, -0.005], max: [1, yEixo + 0.005, 1] } }]);
  passos.push(['parte', { nome: 'pescoco', sel: corpo }]);
  if (t.raioDoEncontro > 0) passos.push(['parte', { nome: 'pescoco', sel: concordancia }]);
  passos.push(['lathe', {
    origemId: ID.anel, eixo: 'z', lados: L, em: [0, yEixo, zFace],
    perfil: [[0, 0], [Ra, 0], [Ra, e], [0, e]],
  }]);
  passos.push(['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['material', { usa: 'anelEscuro', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  /* o ponto do pé mais longe do eixo, tirado do próprio contorno da parte de pé; a porta é a faixa de contato de 10 mm junto a ele, que a junta com o anel cobra */
  const raioDoPe = Math.max(...contornoColuna(h - folga, Math.min(rc - 0.003, h - folga), L, zf * (h - folga) / h, Math.min(rq, h - folga)).map(([u, v]) => Math.hypot(u, v)));
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'unir', id: ID.corpo },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: raioDoPe - 0.010, raioExterno: raioDoPe, inicio: 0, fim: 0.005 },
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
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro: L de ponta-cabeça de 190 por 220 mm, frente de pé recuada, saída redonda e anel fino' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da boca de baixo do pescoço; y para cima, a saída para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: ['../../referencias/frontal.contornos.json'],
    escala: { medida: 'diâmetro do anel da cintura, onde o pé assenta', milimetros: 210 },
    partes: [
      { nome: 'pescoco', forma: 'L de ponta-cabeça de 190 mm de largura e 220 mm de comprimento na direção da junta: parte de pé com a frente recuada 30 mm da parte deitada (degrau), parte deitada atravessando o topo até a saída redonda de diâmetro igual à largura; eixo a 115 mm, topo a 210 mm', tecnica: 'dois lofts de retângulo de cantos arredondados de mesmo raio; seção vira redonda crescendo o raio dos cantos em várias estações; arredondarCostura no encontro de baixo; liso com ângulo' },
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
      'ombro mais largo que 190 mm, mais longo que 220 mm na direção da junta ou com o topo acima de 210 mm do anel da cintura',
      'traseira ou pé fora do anel da cintura vistos de cima',
    ],
  },
  contatos: [
    { par: ['pescoco', 'anel'], motivo: 'o anel encosta na face da saída, sem entrar nela' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
