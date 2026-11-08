/* gaiola-por-lacos.test.ts — o ajudante `gaiolaPorLacos` em peças pequenas feitas aqui: a barra da ficha, a reamostragem por trecho,
   a escada da tampa, a fusão da ponta, a orientação pelo volume, as três formas de vinco, cantos e medidas, os avisos de amostragem
   desigual, a compensação, as recusas com a medida na mensagem, a entrega ao passo `subdivisao` e a mesma saída a cada chamada. As
   peças de teste do plano, com as medidas contra o ombro feito à mão, estão em `tools/fixtures/solido-por-lacos/`. A ficha é a do
   comando `capacidade`, recortada do cabeçalho e conferida aqui pelo mesmo `lerFicha`. Os campos `encolhe` (trecho que vai a um ponto
   numa faixa de laços) e `esvai` (nitidez do vinco que cai a zero numa faixa) têm a seção própria no fim, com a prova de que sem eles a
   gaiola das peças de teste é a de antes. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { DISTANCIA_MINIMA_ENTRE_PLANOS_MM, RAZAO_MAXIMA_DE_AMOSTRAGEM, gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';
// @ts-expect-error — ferramenta em JavaScript.
import { LIMITE_DE_LINHAS, lerFicha } from '../../tools/modelar/capacidade.mjs';
// @ts-expect-error — peça de teste em JavaScript.
import { derivar as derivarL } from '../../tools/fixtures/solido-por-lacos/forma.js';
// @ts-expect-error — peça de teste em JavaScript.
import { derivar as derivarColuna } from '../../tools/fixtures/solido-por-lacos/coluna-forma.js';
// @ts-expect-error — peça de teste em JavaScript.
import { derivar as derivarDobra } from '../../tools/fixtures/solido-por-lacos/dobra-em-u.js';

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

describe('gaiolaPorLacos: o trecho `ate` da tampa com vários pontos alinhados', () => {
  /* a bateria da abertura em qualquer direção (2026-11-06) achou: a escada fechava a última face sobre a reta do trecho `ate`, uma
     face de área zero que o ajudante recusava; agora os pontos entram na última face, entre o degrau e a ponta, como os de `de`
     entram na primeira */
  const areaDaFace = (g: any, f: string[]) => {
    let n = [0, 0, 0];
    f.forEach((v, k) => {
      const [x1, y1, z1] = g.pontosMm[v]; const [x2, y2, z2] = g.pontosMm[f[(k + 1) % f.length]];
      n = [n[0] + (y1 - y2) * (z1 + z2), n[1] + (z1 - z2) * (x1 + x2), n[2] + (x1 - x2) * (y1 + y2)];
    });
    return Math.hypot(...n) / 2;
  };
  for (const [lados, degraus] of [[3, 'dois degraus'], [2, 'um degrau']] as const) {
    it(`com ${degraus}, o trecho com 4 pontos fecha a escada sem face de área zero e a barra mantém o volume`, () => {
      const g = gaiolaPorLacos(barra({ trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: lados }, { nome: 'cima', pontos: 4 }, { nome: 'tras', pontos: lados }] }));
      const c = conferir(g);
      expect(c.soltas + c.repetidas).toBe(0);
      expect(c.volume).toBeCloseTo(100 * 30 * 40, 6);
      expect(Math.min(...g.passo.faces.map((f: string[]) => areaDaFace(g, f)))).toBeGreaterThan(1);
      expect(g.passo.faces.some((f: string[]) => f.length === 6)).toBe(lados === 2 || lados === 3);
      expect(entrega(g).orfaos).toEqual([]);
    });
  }
  it('o trecho `ate` curvo (arco) continua fechando com a face própria', () => {
    const arco = Array.from({ length: 5 }, (_, k) => [30 + 6 * Math.sin((Math.PI * k) / 4), 40 - 10 * k]);
    const g = gaiolaPorLacos(barra({ trechos: trechosDaBarra.map((t) => (t.nome === 'cima' ? { ...t, pontos: 5 } : t)), lacos: [0, 50, 100].map((em) => ({ em, trechos: { ...lacoDaBarra(em).trechos, cima: arco } })) }));
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(g.passo.faces.some((f: string[]) => f.length === 5)).toBe(true);
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

  it('a cruz com espessura na ponta é aceita: a escada põe degraus sobre a mesma reta, e a tampa vira a triangulação do contorno por orelhas', () => {
    const g = prismaDaCruz([1, 1, 1]);
    expect(facesDeAreaZero(g)).toBe(0);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(c.volume).toBeGreaterThan(0);
    expect(entrega(g).orfaos).toEqual([]);
    /* a ponta convexa continua com a escada */
    expect(conferir(gaiolaPorLacos(barra())).soltas).toBe(0);
    expect(gaiolaPorLacos(barra()).passo.faces).toHaveLength(2 * 6 + 2 * 2);
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

describe('gaiolaPorLacos: o trecho que encolhe até um ponto numa faixa de laços (encolhe)', () => {
  /* a seção de 30 mm de lado: o trecho `frente`, de y = 0 a y = f em z = 40, e o `cima`, de [f, 40] a [30, 0] */
  const laco = (em: number, f: number) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [f, 40]], cima: [[f, 40], [30, 0]], tras: [[30, 0], [0, 0]] } });
  const trechos = (encolhe?: Record<string, unknown>, extra: Record<string, unknown> = {}) => [
    { nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 4, ...(encolhe ? { encolhe } : {}), ...extra }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 4 },
  ];
  const EMS = [0, 10, 20, 30, 40];
  /* a receita dá o trecho inteiro em todo laço da faixa e um ponto em `ate`: a frente de 30 mm, e de zero no último laço */
  const cheios = EMS.map((em) => laco(em, em === 40 ? 0 : 30));
  const com = (encolhe: Record<string, unknown> | undefined, lacos = cheios) => gaiolaPorLacos(barra({ trechos: trechos(encolhe), lacos }));
  const y = (g: any, l: string, k: number) => g.pontosMm[g.nomeDe(l, 'frente', k)][1];

  it('os pontos se aproximam por igual, no peso da posição do laço, e se fundem no laço final', () => {
    const g = com({ de: 'l1', ate: 'l4' });
    /* l1 (de) fica como a receita deu; em l2 e l3 o trecho mede 20 e 10 mm, com passo igual entre os 4 pontos; em l4 é um ponto só */
    expect([0, 1, 2, 3].map((k) => y(g, 'l1', k))).toEqual([0, 10, 20, 30]);
    [0, 20 / 3, 40 / 3, 20].forEach((v, k) => expect(y(g, 'l2', k)).toBeCloseTo(v, 9));
    expect(y(g, 'l3', 3)).toBeCloseTo(10, 9);
    expect(g.passo.vertices.filter((v: string) => v.startsWith('barra_l4_frente'))).toHaveLength(1);
    /* o vizinho começa onde o trecho acaba: a face de cima começa em y = 20 no laço l2 */
    expect(g.pontosMm[g.nomeDe('l2', 'cima', 0)][1]).toBeCloseTo(20, 9);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
    expect(entrega(g).orfaos).toEqual([]);
    expect(g.avisos.filter((a: any) => a.ref === 'facesFinas')).toEqual([]);
  });

  it('é o mesmo que a receita dar à mão o trecho já encolhido em cada laço', () => {
    const g = com({ de: 'l1', ate: 'l4' });
    const aMao = gaiolaPorLacos(barra({
      trechos: trechos(),
      lacos: [laco(0, 30), laco(10, 30), laco(20, 20), laco(30, 10), laco(40, 0)],
    }));
    expect(g.passo.faces).toEqual(aMao.passo.faces);
    for (const [nome, p] of Object.entries(aMao.pontosMm) as [string, number[]][]) p.forEach((v, k) => expect(g.pontosMm[nome][k]).toBeCloseTo(v, 9));
  });

  it('a curva `entrada` parte parada: o peso é 2t² - t³, menor que o linear no começo da faixa', () => {
    const g = com({ de: 'l1', ate: 'l4', curva: 'entrada' });
    const t = 1 / 3;
    expect(y(g, 'l2', 3)).toBeCloseTo(30 * (1 - t * t * (2 - t)), 9);
    expect(y(g, 'l2', 3)).toBeGreaterThan(y(com({ de: 'l1', ate: 'l4' }), 'l2', 3));
    expect(y(g, 'l3', 3)).toBeCloseTo(30 * (1 - (2 / 3) ** 2 * (2 - 2 / 3)), 9);
  });

  it('sem `encolhe` o trecho fica como a receita deu, e `primeiro` e `ultimo` valem como nomes', () => {
    expect(y(com(undefined), 'l2', 3)).toBe(30);
    expect(y(com({ de: 'primeiro', ate: 'ultimo' }), 'l2', 3)).toBeCloseTo(15, 9);
  });

  it('recusa a faixa inválida com o laço, a medida e o que fazer', () => {
    expect(grito(() => com({ de: 'l3', ate: 'l1' }))).toMatch(/o trecho 'frente', em encolhe, vai do laço 'l3' ao 'l1', e o primeiro precisa vir antes do segundo/);
    expect(grito(() => com({ de: 'l2', ate: 'l2' }))).toMatch(/o primeiro precisa vir antes do segundo/);
    expect(grito(() => com({ de: 'l1', ate: 'l9' }))).toMatch(/o trecho 'frente', em encolhe cita o laço 'l9', que não existe/);
    expect(grito(() => com({ de: 'l1' }))).toMatch(/encolhe sem ate; ate é o nome do laço/);
    expect(grito(() => com([] as any))).toMatch(/encolhe \[\]; encolhe é \{ de, ate \}/);
    expect(grito(() => com({ de: 'l1', ate: 'l4', curva: 'salto' }))).toMatch(/curva é 'linear' ou 'entrada'/);
    /* o trecho precisa ser um ponto em `ate`: aqui mede 30 mm */
    expect(grito(() => com({ de: 'l1', ate: 'l3' }))).toMatch(/o trecho 'frente', em encolhe, mede 30 mm no laço 'l3' \(x = 30 mm\), onde a faixa acaba; nele o trecho precisa ser um ponto/);
    /* dois trechos seguidos com faixas diferentes não se encontram depois de encolher */
    const dois = [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 4, encolhe: { de: 'l1', ate: 'l4' } }, { nome: 'cima', pontos: 2, encolhe: { de: 'l2', ate: 'l4' } }, { nome: 'tras', pontos: 4 }];
    const lacos = EMS.map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [em === 40 ? 0 : 30, 40]], cima: em === 40 ? [[0, 40]] : [[30, 40], [30, 0]], tras: em === 40 ? [[0, 40], [0, 0]] : [[30, 0], [0, 0]] } }));
    expect(grito(() => gaiolaPorLacos(barra({ trechos: dois, lacos })))).toMatch(/no laço 'l2' \(x = 20 mm\), depois de encolher, o trecho 'cima' começa a 10 mm de onde o 'frente' acaba; trechos seguidos que encolhem usam a mesma faixa/);
  });
});

