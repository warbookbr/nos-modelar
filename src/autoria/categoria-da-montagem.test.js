/* categoria-da-montagem.test.js — a categoria que a janela Abrir lê da montagem em dados e do PLANO vem de uma lista fechada. */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { ErroMontagemPersistida, lerMontagemPersistida } from './ler-montagem-persistida.js';
import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';
import { IDS_DE_CATEGORIA } from './categorias-de-objeto.js';

const { categoria: _declarada, ...MONTAGEM } = JSON.parse(readFileSync(new URL('../../procedural/pecas/carrinho-de-mao/montagem.json', import.meta.url), 'utf8'));
const PLANO = {
  objeto: 'copo baixo de vidro liso de noventa milímetros de altura',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'altura total', milimetros: 90 },
  partes: [{ nome: 'corpo', forma: 'revolução com fundo maciço', tecnica: 'revolução' }],
  criteriosDeReprovacao: ['parede mais fina que a declarada na tabela'],
};

describe('categoria declarada pelo objeto', () => {
  it('a montagem em dados aceita uma categoria da lista e a devolve, e a recusa fora dela', () => {
    expect(lerMontagemPersistida({ ...MONTAGEM, categoria: 'robotica' }).categoria).toBe('robotica');
    expect('categoria' in lerMontagemPersistida(MONTAGEM)).toBe(false);
    expect(() => lerMontagemPersistida({ ...MONTAGEM, categoria: 'brinquedos' })).toThrow(ErroMontagemPersistida);
  });

  it('o PLANO aceita uma categoria da lista, a mantém na forma canônica e recusa a de fora', () => {
    expect(normalizarPlanoDeModelagem({ ...PLANO, categoria: 'utensilios' }).categoria).toBe('utensilios');
    expect('categoria' in normalizarPlanoDeModelagem(PLANO)).toBe(false);
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, categoria: 'brinquedos' })).toThrow(/categoria/);
  });

  it('as montagens em dados do acervo declaram categoria da lista, e leem sem erro', () => {
    const raiz = new URL('../../procedural/pecas/', import.meta.url);
    const pastas = readdirSync(raiz).filter((p) => existsSync(new URL(`${p}/montagem.json`, raiz)));
    expect(pastas.length).toBeGreaterThan(0);
    for (const pasta of pastas) {
      const lida = lerMontagemPersistida(JSON.parse(readFileSync(new URL(`${pasta}/montagem.json`, raiz), 'utf8')));
      expect(IDS_DE_CATEGORIA, `${pasta}/montagem.json`).toContain(lida.categoria);
    }
  });
});
