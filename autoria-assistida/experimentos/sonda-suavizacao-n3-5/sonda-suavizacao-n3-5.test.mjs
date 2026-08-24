/* Provas de isolamento, preservação e leitura C1 da sonda N3.5. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { medirRegiaoSuave, suavizarGuiadoPorC1 } from './suavizar-c1.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = resolve(aqui, '..', '..', 'rascunhos-defeituosos', 'prova-cage-quarto-dianteiro', 'evidencias', 'malha-nivel-2.json');

describe('sonda N3.5 de suavização C1', () => {
  it('preserva a entrada, topologia e todos os vértices de borda/quina', () => {
    const antes = JSON.parse(readFileSync(fonte, 'utf8')); const copia = JSON.stringify(antes);
    const depois = suavizarGuiadoPorC1(antes);
    expect(JSON.stringify(antes)).toBe(copia);
    expect(depois.malha.V).toHaveLength(antes.V.length);
    expect(depois.malha.F).toEqual(antes.F);
    expect(depois.preservacao.arestasProtegidas).toBeGreaterThan(0);
    expect(depois.preservacao.deslocamentoMaximoMm).toBeLessThan(20);
  });

  it('mede a região livre separadamente das quinas que C1 protege', () => {
    const antes = JSON.parse(readFileSync(fonte, 'utf8'));
    const medida = medirRegiaoSuave(antes);
    expect(medida.adjacenciasSuaves).toBeGreaterThan(0);
    expect(medida.arestasProtegidas).toBeGreaterThan(0);
  });
});
