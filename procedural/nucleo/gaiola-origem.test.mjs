/* gaiola-origem.test.mjs — a gaiola por estações publica de onde vem cada ponto.
 *
 * Informação a mais e determinística, endereçada por nome: a entrada declarada, a coluna amostrada numa curva de seção
 * (com a curva, a fração e os pontos-chave) e a estação preenchida pela interpolação (com as chaves e a fração). A prova é
 * mexer em cada entrada editável e conferir que os pontos que se movem são exatamente os que a origem diz depender dela;
 * a saída que já existia não muda. */
import { describe, expect, it } from 'vitest';
import { capturarGaiolas, gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { CHAVES, COLUNAS, chavesExplicitas, chavesPorCurva, curvaDaSecao, nomeDaColuna } from './fixtures/gaiola-interpolada-prova.js';

const interpolada = (estacoes = chavesPorCurva()) => gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', estacoes, curvas: [curvaDaSecao], interpolar: { passo: 0.1 } });
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('origem dos pontos da gaiola', () => {
  it('sem curvas nem interpolação, todo ponto é entrada declarada, com a estação e a coluna', () => {
    const g = gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', estacoes: chavesExplicitas() });
    expect(Object.keys(g.origens)).toEqual(g.passo.vertices);
    for (const [nome, o] of Object.entries(g.origens)) {
      expect(o.tipo).toBe('declarada');
      expect(nome).toBe(`${o.estacao}_${o.coluna}`);
      expect(o.entrada).toBe(`${o.estacao}/${o.coluna}`);
    }
    /* uma entrada por coordenada local escrita: duas por coluna */
    expect(g.entradas).toHaveLength(CHAVES.length * COLUNAS * 2);
    expect(g.entradas[0]).toMatchObject({ id: `tras/${nomeDaColuna(0)}.u`, tipo: 'coluna', estacao: 'tras', alvo: nomeDaColuna(0), eixo: 'u' });
    expect(new Set(g.entradas.map((e) => e.id)).size).toBe(g.entradas.length);
  });

  it('a coluna de curva traz a curva, a fração e os pontos-chave da estação, e a estação gerada traz as chaves e a fração', () => {
    const g = interpolada();
    const chave = g.origens.meio_s3;
    expect(chave).toMatchObject({ tipo: 'curva', curva: 'secao', estacao: 'meio', coluna: 's3', fracao: 0.5 });
    expect(chave.pontosChave).toHaveLength(9);
    const gerada = g.origens.quarto_1_s3;
    expect(gerada).toMatchObject({ tipo: 'gerada', estacao: 'quarto_1', coluna: 's3', chaves: ['quarto', 'meio'] });
    expect(gerada.fracao).toBeCloseTo(0.1 / 0.6 * 1, 6);
    expect(gerada.nos).toEqual(['tras', 'quarto', 'meio', 'tresQuartos', 'frente']);
    /* a estação gerada não é entrada: as entradas são só as dos pontos-chave das curvas das cinco estações */
    expect(g.entradas).toHaveLength(CHAVES.length * 9 * 2);
    expect(g.entradas.every((e) => e.tipo === 'curva' && e.alvo === 'secao')).toBe(true);
    expect(g.entradas.find((e) => e.id === 'meio/secao[4].v')).toMatchObject({ estacao: 'meio', pontoChave: 4, eixo: 'v' });
    expect(Object.keys(g.origens)).toEqual(g.passo.vertices);
  });

  it('mexer numa entrada move exatamente os pontos que a origem diz depender dela', () => {
    const base = interpolada();
    const nomes = base.passo.vertices;
    for (const [estacao, k] of [['meio', 4], ['tras', 0], ['frente', 8], ['quarto', 2]]) {
      const estacoes = chavesPorCurva();
      const e = estacoes.find((x) => x.nome === estacao);
      e.colunas[0].pontos[k] = [e.colunas[0].pontos[k][0] + 0.002, e.colunas[0].pontos[k][1] - 0.001];
      const mexida = interpolada(estacoes);
      expect(mexida.passo.vertices).toEqual(nomes);
      const moveu = nomes.filter((n) => dist(base.pontos[n], mexida.pontos[n]) > 1e-12);
      const dependem = nomes.filter((n) => {
        const o = base.origens[n];
        if (o.tipo === 'curva') return o.estacao === estacao;
        return o.nos.includes(estacao);
      });
      /* quem depende pode não se mover (a coluna de fração 0 e 1 e a curva que passa pelo ponto), mas quem se move depende */
      for (const n of moveu) expect(dependem).toContain(n);
      expect(moveu.length).toBeGreaterThan(4);
    }
  });

  it('a estrutura muda com a posição das estações e não com o valor de uma entrada', () => {
    const a = interpolada();
    const valor = chavesPorCurva(); valor[2].colunas[0].pontos[3] = [valor[2].colunas[0].pontos[3][0] + 0.003, valor[2].colunas[0].pontos[3][1]];
    expect(JSON.stringify(interpolada(valor).estrutura)).toBe(JSON.stringify(a.estrutura));
    const posicao = chavesPorCurva(); posicao[2].em += 0.01;
    expect(JSON.stringify(interpolada(posicao).estrutura)).not.toBe(JSON.stringify(a.estrutura));
    const passo = gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', estacoes: chavesPorCurva(), curvas: [curvaDaSecao], interpolar: { passo: 0.15 } });
    expect(JSON.stringify(passo.estrutura)).not.toBe(JSON.stringify(a.estrutura));
  });

  it('capturarGaiolas devolve as saídas das gaiolas montadas por uma função, na ordem, e não vaza para fora dela', () => {
    const { resultado, gaiolas } = capturarGaiolas(() => { const a = interpolada(); const b = gaiolaPorEstacoes({ eixo: 'z', estacoes: chavesExplicitas() }); return [a, b]; });
    expect(gaiolas).toHaveLength(2);
    expect(gaiolas[0]).toBe(resultado[0]);
    expect(gaiolas[1]).toBe(resultado[1]);
    expect(capturarGaiolas(() => 1).gaiolas).toEqual([]);
    interpolada();
    expect(capturarGaiolas(() => capturarGaiolas(() => interpolada()).gaiolas.length).resultado).toBe(1);
  });

  it('mesma definição, mesmas origens, entradas e estrutura', () => {
    const a = interpolada(); const b = interpolada();
    expect(JSON.stringify([a.origens, a.entradas, a.estrutura])).toBe(JSON.stringify([b.origens, b.entradas, b.estrutura]));
  });
});
