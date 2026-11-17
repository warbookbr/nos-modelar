/* etapas-de-construcao.test.mjs — fatia 3 do plano "a peça nasce encaixada":
   as juntas medidas em cada etapa e a próxima etapa a trabalhar. Provado na fixture neutra dos três blocos. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import {
  ErroEtapaDeConstrucao, juntasPorEtapa, lerAutorDaReabertura, proximaEtapa,
} from '../../src/autoria/etapas-de-construcao.js';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

const montagem = () => JSON.parse(readFileSync(new URL('../fixtures/tres-blocos-vinculados/montagens/tres-blocos.json', import.meta.url), 'utf8'));

async function medir(dado = montagem()) {
  const resolvida = await resolverMontagemPersistida(dado, carregadoresDeReceitas(RECEITAS));
  /* a etapa só se fixa com geometria: a forma de cada uma vem da leitura, aqui um rótulo estável */
  return juntasPorEtapa(resolvida, lerMontagemPersistida(dado).etapas).map((m) => ({ ...m, forma: `forma-${m.instancia}` }));
}

function recusa(fn, codigo) {
  let erro;
  try { fn(); } catch (capturado) { erro = capturado; }
  expect(erro).toBeInstanceOf(ErroEtapaDeConstrucao);
  expect(erro.codigo).toBe(codigo);
}

describe('registro de etapas', () => {
  it('cada junta pertence à etapa em que a segunda parte entra', async () => {
    const medidas = await medir();
    expect(medidas.map(({ instancia, juntas }) => [instancia, juntas.map((j) => `${j.relacao}:${j.com}:${j.satisfeita}`)])).toEqual([
      ['base', []],
      ['meio', ['meioNoPinoDaBase:base:true']],
      ['topo', ['topoNoPinoDoMeio:meio:true']],
    ]);
  });

  it('a próxima etapa é a primeira que não está fixa, e a quebrada vem antes da aberta', () => {
    expect(proximaEtapa({ etapas: [{ instancia: 'a', estado: 'fixa' }, { instancia: 'b', estado: 'quebrada' }, { instancia: 'c', estado: 'aberta' }] }).instancia).toBe('b');
    expect(proximaEtapa({ etapas: [{ instancia: 'a', estado: 'fixa' }] })).toBeNull();
  });

  it('lê "<quem, data: motivo>" e recusa o que não tem data', () => {
    expect(lerAutorDaReabertura('Ana, 2026-11-17: porque sim')).toEqual({ por: 'Ana', quando: '2026-11-17', motivo: 'porque sim' });
    recusa(() => lerAutorDaReabertura('Ana: sem data'), 'reabertura-sem-autor');
  });

  it('recusa montagem sem etapas', () => {
    recusa(() => juntasPorEtapa({ relacoes: [] }, undefined), 'etapas-ausentes');
  });
});
