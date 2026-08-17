/* Contrato de medição headless exercitado por fixtures de capacidade.
 * O catálogo publicado pode estar vazio; a régua recebe um módulo explícito. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — serviço JavaScript exercitado pelo contrato headless.
import { caixaDaParte, caixasPorParte, corposDaParte, descreverPeca, formatarDescricao, portasPublicadas, relacaoEntreCaixas } from '../../src/autoria/descrever-partes.js';
// @ts-expect-error — serviço JavaScript exercitado pelo contrato headless.
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';
// @ts-expect-error — CLI MJS exercitada pelo contrato público.
import { descreverPecaReutilizavel } from './descrever-peca.mjs';

const doisCubos = ({ dx = 0, ladoA = 1, ladoB = 0.4 } = {}) => nucleo([
  ['cubo', { origemId: 1, lado: ladoA }],
  ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['cubo', { origemId: 2, lado: ladoB }],
  ['transladar', { d: [dx, 0, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'tampa', sel: { origem: { op: 'cubo', id: 2 } } }],
], {}, {}, {}, null, []);

const hierarquia = () => nucleo([
  ['cubo', { origemId: 10, lado: 1 }],
  ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 10 } } }],
  ['cubo', { origemId: 11, lado: 0.2 }],
  ['parte', { nome: 'pino', pai: 'corpo', sel: { origem: { op: 'cubo', id: 11 } } }],
], {}, {}, {}, null, []);

const comPortas = () => nucleo([
  ['cilindro', { origemId: 20, raio: 0.2, altura: 0.5, lados: 8 }],
  ['parte', { nome: 'eixo', sel: { origem: { op: 'cilindro', id: 20 } } }],
  ['publicarPorta', { nome: 'assentoDoEixo', de: { op: 'cilindro', id: 20, tampa: 'topo' } }],
  ['cubo', { origemId: 21, lado: 0.3 }],
  ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 21 } } }],
  ['publicarPorta', { id: 'baseDoBloco', rotulo: 'Base do bloco', de: { op: 'cubo', id: 21 } }],
], {}, {}, {}, null, []);

describe('descrever-partes — régua headless', () => {
  it('mede faces, caixas e corpos da fixture, sem depender de catálogo', () => {
    const neutro = doisCubos({ dx: 0.7 });
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    expect(facesSemParte).toEqual([]);
    expect([...caixas.keys()]).toEqual(['base', 'tampa']);
    expect(caixaDaParte(neutro, 'base').faces).toBe(6);
    expect(corposDaParte(neutro, 'tampa')).toHaveLength(1);
  });

  it('classifica folga, contato e interpenetração com números estáveis', () => {
    const a = { nome: 'a', min: [0, 0, 0], max: [1, 1, 1] };
    expect(relacaoEntreCaixas(a, { nome: 'b', min: [1.5, 0, 0], max: [2, 1, 1] }))
      .toMatchObject({ tipo: 'folga', eixo: 'x', distancia: 0.5 });
    expect(relacaoEntreCaixas(a, { nome: 'b', min: [1, 0, 0], max: [2, 1, 1] }))
      .toMatchObject({ tipo: 'encosta', eixo: 'x', distancia: 0 });
    expect(relacaoEntreCaixas(a, { nome: 'b', min: [0.5, 0, 0], max: [1.5, 1, 1] }))
      .toMatchObject({ tipo: 'interpenetra', eixo: 'x', distancia: 0.5 });
  });

  it('a relação entre partes e caixas usa a mesma classificação', () => {
    for (const dx of [0.7, 0.5, 0.2, 0]) {
      const neutro = doisCubos({ dx });
      const descricao = descreverPeca(neutro);
      const caixas = caixasPorParte(neutro).caixas;
      const relacao = relacaoEntreCaixas(caixas.get('base'), caixas.get('tampa'));
      expect(descricao.relacoes[0]).toMatchObject({ tipo: relacao.tipo, eixo: relacao.eixo, distancia: relacao.distancia });
    }
  });

  it('recusa consulta inválida em vez de devolver medição vazia', () => {
    const neutro = doisCubos();
    expect(() => caixaDaParte(neutro, 'ausente')).toThrow(/não tem parte/);
    expect(() => descreverPeca(neutro, { partes: [] })).toThrow(/lista de partes vazia/);
    expect(() => descreverPeca(neutro, { partes: ['base', 'base'] })).toThrow(/mais de uma vez/);
    expect(() => descreverPeca(neutro, { tolerancia: -1 })).toThrow(/tolerância/);
  });

  it('é determinística e a ordenação não depende do idioma do processo', () => {
    const primeiro = formatarDescricao(descreverPeca(doisCubos()), { peca: 'fixture' });
    const segundo = formatarDescricao(descreverPeca(doisCubos()), { peca: 'fixture' });
    expect(primeiro).toBe(segundo);
    expect(primeiro).toContain('peça: fixture');
    expect(descreverPeca(doisCubos(), { partes: ['tampa', 'base'] }).partes.map((p: any) => p.nome))
      .toEqual(['base', 'tampa']);
  });

  it('expõe hierarquia sem reparenting e permite consultar subárvore', () => {
    const descricao = descreverPeca(hierarquia(), { partes: ['pino'] });
    expect(descricao.hierarquia).toContainEqual({ nome: 'corpo', pai: null });
    expect(descricao.hierarquia).toContainEqual({ nome: 'pino', pai: 'corpo' });
    expect(nomesDaSubarvore(descricao.hierarquia, 'corpo')).toEqual(['corpo', 'pino']);
  });

  it('preserva portas publicadas com ID, rótulo, origem e passo', () => {
    expect(portasPublicadas(comPortas())).toEqual([
      { id: 'assentoDoEixo', rotulo: 'assentoDoEixo', op: 'cilindro', origemId: 20, recorte: 'tampa=topo', origem: 'cilindro:20 tampa=topo', passo: 2 },
      { id: 'baseDoBloco', rotulo: 'Base do bloco', op: 'cubo', origemId: 21, recorte: '', origem: 'cubo:21', passo: 5 },
    ]);
    expect(portasPublicadas(doisCubos())).toEqual([]);
  });

  it('o serviço reutilizável mede módulo explícito sem consultar o acervo', async () => {
    const modulo = { PASSOS: [['cubo', { origemId: 1, lado: 1 }], ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }]] };
    const resultado = await descreverPecaReutilizavel({ peca: 'fixture', modulo });
    expect(resultado).toMatchObject({ ok: true, codigo: 0, stderr: '' });
    expect(resultado.stdout).toContain('partes: 1   faces: 6');
  });
});
