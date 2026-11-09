/* braco-robotico/anel-punho-4 — o anel escuro da junta 4 do punho, na face da frente da carcaça da junta 4 do antebraço.
 *
 * Etapa do punho da montagem `braco-robotico/montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, seção
 * "O punho, 2026-11-09": anel único reto de 25 mm de largura, perpendicular ao eixo da junta, chanfro estreito de 2 mm, escuro
 * como os outros anéis (forma `anel4`, opção 2 de `../../referencias/punho-diametro.png`), com 135 mm de diâmetro: é nele que o
 * punho passa de 190 para 135 mm.
 *
 * Assento: o raio (67,5 mm) é medida do anel e não vem da porta `saida` do antebraço (raio 95). A relação da montagem é a
 * `assentaAnular` de sempre, com sobreposição radial de 10 mm: o apoio do anel é a coroa de 57,5 a 67,5 mm, que cabe inteira
 * dentro da face de 95 mm da carcaça, de modo que ele fica concêntrico e rente, sem fresta, com folga radial de 27,5 mm até a borda.
 *
 * Referencial local: origem no centro da face de trás do anel; o eixo do anel é +X; o anel ocupa x de 0 a `largura`.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X, centro no meio da face de trás, borda dessa face. Senta na `saida` do antebraço.
 *   topo  — anel que recebe, eixo +X, centro no meio da face da frente, raio 67,5. O elo da junta 4 assenta aqui.
 */

export const TABELA = {
  /* Medida do anel, não da porta: 135 mm de diâmetro, menor que os 190 mm da carcaça da junta 4 em que assenta. Nenhum vínculo
     de raio vem da `saida` do antebraço; só a posição vem dela. */
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
  meta: { nome: 'braco-robotico/anel-punho-4', desc: 'anel escuro de 135 mm da junta 4 do punho, na face da frente da carcaça da junta 4 do antebraço do braço robótico' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da face de trás do anel; y para cima, x ao longo do eixo da junta, para a frente' },
  PLANO: {
    objeto: 'anel único escuro da junta 4 do punho, centrado na face da frente da carcaça da junta 4, onde o punho passa de 190 para 135 mm e o elo da junta 4 assenta',
    referencias: ['../../referencias/punho-diametro.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do anel do punho, menor que o da carcaça da junta 4 (190 mm)', milimetros: 135 },
    partes: [
      { nome: 'anel', forma: 'anel reto de revolução escuro, 135 mm de diâmetro e 25 mm de largura, como os outros anéis, perpendicular ao eixo da junta, uma faixa só, bordas com chanfro estreito de 2 mm de bordas suavizadas', tecnica: 'revolução com perfil de eixo x' },
    ],
    criteriosDeReprovacao: [
      'anel fora do centro da face da frente da carcaça da junta 4',
      'diâmetro diferente de 135 mm',
      'anel mais grosso que 25 mm',
      'anel inclinado em relação ao eixo da junta',
      'anel oval, e não redondo',
      'bordas vivas, sem o chanfro estreito de 2 mm',
      'anel na cor cinza-clara da carcaça, quando ele é escuro',
    ],
  },
  /* Uma parte só; o contato com a carcaça é a relação de assento da montagem, não um par interno. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
