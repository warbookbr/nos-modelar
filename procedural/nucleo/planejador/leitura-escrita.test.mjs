/* leitura-escrita.test.mjs — prova o grafo de leitura e escrita, as sequências de subtrair e o perfil de tempo do planejador (fatia 1). */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES } from '../entrada.js';
import {
  analisarPassos, referenciasDoValor, resumirPerfil, resumoPorOperacao, sequenciasDeSubtrair, tempoDosPassos, totaisDoGrafo,
} from './leitura-escrita.js';

const manifesto = REGISTRO_OPERACOES.manifesto;
const o = (op, id) => ({ origem: { op, id } });
const cubo = (id) => ['cubo', { origemId: id, lado: 1 }];
const sub = (id, ...solidos) => ['subtrair', { origemId: id, solidos }];

describe('grafo de leitura e escrita (só leitura)', () => {
  it('reconhece origem, alias e id como leitura estática e o resto como dinâmica', () => {
    const aliases = new Map([['a', o('cubo', 1)], ['u', { unir: [o('cubo', 2), o('cubo', 3)] }]]);
    expect(referenciasDoValor(o('cubo', 1), aliases)).toEqual({ chaves: ['cubo#1'], dinamica: false });
    expect(referenciasDoValor({ alias: 'u' }, aliases).chaves).toEqual(['alias:u', 'cubo#2', 'cubo#3']);
    expect(referenciasDoValor({ alias: 'nenhum' }, aliases).dinamica).toBe(true);
    expect(referenciasDoValor({ onde: { x: 1 } }, aliases).dinamica).toBe(true);
    expect(referenciasDoValor([4, 5], aliases)).toEqual({ chaves: ['id#4', 'id#5'], dinamica: false });
  });

  it('a origem distingue copia, nome e face, e {v} e {f} com ids são leitura estática', () => {
    const base = { op: 'arranja', id: 5 };
    const chave = (origem) => referenciasDoValor({ origem }).chaves[0];
    expect(chave({ ...base, copia: 0 })).not.toBe(chave({ ...base, copia: 1 }));
    expect(chave({ ...base, nome: 'a' })).not.toBe(chave({ ...base, nome: 'b' }));
    expect(chave({ ...base, face: 2 })).not.toBe(chave({ ...base, face: 3 }));
    expect(chave(base)).not.toBe(chave({ ...base, copia: 0 }));
    expect(referenciasDoValor({ v: [1, 2] })).toEqual({ chaves: ['v#1', 'v#2'], dinamica: false });
    expect(referenciasDoValor({ f: 7, v: [3] })).toEqual({ chaves: ['f#7', 'v#3'], dinamica: false });
    expect(referenciasDoValor({ v: 'x' }).dinamica).toBe(true);
    expect(chave({ op: 'x', id: 1, tampa: 'topo' })).not.toBe(chave({ op: 'x', id: 1, tampa: 'base' }));
    expect(chave({ op: 'x', id: 1, parte: 'lente' })).not.toBe(chave({ op: 'x', id: 1 }));
  });

  it('o manifesto de hoje não declara leitura por seleção: todo passo que lê a malha é barreira', () => {
    const passos = [cubo(1), cubo(2), sub(3, o('cubo', 1), o('cubo', 2)), ['material', { sel: o('subtrair', 3), usa: 'x' }]];
    const a = analisarPassos(passos, { manifesto });
    expect(a.map((p) => p.categoria)).toEqual(['criadora', 'criadora', 'le-malha', 'le-malha']);
    expect(a.every((p) => p.leituraDeclarada === false)).toBe(true);
    expect(a.map((p) => p.barreira)).toEqual([false, false, true, true]);
    expect(totaisDoGrafo(a)).toMatchObject({ passos: 4, criadoras: 2, leMalha: 2, leituraDeclarada: 0, barreiras: 2, leituraExtraivel: 2 });
    expect(resumoPorOperacao(a).find((r) => r.op === 'subtrair')).toMatchObject({ passos: 1, leMalha: 1, barreiras: 1, extraiveis: 1 });
  });

  it('um manifesto com o campo `leitura` tira a barreira do passo', () => {
    const copia = manifesto.map((m) => ({ ...m, operacoes: m.operacoes.map((x) => (x.nome === 'subtrair' ? { ...x, leitura: ['solidos'] } : x)) }));
    const a = analisarPassos([cubo(1), sub(2, o('cubo', 1), o('cubo', 1))], { manifesto: copia });
    expect(a[1]).toMatchObject({ leituraDeclarada: true, barreira: false });
  });

  it('operação fora do manifesto é barreira', () => {
    expect(analisarPassos([['inventada', {}]], { manifesto })[0]).toMatchObject({ categoria: 'desconhecida', barreira: true });
  });
});

