/* abertura-por-contorno-guarda.test.ts — a guarda da chapa do `aberturaPorContorno` (plano
   `docs/modelar/planos/2026-11-26-operacoes-repartidas-entre-nucleos.md`, fatia 2): o índice da chapa (a caixa de cada face, as faces
   de cada vértice e a grade do classificador de parede) é montado uma vez por chapa, fica no `st` da execução e é posto em dia entre
   os cortes pelo que a procedência diz que cada passo mudou. Este arquivo trava a receita inteira:
     - cortes em corrente dão o mesmo neutro, byte a byte, com a guarda e sem ela (cada corte montando o índice do zero), e a guarda é
       da execução: outra execução monta o seu índice;
     - três chapas cortadas em alternância, com duas vagas na guarda;
     - o índice não é reaproveitado duas vezes no mesmo passo, nem depois de o passo corrente ter escrito nos mapas, nem quando os
       registros da procedência não são exatamente um por passo desde o corte anterior;
     - o teto de faces: a chapa acima dele não fica guardada, e as vagas saem quando a soma passa dele.
   A chapa mudada entre dois cortes está em `abertura-por-contorno-guarda-chapa-mudada.test.ts`, e a recusa da booleana e o modo
   conferido em `abertura-por-contorno-guarda-conferida.test.ts`; os três ficam abaixo de 6 s cada um. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { indiceDaChapa } from './abertura-por-contorno.js';
import { A, B, C, GUARDA_DA_CHAPA, chapa, corte, diferencas, dosPassos, facesDoCorte, passoDeProva, pedirIndice, rodar, verticesDasFaces } from '../../../tools/fixtures/corte-das-aberturas/prova-da-guarda';

/* os vértices da chapa do primeiro corte em volta do segundo vão, perto de um décimo dela */
const verticesNaRegiao = (st: any) => verticesDasFaces(st, facesDoCorte(st, 2)).filter((v) => { const p = st.V.get(v); return p[0] >= 0.40 && p[0] <= 0.66 && p[2] >= 0.38 && p[2] <= 0.64; });

