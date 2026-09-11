/* material-da-peca.test.mjs — o retrato do espalhamento, antes de arrumar.
 *
 * Este arquivo existe para que "ficou mais organizado" deixe de ser opinião. A
 * bicicleta hoje tem material em QUATRO árvores do repositório, e dois desses
 * arquivos pertencem a ela apenas por convenção de nome: a foto que a bancada
 * sobrepõe, citada só por estado local não versionado, e o gerador de prancha.
 *
 * Quando a peça passar a morar num lugar só, este teste muda de resposta, e é
 * esse o ponto — ele obriga a atualização em vez de deixar a melhora sem prova.
 */
import { describe, expect, it } from 'vitest';
import { materialDaPeca, PAPEIS } from '../../src/autoria/material-da-peca.js';
import { porConvencao, retratoDaPeca } from './material-da-peca.mjs';

describe('material de uma peça', () => {
  it('a bicicleta mora numa árvore, e o gerador de prancha na outra', async () => {
    /* O retrato de 2026-09-11, antes da pasta da peça, era de quatro árvores:
       `docs/mecanifica`, `prototipos/procedural`, `public` e `tools`. Duas
       sumiram — a foto saiu de `public/` e as referências saíram de `docs/`.
       A que resta fora é `tools/`, e é assim de propósito: o gerador de prancha
       é código, e o plano excluiu mover ferramenta. */
    const retrato = await retratoDaPeca('bicicleta-quadro');
    expect(retrato.arvores).toEqual(['prototipos/procedural', 'tools']);
    expect(retrato.espalhamento).toBe(2);
  });

  it('todo material da peça é declarado, menos a ferramenta que é código', async () => {
    const retrato = await retratoDaPeca('bicicleta-quadro');
    const soltos = retrato.material.filter((m) => !m.declarado);
    expect(soltos.map((m) => m.papel)).toEqual(['ferramenta']);
    /* A foto que a bancada sobrepõe é declarada pelo plano desde que saiu de
       `public/`: antes disso o único arquivo que a citava não era versionado. */
    const declarados = retrato.material.filter((m) => m.declarado).map((m) => m.caminho);
    expect(declarados).toContain('prototipos/procedural/v3/pecas/bicicleta-quadro/referencias/sobreposicao.jpg');
    expect(declarados).toContain('prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js');
  });

  it('o que a receita declara entra como declarado, e a ordem não muda o retrato', () => {
    const receita = {
      PLANO: {
        objeto: 'peça de ensaio com duas referências declaradas',
        referencias: ['docs/a.png', 'docs/b.png'],
        escala: { medida: 'lado do cubo', milimetros: 400 },
        partes: [{ nome: 'unica', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' }],
        criteriosDeReprovacao: ['parte ausente da peça entregue'],
      },
    };
    const um = materialDaPeca({ peca: 'ensaio', caminhoReceita: 'prototipos/p/ensaio.js', receita });
    const outro = materialDaPeca({
      peca: 'ensaio',
      caminhoReceita: 'prototipos/p/ensaio.js',
      receita: { PLANO: { ...receita.PLANO, referencias: ['docs/b.png', 'docs/a.png'] } },
    });
    expect(um).toEqual(outro);
    expect(um.material.every((m) => m.declarado)).toBe(true);
  });

  it('peça sem plano tem só a receita, e isso não é erro', () => {
    const retrato = materialDaPeca({ peca: 'ensaio', caminhoReceita: 'prototipos/p/ensaio.js', receita: {} });
    expect(retrato.material).toHaveLength(1);
    expect(retrato.espalhamento).toBe(1);
  });

  it('o papel vem de lista fechada, e caminho vazio é recusado', () => {
    const base = { peca: 'ensaio', caminhoReceita: 'prototipos/p/ensaio.js', receita: {} };
    expect(() => materialDaPeca({ ...base, extras: [{ papel: 'foto', caminho: 'x.png' }] }))
      .toThrow(/não existe/);
    expect(() => materialDaPeca({ ...base, extras: [{ papel: 'rodada', caminho: '' }] }))
      .toThrow(/sem caminho/);
    expect(PAPEIS).toContain('sobreposicao');
    expect(() => materialDaPeca({ caminhoReceita: 'x.js' })).toThrow(/de que peça/);
  });

  it('a busca por convenção não inventa ligação para peça que não existe', () => {
    expect(porConvencao('peca-que-nunca-existiu')).toEqual([]);
  });
});
