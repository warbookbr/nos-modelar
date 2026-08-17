/* Integridade da peça de exercício `_tampa-de-caixa` — a prova NÃO AUTOMOTIVA
   do ciclo "Furo v2": vários furos na MESMA face, num passo só.

   Por que ela existe separada dos testes do núcleo: `tools/oficina/oficina.test.ts`
   prova a op `furo` em listas montadas para ela. A pergunta aqui é a do
   produto — uma PEÇA escrita como um autor escreveria continua com identidade
   completa depois de um círculo de parafusos e de dois furos cegos na mesma
   face? A `_prateleira-furada` foi desenhada EM VOLTA do A-26 (três furos,
   três faces); esta é a mesma família de objeto com a limitação paga.

   O que ela prende, e que nenhum outro arquivo prende:

   - a chapa é UM corpo com quatro furos, não quatro chapas com um furo cada.
     Era exatamente esse o custo do A-26, medido na régua do flange do freio
     (cinco corpos onde deveriam ser dois);
   - cada parafuso do círculo é endereçável SOZINHO (`furo: 2`), e o que ele
     entrega é um quarto do que a família inteira entrega;
   - a contagem de faces acompanha `parafusos`: mudar o TOPO de 4 para 6 muda
     o desenho e nada mais — nenhuma coordenada escrita à mão fica para trás.

   Régua headless da mesma peça: `npm run descrever -- _tampa-de-caixa --estrito`. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — módulo .js do motor v3 (sem tipos)
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — peça .js do Atelier
import * as tampa from '../../prototipos/procedural/v3/pecas/_tampa-de-caixa.js';

const montar = (topo: any = tampa.TOPO) =>
  nucleo(tampa.PASSOS, tampa.PARAMS, topo, tampa.MATERIAIS, null, tampa.ALIASES);

const PARTES = ['cabecaDaTampa', 'chapaDaTampa', 'furosDePino', 'furosDeParafuso'].sort();
const facesDaParte = (n: any, nome: string) => [...n.F.values()].filter((f: any) => f.parte === nome);
const P = tampa.PARAMS;

/* arestas com saldo ≠ 0 = malha aberta. Uma partição errada aparece aqui e em
   lugar nenhum: a foto de uma placa com quatro furos fica plausível mesmo com
   um triângulo faltando. */
const arestasSoltas = (n: any) => {
  const m = new Map<string, number>();
  for (const f of n.F.values() as any) for (let k = 0; k < f.vs.length; k++) {
    const a = f.vs[k], b = f.vs[(k + 1) % f.vs.length];
    m.set(a < b ? `${a}_${b}` : `${b}_${a}`, (m.get(a < b ? `${a}_${b}` : `${b}_${a}`) ?? 0) + (a < b ? 1 : -1));
  }
  return [...m.values()].filter((v) => v !== 0).length;
};