describe('sequências de subtrair sobre o mesmo alvo', () => {
  const base = [cubo(1), cubo(2), cubo(3), cubo(4)];
  it('conta a corrente de cortes vizinhos', () => {
    const passos = [...base, sub(10, o('cubo', 1), o('cubo', 2)), sub(11, o('subtrair', 10), o('cubo', 3)), sub(12, o('subtrair', 11), o('cubo', 4))];
    const s = sequenciasDeSubtrair(passos, { manifesto });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ inicio: 4, fim: 6, tamanho: 3, intermediarios: 0, ferramentas: 3, ferramentasDependem: false });
  });
  it('um corte isolado ou sobre outro alvo não faz sequência', () => {
    const passos = [...base, sub(10, o('cubo', 1), o('cubo', 2)), sub(11, o('cubo', 3), o('cubo', 4))];
    expect(sequenciasDeSubtrair(passos, { manifesto })).toEqual([]);
  });
  it('passo criador no meio só junta no modo relaxado', () => {
    const passos = [cubo(1), cubo(2), sub(10, o('cubo', 1), o('cubo', 2)), cubo(3), sub(11, o('subtrair', 10), o('cubo', 3))];
    expect(sequenciasDeSubtrair(passos, { manifesto })).toEqual([]);
    const r = sequenciasDeSubtrair(passos, { manifesto, modo: 'relaxada' });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ tamanho: 2, intermediarios: 1 });
  });
  it('passo que lê a malha no meio quebra a sequência mesmo no modo relaxado', () => {
    const passos = [cubo(1), cubo(2), sub(10, o('cubo', 1), o('cubo', 2)), ['material', { sel: o('subtrair', 10), usa: 'x' }], cubo(3), sub(11, o('subtrair', 10), o('cubo', 3))];
    expect(sequenciasDeSubtrair(passos, { manifesto, modo: 'relaxada' })).toEqual([]);
  });
  it('marca a ferramenta que depende do corte anterior', () => {
    const passos = [cubo(1), cubo(2), sub(10, o('cubo', 1), o('cubo', 2)), sub(11, o('subtrair', 10), o('subtrair', 10))];
    expect(sequenciasDeSubtrair(passos, { manifesto })[0].ferramentasDependem).toBe(true);
  });
  it('resolve o primeiro sólido por alias', () => {
    const aliases = [['alvo', o('cubo', 1)]];
    const passos = [cubo(1), cubo(2), cubo(3), sub(10, { alias: 'alvo' }, o('cubo', 2)), sub(11, o('cubo', 1), o('cubo', 3))];
    expect(sequenciasDeSubtrair(passos, { manifesto, aliases })).toHaveLength(0);
    expect(sequenciasDeSubtrair([...passos.slice(0, 3), sub(10, o('cubo', 1), o('cubo', 2)), sub(11, o('cubo', 1), o('cubo', 3))], { manifesto })).toHaveLength(1);
  });
});

describe('perfil de tempo', () => {
  const tempos = new Map([[0, { op: 'cubo', ms: 1 }], [1, { op: 'subtrair', ms: 30 }], [2, { op: 'cubo', ms: 2 }], [3, { op: 'subtrair', ms: 60 }]]);
  it('soma por operação e lista os passos mais caros', () => {
    const r = resumirPerfil(tempos, { maisCaros: 2 });
    expect(r.totalMs).toBe(93);
    expect(r.porOperacao[0]).toMatchObject({ op: 'subtrair', passos: 2, ms: 90 });
    expect(r.porOperacao[0].parte).toBeCloseTo(90 / 93);
    expect(r.maisCaros.map((p) => p.i)).toEqual([3, 1]);
    expect(tempoDosPassos(tempos, [1, 3])).toBe(90);
  });
});
