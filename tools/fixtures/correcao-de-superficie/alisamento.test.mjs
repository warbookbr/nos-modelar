/* alisamento.test.mjs — o gate 1 do plano das ferramentas de correção de superfície (fatia 3): na `rede-com-ruido`, a opção `alisarCurvas` da
 * rede leva o excesso do índice de suavidade sobre o controle (`rede-sem-ruido`), nos retalhos regulares, e o desvio do pente ao controle a
 * menos da metade (medido: a menos de um décimo), com os nós
 * fixos bit a bit e nenhum ponto-chave além da tolerância declarada, e as curvas da gaiola voltam a menos de 1 mm da superfície declarada.
 *
 * O índice do retalho `D` e a contagem de saltos do pente não entram na razão: os dois são do preenchimento e do vértice extraordinário,
 * iguais na rede sem ruído (linha de base em `docs/modelar/banco-de-provas/correcao-de-superficie-2026-11-16/`); o teste exige que fiquem
 * no controle. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { manifoldCarregada } from '../../../procedural/nucleo/manifold.js';
import { penteDeCurvatura } from '../../modelar/pente-de-curvatura.mjs';
import { suavidadePorRegiao } from '../../modelar/suavidade-por-regiao.mjs';
import { ALISAMENTO_DE_PROVA, definicaoDaRede, painel, receitaDeProva } from './chapas.mjs';

const CORTES = [['z', 125], ['z', 375], ['x', 250], ['x', 750]];

function medir(nome) {
  const receita = receitaDeProva(nome);
  const { neutro } = executarReceita(receita);
  const indice = Object.fromEntries(suavidadePorRegiao(neutro).json.regioes.map((r) => [r.regiao, r.indice]));
  const pente = CORTES.map(([eixo, posicao]) => penteDeCurvatura(neutro, { corte: { eixo, posicao } }).json);
  return { receita, indice, pente };
}

/* o maior desvio da curvatura (1/m) do pente de `a` ao de `b` no mesmo corte, casando as amostras pela posição ao longo do corte */
function desvioDoPente(a, b) {
  let maior = 0;
  a.forEach((ja, k) => {
    const sa = ja.curvas[0].amostras; const sb = b[k].curvas[0].amostras;
    for (const [s, kv] of sa) {
      let j = 0; while (j + 1 < sb.length && sb[j + 1][0] < s) j++;
      if (j + 1 >= sb.length || sb[j][0] > s) continue;
      const t = (s - sb[j][0]) / (sb[j + 1][0] - sb[j][0]);
      maior = Math.max(maior, Math.abs(kv - (sb[j][1] + t * (sb[j + 1][1] - sb[j][1]))));
    }
  });
  return maior;
}

describe.skipIf(!manifoldCarregada())('o alisamento das curvas declaradas na rede de prova', () => {
  it('leva o índice e o pente a menos da metade, com os nós fixos e o limite respeitado', () => {
    const com = medir('rede-com-ruido'); const sem = medir('rede-sem-ruido'); const lisa = medir('rede-alisada');
    /* o que o ruído pôs no índice (o excesso sobre o controle) cai a menos de um décimo; A e B caem a menos da metade também no valor
       bruto, e C não pode, porque o controle dele (7,97) já passa da metade do índice com ruído (13,49) */
    for (const r of ['A', 'B', 'C']) {
      expect(lisa.indice[r] - sem.indice[r], r).toBeLessThan((com.indice[r] - sem.indice[r]) / 10);
      expect(lisa.indice[r], r).toBeLessThan(sem.indice[r] * 1.05);
    }
    for (const r of ['A', 'B']) expect(lisa.indice[r], r).toBeLessThan(com.indice[r] / 2);
    expect(lisa.indice.D).toBeLessThan(sem.indice.D * 1.05);
    const desvioAntes = desvioDoPente(com.pente, sem.pente); const desvioDepois = desvioDoPente(lisa.pente, sem.pente);
    expect(desvioAntes).toBeGreaterThan(0.5);
    expect(desvioDepois).toBeLessThan(desvioAntes / 2);
    lisa.pente.forEach((j, k) => expect(j.saltos, CORTES[k].join(':')).toBeLessThanOrEqual(sem.pente[k].saltos));

    const g = lisa.receita.REDE; const g0 = com.receita.REDE;
    for (const no of ['N00', 'N10', 'N11', 'N12', 'M', 'N22']) expect(g.pontos[no]).toEqual(g0.pontos[no]);
    const a = g.alisamentoDasCurvas;
    expect(a.maiorDeslocamentoMm).toBeLessThanOrEqual(ALISAMENTO_DE_PROVA.tolerancia);
    for (const c of Object.values(a.curvas)) for (const k of c.duros) expect(c.deslocamentosMm[k]).toBe(0);
    /* as curvas da gaiola na superfície declarada: o ruído as tirava até 2 mm dela */
    const distancia = (rede) => Math.max(...Object.entries(rede.origens).filter(([, o]) => o.tipo !== 'retalho').map(([id]) => { const p = rede.pontos[id].map((c) => c * 1000); return Math.abs(p[1] - painel(p[0], p[2])); }));
    expect(distancia(g0)).toBeGreaterThan(1.5);
    expect(distancia(g)).toBeLessThan(1);
  });

  it('com a tolerância de 1 mm, nenhum ponto-chave anda mais que ela, e os presos saem no relatório', () => {
    const g = gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: { tolerancia: 1 } }));
    const a = g.alisamentoDasCurvas;
    expect(a.maiorDeslocamentoMm).toBeLessThanOrEqual(1);
    expect(Object.values(a.curvas).reduce((s, c) => s + c.limitados.length, 0)).toBeGreaterThan(0);
  });

  it('sem a opção a rede é a mesma de antes, e com ela a saída é a mesma em duas execuções', () => {
    const sem = gaiolaPorRede(definicaoDaRede({ ruido: true }));
    expect(sem.alisamentoDasCurvas).toBeUndefined();
    const um = gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: ALISAMENTO_DE_PROVA }));
    const dois = gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: ALISAMENTO_DE_PROVA }));
    expect(JSON.stringify(um.pontos)).toBe(JSON.stringify(dois.pontos));
    expect(JSON.stringify(um.alisamentoDasCurvas)).toBe(JSON.stringify(dois.alisamentoDasCurvas));
  });

  it('recusa a opção fora do contrato com o campo e o valor', () => {
    const def = (alisarCurvas) => definicaoDaRede({ ruido: true, alisarCurvas });
    expect(() => gaiolaPorRede(def({ curvas: ['nenhuma'] }))).toThrow(/alisarCurvas.curvas cita a curva 'nenhuma', que não existe/);
    expect(() => gaiolaPorRede(def({ tolerancia: -1 }))).toThrow(/gaiola por rede: alisarCurvas tem tolerancia -1/);
    expect(() => gaiolaPorRede(def({ pontosDuros: { baixo: [99] } }))).toThrow(/pontosDuros da curva 'baixo' é \[99\]; use índices de ponto-chave de 0 a 10/);
    expect(() => gaiolaPorRede(def({ peso: 1 }))).toThrow(/peso/);
  });
});
