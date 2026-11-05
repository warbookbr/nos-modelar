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

/* Os limites que a coluna do braço revelou (plano dos limites do sólido por laços), cada um numa peça pequena feita aqui. A mesma
   peça com a forma da coluna está em `tools/fixtures/solido-por-lacos/coluna.test.ts`. */
const areaDaFace = (f: string[], P: Record<string, number[]>) => {
  let nx = 0; let ny = 0; let nz = 0;
  f.forEach((v, k) => {
    const [x1, y1, z1] = P[v]; const [x2, y2, z2] = P[f[(k + 1) % f.length]];
    nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
  });
  return Math.hypot(nx, ny, nz) / 2;
};
const facesDeAreaZero = (g: any) => g.passo.faces.filter((f: string[]) => areaDaFace(f, g.pontosMm) <= 1e-6).length;
/* cruz de braços de meia espessura h e meio comprimento 3, em doze trechos de dois pontos; a tampa vai da borda de baixo à de cima */
const cruz = (em: number, h: number, L = 3) => {
  const v: Uv[] = [[-h, -L], [h, -L], [h, -h], [L, -h], [L, h], [h, h], [h, L], [-h, L], [-h, h], [-L, h], [-L, -h], [-h, -h]];
  return { em, trechos: Object.fromEntries(v.map((p, k) => [`t${k}`, [p, v[(k + 1) % 12]]])) };
};
const prismaDaCruz = (hs: number[]) => gaiolaPorLacos({
  nome: 'x', eixo: 'x', tampa: { de: 't0', ate: 't6' },
  trechos: Array.from({ length: 12 }, (_, k) => ({ nome: `t${k}`, pontos: 2 })),
  lacos: hs.map((h, k) => cruz(k * 50, h)),
});

