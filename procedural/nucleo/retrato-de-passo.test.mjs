/* retrato-de-passo.test.mjs — o retrato que a procedência tira entre dois passos dá os mesmos ids mudados que a
   serialização direta de cada entrada, que era como o núcleo fazia até 2026-10-28.

   O retrato reaproveita a serialização da entrada cujo valor não mudou. O teste sorteia mapas de vértices e de faces
   no formato do neutro, aplica a cada rodada edições que o núcleo faz de fato (mover um vértice no lugar, trocar um campo
   da face, acrescentar e apagar entradas, reordenar chaves) e as que o JSON trata de um jeito próprio (NaN, zero negativo,
   valor indefinido, objeto que não é dado simples), e exige que `idsMudados` devolva, a cada rodada, exatamente a lista
   que a comparação por `JSON.stringify` daria. */
import { describe, expect, it } from 'vitest';
import { idsMudados, retratarEntradas } from './nucleo.js';

function gerador(semente) {
  let s = semente >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const porJson = (mapa) => new Map([...mapa].map(([id, valor]) => [id, JSON.stringify(valor)]));
const referencia = (antes, depois) => [...depois].filter(([id, json]) => antes.get(id) !== json).map(([id]) => id)
  .sort((a, b) => typeof a === 'number' ? a - b : a < b ? -1 : a > b ? 1 : 0);

function editar(aleatorio, mapa, proximoId) {
  const ids = [...mapa.keys()];
  const sorteio = aleatorio();
  const id = ids[Math.floor(aleatorio() * ids.length)];
  const valor = mapa.get(id);
  if (sorteio < 0.25 && Array.isArray(valor)) valor[Math.floor(aleatorio() * valor.length)] += aleatorio() < 0.5 ? 0.5 : 0;
  else if (sorteio < 0.35 && Array.isArray(valor)) valor[0] = aleatorio() < 0.5 ? NaN : -0;
  else if (sorteio < 0.45 && Array.isArray(valor)) valor[1] = 0;
  else if (sorteio < 0.55 && valor && !Array.isArray(valor)) valor.parte = aleatorio() < 0.5 ? 'carroceria' : null;
  else if (sorteio < 0.62 && valor && !Array.isArray(valor)) valor.vs.push(proximoId());
  else if (sorteio < 0.68 && valor && !Array.isArray(valor)) { const { id: i, ...resto } = valor; mapa.set(id, { ...resto, id: i }); }
  else if (sorteio < 0.74 && valor && !Array.isArray(valor)) valor.tinta = aleatorio() < 0.5 ? undefined : [];
  else if (sorteio < 0.8 && valor && !Array.isArray(valor)) valor.extra = new Map([[1, 2]]);
  else if (sorteio < 0.86) mapa.delete(id);
  else if (sorteio < 0.93) { const novo = proximoId(); mapa.set(novo, Array.isArray(valor) ? [aleatorio(), aleatorio(), aleatorio()] : { id: novo, vs: [1, 2, 3], parte: null, tinta: [] }); }
  else if (valor && !Array.isArray(valor)) valor.vs = [...valor.vs].reverse();
}

describe('retrato do estado entre passos', () => {
  for (const [nome, inicial] of [
    ['vértices', (a, n) => new Map(Array.from({ length: n }, (_, i) => [i, [a(), a(), a()]]))],
    ['faces', (a, n) => new Map(Array.from({ length: n }, (_, i) => [i, { id: i, vs: [i, i + 1, i + 2], cor: null, material: null, parte: null, liso: false, solido: false, tinta: [] }]))],
  ]) {
    it(`os ids mudados de ${nome} são os da serialização direta, em 300 rodadas sorteadas`, () => {
      let rodadasComMudanca = 0;
      for (let semente = 1; semente <= 30; semente += 1) {
        const aleatorio = gerador(semente);
        const mapa = inicial(aleatorio, 6 + (semente % 9));
        let contador = 1000;
        const proximoId = () => { contador += 1; return contador; };
        let retrato = retratarEntradas(mapa, null);
        for (let rodada = 0; rodada < 10; rodada += 1) {
          const antesJson = porJson(mapa);
          for (let k = 0; k < 1 + (rodada % 3); k += 1) if (mapa.size) editar(aleatorio, mapa, proximoId);
          const depois = retratarEntradas(mapa, retrato);
          const esperado = referencia(antesJson, porJson(mapa));
          expect(idsMudados(retrato, depois), `${nome} semente ${semente} rodada ${rodada}`).toEqual(esperado);
          if (esperado.length) rodadasComMudanca += 1;
          retrato = depois;
        }
      }
      expect(rodadasComMudanca).toBeGreaterThan(100);
    });
  }
});
