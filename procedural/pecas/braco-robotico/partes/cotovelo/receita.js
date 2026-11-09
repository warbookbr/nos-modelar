/* braco-robotico/cotovelo — o tubo em pé que sobe do colar, cruzado no alto por um tubo deitado no eixo da junta, numa malha única.
 *
 * Quinta etapa da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-08, opção "3 ajustada") está em
 * `../../ALINHAMENTO.md`, seção "O anel do cotovelo e o cotovelo": tubo de 156 mm em pé, assentado no `topo` do colar, e outro
 * de 156 mm deitado no alto, no eixo da junta, com 175 mm de comprimento e a ponta de trás rente às costas do tubo em pé. O topo
 * fica a 195 mm do colar e o eixo da junta a 117 mm. A saída é a face da frente do tubo deitado, no lado em que o antebraço segue.
 *
 * Referencial local: origem no centro da face de baixo do tubo em pé (a que assenta no colar); y para cima; x é o eixo do tubo
 * deitado, com a saída para +x (o lado do antebraço na vista lateral da prancha); z atravessa o cotovelo de lado a lado. O eixo
 * da junta está em y = alturaDoEixo, z = 0, e o tubo deitado corre de x = -raio (rente às costas do tubo em pé, sem degrau e sem
 * sobrar) a x = -raio + comprimento.
 *
 * O corpo são dois cilindros de revolução, cada um na direção dele (o tubo em pé de eixo y, o deitado de eixo x), juntados por `unir`; o
 * encontro côncavo é `arredondarCostura` de raio constante em modo curvo, com `raioMinimo` e `afinarPontas` para o arredondamento sumir
 * onde o encontro fica tangente, embaixo da frente (o tubo deitado passa à frente do tubo em pé), e na ponta de trás, na borda da tampa
 * plana (aviso `faceLimite`). É a técnica da peça de prova `tools/fixtures/uniao-de-tubos/`. As bordas das tampas levam chanfro de 2 mm no
 * próprio perfil de revolução: a de baixo do tubo em pé e as duas pontas do tubo deitado. O topo do tubo em pé fica dentro do deitado.
 *
 * Duas partes nomeadas, uma só malha: o tubo deitado é a metade de cima do cilindro (y a partir do eixo da junta) e o tubo em pé é
 * o resto, que inclui a metade de baixo do tubo deitado e o arredondamento, porque a região do núcleo recorta por caixa.
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +Y, centro no meio da face de baixo, borda de baixo do tubo em pé. Senta no `topo` do colar.
 *   saida — anel que recebe, eixo +X, centro no meio da face da frente do tubo deitado, face inteira, no eixo da junta. O anel do
 *           antebraço sai daqui.
 */
export const TABELA = {
  /* Vem do colar pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 78,
  /* Altura do eixo da junta acima da face de baixo; o topo fica em alturaDoEixo + raio. */
  alturaDoEixo: 117,
  /* Comprimento do tubo deitado; a ponta de trás fica rente às costas do tubo em pé. */
  comprimento: 175,
  /* Chanfro estreito das bordas das tampas, em mm. */
  chanfro: 2,
  /* Lados dos dois cilindros de revolução. */
  lados: 96,
  /* Arredondamento do encontro: raio nominal, raio mínimo e distância de afinamento até sumir nas pontas (mm). */
  raioDoEncontro: 10,
  raioMinimo: 3,
  afinarPontas: 40,
};

const m = (mm) => mm / 1000;
const ID = { pe: 1, deitado: 2, uniao: 3, costura: 4 };

/* a seção de um cilindro, [raio, ao longo do eixo], com chanfro de c nas pontas pedidas */
function seccao(r, h, c, { baixo, cima }) {
  const p = [[0, 0]];
  if (baixo) p.push([r - c, 0], [r, c]); else p.push([r, 0]);
  if (cima) p.push([r, h - c], [r - c, h]); else p.push([r, h]);
  p.push([0, h]);
  return p;
}

