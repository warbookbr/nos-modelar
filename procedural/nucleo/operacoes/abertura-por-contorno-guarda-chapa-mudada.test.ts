/* abertura-por-contorno-guarda-chapa-mudada.test.ts — a guarda da chapa do `aberturaPorContorno` (plano
   `docs/modelar/planos/2026-11-26-operacoes-repartidas-entre-nucleos.md`, fatia 2) quando a chapa muda entre dois cortes. Um passo de
   prova muda a chapa, outro pede o índice como o corte faria e o compara, registro a registro e célula a célula da grade, com um
   montado do zero naquele estado, e a receita inteira dá o mesmo neutro que sem guarda. O que este arquivo trava:
     - a mudança de parte da chapa (vértices movidos no lugar, vetores dos vértices trocados, listas de vértices das faces giradas)
       refaz só as faces mexidas;
     - a chapa inteira movida, o passo que saiu sem registro na procedência, a chapa transladada por um passo do núcleo e o mapa de
       vértices trocado por outro de mesmo conteúdo montam o índice de novo.
   O que vale dentro de um passo só e o teto de faces estão em `abertura-por-contorno-guarda.test.ts`. */
import { describe, expect, it } from 'vitest';
import { A, B, C, D, chapa, conferencia, corte, dosPassos, facesDoCorte, passoDeProva, retangulo, rodar, verticesDasFaces } from '../../../tools/fixtures/corte-das-aberturas/prova-da-guarda';

type Regiao = [number, number, number, number];
/* as regiões que os passos de prova mexem, cada uma em volta do vão seguinte e com perto de um décimo da chapa: [x0, z0, x1, z1] em metro */
const EM_B: Regiao = [0.40, 0.38, 0.66, 0.64], EM_C: Regiao = [0.40, 0.09, 0.64, 0.31], EM_D: Regiao = [0.09, 0.40, 0.33, 0.65];
const dentro = (p: number[], [x0, z0, x1, z1]: Regiao) => p[0] >= x0 && p[0] <= x1 && p[2] >= z0 && p[2] <= z1;
const verticesNa = (st: any, origemId: number, r: Regiao) => verticesDasFaces(st, facesDoCorte(st, origemId)).filter((v) => dentro(st.V.get(v), r));
const facesNa = (st: any, origemId: number, r: Regiao) => facesDoCorte(st, origemId).filter((f) => st.F.get(f).vs.every((v: number) => dentro(st.V.get(v), r)));
const semConferir = (noPasso: Map<number, any>, conferencias: number[]) => new Map([...noPasso].map(([i, f]) => [i, conferencias.includes(i) ? () => {} : f]));

