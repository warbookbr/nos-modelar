/* contatos-declarados.test.js — a opção só de passos crus executada uma vez, com o mesmo neutro do caminho de antes, e o contato
 * declarado na opção (`contatos`), que vale para as partes de passos crus: declarado sai declarado com o motivo, a relação que a
 * malha não dá é acusada e a parte que não existe é recusada. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { neutroCanonico } from '../../../procedural/nucleo/nucleo.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { execucoesDoNucleo, receitaDaOpcao } from '../src/opcao.js';
import { passoEmMetro } from '../src/milimetro.js';
import { relatoDeContatos, textoDoRelato } from '../src/contatos.js';

const hash = (n) => createHash('sha256').update(JSON.stringify(neutroCanonico(n))).digest('hex');
const cuboCru = (id, nome, larg, centro) => [
  ['cubo', { origemId: id, larg, alt: 100, prof: 100 }],
  ['transladar', { d: centro, sel: { origem: { op: 'cubo', id } } }],
  ['parte', { nome, sel: { origem: { op: 'cubo', id } } }],
];
/* dois cubos de passos crus: "capo" de 0 a 200 em x e "tampa" de 150 a 250, que se atravessam 50 mm, e "pino", a 30 mm do capo em z */
const PASSOS = [...cuboCru(1, 'capo', 200, [100, 0, 0]), ...cuboCru(2, 'tampa', 100, [200, 0, 0]), ...cuboCru(3, 'pino', 50, [100, 0, 130])];
const relato = (opcao) => { const r = receitaDaOpcao(opcao); return relatoDeContatos(r.neutro, r.formas, { contatos: r.contatos }); };
const recusa = (opcao) => { try { receitaDaOpcao(opcao); return null; } catch (e) { return e.message; } };

describe('a opção só de passos crus', () => {
  it('executa a receita uma vez e dá o neutro, as partes e a receita da execução dos mesmos passos', () => {
    const antes = execucoesDoNucleo();
    const r = receitaDaOpcao({ titulo: 't', passos: PASSOS }, { nome: 'n' });
    expect(execucoesDoNucleo() - antes).toBe(1);
    /* o caminho de antes: os passos crus pelo executor, como a primeira das duas execuções fazia */
    const { neutro } = executarReceita({ meta: { nome: 'passos-crus' }, PASSOS: PASSOS.map((p) => passoEmMetro(p, 'teste')) });
    expect(hash(r.neutro)).toBe(hash(neutro));
    expect(r.partes).toEqual(['capo', 'tampa', 'pino']);
    expect(r.receita).toEqual({ meta: { nome: 'n' }, PASSOS: PASSOS.map((p) => passoEmMetro(p, 'teste')) });
  });

  it('a opção com passos e formas continua executando os crus antes, para o atalho achar as partes deles', () => {
    const opcao = { titulo: 't', passos: PASSOS, formas: [{ id: 'trinco', op: 'cubo', args: { lado: 20 }, sobre: 'capo' }] };
    const antes = execucoesDoNucleo();
    const r = receitaDaOpcao(opcao);
    /* os crus, a forma sozinha e a receita inteira */
    expect(execucoesDoNucleo() - antes).toBe(3);
    expect(r.partes).toEqual(['trinco', 'capo', 'tampa', 'pino']);
    expect(r.formas[0].caixa.min[1]).toBeCloseTo(100, 9);
    expect(hash(r.neutro)).toBe(hash(executarReceita(r.receita).neutro));
  });
});

