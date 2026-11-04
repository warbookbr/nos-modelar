/* arredondar-costura-pontas.test.ts — a ponta solta do arredondamento por
   fatias. A fixture é a coluna do braço robótico reduzida ao essencial: um
   disco de eixo z e um cilindro de eixo y do MESMO raio, unidos em L, com a
   costura curva cortada pela `regiao` antes das faces do disco. Sem o chanfro
   nas bordas, a geratriz do disco em x = -R coincide com a do cilindro e a
   própria união deixa um triângulo sem área ali (achado de 2026-11-04). Sem
   `afinarPontas` o tubo fecha no limite da regiao com o raio pleno e uma tampa
   reta, que aparece como dente na sombra; com ele, o raio cai até sumir. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo, neutroCanonico } from '../entrada.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { arestasSemPar, vinculosNaoManifold, cantosSobreAresta, areasDeTriangulo, escalaDaPeca } from '../../../tools/oficina/conferir-malha';

const R = 0.078, ESP = 0.156, RAIO = 0.012, ZMIN = 0.008, C = 0.002, S = 0.0008;   // o chanfro de vértice suavizado das carcaças
const passos = (extra: any = {}): any[] => [
  ['lathe', { origemId: 1, eixo: 'z', lados: 72, segmentosCurva: 2, em: [0, 0, 0], perfil: [[0, 0], [R - C, 0, S], [R, C, S], [R, ESP - C, S], [R - C, ESP, S], [0, ESP]] }],
  ['lathe', { origemId: 2, eixo: 'y', lados: 72, segmentosCurva: 2, em: [0, 0, ESP / 2], perfil: [[0, 0], [R, 0], [R, 0.4 - C, S], [R - C, 0.4, S], [0, 0.4]] }],
  ['unir', { origemId: 3, solidos: [{ origem: { op: 'lathe', id: 1 } }, { origem: { op: 'lathe', id: 2 } }] }],
  ['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: RAIO, raioMinimo: 0.003, regiao: { min: [-1, -1, ZMIN], max: [1, R + 0.01, ESP - ZMIN] }, ...extra }],
  ['pincel', { modo: 'face', sel: { origem: { op: 'arredondarCostura', id: 4 } }, cor: '#ff0000' }],
];

/* quanto o arredondamento enche o canto em cada vértice: a menor distância
   para fora dos dois cilindros (zero na superfície de um deles) */
const enchimento = (p: number[]) => Math.min(Math.hypot(p[0], p[2] - ESP / 2) - R, Math.hypot(p[0], p[1]) - R);
const maiorEnchimento = (n: any, z0: number, z1: number) => {
  let maior = 0;
  for (const f of n.F.values()) if (f.cor === '#ff0000') for (const v of f.vs) {
    const p = n.V.get(v);
    if (p[2] >= z0 && p[2] <= z1) maior = Math.max(maior, enchimento(p));
  }
  return maior;
};

describe('arredondarCostura com afinarPontas', () => {
  it('sem a opção, o tubo chega ao limite da regiao com o raio pleno', () => {
    const n = nucleo(passos());
    expect(n.orfaos).toEqual([]);
    expect(maiorEnchimento(n, ZMIN, ZMIN + 0.003)).toBeGreaterThan(maiorEnchimento(n, 0.04, 0.045));
  });

  it('com a opção, o raio cai na ponta e não muda longe dela', () => {
    const sem = nucleo(passos()), com = nucleo(passos({ afinarPontas: 0.03 }));
    expect(com.orfaos).toEqual([]);
    for (const [z0, z1] of [[ZMIN, ZMIN + 0.003], [ESP - ZMIN - 0.003, ESP - ZMIN]]) {
      expect(maiorEnchimento(com, z0, z1)).toBeLessThan(0.3 * maiorEnchimento(sem, z0, z1));
    }
    // a mais de afinarPontas das duas pontas, o tubo é o mesmo
    expect(maiorEnchimento(com, 0.04, 0.045)).toBeCloseTo(maiorEnchimento(sem, 0.04, 0.045), 6);
  });

  it('a malha sai fechada, a opção não acrescenta triângulo sem área, e a receita é determinística', () => {
    const sem = nucleo(passos()), com = nucleo(passos({ afinarPontas: 0.03 }));
    expect(arestasSemPar(com)).toEqual([]);
    expect(vinculosNaoManifold(com)).toEqual([]);
    expect(cantosSobreAresta(com)).toEqual([]);
    /* a união dos dois cilindros de mesmo raio já deixa um triângulo sem área
       na geratriz em x = -R, onde as duas superfícies se tangenciam: ele é da
       união, e não do arredondamento, e a opção não pode somar outro */
    const lascas = (n: any) => areasDeTriangulo(adaptarThree(n, { nome: 'p' }).raiz, escalaDaPeca(n)).abaixo.length;
    expect(lascas(com)).toBe(lascas(sem));
    expect(lascas(com)).toBe(lascas(nucleo(passos().slice(0, 3))));
    expect(JSON.stringify(neutroCanonico(com))).toBe(JSON.stringify(neutroCanonico(nucleo(passos({ afinarPontas: 0.03 })))));
  });

  it('comprimento que não é positivo grita', () => {
    const n = nucleo(passos({ afinarPontas: 0 }));
    expect(n.orfaos.map((o: any) => o.ref)).toContain('afinarPontas');
  });
});
