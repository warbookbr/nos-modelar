/* etapas-de-construcao.test.mjs — fatia 3 do plano "a peça nasce encaixada":
   o registro de etapas, a junta medida quando a parte entra e a recusa de
   seguir com junta reprovada. Provado na fixture neutra dos três blocos. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import {
  ErroEtapaDeConstrucao, atualizarRegistro, fixarEtapa, juntasPorEtapa, proximaEtapa,
} from '../../src/autoria/etapas-de-construcao.js';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

const montagem = () => JSON.parse(readFileSync(new URL('../fixtures/tres-blocos-vinculados/montagens/tres-blocos.json', import.meta.url), 'utf8'));

async function medir(dado = montagem()) {
  const resolvida = await resolverMontagemPersistida(dado, carregadoresDeReceitas(RECEITAS));
  return juntasPorEtapa(resolvida, lerMontagemPersistida(dado).etapas);
}

function recusa(fn, codigo) {
  let erro;
  try { fn(); } catch (capturado) { erro = capturado; }
  expect(erro).toBeInstanceOf(ErroEtapaDeConstrucao);
  expect(erro.codigo).toBe(codigo);
}

const aceite = { por: 'pessoa', observacao: 'encaixe conferido nas vistas' };

describe('registro de etapas', () => {
  it('cada junta pertence à etapa em que a segunda parte entra', async () => {
    const medidas = await medir();
    expect(medidas.map(({ instancia, juntas }) => [instancia, juntas.map((j) => `${j.relacao}:${j.com}:${j.satisfeita}`)])).toEqual([
      ['base', []],
      ['meio', ['meioNoPinoDaBase:base:true']],
      ['topo', ['topoNoPinoDoMeio:meio:true']],
    ]);
  });

  it('fixa em ordem, com aceite, e aponta a próxima etapa', async () => {
    let registro = atualizarRegistro('tres-blocos', await medir());
    expect(proximaEtapa(registro).instancia).toBe('base');
    recusa(() => fixarEtapa(registro, 'meio', aceite), 'etapa-fora-de-ordem');
    recusa(() => fixarEtapa(registro, 'base', {}), 'etapa-sem-aceite');
    registro = fixarEtapa(registro, 'base', aceite);
    registro = fixarEtapa(registro, 'meio', aceite);
    expect(proximaEtapa(registro).instancia).toBe('topo');
    registro = fixarEtapa(registro, 'topo', { por: 'pessoa' });
    expect(proximaEtapa(registro)).toBeNull();
    expect(registro.etapas[1].aceite).toEqual(aceite);
  });

  it('recusa fixar etapa com junta reprovada', async () => {
    const dado = montagem();
    dado.vinculos.find((v) => v.id === 'furoDoMeioNoPinoDaBase').acrescimo = 1;
    let registro = atualizarRegistro('tres-blocos', await medir(dado));
    registro = fixarEtapa(registro, 'base', aceite);
    recusa(() => fixarEtapa(registro, 'meio', aceite), 'etapa-com-junta-reprovada');
  });

  it('uma mudança posterior quebra a etapa fixa, e ela passa na frente de tudo', async () => {
    let registro = atualizarRegistro('tres-blocos', await medir());
    for (const id of ['base', 'meio', 'topo']) registro = fixarEtapa(registro, id, aceite);
    const dado = montagem();
    dado.vinculos.find((v) => v.id === 'furoDoTopoNoPinoDoMeio').acrescimo = 1;
    registro = atualizarRegistro('tres-blocos', await medir(dado), registro);
    expect(registro.etapas.map((e) => e.estado)).toEqual(['fixa', 'fixa', 'quebrada']);
    expect(proximaEtapa(registro).instancia).toBe('topo');
    const consertado = atualizarRegistro('tres-blocos', await medir(), registro);
    expect(consertado.etapas[2]).toMatchObject({ estado: 'aberta' });
    expect(consertado.etapas[2]).not.toHaveProperty('aceite');
  });

  it('recusa montagem sem etapas', () => {
    recusa(() => juntasPorEtapa({ relacoes: [] }, undefined), 'etapas-ausentes');
  });
});
