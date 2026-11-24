/* mesa-linear.test.mjs — o gate de saída do plano de elementos de máquina: a mesa linear de prova sai com as quatro
 * famílias (perfil, guia, rolamento no mancal e fuso) sem órfão, cada encaixe com contato medido e declarado, nada
 * atravessado, abaixo de dez segundos, e exportável em STEP e OBJ com as partes nomeadas. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { exportarCad } from '../../../modulos/exportador-cad/src/index.js';
import { exportarArquivoObj } from '../../modelar/exportar-obj.mjs';
import { receitaDaMesa } from './mesa-linear.mjs';

const registro = criarRegistroDeFamilias();
const TOLERANCIA = 0.00001;

describe('mesa linear de prova', () => {
  const { receita } = receitaDaMesa();
  const inicio = performance.now();
  const neutro = executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
  const segundos = (performance.now() - inicio) / 1000;
  const partes = [...new Set([...neutro.F.values()].map((f) => f.parte))];

  it('monta sem órfão, abaixo de dez segundos, com as peças das quatro famílias', () => {
    expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect(segundos).toBeLessThan(10);
    for (const p of ['perfilAPerfil', 'guiaATrilho', 'guiaACarro', 'mancalAMancal', 'mancalAAnelExterno', 'fusoFuso', 'fusoCastanha', 'mesa', 'suporte']) expect(partes).toContain(p);
  });

  it('cada encaixe tem contato medido e declarado, e nada atravessa', () => {
    const c = contatosDaPeca(neutro, receita);
    expect(c.naoDeclarados).toEqual([]);
    expect(c.declaradosSemContato).toEqual([]);
    expect(c.atravessados).toEqual([]);
    expect(c.paresEmContato).toHaveLength(receita.contatos.length);
  });

  it('sai em STEP e em OBJ com os nomes das partes', async () => {
    const step = await exportarCad({ neutro, nome: 'mesa-linear', formato: 'step', estrategia: 'facetada', unidade: 'mm', escala: 1000, tolerancia: TOLERANCIA });
    const texto = new TextDecoder().decode(step.bytes);
    for (const parte of partes) expect(texto, parte).toContain(parte);
    await expect(exportarArquivoObj({ carregada: { receita, nome: 'mesa-linear', neutro }, somenteValidar: true, tolerancia: TOLERANCIA })).resolves.toBeDefined();
  });
});
