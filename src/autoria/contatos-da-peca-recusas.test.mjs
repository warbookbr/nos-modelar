/* contatos-da-peca-recusas.test.mjs — cada `throw` de entrada de contatos-da-peca.js com a entrada ruim, e os campos da saída que nenhum outro teste lia.
   A revisão das verificações (2026-11-13) tirou 6 `throw` desse arquivo, um a um, sem que nenhum teste reprovasse, e mudou o tamanho mínimo do
   motivo, o sinal do limite de vizinhança, o contador de pares, a versão do formato e o desempate por método sem que nenhum teste reprovasse. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import {
  FORMATO_CONTATOS_DA_PECA,
  MINIMO_DO_MOTIVO,
  PENETRACAO_RELATIVA_PADRAO,
  TOLERANCIA_PROPRIA_MAXIMA,
  TOLERANCIA_PROPRIA_MINIMA,
  VERSAO_CONTATOS_DA_PECA,
  contatosDaPeca,
  lerContatosDeclarados,
  solidosPorParte,
} from './contatos-da-peca.js';

const MOTIVO = 'motivo suficientemente longo';
const PARTES = ['a', 'b'];
const cubo = (id, nome, lado, em = [0, 0, 0]) => [
  ['cubo', { origemId: id, larg: lado[0], alt: lado[1], prof: lado[2] }],
  ...(em.some((c) => c !== 0) ? [['transladar', { d: em, sel: { origem: { op: 'cubo', id } } }]] : []),
  ['parte', { nome, sel: { origem: { op: 'cubo', id } } }],
];
const neutroDe = (passos) => executarReceita({ meta: { nome: 'prova' }, PASSOS: passos.flat() }).neutro;

describe('solidosPorParte: recusas', () => {
  it('neutro sem V e F, ou com V e F que não são mapas, recusa com TypeError', () => {
    for (const ruim of [null, undefined, {}, { V: new Map() }, { V: new Map(), F: {} }, { V: {}, F: new Map() }]) {
      expect(() => solidosPorParte(ruim)).toThrow(TypeError);
      expect(() => solidosPorParte(ruim)).toThrow(/neutro precisa ter V e F/);
    }
  });

  it('parte que não é texto recusa nomeando a face e o tipo, e parte ausente só conta em facesSemParte', () => {
    const V = new Map([[1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]]]);
    const face = (id, parte) => [id, { id, vs: [1, 2, 3], parte }];
    expect(() => solidosPorParte({ V, F: new Map([face(7, 5)]) })).toThrow(/face 7 tem parte de tipo number; identidade de parte precisa ser texto/);
    expect(() => solidosPorParte({ V, F: new Map([face(8, { nome: 'x' })]) })).toThrow(/tipo object/);
    for (const semParte of [undefined, null, '']) {
      const r = solidosPorParte({ V, F: new Map([face(9, semParte)]) });
      expect(r.facesSemParte).toBe(1);
      expect(r.solidos).toEqual([]);
    }
  });
});

describe('lerContatosDeclarados: recusas', () => {
  const ler = (contatos, partes = PARTES) => lerContatosDeclarados({ contatos }, partes);
  const unico = (mapa) => [...mapa.values()][0];

  it("'contatos' que não é lista recusa, e null ou ausente valem lista vazia", () => {
    for (const ruim of [{}, 'a', 3, true]) expect(() => ler(ruim)).toThrow(/'contatos' precisa ser lista/);
    expect(ler(null).size).toBe(0);
    expect(ler(undefined).size).toBe(0);
    expect(lerContatosDeclarados(null, PARTES).size).toBe(0);
    expect(ler([]).size).toBe(0);
  });

  it('item que não é objeto recusa nomeando o índice', () => {
    for (const ruim of [null, 'x', 3, [['a', 'b']]]) expect(() => ler([ruim])).toThrow('contatos[0] precisa ser objeto.');
    expect(() => ler([{ par: PARTES, motivo: MOTIVO }, null])).toThrow('contatos[1] precisa ser objeto.');
  });

  it("'par' precisa ser dois nomes de parte não vazios", () => {
    for (const par of [undefined, 'ab', ['a'], ['a', 'b', 'a'], ['a', ''], ['', 'b'], ['a', 3], [1, 2], { 0: 'a', 1: 'b', length: 2 }]) {
      expect(() => ler([{ par, motivo: MOTIVO }])).toThrow(/'par' precisa ser \[nomeA, nomeB\], dois nomes de parte não vazios/);
    }
  });

  it('o motivo mínimo é MINIMO_DO_MOTIVO caracteres: um a menos recusa, exatamente o mínimo vale, e o espaço nas pontas não conta', () => {
    const com = (n) => 'x'.repeat(n);
    expect(() => ler([{ par: PARTES, motivo: com(MINIMO_DO_MOTIVO - 1) }])).toThrow(/pelo menos 15 caracteres/);
    expect(ler([{ par: PARTES, motivo: com(MINIMO_DO_MOTIVO) }]).size).toBe(1);
    expect(() => ler([{ par: PARTES, motivo: `  ${com(MINIMO_DO_MOTIVO - 1)}  ` }])).toThrow(/pelo menos/);
    expect(unico(ler([{ par: PARTES, motivo: `  ${com(MINIMO_DO_MOTIVO)}  ` }])).motivo).toBe(com(MINIMO_DO_MOTIVO));
    for (const ruim of [undefined, null, 15, ['x'.repeat(20)]]) expect(() => ler([{ par: PARTES, motivo: ruim }])).toThrow(/'motivo' precisa dizer POR QUE/);
  });

  it("'toleranciaNumerica' fora da faixa [mínimo, máximo] ou que não é número recusa, e os extremos valem", () => {
    const com = (toleranciaNumerica) => ler([{ par: PARTES, motivo: MOTIVO, toleranciaNumerica }]);
    for (const ruim of [TOLERANCIA_PROPRIA_MINIMA / 10, TOLERANCIA_PROPRIA_MAXIMA * 10, NaN, Infinity, '1e-7', null, 0]) {
      expect(() => com(ruim)).toThrow(/'toleranciaNumerica' precisa ser um número de/);
    }
    expect(unico(com(TOLERANCIA_PROPRIA_MINIMA)).toleranciaNumerica).toBe(TOLERANCIA_PROPRIA_MINIMA);
    expect(unico(com(TOLERANCIA_PROPRIA_MAXIMA)).toleranciaNumerica).toBe(TOLERANCIA_PROPRIA_MAXIMA);
  });

  it("o par com o mesmo nome duas vezes e o par repetido recusam nomeando o contato", () => {
    expect(() => ler([{ par: ['a', 'a'], motivo: MOTIVO }])).toThrow("contatos[0]: 'par' cita 'a' duas vezes; contato é entre partes diferentes.");
    expect(() => ler([{ par: ['a', 'b'], motivo: MOTIVO }, { par: ['b', 'a'], motivo: MOTIVO }])).toThrow("contatos[1]: o par 'b' ↔ 'a' já foi declarado.");
  });

  it('a saída ordena o par e guarda o motivo aparado, e os campos opcionais só aparecem quando declarados', () => {
    const d = unico(ler([{ par: ['b', 'a'], motivo: `  ${MOTIVO} ` }]));
    expect(d).toEqual({ par: ['a', 'b'], motivo: MOTIVO });
    expect(unico(ler([{ par: PARTES, motivo: MOTIVO, penetracaoMaxima: 0.5 }]))).toEqual({ par: PARTES, motivo: MOTIVO, penetracaoMaxima: 0.5 });
  });
});

describe('contatosDaPeca: recusas de opção e campos da saída', () => {
  const neutro = neutroDe([cubo(1, 'a', [10, 10, 10]), cubo(2, 'b', [10, 10, 10], [10, 0, 0])]);

  it('opções que não são objeto recusam com TypeError, e a opção desconhecida recusa nomeando-a', () => {
    for (const ruim of [null, 'x', 3, [], [{ toleranciaNumerica: 0 }]]) {
      expect(() => contatosDaPeca(neutro, {}, ruim)).toThrow(TypeError);
      expect(() => contatosDaPeca(neutro, {}, ruim)).toThrow('contatos da peça: opções inválidas.');
    }
    expect(() => contatosDaPeca(neutro, {}, { folga: 1 })).toThrow(/opção desconhecida 'folga'/);
    expect(() => contatosDaPeca(neutro, {}, { toleranciaNumerica: 0, folga: 1 })).toThrow(/opção desconhecida 'folga'/);
    expect(() => contatosDaPeca(neutro, {}, { toleranciaNumerica: 0 })).not.toThrow();
  });

  it('a saída leva o formato, a versão, a tolerância usada, as partes e a cobertura de dois pares no escopo', () => {
    const r = contatosDaPeca(neutro, {}, { toleranciaNumerica: 0 });
    expect(r.formato).toBe(FORMATO_CONTATOS_DA_PECA);
    expect(r.versao).toBe(VERSAO_CONTATOS_DA_PECA);
    expect(r.versao).toBe(1);
    expect(r.toleranciaNumerica).toBe(0);
    expect(r.partes).toEqual(['a', 'b']);
    expect(r.cobertura).toMatchObject({ paresTotais: 1, paresNoEscopo: 1, filtradosPelaCaixa: 0, completa: true });
  });

  it('os pares do escopo contam todos os pares, os longe da caixa contam como filtrados, e paresTotais bate com os três', () => {
    const tres = neutroDe([cubo(1, 'a', [2, 2, 2]), cubo(2, 'b', [2, 2, 2], [50, 0, 0]), cubo(3, 'c', [2, 2, 2], [100, 0, 0])]);
    const r = contatosDaPeca(tres, {});
    expect(r.cobertura).toMatchObject({ paresTotais: 3, paresNoEscopo: 3, filtradosPelaCaixa: 3 });
    expect(r.paresEmContato).toEqual([]);
  });

  it("a tolerância própria do contato aparece no par que se toca, e só nele", () => {
    const receita = { contatos: [{ par: ['a', 'b'], motivo: MOTIVO, toleranciaNumerica: 2e-7 }] };
    const r = contatosDaPeca(neutro, receita);
    expect(r.paresEmContato).toHaveLength(1);
    expect(r.paresEmContato[0]).toMatchObject({ declarado: true, toleranciaNumerica: 2e-7 });
    const sem = contatosDaPeca(neutro, { contatos: [{ par: ['a', 'b'], motivo: MOTIVO }] });
    expect(sem.paresEmContato[0]).not.toHaveProperty('toleranciaNumerica');
    expect(sem.paresEmContato[0].motivo).toBe(MOTIVO);
  });

  it('o contato declarado que atravessa sem penetracaoMaxima usa a fração padrão da diagonal da menor parte como limite', async () => {
    const mod = await import('../../tools/modelar/fixtures/contatos/fixture-contato-atravessa.js');
    const receita = { meta: mod.meta, PASSOS: mod.PASSOS, ALIASES: mod.ALIASES, contatos: mod.contatos };
    const { neutro: n } = executarReceita(receita);
    const r = contatosDaPeca(n, receita);
    const { solidos } = solidosPorParte(n);
    const diagonal = (s) => Math.hypot(...[0, 1, 2].map((e) => s.caixa.max[e] - s.caixa.min[e]));
    const menor = Math.min(...solidos.map(diagonal));
    expect(r.atravessados).toHaveLength(1);
    expect(r.atravessados[0].penetracao.limiteDeclarado).toBe(false);
    expect(r.atravessados[0].penetracao.limite).toBeCloseTo(PENETRACAO_RELATIVA_PADRAO * menor, 12);
  });

  it('o par declarado que não se toca diz a distância quando está perto, e maisLongeQue com o limite de 1/50 da diagonal quando está longe', () => {
    const contatos = [{ par: ['a', 'b'], motivo: MOTIVO }];
    const perto = neutroDe([cubo(1, 'a', [10, 10, 10]), cubo(2, 'b', [10, 10, 10], [10.2, 0, 0])]);
    const rp = contatosDaPeca(perto, { contatos });
    expect(rp.declaradosSemContato).toHaveLength(1);
    expect(rp.declaradosSemContato[0].distancia).toBeCloseTo(0.2, 6);
    expect(rp.declaradosSemContato[0]).not.toHaveProperty('maisLongeQue');
    /* a tolerância própria sai com o par declarado sem contato, e só quando foi declarada */
    expect(rp.declaradosSemContato[0]).not.toHaveProperty('toleranciaNumerica');
    expect(rp.declaradosSemContato[0].toleranciaDoPar).toBeGreaterThan(0);
    const propria = contatosDaPeca(perto, { contatos: [{ par: ['a', 'b'], motivo: MOTIVO, toleranciaNumerica: 2e-7 }] });
    expect(propria.declaradosSemContato[0].toleranciaNumerica).toBe(2e-7);
    expect(propria.declaradosSemContato[0].toleranciaDoPar).toBe(2e-7);
    const longe = neutroDe([cubo(1, 'a', [10, 10, 10]), cubo(2, 'b', [10, 10, 10], [13, 0, 0])]);
    const rl = contatosDaPeca(longe, { contatos });
    const diagonalDaUniao = Math.hypot(23, 10, 10);
    expect(rl.declaradosSemContato[0].maisLongeQue).toBeCloseTo(diagonalDaUniao / 50, 9);
    expect(rl.declaradosSemContato[0]).not.toHaveProperty('distancia');
  });

  it('entre pares do mesmo estado, a interseção de superfícies (peça atravessando peça) vem antes da contenção, mesmo com o nome depois', () => {
    const passos = [
      cubo(1, 'a1', [20, 20, 20]), cubo(2, 'a2', [4, 4, 4], [0, 8, 0]),
      cubo(3, 'zx', [20, 2, 2], [100, 0, 0]), cubo(4, 'zy', [2, 2, 20], [100, 0, 0]),
    ];
    const r = contatosDaPeca(neutroDe(passos), {});
    expect(r.paresEmContato.map((p) => [p.par.join('+'), p.metodo])).toEqual([
      ['zx+zy', 'intersecao-de-superficies'],
      ['a1+a2', 'contencao-e-malha'],
    ]);
    expect(r.paresEmContato.every((p) => p.estado === 'interpenetram')).toBe(true);
  });
});
