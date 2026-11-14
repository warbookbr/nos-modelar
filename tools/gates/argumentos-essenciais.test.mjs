/* argumentos-essenciais.test.mjs — o gate dos essenciais e a recusa na hora: cada receita mínima errada do inventário de erros
   (docs/modelar/banco-de-provas/revisao-do-projeto-2026-11-13) é recusada no passo certo, com a causa e o que fazer. */
import { describe, expect, it } from 'vitest';
import { conferirArgumentosEssenciais } from './argumentos-essenciais.mjs';
import { nucleo } from '../../procedural/nucleo/nucleo.js';
import { essenciaisDaOperacao, recusasDeEssenciais } from '../../procedural/nucleo/uso-operacoes.js';

const motivos = (neutro) => neutro.orfaos.map((o) => `passo ${o.passo} (${o.op}) ${o.ref}: ${o.motivo}`);

describe('o gate dos argumentos essenciais', () => {
  it('passa no núcleo de agora', () => {
    expect(conferirArgumentosEssenciais()).toEqual([]);
  });
});

describe('argumento essencial ausente', () => {
  const casos = [
    ['cilindro sem raio', 'cilindro', { altura: 1 }, 'raio'],
    ['cilindro sem argumentos', 'cilindro', {}, 'raio'],
    ['cone sem altura', 'cone', { raio: 1 }, 'altura'],
    ['esfera vazia', 'esfera', {}, 'raio'],
    ['plano sem profundidade', 'plano', { largura: 1 }, 'profundidade'],
    ['cubo sem dimensão', 'cubo', {}, 'lado'],
    ['cubo só com larg', 'cubo', { larg: 1 }, 'lado'],
    ['chamferBox sem altura', 'chamferBox', { larg: 1, prof: 1, chanfro: 0.1 }, 'lado'],
  ];
  for (const [nome, op, args, campo] of casos) {
    it(`${nome} é recusada citando o passo e '${campo}'`, () => {
      const recusas = recusasDeEssenciais(op, args, essenciaisDaOperacao(op), (v) => v, 7);
      expect(recusas.length).toBeGreaterThan(0);
      expect(recusas[0].campo).toBe(campo);
      expect(recusas[0].motivo).toContain('passo 7');
      expect(recusas[0].motivo).toContain(`'${campo}'`);
    });
  }

  it('as receitas certas não são recusadas', () => {
    expect(recusasDeEssenciais('cilindro', { raio: 0.5, altura: 1, lados: 8 }, essenciaisDaOperacao('cilindro'), (v) => v)).toEqual([]);
    expect(recusasDeEssenciais('cubo', { lado: 1 }, essenciaisDaOperacao('cubo'), (v) => v)).toEqual([]);
    expect(recusasDeEssenciais('cubo', { larg: 1, alt: 2, prof: 3 }, essenciaisDaOperacao('cubo'), (v) => v)).toEqual([]);
  });

  it('a operação que diz não ter essenciais declara o motivo', () => {
    expect(essenciaisDaOperacao('transladar')).toMatchObject({ essenciais: [], semEssenciais: expect.stringContaining('translação zero') });
  });
});

describe('o valor não positivo', () => {
  const contrato = { essenciais: [['raio']], positivos: ['raio'] };
  const resolver = (v) => v;
  it('cita o passo, o valor e o limite', () => {
    const [recusa] = recusasDeEssenciais('cilindro', { raio: -1 }, contrato, resolver, 4);
    expect(recusa.campo).toBe('raio');
    expect(recusa.motivo).toContain('passo 4');
    expect(recusa.motivo).toContain('-1');
    expect(recusa.motivo).toContain('maior que 0');
  });
  it('recusa zero e deixa passar o positivo', () => {
    expect(recusasDeEssenciais('cilindro', { raio: 0 }, contrato, resolver)).toHaveLength(1);
    expect(recusasDeEssenciais('cilindro', { raio: 0.1 }, contrato, resolver)).toEqual([]);
  });
  it('a tabela de hoje não a liga em nenhuma operação (ver a fatia 1 do plano)', () => {
    expect(essenciaisDaOperacao('cubo').positivos).toEqual([]);
    expect(essenciaisDaOperacao('cilindro').positivos).toEqual([]);
  });
});