describe('gaiolaPorLacos: o laço de ponta de área zero e a tampa em cruz (limites 1 e 2)', () => {
  it('a parede de um lado sobre a do outro, na ponta, funde os pontos e não leva tampa nem face de área zero', () => {
    /* o primeiro e o último laço são a barra de largura zero: a linha de 40 mm, com a parede de baixo subindo por ela e a de cima
       descendo, cada uma com um ponto no meio que cai sobre o da outra sem ser vizinho dele */
    const g = gaiolaPorLacos(barra({
      trechos: [{ nome: 'baixo', pontos: 3 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 3 }, { nome: 'tras', pontos: 3 }],
      lacos: [lacoDaBarra(0, 0, 40), lacoDaBarra(50), lacoDaBarra(100, 0, 40)],
    }));
    expect(facesDeAreaZero(g)).toBe(0);
    expect(g.passo.vertices.filter((v: string) => v.startsWith('barra_l0_'))).toHaveLength(3);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(c.volume).toBeCloseTo(60000, 6);
    expect(entrega(g).orfaos).toEqual([]);
  });

  it('a cruz de espessura zero na ponta (duas linhas que se cruzam) também funde, e a gaiola fecha', () => {
    const g = prismaDaCruz([0, 1, 0]);
    expect(facesDeAreaZero(g)).toBe(0);
    expect(g.passo.vertices.filter((v: string) => v.startsWith('x_l0_'))).toHaveLength(5);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(c.volume).toBeGreaterThan(0);
    expect(entrega(g).orfaos).toEqual([]);
  });

  it('a cruz com espessura na ponta é recusada: a escada põe degraus sobre a mesma reta, com a medida e o que fazer', () => {
    const m = grito(() => prismaDaCruz([1, 1, 1]));
    expect(m).toMatch(/a tampa do laço 'l0' \(x = 0 mm\) tem 2 faces de área zero, a primeira com os pontos 'x_l0_t2/);
    expect(m).toMatch(/triangulação geral do polígono côncavo não cabe aqui/);
    expect(m).toMatch(/corte por outro eixo.*área zero/);
    /* a ponta convexa continua aceita */
    expect(conferir(gaiolaPorLacos(barra())).soltas).toBe(0);
  });
});

describe('gaiolaPorLacos: planos mais perto que o mínimo, isolados por vinco (limite 3)', () => {
  const planos = [0, 50, 98, 100];
  const viva = (laco: string) => ({ nome: `v${laco}`, laco, nitidez: 'viva' });

  it('o chanfro estreito passa quando os dois planos levam vinco vivo na volta inteira', () => {
    const m = grito(() => gaiolaPorLacos(barra({ lacos: planos.map((em) => lacoDaBarra(em)) })));
    expect(m).toMatch(/os laços 'l2' \(x = 98 mm\) e 'l3' \(x = 100 mm\) ficam a 2 mm um do outro, abaixo do mínimo de 2,5 mm/);
    expect(m).toMatch(/vinco 'viva' de laço inteiro/);
    const g = gaiolaPorLacos(barra({ lacos: planos.map((em) => lacoDaBarra(em)), vincos: [viva('l2'), viva('l3')] }));
    expect(g.lacos.map((l: any) => l.em)).toEqual(planos);
    /* o vinco isola a faixa, e a razão de 24 entre os intervalos em volta de l2 não vira aviso */
    expect(g.avisos.filter((a: any) => a.ref === 'planosDesiguais')).toEqual([]);
    expect(entrega(g).orfaos).toEqual([]);
  });

  it('um só dos dois com vinco, ou vinco que não é vivo, continua recusado', () => {
    for (const vincos of [[viva('l3')], [viva('l2'), { nome: 'f', laco: 'l3', nitidez: 0.5 }], [viva('l2'), { nome: 't', laco: 'l3', trechos: ['cima'], nitidez: 'viva' }]]) {
      expect(grito(() => gaiolaPorLacos(barra({ lacos: planos.map((em) => lacoDaBarra(em)), vincos })))).toMatch(/ficam a 2 mm um do outro/);
    }
  });

  it('o vinco de trecho ou de entre vale só na faixa de laços pedida', () => {
    const g = gaiolaPorLacos(barra({
      lacos: [0, 50, 100, 150].map((em) => lacoDaBarra(em)),
      vincos: [{ nome: 'p', entre: ['cima', 'tras'], lacos: ['l1', 'l2'], nitidez: 'viva' }, { nome: 'q', trecho: 'baixo', lacos: ['l0', 'l1'], nitidez: 'viva' }],
    }));
    expect(g.passo.vincos[0].pontos).toEqual(['barra_l1_tras0', 'barra_l2_tras0']);
    expect(g.passo.vincos[1].pontos).toEqual(['barra_l0_baixo0', 'barra_l1_baixo0', 'barra_l1_frente0', 'barra_l0_frente0', 'barra_l0_baixo0']);
    expect(grito(() => gaiolaPorLacos(barra({ vincos: [{ nome: 'p', entre: ['cima', 'tras'], lacos: ['l2', 'l1'], nitidez: 'viva' }] })))).toMatch(/o primeiro precisa vir antes do segundo/);
  });
});

describe('gaiolaPorLacos: o trecho que some e volta, e o passo dentro do trecho (limite 4)', () => {
  /* a seção de frente 30 mm no laço de fora e de frente `f` no do meio: o trecho `frente` some e volta entre os planos */
  const laco = (em: number, f: number) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [f, 40]], cima: [[f, 40], [30, 0]], tras: [[30, 0], [0, 0]] } });
  const comFrente = (f: number, extra: Record<string, unknown> = {}, pontos = 4) => gaiolaPorLacos(barra({
    trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos, ...extra }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos }],
    lacos: [laco(0, 30), laco(50, f), laco(100, 30)],
  }));

  it('o trecho de 0,4 mm ao lado de um que sumiu deixa um leque de faces finas, e com `some` ele vira um ponto', () => {
    const base = (f: number, extra: Record<string, unknown> = {}) => gaiolaPorLacos(barra({
      trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 4, ...extra }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 4 }],
      lacos: [laco(0, 0), laco(50, f), laco(100, 30)],
    }));
    const fino = base(0.4);
    const aviso = fino.avisos.find((a: any) => a.ref === 'facesFinas');
    expect(aviso.quantidade).toBeGreaterThanOrEqual(3);
    expect(aviso.razao).toBeLessThan(0.005);
    expect(aviso.texto).toMatch(/declare some/);
    const limpo = base(0.4, { some: 1 });
    expect(limpo.avisos.filter((a: any) => a.ref === 'facesFinas')).toEqual([]);
    expect(limpo.lacos.map((l: any) => l.sumiram)).toEqual([[], ['frente'], []]);
    /* o trecho que sumiu é um ponto, a meio de onde ele estava (a 0,2 mm do começo), e a gaiola fecha */
    expect(limpo.pontosMm.barra_l1_frente0[1]).toBeCloseTo(0.2, 6);
    expect(limpo.pontosMm.barra_l1_frente0[2]).toBeCloseTo(40, 6);
    expect(limpo.passo.vertices.filter((v: string) => v.startsWith('barra_l1_frente'))).toHaveLength(1);
    const c = conferir(limpo);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(entrega(limpo).orfaos).toEqual([]);
    /* o trecho que some de vez (sem comprimento) já era ponto, e sai igual com ou sem some */
    expect(base(0).avisos.filter((a: any) => a.ref === 'facesFinas')).toEqual([]);
    expect(base(0, { some: 1 }).passo).toEqual(base(0).passo);
    expect(grito(() => base(1, { some: -2 }))).toMatch(/some é o comprimento em mm/);
  });

  it('o passo a crescer dentro do trecho (razao) casa o trecho longo com o vizinho curto, sem o aviso de amostragem desigual', () => {
    /* a frente e a trás de 200 mm em 6 pontos (40 mm entre pontos) e a cima de 8 mm: a razão de 5 nas duas junções com ela */
    const trechos = (frente: Record<string, unknown>, tras: Record<string, unknown>) => [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 6, ...frente }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 6, ...tras }];
    const lacos = [0, 50, 100].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [200, 40]], cima: [[200, 40], [200, 32]], tras: [[200, 32], [0, 0]] } }));
    const igual = gaiolaPorLacos(barra({ trechos: trechos({}, {}), lacos }));
    expect(igual.avisos.filter((a: any) => a.ref === 'amostragemDesigual').map((a: any) => a.trechos)).toEqual([['frente', 'cima'], ['cima', 'tras']]);
    const g = gaiolaPorLacos(barra({ trechos: trechos({ razao: 0.2 }, { razao: 5 }), lacos }));
    expect(g.avisos.filter((a: any) => a.ref === 'amostragemDesigual')).toEqual([]);
    const seg = (k: number) => Math.hypot(...[0, 1, 2].map((a) => g.pontosMm[g.nomeDe('l1', 'frente', k + 1)][a] - g.pontosMm[g.nomeDe('l1', 'frente', k)][a]));
    expect(seg(4) / seg(0)).toBeCloseTo(0.2, 6);
    expect([0, 1, 2, 3, 4].reduce((s, k) => s + seg(k), 0)).toBeCloseTo(200, 6);
    expect(grito(() => gaiolaPorLacos(barra({ trechos: trechos({ razao: 0 }, {}), lacos })))).toMatch(/razao é quanto o último segmento mede do primeiro/);
  });
});

