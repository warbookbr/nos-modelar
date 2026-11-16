/* abertura-por-contorno-simetria.test.ts — o vão por contorno que segue a simetria declarada (`simetria: 'x'` do passo
   `aberturaPorContorno`) e a costura da subdivisão simétrica em x 0 exato (`costuraExata` do passo `subdivisao`), fatia 2 do plano
   `docs/modelar/planos/2026-11-16-ferramentas-de-correcao-de-superficie.md`. A chapa é a cúpula de 3 por 3 faces na metade x >= 0 do
   repro da rodada 2 do quarto traseiro, com 2 mm de espessura: o vão desenhado no lado +x sai também no -x, nas vistas 'y', 'x' e por
   vetor, com a malha fechada, e a recusa do vão que toca o plano. Sem a opção, o vão sai num lado só, como antes. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — núcleo em JavaScript.
import { espelhoDoContorno, quadroDaVista } from './abertura-por-contorno.js';
// @ts-expect-error — núcleo em JavaScript.
import { manifoldCarregada } from '../manifold.js';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — serviço de autoria em JavaScript.
import { conferirVaosDaPeca } from '../../../src/autoria/molduras-do-vao.js';

const TOPO: Record<string, number[]> = {}; const FACES: string[][] = [];
for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const x = i * 0.1, z = k * 0.1 - 0.15; TOPO[`g${i}${k}`] = [x, 0.2 - x * x - z * z, z]; }
for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) FACES.push([`g${i}${k}`, `g${i}${k + 1}`, `g${i + 1}${k + 1}`, `g${i + 1}${k}`]);
const retangulo = (u0: number, v0: number, u1: number, v1: number) => ({ inicio: [u0, v0], trechos: [{ reto: [u1, v0] }, { reto: [u1, v1] }, { reto: [u0, v1] }, { reto: [u0, v0] }] });
const VAOS: Record<string, any> = {
  y: { vista: 'y', sentido: '+', contorno: retangulo(0.12, -0.04, 0.2, 0.04) },
  x: { vista: 'x', sentido: '+', contorno: retangulo(-0.03, 0.15, 0.03, 0.17) },
  vetor: { vista: [0.3, 1, 0], sentido: '+', contorno: retangulo(0.06, -0.04, 0.12, 0.04) },
};
function rodar(vao: any, { simetria = false, costuraExata = false, chapa = {} } = {}) {
  const PASSOS = [
    ['subdivisao', { origemId: 1, vertices: Object.keys(TOPO), faces: FACES, niveis: 2, espessura: 0.002, simetria: 'x', ...(costuraExata ? { costuraExata: true } : {}), ...chapa }],
    ['aberturaPorContorno', { origemId: 2, chapa: { origem: { op: 'subdivisao', id: 1 } }, ...vao, ...(simetria ? { simetria: 'x' } : {}) }],
  ];
  return executarReceita({ meta: { nome: 'vao-com-simetria' }, PARAMS: {}, TOPO, PASSOS }).neutro;
}
const aoSegmento = (p: number[], a: number[], b: number[]) => {
  const ab = [0, 1, 2].map((c) => b[c] - a[c]); const l2 = ab.reduce((t, c) => t + c * c, 0);
  const t = l2 > 0 ? Math.max(0, Math.min(1, [0, 1, 2].reduce((s, c) => s + (p[c] - a[c]) * ab[c], 0) / l2)) : 0;
  return Math.hypot(...[0, 1, 2].map((c) => p[c] - a[c] - t * ab[c]));
};
const xsDaBorda = (neutro: any, a: any) => a.borda.fora.map((v: number) => neutro.V.get(v)[0]);
const lado = (neutro: any, a: any) => { const xs = xsDaBorda(neutro, a); return Math.min(...xs) > 0 ? '+x' : Math.max(...xs) < 0 ? '-x' : 'cruza'; };

describe.skipIf(!manifoldCarregada())('aberturaPorContorno com simetria: o vão declarado sai nos dois lados do plano x = 0', () => {
  for (const [nome, vao] of Object.entries(VAOS)) {
    it(`vista ${nome}: sem a opção o vão sai só no lado +x; com ela, nos dois, espelhado, com a malha fechada`, () => {
      const so = rodar(vao);
      expect(so.orfaos).toEqual([]);
      expect(so.aberturas.map((a: any) => lado(so, a))).toEqual(['+x']);
      const dois = rodar(vao, { simetria: true });
      expect(dois.orfaos).toEqual([]);
      expect(dois.aberturas.map((a: any) => [lado(dois, a), !!a.espelho])).toEqual([['+x', false], ['-x', true]]);
      expect(arestasSemPar(dois)).toHaveLength(0);
      expect(vinculosNaoManifold(dois)).toHaveLength(0);
      /* a borda de fora espelhada é a imagem da declarada: a imagem de cada ponto de uma fica a menos de 0,5 mm da volta da outra */
      const [d, e] = dois.aberturas.map((a: any) => a.borda.fora.map((v: number) => dois.V.get(v)));
      const longe = d.map((p: number[]) => Math.min(...e.map((q: number[], k: number) => aoSegmento([-p[0], p[1], p[2]], q, e[(k + 1) % e.length]))));
      expect(Math.max(...longe)).toBeLessThan(5e-4);
      /* a origem sem parte é a chapa com os dois vãos; parede junta os dois, e espelho.borda é a do outro lado */
      const registro = dois.origens.get(2)[0];
      expect(registro.simetria).toBe('x');
      expect(registro.espelho.borda.fora).toEqual(dois.aberturas[1].borda.fora);
      expect(registro.parede.length).toBe(dois.aberturas[0].parede.length + dois.aberturas[1].parede.length);
    });
  }

  it('a mesma receita com simetria dá a mesma malha, byte a byte', () => {
    const a = rodar(VAOS.y, { simetria: true }); const b = rodar(VAOS.y, { simetria: true });
    expect(JSON.stringify([...b.V])).toBe(JSON.stringify([...a.V]));
    expect(JSON.stringify([...b.F].map(([id, f]: any) => [id, f.vs]))).toBe(JSON.stringify([...a.F].map(([id, f]: any) => [id, f.vs])));
  });

  it('com lente, cada vão tem a sua, do lado dele', () => {
    const n = rodar({ ...VAOS.y, lente: true }, { simetria: true });
    expect(n.orfaos).toEqual([]);
    const [d, e] = n.aberturas;
    expect(d.lente.length).toBeGreaterThan(0);
    expect(e.lente.length).toBe(d.lente.length);
  });

  it('recusa o vão que toca o plano, a simetria desconhecida e a vista x sem sentido', () => {
    const cruza = rodar({ vista: 'y', sentido: '+', contorno: retangulo(-0.02, -0.04, 0.05, 0.04) }, { simetria: true });
    expect(cruza.orfaos[0]).toMatchObject({ op: 'aberturaPorContorno', ref: 'simetria' });
    expect(cruza.orfaos[0].motivo).toMatch(/de um lado só do plano x = 0, a mais de 2[.\d]* mm dele \(a maior entre 1 mm e a espessura da chapa.*a borda prevista na chapa vai de x -20 a 50 mm/);
    const outra = rodar({ ...VAOS.y, simetria: 'z' });
    expect(outra.orfaos[0]).toMatchObject({ op: 'aberturaPorContorno', ref: 'simetria' });
    expect(outra.orfaos[0].motivo).toMatch(/simetria só aceita 'x'.*veio "z"/);
    const semSentido = rodar({ vista: 'x', contorno: VAOS.x.contorno }, { simetria: true });
    expect(semSentido.orfaos[0]).toMatchObject({ op: 'aberturaPorContorno', ref: 'sentido' });
    expect(semSentido.orfaos[0].motivo).toMatch(/na vista 'x'.*declare sentido/);
  });
});

