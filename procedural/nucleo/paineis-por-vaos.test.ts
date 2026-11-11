/* paineis-por-vaos.test.ts — o ajudante `paineisPorVaos` em peças de teste sem domínio: uma caixa de chapa de 1 mm com uma face a 38 graus
   da vista, cortada por linhas em duas vistas, e uma cuba de `subdivisao` com `espessura` de paredes a 38 graus. O vão sai medido na
   malha, de cada borda da pele de fora do pedaço à pele de fora do vizinho (a menor distância ao longo da chapa). Também: a contagem de
   passos (a chapa entra uma vez), as recusas com a mensagem, os avisos e a mesma saída a cada chamada. A ficha é a do comando
   `capacidade`, recortada do cabeçalho. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { neutroCanonico, nucleo } from './entrada.js';
// @ts-expect-error — ferramenta em JavaScript.
import { LIMITE_DE_LINHAS, lerFicha } from '../../tools/modelar/capacidade.mjs';

type V3 = [number, number, number];
const TAN38 = Math.tan((38 * Math.PI) / 180);
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };

/* a caixa de chapa: o perfil (z, y) extrudado ao longo de x entre -200 e 200, de 1 mm, aberta embaixo; o tampo é plano de z 0 a 300 e
   desce a 38 graus da horizontal de z 300 a 600, onde fecha numa parede de 65,6 mm de altura */
const Y_FIM = 300 - 300 * TAN38;
const PERFIL: [number, number][] = [[0, 0], [600, 0], [600, Y_FIM], [300, 300], [0, 300]];
const prismaX = (id: number, pol: [number, number][], x0: number, x1: number, dentro = 0) => ['extrusao', {
  origemId: id, eixo: 'x', altura: x1 - x0, em: [x0, 0, 0], perfil: [...pol].reverse().map(([z, y]) => [-y, z]),
  ...(dentro ? { deslocar: { para: 'dentro', distancia: dentro, canto: 'esquadria' } } : {}),
}];
const CAIXA = [
  prismaX(1, PERFIL, -200, 200),
  prismaX(2, [[0, -5], [600, -5], [600, Y_FIM], [300, 300], [0, 300]], -199, 199, 1),
  ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'extrusao', id: 1 } }, { origem: { op: 'extrusao', id: 2 } }] }],
];
const ORIGEM_CAIXA = { op: 'subtrair', id: 3 };
const LINHAS_CAIXA = [
  { nome: 'tampo', eixo: 'y', pontos: [[-300, 150], [300, 150]] },
  { nome: 'inclinada', eixo: 'y', pontos: [[-300, 450], [300, 450]] },
  { nome: 'parede', eixo: 'z', pontos: [[-300, 30], [300, 30]], alcance: [595, 605] },
];
const PAINEIS_CAIXA = [
  { nome: 'frente', eixo: 'y', ponto: [0, 75] },
  { nome: 'meio', eixo: 'y', ponto: [0, 225] },
  { nome: 'fundo', eixo: 'y', ponto: [0, 525] },
  { nome: 'saia', eixo: 'z', ponto: [0, 15] },
];

