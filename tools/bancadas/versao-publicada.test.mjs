/* versao-publicada.test.mjs — prova que a versão na tela diz a verdade sobre a
   construção, inclusive quando não há git, não há commit ou a árvore está suja. */
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { descreverVersao, lerVersaoPublicada, SEM_VERSAO } from './versao-publicada.mjs';

const fingir = (respostas) => (comando) => {
  if (!(comando in respostas)) throw new Error(`comando inesperado: ${comando}`);
  const valor = respostas[comando];
  if (valor instanceof Error) throw valor;
  return valor;
};

describe('versão publicada da bancada', () => {
  it('lê commit, data e árvore limpa', () => {
    const versao = lerVersaoPublicada({
      executar: fingir({
        'git rev-parse --short HEAD': 'a53d816\n',
        'git log -1 --format=%cI': '2026-09-11T19:38:30+00:00\n',
        'git status --porcelain': '\n',
      }),
    });
    assert.deepEqual(versao, { commit: 'a53d816', data: '2026-09-11T19:38:30+00:00', sujo: false });
    assert.equal(descreverVersao(versao), 'a53d816 · 2026-09-11');
  });

  it('marca a árvore suja, porque aí o commit sozinho mentiria', () => {
    const versao = lerVersaoPublicada({
      executar: fingir({
        'git rev-parse --short HEAD': 'a53d816',
        'git log -1 --format=%cI': '2026-09-11T19:38:30+00:00',
        'git status --porcelain': ' M src/bancada/main.js\n',
      }),
    });
    assert.equal(versao.sujo, true);
    assert.match(descreverVersao(versao), /alterações locais$/);
  });

  it('sem git, ou fora de repositório, devolve desconhecida em vez de quebrar', () => {
    const versao = lerVersaoPublicada({
      executar: fingir({ 'git rev-parse --short HEAD': new Error('command not found: git') }),
    });
    assert.deepEqual(versao, { commit: SEM_VERSAO, data: null, sujo: false });
    assert.equal(descreverVersao(versao), SEM_VERSAO);
  });

  it('sem executor nenhum também devolve desconhecida', () => {
    assert.equal(lerVersaoPublicada().commit, SEM_VERSAO);
  });

  it('commit sem data ainda descreve o commit', () => {
    assert.equal(descreverVersao({ commit: 'abc1234', data: null, sujo: false }), 'abc1234');
  });
});
