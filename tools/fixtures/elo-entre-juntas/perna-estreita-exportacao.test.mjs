/* perna-estreita-exportacao.test.mjs — o gate de saída 2 do plano perna estreita: a perna estreita, no referencial do esqueleto, exportada em STEP e em OBJ com as oito partes
 * nomeadas (cada parte uma instância da montagem), gravada em tools/bancadas/out/perna-estreita-final/exportacao/ (fora do git). */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarObj } from '../../../modulos/exportador-obj/src/index.js';
import { neutroDaPerna } from './perna-de-prova.mjs';
import { resolverPernaEstreita } from './perna-estreita.mjs';

const PASTA = resolve(dirname(fileURLToPath(import.meta.url)), '../../bancadas/out/perna-estreita-final/exportacao');
const PARTES = ['carcacaQuadril', 'saidaQuadril', 'coxa', 'carcacaJoelho', 'saidaJoelho', 'canela', 'carcacaTornozelo', 'saidaTornozelo'];

describe('exportação da perna estreita', () => {
  it('a perna sai em STEP e em OBJ, com as oito partes nomeadas, numa pasta fora do git', async () => {
    const { resolvida, paraEsqueleto } = resolverPernaEstreita();
    const neutro = neutroDaPerna(resolvida, paraEsqueleto);
    mkdirSync(PASTA, { recursive: true });
    const step = await exportarCad({ neutro, nome: 'perna-estreita', formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: 0.00001 });
    writeFileSync(resolve(PASTA, 'perna-estreita.step'), step.bytes);
    const texto = readFileSync(resolve(PASTA, 'perna-estreita.step'), 'utf8');
    expect(texto.startsWith('ISO-10303-21')).toBe(true);
    for (const parte of PARTES) expect(texto, parte).toContain(parte);
    const obj = await exportarObj({ nome: 'perna-estreita', neutro, unidade: 'mm', tolerancia: 0.00001, escala: 1000, exigirFechado: true });
    writeFileSync(resolve(PASTA, 'perna-estreita.obj'), obj.bytes);
    const linhas = readFileSync(resolve(PASTA, 'perna-estreita.obj'), 'utf8').split('\n');
    const grupos = linhas.filter((l) => /^[go] /.test(l)).map((l) => l.slice(2).trim());
    for (const parte of PARTES) expect(grupos.some((g) => g.includes(parte)), parte).toBe(true);
    expect(statSync(resolve(PASTA, 'perna-estreita.step')).size).toBeGreaterThan(10000);
    expect(linhas.filter((l) => l.startsWith('v ')).length).toBeGreaterThan(1000);
  }, 60000);
});