/* ---- a medida do vão na malha ---- */
const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const mais = (o: V3, u: V3, t: number): V3 => [o[0] + u[0] * t, o[1] + u[1] * t, o[2] + u[2] * t];
/* a distância do ponto ao triângulo (a conta da região mais perto, de Ericson) */
function distTri(p: V3, [A, B, C]: V3[]) {
  const ab = sub(B, A); const ac = sub(C, A); const ap = sub(p, A);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
  const bp = sub(p, B); const d3 = dot(ab, bp); const d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return Math.hypot(...sub(p, mais(A, ab, d1 / (d1 - d3))));
  const cp = sub(p, C); const d5 = dot(ab, cp); const d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return Math.hypot(...sub(p, mais(A, ac, d2 / (d2 - d6))));
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return Math.hypot(...sub(p, mais(B, sub(C, B), (d4 - d3) / (d4 - d3 + d5 - d6))));
  const den = 1 / (va + vb + vc); return Math.hypot(...sub(p, mais(mais(A, ab, vb * den), ac, vc * den)));
}
const normalDe = (st: any, vs: number[]): V3 => {
  let nx = 0; let ny = 0; let nz = 0;
  vs.forEach((v, k) => { const c = st.V.get(v); const d = st.V.get(vs[(k + 1) % vs.length]); nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]); });
  const L = Math.hypot(nx, ny, nz) || 1; return [nx / L, ny / L, nz / L];
};
/* a pele de fora de uma parte vista de `visto` (vetor unitário do lado do observador): os triângulos das faces que olham para ele, a mais de 60 graus */
function peleDeFora(st: any, nome: string, visto: V3) {
  const tris: V3[][] = [];
  for (const f of st.F.values()) {
    if (f.parte !== nome || dot(normalDe(st, f.vs), visto) < 0.5) continue;
    const p = f.vs.map((v: number) => st.V.get(v) as V3);
    for (let k = 1; k + 1 < p.length; k++) tris.push([p[0], p[k], p[k + 1]]);
  }
  return tris;
}
/** O vão entre dois painéis ao longo da chapa: dos cantos da pele de fora de A, dentro da janela, à pele de fora de B. */
function vaoEntre(st: any, a: string, b: string, visto: V3, janela: (p: V3) => boolean) {
  const A = peleDeFora(st, a, visto); const B = peleDeFora(st, b, visto);
  const cantosA = [...new Map(A.flat().filter(janela).map((p) => [p.join(','), p])).values()];
  const ds = cantosA.map((p) => Math.min(...B.map((t) => distTri(p, t)))).filter((d) => d < 8).sort((x, y) => x - y);
  return { min: ds[0], mediana: ds[Math.floor(ds.length / 2)], n: ds.length };
}
const executar = (g: any, params = {}, topo = {}) => nucleo(g.passos, params, topo);
const contar = (passos: any[], op: string) => passos.filter((p) => p[0] === op).length;

