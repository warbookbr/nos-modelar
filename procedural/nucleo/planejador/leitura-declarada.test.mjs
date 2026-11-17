/* leitura-declarada.test.mjs — prova o registro de leitura do núcleo e a leitura declarada das operações (fatia 2 do plano do cache por
 * passo): o registro não muda a malha, devolve os mapas como estavam, separa a leitura da seleção da leitura da operação, e cada
 * declaração cobre o que o exemplo da operação e as fixtures do núcleo leem de fato. A conferência no acervo é de
 * `leitura-declarada-acervo.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, neutroCanonico, nucleo, usoDaOperacao } from '../entrada.js';
import { passosDoCordao } from '../fixtures/no-de-tubos.js';
import { LEITURA_DAS_OPERACOES, conferirLeituraDoPasso, leituraDeclaradaDe } from './leitura-declarada.js';
import { niveisDoPasso } from './leitura-do-passo.js';
import { analisarPassos } from './leitura-escrita.js';

const o = (op, id) => ({ origem: { op, id } });
const cubo = (id, em = [0, 0, 0]) => ['cubo', { origemId: id, lado: 1, em }];
const lidas = (passos) => {
  const resumos = [];
  const n = nucleo(passos, {}, {}, {}, null, [], { aoLer: (i, op, resumo) => resumos.push({ i, op, resumo }) });
  return { n, resumos };
};

describe('o registro de leitura do núcleo', () => {
  const passos = [cubo(1), cubo(2, [0.5, 0, 0]), cubo(3, [5, 0, 0]), ['unir', { origemId: 4, solidos: [o('cubo', 1), o('cubo', 2)] }], ['parte', { sel: o('unir', 4), nome: 'peca' }]];

  it('não muda a malha, e devolve os mapas sem nada instalado', () => {
    const sem = nucleo(passos);
    const { n } = lidas(passos);
    const conferido = nucleo(passos, {}, {}, {}, null, [], { leitura: 'conferido' });
    expect(JSON.stringify(neutroCanonico(n))).toBe(JSON.stringify(neutroCanonico(sem)));
    expect(JSON.stringify(neutroCanonico(conferido))).toBe(JSON.stringify(neutroCanonico(sem)));
    for (const mapa of [n.V, n.F, n.origens]) expect(Reflect.ownKeys(mapa)).toEqual([]);
  });

  it('um resumo por passo: a primitiva não lê nada, a união dos cubos lê os vértices citados e varre as faces, a parte lê só as faces citadas', () => {
    const { resumos } = lidas(passos);
    expect(resumos.map((r) => r.op)).toEqual(['cubo', 'cubo', 'cubo', 'unir', 'parte']);
    const niveis = resumos.map((r) => niveisDoPasso(r.resumo));
    expect(niveis[0]).toEqual({ V: 'nada', F: 'nada', selecaoVarreu: false });
    expect(niveis[3]).toMatchObject({ V: 'citados', F: 'malha', selecaoVarreu: false });
    expect(niveis[4]).toMatchObject({ V: 'nada', F: 'citados', selecaoVarreu: false });
    /* a união cita as faces dos dois cubos e não as do terceiro, longe */
    const citadas = new Set(resumos[3].resumo.citados.F);
    const doTerceiro = [...nucleo(passos.slice(0, 3)).F.keys()].filter((fid) => !nucleo(passos.slice(0, 2)).F.has(fid));
    expect(doTerceiro.length).toBeGreaterThan(0);
    expect(doTerceiro.some((fid) => citadas.has(fid))).toBe(false);
  });

  it('a seleção que varre a malha é da citação: a parte por região varre na resolução e lê só as faces que ela devolveu', () => {
    const { resumos } = lidas([cubo(1), cubo(2, [5, 0, 0]), ['parte', { sel: { regiao: { min: [-1, -1, -1], max: [1, 1, 1] } }, nome: 'perto' }]]);
    expect(niveisDoPasso(resumos[2].resumo)).toEqual({ V: 'nada', F: 'citados', selecaoVarreu: true });
  });

  it('a leitura de uma entrada que o próprio passo criou não conta', () => {
    const { resumos } = lidas([cubo(1)]);
    expect(resumos[0].resumo.operacao.F.lidos).toEqual([]);
    expect(resumos[0].resumo.operacao.V.lidos).toEqual([]);
  });
});

