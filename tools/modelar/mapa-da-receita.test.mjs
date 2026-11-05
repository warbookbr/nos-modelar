/* mapa-da-receita.test.mjs — o mapa de toda receita do acervo sai sem erro, cada linha citada tem o nome dito e a saída cabe numa tela */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pecasDoAcervo } from './guardas/guarda-acervo.mjs';
import { LARGURA, LIMITE_DE_LINHAS, executar, formatarMapa, lerItens, mapaDaReceita } from './mapa-da-receita.mjs';

describe('mapa da receita: o leitor léxico', () => {
  it('separa comentário, cadeia, modelo e expressão regular, e a profundidade fecha', () => {
    const itens = lerItens([
      'const a = { b: "x // não é comentário", c: `m${1 + { d: 2 }.d}n`, e: /[}/]+/g }; // fim',
      '/* bloco',
      '   com { chave */',
      'function f() { return 1 / 2; }',
    ].join('\n'));
    const comentarios = itens.filter((i) => i.tipo === 'comentario');
    expect(comentarios.map((c) => [c.linha, c.fim])).toEqual([[1, 1], [2, 3]]);
    expect(itens.find((i) => i.tipo === 'regex').valor).toBe('/[}/]+/g');
    const modelo = itens.filter((i) => i.tipo === 'str' && i.modelo);
    expect(modelo.map((m) => [m.valor, m.abre, m.fecha])).toEqual([['m', true, false], ['n', false, true]]);
    expect(itens.filter((i) => i.tipo !== 'comentario').at(-1)).toMatchObject({ valor: '}', prof: 0, linha: 4 });
  });
});

describe('mapa da receita: a linha de comando', () => {
  it('--ajuda descreve o uso', async () => {
    const r = await executar(['--ajuda']);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toContain('npm run receita:mapa -- <peça>');
  });

  it('sem peça, ou com peça que não existe, recusa com código 2', async () => {
    expect((await executar([])).codigo).toBe(2);
    expect((await executar(['peca-que-nao-existe'])).codigo).toBe(2);
  });
});

describe('mapa da receita: toda receita do acervo', () => {
  for (const peca of pecasDoAcervo()) {
    it(peca, async () => {
      const mapa = await mapaDaReceita(peca);
      const texto = formatarMapa(mapa);
      const linhas = texto.trimEnd().split('\n');
      expect(linhas.length, `${peca}: ${linhas.length} linhas`).toBeLessThanOrEqual(LIMITE_DE_LINHAS);
      for (const linha of linhas) expect(linha.length, linha).toBeLessThanOrEqual(LARGURA);
      expect(mapa.tabela, 'a TABELA tem seções').not.toBeNull();
      expect(mapa.plano, 'o PLANO foi achado').not.toBeNull();
      expect(mapa.passos.linha, 'gerarPassos foi achada').toBeGreaterThan(0);
      const textos = new Map(mapa.arquivos.map((a) => [a.rel, readFileSync(a.caminho, 'utf8').split('\n')]));
      for (const { arquivo, linha, nome } of mapa.citacoes) {
        expect(nome, `${arquivo}:${linha} sem nome`).toBeTruthy();
        expect(textos.get(arquivo)[linha - 1] ?? '', `${arquivo}:${linha} deveria ter '${nome}'`).toContain(nome);
      }
    });
  }
});
