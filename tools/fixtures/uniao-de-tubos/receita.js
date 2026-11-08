/* receita.js — a peça de prova do plano "união de dois tubos com arredondamento" (`docs/modelar/planos/2026-11-08-uniao-de-tubos-com-arredondamento.md`):
 * um tubo em pé de 156 mm de diâmetro sobre um disco do mesmo diâmetro, cruzado no alto por um tubo deitado também de 156 mm e 175 mm de
 * comprimento, com o fundo a 39 mm acima do topo do disco e a frente 19 mm além da frente do tubo em pé. Cada tubo é um cilindro na direção dele;
 * a união é `unir` e o encontro côncavo, `arredondarCostura` de raio constante em modo curvo, com `raioMinimo` e `afinarPontas` para o
 * arredondamento sumir onde o encontro fica tangente, embaixo da frente. Nenhum dado vem de referência externa.
 *
 * Referencial: origem no centro da face de baixo do tubo em pé; y para cima; x é o eixo do tubo deitado, com a frente para +x; z atravessa a
 * peça. O disco fica de y = -alturaDoDisco a y = 0, encostado na base do tubo em pé. */
const m = (mm) => mm / 1000;

export const TABELA = {
  raio: 78,
  /* o eixo do tubo deitado: o fundo dele (alturaDoEixo - raio) é a folga de 39 mm até o topo do disco */
  alturaDoEixo: 117,
  comprimento: 175,
  alturaDoDisco: 25,
  lados: 96,
  /* o arredondamento do encontro */
  raioDoEncontro: 10,
  raioMinimo: 3,
  afinarPontas: 40,
  /* a caixa [min, max] em mm onde o arredondamento vale; sem ela, a costura inteira */
  regiao: null,
  /* a caixa [min, max] em mm que corta o arredondamento fora da regiao; precisa da regiao */
  aparar: null,
};

/* a seção de um cilindro de revolução, [raio, ao longo do eixo], fechada pelo eixo nas duas pontas */
const seccao = (r, h) => [[0, 0], [r, 0], [r, h], [0, h]];

export function gerarPassos(T = TABELA) {
  const r = m(T.raio);
  const topoDoPe = m(T.alturaDoEixo);
  const passos = [
    /* o tubo em pé sobe da base (y = 0) até o eixo do tubo deitado, dentro dele */
    ['lathe', { origemId: 1, lados: T.lados, eixo: 'y', perfil: seccao(r, topoDoPe) }],
    /* o tubo deitado vai de x = -raio (rente às costas do tubo em pé) a x = -raio + comprimento */
    ['lathe', { origemId: 2, lados: T.lados, eixo: 'x', em: [-r, topoDoPe, 0], perfil: seccao(r, m(T.comprimento)) }],
    ['unir', { origemId: 3, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }] }],
  ];
  if (T.raioDoEncontro > 0) {
    passos.push(['arredondarCostura', {
      origemId: 4, de: { op: 'unir', id: 3 }, raio: m(T.raioDoEncontro), raioMinimo: m(T.raioMinimo), afinarPontas: m(T.afinarPontas),
      ...(T.regiao ? { regiao: { min: T.regiao.min.map(m), max: T.regiao.max.map(m) } } : {}),
      ...(T.aparar ? { aparar: { min: T.aparar.min.map(m), max: T.aparar.max.map(m) } } : {}),
    }]);
  }
  passos.push(['parte', { nome: 'tubos', sel: { origem: { op: 'unir', id: 3 } } }]);
  if (T.raioDoEncontro > 0) passos.push(['parte', { nome: 'tubos', sel: { origem: { op: 'arredondarCostura', id: 4 } } }]);
  /* o disco sob o tubo em pé, do mesmo diâmetro, com o topo liso em y = 0 */
  passos.push(['lathe', { origemId: 5, lados: T.lados, eixo: 'y', em: [0, -m(T.alturaDoDisco), 0], perfil: seccao(r, m(T.alturaDoDisco)) }]);
  passos.push(['parte', { nome: 'disco', sel: { origem: { op: 'lathe', id: 5 } } }]);
  return passos;
}

export const PLANO = {
  objeto: 'peça de prova: tubo de 156 mm em pé sobre um disco, cruzado no alto por um tubo deitado de mesmo diâmetro que passa 19 mm à frente dele, com o encontro arredondado',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'diâmetro dos dois tubos', milimetros: 156 },
  partes: [
    { nome: 'tubos', forma: 'tubo em pé de 156 mm, redondo até a base, cruzado no alto por um tubo deitado de 156 mm e 175 mm de comprimento, 19 mm à frente dele, com o encontro arredondado', tecnica: 'dois sólidos de revolução unidos por unir, com arredondarCostura em modo curvo, raioMinimo e afinarPontas' },
    { nome: 'disco', forma: 'disco de 156 mm de diâmetro e 25 mm de altura sob o tubo em pé, com o topo plano em y = 0, rente à parede do tubo em pé, sem degrau', tecnica: 'revolução de eixo y, parte própria' },
  ],
  criteriosDeReprovacao: [
    'aba, degrau ou aresta fina no encontro, na frente do tubo em pé, onde o arredondamento some',
    'dobra de diedro agudo ou vinco não declarado no encontro',
    'face fina, triângulo sem área ou malha aberta',
    'diâmetro dos tubos ou do disco diferente de 156 mm, ou comprimento do tubo deitado diferente de 175 mm',
    'degrau entre o disco e o tubo em pé, ou base do tubo em pé que não é um círculo inteiro',
  ],
};

const receita = {
  meta: { nome: 'uniao-de-tubos', desc: 'dois tubos de mesmo diâmetro que se cruzam, unidos com o encontro arredondado, sobre um disco' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face de baixo do tubo em pé; y para cima, a frente para +x' }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
  contatos: [{ par: ['disco', 'tubos'], motivo: 'o tubo em pé assenta no topo do disco, rente, sem degrau' }],
};

export default receita;
