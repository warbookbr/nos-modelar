/* vizinhanca-de-todo-vao.test.ts — bateria do plano `docs/modelar/planos/2026-11-09-abertura-na-vizinhanca-de-todo-vao.md`: o vão cuja
   vizinhança alcança o tubo de parede de outro vão recorta, e sai igual ao que a booleana da chapa inteira dá.
     - cada uma das três peças de `vizinhanca-de-todo-vao.js` (o vão grande, o vão junto de outro e o vão rente à parede de outro) recorta
       uma fração pequena da chapa, e a malha sai fechada, com a borda a menos de 0,5 mm do desenho;
     - contra a mesma peça com o recorte desligado (`CONTROLE_DO_RECORTE`, a booleana vê a chapa inteira): as bordas de cada vão ficam a
       menos de 0,5 mm uma da outra, o volume difere menos de 3e-4 e não há lasca nova;
     - a banda de vários pares: as quatro voltas de um anel (as bordas de fora e de dentro das duas peles) se casam duas a duas;
     - o tubo de parede inteiro e o poço: o trecho engole o tubo de um vão e fecha a face que ficou de fora dele. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { CONTROLE_DO_RECORTE, absorverTubos, bandaDaVizinhanca } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';
import { PECAS, passosDa } from './vizinhanca-de-todo-vao.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, rodar } from './medidas';

const rodarCom = (nome: string, recorte: boolean) => {
  const { TOPO, PASSOS, contornos } = passosDa(nome);
  CONTROLE_DO_RECORTE.ligado = recorte;
  try { return { neutro: rodar(TOPO, PASSOS, 'vizinhanca-de-todo-vao'), contornos }; } finally { CONTROLE_DO_RECORTE.ligado = true; }
};

/** O volume com sinal da malha, em metro cúbico: o leque a partir do primeiro canto de cada face. */
function volume(neutro: any): number {
  let v = 0;
  for (const f of neutro.F.values()) {
    const p = f.vs.map((k: number) => neutro.V.get(k));
    for (let k = 1; k + 1 < p.length; k++) {
      const [a, b, c] = [p[0], p[k], p[k + 1]];
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return v;
}

/** A distância de um ponto ao segmento ab, no espaço. */
function distanciaAoSegmento(p: number[], a: number[], b: number[]): number {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t);
}

/** O pior afastamento, em milímetro, dos vértices da volta `de` (no neutro `n`) à poligonal fechada `para` (no neutro `m`). */
function afastamento(n: any, de: number[], m: any, para: number[]): number {
  const linha = para.map((v) => m.V.get(v));
  let pior = 0;
  for (const v of de) {
    const p = n.V.get(v);
    pior = Math.max(pior, Math.min(...linha.map((a: number[], k: number) => distanciaAoSegmento(p, a, linha[(k + 1) % linha.length]))));
  }
  return pior * 1000;
}

for (const nome of Object.keys(PECAS)) {
  describe(`a peça ${nome}`, () => {
    const { neutro: recortada, contornos } = rodarCom(nome, true);
    const { neutro: inteira } = rodarCom(nome, false);
    const ultimo = contornos.length - 1;

    it('recorta o triângulo e os vãos pequenos, uma fração pequena da chapa', () => {
      expect(recortada.orfaos).toEqual([]);
      expect(inteira.orfaos).toEqual([]);
      const viz = recortada.aberturas.map((a: any) => a.vizinhanca);
      expect(viz.map((v: any) => v.recortada), JSON.stringify(viz.map((v: any) => v.motivo))).toEqual(contornos.map(() => true));
      expect(viz[ultimo].faces).toBeLessThan(0.3 * viz[ultimo].daChapa);
      expect(inteira.aberturas.map((a: any) => a.vizinhanca.recortada)).toEqual(contornos.map(() => false));
    });

    it('sai fechada, sem lasca, com a borda de cada vão a menos de 0,5 mm do desenho', () => {
      exigirFechada(gate1(recortada, undefined, { adaptador: false }));
      contornos.forEach((c: any, k: number) => expect(piorDesvio(desvioDoVao(recortada, k, 'y', c)), `o vão ${k}`).toBeLessThan(0.5));
    });

    it('o vão sai igual ao da chapa inteira: borda a menos de 0,5 mm, volume a menos de 3e-4 e nenhuma lasca nova', () => {
      contornos.forEach((_: any, k: number) => {
        const a = recortada.aberturas[k].borda; const b = inteira.aberturas[k].borda;
        for (const pele of ['fora', 'dentro']) {
          expect(afastamento(recortada, a[pele], inteira, b[pele]), `a borda ${pele} do vão ${k}, recortada contra inteira`).toBeLessThan(0.5);
          expect(afastamento(inteira, b[pele], recortada, a[pele]), `a borda ${pele} do vão ${k}, inteira contra recortada`).toBeLessThan(0.5);
        }
      });
      const va = volume(recortada), vb = volume(inteira);
      expect(Math.abs(va - vb) / Math.abs(vb)).toBeLessThan(3e-4);
      const ga = gate1(recortada, undefined, { adaptador: false }); const gb = gate1(inteira, undefined, { adaptador: false });
      expect(ga.faceFina).toBeLessThanOrEqual(gb.faceFina);
      expect(ga.triangulosSemArea).toBeLessThanOrEqual(gb.triangulosSemArea);
      console.log(JSON.stringify({ [nome]: { faces: recortada.F.size, facesDaInteira: inteira.F.size, volumeRelativo: Math.abs(va - vb) / Math.abs(vb), vizinhanca: recortada.aberturas[ultimo].vizinhanca, msRecortada: recortada.ms, msInteira: inteira.ms } }));
    });

    it('é determinística: duas execuções dão a mesma malha, byte a byte', () => {
      const chave = (n: any) => JSON.stringify([...n.F].map(([id, f]: any) => [id, f.vs.map((v: number) => n.V.get(v))]));
      expect(chave(rodarCom(nome, true).neutro)).toBe(chave(recortada));
    });
  });
}

describe('a banda de vários pares', () => {
  /* dois anéis quadrados concêntricos, de 100 e de 40 mm de lado, cada um de duas peles a 2 mm uma da outra: o trecho é o anel inteiro,
     com quatro voltas de borda, e a banda casa cada volta de uma pele com a da outra */
  const volta = (meio: number, passo: number) => {
    const p: number[][] = []; const n = Math.round((2 * meio) / passo);
    for (let k = 0; k < n; k++) p.push([-meio + k * passo, -meio]);
    for (let k = 0; k < n; k++) p.push([meio, -meio + k * passo]);
    for (let k = 0; k < n; k++) p.push([meio - k * passo, meio]);
    for (let k = 0; k < n; k++) p.push([-meio, meio - k * passo]);
    return p;
  };
  const pontos = new Map<number, number[]>(); const faces = new Map<number, number[]>();
  let id = 0;
  const colocar = (p: number[][], y: number) => p.map(([x, z]) => { pontos.set(id, [x, y, z]); return id++; });
  const fora = volta(50, 10), dentro = volta(20, 10);
  const foraCima = colocar(fora, 0), foraBaixo = colocar(fora, -2), dentroCima = colocar(dentro, 0), dentroBaixo = colocar(dentro, -2);
  faces.set(1000, [...foraCima].reverse()); faces.set(1001, foraBaixo);
  faces.set(1002, dentroCima); faces.set(1003, [...dentroBaixo].reverse());
  const pos = (v: number) => pontos.get(v)!;

  it('quatro voltas viram duas bandas, cada volta com a da outra pele, e cada aresta tem a oposta', () => {
    const r = bandaDaVizinhanca(pos, faces);
    expect(r.motivo).toBeUndefined();
    expect(r.voltas).toHaveLength(4);
    expect(r.banda).toHaveLength(2 * (foraCima.length + dentroCima.length));
    const dirigidas = new Set<string>();
    for (const vs of [...faces.values(), ...r.banda]) for (let k = 0; k < vs.length; k++) dirigidas.add(`${vs[k]}>${vs[(k + 1) % vs.length]}`);
    for (const d of dirigidas) { const [a, b] = d.split('>'); expect(dirigidas.has(`${b}>${a}`), d).toBe(true); }
    /* cada triângulo da banda liga duas voltas do mesmo anel: a distância entre os vértices dele é a espessura mais uma aresta, no máximo */
    for (const t of r.banda) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) expect(Math.hypot(...pos(a).map((c: number, k: number) => c - pos(b)[k])), `${a} ${b}`).toBeLessThan(Math.hypot(10, 2) + 1e-9);
  });

  it('uma volta sobrando recusa', () => {
    const r = bandaDaVizinhanca(pos, new Map([...faces].filter(([k]) => k !== 1003)));
    expect(r.motivo).toMatch(/3 voltas/);
  });
});

describe('o tubo de parede e o poço', () => {
  /* uma pele de 7 por 7 faces quadradas de 10 mm: o trecho sem a face do meio tem uma volta de quatro arestas em volta dela, o poço */
  const pontos = new Map<number, number[]>(); const F = new Map<number, { vs: number[] }>();
  let id = 0; const ponto = (x: number, y: number, z: number) => { pontos.set(id, [x, y, z]); return id++; };
  const grade = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => ponto(i * 10, 0, j * 10)));
  let f = 0;
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) F.set(f++, { vs: [grade[i][j], grade[i][j + 1], grade[i + 1][j + 1], grade[i + 1][j]] });
  const idsDaChapa = [...F.keys()];

  it('a face do meio que ficou de fora do trecho entra por ser poço', () => {
    const t = absorverTubos({ F, ids: idsDaChapa.filter((k) => k !== 24), idsDaChapa, ehParede: () => false });
    expect(t.motivo).toBeUndefined();
    expect(t.ids).toEqual(idsDaChapa);
  });

  it('o trecho pequeno diante do lado de fora não tem poço: uma face só fica como está', () => {
    const t = absorverTubos({ F, ids: [0], idsDaChapa, ehParede: () => false });
    expect(t.ids).toEqual([0]);
  });
});