describe('paineisPorVaos: a caixa de chapa com uma face a 38 graus da vista', () => {
  const g = paineisPorVaos({ chapa: { passos: CAIXA, origem: ORIGEM_CAIXA }, vao: 4, linhas: LINHAS_CAIXA, paineis: PAINEIS_CAIXA });
  const st = executar(g);

  it('devolve quatro painéis nomeados e nenhum pedaço sobrando, sem aviso', () => {
    expect(st.orfaos).toEqual([]);
    expect(g.avisos).toEqual([]);
    expect(g.medidas.paineisAchados).toBe(4);
    expect(g.medidas.pedacosSemNome).toEqual([]);
    expect(g.medidas.sementesSemPainel).toEqual([]);
    expect(g.medidas.pedacos).toBe(4);
    expect(Object.keys(st.partes).sort()).toEqual(['frente', 'fundo', 'meio', 'saia']);
    expect(g.medidas.inclinacaoMaxima).toBeGreaterThan(37.9);
    expect(g.medidas.inclinacaoMaxima).toBeLessThan(38.1);
    expect(g.medidas.vaoPedido).toBe(4);
    /* as faces dos painéis são as do corte, e nenhuma face ficou sem parte */
    expect([...st.F.values()].every((f: any) => f.parte != null)).toBe(true);
  });

  it('o vão medido na malha, ao longo da chapa, fica entre 4,0 e 4,2 mm no tampo, na face inclinada e na parede', () => {
    const cima: V3 = [0, 1, 0];
    const tampo = vaoEntre(st, 'frente', 'meio', cima, (p) => Math.abs(p[2] - 150) < 10);
    const inclinada = vaoEntre(st, 'meio', 'fundo', [0, Math.cos((38 * Math.PI) / 180), Math.sin((38 * Math.PI) / 180)], (p) => Math.abs(p[2] - 450) < 10);
    const parede = vaoEntre(st, 'fundo', 'saia', [0, 0, 1], (p) => Math.abs(p[1] - 30) < 10 && p[2] > 599);
    for (const [nome, v] of Object.entries({ tampo, inclinada, parede })) {
      expect(v.n, nome).toBeGreaterThan(2);
      expect(v.min, nome).toBeGreaterThanOrEqual(3.999);
      expect(v.min, nome).toBeLessThan(4.2);
      expect(v.mediana, nome).toBeLessThan(4.2);
    }
    process.stdout.write(`[prova a] vão ao longo da chapa, pedido 4: tampo ${tampo.min.toFixed(4)}, inclinada ${inclinada.min.toFixed(4)}, parede ${parede.min.toFixed(4)}\n`);
  });

  it('sem a compensação o mesmo corte deixa 5,07 mm na face inclinada: a lâmina estreitada é o que dá 4', () => {
    const semLeitura = paineisPorVaos({ chapa: { passos: CAIXA, origem: ORIGEM_CAIXA }, vao: 4, linhas: LINHAS_CAIXA, paineis: PAINEIS_CAIXA, normal: () => [0, 1, 0] });
    const s2 = executar(semLeitura);
    const inclinada = vaoEntre(s2, 'meio', 'fundo', [0, Math.cos((38 * Math.PI) / 180), Math.sin((38 * Math.PI) / 180)], (p) => Math.abs(p[2] - 450) < 10);
    expect(inclinada.min).toBeGreaterThan(5.0);
    expect(inclinada.min).toBeLessThan(5.2);
  });

  it('a chapa entra uma vez: os passos são os da chapa, uma lâmina por linha, um subtrair e um parte por painel', () => {
    expect(g.passos.slice(0, CAIXA.length)).toEqual(CAIXA);
    expect(g.passos).toHaveLength(CAIXA.length + LINHAS_CAIXA.length + 1 + PAINEIS_CAIXA.length);
    expect(contar(g.passos, 'extrusao')).toBe(2 + LINHAS_CAIXA.length);
    expect(contar(g.passos, 'subtrair')).toBe(1 + 1);
    expect(contar(g.passos, 'parte')).toBe(PAINEIS_CAIXA.length);
    /* o `subtrair` do corte cita a chapa e as lâminas, e cada parte cita o corte */
    const corte = g.passos.find((p: any) => p[0] === 'subtrair' && p[1].origemId === g.origemDoCorte.id);
    expect(corte[1].solidos[0]).toEqual({ origem: ORIGEM_CAIXA });
    expect(corte[1].solidos).toHaveLength(1 + LINHAS_CAIXA.length);
    /* com `emitir: false` os passos da chapa ficam com a receita */
    const so = paineisPorVaos({ chapa: { passos: CAIXA, origem: ORIGEM_CAIXA, emitir: false }, vao: 4, linhas: LINHAS_CAIXA, paineis: PAINEIS_CAIXA });
    expect(so.passos).toEqual(g.passos.slice(CAIXA.length));
    process.stdout.write(`[prova c] chapa de ${CAIXA.length} passos, 4 painéis: ${g.passos.length} passos (a chapa uma vez); montar a chapa para cada painel daria ${4 * (CAIXA.length + 1) + LINHAS_CAIXA.length}\n`);
  });

  it('é determinístico: mesma entrada, mesmos passos e a mesma malha', () => {
    const outra = paineisPorVaos({ chapa: { passos: CAIXA, origem: ORIGEM_CAIXA }, vao: 4, linhas: LINHAS_CAIXA, paineis: PAINEIS_CAIXA });
    expect(JSON.stringify(outra.passos)).toBe(JSON.stringify(g.passos));
    expect(JSON.stringify(outra.medidas)).toBe(JSON.stringify(g.medidas));
    expect(JSON.stringify(neutroCanonico(executar(outra)))).toBe(JSON.stringify(neutroCanonico(st)));
  });
});

