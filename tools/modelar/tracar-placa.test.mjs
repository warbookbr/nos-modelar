/* tracar-placa.test.mjs — o traçador automático na placa de prova: fecha as oito redes do exemplo sem violação, grava o mesmo
 * arquivo em duas rodadas, mantém os trechos declarados de --base, e a placa com o traçado executa sem órfão e recusa o traçado
 * cuja chave não é a das entradas de agora. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AJUDA, tracarPlaca } from './tracar-placa.mjs';
import { placaDeclarada } from '../../procedural/familias/componente-eletronico/placa.js';
import { PLACA_DE_PROVA, MATERIAIS } from '../../procedural/familias/componente-eletronico/placa-de-prova.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';

const PASTA = 'procedural/familias/componente-eletronico';
const entrada = { placa: `${PASTA}/placa-de-prova.js#PLACA_DE_PROVA`, pedido: `${PASTA}/cobre/placa-de-prova.pedido.json` };
const redes = JSON.parse(readFileSync(`${PASTA}/cobre/placa-de-prova.pedido.json`, 'utf8')).itens[0].redes;

describe('tracar-placa', () => {
  it('fecha as oito redes da placa de prova sem violação e grava o mesmo traçado em duas rodadas', async () => {
    const a = await tracarPlaca(entrada); const b = await tracarPlaca(entrada);
    expect(a.relatorio.naoTracadas).toEqual([]);
    expect(a.relatorio.tracadas).toBe(8);
    expect(a.relatorio.conferencia.violacoes).toEqual([]);
    expect(JSON.stringify(a.tracado)).toBe(JSON.stringify(b.tracado));
    expect(a.tracado.chave).toMatch(/^[0-9a-f]{64}$/);
  });

  it('o traçado salvo é o que o traçador escreve hoje', async () => {
    const { tracado } = await tracarPlaca(entrada);
    expect(`${JSON.stringify(tracado, null, 2)}\n`).toBe(readFileSync(`${PASTA}/cobre/placa-de-prova.tracado-automatico.json`, 'utf8'));
  });

  it('mantém os trechos declarados de --base e traça só o resto', async () => {
    const { tracado, relatorio } = await tracarPlaca({ ...entrada, base: `${PASTA}/cobre/placa-de-prova.tracado.json` });
    expect(relatorio.conferencia.violacoes).toEqual([]);
    const origens = Object.fromEntries(tracado.redes.map((r) => [r.id, [...new Set(r.trechos.map((t) => t.origem))]]));
    expect(origens['led-verde']).toEqual(['declarado']);
    expect(origens['sinal-1']).toEqual(['declarado']);
    expect(origens.vin).toEqual(['tracado']);
  });

  it('a placa com o traçado executa sem órfão, e recusa o traçado depois de um componente se mover', () => {
    const tracado = JSON.parse(readFileSync(`${PASTA}/cobre/placa-de-prova.tracado-automatico.json`, 'utf8'));
    const g = placaDeclarada({ ...PLACA_DE_PROVA, cobre: { tracado, redes } });
    const { neutro } = executarReceita({ meta: { nome: 'prova-tracada' }, MATERIAIS, PASSOS: g.passos });
    expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    const movida = { ...PLACA_DE_PROVA, pecas: PLACA_DE_PROVA.pecas.map((p) => (p.id === 'r1' ? { ...p, posicao: [-5, 9] } : p)) };
    expect(() => placaDeclarada({ ...movida, cobre: { tracado, redes } })).toThrow(/placa\.cobre\.tracado\.chave.*trace de novo/);
  });

  it('responde à ajuda com as opções', () => {
    expect(AJUDA).toMatch(/--placa=.*--pedido=.*--saida=/s);
  });
});
