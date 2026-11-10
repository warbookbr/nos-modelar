/* tubos-em-t.js — o gerador das peças de prova de união de dois tubos do plano "costuras e furos limpos" (`docs/modelar/planos/2026-11-09-costuras-e-furos-limpos.md`).
 *
 * Dois cilindros de revolução em T: o tubo em pé, de eixo y, sobe da base (y = 0) até o eixo do tubo deitado, que cruza o alto dele; o tubo
 * deitado tem o mesmo raio e fica a `alturaDoEixo` da base. Referencial: origem no centro da base do tubo em pé; y para cima; a frente do tubo em
 * pé está em +raio no eixo do tubo deitado. Com `eixoDoDeitado: 'z'` o tubo deitado corre de z = raio - comprimento até a frente em z = raio, e com
 * 'x' de x = -raio até x = -raio + comprimento (a ponta rente é a de trás). `avanco`, em mm, é quanto a ponta rente passa do plano tangente ao tubo em pé:
 * com 0 as duas paredes são tangentes ao micrômetro. Sem nome de objeto, só as medidas dos casos reais. */
const m = (mm) => mm / 1000;

export const BASE = {
  raio: 95,
  alturaDoEixo: 524,
  comprimento: 210,
  avanco: 0,
  chanfro: 2,
  chanfroNaBase: false,
  lados: 144,
  eixoDoDeitado: 'z',
  /* true: o tubo em pé fica em z de 0 a 2 raios (como no braço de três tubos) em vez de centrado em z = 0; muda as contas de ponto flutuante da tangência */
  frenteEmDoisRaios: false,
  /* true: um terceiro cilindro de eixo z, de z = 0 a 2 raios, o pé que o tubo em pé cruza na base */
  pe: false,
  raioDoEncontro: 10,
  raioMinimo: 3,
  afinarPontas: 40,
  /* só o `unir`, sem o arredondamento da costura, quando `raioDoEncontro` é 0 */
};

/* a seção de um cilindro, [raio, ao longo do eixo], com chanfro de c nas pontas pedidas */
function seccao(r, h, c, { baixo, cima }) {
  const p = [[0, 0]];
  if (baixo) p.push([r - c, 0], [r, c]); else p.push([r, 0]);
  if (cima) p.push([r, h - c], [r - c, h]); else p.push([r, h]);
  p.push([0, h]);
  return p;
}

export function gerarPassos(opcoes = {}) {
  const t = { ...BASE, ...opcoes };
  const r = m(t.raio), c = m(t.chanfro), eixo = m(t.alturaDoEixo);
  const comp = m(t.comprimento + t.avanco);
  const dr = t.frenteEmDoisRaios || t.pe;
  const deitado = t.eixoDoDeitado === 'x'
    ? { eixo: 'x', em: [-r - m(t.avanco), eixo, 0] }
    : { eixo: 'z', em: [0, eixo, (dr ? 2 * r : r) - m(t.comprimento)] };
  const passos = [
    ['lathe', { origemId: 1, lados: t.lados, eixo: 'y', ...(dr ? { em: [0, 0, r] } : {}), perfil: seccao(r, eixo, c, { baixo: t.chanfroNaBase, cima: false }) }],
    ['lathe', { origemId: 2, lados: t.lados, eixo: deitado.eixo, em: deitado.em, perfil: seccao(r, comp, c, { baixo: true, cima: true }) }],
  ];
  if (t.pe) passos.push(['lathe', { origemId: 6, lados: t.lados, eixo: 'z', perfil: seccao(r, 2 * r, c, { baixo: true, cima: true }) }]);
  passos.push(['unir', { origemId: 3, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }, ...(t.pe ? [{ origem: { op: 'lathe', id: 6 } }] : [])] }]);
  if (t.raioDoEncontro > 0) {
    passos.push(['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }]);
  }
  passos.push(['parte', { nome: 'tubos', sel: { tudo: true } }]);
  return passos;
}

/** A receita executável de uma variante: `desc` diz o defeito. */
export function receitaDeTubos(nome, desc, opcoes) {
  const PARAMS = { ...BASE, ...opcoes };
  return { meta: { nome, desc }, TABELA: PARAMS, PARAMS, TOPO: {}, get PASSOS() { return gerarPassos(this.PARAMS); } };
}