describe.skipIf(!manifoldCarregada())('aberturaPorContorno com simetria: a folga do plano e os dois vãos no mesmo eixo', () => {
  it('o vão a menos da folga do plano recusa antes do corte, em toda vista, e dizendo a distância', () => {
    /* a 0,2 mm do plano a limpeza fundia os dois vãos e o grito era o genérico das bordas; de 0,3 a 1,5 mm o corte passava */
    for (const [d, texto] of [[0.0002, '0.2'], [0.0004, '0.4'], [0.0015, '1.5']] as const) {
      const n = rodar({ vista: 'y', sentido: '+', contorno: retangulo(d, -0.04, 0.08, 0.04) }, { simetria: true });
      expect(n.orfaos[0]).toMatchObject({ op: 'aberturaPorContorno', ref: 'simetria' });
      expect(n.orfaos[0].motivo).toMatch(new RegExp(`a mais de 2 mm dele .*a limpeza da costura funde as bordas dos dois vãos.*a borda prevista na chapa vai de x ${texto.replace('.', '\\.')} a 80 mm`));
    }
    expect(rodar({ vista: 'y', sentido: '+', contorno: retangulo(0.0025, -0.04, 0.08, 0.04) }, { simetria: true }).orfaos).toEqual([]);
    /* na vista por vetor a borda prevista é a da reta do vetor na chapa, e não o u do desenho */
    const vetor = rodar({ vista: [0.3, 1, 0], sentido: '+', contorno: retangulo(-0.03, 0.0145, 0.03, 0.0545) }, { simetria: true });
    expect(vetor.orfaos[0]).toMatchObject({ op: 'aberturaPorContorno', ref: 'simetria' });
    expect(vetor.orfaos[0].motivo).toMatch(/a mais de 2 mm dele .*a borda prevista na chapa vai de x 0\.3\d* a 42\.\d+ mm/);
    /* na vista 'x' a camada que o vão corta é a do lado +x, e a borda prevista é onde a reta do eixo a cruza */
    const x = rodar(VAOS.x, { simetria: true });
    expect(x.orfaos).toEqual([]);
  });

  it("o vetor só em x com simetria: os dois prismas param no mesmo plano, recuados, e a malha fecha", () => {
    /* antes, mesmoEixo comparava o objeto do quadro, as tampas dividiam o plano e a booleana recusava o sólido não fechado */
    const n = rodar({ vista: [1, 0, 0], sentido: '+', contorno: retangulo(-0.03, 0.15, 0.03, 0.17) }, { simetria: true });
    expect(n.orfaos).toEqual([]);
    expect(n.aberturas.map((a: any) => [lado(n, a), !!a.espelho])).toEqual([['+x', false], ['-x', true]]);
    expect(arestasSemPar(n)).toHaveLength(0);
    expect(vinculosNaoManifold(n)).toHaveLength(0);
  });

  it('a chapa sem o outro lado do plano recusa a simetria no mesmo eixo, na vista x e no vetor só em x', () => {
    for (const vao of [{ vista: 'x', sentido: '+' }, { vista: [1, 0, 0] }]) {
      const n = rodar({ ...vao, contorno: retangulo(-0.03, 0.15, 0.03, 0.17) }, { simetria: true, chapa: { simetria: undefined } });
      expect(n.orfaos[0]).toMatchObject({ op: 'aberturaPorContorno', ref: 'simetria' });
      expect(n.orfaos[0].motivo).toMatch(/o vão espelhado é visto do mesmo eixo que o declarado, do lado oposto, e a reta do eixo atravessa a chapa uma vez só.*a chapa não tem o outro lado do plano x = 0.*tire a simetria do passo/);
    }
  });
});