describe('gaiolaPorLacos: a compensação junto da tampa e os grupos de faces (limite 5)', () => {
  /* cilindro de eixo x e raio 30, com chanfro de 2 mm nas duas pontas (raio 28 na ponta), os anéis do chanfro com vinco vivo */
  const quarto = (r: number, k: number) => Array.from({ length: 9 }, (_, j) => { const t = (Math.PI / 2) * (k + j / 8); return [r * Math.cos(t), r * Math.sin(t)] as Uv; });
  const lacoRedondo = ([em, r]: number[]) => ({ em, trechos: Object.fromEntries([0, 1, 2, 3].map((k) => [`q${k}`, quarto(r, k)])) });
  const cilindro = (extra: Record<string, unknown> = {}) => gaiolaPorLacos({
    nome: 'c', eixo: 'x', tampa: { de: 'q0', ate: 'q2' }, trechos: [0, 1, 2, 3].map((k) => ({ nome: `q${k}`, pontos: 9 })),
    lacos: [[0, 28], [2, 30], [20, 30], [40, 30], [58, 30], [60, 28]].map(lacoRedondo),
    vincos: ['l0', 'l1', 'l4', 'l5'].map((l) => ({ nome: l, laco: l, nitidez: 'viva' })), compensar: true, ...extra,
  });
  const raioEm = (g: any, x: number) => {
    const v = [...entrega(g, { niveis: 2 }).V.values()].filter((p: number[]) => Math.abs(p[0] * 1000 - x) < 0.01 && Math.hypot(p[1], p[2]) * 1000 > 25).map((p: number[]) => Math.hypot(p[1], p[2]) * 1000);
    return [Math.min(...v), Math.max(...v)];
  };

  it('o anel de vinco vivo da ponta chega ao raio declarado, e o ponto da curva do vinco não anda para fora da face', () => {
    const g = cilindro();
    /* na ponta o anel é de 28 mm: o limite do vinco vivo passa por ele, sem sobra nem falta (a normal média das faces deixava 0,17 mm) */
    const [, max] = raioEm(g, 0);
    expect(max).toBeGreaterThan(27.98); expect(max).toBeLessThan(28.02);
    const [min2, max2] = raioEm(g, 2);
    expect(min2).toBeGreaterThan(29.98); expect(max2).toBeLessThan(30.02);
    expect(Math.min(...[...entrega(g, { niveis: 2 }).V.values()].map((p: number[]) => p[0] * 1000))).toBeGreaterThan(-1e-6);
    expect(g.compensacao.residuoMm).toBeLessThan(0.05);
  });

  it('a lâmina de ponta, com `pontas`, também é compensada ao longo do eixo; sem `pontas` fica onde está', () => {
    const afinada = (compensar: unknown) => gaiolaPorLacos(barra({ lacos: [lacoDaBarra(0, 0, 40), lacoDaBarra(10, 30), lacoDaBarra(100, 30), lacoDaBarra(110, 0, 40)], compensar }));
    const sem = afinada(true); const com = afinada({ pontas: true });
    expect(com.compensacao.pontos).toBeGreaterThan(sem.compensacao.pontos);
    expect(sem.pontosMm.barra_l0_baixo0[0]).toBe(0);
    expect(com.pontosMm.barra_l0_baixo0[0]).not.toBe(0);
  });

  it('os grupos saem da gaiola por faixa de laços e por trecho, em nomes de ponto', () => {
    const g = gaiolaPorLacos(barra({
      lacos: [0, 50, 100, 150].map((em) => lacoDaBarra(em)),
      grupos: [{ nome: 'esquerda', lacos: ['l0', 'l2'] }, { nome: 'direita', lacos: ['l2', 'l3'] }, { nome: 'frente', trechos: ['frente'] }],
    }));
    const por = Object.fromEntries(g.passo.grupos.map((x: any) => [x.nome, x.pontos]));
    expect(por.esquerda).toHaveLength(18);
    expect(por.esquerda).toContain('barra_l2_tras0');
    expect(por.direita).not.toContain('barra_l1_tras0');
    expect(por.frente.every((p: string) => /frente|cima0/.test(p))).toBe(true);
    expect(grito(() => gaiolaPorLacos(barra({ grupos: [{ nome: 'a' }, { nome: 'a' }] })))).toMatch(/o grupo 'a' aparece duas vezes/);
    expect(grito(() => gaiolaPorLacos(barra({ grupos: [{ nome: 'a', lacos: ['l2', 'l9'] }] })))).toMatch(/cita o laço 'l9', que não existe/);
  });
});