describe('paineisPorVaos: linha fechada, alcance e as recusas', () => {
  const chapa = { passos: CAIXA, origem: ORIGEM_CAIXA };
  const base = { chapa, vao: 4 };

  it('a linha fechada dentro de um painel dá o pedaço de dentro como painel próprio, ou o descarta', () => {
    const janela = { nome: 'janela', eixo: 'y', fechada: true, pontos: [[-60, 60], [60, 60], [60, 120], [-60, 120]], alcance: [290, 310] };
    const comPainel = paineisPorVaos({ ...base, linhas: [LINHAS_CAIXA[0], janela], paineis: [{ nome: 'frente', eixo: 'y', ponto: [0, 20] }, { nome: 'meio', eixo: 'y', ponto: [150, 225] }, { nome: 'tampa', eixo: 'y', ponto: [0, 90] }] });
    expect(comPainel.avisos.filter((a: any) => a.ref === 'pedacoSemNome')).toEqual([]);
    expect(comPainel.medidas.paineisAchados).toBe(3);
    const st = executar(comPainel);
    expect(st.orfaos).toEqual([]);
    /* o anel de 4 mm: a pele de fora da tampa fica a 4 mm da do painel em volta */
    const v = vaoEntre(st, 'tampa', 'frente', [0, 1, 0], (p) => Math.abs(p[0]) < 30 && Math.abs(p[2] - 60) < 10);
    expect(v.min).toBeGreaterThanOrEqual(3.999);
    expect(v.min).toBeLessThan(4.2);
    /* sem semente, o pedaço de dentro avisa; com `descarta`, a janela é só um furo e não sobra pedaço */
    const sem = paineisPorVaos({ ...base, linhas: [LINHAS_CAIXA[0], janela], paineis: [{ nome: 'frente', eixo: 'y', ponto: [0, 20] }, { nome: 'meio', eixo: 'y', ponto: [150, 225] }] });
    expect(sem.avisos.map((a: any) => a.ref)).toEqual(['pedacoSemNome']);
    expect(sem.medidas.pedacosSemNome).toHaveLength(1);
    const fura = paineisPorVaos({ ...base, linhas: [LINHAS_CAIXA[0], { ...janela, dentro: 'descarta' }], paineis: [{ nome: 'frente', eixo: 'y', ponto: [0, 20] }, { nome: 'meio', eixo: 'y', ponto: [150, 225] }] });
    expect(fura.avisos).toEqual([]);
    expect(fura.medidas.pedacos).toBe(2);
    expect(fura.passos.filter((p: any) => p[0] === 'extrusao')).toHaveLength(2 + 2);
    expect(executar(fura).orfaos).toEqual([]);
  });

  it('o alcance limita a lâmina: a linha do lado direito não corta o esquerdo', () => {
    /* a caixa vista de cima: a linha em x de 0 a 300 só corta o lado direito do tampo */
    const g = paineisPorVaos({ ...base, linhas: [LINHAS_CAIXA[0], { nome: 'lado', eixo: 'z', pontos: [[0, 295], [0, -5]], alcance: [-1, 1] }], paineis: [{ nome: 'a', eixo: 'y', ponto: [0, 75] }, { nome: 'b', eixo: 'y', ponto: [0, 225] }] });
    expect(g.medidas.paineisAchados).toBe(2);
    const corte = g.passos.find((p: any) => p[1]?.origemId === g.origemDoCorte.id);
    expect(corte[1].solidos).toHaveLength(3);
  });

  it('recusa com a mensagem que diz o que corrigir', () => {
    const com = (extra: object) => () => paineisPorVaos({ ...base, linhas: LINHAS_CAIXA, paineis: PAINEIS_CAIXA, ...extra });
    expect(grito(com({ linhas: [{ nome: 'solta', eixo: 'y', pontos: [[1000, 150], [1100, 150]] }] }))).toMatch(/a linha 'solta' não corta a chapa: nenhum dos \d+ pontos dela tem chapa na vista y.*confira o eixo da vista/);
    expect(grito(com({ paineis: [{ nome: 'longe', eixo: 'y', ponto: [900, 75] }, ...PAINEIS_CAIXA.slice(1)] }))).toMatch(/o painel 'longe' não achou pedaço: o ponto y \[900, 75\] cai fora da chapa/);
    expect(grito(com({ paineis: [{ nome: 'novao', eixo: 'y', ponto: [0, 150] }, ...PAINEIS_CAIXA.slice(1)] }))).toMatch(/o painel 'novao' não achou pedaço: o ponto y \[0, 150\] cai num vão/);
    expect(grito(com({ paineis: [PAINEIS_CAIXA[0], { nome: 'repetido', eixo: 'y', ponto: [0, 75] }, ...PAINEIS_CAIXA.slice(2)] }))).toMatch(/os painéis 'frente' e 'repetido' recebem a mesma semente.*dê a cada painel um ponto dentro do pedaço dele/);
    expect(grito(com({ paineis: [PAINEIS_CAIXA[0], { nome: 'mesmo', eixo: 'y', ponto: [10, 80] }, ...PAINEIS_CAIXA.slice(2)] }))).toMatch(/os painéis 'frente' e 'mesmo' caem no mesmo pedaço/);
    expect(grito(com({ paineis: [PAINEIS_CAIXA[0], { ...PAINEIS_CAIXA[1], nome: 'frente' }] }))).toMatch(/dois painéis se chamam 'frente'/);
    expect(grito(com({ vao: 0 }))).toMatch(/vao precisa ser maior que zero/);
    expect(grito(com({ chapa: { passos: [...CAIXA, ['cubo', { origemId: 7, lado: 10 }]], origem: ORIGEM_CAIXA } }))).toMatch(/deixam \d+ face\(s\) fora da origem subtrair:3/);
  });

  it('a semente perdida avisa, em vez de recusar, com sementesPerdidas: avisa', () => {
    const g = paineisPorVaos({ ...base, linhas: LINHAS_CAIXA, paineis: [{ nome: 'longe', eixo: 'y', ponto: [900, 75] }, ...PAINEIS_CAIXA.slice(1)], sementesPerdidas: 'avisa' });
    expect(g.medidas.sementesSemPainel).toEqual(['longe']);
    expect(g.avisos.map((a: any) => a.ref)).toContain('sementeSemPainel');
    expect(g.avisos.map((a: any) => a.ref)).toContain('pedacoSemNome');
  });

  it('avisa a lasca: o pedaço de poucos mm² que a linha deixa no canto', () => {
    const g = paineisPorVaos({ ...base, areaMinima: 100,
      linhas: [{ nome: 'perto', eixo: 'y', pontos: [[-300, 3], [300, 3]] }, LINHAS_CAIXA[0]],
      paineis: [{ nome: 'resto', eixo: 'y', ponto: [0, 75] }, { nome: 'tampo', eixo: 'y', ponto: [0, 225] }] });
    expect(g.avisos.map((a: any) => a.ref)).toContain('lasca');
  });
});

