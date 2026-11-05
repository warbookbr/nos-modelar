/* abertura-por-contorno.test.ts — a operação `aberturaPorContorno` na peça de teste `tools/fixtures/abertura-de-prova/`, pelos
   gates do plano da abertura de contorno livre (`docs/modelar/planos/encerrados/2026-11-05-abertura-de-contorno-livre.md`):
     gate 1: a chapa com a abertura, a lente e a aba saem sem aresta sem par, vínculo não manifold, triângulo sem área (as funções de
             `tools/oficina/conferir-malha.ts`) nem lasca (`face-fina` de `procedural/nucleo/topologia.js`), na posição da peça e
             com o contorno deslocado de 1 a 11 mm, no piso de segmentos e com 32 por quarto de arco, e em mais três posições com
             64 por quarto (nenhuma achado reprovado da topologia). Na fatia 1 o corte depois da
             subdivisão deixava de 3 a 8 triângulos sem área em toda posição; este teste trava a ausência deles;
     gate 2: as duas bordas do vão (a de fora e a de dentro) a menos de 0,5 mm do contorno desenhado, nos dois sentidos, a de fora
             sobre a chapa sem vão em y, e o bico dentro de 2 graus do desenhado (por `tools/fixtures/abertura-de-prova/medir.mjs`);
     gate 3: a mesma receita dá a mesma malha, byte a byte, e as faces longe do vão ficam com o id e os cantos de antes.
   Mais as recusas com mensagem útil, as vistas 'x' e 'z' (a mesma chapa girada) e a aba pelo friso. O primeiro teste imprime os
   números que o README de `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/` registra. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — núcleo em JavaScript.
import { analisarTopologia } from '../topologia.js';
// @ts-expect-error — núcleo em JavaScript.
import { pisoDeSegmentos, errosDosBicos, recuarPoligono, RECUO_PADRAO_DA_LENTE } from './abertura-por-contorno.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — peça de teste em JavaScript.
import receita from '../../../tools/fixtures/abertura-de-prova/receita.js';
// @ts-expect-error — peça de teste em JavaScript.
import { TABELA, alturaDaChapa, derivar, passoDaChapa } from '../../../tools/fixtures/abertura-de-prova/chapa.js';
// @ts-expect-error — medidas em JavaScript.
import { medirAbertura, qualidadeDasFaces, relacaoEntrePartes } from '../../../tools/fixtures/abertura-de-prova/medir.mjs';
// @ts-expect-error — núcleo em JavaScript.
import { manifoldCarregada } from '../manifold.js';
// @ts-expect-error — adaptador em JavaScript.
import { conferirVaosDaPeca, formatarVaos } from '../../../src/autoria/molduras-do-vao.js';
import { areasDeTriangulo, arestasSemPar, escalaDaPeca, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const m = (mm: number) => mm / 1000;
const INTERIOR = [[m(50), m(50)], [m(750), m(750)]];
const PISO = pisoDeSegmentos(derivar().trechos, { segmentosArco: 4 }).arco;

/** A receita com outra tabela, pela cópia dos descritores (o getter de PASSOS lê a tabela nova). */
function comTabela(T: any, passos?: any) {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita)) as any;
  copia.PARAMS = T;
  if (passos) Object.defineProperty(copia, 'PASSOS', { value: passos });
  return copia;
}

/** A tabela com o contorno deslocado de `dx` mm em x e 0,7 dx em z, e `segmentos` por quarto de arco. */
function deslocada(dx: number, segmentos: number) {
  const T = structuredClone(TABELA);
  T.contorno.segmentosArco = segmentos;
  for (const k of ['bico', 'fimDoReto', 'fimDoArco']) T.contorno[k] = [T.contorno[k][0] + dx, T.contorno[k][1] + dx * 0.7];
  return T;
}

/** Só as faces de uma lista de partes, para a medida da borda não ver a lente nem a aba. */
const soPartes = (neutro: any, partes: string[]) => ({ ...neutro, F: new Map([...neutro.F].filter(([, f]: any) => partes.includes(f.parte))) });

