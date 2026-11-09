/* braco-robotico/anel-punho-5 — o anel escuro da junta 5 do punho, na ponta de baixo do elo da junta 4.
 *
 * Etapa do punho da montagem `braco-robotico/montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, seção
 * "O punho, 2026-11-09": anel único reto de 25 mm de largura, rente aos 135 mm do elo da junta 4, perpendicular ao eixo da
 * junta 5 (vertical), com o chanfro estreito de 2 mm, escuro como os outros anéis (forma `anel5`, opção 2 de
 * `../../referencias/punho-diametro.png`). O raio vem da porta `saida` do elo da junta 4 (anel que recebe, eixo para baixo no
 * mundo), por vínculo da montagem; o valor da TABELA só vale para ver a parte sozinha.
 *
 * Referencial local: origem no centro da face de trás do anel (a que assenta na `saida` do elo); o eixo do anel é +X; o anel
 * ocupa x de 0 a `largura`. A montagem o gira para o eixo vertical.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X, centro no meio da face de trás, borda dessa face. Senta na `saida` do elo da junta 4.
 *   topo  — anel que recebe, eixo +X, centro no meio da face da frente, raio 67,5. O elo da junta 5 assenta aqui.
 */

export const TABELA = {
  /* Vem do elo da junta 4 pela montagem (porta `saida`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 67.5,
  /* Largura do anel ao longo do eixo. */
  largura: 25,
  /* Acabamento, como o colar. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  lados: 40,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
const ID = { anel: 100 };

export function derivar(t = TABELA) {
  return { R: m(t.raio), w: m(t.largura), c: m(t.chanfro), s: m(t.suaveDoChanfro) };
}

export function gerarPassos(t = TABELA) {
  const { R, w, c, s } = derivar(t);
  const passos = [];
  /* Perfil: uma faixa só, com chanfro estreito atrás e na frente, de eixo x. */
  passos.push(['lathe', {
    origemId: ID.anel, lados: t.lados, segmentosCurva: 3, eixo: 'x',
    perfil: [
      [0, 0], [R - c, 0, s], [R, c, s],
      [R, w - c, s], [R - c, w, s], [0, w],
    ],
  }]);
  passos.push(['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'topo', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'anel', papel: 'recebe', eixo: [1, 0, 0], centro: [w, 0, 0], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
  }]);
  passos.push(['material', { usa: 'anelEscuro', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/anel-punho-5', desc: 'anel escuro de 135 mm da junta 5 do punho, na ponta de baixo do elo da junta 4 do braço robótico' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da face de trás do anel; y para cima, x ao longo do eixo da junta, para a frente' },
  PLANO: {
    objeto: 'anel único escuro da junta 5 do punho, rente à ponta de baixo do elo da junta 4, onde o elo da junta 5 assenta',
    referencias: ['../../referencias/punho-diametro.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do anel, igual ao do tubo do elo da junta 4', milimetros: 135 },
    partes: [
      { nome: 'anel', forma: 'anel reto de revolução escuro, 135 mm de diâmetro e 25 mm de largura, como os outros anéis, perpendicular ao eixo vertical da junta 5, uma faixa só, bordas com chanfro estreito de 2 mm de bordas suavizadas', tecnica: 'revolução com perfil de eixo x' },
    ],
    criteriosDeReprovacao: [
      'anel inclinado em relação ao eixo vertical da junta 5',
      'anel oval, e não redondo',
      'anel mais largo que o tubo do elo da junta 4, ou mais estreito, formando degrau na junção',
      'anel mais grosso que 25 mm',
      'degrau entre o elo da junta 4 e o anel',
      'bordas vivas, sem o chanfro estreito de 2 mm',
      'anel na cor cinza-clara da carcaça, quando ele é escuro',
    ],
  },
  /* Uma parte só; o contato com o elo é a relação de assento da montagem, não um par interno. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