describe('gaiolaPorLacos: o vinco que perde a nitidez numa faixa de laços (esvai)', () => {
  const lacos = [0, 10, 20, 30, 40].map((em) => lacoDaBarra(em));
  const com = (v: Record<string, unknown>) => gaiolaPorLacos(barra({ lacos, vincos: [{ nome: 'v', entre: ['baixo', 'frente'], nitidez: 0.8, ...v }] }));

  it('mantém a nitidez até `de`, cai a zero em `ate` com a média em cada aresta, e acaba aí', () => {
    const g = com({ esvai: { de: 'l1', ate: 'l4' } });
    expect(g.passo.vincos.map((v: any) => v.nome)).toEqual(['v', 'v_1', 'v_2', 'v_3']);
    [0.8, 0.666667, 0.4, 0.133333].forEach((n, k) => expect(g.passo.vincos[k].nitidez).toBeCloseTo(n, 6));
    expect(g.passo.vincos.map((v: any) => v.pontos)).toEqual([0, 1, 2, 3].map((r) => [`barra_l${r}_frente0`, `barra_l${r + 1}_frente0`]));
    expect(entrega(g, { niveis: 2 }).orfaos).toEqual([]);
    /* o vinco acaba no laço `ate`, sem aresta de nitidez zero até o fim dos laços */
    const cedo = com({ esvai: { de: 'l0', ate: 'l2' } });
    expect(cedo.passo.vincos.map((v: any) => v.pontos)).toEqual([['barra_l0_frente0', 'barra_l1_frente0'], ['barra_l1_frente0', 'barra_l2_frente0']]);
    [0.6, 0.2].forEach((n, k) => expect(cedo.passo.vincos[k].nitidez).toBeCloseTo(n, 6));
  });

  it('a curva `entrada` começa a tirar a nitidez parada, e a faixa inteira desce até zero', () => {
    const linear = com({ esvai: { de: 'l0', ate: 'l4' } }).passo.vincos.map((v: any) => v.nitidez);
    const entrada = com({ esvai: { de: 'l0', ate: 'l4', curva: 'entrada' } }).passo.vincos.map((v: any) => v.nitidez);
    expect(entrada[0]).toBeGreaterThan(linear[0]);
    expect(entrada.every((n: number, k: number) => k === 0 || n < entrada[k - 1])).toBe(true);
    expect(entrada[3]).toBeGreaterThan(0);
  });

  it('o vinco sem `esvai` sai como antes, um só e de nitidez constante', () => {
    expect(com({}).passo.vincos).toEqual([{ nome: 'v', pontos: [0, 1, 2, 3, 4].map((r) => `barra_l${r}_frente0`), nitidez: 0.8 }]);
  });

  it('recusa nitidez viva, faixa fora dos laços do vinco, faixa invertida e vinco que não corre pelos laços', () => {
    expect(grito(() => com({ nitidez: 'viva', esvai: { de: 'l1', ate: 'l3' } }))).toMatch(/esvai com nitidez "viva"; a nitidez que cai até zero parte de um número entre 0 \(exclusive\) e 1/);
    expect(grito(() => com({ esvai: { de: 'l3', ate: 'l1' } }))).toMatch(/esvai vai de 'l3' a 'l1', e o primeiro precisa vir antes do segundo/);
    expect(grito(() => com({ lacos: ['l1', 'l3'], esvai: { de: 'l0', ate: 'l2' } }))).toMatch(/esvai vai do laço 'l0' ao 'l2', e o vinco só corre do 'l1' ao 'l3'/);
    expect(grito(() => com({ esvai: { de: 'l1', ate: 'l9' } }))).toMatch(/cita o laço 'l9', que não existe/);
    expect(grito(() => com({ esvai: { de: 'l1' } }))).toMatch(/esvai sem ate/);
    for (const forma of [{ entre: undefined, trecho: 'baixo' }, { entre: undefined, laco: 'l1' }]) {
      expect(grito(() => com({ ...forma, esvai: { de: 'l1', ate: 'l3' } }))).toMatch(/esvai, que só vale no vinco de entre/);
    }
  });
});

