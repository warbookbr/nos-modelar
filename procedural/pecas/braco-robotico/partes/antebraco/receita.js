/* braco-robotico/antebraco — o tubo reto que sai do anel do antebraço, na horizontal, até onde a carcaça do punho se prende.
 *
 * Sétima etapa da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-09) está em `../../ALINHAMENTO.md`,
 * seção "A saída do cotovelo e o antebraço": tubo de 156 mm, o mesmo diâmetro do cotovelo e da coluna, sem redução nem degrau depois
 * do anel (opção 1 de `../../referencias/antebraco-opcoes.png`). O comprimento de 253 mm é a medida da prancha
 * `../../referencias/lateral-sem-cabo.prancha.png`. O raio vem da porta `topo` do anel do antebraço, por vínculo da montagem; o valor
 * da TABELA só vale para ver a parte sozinha.
 *
 * Referencial local: origem no centro da face de trás do tubo (a que assenta no anel); o eixo do tubo é +X e ele ocupa x de 0 a
 * `comprimento`. Na montagem o eixo cai no eixo da junta do cotovelo.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X, centro no meio da face de trás, borda dessa face. Senta no `topo` do anel do antebraço.
 *   saida — anel que recebe, eixo +X, centro no meio da face da frente, face inteira. A carcaça do punho se prende aqui.
 */

export const TABELA = {
  /* Vem do anel pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 78,
  /* Comprimento do tubo ao longo do eixo, da prancha. */
  comprimento: 253,
  /* Chanfro estreito das bordas das tampas, como as carcaças do braço. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  lados: 144,
};

const m = (mm) => mm / 1000;
const ID = { tubo: 200 };

export function derivar(t = TABELA) {
  return { R: m(t.raio), L: m(t.comprimento), c: m(t.chanfro), s: m(t.suaveDoChanfro), pontos: { xFace: t.comprimento, diametro: 2 * t.raio } };
}

export function gerarPassos(t = TABELA) {
  const { R, L, c, s } = derivar(t);
  return [
    /* Perfil: um cilindro só, de raio constante, com chanfro estreito nas duas tampas, de eixo x. */
    ['lathe', {
      origemId: ID.tubo, lados: t.lados, segmentosCurva: 3, eixo: 'x',
      perfil: [
        [0, 0], [R - c, 0, s], [R, c, s],
        [R, L - c, s], [R - c, L, s], [0, L],
      ],
    }],
    ['parte', { nome: 'tubo', sel: { origem: { op: 'lathe', id: ID.tubo } } }],
    ['publicarPorta', {
      nome: 'apoio', de: { op: 'lathe', id: ID.tubo },
      interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'lathe', id: ID.tubo },
      interface: { forma: 'anel', papel: 'recebe', eixo: [1, 0, 0], centro: [L, 0, 0], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
    }],
    ['liso', { sel: { origem: { op: 'lathe', id: ID.tubo } } }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/antebraco', desc: 'antebraço do braço robótico: tubo reto de 156 mm e 253 mm de comprimento, na horizontal, saindo do anel do cotovelo' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face de trás do tubo; x ao longo do eixo da junta, para a frente, y para cima', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'antebraço do braço robótico: tubo reto de seção redonda, sem redução, que segue na horizontal a partir do anel do antebraço até a carcaça do punho',
    referencias: ['../../referencias/antebraco-opcoes.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do tubo, igual ao do cotovelo e da coluna', milimetros: 156 },
    partes: [
      { nome: 'tubo', forma: 'cilindro reto de 156 mm de diâmetro e 253 mm de comprimento, eixo horizontal no da junta do cotovelo, sem afunilar nem degrau depois do anel; tampas planas com chanfro de 2 mm; a da frente é a saída do punho', tecnica: 'revolução com perfil de eixo x, chanfro de 2 mm no perfil, material da carcaça' },
    ],
    criteriosDeReprovacao: [
      'tubo afunilado, ou com degrau depois do anel',
      'diâmetro diferente de 156 mm',
      'eixo fora do eixo da junta do cotovelo',
      'comprimento diferente de 253 mm',
      'aresta viva nas bordas das tampas, sem o chanfro estreito de 2 mm',
      'cor escura de anel, quando ele é carcaça cinza-clara',
    ],
  },
  /* Uma parte só; o contato com o anel é a relação de assento da montagem, não um par interno. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
