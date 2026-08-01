/* Integridade da peça de exercício `_prateleira-furada` — a prova NÃO
   AUTOMOTIVA do ciclo "Corte e orientação de seção v1".

   Por que ela existe separada dos testes do núcleo: os testes de
   `tools/oficina/oficina.test.ts` provam a op `furo` em listas montadas para
   ela. Aqui a pergunta é outra e é a que importa para o produto — uma PEÇA de
   verdade, escrita como um autor escreveria, continua com identidade completa
   depois de três cortes? Nenhuma face órfã, nenhuma face sem parte, nenhuma
   citação por id, e as medidas do furo batendo com as medidas declaradas.

   O contrato desta peça é marcenaria: tábua, parafuso, cavilha, puxador.
   Nenhum eixo de roda, nenhum prisioneiro. Se `furo` só servisse ao caso
   automotivo que o originou, ele não fecharia aqui.

   Régua headless da mesma peça: `npm run descrever -- _prateleira-furada --estrito`. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — módulo .js do motor v3 (sem tipos)
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça .js do Atelier
import * as prateleira from '../../prototipos/fps/v3/pecas/_prateleira-furada.js';

const montar = (topo: any = prateleira.TOPO) =>
  nucleo(prateleira.PASSOS, prateleira.PARAMS, topo, prateleira.MATERIAIS, null, prateleira.ALIASES);

const PARTES = ['furoDaCavilha', 'furoDoParafuso', 'furoDoPuxador', 'puxadorRedondo', 'tabuaDaPrateleira'];
const facesDaParte = (n: any, nome: string) => [...n.F.values()].filter((f: any) => f.parte === nome);
const P = prateleira.PARAMS;

describe('_prateleira-furada — três cortes e nenhuma face perdida', () => {
  it('não tem órfão e nenhuma face fica sem identidade', () => {
    const n = montar();
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => !f.parte)).toEqual([]);
  });

  it('expõe as cinco partes pelo nome, e só elas', () => {
    const nomes = new Set<string>();
    for (const face of montar().F.values()) nomes.add(face.parte);
    expect([...nomes].sort()).toEqual(PARTES);
  });

  it('as três faces cortadas somem da malha, e nenhuma outra', () => {
    const n = montar();
    // o cubo da tábua declarou seis faces; topo e fundo viraram o furo do
    // parafuso, frente virou o encaixe de cavilha. Sobram três.
    const doCubo = [0, 1, 2, 3, 4, 5];
    expect(doCubo.filter((f) => n.F.has(f))).toEqual([2, 3, 5]);   // tras, direita, esquerda
  });

  it('nenhum passo endereça geometria por id posicional', () => {
    for (const [op, args] of prateleira.PASSOS as any[]) {
      for (const chave of ['faces', 'vs', 'pontos']) expect(args?.[chave], `${op}.${chave}`).toBeUndefined();
      expect(Array.isArray(args?.de), `${op}.de como lista de ids`).toBe(false);
      expect(args?.sel?.f, `${op}.sel.f`).toBeUndefined();
      expect(args?.sel?.v, `${op}.sel.v`).toBeUndefined();
    }
  });
});

describe('_prateleira-furada — o furo mede o que a peça declarou', () => {
  it('o furo do parafuso ATRAVESSA a tábua: a parede vai de y=0 até a espessura', () => {
    const n = montar();
    const parede = facesDaParte(n, 'furoDoParafuso');
    expect(parede).toHaveLength(prateleira.TOPO.furoLados);
    const ys = parede.flatMap((f: any) => f.vs.map((v: number) => n.V.get(v)[1]));
    expect(Math.min(...ys)).toBeCloseTo(0, 9);
    expect(Math.max(...ys)).toBeCloseTo(P.tabuaEspessura, 9);
    // e o raio declarado é o raio medido, em torno do x declarado
    for (const f of parede) for (const v of f.vs) {
      const p = n.V.get(v);
      expect(Math.hypot(p[0] - P.parafusoX, p[2])).toBeCloseTo(P.parafusoRaio, 9);
    }
  });

  it('o encaixe de cavilha PARA na fundura declarada, e tem fundo', () => {
    const n = montar();
    const bolsa = facesDaParte(n, 'furoDaCavilha');
    expect(bolsa).toHaveLength(prateleira.TOPO.furoLados + 1);   // parede + fundo
    const zs = bolsa.flatMap((f: any) => f.vs.map((v: number) => n.V.get(v)[2]));
    const testa = P.tabuaProfundidade / 2;
    expect(Math.max(...zs)).toBeCloseTo(testa, 9);
    expect(Math.min(...zs)).toBeCloseTo(testa - P.cavilhaFundura, 9);
    // o fundo é UMA face só, com um canto por lado do anel
    const fundo = bolsa.filter((f: any) => f.vs.length === prateleira.TOPO.furoLados);
    expect(fundo).toHaveLength(1);
  });

  it('o furo do puxador atravessa um CILINDRO de tampa a tampa', () => {
    const n = montar();
    const parede = facesDaParte(n, 'furoDoPuxador');
    expect(parede).toHaveLength(prateleira.TOPO.furoLados);
    const ys = parede.flatMap((f: any) => f.vs.map((v: number) => n.V.get(v)[1]));
    expect(Math.min(...ys)).toBeCloseTo(P.tabuaEspessura, 9);
    expect(Math.max(...ys)).toBeCloseTo(P.tabuaEspessura + P.puxadorAltura, 9);
  });

  it('`orientacao` põe o vértice 0 dos dois anéis na MESMA direção declarada', () => {
    const n = montar();
    // o furo do parafuso é o passo 1, o do puxador é o passo 6
    const anelParafuso = n.V.get(1 * 1000);
    const anelPuxador = n.V.get(6 * 1000);
    expect(anelParafuso[0] - P.parafusoX).toBeCloseTo(P.parafusoRaio, 9);
    expect(anelParafuso[2]).toBeCloseTo(0, 9);
    expect(anelPuxador[0] - P.puxadorX).toBeCloseTo(P.puxadorFuroRaio, 9);
    expect(anelPuxador[2]).toBeCloseTo(0, 9);
  });

  it('mudar `furoLados` (TOPO) refaz os três furos juntos, sem tocar em nada mais', () => {
    const n = montar({ ...prateleira.TOPO, furoLados: 20 });
    expect(n.orfaos).toEqual([]);
    expect(facesDaParte(n, 'furoDoParafuso')).toHaveLength(20);
    expect(facesDaParte(n, 'furoDaCavilha')).toHaveLength(21);
    expect(facesDaParte(n, 'furoDoPuxador')).toHaveLength(20);
    expect([...n.F.values()].filter((f: any) => !f.parte)).toEqual([]);
  });

  it('a peça publica as três portas do corte, e cada uma resolve para o que promete', () => {
    const n = montar();
    expect([...n.portas.keys()]).toEqual(['bocaDoParafuso', 'fundoDaCavilha', 'vaoDoPuxador']);
    for (const [nome, porta] of n.portas) {
      const passo = (prateleira.PASSOS as any[])[porta.passo];
      expect(passo[0], nome).toBe('publicarPorta');
      expect(passo[1].nome, nome).toBe(nome);
      expect(porta.de.op, nome).toBe('furo');
    }
  });
});
