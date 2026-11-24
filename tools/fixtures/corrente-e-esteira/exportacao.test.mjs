/* exportacao.test.mjs — o gate 4 do plano de corrente e esteira: a transmissão por corrente de prova e a esteira de prova
 * saem abaixo de dez segundos e em STEP facetado e em OBJ, com as partes nomeadas. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarArquivoObj } from '../../modelar/exportar-obj.mjs';
import { parametrosDaEsteira } from '../../../procedural/familias/esteira/tabela.js';
import { receitaDaTransmissao } from './transmissao.mjs';

const registro = criarRegistroDeFamilias();
const TOLERANCIA = 0.00001;
const ESTEIRA = registro.obter('esteira');
const provas = {
  'transmissao-por-corrente': receitaDaTransmissao().receita,
  'esteira-135': { meta: { nome: 'esteira-135' }, get CHAMADAS_COMPOSICOES() { return [chamar(ESTEIRA, 'e', parametrosDaEsteira(135, { distancia: 2200, roletes: 4 }))]; } },
};

describe('exportação das provas de corrente e esteira', () => {
  for (const [nome, receita] of Object.entries(provas)) {
    it(`${nome} sai abaixo de dez segundos, em STEP e em OBJ, com as partes nomeadas`, async () => {
      const inicio = performance.now();
      const neutro = executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
      expect((performance.now() - inicio) / 1000).toBeLessThan(10);
      const partes = [...new Set([...neutro.F.values()].map((f) => f.parte))];
      const step = await exportarCad({ neutro, nome, formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: TOLERANCIA });
      const texto = new TextDecoder().decode(step.bytes);
      for (const parte of partes) expect(texto, parte).toContain(parte);
      await expect(exportarArquivoObj({ carregada: { receita, nome, neutro }, somenteValidar: true, tolerancia: TOLERANCIA })).resolves.toBeDefined();
    });
  }
});