describe('gaiolaPorLacos: sem os campos novos a malha das peças de teste é a de antes', () => {
  /* a assinatura da gaiola inteira (passo, pontos, alvos, avisos, laços e compensação) tirada antes de `encolhe` e `esvai` existirem; se uma
     das peças mudar de propósito, tire a assinatura de novo com a mesma conta */
  const assinatura = (g: any) => createHash('sha256').update(JSON.stringify({ passo: g.passo, pontosMm: g.pontosMm, alvosMm: g.alvosMm, avisos: g.avisos, lacos: g.lacos, compensacao: g.compensacao ?? null })).digest('hex').slice(0, 16);

  it('o L, a coluna sobre o disco e a dobra em U saem com a mesma gaiola', () => {
    expect(assinatura(derivarL())).toBe('3029c2a3c583412e');
    expect(assinatura(derivarColuna())).toBe('ee545fece7402051');
    expect(assinatura(derivarDobra())).toBe('3abcad80f4b1506d');
  });
});

describe('gaiolaPorLacos: o vizinho que passa da ponta do trecho que encolhe é seguido sobre a curva dele', () => {
  /* um círculo de raio 50 em [u, v]: `dir` é a metade da direita, do alto até o fundo T = [0, -50], e `esq` a da esquerda, de T ao alto; `calombo` é
     o trecho que sai da metade da direita a -60 graus, desce 8 mm e entra na da esquerda a -120 graus. Nos laços da faixa as metades vão
     até T, passando do ponto onde o calombo as toca. */
  const ponto = (graus: number): Uv => [50 * Math.cos((graus * Math.PI) / 180), 50 * Math.sin((graus * Math.PI) / 180)];
  const arco = (de: number, ate: number, n = 91): Uv[] => Array.from({ length: n }, (_, k) => ponto(de + ((ate - de) * k) / (n - 1)));
  const laco = (em: number, ultimo: boolean) => ({
    em,
    trechos: {
      esq: arco(-90, -267),
      cima: [ponto(93), ponto(87)],
      dir: arco(87, -90),
      calombo: ultimo ? [[0, -50]] : [ponto(-60), [ponto(-60)[0], ponto(-60)[1] - 8], [ponto(-120)[0], ponto(-120)[1] - 8], ponto(-120)],
    },
  });
  const g = gaiolaPorLacos({
    nome: 'c', eixo: 'x', tampa: { de: 'cima', ate: 'calombo' },
    trechos: [{ nome: 'esq', pontos: 9 }, { nome: 'cima', pontos: 2 }, { nome: 'dir', pontos: 9 }, { nome: 'calombo', pontos: 7, encolhe: { de: 'primeiro', ate: 'ultimo' } }],
    lacos: [0, 10, 20, 30].map((em, k) => laco(em, k === 3)),
  });
  const raio = (nome: string) => { const p = g.pontosMm[nome]; return Math.hypot(p[1], p[2]); };

  it('a ponta do trecho e o fim do vizinho ficam sobre o círculo em todo laço, e o encontro anda até o fundo', () => {
    for (const l of ['l0', 'l1', 'l2', 'l3']) {
      expect(raio(g.nomeDe(l, 'calombo', 0)), `${l} começo`).toBeCloseTo(50, 2);
      expect(raio(g.nomeDe(l, 'dir', 7)), `${l} metade`).toBeCloseTo(50, 1);
    }
    /* o encontro está a -60 graus em l0 e vai a -90 em l3, de 10 em 10 graus: o peso é de 1/3 por laço */
    const angulo = (l: string) => (Math.atan2(g.pontosMm[g.nomeDe(l, 'calombo', 0)][2], g.pontosMm[g.nomeDe(l, 'calombo', 0)][1]) * 180) / Math.PI;
    expect(angulo('l0')).toBeCloseTo(-60, 1);
    expect(angulo('l1')).toBeCloseTo(-70, 1);
    expect(angulo('l2')).toBeCloseTo(-80, 1);
  });

  it('o calombo encolhe com a altura acima do círculo, sem entrar nele', () => {
    const fundo = (l: string) => Math.max(...[0, 1, 2, 3, 4, 5, 6].map((k) => raio(g.nomeDe(l, 'calombo', k))));
    expect(fundo('l0')).toBeGreaterThan(55);
    expect(fundo('l1')).toBeLessThan(fundo('l0'));
    expect(fundo('l2')).toBeLessThan(fundo('l1'));
    expect(Math.min(...[0, 1, 2, 3, 4, 5, 6].map((k) => raio(g.nomeDe('l2', 'calombo', k))))).toBeGreaterThan(49.9);
    const c = conferir(g);
    expect(c.soltas + c.repetidas).toBe(0);
  });
});

