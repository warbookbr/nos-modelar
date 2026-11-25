/* exportacao.test.mjs — o gate 4 do plano da tubulação: a rede de prova sai abaixo de dez segundos e em STEP facetado e em
 * OBJ pelos exportadores do projeto, com as partes nomeadas (cada tubo, conexão, flange e válvula pelo nome da rede). */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarArquivoObj } from '../../modelar/exportar-obj.mjs';
import { receitaDaRede } from './rede.mjs';
import { REDE_DE_PROVA } from './tracados.mjs';

const registro = criarRegistroDeFamilias();
const TOLERANCIA = 0.00001;

describe('exportação da rede de prova', () => {
  const { receita, rede } = receitaDaRede(REDE_DE_PROVA);
  const inicio = performance.now();
  const neutro = executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
  const segundos = (performance.now() - inicio) / 1000;
  const partes = [...new Set([...neutro.F.values()].map((f) => f.parte))];

  it('monta abaixo de dez segundos, com uma parte nomeada por peça', () => {
    expect(segundos).toBeLessThan(10);
    expect(partes).toHaveLength(rede.pecas.length);
    for (const p of rede.pecas) expect(partes.some((n) => n.startsWith(p.nome)), p.nome).toBe(true);
  });

  it('sai em STEP e em OBJ com os nomes das partes', async () => {
    const step = await exportarCad({ neutro, nome: 'rede-de-prova', formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: TOLERANCIA });
    const texto = new TextDecoder().decode(step.bytes);
    for (const parte of partes) expect(texto, parte).toContain(parte);
    await expect(exportarArquivoObj({ carregada: { receita, nome: 'rede-de-prova', neutro }, somenteValidar: true, tolerancia: TOLERANCIA })).resolves.toBeDefined();
  });
});