describe.skipIf(!manifoldCarregada())('o friso e a moldura do vão espelhado pela simetria', () => {
  const FRISO = ['friso', { origemId: 3, superficie: { op: 'aberturaPorContorno', id: 2 }, linha: { nome: 'volta' }, perfil: { retangulo: { largura: 0.006, profundidade: 0.003 } } }];
  const comFriso = (simetria: boolean) => executarReceita({ meta: { nome: 'vao-com-simetria' }, PARAMS: {}, TOPO, PASSOS: [
    ['subdivisao', { origemId: 1, vertices: Object.keys(TOPO), faces: FACES, niveis: 2, espessura: 0.002, simetria: 'x' }],
    ['aberturaPorContorno', { origemId: 2, chapa: { origem: { op: 'subdivisao', id: 1 } }, ...VAOS.y, ...(simetria ? { simetria: 'x' } : {}) }],
    FRISO,
  ] }).neutro;
  const VAO = { nome: 'janela', superficie: { op: 'aberturaPorContorno', id: 2 }, frisos: ['volta'] };
  /* o neutro sem a cópia do friso que segue o vão espelhado: o que a guarda via antes, com o friso só no vão declarado */
  const semACopia = (n: any) => Object.create(n, { frisos: { value: n.frisos.filter((f: any) => !f.espelhoDaAbertura) } });

  it('o friso segue a borda dos dois vãos, e cada cópia fica sobre a borda do seu', () => {
    const n = comFriso(true);
    expect(n.orfaos).toEqual([]);
    expect(n.frisos.map((f: any) => [f.nome, !!f.espelhoDaAbertura])).toEqual([['volta', false], ['volta', true]]);
    for (const [k, f] of n.frisos.entries()) expect(Math.sign(f.secoes[0].p[0])).toBe(k === 0 ? 1 : -1);
    expect(comFriso(false).frisos.map((f: any) => !!f.espelhoDaAbertura)).toEqual([false]);
  });

  it('a guarda confere a borda do vão espelhado e grita quando nenhum friso a cobre', () => {
    const n = comFriso(true);
    const r = conferirVaosDaPeca(n, { vaos: [VAO] });
    expect(r.problemas).toEqual([]);
    const so = conferirVaosDaPeca(comFriso(false), { vaos: [VAO] });
    expect(r.vaos[0].amostras).toBe(2 * so.vaos[0].amostras);
    expect(r.vaos[0].cobertas).toBe(r.vaos[0].amostras);
    expect(r.aberturas.map((a: any) => [a.chapa, a.vao])).toEqual([['aberturaPorContorno:2', 'janela'], ['aberturaPorContorno:2 (vão espelhado)', 'janela']]);
    /* antes da correção, a mesma declaração dava ok com o vão -x sem moldura */
    const sem = conferirVaosDaPeca(semACopia(n), { vaos: [VAO] });
    expect(sem.ok).toBe(false);
    expect(sem.problemas).toEqual([expect.stringMatching(/'janela': o vão espelhado de aberturaPorContorno:2 não tem moldura: .*nenhum dos frisos 'volta' segue a borda dele/)]);
    /* sem moldura declarada, o friso que cobre qualquer dos dois vãos reprova, cada um com o seu texto */
    const semMoldura = conferirVaosDaPeca(n, { vaos: [{ nome: 'janela', superficie: VAO.superficie, semMoldura: { motivo: 'a janela de prova fica aberta nesta conferência, para medir a declaração' } }] });
    expect(semMoldura.problemas).toEqual([expect.stringMatching(/100,0% da borda fica sob/), expect.stringMatching(/100,0% da borda do vão espelhado fica sob/)]);
  });

  it('sem declaração, os dois vãos reprovam, o espelhado rotulado à parte', () => {
    expect(conferirVaosDaPeca(comFriso(true), {}).problemas).toEqual([
      expect.stringMatching(/^a abertura aberturaPorContorno:2 não tem declaração/),
      expect.stringMatching(/^a abertura aberturaPorContorno:2 \(vão espelhado\) não tem declaração/),
    ]);
  });
});