describe('nome de operação e de parâmetro errados', () => {
  it('operação desconhecida sugere o nome próximo', () => {
    const neutro = nucleo([['cubo', { lado: 1 }], ['transladr', { d: [1, 0, 0] }]], {}, {});
    const [o] = neutro.orfaos;
    expect(o.passo).toBe(1);
    expect(o.motivo).toContain("operação desconhecida 'transladr'");
    expect(o.motivo).toContain("Você quis dizer 'transladar'?");
  });

  it('parâmetro inexistente lança com passo, operação, argumento e nomes próximos', () => {
    const passos = [['cubo', { lado: 1 }], ['cilindro', { raio: 'grnade', altura: 1 }]];
    let erro;
    try { nucleo(passos, { grande: 1 }, {}); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toContain('passo 1 (cilindro)');
    expect(erro.message).toContain("argumento 'raio'");
    expect(erro.message).toContain("parâmetro 'grnade' não existe em PARAMS/TOPO");
    expect(erro.message).toContain("você quis dizer 'grande'?");
    expect([erro.passo, erro.op, erro.chave]).toEqual([1, 'cilindro', 'raio']);
  });

  it('o nome dentro de uma expressão também é achado', () => {
    let erro;
    try { nucleo([['cilindro', { raio: '=metade * 2', altura: 1 }]], { meta: 1 }, {}); } catch (e) { erro = e; }
    expect(erro.message).toContain('passo 0 (cilindro)');
    expect(erro.message).toContain("argumento 'raio'");
    expect(erro.message).toContain("você quis dizer 'meta'?");
  });

  it('valor que não é número diz o passo e o argumento', () => {
    let erro;
    try { nucleo([['cubo', { lado: 1 }], ['transladar', { d: [1, { x: 1 }, 0] }]], {}, {}); } catch (e) { erro = e; }
    expect(erro.message).toContain('passo 1 (transladar)');
    expect(erro.message).toContain('valor numérico inválido');
    expect(erro.chave).toBe('d[1]');
  });
});

describe('as recusas que diziam undefined', () => {
  const base = [['cubo', { origemId: 1, lado: 1 }]];
  const casos = [
    ['arranja sem modo', [...base, ['arranja', { total: 3, d: [1, 0, 0], origemId: 2, derivaDe: { op: 'cubo', id: 1 } }]], 'modo'],
    ['espelha sem eixo', [...base, ['espelha', { pos: 0 }]], 'eixo'],
    ['rotaciona sem eixo', [...base, ['rotaciona', { graus: 10 }]], 'eixo'],
    ['material sem usa', [...base, ['material', {}]], 'usa'],
  ];
  for (const [nome, passos, campo] of casos) {
    it(`${nome} diz o campo que faltou`, () => {
      const neutro = nucleo(passos, {}, {}, { aco: { cor: '#888' } });
      const achado = neutro.orfaos.find((o) => o.ref === campo);
      expect(achado, motivos(neutro).join('\n')).toBeTruthy();
      expect(achado.motivo).toContain(`falta o argumento '${campo}'`);
      expect(achado.motivo).not.toContain('undefined');
    });
  }
  it('pesar sem osso diz o campo que faltou', () => {
    const neutro = nucleo([...base, ['pesar', { peso: 1 }]], {}, {}, {}, { ossos: [{ nome: 'raiz' }] });
    const achado = neutro.orfaos.find((o) => o.ref === 'osso');
    expect(achado.motivo).toContain("falta o argumento 'osso'");
  });
});