describe('a guarda da chapa do aberturaPorContorno, na receita inteira', () => {
  it('três cortes em corrente e um passo de atributo no meio dão o mesmo neutro com a guarda e sem ela, e a guarda é de cada execução', () => {
    const c = chapa();
    const PASSOS = [c.subdivisao,
      corte(2, dosPassos('subdivisao', 1), A),
      ['parte', { nome: 'chapa', sel: dosPassos('aberturaPorContorno', 2) }],
      corte(3, dosPassos('aberturaPorContorno', 2), B),
      corte(4, dosPassos('aberturaPorContorno', 3), C)];
    const com = rodar(c.TOPO, PASSOS);
    expect(com.neutro.orfaos).toEqual([]);
    expect(com.neutro.aberturas.map((a: any) => a.vizinhanca.recortada)).toEqual([true, true, true]);
    /* um índice montado e dois reaproveitados; o passo de atributo muda a entrada de toda face da chapa e não refaz nenhuma: as
       refeitas são as do trecho que cada corte deixou, uma fração da chapa */
    expect(com.conta).toMatchObject({ montados: 1, reaproveitados: 2, vagas: 1 });
    expect(com.conta!.facesRefeitas).toBeGreaterThan(0);
    expect(com.conta!.facesRefeitas).toBeLessThan(0.25 * com.neutro.aberturas[0].vizinhanca.daChapa);
    const sem = rodar(c.TOPO, PASSOS, { semGuarda: true });
    expect(sem.conta).toMatchObject({ montados: 1, reaproveitados: 0 });
    expect(com.json).toBe(sem.json);
    expect(com.aberturas).toBe(sem.aberturas);
    /* outra execução não herda nada: monta o seu índice e dá o mesmo neutro */
    const outra = rodar(c.TOPO, PASSOS);
    expect(outra.conta).toEqual(com.conta);
    expect(outra.json).toBe(com.json);
  }, 60000);

  it('três chapas cortadas em alternância dão o mesmo neutro com a guarda e sem ela, com duas vagas', () => {
    const chapas = [chapa({ prefixo: 'p', origemId: 1, niveis: 1 }), chapa({ prefixo: 'q', origemId: 11, niveis: 1, dy: -100 }), chapa({ prefixo: 'r', origemId: 21, niveis: 1, dy: -200 })];
    const TOPO = Object.assign({}, ...chapas.map((c) => c.TOPO));
    const PASSOS: any[] = chapas.map((c) => c.subdivisao);
    const ultima: Record<number, any> = { 1: dosPassos('subdivisao', 1), 11: dosPassos('subdivisao', 11), 21: dosPassos('subdivisao', 21) };
    let id = 100;
    /* p q p q r q r p, com duas vagas */
    for (const [qual, contorno] of [[1, A], [11, A], [1, B], [11, B], [21, A], [11, C], [21, B], [1, C]] as [number, any][]) {
      PASSOS.push(corte(id, ultima[qual], contorno)); ultima[qual] = dosPassos('aberturaPorContorno', id); id++;
    }
    const com = rodar(TOPO, PASSOS);
    expect(com.neutro.orfaos).toEqual([]);
    expect(com.neutro.aberturas).toHaveLength(8);
    /* montam p, q, r e, de novo, o último p (a vaga dele saiu quando r entrou); reaproveitam o segundo p, o segundo q, o terceiro q e
       o segundo r. Com uma vaga só, nenhum corte reaproveitaria */
    expect(com.conta).toMatchObject({ montados: 4, reaproveitados: 4, vagas: 2 });
    const sem = rodar(TOPO, PASSOS, { semGuarda: true });
    expect(com.json).toBe(sem.json);
    expect(com.aberturas).toBe(sem.aberturas);
  }, 60000);

  it('o índice não é reaproveitado duas vezes no mesmo passo, nem depois de o passo escrever nos mapas, nem com a procedência fora de passo', () => {
    const c = chapa();
    const visto: any = {};
    const PASSOS = [c.subdivisao, corte(2, dosPassos('subdivisao', 1), A), passoDeProva(2), passoDeProva(2), passoDeProva(2), passoDeProva(2), passoDeProva(2), corte(3, dosPassos('aberturaPorContorno', 2), B)];
    const noPasso = new Map<number, any>([
      [2, (st: any, i: number) => {
        const ids = facesDoCorte(st, 2);
        /* o primeiro pedido do passo reaproveita; o segundo, no mesmo passo, não tem registro da procedência que cubra o primeiro */
        visto.primeiro = pedirIndice(st, i, ids).remontou;
        visto.segundo = pedirIndice(st, i, ids).remontou;
      }],
      [3, (st: any, i: number) => {
        const ids = facesDoCorte(st, 2);
        /* o passo corrente troca os vetores de uma região e o despacho conta os `set`: a procedência ainda não sabe deles */
        const mexidos = verticesNaRegiao(st);
        for (const v of mexidos) { const p = st.V.get(v); st.V.set(v, [p[0] + 0.003, p[1], p[2] - 0.002]); }
        const pedido = pedirIndice(st, i, ids, { V: mexidos });
        visto.depoisDeEscrever = pedido.remontou;
        visto.diferencas = diferencas(pedido.indice, indiceDaChapa(st.V, st.F, ids), ids);
      }],
      /* o último registro da procedência passa a dizer que é de outro passo: os registros são tantos quantos os passos, mas não os deles */
      [4, (st: any) => { const e = st.procedencia.passos.pop(); st.procedencia.passos.push({ ...e, passo: e.passo - 1 }); }],
      [5, (st: any, i: number) => { visto.registroDeOutroPasso = pedirIndice(st, i, facesDoCorte(st, 2)).remontou; }],
      /* um registro a mais depois dos passos esperados: algo escreveu na procedência sem ser um passo */
      [6, (st: any, i: number) => {
        const ids = facesDoCorte(st, 2);
        st.procedencia.passos.push({ passo: 999, operacao: 'prova', saidas: { vertices: [], faces: [], portas: [], partes: [] } });
        visto.registroAMais = pedirIndice(st, i, ids).remontou;
        st.procedencia.passos.pop();
        pedirIndice(st, i, ids);
      }],
    ]);
    const com = rodar(c.TOPO, PASSOS, { noPasso });
    expect(com.neutro.orfaos).toEqual([]);
    expect(visto).toEqual({ primeiro: false, segundo: true, depoisDeEscrever: true, diferencas: [], registroDeOutroPasso: true, registroAMais: true });
    const sem = rodar(c.TOPO, PASSOS, { noPasso: new Map<number, any>([[2, () => {}], [3, (st: any) => { for (const v of verticesNaRegiao(st)) { const p = st.V.get(v); st.V.set(v, [p[0] + 0.003, p[1], p[2] - 0.002]); } }]]), semGuarda: true });
    expect(com.json).toBe(sem.json);
  }, 60000);

  it('o teto de faces: a chapa acima dele não fica guardada, e as vagas saem quando a soma passa dele', () => {
    const p = chapa({ prefixo: 'p', origemId: 1, niveis: 1 }), q = chapa({ prefixo: 'q', origemId: 11, niveis: 1, dy: -100 });
    const visto: any = {};
    const PASSOS = [p.subdivisao, q.subdivisao,
      corte(2, dosPassos('subdivisao', 1), A), corte(12, dosPassos('subdivisao', 11), A), passoDeProva(2),
      corte(3, dosPassos('aberturaPorContorno', 2), B), corte(13, dosPassos('aberturaPorContorno', 12), B), passoDeProva(3),
      corte(4, dosPassos('aberturaPorContorno', 3), C)];
    const noPasso = new Map<number, any>([
      /* as duas chapas guardadas; o teto baixa para uma chapa e meia */
      [4, (st: any) => { const g = st[GUARDA_DA_CHAPA]; visto.vagasAntes = g.chapas.length; visto.padrao = g.teto; g.teto = Math.round(1.5 * facesDoCorte(st, 2).length); }],
      /* cabe uma: o corte de p a reaproveita e tira a de q, o de q monta e tira a de p; o teto baixa para menos que uma chapa */
      [7, (st: any) => { const g = st[GUARDA_DA_CHAPA]; visto.vagasComUma = g.chapas.length; visto.contaComUma = [g.montados, g.reaproveitados]; g.teto = 10; }],
    ]);
    const com = rodar({ ...p.TOPO, ...q.TOPO }, PASSOS, { noPasso });
    expect(com.neutro.orfaos).toEqual([]);
    expect(visto).toEqual({ vagasAntes: 2, padrao: 250000, vagasComUma: 1, contaComUma: [3, 1] });
    /* o último corte monta o índice dele e não o guarda, e a vaga que restava sai */
    expect(com.conta).toMatchObject({ montados: 4, reaproveitados: 1, vagas: 0 });
    const sem = rodar({ ...p.TOPO, ...q.TOPO }, PASSOS, { noPasso: new Map<number, any>([[4, () => {}], [7, () => {}]]), semGuarda: true });
    expect(com.json).toBe(sem.json);
  }, 60000);
});
