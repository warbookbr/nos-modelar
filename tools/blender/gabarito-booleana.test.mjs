/* gabarito-booleana.test.mjs — o gabarito do Blender para a booleana e o bevel (fatia 9 do plano de ajustes no núcleo).
   Sem o Blender, o bloco de entradas roda: os operandos do caso 1 saem fechados (toda aresta com duas faces em sentidos opostos),
   o caso do bevel acha a aresta da tampa de cima e o núcleo a recusa, e o script em Python é Python válido. Com MODELAR_BLENDER
   apontando o executável, o bloco do Blender roda os dois casos: no caso 1 o núcleo e o Blender dão o mesmo volume e a mesma área
   (diferença relativa abaixo de 1e-6; em 2026-10-20 deu 3e-8), o Blender não acha face fina e o núcleo, com os pedaços coplanares
   fundidos (fatia 10), tampouco, com menos faces que as 65 de antes; o caso do bevel só confere que o Blender arredonda (volume
   menor que o do prisma, mais faces). O Blender fica fora do núcleo, do CI e do `--completo`. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';
import { casoBevelFacetado, casoBooleanaColinear, rodarGabarito } from './gabarito-booleana.mjs';

const BLENDER = doAmbiente('BLENDER');
const AQUI = fileURLToPath(new URL('.', import.meta.url));

function arestasSemPar({ faces }) {
  const dirigidas = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.length; k += 1) {
      const chave = `${f[k]}>${f[(k + 1) % f.length]}`;
      dirigidas.set(chave, (dirigidas.get(chave) ?? 0) + 1);
    }
  }
  let abertas = 0;
  for (const [chave, n] of dirigidas) {
    const [a, b] = chave.split('>');
    if (n !== 1 || dirigidas.get(`${b}>${a}`) !== 1) abertas += 1;
  }
  return abertas;
}

describe('gabarito do Blender: as entradas e o script, sem o Blender', () => {
  it('o script gabarito-booleana.py é Python válido', () => {
    const r = spawnSync('python3', ['-I', '-c', 'import ast, sys; ast.parse(open(sys.argv[1]).read())', join(AQUI, 'gabarito-booleana.py')], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('caso 1: o perfil e os dois cilindros entram como sólidos fechados, e o núcleo não acha face fina', async () => {
    const { entrada, nucleo } = await casoBooleanaColinear();
    expect(entrada.operacao).toBe('subtrair');
    expect(entrada.operandos).toHaveLength(3);
    for (const operando of entrada.operandos) expect(arestasSemPar(operando)).toBe(0);
    expect(entrada.operandos.slice(1).map((o) => o.faces.length)).toEqual([10, 10]);
    expect(nucleo.orfaos).toEqual([]);
    expect(nucleo.medidas.facesFinas).toBe(0);
    expect(nucleo.medidas.faces).toBe(49);
  });

  it('caso do bevel: a aresta 0 da tampa de cima existe no prisma e o núcleo a recusa por torcer a vizinha', () => {
    const { entrada, nucleo } = casoBevelFacetado();
    const [operando] = entrada.operandos;
    expect(arestasSemPar(operando)).toBe(0);
    const [a, b] = entrada.bevel.arestas[0];
    expect(operando.vertices[a][1]).toBeCloseTo(operando.vertices[b][1], 12);
    expect(operando.vertices[a][1]).toBeGreaterThan(0);
    expect(nucleo.orfaos).toHaveLength(1);
    expect(nucleo.orfaos[0].motivo).toMatch(/ficaria torta/);
  });
});

describe.skipIf(!BLENDER)('gabarito do Blender: a medida do Blender sobre as mesmas entradas', () => {
  it('caso 1: mesmo volume e mesma área do núcleo, e nenhuma face fina em nenhum dos dois', async () => {
    const caso = await casoBooleanaColinear();
    const blender = rodarGabarito(BLENDER, [caso.entrada])['booleana-colinear'];
    const n = caso.nucleo.medidas;
    expect(Math.abs(blender.volume - n.volume) / n.volume).toBeLessThan(1e-6);
    expect(Math.abs(blender.area - n.area) / n.area).toBeLessThan(1e-6);
    expect(blender.facesFinas).toBe(0);
    expect(n.facesFinas).toBe(0);
    expect(n.faces).toBeLessThan(65);
  }, 120000);

  it('caso do bevel: o Blender arredonda a aresta (menos volume, mais faces), que o núcleo recusa', () => {
    const caso = casoBevelFacetado();
    const blender = rodarGabarito(BLENDER, [caso.entrada])['bevel-facetado'];
    const prisma = 2 * Math.SQRT2 * 0.5 * 0.5 * 1;   // octógono regular de raio 0,5, altura 1
    expect(blender.volume).toBeLessThan(prisma);
    expect(blender.volume).toBeGreaterThan(prisma * 0.99);
    expect(blender.faces).toBeGreaterThan(10);
  }, 120000);
});