describe('a chapa mudada entre dois cortes do aberturaPorContorno', () => {
  it('a mudança de parte da chapa refaz as faces mexidas, e a receita dá o mesmo neutro que sem guarda', () => {
    const c = chapa();
    const conferidas: any[] = [];
    const PASSOS = [c.subdivisao,
      corte(2, dosPassos('subdivisao', 1), A), passoDeProva(2), passoDeProva(2),
      corte(3, dosPassos('aberturaPorContorno', 2), B), passoDeProva(3), passoDeProva(3),
      corte(4, dosPassos('aberturaPorContorno', 3), C), passoDeProva(4), passoDeProva(4),
      corte(5, dosPassos('aberturaPorContorno', 4), D)];
    const noPasso = new Map<number, any>([
      /* vértices movidos no lugar, sem passar pelo mapa */
      [2, (st: any) => { for (const v of verticesNa(st, 2, EM_B)) { const p = st.V.get(v); p[0] += 0.003; p[2] -= 0.002; } }],
      [3, conferencia(conferidas, 2)],
      /* o vetor de cada vértice trocado por outro */
      [5, (st: any) => { for (const v of verticesNa(st, 3, EM_C)) { const p = st.V.get(v); st.V.set(v, [p[0] + 0.003, p[1], p[2] - 0.002]); } }],
      [6, conferencia(conferidas, 3)],
      /* a lista de vértices das faces girada, no lugar numas e por uma lista nova noutras */
      [8, (st: any) => { facesNa(st, 4, EM_D).forEach((f, k) => { const face = st.F.get(f); if (k % 2) face.vs.push(face.vs.shift()); else face.vs = [...face.vs.slice(1), face.vs[0]]; }); }],
      [9, conferencia(conferidas, 4)],
    ]);
    const com = rodar(c.TOPO, PASSOS, { noPasso });
    expect(com.neutro.orfaos).toEqual([]);
    expect(conferidas).toHaveLength(3);
    for (const conferida of conferidas) {
      expect(conferida.diferencas).toEqual([]);
      /* o índice reaproveitado traz a grade que o primeiro corte montou, e a conferência mede a grade mantida, e não uma nova */
      expect(conferida).toMatchObject({ remontou: false, tinhaGrade: true });
      expect(conferida.refeitas).toBeGreaterThan(100);
      expect(conferida.refeitas).toBeLessThan(0.25 * conferida.faces);
    }
    /* cada corte depois do primeiro reaproveita o índice que a conferência pôs em dia */
    expect(com.conta).toMatchObject({ montados: 1, reaproveitados: 6 });
    const sem = rodar(c.TOPO, PASSOS, { noPasso: semConferir(noPasso, [3, 6, 9]), semGuarda: true });
    expect(sem.conta!.reaproveitados).toBe(0);
    expect(com.json).toBe(sem.json);
    expect(com.aberturas).toBe(sem.aberturas);
  }, 60000);

  it('a chapa inteira movida, o passo sem registro, o transladar do núcleo e o mapa de vértices trocado montam o índice de novo', () => {
    const c = chapa();
    const conferidas: any[] = [];
    const PASSOS = [c.subdivisao,
      corte(2, dosPassos('subdivisao', 1), A), passoDeProva(2), passoDeProva(2),
      corte(3, dosPassos('aberturaPorContorno', 2), B), passoDeProva(3), passoDeProva(3),
      corte(4, dosPassos('aberturaPorContorno', 3), C), ['transladar', { d: [0.01, 0, 0.005], sel: dosPassos('aberturaPorContorno', 4) }], passoDeProva(4),
      corte(5, dosPassos('aberturaPorContorno', 4), D), passoDeProva(5), passoDeProva(5),
      corte(6, dosPassos('aberturaPorContorno', 5), retangulo(650, 290, 730, 370))];
    const noPasso = new Map<number, any>([
      /* a chapa inteira movida no lugar: mais de um quarto das faces a refazer */
      [2, (st: any) => { for (const v of verticesDasFaces(st, facesDoCorte(st, 2))) st.V.get(v)[0] += 0.02; }],
      [3, conferencia(conferidas, 2)],
      /* o registro do corte anterior some da procedência: os registros deixam de ser um por passo */
      [5, (st: any) => { for (const v of verticesNa(st, 3, EM_C)) st.V.get(v)[0] += 0.003; st.procedencia.passos.pop(); }],
      [6, conferencia(conferidas, 3)],
      /* o passo 8 é o `transladar` do próprio núcleo, da chapa inteira */
      [9, conferencia(conferidas, 4)],
      /* o mapa de vértices trocado por outro, com cópias dos mesmos pontos */
      [11, (st: any) => { st.V = new Map([...st.V].map(([v, p]: any) => [v, [...p]])); }],
      [12, conferencia(conferidas, 5)],
    ]);
    const com = rodar(c.TOPO, PASSOS, { noPasso });
    expect(com.neutro.orfaos).toEqual([]);
    expect(conferidas).toHaveLength(4);
    for (const conferida of conferidas) { expect(conferida.diferencas).toEqual([]); expect(conferida).toMatchObject({ remontou: true, tinhaGrade: false }); }
    expect(com.conta).toMatchObject({ montados: 5, reaproveitados: 4 });
    const sem = rodar(c.TOPO, PASSOS, { noPasso: semConferir(noPasso, [3, 6, 9, 12]), semGuarda: true });
    expect(com.json).toBe(sem.json);
    expect(com.aberturas).toBe(sem.aberturas);
  }, 60000);
});
