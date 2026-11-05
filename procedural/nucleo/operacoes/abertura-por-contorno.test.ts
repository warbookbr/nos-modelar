/* abertura-por-contorno.test.ts — a linha de base da fatia 1 do plano da abertura de contorno livre, sobre a peça de teste
   `tools/fixtures/abertura-de-prova/`, com as duas técnicas do protótipo: o corte da chapa já subdividida pelo prisma do
   contorno (`receita.js`) e o corte da gaiola antes da subdivisão (`corte-na-gaiola.js`). Cada uma é medida pelo gate 1 (aresta
   sem par, vínculo não manifold e triângulo sem área, pelas funções de `tools/oficina/conferir-malha.ts`, e o grito do passo)
   e pelo gate 2 (o desvio da borda do vão contra o contorno desenhado, em [x, z] e em y, e o ângulo do bico, por
   `tools/fixtures/abertura-de-prova/medir.mjs`), na posição da peça e com o contorno deslocado de 1 a 11 mm, com 16 e 32
   segmentos por quarto de arco. O primeiro teste imprime os números que o README de
   `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/` registra; os outros travam a linha de base, inclusive os
   defeitos que reprovaram as duas técnicas, para a fatia seguinte mudar este teste quando os corrigir. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — núcleo em JavaScript.
import { analisarTopologia } from '../topologia.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — peça de teste em JavaScript.
import corteDepois from '../../../tools/fixtures/abertura-de-prova/receita.js';
// @ts-expect-error — peça de teste em JavaScript.
import corteNaGaiola from '../../../tools/fixtures/abertura-de-prova/corte-na-gaiola.js';
// @ts-expect-error — peça de teste em JavaScript.
import { TABELA, alturaDaChapa, derivar, passoDaChapa } from '../../../tools/fixtures/abertura-de-prova/chapa.js';
// @ts-expect-error — medidas em JavaScript.
import { medirAbertura, qualidadeDasFaces } from '../../../tools/fixtures/abertura-de-prova/medir.mjs';
import { areasDeTriangulo, arestasSemPar, escalaDaPeca, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const m = (mm: number) => mm / 1000;
const INTERIOR = [[m(50), m(50)], [m(750), m(750)]];

/** A receita com outra tabela, pela cópia dos descritores (o getter de PASSOS lê a tabela nova). */
function comTabela(receita: any, T: any) {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita)) as any;
  copia.PARAMS = T;
  return copia;
}

/** A tabela com o contorno deslocado de `dx` mm em x e 0,7 dx em z, e `segmentos` por quarto de arco. */
function deslocada(dx: number, segmentos: number) {
  const T = structuredClone(TABELA);
  T.contorno.segmentosArco = segmentos;
  for (const k of ['bico', 'fimDoReto', 'fimDoArco']) T.contorno[k] = [T.contorno[k][0] + dx, T.contorno[k][1] + dx * 0.7];
  return T;
}

function medir(receita: any, T: any) {
  const { neutro } = executarReceita(comTabela(receita, T));
  if (neutro.orfaos.length) return { neutro, recusa: neutro.orfaos.map((o: any) => `${o.op}: ${o.motivo}`.slice(0, 160)) };
  const { raiz } = adaptarThree(neutro, { nome: 'abertura-de-prova' });
  const areas = areasDeTriangulo(raiz, escalaDaPeca(neutro));
  const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F }, { triangulacao: true });
  const d = derivar(T);
  const gate2 = medirAbertura(neutro, { contorno: d.trechos, poligono: d.poligono, interior: INTERIOR, bico: T.contorno.bico.map(m), alturaEm: alturaDaChapa(T, d) });
  const emVolta = [...neutro.F.values()].filter((f: any) => f.parte === 'emVoltaDoVao').map((f: any) => f.id);
  return {
    neutro,
    gate1: { arestasSemPar: arestasSemPar(neutro).length, vinculosNaoManifold: vinculosNaoManifold(neutro).length, triangulosSemArea: areas.abaixo.length, menorTriangulo: areas.menor, pisoDeArea: areas.piso },
    faceFina: topologia.achados.filter((a: any) => a.codigo === 'face-fina').length,
    gate2,
    emVoltaDoVao: qualidadeDasFaces(neutro, emVolta),
    malha: { vertices: neutro.V.size, faces: neutro.F.size },
  };
}

const resumo = (r: any) => (r.recusa ? { recusa: r.recusa[0] } : {
  ...r.gate1, faceFina: r.faceFina,
  xz: Number(r.gate2.desvio.fora.daBordaAoDesenhoMm.toFixed(3)), xzVolta: Number(r.gate2.desvio.fora.doDesenhoABordaMm.toFixed(3)),
  xzDentro: Number(r.gate2.desvio.dentro.daBordaAoDesenhoMm.toFixed(3)), y: Number(r.gate2.desvio.fora.daBordaASuperficieMm.toFixed(3)),
  pele: Number(r.gate2.desvio.peleDeForaASuperficieMm.toFixed(3)), bico: Number(r.gate2.bico.anguloNaMalha.toFixed(2)), bicoDesenhado: Number(r.gate2.bico.anguloDesenhado.toFixed(2)),
});