function gate1(neutro: any) {
  const { raiz } = adaptarThree(neutro, { nome: 'abertura-de-prova' });
  const areas = areasDeTriangulo(raiz, escalaDaPeca(neutro));
  const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F }, { triangulacao: true });
  const reprova = topologia.achados.filter((a: any) => a.nivel === 'reprova').map((a: any) => a.codigo);
  return {
    arestasSemPar: arestasSemPar(neutro).length, vinculosNaoManifold: vinculosNaoManifold(neutro).length,
    triangulosSemArea: areas.abaixo.length, menorTriangulo: areas.menor, pisoDeArea: areas.piso,
    faceFina: topologia.achados.filter((a: any) => a.codigo === 'face-fina').length, reprova: [...new Set(reprova)],
  };
}

function medir(T: any, neutroPronto?: any) {
  const neutro = neutroPronto ?? executarReceita(comTabela(T)).neutro;
  if (neutro.orfaos.length) return { neutro, recusa: neutro.orfaos.map((o: any) => `${o.op}: ${o.motivo}`) };
  const d = derivar(T);
  const chapa = soPartes(neutro, ['chapa', 'emVoltaDoVao']);
  const gate2 = medirAbertura(chapa, { contorno: d.trechos, poligono: d.poligono, interior: INTERIOR, bico: T.contorno.bico.map(m), alturaEm: alturaDaChapa(T, d) });
  const emVolta = [...neutro.F.values()].filter((f: any) => f.parte === 'emVoltaDoVao').map((f: any) => f.id);
  const porParte = (p: string) => [...neutro.F.values()].filter((f: any) => f.parte === p).length;
  return {
    neutro,
    gate1: gate1(neutro), gate1DaChapa: gate1(chapa), gate1DaLente: gate1(soPartes(neutro, ['lente'])), gate2,
    emVoltaDoVao: qualidadeDasFaces(neutro, emVolta),
    malha: { vertices: neutro.V.size, faces: neutro.F.size, chapa: porParte('chapa') + porParte('emVoltaDoVao'), lente: porParte('lente'), aba: porParte('aba') },
  };
}

const resumo = (r: any) => (r.recusa ? { recusa: r.recusa[0] } : {
  ...r.gate1, menorTriangulo: Number(r.gate1.menorTriangulo.toExponential(2)), pisoDeArea: undefined,
  xz: Number(r.gate2.desvio.fora.daBordaAoDesenhoMm.toFixed(3)), xzVolta: Number(r.gate2.desvio.fora.doDesenhoABordaMm.toFixed(3)),
  xzDentro: Number(r.gate2.desvio.dentro.daBordaAoDesenhoMm.toFixed(3)), xzDentroVolta: Number(r.gate2.desvio.dentro.doDesenhoABordaMm.toFixed(3)),
  y: Number(r.gate2.desvio.fora.daBordaASuperficieMm.toFixed(3)), bico: Number(r.gate2.bico.anguloNaMalha.toFixed(2)),
});

/* as posições da fatia 1, no piso e com 32 segmentos, e mais três com 64, onde o arco de 51 mm de raio tem pontos a 1,3 mm */
const POSICOES = [...[0, 1, 3, 7, 11].flatMap((dx) => [PISO, 32].map((segmentos) => ({ dx, segmentos }))), ...[-4, 9, 17].map((dx) => ({ dx, segmentos: 64 }))];

/** O corte sem a limpeza, como a fatia 1 o mediu: o prisma do contorno por `extrusao` e o `subtrair` do núcleo, sem a operação. */
function semLimpeza(T: any) {
  const d = derivar(T);
  const passos = [
    ['subdivisao', { origemId: 1, ...passoDaChapa(T, d) }],
    ['extrusao', { origemId: 2, perfil: { contorno: d.trechos }, segmentosArco: T.contorno.segmentosArco, altura: 0.5, em: [0, 0, 0] }],
    ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'subdivisao', id: 1 } }, { origem: { op: 'extrusao', id: 2 } }] }],
  ];
  const { neutro } = executarReceita(comTabela(T, passos));
  return neutro.orfaos.length ? { recusa: neutro.orfaos[0].motivo } : gate1(neutro);
}

