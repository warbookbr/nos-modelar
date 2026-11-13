/* guarda-local.test.mjs — a bateria local roda a guarda do acervo só das peças que o envio mudou. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerDuracoesDaGuarda, pecasMudadas, rodarGuardaLocal } from './guarda-local.mjs';

const PECAS = ['x', 'y', 'braco-robotico/ombro', 'furgao'];

describe('peças que o envio mudou', () => {
  it('arquivo mudado em procedural/pecas/x/ seleciona a peça x', () => {
    expect(pecasMudadas(['procedural/pecas/x/receita.js'], PECAS)).toEqual(['x']);
    expect(pecasMudadas(['procedural/pecas/x/referencias/a.txt', 'procedural/pecas/y/receita.js'], PECAS)).toEqual(['x', 'y']);
  });

  it('arquivo dentro de partes/ seleciona a parte pelo nome curto', () => {
    expect(pecasMudadas(['procedural/pecas/braco-robotico/partes/ombro/receita.js'], PECAS)).toEqual(['braco-robotico/ombro']);
  });

  it('nenhum arquivo de peça mudado não seleciona nada', () => {
    expect(pecasMudadas(['docs/modelar/INDEX.md', 'tools/gates.mjs', 'src/x.js'], PECAS)).toEqual([]);
    expect(pecasMudadas([], PECAS)).toEqual([]);
  });

  it('pasta sem peça no acervo (apagada) não seleciona nada, e nome que só começa igual não conta', () => {
    expect(pecasMudadas(['procedural/pecas/z/receita.js', 'procedural/pecas/furgao-realista/receita.js'], PECAS)).toEqual([]);
  });
});

describe('rodada local da guarda', () => {
  const raiz = () => mkdtempSync(join(tmpdir(), 'guarda-local-'));

  it('aprova, reprova e guarda a duração de cada peça', async () => {
    const r = raiz();
    const resultado = await rodarGuardaLocal(['x', 'y'], { raiz: r, executar: async (p) => ({ codigo: p === 'y' ? 1 : 0, saida: `saida ${p}`, estourou: false }) });
    expect(resultado.medidas).toEqual(['x']);
    expect(resultado.reprovadas).toEqual(['y']);
    expect(resultado.codigo).toBe(1);
    expect(Object.keys(lerDuracoesDaGuarda(r)).sort()).toEqual(['x', 'y']);
    rmSync(r, { recursive: true, force: true });
  });

  it('a peça que estoura o limite fica para o CI com aviso e não reprova; na rodada seguinte nem começa', async () => {
    const r = raiz();
    const chamadas = [];
    const executar = async (p) => { chamadas.push(p); return { codigo: 1, saida: '', estourou: true }; };
    const primeira = await rodarGuardaLocal(['furgao'], { raiz: r, executar });
    expect(primeira.codigo).toBe(0);
    expect(primeira.paraOCi).toEqual(['furgao']);
    expect(primeira.saida).toMatch(/fica para o CI/);
    await rodarGuardaLocal(['furgao'], { raiz: r, executar });
    expect(chamadas).toEqual(['furgao']);
    rmSync(r, { recursive: true, force: true });
  });
});
