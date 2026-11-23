/* conferir-pedido.test.mjs — LENTO (está em `TESTES_LENTOS`: exporta a ficha do braço inteiro duas vezes, uns 70 s). Plano da ponte
   com a mecatrônica, gate 4: o pedido de prova do banco de provas é respondido item a item, com o motivo de cada não cumprido, e o
   pedido que cita peça inexistente é recusado sem resposta. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { conferirPedido, parseArgs } from './conferir-pedido.mjs';
import { REPO } from './exportar-gltf.mjs';

const BANCO = join(REPO, 'docs/modelar/banco-de-provas/ponte-mecatronica-2026-11-23');
const pasta = mkdtempSync(join(tmpdir(), 'pedido-braco-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

describe('conferir:pedido', () => {
  it('lê as opções com = e recusa a desconhecida', () => {
    expect(parseArgs(['p.json', '--escrever', '--objeto=braco-robotico'])).toMatchObject({ pedido: 'p.json', escrever: true, objeto: 'braco-robotico' });
    expect(() => parseArgs(['--outra'])).toThrow(/opção desconhecida/);
  });

  it('responde o pedido de prova do braço item a item e grava a resposta', async () => {
    const saida = join(pasta, 'respondido.json');
    const r = await conferirPedido({ pedido: join(BANCO, 'pedido-de-prova.json'), saida, pastaDaFicha: join(pasta, 'ficha') });
    expect(Object.fromEntries(r.itens.map((i) => [i.id, i.estado]))).toEqual({
      'espaco-sensor-na-caixa': 'cumprido',
      'espaco-bateria-no-corpo': 'nao-cumprido',
      'posicao-driver-1': 'cumprido',
      'posicao-microcontrolador': 'nao-cumprido',
      'saida-de-ar-caixa': 'nao-cumprido',
      'passagem-motor-ombro': 'nao-cumprido',
      'ligacoes-placa': 'cumprido',
    });
    expect(r.itens.find((i) => i.id === 'espaco-bateria-no-corpo').motivo).toMatch(/dentro de um sólido/);
    const gravado = JSON.parse(readFileSync(saida, 'utf8'));
    expect(gravado.itens.every((i) => i.resposta)).toBe(true);
    expect(gravado.itens[0].resposta).toEqual({ estado: 'cumprido', revisaoDaFicha: 1 });
  }, 240_000);

  it('recusa o pedido que cita peça que a ficha não tem, sem resposta', async () => {
    const r = await conferirPedido({ pedido: join(BANCO, 'pedido-recusado.json'), pastaDaFicha: join(pasta, 'ficha-2') });
    expect(r.recusa).toMatch(/\$\.itens\[0\]\.alvo cita uma peça que não existe na ficha \(recebido: "motor-ombro"\)/);
  }, 240_000);
});
