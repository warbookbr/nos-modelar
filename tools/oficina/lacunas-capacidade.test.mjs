/* lacunas-capacidade.test.mjs — R08: diagnóstico persistível e busca estrutural. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FORMATO_CATALOGO, FORMATO_LACUNA_CAPACIDADE, classificarLacunaCapacidade,
  criarLacunaCapacidade, planejarCapacidades, schemaDaLacunaCapacidade,
} from '../../prototipos/procedural/v3/motor/oficina.js';

const operacao = (id, entra, sai, interfaces = { entra: [], sai: [] }, requisitos = []) => ({ id, nome: id.split('.').at(-1), versao: '1.0.0', categoria: 'prova', artefatos: { entra, sai }, interfaces, requisitos, efeitos: [], identidade: 'prova' });
const catalogo = {
  formato: FORMATO_CATALOGO, assinatura: 'prova-r08', modulos: [], operacoes: [
    operacao('mecanifica.operacao.criar-base', [], ['mecanifica.base@1']),
    operacao('mecanifica.operacao.finalizar', ['mecanifica.base@1'], ['mecanifica.resultado@1']),
    operacao('mecanifica.operacao.bloqueada', ['mecanifica.ausente@1'], ['mecanifica.resultado@1']),
  ],
};
const objetivo = { entra: [], sai: ['mecanifica.resultado@1'] };

describe('lacunas de capacidade — R08', () => {
  it('persiste relato serializável com recorrência e custo de contorno explícitos', () => {
    const lacuna = criarLacunaCapacidade({
      id: 'mecanifica.lacuna.resultado', objetivo: 'produzir resultado de prova', artefatos: objetivo,
      candidatas: ['mecanifica.operacao.finalizar'], requisitoAusente: null,
      contorno: { descricao: 'montar a sequência manualmente', custo: 2 }, recorrencia: 3,
    });
    expect(lacuna).toEqual({ formato: FORMATO_LACUNA_CAPACIDADE, id: 'mecanifica.lacuna.resultado', objetivo: 'produzir resultado de prova', artefatos: objetivo, interfaces: { entra: [], sai: [] }, requisitos: [], candidatas: ['mecanifica.operacao.finalizar'], requisitoAusente: null, contorno: { descricao: 'montar a sequência manualmente', custo: 2 }, recorrencia: 3, classificacao: null });
    expect(Object.isFrozen(lacuna)).toBe(true);
    expect(schemaDaLacunaCapacidade()).toMatchObject({ $id: FORMATO_LACUNA_CAPACIDADE, required: expect.arrayContaining(['recorrencia', 'contorno']) });
    expect(() => criarLacunaCapacidade({ id: 'mecanifica.lacuna.invalida', objetivo: 'x', artefatos: objetivo, ignorado: true })).toThrow("registro não aceita 'ignorado'");
  });

  it('encontra cadeia mínima de modo determinístico e explica contrato descartado', () => {
    const a = planejarCapacidades(catalogo, { artefatos: objetivo });
    const b = planejarCapacidades(catalogo, { artefatos: objetivo });
    expect(a).toEqual(b);
    expect(a.cadeias).toContainEqual({ operacoes: [{ id: 'mecanifica.operacao.criar-base', nome: 'criar-base' }, { id: 'mecanifica.operacao.finalizar', nome: 'finalizar' }], custo: 2, artefatos: { entra: [], sai: ['mecanifica.base@1', 'mecanifica.resultado@1'] }, interfaces: { entra: [], sai: [] } });
    expect(a.descartes).toContainEqual({ operacao: { id: 'mecanifica.operacao.bloqueada', nome: 'bloqueada' }, motivo: 'exige artefatos ainda indisponíveis: mecanifica.ausente@1' });
    expect(a.diagnostico).toContain('estruturalmente compatíveis');
  });

  it('classifica composição antes de extensão e só conclui representação com evidência explícita', () => {
    const porComposicao = classificarLacunaCapacidade(catalogo, criarLacunaCapacidade({ id: 'mecanifica.lacuna.compor', objetivo: 'resultado', artefatos: objetivo }));
    expect(porComposicao).toMatchObject({ classificacao: 'composicao' });
    const semCadeia = criarLacunaCapacidade({ id: 'mecanifica.lacuna.nativa', objetivo: 'novo artefato', artefatos: { entra: [], sai: ['mecanifica.novo@1'] } });
    expect(classificarLacunaCapacidade(catalogo, semCadeia)).toMatchObject({ classificacao: 'operacao-nativa' });
    const representacao = criarLacunaCapacidade({ id: 'mecanifica.lacuna.representacao', objetivo: 'novo formato', artefatos: { entra: [], sai: ['mecanifica.novo@1'] }, requisitoAusente: { tipo: 'representacao', id: 'mecanifica.novo@1' } });
    expect(classificarLacunaCapacidade(catalogo, representacao)).toMatchObject({ classificacao: 'representacao' });
  });

  it('considera interfaces e requisitos declarados, sem inventar que eles estão disponíveis', () => {
    const restrito = { ...catalogo, operacoes: [
      operacao('mecanifica.operacao.criar-base', [], ['mecanifica.base@1'], { entra: [], sai: ['mecanifica.interface@1'] }),
      operacao('mecanifica.operacao.finalizar', ['mecanifica.base@1'], ['mecanifica.resultado@1'], { entra: ['mecanifica.interface@1'], sai: [] }, ['licenca.prova']),
    ] };
    expect(planejarCapacidades(restrito, { artefatos: objetivo }).cadeias).toEqual([]);
    expect(planejarCapacidades(restrito, { artefatos: objetivo, requisitos: ['licenca.prova'] }).cadeias).toHaveLength(1);
  });

  it('permanece separado de execução, visor, MCP e filesystem', () => {
    const fonte = readFileSync(new URL('../../prototipos/procedural/v3/motor/lacunas.js', import.meta.url), 'utf8');
    expect(fonte).not.toMatch(/node:fs|three|mcp|readFile|writeFile/i);
  });
});
