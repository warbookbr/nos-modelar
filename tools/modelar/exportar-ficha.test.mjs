/* exportar-ficha.test.mjs — LENTO (está em `TESTES_LENTOS`: resolve o braço inteiro duas vezes, uns 60 s). Plano da ponte com a
   mecatrônica, gate 2: a ficha do braço exportada duas vezes sai igual byte a byte, com a malha, passa na cópia do esquema, e a
   malha tem um nó por peça com o identificador da ficha. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { lerGlb } from '../../modulos/exportador-gltf/src/index.js';
import { conferirDocumento } from '../../modulos/ficha-do-objeto/src/index.js';
import pedidoDaPlaca from '../../procedural/pecas/braco-robotico/partes/base/placa.pedido.json' with { type: 'json' };
import { exportarFicha, parseArgs } from './exportar-ficha.mjs';

const pasta = mkdtempSync(join(tmpdir(), 'ficha-braco-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

describe('exportar:ficha', () => {
  it('lê as opções com = e recusa a desconhecida', () => {
    expect(parseArgs(['braco-robotico', '--saida=x'])).toMatchObject({ objeto: 'braco-robotico', saida: 'x' });
    expect(parseArgs(['--ajuda']).ajuda).toBe(true);
    expect(() => parseArgs(['--outra'])).toThrow(/opção desconhecida/);
  });

  it('a ficha do braço sai igual em duas exportações, passa no esquema, e a malha tem um nó por peça e as portas da placa fecham o pedido de ligações', async () => {
    const a = await exportarFicha({ objeto: 'braco-robotico', saida: join(pasta, 'a') });
    const b = await exportarFicha({ objeto: 'braco-robotico', saida: join(pasta, 'b') });
    expect(readFileSync(a.caminhoFicha).equals(readFileSync(b.caminhoFicha))).toBe(true);
    expect(readFileSync(a.caminhoMalha).equals(readFileSync(b.caminhoMalha))).toBe(true);
    const ficha = JSON.parse(readFileSync(a.caminhoFicha, 'utf8'));
    expect(conferirDocumento(ficha).erros).toEqual([]);
    /* as 12 instâncias e as 27 peças da placa de controle (a placa e os componentes), no conjunto da base */
    expect(ficha.pecas).toHaveLength(39);
    expect(ficha.pecas.filter((p) => p.familia === 'componente-eletronico').every((p) => p.conjunto === 'base')).toBe(true);
    expect(a.semTipo).toHaveLength(22);
    expect(ficha.portas.filter((p) => p.peca === 'a1').map((p) => p.tipo)).toContain('fase-de-motor');
    expect(ficha.portas.find((p) => p.peca === 'r1')).toMatchObject({ tipo: 'passivo', tensao: { ausente: true } });
    /* toda peça tem massa estimada pela malha e pela densidade da ponte, e cada conjunto soma as peças dele */
    expect(ficha.pecas.every((p) => p.massa.origem === 'estimativa' && p.inercia.valor.ixx > 0)).toBe(true);
    for (const c of ficha.conjuntos) {
      const soma = ficha.pecas.filter((p) => p.conjunto === c.id).reduce((s, p) => s + p.massa.valor, 0);
      expect(c.massa.valor, c.id).toBeCloseTo(soma, 3);
    }
    expect(ficha.pecas.find((p) => p.id === 'anel-cintura').massa.nota).toMatch(/aluminio/);
    /* o pedido de ligações da placa (47 redes) cita só portas que a ficha tem */
    expect(conferirDocumento(pedidoDaPlaca, { ficha }).erros).toEqual([]);
    expect(ficha.juntas.map((j) => j.id)).toEqual(['cintura', 'ombro', 'cotovelo', 'punho-4', 'punho-5', 'punho-6']);
    expect(ficha.juntas[0].eixo.valor).toEqual({ ponto: [0, 220, 0], direcao: [0, 1, 0] });
    const { json } = lerGlb(readFileSync(a.caminhoMalha));
    expect(json.nodes.map((n) => n.name).sort()).toEqual(ficha.pecas.map((p) => p.id).sort());
  }, 240_000);

  it('recusa o objeto sem montagem dizendo onde procurou', async () => {
    await expect(exportarFicha({ objeto: 'nao-existe' })).rejects.toThrow(/não tem montagem\.json em procedural\/pecas\/nao-existe/);
  });
});