const POSICOES = [0, 1, 3, 7, 11].flatMap((dx) => [16, 32].map((segmentos) => ({ dx, segmentos })));

describe('abertura por contorno, fatia 1: as duas técnicas na peça de teste', () => {
  const A = medir(corteDepois, TABELA) as any;
  const B = medir(corteNaGaiola, TABELA) as any;
  const varredura = POSICOES.map(({ dx, segmentos }) => ({ dx, segmentos, depois: medir(corteDepois, deslocada(dx, segmentos)) as any, naGaiola: medir(corteNaGaiola, deslocada(dx, segmentos)) as any }));

  it('imprime as medidas do banco de provas', () => {
    const comMedida = (medirPontosNovos: boolean | number) => resumo(medir(corteNaGaiola, { ...structuredClone(TABELA), corte: { medirPontosNovos } }));
    console.log(JSON.stringify({
      corteDepois: { malha: A.malha, gate1: A.gate1, faceFina: A.faceFina, gate2: A.gate2, emVoltaDoVao: A.emVoltaDoVao },
      corteNaGaiola: { malha: B.malha, gate1: B.gate1, faceFina: B.faceFina, gate2: B.gate2, emVoltaDoVao: B.emVoltaDoVao },
      corteNaGaiolaComPontosNovosMedidos: { exatos: comMedida(true), peso0_01: comMedida(0.01), peso1: comMedida(1), peso100: comMedida(100) },
      varredura: varredura.map(({ dx, segmentos, depois, naGaiola }) => ({ dx, segmentos, depois: resumo(depois), naGaiola: resumo(naGaiola) })),
    }, null, 2));
  });

  it('corte depois: fechada, manifold e com a borda no contorno, mas com triângulo sem área em toda posição (reprova o gate 1)', () => {
    for (const { depois } of [{ depois: A }, ...varredura]) {
      expect(depois.recusa).toBeUndefined();
      expect(depois.gate1).toMatchObject({ arestasSemPar: 0, vinculosNaoManifold: 0 });
      expect(depois.gate1.triangulosSemArea).toBeGreaterThan(0);
      expect(depois.gate2.desvio.fora.daBordaASuperficieMm).toBeLessThan(1e-3);
    }
    expect(A.gate2.desvio.fora.daBordaAoDesenhoMm).toBeLessThan(0.5);
    expect(A.gate2.desvio.fora.doDesenhoABordaMm).toBeLessThan(0.5);
    expect(A.gate2.bico.diferenca).toBeLessThan(2);
  });

  it('corte depois: as faces da chapa longe do vão ficam com o id e os cantos de antes do corte', () => {
    const antes = executarReceita({ meta: { nome: 'chapa' }, PARAMS: {}, TOPO: derivar().pontos, PASSOS: [['subdivisao', { origemId: 1, ...passoDaChapa() }]] }).neutro;
    expect(antes.orfaos).toEqual([]);
    const longe = [...antes.F.values()].filter((f: any) => f.vs.every((v: number) => { const p = antes.V.get(v); return Math.hypot(p[0] - m(380), p[2] - m(430)) > m(260); }));
    expect(longe.length).toBeGreaterThan(0);
    expect(longe.filter((f: any) => JSON.stringify(A.neutro.F.get(f.id)?.vs) !== JSON.stringify(f.vs))).toEqual([]);
  });

  it('corte na gaiola: passa no gate 1 na posição da peça, mas a pele sai a milímetros da chapa e a subdivisão recusa parte das posições', () => {
    expect(B.recusa).toBeUndefined();
    expect(B.gate1).toMatchObject({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0 });
    expect(B.faceFina).toBe(0);
    expect(B.gate2.desvio.fora.daBordaAoDesenhoMm).toBeLessThan(0.5);
    expect(B.gate2.desvio.fora.daBordaASuperficieMm).toBeGreaterThan(0.5);
    const recusadas = varredura.filter(({ naGaiola }) => naGaiola.recusa);
    expect(recusadas.length).toBeGreaterThan(0);
    for (const { naGaiola } of recusadas) expect(naGaiola.recusa[0]).toMatch(/se dobra sobre si/);
  });

  it('a mesma receita dá a mesma malha nas duas técnicas', () => {
    const texto = (n: any) => JSON.stringify([[...n.V.entries()], [...n.F.entries()].map(([id, f]: any) => [id, f.vs, f.parte])]);
    expect(texto(executarReceita(corteDepois).neutro)).toBe(texto(A.neutro));
    expect(texto(executarReceita(corteNaGaiola).neutro)).toBe(texto(B.neutro));
  });
});