describe('aberturaPorContorno na peça de teste', () => {
  const A = medir(TABELA) as any;
  const varredura = POSICOES.map(({ dx, segmentos }) => ({ dx, segmentos, r: medir(deslocada(dx, segmentos)) as any }));

  it('imprime as medidas do banco de provas', () => {
    console.log(JSON.stringify({
      piso: PISO, errosDoBico: [PISO - 1, PISO, 32].map((n) => ({ segmentosArco: n, ...errosDosBicos(derivar().trechos, { segmentosArco: n })[0] })),
      peca: { malha: A.malha, abertura: A.neutro.aberturas[0].limpeza, espessura: A.neutro.aberturas[0].espessura, gate1: A.gate1, gate1DaChapa: A.gate1DaChapa, gate1DaLente: A.gate1DaLente, gate2: A.gate2, emVoltaDoVao: A.emVoltaDoVao },
      varredura: varredura.map(({ dx, segmentos, r }) => ({ dx, segmentos, limpeza: r.neutro.aberturas?.[0]?.limpeza, ...resumo(r), semLimpeza: semLimpeza(deslocada(dx, segmentos)) })),
    }, null, 2));
    expect(A.neutro.orfaos).toEqual([]);
  });

  it('gate 1: a chapa, a lente e a aba saem fechadas, sem triângulo sem área e sem lasca, em toda posição', () => {
    for (const { dx, segmentos, r } of [{ dx: 0, segmentos: 32, r: A }, ...varredura]) {
      const onde = `dx ${dx}, ${segmentos} segmentos`;
      expect(r.recusa, onde).toBeUndefined();
      expect(r.gate1, onde).toMatchObject({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0, faceFina: 0, reprova: [] });
      expect(r.malha.lente, onde).toBeGreaterThan(0);
      expect(r.malha.aba, onde).toBeGreaterThan(0);
    }
  });

  it('gate 2: as duas bordas seguem o desenho a menos de 0,5 mm, a de fora fica na chapa sem vão, e o bico fica a 2 graus', () => {
    for (const { dx, segmentos, r } of [{ dx: 0, segmentos: 32, r: A }, ...varredura]) {
      const onde = `dx ${dx}, ${segmentos} segmentos`;
      const { fora, dentro } = r.gate2.desvio;
      for (const borda of [fora, dentro]) {
        expect(borda.daBordaAoDesenhoMm, onde).toBeLessThan(0.5);
        expect(borda.doDesenhoABordaMm, onde).toBeLessThan(0.5);
      }
      expect(fora.daBordaASuperficieMm, onde).toBeLessThan(1e-3);
      expect(r.gate2.desvio.peleDeForaASuperficieMm, onde).toBeLessThan(0.05);
      expect(r.gate2.bico.diferenca, onde).toBeLessThan(2);
    }
  });

  it('gate 3: a mesma receita dá a mesma malha, e as faces longe do vão ficam com o id e os cantos de antes', () => {
    const texto = (n: any) => JSON.stringify([[...n.V.entries()], [...n.F.entries()].map(([id, f]: any) => [id, f.vs, f.parte, f.liso])]);
    expect(texto(executarReceita(receita).neutro)).toBe(texto(A.neutro));
    const antes = executarReceita({ meta: { nome: 'chapa' }, PARAMS: {}, TOPO: derivar().pontos, PASSOS: [['subdivisao', { origemId: 1, ...passoDaChapa() }]] }).neutro;
    expect(antes.orfaos).toEqual([]);
    const longe = [...antes.F.values()].filter((f: any) => f.vs.every((v: number) => { const p = antes.V.get(v); return Math.hypot(p[0] - m(380), p[2] - m(430)) > m(260); }));
    expect(longe.length).toBeGreaterThan(0);
    expect(longe.filter((f: any) => JSON.stringify(A.neutro.F.get(f.id)?.vs) !== JSON.stringify(f.vs))).toEqual([]);
  });

  it('a aba segue a borda de fora a menos de 0,25 mm, entra no vão e desce, e a lente é o pedaço do vão', () => {
    const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cruz = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const tam = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
    const aoSegmento = (p: number[], u: number[], v: number[]) => { const uv = sub(v, u); const t = Math.max(0, Math.min(1, dot(sub(p, u), uv) / dot(uv, uv))); return tam(sub(p, [u[0] + uv[0] * t, u[1] + uv[1] * t, u[2] + uv[2] * t])); };
    const aoTriangulo = (p: number[], a: number[], b: number[], c: number[]) => {
      const n = cruz(sub(b, a), sub(c, a)); const l = tam(n);
      if (l > 0) { const N = n.map((x) => x / l); const h = dot(sub(p, a), N); const q = sub(p, N.map((x) => x * h)); if ([[a, b], [b, c], [c, a]].every(([u, v]) => dot(cruz(sub(v, u), sub(q, u)), N) >= 0)) return Math.abs(h); }
      return Math.min(aoSegmento(p, a, b), aoSegmento(p, b, c), aoSegmento(p, c, a));
    };
    const { neutro } = A;
    const tris: number[][][] = [];
    for (const f of neutro.F.values()) if (f.parte === 'aba') { const P = f.vs.map((v: number) => neutro.V.get(v)); for (let k = 1; k + 1 < P.length; k++) tris.push([P[0], P[k], P[k + 1]]); }
    const folga = Math.max(...neutro.aberturas[0].borda.fora.map((v: number) => Math.min(...tris.map(([a, b, c]) => aoTriangulo(neutro.V.get(v), a, b, c)))));
    expect(folga).toBeLessThan(m(0.25));
    const d = derivar();
    const altura = alturaDaChapa();
    const dentro = (x: number, z: number) => { let c = false; const P = d.poligono; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
    const daAba = [...new Set([...neutro.F.values()].filter((f: any) => f.parte === 'aba').flatMap((f: any) => f.vs))].map((v) => neutro.V.get(v));
    expect(daAba.filter((p: number[]) => dentro(p[0], p[2])).length / daAba.length).toBeGreaterThan(0.9);
    expect(Math.min(...daAba.map((p: number[]) => p[1] - altura(p[0], p[2])))).toBeLessThan(-m(TABELA.aba.largura));
    /* a lente cabe no prisma do contorno */
    const lente = [...new Set([...neutro.F.values()].filter((f: any) => f.parte === 'lente').flatMap((f: any) => f.vs))].map((v) => neutro.V.get(v));
    expect(lente.every((p: number[]) => dentro(p[0], p[2]) || Math.min(...d.poligono.map((q: number[], k: number) => aoSegmento([p[0], 0, p[2]], [q[0], 0, q[1]], [d.poligono[(k + 1) % d.poligono.length][0], 0, d.poligono[(k + 1) % d.poligono.length][1]]))) < 1e-6)).toBe(true);
    console.log(JSON.stringify({ folgaDaAbaMm: folga * 1000, abaDentroDoVao: daAba.filter((p: number[]) => dentro(p[0], p[2])).length / daAba.length, abaDesceMm: -1000 * Math.min(...daAba.map((p: number[]) => p[1] - altura(p[0], p[2]))) }));
  });

  it('a lente fica no lugar, recuada para além da perna da aba: nenhum volume em comum com a aba nem com a chapa', () => {
    const wasm = manifoldCarregada();
    const [abertura] = A.neutro.aberturas;
    expect(abertura.recuoDaLente).toBeCloseTo(RECUO_PADRAO_DA_LENTE * m(TABELA.chapa.espessura), 6);
    /* a volta da lente vista de cima fica a recuoDaLente do contorno desenhado */
    const P = derivar().poligono;
    const aoContorno = (p: number[]) => Math.min(...P.map((q: number[], k: number) => { const r = P[(k + 1) % P.length]; const uv = [r[0] - q[0], r[1] - q[1]]; const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * uv[0] + (p[2] - q[1]) * uv[1]) / (uv[0] ** 2 + uv[1] ** 2))); return Math.hypot(p[0] - q[0] - uv[0] * t, p[2] - q[1] - uv[1] * t); }));
    const daLente = [...new Set([...A.neutro.F.values()].filter((f: any) => f.parte === 'lente').flatMap((f: any) => f.vs))].map((v) => A.neutro.V.get(v));
    const menor = Math.min(...daLente.map(aoContorno));
    expect(Math.abs(menor - abertura.recuoDaLente)).toBeLessThan(1e-6);
    const comAba = relacaoEntrePartes(A.neutro, ['lente'], ['aba'], wasm);
    const comChapa = relacaoEntrePartes(A.neutro, ['lente'], ['chapa', 'emVoltaDoVao'], wasm);
    expect(comAba.volumeMm3).toBeLessThan(1e-6);
    expect(comAba.distanciaMm).toBeGreaterThan(1);
    expect(comChapa.volumeMm3).toBeLessThan(1e-6);
    expect(comChapa.distanciaMm).toBeCloseTo(abertura.recuoDaLente * 1000, 3);
    /* sem o recuo, a lente ocupa o vão inteiro e atravessa a aba; com 3 mm (raio + espessura) ela ainda a cruza perto do bico */
    const comRecuo = (recuo: number) => {
      const passos = receita.PASSOS.map((p: any) => (p[0] === 'aberturaPorContorno' ? [p[0], { ...p[1], recuoDaLente: recuo }] : p));
      const { neutro } = executarReceita(comTabela(TABELA, passos));
      expect(neutro.orfaos).toEqual([]);
      return relacaoEntrePartes(neutro, ['lente'], ['aba'], wasm, { distancia: false });
    };
    const semRecuo = comRecuo(0); const raioMaisEspessura = comRecuo(m(3));
    expect(semRecuo.volumeMm3).toBeGreaterThan(1000);
    expect(raioMaisEspessura.volumeMm3).toBeGreaterThan(0.1);
    /* e em toda posição da varredura, com o recuo padrão */
    const naVarredura = varredura.map(({ dx, segmentos, r }) => ({ dx, segmentos, volumeMm3: relacaoEntrePartes(r.neutro, ['lente'], ['aba'], wasm, { distancia: false }).volumeMm3 }));
    expect(naVarredura.filter((x) => !(x.volumeMm3 < 1e-6))).toEqual([]);
    console.log(JSON.stringify({ recuoDaLenteMm: abertura.recuoDaLente * 1000, lenteAoContornoMm: menor * 1000, lenteComAba: comAba, lenteComChapa: comChapa, recuo0: semRecuo, recuo3mm: raioMaisEspessura }));
  });

  it('a limpeza age na costura de toda posição, e a espessura medida na borda é a da chapa', () => {
    for (const { dx, segmentos, r } of [{ dx: 0, segmentos: 32, r: A }, ...varredura]) {
      const [abertura] = r.neutro.aberturas;
      const { verticesFundidos, facesSemArea, lascas } = abertura.limpeza;
      expect(verticesFundidos + facesSemArea + lascas, `dx ${dx}, ${segmentos} segmentos`).toBeGreaterThan(0);
      expect(abertura.espessura).toBeCloseTo(m(TABELA.chapa.espessura), 6);
      expect(abertura.borda.fora.length).toBeGreaterThan(derivar(deslocada(dx, segmentos)).poligono.length);
    }
  });
});

