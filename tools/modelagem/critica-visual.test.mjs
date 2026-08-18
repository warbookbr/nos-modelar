/* crítica-visual.test.mjs — contrato neutro e reexecutável de achados visuais. */
import { describe, expect, it } from 'vitest';
import {
  FORMATO_ACHADOS_VISUAIS,
  VERSAO_ACHADOS_VISUAIS,
  jsonCanonico,
  validarCriticaVisual,
} from './revisao-modelagem.mjs';

const assinatura = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const base = {
  formato: FORMATO_ACHADOS_VISUAIS,
  versao: VERSAO_ACHADOS_VISUAIS,
  achados: [
    {
      alvo: { tipo: 'montagem', id: 'conjunto-neutro' },
      vista: 'direita',
      severidade: 'alta',
      observacao: 'A transição entre os dois volumes perde continuidade visível na vista lateral.',
      decisao: 'corrigir',
      estado: 'aberto',
      vinculo: { antes: assinatura, depois: null },
    },
    {
      alvo: { tipo: 'peca', id: 'suporte' },
      vista: 'isometrica',
      severidade: 'media',
      observacao: 'A borda principal não comunica espessura consistente no enquadramento oficial.',
      evidencia: { tipo: 'render', hash: assinatura },
      decisao: 'investigar',
      estado: 'adiado',
      vinculo: { antes: null, depois: assinatura },
    },
  ],
};

describe('contrato neutro de achados de crítica visual', () => {
  it('canonicaliza achados independentemente da ordem de entrada e explicita evidência ausente', () => {
    const invertida = { ...base, achados: [...base.achados].reverse() };
    const a = validarCriticaVisual(base);
    const b = validarCriticaVisual(invertida);
    expect(jsonCanonico(a)).toBe(jsonCanonico(b));
    expect(a.achados[0].alvo).toEqual({ tipo: 'montagem', id: 'conjunto-neutro' });
    expect(a.achados[0].evidencia).toBeNull();
  });

  it('aceita vista oficial fornecida pelo host sem conhecer o domínio do alvo', () => {
    const entrada = {
      ...base,
      achados: [{ ...base.achados[0], vista: 'perfil-3-4' }],
    };
    expect(validarCriticaVisual(entrada, { vistasOficiais: ['perfil-3-4'] }).achados[0].vista).toBe('perfil-3-4');
  });

  it.each([
    ['vista não oficial', { vista: 'vista-inventada' }],
    ['severidade desconhecida', { severidade: 'urgente' }],
    ['hash inválido', { evidencia: { tipo: 'render', hash: 'sha256:curto' } }],
    ['hash nulo explícito', { evidencia: { tipo: 'render', hash: null } }],
    ['vínculo vazio', { vinculo: { antes: null, depois: null } }],
    ['observação vaga', { observacao: 'deixar mais realista' }],
  ])('recusa com segurança fechada: %s', (_nome, alteracao) => {
    const entrada = { ...base, achados: [{ ...base.achados[0], ...alteracao }] };
    expect(() => validarCriticaVisual(entrada)).toThrow();
  });

  it('recusa achado repetido no mesmo alvo e vista', () => {
    const entrada = { ...base, achados: [base.achados[0], { ...base.achados[0] }] };
    expect(() => validarCriticaVisual(entrada)).toThrow(/repetem/);
  });
});
