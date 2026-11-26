/* abertura-por-contorno-guarda-conferida.test.ts — a guarda da chapa do `aberturaPorContorno` (plano
   `docs/modelar/planos/2026-11-26-operacoes-repartidas-entre-nucleos.md`, fatia 2) onde o corte não segue o caminho comum:
     - o corte que a booleana recusa no trecho recortado e é refeito na chapa inteira, no mesmo passo, monta um índice novo;
     - a malha depende da declaração de escrita das operações (o retrato 'rapido' tira dela a procedência que põe o índice em dia): a
       declaração que deixa uma mudança de fora (aqui, as somas do rastreio desligadas) é recusada com a causa pelo corte seguinte na
       leitura conferida, e pelo despacho no retrato conferido. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { injecao } from '../somas-do-rastreio.js';
import { A, B, chapa, corte, dosPassos, retangulo, rodar } from '../../../tools/fixtures/corte-das-aberturas/prova-da-guarda';

/* a booleana do núcleo com uma recusa de prova: `recusar.em(st, a, i)` decide, uma vez, que o `subtrair` deixa um órfão em vez de cortar */
const recusar: { em: null | ((st: any, a: any, i: number) => boolean) } = { em: null };
vi.mock('./booleanas.js', async (original) => {
  const modulo: any = await original();
  return {
    ...modulo,
    criarOperacoesBooleanas(servicos: any) {
      const ops = modulo.criarOperacoesBooleanas(servicos);
      return { ...ops, subtrair(st: any, a: any, i: number) {
        if (recusar.em?.(st, a, i)) { recusar.em = null; st.orfaos.push({ passo: i, op: 'subtrair', ref: 'solidos', motivo: 'recusa de prova' }); return undefined; }
        return ops.subtrair(st, a, i);
      } };
    },
  };
});
afterEach(() => { recusar.em = null; injecao.desligadas.clear(); });

describe('a guarda da chapa do aberturaPorContorno, fora do caminho comum', () => {
  it('o corte recusado no trecho recortado e refeito na chapa inteira, no mesmo passo, monta um índice novo', () => {
    const c = chapa();
    const PASSOS = [c.subdivisao, corte(2, dosPassos('subdivisao', 1), A), corte(3, dosPassos('aberturaPorContorno', 2), B)];
    const recusaNoSegundoCorte = () => { recusar.em = (_st, _a, i) => i === 2; };
    recusaNoSegundoCorte();
    const com = rodar(c.TOPO, PASSOS);
    expect(recusar.em).toBe(null);
    expect(com.neutro.orfaos).toEqual([]);
    expect(com.neutro.aberturas.map((a: any) => a.vizinhanca.recortada)).toEqual([true, false]);
    expect(com.neutro.aberturas[1].vizinhanca.motivo).toMatch(/recusa de prova/);
    /* o primeiro corte monta; o segundo reaproveita, é recusado e, refeito no mesmo passo (que já escreveu nos mapas e não tem registro
       na procedência), monta de novo */
    expect(com.conta).toMatchObject({ montados: 2, reaproveitados: 1 });
    recusaNoSegundoCorte();
    const sem = rodar(c.TOPO, PASSOS, { semGuarda: true });
    expect(sem.conta!.reaproveitados).toBe(0);
    expect(com.json).toBe(sem.json);
    expect(com.aberturas).toBe(sem.aberturas);
  }, 60000);

  describe('a declaração de escrita que deixa uma mudança de fora', () => {
    const c = chapa();
    /* o segundo vão a 8 mm do primeiro: a limpeza da costura dele reescreve no lugar faces que o terceiro, ao lado, lê do índice */
    const PASSOS = [c.subdivisao, corte(2, dosPassos('subdivisao', 1), A), corte(3, dosPassos('aberturaPorContorno', 2), retangulo(308, 120, 420, 300)), corte(4, dosPassos('aberturaPorContorno', 3), retangulo(120, 306, 300, 420))];
    const desligarAsSomas = () => { injecao.desligadas.add('booleana'); injecao.desligadas.add('abertura'); };

    it('com a leitura conferida e as somas no lugar, o índice reaproveitado confere e o neutro é o de sempre', () => {
      const normal = rodar(c.TOPO, PASSOS);
      const conferido = rodar(c.TOPO, PASSOS, { opcoes: { leitura: 'conferido' } });
      expect(conferido.neutro.orfaos).toEqual([]);
      expect(conferido.conta).toMatchObject({ montados: 1, reaproveitados: 2 });
      expect(conferido.json).toBe(normal.json);
    }, 60000);

    it('com as somas do rastreio desligadas, a leitura conferida recusa o corte seguinte, com a causa, e o retrato conferido recusa o próprio passo', () => {
      desligarAsSomas();
      const lido = rodar(c.TOPO, PASSOS, { opcoes: { leitura: 'conferido' } });
      const recusa = lido.neutro.orfaos.find((o: any) => o.op === 'aberturaPorContorno');
      expect(recusa).toBeDefined();
      expect(recusa.ref).toBe('chapa');
      expect(recusa.motivo).toMatch(/o índice da chapa guardado por um corte anterior não confere com a chapa de agora: a face \d+ está no índice/);
      expect(recusa.motivo).toMatch(/ESCRITA_DAS_OPERACOES.*somas-do-rastreio\.js/);
      /* no retrato conferido a procedência vem da conta completa, e é o despacho que recusa a declaração, antes de qualquer reaproveitamento */
      expect(() => rodar(c.TOPO, PASSOS, { opcoes: { retrato: 'conferido' } })).toThrow(/rastreio declarado de 'aberturaPorContorno' divergiu/);
    }, 60000);
  });
});
