/* sistema-visual.test.js — o gate 5 do plano das visões e da interface: a folha de estilo da bancada não escreve cor, tamanho de fonte nem espaçamento fora das variáveis do sistema visual.
 *
 * Roda com os outros testes da bancada (`npx vitest run src/bancada`), onde também mora a régua da fronteira da página
 * (gate 7). As definições ficam em `sistema-visual.css`, que é o único arquivo de estilo da bancada fora desta régua. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { foraDoSistemaVisual } from './regua-do-estilo.js';

const BANCADA = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFINICOES = join(BANCADA, 'sistema-visual.css');

function folhasDaBancada(pasta = BANCADA) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) return folhasDaBancada(caminho);
    return entrada.name.endsWith('.css') && caminho !== DEFINICOES ? [caminho] : [];
  });
}

describe('régua do sistema visual', () => {
  it('acha cor, tamanho de fonte e espaçamento escritos à mão', () => {
    const achados = foraDoSistemaVisual(`
      .a { color: #fff; background: rgba(0, 0, 0, 0.2); border-color: white; }
      .b { font-size: 12px; font: 600 11px/1.4 var(--fonte); }
      .c { padding: 4px var(--e2); margin-top: -2px; gap: 1rem; }
      :root { --minha: #123456; }`);
    expect(achados.map(({ propriedade, motivo }) => `${propriedade}: ${motivo.split(' ')[0]}`)).toEqual([
      'color: cor', 'background: cor', 'border-color: cor', 'font-size: tamanho', 'font: tamanho',
      'padding: espaçamento', 'margin-top: espaçamento', 'gap: espaçamento', '--minha: cor',
    ]);
    expect(achados[0].linha).toBe(2);
  });

  it('aceita as variáveis, as contas entre elas e o que não é medida nem cor', () => {
    expect(foraDoSistemaVisual(`
      /* um comentário com #fff e 12px não conta */
      .a:hover, .b:not(.c) { color: var(--texto); background: transparent; border: var(--traco); fill: currentColor; }
      @media (max-width: 1240px) { .d { padding: 0 var(--e2); margin: calc(-1 * var(--e1)) auto 0; } }
      .e { font-size: var(--t-p); font: 600 var(--t-m)/1.4 var(--fonte); gap: var(--e-meio); width: 240px; top: 72px; }
      .f::after { content: 'red'; font-size: inherit; padding: 0; }`)).toEqual([]);
  });
});

describe('folha de estilo da bancada', () => {
  it('existe ao menos uma folha além das definições', () => {
    expect(folhasDaBancada().length).toBeGreaterThan(0);
  });

  it.each(folhasDaBancada().map((caminho) => [relative(BANCADA, caminho), caminho]))(
    '%s usa só as definições do sistema visual',
    (_nome, caminho) => {
      const achados = foraDoSistemaVisual(readFileSync(caminho, 'utf8'))
        .map(({ linha, propriedade, valor, motivo }) => `${linha}: ${propriedade}: ${valor} (${motivo})`);
      expect(achados).toEqual([]);
    },
  );
});
