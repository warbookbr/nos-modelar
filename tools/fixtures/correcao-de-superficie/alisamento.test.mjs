/* alisamento.test.mjs — o gate 1 do plano das ferramentas de correção de superfície (fatia 3): na `rede-com-ruido`, a opção `alisarCurvas` da
 * rede leva o excesso do índice de suavidade sobre o controle (`rede-sem-ruido`), nos retalhos regulares, a menos de um décimo, e o
 * desvio do pente ao controle a menos da metade, com os nós fixos bit a bit e nenhum ponto-chave além da tolerância declarada, e as curvas
 * da gaiola voltam a menos de 1 mm da superfície declarada. E os controles limpos de curvatura variável (a hélice, a senoide, a clotoide, a
 * elipse amostrada com folga, as seções em quarto de elipse e a `chapa-simetrica` inteira) andam menos de 0,3 mm, 15% da amplitude do
 * ruído: o alisamento tira o ruído e deixa a forma.
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
import { alisarPontosDaCurva } from '../../../procedural/nucleo/alisar-curvas.js';
import { ALISAMENTO_DE_PROVA, AMPLITUDE_DO_RUIDO_MM, casca, definicaoDaChapaSimetrica, definicaoDaRede, painel, receitaDeProva } from './chapas.mjs';

/* ---------- os controles de curvatura variável ---------- */

/* o limite do que a forma limpa pode andar: 15% da amplitude do ruído da rede de prova */
const LIMITE_DA_FORMA_MM = 0.15 * AMPLITUDE_DO_RUIDO_MM;
const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));

/* a elipse a por b com um ponto a cada h mm de arco (o ângulo de cada um pela inversa do comprimento de arco, por bisseção) */
function elipse(a, b, h) {
  const v = (t) => Math.hypot(a * Math.sin(t), b * Math.cos(t));
  const arco = (t) => { const m = 400; const d = t / m; let s = v(0) + v(t); for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * v(i * d); return (s * d) / 3; };
  const total = arco(2 * Math.PI); const n = Math.round(total / h);
  return Array.from({ length: n }, (_, k) => {
    let lo = 0; let hi = 2 * Math.PI;
    for (let it = 0; it < 50; it++) { const meio = (lo + hi) / 2; if (arco(meio) < (k * total) / n) lo = meio; else hi = meio; }
    const t = (lo + hi) / 2; return [a * Math.cos(t), b * Math.sin(t), 0];
  });
}
const CONTROLES = {
  'hélice de raio 300 com 20 pontos por volta': [Array.from({ length: 21 }, (_, i) => { const t = (i / 20) * 2 * Math.PI; return [300 * Math.cos(t), 300 * Math.sin(t), (400 * t) / (2 * Math.PI)]; }), {}],
  'senoide de amplitude 100 com 20 pontos por onda': [Array.from({ length: 21 }, (_, i) => [i * 100, 100 * Math.sin((i / 20) * 2 * Math.PI), 0]), {}],
  'clotoide de 2000 mm': [(() => { const p = []; let x = 0; let y = 0; let th = 0; for (let i = 0; i <= 20; i++) { p.push([x, y, 0]); th += i * 0.01; x += 100 * Math.cos(th); y += 100 * Math.sin(th); } return p; })(), {}],
  'elipse de 2000 por 600 a cada 25 mm': [elipse(2000, 600, 25), { fechada: true }],
  'elipse de 1000 por 600 a cada 50 mm': [elipse(1000, 600, 50), { fechada: true }],
  'seção em quarto de elipse em z 0': [[0, 10, 20, 30, 40, 50, 60, 70, 80].map((t) => casca(t, 0)), { duros: [4] }],
  'seção em quarto de elipse em z 500': [[0, 10, 20, 30, 40, 50, 60, 70, 80].map((t) => casca(t, 500)), { duros: [4] }],
};

