/* Prova separação direcional genérica em peça, parte e montagem recursiva. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const montagem = () => JSON.parse(readFileSync(new URL('./fixtures/montagens-persistidas/v3-separacao-direcional.json', import.meta.url), 'utf8'));
const peca = () => JSON.parse(readFileSync(new URL('./fixtures/pecas-resolvidas/bloco-gabarito.json', import.meta.url), 'utf8'));
const carregar = { carregarPeca: async () => peca() };

async function resolverComDeslocamento(y: number) {
  const dado = montagem();
  dado.instancias.find((item: any) => item.id === 'movel').pose.deslocamento[1] = y;
  return resolverMontagemPersistida(dado, carregar) as any;
}

describe('mantemSeparacaoDirecional — R01', () => {
  it.each([
    [1.02, 0.02, true],
    [1, 0, false],
    [0.995, -0.005, false],
  ])('mede estado em y=%s como %s', async (y, medida, satisfeita) => {
    const resultado = await resolverComDeslocamento(y);
    const relacao = resultado.relacoes[0];

    expect(relacao.satisfeita).toBe(satisfeita);
    expect(relacao.medidas.separacaoDirecional).toBeCloseTo(medida, 12);
    expect(relacao.medidas.eixoMundo).toEqual([0, 1, 0]);
    expect(relacao.diagnosticos.length).toBe(satisfeita ? 0 : 1);
  });

  it('normaliza eixo e usa somente vértices da parte declarada', async () => {
    const resultado = await resolverComDeslocamento(1.02);
    const relacao = resultado.relacoes[0];

    expect(relacao.especificacao.eixo).toEqual([0, 2, 0]);
    expect(relacao.medidas.maxReferencia).toBe(1);
    expect(relacao.medidas.minMovel).toBeCloseTo(1.02, 12);
    expect(relacao.referencia).toMatchObject({ caminho: ['referencia'], parte: 'superficie' });
    expect(relacao.referencia).not.toHaveProperty('pontosLocais');
  });

  it('compõe o eixo local da montagem filha à pose mundo', async () => {
    const filha = montagem();
    const raiz = {
      formato: 'mecanifica.montagem', versao: 1, id: 'raiz',
      instancias: [{
        id: 'filha', alvo: { tipo: 'montagem', ref: 'filha' },
        pose: { rotacao: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], deslocamento: [3, 4, 5] },
      }],
    };
    const resultado: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: carregar.carregarPeca,
      carregarMontagem: async () => filha,
    });
    const relacao = resultado.instancias[0].montagem.relacoes[0];

    expect(relacao.satisfeita).toBe(true);
    expect(relacao.medidas.eixoMundo[0]).toBeCloseTo(-1, 12);
    expect(relacao.medidas.eixoMundo[1]).toBeCloseTo(0, 12);
    expect(relacao.medidas.separacaoDirecional).toBeCloseTo(0.02, 12);
  });

  it('recusa parte ausente com código, campo e trilha', async () => {
    const dado = montagem();
    dado.relacoes[0].referencia.parte = 'ausente';
    try {
      await resolverMontagemPersistida(dado, carregar);
      throw new Error('não falhou');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroResolucaoMontagemPersistida);
      expect(erro).toMatchObject({
        codigo: 'parte-ausente',
        caminho: 'relacoes[0].referencia.parte',
        trilha: ['referencia'],
      });
    }
  });

  it('não muta autoria nem peça resolvida', async () => {
    const dado = montagem();
    const bruto = peca();
    const antesDado = JSON.stringify(dado);
    const antesPeca = JSON.stringify(bruto);
    await resolverMontagemPersistida(dado, { carregarPeca: async () => bruto });

    expect(JSON.stringify(dado)).toBe(antesDado);
    expect(JSON.stringify(bruto)).toBe(antesPeca);
  });
});
