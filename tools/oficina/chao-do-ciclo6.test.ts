/* chao-do-ciclo6.test.ts — caso vermelho da quinta propriedade: um triângulo
   emitido pode ter área zero mesmo com núcleo, adaptador e casca saudáveis. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — adaptador em JavaScript, exercitado em runtime pelo Vitest.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
import {
  areasDeTriangulo, arestasSemPar, cantosSobreAresta, conferirMalha, escalaDaPeca,
} from './conferir-malha.js';

const CUBO = 1;
const FILETE = 9;
const cuboComFilete = (raio: number) => nucleo(
  [
    ['cubo', { origemId: CUBO, larg: 1, alt: 1, prof: 1 }],
    ['filete', { origemId: FILETE, de: { op: 'cubo', id: CUBO, face: 'topo' }, aresta: 0, raio }],
  ],
  {}, {}, {}, null, [],
);

const RAIO_MALDITO = 0.99999999;
const RAIO_SADIO = 0.1;

describe('a quinta propriedade: triângulo emitido tem área', () => {
  it('o caso vermelho passa nas quatro primeiras propriedades', () => {
    const n = cuboComFilete(RAIO_MALDITO);
    expect(n.orfaos).toEqual([]);
    expect(cantosSobreAresta(n)).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
    expect(() => adaptarThree(n, { nome: 'cubo com filete quase total' })).not.toThrow();
  });

  it('a quinta o reprova: quatro dos dezesseis triângulos saem com área zero', () => {
    const n = cuboComFilete(RAIO_MALDITO);
    const { raiz } = adaptarThree(n, { nome: 'cubo com filete quase total' });
    const { abaixo, menor } = areasDeTriangulo(raiz, escalaDaPeca(n));
    expect(menor).toBe(0);
    expect(abaixo).toHaveLength(4);
  });

  it('conferirMalha inteira falha no caso vermelho', () => {
    expect(() => conferirMalha(cuboComFilete(RAIO_MALDITO), {
      fechada: true, rotulo: 'cubo com filete quase total',
    })).toThrow(/sem área/);
  });

  it('um filete comum passa inteiro', () => {
    conferirMalha(cuboComFilete(RAIO_SADIO), { fechada: true, rotulo: 'cubo com filete de raio 0,1' });
  });

  it('o piso é relativo: a mesma forma minúscula e sadia continua válida', () => {
    const lado = 1e-5;
    const n = nucleo(
      [
        ['cubo', { origemId: CUBO, larg: lado, alt: lado, prof: lado }],
        ['filete', { origemId: FILETE, de: { op: 'cubo', id: CUBO, face: 'topo' }, aresta: 0, raio: lado * RAIO_SADIO }],
      ],
      {}, {}, {}, null, [],
    );
    const { raiz } = adaptarThree(n, { nome: 'cubo minúsculo' });
    expect(areasDeTriangulo(raiz, escalaDaPeca(n)).menor).toBeLessThan(1e-9);
    conferirMalha(n, { fechada: true, rotulo: 'cubo minúsculo com filete sadio' });
  });
});
