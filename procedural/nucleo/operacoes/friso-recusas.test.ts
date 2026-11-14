/* friso-recusas.test.ts — cada recusa de entrada do passo `friso` com a entrada ruim e o campo que a recusa cita. A revisão das
   verificações (2026-11-13) tirou 11 dessas recusas, uma a uma, sem que nenhum teste reprovasse. Duas delas fazem o teste da fatia 13
   do friso entrar em laço sem fim (ver `distancias` em fixtures/medidas-de-malha.js e o teste dela). */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../entrada.js';
import * as prova from '../fixtures/friso-prova.js';

const RETA = [[0, 0, 0], [1, 0, 0]];
const VOLTA = [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [0, 0, 0]];
const CIRCULO = { circulo: { raio: 0.1 } };
const friso = (extra: Record<string, unknown> = {}) => ['friso', { origemId: 1, linha: { nome: 'l', pontos: RETA }, normal: [0, 1, 0], perfil: CIRCULO, ...extra }];
const roda = (extra: Record<string, unknown> = {}) => nucleo([friso(extra)] as never);
const recusa = (extra: Record<string, unknown>) => {
  const st = roda(extra);
  expect(st.orfaos).toHaveLength(1);
  expect(st.orfaos[0]).toMatchObject({ passo: 0, op: 'friso' });
  return st.orfaos[0];
};
/* sobre a chapa de prova: o primeiro órfão do passo friso 4, o da linha que se troca */
const P = prova.pontos();
const naChapa = (extra: Record<string, unknown>) => {
  const st = nucleo(prova.passos({ extra: { aba: { linha: { nome: 'borda', pontos: prova.bordaDoVao() }, perfil: undefined, ponta: undefined, fechamento: undefined, ...extra } } }).slice(0, 4) as never, P);
  return st.orfaos.filter((o: { op: string }) => o.op === 'friso');
};

describe('friso: a entrada de base não recusa', () => {
  it('a reta de um metro com o círculo monta, e a origem publica lateral e pontas', () => {
    const st = roda();
    expect(st.orfaos).toEqual([]);
    expect(st.origens.get(1)).toHaveLength(1);
    expect(st.origens.get(1)[0]).toMatchObject({ op: 'friso' });
    expect(st.origens.get(1)[0].faces.length).toBeGreaterThan(0);
  });
});

