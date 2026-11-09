/* braco-robotico/elo-punho-4 — o elo rígido entre a junta 4 e a junta 5 do punho: um pé redondo no eixo da junta 4 e o tubo que desce dele na vertical, numa malha única.
 *
 * Etapa do punho da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-09) está em `../../ALINHAMENTO.md`, seção
 * "O punho, 2026-11-09", e o esboço escolhido é a opção 2 de `../../referencias/punho-diametro.png` (`punho-diametro.esboco.json`, formas
 * `pe4`, `tubo5` e `anel5`): o elo da junta 4 é o mesmo T de pé com tubo que a coluna é no ombro e o antebraço no cotovelo, só que com 135 mm
 * de diâmetro, um pé redondo no eixo da junta 4 encostado no anel da junta 4 e o tubo descendo dele na vertical, para baixo no mundo, até a
 * junta 5. O raio vem da porta `topo` do anel da junta 4 (raio 67,5), por vínculo da montagem; o valor da TABELA só vale para ver a parte sozinha.
 *
 * Referencial local: origem no centro da face do pé que encosta no anel; x é o eixo da junta 4, para fora do anel; y é o eixo do tubo, e o tubo
 * desce para -y (no mundo, para baixo); z completa o triedro. O pé é um cilindro de eixo x, de raio igual ao do tubo e espessura igual ao diâmetro
 * (x de 0 a 135), e o tubo desce do eixo da junta (y = 0) rente às duas faces do pé, até y = -`comprimento` (200 mm, a medida do esboço: 132,5 mm
 * de tubo aparente abaixo do pé, o que dá ao tubo a mesma leitura de T que os outros dois têm).
 *
 * Técnica da do antebraço: dois `lathe` unidos por `unir`, com `arredondarCostura` (raio 10, 144 lados) no encontro e chanfro de 2 mm no
 * próprio perfil das tampas de fora (as duas faces do pé e a ponta de baixo do tubo); a ponta de cima do tubo fica dentro do pé, sem chanfro.
 * As portas saem da tampa do `lathe` (`lathe` + `faixa`), e não do `unir`, para a conferência da porta contra a forma não medir a peça inteira.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X local, centro no meio da face do pé que encosta, borda dessa face. Senta no `topo` do anel da junta 4.
 *   saida — anel que recebe, eixo -Y local (no mundo, para baixo), centro no meio da ponta de baixo do tubo, face inteira. O anel da junta 5 assenta aqui.
 */

export const TABELA = {
  /* Vem do anel pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 67.5,
  /* Do eixo da junta 4 à ponta de baixo do tubo (a medida do esboço, forma `tubo5`). */
  comprimento: 200,
  /* Chanfro estreito das bordas das tampas, como as carcaças do braço. */
  chanfro: 2,
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
  /* A espessura do pé é o diâmetro: o tubo fica rente às duas faces. */
  return { R: m(t.raio), L: m(t.comprimento), c: m(t.chanfro), E: m(2 * t.raio), pontos: { espessuraDoPe: 2 * t.raio, yDaPonta: -t.comprimento, xDoEixoDoTubo: t.raio, diametro: 2 * t.raio } };
}

export function gerarPassos(t = TABELA) {
  const { R, L, c, E } = derivar(t);
  return [
    /* O pé: cilindro de eixo x, raio R e espessura E, com chanfro nas duas faces. */
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'x', perfil: seccao(R, E, c, { baixo: true, cima: true }) }],
    /* O tubo: cilindro de eixo y de y = -L a 0, rente às duas faces do pé, com chanfro só na ponta de baixo. */
    ['lathe', { origemId: ID.tubo, lados: t.lados, eixo: 'y', em: [E - R, -L, 0], perfil: seccao(R, L, c, { baixo: true, cima: false }) }],
    ['unir', { origemId: ID.uniao, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.tubo } }] }],
    ['arredondarCostura', { origemId: ID.costura, de: { op: 'unir', id: ID.uniao }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'tubo', sel: { tudo: true } }],
    ['parte', { nome: 'pe', sel: { regiao: { min: [-1, -R, -1], max: [1, 1, 1] } }, substituir: true }],
    ['publicarPorta', {
      nome: 'apoio', de: { op: 'lathe', id: ID.pe, faixa: 0, lado: 36 },
      interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'lathe', id: ID.tubo, faixa: 0 },
      interface: { forma: 'anel', papel: 'recebe', eixo: [0, -1, 0], centro: [E - R, -L, 0], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/elo-punho-4', desc: 'elo da junta 4 do punho do braço robótico: pé redondo de 135 mm no eixo da junta 4 e tubo de 135 mm descendo na vertical até a junta 5, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face do pé que encosta no anel; x é o eixo da junta 4, y para cima, ao longo do tubo (o tubo desce para -y), z completa o triedro', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'elo da junta 4 do punho do braço robótico: pé redondo no eixo da junta 4, encostado no anel da junta 4, e o tubo de 135 mm que desce dele na vertical, para baixo no mundo, até a junta 5',
    referencias: ['../../referencias/punho-diametro.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do tubo e do pé, igual ao do anel da junta 4', milimetros: 135 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo da junta 4, 135 mm de diâmetro e de espessura, com a face de dentro encostada no anel da junta 4, as duas faces rentes ao tubo, fundido ao tubo com concordância no encontro: uma peça só', tecnica: 'lathe de eixo x unido ao tubo por unir; arredondarCostura de raio constante em modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm nas duas faces do perfil' },
      { nome: 'tubo', forma: 'cilindro reto de 135 mm, descendo na vertical para baixo no mundo, sem degrau, rente às duas faces do pé, 200 mm do eixo da junta 4 até a ponta; a ponta de baixo, plana com chanfro de 2 mm, é a saída do anel da junta 5', tecnica: 'lathe de eixo y unido ao pé por unir, com chanfro de 2 mm só na ponta de baixo (a de cima fica dentro do pé); o arredondamento afina até sumir onde o encontro é tangente' },
    ],
    criteriosDeReprovacao: [
      'tubo que não desça na vertical, para baixo no mundo (por exemplo, seguindo o eixo da junta, ou para cima)',
      'diâmetro do tubo ou do pé diferente de 135 mm',
      'pé fora do eixo da junta 4, ou não encostado no anel da junta 4',
      'distância do eixo da junta 4 à ponta do tubo diferente de 200 mm',
      'tubo afunilado, ou com degrau depois do pé',
      'tubo passando de uma face do pé, ou recuado dela, em vez de rente às duas',
      'quina viva ou faixa de sombra no encontro do pé com o tubo, ou fresta, emenda ou parafuso entre eles: precisa ser uma peça só',
      'aresta viva nas bordas das tampas, sem o chanfro estreito de 2 mm',
    ],
  },
  /* Uma malha só: o pé e o tubo se tocam por construção; o contato com o anel é a relação de assento da montagem. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
