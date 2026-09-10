/* prensa.test.js — suíte de testes da prensa progressiva procedural. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import {
  receitaCinematico,
  receitaEstrutura,
  receitaFerramentas,
  receitaPrensaCompleta,
} from './index.js';

describe('Módulo de Máquinas: Prensa com Estampo Progressivo', () => {
  it('executa a receita da estrutura estática com sucesso', () => {
    const { neutro } = executarReceita(receitaEstrutura);
    expect(neutro).toBeDefined();
    expect(neutro.V.size).toBeGreaterThan(0);
    expect(neutro.F.size).toBeGreaterThan(0);
    expect('mesaInferior' in neutro.partes).toBe(true);
    expect('cabecoteSuperior' in neutro.partes).toBe(true);
    expect(neutro.portas.size).toBe(2);
    expect(neutro.orfaos.length).toBe(0);
  });

  it('executa a receita do conjunto cinemático com sucesso', () => {
    const { neutro } = executarReceita(receitaCinematico);
    expect(neutro).toBeDefined();
    expect(neutro.V.size).toBeGreaterThan(0);
    expect('eixoExcentrico' in neutro.partes).toBe(true);
    expect('volanteInercia' in neutro.partes).toBe(true);
    expect('marteloCursor' in neutro.partes).toBe(true);
    expect(neutro.portas.size).toBe(1);
    expect(neutro.orfaos.length).toBe(0);
  });

  it('executa a receita do ferramental progressivo (4 estágios)', () => {
    const { neutro } = executarReceita(receitaFerramentas);
    expect(neutro).toBeDefined();
    expect('basePortaMatriz' in neutro.partes).toBe(true);
    expect('puncaoPiloto1' in neutro.partes).toBe(true);
    expect('puncaoDobraV' in neutro.partes).toBe(true);
    expect('puncaoCorteFinal' in neutro.partes).toBe(true);
    expect(neutro.portas.size).toBe(2);
    expect(neutro.orfaos.length).toBe(0);
  });

  it('executa a montagem completa da prensa integrada sem erros e sem faces órfãs', () => {
    const { neutro } = executarReceita(receitaPrensaCompleta);
    expect(neutro).toBeDefined();
    expect(neutro.V.size).toBeGreaterThan(100);
    expect(neutro.F.size).toBeGreaterThan(50);
    expect(Object.keys(neutro.partes).length).toBeGreaterThanOrEqual(10);
    expect(neutro.portas.size).toBeGreaterThanOrEqual(5);
    expect(neutro.orfaos.length).toBe(0);

    // Garante que 100% das faces têm parte atribuída (sem separação indevida de tampas/laterais)
    const facesSemParte = [...neutro.F.values()].filter((f) => !f.parte);
    expect(facesSemParte.length).toBe(0);
  });
});