describe('_tampa-de-caixa — o círculo de parafusos cabe numa placa só', () => {
  it('não tem órfão, nenhuma face fica sem identidade e a malha fecha', () => {
    const n = montar();
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => !f.parte)).toEqual([]);
    expect(arestasSoltas(n)).toBe(0);
  });

  it('expõe as quatro partes pelo nome, e só elas', () => {
    const nomes = new Set<string>();
    for (const face of montar().F.values() as any) nomes.add(face.parte);
    expect([...nomes].sort()).toEqual(PARTES);
  });

  it('UMA face de entrada e UMA de saída somem — quatro furos, duas faces consumidas', () => {
    const n = montar();
    // o cubo da tampa declarou seis faces; topo e fundo viraram o círculo de
    // parafusos INTEIRO. As outras quatro continuam de pé.
    expect([0, 1, 2, 3, 4, 5].filter((f) => n.F.has(f))).toEqual([2, 3, 4, 5]);
  });

  it('a chapa é UM corpo com quatro furos, e não quatro chapas de um furo — é o custo que o A-26 cobrava', () => {
    const n = montar();
    /* corpos = componentes conexos por VÉRTICE compartilhado, dentro da parte.
       Com um furo por face, cada parafuso teria de morar num ressalto próprio,
       e a chapa sairia partida em vários corpos. */
    const faces = facesDaParte(n, 'chapaDaTampa');
    const pai = new Map<number, number>();
    const raiz = (v: number): number => (pai.get(v) === v ? v : raiz(pai.get(v)!));
    for (const f of faces as any) for (const v of f.vs) if (!pai.has(v)) pai.set(v, v);
    for (const f of faces as any) for (const v of f.vs) pai.set(raiz(v), raiz(f.vs[0]));
    expect(new Set([...pai.keys()].map(raiz)).size).toBe(1);
  });

  it('cada parafuso do círculo é endereçável SOZINHO, e a família inteira vale quatro deles', () => {
    const n = montar();
    const paredes = facesDaParte(n, 'furosDeParafuso');
    expect(paredes).toHaveLength(4 * (tampa.TOPO.furoLados as number));
    // o alias `terceiroParafuso` é o mesmo círculo, recortado por `furo: 2`
    const so = nucleo(
      [...tampa.PASSOS, ['pincel', { modo: 'face', sel: { alias: 'terceiroParafuso' }, cor: '#f0f' }]],
      tampa.PARAMS, tampa.TOPO, tampa.MATERIAIS, null, tampa.ALIASES,
    );
    expect(so.orfaos).toEqual([]);
    const pintadas = [...so.F.values()].filter((f: any) => f.cor === '#f0f');
    expect(pintadas).toHaveLength(tampa.TOPO.furoLados as number);
    // e são paredes DE UM furo só: todas a `orbitaDoParafuso` do eixo, do mesmo lado
    const xs = pintadas.flatMap((f: any) => f.vs.map((v: number) => so.V.get(v)[0]));
    const zs = pintadas.flatMap((f: any) => f.vs.map((v: number) => so.V.get(v)[2]));
    const centro = [xs.reduce((a, b) => a + b, 0) / xs.length, zs.reduce((a, b) => a + b, 0) / zs.length];
    expect(Math.hypot(centro[0], centro[1])).toBeCloseTo(P.orbitaDoParafuso, 9);
  });

  it('os quatro furos estão na órbita declarada, com o raio declarado', () => {
    const n = montar();
    const L = tampa.TOPO.furoLados as number;
    for (let k = 0; k < (tampa.TOPO.parafusos as number); k++) {
      for (let j = 0; j < L; j++) {
        const p = n.V.get(1000 + 2 * L * k + j);   // o furo é o passo 1: b = 1000
        // cada vértice do anel k está a `parafusoRaio` do centro do furo k
        /* o quadro da face de topo com `orientacao:[1,0,0]`: +u é +x e
           +w = N × u é −z. O furo 0 fica no +u, e os outros avançam de 90°. */
        const cx = Math.cos((k * 2 * Math.PI) / 4) * P.orbitaDoParafuso;
        const cz = -Math.sin((k * 2 * Math.PI) / 4) * P.orbitaDoParafuso;
        expect(Math.hypot(p[0] - cx, p[2] - cz)).toBeCloseTo(P.parafusoRaio, 9);
      }
    }
  });

  it('mudar `parafusos` muda o desenho e mais nada: seis furos saem sem tocar em coordenada nenhuma', () => {
    const seis = montar({ ...tampa.TOPO, parafusos: 6 });
    expect(seis.orfaos).toEqual([]);
    expect(arestasSoltas(seis)).toBe(0);
    expect(facesDaParte(seis, 'furosDeParafuso')).toHaveLength(6 * (tampa.TOPO.furoLados as number));
    expect([...new Set([...seis.F.values()].map((f: any) => f.parte))].sort()).toEqual(PARTES);
  });

  it('os dois furos cegos de pino dividem a mesma tampa da cabeça, e ela também vira um corpo só', () => {
    const n = montar();
    expect(facesDaParte(n, 'furosDePino')).toHaveLength(2 * ((tampa.TOPO.furoLados as number) + 1));   // parede + fundo
    // a tampa de topo do cilindro foi consumida pelo passo dos DOIS furos
    const cabeca = facesDaParte(n, 'cabecaDaTampa');
    expect(cabeca.length).toBeGreaterThan(0);
    for (const f of cabeca as any) expect(f.vs.length).toBeGreaterThanOrEqual(3);
  });

  it('nenhum passo endereça geometria por id posicional', () => {
    for (const [op, args] of tampa.PASSOS as any[]) {
      for (const chave of ['faces', 'vs', 'pontos']) expect(args?.[chave], `${op}.${chave}`).toBeUndefined();
      expect(Array.isArray(args?.de), `${op}.de como lista de ids`).toBe(false);
      expect(args?.sel?.f, `${op}.sel.f`).toBeUndefined();
      expect(args?.sel?.v, `${op}.sel.v`).toBeUndefined();
    }
  });
});
