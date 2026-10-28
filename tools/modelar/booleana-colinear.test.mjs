/* booleana-colinear.test.mjs — caso 1 do plano de ajustes no núcleo, fatia 10: o perfil da perua menos dois cilindros de 8 lados.
   A faceta de cada cilindro dentro do corpo é um hexágono plano de dois cantos colineares. Antes da fusão dos pedaços coplanares
   da booleana ela saía em quatro triângulos, dois deles lascas de 2110 por 7,4 mm (65 faces, duas finas); agora é uma face só
   (49 faces, nenhuma fina) e a forma é a mesma: o volume e a área são os de antes, a 1e-12 relativo. */
import { describe, expect, it } from 'vitest';
import receita from './fixtures/booleana-colinear/receita.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { analisarTopologia } from '../../procedural/nucleo/topologia.js';
import { lascasDaReceita } from './lasca.mjs';

/* medidos com a booleana de antes da fatia 10 (65 faces) */
const VOLUME_ANTES = 9.73644220576414;
const AREA_ANTES = 37.6740481918987;
const FACES_ANTES = 65;

function medir(neutro) {
  let volume = 0;
  let area = 0;
  for (const face of neutro.F.values()) {
    const p = face.vs.map((id) => neutro.V.get(id));
    for (let k = 1; k < p.length - 1; k += 1) {
      const [a, b, c] = [p[0], p[k], p[k + 1]];
      volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    let [nx, ny, nz] = [0, 0, 0];
    for (let k = 0; k < p.length; k += 1) {
      const a = p[k];
      const b = p[(k + 1) % p.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    area += Math.hypot(nx, ny, nz) / 2;
  }
  return { volume, area };
}

describe('booleana: o hexágono com dois cantos colineares', () => {
  const { neutro } = executarReceita(receita);

  it('sai sem nenhuma face fina e sem passo órfão', () => {
    const { lascas, orfaos } = lascasDaReceita(receita);
    expect(orfaos).toEqual([]);
    expect(lascas).toEqual([]);
  });

  it('a forma é a mesma de antes: volume e área iguais a 1e-12 relativo', () => {
    const { volume, area } = medir(neutro);
    expect(Math.abs(volume - VOLUME_ANTES) / VOLUME_ANTES).toBeLessThan(1e-12);
    expect(Math.abs(area - AREA_ANTES) / AREA_ANTES).toBeLessThan(1e-12);
  });

  it('as facetas viram hexágonos de verdade, e a contagem de faces cai de 65 para 49', () => {
    const hexagonos = [...neutro.F.values()].filter((f) => f.vs.length === 6);
    expect(hexagonos.length).toBeGreaterThanOrEqual(2);
    expect(neutro.F.size).toBe(49);
    expect(neutro.F.size).toBeLessThan(FACES_ANTES);
  });

  it('a casca fecha e o hexágono tem triangulação sem triângulo de área nula', () => {
    const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F }, { triangulacao: true });
    expect(topologia.achados.filter((a) => a.severidade === 'reprova')).toEqual([]);
  });
});
