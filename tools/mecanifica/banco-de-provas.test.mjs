/* Testes do catálogo do banco de provas e registro de custo de modelagem.
   Valida esquema de medições, agregação de custo por objeto e cobertura de
   ferramentas e famílias. */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  validarRegistro,
  resumoPorObjeto,
  gerarMarkdown,
  conferir,
} from './banco-de-provas.mjs';

describe('Banco de provas e registro de custo', () => {
  it('formato recusa registro sem objeto ou com objeto não listado', () => {
    const objetosValidos = ['carrinho de mão', 'picape'];
    expect(() => validarRegistro({}, { objetosValidos })).toThrow(/objeto/i);
    expect(() => validarRegistro({ objeto: 'objeto inexistente', unidade: 'u', nota: 8, tokens: 100 }, { objetosValidos })).toThrow(/não listado|desconhecido/i);
  });

  it('formato recusa registro sem unidade', () => {
    const objetosValidos = ['carrinho de mão'];
    expect(() => validarRegistro({ objeto: 'carrinho de mão', nota: 8, tokens: 100 }, { objetosValidos })).toThrow(/unidade/i);
  });

  it('formato recusa registro com nota fora de 0 a 10', () => {
    const objetosValidos = ['carrinho de mão'];
    expect(() => validarRegistro({ objeto: 'carrinho de mão', unidade: 'u', nota: -1, tokens: 100 }, { objetosValidos })).toThrow(/nota.*0.*10/i);
    expect(() => validarRegistro({ objeto: 'carrinho de mão', unidade: 'u', nota: 10.5, tokens: 100 }, { objetosValidos })).toThrow(/nota.*0.*10/i);
    expect(() => validarRegistro({ objeto: 'carrinho de mão', unidade: 'u', nota: 'invalida', tokens: 100 }, { objetosValidos })).toThrow(/nota/i);
  });

  it('formato recusa registro com tokens negativo ou não inteiro', () => {
    const objetosValidos = ['carrinho de mão'];
    expect(() => validarRegistro({ objeto: 'carrinho de mão', unidade: 'u', nota: 8, tokens: -50 }, { objetosValidos })).toThrow(/tokens/i);
    expect(() => validarRegistro({ objeto: 'carrinho de mão', unidade: 'u', nota: 8, tokens: 12.34 }, { objetosValidos })).toThrow(/tokens/i);
  });

  it('aceita registro válido com valores padrão para data, commit e rodada', () => {
    const objetosValidos = ['carrinho de mão'];
    const r = validarRegistro({ objeto: 'carrinho de mão', unidade: 'chassi', nota: 8.5, tokens: 3500 }, { objetosValidos });
    expect(r.objeto).toBe('carrinho de mão');
    expect(r.unidade).toBe('chassi');
    expect(r.nota).toBe(8.5);
    expect(r.tokens).toBe(3500);
    expect(r.rodada).toBe(1);
    expect(r.origemTokens).toBeDefined();
    expect(r.data).toBeDefined();
    expect(r.commit).toBeDefined();
  });

  it('resumo soma certo: total de tokens, rodadas e nota final', () => {
    const dados = {
      objetos: [
        { nome: 'carrinho de mão', familia: 'Veículos terrestres', nivel: 'esboço' },
        { nome: 'picape', familia: 'Veículos terrestres', nivel: 'detalhado' },
      ],
      medicoes: [
        { objeto: 'carrinho de mão', unidade: 'cacamba', rodada: 1, tokens: 1000, nota: 7 },
        { objeto: 'carrinho de mão', unidade: 'cacamba', rodada: 2, tokens: 1500, nota: 8.5 },
        { objeto: 'picape', unidade: 'cabine', rodada: 1, tokens: 4000, nota: 9 },
      ],
    };
    const resumo = resumoPorObjeto(dados);
    expect(resumo['carrinho de mão'].totalTokens).toBe(2500);
    expect(resumo['carrinho de mão'].totalRodadas).toBe(2);
    expect(resumo['carrinho de mão'].notaFinal).toBe(8.5);

    expect(resumo['picape'].totalTokens).toBe(4000);
    expect(resumo['picape'].totalRodadas).toBe(1);
    expect(resumo['picape'].notaFinal).toBe(9);
  });

  it('a nota do objeto é a menor nota final entre as unidades', () => {
    const dados = {
      objetos: [{ nome: 'picape', familia: 'Veículos terrestres', nivel: 'detalhado' }],
      medicoes: [
        { objeto: 'picape', unidade: 'cabine', rodada: 1, tokens: 10, nota: 6 },
        { objeto: 'picape', unidade: 'cabine', rodada: 2, tokens: 10, nota: 9 },
        { objeto: 'picape', unidade: 'cacamba', rodada: 1, tokens: 10, nota: 7 },
        { objeto: 'picape', unidade: 'chassi', rodada: 1, tokens: 10, nota: 9.5 },
      ],
    };
    expect(resumoPorObjeto(dados)['picape'].notaFinal).toBe(7);
  });

  it('recusa origem de tokens fora da lista', () => {
    expect(() => validarRegistro({ objeto: 'picape', unidade: 'cabine', tokens: 1, nota: 8, origemTokens: 'chute' }, { origensValidas: ['condutor', 'api'] })).toThrow(/origem dos tokens/);
  });

  it('banco cobre de 5 a 8 objetos com ferramentas e famílias requeridas', () => {
    const caminhoJson = join(process.cwd(), 'docs/mecanifica/banco-de-provas/banco-de-provas.json');
    if (!existsSync(caminhoJson)) return; // conferido após criação
    const dados = JSON.parse(readFileSync(caminhoJson, 'utf8'));
    expect(dados.objetos.length).toBeGreaterThanOrEqual(5);
    expect(dados.objetos.length).toBeLessThanOrEqual(8);

    const todasFerramentas = new Set(dados.objetos.flatMap((o) => o.ferramentas));
    expect(todasFerramentas.has('casca')).toBe(true);
    expect(todasFerramentas.has('chapa')).toBe(true);
    expect(todasFerramentas.has('articula')).toBe(true);
    expect(todasFerramentas.has('barras')).toBe(true);

    const nomesEObjetos = dados.objetos.map((o) => o.nome.toLowerCase());
    expect(nomesEObjetos.some((n) => n.includes('roda') || n.includes('pneu') || n.includes('picape') || n.includes('carrinho'))).toBe(true);
    expect(nomesEObjetos.some((n) => n.includes('cilindro') || n.includes('hidráulico'))).toBe(true);
    expect(nomesEObjetos.some((n) => n.includes('mola') || n.includes('suspensão'))).toBe(true);
    expect(nomesEObjetos.some((n) => n.includes('roupa') || n.includes('roupeiro') || n.includes('cadeira'))).toBe(true);
  });

  it('referências dos objetos de prova não contêm links ou slugs fictícios do GrabCAD', () => {
    const caminhoJson = join(process.cwd(), 'docs/mecanifica/banco-de-provas/banco-de-provas.json');
    const dados = JSON.parse(readFileSync(caminhoJson, 'utf8'));
    for (const obj of dados.objetos) {
      if (obj.nome === 'cilindro hidráulico') {
        expect(obj.referencia).toBe('ISO 6020-2');
      } else if (obj.nome === 'cadeira de rodas') {
        expect(obj.referencia).toBe('ISO 7176');
      } else {
        expect(obj.referencia).toBeNull();
      }
    }
  });
});
