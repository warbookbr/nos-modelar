/* lathe-fechado.test.ts — perfil que dá a volta e fecha de verdade.

   O ATRITO. O `lathe` tratava o perfil como polilinha SEMPRE aberta, e dizia
   isso no próprio comentário. Uma receita que escrevia o último ponto no mesmo
   lugar do primeiro estava pedindo "a seção dá a volta e fecha" — é assim que
   se descreve anel de vedação, pneu e qualquer toroide —, e recebia um segundo
   anel de vértices COINCIDENTES com o primeiro: colados no espaço, separados na
   topologia.

   Visualmente fechava. A malha tinha uma costura. O único lugar onde isso
   aparecia era `meta.fechada:false` em `_mancal-de-mesa` — uma peça declarando
   que não fecha, sem que nada explicasse por quê a quem lesse a receita.

   A AFIRMAÇÃO CENTRAL é topológica, não visual: numa malha fechada, toda aresta
   é compartilhada por exatamente duas faces. É isso que a costura quebrava e é
   isso que estas provas medem — foto nenhuma distinguiria os dois casos.

   A comparação dos pontos é EXATA de propósito. Um limiar aproximado faria dois
   pontos quase iguais fecharem o laço em silêncio, mudando a topologia de uma
   peça cujo autor não pediu isso. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

const LADOS = 8;

/* seção quadrada girada: fechada repete o primeiro ponto no fim. */
const SECAO = [[0.05, 0], [0.07, 0], [0.07, 0.02], [0.05, 0.02]];
const torus = (fecha: boolean) => nucleo([
  ['lathe', { origemId: 1, lados: LADOS, perfil: fecha ? [...SECAO, SECAO[0]] : SECAO }],
], {});

/* Numa malha fechada toda aresta serve a exatamente duas faces. Aresta usada
   uma vez é buraco; usada três, é dobra. */
function arestasIrregulares(malha: any): number {
  const uso = new Map<string, number>();
  for (const f of malha.F.values()) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k];
      const b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
  }
  return [...uso.values()].filter((n) => n !== 2).length;
}

const gritos = (malha: any) => (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');

describe('perfil fechado produz superfície fechada', () => {
  it('toda aresta serve exatamente duas faces', () => {
    const malha = torus(true);
    expect(gritos(malha)).toBe('');
    expect(arestasIrregulares(malha)).toBe(0);
  });

  it('o perfil aberto continua aberto, e é isso que separa os dois casos', () => {
    /* a seção sem o ponto repetido é uma tira, não um anel: ela TEM borda. */
    expect(arestasIrregulares(torus(false))).toBeGreaterThan(0);
  });

  it('o ponto repetido não gasta anel novo: ele reusa o primeiro', () => {
    const fechado = torus(true);
    const aberto = torus(false);
    /* quatro anéis de `lados` vértices nos dois casos — o quinto ponto do
       perfil fechado não aloca nada. */
    expect(fechado.V.size).toBe(4 * LADOS);
    expect(aberto.V.size).toBe(4 * LADOS);
    /* e o fechado ganha a faixa que liga o fim ao começo. */
    expect(fechado.F.size).toBe(aberto.F.size + LADOS);
  });

  it('a última faixa liga mesmo o penúltimo anel ao primeiro', () => {
    const malha = torus(true);
    const primeiros = [...malha.V.keys()].sort((a: number, b: number) => a - b).slice(0, LADOS);
    /* alguma face usa vértices do PRIMEIRO anel e do último anel alocado */
    const ultimos = [...malha.V.keys()].sort((a: number, b: number) => a - b).slice(-LADOS);
    const costura = [...malha.F.values()].filter((f: any) =>
      f.vs.some((v: number) => primeiros.includes(v)) && f.vs.some((v: number) => ultimos.includes(v)));
    expect(costura.length).toBe(LADOS);
  });

  it('é determinístico', () => {
    const chave = (m: any) => JSON.stringify([...m.V.entries()].sort((a: any, b: any) => a[0] - b[0]));
    expect(chave(torus(true))).toBe(chave(torus(true)));
  });
});

describe('o fechamento é exato, nunca aproximado', () => {
  it('ponto quase igual NÃO fecha o laço', () => {
    const quase = nucleo([
      ['lathe', { origemId: 1, lados: LADOS, perfil: [...SECAO, [0.05, 1e-12]] }],
    ], {});
    /* 5 anéis, porque o autor não escreveu o mesmo ponto — fechar por limiar
       mudaria a topologia de uma peça que não pediu isso. */
    expect(quase.V.size).toBe(5 * LADOS);
    expect(arestasIrregulares(quase)).toBeGreaterThan(0);
  });

  it('perfil de dois pontos iguais não vira laço', () => {
    /* menos de três pontos não descreve volta nenhuma. */
    const dois = nucleo([['lathe', { origemId: 1, lados: LADOS, perfil: [[0.05, 0], [0.05, 0]] }]], {});
    expect(dois.V.size).toBe(2 * LADOS);
  });

  it('perfil aberto comum não é afetado', () => {
    const coluna = nucleo([
      ['lathe', { origemId: 1, lados: LADOS, perfil: [[0, 0], [0.03, 0], [0.03, 0.1], [0, 0.1]] }],
    ], {});
    expect(gritos(coluna)).toBe('');
    /* dois polos (1 vértice cada) e dois anéis */
    expect(coluna.V.size).toBe(2 + 2 * LADOS);
    /* polo→anel, anel→anel, anel→polo: superfície fechada por polos */
    expect(arestasIrregulares(coluna)).toBe(0);
  });
});
