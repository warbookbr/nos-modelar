/* braco-robotico/elo-punho-5 — o elo rígido entre a junta 5 e a junta 6 do punho: um pé curto no eixo da junta 5 e o tubo deitado que o atravessa, numa malha única.
 *
 * Etapa do punho da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-09) está em `../../ALINHAMENTO.md`, seção
 * "O punho, 2026-11-09", e o esboço escolhido é a opção 2 de `../../referencias/punho-diametro.png` (`punho-diametro.esboco.json`, formas
 * `casa6` e `anel6`): o elo da junta 5 é o mesmo T de pé com tubo das outras juntas, só que o "pé" é a parte que assenta no anel da junta 5 e
 * gira com ele em torno do eixo vertical, e o tubo deitado, de 135 mm de diâmetro e de comprimento, perpendicular a esse eixo, carrega a
 * junta 6. O tubo deitado fica embaixo do anel com o eixo da junta 5 passando pelo meio dele (centro do tubo em z = 0 e x = `raio`), e a
 * face de uma ponta é a saída, onde assenta o anel da junta 6. O raio vem da porta `topo` do anel da junta 5 (raio 67,5), por vínculo da
 * montagem; o valor da TABELA só vale para ver a parte sozinha.
 *
 * Leitura do esboço: no esboço o eixo do tubo é o z, paralelo ao da junta 4 (o z do mundo na montagem), com a saída para o lado da face da
 * junta 4 (+Z do mundo); o tubo tem 135 mm e fica centrado no eixo da junta 5 (z de 140 a 275 em torno do eixo, em 207,5), rente ao contorno
 * do anel dos dois lados, e o anel da junta 6 vem no fim dele. Assentar o tubo na geratriz de cima dá só uma linha de contato, e a porta
 * do anel pede face plana; por isso há o pé, como nos outros elos.
 *
 * Referencial local: origem no centro da face do pé que encosta no anel; x é o eixo da junta 5, para fora do anel (no mundo, para baixo);
 * z é o eixo do tubo, e a saída está em z = +`comprimento`/2 (no mundo, +Z); y completa o triedro e fica para cima. O pé é um cilindro de eixo x, de raio
 * igual ao do tubo e espessura igual ao diâmetro (x de 0 a 135); o tubo, de eixo z, vai de z = -`comprimento`/2 a +`comprimento`/2, com o
 * eixo em x = `raio`, rente às duas faces do pé.
 *
 * Técnica do elo da junta 4: dois `lathe` unidos por `unir`, com `arredondarCostura` (raio 10,5, 144 lados) no encontro e chanfro de 2 mm no
 * próprio perfil das tampas de fora (as duas faces do pé e as duas pontas do tubo). As portas saem da tampa do `lathe` (`lathe` + `faixa`),
 * e não do `unir`, para a conferência da porta contra a forma não medir a peça inteira.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X local, centro no meio da face do pé que encosta, borda dessa face. Senta no `topo` do anel da junta 5.
 *   saida — anel que recebe, eixo +Z local (no mundo, +Z), centro no meio da ponta do tubo, face inteira. O anel da junta 6 assenta aqui.
 */

export const TABELA = {
  /* Vem do anel pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 67.5,
  /* Comprimento do tubo deitado, ao longo do seu eixo (a medida do esboço, forma `casa6`), centrado no eixo da junta 5. */
  comprimento: 135,
  /* Chanfro estreito das bordas das tampas, como as carcaças do braço. */
  chanfro: 2,
  /* Quanto cada ponta do tubo passa do plano tangente ao pé, em mm: as duas são tangentes e o `unir` deixaria uma fresta (a partir de 0,01 mm ele fecha). */
  avancoDaPonta: 0.05,
  lados: 144,
  /* Arredondamento do encontro: raio nominal, raio mínimo e distância de afinamento até sumir onde o encontro fica tangente (mm). */
  /* 10,5 e não 10: com 10 o arredondamento deixa quatro lascas de área ~0 onde a costura afina contra a borda do pé, que o visor recusa; 10,25 e 10,5 saem limpos. */
  raioDoEncontro: 10.5,
  raioMinimo: 3,
  afinarPontas: 40,
};

const m = (mm) => mm / 1000;
const ID = { pe: 1, tubo: 2, uniao: 3, costura: 4 };

/* a seção de um cilindro, [raio, ao longo do eixo], com chanfro de c nas duas pontas */
function seccao(r, h, c) {
  return [[0, 0], [r - c, 0], [r, c], [r, h - c], [r - c, h], [0, h]];
}