describe('aberturaPorContorno: as recusas dizem o que fazer', () => {
  const d = derivar();
  const passosCom = (args: any) => [['subdivisao', { origemId: 1, ...passoDaChapa() }], ['aberturaPorContorno', { origemId: 3, chapa: { origem: { op: 'subdivisao', id: 1 } }, vista: 'y', segmentosArco: 32, contorno: d.trechos, ...args }]];
  const recusa = (args: any) => {
    const { neutro } = executarReceita(comTabela(TABELA, passosCom(args)));
    expect(neutro.orfaos.length, JSON.stringify(args).slice(0, 80)).toBe(1);
    const [o] = neutro.orfaos;
    expect(o.op).toBe('aberturaPorContorno');
    /* a recusa vem antes de mexer na malha: a chapa fica como o passo dela a deixou */
    const so = executarReceita(comTabela(TABELA, passosCom(args).slice(0, 1))).neutro;
    expect(neutro.F.size).toBe(so.F.size);
    return o.motivo as string;
  };
  const mmP = (p: number[]) => p.map(m);

  it('contorno que não fecha', () => {
    expect(recusa({ contorno: { ...d.trechos, trechos: d.trechos.trechos.slice(0, 2) } })).toMatch(/não fecha: o último trecho termina em \[540, 380\] mm, a [\d.]+ mm do início \[220, 430\] mm.*termine o último trecho no início/);
  });

  it('contorno que se cruza', () => {
    const laco = { inicio: mmP([300, 300]), trechos: [{ reto: mmP([500, 500]) }, { reto: mmP([500, 300]) }, { reto: mmP([300, 500]) }, { reto: mmP([300, 300]) }] };
    expect(recusa({ contorno: laco })).toMatch(/se cruza: .*cruza ou toca a aresta.*contorno simples/);
  });

  it('contorno que sai da chapa', () => {
    const fora = { inicio: mmP([700, 400]), trechos: [{ reto: mmP([900, 420]) }, { reto: mmP([720, 500]) }, { reto: mmP([700, 400]) }] };
    expect(recusa({ contorno: fora })).toMatch(/fora da chapa vista do eixo y|cruza a borda da chapa vista do eixo y/);
    const longe = { inicio: mmP([900, 900]), trechos: [{ reto: mmP([950, 900]) }, { reto: mmP([920, 950]) }, { reto: mmP([900, 900]) }] };
    expect(recusa({ contorno: longe })).toMatch(/o ponto \[900, 900\] mm do contorno fica fora da chapa vista do eixo y/);
  });

  it('segmentos abaixo do piso do bico, com o piso na mensagem', () => {
    expect(PISO).toBe(23);
    const motivo = recusa({ segmentosArco: 16 });
    expect(motivo).toMatch(/o bico em \[220, 430\] mm sai com 37\.63 graus contra 40\.38 desenhados .*acima dos 2 graus do gate de forma.*o piso deste contorno é segmentosArco 23/);
    expect(recusa({ segmentosArco: PISO - 1 })).toMatch(/segmentosArco 23/);
    const { neutro } = executarReceita(comTabela(TABELA, passosCom({ segmentosArco: PISO })));
    expect(neutro.orfaos).toEqual([]);
  });

  it('vista, chapa e origemId gritam pelo campo', () => {
    expect(recusa({ vista: 'superior' })).toMatch(/vista precisa ser 'x', 'y' ou 'z'/);
    expect(recusa({ lente: 'sim' })).toMatch(/lente só aceita true/);
  });

  it('o recuo da lente: sem lente, negativo e maior que o vão comporta', () => {
    expect(recusa({ recuoDaLente: 0.005 })).toMatch(/recuoDaLente recua a lente para dentro do vão, e o passo não declarou lente: true/);
    expect(recusa({ lente: true, recuoDaLente: -0.001 })).toMatch(/recuoDaLente é a distância, em metro e zero ou mais/);
    expect(recusa({ lente: true, recuoDaLente: 0.06 })).toMatch(/a lente não cabe no vão: (o recuo de 60 mm fecha o vão inteiro|com o recuo de 60 mm o contorno recuado se cruza).*reduza recuoDaLente/);
    /* o polígono recuado mantém o bico: cada lado anda d para dentro e o canto entra d / sen(meio ângulo) */
    const { poligono } = recuarPoligono(d.poligono, m(5));
    const k = 0; const n = poligono.length;
    const angulo = (P: number[][]) => { const a = P[(k - 1 + n) % n], p = P[k], b = P[(k + 1) % n]; const u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]]; return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI; };
    expect(angulo(poligono)).toBeCloseTo(angulo(d.poligono), 6);
    expect(Math.hypot(poligono[0][0] - d.poligono[0][0], poligono[0][1] - d.poligono[0][1])).toBeCloseTo(m(5) / Math.sin((angulo(d.poligono) * Math.PI) / 360), 9);
  });

  it('o friso sobre a abertura recusa pontos na linha', () => {
    const passos = [...passosCom({}), ['friso', { origemId: 4, superficie: { op: 'aberturaPorContorno', id: 3 }, linha: { nome: 'aba', pontos: ['a', 'b'] }, aba: { largura: 0.008, angulo: 90, raio: 0.001 } }]];
    const { neutro } = executarReceita(comTabela(TABELA, passos));
    expect(neutro.orfaos.map((o: any) => o.motivo)).toEqual([expect.stringMatching(/é a borda de fora do vão inteira, e não leva pontos/)]);
  });
});

