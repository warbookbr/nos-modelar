/* exportar-ficha.test.mjs — LENTO (está em `TESTES_LENTOS`: resolve o braço inteiro duas vezes, uns 60 s). Plano da ponte com a
   mecatrônica, gate 2: a ficha do braço exportada duas vezes sai igual byte a byte, com a malha, passa na cópia do esquema, e a
   malha tem um nó por peça com o identificador da ficha. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { lerGlb } from '../../modulos/exportador-gltf/src/index.js';
import { conferirDocumento } from '../../modulos/ficha-do-objeto/src/index.js';
import { exportarFicha, parseArgs } from './exportar-ficha.mjs';

const pasta = mkdtempSync(join(tmpdir(), 'ficha-braco-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

describe('exportar:ficha', () => {
  it('lê as opções com = e recusa a desconhecida', () => {
    expect(parseArgs(['braco-robotico', '--saida=x'])).toMatchObject({ objeto: 'braco-robotico', saida: 'x' });
    expect(parseArgs(['--ajuda']).ajuda).toBe(true);
    expect(() => parseArgs(['--outra'])).toThrow(/opção desconhecida/);
  });

  it('a ficha do braço sai igual em duas exportações, passa no esquema e a malha tem um nó por peça', async () => {
    const a = await exportarFicha({ objeto: 'braco-robotico', saida: join(pasta, 'a') });
    const b = await exportarFicha({ objeto: 'braco-robotico', saida: join(pasta, 'b') });
    expect(readFileSync(a.caminhoFicha).equals(readFileSync(b.caminhoFicha))).toBe(true);
    expect(readFileSync(a.caminhoMalha).equals(readFileSync(b.caminhoMalha))).toBe(true);
    const ficha = JSON.parse(readFileSync(a.caminhoFicha, 'utf8'));
    expect(conferirDocumento(ficha).erros).toEqual([]);
    expect(ficha.pecas).toHaveLength(12);
    expect(ficha.juntas.map((j) => j.id)).toEqual(['cintura', 'ombro', 'cotovelo', 'punho-4', 'punho-5', 'punho-6']);
    expect(ficha.juntas[0].eixo.valor).toEqual({ ponto: [0, 220, 0], direcao: [0, 1, 0] });
    const { json } = lerGlb(readFileSync(a.caminhoMalha));
    expect(json.nodes.map((n) => n.name).sort()).toEqual(ficha.pecas.map((p) => p.id).sort());
  }, 240_000);

  it('recusa o objeto sem montagem dizendo onde procurou', async () => {
    await expect(exportarFicha({ objeto: 'nao-existe' })).rejects.toThrow(/não tem montagem\.json em procedural\/pecas\/nao-existe/);
  });
});
