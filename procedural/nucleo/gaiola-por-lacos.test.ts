/* gaiola-por-lacos.test.ts — o ajudante `gaiolaPorLacos` em peças pequenas feitas aqui: a barra da ficha, a reamostragem por trecho,
   a escada da tampa, a fusão da ponta, a orientação pelo volume, as três formas de vinco, cantos e medidas, os avisos de amostragem
   desigual, a compensação, as recusas com a medida na mensagem, a entrega ao passo `subdivisao` e a mesma saída a cada chamada. As
   peças de teste do plano, com as medidas contra o ombro feito à mão, estão em `tools/fixtures/solido-por-lacos/`. A ficha é a do
   comando `capacidade`, recortada do cabeçalho e conferida aqui pelo mesmo `lerFicha`. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { DISTANCIA_MINIMA_ENTRE_PLANOS_MM, RAZAO_MAXIMA_DE_AMOSTRAGEM, gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';
// @ts-expect-error — ferramenta em JavaScript.
import { LIMITE_DE_LINHAS, lerFicha } from '../../tools/modelar/capacidade.mjs';

type Uv = [number, number];
const trechosDaBarra = [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }];
/* barra de seção 30 (y) por 40 (z) ao longo de x, um laço por plano */
const lacoDaBarra = (em: number, a = 30, b = 40) => ({ em, trechos: { baixo: [[0, 0], [0, b]], frente: [[0, b], [a, b]], cima: [[a, b], [a, 0]], tras: [[a, 0], [0, 0]] } });
const barra = (extra: Record<string, unknown> = {}) => ({
  nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' }, trechos: trechosDaBarra,
  lacos: [0, 50, 100].map((em) => lacoDaBarra(em)), ...extra,
});

/* cada aresta em duas faces, uma em cada sentido, e o volume com sinal das faces */
function conferir(g: any) {
  const conta = new Map<string, number>();
  for (const f of g.passo.faces) f.forEach((a: string, k: number) => { const c = `${a}|${f[(k + 1) % f.length]}`; conta.set(c, (conta.get(c) ?? 0) + 1); });
  let soltas = 0; let repetidas = 0;
  for (const [c, n] of conta) { const [a, b] = c.split('|'); if (n > 1) repetidas++; if (!conta.has(`${b}|${a}`)) soltas++; }
  let volume = 0;
  for (const f of g.passo.faces) for (let k = 1; k + 1 < f.length; k++) {
    const [a, b, c] = [f[0], f[k], f[k + 1]].map((n: string) => g.pontosMm[n]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return { soltas, repetidas, volume };
}
const entrega = (g: any, extra = {}) => nucleo([['subdivisao', { ...g.passo, niveis: 1, ...extra }]], {}, g.pontos);
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };

describe('gaiolaPorLacos: a barra', () => {
  const g = gaiolaPorLacos(barra());

  it('reamostra cada trecho no número pedido e nomeia os pontos por laço e trecho', () => {
    expect(g.passo.vertices).toHaveLength(3 * 6);
    expect(g.pontosMm[g.nomeDe('l1', 'frente', 1)]).toEqual([50, 15, 40]);
    expect(g.nomeDe('l1', 'frente', 1)).toBe('barra_l1_frente1');
    expect(g.nomeDe('l2', 'baixo', 1)).toBe('barra_l2_frente0');
    expect(g.pontos['barra_l2_tras1']).toEqual([0.1, 0.015, 0]);
  });

  it('fecha com a escada nas pontas e olha para fora pelo sinal do volume', () => {
    expect(g.passo.faces).toHaveLength(2 * 6 + 2 * 2);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(c.volume).toBeCloseTo(100 * 30 * 40, 6);
    /* o mesmo laço dado na volta contrária sai com as faces viradas para fora também */
    const contra = gaiolaPorLacos(barra({
      trechos: [{ nome: 'tras', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'baixo', pontos: 2 }],
      lacos: [0, 50, 100].map((em) => ({ em, trechos: { tras: [[0, 0], [30, 0]], cima: [[30, 0], [30, 40]], frente: [[30, 40], [0, 40]], baixo: [[0, 40], [0, 0]] } })),
    }));
    expect(conferir(contra).volume).toBeCloseTo(100 * 30 * 40, 6);
  });

  it('entrega ao passo subdivisao sem órfão, com a mesma saída a cada chamada', () => {
    const st = entrega(g);
    expect(st.orfaos).toEqual([]);
    expect(st.F.size).toBe(g.passo.faces.reduce((s: number, f: string[]) => s + f.length, 0));
    expect(gaiolaPorLacos(barra()).passo).toEqual(g.passo);
    expect(JSON.stringify(gaiolaPorLacos(barra()).pontos)).toBe(JSON.stringify(g.pontos));
  });

  it('a ficha cabe no limite, cita só campos do código e o exemplo dela monta uma gaiola que o passo aceita', () => {
    const fonte = readFileSync(new URL('./gaiola-por-lacos.js', import.meta.url), 'utf8');
    const ficha = lerFicha(fonte);
    expect(ficha.nome).toBe('gaiolaPorLacos');
    for (const parte of ['serve: ', 'quando: ', 'campos:', 'exemplo:', 'peça: ']) expect(ficha.linhas.some((l: string) => l.startsWith(parte)), parte).toBe(true);
    expect(ficha.linhas.length + 1).toBeLessThanOrEqual(LIMITE_DE_LINHAS);
    for (const campo of ficha.campos) expect(new RegExp(`\\b${campo}\\b`).test(ficha.codigo), campo).toBe(true);
    const r = new Function('gaiolaPorLacos', `return ${ficha.exemplo}`)(gaiolaPorLacos);
    expect(entrega(r).orfaos).toEqual([]);
    const pecas = /^peça: (\S+) .* e (\S+) /m.exec(ficha.linhas.join('\n'))!;
    for (const p of [pecas[1], pecas[2]]) expect(() => readFileSync(new URL(`../../${p}`, import.meta.url))).not.toThrow();
  });
});

describe('gaiolaPorLacos: a ponta e o polo', () => {
  /* cunha: a face de cima encolhe até um ponto no último laço, e o último laço inteiro se funde num ponto no caso do polo */
  const cunha = (ultimo: (em: number) => any) => gaiolaPorLacos(barra({ lacos: [lacoDaBarra(0), lacoDaBarra(50), ultimo(100)] }));

  it('funde os pontos seguidos que coincidem, e a tira e a tampa viram triângulos ali', () => {
    const g = cunha((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [30, 20]], cima: [[30, 20]], tras: [[30, 20], [0, 0]] } }));
    expect(g.passo.vertices).toHaveLength(6 + 6 + 5);
    expect(g.passo.vertices).not.toContain('barra_l2_tras0');
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(c.volume).toBeGreaterThan(0);
    expect(g.passo.faces.filter((f: string[]) => f.length === 3).length).toBeGreaterThan(0);
    expect(entrega(g).orfaos).toEqual([]);
  });

  it('o laço que se funde num ponto só dispensa a tampa', () => {
    const g = cunha((em) => ({ em, trechos: { baixo: [[15, 20]], frente: [[15, 20]], cima: [[15, 20]], tras: [[15, 20]] } }));
    expect(g.passo.vertices.filter((v: string) => v.startsWith('barra_l2_'))).toEqual(['barra_l2_baixo0']);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(entrega(g).orfaos).toEqual([]);
  });
});