describe('paineisPorVaos: a chapa de subdivisao com espessura', () => {
  /* a cuba aberta em cima, de paredes a 38 graus da vertical, laços em y, retângulo de cantos em arco de raio 10 */
  const rc = 10; const m = 6;
  const lacoDaCuba = (em: number) => {
    const a = 60 + em * TAN38; const b = 40 + em * TAN38;
    const arco = (cx: number, cz: number, a0: number) => Array.from({ length: m + 1 }, (_, k) => { const t = a0 + (Math.PI / 2) * k / m; return [cx + rc * Math.cos(t), cz + rc * Math.sin(t)]; });
    return { em, trechos: {
      baixo: [[-a + rc, -b], [a - rc, -b]], dir: [...arco(a - rc, -b + rc, -Math.PI / 2), ...arco(a - rc, b - rc, 0)],
      cima: [[a - rc, b], [-a + rc, b]], esq: [...arco(-a + rc, b - rc, Math.PI / 2), ...arco(-a + rc, -b + rc, Math.PI)],
    } };
  };
  const gaiola = gaiolaPorLacos({
    nome: 'cuba', eixo: 'y', tampa: { de: 'esq', ate: 'dir' }, aberta: 'fim', espessura: 1,
    trechos: [{ nome: 'baixo', pontos: 5 }, { nome: 'dir', pontos: 9 }, { nome: 'cima', pontos: 5 }, { nome: 'esq', pontos: 9 }],
    lacos: [0, 20, 40, 60, 80].map(lacoDaCuba),
  });
  const passos = [['subdivisao', { origemId: 1, ...gaiola.passo, niveis: 2, espessura: 1 }]];
  const chapa = { passos, origem: { op: 'subdivisao', id: 1 }, pontos: gaiola.pontosMm };
  const entrada = {
    chapa, vao: 4,
    linhas: [{ nome: 'cintura', eixo: 'x', pontos: [[-100, 40], [100, 40]] }],
    paineis: [{ nome: 'fundo', eixo: 'y', ponto: [0, 0] }, { nome: 'aro', eixo: 'y', ponto: [112, 0] }],
  };
  const g = paineisPorVaos(entrada);
  const st = nucleo(g.passos, {}, gaiola.pontosMm);

  it('parte a cuba em dois painéis nomeados, com a chapa construída uma vez', () => {
    expect(st.orfaos).toEqual([]);
    expect(g.medidas.paineisAchados).toBe(2);
    expect(g.medidas.pedacosSemNome).toEqual([]);
    expect(g.medidas.inclinacaoMaxima).toBeGreaterThan(30);
    expect(g.passos).toHaveLength(passos.length + 1 + 1 + 2);
    expect(contar(g.passos, 'subdivisao')).toBe(1);
  });

  it('o vão ao longo da parede, na cintura, fica entre 4,0 e 4,2 mm', () => {
    const c = Math.cos((38 * Math.PI) / 180); const s = Math.sin((38 * Math.PI) / 180);
    const dir = vaoEntre(st, 'fundo', 'aro', [c, -s, 0], (p) => p[0] > 20 && Math.abs(p[2]) < 25);
    const esq = vaoEntre(st, 'fundo', 'aro', [-c, -s, 0], (p) => p[0] < -20 && Math.abs(p[2]) < 25);
    for (const [nome, v] of Object.entries({ dir, esq })) {
      expect(v.n, nome).toBeGreaterThan(2);
      expect(v.min, nome).toBeGreaterThanOrEqual(3.99);
      expect(v.min, nome).toBeLessThan(4.2);
    }
    process.stdout.write(`[prova b] vão ao longo da parede da cuba de subdivisão com espessura, pedido 4: direita ${dir.min.toFixed(4)}, esquerda ${esq.min.toFixed(4)}; inclinação lida ${g.medidas.inclinacaoMaxima}\n`);
  });

  it('é determinístico', () => {
    const outra = paineisPorVaos(entrada);
    expect(JSON.stringify(outra.passos)).toBe(JSON.stringify(g.passos));
  });
});

describe('paineisPorVaos: a ficha', () => {
  const fonte = readFileSync(new URL('./paineis-por-vaos.js', import.meta.url), 'utf8');
  const ficha = lerFicha(fonte);

  it('a ficha cabe no limite do comando capacidade e cada campo citado está no código', () => {
    expect(ficha).not.toBeNull();
    expect(ficha.nome).toBe('paineisPorVaos');
    expect(ficha.linhas.length).toBeLessThanOrEqual(LIMITE_DE_LINHAS);
    for (const campo of ficha.campos) expect(ficha.codigo, campo).toContain(campo);
    for (const campo of ['chapa', 'vao', 'linhas', 'paineis']) expect(ficha.campos).toContain(campo);
  });

  it('o exemplo da ficha roda sobre a caixa de teste', () => {
    expect(ficha.exemplo).toContain('paineisPorVaos(');
  });
});
