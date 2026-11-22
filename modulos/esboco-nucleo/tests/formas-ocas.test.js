/* formas-ocas.test.js — o anel, o toro e a bacia saem fechados pelas operações que já existem, escritos como o agente os escreve no
 * esboço 2.0, em mm. O backlog os dava como primitivas que faltavam (tampa em anel, toro no esboço, bacia em casca); a prova é
 * topológica: num sólido fechado toda aresta serve a exatamente duas faces. */
import { describe, expect, it } from 'vitest';
import { receitaDaOpcao } from '../src/opcao.js';

function arestasIrregulares(neutro) {
  const uso = new Map();
  for (const f of neutro.F.values()) {
    for (let k = 0; k < f.vs.length; k += 1) {
      const a = f.vs[k]; const b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
  }
  return [...uso.values()].filter((n) => n !== 2).length;
}

const circulo = (cx, cy, r, n) => {
  const pts = Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
  return [...pts, pts[0]];
};
const retangulo = (meiaLarg, meiaProf) => [[meiaLarg, meiaProf], [-meiaLarg, meiaProf], [-meiaLarg, -meiaProf], [meiaLarg, -meiaProf]];
/* o sólido afunilado de seção retangular: o loft entre duas seções, fechado por um polo rente a cada uma */
const afunilado = { origemId: 1, lados: 4, secoes: [
  { pos: [0, 0, 0], raio: 0 }, { pos: [0, 0.1, 0], contorno: retangulo(150, 100) },
  { pos: [0, 120, 0], contorno: retangulo(200, 150) }, { pos: [0, 120.1, 0], raio: 0 },
] };

const casos = [
  ['o tubo de parede grossa: lathe da seção em anel, que volta ao primeiro ponto', [['lathe', { origemId: 1, lados: 24, perfil: [[20, 0], [30, 0], [30, 500], [20, 500], [20, 0]] }]]],
  ['o toro: lathe do círculo fora do eixo, que volta ao primeiro ponto', [['lathe', { origemId: 1, lados: 32, perfil: circulo(200, 0, 50, 16) }]]],
  ['a bacia redonda: lathe com espessura, o perfil é a parede de fora', [['lathe', { origemId: 1, lados: 32, perfil: [[0, 0], [150, 0], [250, 120]], espessura: 5 }]]],
  ['a bandeja de parede reta: extrusao com a casca aberta na tampa de cima', [
    ['extrusao', { origemId: 1, perfil: { retangulo: { largura: 400, profundidade: 300, cantos: 50 } }, altura: 120 }],
    ['casca', { origemId: 2, solido: { origem: { op: 'extrusao', id: 1 } }, abertas: { origem: { op: 'extrusao', id: 1, tampa: 'topo' } }, espessura: 5 }],
  ]],
  ['a bacia de parede inclinada: o sólido afunilado com a casca aberta na última faixa', [
    ['loft', afunilado],
    ['casca', { origemId: 2, solido: { origem: { op: 'loft', id: 1 } }, abertas: { origem: { op: 'loft', id: 1, faixa: 'ultima' } }, espessura: 5 }],
  ]],
  ['o tubo de seção variável aberto nas duas pontas: a casca aberta na primeira e na última faixa', [
    ['loft', afunilado],
    ['casca', { origemId: 2, solido: { origem: { op: 'loft', id: 1 } }, abertas: { origem: { op: 'loft', id: 1, faixa: { passo: 2, fase: 0 } } }, espessura: 5 }],
  ]],
];

describe('as formas ocas saem fechadas pelas operações que já existem', () => {
  for (const [nome, passos] of casos) {
    it(nome, () => {
      const { neutro } = receitaDaOpcao({ titulo: 't', passos: [...passos, ['parte', { nome: 'forma', sel: { tudo: true } }]] });
      expect(neutro.F.size).toBeGreaterThan(0);
      expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
      expect(arestasIrregulares(neutro)).toBe(0);
    });
  }
});