describe('gaiolaPorLacos: vincos, cantos e medidas', () => {
  it('o vinco por trecho é a borda da faixa dele, o entre é uma linha e o de laço é a volta', () => {
    const g = gaiolaPorLacos(barra({
      vincos: [
        { nome: 'fundo', trecho: 'baixo', nitidez: 'viva' },
        { nome: 'quina', entre: ['cima', 'tras'], nitidez: 0.5 },
        { nome: 'boca', laco: 'ultimo', trechos: ['frente', 'cima'], nitidez: 'viva' },
      ],
    }));
    const [fundo, quina, ...boca] = g.passo.vincos;
    expect(fundo.pontos).toEqual(['barra_l0_baixo0', 'barra_l1_baixo0', 'barra_l2_baixo0', 'barra_l2_frente0', 'barra_l1_frente0', 'barra_l0_frente0', 'barra_l0_baixo0']);
    expect(quina).toEqual({ nome: 'quina', pontos: ['barra_l0_tras0', 'barra_l1_tras0', 'barra_l2_tras0'], nitidez: 0.5 });
    expect(boca.map((v: any) => v.nome)).toEqual(['boca_frente', 'boca_cima']);
    expect(entrega(g).orfaos).toEqual([]);
  });

  it('cantos e medidas marcam só os pontos pedidos, com peso quando vem', () => {
    const g = gaiolaPorLacos(barra({ cantos: [{ entre: ['tras', 'baixo'], laco: 'primeiro' }], medidas: [{ trecho: 'cima', laco: 'l1' }, { entre: ['baixo', 'frente'], peso: 4 }] }));
    expect(g.passo.cantos).toEqual(['barra_l0_baixo0']);
    expect(g.passo.medidas).toEqual([
      { ponto: 'barra_l0_frente0', peso: 4 }, { ponto: 'barra_l1_frente0', peso: 4 }, 'barra_l1_cima0', 'barra_l1_tras0', { ponto: 'barra_l2_frente0', peso: 4 },
    ]);
    expect(entrega(g).orfaos).toEqual([]);
  });
});

