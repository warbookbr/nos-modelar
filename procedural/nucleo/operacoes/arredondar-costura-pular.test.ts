/* arredondar-costura-pular.test.ts — `pularOQueNaoCabe`: onde nenhum raio coube, o passo recusava a costura inteira (e tudo que citava a origem do
   arredondamento ficava sem identidade). Com a opção o tubo se parte ali, a aresta fica viva naquele trecho e o aviso `naoCabe` diz onde. Caso mínimo: um bolso
   num cilindro cuja parede é mais curta que o raio (o mesmo de arredondar-costura-convexa.test.ts, que recusa). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';

const de = (op: string, id: number) => ({ origem: { op, id } });
const ALIAS = [['tubo', { unir: [{ origem: { op: 'cilindro', id: 1 } }, { origem: { op: 'cilindro', id: 1, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }] }]];
const POCKET: any[] = [
  ['cilindro', { origemId: 1, raio: 0.5, altura: 2, lados: 96 }],
  ['cubo', { origemId: 2, larg: 0.4, alt: 0.6, prof: 0.8, em: [0.45, 0.7, -0.4] }],
  ['subtrair', { origemId: 9, solidos: [{ alias: 'tubo' }, de('cubo', 2)] }],
];
const arredonda = (extra: any): any[] => ['arredondarCostura', { origemId: 10, de: { op: 'subtrair', id: 9 }, raio: 0.03, arestas: 'convexas', ...extra }] as any;
const roda = (passos: any[]) => nucleo(passos, {}, {}, {}, null, ALIAS);
const motivos = (n: any) => n.orfaos.map((o: any) => o.motivo).join(' | ');

describe('arredondarCostura com pularOQueNaoCabe', () => {
  it('sem a opção o raio que não cabe recusa; com ela o passo vale, e o trecho que não coube é declarado', () => {
    const recusado = roda([...POCKET, arredonda({})]);
    expect(motivos(recusado)).toMatch(/quina da superfície/);
    const pulado = roda([...POCKET, arredonda({ pularOQueNaoCabe: true })]);
    expect(motivos(pulado)).not.toMatch(/quina da superfície/);
    const aviso = pulado.avisos.find((a: any) => a.ref === 'naoCabe');
    expect(aviso, motivos(pulado)).toBeTruthy();
    expect(aviso.estacoes).toBeGreaterThan(0);
    expect(aviso.motivo).toMatch(/pularOQueNaoCabe/);
  });

  it('pularOQueNaoCabe só aceita true ou false', () => {
    expect(motivos(roda([...POCKET, arredonda({ pularOQueNaoCabe: 'sim' })]))).toMatch(/pularOQueNaoCabe é true ou false/);
  });
});
