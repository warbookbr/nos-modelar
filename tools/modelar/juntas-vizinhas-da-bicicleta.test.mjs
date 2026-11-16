/* As uniões das juntas soldadas do quadro da bicicleta em medidas vizinhas das que sempre funcionaram: a coroa do garfo a 396 e a 404 mm e o topo
   dos estais a 40, 43 e 48 mm recusavam a união com "é defeito do cálculo" (plano da costura em nó de tubos, gate 8). Cada valor roda só os
   sólidos das juntas e os passos delas (tmp/varredura/juntas.mjs faz a varredura de 1 em 1 mm). */
import { describe, expect, it } from 'vitest';
import { TABELA, gerarPassos } from '../../procedural/pecas/bicicleta-urbana/receita.js';
import { nucleo } from '../../procedural/nucleo/entrada.js';

/* só os sólidos das juntas soldadas e os passos da junta (unir, friso com costura, unir com vincarCostura) */
function juntas(T) {
  const p = gerarPassos(T);
  const ini = p.findIndex((s, i) => s[0] === 'unir' && p[i + 1]?.[0] === 'friso' && p[i + 1][1].costura);
  const passos = [];
  for (let i = ini; i < p.length; i++) if (['unir', 'friso'].includes(p[i][0])) passos.push(p[i]); else if (p[i][0] !== 'liso') break;
  const ids = new Set(passos.filter((s) => s[0] === 'unir' && !s[1].vincarCostura).flatMap((s) => s[1].solidos.map((x) => `${x.origem.op}:${x.origem.id}`)));
  return [...p.filter((s) => ids.has(`${s[0]}:${s[1].origemId}`)), ...passos];
}

describe('juntas soldadas da bicicleta em medidas vizinhas', () => {
  for (const [campo, valor] of [['garfo_eixo_a_coroa', 396], ['garfo_eixo_a_coroa', 404], ['estai_abaixo_da_abracadeira', 40], ['estai_abaixo_da_abracadeira', 43], ['estai_abaixo_da_abracadeira', 48]]) {
    it(`${campo} = ${valor} mm: as uniões fecham sem recusa`, () => {
      const n = nucleo(juntas({ ...TABELA, [campo]: valor }));
      expect(n.orfaos.filter((o) => o.op === 'unir').map((o) => o.motivo)).toEqual([]);
    }, 60000);
  }
});
