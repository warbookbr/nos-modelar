/* arredondar-costura-tubos-altos.test.ts — dois tubos de mesmo diâmetro em T, o vertical mais alto que o raio, unidos e arredondados.
   Com 144 lados as geratrizes dos dois tubos cruzam-se a micrômetros uma da outra (os vértices de 5° coincidem), e o acabamento dos
   pedaços oscilava entre fundir e partir a lasca, saindo com faces sem área. A altura 117 é a do cotovelo do braço robótico. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { arestasSemPar, vinculosNaoManifold, cantosSobreAresta } from '../../../tools/oficina/conferir-malha';

const m = (mm: number) => mm / 1000;
const D = 156, COMPRIMENTO = 190, LADOS = 144;
const seccao = (r: number, h: number) => [[0, 0], [r, 0], [r, h], [0, h]];
/* tubo vertical de eixo y de 0 a `alto`, e tubo deitado de eixo z nessa altura, com a frente rente à frente do vertical */
const passos = (alto: number, raio: number): any[] => [
  ['lathe', { origemId: 1, lados: LADOS, eixo: 'y', em: [0, 0, m(D / 2)], perfil: seccao(m(D / 2), m(alto)) }],
  ['lathe', { origemId: 2, lados: LADOS, eixo: 'z', em: [0, m(alto), m(D - COMPRIMENTO)], perfil: seccao(m(D / 2), m(COMPRIMENTO)) }],
  ['unir', { origemId: 3, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }] }],
  ['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: m(raio), raioMinimo: m(3), afinarPontas: m(40) }],
];

describe('arredondarCostura em T de tubos de mesmo diâmetro', () => {
  for (const alto of [117, 139, 239, 439, 541]) {
    for (const raio of [10, 6, 3]) {
      it(`vertical de ${alto} mm, raio ${raio}: sem órfãos, malha fechada e adaptável`, () => {
        const n = nucleo(passos(alto, raio));
        expect(n.orfaos).toEqual([]);
        expect(cantosSobreAresta(n)).toEqual([]);
        expect(arestasSemPar(n)).toEqual([]);
        expect(vinculosNaoManifold(n)).toEqual([]);
        expect(() => adaptarThree(n, { nome: `T ${alto}/${raio}` })).not.toThrow();
      }, 60000);
    }
  }
});
