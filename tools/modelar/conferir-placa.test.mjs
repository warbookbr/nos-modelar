/* conferir-placa.test.mjs — o comando que confere o cobre de uma placa declarada e desenha o mapa das redes. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AJUDA, conferirPlaca } from './conferir-placa.mjs';

const PASTA = 'procedural/familias/componente-eletronico';
const entrada = { placa: `${PASTA}/placa-de-prova.js#PLACA_DE_PROVA`, tracado: `${PASTA}/cobre/placa-de-prova.tracado.json`, pedido: `${PASTA}/cobre/placa-de-prova.pedido.json` };

describe('conferir-placa', () => {
  it('confere só as redes traçadas sem violação e grava o mapa das duas faces', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'mapa-'));
    const r = await conferirPlaca({ ...entrada, mapa: pasta, soTracadas: true });
    expect(r.violacoes).toEqual([]);
    expect(r.redes.map((x) => x.id)).toEqual(['led-verde', 'led-vermelho', 'sinal-1']);
    for (const face of ['cima', 'baixo']) expect(readFileSync(join(pasta, `mapa-${face}.svg`), 'utf8')).toMatch(/^<svg[\s\S]*led-verde[\s\S]*<\/svg>/);
  });

  it('com a lista inteira, acusa as redes ainda sem traçado como abertas', async () => {
    const r = await conferirPlaca(entrada);
    expect(r.violacoes.filter((v) => v.regra === 'rede-aberta').map((v) => v.rede).sort()).toEqual(['sinal-2', 'sinal-entre-faces', 'terra', 'vcc', 'vin']);
  });

  it('responde à ajuda com as opções', () => {
    expect(AJUDA).toMatch(/--placa=.*--tracado=.*--pedido=/s);
  });
});