describe('friso: recusas de entrada na polilinha', () => {
  it('origemId: inteiro não-negativo, e 0 vale', () => {
    for (const ruim of [-1, 1.5, '1']) expect(recusa({ origemId: ruim }).ref).toBe('origemId');
    expect(roda({ origemId: 0 }).orfaos).toEqual([]);
  });

  it('linha: objeto com nome e pontos, sem campo estranho', () => {
    for (const ruim of [null, 'l', [RETA]]) expect(recusa({ linha: ruim }).ref).toBe('linha');
    expect(recusa({ linha: { nome: 'l', pontos: RETA, cor: 1 } }).motivo).toMatch(/campo desconhecido 'cor'/);
    expect(recusa({ linha: { pontos: RETA } }).motivo).toMatch(/precisa de nome/);
    expect(recusa({ linha: { nome: '', pontos: RETA } }).motivo).toMatch(/precisa de nome/);
    expect(recusa({ linha: { nome: 7, pontos: RETA } }).motivo).toMatch(/precisa de nome/);
    expect(recusa({ linha: { nome: 'l', pontos: [[0, 0, 0]] } }).motivo).toMatch(/dois pontos ou mais/);
    expect(recusa({ linha: { nome: 'l' } }).motivo).toMatch(/dois pontos ou mais/);
  });

  it('refinar: só sobre a superfície de um passo subdivisao', () => {
    const r = recusa({ refinar: 1 });
    expect(r.ref).toBe('refinar');
    expect(r.motivo).toMatch(/superficie: \{ op: 'subdivisao', id \}/);
  });

  it('a volta fechada precisa de três pontos distintos, e a de quatro monta com um anel de quatro estações', () => {
    const r = recusa({ linha: { nome: 'v', pontos: [[0, 0, 0], [1, 0, 0], [0, 0, 0]] } });
    expect(r.ref).toBe('linha');
    expect(r.motivo).toMatch(/três pontos distintos ou mais/);
    /* o triângulo, de quatro pontos com o que repete o primeiro, é a menor volta que vale */
    expect(roda({ linha: { nome: 'v', pontos: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 0, 0]] } }).orfaos).toEqual([]);
    const st = roda({ linha: { nome: 'v', pontos: VOLTA } });
    expect(st.orfaos).toEqual([]);
    /* o ponto que repete o primeiro não vira estação: 4 estações de 16 vértices do círculo */
    expect(st.V.size).toBe(4 * 16);
  });

  it('ponta: aberta, fechada ou a lista de duas, e a volta não tem ponta', () => {
    for (const ruim of ['redonda', ['aberta'], ['aberta', 'aberta', 'aberta'], ['aberta', 'redonda'], 3]) {
      const r = recusa({ ponta: ruim });
      expect(r.ref).toBe('ponta');
      expect(r.motivo).toMatch(/^ponta precisa ser 'aberta'/);
    }
    for (const bom of ['aberta', 'fechada', ['aberta', 'fechada']]) expect(roda({ ponta: bom, fechamento: bom === 'aberta' ? undefined : 0.1 }).orfaos).toEqual([]);
    expect(recusa({ linha: { nome: 'v', pontos: VOLTA }, ponta: 'aberta' }).motivo).toMatch(/é volta fechada e não tem ponta/);
  });

  it('fechamento: só com ponta fechada, e maior que zero', () => {
    expect(recusa({ fechamento: 0.1 }).ref).toBe('fechamento');
    expect(recusa({ ponta: 'fechada', fechamento: 0 }).motivo).toMatch(/maior que zero, e veio 0/);
    expect(recusa({ ponta: 'fechada', fechamento: -1 }).ref).toBe('fechamento');
  });

  it('segmentosArco: inteiro de 1 para cima', () => {
    for (const ruim of [0, 1.5, -2]) expect(recusa({ segmentosArco: ruim }).ref).toBe('segmentosArco');
    expect(roda({ segmentosArco: 1 }).orfaos).toEqual([]);
  });

  it('perfil: o que se cruza, o que fica todo abaixo da linha e o que não é perfil', () => {
    const gravata = [[0, 0.001], [0.01, -0.001], [0.01, 0.001], [0, -0.001]];
    const r = recusa({ perfil: gravata });
    expect(r.ref).toBe('perfil');
    expect(r.motivo).toBe('o perfil se cruza; desenhe um polígono simples');
    expect(recusa({ perfil: [[0, -0.01], [0.01, -0.01], [0.01, -0.005]] }).motivo).toMatch(/fica todo abaixo da linha/);
    expect(recusa({ perfil: 'x' }).ref).toBe('perfil');
  });

  it('normal: a polilinha precisa dela, e a superfície não a aceita', () => {
    expect(recusa({ normal: undefined }).motivo).toMatch(/^a polilinha precisa de normal/);
  });

  it('aba sem superfície: a aba dobra a borda da chapa', () => {
    const r = recusa({ aba: { largura: 0.02, angulo: 90, raio: 0.002 }, perfil: undefined });
    expect(r.ref).toBe('aba');
    expect(r.motivo).toMatch(/^a aba dobra a borda da chapa/);
  });

  it('variacao: cita pontos nomeados da linha', () => {
    expect(recusa({ variacao: 3 }).ref).toBe('variacao');
  });
});

describe('friso: recusas de entrada sobre a chapa de prova', () => {
  it('aba e perfil se excluem, e o campo citado é aba, não a mensagem', () => {
    const r = naChapa({ aba: { largura: 0.02, angulo: 90, raio: 0.002 }, perfil: { circulo: { raio: 0.003 } } });
    expect(r).toHaveLength(1);
    expect(r[0].ref).toBe('aba');
    expect(r[0].motivo).toMatch(/aba e perfil se excluem/);
  });

  it('aba: medidas completas, sem campo estranho e dentro do que a dobra aguenta', () => {
    expect(naChapa({ aba: 3 })[0].ref).toBe('aba');
    expect(naChapa({ aba: { largura: 0.02, angulo: 90 } })[0].motivo).toMatch(/precisa de raio/);
    expect(naChapa({ aba: { largura: 0.02, angulo: 90, raio: 0.002, cor: 1 } })[0].motivo).toMatch(/campo desconhecido 'cor'/);
    expect(naChapa({ aba: { largura: 0.02, angulo: 170, raio: 0.0005 } })[0].motivo).toMatch(/passa .* por baixo da chapa/);
    expect(naChapa({ aba: { largura: 0.02, angulo: 90, raio: 0.002 } })).toEqual([]);
  });

  it('o perfil que não entra na chapa, o que a atravessa e a normal sobre a superfície', () => {
    const P0 = { retangulo: { largura: 0.008, profundidade: 0.004, centro: [0, 0.002] } };
    expect(naChapa({ aba: undefined, perfil: P0 })[0].ref).toBe('perfil');
    expect(naChapa({ aba: undefined, perfil: P0, normal: [0, 1, 0] })[0].ref).toBe('normal');
  });

  it('variacao sobre a aba cita o ponto, e a variação de largura que passa de zero recusa', () => {
    const aba = { largura: 0.02, angulo: 90, raio: 0.002 };
    expect(naChapa({ aba, variacao: { largura: [{ ponto: 'zz', valor: 0.02 }] } })[0].ref).toBe('variacao');
    expect(naChapa({ aba, variacao: { angulo: [{ ponto: 'p3_3', valor: 90 }, { ponto: 'p5_5', valor: 178 }] } })[0].ref).toBe('linha');
  });
});
