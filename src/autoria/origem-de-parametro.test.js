/* origem-de-parametro.test.js — a regra que impede a rodada de absorção de
   inventar número para fechar a conta. */
import { describe, expect, it } from 'vitest';
import { conferirAbsorcao, conferirOrigens, parametrosNovos } from './origem-de-parametro.js';
import * as prova from '../../tools/fixtures/acervo/peca-de-prova/receita.js';

const receita = prova.default ?? prova;
const comParams = (PARAMS, ORIGENS) => ({ PARAMS, ...(ORIGENS ? { ORIGENS } : {}), PASSOS: [] });

describe('conferirOrigens', () => {
  it('a receita declara de onde veio cada número', () => {
    const veredito = conferirOrigens(receita);
    expect(veredito.declara).toBe(true);
    expect(veredito.semOrigem).toEqual([]);
    expect(veredito.sobrando).toEqual([]);
  });

  it('receita que não declara nada passa, porque a adesão é opcional', () => {
    expect(conferirOrigens(comParams({ raio: 3 })).ok).toBe(true);
    expect(conferirOrigens(comParams({ raio: 3 })).declara).toBe(false);
  });

  it('declarar pela metade reprova', () => {
    const veredito = conferirOrigens(comParams({ raio: 3, altura: 7 }, { raio: 'medido na folha' }));
    expect(veredito.ok).toBe(false);
    expect(veredito.semOrigem).toEqual(['altura']);
  });

  it('frase vazia não conta como origem', () => {
    expect(conferirOrigens(comParams({ raio: 3 }, { raio: '   ' })).semOrigem).toEqual(['raio']);
  });

  it('uma entrada cobre as duas casas de uma coordenada', () => {
    const veredito = conferirOrigens(comParams({ ponto: [10, 20] }, { ponto: 'junta medida na folha' }));
    expect(veredito.ok).toBe(true);
  });

  it('frase que explica parâmetro inexistente reprova como resto de rodada antiga', () => {
    const veredito = conferirOrigens(comParams({ raio: 3 }, { raio: 'medido', alturaQueSaiu: 'medido' }));
    expect(veredito.ok).toBe(false);
    expect(veredito.sobrando).toEqual(['alturaQueSaiu']);
  });
});

describe('conferirAbsorcao', () => {
  const antiga = comParams({ raio: 3 });

  it('reprova parâmetro novo que não diz de onde veio', () => {
    const veredito = conferirAbsorcao(antiga, comParams({ raio: 3, fatorDeCorrecao: 1.07 }));
    expect(veredito.ok).toBe(false);
    expect(veredito.novos).toEqual(['fatorDeCorrecao']);
    expect(veredito.semOrigem).toEqual(['fatorDeCorrecao']);
  });

  it('aprova parâmetro novo com origem declarada', () => {
    const nova = comParams({ raio: 3, larguraDoCubo: 148 }, { larguraDoCubo: 'padrão boost, medido no cubo' });
    expect(conferirAbsorcao(antiga, nova).ok).toBe(true);
  });

  it('mudar o VALOR de um parâmetro que já existia não é parâmetro novo', () => {
    expect(conferirAbsorcao(antiga, comParams({ raio: 9 })).novos).toEqual([]);
  });

  it('vale mesmo quando a receita antiga não declarava origem nenhuma', () => {
    const nova = comParams({ raio: 3, termoSolto: 0.5 });
    expect(conferirAbsorcao(antiga, nova).ok).toBe(false);
  });
});

describe('parametrosNovos', () => {
  it('lista só o que apareceu, em ordem estável', () => {
    const novos = parametrosNovos(comParams({ a: 1 }), comParams({ a: 1, z: 2, b: 3 }));
    expect(novos).toEqual(['b', 'z']);
  });
});