describe('gaiolaPorLacos: a costura de pontos que coincidem sem serem vizinhos (une)', () => {
  /* a barra de 40 por a: no laço do meio a seção vai a zero e vira uma linha dobrada sobre si, em que `baixo` e `cima` coincidem pontos a pontos */
  const laco = (em: number, a: number) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [a, 40]], cima: [[a, 40], [a, 0]], tras: [[a, 0], [0, 0]] } });
  const ampulheta = (extra: Record<string, unknown> = {}) => gaiolaPorLacos(barra({
    trechos: [{ nome: 'baixo', pontos: 5 }, { nome: 'frente', pontos: 2 }, { nome: 'cima', pontos: 5 }, { nome: 'tras', pontos: 2 }],
    tampa: { de: 'frente', ate: 'tras' },
    lacos: [laco(0, 30), laco(10, 0), laco(20, 30)], ...extra,
  }));

  it('sem a costura a linha dobrada tem os pontos em dobro; com ela, a linha em que o sólido toca a si mesmo dos dois lados é recusada, porque a aresta fica com quatro faces', () => {
    const sem = ampulheta();
    expect(sem.passo.vertices.filter((v: string) => v.startsWith('barra_l1_')).length).toBeGreaterThan(6);
    expect(grito(() => ampulheta({ une: [['baixo', 'cima']] }))).toMatch(/a aresta 'barra_l1_\w+'-'barra_l1_\w+' aparece 2 vezes no mesmo sentido/);
  });

  it('recusa trecho que não existe, par igual, lista vazia e trechos sem ponto em comum', () => {
    expect(grito(() => ampulheta({ une: [['baixo', 'lado']] }))).toMatch(/une\[0\] cita o trecho 'lado', que não está em trechos/);
    expect(grito(() => ampulheta({ une: [['baixo', 'baixo']] }))).toMatch(/une\[0\] precisa ser um par de dois trechos diferentes/);
    expect(grito(() => ampulheta({ une: [] }))).toMatch(/une precisa ser lista não vazia de pares/);
    expect(grito(() => ampulheta({ une: [['frente', 'tras']] }))).toMatch(/une\[0\] une os trechos 'frente' e 'tras', mas nenhum ponto de um coincide com um do outro/);
  });
});
