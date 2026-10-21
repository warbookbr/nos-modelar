/* braco-robotico/ombro — ombro escolhido pela pessoa em 2026-09-28, partindo da rodada 2
 * (cotovelo de cano), depois de comparar com o ombro de tambor sobre a base.
 *
 * Mudanças contra a rodada 2: o corpo deixa de ser cano e vira um L de
 * ponta-cabeça, com o pé redondo no diâmetro do anel da cintura e o trecho de
 * cima de seção quase quadrada (superelipse) com a dobra arredondada; a saída
 * volta a ser redonda, com o mesmo diâmetro do anel que segura, e o anel é uma
 * faixa fina escura que encosta na face da saída sem entrar nela.
 *
 * Portas:
 *   apoio        — anel, eixo +Y, centro no meio da boca de baixo, borda de
 *                  baixo do pé. Senta no `topo` do anel da cintura.
 *   juntaDoOmbro — cilindro, eixo +Z, centro no meio da face da frente do
 *                  anel, raio do anel.
 */

export const TABELA = {
  raioDoPescoco: 105,
  /* Trecho reto do pé, ainda redondo, acima do colar. */
  alturaReta: 20,
  /* Altura do eixo da saída acima da boca de baixo. */
  alturaDoEixo: 140,
  /* Meia largura da seção quadrada do trecho de cima (e da dobra). */
  meiaLargura: 110,
  /* Expoente da superelipse da seção de cima: 2 é círculo, 4 é quadrado de
     cantos arredondados. */
  expoenteDoTopo: 4,
  /* Trecho reto horizontal depois da dobra, antes da saída. */
  trechoHorizontal: 0,
  /* Comprimento, no fim do trecho horizontal, em que a seção volta a ser
     redonda para a saída. */
  transicaoDaSaida: 30,
  /* Anel da junta: faixa fina, mesmo raio da saída. */
  espessuraDoAnel: 28,
  /* Raio da concordância no encontro de baixo entre a coluna e o braço. */
  raioDoEncontro: 0,
  chanfroDoPescoco: 2,
  estacoesDaCurva: 12,
  lados: 48,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
const ID = { coluna: 100, anel: 200, braco: 300, corpo: 400, concordancia: 500 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoPescoco);
  const a = m(t.alturaReta);
  /* Raio da dobra: o reto do pé mais a dobra fecham na altura do eixo. Tem
     de passar da meia largura, senão a parede de dentro da dobra se dobra
     sobre si e aparece um amassado no canto de dentro do L. */
  const Rc = m(t.alturaDoEixo - t.alturaReta);
  const yEixo = m(t.alturaDoEixo);
  const h = m(t.meiaLargura);
  const zFace = h + m(t.trechoHorizontal);
  const zTransicao = zFace - m(t.transicaoDaSaida);
  /* A saída tem o raio do pé, e o anel tem o raio da saída. */
  const Rs = h * 1.05;
  const Ra = Rs;
  const e = m(t.espessuraDoAnel);
  const c = m(t.chanfroDoPescoco);
  return { R, a, Rc, yEixo, h, zFace, zTransicao, Rs, Ra, e, c };
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

/* Seção da coluna: frente arredondada como a do braço, lado de trás quase reto
   e de cantos vivos, para a parede de trás descer do braço até o pé. */
function contornoColuna(r, nFrente, lados, recuo = 0) {
  const pts = [];
  const frente = lados - 2;
  for (let k = 0; k < frente; k++) {
    const th = (Math.PI * k) / (frente - 1);
    const cs = Math.cos(th), sn = Math.sin(th);
    const v = r * Math.sign(sn) * Math.abs(sn) ** (2 / nFrente);
    pts.push([r * Math.sign(cs) * Math.abs(cs) ** (2 / nFrente), v * (1 - recuo / r)]);
  }
  /* Lado de trás: parede reta, só com os dois cantos vivos. */
  pts.push([-r, -r], [r, -r]);
  return pts;
}

export function gerarPassos(t = TABELA) {
  const { R, a, Rc, yEixo, h, zFace, zTransicao, Rs, Ra, e, c } = derivar(t);
  const L = t.lados;
  const nTopo = t.expoenteDoTopo;
  const sec = (pos, r, n) => ({ pos, contorno: contorno(r, n, L) });
  /* O corpo são dois sólidos fundidos pela união. A coluna sobe do pé
     redondo, passando a seção quase quadrada, e termina dentro do braço, na
     altura do eixo. O braço atravessa o topo de ponta a ponta, da tampa de trás
     até a saída redonda, e o topo do L é a face de cima dele, uma superfície
     só: o canto de trás fica reto como na foto frontal. Como as laterais dos
     dois nunca ficam rentes, o encontro é côncavo em volta toda, e o
     `arredondarCostura` o arredonda inteiro. */
  const coluna = [
    { pos: [0, 0, 0], raio: 0 },
    { pos: [0, 0.0004, 0], contorno: contornoColuna(h, nTopo, L, m(t.transicaoDaSaida)) },
    { pos: [0, yEixo - 0.0004, 0], contorno: contornoColuna(h, nTopo, L, m(t.transicaoDaSaida)) },
    { pos: [0, yEixo, 0], raio: 0 },
  ];


  /* A face da saída fecha em z = zFace, com o mesmo chanfro do pé, sem
     passar do plano onde o anel encosta. */
  const braco = [
    { pos: [0, yEixo, -h], raio: 0 },
    sec([0, yEixo, -h + 0.0004], h, nTopo),
    sec([0, yEixo, zTransicao], h, nTopo),
    sec([0, yEixo, zFace - 0.0004], Rs, 2),
    { pos: [0, yEixo, zFace], raio: 0 },
  ];
  const corpo = { origem: { op: 'unir', id: ID.corpo } };
  const concordancia = { origem: { op: 'arredondarCostura', id: ID.concordancia } };
  const passos = [];
  passos.push(['loft', { origemId: ID.coluna, secoes: coluna, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['loft', { origemId: ID.braco, secoes: braco, lados: L, orientacao: [1, 0, 0] }]);
  passos.push(['unir', { origemId: ID.corpo, solidos: [{ origem: { op: 'loft', id: ID.coluna } }, { origem: { op: 'loft', id: ID.braco } }] }]);
  if (t.raioDoEncontro > 0) passos.push(['arredondarCostura', { origemId: ID.concordancia, de: { op: 'unir', id: ID.corpo }, raio: m(t.raioDoEncontro) }]);
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
  passos.push(['liso', { sel: corpo, angulo: 45 }]);
  passos.push(['liso', { sel: { regiao: { min: [-1, -1, zFace - m(t.transicaoDaSaida) - 0.004], max: [1, yEixo - h + 0.002, 1], modo: 'toca' } }, angulo: 1 }]);
  if (t.raioDoEncontro > 0) passos.push(['liso', { sel: concordancia, angulo: 45 }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } }, angulo: 45 }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro: L de ponta-cabeça com saída redonda e anel fino' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da boca de baixo do pescoço; y para cima, a saída para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: ['../../referencias/frontal.contornos.json'],
    escala: { medida: 'diâmetro do anel da cintura, onde o pé assenta', milimetros: 210 },
    partes: [
      { nome: 'pescoco', forma: 'L de ponta-cabeça: pé redondo no diâmetro do anel da cintura, dobra arredondada de 90 graus para +Z, trecho de cima reto de seção quase quadrada com cantos arredondados, saída redonda', tecnica: 'loft por caminho curvo com seção de superelipse variando' },
      { nome: 'anel', forma: 'faixa fina de uns 28 mm, eixo Z, com o mesmo diâmetro da saída, encostada na face da saída sem entrar nela, escura', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'corpo de seção circular em todo o trecho de cima, lendo como cano',
      'dobra com canto vivo por fora',
      'saída com diâmetro diferente do anel',
      'anel entrando na saída ou afastado dela',
      'anel grosso como tambor em vez de faixa fina',
      'pé fora do eixo vertical da cintura ou com diâmetro diferente do anel da cintura',
    ],
  },
  contatos: [
    { par: ['pescoco', 'anel'], motivo: 'o anel encosta na face da saída, sem entrar nela' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
