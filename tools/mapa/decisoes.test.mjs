/* decisoes.test.mjs — o gate dos registros de decisão: a pasta do repositório passa, a lista gerada está em dia, e cada defeito
   que o gate deve pegar (formato inválido, lista desatualizada, marcador perdido, teto de palavras, substituto que não existe)
   é recusado dizendo o que corrigir; o registro substituído sai da lista. */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CAMINHO_README, conferirDecisoes, gerarDecisoes, gerarLista, lerRegistro, MARCADORES, PASTA_DOS_REGISTROS, RAIZ, TETO_DE_PALAVRAS,
} from './decisoes.mjs';

const temporarias = [];

function registro({ titulo = 'A regra vale', estado = 'em vigor', data = '2026-11-01', substitui = 'nada', extra = '' } = {}) {
  return [
    `# ${titulo}`, '',
    `Estado: ${estado}.`, `Decidido em: ${data}.`,
    'Origem: `docs/modelar/decisoes/README.md`, no commit `abc1234`.',
    `Substitui: ${substitui}.`, '',
    '## O que ficou decidido', `A regra é esta. ${extra}`, '',
    '## Por quê', 'Porque a medida disse.', '',
    '## Quando reabrir', 'A origem não dá condição.', '',
  ].join('\n');
}

const README_VAZIO = `# Decisões\n\n${MARCADORES[0]}\n${MARCADORES[1]}\n`;

function ambiente(arquivos = {}, readme = README_VAZIO) {
  const raiz = mkdtempSync(join(tmpdir(), 'modelar-decisoes-'));
  temporarias.push(raiz);
  mkdirSync(join(raiz, PASTA_DOS_REGISTROS), { recursive: true });
  writeFileSync(join(raiz, CAMINHO_README), readme);
  for (const [nome, texto] of Object.entries(arquivos)) writeFileSync(join(raiz, PASTA_DOS_REGISTROS, nome), texto);
  return raiz;
}

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('registros de decisão do repositório', () => {
  it('têm formato válido e a lista do README está em dia', () => {
    expect(conferirDecisoes({ raiz: RAIZ }).problemas).toEqual([]);
  });
});

describe('gate dos registros de decisão', () => {
  it('aceita a pasta em dia, com a lista gerada', () => {
    const raiz = ambiente({ '2026-11-01-regra.md': registro() });
    expect(gerarDecisoes({ raiz }).problemas).toEqual([]);
    expect(conferirDecisoes({ raiz }).problemas).toEqual([]);
    expect(readFileSync(join(raiz, CAMINHO_README), 'utf8')).toContain('- 2026-11-01: [A regra vale](registros/2026-11-01-regra.md)');
  });

  it('recusa a lista desatualizada e diz o comando que conserta', () => {
    const raiz = ambiente({ '2026-11-01-regra.md': registro() });
    expect(conferirDecisoes({ raiz }).problemas.join('\n')).toMatch(/desatualizada; rode `npm run decisoes:gerar`/);
  });

  it('lista em ordem de data, e a mais nova por último', () => {
    const raiz = ambiente({
      '2026-11-09-nova.md': registro({ titulo: 'Nova', data: '2026-11-09' }),
      '2026-10-01-velha.md': registro({ titulo: 'Velha', data: '2026-10-01' }),
    });
    gerarDecisoes({ raiz });
    const lista = readFileSync(join(raiz, CAMINHO_README), 'utf8');
    expect(lista.indexOf('Velha')).toBeGreaterThan(-1);
    expect(lista.indexOf('Velha')).toBeLessThan(lista.indexOf('Nova'));
  });

  it('tira da lista o registro substituído e mantém o que o substitui', () => {
    const raiz = ambiente({
      '2026-10-01-velha.md': registro({ titulo: 'Velha', data: '2026-10-01', estado: 'substituído por 2026-11-09-nova.md' }),
      '2026-11-09-nova.md': registro({ titulo: 'Nova', data: '2026-11-09', substitui: '2026-10-01-velha.md' }),
    });
    expect(gerarDecisoes({ raiz }).problemas).toEqual([]);
    const lista = readFileSync(join(raiz, CAMINHO_README), 'utf8');
    expect(lista).not.toContain('Velha');
    expect(lista).toContain('[Nova](registros/2026-11-09-nova.md)');
    expect(conferirDecisoes({ raiz }).problemas).toEqual([]);
  });

  it('diz que não há decisão em vigor quando todas foram substituídas ou não há registro', () => {
    expect(gerarLista([])).toContain('Nenhuma decisão em vigor.');
  });

  it('recusa substituído por registro que não existe', () => {
    const raiz = ambiente({ '2026-11-01-regra.md': registro({ estado: 'substituído por 2026-12-01-sumiu.md' }) });
    expect(conferirDecisoes({ raiz }).problemas.join('\n')).toMatch(/2026-12-01-sumiu\.md, que não existe/);
  });

  it('recusa o formato inválido, um defeito por vez', () => {
    const defeitos = [
      ['título ausente', registro().replace('# A regra vale', 'A regra vale'), /primeira linha/],
      ['estado fora do vocabulário', registro({ estado: 'ativo' }), /Estado: em vigor/],
      ['data inexistente', registro({ data: "2026-02-31" }), /Decidido em/],
      ['origem sem commit', registro().replace(', no commit `abc1234`', ''), /Origem/],
      ['substitui ausente', registro().replace('Substitui: nada.', ''), /Substitui/],
      ['seção faltando', registro().replace('## Quando reabrir\nA origem não dá condição.\n', ''), /as seções precisam ser/],
      ['seções fora de ordem', registro().replace('## Por quê', '## Quando reabrir').replace('## Quando reabrir\nA origem', '## Por quê\nA origem'), /as seções precisam ser/],
      ['seção vazia', registro().replace('Porque a medida disse.', ''), /"Por quê" está vazia/],
      ['negrito', registro({ extra: 'Isto é **forte**.' }), /sem negrito/],
      ['acima do teto', registro({ extra: 'palavra '.repeat(TETO_DE_PALAVRAS) }), new RegExp(`o teto é ${TETO_DE_PALAVRAS}`)],
    ];
    for (const [nome, texto, esperado] of defeitos) {
      const { problemas } = lerRegistro('2026-11-01-regra.md', texto, new Set(['2026-11-01-regra.md']));
      expect(problemas.join('\n'), nome).toMatch(esperado);
    }
  });

  it('recusa nome fora do padrão e data do nome diferente da decisão', () => {
    expect(lerRegistro('Regra.md', registro(), new Set()).problemas.join('\n')).toMatch(/AAAA-MM-DD-assunto-curto\.md/);
    expect(lerRegistro('2026-11-02-regra.md', registro(), new Set()).problemas.join('\n')).toMatch(/difere de "Decidido em"/);
  });

  it('não grava a lista enquanto houver registro inválido', () => {
    const raiz = ambiente({ '2026-11-01-regra.md': registro({ estado: 'ativo' }) });
    expect(gerarDecisoes({ raiz }).problemas.length).toBeGreaterThan(0);
    expect(readFileSync(join(raiz, CAMINHO_README), 'utf8')).toBe(README_VAZIO);
  });

  it('recusa o README sem os marcadores', () => {
    const raiz = ambiente({ '2026-11-01-regra.md': registro() }, '# Decisões\n');
    expect(conferirDecisoes({ raiz }).problemas.join('\n')).toMatch(/perdeu um marcador/);
    expect(gerarDecisoes({ raiz }).problemas.join('\n')).toMatch(/perdeu um marcador/);
  });
});