describe('gaiolaPorLacos: avisos e compensação', () => {
  it('avisa a amostragem desigual entre trechos vizinhos e entre intervalos de planos', () => {
    const g = gaiolaPorLacos(barra({
      trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 9 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 9 }],
      lacos: [0, 5, 40, 100].map((em) => lacoDaBarra(em, 30, 200)),
    }));
    const refs = g.avisos.map((a: any) => [a.ref, a.trechos ?? a.lacos, a.razao]);
    expect(refs).toEqual([
      ['amostragemDesigual', ['tras', 'baixo'], 53.33],
      ['amostragemDesigual', ['baixo', 'frente'], 53.33],
      ['amostragemDesigual', ['frente', 'cima'], 53.33],
      ['amostragemDesigual', ['cima', 'tras'], 53.33],
      ['planosDesiguais', ['l0', 'l1', 'l2'], 7],
    ]);
    expect(g.avisos[0].texto).toMatch(/razão 53,3, acima de 4/);
    expect(RAZAO_MAXIMA_DE_AMOSTRAGEM).toBe(4);
    /* o vinco na junção cala o aviso dela */
    const comVinco = gaiolaPorLacos(barra({
      trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 9 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 9 }],
      lacos: [0, 50, 100].map((em) => lacoDaBarra(em, 30, 200)), vincos: [{ nome: 'q', entre: ['baixo', 'frente'], nitidez: 'viva' }],
    }));
    expect(comVinco.avisos.map((a: any) => a.trechos)).toEqual([['tras', 'baixo'], ['frente', 'cima'], ['cima', 'tras']]);
  });

  it('a compensação leva o ponto limite ao ponto declarado sem tirar o ponto do plano do laço', () => {
    /* cilindro de raio 30 ao longo de x, a seção em quatro quartos de círculo */
    const quarto = (k: number) => Array.from({ length: 33 }, (_, j) => { const t = (Math.PI / 2) * (k + j / 32); return [30 * Math.cos(t), 30 * Math.sin(t)] as Uv; });
    const cilindro = (compensar?: unknown) => gaiolaPorLacos({
      nome: 'c', eixo: 'x', tampa: { de: 'q0', ate: 'q2' }, compensar,
      trechos: [0, 1, 2, 3].map((k) => ({ nome: `q${k}`, pontos: 3 })),
      lacos: [0, 20, 40, 60, 80].map((em) => ({ em, trechos: Object.fromEntries([0, 1, 2, 3].map((k) => [`q${k}`, quarto(k)])) })),
      vincos: [{ nome: 'a', laco: 'primeiro', nitidez: 'viva' }, { nome: 'b', laco: 'ultimo', nitidez: 'viva' }],
    });
    const sem = cilindro();
    const com = cilindro(true);
    expect(sem.compensacao).toBeUndefined();
    expect(com.compensacao.residuoMm).toBeLessThan(0.05);
    expect(com.compensacao.maiorDeslocamentoMm).toBeGreaterThan(1);
    for (const k of Object.keys(com.pontosMm)) {
      expect(com.pontosMm[k][0]).toBe(com.alvosMm[k][0]);
      expect(Math.hypot(com.pontosMm[k][1], com.pontosMm[k][2])).toBeGreaterThanOrEqual(30 - 1e-9);
    }
    expect(com.alvosMm).toEqual(sem.pontosMm);
  });
});

describe('gaiolaPorLacos: recusas', () => {
  it('recusa planos a menos do mínimo, com o par mais perto e a distância', () => {
    expect(DISTANCIA_MINIMA_ENTRE_PLANOS_MM).toBe(2.5);
    const m = grito(() => gaiolaPorLacos(barra({ lacos: [0, 2, 50, 51.5, 100].map((em) => lacoDaBarra(em)) })));
    expect(m).toMatch(/os laços 'l2' \(x = 50 mm\) e 'l3' \(x = 51,5 mm\) ficam a 1,5 mm um do outro, abaixo do mínimo de 2,5 mm, e mais 1 par fica abaixo do mínimo/);
    expect(grito(() => gaiolaPorLacos(barra({ lacos: [0, 60, 50].map((em) => lacoDaBarra(em)) })))).toMatch(/ordem crescente/);
  });

  it('recusa a cota exata em todos os pontos, com a medida da peça de teste', () => {
    expect(grito(() => gaiolaPorLacos(barra({ medidas: 'todos' })))).toMatch(/817 pontos.*62,6 mm.*302 faces/);
    const tudo = trechosDaBarra.map((t) => ({ trecho: t.nome }));
    expect(grito(() => gaiolaPorLacos(barra({ medidas: tudo })))).toMatch(/marcam todos os 18 pontos/);
  });

  it('recusa a escada de cadeias desiguais, o trecho que não emenda e o trecho que falta', () => {
    expect(grito(() => gaiolaPorLacos(barra({ trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 4 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }] }))))
      .toMatch(/a tampa liga a cadeia frente \(4 pontos\) à tras \(3 pontos\)/);
    const solto = lacoDaBarra(50); solto.trechos.cima = [[30, 41], [30, 0]];
    expect(grito(() => gaiolaPorLacos(barra({ lacos: [lacoDaBarra(0), solto, lacoDaBarra(100)] })))).toMatch(/no laço 'l1', o trecho 'cima' começa em \[30; 41\] e o 'frente' acaba em \[30; 40\]/);
    const falta: any = lacoDaBarra(50); delete falta.trechos.tras;
    expect(grito(() => gaiolaPorLacos(barra({ lacos: [lacoDaBarra(0), falta, lacoDaBarra(100)] })))).toMatch(/precisa do trecho 'tras'/);
    expect(grito(() => gaiolaPorLacos(barra({ vincos: [{ nome: 'x', trecho: 'lado', nitidez: 'viva' }] })))).toMatch(/cita o trecho 'lado'/);
  });
});