describe('a moldura do vão reconhece a abertura por contorno', () => {
  const { neutro } = executarReceita(receita);
  const VAO = { nome: 'vao', superficie: { op: 'aberturaPorContorno', id: 3 }, frisos: ['abaDoVao'] };
  const motivo = 'a abertura de prova fica sem aba nesta conferência, para medir a declaração';

  it('o vão declarado com a aba tem a borda de fora inteira coberta', () => {
    const r = conferirVaosDaPeca(neutro, receita);
    expect(r.problemas).toEqual([]);
    const [v] = r.vaos;
    expect(v.amostras).toBeGreaterThan(700);
    expect(v.cobertas).toBe(v.amostras);
    expect(r.aberturas).toMatchObject([{ chapa: 'aberturaPorContorno:3', vao: 'vao' }]);
    expect(formatarVaos(r)).toMatch(/1 vão\(s\) declarado\(s\); 1 abertura\(s\) nas chapas, todas declaradas/);
    console.log(JSON.stringify({ moldura: { comprimentoMm: v.comprimento * 1000, amostras: v.amostras, cobertas: v.cobertas, descobertos: v.descobertos.length, emendas: v.emendas.length } }));
  });

  it('a abertura sem declaração reprova com a origem dela', () => {
    expect(conferirVaosDaPeca(neutro, {}).problemas).toEqual([expect.stringMatching(/a abertura aberturaPorContorno:3 não tem declaração em `vaos`: a borda de fora do vão, de \d+ pontos e 802,2 mm.*superficie: \{ op: 'aberturaPorContorno', id: 3 \}/)]);
  });

  it('sem moldura: passa sem aba e reprova quando a aba cobre a borda', () => {
    const semAba = executarReceita(comTabela({ ...TABELA, aba: null })).neutro;
    expect(conferirVaosDaPeca(semAba, { vaos: [{ nome: 'vao', superficie: VAO.superficie, semMoldura: { motivo } }] }).problemas).toEqual([]);
    expect(conferirVaosDaPeca(neutro, { vaos: [{ nome: 'vao', superficie: VAO.superficie, semMoldura: { motivo } }] }).problemas).toEqual([expect.stringMatching(/declarado sem moldura .* 100,0% da borda fica sob a faixa de um friso que segue a abertura \('abaDoVao'\)/)]);
  });

  it('a declaração errada diz o que fazer', () => {
    expect(() => conferirVaosDaPeca(neutro, { vaos: [{ ...VAO, borda: ['p1_1', 'p1_2', 'p2_2'] }] })).toThrow(/a borda de uma abertura por contorno é a volta de fora do vão que o passo registra.*tire 'borda'/);
    expect(() => conferirVaosDaPeca(neutro, { vaos: [{ ...VAO, superficie: { op: 'aberturaPorContorno', id: 9 } }] })).toThrow(/aberturaPorContorno:9, que não é abertura da peça.*Aberturas: aberturaPorContorno:3/);
    expect(() => conferirVaosDaPeca(neutro, { vaos: [{ nome: 'vao', borda: ['p1_1', 'p1_2', 'p2_2', 'p1_1'], frisos: ['abaDoVao'] }] })).toThrow(/não segue uma chapa \(superficie\), e sim a borda de uma abertura por contorno/);
    expect(() => conferirVaosDaPeca(neutro, { vaos: [VAO, { ...VAO, nome: 'outro' }] })).toThrow(/a abertura aberturaPorContorno:3 já é o vão 'vao'/);
  });
});