describe('o contato declarado na opção', () => {
  it('a travessia entre partes de passos crus sai não declarada sem o campo, e declarada com o motivo com ele', () => {
    const sem = relato({ titulo: 't', passos: PASSOS });
    expect(sem.naoDeclaradas.map((p) => `${p.a}|${p.b}`)).toEqual(['capo|tampa']);
    expect(textoDoRelato(sem)).toMatch(/atravessa {2}capo e tampa: 50,000 mm pelo eixo x \(NÃO DECLARADA\)/);
    const com = relato({ titulo: 't', passos: PASSOS, contatos: [{ par: ['tampa', 'capo'], relacao: 'atravessa', motivo: 'a tampa assenta no rebaixo do capô' }] });
    expect(com.naoDeclaradas).toEqual([]);
    expect(com.faltam).toEqual([]);
    expect(textoDoRelato(com)).toMatch(/atravessa {2}capo e tampa: 50,000 mm pelo eixo x \(declarada: a tampa assenta no rebaixo do capô\)/);
  });

  it('a relação declarada que a malha não dá é acusada, com o que a malha deu', () => {
    const r = relato({ titulo: 't', passos: PASSOS, contatos: [
      { par: ['capo', 'tampa'], relacao: 'atravessa', motivo: 'rebaixo' },
      { par: ['capo', 'pino'], relacao: 'encosta', motivo: 'o pino encosta no capô' },
    ] });
    expect(r.faltam).toEqual([{ a: 'capo', b: 'pino', esperado: 'encosta', dado: 'folga', motivo: 'o pino encosta no capô' }]);
    expect(textoDoRelato(r)).toMatch(/ESPERADO E NÃO DADO: capo e pino, esperado encosta, dado folga de 30,000 mm pelo eixo z \(declarado: o pino encosta no capô\)/);
  });

  it('vale também entre parte de passo cru e forma, e conflita com o contato da forma que diz outra coisa', () => {
    const forma = { id: 'trinco', op: 'cubo', args: { lado: 20 }, sobre: 'capo' };
    const ok = relato({ titulo: 't', passos: PASSOS, formas: [forma], contatos: [{ par: ['trinco', 'capo'], relacao: 'encosta', motivo: 'apoiado' }] });
    expect(ok.encostam.find((p) => p.a === 'capo' && p.b === 'trinco')).toMatchObject({ esperado: 'encosta', confere: true, motivo: 'apoiado' });
    const conflito = relato({ titulo: 't', passos: PASSOS, formas: [{ ...forma, contato: { capo: 'folga' } }], contatos: [{ par: ['trinco', 'capo'], relacao: 'encosta', motivo: 'apoiado' }] });
    expect(conflito.faltam.map((f) => f.esperado)).toContain('conflito');
  });

  it('recusa a parte que não existe e o contato fora do formato', () => {
    expect(recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'tamp'], relacao: 'atravessa', motivo: 'x' }] })).toMatch(/cita a parte "tamp", que não está na malha desta opção/);
    expect(recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'tampa'], relacao: 'interpenetra', motivo: 'x' }] })).toMatch(/"relacao" é encosta, atravessa, folga/);
    expect(recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'tampa'], relacao: 'atravessa' }] })).toMatch(/"motivo"/);
    expect(recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo'], relacao: 'atravessa', motivo: 'x' }] })).toMatch(/"par"/);
    expect(recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'tampa'], relacao: 'atravessa', motivo: 'x', lado: '+x' }] })).toMatch(/campo "lado"/);
    expect(recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'tampa'], relacao: 'atravessa', motivo: 'x' }, { par: ['tampa', 'capo'], relacao: 'folga', motivo: 'y' }] })).toMatch(/já foi declarado/);
  });

  it('a relação folga aceita folga: { esperada, tolerancia }, que sai nos contatos da receita e não muda o relato', () => {
    const folga = { esperada: 30, tolerancia: 0.2 };
    const com = receitaDaOpcao({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'pino'], relacao: 'folga', motivo: 'vão de projeto', folga }] });
    expect(com.contatos).toEqual([{ par: ['capo', 'pino'], relacao: 'folga', motivo: 'vão de projeto', folga }]);
    const sem = receitaDaOpcao({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'pino'], relacao: 'folga', motivo: 'vão de projeto' }] });
    expect(sem.contatos).toEqual([{ par: ['capo', 'pino'], relacao: 'folga', motivo: 'vão de projeto' }]);
    expect(relatoDeContatos(com.neutro, com.formas, { contatos: com.contatos })).toEqual(relatoDeContatos(sem.neutro, sem.formas, { contatos: sem.contatos }));
  });

  it('recusa a folga fora do formato ou com outra relação', () => {
    const com = (relacao, folga) => recusa({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'pino'], relacao, motivo: 'x', folga }] });
    expect(com('encosta', { esperada: 4, tolerancia: 0.1 })).toMatch(/"folga" só vale com "relacao": "folga"/);
    expect(com('folga', { esperada: 0, tolerancia: 0.1 })).toMatch(/"folga.esperada"/);
    expect(com('folga', { esperada: 4, tolerancia: -1 })).toMatch(/"folga.tolerancia"/);
    expect(com('folga', { esperada: 4, tolerancia: 0.1, lado: 1 })).toMatch(/"folga" é \{ esperada, tolerancia, degrau\? \}/);
    expect(com('folga', { esperada: 4, tolerancia: 0.1, degrau: -1 })).toMatch(/"folga.degrau"/);
    expect(com('folga', 4)).toMatch(/"folga" é \{ esperada, tolerancia, degrau\? \}/);
  });

  it('a folga aceita o degrau máximo do par, e a opção aceita apoia: [{ parte, motivo }] com a parte na malha', () => {
    const folga = { esperada: 30, tolerancia: 0.2, degrau: 1.5 };
    const r = receitaDaOpcao({ titulo: 't', passos: PASSOS, contatos: [{ par: ['capo', 'pino'], relacao: 'folga', motivo: 'vão', folga }], apoia: [{ parte: 'pino', motivo: 'preso por fora da malha' }] });
    expect(r.contatos[0].folga).toEqual(folga);
    expect(r.apoia).toEqual([{ parte: 'pino', motivo: 'preso por fora da malha' }]);
    expect(receitaDaOpcao({ titulo: 't', passos: PASSOS }).apoia).toEqual([]);
    expect(recusa({ titulo: 't', passos: PASSOS, apoia: [{ parte: 'nada', motivo: 'x' }] })).toMatch(/"apoia" cita a parte "nada"/);
    expect(recusa({ titulo: 't', passos: PASSOS, apoia: [{ parte: 'pino' }] })).toMatch(/"motivo"/);
    expect(recusa({ titulo: 't', passos: PASSOS, apoia: [{ parte: 'pino', motivo: 'x' }, { parte: 'pino', motivo: 'y' }] })).toMatch(/já foi declarada/);
    expect(recusa({ titulo: 't', passos: PASSOS, apoia: 'pino' })).toMatch(/"apoia" é uma lista/);
  });
});