export function derivar(t = TABELA) {
  /* A espessura do pé é o diâmetro: o tubo fica rente às duas faces. */
  return { R: m(t.raio), L: m(t.comprimento), c: m(t.chanfro), E: m(2 * t.raio), pontos: { espessuraDoPe: 2 * t.raio, zDaSaida: t.comprimento / 2, xDoEixoDoTubo: t.raio, diametro: 2 * t.raio, comprimentoDoTubo: t.comprimento } };
}

export function gerarPassos(t = TABELA) {
  const { R, L, c, E } = derivar(t);
  const a = m(t.avancoDaPonta);
  return [
    /* O pé: cilindro de eixo x, raio R e espessura E, com chanfro nas duas faces. */
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'x', perfil: seccao(R, E, c) }],
    /* O tubo deitado: cilindro de eixo z de z = -L/2 a +L/2, com o eixo em x = R (rente às duas faces do pé), chanfro nas duas pontas. */
    ['lathe', { origemId: ID.tubo, lados: t.lados, eixo: 'z', em: [E - R, 0, -L / 2 - a], perfil: seccao(R, L + 2 * a, c) }],
    ['unir', { origemId: ID.uniao, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.tubo } }] }],
    ['arredondarCostura', { origemId: ID.costura, de: { op: 'unir', id: ID.uniao }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'tubo', sel: { tudo: true } }],
    ['parte', { nome: 'pe', sel: { regiao: { min: [-1, -1, -1], max: [R, 1, 1] } }, substituir: true }],
    ['publicarPorta', {
      nome: 'apoio', de: { op: 'lathe', id: ID.pe, faixa: 0, lado: 36 },
      interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'lathe', id: ID.tubo, faixa: 4 },
      interface: { forma: 'anel', papel: 'recebe', eixo: [0, 0, 1], centro: [E - R, 0, L / 2 + a], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/elo-punho-5', desc: 'elo da junta 5 do punho do braço robótico: pé curto de 135 mm no eixo da junta 5 e tubo deitado de 135 mm, perpendicular a esse eixo, que leva a junta 6, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face do pé que encosta no anel; x é o eixo da junta 5 (no mundo, para baixo), z ao longo do tubo deitado (no mundo, +Z, o lado da saída), y para cima, completando o triedro', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'elo da junta 5 do punho do braço robótico: pé curto no eixo da junta 5, encostado no anel da junta 5, e o tubo deitado de 135 mm, perpendicular a esse eixo, paralelo ao eixo da junta 4, que leva a junta 6',
    referencias: ['../../referencias/punho-diametro.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do tubo deitado e do pé, igual ao do anel da junta 5', milimetros: 135 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo da junta 5 (vertical), 135 mm de diâmetro e de espessura, com a face de dentro encostada no anel da junta 5, as duas faces rentes ao tubo, fundido ao tubo com concordância no encontro: uma peça só', tecnica: 'lathe de eixo x unido ao tubo por unir; arredondarCostura de raio constante em modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm nas duas faces do perfil' },
      { nome: 'tubo', forma: 'cilindro reto deitado, 135 mm de diâmetro e de comprimento, eixo horizontal (z do mundo), perpendicular ao da junta 5, que o atravessa no meio; a ponta de +Z, com chanfro de 2 mm, é a saída da junta 6', tecnica: 'lathe de eixo z unido ao pé por unir, com chanfro de 2 mm nas duas pontas; o arredondamento afina até sumir onde o encontro é tangente' },
    ],
    criteriosDeReprovacao: [
      'eixo do tubo deitado que não seja perpendicular ao da junta 5 (horizontal), ou que não seja paralelo ao da junta 4 (z do mundo)',
      'diâmetro do tubo ou do pé diferente de 135 mm',
      'tubo fora do eixo da junta 5: o eixo da junta 5 precisa passar pelo meio do tubo deitado',
      'saída (a face da ponta) voltada para o lado oposto ao da face da junta 4 (-Z do mundo), em vez de +Z',
      'comprimento do tubo deitado diferente de 135 mm',
      'tubo afunilado, ou com degrau',
      'quina viva ou faixa de sombra no encontro do pé com o tubo, ou fresta, emenda ou parafuso entre eles: precisa ser uma peça só',
      'aresta viva nas bordas das tampas, sem o chanfro estreito de 2 mm',
    ],
  },
  /* Uma malha só: o pé e o tubo se tocam por construção; o contato com o anel é a relação de assento da montagem. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
