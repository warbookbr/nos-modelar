/* vao-e-anteparo.test.ts — prova de comportamento das duas ops que o O-14 tirou
   do ponto cego: `apagaFace` (abre o vão) e `vira` (corrige a normal). Cada
   asserção compara a peça CONTRA ela mesma com o passo neutralizado por um
   no-op de mesmo índice — `transladar` de deslocamento zero não consome bloco
   de ids, então a numeração fica idêntica e a diferença medida é só a da op. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — peça de exercício em JavaScript.
import * as peca from '../../prototipos/procedural/v3/pecas/_vao-e-anteparo.js';
// @ts-expect-error — módulo neutro de medição em JavaScript.
import { caixaDaParte, descreverPeca } from '../../src/autoria/descrever-partes.js';

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

  it('o anteparo está SUSPENSO dentro da carcaça, com folga em toda a volta', () => {
    const P = peca.PARAMS;
    const neutro = construir();
    const [relacao] = descreverPeca(neutro).relacoes;
    const anteparo = caixaDaParte(neutro, 'anteparo');
    const carcaca = caixaDaParte(neutro, 'carcaca');

    /* A régua diz `encosta`, e é preciso ler o que isso significa AQUI: o
       anteparo é uma chapa de espessura ZERO (uma face só, de `plano`), então
       seu intervalo em y é um ponto. Contido na carcaça em x e z, o maior vão
       dos três eixos é exatamente 0 — e vão 0 é, por definição da régua,
       `encosta`. Não é contato mecânico: a chapa não toca parede nenhuma.
       `encosta` é o TETO do que a régua consegue afirmar sobre um corpo sem
       volume — ele nunca pode dar `interpenetra` (não há espessura para
       invadir) nem `folga` (está contido). O que a peça de exercício afirma de
       verdade é CONTENÇÃO, e é isso que as asserções abaixo prendem. */
    expect(relacao.tipo).toBe('encosta');
    expect([relacao.a, relacao.b]).toEqual(['anteparo', 'carcaca']);
    expect(anteparo.dimensoes[1]).toBe(0);

    /* a folga lateral vem dos parâmetros, não de um número digitado: a chapa é
       menor que a carcaça nos dois eixos e fica centrada, logo sobra metade da
       diferença de cada lado. Alargar o anteparo até a parede muda a peça de
       "chapa suspensa" para "divisória colada", e este teste acusa. */
    const folgaX = (P.carcacaLarg - P.anteparoLargura) / 2;
    const folgaZ = (P.carcacaProf - P.anteparoProfundidade) / 2;
    expect(folgaX).toBeGreaterThan(0);
    expect(folgaZ).toBeGreaterThan(0);
    expect(anteparo.min[0] - carcaca.min[0]).toBeCloseTo(folgaX, 12);
    expect(carcaca.max[0] - anteparo.max[0]).toBeCloseTo(folgaX, 12);
    expect(anteparo.min[2] - carcaca.min[2]).toBeCloseTo(folgaZ, 12);
    expect(carcaca.max[2] - anteparo.max[2]).toBeCloseTo(folgaZ, 12);

    /* e em altura ela fica ACIMA do vão do fundo e ABAIXO do teto — é essa
       posição que faz sentido olhá-la de baixo, que é o motivo do `vira`. */
    expect(anteparo.min[1]).toBeGreaterThan(carcaca.min[1]);
    expect(anteparo.max[1]).toBeLessThan(carcaca.max[1]);
    expect(anteparo.min[1] - carcaca.min[1]).toBeCloseTo(P.anteparoY, 12);
    expect(carcaca.max[1] - carcaca.min[1]).toBeCloseTo(P.carcacaAlt, 12);
  });
});