describe('a conferência da leitura declarada', () => {
  const uniao = [cubo(1), cubo(2, [0.5, 0, 0]), ['unir', { origemId: 3, solidos: [o('cubo', 1), o('cubo', 2)] }]];
  const resumoDaUniao = () => lidas(uniao).resumos[2].resumo;

  it('a união cumpre a declaração dela, e uma declaração mais estreita diverge dizendo o mapa, os níveis e como leu', () => {
    expect(conferirLeituraDoPasso('unir', resumoDaUniao())).toBeNull();
    expect(conferirLeituraDoPasso('unir', resumoDaUniao(), { unir: { V: 'citados', F: 'citados' } })).toMatch(/^F declarado 'citados', lido 'malha': varreu o mapa$/);
    expect(conferirLeituraDoPasso('unir', resumoDaUniao(), { unir: { V: 'nada', F: 'malha' } })).toMatch(/^V declarado 'nada', lido 'citados': leu \d+ entrada\(s\) fora do declarado \(/);
    expect(conferirLeituraDoPasso('unir', resumoDaUniao(), { unir: { V: 'citados', F: 'malha' } })).toBeNull();
  });

  it('operação sem declaração não diverge e vale como malha', () => {
    expect(conferirLeituraDoPasso('unir', resumoDaUniao(), {})).toBeNull();
    expect(leituraDeclaradaDe('material')).toBeNull();
  });

  it('o núcleo conferido recusa a declaração que não cobre a leitura, com o passo e a operação', () => {
    expect(() => nucleo(uniao, {}, {}, {}, null, [], { leitura: 'conferido' })).not.toThrow();
    expect(() => nucleo(uniao, {}, {}, {}, null, [], { leitura: 'conferido', leituraDeclarada: { unir: { V: 'citados', F: 'citados' } } }))
      .toThrow(/a leitura declarada de 'unir' não cobre o que o passo 2 leu: F declarado 'citados', lido 'malha': varreu o mapa/);
  });

  it('as declarações usam só os três níveis, nos dois mapas', () => {
    for (const [nome, d] of Object.entries(LEITURA_DAS_OPERACOES)) {
      expect(Object.keys(d).sort(), nome).toEqual(['F', 'V']);
      for (const nivel of Object.values(d)) expect(['nada', 'citados', 'malha'], nome).toContain(nivel);
    }
  });

  it('cada operação declarada roda o exemplo do registro, depois de um cubo, sem divergir', () => {
    for (const nome of Object.keys(LEITURA_DAS_OPERACOES)) {
      const uso = usoDaOperacao(nome);
      const exemplo = uso?.exemplos ?? uso?.exemplo;
      if (!exemplo?.PASSOS) continue;
      const passos = [cubo(900, [9, 9, 9]), ...exemplo.PASSOS];
      expect(() => nucleo(passos, exemplo.PARAMS, exemplo.TOPO, exemplo.MATERIAIS, exemplo.ESQUELETO, exemplo.ALIASES, { leitura: 'conferido' }), nome).not.toThrow();
    }
  });

  it('o friso e a união da fixture do cordão de solda cumprem a declaração', () => {
    const passos = passosDoCordao('T reto 17/8', 7);
    const resumos = [];
    expect(() => nucleo(passos, {}, {}, {}, null, [], { leitura: 'conferido', aoLer: (i, op, resumo) => resumos.push({ op, resumo }) })).not.toThrow();
    const doFriso = resumos.filter((r) => r.op === 'friso');
    expect(doFriso.length).toBeGreaterThan(0);
    for (const r of doFriso) expect(niveisDoPasso(r.resumo)).toMatchObject({ V: 'citados', F: 'citados' });
    /* a união que refina a costura varre os vértices, e por isso o `unir` declara 'malha' nos dois mapas */
    expect(resumos.filter((r) => r.op === 'unir').some((r) => niveisDoPasso(r.resumo).V === 'malha')).toBe(true);
  });
});

describe('o grafo de leitura com a leitura declarada', () => {
  const manifesto = REGISTRO_OPERACOES.manifesto;
  it('a operação declarada tem leitura, e a que lê a malha inteira continua barreira', () => {
    const passos = [cubo(1), cubo(2), ['subtrair', { origemId: 3, solidos: [o('cubo', 1), o('cubo', 2)] }], ['friso', { origemId: 4, linha: { nome: 'x' }, costura: { de: { op: 'subtrair', id: 3 } }, perfil: { circulo: { raio: 0.001 } } }]];
    const a = analisarPassos(passos, { manifesto });
    expect(a[2]).toMatchObject({ leituraDeclarada: true, leitura: { V: 'citados', F: 'malha' }, barreira: true });
    expect(a[3]).toMatchObject({ leituraDeclarada: true, leitura: { V: 'citados', F: 'citados' } });
    expect(a[3].barreira).toBe(a[3].categoria === 'desconhecida');
  });
});
