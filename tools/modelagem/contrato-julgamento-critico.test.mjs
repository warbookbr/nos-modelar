/* Contrato assinado que mantém o julgamento externo rastreável. */
import { describe, expect, it } from 'vitest';
import { assinarJulgamentoCritico, validarJulgamentoCritico } from './contrato-julgamento-critico.mjs';

const sha = (caractere) => `sha256:${caractere.repeat(64)}`;
function julgamento() {
  const base = {
    formato: 'mecanifica.julgamento-critico@2', lote: 'lote-p0', assinaturaLote: sha('a'),
    apresentacao: 'p001', decisao: 'primeira',
    achados: [{ regiao: 'cabine', veredito: 'reprovar', evidencia: 'vista lateral: teto incompatível' }],
    confianca: 0.72, provedor: 'teste-local', modelo: 'critico-sintetico', hashPrompt: sha('b'),
  };
  return { ...base, assinaturaResposta: assinarJulgamentoCritico(base) };
}

describe('contrato de julgamento crítico', () => {
  it('aceita somente decisão, regiões e assinatura vinculadas ao lote', () => {
    expect(validarJulgamentoCritico(julgamento())).toMatchObject({ decisao: 'primeira', confianca: 0.72 });
  });

  it('recusa troca posterior de decisão ou lote', () => {
    expect(() => validarJulgamentoCritico({ ...julgamento(), decisao: 'segunda' })).toThrow(/assinatura/);
    expect(() => validarJulgamentoCritico({ ...julgamento(), assinaturaLote: sha('c') })).toThrow(/assinatura/);
  });
});
