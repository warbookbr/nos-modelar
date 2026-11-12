/* encosto-da-peca.test.mjs — uma tolerância de "encosta" só para a peça, e a distância do par declarado que não acontece (atrito 5 do RECEITA.md do sedã).
 *
 * O relato de contatos do esboço media o toque a 1 µm, o `descrever` a 1 nm, e a declaração de contato aceitava no máximo 0,1 µm: o lábio do arco da frente do sedã
 * assenta na caixa de roda a 0,315 µm (o arredondamento de Float32 de uma booleana numa peça de 1 m), e o par era `encosta` no esboço e "declarado que não acontece"
 * na receita, sem a mensagem dizer a distância. Aqui, dois prismas de 0,1 m com a fresta de 0,3 µm (encosta, nas duas medidas) e de 3 mm (não encosta, e a mensagem
 * diz 3,000000 mm). Sem domínio de objeto. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { TOLERANCIA_DE_ENCOSTO_DA_PECA } from './contato-de-solidos.js';
import { TOLERANCIA_CONTATO_DE_PECA, contatosDaPeca } from './contatos-da-peca.js';
import { TOLERANCIA_CONTATO, descreverPeca } from './descrever-partes.js';
import { TOLERANCIA_DO_RELATO_M } from '../../modulos/esboco-nucleo/src/contatos.js';

const prisma = (id, x0, x1) => ['extrusao', { origemId: id, eixo: 'y', altura: 0.05, em: [0, 0, 0], perfil: [[x0, 0], [x1, 0], [x1, 0.1], [x0, 0.1]] }];
const receita = (fresta) => ({
  meta: { nome: `encosto-${fresta}` },
  PASSOS: [prisma(1, 0, 0.1), prisma(2, 0.1 + fresta, 0.2 + fresta),
    ['parte', { nome: 'a', sel: { origem: { op: 'extrusao', id: 1 } } }], ['parte', { nome: 'b', sel: { origem: { op: 'extrusao', id: 2 } } }]],
  contatos: [{ par: ['a', 'b'], motivo: 'as duas peças se tocam pela face comum, a mesma do desenho' }],
});

describe('a tolerância de encosto do contato declarado é uma só', () => {
  it('o relato do esboço e os contatos declarados do descrever usam a mesma, de 1 µm, e a detecção do não declarado segue em 1 nm', () => {
    expect(TOLERANCIA_DE_ENCOSTO_DA_PECA).toBe(1e-6);
    expect(TOLERANCIA_DO_RELATO_M).toBe(TOLERANCIA_DE_ENCOSTO_DA_PECA);
    expect(TOLERANCIA_CONTATO_DE_PECA).toBe(1e-9);
    expect(TOLERANCIA_CONTATO).toBe(1e-9);
  });

  it('a fresta de 0,3 µm confirma o contato declarado, no relato do esboço e no descrever, e não cria contato não declarado', () => {
    const r = receita(3e-7);
    const { neutro } = executarReceita(r);
    const c = contatosDaPeca(neutro, r);
    expect(c.paresEmContato.map((p) => p.par.join(' '))).toEqual(['a b']);
    expect(c.declaradosSemContato).toEqual([]);
    expect(descreverPeca(neutro, { tolerancia: TOLERANCIA_DO_RELATO_M }).relacoes.find((x) => x.a === 'a' && x.b === 'b').tipo).toBe('encosta');
    /* sem a declaração o par segue livre: a detecção do contato não declarado é a de 1 nm, para as peças prontas do acervo não ganharem contato */
    const sem = contatosDaPeca(neutro, { ...r, contatos: [] });
    expect(sem.paresEmContato).toEqual([]);
    expect(sem.naoDeclarados).toEqual([]);
  });

  it('a fresta de 3 mm não encosta, e o par declarado diz a distância medida', async () => {
    const r = receita(3e-3);
    const { neutro } = executarReceita(r);
    const c = contatosDaPeca(neutro, r);
    expect(c.paresEmContato).toEqual([]);
    expect(c.declaradosSemContato).toHaveLength(1);
    expect(c.declaradosSemContato[0].distancia).toBeCloseTo(3e-3, 9);
    const { descreverPecaReutilizavel } = await import('../../tools/modelar/descrever-peca.mjs');
    const d = await descreverPecaReutilizavel({ peca: 'encosto-3mm', modulo: r });
    expect(d.codigo).toBe(1);
    expect(d.stderr).toContain('CONTATO(S) DECLARADO(S) QUE NÃO ACONTECEM');
    expect(d.stderr).toContain('as malhas ficam a 3,000000 mm uma da outra (a tolerância de encosto é 0,001 mm)');
  });

  it('o par longe demais diz "a mais de" com o limite, e o sólido inconclusivo não ganha campo', () => {
    const r = receita(0.5);
    const { neutro } = executarReceita(r);
    const [d] = contatosDaPeca(neutro, r).declaradosSemContato;
    expect(d.distancia).toBeUndefined();
    expect(d.maisLongeQue).toBeGreaterThan(0);
    expect(d.maisLongeQue).toBeLessThan(0.5);
  });
});
