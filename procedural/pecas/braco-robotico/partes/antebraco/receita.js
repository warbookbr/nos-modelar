/* braco-robotico/antebraco — um pé redondo deitado no eixo da junta do cotovelo e o tubo que sai dele na horizontal, numa malha única.
 *
 * Sétima etapa da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-09) está em `../../ALINHAMENTO.md`,
 * seções "A saída do cotovelo e o antebraço" e "O eixo da junta do cotovelo": o antebraço é o mesmo T que a coluna é no ombro, um pé
 * redondo de 156 mm deitado no eixo da junta, encostado no anel do antebraço, e o tubo de 156 mm saindo dele, perpendicular ao eixo,
 * na horizontal, para +x do mundo (a direita na vista frontal do braço montado), com 253 mm do eixo da junta à ponta
 * (`../../referencias/cotovelo-eixo.png`, `../../referencias/lateral-sem-cabo.prancha.png`). O raio vem da porta `topo` do anel do
 * antebraço, por vínculo da montagem; o valor da TABELA só vale para ver a parte sozinha.
 *
 * Referencial local: origem no centro da face do pé que encosta no anel; x é o eixo da junta, para fora do anel (no mundo, -Z); y
 * para cima; z é o eixo do tubo (no mundo, +X). O pé é um cilindro de eixo x, de raio igual ao do tubo e espessura `espessuraDoPe` (176 mm,
 * 20 mm mais que o diâmetro), e o tubo sai do eixo da junta (z = 0) rente à face de fora do pé (o tubo não passa dela); do lado do
 * anel sobram 20 mm entre o tubo e o plano do anel, para a porta `apoio` medir só o pé (ver a nota em TABELA). O tubo vai de z = 0 a `comprimento`.
 *
 * Técnica da do cotovelo: dois `lathe` unidos por `unir`, com `arredondarCostura` no encontro, e chanfro de 2 mm no próprio perfil
 * das tampas. Duas partes nomeadas, uma só malha: o tubo é o que está além do pé (z a partir do raio) e o pé é o resto.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X local, centro no meio da face do pé que encosta, borda dessa face. Senta no `topo` do anel.
 *   saida — anel que recebe, eixo +Z local (ao longo do tubo), centro no meio da face da ponta, face inteira. A carcaça do punho se
 *           prende aqui.
 */

export const TABELA = {
  /* Vem do anel pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 78,
  /* Do eixo da junta à ponta do tubo, da prancha. */
  comprimento: 253,
  /* Espessura do pé ao longo do eixo da junta. O tubo fica rente à face de fora e sobra, do lado do anel, um recuo de espessuraDoPe - diâmetro: sem ele o tubo roçaria o plano do anel e a porta `apoio` mediria o tubo como se fosse o pé. */
  espessuraDoPe: 176,
  /* Chanfro estreito das bordas das tampas, como as carcaças do braço. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  lados: 144,
  /* Arredondamento do encontro: raio nominal, raio mínimo e distância de afinamento até sumir onde o encontro fica tangente (mm). */
  raioDoEncontro: 10,
  raioMinimo: 3,
  afinarPontas: 40,
};

const m = (mm) => mm / 1000;
const ID = { pe: 1, tubo: 2, uniao: 3, costura: 4 };

/* a seção de um cilindro, [raio, ao longo do eixo], com chanfro de c nas pontas pedidas */
function seccao(r, h, c, { baixo, cima }) {
  const p = [[0, 0]];
  if (baixo) p.push([r - c, 0], [r, c]); else p.push([r, 0]);
  if (cima) p.push([r, h - c], [r - c, h]); else p.push([r, h]);
  p.push([0, h]);
  return p;
}

export function derivar(t = TABELA) {
  return { R: m(t.raio), L: m(t.comprimento), c: m(t.chanfro), E: m(t.espessuraDoPe), pontos: { xFaceDeFora: t.espessuraDoPe, zPonta: t.comprimento, diametro: 2 * t.raio } };
}