export function derivar(t = TABELA) {
  const rc = t.raio;
  const xTras = -rc;
  const xFace = -rc + t.comprimento;
  return { rc, xTras, xFace, yTopo: t.alturaDoEixo + rc, pontos: { alturaDoEixo: t.alturaDoEixo, topo: t.alturaDoEixo + rc, xTras, xFace } };
}

export function gerarPassos(t = TABELA) {
  const { rc, xFace } = derivar(t);
  const r = m(rc);
  const c = m(t.chanfro);
  const eixo = m(t.alturaDoEixo);
  const corpo = { origem: { op: 'arredondarCostura', id: ID.costura } };
  return [
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'y', perfil: seccao(r, eixo, c, { baixo: true, cima: false }) }],
    ['lathe', { origemId: ID.deitado, lados: t.lados, eixo: 'x', em: [-r, eixo, 0], perfil: seccao(r, m(t.comprimento), c, { baixo: true, cima: true }) }],
    ['unir', { origemId: ID.uniao, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.deitado } }] }],
    ['arredondarCostura', { origemId: ID.costura, de: { op: 'unir', id: ID.uniao }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'tuboEmPe', sel: { origem: { op: 'unir', id: ID.uniao } } }],
    ['parte', { nome: 'tuboEmPe', sel: { origem: corpo.origem } }],
    ['parte', { nome: 'tuboDeitado', sel: { regiao: { min: [-1, eixo, -1], max: [1, 1, 1] } }, substituir: true }],
    ['publicarPorta', {
      nome: 'apoio', de: { op: 'unir', id: ID.uniao },
      interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: r - 0.010, raioExterno: r, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'unir', id: ID.uniao },
      interface: { forma: 'anel', papel: 'recebe', eixo: [1, 0, 0], centro: [m(xFace), eixo, 0], raioInterno: 0, raioExterno: r, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/cotovelo', desc: 'cotovelo do braço robótico: tubo de 156 mm em pé cruzado no alto por outro deitado no eixo da junta, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face de baixo do tubo em pé; y para cima, a saída para +x', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'cotovelo do braço robótico: tubo de 156 mm em pé, subindo do colar, cruzado no alto por um tubo deitado no eixo da junta, que termina na saída redonda onde segue o antebraço',
    referencias: ['../../referencias/cotovelo-opcao3.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro dos dois tubos, igual ao do colar', milimetros: 156 },
    partes: [
      { nome: 'tuboEmPe', forma: 'cilindro reto de 156 mm de diâmetro e eixo vertical, que sobe do colar sem degrau até cruzar o tubo deitado; face de baixo plana com chanfro de 2 mm, concordância no encontro, uma peça só', tecnica: 'lathe de eixo y unido ao tubo deitado por unir; arredondarCostura de raio constante em modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm no perfil' },
      { nome: 'tuboDeitado', forma: 'cilindro reto de 156 mm de diâmetro e 175 mm de comprimento, eixo horizontal a 117 mm, topo a 195; ponta de trás rente às costas do tubo em pé, face da frente plana com chanfro de 2 mm é a saída', tecnica: 'lathe de eixo x unido ao tubo em pé por unir; tampas planas nas duas pontas com chanfro de 2 mm no perfil; o arredondamento afina até sumir na tampa de trás' },
    ],
    criteriosDeReprovacao: [
      'degrau entre o colar e o tubo em pé, ou diâmetro diferente de 156 mm',
      'ponta de trás do tubo deitado além das costas do tubo em pé, ou recuada delas',
      'quina viva ou faixa de sombra no encontro dos dois tubos: o encontro tem concordância',
      'saída fora do eixo do tubo deitado, ou sem a face redonda plana de eixo horizontal',
      'cotovelo mais alto que 195 mm ou mais largo que 175 mm',
      'bordas das tampas vivas, sem o chanfro de 2 mm',
      'fresta, emenda ou parafuso entre os dois tubos: precisa ser uma peça só',
    ],
  },
  /* Uma malha só: os dois tubos são partes da mesma superfície e se tocam por construção; a medida de contato não decide esse par. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
