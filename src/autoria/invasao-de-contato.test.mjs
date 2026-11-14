/* invasao-de-contato.test.mjs — o contato declarado autoriza o toque, não a invasão.
 *
 * As três fixtures são a mesma haste e o mesmo cilindro, com o contato declarado nas três: atravessando (reprova), pousada na tampa
 * (face contra face, passa) e com uma aresta sobre a tampa (passa). O contato declarado passava nas três.
 */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { contatosDaPeca, lerContatosDeclarados } from './contatos-da-peca.js';
import { TOLERANCIA_DE_INVASAO } from './invasao-de-contato.js';
import { descreverPeca } from './descrever-partes.js';

async function medir(nome, contatosExtra) {
  const mod = await import(`../../tools/modelar/fixtures/invasao/${nome}.js`);
  const receita = { meta: mod.meta, PASSOS: mod.PASSOS, ALIASES: mod.ALIASES, contatos: contatosExtra ?? mod.contatos };
  const { neutro } = executarReceita(receita);
  return { neutro, resultado: contatosDaPeca(neutro, receita) };
}

describe('invasão do contato declarado', () => {
  it('a haste que atravessa o cilindro reprova, dizendo o par de corpos e a profundidade', async () => {
    const { resultado } = await medir('haste-atravessa');
    expect(resultado.naoDeclarados).toEqual([]);
    expect(resultado.invasoes).toHaveLength(1);
    const [invasao] = resultado.invasoes;
    expect(invasao.par).toEqual(['cilindro', 'haste']);
    /* a haste (2 x 2) cruza o cilindro de raio 10 no meio da altura: o ponto da haste mais fundo fica a uns 9 da superfície do cilindro */
    expect(invasao.profundidade).toBeGreaterThan(8);
    expect(invasao.profundidade).toBeLessThan(10.1);
    expect(invasao.limite).toBe(TOLERANCIA_DE_INVASAO);
    expect(invasao.corpos.map((c) => c.indice)).toEqual([0, 0]);
    expect(invasao.corpos[1].caixa).toEqual({ min: [-20, 9, -1], max: [20, 11, 1] });
  });

  it('a mesma haste pousada na tampa só encosta e passa', async () => {
    const { resultado } = await medir('haste-tangente');
    expect(resultado.paresEmContato[0].estado).toBe('encostam');
    expect(resultado.invasoes).toEqual([]);
    expect(resultado.paresEmContato[0].invasao.profundidade).toBe(0);
  });

  it('a aresta sobre a face coplanar encosta e passa', async () => {
    const { resultado } = await medir('aresta-sobre-a-face');
    expect(resultado.paresEmContato[0].estado).toBe('encostam');
    expect(resultado.invasoes).toEqual([]);
  });

  it('o contato que declara `invasaoMaxima` admite a junta que afunda de propósito', async () => {
    const contatos = [{ par: ['cilindro', 'haste'], motivo: 'a haste é soldada passando pelo cilindro, de propósito', invasaoMaxima: 10 }];
    const { resultado } = await medir('haste-atravessa', contatos);
    expect(resultado.invasoes).toEqual([]);
    expect(resultado.paresEmContato[0].invasao.limite).toBe(10);
  });

  it('`invasaoMaxima` recusa o valor que não é número positivo, dizendo o recebido e o esperado', () => {
    const receita = { contatos: [{ par: ['a', 'b'], motivo: 'um motivo com mais de quinze letras', invasaoMaxima: -1 }] };
    expect(() => lerContatosDeclarados(receita, ['a', 'b'])).toThrow(/'invasaoMaxima' precisa ser um número maior que zero.*recebi -1/);
  });

  it('a relação entre partes do descrever confirma a invasão corpo a corpo', async () => {
    const atravessa = await medir('haste-atravessa');
    const tangente = await medir('haste-tangente');
    const relacao = (m) => descreverPeca(m.neutro).relacoes.find((r) => r.a === 'cilindro' && r.b === 'haste');
    expect(relacao(atravessa).tipo).toBe('interpenetra');
    expect(relacao(tangente).tipo).toBe('encosta');
  });
});

describe('o `descrever` com o contato declarado que invade', () => {
  async function estrito(nome) {
    const { descreverPecaReutilizavel } = await import('../../tools/modelar/descrever-peca.mjs');
    const modulo = await import(`../../tools/modelar/fixtures/invasao/${nome}.js`);
    return descreverPecaReutilizavel({ peca: nome, modulo, estrito: true });
  }

  it('reprova a haste que atravessa, com o recebido, o esperado e o comando', async () => {
    const r = await estrito('haste-atravessa');
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain('CONTATO(S) DECLARADO(S) EM QUE UMA PARTE INVADE A OUTRA');
    expect(r.stderr).toMatch(/cilindro ↔ haste: afunda [\d,]+ mm \(admite 0,1 mm\)/);
    expect(r.stderr).toContain('invasaoMaxima');
    expect(r.stderr).toContain('npm run descrever -- <peça> --partes=<a>,<b>');
  });

  it('aprova a haste pousada e a aresta sobre a face', async () => {
    for (const nome of ['haste-tangente', 'aresta-sobre-a-face']) {
      const r = await estrito(nome);
      expect(r.stderr).not.toContain('INVADE A OUTRA');
    }
  });
});
