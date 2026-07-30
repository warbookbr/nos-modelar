/* vao-e-anteparo.test.ts — prova de comportamento das duas ops que o O-14 tirou
   do ponto cego: `apagaFace` (abre o vão) e `vira` (corrige a normal). Cada
   asserção compara a peça CONTRA ela mesma com o passo neutralizado por um
   no-op de mesmo índice — `transladar` de deslocamento zero não consome bloco
   de ids, então a numeração fica idêntica e a diferença medida é só a da op. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça de exercício em JavaScript.
import * as peca from '../../prototipos/fps/v3/pecas/_vao-e-anteparo.js';

const NOOP = ['transladar', { d: [0, 0, 0], sel: { grupo: 'anteparo' } }];
const PASSO_VIRA = 2;
const PASSO_APAGA = 6;
const FACE_ANTEPARO = 0;
const FUNDO_DA_CARCACA = 4000;   // base do passo 4 (`cubo`) + face 0 do contrato = `fundo`

function construir(passos: unknown[] = peca.PASSOS) {
  return nucleo(passos, peca.PARAMS, peca.TOPO);
}
function semOPasso(indice: number) {
  const passos = peca.PASSOS.slice();
  passos[indice] = NOOP;
  return construir(passos);
}
/* normal de Newell — a mesma que o núcleo usa para decidir o lado da face. */
function normal(neutro: any, fid: number) {
  const vs = neutro.F.get(fid).vs.map((v: number) => neutro.V.get(v));
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i], b = vs[(i + 1) % vs.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}
function posicoes(neutro: any) {
  return [...neutro.V.keys()].sort((a: number, b: number) => a - b)
    .map((v: number) => [v, ...neutro.V.get(v)]);
}

describe('_vao-e-anteparo — as duas ops que faltavam ao gabarito', () => {
  it('a peça fecha sem órfão e com toda face nomeada', () => {
    const neutro = construir();
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.V.size).toBe(12);
    expect(neutro.F.size).toBe(6);
    for (const face of neutro.F.values()) expect(typeof face.parte).toBe('string');
  });

  it('apagaFace abre o vão: remove EXATAMENTE a tampa de fundo, e só ela', () => {
    const com = construir();
    const sem = semOPasso(PASSO_APAGA);

    expect(sem.F.size - com.F.size).toBe(1);
    expect(sem.F.has(FUNDO_DA_CARCACA)).toBe(true);
    expect(com.F.has(FUNDO_DA_CARCACA)).toBe(false);
    // nenhuma OUTRA face saiu, e nenhum vértice foi levado junto
    for (const fid of sem.F.keys()) expect(com.F.has(fid)).toBe(fid !== FUNDO_DA_CARCACA);
    expect(posicoes(com)).toEqual(posicoes(sem));
  });

  it('vira inverte a normal do anteparo sem mover um único vértice', () => {
    const com = construir();
    const sem = semOPasso(PASSO_VIRA);

    // geometria byte-idêntica: `vira` mexe em ORDEM, não em posição
    expect(posicoes(com)).toEqual(posicoes(sem));
    expect([...com.F.keys()].sort()).toEqual([...sem.F.keys()].sort());

    // a ordem dos cantos é a reversa exata
    expect(com.F.get(FACE_ANTEPARO).vs).toEqual(sem.F.get(FACE_ANTEPARO).vs.slice().reverse());

    // e a normal troca de sinal exatamente — sem resíduo, que é o que um
    // `rotaciona` de 180° deixaria
    const antes = normal(sem, FACE_ANTEPARO);
    const depois = normal(com, FACE_ANTEPARO);
    expect(depois).toEqual(antes.map((c) => (c === 0 ? 0 : -c)));
    expect(antes[1]).toBeGreaterThan(0);   // `plano` nasce olhando para +y
    expect(depois[1]).toBeLessThan(0);     // e o anteparo é visto de baixo
  });
});
