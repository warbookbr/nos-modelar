/* roda-costura.test.ts — a receita de uma roda de liga leve (cópia de dado de teste, sem a pasta de referências da peça) como prova das três coisas que a costura
   dos raios com o aro media na operação `arredondarCostura`: faces finas nos pedaços das faces cortadas, recusa que mudava com 1 mm da parede inclinada e a
   parte do aro que sumia quando o tubo cobria uma face inteira dele. O caso mínimo, rápido, está em
   procedural/nucleo/operacoes/arredondar-costura-placa-e-barril.test.ts; este é o objeto real, e por isso lento. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../../../procedural/nucleo/entrada.js';
// @ts-expect-error — análise de topologia em JavaScript.
import { analisarTopologia } from '../../../procedural/nucleo/topologia.js';
// @ts-expect-error — receita em JavaScript.
import { gerarPassos, TABELA } from './receita.js';

const ATE_O_ARREDONDAMENTO = (passos: any[]) => passos.slice(0, passos.findIndex((p) => p[0] === 'arredondarCostura' && p[1].origemId === 71) + 1);
const finasDe = (n: any) => analisarTopologia({ vertices: n.V, faces: n.F }, {}).achados.filter((a: any) => a.codigo === 'face-fina').length;
const semMaterial = (n: any) => n.orfaos.filter((o: any) => !/material/.test(o.motivo));

describe('a roda: costura dos raios com o aro', () => {
  it('a costura de raio 8 sai sem faces finas, e a parede de 28 a 31 mm de avanço é aceita (29 recusava)', () => {
    for (const avancoAxialDaParede of [28, 29, 31]) {
      const n = nucleo(ATE_O_ARREDONDAMENTO(gerarPassos({ ...TABELA, avancoAxialDaParede })));
      expect(n.orfaos, `avanço ${avancoAxialDaParede}`).toEqual([]);
      expect(finasDe(n), `avanço ${avancoAxialDaParede}`).toBeLessThanOrEqual(1);
    }
  });

  it('com a face da borda estreita o tubo cobre faces do aro, e a parte do aro continua com as faces dela', () => {
    const t = { ...TABELA, larguraDaFaceDaBorda: 6, lados: 72, ladosDoPrato: 72 };
    const passos = gerarPassos(t);
    const n = nucleo(passos.slice(0, passos.findIndex((p: any) => p[0] === 'parte' && p[1].nome === 'aro') + 1).filter((p: any) => p[0] !== 'material'));
    expect(semMaterial(n)).toEqual([]);
    const porParte: Record<string, number> = {};
    for (const f of n.F.values()) porParte[f.parte] = (porParte[f.parte] ?? 0) + 1;
    expect(porParte.aro).toBeGreaterThan(1000);
    expect(porParte.raios).toBeGreaterThan(1000);
  });
});
