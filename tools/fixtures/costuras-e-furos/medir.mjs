/* medir.mjs — executa uma peça de prova de `tools/fixtures/costuras-e-furos/` e devolve os números das três réguas de malha mais a contagem de arestas
   soltas, que é a medida de fresta (uma aresta que só uma face usa). */
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { medirReguasDeMalha } from '../../modelar/reguas-de-malha/reguas-de-malha.mjs';

export function arestasSoltas(neutro) {
  const usos = new Map();
  for (const f of neutro.F.values()) {
    for (let i = 0; i < f.vs.length; i++) {
      const a = f.vs[i], b = f.vs[(i + 1) % f.vs.length];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      usos.set(k, (usos.get(k) ?? 0) + 1);
    }
  }
  return [...usos.values()].filter((x) => x === 1).length;
}

export function medirPeca(receita) {
  const { neutro } = executarReceita(receita);
  return {
    neutro,
    faces: neutro.F.size,
    orfaos: neutro.orfaos,
    avisos: neutro.avisos.map((a) => a.ref),
    arestasSoltas: arestasSoltas(neutro),
    ...medirReguasDeMalha(neutro),
  };
}