describe('espelhoDoContorno: o contorno do vão espelhado no plano x = 0', () => {
  const P = [[0.1, 0.2], [0.3, 0.2], [0.3, 0.4]];
  it("nas vistas 'y' e 'z' troca o sinal de u; na 'x' inverte o sentido", () => {
    expect(espelhoDoContorno('y', quadroDaVista('y'), P, '+').poligono).toEqual(P.map(([u, v]) => [-u, v]));
    expect(espelhoDoContorno('z', quadroDaVista('z'), P, null).sentido).toBe(null);
    const x = espelhoDoContorno('x', quadroDaVista('x'), P, '+');
    expect([x.poligono, x.sentido]).toEqual([P, '-']);
  });
  it('na vista por vetor, cada ponto do espelho é a imagem do ponto no espaço', () => {
    const q = quadroDaVista([0.3, 1, 0.2]);
    const e = espelhoDoContorno([0.3, 1, 0.2], q, P, '+');
    expect(e.vista).toEqual([-0.3, 1, 0.2]);
    P.forEach(([u, v], k) => {
      const p = q.mundo([u, v, 0]); const pe = e.quadro.mundo([e.poligono[k][0], e.poligono[k][1], 0]);
      expect(Math.hypot(p[0] + pe[0], p[1] - pe[1], p[2] - pe[2])).toBeLessThan(1e-12);
    });
  });
});

describe('subdivisao com costuraExata: a costura da simetria em x 0 exato', () => {
  it('sem a opção a face interna fica a menos de 1e-6 de x 0 sem ser 0; com ela, todo vértice perto do plano está nele', () => {
    const conta = (n: any) => { let zero = 0, quase = 0; for (const p of n.V.values()) { if (p[0] === 0) zero++; else if (Math.abs(p[0]) < 1e-6) quase++; } return [zero, quase]; };
    expect(conta(rodar(VAOS.y))).toEqual([13, 13]);
    expect(conta(rodar(VAOS.y, { costuraExata: true }))).toEqual([26, 0]);
  });
  it('fora da costura nada muda: só a coordenada x dos vértices do plano sai do lugar', () => {
    const antes = rodar(VAOS.y); const depois = rodar(VAOS.y, { costuraExata: true });
    let mudaram = 0;
    for (const [id, p] of antes.V) {
      const q = depois.V.get(id);
      expect(q[1]).toBe(p[1]); expect(q[2]).toBe(p[2]);
      if (q[0] !== p[0]) { mudaram++; expect(Math.abs(p[0])).toBeLessThan(1e-15); expect(q[0]).toBe(0); }
    }
    expect(mudaram).toBe(13);
  });
  it('recusa costuraExata sem simetria e com valor que não é booleano', () => {
    const semSimetria = rodar(VAOS.y, { costuraExata: true, chapa: { simetria: undefined } });
    expect(semSimetria.orfaos[0]).toMatchObject({ op: 'subdivisao', ref: 'costuraExata' });
    expect(semSimetria.orfaos[0].motivo).toMatch(/costuraExata só vale com simetria: 'x'/);
    const texto = rodar(VAOS.y, { chapa: { costuraExata: 'sim' } });
    expect(texto.orfaos[0]).toMatchObject({ op: 'subdivisao', ref: 'costuraExata' });
    expect(texto.orfaos[0].motivo).toMatch(/costuraExata só aceita true .* e veio "sim"/);
  });
});
