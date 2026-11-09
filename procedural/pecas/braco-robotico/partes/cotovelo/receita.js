/* braco-robotico/cotovelo — o tubo em pé que sobe do colar, cruzado no alto por um tubo deitado no eixo da junta, numa malha única.
 *
 * Quinta etapa da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-08, opção "3 ajustada") está em
 * `../../ALINHAMENTO.md`, seção "O anel do cotovelo e o cotovelo": tubo de 156 mm em pé, assentado no `topo` do colar, e outro
 * de 156 mm deitado no alto, no eixo da junta, com 190 mm de comprimento (175 na prancha, alongado 15 mm a pedido da pessoa em 2026-11-09) e a ponta da frente rente à frente do tubo em pé. O topo
 * fica a 195 mm do colar e o eixo da junta a 117 mm. O eixo do tubo deitado é z, paralelo ao da junta do ombro (porta `juntaDoOmbro`, +Z); a saída é a face de trás (-z) dele, para o lado oposto ao que a saída do ombro aponta (correção do eixo, 2026-11-09, ver ALINHAMENTO.md).
 *
 * Referencial local: origem no centro da face de baixo do tubo em pé (a que assenta no colar); y para cima; z é o eixo do tubo
 * deitado, com a saída para -z (eixo paralelo ao da junta do ombro, saída para o lado oposto a ela, decisão da pessoa em `referencias/cotovelo-lado.png`); x atravessa o cotovelo de lado a lado. O eixo
 * da junta está em y = alturaDoEixo, x = 0, e o tubo deitado corre de z = +raio (rente à frente do tubo em pé, sem degrau e sem
 * sobrar) a z = +raio - comprimento.
 *
 * O corpo são dois cilindros de revolução, cada um na direção dele (o tubo em pé de eixo y, o deitado de eixo z), juntados por `unir`; o
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
 *   saida — anel que recebe, eixo -Z, centro no meio da face de trás do tubo deitado, face inteira, no eixo da junta. O anel do
 *           antebraço sai daqui.
 */
export const TABELA = {
  /* Vem do colar pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 78,
  /* Altura do eixo da junta acima da face de baixo; o topo fica em alturaDoEixo + raio. */
  alturaDoEixo: 117,
  /* Comprimento do tubo deitado; a ponta da frente fica rente à frente do tubo em pé. */
  comprimento: 190,
  /* Chanfro estreito das bordas das tampas, em mm. */
  chanfro: 2,
  /* Lados dos dois cilindros de revolução. */
  lados: 144,
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
  const zTras = rc;
  const zFace = rc - t.comprimento;
  return { rc, zTras, zFace, yTopo: t.alturaDoEixo + rc, pontos: { alturaDoEixo: t.alturaDoEixo, topo: t.alturaDoEixo + rc, zTras, zFace } };
}

export function gerarPassos(t = TABELA) {
  const { rc, zFace } = derivar(t);
  const r = m(rc);
  const c = m(t.chanfro);
  const eixo = m(t.alturaDoEixo);
  const corpo = { origem: { op: 'arredondarCostura', id: ID.costura } };
  return [
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'y', perfil: seccao(r, eixo, c, { baixo: true, cima: false }) }],
    ['lathe', { origemId: ID.deitado, lados: t.lados, eixo: 'z', em: [0, eixo, r - m(t.comprimento)], perfil: seccao(r, m(t.comprimento), c, { baixo: true, cima: true }) }],
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
      interface: { forma: 'anel', papel: 'recebe', eixo: [0, 0, -1], centro: [0, eixo, m(zFace)], raioInterno: 0, raioExterno: r, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/cotovelo', desc: 'cotovelo do braço robótico: tubo de 156 mm em pé cruzado no alto por outro deitado no eixo da junta, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face de baixo do tubo em pé; y para cima, a saída para -z', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'cotovelo do braço robótico: tubo de 156 mm em pé, subindo do colar, cruzado no alto por um tubo deitado no eixo da junta, que termina na saída redonda onde segue o antebraço',
    referencias: ['../../referencias/cotovelo-opcao3.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro dos dois tubos, igual ao do colar', milimetros: 156 },
    partes: [
      { nome: 'tuboEmPe', forma: 'cilindro reto de 156 mm de diâmetro e eixo vertical, que sobe do colar sem degrau até cruzar o tubo deitado; face de baixo plana com chanfro de 2 mm, concordância no encontro, uma peça só', tecnica: 'lathe de eixo y unido ao tubo deitado por unir; arredondarCostura de raio constante em modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm no perfil' },
      { nome: 'tuboDeitado', forma: 'cilindro reto de 156 mm de diâmetro e 190 mm de comprimento, eixo horizontal z a 117 mm, topo a 195; ponta da frente rente à frente do tubo em pé, face de trás plana com chanfro de 2 mm é a saída', tecnica: 'lathe de eixo z unido ao tubo em pé por unir; tampas planas nas duas pontas com chanfro de 2 mm no perfil; o arredondamento afina até sumir na tampa da frente' },
    ],
    criteriosDeReprovacao: [
      'junta do cotovelo com eixo que não seja paralelo ao da junta do ombro (+Z), ou saída para o mesmo lado da saída do ombro em vez do oposto (-Z)',
      'degrau entre o colar e o tubo em pé, ou diâmetro diferente de 156 mm',
      'ponta da frente do tubo deitado além da frente do tubo em pé, ou recuada dela',
      'quina viva ou faixa de sombra no encontro dos dois tubos: o encontro tem concordância',
      'saída fora do eixo do tubo deitado, ou sem a face redonda plana de eixo z (-Z)',
      'cotovelo mais alto que 195 mm ou mais largo que 190 mm',
      'bordas das tampas vivas, sem o chanfro de 2 mm',
      'fresta, emenda ou parafuso entre os dois tubos: precisa ser uma peça só',
    ],
  },
  /* Uma malha só: os dois tubos são partes da mesma superfície e se tocam por construção; a medida de contato não decide esse par. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
