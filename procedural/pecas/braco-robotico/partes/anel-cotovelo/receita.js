/* braco-robotico/anel-cotovelo — o colar fixo entre a coluna e o cotovelo.
 *
 * Quarta etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md` (seção "O anel do cotovelo e o
 * cotovelo"): não é junta, é um colar fixo, reto e perpendicular à coluna, rente
 * a ela. O raio vem da porta `topo` da coluna, por vínculo da montagem; o valor
 * da TABELA só vale para ver a parte sozinha.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +Y, centro no meio da face de baixo, borda
 *           de baixo do anel. Senta no `topo` da coluna.
 *   topo  — anel que recebe, eixo +Y, centro no meio da face de cima, face
 *           inteira. O cotovelo assenta aqui.
 *
 * Mesma regra das portas de apoio do anel da cintura: quem recebe publica a
 * face inteira numa faixa de 5 mm para dentro da peça; quem se apoia publica só
 * a borda de baixo, 10 mm de largura e 5 mm para dentro.
 */

export const TABELA = {
  raio: 78,
  altura: 25,
  /* Acabamento, escolhido pelo modelador. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  lados: 40,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
const ID = { anel: 100 };

export function derivar(t = TABELA) {
  const R = m(t.raio);
  const h = m(t.altura);
  const c = m(t.chanfro);
  const s = m(t.suaveDoChanfro);
  return { R, h, c, s };
}

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const { R, h, c, s } = P;
  const passos = [];
  /* Perfil: uma faixa só, com chanfro estreito embaixo e em cima e as duas
     bordas de cada chanfro suavizadas pelo raio do vértice. */
  passos.push(['lathe', {
    origemId: ID.anel, lados: t.lados, segmentosCurva: 3,
    perfil: [
      [0, 0], [R - c, 0, s], [R, c, s],
      [R, h - c, s], [R - c, h, s], [0, h],
    ],
  }]);
  passos.push(['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'topo', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, h, 0], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
  }]);
  passos.push(['material', { usa: 'anelEscuro', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/anel-cotovelo', desc: 'colar fixo escuro entre a coluna e o cotovelo do braço robótico' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da face de baixo do colar; y para cima' },
  PLANO: {
    objeto: 'colar fixo (sem rotação) entre o topo da coluna e o cotovelo do braço robótico',
    referencias: ['../../referencias/lateral.prancha.png', '../../referencias/cotovelo-opcao3.png'],
    escala: { medida: 'diâmetro do colar, igual ao da coluna', milimetros: 156 },
    partes: [
      { nome: 'anel', forma: 'anel reto de revolução escuro, 156 mm de diâmetro e 25 mm de altura, como o anel da cintura, perpendicular à coluna, uma faixa só, bordas com chanfro estreito de 2 mm de bordas suavizadas', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'colar inclinado em relação à coluna',
      'colar oval, e não redondo',
      'colar mais largo que a coluna, ou mais estreito, formando degrau na junção',
      'degrau entre a coluna e o colar',
      'bordas vivas, sem o chanfro estreito de 2 mm',
      'fresta visível entre o colar e a coluna',
      'colar na cor cinza-clara da carcaça, quando ele é escuro',
    ],
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
