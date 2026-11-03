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

describe('forma que muda depois do aceite', () => {
  const medidas = (forma, textoDaReceita) => [{ instancia: 'base', juntas: [], forma, textoDaReceita }];
  const fixo = () => fixarEtapa(atualizarRegistro('m', medidas('forma-a', 'texto-1')), 'base', { por: 'pessoa', observacao: 'ok' });

  it('o texto da receita mudar sem a forma mudar não quebra a etapa', () => {
    const lido = atualizarRegistro('m', medidas('forma-a', 'texto-2'), fixo());
    expect(lido.etapas[0]).toMatchObject({ estado: 'fixa', forma: 'forma-a', aceite: { por: 'pessoa' } });
    expect(lido.etapas[0]).not.toHaveProperty('reaberturas');
  });

  it('a forma mudar quebra a etapa, e o aceite fica em reaberturas pelas leituras seguintes', () => {
    const quebrada = atualizarRegistro('m', medidas('forma-b', 'texto-2'), fixo());
    expect(quebrada.etapas[0]).toMatchObject({ estado: 'quebrada', motivo: 'a receita mudou depois do aceite' });
    expect(quebrada.etapas[0]).not.toHaveProperty('aceite');
    const guardado = { motivo: 'a receita mudou depois do aceite', forma: 'forma-a', aceite: { por: 'pessoa', observacao: 'ok' } };
    expect(quebrada.etapas[0].reaberturas).toEqual([expect.objectContaining(guardado)]);
    /* Na leitura seguinte ela reabre, e o aceite continua no histórico. */
    const aberta = atualizarRegistro('m', medidas('forma-b', 'texto-2'), quebrada);
    expect(aberta.etapas[0]).toMatchObject({ estado: 'aberta', forma: 'forma-b' });
    expect(aberta.etapas[0].reaberturas).toEqual([expect.objectContaining(guardado)]);
    const outra = atualizarRegistro('m', medidas('forma-b', 'texto-2'), aberta);
    expect(outra.etapas[0].reaberturas).toHaveLength(1);
  });

  it('a junta que deixa de passar também guarda o aceite', async () => {
    let registro = atualizarRegistro('tres-blocos', await medir());
    for (const id of ['base', 'meio', 'topo']) registro = fixarEtapa(registro, id, aceite);
    const dado = montagem();
    dado.vinculos.find((v) => v.id === 'furoDoTopoNoPinoDoMeio').acrescimo = 1;
    const quebrada = atualizarRegistro('tres-blocos', await medir(dado), registro);
    const relida = atualizarRegistro('tres-blocos', await medir(dado), quebrada);
    const reabertas = relida.etapas[2].reaberturas;
    expect(reabertas).toEqual([expect.objectContaining({ motivo: 'uma junta deixou de passar depois do aceite', aceite })]);
  });

  it('lê o registro v1: texto igual adota a forma de agora, texto diferente quebra guardando o aceite', () => {
    const v1 = { formato: 'mecanifica.registro-de-etapas', versao: 1, montagem: 'm', etapas: [
      { instancia: 'base', estado: 'fixa', juntas: [], aceite: { por: 'pessoa' }, receita: 'texto-1' },
    ] };
    const igual = atualizarRegistro('m', medidas('forma-a', 'texto-1'), v1);
    expect(igual.etapas[0]).toMatchObject({ estado: 'fixa', forma: 'forma-a', aceite: { por: 'pessoa' } });
    expect(igual.etapas[0]).not.toHaveProperty('receita');
    const mudou = atualizarRegistro('m', medidas('forma-a', 'texto-2'), v1);
    expect(mudou.etapas[0]).toMatchObject({ estado: 'quebrada' });
    expect(mudou.etapas[0].reaberturas[0]).toMatchObject({ aceite: { por: 'pessoa' }, receita: 'texto-1' });
  });
});
