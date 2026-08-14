/* Prova roteiro de revalidação assistida, sem correção ou veredito global. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { derivarRoteiroRevalidacao } from '../../src/autoria/derivar-roteiro-revalidacao.js';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const ler = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));

describe('derivarRoteiroRevalidacao', () => {
  it('separa baseline direto, indireto e pendências globais', async () => {
    const autoria = {
      formato: 'mecanifica.montagem', versao: 3, id: 'corrente',
      instancias: ['a', 'b', 'c'].map((id, indice) => ({
        id, alvo: { tipo: 'peca', ref: 'bloco' },
        pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, indice * 1.02, 0] },
      })),
      relacoes: [['aComB', 'a', 'b'], ['bComC', 'b', 'c']].map(([id, referencia, movel]) => ({
        id, tipo: 'mantemSeparacaoDirecional',
        referencia: { caminho: [referencia], parte: 'superficie' },
        movel: { caminho: [movel], parte: 'superficie' },
        especificacao: { eixo: [0, 1, 0], separacaoMinima: 0, toleranciaNumerica: 0.000001 },
      })),
    };
    const resolvida: any = await resolverMontagemPersistida(autoria, {
      carregarPeca: async () => ler('./fixtures/pecas-resolvidas/bloco-gabarito.json'),
    });
    const roteiro = derivarRoteiroRevalidacao(resolvida, { caminho: ['a'] });

    expect(roteiro.itens.map((item: any) => [item.alcance, item.relacao.id])).toEqual([
      ['direta', 'aComB'], ['indireta', 'bComC'],
    ]);
    expect(roteiro.itens.every((item: any) => item.revalidacao.executavel)).toBe(true);
    expect(roteiro.pendencias).toContainEqual(expect.objectContaining({
      codigo: 'uso-global-fora-da-raiz-nao-verificado', executavel: false,
    }));
    expect(roteiro).not.toHaveProperty('montagemValida');
    expect(roteiro).not.toHaveProperty('valida');
  });
});
