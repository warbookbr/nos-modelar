/* variantes.test.js — o gate 2 do plano esboço pelo núcleo: a cópia de prova da mesa com três variantes declaradas dá, na variante
 * com o valor aceito, a mesma malha da receita do acervo pelo hash do neutroCanonico, e as outras duas mudam; a receita do acervo
 * não muda; e as trocas da tabela recusam a chave que não existe. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { neutroCanonico } from '../../../procedural/nucleo/nucleo.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import * as acervo from '../../../procedural/pecas/mesa-quadrada-escura/receita.js';
import * as copia from '../../../docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/mesa-com-variantes.js';
import { aplicarTrocas, lerVariantes, receitasDasVariantes } from '../src/variantes.js';

const hash = (neutro) => createHash('sha256').update(JSON.stringify(neutroCanonico(neutro))).digest('hex');

describe('o gate 2: a mesa com três variantes', () => {
  it('a variante com o valor aceito dá a mesma malha da receita do acervo, e as outras duas, malhas diferentes', () => {
    const antes = hash(executarReceita(acervo.default).neutro);
    const variantes = receitasDasVariantes(copia);
    expect(variantes.map((v) => v.nome)).toEqual(['aceita: tampo de 40 mm', 'tampo fino, 25 mm', 'tampo grosso, 60 mm']);
    const hashes = variantes.map((v) => hash(v.neutro));
    expect(hashes[0]).toBe(antes);
    expect(new Set(hashes).size).toBe(3);
    /* a cópia sem troca também é a receita do acervo */
    expect(hash(executarReceita(copia.default).neutro)).toBe(antes);
  });

  it('a receita do acervo não muda: a tabela dela continua com o tampo de 40 mm depois das variantes', () => {
    receitasDasVariantes(copia);
    expect(acervo.default.PARAMS.tampo_espessura).toBe(40);
    expect(acervo.TABELA.tampo_espessura).toBe(40);
    expect(copia.default.PARAMS.tampo_espessura).toBe(40);
  });

  it('a troca mexe só na chave pedida, aceita o caminho com ponto e recusa a chave que não existe', () => {
    const t = { a: 1, chapa: { espessura: 2, niveis: 2 } };
    expect(aplicarTrocas(t, { 'chapa.espessura': 3 })).toEqual({ a: 1, chapa: { espessura: 3, niveis: 2 } });
    expect(t.chapa.espessura).toBe(2);
    expect(() => aplicarTrocas(t, { b: 1 })).toThrow(/a chave "b" não existe na TABELA; as chaves são a, chapa/);
    expect(() => aplicarTrocas(t, { 'chapa.raio': 1 })).toThrow(/não existe na TABELA \(em chapa\)/);
  });

  it('VARIANTES é validada: sem ela, sem nome, nome repetido e campo desconhecido são recusados', () => {
    expect(() => lerVariantes(acervo)).toThrow(/não declara VARIANTES/);
    const com = (VARIANTES) => ({ default: acervo.default, VARIANTES });
    expect(() => lerVariantes(com([{ tabela: {} }]))).toThrow(/precisa de "nome"/);
    expect(() => lerVariantes(com([{ nome: 'a', tabela: {} }, { nome: 'a', tabela: {} }]))).toThrow(/repetido/);
    expect(() => lerVariantes(com([{ nome: 'a', tabela: {}, cor: 1 }]))).toThrow(/campo "cor" não existe/);
  });
});
