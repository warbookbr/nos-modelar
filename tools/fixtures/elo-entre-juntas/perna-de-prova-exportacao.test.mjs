/* perna-de-prova-exportacao.test.mjs — o gate 4 do plano elo entre juntas: a perna de prova, no referencial do esqueleto, exportada em STEP e em OBJ com as oito
 * partes nomeadas (cada parte uma instância da montagem), gravada em tools/bancadas/out/perna-de-prova/exportacao/ (fora do git). Uns 30 s sozinho: o STEP
 * facetado da perna inteira pesa 84 MB. */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarObj } from '../../../modulos/exportador-obj/src/index.js';
import { neutroDaPerna, resolverPerna } from './perna-de-prova.mjs';

const PASTA = resolve(dirname(fileURLToPath(import.meta.url)), '../../bancadas/out/perna-de-prova/exportacao');
const PARTES = ['carcacaQuadril', 'saidaQuadril', 'coxa', 'carcacaJoelho', 'saidaJoelho', 'canela', 'carcacaTornozelo', 'saidaTornozelo'];
const montar = resolverPerna;

describe('exportação da perna de prova', () => {
  it('a perna sai em STEP e em OBJ, com as oito partes nomeadas, numa pasta fora do git', async () => {
    const { resolvida, paraEsqueleto } = montar();
    const neutro = neutroDaPerna(resolvida, paraEsqueleto);
    mkdirSync(PASTA, { recursive: true });
    const step = await exportarCad({ neutro, nome: 'perna-de-prova', formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: 0.00001 });
    writeFileSync(resolve(PASTA, 'perna-de-prova.step'), step.bytes);
    const texto = readFileSync(resolve(PASTA, 'perna-de-prova.step'), 'utf8');
    expect(texto.startsWith('ISO-10303-21')).toBe(true);
    for (const parte of PARTES) expect(texto, parte).toContain(parte);
    const obj = await exportarObj({ nome: 'perna-de-prova', neutro, unidade: 'mm', tolerancia: 0.00001, escala: 1000, exigirFechado: true });
    writeFileSync(resolve(PASTA, 'perna-de-prova.obj'), obj.bytes);
    const linhas = readFileSync(resolve(PASTA, 'perna-de-prova.obj'), 'utf8').split('\n');
    const grupos = linhas.filter((l) => /^[go] /.test(l)).map((l) => l.slice(2).trim());
    for (const parte of PARTES) expect(grupos.some((g) => g.includes(parte)), parte).toBe(true);
    expect(statSync(resolve(PASTA, 'perna-de-prova.step')).size).toBeGreaterThan(10000);
    expect(linhas.filter((l) => l.startsWith('v ')).length).toBeGreaterThan(1000);
  }, 120000);
});
