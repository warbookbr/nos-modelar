/* fixture-ombro-uniao.js — fixture neutra copiada em 2026-09-29 do ombro do
 * braço robótico (procedural/pecas/braco-robotico/partes/ombro/receita.js),
 * para os testes do plano "União de sólidos" sobre superfícies curvas
 * facetadas: uma coluna em loft (pé redondo que vira superelipse n=4) unida a
 * um braço em loft ao longo de Z com a mesma superelipse. Não é peça do
 * acervo; a receita do ombro não é tocada por estes testes.
 */
export const TABELA = {
  raioDoPescoco: 105,
  /* Trecho reto do pé, ainda redondo, acima do colar. */
  alturaReta: 20,
  /* Altura do eixo da saída acima da boca de baixo. */
  alturaDoEixo: 140,
  /* Meia largura da seção quadrada do trecho de cima (e da dobra). */
  meiaLargura: 105,
  /* Expoente da superelipse da seção de cima: 2 é círculo, 4 é quadrado de
     cantos arredondados. */
  expoenteDoTopo: 4,
  /* Trecho reto horizontal depois da dobra, antes da saída. */
  trechoHorizontal: 70,
  /* Comprimento, no fim do trecho horizontal, em que a seção volta a ser
     redonda para a saída. */
  transicaoDaSaida: 30,
  /* Anel da junta: faixa fina, mesmo raio da saída. */
  espessuraDoAnel: 28,
  /* Raio da concordância no encontro de baixo entre a coluna e o braço. */
  raioDoEncontro: 15,
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
  const zFace = Rc + m(t.trechoHorizontal);
  const zTransicao = zFace - m(t.transicaoDaSaida);
  /* A saída tem o raio do pé, e o anel tem o raio da saída. */
  const Rs = R;
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

export function gerarPassos(t = TABELA) {
  const { R, a, Rc, yEixo, h, zFace, zTransicao, Rs, Ra, e, c } = derivar(t);
  const L = t.lados;
  const nTopo = t.expoenteDoTopo;
  const sec = (pos, r, n) => ({ pos, contorno: contorno(r, n, L) });
  /* O corpo são dois sólidos fundidos pela união: a coluna, que sobe do pé
     redondo até o topo de seção quase quadrada, e o braço reto, que nasce
     dentro dela com a mesma seção e sai para +Z até a saída redonda. O canto de
     cima, do lado oposto à saída, fica reto como na foto frontal, e o encontro
     de baixo é arredondado pelo `arredondarCostura`. */
  const yTopo = yEixo + h;
  const coluna = [
    { pos: [0, 0, 0], raio: 0 },
    sec([0, 0.0004, 0], R - c, 2),
    sec([0, c, 0], R, 2),
    sec([0, a, 0], R, 2),
    sec([0, yEixo - h, 0], h, nTopo),
    sec([0, yTopo - c, 0], h, nTopo),
    sec([0, yTopo - 0.0004, 0], h - c, nTopo),
    { pos: [0, yTopo, 0], raio: 0 },
  ];
  /* A face da saída fecha em z = zFace, com o mesmo chanfro do pé, sem
     passar do plano onde o anel encosta. */
  const braco = [
    { pos: [0, yEixo, 0], raio: 0 },
    sec([0, yEixo, 0.0004], h, nTopo),
    sec([0, yEixo, zTransicao], h, nTopo),
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
  /* só o encontro de baixo: em cima os topos ficam rentes e não há canto a arredondar */
  if (t.raioDoEncontro > 0) passos.push(['arredondarCostura', { origemId: ID.concordancia, de: { op: 'unir', id: ID.corpo }, raio: m(t.raioDoEncontro), regiao: { min: [-1, -1, -1], max: [1, yEixo, 1] } }]);
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
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  return passos;
}

const receita = {
  meta: { nome: 'fixture_ombro_uniao', desc: 'ombro: L de ponta-cabeça com saída redonda e anel fino' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da boca de baixo do pescoço; y para cima, a saída para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: [],
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