export function gerarPassos(t = TABELA) {
  const { R, L, c, E } = derivar(t);
  const corpo = { origem: { op: 'arredondarCostura', id: ID.costura } };
  return [
    /* O pé: cilindro de eixo x, raio R e espessura E, com chanfro nas duas faces. */
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'x', perfil: seccao(R, E, c, { baixo: true, cima: true }) }],
    /* O tubo: cilindro de eixo z que sai do eixo da junta, rente à face de fora do pé, com chanfro só na tampa da ponta. */
    ['lathe', { origemId: ID.tubo, lados: t.lados, eixo: 'z', em: [E - R, 0, 0], perfil: seccao(R, L, c, { baixo: false, cima: true }) }],
    ['unir', { origemId: ID.uniao, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.tubo } }] }],
    ['arredondarCostura', { origemId: ID.costura, de: { op: 'unir', id: ID.uniao }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'tubo', sel: { tudo: true } }],
    ['parte', { nome: 'pe', sel: { regiao: { min: [-1, -1, -1], max: [1, 1, R] } }, substituir: true }],
    ['publicarPorta', {
      nome: 'apoio', de: { op: 'unir', id: ID.uniao },
      interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'unir', id: ID.uniao },
      interface: { forma: 'anel', papel: 'recebe', eixo: [0, 0, 1], centro: [E - R, 0, L], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/antebraco', desc: 'antebraço do braço robótico: pé redondo de 156 mm no eixo da junta do cotovelo e tubo de 156 mm na horizontal para +x, 253 mm do eixo à ponta, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face do pé que encosta no anel; x é o eixo da junta (no mundo -Z), y para cima, z ao longo do tubo (no mundo +X)', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'antebraço do braço robótico: pé redondo no eixo da junta do cotovelo, encostado no anel, e o tubo de 156 mm que sai dele na horizontal para +x do mundo até o punho; o mesmo T da coluna',
    referencias: ['../../referencias/cotovelo-eixo.png', '../../referencias/cotovelo-lado.png', '../../referencias/antebraco-opcoes.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do tubo e do pé, igual ao do cotovelo e da coluna', milimetros: 156 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo da junta do cotovelo (-Z no mundo), 156 mm de diâmetro e 176 mm de espessura, com a face de dentro encostada no anel do antebraço e a de fora rente ao tubo, fundido ao tubo com concordância no encontro: uma peça só', tecnica: 'lathe de eixo x unido ao tubo por unir; arredondarCostura de raio constante em modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm nas duas faces do perfil' },
      { nome: 'tubo', forma: 'cilindro reto de 156 mm que sai do eixo da junta, perpendicular a ele, na horizontal para +x do mundo, 253 mm do eixo à ponta, sem degrau, rente à face de fora do pé; tampa da ponta plana com chanfro de 2 mm é a saída', tecnica: 'lathe de eixo z unido ao pé por unir; chanfro de 2 mm no perfil da tampa da ponta; o arredondamento afina até sumir onde o encontro é tangente' },
    ],
    criteriosDeReprovacao: [
      'tubo que não saia na horizontal para +x do mundo (por exemplo, seguindo o eixo da junta, para trás)',
      'pé fora do eixo da junta do cotovelo, ou não encostado no anel do antebraço',
      'diâmetro do tubo ou do pé diferente de 156 mm',
      'comprimento do eixo da junta à ponta diferente de 253 mm',
      'tubo afunilado, ou com degrau depois do pé',
      'tubo passando da face de fora do pé, em vez de rente a ela',
      'quina viva ou faixa de sombra no encontro do pé com o tubo, ou fresta, emenda ou parafuso entre eles: precisa ser uma peça só',
      'aresta viva nas bordas das tampas, sem o chanfro estreito de 2 mm',
    ],
  },
  /* Uma malha só: o pé e o tubo se tocam por construção; o contato com o anel é a relação de assento da montagem. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
