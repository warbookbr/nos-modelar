/* Provas do gate N3 para procedência de valores estruturais. */
import { describe, expect, it } from 'vitest';
import { verificarProcedencia } from './procedencia-check.mjs';

const valido = { valores: [
  { id: 'comprimento', campo: 'envelope.comprimento', origem: { tipo: 'medido' } },
  { id: 'nariz', campo: 'landmark.nariz', origem: { tipo: 'derivado' } },
  { id: 'cabine', campo: 'cabine.inicio', origem: { tipo: 'medido' } },
  { id: 'ombro', campo: 'ombro.esquerdo', origem: { tipo: 'derivado' } },
  { id: 'candidato', campo: 'ajuste.local', origem: { tipo: 'resolvido', fontes: ['comprimento', 'nariz'] } },
] };

describe('procedencia:check', () => {
  it('aceita valor resolvido com cadeia medida/derivada', () => expect(verificarProcedencia(valido).passa).toBe(true));
  it('recusa landmark estrutural declarado mesmo no teto global', () => {
    const fonte = structuredClone(valido); fonte.valores[1].origem = { tipo: 'declarado', justificativa: 'parece correto' };
    expect(verificarProcedencia(fonte).erros).toContain('campo estrutural sem medida/derivação: landmark.nariz');
  });
  it('recusa resolvido que depende de chute', () => {
    const fonte = structuredClone(valido); fonte.valores.push({ id: 'chute', campo: 'detalhe', origem: { tipo: 'declarado', justificativa: 'rótulo' } }); fonte.valores[4].origem.fontes = ['chute'];
    expect(verificarProcedencia(fonte).passa).toBe(false);
  });
});
