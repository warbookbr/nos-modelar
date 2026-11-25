/* exportacao.test.mjs — o gate 4 do plano do atuador de junta: a montagem de prova de duas juntas sai abaixo de dez
 * segundos, e cada peça dela e o servo médio saem em STEP facetado e em OBJ, com as partes nomeadas. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarArquivoObj } from '../../modelar/exportar-obj.mjs';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { parametrosDoServo } from '../../../procedural/familias/atuador-de-junta/servo.js';
import { montarDuasJuntas } from './duas-juntas.mjs';

const registro = criarRegistroDeFamilias();
const F = registro.obter('atuador-de-junta');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const TOLERANCIA = 0.00001;

async function exporta(nome, receita, neutro) {
  const partes = [...new Set([...neutro.F.values()].map((f) => f.parte))];
  expect(partes.length).toBeGreaterThan(0);
  const step = await exportarCad({ neutro, nome, formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: TOLERANCIA });
  const texto = new TextDecoder().decode(step.bytes);
  for (const parte of partes) expect(texto, parte).toContain(parte);
  await expect(exportarArquivoObj({ carregada: { receita, nome, neutro }, somenteValidar: true, tolerancia: TOLERANCIA })).resolves.toBeDefined();
}

describe('exportação das provas do atuador de junta', () => {
  it('a montagem de duas juntas sai abaixo de dez segundos, e cada peça em STEP e em OBJ', async () => {
    const gerada = montarDuasJuntas(F);
    const inicio = performance.now();
    const { problemas, resolvida } = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao);
    expect((performance.now() - inicio) / 1000).toBeLessThan(10);
    expect(problemas).toEqual([]);
    for (const instancia of resolvida.instancias) await exporta(instancia.id, gerada.receitas[instancia.alvo.ref], instancia.definicao.neutro);
  });

  it('o servo médio sai em STEP e em OBJ com a caixa e o horn nomeados', async () => {
    const receita = { meta: { nome: 'servo-medio' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 's', parametrosDoServo('medio'))]; } };
    const neutro = executarReceita(receita, execucao).neutro;
    await exporta('servo-medio', receita, neutro);
  });
});