describe('os controles limpos de curvatura variável', () => {
  it('andam menos de 15% da amplitude do ruído, sem tocar o limite, e o ruído posto neles cai a menos da metade', () => {
    for (const [nome, [p, o]] of Object.entries(CONTROLES)) {
      const r = alisarPontosDaCurva(p, { ...o, tolerancia: ALISAMENTO_DE_PROVA.tolerancia });
      expect(r.maiorDeslocamento, nome).toBeLessThan(LIMITE_DA_FORMA_MM);
      expect(r.limitados, nome).toEqual([]);
      /* o mesmo controle com o ruído da rede (na normal da poligonal, mais um terço dele fora do plano): o erro quadrático médio cai à metade */
      const n = p.length; const duro = new Set([...(o.duros ?? []), ...(o.fechada ? [] : [0, n - 1])]);
      const comRuido = p.map((q, i) => {
        if (duro.has(i)) return [...q];
        const a = p[(i - 1 + n) % n]; const b = p[(i + 1) % n]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const e = AMPLITUDE_DO_RUIDO_MM * Math.sin(ANGULO_AUREO * (i + 1) * 7);
        return [q[0] - (e * (b[1] - a[1])) / l, q[1] + (e * (b[0] - a[0])) / l, q[2] + e / 3];
      });
      const erro = (P) => Math.sqrt(P.reduce((s, q, i) => s + (q[0] - p[i][0]) ** 2 + (q[1] - p[i][1]) ** 2 + (q[2] - p[i][2]) ** 2, 0) / (n - duro.size));
      const alisada = alisarPontosDaCurva(comRuido, { ...o, tolerancia: ALISAMENTO_DE_PROVA.tolerancia });
      expect(erro(alisada.pontos), nome).toBeLessThan(erro(comRuido) / 2);
    }
  });

  it('a chapa-simetrica limpa, com a opção, anda menos de 15% da amplitude do ruído e não toca o limite', () => {
    for (const alisarCurvas of [true, { tolerancia: 2.5 }]) {
      const a = gaiolaPorRede({ ...definicaoDaChapaSimetrica(), alisarCurvas }).alisamentoDasCurvas;
      expect(a.maiorDeslocamentoMm).toBeLessThan(LIMITE_DA_FORMA_MM);
      for (const [nome, c] of Object.entries(a.curvas)) expect(c.limitados, nome).toEqual([]);
    }
  });
});


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
      expect(lisa.indice[r], r).toBeLessThan(sem.indice[r] * 1.1);
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

  it('todo ponto-chave escrito como nome fica, bit a bit, na posição do nó, com deslocamento 0', () => {
    const d = definicaoDaRede({ ruido: true });
    const a = gaiolaPorRede({ ...d, alisarCurvas: ALISAMENTO_DE_PROVA }).alisamentoDasCurvas;
    let nos = 0;
    for (const c of d.curvas) c.pontos.forEach((p, k) => {
      if (typeof p !== 'string') return;
      nos += 1;
      expect(a.curvas[c.nome].deslocamentosMm[k], `${c.nome}[${k}]`).toBe(0);
      a.curvas[c.nome].pontosChave[k].forEach((v, q) => expect(Object.is(v, d.nos[p][q]), `${c.nome}[${k}] ${p}`).toBe(true));
    });
    expect(nos).toBe(19);
  });

  it('a tolerância por curva vale só na curva dela', () => {
    const a = gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: { tolerancia: 2.5, toleranciaPorCurva: { baixo: 0.5 } } })).alisamentoDasCurvas;
    expect(a.curvas.baixo.tolerancia).toBe(0.5);
    expect(a.curvas.baixo.maiorDeslocamentoMm).toBeLessThanOrEqual(0.5);
    expect(a.curvas.baixo.limitados.length).toBeGreaterThan(0);
    expect(a.curvas.meio.tolerancia).toBe(2.5);
    expect(a.curvas.meio.maiorDeslocamentoMm).toBeGreaterThan(0.5);
  });

  it('o ponto-chave numérico onde a poligonal vira mais que anguloDeCanto parte a curva', () => {
    const d = definicaoDaRede({ ruido: true });
    const baixo = d.curvas.find((c) => c.nome === 'baixo');
    baixo.pontos[2] = [baixo.pontos[2][0], baixo.pontos[2][1] + 120, baixo.pontos[2][2]];
    const a = gaiolaPorRede({ ...d, alisarCurvas: ALISAMENTO_DE_PROVA }).alisamentoDasCurvas;
    /* o bico tem três cantos: o ponto levantado e os dois vizinhos dele */
    expect(a.curvas.baixo.partida).toEqual([1, 2, 3]);
    for (const k of [1, 2, 3]) expect(a.curvas.baixo.deslocamentosMm[k]).toBe(0);
  });

  it('com simetria x, a curva que corre no plano fica nele e nenhum ponto da rede vai a x < 0', () => {
    /* a crista da chapa simétrica corre em x = 0; com ruído em y nos pontos dela e a curva ao lado a 0,5 mm do plano, o alisamento a tirava a x < 0 */
    for (const xs of [[0.5, 0.5, 0.5, 0.5], [0.1, 0.3, 0.3, 0.1]]) {
      const d = definicaoDaChapaSimetrica();
      const c = d.curvas.find((x) => x.nome === 'crista');
      [1, 2, 3, 4].forEach((k, i) => { c.pontos[k] = [xs[i], c.pontos[k][1] + (i % 2 ? 1.5 : -1.5), c.pontos[k][2]]; c.pontos[k + 5] = [xs[i], c.pontos[k + 5][1], c.pontos[k + 5][2]]; });
      const g = gaiolaPorRede({ ...d, alisarCurvas: true });
      expect(Math.min(...Object.values(g.pontos).map((p) => p[0]))).toBeGreaterThanOrEqual(0);
      for (const [nome, curva] of Object.entries(g.alisamentoDasCurvas.curvas)) {
        const dada = d.curvas.find((x) => x.nome === nome).pontos;
        curva.pontosChave.forEach((p, k) => {
          const x0 = typeof dada[k] === 'string' ? d.nos[dada[k]][0] : dada[k][0];
          if (x0 === 0) expect(Object.is(p[0], 0), `${nome}[${k}]`).toBe(true);
          expect(p[0], `${nome}[${k}]`).toBeGreaterThanOrEqual(0);
        });
      }
    }
  });

  it('o ponto-chave repetido é recusado com a posição dele, antes do alisamento', () => {
    const d = definicaoDaRede({ ruido: true });
    const baixo = d.curvas.find((c) => c.nome === 'baixo'); baixo.pontos[3] = [...baixo.pontos[2]];
    expect(() => gaiolaPorRede({ ...d, alisarCurvas: true })).toThrow(/a curva 'baixo' repete o ponto-chave: o 3º e o 4º são iguais/);
  });

  it('recusa a opção fora do contrato com o campo e o valor', () => {
    expect(() => gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: { toleranciaPorCurva: { nenhuma: 1 } } }))).toThrow(/toleranciaPorCurva cita a curva 'nenhuma', que não existe/);
    expect(() => gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: { curvas: ['baixo'], toleranciaPorCurva: { meio: 1 } } }))).toThrow(/toleranciaPorCurva cita a curva 'meio', que não é alisada/);
    expect(() => gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: { toleranciaPorCurva: { baixo: -2 } } }))).toThrow(/alisarCurvas tem toleranciaPorCurva.baixo -2;/);
    expect(() => gaiolaPorRede(definicaoDaRede({ ruido: true, alisarCurvas: { tolerancia: NaN } }))).toThrow(/alisarCurvas tem tolerancia NaN;/);
    const def = (alisarCurvas) => definicaoDaRede({ ruido: true, alisarCurvas });
    expect(() => gaiolaPorRede(def({ curvas: ['nenhuma'] }))).toThrow(/alisarCurvas.curvas cita a curva 'nenhuma', que não existe/);
    expect(() => gaiolaPorRede(def({ tolerancia: -1 }))).toThrow(/gaiola por rede: alisarCurvas tem tolerancia -1/);
    expect(() => gaiolaPorRede(def({ pontosDuros: { baixo: [99] } }))).toThrow(/pontosDuros da curva 'baixo' é \[99\]; use índices de ponto-chave de 0 a 10/);
    expect(() => gaiolaPorRede(def({ peso: 1 }))).toThrow(/peso/);
  });
});
