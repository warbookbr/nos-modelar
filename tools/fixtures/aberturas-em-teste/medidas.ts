/* medidas.ts — as medidas da bateria do plano da abertura em qualquer direção, as mesmas do gate 1 e do gate 2 do plano da abertura
   de contorno livre, aplicadas a qualquer peça de `tools/fixtures/aberturas-em-teste/`: a malha fechada (aresta sem par, vínculo
   não manifold, triângulo sem área pelo adaptador, lasca pela topologia) e o desvio da borda do vão contra o desenho, nas duas
   bordas, em qualquer vista. Tudo em milímetro nas saídas. */
import { expect } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — núcleo em JavaScript.
import { analisarTopologia } from '../../../procedural/nucleo/topologia.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — núcleo em JavaScript.
import { quadroDaVista } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';
// @ts-expect-error — núcleo em JavaScript.
import { contornoPorTrechos } from '../../../procedural/nucleo/curva2d.js';
import { areasDeTriangulo, arestasSemPar, escalaDaPeca, vinculosNaoManifold } from '../../oficina/conferir-malha';

type Ponto2 = [number, number];

/** Roda a receita e devolve o neutro, com `ms` o tempo do passo todo. */
export function rodar(TOPO: any, PASSOS: any, nome = 'peca-de-teste') {
  const t = Date.now();
  const { neutro } = executarReceita({ meta: { nome }, PARAMS: {}, TOPO, PASSOS });
  neutro.ms = Date.now() - t;
  return neutro;
}

/** A primeira recusa, em uma linha, ou null. */
export const recusaDe = (neutro: any): string | null => (neutro.orfaos.length ? `${neutro.orfaos[0].op}.${neutro.orfaos[0].ref}: ${neutro.orfaos[0].motivo}` : null);

/** Para cada triângulo do adaptador abaixo do piso de área, a face do neutro de onde ele veio e os cantos dela, em milímetro. */
function facesDosTriangulosSemArea(raiz: any, neutro: any, piso: number): string[] {
  const achados: string[] = [];
  raiz.traverse((obj: any) => {
    if (!obj.isMesh) return;
    const p = obj.geometry.getAttribute('position'); const o = obj.geometry.getAttribute('origemFace');
    for (let k = 0; k < p.count; k += 3) {
      const u = [p.getX(k + 1) - p.getX(k), p.getY(k + 1) - p.getY(k), p.getZ(k + 1) - p.getZ(k)]; const w = [p.getX(k + 2) - p.getX(k), p.getY(k + 2) - p.getY(k), p.getZ(k + 2) - p.getZ(k)];
      const area = 0.5 * Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
      if (!(area < piso)) continue;
      const id = o ? o.getX(k) * 4294967296 + o.getY(k) : -1; const f = neutro.F.get(id);
      achados.push(`triângulo sem área (${area.toExponential(2)} m²) na face ${id} de ${f?.vs.length} cantos [${f?.vs.map((v: number) => neutro.V.get(v).map((c: number) => +(c * 1000).toFixed(1)).join(',')).join(' | ')}]`);
    }
  });
  return achados;
}

/** O gate 1 sobre as faces do neutro que passam em `filtro`. */
export function gate1(neutro: any, filtro?: (f: any) => boolean) {
  const sel = !filtro ? neutro : { ...neutro, F: new Map([...neutro.F].filter(([, f]: any) => filtro(f))) };
  const { raiz } = adaptarThree(sel, { nome: 'peca-de-teste' });
  const areas = areasDeTriangulo(raiz, escalaDaPeca(sel));
  const topologia = analisarTopologia({ vertices: sel.V, faces: sel.F }, { triangulacao: true });
  const reprova = topologia.achados.filter((a: any) => a.severidade === 'reprova' || a.nivel === 'reprova').map((a: any) => a.codigo);
  return {
    arestasSemPar: arestasSemPar(sel).length, vinculosNaoManifold: vinculosNaoManifold(sel).length,
    triangulosSemArea: areas.abaixo.length, faceFina: topologia.achados.filter((a: any) => a.codigo === 'face-fina').length,
    reprova: [...new Set(reprova)] as string[],
    detalhe: [...facesDosTriangulosSemArea(raiz, sel, areas.piso).slice(0, 3), ...topologia.achados.filter((a: any) => a.codigo === 'face-fina').slice(0, 3).map((a: any) => a.mensagem)] as string[],
  };
}

/** O gate 1 limpo: o que a bateria exige de toda malha (use `toMatchObject`: `detalhe` diz qual face falhou). */
export const FECHADA = { arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0, faceFina: 0, reprova: [] };

const distanciaAoSegmento = (p: Ponto2, a: Ponto2, b: Ponto2) => {
  const ab = [b[0] - a[0], b[1] - a[1]]; const l2 = ab[0] * ab[0] + ab[1] * ab[1];
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t);
};
const distanciaALinha = (p: Ponto2, linha: Ponto2[]) => Math.min(...linha.map((a, k) => distanciaAoSegmento(p, a, linha[(k + 1) % linha.length])));
const amostras = (linha: Ponto2[], passo: number) => {
  const out: Ponto2[] = [];
  linha.forEach((a, k) => { const b = linha[(k + 1) % linha.length]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / passo)); for (let s = 0; s < n; s++) out.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]); });
  return out;
};

/** O desvio das duas bordas do vão `k` contra o desenho: `daBordaAoDesenhoMm` (o pior ponto da borda) e `doDesenhoABordaMm` (o pior
 *  ponto do desenho, de 0,5 em 0,5 mm), em milímetro, na vista dada. O desenho é o polígono fino do contorno. */
export function desvioDoVao(neutro: any, k: number, vista: any, contorno: any, segmentosArco = 256) {
  const q = quadroDaVista(vista);
  const poligono: Ponto2[] = contornoPorTrechos(contorno, { segmentosArco });
  const uv = (v: number): Ponto2 => { const l = q.local(neutro.V.get(v)); return [l[q.u], l[q.v]]; };
  const mm = (x: number) => x * 1000;
  const medir = (volta: number[]) => {
    const linha = volta.map(uv);
    return {
      daBordaAoDesenhoMm: mm(Math.max(...linha.map((p) => distanciaALinha(p, poligono)))),
      doDesenhoABordaMm: mm(Math.max(...amostras(poligono, 0.0005).map((p) => distanciaALinha(p, linha)))),
    };
  };
  const { fora, dentro } = neutro.aberturas[k].borda;
  return { fora: medir(fora), dentro: medir(dentro), pontosFora: fora.length, pontosDentro: dentro.length };
}

/** O maior dos quatro desvios de `desvioDoVao`, em milímetro. */
export const piorDesvio = (d: ReturnType<typeof desvioDoVao>) => Math.max(d.fora.daBordaAoDesenhoMm, d.fora.doDesenhoABordaMm, d.dentro.daBordaAoDesenhoMm, d.dentro.doDesenhoABordaMm);

/** As faces de uma parte ou de uma origem de abertura. */
export const facesDaParte = (neutro: any, parte: string) => [...neutro.F.values()].filter((f: any) => f.parte === parte);

/** Exige o gate 1 limpo e, se falhar, diz qual face. */
export const exigirFechada = (g: ReturnType<typeof gate1>, rotulo = 'a malha') => expect(g, `${rotulo}: ${g.detalhe.join(' | ')}`).toMatchObject(FECHADA);
