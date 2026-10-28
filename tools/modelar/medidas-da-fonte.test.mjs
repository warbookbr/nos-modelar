/* Testes de medidas-da-fonte.mjs sobre a fonte sintética da fixture de caixas: perfil, seção, planta, rodas, o trecho de receita que o núcleo executa e a recusa de fonte sem frente. */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { codigoDeReceita, medidasDaFonte, simplificar } from './medidas-da-fonte.mjs';
import { fonteDeReceita } from './fonte-sintetica.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import receitaBase from './fixtures/veiculo-caixa/receita.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const fonte = fonteDeReceita(receitaBase);

describe('medidas da fonte', () => {
  it('simplifica a polilinha deixando só os vértices onde ela dobra', () => {
    expect(simplificar([[0, 0], [1, 0.1], [2, 0], [3, 0], [4, 5]], 1)).toEqual([[0, 0], [3, 0], [4, 5]]);
  });

  it('tira da caixa de teste o perfil lateral, a seção frontal, a planta e a caixa, em milímetro', () => {
    const m = medidasDaFonte(fonte, { tol: 25 });
    expect(m.caixa).toEqual({ xMeia: 900, yMax: 1500, zDe: -2000, zAte: 2000 });
    /* da frente para trás: o nariz sobe até a cintura, a cabine sobe ao teto e desce até a traseira */
    expect(m.perfilLateral[0][0]).toBeGreaterThan(1900); expect(m.perfilLateral.at(-1)[0]).toBeLessThan(-1900);
    expect(Math.max(...m.perfilLateral.map(([, y]) => y))).toBe(1500);
    expect(m.planta.every(([, x]) => x === 900)).toBe(true);
    expect(m.secaoFrontal.at(-1)[1]).toBeGreaterThan(1400);
    expect(m.faceDaFrente.length).toBeGreaterThan(1);
    expect(m.unidade).toBe('mm');
  });

  it('mede as rodas pelas malhas de roda nomeadas e, sem elas, avisa que mediu pelos vales', () => {
    const comRodas = { ...fonte, partes: [...fonte.partes, { nome: 'wheel-front-left', minimo: [0.7, 0, 1.0], maximo: [0.9, 0.4, 1.8], triangulos: 12 }] };
    const r = medidasDaFonte(comRodas).rodas;
    expect(r).toEqual([{ nome: 'wheel-front-left', centro: [800, 200, 1400], raio: 200, largura: 200, xDe: 700, xAte: 900 }]);
    expect(medidasDaFonte(fonte).avisos.join(' ')).toMatch(/vale/);
  });

  it('gera um trecho de receita que o núcleo executa', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'mf2-'));
    try {
      const arq = join(pasta, 'trecho.mjs');
      writeFileSync(arq, codigoDeReceita(medidasDaFonte(fonte), 'fixture'));
      const mod = await import(pathToFileURL(arq).href);
      const { neutro } = executarReceita({ meta: { nome: 't' }, PARAMS: {}, MATERIAIS: {}, TOPO: {}, ALIASES: [], PASSOS: mod.passosDasVistas(100) });
      const vs = [...neutro.V.values()];
      const ext = (i) => [Math.min(...vs.map((p) => p[i])), Math.max(...vs.map((p) => p[i]))];
      /* a interseção dos dois prismas não entra aqui; cada prisma sozinho cobre a caixa da fonte (com a folga de 50 mm) */
      expect(ext(1)[0]).toBeCloseTo(0, 6); expect(ext(1)[1]).toBeCloseTo(1.5, 2);
      expect(ext(2)[1]).toBeGreaterThanOrEqual(1.95);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });

  it('na linha de comando: escreve o JSON e o código, e recusa fonte sem frente', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'mf-'));
    try {
      writeFileSync(join(pasta, 'fonte-partes.json'), JSON.stringify(fonte));
      const r = spawnSync('node', [join(AQUI, 'medidas-da-fonte.mjs'), join(pasta, 'fonte-partes.json'), '--json', join(pasta, 'm.json'), '--codigo', join(pasta, 'm.js')], { cwd: REPO, encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(JSON.parse(readFileSync(join(pasta, 'm.json'), 'utf8')).caixa.xMeia).toBe(900);
      expect(readFileSync(join(pasta, 'm.js'), 'utf8')).toMatch(/export const TABELA/);
      writeFileSync(join(pasta, 'sem.json'), JSON.stringify(fonteDeReceita(receitaBase, { semFrente: true })));
      const s = spawnSync('node', [join(AQUI, 'medidas-da-fonte.mjs'), join(pasta, 'sem.json')], { cwd: REPO, encoding: 'utf8' });
      expect(s.status).toBe(2); expect(s.stderr).toMatch(/não registra a frente/);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});
