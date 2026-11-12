/* agulha-na-faceta-do-tubo/receita.js — peça de prova do defeito "faces sem área que a exportação pulou" (plano "costuras e furos limpos"): três cilindros de 190 mm
 * de diâmetro e 144 lados, o pé de eixo x (de x = 0 a 190 mm), o tubo de eixo z (de z = 0 a 443 mm, rente às duas faces do pé) e a carcaça de eixo x centrada na ponta do
 * tubo, unidos por `unir` e com `arredondarCostura` de raio 10 mm no modo curvo. Os três são necessários: sem a carcaça, ou sem o pé, a agulha não nasce. */
const m = (mm) => mm / 1000;

export const TABELA = { raio: 95, comprimento: 443, espessuraDoPe: 190, comprimentoDaCarcaca: 190, avanco: 0.05, chanfro: 2, lados: 144, raioDoEncontro: 10, raioMinimo: 3, afinarPontas: 40 };

function seccao(r, h, c, { baixo, cima }) {
  const p = [[0, 0]];
  if (baixo) p.push([r - c, 0], [r, c]); else p.push([r, 0]);
  if (cima) p.push([r, h - c], [r - c, h]); else p.push([r, h]);
  p.push([0, h]);
  return p;
}

export function gerarPassos(t = TABELA) {
  const R = m(t.raio), L = m(t.comprimento), c = m(t.chanfro), E = m(t.espessuraDoPe), xFrente = m(t.espessuraDoPe - t.comprimentoDaCarcaca);
  return [
    ['lathe', { origemId: 1, lados: t.lados, eixo: 'x', perfil: seccao(R, E, c, { baixo: true, cima: true }) }],
    ['lathe', { origemId: 2, lados: t.lados, eixo: 'z', em: [E - R, 0, 0], perfil: seccao(R, L, c, { baixo: false, cima: false }) }],
    ['lathe', { origemId: 5, lados: t.lados, eixo: 'x', em: [xFrente, 0, L], perfil: seccao(R, m(t.comprimentoDaCarcaca + t.avanco), c, { baixo: true, cima: true }) }],
    ['unir', { origemId: 3, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }, { origem: { op: 'lathe', id: 5 } }] }],
    ['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'corpo', sel: { tudo: true } }],
  ];
}

export default {
  meta: { nome: 'agulha-na-faceta-do-tubo', desc: 'três cilindros unidos e arredondados, com o tubo rente às duas faces do pé' },
  TABELA,
  PARAMS: TABELA,
  TOPO: {},
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