describe('aberturaPorContorno nas vistas x e z', () => {
  /* a mesma chapa e o mesmo contorno, girados para que o eixo da vista seja x ou z: na 'x' o ponto vai a (y, z, x), na 'z' a
     (x, z, y), que é um espelho e por isso inverte o sentido das faces da gaiola; a medida volta ao quadro da vista 'y' */
  const GIROS = {
    x: { ida: (p: number[]) => [p[1], p[2], p[0]], volta: (p: number[]) => [p[2], p[0], p[1]], espelho: false },
    z: { ida: (p: number[]) => [p[0], p[2], p[1]], volta: (p: number[]) => [p[0], p[2], p[1]], espelho: true },
  } as const;
  for (const [vista, giro] of Object.entries(GIROS)) {
    it(`vista '${vista}': gate 1 e borda no desenho`, () => {
      const d = derivar();
      const chapa = passoDaChapa();
      const faces = giro.espelho ? chapa.faces.map((f: string[]) => [...f].reverse()) : chapa.faces;
      const TOPO = Object.fromEntries(Object.entries(d.pontos).map(([k, p]) => [k, giro.ida(p as number[])]));
      const passos = [['subdivisao', { origemId: 1, ...chapa, faces }], ['aberturaPorContorno', { origemId: 3, chapa: { origem: { op: 'subdivisao', id: 1 } }, vista, segmentosArco: 32, contorno: d.trechos, lente: true }], ['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 3 } } }], ['parte', { nome: 'lente', sel: { origem: { op: 'aberturaPorContorno', id: 3, parte: 'lente' } } }]];
      const { neutro } = executarReceita({ meta: { nome: `abertura-${vista}` }, PARAMS: {}, TOPO, PASSOS: passos });
      expect(neutro.orfaos).toEqual([]);
      expect(gate1(neutro)).toMatchObject({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0, faceFina: 0, reprova: [] });
      const V = new Map([...neutro.V].map(([k, p]: any) => [k, giro.volta(p)]));
      const F = new Map([...neutro.F].map(([k, f]: any) => [k, { ...f, vs: giro.espelho ? [...f.vs].reverse() : f.vs }]));
      const r = medir(TABELA, { ...neutro, V, F, orfaos: [] }) as any;
      expect(r.gate2.desvio.fora.daBordaAoDesenhoMm).toBeLessThan(0.5);
      expect(r.gate2.desvio.dentro.daBordaAoDesenhoMm).toBeLessThan(0.5);
      expect(r.gate2.desvio.fora.daBordaASuperficieMm).toBeLessThan(1e-3);
      expect(r.gate2.bico.diferenca).toBeLessThan(2);
    });
  }
});

describe('aberturaPorContorno numa chapa que a reta do eixo atravessa duas vezes', () => {
  /* duas chapas iguais, uma 300 mm abaixo da outra, como a frente e a traseira de uma carroceria fechada vistas pela frente: a
     reta do eixo y atravessa as duas. Sem `sentido` a operação recusa; com ele, corta só a camada vista daquele lado e a outra
     fica como estava, vértice por vértice. No furgão, em 2026-11-05, o farol recusou por isto, e a peça de teste do plano da
     abertura, uma chapa só, não tinha como mostrar. */
  const d = derivar();
  const chapa = passoDaChapa();
  const ren = (n: string) => n.replace(/^p/, 'q');
  const baixa = { ...chapa, vertices: chapa.vertices.map(ren), faces: chapa.faces.map((f: string[]) => f.map(ren)), cantos: chapa.cantos.map(ren), medidas: chapa.medidas.map(ren) };
  const TOPO = { ...d.pontos, ...Object.fromEntries(Object.entries(d.pontos).map(([k, p]) => [ren(k), [(p as number[])[0], (p as number[])[1] - m(300), (p as number[])[2]]])) };
  const rodar = (abertura: any) => executarReceita({ meta: { nome: 'abertura-em-duas-camadas' }, PARAMS: {}, TOPO, PASSOS: [
    ['subdivisao', { origemId: 1, ...chapa }], ['subdivisao', { origemId: 2, ...baixa }],
    ...(abertura ? [['aberturaPorContorno', { origemId: 3, chapa: { tudo: true }, vista: 'y', segmentosArco: 32, contorno: d.trechos, lente: true, ...abertura }]] : []),
  ] }).neutro;
  const meio = (TABELA.chapa.topo - 150) / 1000;
  const facesDe = (neutro: any, acima: boolean) => [...neutro.F.values()].filter((f: any) => f.vs.every((v: number) => (neutro.V.get(v)[1] > meio) === acima))
    .map((f: any) => f.vs.map((v: number) => neutro.V.get(v).map((x: number) => x.toFixed(9)).join(',')).join(';')).sort();
  const antes = rodar(null);

  it('sem sentido, recusa e diz que sentido corta uma camada só', () => {
    const neutro = rodar({});
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0].motivo).toMatch(/atravessa a chapa 2 vezes.*declare sentido/);
  });

  for (const [sentido, cortada] of [['+', true], ['-', false]] as const) {
    it(`sentido '${sentido}': corta só a chapa ${cortada ? 'de cima' : 'de baixo'}, fechada e sem lasca, e a outra fica igual`, () => {
      const neutro = rodar({ sentido });
      expect(neutro.orfaos).toEqual([]);
      expect(gate1(neutro)).toMatchObject({ arestasSemPar: 0, vinculosNaoManifold: 0, triangulosSemArea: 0, faceFina: 0, reprova: [] });
      expect(facesDe(neutro, !cortada)).toEqual(facesDe(antes, !cortada));
      expect(facesDe(neutro, cortada)).not.toEqual(facesDe(antes, cortada));
    });
  }

  it('sentido fora de + e - grita pelo campo', () => {
    const neutro = rodar({ sentido: 'frente' });
    expect(neutro.orfaos[0].ref).toBe('sentido');
  });
});
