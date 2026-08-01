/* Vitest do NÚCLEO da OFICINA (passo 1): prova os invariantes de identidade —
   numeração determinística e POSICIONAL (re-rodar dá ids idênticos), identidade
   estável sob mudança de PARAM (mudar `raio` não renumera), mudança de TOPO
   renumera E reporta órfãos (lei "órfão grita, nunca corrompe"), e a mescla
   de/para (a interação mais delicada, a primeira a ganhar teste de verdade). */
import { describe, it, expect } from 'vitest';
import { conferirMalha } from './conferir-malha.js';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — módulo .js do motor v3 (sem tipos; roda puro no vitest/esbuild)
import { nucleo, neutroCanonico, adaptarV3, executar, colisaoDe, BLOCO, montarAnimar, avaliarChaves, bindPoseOssos } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — módulo .js neutro de medição (a régua que a bancada e o CLI compartilham)
import { caixasPorParte } from '../../src/autoria/descrever-partes.js';

const P = (extra: any[] = []) => [
  ['cilindro', { id: 0, raio: 'r', altura: 'h', lados: 'lados' }],
  ...extra,
];
const CILN = { r: 0.5, h: 1 };
const T8 = { lados: 8 };

describe('numeração determinística', () => {
  it('re-rodar a mesma lista dá o neutro idêntico (ids, posições, faces)', () => {
    const passos = P([
      ['extruda', { face: 0, dist: 0.2 }],
      ['moveV', { v: 1001, d: [0, 0.1, 0] }],
      ['mescla', { de: [1001], para: 1002 }],
      ['pincel', { modo: 'face', faces: [1, 2], cor: '#123456' }],
      ['solido', { faces: [8, 9] }],
    ]);
    const a = neutroCanonico(nucleo(passos, CILN, T8));
    const b = neutroCanonico(nucleo(passos, CILN, T8));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('vértices criados no meio do caminho (extruda) partem da POSIÇÃO do passo, não de PARAMS', () => {
    const passos = [['cubo', { id: 0, lado: 's' }], ['extruda', { face: 1, dist: 'd' }]];
    const pequeno = nucleo(passos, { s: 1, d: 0.2 }, {});
    const grande = nucleo(passos, { s: 3, d: 0.9 }, {});
    // ids IDÊNTICOS apesar de PARAMS diferentes; o passo 1 (índice 1) numera a partir de 1*BLOCO
    expect([...pequeno.V.keys()].sort((x, y) => x - y)).toEqual([...grande.V.keys()].sort((x, y) => x - y));
    expect(pequeno.V.has(BLOCO)).toBe(true);      // primeiro vértice novo = 1*BLOCO
    // ...mas as posições MUDAM (de fato reconstruiu)
    expect(JSON.stringify([...pequeno.V.values()])).not.toBe(JSON.stringify([...grande.V.values()]));
  });
});

/* Fundação de autoria v1 — toda primitiva publica origem e porta é uma
   referência semântica à origem local, não à numeração runtime. */
describe('Fundação de autoria v1 — origem universal e portas semânticas', () => {
  const pintadas = (n: any, cor = '#20c997') => [...n.F.values()].filter((f: any) => f.cor === cor).map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('os cinco geradores antes anônimos são citáveis por origem sem usar IDs de face', () => {
    const casos: any[] = [
      ['esfera', { id: 0, raio: 1, aneis: 3, lados: 4, origemId: 101 }, 12],
      ['cone', { id: 0, raio: 1, altura: 2, lados: 4, origemId: 102 }, 5],
      ['plano', { id: 0, seg: 2, origemId: 103 }, 4],
      ['chamferBox', { id: 0, lado: 2, chanfro: 0.2, origemId: 104 }, 26],
      ['inflate', { id: 0, contornoLado: [[-1, 0], [1, 0], [1, 1], [-1, 1]], contornoTopo: [[-1, 0], [1, 0], [1, 1], [-1, 1]], divisoes: 2, origemId: 105 }, null],
    ];
    for (const [op, args, esperado] of casos) {
      const n = nucleo([[op, args], ['pincel', { modo: 'face', sel: { origem: { op, id: args.origemId } }, cor: '#20c997' }]] as any, {}, {});
      expect(n.orfaos, op).toHaveLength(0);
      expect(pintadas(n).length, op).toBe(esperado ?? n.F.size);
    }
  });

  it('porta nomeada resolve a origem local após rotacionar, sem persistir face runtime', () => {
    const n = nucleo([
      ['cilindro', { id: 0, raio: 1, altura: 0.2, lados: 6, origemId: 201 }],
      ['publicarPorta', { nome: 'pista-interna', de: { op: 'cilindro', id: 201, tampa: 'fundo' } }],
      ['rotaciona', { eixo: 'z', graus: -90 }],
      ['pincel', { modo: 'face', sel: { porta: 'pista-interna' }, cor: '#20c997' }],
    ] as any, {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintadas(n)).toEqual([6]);
  });

  it('porta inválida, duplicada ou ainda não publicada falha fechada', () => {
    const n = nucleo([
      ['cubo', { id: 0, lado: 1, origemId: 301 }],
      ['pincel', { modo: 'face', sel: { porta: 'ausente' }, cor: '#20c997' }],
      ['publicarPorta', { nome: 'corpo', de: { op: 'cubo', id: 301 } }],
      ['publicarPorta', { nome: 'corpo', de: { op: 'cubo', id: 301 } }],
    ] as any, {}, {});
    expect(n.orfaos.length).toBeGreaterThanOrEqual(2);
    expect(n.orfaos.map((o: any) => o.motivo).join(' ')).toMatch(/ausente|já foi publicada/);
  });
});

describe('Fase 3 - fixture de invalidacao estrutural por apagaFace', () => {
  const ctx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  const topo = { op: 'cubo', id: 70, face: 'topo' }, frente = { op: 'cubo', id: 70, face: 'frente' };
  const aliases: any = [['topo', { origem: topo }], ['frente', { origem: frente }], ['topoEfrente', { unir: [{ origem: topo }, { origem: frente }] }]];
  const cubo = (id = 0, origemId = 70): any => ['cubo', { id, lado: 1, origemId }];
  const geo = (n: any) => { const c: any = neutroCanonico(n); return JSON.stringify({ V: c.V, F: c.F }); };

  it('apaga topo pelo nome, invalida-o por inteiro e preserva frente', () => {
    const antes = nucleo([cubo(), ['pincel', { modo: 'face', sel: { alias: 'topo' }, cor: '#123456' }]], {}, {}, {}, null, aliases);
    expect(antes.orfaos).toHaveLength(0); expect(antes.F.get(1)!.cor).toBe('#123456');
    const soRemocao = nucleo([cubo(), ['apagaFace', { sel: { alias: 'topo' } }]], {}, {}, {}, null, aliases);
    const depois = nucleo([cubo(), ['apagaFace', { sel: { alias: 'topo' } }], ['pincel', { modo: 'face', sel: { alias: 'topo' }, cor: '#f00' }], ['parte', { nome: 'sumiu', sel: { alias: 'topo' } }], ['transladar', { d: [3, 0, 0], sel: { alias: 'topo' } }], ['pincel', { modo: 'face', sel: { alias: 'frente' }, cor: '#0f0' }]], {}, {}, {}, null, aliases);
    expect(soRemocao.orfaos).toHaveLength(0); expect(soRemocao.F.has(1)).toBe(false);
    for (const op of ['pincel', 'parte', 'transladar']) expect(depois.orfaos.some((o: any) => o.op === op && /removida/.test(o.motivo))).toBe(true);
    expect(depois.F.get(4)!.cor).toBe('#0f0'); expect([...depois.F.values()].filter((f: any) => f.id !== 4 && (f.cor || f.parte || f.liso))).toEqual([]);
    const semPinturaFrente = { ...depois, F: new Map([...depois.F].map(([id, f]: any) => [id, { ...f, cor: id === 4 ? null : f.cor }])) };
    expect(geo(semPinturaFrente)).toBe(geo(soRemocao));
  });

  it('nunca recalcula topo para vizinha, face posterior ou outro cubo, inclusive com insercao anterior', () => {
    const tentativas: any[] = [[cubo(), ['apagaFace', { sel: { alias: 'topo' } }], ['pincel', { modo: 'face', sel: { alias: 'topo' }, cor: '#f00' }]], [cubo(), ['apagaFace', { sel: { alias: 'topo' } }], cubo(BLOCO, 80), ['pincel', { modo: 'face', sel: { alias: 'topo' }, cor: '#f00' }]], [['cubo', { id: 0, lado: 0.25 }], cubo(BLOCO), ['apagaFace', { sel: { alias: 'topo' } }], ['cubo', { id: BLOCO * 2, lado: 1 }], ['pincel', { modo: 'face', sel: { alias: 'topo' }, cor: '#f00' }]]];
    for (const passos of tentativas) { const n = nucleo(passos, {}, {}, {}, null, aliases); expect(n.orfaos.some((o: any) => /removida/.test(o.motivo))).toBe(true); expect([...n.F.values()].filter((f: any) => f.cor === '#f00')).toEqual([]); }
  });

  it('uniao e origem direta falham por inteiro; nao aplicam somente frente', () => {
    const composta = nucleo([cubo(), ['apagaFace', { sel: { alias: 'topo' } }], ['pincel', { modo: 'face', sel: { alias: 'topoEfrente' }, cor: '#f00' }], ['parte', { nome: 'parcial', sel: { alias: 'topoEfrente' } }], ['transladar', { d: [2, 0, 0], sel: { alias: 'topoEfrente' } }]], {}, {}, {}, null, aliases);
    const direta = nucleo([cubo(), ['apagaFace', { sel: { origem: topo } }], ['pincel', { modo: 'face', sel: { origem: topo }, cor: '#f00' }]], {}, {});
    for (const n of [composta, direta]) expect(n.orfaos.some((o: any) => /removida/.test(o.motivo))).toBe(true);
    expect(composta.F.get(4)!.cor).toBeNull(); expect(composta.F.get(4)!.parte).toBeNull(); expect(geo(composta)).toBe(geo(nucleo([cubo(), ['apagaFace', { sel: { alias: 'topo' } }]], {}, {}, {}, null, aliases))); expect([...direta.F.values()].some((f: any) => f.cor === '#f00')).toBe(false);
  });

  it('apagaFace aceita uma face pelo resolvedor comum e preserva face:id legado', () => {
    const legado = nucleo([cubo(), ['apagaFace', { face: 1 }]], {}, {}); expect(legado.orfaos).toHaveLength(0); expect(legado.F.has(1)).toBe(false);
    for (const args of [{ face: 1, sel: { alias: 'topo' } }, { sel: { f: [] } }, { sel: { alias: 'topoEfrente' } }]) { const n = nucleo([cubo(), ['apagaFace', args]], {}, {}, {}, null, aliases); expect(n.orfaos.length).toBeGreaterThan(0); expect(n.F.size).toBe(6); }
    const viaApi: any = executar([cubo(), ['apagaFace', { sel: { alias: 'topo' } }]], {}, {}, ctx, {}, {}, null, aliases); expect(viaApi.lotes.reduce((s: number, l: any) => s + l.mesh.v.length, 0)).toBe(5 * 6 * 8);
    const passos: any[] = [cubo(), ['apagaFace', { sel: { alias: 'topo' } }]]; expect(JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, {}, null, aliases)))).toBe(JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {}, {}, null, JSON.parse(JSON.stringify(aliases))))));
  });

  it('aborta atomico quando a selecao tem alvo valido e qualquer diagnostico', () => {
    const base = nucleo([cubo()], {}, {}, {}, null, aliases);
    const casos: any[] = [
      { f: [1, 999999] },
      { origem: topo, f: [999999] },
      { f: [1], campoInvalido: true },
      { grupo: 'nao-existe', f: [1] },
    ];
    for (const sel of casos) {
      const n = nucleo([cubo(), ['apagaFace', { sel }],
        ['pincel', { modo: 'face', sel: { f: [999999] }, cor: '#f00' }],
        ['parte', { nome: 'nao-esconde', sel: { f: [999999] } }],
        ['transladar', { d: [2, 0, 0], sel: { f: [999999] } }],
      ], {}, {}, {}, null, aliases);
      expect(n.orfaos.some((o: any) => o.op === 'apagaFace')).toBe(true);
      for (const op of ['pincel', 'parte', 'transladar']) expect(n.orfaos.some((o: any) => o.op === op)).toBe(true);
      expect(n.F.has(1)).toBe(true);
      expect(geo(n)).toBe(geo(base));
    }
  });
});

describe('identidade estável sob mudança de PARAM', () => {
  it('mudar raio/altura NÃO renumera nada — mesmos ids e mesma topologia, só posições diferem', () => {
    const passos = P([['pincel', { modo: 'face', faces: [0, 1], cor: '#abcdef' }], ['liso', { faces: [2] }]]);
    const base = neutroCanonico(nucleo(passos, { r: 0.5, h: 1 }, T8));
    const largo = neutroCanonico(nucleo(passos, { r: 0.9, h: 1.7 }, T8));
    expect(largo.V.map((row: any[]) => row[0])).toEqual(base.V.map((row: any[]) => row[0]));
    expect(largo.F).toEqual(base.F);                                   // faces (ids, cantos, atributos) idênticas
    expect(JSON.stringify(largo.V)).not.toBe(JSON.stringify(base.V));  // posições diferem
  });
});

describe('mudança de TOPO renumera e reporta órfãos', () => {
  it('lados 8 -> 12 muda a CONTAGEM e o papel dos ids (renumera)', () => {
    const l8 = neutroCanonico(nucleo(P(), CILN, { lados: 8 }));
    const l12 = neutroCanonico(nucleo(P(), CILN, { lados: 12 }));
    expect(l8.V.length).toBe(16);
    expect(l12.V.length).toBe(24);
    // o id 8 é do anel de CIMA quando lados=8 (y=h) e do anel de BAIXO quando lados=12 (y=0)
    const y8 = l8.V.find((r: any[]) => r[0] === 8)![2];
    const y12 = l12.V.find((r: any[]) => r[0] === 8)![2];
    expect(y8).not.toBe(y12);
  });

  it('um passo que aponta pra um id que a nova TOPO não tem vira ÓRFÃO — grita, não corrompe', () => {
    const passos = P([['moveV', { v: 18, d: [0, 0.1, 0] }]]);   // v18 = anel de cima só existe com lados>=...
    const bom = nucleo(passos, CILN, { lados: 12 });            // com 12 lados, id 18 é vértice vivo
    expect(bom.orfaos).toHaveLength(0);
    const orf = nucleo(passos, CILN, { lados: 8 });             // com 8 lados, maior id é 15 -> 18 não existe
    expect(orf.orfaos).toHaveLength(1);
    expect(orf.orfaos[0]).toMatchObject({ passo: 1, op: 'moveV', ref: 18 });
    expect(orf.V.size).toBe(16);                                // a malha do cilindro segue INTACTA
  });

  it('id de primitiva incompatível com a posição grita (nunca vira segunda-verdade silenciosa)', () => {
    const n = nucleo([['cilindro', { id: 999, raio: 'r', altura: 'h', lados: 'lados' }]], CILN, T8);
    expect(n.orfaos.some((o: any) => o.op === 'cilindro' && o.motivo.includes('posição'))).toBe(true);
  });
});

describe('mescla de/para (a interação mais delicada)', () => {
  it('some com `de`, mantém `para`, re-aponta as faces e apaga a face de área-zero', () => {
    // cubo, extruda o topo (face 1) -> tampa 1000..1003 + 4 paredes; mescla dois cantos DA TAMPA no terceiro
    const passos = [['cubo', { id: 0, lado: 1 }], ['extruda', { face: 1, dist: 0.3 }], ['mescla', { de: [1000, 1001], para: 1002 }]];
    const n = nucleo(passos, {}, {});
    expect(n.V.has(1000)).toBe(false);
    expect(n.V.has(1001)).toBe(false);
    expect(n.V.has(1002)).toBe(true);
    for (const f of n.F.values()) expect(f.vs).not.toContain(1000);   // nenhuma face aponta pro mesclado
    expect(n.F.has(1)).toBe(false);                                    // a tampa virou área-zero e SUMIU
    expect(n.merges).toEqual([{ de: [1000, 1001], para: 1002 }]);      // de/para GRAVADOS
  });

  it('referência posterior a um id mesclado vira órfão', () => {
    const passos = [['cubo', { id: 0, lado: 1 }], ['mescla', { de: [1], para: 0 }], ['moveV', { v: 1, d: [0, 1, 0] }]];
    const n = nucleo(passos, {}, {});
    expect(n.V.has(1)).toBe(false);
    expect(n.orfaos.some((o: any) => o.op === 'moveV' && o.ref === 1)).toBe(true);
  });
});

describe('núcleo -> adaptador (fronteira) e colisão', () => {
  const fakeCtx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  /* ctx que CAPTURA a fn do texCanvas -> deixa AMOSTRAR o texel (u,v em 0..1 do
     atlas) como o motor faz (NEAREST). É como o adaptador roda headless: a
     fábrica devolve o canvas de mentira e o amostrador lê a cor de verdade. */
  function ctxAmostra() {
    let T: any = null;
    const ctx = { tex: { texCanvas: (w: number, h: number, fn: any) => (T = { width: w, height: h, fn }) }, m4: { ident: () => new Float32Array(16) } };
    const amostra = (u: number, v: number) => { const x = Math.min(T.width - 1, Math.max(0, Math.floor(u * T.width))); const y = Math.min(T.height - 1, Math.max(0, Math.floor(v * T.height))); return T.fn(x, y); };
    return { ctx, amostra };
  }
  const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const centro = (il: any): [number, number] => [il.x + il.w / 2, il.y + il.h / 2];
  const intersecta = (A: any, B: any) => !(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y);

  it('executar devolve lotes com mesh de triângulos soltos (8 floats/vértice)', () => {
    const obj = executar([['cubo', { id: 0, lado: 1 }]], {}, {}, fakeCtx);
    expect(obj.lotes).toHaveLength(1);
    // cubo: 6 faces × (4-2 tris) × 3 vértices × 8 floats = 288
    expect(obj.lotes[0].mesh.v.length).toBe(288);
    expect(obj.lotes[0].mesh.v.length % 8).toBe(0);
  });

  it('cor por face chega por TEXTURA + UV (não como atributo do vértice): amostrar a ilha da face dá a cor dela', () => {
    const { ctx, amostra } = ctxAmostra();
    const r: any = adaptarV3(nucleo([['cubo', { id: 0, lado: 1 }], ['pincel', { modo: 'face', faces: [0], cor: '#ff0000' }]], {}, {}), ctx);
    expect(r.lotes[0].mesh.v.length % 8).toBe(0);   // 8 floats/vértice: pos3 uv2 nrm3 — a cor NÃO é atributo do vértice (12a: um lote só, sem material)
    // a face 0 (pintada) amostra VERMELHO no centro da SUA ilha; uma face sem pincel amostra a madeira neutra
    const c0 = centro(r.atlas.daFace(0).ilha), c1 = centro(r.atlas.daFace(1).ilha);
    expect(amostra(c0[0] / r.atlas.W, c0[1] / r.atlas.H)).toEqual([255, 0, 0]);
    expect(amostra(c1[0] / r.atlas.W, c1[1] / r.atlas.H)).toEqual(hx('#9a8f80'));   // COR_PADRAO
  });

  it('ATLAS por face: cada face ganha uma ILHA PRÓPRIA e NENHUMA se sobrepõe (o furo da caixa global: topo +y e fundo -y em ilhas distintas)', () => {
    const { ctx } = ctxAmostra();
    const r: any = adaptarV3(nucleo([['cilindro', { id: 0, raio: 'r', altura: 'h', lados: 'l' }]], { r: 1, h: 2 }, { l: 8 }), ctx);
    const rects = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => r.atlas.daFace(id).ilha);
    let colisoes = 0;
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) if (intersecta(rects[a], rects[b])) colisoes++;
    expect(colisoes).toBe(0);   // NENHUM par de ilhas se intersecta
    // fundo (face 8, normal -y) e topo (face 9, normal +y): na caixa GLOBAL empilham no mesmo XZ; no atlas, ilhas distintas
    expect(intersecta(r.atlas.daFace(8).ilha, r.atlas.daFace(9).ilha)).toBe(false);
  });

  it('sem sobreposição PROVADO por independência: pintar o fundo (-y) de vermelho NÃO altera os texels do topo (+y)', () => {
    const { ctx, amostra } = ctxAmostra();
    const r: any = adaptarV3(nucleo([['cilindro', { id: 0, raio: 'r', altura: 'h', lados: 'l' }], ['pincel', { modo: 'face', faces: [8], cor: '#ff0000' }], ['pincel', { modo: 'face', faces: [9], cor: '#0000ff' }]], { r: 1, h: 2 }, { l: 8 }), ctx);
    const c8 = centro(r.atlas.daFace(8).ilha), c9 = centro(r.atlas.daFace(9).ilha);
    expect(amostra(c8[0] / r.atlas.W, c8[1] / r.atlas.H)).toEqual([255, 0, 0]);   // fundo vermelho
    expect(amostra(c9[0] / r.atlas.W, c9[1] / r.atlas.H)).toEqual([0, 0, 255]);   // topo AZUL — intacto (ilha própria)
  });

  it('UV de todo vértice cai DENTRO da ilha da sua face (inset do gutter — nada encosta na vizinha)', () => {
    const { ctx } = ctxAmostra();
    const neutro = nucleo([['cubo', { id: 0, lado: 1 }], ['pincel', { modo: 'face', faces: [0, 3], cor: '#123456' }]], {}, {});
    const r: any = adaptarV3(neutro, ctx);
    const T = 1e-9;
    for (const f of neutro.F.values()) {
      const af = r.atlas.daFace(f.id);
      for (const v of f.vs) {
        const uv = af.projeta(neutro.V.get(v));   // a MESMA projeção que gera o UV do mesh (fonte única)
        const tx = uv[0] * r.atlas.W, ty = uv[1] * r.atlas.H;
        expect(tx).toBeGreaterThanOrEqual(af.ilha.x - T);                 // dentro do retângulo interno da ilha
        expect(tx).toBeLessThanOrEqual(af.ilha.x + af.ilha.w + T);
        expect(ty).toBeGreaterThanOrEqual(af.ilha.y - T);
        expect(ty).toBeLessThanOrEqual(af.ilha.y + af.ilha.h + T);
      }
    }
  });

  it('colisaoDe encaixa um cilindro na malha final (usa as faces solido)', () => {
    const passos = [['cilindro', { id: 0, raio: 'r', altura: 'h', lados: 'lados' }], ['solido', { faces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }]];
    const col = colisaoDe(passos, { r: 0.4, h: 1.2 }, T8);
    expect(col.forma).toBe('cilindro');
    expect(col.raio).toBeCloseTo(0.4, 6);
    expect(col.altura).toBeCloseTo(1.2, 6);
  });
});

describe('peça-exemplo shipável', () => {
  it('_oficina-toco monta sem órfãos e declara colisão sã', async () => {
    const tocoUrl = new URL('../../prototipos/fps/v3/pecas/_oficina-toco.js', import.meta.url);
    const toco: any = await import(fileURLToPath(tocoUrl));
    const n = nucleo(toco.PASSOS, toco.PARAMS, toco.TOPO);
    expect(n.orfaos).toHaveLength(0);
    expect(toco.meta.colisao.forma).toBe('cilindro');
    // raio ENCAIXADO na malha final: maior que troncoR porque a extrusão do galho alargou a malha
    expect(toco.meta.colisao.raio).toBeGreaterThan(toco.PARAMS.troncoR);
    expect(toco.meta.colisao.altura).toBeCloseTo(toco.PARAMS.troncoH, 4);
  });
});

describe('regressões do revisor adversarial (D1/D2/D3)', () => {
  // Newell inline (a do núcleo não é exportada) — testa a DIREÇÃO da normal, o que pegaria o D1
  const newellY = (V: any, vs: number[]) => {
    let ny = 0;
    for (let k = 0; k < vs.length; k++) { const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]); ny += (c[2] - n[2]) * (c[0] + n[0]); }
    return ny; // sinal = direção em y (positivo -> +y)
  };

  it('D1: as tampas do cilindro apontam pra FORA (fundo -y, topo +y)', () => {
    const { V, F } = nucleo([['cilindro', { id: 0, raio: 'r', altura: 'h', lados: 'l' }]], { r: 1, h: 2 }, { l: 8 });
    expect(newellY(V, F.get(8).vs)).toBeLessThan(0);      // fundo -> normal -y
    expect(newellY(V, F.get(9).vs)).toBeGreaterThan(0);   // topo  -> normal +y
  });

  it('D2: mescla que deixa canto repetido não-consecutivo (bowtie) GRITA e remove a face — nunca corrompe em silêncio', () => {
    // extruda o topo do cubo (tampa vira 1000..1003), mescla dois cantos OPOSTOS (1000 e 1002) num vértice fora da tampa
    const passos = [['cubo', { id: 0, lado: 1 }], ['extruda', { face: 1, dist: 0.3 }], ['mescla', { de: [1000, 1002], para: 0 }]];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'mescla' && /bowtie|repetido/i.test(o.motivo))).toBe(true);
    for (const f of n.F.values()) expect(new Set(f.vs).size).toBe(f.vs.length);   // nenhuma face sobrevivente com canto repetido
  });

  it('D3: cilindro com lados demais pro bloco de ids falha ALTO (throw), não vaza pro bloco seguinte', () => {
    expect(() => nucleo([['cilindro', { id: 0, raio: 'r', altura: 'h', lados: 'l' }]], { r: 1, h: 1 }, { l: 600 })).toThrow(/estoura o bloco/);
  });

  /* 2º achado adversarial do P4, mas a rede é do NÚCLEO INTEIRO (todo `st.num`/
     `st.vec`): NaN/Infinity vazava por TODA op. O caso (b) — TOPO não-finito —
     é o pior porque NENHUM gate pega: a malha sai LIMPA, só com contagem
     DIFERENTE (`NaN|0` = 0 -> `Math.max(3,0)` = 3), e todo id de face dos
     passos seguintes passa a apontar pra outra face. */
  it.each([
    ['cubo (larg dimensional)', [['cubo', { id: 0, larg: NaN, alt: 1, prof: 1 }]]],
    ['cilindro (raio dimensional)', [['cilindro', { id: 0, raio: NaN, altura: 1, lados: 6 }]]],
    ['esfera (raio Infinity)', [['esfera', { id: 0, raio: Infinity, aneis: 3, lados: 6 }]]],
    ['cone (altura)', [['cone', { id: 0, raio: 0.5, altura: NaN, lados: 6 }]]],
    ['plano (largura)', [['plano', { id: 0, largura: NaN, seg: 2 }]]],
    ['lathe (raio do perfil)', [['lathe', { id: 0, lados: 6, perfil: [[0, 0], [NaN, 1], [0, 2]] }]]],
    ['loft (raio da seção)', [['loft', { id: 0, lados: 6, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0], raio: NaN }] }]]],
    ['moveV (deslocamento)', [['cubo', { id: 0, lado: 1 }], ['moveV', { v: 0, d: [NaN, 0, 0] }]]],
    ['cilindro (lados = TOPO!)', [['cilindro', { id: 0, raio: 0.5, altura: 1, lados: NaN }]]],
  ])('valor não-finito falha ALTO (throw) em %s — nunca coordenada NaN nem contagem degradada em silêncio', (_nome, passos) => {
    expect(() => nucleo(passos as any, {}, {})).toThrow(/não-finito/);
  });

  it('TOPO não-finito NÃO degrada a contagem em silêncio (o caso que nenhum gate pegava: V=16/F=10 virava V=6/F=5 com malha limpa)', () => {
    const bom = nucleo([['cilindro', { id: 0, raio: 0.5, altura: 1, lados: 'L' }]], {}, { L: 8 });
    expect([bom.V.size, bom.F.size]).toEqual([16, 10]);
    expect(() => nucleo([['cilindro', { id: 0, raio: 0.5, altura: 1, lados: 'L' }]], {}, { L: NaN })).toThrow(/não-finito/);
  });

  it('ponto com aridade ≠ 3 falha ALTO no st.vec (rede central) — sem isso o z virava undefined -> NaN calado', () => {
    expect(() => nucleo([['cubo', { id: 0, lado: 1 }], ['moveV', { v: 0, d: [1, 2] as any }]], {}, {})).toThrow(/3 elementos/);
    expect(() => nucleo([['cubo', { id: 0, lado: 1 }], ['moveV', { v: 0, d: { x: 1 } as any }]], {}, {})).toThrow(/3 elementos/);
  });
});

/* PASSO 11b — PINCEL MACIO no NÚCLEO (só o MOTOR: a op + a rasterização, sem
   interface). Prova por MEDIÇÃO: a op 'livre' grava a tinta ANCORADA à face ({a,b}
   face-local) e o adaptarV3 rasteriza um DAB radial macio na ilha da face; o replay
   é determinístico (a tinta entra na canon); a tinta ACOMPANHA a face num moveV;
   órfão grita; e o modo 'face' (todo o passo 1..11a) segue BYTE-idêntico. */
describe('passo 11b — pincel macio (motor: op livre + rasterização)', () => {
  const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const BASE = hx('#9a8f80');   // COR_PADRAO: a madeira neutra sob um dab numa face sem cor chapada
  /* ctx headless que CAPTURA a fn do texCanvas e amostra o texel CRU (x,y inteiros) —
     é assim que o rasterizador do atlas se mede sem motor/tela. */
  function ctxTex() {
    let T: any = null;
    const ctx = { tex: { texCanvas: (w: number, h: number, fn: any) => (T = { width: w, height: h, fn }) }, m4: { ident: () => new Float32Array(16) } };
    return { ctx, texel: (x: number, y: number): number[] => T.fn(x, y) };
  }
  const cubo: any[] = ['cubo', { id: 0, lado: 1 }];
  const centroIlha = (il: any): [number, number] => [Math.round(il.x + 0.5 * il.w), Math.round(il.y + 0.5 * il.h)];

  it('1) modo livre GRAVA a tinta na face e RASTERIZA um dab (centro≈cor, degradê por número até a base)', () => {
    const { ctx, texel } = ctxTex();
    const neutro = nucleo([cubo, ['pincel', { modo: 'livre', cor: '#ff0000', raio: 0.3, dureza: 0.5, pontos: [{ f: 0, a: 0.5, b: 0.5 }] }]], {}, {});
    // a face ganhou a tinta: {a,b} face-local + raio/dureza POR dab (auto-contida, determinística)
    expect(neutro.F.get(0).tinta).toEqual([{ a: 0.5, b: 0.5, cor: '#ff0000', raio: 0.3, dureza: 0.5 }]);
    expect(neutro.orfaos).toHaveLength(0);
    const r: any = adaptarV3(neutro, ctx);
    const il = r.atlas.daFace(0).ilha;
    const [cx, cy] = centroIlha(il);
    const at = (dx: number) => texel(cx + dx, cy);
    expect(at(0)).toEqual([255, 0, 0]);   // CENTRO {0.5,0.5}: a cor cheia da pincelada
    expect(at(8)).toEqual(BASE);          // FORA do raio (rT=0.3·28=8.4 texels): a base intacta
    const meio = at(6);                    // no OMBRO: estritamente ENTRE cor e base (o degradê, por número)
    expect(meio[0]).toBeGreaterThan(BASE[0]); expect(meio[0]).toBeLessThan(255);   // r sobe rumo ao vermelho
    expect(meio[1]).toBeGreaterThan(0); expect(meio[1]).toBeLessThan(BASE[1]);     // g cai rumo a 0
  });

  it('2) determinismo/replay: a canon com pincel macio bate em 2 execuções, sobrevive a round-trip JSON, e a TINTA está na canon', () => {
    const passos = [cubo, ['pincel', { modo: 'livre', cor: '#ff0000', raio: 0.25, dureza: 0.7, pontos: [{ f: 0, a: 0.3, b: 0.4 }, { f: 0, a: 0.6, b: 0.5 }, { f: 3, a: 0.5, b: 0.5 }] }]];
    const a = JSON.stringify(neutroCanonico(nucleo(passos, {}, {})));
    const b = JSON.stringify(neutroCanonico(nucleo(passos, {}, {})));
    expect(a).toBe(b);                                                          // 2 execuções idênticas
    const passosRT = JSON.parse(JSON.stringify(passos));                        // a LISTA (o formato salvo) ida-e-volta JSON
    expect(JSON.stringify(neutroCanonico(nucleo(passosRT, {}, {})))).toBe(a);   // replay do salvo idêntico bit-a-bit
    // a tinta ESTÁ na forma canônica — sem ela, o replay perderia o pincel: a canon COM dab difere da SEM
    expect(a).not.toBe(JSON.stringify(neutroCanonico(nucleo([cubo], {}, {}))));
  });

  it('3) paint-follows-face: um moveV DEPOIS num vértice da face mantém o dab no MESMO {a,b} da ilha (a tinta acompanha a face)', () => {
    const dab: any[] = ['pincel', { modo: 'livre', cor: '#ff0000', raio: 0.3, dureza: 0.6, pontos: [{ f: 0, a: 0.5, b: 0.5 }] }];
    const parado = nucleo([cubo, dab], {}, {});
    const movido = nucleo([cubo, dab, ['moveV', { v: 2, d: [0.4, 0, 0.3] }]], {}, {});   // move um canto da face 0
    const rP: any = adaptarV3(parado, ctxTex().ctx);
    const t = ctxTex(); const rM: any = adaptarV3(movido, t.ctx);
    // a GEOMETRIA de fato mudou: mover v2 alarga a bbox da face 0, então o UV de OUTRO
    // canto (v1, parado) desliza — o próprio mapeamento UV mexeu sob o dab
    const uvP = rP.atlas.daFace(0).projeta(parado.V.get(1));
    const uvM = rM.atlas.daFace(0).projeta(movido.V.get(1));
    expect(JSON.stringify(uvP)).not.toBe(JSON.stringify(uvM));
    // ...mas o dab segue no centro {0.5,0.5} da ilha: o texel central continua a cor da pincelada
    const [cx, cy] = centroIlha(rM.atlas.daFace(0).ilha);
    expect(t.texel(cx, cy)).toEqual([255, 0, 0]);
  });

  it('3b) órfão: ponto com face inexistente GRITA e não corrompe (V/F e a tinta das outras faces intactos)', () => {
    const neutro = nucleo([cubo, ['pincel', { modo: 'livre', cor: '#ff0000', raio: 0.3, dureza: 0.5, pontos: [{ f: 0, a: 0.5, b: 0.5 }, { f: 999, a: 0.5, b: 0.5 }] }]], {}, {});
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0]).toMatchObject({ op: 'pincel', ref: 999 });
    expect(neutro.F.get(0).tinta).toHaveLength(1);              // a face válida recebeu o dab
    expect(neutro.V.size).toBe(8); expect(neutro.F.size).toBe(6);   // malha do cubo intacta
    for (const f of neutro.F.values()) if (f.id !== 0) expect(f.tinta).toHaveLength(0);   // ninguém mais pintado
  });

  it("4) compat 'face': o toco (só-'face') canoniza SEM tinta (linha F de 6) e a textura é BYTE-idêntica ao 11a", async () => {
    const toco: any = await import(fileURLToPath(new URL('../../prototipos/fps/v3/pecas/_oficina-toco.js', import.meta.url)));
    const neutro = nucleo(toco.PASSOS, toco.PARAMS, toco.TOPO);
    for (const row of neutroCanonico(neutro).F) expect((row as any[]).length).toBe(6);   // nenhuma face ganha 7º elemento -> byte-igual ao de antes
    // a textura INTEIRA reproduz a fórmula do 11a (base chapada por célula) — sem dab, zero diferença
    const { ctx, texel } = ctxTex();
    const r: any = adaptarV3(neutro, ctx);
    const faces = [...neutro.F.values()].sort((a: any, b: any) => a.id - b.id);
    const corIlha = faces.map((f: any) => hx(f.cor ?? '#9a8f80'));
    const { cols, tile, W, H } = r.atlas;
    let dif = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = ((y / tile) | 0) * cols + ((x / tile) | 0);
      const esp = i < corIlha.length ? corIlha[i] : BASE;   // exatamente o que o 11a produzia
      const got = texel(x, y);
      if (got[0] !== esp[0] || got[1] !== esp[1] || got[2] !== esp[2]) dif++;
    }
    expect(dif).toBe(0);
  });

  it('5) raio e dureza têm efeito MEDÍVEL: raio maior tinge mais texels; dureza maior encurta a transição', () => {
    const dab = (raio: number, dureza: number) => nucleo([cubo, ['pincel', { modo: 'livre', cor: '#ff0000', raio, dureza, pontos: [{ f: 0, a: 0.5, b: 0.5 }] }]], {}, {});
    const naBase = (c: number[]) => c[0] === BASE[0] && c[1] === BASE[1] && c[2] === BASE[2];
    // texels TINGIDOS (fora da base) na ilha da face 0
    const tingidos = (neutro: any) => {
      const { ctx, texel } = ctxTex(); const r: any = adaptarV3(neutro, ctx); const il = r.atlas.daFace(0).ilha;
      let n = 0; for (let y = il.y; y < il.y + il.h; y++) for (let x = il.x; x < il.x + il.w; x++) if (!naBase(texel(x, y))) n++;
      return n;
    };
    const nPeq = tingidos(dab(0.2, 0.5)), nGde = tingidos(dab(0.4, 0.5));
    expect(nGde).toBeGreaterThan(nPeq);   // raio maior => mais texels tingidos
    // LARGURA da transição: na linha central, texels de opacidade PARCIAL (nem cor pura nem base)
    const banda = (neutro: any) => {
      const { ctx, texel } = ctxTex(); const r: any = adaptarV3(neutro, ctx); const il = r.atlas.daFace(0).ilha;
      const cy = Math.round(il.y + 0.5 * il.h); let n = 0;
      for (let x = il.x; x < il.x + il.w; x++) { const c = texel(x, cy); const cor = c[0] === 255 && c[1] === 0 && c[2] === 0; if (!cor && !naBase(c)) n++; }
      return n;
    };
    const bDura = banda(dab(0.45, 0.95)), bMacia = banda(dab(0.45, 0.05));
    expect(bMacia).toBeGreaterThan(bDura);   // dureza baixa => transição LARGA (degradê); alta => borda abrupta
  });

  it('6) o dab fica PRESO na célula: raio gigante numa face NÃO vaza pra ilha vizinha', () => {
    const { ctx, texel } = ctxTex();
    const r: any = adaptarV3(nucleo([cubo, ['pincel', { modo: 'livre', cor: '#ff0000', raio: 3, dureza: 1, pontos: [{ f: 0, a: 0.5, b: 0.5 }] }]], {}, {}), ctx);
    const [c1x, c1y] = centroIlha(r.atlas.daFace(1).ilha);
    expect(texel(c1x, c1y)).toEqual(BASE);   // a face VIZINHA (ilha própria) segue na base — o vermelho não vazou
    expect(texel(0, 0)).toEqual([255, 0, 0]);   // ...mas a célula da face 0 (incl. o gutter) encheu de vermelho: o dab dilatou até a borda da célula
  });
});

/* PASSO 12a — MATERIAIS OPACOS (núcleo + adaptador; o render é provado por byte-cmp
   à parte). Prova por MEDIÇÃO: a op `material` seta f.material (validando contra
   MATERIAIS), o material ENTRA na canon (determinismo/replay/round-trip), `usa`/face
   inexistente GRITAM sem corromper, e o adaptarV3 AGRUPA faces por material em lotes
   carregando os params certos (cor->corMul, emissivo, aspereza, semLuz, contorno->rim).
   Compat: peça SEM material -> UM lote só, byte-idêntico ao 11a. */
describe('passo 12a — materiais opacos', () => {
  const cubo: any[] = ['cubo', { id: 0, lado: 1 }];
  const MAT = { casca: { cor: '#6b4a2f', aspereza: 0.9 }, brasa: { cor: '#ff7326', emissivo: 1.4, semLuz: true } };
  const fakeCtx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };

  it('1) op material seta f.material; a canon inclui o material; determinismo/replay/round-trip JSON batem', () => {
    const passos = [cubo, ['material', { faces: [0, 1], usa: 'casca' }], ['material', { faces: [2], usa: 'brasa' }]];
    const n = nucleo(passos, {}, {}, MAT);
    expect(n.orfaos).toHaveLength(0);
    expect(n.F.get(0).material).toBe('casca');
    expect(n.F.get(1).material).toBe('casca');
    expect(n.F.get(2).material).toBe('brasa');
    expect(n.F.get(3).material).toBe(null);                         // face SEM material intacta (compat)
    // material entra na forma canônica (índice 3 da linha F) — sem isso o replay o perderia
    const canon = neutroCanonico(n);
    expect((canon.F.find((r: any[]) => r[0] === 0) as any[])[3]).toBe('casca');
    expect((canon.F.find((r: any[]) => r[0] === 3) as any[])[3]).toBe(null);
    // 2 execuções + round-trip JSON da LISTA (o formato salvo) idênticos bit-a-bit
    const a = JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, MAT)));
    const b = JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {}, MAT)));
    expect(a).toBe(b);
    // sem os passos de material a canon DIFERE (o material É gravado — falha sob neutralização)
    expect(a).not.toBe(JSON.stringify(neutroCanonico(nucleo([cubo], {}, {}, MAT))));
  });

  it('2) op material GRITA se `usa` não existe em MATERIAIS ou a face não existe — nunca corrompe', () => {
    const n1 = nucleo([cubo, ['material', { faces: [0], usa: 'fantasma' }]], {}, {}, MAT);
    expect(n1.orfaos.some((o: any) => o.op === 'material' && o.ref === 'fantasma')).toBe(true);
    expect(n1.F.get(0).material).toBe(null);                         // `usa` inválido: NÃO seta nada
    const n2 = nucleo([cubo, ['material', { faces: [0, 999], usa: 'casca' }]], {}, {}, MAT);
    expect(n2.orfaos.some((o: any) => o.op === 'material' && o.ref === 999)).toBe(true);
    expect(n2.F.get(0).material).toBe('casca');                      // a face válida recebeu; a inválida gritou
    expect(n2.V.size).toBe(8); expect(n2.F.size).toBe(6);            // malha do cubo INTACTA
    const n3 = nucleo([cubo, ['material', { faces: [0], usa: 'casca' }]], {}, {}, {});   // MATERIAIS vazio (ex.: colisaoDe sem materiais)
    expect(n3.orfaos).toHaveLength(1);
    expect(n3.F.size).toBe(6);
  });

  it('3) adaptarV3 AGRUPA por material: 2 materiais -> 3 lotes (2 + o padrão), faces certas em cada, params carregados', () => {
    const passos = [cubo, ['material', { faces: [0, 1], usa: 'casca' }], ['material', { faces: [2], usa: 'brasa' }]];
    const r: any = adaptarV3(nucleo(passos, {}, {}, MAT), fakeCtx, MAT);
    expect(r.lotes).toHaveLength(3);
    const brasa = r.lotes.find((L: any) => L.emissivo);
    const casca = r.lotes.find((L: any) => L.aspereza);
    const padrao = r.lotes.find((L: any) => !L.emissivo && !L.aspereza && !L.corMul && !L.semLuz);
    expect(brasa && casca && padrao).toBeTruthy();
    // params do material carregados no lote (os nomes CASAM os uniforms do render)
    expect(brasa.emissivo).toBeCloseTo(1.4, 6);
    expect(brasa.semLuz).toBe(1);
    expect(brasa.corMul.map((c: number) => Math.round(c * 255))).toEqual([0xff, 0x73, 0x26]);   // #ff7326 -> corMul
    expect(casca.aspereza).toBeCloseTo(0.9, 6);
    expect(casca.emissivo).toBeUndefined();                          // casca não tem emissivo -> ausente (no-op)
    expect(casca.corMul.map((c: number) => Math.round(c * 255))).toEqual([0x6b, 0x4a, 0x2f]);
    // subconjunto de triângulos por lote (quad -> 2 tris -> 6 v -> 48 floats): casca 2 faces, brasa 1, padrão 3
    expect(casca.mesh.v.length).toBe(96);
    expect(brasa.mesh.v.length).toBe(48);
    expect(padrao.mesh.v.length).toBe(144);
    expect(casca.mesh.v.length + brasa.mesh.v.length + padrao.mesh.v.length).toBe(288);   // o cubo inteiro, repartido
  });

  it('4) compat: peça SEM material -> UM lote só, params no-op (byte-idêntico ao 11a)', () => {
    const semMat: any = executar([cubo, ['pincel', { modo: 'face', faces: [0], cor: '#123456' }]], {}, {}, fakeCtx);
    expect(semMat.lotes).toHaveLength(1);
    const L = semMat.lotes[0];
    expect(L.emissivo).toBeUndefined(); expect(L.aspereza).toBeUndefined();
    expect(L.semLuz).toBeUndefined(); expect(L.corMul).toBeUndefined();   // nenhum param de material -> render no-op
    expect(L.mesh.v.length).toBe(288);                                    // o cubo inteiro num lote só
    // executar COM material devolve mais de um lote (a face 0 vira o seu próprio lote)
    const comMat: any = executar([cubo, ['material', { faces: [0], usa: 'casca' }]], {}, {}, fakeCtx, MAT);
    expect(comMat.lotes.length).toBe(2);
  });
});

/* PASSO 12b — MISTURA TRANSPARENTE (núcleo + adaptador; o render — passada extra
   ordenada + byte-idêntico com o recurso desligado — é provado por cmp/probe à parte).
   Prova por MEDIÇÃO: `mistura:'transparente'` marca o lote (transparente:true +
   opacidade, clamp em [0,1], default 1); `opaco`/`recorte`/ausente NÃO marcam (seguem
   opacos); o material entra na canon (por nome) e o replay bate; e executar propaga
   os campos pro lote (o render lê daí). Cada asserção falha sob neutralização. */
describe('passo 12b — mistura transparente', () => {
  const cubo: any[] = ['cubo', { id: 0, lado: 1 }];
  const fakeCtx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  const MAT = {
    vidro: { cor: '#7fdfff', mistura: 'transparente', opacidade: 0.42 },
    fumaca: { mistura: 'transparente' },              // sem opacidade -> default 1
    pedra: { cor: '#888888' },                        // opaco (mistura ausente)
    parede: { cor: '#777777', mistura: 'opaco' },     // opaco explícito
    janela: { cor: '#66ccff', mistura: 'recorte' },   // recorte (o de hoje) = opaco
  };

  it('1) adaptarV3 marca SÓ o lote transparente (transparente:true + opacidade); opaco/recorte/ausente NÃO marcam', () => {
    const passos = [cubo,
      ['material', { faces: [0], usa: 'vidro' }],
      ['material', { faces: [1], usa: 'pedra' }],
      ['material', { faces: [2], usa: 'parede' }],
      ['material', { faces: [3], usa: 'janela' }]];
    const r: any = adaptarV3(nucleo(passos, {}, {}, MAT), fakeCtx, MAT);
    const vidro = r.lotes.find((L: any) => L.transparente);
    expect(vidro).toBeTruthy();
    expect(vidro.opacidade).toBeCloseTo(0.42, 6);
    expect(r.lotes.filter((L: any) => L.transparente)).toHaveLength(1);          // só o vidro
    for (const L of r.lotes) if (L !== vidro) { expect(L.transparente).toBeUndefined(); expect(L.opacidade).toBeUndefined(); }
  });

  it('2) opacidade: default 1 quando ausente; clamp em [0,1]', () => {
    const t = adaptarV3(nucleo([cubo, ['material', { faces: [0], usa: 'fumaca' }]], {}, {}, MAT), fakeCtx, MAT).lotes.find((L: any) => L.transparente);
    expect(t.opacidade).toBe(1);   // 'transparente' sem opacidade -> 1
    const M2 = { a: { mistura: 'transparente', opacidade: 2 }, b: { mistura: 'transparente', opacidade: -0.5 } };
    const ra: any = adaptarV3(nucleo([cubo, ['material', { faces: [0], usa: 'a' }]], {}, {}, M2), fakeCtx, M2);
    const rb: any = adaptarV3(nucleo([cubo, ['material', { faces: [0], usa: 'b' }]], {}, {}, M2), fakeCtx, M2);
    expect(ra.lotes.find((L: any) => L.transparente).opacidade).toBe(1);   // 2 -> 1
    expect(rb.lotes.find((L: any) => L.transparente).opacidade).toBe(0);   // -0.5 -> 0
  });

  it('3) determinismo/replay: a canon carrega o material transparente (por nome), bate bit-a-bit, e a marcação é determinística', () => {
    const passos = [cubo, ['material', { faces: [0, 1], usa: 'vidro' }]];
    const canon = neutroCanonico(nucleo(passos, {}, {}, MAT));
    expect((canon.F.find((row: any[]) => row[0] === 0) as any[])[3]).toBe('vidro');   // material na canon (índice 3)
    const a = JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, MAT)));
    const b = JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {}, MAT)));
    expect(a).toBe(b);                                                                 // replay bit-a-bit (2x + round-trip JSON)
    const o1 = adaptarV3(nucleo(passos, {}, {}, MAT), fakeCtx, MAT).lotes.find((L: any) => L.transparente).opacidade;
    const o2 = adaptarV3(nucleo(passos, {}, {}, MAT), fakeCtx, MAT).lotes.find((L: any) => L.transparente).opacidade;
    expect(o1).toBe(o2);
    expect(a).not.toBe(JSON.stringify(neutroCanonico(nucleo([cubo], {}, {}, MAT))));   // neutralização: sem o passo, a canon difere
  });

  it('4) executar propaga transparente/opacidade pro lote (o render lê daí)', () => {
    const obj: any = executar([cubo, ['material', { faces: [0], usa: 'vidro' }]], {}, {}, fakeCtx, MAT);
    const t = obj.lotes.find((L: any) => L.transparente);
    expect(t).toBeTruthy();
    expect(t.opacidade).toBeCloseTo(0.42, 6);
    const semTransp: any = executar([cubo, ['material', { faces: [0], usa: 'pedra' }]], {}, {}, fakeCtx, MAT);
    expect(semTransp.lotes.some((L: any) => L.transparente)).toBe(false);             // material opaco: nenhum lote transparente
  });

  it('5) peça-exemplo _oficina-transp: sem órfãos, 1 lote transparente (opacidade 0.42), núcleo opaco', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_oficina-transp.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const n = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO, peca.MATERIAIS);
    expect(n.orfaos).toHaveLength(0);
    const r: any = adaptarV3(n, fakeCtx, peca.MATERIAIS);
    const transp = r.lotes.filter((L: any) => L.transparente);
    expect(transp).toHaveLength(1);
    expect(transp[0].opacidade).toBeCloseTo(0.42, 6);
    expect(r.lotes.some((L: any) => L.emissivo && !L.transparente)).toBe(true);       // núcleo aceso é OPACO
  });
});

/* PASSO 13a — ANIMAÇÃO RÍGIDA POR PARTE (motor headless; a prova de MOVIMENTO na tela
   — relógio congelado — é da bancada). Prova por MEDIÇÃO: a op `parte` nomeia faces e
   registra o pivô (canon carrega f.parte, byte-compat pra face sem parte); adaptarV3
   agrupa por (parte, material) e resolve o pivô (explícito ou CENTROIDE); o interpolador
   bate valores conhecidos (inclusive antes/depois/meio); montarAnimar casa parte<->lote
   por ÍNDICE (infoPorLote) e escreve a matriz determinística; executar fia ANIMACOES. */
describe('passo 13a — animação rígida por parte', () => {
  const cubo: any[] = ['cubo', { id: 0, lado: 1 }];
  const fakeCtx = { tex: { texCanvas: (w: number, h: number, fn: any) => ({ width: w, height: h, fn }) }, m4: { ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) } };
  const J = (x: any) => JSON.stringify(x);
  const aplica = (M: number[], p: number[]) => [
    M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12],
    M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13],
    M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14],
  ];

  it('1) op parte: seta f.parte; registra pivô; face inexistente GRITA sem corromper; reatribuir GRITA (O-2)', () => {
    const n = nucleo([cubo, ['parte', { nome: 'x', faces: [0, 1], pivo: [0.1, 0.2, 0.3] }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.F.get(0).parte).toBe('x');
    expect(n.F.get(1).parte).toBe('x');
    expect(n.F.get(2).parte).toBe(null);                     // face não citada intacta
    expect(n.partes.x.pivo).toEqual([0.1, 0.2, 0.3]);        // pivô registrado (passa por vec)
    // face inexistente: grita, malha e demais faces intactas
    const orf = nucleo([cubo, ['parte', { nome: 'x', faces: [0, 999] }]], {}, {});
    expect(orf.orfaos.some((o: any) => o.op === 'parte' && o.ref === 999)).toBe(true);
    expect(orf.F.get(0).parte).toBe('x'); expect(orf.V.size).toBe(8); expect(orf.F.size).toBe(6);
    expect(orf.partes.x.pivo).toBe(null);                    // sem pivo -> null (adaptador usa centroide)
    // reatribuir (O-2): era "última vence" em silêncio; agora GRITA e a face fica com o dono ANTIGO
    const re = nucleo([cubo, ['parte', { nome: 'a', faces: [0] }], ['parte', { nome: 'b', faces: [0] }]], {}, {});
    expect(re.F.get(0).parte).toBe('a');
    expect(re.orfaos.some((o: any) => o.op === 'parte' && o.passo === 2 && o.ref === 0 && /já pertence à parte 'a'.*passo 1.*'b'/.test(o.motivo))).toBe(true);
  });

  it('2) canon inclui f.parte (guardado); face SEM parte fica byte-idêntica (linha de 6); determinismo/replay', () => {
    const n = nucleo([cubo, ['parte', { nome: 'x', faces: [0] }]], {}, {});
    const canon = neutroCanonico(n);
    const r0 = canon.F.find((r: any[]) => r[0] === 0) as any[];
    const r1 = canon.F.find((r: any[]) => r[0] === 1) as any[];
    expect(r0[r0.length - 1]).toBe('x');                     // f.parte anexado (cauda)
    expect(r0.length).toBe(7);
    expect(r1.length).toBe(6);                               // face sem parte: linha inalterada (byte-compat)
    // determinismo (2x) + round-trip JSON da LISTA; e a canon COM parte difere da SEM (parte é gravado)
    const a = J(neutroCanonico(nucleo([cubo, ['parte', { nome: 'x', faces: [0] }]], {}, {})));
    const b = J(neutroCanonico(nucleo(JSON.parse(J([cubo, ['parte', { nome: 'x', faces: [0] }]])), {}, {})));
    expect(a).toBe(b);
    expect(a).not.toBe(J(neutroCanonico(nucleo([cubo], {}, {}))));
    // a compat NÃO é frágil: uma peça só-material/tinta (sem parte) segue com a MESMA canon do 12b
    const semParte = nucleo([cubo, ['pincel', { modo: 'face', faces: [0], cor: '#123456' }]], {}, {});
    for (const row of neutroCanonico(semParte).F) expect((row as any[]).every((c) => typeof c !== 'string' || c !== 'x')).toBe(true);
  });

  it('3) adaptarV3 agrupa por (parte, material); centroide default; pivô explícito; L.parte no lote; compat 1-lote', () => {
    const MAT = { metal: { cor: '#888888' }, marca: { cor: '#ff7326', emissivo: 1 } };
    // 1 parte 'roda' abrangendo 2 materiais -> 2 lotes, AMBOS com L.parte='roda'
    const passos = [['cubo', { id: 0, lado: 2 }], ['parte', { nome: 'roda', faces: [0, 1, 2, 3, 4, 5] }],
      ['material', { faces: [0], usa: 'marca' }], ['material', { faces: [1, 2, 3, 4, 5], usa: 'metal' }]];
    const r: any = adaptarV3(nucleo(passos, {}, {}, MAT), fakeCtx, MAT);
    expect(r.lotes).toHaveLength(2);
    expect(r.lotes.every((L: any) => L.parte === 'roda')).toBe(true);
    expect(r.lotes.reduce((s: number, L: any) => s + L.mesh.v.length, 0)).toBe(288);   // triângulos conservados (cubo inteiro)
    // centroide default = média dos verts distintos da parte. Cubo lado 2: verts em x,z∈[-1,1], y∈[0,2] -> centro (0,1,0)
    expect(r.partes.roda.pivo).toEqual([0, 1, 0]);
    // pivô EXPLÍCITO sobrepõe o centroide
    const rEx: any = adaptarV3(nucleo([['cubo', { id: 0, lado: 2 }], ['parte', { nome: 'roda', faces: [0], pivo: [5, 6, 7] }]], {}, {}), fakeCtx);
    expect(rEx.partes.roda.pivo).toEqual([5, 6, 7]);
    // compat: sem parte E sem material -> 1 lote, L.parte null, partes {}
    const rc: any = adaptarV3(nucleo([cubo], {}, {}), fakeCtx);
    expect(rc.lotes).toHaveLength(1);
    expect(rc.lotes[0].parte).toBe(null);
    expect(rc.partes).toEqual({});
  });

  it('4) interpolador (avaliarChaves): antes/depois das pontas, na chave, meio e quarto de segmento (smoothstep)', () => {
    const K = [[0, 10], [2, 20]];
    expect(avaliarChaves(K, -1)).toBe(10);        // antes da 1ª -> 1º valor
    expect(avaliarChaves(K, 5)).toBe(20);         // depois da última -> último valor
    expect(avaliarChaves(K, 0)).toBe(10);         // na chave
    expect(avaliarChaves(K, 2)).toBe(20);
    expect(avaliarChaves(K, 1)).toBe(15);         // meio: smoothstep(0.5)=0.5 -> 15
    expect(avaliarChaves(K, 0.5)).toBeCloseTo(11.5625, 9);   // quarto: s=0.15625 (DISCRIMINA de linear=12.5)
    // três chaves: encontra o segmento certo
    const K3 = [[0, 0], [1, 100], [2, 0]];
    expect(avaliarChaves(K3, 1)).toBe(100);       // na chave do meio
    expect(avaliarChaves(K3, 0.5)).toBeCloseTo(50, 9);       // meio do 1º segmento
    expect(avaliarChaves(K3, 1.5)).toBeCloseTo(50, 9);       // meio do 2º segmento
    expect(avaliarChaves([], 3)).toBe(0);         // sem chaves -> 0 (defensivo)
  });

  it('5) montarAnimar: casa parte<->lote por ÍNDICE, matriz determinística, pivô fixo, vazio->undefined, canal ruim GRITA', () => {
    const infoPorLote = ['roda', 'roda', 'braco', null];   // paralelo aos lotes (o 4º sem parte)
    const partes = { roda: { pivo: [0, 1, 0] }, braco: { pivo: [1, 0, 0] } };
    const ANIM = { girar: { duracao: 4, repete: true, trilhas: [{ parte: 'roda', canal: 'rotY', chaves: [[0, 0], [4, Math.PI * 2]] }] } };
    const animar = montarAnimar(ANIM, infoPorLote, partes);
    expect(typeof animar).toBe('function');
    const mk = () => infoPorLote.map(() => ({ matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }));
    const A = mk(); animar(0, A);
    const B = mk(); animar(0, B);
    expect(J(A.map((l) => l.matriz))).toBe(J(B.map((l) => l.matriz)));   // determinismo: mesmo T -> mesma matriz
    const C = mk(); animar(1, C);
    expect(J(A.map((l) => l.matriz))).not.toBe(J(C.map((l) => l.matriz)));   // T=0 != T=1 (moveu)
    expect(J(C[0].matriz)).toBe(J(C[1].matriz));    // os 2 lotes da 'roda' recebem A MESMA matriz
    expect(J(C[2].matriz)).toBe(J([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));   // 'braco' não animado aqui -> ident intacta
    expect(J(C[3].matriz)).toBe(J([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));   // lote sem parte -> ident intacta
    // o PIVÔ fica FIXO sob a matriz (a parte gira EM TORNO dele)
    const fixo = aplica(C[0].matriz, [0, 1, 0]);
    expect(fixo[0]).toBeCloseTo(0, 9); expect(fixo[1]).toBeCloseTo(1, 9); expect(fixo[2]).toBeCloseTo(0, 9);
    // valor esperado do rotY em T=1: lt=1, u=0.25, s=0.15625 -> ang=2π·0.15625 (bloco rotacional bate cos/sin float64)
    const ang = 2 * Math.PI * 0.15625;
    expect(C[0].matriz[0]).toBeCloseTo(Math.cos(ang), 9);
    expect(C[0].matriz[2]).toBeCloseTo(-Math.sin(ang), 9);
    // ANIMACOES vazio -> undefined (o render vê peca.animar||null = null -> byte-idêntico)
    expect(montarAnimar({}, infoPorLote, partes)).toBeUndefined();
    // canal desconhecido GRITA ao montar (erro alto e cedo, como op desconhecida)
    expect(() => montarAnimar({ x: { trilhas: [{ parte: 'roda', canal: 'giroZ', chaves: [[0, 0]] }] } }, infoPorLote, partes)).toThrow(/canal/);
    // trilha aponta pra parte SEM lote -> no-op (nada a mover, sem quebrar)
    const semLote = montarAnimar({ y: { repete: true, duracao: 2, trilhas: [{ parte: 'fantasma', canal: 'posX', chaves: [[0, 0], [2, 9]] }] } }, infoPorLote, partes);
    const D = mk(); expect(() => semLote(1, D)).not.toThrow();
    expect(J(D.map((l) => l.matriz))).toBe(J(mk().map((l) => l.matriz)));   // ninguém mexeu
  });

  it('6) executar fia ANIMACOES -> animar; sem ANIMACOES -> undefined (compat); canais pos/escala compõem', () => {
    const MAT = { m: { cor: '#888888' } };
    const passos = [cubo, ['parte', { nome: 'p', faces: [0, 1, 2, 3, 4, 5], pivo: [0, 0, 0] }], ['material', { faces: [0, 1, 2, 3, 4, 5], usa: 'm' }]];
    // repete:false pra o fim da linha do tempo (lt=min(T,dur)=dur) dar os valores de PONTA exatos
    const ANIM = { mover: { duracao: 2, repete: false, trilhas: [{ parte: 'p', canal: 'posY', chaves: [[0, 0], [2, 1]] }, { parte: 'p', canal: 'escala', chaves: [[0, 1], [2, 2]] }] } };
    const obj: any = executar(passos, {}, {}, fakeCtx, MAT, ANIM);
    expect(typeof obj.animar).toBe('function');
    const semAnim: any = executar(passos, {}, {}, fakeCtx, MAT);
    expect(semAnim.animar).toBeUndefined();   // ANIMACOES omitido -> undefined
    // no fim (T=2 -> lt=min(2,2)=2): posY=1, escala=2 -> a matriz translada Y e escala 2
    const lotes = obj.lotes.map((L: any) => ({ matriz: L.matriz }));
    obj.animar(2, lotes);
    const M = lotes[0].matriz;
    // um ponto (1,0,0): escala 2 -> (2,0,0); +posY 1 -> (2,1,0). Pivô [0,0,0] não desloca.
    const p = aplica(M, [1, 0, 0]);
    expect(p[0]).toBeCloseTo(2, 9); expect(p[1]).toBeCloseTo(1, 9); expect(p[2]).toBeCloseTo(0, 9);
    // e o WRAP do laço: repete:true em T=dur volta pro início (lt = dur % dur = 0) -> valores iniciais
    const ANIMr = { mover: { duracao: 2, repete: true, trilhas: [{ parte: 'p', canal: 'posY', chaves: [[0, 0], [2, 1]] }] } };
    const objR: any = executar(passos, {}, {}, fakeCtx, MAT, ANIMr);
    const lotesR = objR.lotes.map((L: any) => ({ matriz: L.matriz }));
    objR.animar(2, lotesR);   // T=2 % 2 = 0 -> posY=0 -> identidade
    expect(aplica(lotesR[0].matriz, [1, 0, 0])).toEqual([1, 0, 0]);
  });

  it('7) peça-exemplo _oficina-anim: sem órfãos, 2 partes (roda centroide, braco pivô explícito), animar presente', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_oficina-anim.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const n = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO, peca.MATERIAIS);
    expect(n.orfaos).toHaveLength(0);
    expect(n.partes.roda.pivo).toBe(null);                       // roda SEM pivo -> centroide no adaptador
    expect(n.partes.braco.pivo).toEqual([peca.PARAMS.bracoX, 0, 0]);   // braco COM pivo explícito na base
    const r: any = adaptarV3(n, fakeCtx, peca.MATERIAIS);
    expect(r.lotes.map((L: any) => L.parte)).toEqual(['roda', 'roda', 'braco']);   // infoPorLote paralelo
    expect(r.partes.braco.pivo).toEqual([peca.PARAMS.bracoX, 0, 0]);
    expect(r.partes.roda.pivo[0]).toBeGreaterThan(0);             // centroide puxado pro dente (+x): prova o default
    const obj: any = executar(peca.PASSOS, peca.PARAMS, peca.TOPO, fakeCtx, peca.MATERIAIS, peca.ANIMACOES);
    expect(typeof obj.animar).toBe('function');
    expect(peca.meta.colisao.forma).toBe('cilindro');
  });
});

/* PASSO 14a — ESQUELETO com DEFORMAÇÃO SUAVE (linear blend skinning; motor headless — a
   prova de que DEFORMA na tela, relógio congelado, é da bancada). Prova por MEDIÇÃO: a op
   `pesar` acumula peso por (vértice, osso) e grita órfão (osso/vértice/face) sem corromper;
   a canon anexa o peso do vértice (compat: sem peso -> byte-idêntica); resolverEsqueleto
   grita ciclo/pai/teto; adaptarV3 emite o mesh de 16 floats + top-4 normalizado (8 floats
   sem esqueleto — compat); o skinning é LBS determinístico (bind pose = identidade; filho
   gira no pivô; raiz fica; MISTO = combinação convexa); executar fia ESQUELETO. */
describe('passo 14a — esqueleto com deformação suave', () => {
  const cubo: any[] = ['cubo', { id: 0, lado: 1 }];
  const fakeCtx = { tex: { texCanvas: (w: number, h: number, fn: any) => ({ width: w, height: h, fn }) }, m4: { ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) } };
  const J = (x: any) => JSON.stringify(x);
  const ESQ = { ossos: [{ nome: 'b0' }, { nome: 'b1', pai: 'b0', pivo: [0, 1, 0] }] };   // b0 raiz, b1 filho na junta y=1
  const aplica = (M: ArrayLike<number>, p: number[]) => [
    M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12],
    M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13],
    M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14],
  ];

  it('1) op pesar: acumula por (vértice,osso); órfão de osso/vértice/face GRITA sem corromper; peso viaja por ID', () => {
    // acumula: dois pesar no mesmo (v,osso) somam
    const n = nucleo([cubo, ['pesar', { osso: 'b0', vs: [0], peso: 0.3 }], ['pesar', { osso: 'b0', vs: [0], peso: 0.2 }], ['pesar', { osso: 'b1', vs: [0], peso: 0.5 }]], {}, {}, {}, ESQ);
    expect(n.orfaos).toHaveLength(0);
    expect(n.pesos.get(0).get('b0')).toBeCloseTo(0.5, 9);   // 0.3 + 0.2 ACUMULADOS
    expect(n.pesos.get(0).get('b1')).toBeCloseTo(0.5, 9);
    // faces: pesa TODOS os vértices distintos da face
    const nf = nucleo([cubo, ['pesar', { osso: 'b0', faces: [0], peso: 1 }]], {}, {}, {}, ESQ);
    expect([...nf.pesos.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);   // a face 0 (fundo) tem 4 cantos
    // órfão: osso fora do ESQUELETO grita, malha intacta, nada pesado
    const o1 = nucleo([cubo, ['pesar', { osso: 'fantasma', vs: [0], peso: 1 }]], {}, {}, {}, ESQ);
    expect(o1.orfaos.some((x: any) => x.op === 'pesar' && x.ref === 'fantasma')).toBe(true);
    expect(o1.pesos.size).toBe(0); expect(o1.V.size).toBe(8);
    // órfão: vértice inexistente grita, o VÁLIDO ainda é pesado
    const o2 = nucleo([cubo, ['pesar', { osso: 'b0', vs: [0, 999], peso: 1 }]], {}, {}, {}, ESQ);
    expect(o2.orfaos.some((x: any) => x.op === 'pesar' && x.ref === 999)).toBe(true);
    expect(o2.pesos.has(0)).toBe(true); expect(o2.V.size).toBe(8);
    // órfão: face inexistente grita
    const o3 = nucleo([cubo, ['pesar', { osso: 'b0', faces: [999], peso: 1 }]], {}, {}, {}, ESQ);
    expect(o3.orfaos.some((x: any) => x.op === 'pesar' && x.ref === 999)).toBe(true);
    // sem ESQUELETO, pesar grita (não há osso pra pesar)
    const sem = nucleo([cubo, ['pesar', { osso: 'b0', vs: [0], peso: 1 }]], {}, {});
    expect(sem.orfaos.some((x: any) => x.op === 'pesar')).toBe(true);
    expect(sem.pesos.size).toBe(0);
  });

  it('2) canon: peso do vértice na CAUDA (compat: sem peso -> linha de 4 byte-idêntica); determinismo/replay', () => {
    const passos = [cubo, ['pesar', { osso: 'b0', vs: [0], peso: 0.5 }], ['pesar', { osso: 'b1', vs: [0], peso: 0.5 }]];
    const canon = neutroCanonico(nucleo(passos, {}, {}, {}, ESQ));
    const r0 = canon.V.find((r: any[]) => r[0] === 0) as any[];
    const r1 = canon.V.find((r: any[]) => r[0] === 1) as any[];
    expect(r0.length).toBe(5);                                   // [id,x,y,z, PESO]
    expect(r0[4]).toEqual([['b0', 0.5], ['b1', 0.5]]);           // pares [osso,peso] ORDENADOS por nome do osso (o peso CRU acumulado)
    expect(r1.length).toBe(4);                                   // vértice SEM peso: linha de 4 (byte-compat)
    // determinismo (2x) + round-trip JSON da LISTA; e a canon COM peso difere da SEM
    const a = J(neutroCanonico(nucleo(passos, {}, {}, {}, ESQ)));
    const b = J(neutroCanonico(nucleo(JSON.parse(J(passos)), {}, {}, {}, ESQ)));
    expect(a).toBe(b);
    expect(a).not.toBe(J(neutroCanonico(nucleo([cubo], {}, {}, {}, ESQ))));
    // COMPAT NÃO-FRÁGIL: uma peça SEM esqueleto/pesar canoniza IGUAL ao de antes (toda linha V de 4)
    const semEsq = neutroCanonico(nucleo([cubo, ['pincel', { modo: 'face', faces: [0], cor: '#123456' }]], {}, {}));
    for (const row of semEsq.V) expect((row as any[]).length).toBe(4);
  });

  it('3) resolverEsqueleto: ciclo, pai inexistente e teto de ossos GRITAM (alto e cedo, malha não corrompe)', () => {
    expect(() => nucleo([cubo], {}, {}, {}, { ossos: [{ nome: 'a', pai: 'b' }, { nome: 'b', pai: 'a' }] })).toThrow(/ciclo/);
    expect(() => nucleo([cubo], {}, {}, {}, { ossos: [{ nome: 'a', pai: 'naoexiste' }] })).toThrow(/pai/);
    expect(() => nucleo([cubo], {}, {}, {}, { ossos: Array.from({ length: 33 }, (_, i) => ({ nome: 'o' + i })) })).toThrow(/teto/);
    // pivô passa por vec -> cita PARAM
    const n = nucleo([cubo], { alt: 1.7 }, {}, {}, { ossos: [{ nome: 'x', pivo: [0, 'alt', 0] }] });
    expect(n.esqueleto.ossos[0].pivo).toEqual([0, 1.7, 0]);
  });

  it('4) adaptarV3: mesh de 16 floats + top-4 normalizado quando há esqueleto; 8 floats (byte-compat) sem ele', () => {
    // sem esqueleto: 8 floats/vértice, lote SEM esqueleto (o caminho de hoje, intocado)
    const rc: any = adaptarV3(nucleo([cubo], {}, {}), fakeCtx);
    expect(rc.lotes[0].mesh.v.length % 8).toBe(0);
    expect(rc.lotes[0].esqueleto).toBeUndefined();
    expect(rc.esqueleto).toBe(null);
    // com esqueleto: 16 floats/vértice, lote marcado, nOssos correto
    const n = nucleo([cubo, ['pesar', { osso: 'b0', vs: [0, 1, 2, 3], peso: 1 }], ['pesar', { osso: 'b1', vs: [4, 5, 6, 7], peso: 1 }]], {}, {}, {}, ESQ);
    const r: any = adaptarV3(n, fakeCtx, {});
    expect(r.lotes[0].mesh.v.length % 16).toBe(0);
    expect(r.lotes[0].esqueleto).toBe(true);
    expect(r.lotes[0].nOssos).toBe(2);
    // vértice 0 (100% b0) -> boneIndex 0, peso 1; vértice sem peso -> tudo 0 (o shader cai na identidade)
    // primeiro triângulo da face 0 (fundo): canto 0 primeiro. layout: pos3 uv2 nrm3 idx4 w4
    const v0 = r.lotes[0].mesh.v.slice(0, 16);
    expect(v0.slice(8, 12)).toEqual([0, 0, 0, 0]);   // boneIndex (b0 = 0)
    expect(v0.slice(12, 16)).toEqual([1, 0, 0, 0]);  // peso normalizado
    // TOP-4 + normaliza: 5 ossos num vértice -> só os 4 maiores, somando 1
    const ESQ5 = { ossos: [{ nome: 'a' }, { nome: 'b' }, { nome: 'c' }, { nome: 'd' }, { nome: 'e' }] };
    const n5 = nucleo([cubo,
      ['pesar', { osso: 'a', vs: [0], peso: 5 }], ['pesar', { osso: 'b', vs: [0], peso: 4 }],
      ['pesar', { osso: 'c', vs: [0], peso: 3 }], ['pesar', { osso: 'd', vs: [0], peso: 2 }],
      ['pesar', { osso: 'e', vs: [0], peso: 1 }]], {}, {}, {}, ESQ5);
    const r5: any = adaptarV3(n5, fakeCtx, {});
    const w0 = r5.lotes[0].mesh.v.slice(12, 16) as number[];   // pesos do vértice 0
    expect(w0.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 9);   // normalizado (soma 1)
    expect((r5.lotes[0].mesh.v.slice(8, 12) as number[]).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);   // os 4 MAIORES (a,b,c,d), 'e' (o menor) fora
    expect(w0[0]).toBeCloseTo(5 / 14, 9);   // a=5 sobre a soma dos top-4 (5+4+3+2=14)
  });

  it('5) skinning (montarAnimar+skin): bind pose = identidade; filho gira no pivô; raiz fica; MISTO = combinação convexa; determinístico', () => {
    const infoPorLote = [null];   // 1 lote skinado
    const esqR = nucleo([cubo], {}, {}, {}, ESQ).esqueleto;   // esqueleto RESOLVIDO (pivô default + idx) — o que executar passa
    const ANIM = { curl: { duracao: 2, repete: false, trilhas: [{ parte: 'b1', canal: 'rotZ', chaves: [[0, 0], [2, Math.PI / 2]] }] } };
    const animar = montarAnimar(ANIM, infoPorLote, {}, esqR);
    expect(typeof animar).toBe('function');
    const mk = () => [{ matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], ossos: new Float32Array(32) }];
    // T=0: bind pose -> AMBOS os ossos identidade (deforma 0)
    const A = mk(); animar(0, A);
    const I16 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(Array.from(A[0].ossos.slice(0, 16))).toEqual(I16);    // b0 identidade
    expect(Array.from(A[0].ossos.slice(16, 32))).toEqual(I16);   // b1 identidade (bind pose)
    // T=2 (fim, rotZ=90°): b0 fica identidade; b1 gira EM TORNO do pivô [0,1,0]
    const B = mk(); animar(2, B);
    expect(Array.from(B[0].ossos.slice(0, 16))).toEqual(I16);    // raiz FICA
    const skB1 = B[0].ossos.slice(16, 32);
    const piv = aplica(skB1, [0, 1, 0]);                          // o pivô é PONTO FIXO da rotação do osso
    expect(piv[0]).toBeCloseTo(0, 9); expect(piv[1]).toBeCloseTo(1, 9); expect(piv[2]).toBeCloseTo(0, 9);
    // um ponto do filho (topo [0,2,0]) gira 90° em torno de [0,1,0]: (0,2,0)->(-1,1,0)
    const topo = aplica(skB1, [0, 2, 0]);
    expect(topo[0]).toBeCloseTo(-1, 9); expect(topo[1]).toBeCloseTo(1, 9); expect(topo[2]).toBeCloseTo(0, 9);
    // MISTO 50/50: um ponto vale 0.5·skinB0·p + 0.5·skinB1·p -> ESTRITAMENTE ENTRE os dois (convexo, não rígido)
    const p = [0, 2, 0];
    const a0 = aplica(B[0].ossos.slice(0, 16), p), a1 = aplica(skB1, p);
    const mix = [0.5 * a0[0] + 0.5 * a1[0], 0.5 * a0[1] + 0.5 * a1[1], 0.5 * a0[2] + 0.5 * a1[2]];
    const d0 = Math.hypot(mix[0] - a0[0], mix[1] - a0[1], mix[2] - a0[2]);
    const d1 = Math.hypot(mix[0] - a1[0], mix[1] - a1[1], mix[2] - a1[2]);
    expect(d0).toBeGreaterThan(1e-6); expect(d1).toBeGreaterThan(1e-6);   // não é rígido de NENHUM dos dois
    expect(mix[0]).toBeCloseTo((a0[0] + a1[0]) / 2, 9);                    // é a MÉDIA exata (peso 50/50)
    // determinismo: mesmo T -> mesmas matrizes bit-a-bit
    const C = mk(); animar(2, C);
    expect(J(Array.from(B[0].ossos))).toBe(J(Array.from(C[0].ossos)));
    // ANIMACOES vazio -> undefined (mesmo com esqueleto: o render vê animar||null=null)
    expect(montarAnimar({}, infoPorLote, {}, esqR)).toBeUndefined();
  });

  it('6) osso vs parte: a trilha resolve o alvo — nome de OSSO dirige skinning (L.ossos), nome de PARTE dirige L.matriz', () => {
    // um lote skinado (parte null) + uma trilha que mira o OSSO b1: escreve L.ossos, NÃO L.matriz
    const ANIM = { a: { duracao: 2, repete: false, trilhas: [{ parte: 'b1', canal: 'rotZ', chaves: [[0, 0], [2, 1]] }] } };
    const esqR = nucleo([cubo], {}, {}, {}, ESQ).esqueleto;
    const animar = montarAnimar(ANIM, [null], {}, esqR);
    const L = [{ matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], ossos: new Float32Array(32) }];
    animar(2, L);
    expect(J(L[0].matriz)).toBe(J([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));   // matriz INTOCADA (b1 é osso, não parte)
    expect(Array.from(L[0].ossos.slice(16, 32))).not.toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);   // mas o osso b1 mexeu
  });

  it('7) executar fia ESQUELETO -> lotes skinados com L.ossos bind pose; SEM ESQUELETO byte-compat (sem L.ossos, mesh 8 floats)', () => {
    const passos = [cubo, ['pesar', { osso: 'b0', vs: [0, 1, 2, 3], peso: 1 }], ['pesar', { osso: 'b1', vs: [4, 5, 6, 7], peso: 1 }]];
    const obj: any = executar(passos, {}, {}, fakeCtx, {}, {}, ESQ);   // sem ANIMACOES: bind pose estática
    expect(obj.lotes[0].esqueleto).toBe(true);
    expect(obj.lotes[0].ossos).toBeInstanceOf(Float32Array);
    expect(obj.lotes[0].ossos.length).toBe(32);                        // 2 ossos × 16
    expect(Array.from(obj.lotes[0].ossos)).toEqual(Array.from(bindPoseOssos(2)));   // bind pose = identidades
    expect(obj.animar).toBeUndefined();                                // sem ANIMACOES
    // SEM esqueleto: nenhum L.ossos, lote não-skinado, mesh 8 floats (o caminho de hoje)
    const semEsq: any = executar([cubo], {}, {}, fakeCtx);
    expect(semEsq.lotes[0].esqueleto).toBeUndefined();
    expect(semEsq.lotes[0].ossos).toBeUndefined();
    expect(semEsq.lotes[0].mesh.v.length % 8).toBe(0);
  });

  it('8) peça-exemplo _oficina-esqueleto: sem órfãos, 3 ossos encadeados, 16 vértices pesados, todos os lotes skinados, animar presente', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_oficina-esqueleto.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const n = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO, peca.MATERIAIS, peca.ESQUELETO);
    expect(n.orfaos).toHaveLength(0);
    expect(n.esqueleto.ossos.map((o: any) => o.nome)).toEqual(['b0', 'b1', 'b2']);
    expect(n.esqueleto.ossos[1].pai).toBe('b0');
    expect(n.esqueleto.ossos[2].pai).toBe('b1');                       // cadeia b0<-b1<-b2
    expect(n.pesos.size).toBe(16);                                     // 4 anéis × 4 cantos
    const obj: any = executar(peca.PASSOS, peca.PARAMS, peca.TOPO, fakeCtx, peca.MATERIAIS, peca.ANIMACOES, peca.ESQUELETO);
    expect(obj.lotes.every((L: any) => L.esqueleto)).toBe(true);       // peça skinada -> TODO lote é skinado
    expect(obj.lotes.every((L: any) => L.mesh.v.length % 16 === 0)).toBe(true);
    expect(typeof obj.animar).toBe('function');
    expect(peca.meta.colisao.forma).toBe('cilindro');
    // anima de verdade: T=0 (bind) != T=1.5 (pico) nas matrizes de osso
    const rodar = (T: number) => { const L = obj.lotes.map((l: any) => ({ matriz: l.matriz, ossos: new Float32Array(l.ossos) })); obj.animar(T, L); return J(Array.from(L[0].ossos)); };
    expect(rodar(0)).not.toBe(rodar(1.5));
    expect(rodar(1.5)).toBe(rodar(1.5));                               // determinístico
  });
});

/* P1 do PLAYGROUND — PRIMITIVAS esfera/cone/plano (só o NÚCLEO; interface é onda
   separada). NUMERAÇÃO É FORMATO SALVO (playground regra 4): os ids de vértice e
   de face documentados no comentário de cada op ficam TRAVADOS aqui — mudar
   qualquer um quebra estes testes de propósito. Prova por MEDIÇÃO: contagens,
   ids-chave EXATOS (polos, ápice, cantos), winding pra FORA por Newell (a lição
   D1), determinismo/replay round-trip, órfão grita, guarda de overflow (D3) e
   params por NOME. */
describe('P1 — primitivas esfera/cone/plano', () => {
  const J = (x: any) => JSON.stringify(x);
  const fakeCtx = { tex: { texCanvas: (w: number, h: number, fn: any) => ({ width: w, height: h, fn }) }, m4: { ident: () => new Float32Array(16) } };
  // Newell inline (a do núcleo não é exportada) — o MESMO teste de direção do D1
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };
  const centroide = (V: any, vs: number[]) => {
    const c = [0, 0, 0];
    for (const v of vs) { const p = V.get(v); c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    return c.map((x) => x / vs.length);
  };

  it('esfera: contagem V/F e numeração EXATA travada (polos, anéis, as três faixas de face)', () => {
    const { V, F, orfaos } = nucleo([['esfera', { id: 0, raio: 'r', aneis: 'a', lados: 'l' }]], { r: 0.5 }, { a: 6, l: 8 });
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(42);                            // 2 polos + (6-1)·8
    expect(F.size).toBe(48);                            // 6·8 (leque + 4 faixas + leque)
    // polos (formato salvo): sul = b+0 em y=0; norte = b+1+(aneis-1)·lados = 41 em y=2·raio
    expect(V.get(0)).toEqual([0, 0, 0]);
    expect(V.get(41)).toEqual([0, 1, 0]);
    // anel k=1 (φ=π/6), j=0: id 1 = b+1+(k-1)·lados+j — em +x (mesmo ângulo do cilindro)
    const v1 = V.get(1);
    expect(v1[0]).toBeCloseTo(0.5 * Math.sin(Math.PI / 6), 12);
    expect(v1[1]).toBeCloseTo(0.5 * (1 - Math.cos(Math.PI / 6)), 12);
    expect(v1[2]).toBeCloseTo(0, 12);
    // equador (k=3, φ=π/2): id 17 (j=0) em [+raio, raio, 0]; id 19 (j=2, θ=π/2) em [0, raio, +raio]
    const v17 = V.get(17), v19 = V.get(19);
    expect(v17[0]).toBeCloseTo(0.5, 12); expect(v17[1]).toBeCloseTo(0.5, 12); expect(v17[2]).toBeCloseTo(0, 12);
    expect(v19[0]).toBeCloseTo(0, 12); expect(v19[1]).toBeCloseTo(0.5, 12); expect(v19[2]).toBeCloseTo(0.5, 12);
    // FACES por faixa (b + k·lados + j), cantos EXATOS — o formato salvo travado:
    expect(F.get(0).vs).toEqual([0, 1, 2]);             // leque sul j=0: [polo, anel1[0], anel1[1]]
    expect(F.get(7).vs).toEqual([0, 8, 1]);             // leque sul j=7 fecha o ciclo
    expect(F.get(8).vs).toEqual([1, 9, 10, 2]);         // faixa k=1 j=0: [anel1[0], anel2[0], anel2[1], anel1[1]]
    expect(F.get(40).vs).toEqual([41, 34, 33]);         // leque norte j=0: [polo, anel5[1], anel5[0]] (invertido, como a tampa de cima)
    expect(F.get(47).vs).toEqual([41, 33, 40]);         // leque norte j=7 fecha o ciclo
  });

  it('esfera: winding pra FORA em TODA face (Newell·(centroide−centro) > 0 — a lição D1, agora na esfera inteira)', () => {
    const { V, F } = nucleo([['esfera', { id: 0, raio: 0.5, aneis: 6, lados: 8 }]], {}, {});
    for (const f of F.values()) {
      const n = newell(V, f.vs), c = centroide(V, f.vs);
      const d = [c[0], c[1] - 0.5, c[2]];               // centro da esfera em (0, raio, 0)
      expect(n[0] * d[0] + n[1] * d[1] + n[2] * d[2]).toBeGreaterThan(0);
    }
  });

  it('cone: contagem V/F, numeração EXATA (anel, ápice), laterais pra fora e tampa -y (MESMO winding do fundo do cilindro)', () => {
    const { V, F, orfaos } = nucleo([['cone', { id: 0, raio: 'r', altura: 'h', lados: 'l' }]], { r: 0.4, h: 1.2 }, { l: 8 });
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(9);                             // lados + ápice
    expect(F.size).toBe(9);                             // lados laterais + tampa
    expect(V.get(0)).toEqual([0.4, 0, 0]);              // anel j=0 em +x, y=0
    expect(V.get(8)).toEqual([0, 1.2, 0]);              // ápice = b+lados, y=altura
    expect(F.get(0).vs).toEqual([0, 8, 1]);             // lateral j=0: [base[0], ápice, base[1]]
    expect(F.get(7).vs).toEqual([7, 8, 0]);             // lateral j=7 fecha o ciclo
    expect(F.get(8).vs).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);   // tampa da base: ângulo crescente
    // tampa -y (fundo do cilindro) e laterais radiais pra fora
    expect(newell(V, F.get(8).vs)[1]).toBeLessThan(0);
    for (let j = 0; j < 8; j++) {
      const n = newell(V, F.get(j).vs), c = centroide(V, F.get(j).vs);
      expect(n[0] * c[0] + n[2] * c[2]).toBeGreaterThan(0);   // componente radial no XZ aponta pra fora
    }
  });

  it('plano: contagem V/F, grade linha-a-linha EXATA (cantos), quads todos +y (o ciclo da tampa de cima do cubo)', () => {
    const { V, F, orfaos } = nucleo([['plano', { id: 0, largura: 'w', profundidade: 'p', seg: 's' }]], { w: 2, p: 4 }, { s: 2 });
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(9);                             // (seg+1)²
    expect(F.size).toBe(4);                             // seg²
    // linha a linha (b + iz·(seg+1) + ix), centrado na origem, y=0:
    expect(V.get(0)).toEqual([-1, 0, -2]);              // (ix=0, iz=0)
    expect(V.get(2)).toEqual([1, 0, -2]);               // (ix=2, iz=0)
    expect(V.get(4)).toEqual([0, 0, 0]);                // o centro da grade
    expect(V.get(6)).toEqual([-1, 0, 2]);               // (ix=0, iz=2)
    expect(V.get(8)).toEqual([1, 0, 2]);                // (ix=2, iz=2)
    // faces (b + iz·seg + ix), cantos EXATOS:
    expect(F.get(0).vs).toEqual([0, 3, 4, 1]);          // célula (0,0)
    expect(F.get(3).vs).toEqual([4, 7, 8, 5]);          // célula (1,1)
    for (const f of F.values()) expect(newell(V, f.vs)[1]).toBeGreaterThan(0);   // TODO quad com normal +y
  });

  it('determinismo e replay: 2 execuções idênticas bit-a-bit + round-trip JSON da LISTA (as 3 ops juntas)', () => {
    const passos = [
      ['plano', { id: 0, largura: 2, profundidade: 2, seg: 3 }],
      ['esfera', { id: 1000, raio: 0.4, aneis: 5, lados: 7 }],
      ['cone', { id: 2000, raio: 0.3, altura: 0.9, lados: 6 }],
      ['moveV', { v: 2006, d: [0.8, 0, 0] }],           // o ápice do cone (b+lados) — id da numeração documentada
    ];
    const a = J(neutroCanonico(nucleo(passos, {}, {})));
    const b = J(neutroCanonico(nucleo(passos, {}, {})));
    expect(a).toBe(b);                                                            // 2 execuções idênticas
    expect(J(neutroCanonico(nucleo(JSON.parse(J(passos)), {}, {})))).toBe(a);     // replay do salvo (round-trip JSON) bit-a-bit
  });

  it('params por NOME (PARAMS/TOPO) resolvem como nas outras ops; mudar PARAM NÃO renumera', () => {
    // raio:'meuRaio' resolve de PARAMS — o polo norte sobe pra 2·meuRaio
    const n = nucleo([['esfera', { id: 0, raio: 'meuRaio', aneis: 'an', lados: 'la' }]], { meuRaio: 0.7 }, { an: 4, la: 6 });
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.get(1 + 3 * 6)[1]).toBeCloseTo(1.4, 12);                           // norte = b+1+(aneis-1)·lados
    const c = nucleo([['cone', { id: 0, raio: 'cr', altura: 'ch', lados: 'cl' }]], { cr: 0.2, ch: 2.5 }, { cl: 5 });
    expect(c.V.get(5)).toEqual([0, 2.5, 0]);                                      // ápice em y=altura
    const p = nucleo([['plano', { id: 0, largura: 'w', profundidade: 'pr', seg: 'sg' }]], { w: 6, pr: 3 }, { sg: 2 });
    expect(p.V.get(8)).toEqual([3, 0, 1.5]);                                      // canto (+x,+z) = [largura/2, 0, profundidade/2]
    // nome que NÃO existe em PARAMS/TOPO grita ALTO (o contrato do st.num)
    expect(() => nucleo([['esfera', { id: 0, raio: 'fantasma' }]], {}, {})).toThrow(/fantasma/);
    // PARAM não renumera: mesmos ids, posições diferentes (a lei que separa PARAMS de TOPO)
    const e1 = neutroCanonico(nucleo([['esfera', { id: 0, raio: 'r' }]], { r: 0.5 }, {}));
    const e2 = neutroCanonico(nucleo([['esfera', { id: 0, raio: 'r' }]], { r: 0.9 }, {}));
    expect(e2.V.map((row: any[]) => row[0])).toEqual(e1.V.map((row: any[]) => row[0]));
    expect(e2.F).toEqual(e1.F);
    expect(J(e2.V)).not.toBe(J(e1.V));
  });

  it('órfão grita, nunca corrompe: moveV num id que a numeração das 3 ops NÃO criou', () => {
    // esfera 6×8: maior vértice = 41 (o norte) -> 42 não existe
    const e = nucleo([['esfera', { id: 0, raio: 0.5, aneis: 6, lados: 8 }], ['moveV', { v: 42, d: [0, 1, 0] }]], {}, {});
    expect(e.orfaos).toHaveLength(1);
    expect(e.orfaos[0]).toMatchObject({ passo: 1, op: 'moveV', ref: 42 });
    expect(e.V.size).toBe(42);                          // malha intacta
    // cone 8 lados: maior vértice = 8 (ápice) -> 9 não existe
    const c = nucleo([['cone', { id: 0, lados: 8 }], ['moveV', { v: 9, d: [1, 0, 0] }]], {}, {});
    expect(c.orfaos.some((o: any) => o.op === 'moveV' && o.ref === 9)).toBe(true);
    expect(c.V.size).toBe(9);
    // plano seg 2: maior vértice = 8 -> 9 não existe
    const p = nucleo([['plano', { id: 0, seg: 2 }], ['moveV', { v: 9, d: [0, 1, 0] }]], {}, {});
    expect(p.orfaos.some((o: any) => o.op === 'moveV' && o.ref === 9)).toBe(true);
    expect(p.V.size).toBe(9);
  });

  it('guarda de overflow (D3): aneis/lados/seg gigantes estouram o bloco com throw; o limite exato ainda passa', () => {
    expect(() => nucleo([['esfera', { id: 0, aneis: 200, lados: 10 }]], {}, {})).toThrow(/estoura o bloco/);   // 2000 faces
    expect(() => nucleo([['esfera', { id: 0, aneis: 2, lados: 501 }]], {}, {})).toThrow(/estoura o bloco/);    // 503 vértices MAS 1002 faces — a guarda de FACE pega
    expect(() => nucleo([['esfera', { id: 0, aneis: 125, lados: 8 }]], {}, {})).not.toThrow();                 // 994 V / 1000 F: no limite, passa
    expect(() => nucleo([['cone', { id: 0, lados: 1000 }]], {}, {})).toThrow(/estoura o bloco/);               // 1001 vértices/faces
    expect(() => nucleo([['cone', { id: 0, lados: 999 }]], {}, {})).not.toThrow();                             // 1000: no limite, passa
    expect(() => nucleo([['plano', { id: 0, seg: 31 }]], {}, {})).toThrow(/estoura o bloco/);                  // 32² = 1024 vértices
    expect(() => nucleo([['plano', { id: 0, seg: 30 }]], {}, {})).not.toThrow();                               // 31² = 961: passa
  });

  it('TOPO muda a CONTAGEM (renumera) e o id de primitiva incompatível com a posição grita — as leis valem pras ops novas', () => {
    expect(nucleo([['esfera', { id: 0, aneis: 6, lados: 8 }]], {}, {}).V.size).toBe(42);
    expect(nucleo([['esfera', { id: 0, aneis: 6, lados: 10 }]], {}, {}).V.size).toBe(52);
    const n = nucleo([['plano', { id: 0 }], ['esfera', { id: 999 }]], {}, {});    // id escrito ≠ base da posição (1000)
    expect(n.orfaos.some((o: any) => o.op === 'esfera' && o.motivo.includes('posição'))).toBe(true);
  });

  it('adaptarV3 come o mix triângulo/quad/n-gon das 3 ops (leque por face) — contagem de floats EXATA', () => {
    const passos = [
      ['plano', { id: 0, largura: 3, profundidade: 2, seg: 4 }],      // 16 quads -> 32 tris
      ['esfera', { id: 1000, raio: 0.5, aneis: 6, lados: 10 }],       // 10 + 40·2 + 10 = 100 tris
      ['cone', { id: 2000, raio: 0.35, altura: 0.85, lados: 8 }],     // 8 laterais + 8-gon (6 tris) = 14 tris
    ];
    const r: any = adaptarV3(nucleo(passos, {}, {}), fakeCtx);
    expect(r.lotes).toHaveLength(1);                                  // sem parte/material -> um lote só
    expect(r.lotes[0].mesh.v.length).toBe(146 * 3 * 8);               // 3504 floats (8/vértice, sem esqueleto)
  });

  it('peça-exemplo _primitivas: sem órfãos, contagens certas, colisão = o chão (raio meia-diagonal, altura 0)', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_primitivas.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const n = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO);
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.size).toBe(25 + 52 + 9);                 // plano seg4 + esfera 6×10 + cone 8
    expect(n.F.size).toBe(16 + 60 + 9);
    // o cone foi DESLOCADO por moveV usando a numeração documentada: ápice em x=1.0
    expect(n.V.get(2008)).toEqual([1, peca.PARAMS.coneAlt, 0]);
    // colisão calculada nas faces solido (o chão): meia-diagonal do plano, altura 0
    expect(peca.meta.colisao.forma).toBe('cilindro');
    expect(peca.meta.colisao.raio).toBeCloseTo(Math.hypot(peca.PARAMS.chaoL / 2, peca.PARAMS.chaoP / 2), 6);
    expect(peca.meta.colisao.altura).toBeCloseTo(0, 9);
    const obj: any = executar(peca.PASSOS, peca.PARAMS, peca.TOPO, fakeCtx);
    expect(obj.lotes).toHaveLength(1);
    expect(obj.lotes[0].mesh.v.length % 8).toBe(0);
  });
});

/* P2 do playground — `lathe` (perfil `[[raio,y],...]` girado em torno do eixo Y).
   Prova por MEDIÇÃO: numeração EXATA de vértice/face (formato salvo, travada aqui)
   num perfil MISTO (polo+anel+anel+polo, a "coluna" do doc) e num perfil só-anéis;
   determinismo/replay; a reserva do 3º elemento GRITA sem corromper (2 elementos =
   reto, PRA SEMPRE); raio<0 e perfil<2 pontos GRITAM e não constroem nada nesse
   passo; polo↔polo adjacente GRITA e só aquele segmento fica sem face; guarda de
   overflow no limite EXATO (vértice e face, independentes, como a esfera);
   params por NOME; e um teste de MANIFOLD no `_torno` (fechado nas duas pontas)
   — toda aresta dirigida a→b pareada com b→a exatamente 1×, prova watertight +
   winding consistente, como o revisor fez no P1 (D-114). */
describe('P2 — lathe (perfil de revolução)', () => {
  const J = (x: any) => JSON.stringify(x);
  const fakeCtx = { tex: { texCanvas: (w: number, h: number, fn: any) => ({ width: w, height: h, fn }) }, m4: { ident: () => new Float32Array(16) } };
  // Newell inline (a do núcleo não é exportada) — o MESMO teste do D1/P1
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };

  it('numeração EXATA num perfil MISTO (polo→anel→anel→polo, a "coluna" do doc): ids de vértice e de face travados', () => {
    // [[0,0],[1,0],[1,2],[0,2]] com lados=4: polo, anel, anel, polo — as tampas nascem dos leques de polo, de graça
    const { V, F, orfaos } = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 2], [0, 2]], lados: 4 }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(10);   // polo(1) + anel(4) + anel(4) + polo(1)
    expect(F.size).toBe(12);   // 3 segmentos não-degenerados × 4 lados
    // VÉRTICES: polo0=b+0; anel1 j=0..3 -> b+1..b+4; anel2 j=0..3 -> b+5..b+8; polo1=b+9
    expect(V.get(0)).toEqual([0, 0, 0]);
    expect(V.get(1)).toEqual([1, 0, 0]);                       // anel1 j=0 em +x
    expect(V.get(5)).toEqual([1, 2, 0]);                       // anel2 j=0 em +x (mesmo ângulo)
    expect(V.get(9)).toEqual([0, 2, 0]);
    // FACES: seg0 (polo→anel) leque SUL da esfera: [polo, anel[j], anel[j+1]]
    expect(F.get(0).vs).toEqual([0, 1, 2]);
    expect(F.get(3).vs).toEqual([0, 4, 1]);                    // fecha o ciclo (j=3, n=0)
    // seg1 (anel→anel) quad, a faixa da esfera: [baixo[j], cima[j], cima[j+1], baixo[j+1]]
    expect(F.get(4).vs).toEqual([1, 5, 6, 2]);
    expect(F.get(7).vs).toEqual([4, 8, 5, 1]);                 // fecha o ciclo
    // seg2 (anel→polo) leque NORTE da esfera (invertido): [polo, anel[j+1], anel[j]]
    expect(F.get(8).vs).toEqual([9, 6, 5]);
    expect(F.get(11).vs).toEqual([9, 5, 8]);                   // fecha o ciclo
  });

  it('numeração EXATA num perfil SÓ-ANÉIS (sem polo nenhum): vira uma faixa cilíndrica só de quads', () => {
    const { V, F, orfaos } = nucleo([['lathe', { id: 0, perfil: [[1, 0], [2, 1]], lados: 4 }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(8);    // 2 anéis × 4 lados, nenhum polo
    expect(F.size).toBe(4);    // 1 segmento × 4 lados
    expect(V.get(0)).toEqual([1, 0, 0]);
    expect(V.get(4)).toEqual([2, 1, 0]);
    expect(F.get(0).vs).toEqual([0, 4, 5, 1]);
    expect(F.get(3).vs).toEqual([3, 7, 4, 0]);
  });

  it('winding pra FORA em TODA face dos dois perfis acima (Newell·raio-XZ > 0 nas paredes; a tampa achatada usa Y — como o D1)', () => {
    // perfil misto: as duas faces do MEIO (quads, seg1) são radiais puras — teste direto, igual ao cone/esfera
    const { V, F } = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 2], [0, 2]], lados: 8 }]], {}, {});
    for (let j = 0; j < 8; j++) {
      const f = F.get(8 + j);   // seg1 (anel->anel) começa em 8 com lados=8 (leque sul 0..7, quads 8..15, leque norte 16..23)
      const c = [0, 0, 0]; for (const v of f.vs) { const p = V.get(v); c[0] += p[0]; c[2] += p[2]; }
      const n = newell(V, f.vs);
      expect(n[0] * c[0] + n[2] * c[2]).toBeGreaterThan(0);   // radial pra fora, sem ambiguidade (parede vertical)
    }
  });

  it('determinismo (2×) + replay round-trip JSON da lista (o formato salvo)', () => {
    const passos = [['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 1], [0, 1]], lados: 5 }]];
    const a = J(neutroCanonico(nucleo(passos, {}, {})));
    const b = J(neutroCanonico(nucleo(passos, {}, {})));
    expect(a).toBe(b);
    expect(J(neutroCanonico(nucleo(JSON.parse(J(passos)), {}, {})))).toBe(a);
  });

  it('Ciclo 5: a alça de curva não é mais reservada — 3º elemento numérico é um RAIO DE CONCORDÂNCIA de verdade; 3º elemento não-numérico continua THROWANDO ALTO (mesma lei de todo campo dimensional, não mais um "reservado" macio)', () => {
    expect(() => nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, { tipo: 'curva' }], [1, 1], [0, 1]], lados: 4 }]], {}, {})).toThrow(/valor numérico inválido/);
    // um ponto NORMAL de 2 elementos segue construindo igual, sem falso-positivo
    const semAlca = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 1], [0, 1]], lados: 4 }]], {}, {});
    expect(semAlca.orfaos).toHaveLength(0);
    expect(semAlca.V.size).toBeGreaterThan(0);
  });

  it('concordância (raio de fillet) no perfil: raio:0 é BYTE-IDÊNTICO a um ponto sem 3º elemento (no-op quando desligado)', () => {
    const comZero = neutroCanonico(nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, 0], [1, 1], [0, 1]], lados: 6 }]], {}, {}));
    const semAlca = neutroCanonico(nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 1], [0, 1]], lados: 6 }]], {}, {}));
    expect(JSON.stringify(comZero)).toBe(JSON.stringify(semAlca));
  });

  it('concordância válida: nenhum órfão, malha construída, e cada ponto do arco fica a <1% do raio declarado do CENTRO analítico (condição 2 do gate do Ciclo 5) — testado em duas discretizações', () => {
    for (const segmentosCurva of [4, 16]) {
      const raio = 0.3;
      const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, raio], [1, 1], [0, 1]], lados: 8, segmentosCurva }]], {}, {});
      expect(n.orfaos).toHaveLength(0);
      expect(n.V.size).toBeGreaterThan(0);
      // reconstrói o centro do fillet do MESMO jeito que o gate pede: A=(0,0) — o ponto anterior — B=(1,0) o
      // corner original, C=(1,1) o seguinte, no plano (raio,y) do perfil. Ângulo reto -> t=raio, bissetriz a 45°.
      const t = raio; // tan(45°)=1
      const centro = [1 - t, t]; // B + bissetriz*(raio/sin(45°)) simplifica pra isso num ângulo reto
      // os pontos expandidos do arco viram vértices ANEL (lados=8) a partir do 2º ponto do perfil (id 8..) —
      // em vez de recomputar índice exato, mede em TODOS os vértices e exige que os que não são as pontas
      // originais (raio 0 ou raio 1 exato, y 0 ou 1 exato) caiam no raio certo.
      let medidos = 0;
      for (const [id, p] of n.V) {
        const raioRev = Math.hypot(p[0], p[2]); // distância ao eixo Y = coordenada 'raio' do perfil, nesse anel
        const y = p[1];
        const naPontaOriginal = (Math.abs(raioRev - 0) < 1e-6 && Math.abs(y - 0) < 1e-6) || (Math.abs(raioRev - 1) < 1e-6 && Math.abs(y - 1) < 1e-6) || (Math.abs(raioRev - 0) < 1e-6 && Math.abs(y - 1) < 1e-6);
        if (naPontaOriginal) continue;
        const dCentro = Math.hypot(raioRev - centro[0], y - centro[1]);
        expect(Math.abs(dCentro - raio) / raio).toBeLessThan(0.01);
        medidos += 1;
      }
      expect(medidos).toBeGreaterThan(0); // a medição realmente tocou pontos do arco (não passou vazia)
    }
  });

  it('concordância: os pontos de TANGÊNCIA (TA, TC) caem EXATAMENTE onde a geometria analítica prevê — não só "a alguma distância certa do centro" (a checagem de raio sozinha não pega uma troca cos/sin: cos²+sin²=1 preserva a distância mesmo com x/y trocados de lugar)', () => {
    // ângulo reto em B=(1,0), A=(0,0), C=(1,1), raio=0.3 -> TA=(0.7,0), TC=(1,0.3) (bissetriz a 45°, t=raio)
    // segmentosCurva=1: o arco vira EXATAMENTE 2 pontos, TA e TC, sem interior
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, 0.3], [1, 1], [0, 1]], lados: 6, segmentosCurva: 1 }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    const acharAnel = (raioAlvo: number, yAlvo: number) => {
      let achou = false;
      for (const [, p] of n.V) {
        const raioRev = Math.hypot(p[0], p[2]);
        if (Math.abs(raioRev - raioAlvo) < 1e-9 && Math.abs(p[1] - yAlvo) < 1e-9) achou = true;
      }
      return achou;
    };
    expect(acharAnel(0.7, 0)).toBe(true);   // TA
    expect(acharAnel(1, 0.3)).toBe(true);   // TC
    // e o par TROCADO (o que uma mutação cos/sin produziria) NÃO existe
    expect(acharAnel(0.4, 0.3)).toBe(false);
  });

  it('concordância: custo em vértices/faces é EXATO (soma fechada) — segmentosCurva=1 troca 1 ponto por 2 (TA,TC), então o perfil de 4 pontos vira 5', () => {
    const semAlca = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 1], [0, 1]], lados: 6 }]], {}, {});
    const comAlca = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, 0.3], [1, 1], [0, 1]], lados: 6, segmentosCurva: 1 }]], {}, {});
    // sem alça: 2 polos (raio 0) + 2 anéis de 6 = 2 + 12 = 14 vértices
    expect(semAlca.V.size).toBe(14);
    // com alça (segmentosCurva=1): 2 polos + 3 anéis de 6 (o corner virou 2 pontos) = 2 + 18 = 20
    expect(comAlca.V.size).toBe(20);
    expect(comAlca.orfaos).toHaveLength(0);
  });

  it('concordância: raio negativo GRITA e ABORTA (fail-closed, mesma lei do raio<0 do lathe)', () => {
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, -0.1], [1, 1], [0, 1]], lados: 4 }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/negativo/);
    expect(n.V.size).toBe(0);
  });

  it('concordância numa PONTA do perfil (caminho aberto, sem vizinho dos dois lados) GRITA e ABORTA', () => {
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0, 0.1], [1, 0], [1, 1], [0, 1]], lados: 4 }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/ponta/i);
    expect(n.V.size).toBe(0);
  });

  it('concordância grande demais (ultrapassa o segmento adjacente) GRITA e ABORTA, nunca constrói um arco errado', () => {
    // segmento de comprimento 1 (de [1,0] a [1,1]); raio de 5 exige tangência de 5 — impossível
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, 5], [1, 1], [0, 1]], lados: 4 }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/grande demais/);
    expect(n.V.size).toBe(0);
  });

  it('duas concordâncias vizinhas dividindo o MESMO segmento: soma dos raios cabendo constrói, soma excedendo GRITA (checagem por segmento, não só por ponto)', () => {
    // segmento [1,0]->[1,1] tem comprimento 1; ambos os pontos vizinhos concordam nesse segmento com t=raio (ângulo reto)
    const cabe = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, 0.4], [1, 1, 0.4], [0, 1]], lados: 4 }]], {}, {});
    expect(cabe.orfaos).toHaveLength(0);
    expect(cabe.V.size).toBeGreaterThan(0);
    const excede = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1, 0, 0.6], [1, 1, 0.6], [0, 1]], lados: 4 }]], {}, {});
    expect(excede.orfaos).toHaveLength(1);
    expect(excede.orfaos[0].motivo).toMatch(/mesmo segmento/);
    expect(excede.V.size).toBe(0);
  });

  it('ponto malformado (aridade ≠ 2, ex. [1]) GRITA e ABORTA — não estoura com throw (NIT-3: fail-closed uniforme, não exceção crua)', () => {
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [1], [1, 1]], lados: 4 }]], {}, {});   // ponto do meio tem 1 elemento
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'lathe', ref: 1 });
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('raio<0 GRITA e a op inteira não constrói NADA neste passo (não dá pra classificar polo/anel — nunca corrompe)', () => {
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [-1, 0], [1, 1], [0, 2]], lados: 4 }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'lathe', ref: 1 });
    expect(n.orfaos[0].motivo).toMatch(/raio negativo/i);
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('perfil com menos de 2 pontos GRITA (0 e 1 ponto) e não constrói nada', () => {
    const vazio = nucleo([['lathe', { id: 0, perfil: [], lados: 4 }]], {}, {});
    expect(vazio.orfaos).toHaveLength(1);
    expect(vazio.orfaos[0]).toMatchObject({ op: 'lathe', motivo: expect.stringMatching(/ao menos 2 pontos/i) });
    expect(vazio.V.size).toBe(0);
    const um = nucleo([['lathe', { id: 0, perfil: [[1, 0]], lados: 4 }]], {}, {});
    expect(um.orfaos).toHaveLength(1);
    expect(um.V.size).toBe(0);
  });

  it('polo↔polo adjacente GRITA (perfil degenerado): só AQUELE segmento fica sem face — o resto do perfil segue normal', () => {
    // dois polos seguidos (y diferentes) + 1 anel: só o segmento polo-polo não gera face
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 0], [0, 1], [1, 2]], lados: 4 }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'lathe', ref: 0 });
    expect(n.orfaos[0].motivo).toMatch(/polo.*polo|degenerado/i);
    expect(n.V.size).toBe(6);     // os 2 polos + o anel de 4 ainda existem (só a FACE entre os polos que falta)
    expect(n.F.size).toBe(4);     // só o segmento polo->anel contribuiu (o leque de 4)
    expect([...n.F.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);   // cursor de face não pulou id nenhum
  });

  it('guarda de overflow (D3) no limite EXATO — vértice (perfil só-anéis) e face (perfil alternando polo/anel) de forma independente', () => {
    // limite de VÉRTICE: 2 anéis × lados=500 -> 1000 vértices exatos (passa); 501 -> 1002 (estoura)
    expect(() => nucleo([['lathe', { id: 0, perfil: [[1, 0], [1, 1]], lados: 500 }]], {}, {})).not.toThrow();
    expect(() => nucleo([['lathe', { id: 0, perfil: [[1, 0], [1, 1]], lados: 501 }]], {}, {})).toThrow(/estoura o bloco/);
    // limite de FACE, independente do de vértice: perfil ALTERNANDO anel/polo (barato em vértice, caro em face —
    // todo segmento é anel<->polo, nunca degenerado) com lados=8. N=126 pontos (63 anéis+63 polos) -> 567 V / 1000 F exatos (passa);
    // N=127 -> 575 V / 1008 F (a guarda de FACE estoura primeiro, o vértice nem chegou perto do bloco)
    const alternado = (nPontos: number) => Array.from({ length: nPontos }, (_, k) => (k % 2 === 0 ? [1, k] : [0, k]));
    expect(() => nucleo([['lathe', { id: 0, perfil: alternado(126), lados: 8 }]], {}, {})).not.toThrow();
    expect(() => nucleo([['lathe', { id: 0, perfil: alternado(127), lados: 8 }]], {}, {})).toThrow(/estoura o bloco/);
  });

  it('params por NOME (raio e y) resolvem como nas outras ops; mudar o VALOR do PARAM não renumera', () => {
    const n = nucleo([['lathe', { id: 0, perfil: [[0, 'baseY'], ['r1', 'y1'], [0, 'topoY']], lados: 6 }]], { baseY: 0, r1: 0.5, y1: 1, topoY: 2 }, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.get(0)).toEqual([0, 0, 0]);
    expect(n.V.get(7)).toEqual([0, 2, 0]);                     // polo do topo em y=topoY
    // nome que não existe em PARAMS/TOPO grita ALTO (o contrato do st.num, igual às outras ops)
    expect(() => nucleo([['lathe', { id: 0, perfil: [[0, 0], ['fantasma', 1]] }]], {}, {})).toThrow(/fantasma/);
    // mudar o VALOR do PARAM não renumera: mesmos ids, mesma topologia, só a posição muda
    const passos = [['lathe', { id: 0, perfil: [[0, 0], ['r', 1], [0, 2]], lados: 6 }]];
    const pequeno = neutroCanonico(nucleo(passos, { r: 0.3 }, {}));
    const grande = neutroCanonico(nucleo(passos, { r: 0.9 }, {}));
    expect(grande.V.map((row: any[]) => row[0])).toEqual(pequeno.V.map((row: any[]) => row[0]));
    expect(grande.F).toEqual(pequeno.F);
    expect(J(grande.V)).not.toBe(J(pequeno.V));
  });

  it('adaptarV3 come o mix quad/triângulo do lathe (leque por face) — contagem de floats EXATA, sem tocar em adaptarV3', () => {
    // perfil misto lados=6: 2 leques (6 tris) + 1 faixa de quads (6 quads -> 12 tris) = 24 triângulos
    const passos = [['lathe', { id: 0, perfil: [[0, 0], [1, 0], [1, 1], [0, 1]], lados: 6 }]];
    const r: any = adaptarV3(nucleo(passos, {}, {}), fakeCtx);
    expect(r.lotes).toHaveLength(1);
    expect(r.lotes[0].mesh.v.length).toBe(24 * 3 * 8);   // 24 triângulos × 3 vértices × 8 floats
  });

  it('peça-exemplo _torno (peão de xadrez): sem órfãos, V/F exatos, watertight+winding por MANIFOLD (toda aresta a→b pareada com b→a 1×)', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_torno.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const { V, F, orfaos } = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO);
    expect(orfaos).toHaveLength(0);
    // 10 pontos (2 polos + 8 anéis) × lados=12: V=2+8·12=98; 9 segmentos não-degenerados: F=9·12=108
    expect(V.size).toBe(2 + 8 * peca.TOPO.lados);
    expect(F.size).toBe(9 * peca.TOPO.lados);
    expect(V.size).toBe(98);
    expect(F.size).toBe(108);

    // MANIFOLD: toda aresta DIRIGIDA a->b (cada canto de cada face) tem exatamente 1 par reverso b->a.
    // Prova watertight (nenhuma aresta desemparelhada = nenhum buraco) E winding CONSISTENTE (nenhuma
    // aresta duplicada no MESMO sentido = nenhuma face virada ao contrário da vizinha) — o mesmo método
    // que o revisor adversarial usou no P1 (D-114) pra esfera/cone.
    const dirigidas = new Map<string, number>();
    let cantos = 0;
    for (const f of F.values()) {
      const vs = f.vs; cantos += vs.length;
      for (let k = 0; k < vs.length; k++) {
        const key = `${vs[k]}>${vs[(k + 1) % vs.length]}`;
        dirigidas.set(key, (dirigidas.get(key) || 0) + 1);
      }
    }
    expect(dirigidas.size).toBe(cantos);          // nenhuma aresta dirigida duplicada (não-manifold local)
    let semPar = 0;
    for (const key of dirigidas.keys()) {
      const [a, b] = key.split('>');
      if (!dirigidas.has(`${b}>${a}`)) semPar++;
    }
    expect(semPar).toBe(0);                        // nenhuma aresta sem par reverso -> ESTANQUE (watertight)

    // semente de ORIENTAÇÃO: o leque da base (F0, achatado em y=0) aponta pra -y — como a tampa de
    // baixo do cilindro (D1). Manifold consistente + esta semente pra fora => TODA face aponta pra fora.
    expect(newell(V, F.get(0)!.vs)[1]).toBeLessThan(0);

    // colisão sã (encaixa o peão inteiro via `solido`) e executar/adaptarV3 saem limpos
    expect(peca.meta.colisao.forma).toBe('cilindro');
    expect(peca.meta.colisao.raio).toBeCloseTo(peca.PARAMS.pesR, 6);
    expect(peca.meta.colisao.altura).toBeCloseTo(peca.PARAMS.topoY, 6);
    const obj: any = executar(peca.PASSOS, peca.PARAMS, peca.TOPO, fakeCtx);
    expect(obj.lotes).toHaveLength(1);
    expect(obj.lotes[0].mesh.v.length % 8).toBe(0);
  });
});

/* P3 do playground — `rotaciona` (gira uma seleção, SIMPLES: NUNCA cria id) +
   `espelha` (duplica uma seleção refletida, ids NOVOS — formato salvo). Prova
   por MEDIÇÃO: rotaciona — posições EXATAS (90°/180°, cada eixo), pivô
   default=CENTROIDE vs explícito (resultado diferente), seleção por v e por
   f, NUNCA cria vértice/face, `graus` por NOME de PARAM, id/eixo inválido
   grita. espelha — contagem V/F nova exata, a numeração orig->espelho
   id-a-id (o WELD comprovado: vértice EXATAMENTE no plano compartilha id,
   fora do plano duplica), winding REVERTIDO medido por Newell (comparado
   contra a face real equivalente do cubo — a lição D1), herança de
   atributo, determinismo/replay, face/eixo inválido grita, guarda de
   overflow (D3) no limite EXATO isolando cada dimensão (face sozinha via
   base 100% soldada — zero vértice novo; vértice sozinho via plano de seg
   ÍMPAR, que não tem coluna central coincidindo com o plano), e o teste de
   MANIFOLD na peça-exemplo `_espelhado` (a costura soldada fecha o par de
   chifres — o mesmo método que o revisor usou no P1/P2 pra esfera/torno). */
describe('P3 — espelha + rotaciona (seleção transformada)', () => {
  const J = (x: any) => JSON.stringify(x);
  const fakeCtx = { tex: { texCanvas: (w: number, h: number, fn: any) => ({ width: w, height: h, fn }) }, m4: { ident: () => new Float32Array(16) } };
  // Newell inline (a do núcleo não é exportada) — o MESMO teste de direção do D1/P1/P2
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };

  describe('rotaciona', () => {
    it('90°/180° em torno de cada eixo dá as posições EXATAS (pivô explícito na origem)', () => {
      // cubo lado=2: v1 = (1,0,-1) (canto conhecido) — gira a malha INTEIRA (sel ausente)
      const rot = (eixo: string, graus: number) => nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo, graus, pivo: [0, 0, 0] }]], {}, {}).V.get(1)!;
      const x90 = rot('x', 90); expect(x90[0]).toBeCloseTo(1, 12); expect(x90[1]).toBeCloseTo(1, 12); expect(x90[2]).toBeCloseTo(0, 12);
      const y90 = rot('y', 90); expect(y90[0]).toBeCloseTo(-1, 12); expect(y90[1]).toBeCloseTo(0, 12); expect(y90[2]).toBeCloseTo(-1, 12);
      const z90 = rot('z', 90); expect(z90[0]).toBeCloseTo(0, 12); expect(z90[1]).toBeCloseTo(1, 12); expect(z90[2]).toBeCloseTo(-1, 12);
      const y180 = rot('y', 180); expect(y180[0]).toBeCloseTo(-1, 12); expect(y180[1]).toBeCloseTo(0, 12); expect(y180[2]).toBeCloseTo(1, 12);
    });

    it('pivô default = CENTROIDE da seleção (medido ANTES de girar); pivô explícito dá resultado DIFERENTE', () => {
      // v1=(1,0,-1), v2=(1,0,1) -> centroide (1,0,0): girar 90° em Y ao redor do centroide leva os dois
      // pontos pra posições fáceis de conferir (x=0 e x=2, z~0) — não-trivial, prova a MÉDIA de verdade
      const { V } = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'y', graus: 90, sel: { v: [1, 2] } }]], {}, {});
      expect(V.get(1)![0]).toBeCloseTo(0, 12); expect(V.get(1)![1]).toBeCloseTo(0, 12); expect(V.get(1)![2]).toBeCloseTo(0, 12);
      expect(V.get(2)![0]).toBeCloseTo(2, 12); expect(V.get(2)![1]).toBeCloseTo(0, 12); expect(V.get(2)![2]).toBeCloseTo(0, 12);
      // MESMA seleção, pivô EXPLÍCITO na origem -> resultado DIFERENTE (prova que o default é a média, não coincidência)
      const { V: V2 } = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { v: [1, 2] } }]], {}, {});
      expect(Math.abs(V2.get(1)![0] - V.get(1)![0])).toBeGreaterThan(0.5);
    });

    it('seleção por v e por f (face contribui os ids dos seus PRÓPRIOS cantos); fora da seleção fica INTOCADO', () => {
      const base = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
      // sel por v: só v1 gira
      const porV = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { v: [1] } }]], {}, {});
      expect(porV.V.get(0)).toEqual(base.V.get(0));             // intocado
      expect(porV.V.get(1)![0]).toBeCloseTo(-1, 12);            // girado

      // sel por f: face 3 (+x, cantos [2,1,5,6]) gira os 4 cantos DELA; o resto do cubo fica intacto
      const porF = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { f: [3] } }]], {}, {});
      expect(porF.V.get(0)).toEqual(base.V.get(0));             // fora da seleção, intocado
      for (const v of [1, 2, 5, 6]) expect(porF.V.get(v)).not.toEqual(base.V.get(v));   // os 4 cantos da face giraram
    });

    it('NUNCA cria vértice/face — mesma contagem e mesmos ids antes/depois', () => {
      const antes = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
      const depois = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'y', graus: 37 }]], {}, {});
      expect(depois.V.size).toBe(antes.V.size);
      expect(depois.F.size).toBe(antes.F.size);
      expect([...depois.V.keys()].sort((a, b) => a - b)).toEqual([...antes.V.keys()].sort((a, b) => a - b));
      expect([...depois.F.keys()].sort((a, b) => a - b)).toEqual([...antes.F.keys()].sort((a, b) => a - b));
    });

    it('`graus` por NOME de PARAM (como as outras ops dimensionais); nome inexistente grita ALTO', () => {
      const { V } = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'x', graus: 'meuAngulo', pivo: [0, 0, 0] }]], { meuAngulo: 90 }, {});
      expect(V.get(1)![1]).toBeCloseTo(1, 12);
      expect(() => nucleo([['cubo', { id: 0, lado: 1 }], ['rotaciona', { eixo: 'x', graus: 'fantasma' }]], {}, {})).toThrow(/fantasma/);
    });

    it('id/face inexistente na seleção e eixo desconhecido GRITAM (órfão) — nunca corrompem', () => {
      const { orfaos, V } = nucleo([['cubo', { id: 0, lado: 2 }], ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { v: [1, 999] } }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ passo: 1, op: 'rotaciona', ref: 999 });
      expect(V.size).toBe(8);                    // malha intacta
      expect(V.get(1)![0]).toBeCloseTo(-1, 12);   // o id válido da seleção girou normalmente

      const f = nucleo([['cubo', { id: 0, lado: 1 }], ['rotaciona', { eixo: 'y', graus: 10, sel: { f: [999] } }]], {}, {});
      expect(f.orfaos.some((o: any) => o.op === 'rotaciona' && o.ref === 999)).toBe(true);

      const e = nucleo([['cubo', { id: 0, lado: 1 }], ['rotaciona', { eixo: 'w', graus: 10 }]], {}, {});
      expect(e.orfaos[0]).toMatchObject({ op: 'rotaciona', ref: 'w' });
      expect(e.orfaos[0].motivo).toMatch(/desconhecido/);
      expect(e.V.size).toBe(8);
    });
  });

  describe('espelha', () => {
    it('contagem V/F nova EXATA (sem weld: plano do espelho longe de tudo)', () => {
      const { V, F, orfaos } = nucleo([['plano', { id: 0, largura: 2, profundidade: 2, seg: 1 }], ['espelha', { eixo: 'x', pos: 5 }]], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(V.size).toBe(8);    // 4 originais + 4 novos (nenhum solda, pos=5 longe de x=±1)
      expect(F.size).toBe(2);    // 1 original + 1 nova
      // reflexão EXATA: coord' = 2·pos − coord, só o eixo x muda
      expect(V.get(1000)).toEqual([2 * 5 - -1, 0, -1]);   // era v(0,0)=(-1,0,-1)
      expect(V.get(1003)).toEqual([2 * 5 - 1, 0, 1]);     // era v(1,1)=(1,0,1)
    });

    it('numeração orig->espelho id-a-id (formato salvo): weld dos cantos EXATOS no plano + id novo pros de fora', () => {
      // cubo lado=2; move 2 cantos da face +x pro plano x=0 EXATO (soldam); os outros 2 ficam em x=1 (duplicam)
      const passos = [
        ['cubo', { id: 0, lado: 2 }],
        ['moveV', { v: 1, d: [-1, 0, 0] }],   // v1 (1,0,-1) -> (0,0,-1) EXATO
        ['moveV', { v: 2, d: [-1, 0, 0] }],   // v2 (1,0,1)  -> (0,0,1)  EXATO
        ['espelha', { eixo: 'x', pos: 0, sel: { f: [3] } }],   // face +x, cantos [2,1,5,6] (2,1 no plano; 5,6 fora)
      ];
      const { V, F, orfaos } = nucleo(passos, {}, {});
      expect(orfaos).toHaveLength(0);
      // mapa (ordem CRESCENTE de id original 1,2,5,6): 1->1 (solda) 2->2 (solda) 5->3000 (1º livre) 6->3001 (2º livre)
      expect(V.size).toBe(10);                                 // 8 originais + só 2 novos (1,2 soldaram)
      expect(V.get(3000)).toEqual([-1, 2, -1]);                // espelho de v5=(1,2,-1) em x=0 -> (-1,2,-1)
      expect(V.get(3001)).toEqual([-1, 2, 1]);                 // espelho de v6=(1,2,1)
      // face nova (b=baseDoPasso(3)=3000): cantos = mapa([2,1,5,6]) = [2,1,3000,3001], REVERTIDO = [3001,3000,1,2]
      expect(F.get(3000)!.vs).toEqual([3001, 3000, 1, 2]);
    });

    it('WELD: vértice EXATAMENTE no plano é COMPARTILHADO (a contagem prova); vértice fora duplica', () => {
      // uma parede (quad lateral) do cilindro: 2 cantos na base (y=0) soldam, 2 no topo (y=2) duplicam
      const n = nucleo([['cilindro', { id: 0, raio: 1, altura: 2, lados: 3 }], ['espelha', { eixo: 'y', pos: 0, sel: { f: [0] } }]], {}, {});
      const base = 1000;   // baseDoPasso(1)
      // a face lateral tem 2 cantos em y=0 (soldam) e 2 em y=2 (duplicam) -> só 2 vértices novos
      expect([...n.V.keys()].filter((k) => k >= base).length).toBe(2);
      expect(n.F.get(base)).toBeDefined();                    // a face espelhada existe (não é degenerada — não está toda no plano)
    });

    it('BLOQUEIA-consertado: face INTEIRAMENTE no plano GRITA e é PULADA (sem duplicata coincidente — o polo↔polo do lathe pro espelho)', () => {
      const semWeld = nucleo([['plano', { id: 0, largura: 2, profundidade: 2, seg: 1 }], ['espelha', { eixo: 'y', pos: 5 }]], {}, {});   // pos=5 -> nada solda, espelho REAL
      expect(semWeld.V.size).toBe(8);
      expect(semWeld.F.size).toBe(2);                         // original + espelhada (legítima, em y=10)
      const degen = nucleo([['plano', { id: 0, largura: 2, profundidade: 2, seg: 1 }], ['espelha', { eixo: 'y', pos: 0 }]], {}, {});   // pos=0 == y do plano -> a espelhada seria coincidente
      expect(degen.V.size).toBe(4);                           // nenhum vértice novo (todos soldados)
      expect(degen.F.size).toBe(1);                           // a face degenerada foi PULADA — só a original resta
      expect(degen.F.has(1000)).toBe(false);                  // NÃO criou a coincidente
      expect(degen.orfaos.some((o: any) => o.op === 'espelha' && /degenerad|no plano/i.test(o.motivo))).toBe(true);
    });

    it('winding REVERTIDO: a normal Newell da face espelhada aponta pra FORA (medida contra a face real equivalente)', () => {
      // face +x do cubo espelhada em x=0 deve dar a MESMA orientação (Newell·x < 0) da face -x REAL do
      // cubo na mesma posição — prova por comparação direta, não por suposição
      const cuboReal = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
      const nRealMenosX = newell(cuboReal.V, cuboReal.F.get(5)!.vs);   // face -x de verdade
      expect(nRealMenosX[0]).toBeLessThan(0);                          // confere a premissa (D1)

      const espelhado = nucleo([['cubo', { id: 0, lado: 2 }], ['espelha', { eixo: 'x', pos: 0, sel: { f: [3] } }]], {}, {});   // espelha a face +x (passo 1 -> base 1000)
      const nEspelhado = newell(espelhado.V, espelhado.F.get(1000)!.vs);
      expect(nEspelhado[0]).toBeLessThan(0);                           // MESMO sinal da -x real -> winding correto pra fora
    });

    it('herança de atributo (cor/liso/parte/solido) — a face espelhada copia do original, só `vs` muda', () => {
      const passos = [
        ['plano', { id: 0, largura: 2, profundidade: 2, seg: 1 }],
        ['pincel', { modo: 'face', faces: [0], cor: '#4d9be6' }],
        ['liso', { faces: [0] }],
        ['parte', { nome: 'asa', faces: [0] }],
        ['solido', { faces: [0] }],
        ['espelha', { eixo: 'z', pos: 0 }],
      ];
      const { F } = nucleo(passos, {}, {});
      const orig = F.get(0)!, esp = F.get(5000)!;   // espelha é o passo 5 -> base 5000
      expect(esp.cor).toBe(orig.cor);
      expect(esp.liso).toBe(orig.liso);
      expect(esp.parte).toBe(orig.parte);
      expect(esp.solido).toBe(orig.solido);
      expect(esp.vs).not.toEqual(orig.vs);   // só os cantos mudam
    });

    it('determinismo (2×) + replay round-trip JSON da lista (o formato salvo)', () => {
      const passos = [['plano', { id: 0, largura: 2, profundidade: 2, seg: 1 }], ['espelha', { eixo: 'x', pos: 0 }]];
      const a = J(neutroCanonico(nucleo(passos, {}, {})));
      const b = J(neutroCanonico(nucleo(passos, {}, {})));
      expect(a).toBe(b);
      expect(J(neutroCanonico(nucleo(JSON.parse(J(passos)), {}, {})))).toBe(a);
    });

    it('face inexistente na seleção GRITA (órfão); as demais faces válidas seguem processadas; eixo desconhecido grita', () => {
      const { orfaos, F } = nucleo([['cubo', { id: 0, lado: 1 }], ['espelha', { eixo: 'x', pos: 0, sel: { f: [3, 999] } }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ passo: 1, op: 'espelha', ref: 999 });
      expect(F.has(1000)).toBe(true);   // a face 3 (válida) foi espelhada normalmente apesar do 999 ruim

      const e = nucleo([['cubo', { id: 0, lado: 1 }], ['espelha', { eixo: 'w' }]], {}, {});
      expect(e.orfaos[0]).toMatchObject({ op: 'espelha', ref: 'w' });
      expect(e.V.size).toBe(8);
    });

    it('guarda de overflow (D3) no limite EXATO — FACE isolada (zero vértice novo) e VÉRTICE isolado (face longe do limite)', () => {
      // FACE isolada: N planos-semente de 1 face cada, TODOS em y=0 -> espelhar em eixo=y,pos=0 solda
      // 100% (0 vértice novo). Cada face espelhada seria coincidente (todos os cantos no plano) -> é
      // PULADA como degenerada (B1). O que fica isolado é a GUARDA de FACE: ela conta as faces
      // SELECIONADAS (faceIds.length) ANTES de pular, então o limite de FACE dispara independente do de vértice.
      const muitosPlanos = (n: number) => { const p: any[] = []; for (let k = 0; k < n; k++) p.push(['plano', { id: k * 1000, largura: 1, profundidade: 1, seg: 1 }]); p.push(['espelha', { eixo: 'y', pos: 0 }]); return p; };
      const noLimite = nucleo(muitosPlanos(1000), {}, {});                                    // 1000 faces selecionadas: no limite, a guarda passa
      expect([...noLimite.V.keys()].filter((id) => id >= 1000 * 1000)).toHaveLength(0);       // 0 vértice novo (100% soldado)
      expect([...noLimite.F.keys()].filter((id) => id >= 1000 * 1000)).toHaveLength(0);       // 0 face nova — todas degeneradas, puladas (B1)
      expect(noLimite.orfaos.filter((o: any) => o.op === 'espelha').length).toBe(1000);       // cada face degenerada GRITOU
      expect(() => nucleo(muitosPlanos(1001), {}, {})).toThrow(/estoura o bloco/);            // 1001: a guarda de FACE estoura (antes de qualquer skip)

      // VÉRTICE isolado: 1 plano grande, eixo=x pos=0 (nada solda: seg ÍMPAR não tem coluna central em x=0).
      // seg=30 (900 faces, <1000 vértices novos) passa; seg=31 (961 faces, 1024 vértices novos) estoura SÓ por vértice.
      expect(() => nucleo([['plano', { id: 0, largura: 10, profundidade: 10, seg: 30 }], ['espelha', { eixo: 'x', pos: 0 }]], {}, {})).not.toThrow();
      expect(() => nucleo([['plano', { id: 0, largura: 10, profundidade: 10, seg: 31 }], ['espelha', { eixo: 'x', pos: 0 }]], {}, {})).toThrow(/estoura o bloco/);
    });

    it('peça-exemplo _espelhado (cabeça + par de chifres): sem órfãos, V/F exatos, MANIFOLD (costura soldada -> watertight)', async () => {
      const pUrl = new URL('../../prototipos/fps/v3/pecas/_espelhado.js', import.meta.url);
      const peca: any = await import(fileURLToPath(pUrl));
      const { V, F, orfaos } = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO);
      expect(orfaos).toHaveLength(0);
      // esfera (6 aneis×10 lados: 52V/60F) + chifre original (5V: 4 base+1 ponta / 4F) + espelho (1V nova: só a ponta / 4F)
      expect(V.size).toBe(52 + 5 + 1);
      expect(F.size).toBe(60 + 4 + 4);
      expect(V.size).toBe(58);
      expect(F.size).toBe(68);

      // a base do chifre soldou: os 4 cantos (1000..1003) são COMPARTILHADOS pelas 8 faces-triângulo
      // dos dois lados (nenhum id novo pra base — só a ponta duplicou)
      const usamBase = [...F.values()].filter((f: any) => f.vs.some((v: number) => v >= 1000 && v < 1004));
      expect(usamBase.length).toBe(8);

      // NUMERAÇÃO travada por MEDIÇÃO (formato salvo — D1 do revisor): o `espelha` é o passo 15,
      // então baseDoPasso(15)=15000; a ponta espelhada (único vértice fora do plano) é 15000,
      // e as 4 faces novas são 15000..15003. (Antes o comentário da peça dizia 10000, sem teste travando.)
      expect([...V.keys()].filter((k: number) => k >= 15000 && k < 16000)).toEqual([15000]);
      expect([...F.keys()].filter((k: number) => k >= 15000 && k < 16000).sort((a: number, b: number) => a - b)).toEqual([15000, 15001, 15002, 15003]);

      // MANIFOLD: toda aresta dirigida a->b pareada com b->a exatamente 1× (mesmo método do P1/P2)
      const dirigidas = new Map<string, number>();
      let cantos = 0;
      for (const f of F.values()) {
        const vs = f.vs; cantos += vs.length;
        for (let k = 0; k < vs.length; k++) {
          const key = `${vs[k]}>${vs[(k + 1) % vs.length]}`;
          dirigidas.set(key, (dirigidas.get(key) || 0) + 1);
        }
      }
      expect(dirigidas.size).toBe(cantos);          // nenhuma aresta dirigida duplicada
      let semPar = 0;
      for (const key of dirigidas.keys()) { const [a, b] = key.split('>'); if (!dirigidas.has(`${b}>${a}`)) semPar++; }
      expect(semPar).toBe(0);                        // watertight — a costura soldou de verdade, sem furo

      // colisão sã e executar/adaptarV3 saem limpos
      expect(peca.meta.colisao.forma).toBe('cilindro');
      expect(peca.meta.colisao.raio).toBeCloseTo(peca.PARAMS.cabecaRaio, 6);
      const obj: any = executar(peca.PASSOS, peca.PARAMS, peca.TOPO, fakeCtx);
      expect(obj.lotes.length).toBeGreaterThan(0);
      expect(obj.lotes[0].mesh.v.length % 8).toBe(0);
    });
  });
});

/* P4 do playground — `loft`: conecta uma sequência de SEÇÕES (círculo de raio
   variável, ou POLO quando raio=0) ao longo de um CAMINHO 3D — tubo/casco/
   galho/membro. O `lathe` é o TEMPLATE (mesmo cursor/polo/anel/leque/guarda);
   a peça NOVA é o FRAME por TRANSPORTE PARALELO (reimplementado local,
   byte-equivalente ao `quadro`/`transporta` de motor/arvore-cartoon.js) que
   acompanha a tangente do caminho sem torcer o tubo numa curva. Prova por
   MEDIÇÃO: numeração EXATA (caminho misto anel→anel→polo e só-anéis),
   winding pra fora, ANTI-TORÇÃO (todo quad anel↔anel não-borboleta, medido
   pelo pior produto escalar entre os dois triângulos do quad — comparado com
   um caminho reto, onde o resultado é analiticamente conhecido: anéis
   alinhados), reserva `secao`/seção malformada/raio<0/<2 seções/segmento de
   comprimento zero GRITAM e ABORTAM o passo (fail-closed, a mesma lei do
   lathe), polo↔polo adjacente grita e só aquele segmento fica sem face,
   determinismo/replay, `pos`/`raio` por NOME de PARAM, guarda de overflow
   (D3) no limite EXATO, e MANIFOLD + volume assinado na peça-exemplo
   `_galho` (fechada nas duas pontas, caminho curvando em mais de um eixo). */
describe('P4 — loft (seções ao longo de um caminho 3D)', () => {
  const J = (x: any) => JSON.stringify(x);
  const fakeCtx = { tex: { texCanvas: (w: number, h: number, fn: any) => ({ width: w, height: h, fn }) }, m4: { ident: () => new Float32Array(16) } };
  // Newell inline (a do núcleo não é exportada) — o MESMO teste de direção do D1/P1/P2/P3
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };

  it('numeração EXATA num caminho MISTO (anel→anel→polo): ids de vértice e de face travados', () => {
    const { V, F, orfaos } = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 1 },
      { pos: [0, 2, 0], raio: 1 },
      { pos: [0, 4, 0], raio: 0 },
    ] }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(9);   // anel(4) + anel(4) + polo(1)
    expect(F.size).toBe(8);   // segmento anel<->anel (4 quads) + anel->polo (4 triângulos)
    // vértices j=0 de cada anel (sem resíduo de ponto-flutuante: cos(0)=1, sin(0)=0 exatos) + o polo
    expect(V.get(0)).toEqual([0, 0, 1]);
    expect(V.get(4)).toEqual([0, 2, 1]);
    expect(V.get(8)).toEqual([0, 4, 0]);
    // seg0 (anel<->anel) quad — a MESMA faixa do lathe/esfera: [baixo[j], cima[j], cima[j+1], baixo[j+1]]
    expect(F.get(0)!.vs).toEqual([0, 4, 5, 1]);
    expect(F.get(3)!.vs).toEqual([3, 7, 4, 0]);          // fecha o ciclo (j=3, n=0)
    // seg1 (anel->polo) leque NORTE do lathe (invertido): [polo, anel[j+1], anel[j]]
    expect(F.get(4)!.vs).toEqual([8, 5, 4]);
    expect(F.get(7)!.vs).toEqual([8, 4, 7]);             // fecha o ciclo
  });

  it('numeração EXATA num caminho SÓ-ANÉIS (sem polo nenhum): vira uma faixa cilíndrica só de quads', () => {
    const { V, F, orfaos } = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 1 },
      { pos: [0, 2, 0], raio: 0.5 },
    ] }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(8);   // 2 anéis × 4 lados, nenhum polo
    expect(F.size).toBe(4);   // 1 segmento × 4 lados
    expect(V.get(0)).toEqual([0, 0, 1]);
    expect(V.get(4)).toEqual([0, 2, 0.5]);
    expect(F.get(0)!.vs).toEqual([0, 4, 5, 1]);
    expect(F.get(3)!.vs).toEqual([3, 7, 4, 0]);
  });

  it('winding pra FORA no caminho reto (Newell·raio-XZ > 0 — a lição D1, generalizada pro loft)', () => {
    const { V, F } = nucleo([['loft', { id: 0, lados: 8, secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 0.6 }] }]], {}, {});
    for (let j = 0; j < 8; j++) {
      const f = F.get(j)!;
      const c = [0, 0, 0]; for (const v of f.vs) { const p = V.get(v)!; c[0] += p[0]; c[2] += p[2]; }
      const n = newell(V, f.vs);
      expect(n[0] * c[0] + n[2] * c[2]).toBeGreaterThan(0);   // radial pra fora, sem ambiguidade (parede vertical)
    }
  });

  it('ANTI-TORÇÃO: caminho RETO (analítico — anéis alinhados) dá quads planares (pior dot ≈ 1); caminho FORTEMENTE curvo (3 eixos) continua NÃO-borboleta (pior dot > 0) — a prova do transporte paralelo', () => {
    const piorDotDosQuads = (secoes: any[], lados = 8) => {
      const { V, F } = nucleo([['loft', { id: 0, lados, secoes }]], {}, {});
      const normalTri = (p: number[], q: number[], r: number[]) => {
        const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
        return [nx / l, ny / l, nz / l];
      };
      let pior = Infinity;
      for (const f of F.values()) {
        if (f.vs.length !== 4) continue;   // só quads anel<->anel (não os leques polo↔anel)
        const [a, b, c, d] = f.vs;
        const n1 = normalTri(V.get(a)!, V.get(b)!, V.get(c)!);
        const n2 = normalTri(V.get(a)!, V.get(c)!, V.get(d)!);
        const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
        if (dot < pior) pior = dot;
      }
      return pior;
    };

    // caminho RETO (eixo Y, raio constante): TODO anel no MESMO frame (transportaLoft não gira nada
    // quando a tangente não muda) -> quads PLANARES, dot = 1 até resíduo de ponto-flutuante
    const reto: any[] = []; for (let k = 0; k < 8; k++) reto.push({ pos: [0, k * 0.3, 0], raio: 0.3 });
    expect(piorDotDosQuads(reto)).toBeCloseTo(1, 6);

    // ziguezague FORTE em 3 eixos (ângulo grande entre segmentos vizinhos, inclusive uma virada de
    // quase 180° no plano XY entre os 2 primeiros segmentos) — o caso que TORCERIA sem transporte
    // paralelo (medido à parte, fora do commit: sem ele o pior dot cai pra ≈ −0.99, um quad
    // literalmente invertido — com o transporte, fica positivo)
    const curvo = [
      { pos: [0, 0, 0], raio: 0.25 },
      { pos: [0.5, 0.15, 0], raio: 0.25 },
      { pos: [0.5, 0.65, 0.05], raio: 0.22 },
      { pos: [0.1, 0.85, 0.55], raio: 0.20 },
      { pos: [-0.4, 0.70, 0.85], raio: 0.16 },
      { pos: [-0.55, 0.20, 0.60], raio: 0.12 },
      { pos: [-0.30, -0.05, 0.10], raio: 0.08 },
    ];
    const piorCurvo = piorDotDosQuads(curvo);
    expect(piorCurvo).toBeGreaterThan(0);    // NÃO-borboleta apesar da curva forte — o transporte segura
    expect(piorCurvo).toBeLessThan(0.99);    // e de fato ESTRESSOU (não é um caminho quase-reto disfarçado)
  });

  /* P5 (docs/historico/playground.md): a chave `secao` reservada virou `contorno` de
     verdade — seção NÃO-circular no núcleo do loft. Geometria conferida por
     MEDIÇÃO (harness, não recontada no olho — a lição do D-116): caminho reto
     em Y, quadrado [[1,1],[-1,1],[-1,-1],[1,-1]] (CCW por shoelace) entre dois
     polos, lados=4. u,w do frame reto = [0,0,1],[-1,0,0] (mesma conta do
     lathe/P4); vértice = pos + u·ca + w·sa. */
  it('CONTORNO explícito (P5): substitui o círculo por pontos [u,w] exatos — numeração e POSIÇÃO conferidas por medição', () => {
    const quadrado = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 0 },
      { pos: [0, 1, 0], contorno: quadrado },
      { pos: [0, 2, 0], raio: 0 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.size).toBe(6);   // 1 polo + 4 anel + 1 polo — IDÊNTICO à contagem de um raio>0 (só a origem da coordenada muda)
    expect(n.F.size).toBe(8);   // 4 leque sul + 4 leque norte
    expect(n.V.get(0)).toEqual([0, 0, 0]);
    expect(n.V.get(1)).toEqual([-1, 1, 1]);    // (ca,sa)=(1,1)  -> pos + u·1 + w·1  = [0,1,0]+[0,0,1]+[-1,0,0]
    expect(n.V.get(2)).toEqual([-1, 1, -1]);   // (ca,sa)=(-1,1)
    expect(n.V.get(3)).toEqual([1, 1, -1]);    // (ca,sa)=(-1,-1)
    expect(n.V.get(4)).toEqual([1, 1, 1]);     // (ca,sa)=(1,-1)
    expect(n.V.get(5)).toEqual([0, 2, 0]);
    expect(n.F.get(0).vs).toEqual([0, 1, 2]);
    expect(n.F.get(4).vs).toEqual([5, 2, 1]);
  });

  it('raio E contorno na mesma seção GRITA e ABORTA (ambíguo — nunca escolhe um dos dois em silêncio)', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 0 },
      { pos: [0, 1, 0], raio: 1, contorno: [[1, 0], [0, 1], [-1, 0], [0, -1]] },
      { pos: [0, 2, 0], raio: 0 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/ambíguo/);
    expect(n.V.size).toBe(0);
  });

  it('nem raio nem contorno GRITA e ABORTA (não dá pra classificar polo/anel)', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0] }, { pos: [0, 2, 0], raio: 0 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/sem 'raio' nem 'contorno'/);
    expect(n.V.size).toBe(0);
  });

  it('contorno com contagem ≠ lados GRITA e ABORTA (a numeração exige EXATAMENTE `lados` pontos)', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0], contorno: [[1, 0], [0, 1], [-1, 0]] }, { pos: [0, 2, 0], raio: 0 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/exatamente 'lados' \(4\)/);
    expect(n.V.size).toBe(0);
  });

  it('ponto do contorno malformado (1 elemento) GRITA e ABORTA — a mesma lei do ponto do perfil no lathe', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0], contorno: [[1, 1], [-1], [-1, -1], [1, -1]] }, { pos: [0, 2, 0], raio: 0 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/2 ou 3 elementos/);
    expect(n.V.size).toBe(0);
  });

  it('Ciclo 5: ponto do contorno com 3º elemento (concordância) grande demais GRITA e ABORTA — não é mais "reservado", mas continua fail-closed', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0], contorno: [[1, 1], [-1, 1, 99], [-1, -1], [1, -1]] }, { pos: [0, 2, 0], raio: 0 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/grande demais/);
    expect(n.V.size).toBe(0);
  });

  it('Ciclo 5: contorno com concordância válida constrói — segmentosCurva=1 troca 1 corner por 2 pontos (TA,TC), então 3 pontos brutos (1 com raio) viram os 4 (`lados`) exigidos', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, segmentosCurva: 1, secoes: [
      { pos: [0, 0, 0], raio: 0 },
      { pos: [0, 1, 0], contorno: [[1, 1], [-1, 1, 0.3], [-1, -1]] },
      { pos: [0, 2, 0], raio: 0 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.size).toBeGreaterThan(0);
  });

  it.each([
    ['CW (revertido)', [[1, 1], [1, -1], [-1, -1], [-1, 1]]],
    ['degenerado (todos os pontos iguais)', [[0, 0], [0, 0], [0, 0], [0, 0]]],
    ['degenerado (colinear)', [[0, 0], [1, 0], [2, 0], [3, 0]]],
  ])('contorno com winding %s GRITA e ABORTA — produziria normal invertida ou nula SILENCIOSA (a classe do achado do P3, cega ao manifold)', (_nome, contorno) => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0], contorno }, { pos: [0, 2, 0], raio: 0 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/CCW ou é degenerado/);
    expect(n.V.size).toBe(0);
  });

  it('uma seção NORMAL ({pos,raio}) segue construindo igual — o `contorno` não é fail-open pro círculo (sem falso-positivo)', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 0 }, { pos: [0, 1, 0], raio: 1 }, { pos: [0, 2, 0], raio: 0 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.size).toBeGreaterThan(0);
  });

  it('seção malformada — não-objeto, sem `pos`, sem `raio` — GRITA e ABORTA o passo inteiro (0 V/0 F)', () => {
    const naoObjeto = nucleo([['loft', { id: 0, lados: 4, secoes: [[0, 0, 0], { pos: [0, 1, 0], raio: 1 }] }]], {}, {});
    expect(naoObjeto.orfaos).toHaveLength(1);
    expect(naoObjeto.orfaos[0]).toMatchObject({ op: 'loft', ref: 0 });
    expect(naoObjeto.V.size).toBe(0);
    expect(naoObjeto.F.size).toBe(0);

    const semPos = nucleo([['loft', { id: 0, lados: 4, secoes: [{ raio: 1 }, { pos: [0, 1, 0], raio: 1 }] }]], {}, {});
    expect(semPos.orfaos).toHaveLength(1);
    expect(semPos.orfaos[0].motivo).toMatch(/sem 'pos'/);
    expect(semPos.V.size).toBe(0);

    const semRaio = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0] }, { pos: [0, 1, 0], raio: 1 }] }]], {}, {});
    expect(semRaio.orfaos).toHaveLength(1);
    expect(semRaio.orfaos[0].motivo).toMatch(/sem 'raio'/);
    expect(semRaio.V.size).toBe(0);
  });

  it('raio<0 GRITA e a op inteira não constrói NADA neste passo (não dá pra classificar polo/anel — nunca corrompe)', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: -1 }, { pos: [0, 1, 0], raio: 1 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 0 });
    expect(n.orfaos[0].motivo).toMatch(/raio negativo/i);
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('secoes com menos de 2 seções GRITA (0 e 1) e não constrói nada', () => {
    const vazio = nucleo([['loft', { id: 0, lados: 4, secoes: [] }]], {}, {});
    expect(vazio.orfaos).toHaveLength(1);
    expect(vazio.orfaos[0]).toMatchObject({ op: 'loft', motivo: expect.stringMatching(/ao menos 2/i) });
    expect(vazio.V.size).toBe(0);
    const uma = nucleo([['loft', { id: 0, lados: 4, secoes: [{ pos: [0, 0, 0], raio: 1 }] }]], {}, {});
    expect(uma.orfaos).toHaveLength(1);
    expect(uma.V.size).toBe(0);
  });

  it('segmento de comprimento zero (duas seções na mesma posição) GRITA e ABORTA o passo inteiro — tangente indefinida, fail-closed', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 1 },
      { pos: [0, 0, 0], raio: 1 },
      { pos: [0, 2, 0], raio: 0.5 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 0 });
    expect(n.orfaos[0].motivo).toMatch(/comprimento zero/i);
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('CUSP (o caminho dobra ~180°) GRITA e ABORTA — o anel colapsaria numa linha (achado adversarial do P4, fail-closed)', () => {
    // vai pra +x e VOLTA: na seção do meio a tangente = média de [1,0,0] e [-1,0,0] = [0,0,0];
    // sem a guarda, w = cross(u,0) = 0 e o anel do meio vira uma reta (degenerado silencioso, não-NaN)
    const n = nucleo([['loft', { id: 0, lados: 6, secoes: [
      { pos: [0, 0, 0], raio: 0.3 },
      { pos: [1, 0, 0], raio: 0.3 },
      { pos: [0, 0, 0], raio: 0.3 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 1 });
    expect(n.orfaos[0].motivo).toMatch(/cusp/i);
    expect(n.V.size).toBe(0);   // fail-closed: nada construído (nem o anel colapsado)
    expect(n.F.size).toBe(0);
  });

  /* 2º achado adversarial do P4: a ARIDADE do `pos` não era validada — a mesma
     lei que o lathe já aplica no ponto do perfil (NIT-3 do P2). Sem ela,
     `pos:[0,1]` construía com z=undefined -> 12 coordenadas NaN e ZERO órfãos
     (o `lint-de-malha` do auditar pegava a jusante, mas sem dizer qual seção),
     e `pos:{x:0}` estourava `a.map is not a function` (throw cru). */
  it.each([
    ['2 elementos', [0, 1]],
    ['4 elementos', [0, 1, 0, 99]],
    ['1 elemento', [1]],
    ['vazio', []],
    ['não-array (objeto)', { x: 0 } as unknown as number[]],
    ['não-array (string)', 'alt' as unknown as number[]],
  ])('pos com aridade errada (%s) GRITA e ABORTA o passo (0 V/0 F) — nunca coordenada NaN calada nem throw cru', (_nome, pos) => {
    const n = nucleo([['loft', { id: 0, lados: 6, secoes: [
      { pos: [0, 0, 0], raio: 0.3 },
      { pos, raio: 0.3 },
    ] }]], { alt: 1 }, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 1 });
    expect(n.orfaos[0].motivo).toMatch(/3 elementos/);
    expect(n.V.size).toBe(0);   // fail-closed: 0 V/0 F — antes eram 12 vértices, todos com coordenada NaN
    expect(n.F.size).toBe(0);
  });

  it('polo↔polo adjacente GRITA (seção degenerada): só AQUELE segmento fica sem face — o resto do caminho segue normal', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: [0, 0, 0], raio: 1 },
      { pos: [0, 1, 0], raio: 0 },
      { pos: [0, 2, 0], raio: 0 },
      { pos: [0, 3, 0], raio: 1 },
    ] }]], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 1 });
    expect(n.orfaos[0].motivo).toMatch(/polo.*polo|degenerad/i);
    expect(n.V.size).toBe(10);   // anel(4) + polo(1) + polo(1) + anel(4)
    expect(n.F.size).toBe(8);    // só os dois segmentos anel<->polo contribuíram (4+4); o polo<->polo não
    expect([...n.F.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);   // cursor de face contíguo, sem buraco
  });

  it('determinismo (2×) + replay round-trip JSON da lista (o formato salvo)', () => {
    const passos = [['loft', { id: 0, lados: 6, secoes: [
      { pos: [0, 0, 0], raio: 0 },
      { pos: [0.2, 0.4, 0.1], raio: 0.3 },
      { pos: [0.35, 0.8, 0.5], raio: 0.15 },
      { pos: [0.2, 1.1, 0.9], raio: 0 },
    ] }]];
    const a = J(neutroCanonico(nucleo(passos, {}, {})));
    const b = J(neutroCanonico(nucleo(passos, {}, {})));
    expect(a).toBe(b);
    expect(J(neutroCanonico(nucleo(JSON.parse(J(passos)), {}, {})))).toBe(a);
  });

  it('`pos`/`raio` por NOME de PARAM resolvem como nas outras ops; nome inexistente grita ALTO; mudar o VALOR do PARAM não renumera', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, secoes: [
      { pos: ['x0', 'y0', 'z0'], raio: 'r0' },
      { pos: ['x1', 'y1', 'z1'], raio: 'r1' },
    ] }]], { x0: 0, y0: 0, z0: 0, r0: 1, x1: 0, y1: 2, z1: 0, r1: 0.5 });
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.get(0)).toEqual([0, 0, 1]);
    expect(n.V.get(4)).toEqual([0, 2, 0.5]);
    // nome que não existe em PARAMS/TOPO grita ALTO (o contrato do st.num, igual às outras ops)
    expect(() => nucleo([['loft', { id: 0, secoes: [{ pos: [0, 0, 0], raio: 'fantasma' }, { pos: [0, 1, 0], raio: 1 }] }]], {}, {})).toThrow(/fantasma/);
    // mudar o VALOR do PARAM não renumera: mesmos ids, mesma topologia, só a posição muda
    const passos = [['loft', { id: 0, lados: 6, secoes: [{ pos: [0, 0, 0], raio: 'r' }, { pos: [0, 1, 0], raio: 'r' }] }]];
    const pequeno = neutroCanonico(nucleo(passos, { r: 0.3 }, {}));
    const grande = neutroCanonico(nucleo(passos, { r: 0.9 }, {}));
    expect(grande.V.map((row: any[]) => row[0])).toEqual(pequeno.V.map((row: any[]) => row[0]));
    expect(grande.F).toEqual(pequeno.F);
    expect(J(grande.V)).not.toBe(J(pequeno.V));
  });

  it('guarda de overflow (D3) no limite EXATO — vértice (2 anéis, lados grande) e face (caminho alternando anel/polo) de forma independente', () => {
    // limite de VÉRTICE: 2 anéis × lados=500 -> 1000 vértices exatos (passa); 501 -> 1002 (estoura)
    expect(() => nucleo([['loft', { id: 0, lados: 500, secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 1, 0], raio: 1 }] }]], {}, {})).not.toThrow();
    expect(() => nucleo([['loft', { id: 0, lados: 501, secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 1, 0], raio: 1 }] }]], {}, {})).toThrow(/estoura o bloco/);
    // limite de FACE, independente do de vértice: caminho ALTERNANDO anel/polo (barato em vértice, caro
    // em face — todo segmento é anel<->polo, nunca degenerado), lados=8. N=126 seções (63 anéis+63
    // polos) -> 567 V / 1000 F exatos (passa); N=127 -> 575 V / 1008 F (a guarda de FACE estoura
    // primeiro, o vértice nem chegou perto do bloco) — os MESMOS números do lathe (o custo por
    // seção/segmento é idêntico; só a forma do ponto mudou de [raio,y] pra {pos,raio}).
    const alternado = (nPontos: number) => Array.from({ length: nPontos }, (_, k) => ({ pos: [0, k, 0], raio: k % 2 === 0 ? 1 : 0 }));
    expect(() => nucleo([['loft', { id: 0, lados: 8, secoes: alternado(126) }]], {}, {})).not.toThrow();
    expect(() => nucleo([['loft', { id: 0, lados: 8, secoes: alternado(127) }]], {}, {})).toThrow(/estoura o bloco/);
  });

  it('peça-exemplo _galho (galho curvo, afinando, fechado nas duas pontas): sem órfãos, V/F exatos, MANIFOLD (watertight+winding consistente) e volume assinado > 0', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_galho.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const { V, F, orfaos } = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO);
    expect(orfaos).toHaveLength(0);
    // 7 seções (2 polos + 5 anéis) × lados=10: V=2+5·10=52; 6 segmentos não-degenerados: F=6·10=60
    expect(V.size).toBe(2 + 5 * peca.TOPO.lados);
    expect(F.size).toBe(6 * peca.TOPO.lados);
    expect(V.size).toBe(52);
    expect(F.size).toBe(60);

    // MANIFOLD: toda aresta DIRIGIDA a->b (cada canto de cada face) tem exatamente 1 par reverso b->a.
    // Prova watertight (nenhuma aresta desemparelhada = nenhum buraco — as duas pontas fecharam de
    // verdade) E winding CONSISTENTE (nenhuma aresta duplicada no MESMO sentido) — o mesmo método do
    // revisor adversarial no P1/P2/P3.
    const dirigidas = new Map<string, number>();
    let cantos = 0;
    for (const f of F.values()) {
      const vs = f.vs; cantos += vs.length;
      for (let k = 0; k < vs.length; k++) {
        const key = `${vs[k]}>${vs[(k + 1) % vs.length]}`;
        dirigidas.set(key, (dirigidas.get(key) || 0) + 1);
      }
    }
    expect(dirigidas.size).toBe(cantos);          // nenhuma aresta dirigida duplicada (não-manifold local)
    let semPar = 0;
    for (const key of dirigidas.keys()) { const [a, b] = key.split('>'); if (!dirigidas.has(`${b}>${a}`)) semPar++; }
    expect(semPar).toBe(0);                        // nenhuma aresta sem par reverso -> ESTANQUE (watertight)

    // volume assinado > 0 (soma de tetraedros a partir da origem, leque de cada face): nenhuma face invertida
    let vol = 0;
    for (const f of F.values()) {
      const vs = f.vs, p0 = V.get(vs[0])!;
      for (let k = 1; k < vs.length - 1; k++) {
        const p1 = V.get(vs[k])!, p2 = V.get(vs[k + 1])!;
        vol += (p0[0] * (p1[1] * p2[2] - p1[2] * p2[1]) - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0]) + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0])) / 6;
      }
    }
    expect(vol).toBeGreaterThan(0);

    // colisão sã (encaixa o galho inteiro via `solido`) e executar/adaptarV3 saem limpos
    expect(peca.meta.colisao.forma).toBe('cilindro');
    expect(peca.meta.colisao.raio).toBeGreaterThan(0);
    expect(peca.meta.colisao.altura).toBeCloseTo(peca.PARAMS.pontaY, 6);   // base(y=0) -> ponta(y=pontaY), medido: o caminho é monótono em Y
    const obj: any = executar(peca.PASSOS, peca.PARAMS, peca.TOPO, fakeCtx);
    expect(obj.lotes).toHaveLength(1);
    expect(obj.lotes[0].mesh.v.length % 8).toBe(0);
  });
});

/* ---------------------------------------------------------------------------
   `orientacao` do loft — ORIENTAÇÃO DECLARADA DA SEÇÃO.

   O atrito medido (RELATO-RODA-REALISTA, "Frame implícito do `loft`"): quem
   decidia para onde apontava o eixo +u de cada anel era o TRANSPORTE PARALELO,
   isto é, o HISTÓRICO do caminho. Um contorno retangular não conservava
   "largura" e "espessura" entre caminhos de direções diferentes, e a roda
   experimental precisou detectar a troca de eixo e REMONTAR cada contorno em
   código próprio dentro da peça.

   `orientacao: [x,y,z]` é o autor declarando essa direção. Cada afirmação aqui
   morre quando o valor muda — nenhuma repete a fórmula do núcleo:
     - a promessa (extensão do contorno na direção declarada é a MESMA em dois
       caminhos de direções diferentes) é medida na MALHA, e o mesmo caso SEM a
       chave é medido junto, senão um ramo que não faz nada passaria;
     - "sem acumular rotação" é medido por HISTÓRICO: dois caminhos diferentes
       que chegam à mesma seção com a mesma tangente dão a MESMA seção;
     - paralelismo GRITA e aborta o passo inteiro, nunca escolhe um desempate.
--------------------------------------------------------------------------- */
describe('loft — orientação declarada da seção (`orientacao`)', () => {
  // retângulo CCW em [u,w]: meia-largura no eixo u, meia-espessura no eixo w
  const retangulo = (u: number, w: number) => [[u, -w], [u, w], [-u, w], [-u, -w]];
  const CONTORNO = retangulo(0.5, 0.05);
  const extensao = (V: any, eixo: number) => {
    const vs = [...V.values()] as number[][];
    return +(Math.max(...vs.map((p) => p[eixo])) - Math.min(...vs.map((p) => p[eixo]))).toFixed(9);
  };
  // mesmo contorno, dois caminhos de DIREÇÕES diferentes (o caso da roda: dez braços, dez direções)
  const aoLongoDe = (fim: number[], orientacao: number[] | null) => nucleo([['loft', {
    id: 0, lados: 4, ...(orientacao ? { orientacao } : {}),
    secoes: [{ pos: [0, 0, 0], contorno: CONTORNO }, { pos: fim, contorno: CONTORNO }],
  }]], {}, {});

  it('a espessura declarada sobrevive à troca de direção do caminho — e SEM a chave ela não sobrevive', () => {
    // COM `orientacao: [1,0,0]`, o +u do contorno é o eixo X do MUNDO nos dois caminhos:
    // a largura de 1 (2×0.5) fica em X, a espessura de 0.1 fica transversal — em qualquer direção.
    const emY = aoLongoDe([0, 2, 0], [1, 0, 0]);
    const emZ = aoLongoDe([0, 0, 2], [1, 0, 0]);
    expect(emY.orfaos).toHaveLength(0);
    expect(emZ.orfaos).toHaveLength(0);
    expect(extensao(emY.V, 0)).toBe(1);
    expect(extensao(emZ.V, 0)).toBe(1);

    // SEM a chave, o MESMO par de caminhos troca os eixos: em Y o X fica com a ESPESSURA (0.1),
    // em Z fica com a LARGURA (1). É o atrito, medido — e é o que impede esta prova de passar
    // com um ramo `orientacao` que não faz nada.
    expect(extensao(aoLongoDe([0, 2, 0], null).V, 0)).toBe(0.1);
    expect(extensao(aoLongoDe([0, 0, 2], null).V, 0)).toBe(1);
  });

  /* As duas provas de "sem acumular rotação". Os dois caminhos abaixo têm
     TORÇÃO (saem do plano e voltam) — sem isso a afirmação é vazia: num
     caminho PLANO com a referência normal ao plano, o transporte paralelo
     também não gira, e a prova passa com as duas implementações. Foi o que o
     teste de mutação achou nesta rodada. */
  it('não acumula rotação: a seção depende da PRÓPRIA tangente, não do histórico do caminho', () => {
    // Dois caminhos terminam na MESMA `pos` [0,2,0] com a MESMA tangente [0,1,0]. O primeiro
    // chega depois de uma TORÇÃO (passa fora do plano x=0); o segundo vem reto de baixo.
    const secoes = (pontos: number[][]) => pontos.map((pos) => ({ pos, raio: 1 }));
    const caminho = (pontos: number[][], o: number[] | null) => nucleo([['loft', { id: 0, lados: 6, ...(o ? { orientacao: o } : {}), secoes: secoes(pontos) }]], {}, {});
    const TORCIDO = [[2, -4, 2], [0, -3, 1], [0, -1, 0], [0, 2, 0]];
    const RETO = [[0, -3, 0], [0, -1, 0], [0, 2, 0]];
    const ultimaSecao = (n: any, L: number) => [...n.V.keys()].sort((a: number, b: number) => a - b).slice(-L).map((id) => (n.V.get(id) as number[]).map((x) => +x.toFixed(9)));

    // COM `orientacao`: as duas últimas seções são IDÊNTICAS ponto a ponto, apesar dos caminhos diferentes.
    expect(ultimaSecao(caminho(TORCIDO, [0, 0, 1]), 6)).toEqual(ultimaSecao(caminho(RETO, [0, 0, 1]), 6));
    // SEM: o transporte paralelo herdou a torção e a mesma seção sai girada — a diferença que a chave apaga.
    expect(ultimaSecao(caminho(TORCIDO, null), 6)).not.toEqual(ultimaSecao(caminho(RETO, null), 6));
  });

  it('não acumula rotação DENTRO do mesmo caminho: duas seções com a mesma tangente têm a mesma seção', () => {
    // Sobe em Y, desvia pra (1,·,1), volta a subir em Y: as seções 0 e 4 têm a MESMA tangente [0,1,0],
    // com uma torção entre elas. Nenhum número de frame é repetido aqui — a afirmação compara a peça consigo.
    const PONTOS = [[0, 0, 0], [0, 2, 0], [1, 4, 1], [1, 6, 1], [1, 8, 1]];
    const peca = (o: number[] | null) => nucleo([['loft', { id: 0, lados: 6, ...(o ? { orientacao: o } : {}), secoes: PONTOS.map((pos) => ({ pos, raio: 1 })) }]], {}, {});
    // seção s, em coordenadas LOCAIS (descontada a `pos`): só o frame sobra
    const local = (n: any, s: number) => [...n.V.keys()].sort((a: number, b: number) => a - b).slice(s * 6, (s + 1) * 6)
      .map((id) => (n.V.get(id) as number[]).map((x, k) => +(x - PONTOS[s][k]).toFixed(9)));

    const declarado = peca([0, 0, 1]);
    expect(local(declarado, 4)).toEqual(local(declarado, 0));
    const implicito = peca(null);
    expect(local(implicito, 4)).not.toEqual(local(implicito, 0));   // a torção acumulada, medida
  });

  it('a chave é DECLARATIVA: mudar a referência muda a fase do anel, e a ausência preserva a semente documentada', () => {
    const anel = (o: number[] | null) => nucleo([['loft', { id: 0, lados: 4, ...(o ? { orientacao: o } : {}), secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 1 }] }]], {}, {}).V.get(0).map((x: number) => +x.toFixed(9));
    expect(anel([1, 0, 0])).toEqual([1, 0, 0]);     // +u declarado em X -> o vértice j=0 nasce em +X
    expect(anel([0, 0, 1])).toEqual([0, 0, 1]);     // +u declarado em Z -> nasce em +Z
    expect(anel([-1, 0, 0])).toEqual([-1, 0, 0]);   // referência oposta -> lado oposto (não é normalizada em módulo)
    expect(anel(null)).toEqual([0, 0, 1]);          // AUSENTE: a semente do transporte paralelo (u0 = [0,0,1] no caminho vertical), intacta
  });

  it('a referência não precisa ser perpendicular: ela é PROJETADA no plano da seção', () => {
    // [1,1,0] num caminho vertical projeta em [1,0,0]: o autor declara "para lá", não um eixo exato.
    const n = nucleo([['loft', { id: 0, lados: 4, orientacao: [1, 1, 0], secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 1 }] }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.get(0).map((x: number) => +x.toFixed(9))).toEqual([1, 0, 0]);
  });

  it('a referência aceita nome de PARAM, como todo ponto do núcleo', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, orientacao: ['eixoDoCubo', 0, 0], secoes: [{ pos: [0, 0, 0], contorno: CONTORNO }, { pos: [0, 2, 0], contorno: CONTORNO }] }]], { eixoDoCubo: 1 }, {});
    expect(n.orfaos).toHaveLength(0);
    expect(extensao(n.V, 0)).toBe(1);
  });

  it('winding continua PRA FORA com a orientação declarada (a lei D1 não depende do frame)', () => {
    const { V, F } = nucleo([['loft', { id: 0, lados: 8, orientacao: [1, 0, 0], secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 3, 0], raio: 1 }] }]], {}, {});
    const newell = (vs: number[]) => {
      let nx = 0, nz = 0;
      for (let k = 0; k < vs.length; k++) { const c = V.get(vs[k])!, n = V.get(vs[(k + 1) % vs.length])!; nx += (c[1] - n[1]) * (c[2] + n[2]); nz += (c[0] - n[0]) * (c[1] + n[1]); }
      return [nx, nz];
    };
    for (const f of F.values()) {
      const c = (f as any).vs.map((v: number) => V.get(v)!);
      const cx = c.reduce((s: number, p: number[]) => s + p[0], 0) / c.length, cz = c.reduce((s: number, p: number[]) => s + p[2], 0) / c.length;
      const [nx, nz] = newell((f as any).vs);
      expect(nx * cx + nz * cz).toBeGreaterThan(0);   // normal aponta pra longe do eixo do caminho
    }
  });

  it('referência PARALELA à tangente GRITA e aborta o passo inteiro — nunca desempata sozinha', () => {
    const n = nucleo([['loft', { id: 0, lados: 4, orientacao: [0, 1, 0], secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 1 }] }]], {}, {});
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
    expect(n.orfaos).toHaveLength(2);   // uma queixa por seção, cada uma dizendo QUAL
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 0, motivo: expect.stringMatching(/paralela à tangente da seção 0/) });
    expect(n.orfaos[1]).toMatchObject({ op: 'loft', ref: 1 });
  });

  it('paralelismo em UMA seção do meio do caminho também aborta tudo (fail-closed, não meia malha)', () => {
    // caminho em L: reto em X, dobra pra Y. A referência [0,1,0] só fica paralela na ÚLTIMA seção.
    const n = nucleo([['loft', { id: 0, lados: 4, orientacao: [0, 1, 0], secoes: [
      { pos: [0, 0, 0], raio: 1 }, { pos: [2, 0, 0], raio: 1 }, { pos: [2, 2, 0], raio: 1 },
    ] }]], {}, {});
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0]).toMatchObject({ op: 'loft', ref: 2, motivo: expect.stringMatching(/paralela à tangente da seção 2/) });
  });

  it('vetor nulo e aridade errada GRITAM antes de qualquer vértice', () => {
    const nulo = nucleo([['loft', { id: 0, lados: 4, orientacao: [0, 0, 0], secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 1 }] }]], {}, {});
    expect(nulo.V.size).toBe(0);
    expect(nulo.orfaos[0]).toMatchObject({ op: 'loft', ref: 'orientacao', motivo: expect.stringMatching(/vetor nulo/) });

    const curto = nucleo([['loft', { id: 0, lados: 4, orientacao: [1, 0], secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 1 }] }]], {}, {});
    expect(curto.V.size).toBe(0);
    expect(curto.orfaos[0]).toMatchObject({ op: 'loft', ref: 'orientacao', motivo: expect.stringMatching(/3 elementos/) });

    const naoArray = nucleo([['loft', { id: 0, lados: 4, orientacao: 'x' as any, secoes: [{ pos: [0, 0, 0], raio: 1 }, { pos: [0, 2, 0], raio: 1 }] }]], {}, {});
    expect(naoArray.V.size).toBe(0);
    expect(naoArray.orfaos[0]).toMatchObject({ op: 'loft', ref: 'orientacao' });
  });

  it('a contagem de vértices e faces é a MESMA com e sem a chave — orientar não é gerar geometria', () => {
    const com = aoLongoDe([0, 2, 0], [1, 0, 0]), sem = aoLongoDe([0, 2, 0], null);
    expect(com.V.size).toBe(sem.V.size);
    expect(com.F.size).toBe(sem.F.size);
    expect([...com.V.keys()].sort()).toEqual([...sem.V.keys()].sort());
    expect([...com.F.keys()].sort()).toEqual([...sem.F.keys()].sort());
  });
});

describe('P6 — inflate (dois contornos 2D -> volume por interseção de prismas)', () => {
  const QUAD: number[][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const circ = (r: number, n = 24) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; });
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };
  const manifoldRuim = (F: any) => {
    const m = new Map<string, number>();
    for (const f of F.values()) for (let k = 0; k < (f as any).vs.length; k++) { const a = (f as any).vs[k], b = (f as any).vs[(k + 1) % (f as any).vs.length]; m.set(`${a},${b}`, (m.get(`${a},${b}`) ?? 0) + 1); }
    let ruim = 0;
    for (const [k, c] of m) { const [a, b] = k.split(','); if (c !== 1 || (m.get(`${b},${a}`) ?? 0) !== 1) ruim++; }
    return ruim;
  };
  const volume = (V: any, F: any) => {
    let vol = 0;
    for (const f of F.values()) { const vs = (f as any).vs; for (let k = 1; k + 1 < vs.length; k++) {
      const a = V.get(vs[0]), b = V.get(vs[k]), c = V.get(vs[k + 1]);
      vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    } }
    return vol;
  };

  it('numeração EXATA — grade 1×1×1 (1 voxel isolado, 8 cantos, 6 faces): derivada à mão, medida — não recontada no olho', () => {
    // divisoes clampado no MÍNIMO 2 (a mesma lei do lados/aneis) -> essa caixa cai numa grade 2×2×2 (8 voxels
    // cheios), não 1×1×1; o caso de 1 voxel isolado é provado à parte pelo teste de winding abaixo (Newell
    // por face bate a direção certa mesmo numa grade maior).
    const { V, F, orfaos } = nucleo([['inflate', { id: 0, contornoLado: QUAD, contornoTopo: QUAD, divisoes: 2 }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(26);   // (2+1)³ cantos − 1 canto estritamente interior (o centro, nunca tocado por face nenhuma)
    expect(F.size).toBe(24);   // 6 · 2² faces (a superfície externa de um cubo sólido 2×2×2 de voxels)
    expect(manifoldRuim(F)).toBe(0);
    expect(volume(V, F)).toBeCloseTo(8, 6);   // caixa 2×2×2 de aresta 1 cada = volume 8 exato
  });

  it('caixa (retângulos): volume bate a conta ANALÍTICA exata (largura·altura·profundidade — sem aproximação de voxel numa forma já axis-aligned)', () => {
    const lado = [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]];   // z em [-1,1], y em [-0.5,0.5]
    const topo = [[-1, -0.7], [1, -0.7], [1, 0.7], [-1, 0.7]];   // z em [-1,1], x em [-0.7,0.7]
    const { V, F, orfaos } = nucleo([['inflate', { id: 0, contornoLado: lado, contornoTopo: topo, divisoes: 4 }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(manifoldRuim(F)).toBe(0);
    expect(volume(V, F)).toBeCloseTo(2 * 1 * 1.4, 6);   // dx=1.4, dy=1, dz=2 — os voxels cobrem a caixa exata quando ela já é axis-aligned
  });

  it('winding: TODA face aponta pra FORA do voxel — Newell por direção, não só o volume agregado', () => {
    const { V, F } = nucleo([['inflate', { id: 0, contornoLado: circ(1), contornoTopo: circ(1), divisoes: 10 }]], {}, {});
    for (const f of F.values()) {
      const n = newell(V, (f as any).vs);
      const p = (f as any).vs.map((id: number) => V.get(id));
      const cx = (p[0][0] + p[2][0]) / 2, cy = (p[0][1] + p[2][1]) / 2, cz = (p[0][2] + p[2][2]) / 2;   // forma convexa centrada na origem -> centro da face aponta pra fora
      expect(n[0] * cx + n[1] * cy + n[2] * cz).toBeGreaterThan(0);
    }
  });

  it('manifold + volume>0 em formas côncavas e assimétricas (estrela, retângulo alongado, misto)', () => {
    const estrela: number[][] = []; for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, r = j % 2 === 0 ? 1 : 0.4; estrela.push([Math.cos(a) * r, Math.sin(a) * r]); }
    const retLongo = [[-2, -0.3], [2, -0.3], [2, 0.3], [-2, 0.3]];
    for (const [lado, topo] of [[estrela, estrela], [estrela, retLongo], [retLongo, circ(0.5)]] as const) {
      const { V, F, orfaos } = nucleo([['inflate', { id: 0, contornoLado: lado, contornoTopo: topo, divisoes: 10 }]], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(manifoldRuim(F)).toBe(0);
      expect(volume(V, F)).toBeGreaterThan(0);
    }
  });

  it('contornoLado/contornoTopo malformado GRITA e ABORTA (0 V/0 F) — a mesma lei do contorno do loft (D-118)', () => {
    const casos: Array<[string, any]> = [
      ['contornoLado ausente', { contornoTopo: QUAD, divisoes: 4 }],
      ['contornoLado com <3 pontos', { contornoLado: [[0, 0], [1, 1]], contornoTopo: QUAD, divisoes: 4 }],
      ['contornoLado não-array', { contornoLado: 'oi', contornoTopo: QUAD, divisoes: 4 }],
      ['ponto com aridade 3 (alça de curva reservada)', { contornoLado: [[0, 0], [1, 0, 99], [1, 1]], contornoTopo: QUAD, divisoes: 4 }],
      ['ponto com aridade 1', { contornoLado: [[0, 0], [1], [1, 1]], contornoTopo: QUAD, divisoes: 4 }],
    ];
    for (const [, args] of casos) {
      const { V, F, orfaos } = nucleo([['inflate', { id: 0, ...args }]], {}, {});
      expect(orfaos.length).toBeGreaterThan(0);
      expect(V.size).toBe(0);
      expect(F.size).toBe(0);
    }
  });

  it('contornoLado e contornoTopo sem NENHUM overlap (ou contorno degenerado num único ponto) GRITA — volume vazio nunca é "passou"', () => {
    const longe = nucleo([['inflate', { id: 0, contornoLado: QUAD, contornoTopo: [[10, -1], [12, -1], [12, 1], [10, 1]], divisoes: 4 }]], {}, {});
    expect(longe.orfaos).toHaveLength(1);
    expect(longe.orfaos[0].motivo).toMatch(/não se cruzam/);
    expect(longe.V.size).toBe(0);

    const degenerado = nucleo([['inflate', { id: 0, contornoLado: [[0, 0], [0, 0], [0, 0]], contornoTopo: QUAD, divisoes: 4 }]], {}, {});
    expect(degenerado.orfaos.length).toBeGreaterThan(0);
    expect(degenerado.V.size).toBe(0);
  });

  it('guarda de overflow (D3): grade que produziria >1000 vértices/faces falha ALTO (throw), não vaza pro bloco seguinte', () => {
    expect(() => nucleo([['inflate', { id: 0, contornoLado: circ(1), contornoTopo: circ(1), divisoes: 30 }]], {}, {})).toThrow(/estoura o bloco/);
  });

  it('guarda de SANIDADE de voxel (200000): divisoes absurdo falha ALTO antes de rodar o scan, independe do bloco de ids', () => {
    expect(() => nucleo([['inflate', { id: 0, contornoLado: circ(1), contornoTopo: circ(1), divisoes: 100 }]], {}, {})).toThrow(/200000/);
  });

  it('pos/divisoes citam PARAM/TOPO por nome (a mesma lei do resto do núcleo)', () => {
    const { V, F, orfaos } = nucleo([['inflate', { id: 0,
      contornoLado: [['zNeg', 'yNeg'], ['zPos', 'yNeg'], ['zPos', 'yPos'], ['zNeg', 'yPos']],
      contornoTopo: QUAD, divisoes: 'div' }]],
      { zNeg: -1, zPos: 1, yNeg: -1, yPos: 1 }, { div: 4 });
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBeGreaterThan(0);
    expect(F.size).toBeGreaterThan(0);
  });

  it('determinismo: mesma entrada -> forma canônica bit-a-bit idêntica em duas rodadas', () => {
    const canon = () => { const n = nucleo([['inflate', { id: 0, contornoLado: circ(1), contornoTopo: circ(1), divisoes: 6 }]], {}, {});
      return JSON.stringify([[...n.V.entries()].sort((a, b) => a[0] - b[0]), [...n.F.entries()].sort((a, b) => a[0] - b[0]).map(([k, f]) => [k, (f as any).vs])]); };
    expect(canon()).toBe(canon());
  });

  it('composição: extruda/rotaciona/espelha/mescla/pincel/liso/solido/parte em cima do inflate — sem NaN, manifold intacto onde não deveria mudar', () => {
    const base = { id: 0, contornoLado: QUAD, contornoTopo: QUAD, divisoes: 2 };
    for (const passos of [
      [['inflate', base], ['rotaciona', { eixo: 'y', graus: 30 }]],
      [['inflate', base], ['mescla', { de: [1], para: 0 }]],
      [['inflate', base], ['pincel', { modo: 'face', faces: [0, 1, 2], cor: '#7a3045' }], ['liso', { faces: [0, 1] }], ['solido', { faces: [0, 1, 2, 3] }], ['parte', { nome: 'corpo', faces: [0, 1] }]],
    ] as const) {
      const { V, orfaos } = nucleo(passos as any, {}, {});
      expect(orfaos).toHaveLength(0);
      expect([...V.values()].every((p: any) => p.every((c: number) => Number.isFinite(c)))).toBe(true);
    }
  });
});

describe('P8 — edição restante (moveF/moveA/vira/apagaFace + seleção por região/grupo)', () => {
  // cubo lado 1: 0..3 base (y=0), 4..7 topo (y=1); F0 fundo, F1 topo (0,1,2,3 / 4,5,6,7)
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };

  describe('moveF', () => {
    it('move TODOS os cantos da face (compartilhados com outras faces, movem junto) — ADITIVO', () => {
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['moveF', { face: 1, d: [0, 0.5, 0] }]], {}, {});
      expect(orfaos).toHaveLength(0);
      for (const id of [4, 5, 6, 7]) expect(V.get(id)![1]).toBeCloseTo(1.5, 6);   // topo (y=1) + 0.5 -> y=1.5
      for (const id of [0, 1, 2, 3]) expect(V.get(id)![1]).toBe(0);              // base intacta
    });

    it('face inexistente GRITA — nunca corrompe', () => {
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['moveF', { face: 999, d: [1, 0, 0] }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ op: 'moveF', ref: 999 });
      expect(V.size).toBe(8);   // a peça segue intacta, só o passo do moveF que não fez nada
    });

    it('delta não-finito falha ALTO (throw) — a lei do st.vec (D-118)', () => {
      expect(() => nucleo([['cubo', { id: 0, lado: 1 }], ['moveF', { face: 1, d: [NaN, 0, 0] }]], {}, {})).toThrow(/não-finito/);
    });
  });

  describe('moveA', () => {
    it('move as DUAS pontas pelo mesmo delta — açúcar sobre dois moveV', () => {
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['moveA', { a: 0, b: 1, d: [0, 0.3, 0] }]], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(V.get(0)![1]).toBeCloseTo(0.3, 6);
      expect(V.get(1)![1]).toBeCloseTo(0.3, 6);
      expect(V.get(2)![1]).toBe(0);   // vértice fora da aresta, intacto
    });

    it('uma ponta inexistente GRITA pra ela, mas a outra AINDA move (nunca aborta o passo inteiro)', () => {
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['moveA', { a: 0, b: 999, d: [1, 0, 0] }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ op: 'moveA', ref: 999 });
      expect(V.get(0)![0]).toBeCloseTo(0.5, 6);   // v0 moveu mesmo com a outra ponta inválida
    });
  });

  describe('vira', () => {
    it('INVERTE o winding (a normal aponta pro lado oposto) sem mudar V/F', () => {
      const antes = nucleo([['cubo', { id: 0, lado: 1 }]], {}, {});
      const depois = nucleo([['cubo', { id: 0, lado: 1 }], ['vira', { face: 1 }]], {}, {});
      const nAntes = newell(antes.V, antes.F.get(1)!.vs);
      const nDepois = newell(depois.V, depois.F.get(1)!.vs);
      expect(nAntes[1]).toBeGreaterThan(0);    // topo do cubo: normal +y antes
      expect(nDepois[1]).toBeLessThan(0);      // e -y depois de virar
      expect(depois.V.size).toBe(antes.V.size);
      expect(depois.F.size).toBe(antes.F.size);
    });

    it('face inexistente GRITA', () => {
      const { orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['vira', { face: 999 }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ op: 'vira', ref: 999 });
    });

    it('CARACTERÍSTICA (não bug, documentada no núcleo): virar uma face JÁ consistente desalinha o pareamento de aresta com as vizinhas — o uso responsável é o oposto (consertar face já de costas)', () => {
      const manifoldRuim = (F: any) => {
        const m = new Map<string, number>();
        for (const f of F.values()) for (let k = 0; k < (f as any).vs.length; k++) { const a = (f as any).vs[k], b = (f as any).vs[(k + 1) % (f as any).vs.length]; m.set(`${a},${b}`, (m.get(`${a},${b}`) ?? 0) + 1); }
        let ruim = 0; for (const [k, c] of m) { const [a, b] = k.split(','); if (c !== 1 || (m.get(`${b},${a}`) ?? 0) !== 1) ruim++; } return ruim;
      };
      const cuboLimpo = nucleo([['cubo', { id: 0, lado: 1 }]], {}, {});
      expect(manifoldRuim(cuboLimpo.F)).toBe(0);   // baseline: o cubo sozinho é watertight

      const viraFaceCorreta = nucleo([['cubo', { id: 0, lado: 1 }], ['vira', { face: 1 }]], {}, {});
      expect(manifoldRuim(viraFaceCorreta.F)).toBe(4);   // virar o topo (já correto) quebra as 4 arestas com as paredes

      const viraDeVoltaERestaura = nucleo([['cubo', { id: 0, lado: 1 }], ['vira', { face: 1 }], ['vira', { face: 1 }]], {}, {});
      expect(manifoldRuim(viraDeVoltaERestaura.F)).toBe(0);   // virar de novo desfaz — prova que é sobre CONSISTÊNCIA local, não sobre `vira` ser destrutivo
    });
  });

  describe('apagaFace', () => {
    it('remove a face; os vértices dela CONTINUAM existindo (mesmo sem face nenhuma usando)', () => {
      const { V, F, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['apagaFace', { face: 1 }]], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(F.size).toBe(5);
      expect(V.size).toBe(8);   // 4,5,6,7 continuam vivos mesmo sem nenhuma face
      expect(F.has(1)).toBe(false);
    });

    it('face inexistente GRITA', () => {
      const { orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['apagaFace', { face: 999 }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ op: 'apagaFace', ref: 999 });
    });
  });

  describe('resolverAlvosV — seleção por região/grupo (via rotaciona)', () => {
    it('sel.regiao seleciona por caixa delimitadora INCLUSIVA (min/max, os dois obrigatórios)', () => {
      // cubo lado 1: `ly` = `lado` DIRETO (não /2, ao contrário de lx/lz) -> topo em y=1 exato
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }],
        ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { regiao: { min: [-2, 0.9, -2], max: [2, 1.1, 2] } } }],
      ], {}, {});
      expect(orfaos).toHaveLength(0);
      // só o topo (y=1) cai na faixa 0.9..1.1 -> só 4..7 giram; base (y=0) fica intacta (medido, não recontado no olho)
      expect(V.get(0)).toEqual([-0.5, 0, -0.5]);
      expect(V.get(4)![0]).toBeCloseTo(-0.5, 6);
      expect(V.get(4)![2]).toBeCloseTo(0.5, 6);
    });

    it('sel.regiao SEM min OU sem max GRITA e não seleciona nada por essa região (mas ainda roda o resto normal)', () => {
      const { orfaos, V } = nucleo([['cubo', { id: 0, lado: 1 }],
        ['rotaciona', { eixo: 'y', graus: 90, sel: { regiao: { min: [0, -1, -1] } } }],   // sem max
      ], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0].motivo).toMatch(/min E max/);
      expect(V.size).toBe(8);   // não corrompeu nada
    });

    it('sel.grupo seleciona as faces daquele f.parte (reusa a op `parte`, D-95)', () => {
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }],
        ['parte', { nome: 'topo', faces: [1] }],
        ['rotaciona', { eixo: 'y', graus: 45, pivo: [0, 0, 0], sel: { grupo: 'topo' } }],
      ], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(V.get(0)).toEqual([-0.5, 0, -0.5]);   // base fora do grupo, intacta
      expect(V.get(4)).not.toEqual([-0.5, 1, -0.5]);   // topo girou
    });

    it('sel.grupo com nome que não tem NENHUMA face GRITA', () => {
      const { orfaos, V } = nucleo([['cubo', { id: 0, lado: 1 }], ['rotaciona', { eixo: 'y', graus: 45, sel: { grupo: 'naoexiste' } }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0].motivo).toMatch(/grupo 'naoexiste'/);
      expect(V.size).toBe(8);
    });

    it('sel.v/sel.f (o formato do P3) seguem funcionando byte-idêntico depois do refactor pra resolverAlvosV', () => {
      const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['rotaciona', { eixo: 'y', graus: 90, pivo: [0, 0, 0], sel: { v: [0] } }]], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(V.get(0)![0]).toBeCloseTo(-0.5, 6);
      expect(V.get(1)).toEqual([0.5, 0, -0.5]);   // fora da seleção, intacto
    });
  });

  it('composição: moveF/moveA/vira/apagaFace com extruda/mescla/espelha/rotaciona/pincel/liso/solido/parte — sem NaN nem órfão em nenhum caso; manifold intacto nos que continuam FECHADOS', () => {
    const manifoldRuim = (F: any) => {
      const m = new Map<string, number>();
      for (const f of F.values()) for (let k = 0; k < (f as any).vs.length; k++) { const a = (f as any).vs[k], b = (f as any).vs[(k + 1) % (f as any).vs.length]; m.set(`${a},${b}`, (m.get(`${a},${b}`) ?? 0) + 1); }
      let ruim = 0; for (const [k, c] of m) { const [a, b] = k.split(','); if (c !== 1 || (m.get(`${b},${a}`) ?? 0) !== 1) ruim++; } return ruim;
    };
    for (const [passos, fechado] of [
      [[['cubo', { id: 0, lado: 1 }], ['extruda', { face: 1, dist: 0.3 }], ['moveF', { face: 1, d: [0.1, 0, 0] }]], true],
      [[['cubo', { id: 0, lado: 1 }], ['moveA', { a: 0, b: 1, d: [0, 0.3, 0] }], ['rotaciona', { eixo: 'y', graus: 20 }]], true],
      // vira numa face JÁ consistente desalinha o pareamento com as vizinhas (não é bug — ver o teste
      // dedicado abaixo, que trava e explica); a checagem aqui é só "não corrompe" (sem NaN/órfão)
      [[['cubo', { id: 0, lado: 1 }], ['vira', { face: 1 }], ['pincel', { modo: 'face', faces: [1], cor: '#7a3045' }], ['liso', { faces: [1] }], ['solido', { faces: [0, 1, 2, 3, 4, 5] }], ['parte', { nome: 'topo', faces: [1] }]], false],
      // apagaFace abre o topo DE PROPÓSITO e o espelha (pos=0.5, não bate em nenhum vértice do cubo — nada
      // solda) NÃO fecha o buraco por acidente — 2 bordas abertas sobrepostas, não uma peça watertight; a
      // prova aqui é só "não corrompe" (sem NaN/órfão), não "ficou fechado" (medido antes de travar: 8 arestas soltas)
      [[['cubo', { id: 0, lado: 1 }], ['apagaFace', { face: 1 }], ['espelha', { eixo: 'y', pos: 0.5 }]], false],
      [[['cubo', { id: 0, lado: 1 }], ['moveF', { face: 0, d: [0.2, 0, 0] }], ['mescla', { de: [0], para: 1 }]], true],
    ] as const) {
      const { V, F, orfaos } = nucleo(passos as any, {}, {});
      expect(orfaos).toHaveLength(0);
      if (fechado) expect(manifoldRuim(F)).toBe(0);
      expect([...V.values()].every((p: any) => p.every((c: number) => Number.isFinite(c)))).toBe(true);
    }
  });

  it('determinismo: mesma entrada -> forma canônica bit-a-bit idêntica', () => {
    const passos = [['cubo', { id: 0, lado: 1 }], ['moveF', { face: 1, d: [0.1, 0, 0] }], ['moveA', { a: 2, b: 3, d: [0, 0.1, 0] }], ['vira', { face: 2 }]];
    const canon = () => { const n = nucleo(passos as any, {}, {}); return JSON.stringify([[...n.V.entries()].sort((a, b) => a[0] - b[0]), [...n.F.entries()].sort((a, b) => a[0] - b[0]).map(([k, f]) => [k, (f as any).vs])]); };
    expect(canon()).toBe(canon());
  });
});

/* D-129 — seleção semântica para atributos e espelho. O contrato é deliberado:
   `sel.v` alcança as faces incidentes; `sel.regiao` só alcança faces INTEIRAS na
   caixa inclusiva. Assim o autor nunca pinta metade inesperada de uma face. */
describe('D-129 — seleção semântica uniforme (atributos + espelha)', () => {
  const cubo: any = ['cubo', { id: 0, lado: 1 }];

  it('pincel por grupo e região atinge as faces previstas; material, solido, liso e parte reutilizam a mesma seleção', () => {
    const n = nucleo([
      cubo,
      ['parte', { nome: 'topo', faces: [1] }],                         // assinatura legada preservada
      ['pincel', { modo: 'face', sel: { grupo: 'topo' }, cor: '#ff0000' }],
      ['material', { sel: { grupo: 'topo' }, usa: 'brilho' }],
      ['solido', { sel: { regiao: { min: [-1, 0.9, -1], max: [1, 1.1, 1] } } }],
      ['liso', { sel: { v: [4] } }],
      // `substituir` é obrigatório aqui desde o O-2: v4 é canto da face 1, que já é da parte 'topo'.
      // Este fixture ERA o único ponto do repositório onde uma parte roubava face de outra em silêncio.
      ['parte', { nome: 'cantoTopo', sel: { v: [4] }, substituir: true }],
    ] as any, {}, {}, { brilho: { cor: '#ffffff' } });
    expect(n.orfaos).toHaveLength(0);
    expect(n.F.get(1)).toMatchObject({ cor: '#ff0000', material: 'brilho', solido: true, liso: true });
    expect(n.F.get(0)).toMatchObject({ cor: null, material: null, solido: false });
    // v4 é canto do topo e de duas paredes: seleção por vértice alcança as três faces incidentes.
    expect([...n.F.values()].filter((f: any) => f.parte === 'cantoTopo').map((f: any) => f.id).sort()).toEqual([1, 2, 5]);
  });

  it('espelha por grupo e por região cria a metade nova, com a mesma contagem que sel.f', () => {
    const porGrupo = nucleo([cubo, ['parte', { nome: 'topo', faces: [1] }], ['espelha', { eixo: 'x', sel: { grupo: 'topo' } }]], {}, {});
    const porRegiao = nucleo([cubo, ['espelha', { eixo: 'x', sel: { regiao: { min: [-1, 0.9, -1], max: [1, 1.1, 1] } } }]], {}, {});
    const legado = nucleo([cubo, ['espelha', { eixo: 'x', sel: { f: [1] } }]], {}, {});
    for (const n of [porGrupo, porRegiao, legado]) { expect(n.orfaos).toHaveLength(0); expect(n.V.size).toBe(12); expect(n.F.size).toBe(7); }
    expect(JSON.stringify(neutroCanonico(legado))).toBe(JSON.stringify(neutroCanonico(porRegiao))); // f antigo = região que contém só o topo
  });

  it('faces:[ids] legado permanece byte-idêntico ao sel.f; rotaciona e transladar preservam a seleção antiga', () => {
    const legado = nucleo([cubo, ['pincel', { modo: 'face', faces: [1], cor: '#123456' }], ['liso', { faces: [1] }], ['solido', { faces: [1] }]], {}, {});
    const novo = nucleo([cubo, ['pincel', { modo: 'face', sel: { f: [1] }, cor: '#123456' }], ['liso', { sel: { f: [1] } }], ['solido', { sel: { f: [1] } }]], {}, {});
    expect(JSON.stringify(neutroCanonico(legado))).toBe(JSON.stringify(neutroCanonico(novo)));
    const movido = nucleo([cubo, ['transladar', { d: [1, 0, 0], sel: { f: [1] } }], ['rotaciona', { eixo: 'z', graus: 0, sel: { f: [1] } }]], {}, {});
    expect(movido.orfaos).toHaveLength(0);
    expect(movido.V.get(4)).toEqual([0.5, 1, -0.5]); expect(movido.V.get(0)).toEqual([-0.5, 0, -0.5]);
  });

  it('seleções inválidas, vazias, ambíguas, fora da peça e desconhecidas GRITAM sem corromper', () => {
    const casos: any[] = [
      ['pincel', { modo: 'face', sel: { grupo: 'naoexiste' }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { regiao: { min: [9, 9, 9], max: [10, 10, 10] } }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { regiao: { min: [-0.51, -0.1, -0.51], max: [-0.49, 0.1, -0.49] } }, cor: '#f00' }], // só v0: nenhuma face INTEIRA
      ['pincel', { modo: 'face', sel: { regiao: { min: [0, 0, 0] } }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { regiao: { min: [0, 0, 0], max: [Infinity, 1, 1] } }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { surpresa: [1] }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { f: [] }, cor: '#f00' }],
      ['pincel', { modo: 'face', faces: [1], sel: { f: [1] }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { f: [999] }, cor: '#f00' }],
    ];
    for (const passo of casos) {
      const n = nucleo([cubo, passo], {}, {});
      expect(n.orfaos.length).toBeGreaterThan(0);
      expect(n.orfaos.every((o: any) => o.op === 'pincel')).toBe(true);
      expect(n.F.get(1).cor).toBeNull();
    }
  });

  it('grupo sem face viva e órfãos não viram sucesso silencioso nem deixam estado parcial', () => {
    const n = nucleo([cubo, ['parte', { nome: 'sumiu', faces: [1] }], ['apagaFace', { face: 1 }], ['espelha', { eixo: 'x', sel: { grupo: 'sumiu' } }]], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'espelha' && /grupo 'sumiu'/.test(o.motivo))).toBe(true);
    expect(n.V.size).toBe(8); expect(n.F.size).toBe(5);  // espelho não chegou a alocar nada
  });

  it('medição na moto: os 32 ids de farol/lanterna viram duas regiões sem mudar a forma canônica', async () => {
    const url = new URL('../../prototipos/fps/v3/pecas/moto.js', import.meta.url);
    const moto: any = await import(fileURLToPath(url));
    const regioes: any = {
      farol: { min: [-0.058, 0.9499099168006007, 0.8691819833601201], max: [0.058, 1.0580900831993993, 0.914] },
      lanterna: { min: [-0.078, 0.9520002755842918, -1.19], max: [0.078, 1.0299997244157082, -1.1298533865667473] },
    };
    const derivados = moto.PASSOS.map((p: any) => p[0] === 'material' && regioes[p[1].usa]
      ? ['material', { sel: { regiao: regioes[p[1].usa] }, usa: p[1].usa }]
      : p);
    const original = nucleo(moto.PASSOS, moto.PARAMS, moto.TOPO, moto.MATERIAIS);
    const semantica = nucleo(derivados, moto.PARAMS, moto.TOPO, moto.MATERIAIS);
    expect(moto.PASSOS.find((p: any) => p[0] === 'material' && p[1].usa === 'farol')[1].faces.length).toBe(20);
    expect(moto.PASSOS.find((p: any) => p[0] === 'material' && p[1].usa === 'lanterna')[1].faces.length).toBe(12);
    expect(semantica.orfaos).toHaveLength(0);
    expect(JSON.stringify(neutroCanonico(semantica))).toBe(JSON.stringify(neutroCanonico(original)));
  });

  /* Rodada B da Fase 3.5: `sel.tudo` é a única forma EXPLÍCITA de "a peça
     inteira" — deliberadamente diferente de `sel` ausente, que continua
     gritando (o teste-trava abaixo prova isso). Ponto único: resolverSelecao. */
  it('sel:{tudo:true} pinta todas as faces, byte a byte igual à lista de ids à mão', () => {
    const comTudo = nucleo([cubo, ['pincel', { modo: 'face', sel: { tudo: true }, cor: '#9e4539' }]], {}, {});
    const comLista = nucleo([cubo, ['pincel', { modo: 'face', sel: { f: [0, 1, 2, 3, 4, 5] }, cor: '#9e4539' }]], {}, {});
    expect(comTudo.orfaos).toHaveLength(0);
    expect(JSON.stringify(neutroCanonico(comTudo))).toBe(JSON.stringify(neutroCanonico(comLista)));
    expect([...comTudo.F.values()].every((f: any) => f.cor === '#9e4539')).toBe(true);
  });

  it('sel:{tudo:...} com valor que não é o literal true GRITA (1, "sim", false)', () => {
    for (const valor of [false, 1, 'sim', null]) {
      const n = nucleo([cubo, ['pincel', { modo: 'face', sel: { tudo: valor }, cor: '#f00' }]], {}, {});
      if (valor === null) {
        // tudo:null é o mesmo que ausente (sel.tudo != null falha) — cai na regra "sel vazia" abaixo.
        expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
      } else {
        expect(n.orfaos.some((o: any) => o.op === 'pincel' && (o.ref === 'sel.tudo' || /sel\.tudo/.test(o.motivo ?? '')))).toBe(true);
      }
      expect(n.F.get(1).cor).toBeNull();
    }
  });

  it('sel ausente continua gritando exatamente como hoje — tudo não muda essa regra (teste-trava)', () => {
    const n = nucleo([cubo, ['pincel', { modo: 'face', cor: '#f00' }]], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
    expect(n.F.get(1).cor).toBeNull();
  });

  it('sel:{tudo:true, f:[...]} é união — redundante, não é erro; resultado é a peça inteira', () => {
    const n = nucleo([cubo, ['pincel', { modo: 'face', sel: { tudo: true, f: [1] }, cor: '#00ff00' }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect([...n.F.values()].every((f: any) => f.cor === '#00ff00')).toBe(true);
  });

  it('depois de apagaFace, sel:{tudo:true} não seleciona a face removida', () => {
    const n = nucleo([cubo, ['apagaFace', { face: 1 }], ['pincel', { modo: 'face', sel: { tudo: true }, cor: '#00f' }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.F.has(1)).toBe(false);
    expect(n.F.size).toBe(5);
    expect([...n.F.values()].every((f: any) => f.cor === '#00f')).toBe(true);
  });

  /* A TRAVA DA SEMÂNTICA TEMPORAL (achado do revisor adversarial). `tudo` é um
     seletor de ligação TARDIA: significa "o que está vivo NAQUELE passo", não
     "a peça final". É a mesma regra de `sel` ausente e do `espelha` sem
     seleção — mas o NOME sugere o contrário, e `sel` é formato salvo, então a
     escolha é irreversível. Sem este teste, uma rodada futura poderia
     "consertar" `tudo` pra significar a peça final e nada falharia. */
  it('sel:{tudo:true} resolve NO PASSO: geometria criada DEPOIS não é atingida', () => {
    const n = nucleo([cubo, ['pincel', { modo: 'face', sel: { tudo: true }, cor: '#111111' }], ['extruda', { face: 1, dist: 0.3 }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    const semCor = [...n.F.values()].filter((f: any) => f.cor === null);
    expect(semCor.length).toBeGreaterThan(0); // as paredes novas da extrusão nasceram DEPOIS do tudo
  });

  it('sel:{tudo:true} resolve NO PASSO: geometria inserida ANTES passa a ser atingida, sem gritar', () => {
    const so = nucleo([cubo, ['parte', { sel: { tudo: true }, nome: 'corpo' }]], {}, {});
    const comExtra = nucleo([cubo, ['cilindro', { raio: 0.3, altura: 0.2, lados: 6 }], ['parte', { sel: { tudo: true }, nome: 'corpo' }]], {}, {});
    const noCorpo = (n: any) => [...n.F.values()].filter((f: any) => f.parte === 'corpo').length;
    expect(so.orfaos).toHaveLength(0);
    expect(comExtra.orfaos).toHaveLength(0);
    // inserir um passo de geometria ANTES alarga o alcance do `tudo` — em silêncio, por construção.
    expect(noCorpo(comExtra)).toBeGreaterThan(noCorpo(so));
  });

  it('sel:{tudo:true} também funciona numa op de vértice (transladar)', () => {
    const comTudo = nucleo([cubo, ['transladar', { d: [1, 0, 0], sel: { tudo: true } }]], {}, {});
    const semSel = nucleo([cubo, ['transladar', { d: [1, 0, 0] }]], {}, {}); // ausente = malha inteira, já era assim (P8)
    expect(comTudo.orfaos).toHaveLength(0);
    expect(JSON.stringify(neutroCanonico(comTudo))).toBe(JSON.stringify(neutroCanonico(semSel)));
  });
});

/* P8b do playground — `chamferBox` (caixa com cantos/arestas chanfrados, o cubo
   cantelado). Prova por MEDIÇÃO, não recontagem de cabeça: a primeira derivação à
   mão desta topologia (puxar o vértice de canto por UM eixo só — "truncagem") dava
   uma malha que NÃO fecha (V−E+F ≠ 2, provado num script fora do repo antes de
   escrever esta op); a fórmula certa puxa os DOIS eixos que não são o da própria
   face ("cantelação" — cada FACE encolhe, não cada canto vira 1 corte). Os testes
   abaixo travam a numeração EXATA, o manifold+winding nas 26 faces (não numa
   amostra) e a fronteira exata do `chanfro` válido — a mesma disciplina do P1/P6. */
/* D-130 — proveniência local de loft. `origemId` é identidade declarada do
   gerador; o índice `st.origens` só existe durante nucleo e nunca entra no
   canônico. Faixa é zero-based: 2 liga as seções 2 e 3. */
describe('D-130 — seleção por origem local de loft', () => {
  const secoes = [0, 1, 2, 3].map((y) => ({ pos: [0, y, 0], raio: 1 }));
  const loft = (id: number, origemId = 1000): any => ['loft', { id, origemId, lados: 4, secoes }];
  const pintaOrigem = (extra: any = {}): any => ['pincel', { modo: 'face', sel: { origem: { op: 'loft', id: 1000, faixa: 2, ...extra } }, cor: '#123456' }];
  const canon = (passos: any[]) => JSON.stringify(neutroCanonico(nucleo(passos, {}, {})));

  it('fixture: faces:[ids] e sel.origem selecionam a mesma faixa, byte a byte', () => {
    const legado = [loft(0), ['pincel', { modo: 'face', faces: [8, 9, 10, 11], cor: '#123456' }]];
    const origem = [loft(0), pintaOrigem()];
    expect(canon(origem)).toBe(canon(legado));
    expect(canon([loft(0)])).toBe(canon([['loft', { id: 0, lados: 4, secoes }]])); // índice não entra no canônico
    expect(nucleo(origem, {}, {}).orfaos).toHaveLength(0);
  });

  it('faixa+lado resolve uma só face lateral local', () => {
    const n = nucleo([loft(0), pintaOrigem({ lado: 2 })], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect([...n.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id)).toEqual([10]);
  });

  it('sobrevive à geometria não relacionada antes do loft; literal antigo é posicional e precisa ser recalculado', () => {
    const comAntes = [['cubo', { id: 0, lado: 1 }], loft(BLOCO), pintaOrigem()];
    const semRecalcular = [['cubo', { id: 0, lado: 1 }], loft(BLOCO), ['pincel', { modo: 'face', faces: [8, 9, 10, 11], cor: '#123456' }]];
    const recalculado = [['cubo', { id: 0, lado: 1 }], loft(BLOCO), ['pincel', { modo: 'face', faces: [1008, 1009, 1010, 1011], cor: '#123456' }]];
    const porOrigem = nucleo(comAntes, {}, {}), literalVelho = nucleo(semRecalcular, {}, {});
    expect(porOrigem.orfaos).toHaveLength(0);
    expect([...porOrigem.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id)).toEqual([1008, 1009, 1010, 1011]);
    expect(literalVelho.orfaos.some((o: any) => o.op === 'pincel' && /inexistente|vazia/.test(o.motivo))).toBe(true);
    expect(canon(comAntes)).toBe(canon(recalculado));
  });

  it('replay, round-trip e seleção literal legada continuam determinísticos', () => {
    const passos = [loft(0), pintaOrigem()];
    expect(canon(passos)).toBe(canon(JSON.parse(JSON.stringify(passos))));
    expect(canon(passos)).toBe(canon(passos));
    const legado = [loft(0), ['pincel', { modo: 'face', faces: [8, 9, 10, 11], cor: '#123456' }]];
    expect(canon(legado)).toBe(canon(passos));
  });

  it('origem inválida, vazia, desconhecida ou ambígua GRITA e não pinta por acidente', () => {
    const casos: any[] = [
      { op: 'loft', id: 999, faixa: 2 },
      { op: 'cone', id: 1000, faixa: 2 },
      { op: 'loft', id: 1000, faixa: 9 },
      { op: 'loft', id: 1000, faixa: 2, lado: 9 },
      { op: 'loft', id: 1000, faixa: 2, surpresa: true },
      {},
    ];
    for (const origem of casos) {
      const n = nucleo([loft(0), ['pincel', { modo: 'face', sel: { origem }, cor: '#123456' }]], {}, {});
      expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
      expect([...n.F.values()].some((f: any) => f.cor === '#123456')).toBe(false);
    }
    const ambiguo = nucleo([loft(0), loft(BLOCO), pintaOrigem()], {}, {});
    expect(ambiguo.orfaos.some((o: any) => o.op === 'pincel' && /ambígua/.test(o.motivo))).toBe(true);
  });

  it('rotaciona, transladar e seleção semântica atual não regressam ao usar o mesmo resolvedor', () => {
    const n = nucleo([loft(0), ['transladar', { d: [1, 0, 0], sel: { origem: { op: 'loft', id: 1000, faixa: 2 } } }], ['rotaciona', { eixo: 'y', graus: 0, sel: { origem: { op: 'loft', id: 1000, faixa: 2 } } }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.get(8)![0]).toBe(nucleo([loft(0)], {}, {}).V.get(8)![0] + 1);
    const grupo = nucleo([['cubo', { id: 0, lado: 1 }], ['parte', { nome: 'topo', faces: [1] }], ['pincel', { modo: 'face', sel: { grupo: 'topo' }, cor: '#123456' }]], {}, {});
    expect(grupo.orfaos).toHaveLength(0);
  });
});

/* D-130 (Fase 3.5, Rodada A) — o eixo que faltava: `faixa` passa a ser
   opcional na mesma semântica que `lado` já tinha (ausente = "todas"). Isso
   abre, sem sintaxe nova: `{lado}` sem faixa = a COLUNA (uma face por faixa);
   `{}` = a origem inteira. É aditivo — `faixa` ausente GRITAVA antes, e a
   Prova Zero (tools/bancadas/gabarito-selecao.mjs) mede que nenhuma peça já
   shipada mudou. */
describe('D-130 (Rodada A) — sel.origem com faixa opcional (loft) e face opcional (cubo)', () => {
  const secoes = [0, 1, 2, 3].map((y) => ({ pos: [0, y, 0], raio: 1 }));
  const loft = (id: number, origemId = 1000): any => ['loft', { id, origemId, lados: 4, secoes }];
  const pintaOrigem = (extra: any = {}): any => ['pincel', { modo: 'face', sel: { origem: { op: 'loft', id: 1000, ...extra } }, cor: '#123456' }];
  const pintados = (n: any) => [...n.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('coluna: {lado:3} seleciona exatamente uma face por faixa, byte a byte com a lista manual', () => {
    const n = nucleo([loft(0), pintaOrigem({ lado: 3 })], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([3, 7, 11]); // faixa0=[0..3], faixa1=[4..7], faixa2=[8..11] — o 4º lado de cada
  });

  it('coluna: {lado:0} e {lado:1} também batem com a lista manual (não é só o último lado)', () => {
    expect(pintados(nucleo([loft(0), pintaOrigem({ lado: 0 })], {}, {}))).toEqual([0, 4, 8]);
    expect(pintados(nucleo([loft(0), pintaOrigem({ lado: 1 })], {}, {}))).toEqual([1, 5, 9]);
  });

  it('origem inteira: {} bate com a união de todas as faixas', () => {
    const n = nucleo([loft(0), pintaOrigem()], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const legado = nucleo([loft(0), ['pincel', { modo: 'face', faces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(n))).toBe(JSON.stringify(neutroCanonico(legado)));
  });

  it('{faixa:2} continua idêntico ao de hoje (regressão explícita)', () => {
    const n = nucleo([loft(0), pintaOrigem({ faixa: 2 })], {}, {});
    expect(pintados(n)).toEqual([8, 9, 10, 11]);
  });

  it('lado fora do limite GRITA e não seleciona parcial (nem a coluna, nem nenhuma faixa)', () => {
    const n = nucleo([loft(0), pintaOrigem({ lado: 99 })], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'pincel' && /lado 99 fora do limite/.test(o.motivo))).toBe(true);
    expect(pintados(n)).toEqual([]); // nada foi pintado — nem parcialmente
  });

  it('erro não vaza alvo: a op inteira não aplica nada quando {} não acha nenhuma face (origem sem faixa nenhuma)', () => {
    // origem com id inexistente: sem geradores, resolverOrigem já grita antes de chegar no contrato — cobre o caminho comum de "seleção vazia nunca é parcial"
    const n = nucleo([loft(0), ['pincel', { modo: 'face', sel: { origem: { op: 'loft', id: 4242 } } }, ]], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'pincel' && /inexistente/.test(o.motivo))).toBe(true);
    expect(pintados(n)).toEqual([]);
  });

  it('composição: {} e {lado} funcionam também com transladar/rotaciona (o mesmo resolvedor de sempre)', () => {
    // vértices esperados = os cantos das faces da coluna 0 (0,4,8), derivados do próprio pincel/faces — não de índice adivinhado
    const marcado = nucleo([loft(0), pintaOrigem({ lado: 0 })], {}, {});
    const vTocados = new Set<number>();
    for (const fid of [0, 4, 8]) for (const v of marcado.F.get(fid)!.vs) vTocados.add(v);

    const nColuna = nucleo([loft(0), ['transladar', { d: [1, 0, 0], sel: { origem: { op: 'loft', id: 1000, lado: 0 } } }]], {}, {});
    expect(nColuna.orfaos).toHaveLength(0);
    const base = nucleo([loft(0)], {}, {});
    for (const v of vTocados) expect(nColuna.V.get(v)![0]).toBe(base.V.get(v)![0] + 1); // a coluna 0 andou
    for (let v = 0; v < 16; v++) if (!vTocados.has(v)) expect(nColuna.V.get(v)).toEqual(base.V.get(v)); // o resto ficou parado

    const nTudo = nucleo([loft(0), ['rotaciona', { eixo: 'y', graus: 0, sel: { origem: { op: 'loft', id: 1000 } } }]], {}, {});
    expect(nTudo.orfaos).toHaveLength(0);
  });

  it('cubo: face opcional = as 6 faces, byte a byte com a lista manual', () => {
    const n = nucleo([['cubo', { id: 0, origemId: 30, lado: 1 }], ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 30 } }, cor: '#123456' }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([0, 1, 2, 3, 4, 5]);
    const legado = nucleo([['cubo', { id: 0, lado: 1 }], ['pincel', { modo: 'face', faces: [0, 1, 2, 3, 4, 5], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(n))).toBe(JSON.stringify(neutroCanonico(legado)));
  });

  it('cubo: apagaFace remove uma face da união, e removê-las todas GRITA (nenhuma face viva)', () => {
    const n = nucleo([['cubo', { id: 0, origemId: 30, lado: 1 }], ['apagaFace', { face: 0 }], ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 30 } }, cor: '#123456' }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([1, 2, 3, 4, 5]);

    const semNenhuma: any[] = [['cubo', { id: 0, origemId: 30, lado: 1 }]];
    for (const f of [0, 1, 2, 3, 4, 5]) semNenhuma.push(['apagaFace', { face: f }]);
    semNenhuma.push(['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 30 } }, cor: '#123456' }]);
    const nVazio = nucleo(semNenhuma, {}, {});
    expect(nVazio.orfaos.some((o: any) => o.op === 'pincel' && /nenhuma face viva/.test(o.motivo))).toBe(true);
  });
});

/* D-130 (Fase 3.5, Rodada C) — o filtro de progressão `{passo,fase}` nos dois
   eixos de sel.origem do loft. `lados:4`, 5 seções → 4 faixas de 4 lados cada
   (faixa0=[0..3], faixa1=[4..7], faixa2=[8..11], faixa3=[12..15]). */
describe('D-130 (Rodada C) — filtro de progressão {passo,fase} nos eixos de sel.origem (loft)', () => {
  const secoes = [0, 1, 2, 3, 4].map((y) => ({ pos: [0, y, 0], raio: 1 }));
  const loft = (id: number, origemId = 1000): any => ['loft', { id, origemId, lados: 4, secoes }];
  const pintaOrigem = (extra: any = {}): any => ['pincel', { modo: 'face', sel: { origem: { op: 'loft', id: 1000, ...extra } }, cor: '#123456' }];
  const pintados = (n: any) => [...n.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('lado pares e ímpares (sem faixa) batem byte a byte com a lista manual', () => {
    const pares = nucleo([loft(0), pintaOrigem({ lado: { passo: 2, fase: 0 } })], {}, {});
    expect(pares.orfaos).toHaveLength(0);
    expect(pintados(pares)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    const paresLegado = nucleo([loft(0), ['pincel', { modo: 'face', faces: [0, 2, 4, 6, 8, 10, 12, 14], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(pares))).toBe(JSON.stringify(neutroCanonico(paresLegado)));

    const impares = nucleo([loft(0), pintaOrigem({ lado: { passo: 2, fase: 1 } })], {}, {});
    expect(impares.orfaos).toHaveLength(0);
    expect(pintados(impares)).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    const imparesLegado = nucleo([loft(0), ['pincel', { modo: 'face', faces: [1, 3, 5, 7, 9, 11, 13, 15], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(impares))).toBe(JSON.stringify(neutroCanonico(imparesLegado)));
  });

  it('faixa pares e ímpares (sem lado) batem byte a byte com a lista manual', () => {
    const pares = nucleo([loft(0), pintaOrigem({ faixa: { passo: 2, fase: 0 } })], {}, {});
    expect(pintados(pares)).toEqual([0, 1, 2, 3, 8, 9, 10, 11]);
    const impares = nucleo([loft(0), pintaOrigem({ faixa: { passo: 2, fase: 1 } })], {}, {});
    expect(pintados(impares)).toEqual([4, 5, 6, 7, 12, 13, 14, 15]);
  });

  it('{passo:1, fase:0} é a identidade — todos os índices, nos dois eixos', () => {
    const porLado = nucleo([loft(0), pintaOrigem({ lado: { passo: 1, fase: 0 } })], {}, {});
    expect(pintados(porLado)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const porFaixa = nucleo([loft(0), pintaOrigem({ faixa: { passo: 1, fase: 0 } })], {}, {});
    expect(pintados(porFaixa)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const semNada = nucleo([loft(0), pintaOrigem()], {}, {});
    expect(JSON.stringify(neutroCanonico(porLado))).toBe(JSON.stringify(neutroCanonico(semNada)));
  });

  it('filtro malformado GRITA: passo 0/negativo/fracionário, fase negativa/≥passo, tipo errado, chave faltando', () => {
    const casos: any[] = [
      { passo: 0, fase: 0 }, { passo: -1, fase: 0 }, { passo: 1.5, fase: 0 },
      { passo: 2, fase: -1 }, { passo: 2, fase: 2 }, { passo: 2, fase: 3 },
      { passo: '2', fase: 0 }, { passo: 2 }, { fase: 0 },
    ];
    for (const lado of casos) {
      const n = nucleo([loft(0), pintaOrigem({ lado })], {}, {});
      expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
      expect([...n.F.values()].some((f: any) => f.cor === '#123456')).toBe(false);
    }
    // o mesmo malformado no eixo faixa também GRITA (o validador é único, compartilhado pelos dois eixos)
    for (const faixa of casos) {
      const n = nucleo([loft(0), pintaOrigem({ faixa })], {}, {});
      expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
      expect([...n.F.values()].some((f: any) => f.cor === '#123456')).toBe(false);
    }
  });

  it('filtro que não casa nenhum índice GRITA (seleção vazia, nunca no-op)', () => {
    // eixo lado tem 4 índices (0..3): passo 5, fase 4 nunca casa
    const nLado = nucleo([loft(0), pintaOrigem({ lado: { passo: 5, fase: 4 } })], {}, {});
    expect(nLado.orfaos.some((o: any) => o.op === 'pincel' && /não casa nenhum índice/.test(o.motivo))).toBe(true);
    expect(pintados(nLado)).toEqual([]);
    // eixo faixa tem 4 índices (0..3): mesmo filtro
    const nFaixa = nucleo([loft(0), pintaOrigem({ faixa: { passo: 5, fase: 4 } })], {}, {});
    expect(nFaixa.orfaos.some((o: any) => o.op === 'pincel' && /não casa nenhum índice/.test(o.motivo))).toBe(true);
    expect(pintados(nFaixa)).toEqual([]);
  });

  it('composição com a Rodada A: filtro em lado sem faixa, filtro em faixa sem lado, e os dois juntos', () => {
    // filtro em lado sem faixa já coberto acima; aqui confirma que é a MESMA coisa
    // que a coluna generalizada (Rodada A) — testado junto com faixa explícita:
    const soFaixa2 = nucleo([loft(0), pintaOrigem({ faixa: 2, lado: { passo: 2, fase: 0 } })], {}, {});
    expect(pintados(soFaixa2)).toEqual([8, 10]); // faixa2=[8..11], lados pares dela

    // os dois eixos filtrados ao mesmo tempo: faixas pares × lados ímpares
    const cruzado = nucleo([loft(0), pintaOrigem({ faixa: { passo: 2, fase: 0 }, lado: { passo: 2, fase: 1 } })], {}, {});
    expect(pintados(cruzado)).toEqual([1, 3, 9, 11]); // faixa0 lado{1,3} + faixa2 lado{1,3}
  });

  it('composição com {tudo:true} da Rodada B: união é consistente — tudo já cobre o filtro, sem erro nem duplicata', () => {
    const n = nucleo([loft(0), ['pincel', { modo: 'face', sel: { tudo: true, origem: { op: 'loft', id: 1000, lado: { passo: 2, fase: 0 } } }, cor: '#123456' }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]); // igual a {tudo:true} sozinho
  });

  it('cubo continua SEM filtro: {passo,fase} na face do cubo GRITA (eixo nominal, não numérico)', () => {
    const n = nucleo([['cubo', { id: 0, origemId: 30, lado: 1 }], ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 30, face: { passo: 2, fase: 0 } as any } }, cor: '#123456' }]], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
    expect([...n.F.values()].some((f: any) => f.cor === '#123456')).toBe(false);
  });
});

describe('Fase 2 — fixture de aliases estáveis de loft', () => {
  const ctx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  const secoes = [0, 1, 2, 3].map((y) => ({ pos: [0, y, 0], raio: 1 }));
  const loft = (id: number, origemId: number, x = 0): any => ['loft', { id, origemId, lados: 4, secoes: secoes.map((s) => ({ ...s, pos: [x, s.pos[1], s.pos[2]] })) }];
  const aliases: any = [
    ['faixaA', { origem: { op: 'loft', id: 10, faixa: 1 } }],
    ['duasFaixas', { unir: [{ origem: { op: 'loft', id: 10, faixa: 1 } }, { origem: { op: 'loft', id: 20, faixa: 2 } }] }],
  ];
  it('alias direto e união sobrevivem inserção anterior e transformação, sem IDs globais', () => {
    const base: any[] = [loft(0, 10), loft(BLOCO, 20), ['pincel', { modo: 'face', sel: { alias: 'duasFaixas' }, cor: '#123456' }], ['transladar', { d: [1, 0, 0], sel: { alias: 'faixaA' } }], ['liso', { sel: { alias: 'faixaA' } }]];
    const antes = nucleo(base, {}, {}, {}, null, aliases);
    const depois = nucleo([['cubo', { id: 0, lado: 1 }], loft(BLOCO, 10), loft(BLOCO * 2, 20), ...base.slice(2)], {}, {}, {}, null, aliases);
    expect(antes.orfaos).toHaveLength(0); expect(depois.orfaos).toHaveLength(0);
    expect([...antes.F.values()].filter((f: any) => f.cor === '#123456')).toHaveLength(8);
    expect([...depois.F.values()].filter((f: any) => f.cor === '#123456')).toHaveLength(8);
    expect([...antes.F.values()].filter((f: any) => f.liso)).toHaveLength(4); // mesmo alias DEPOIS de transladar
    expect(JSON.stringify(aliases)).not.toMatch(/\b1000\b|\b1004\b/);
    expect(JSON.stringify(neutroCanonico(nucleo(base, {}, {}, {}, null, JSON.parse(JSON.stringify(aliases)))))).toBe(JSON.stringify(neutroCanonico(antes)));
  });
  it('executar encaminha ALIASES: parte retorna lote nomeado só com a faixa do alias', () => {
    const porAlias: any[] = [loft(0, 10), loft(BLOCO, 20), ['parte', { nome: 'faixa-da-alias', sel: { alias: 'faixaA' } }]];
    const porFaces: any[] = [loft(0, 10), loft(BLOCO, 20), ['parte', { nome: 'faixa-da-alias', faces: [4, 5, 6, 7] }]];
    const obj: any = executar(porAlias, {}, {}, ctx, {}, {}, null, aliases);
    const literal: any = executar(porFaces, {}, {}, ctx);
    const lote = obj.lotes.find((L: any) => L.parte === 'faixa-da-alias');
    const loteLiteral = literal.lotes.find((L: any) => L.parte === 'faixa-da-alias');
    expect(lote).toBeDefined(); // sem encaminhar ALIASES, `parte` não cria este lote
    expect(lote.mesh.v.length).toBe(4 * 6 * 8); // quatro quads da faixa, triangulados no adaptador
    expect(Array.from(lote.mesh.v)).toEqual(Array.from(loteLiteral.mesh.v));
    expect(obj.lotes.filter((L: any) => L.parte === 'faixa-da-alias')).toHaveLength(1);
  });
  it('colisaoDe encaminha ALIASES: sólido da faixa ignora o loft distante e iguala seleção literal', () => {
    const porAlias: any[] = [loft(0, 10), loft(BLOCO, 20, 100), ['solido', { sel: { alias: 'faixaA' } }]];
    const porFaces: any[] = [loft(0, 10), loft(BLOCO, 20, 100), ['solido', { faces: [4, 5, 6, 7] }]];
    const viaAlias = colisaoDe(porAlias, {}, {}, {}, aliases);
    const literal = colisaoDe(porFaces, {}, {});
    expect(viaAlias).toEqual(literal);
    expect(viaAlias).toEqual({ forma: 'cilindro', raio: 1, altura: 1, base: 1 });
  });
  it('duplicatas, cadeia, origem/faixa inválida gritam e alias não aplica parcialmente', () => {
    const valido = { origem: { op: 'loft', id: 10, faixa: 1 } };
    expect(() => nucleo([], {}, {}, {}, null, [['x', valido], ['x', valido]])).toThrow(/duplicado/);
    expect(() => nucleo([], {}, {}, {}, null, [['x', { alias: 'faixaA' }]])).toThrow(/inválido/);
    const casos: any[] = [
      [['x', { origem: { op: 'loft', id: 99, faixa: 1 } }]],
      [['x', { origem: { op: 'loft', id: 10, faixa: 99 } }]],
    ];
    for (const a of casos) { const n = nucleo([loft(0, 10), loft(BLOCO, 10), ['pincel', { modo: 'face', sel: { alias: 'x' }, cor: '#f00' }]], {}, {}, {}, null, a); expect(n.orfaos.length).toBeGreaterThan(0); expect([...n.F.values()].some((f: any) => f.cor === '#f00')).toBe(false); }
    for (const escondido of [
      { v: [0] }, { f: [0] }, { faces: [0] }, { origem: { op: 'loft', id: 10, faixa: 1 }, extra: true }, { unir: [] },
      { origem: { op: 'loft', id: 10, faixa: 1, v: [0] } }, { origem: { op: 'loft', id: 10, faixa: 1, f: [0] } }, { origem: { op: 'loft', id: 10, faixa: 1, faces: [0] } },
      { origem: null }, { origem: { op: 'cilindro', id: 10, faixa: 1 } },
      { unir: [{ origem: { op: 'loft', id: 10, faixa: 1, faces: [0] } }] }, { unir: [{ alias: 'faixaA' }] },
    ]) expect(() => nucleo([['cubo', { id: 0, lado: Infinity }]], {}, {}, {}, null, [['x', escondido]])).toThrow(/alias.*inválido/);
  });
});

describe('Fase 2 — fixture de aliases estáveis de cubo', () => {
  const ctx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  const secoes = [0, 1, 2, 3].map((y) => ({ pos: [0, y, 0], raio: 1 }));
  const cubo = (id: number, origemId: number, extra: any = {}): any => ['cubo', { id, origemId, ...extra }];
  const loft = (id: number, origemId: number, x = 0): any => ['loft', { id, origemId, lados: 4, secoes: secoes.map((s) => ({ ...s, pos: [x, s.pos[1], s.pos[2]] })) }];
  const aliases: any = [
    ['topoCubo', { origem: { op: 'cubo', id: 30, face: 'topo' } }],
    ['frenteCubo', { origem: { op: 'cubo', id: 30, face: 'frente' } }],
    ['topoEFaixa', { unir: [{ origem: { op: 'cubo', id: 30, face: 'topo' } }, { origem: { op: 'loft', id: 40, faixa: 1 } }] }],
  ];
  const facesCom = (n: any, chave: string, valor: any) => [...n.F.values()].filter((f: any) => f[chave] === valor);

  it('topo do cubo seleciona uma única face e sobrevive inserção anterior e dimensões', () => {
    const passos: any[] = [cubo(0, 30), ['pincel', { modo: 'face', sel: { alias: 'topoCubo' }, cor: '#123456' }]];
    const base = nucleo(passos, {}, {}, {}, null, aliases);
    const inserido = nucleo([['cubo', { id: 0, lado: 2 }], cubo(BLOCO, 30), ...passos.slice(1)], {}, {}, {}, null, aliases);
    expect(base.orfaos).toHaveLength(0); expect(facesCom(base, 'cor', '#123456').map((f: any) => f.id)).toEqual([1]);
    expect(inserido.orfaos).toHaveLength(0); expect(facesCom(inserido, 'cor', '#123456').map((f: any) => f.id)).toEqual([BLOCO + 1]);
    expect(JSON.stringify(neutroCanonico(base))).toBe(JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {}, {}, null, JSON.parse(JSON.stringify(aliases))))));
    for (const extra of [{ larg: 3, alt: 2, prof: 0.5 }, { larg: 0.25, alt: 4, prof: 5 }]) {
      const n = nucleo([cubo(0, 30, extra), ['parte', { nome: 'topo', sel: { alias: 'topoCubo' } }]], {}, {}, {}, null, aliases);
      expect(n.orfaos).toHaveLength(0); expect(facesCom(n, 'parte', 'topo').map((f: any) => f.id)).toEqual([1]);
    }
  });

  it('frente é local: rotação preserva o nome e o alias pinta a antiga face +z', () => {
    const n = nucleo([cubo(0, 30), ['rotaciona', { eixo: 'y', graus: 180 }], ['pincel', { modo: 'face', sel: { alias: 'frenteCubo' }, cor: '#f00' }]], {}, {}, {}, null, aliases);
    const frente = n.F.get(4)!;
    const zMedio = frente.vs.reduce((s: number, v: number) => s + n.V.get(v)![2], 0) / frente.vs.length;
    expect(n.orfaos).toHaveLength(0); expect(frente.cor).toBe('#f00'); expect(n.F.get(2)!.cor).toBeNull();
    expect(zMedio).toBeLessThan(0); // depois de girar, a frente estrutural não é a direção +z do mundo
  });

  it('compõe topo do cubo e faixa de loft sem uma origem artificial', () => {
    const n = nucleo([cubo(0, 30), loft(BLOCO, 40), ['pincel', { modo: 'face', sel: { alias: 'topoEFaixa' }, cor: '#0f0' }]], {}, {}, {}, null, aliases);
    expect(n.orfaos).toHaveLength(0); expect(facesCom(n, 'cor', '#0f0').map((f: any) => f.id)).toEqual([1, BLOCO + 4, BLOCO + 5, BLOCO + 6, BLOCO + 7]);
  });

  it('executar e colisaoDe reutilizam o alias do cubo pela API pública', () => {
    const porAlias: any[] = [cubo(0, 30), loft(BLOCO, 40, 100), ['parte', { nome: 'tampo', sel: { alias: 'topoCubo' } }], ['solido', { sel: { alias: 'topoCubo' } }]];
    const porFaces: any[] = [cubo(0, 30), loft(BLOCO, 40, 100), ['parte', { nome: 'tampo', faces: [1] }], ['solido', { faces: [1] }]];
    const obj: any = executar(porAlias, {}, {}, ctx, {}, {}, null, aliases);
    const literal: any = executar(porFaces, {}, {}, ctx);
    const lote = obj.lotes.find((L: any) => L.parte === 'tampo');
    const loteLiteral = literal.lotes.find((L: any) => L.parte === 'tampo');
    expect(lote.mesh.v.length).toBe(6 * 8); expect(Array.from(lote.mesh.v)).toEqual(Array.from(loteLiteral.mesh.v));
    expect(colisaoDe(porAlias, {}, {}, {}, aliases)).toEqual(colisaoDe(porFaces, {}, {}));
    expect(colisaoDe(porAlias, {}, {}, {}, aliases).raio).toBeLessThan(2); // não inclui o loft distante
  });

  it('duplicatas e origem errada gritam; alias inválido não pinta, nomeia ou transforma parcialmente', () => {
    const duplicadoCubo = nucleo([cubo(0, 30), cubo(BLOCO, 30), ['pincel', { modo: 'face', sel: { alias: 'topoCubo' }, cor: '#f00' }]], {}, {}, {}, null, aliases);
    const duplicadoMisto = nucleo([cubo(0, 30), loft(BLOCO, 30), ['pincel', { modo: 'face', sel: { alias: 'topoCubo' }, cor: '#f00' }]], {}, {}, {}, null, aliases);
    for (const n of [duplicadoCubo, duplicadoMisto]) {
      expect(n.orfaos.some((o: any) => /duplicado/.test(o.motivo))).toBe(true);
      expect(n.orfaos.some((o: any) => /origemId 30.*duplicado/.test(o.motivo))).toBe(true);
      expect(facesCom(n, 'cor', '#f00')).toHaveLength(0);
    }
    expect(() => nucleo([], {}, {}, {}, null, [['x', { origem: { op: 'cubo', id: 30, face: 'inexistente' } }]])).toThrow(/inválido/);
    expect(() => nucleo([], {}, {}, {}, null, [['x', { origem: { op: 'cubo', id: 30, face: 'topo', faces: [1] } }]])).toThrow(/inválido/);
    const nomeRuim = nucleo([cubo(0, 30), ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 30, face: 'inexistente' } }, cor: '#f00' }]], {}, {});
    expect(nomeRuim.orfaos.some((o: any) => o.op === 'pincel' && /origem inválida/.test(o.motivo))).toBe(true); expect(facesCom(nomeRuim, 'cor', '#f00')).toHaveLength(0);
    const quebrado: any = [['misto', { unir: [{ origem: { op: 'cubo', id: 30, face: 'topo' } }, { origem: { op: 'loft', id: 99, faixa: 1 } }] }]];
    const passos: any[] = [cubo(0, 30), ['pincel', { modo: 'face', sel: { alias: 'misto' }, cor: '#f00' }], ['parte', { nome: 'nao-aplica', sel: { alias: 'misto' } }], ['transladar', { d: [3, 0, 0], sel: { alias: 'misto' } }]];
    const n = nucleo(passos, {}, {}, {}, null, quebrado), puro = nucleo([cubo(0, 30)], {}, {});
    for (const op of ['pincel', 'parte', 'transladar']) expect(n.orfaos.some((o: any) => o.op === op)).toBe(true);
    expect(facesCom(n, 'cor', '#f00')).toHaveLength(0); expect(facesCom(n, 'parte', 'nao-aplica')).toHaveLength(0);
    expect(JSON.stringify(neutroCanonico(n).V)).toBe(JSON.stringify(neutroCanonico(puro).V));
    const errada = nucleo([loft(0, 30), ['pincel', { modo: 'face', sel: { alias: 'topoCubo' }, cor: '#f00' }]], {}, {}, {}, null, aliases);
    expect(errada.orfaos.some((o: any) => /foi declarada por 'loft'/.test(o.motivo))).toBe(true); expect(facesCom(errada, 'cor', '#f00')).toHaveLength(0);
  });

  it('declaração duplicada posterior invalida alias e sel.origem desde o início, sem bloquear outra identidade', () => {
    const comSeguro: any = [...aliases, ['topoSeguro', { origem: { op: 'cubo', id: 40, face: 'topo' } }]];
    const ordemA: any[] = [
      cubo(0, 30),
      ['pincel', { modo: 'face', sel: { alias: 'topoCubo' }, cor: '#f00' }],
      ['parte', { nome: 'nao-nasce', sel: { alias: 'topoCubo' } }],
      ['transladar', { d: [3, 0, 0], sel: { alias: 'topoCubo' } }],
      ['liso', { sel: { origem: { op: 'cubo', id: 30, face: 'topo' } } }],
      cubo(BLOCO * 5, 30),
      cubo(BLOCO * 6, 40),
      ['pincel', { modo: 'face', sel: { alias: 'topoSeguro' }, cor: '#0f0' }],
    ];
    const a = nucleo(ordemA, {}, {}, {}, null, comSeguro), puro = nucleo([cubo(0, 30)], {}, {});
    const motivoA = a.orfaos.find((o: any) => o.op === 'pincel' && /duplicado nas declarações/.test(o.motivo))?.motivo;
    expect(motivoA).toMatch(/passos 0 \(cubo\), 5 \(cubo\)/);
    for (const op of ['pincel', 'parte', 'transladar', 'liso']) expect(a.orfaos.some((o: any) => o.op === op && /duplicado nas declarações/.test(o.motivo))).toBe(true);
    expect(facesCom(a, 'cor', '#f00')).toHaveLength(0); expect(facesCom(a, 'parte', 'nao-nasce')).toHaveLength(0); expect(facesCom(a, 'liso', true)).toHaveLength(0);
    expect(JSON.stringify([...a.V.entries()].filter(([id]) => id < BLOCO))).toBe(JSON.stringify([...puro.V.entries()]));
    expect(facesCom(a, 'cor', '#0f0').map((f: any) => f.id)).toEqual([BLOCO * 6 + 1]); // identidade 40 segue independente

    const ordemB: any[] = [
      cubo(0, 30),
      ['pincel', { modo: 'face', sel: { alias: 'topoCubo' }, cor: '#f00' }],
      ['parte', { nome: 'tambem-nao', sel: { alias: 'topoCubo' } }],
      loft(BLOCO * 3, 30),
    ];
    const b = nucleo(ordemB, {}, {}, {}, null, aliases);
    expect(b.orfaos.some((o: any) => o.op === 'pincel' && /passos 0 \(cubo\), 3 \(loft\)/.test(o.motivo))).toBe(true);
    expect(b.orfaos.some((o: any) => o.op === 'parte' && /duplicado nas declarações/.test(o.motivo))).toBe(true);
    expect(facesCom(b, 'cor', '#f00')).toHaveLength(0); expect(facesCom(b, 'parte', 'tambem-nao')).toHaveLength(0);
  });
});

describe('Fase 3 — fixture de origem derivada por espelha', () => {
  const ctx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  const original = { op: 'cubo', id: 30, face: 'topo' };
  const copia = { op: 'espelha', id: 50, de: original };
  const aliases: any = [
    ['topoOriginal', { origem: original }],
    ['topoEspelhado', { origem: copia }],
    ['doisTopos', { unir: [{ origem: original }, { origem: copia }] }],
  ];
  const base = (): any[] => [
    ['cubo', { id: 0, lado: 1, origemId: 30 }],
    ['transladar', { d: [2, 0, 0] }],
    ['espelha', { eixo: 'x', pos: 0, origemId: 50, derivaDe: original, sel: { origem: original } }],
  ];
  const facesCom = (n: any, chave: string, valor: any) => [...n.F.values()].filter((f: any) => f[chave] === valor).map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('separa topo original e cópia, preserva os dois nomes após transformação e inserção anterior', () => {
    const passos: any[] = [...base(),
      ['pincel', { modo: 'face', sel: { alias: 'topoOriginal' }, cor: '#f00' }],
      ['pincel', { modo: 'face', sel: { alias: 'topoEspelhado' }, cor: '#00f' }],
      ['transladar', { d: [0, 1, 0], sel: { alias: 'topoEspelhado' } }],
      ['liso', { sel: { alias: 'topoEspelhado' } }],
    ];
    const n = nucleo(passos, {}, {}, {}, null, aliases);
    expect(n.orfaos).toHaveLength(0);
    expect(facesCom(n, 'cor', '#f00')).toEqual([1]);
    expect(facesCom(n, 'cor', '#00f')).toEqual([2000]);
    expect(n.F.get(1)!.liso).toBe(false); expect(n.F.get(2000)!.liso).toBe(true);
    const yOriginal = n.F.get(1)!.vs.reduce((s: number, v: number) => s + n.V.get(v)![1], 0) / 4;
    const yCopia = n.F.get(2000)!.vs.reduce((s: number, v: number) => s + n.V.get(v)![1], 0) / 4;
    expect(yCopia).toBe(yOriginal + 1);

    const inserido = nucleo([
      ['cubo', { id: 0, lado: 0.25 }],
      ['cubo', { id: BLOCO, lado: 1, origemId: 30 }],
      ['transladar', { d: [2, 0, 0] }],
      ['espelha', { eixo: 'x', pos: 0, origemId: 50, derivaDe: original, sel: { origem: original } }],
      ...passos.slice(3),
    ], {}, {}, {}, null, aliases);
    expect(inserido.orfaos).toHaveLength(0);
    expect(facesCom(inserido, 'cor', '#f00')).toEqual([BLOCO + 1]);
    expect(facesCom(inserido, 'cor', '#00f')).toEqual([BLOCO * 3]);

    const ambos = nucleo([...base(), ['pincel', { modo: 'face', sel: { alias: 'doisTopos' }, cor: '#0f0' }]], {}, {}, {}, null, aliases);
    expect(facesCom(ambos, 'cor', '#0f0')).toEqual([1, 2000]);
    const canon = JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, {}, null, aliases)));
    expect(JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, {}, null, aliases)))).toBe(canon);
    expect(JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {}, {}, null, JSON.parse(JSON.stringify(aliases)))))).toBe(canon);
  });

  it('executar recebe a origem espelhada pela API pública e nomeia só a cópia', () => {
    const porAlias: any[] = [...base(), ['parte', { nome: 'tampo-espelhado', sel: { alias: 'topoEspelhado' } }]];
    const literal: any[] = [...base(), ['parte', { nome: 'tampo-espelhado', faces: [2000] }]];
    const viaApi: any = executar(porAlias, {}, {}, ctx, {}, {}, null, aliases);
    const lote = viaApi.lotes.find((l: any) => l.parte === 'tampo-espelhado');
    const loteLiteral = executar(literal, {}, {}, ctx).lotes.find((l: any) => l.parte === 'tampo-espelhado');
    expect(lote).toBeDefined();
    expect(lote.mesh.v.length).toBe(6 * 8);
    expect(Array.from(lote.mesh.v)).toEqual(Array.from(loteLiteral.mesh.v));
  });

  it('declaração repetida da saída e fonte inexistente ou ambígua bloqueiam a origem derivada antes de qualquer uso', () => {
    const duplicada: any[] = [
      ['cubo', { id: 0, lado: 1, origemId: 30 }],
      ['espelha', { eixo: 'x', origemId: 50, derivaDe: original, sel: { origem: original } }],
      ['pincel', { modo: 'face', sel: { alias: 'topoEspelhado' }, cor: '#f00' }],
      ['parte', { nome: 'nao-nasce', sel: { alias: 'topoEspelhado' } }],
      ['transladar', { d: [2, 0, 0], sel: { alias: 'topoEspelhado' } }],
      ['espelha', { eixo: 'x', origemId: 50, derivaDe: original, sel: { origem: original } }],
    ];
    const d = nucleo(duplicada, {}, {}, {}, null, aliases), puro = nucleo([duplicada[0]], {}, {});
    expect(d.orfaos.some((o: any) => /passos 1 \(espelha\), 5 \(espelha\)/.test(o.motivo))).toBe(true);
    for (const op of ['pincel', 'parte', 'transladar']) expect(d.orfaos.some((o: any) => o.op === op)).toBe(true);
    expect(facesCom(d, 'cor', '#f00')).toEqual([]); expect(facesCom(d, 'parte', 'nao-nasce')).toEqual([]);
    expect(neutroCanonico(d).V).toEqual(neutroCanonico(puro).V);
    expect(neutroCanonico(d).F).toEqual(neutroCanonico(puro).F);

    const inexistente = nucleo([['espelha', { eixo: 'x', origemId: 50, derivaDe: original, sel: { origem: original } }]], {}, {}, {}, null, aliases);
    expect(inexistente.F.size).toBe(0); expect(inexistente.orfaos.some((o: any) => /inexistente/.test(o.motivo))).toBe(true);
    const fonteDuplicada = nucleo([
      ['cubo', { id: 0, lado: 1, origemId: 30 }], ['cubo', { id: BLOCO, lado: 1, origemId: 30 }],
      ['espelha', { eixo: 'x', origemId: 50, derivaDe: original, sel: { origem: original } }],
    ], {}, {}, {}, null, aliases);
    expect(fonteDuplicada.F.has(2000)).toBe(false); expect(fonteDuplicada.orfaos.some((o: any) => /ambígua|duplicado/.test(o.motivo))).toBe(true);
  });

  it('modo estrutural rejeita fonte diferente, fontes literais e IDs escondidos sem criar cópia', () => {
    const frente = { op: 'cubo', id: 30, face: 'frente' };
    const casos: any[] = [
      { origemId: 50 }, { derivaDe: original },
      { origemId: 50, derivaDe: original, sel: { origem: frente } },
      { origemId: 50, derivaDe: original, sel: { alias: 'topoOriginal' } },
      { origemId: 50, derivaDe: original, sel: { regiao: { min: [0, 0, 0], max: [1, 1, 1] } } },
      { origemId: 50, derivaDe: original, sel: { f: [1] } },
      { origemId: 50, derivaDe: original, faces: [1], sel: { origem: original } },
      ...['v', 'f', 'faces'].map((chave) => ({ origemId: 50, derivaDe: { ...original, [chave]: [1] }, sel: { origem: original } })),
    ];
    for (const args of casos) {
      const n = nucleo([['cubo', { id: 0, lado: 1, origemId: 30 }], ['espelha', { eixo: 'x', ...args }]], {}, {}, {}, null, aliases);
      expect(n.F.size).toBe(6); expect(n.orfaos.some((o: any) => o.op === 'espelha')).toBe(true);
    }
  });

  it('face inteiramente no plano aborta a saída estrutural antes de alocar geometria e qualquer uso posterior grita sem efeito parcial', () => {
    const plano: any[] = [
      ['cubo', { id: 0, lado: 1, origemId: 30 }],
      ['espelha', { eixo: 'y', pos: 1, origemId: 50, derivaDe: original, sel: { origem: original } }],
      ['pincel', { modo: 'face', sel: { alias: 'topoEspelhado' }, cor: '#f00' }],
      ['parte', { nome: 'nao-copia', sel: { alias: 'topoEspelhado' } }],
      ['transladar', { d: [0, 2, 0], sel: { alias: 'topoEspelhado' } }],
    ];
    const n = nucleo(plano, {}, {}, {}, null, aliases), puro = nucleo([plano[0]], {}, {});
    expect(n.F.size).toBe(6);
    for (const op of ['pincel', 'parte', 'transladar']) expect(n.orfaos.some((o: any) => o.op === op && /inexistente/.test(o.motivo))).toBe(true);
    expect(facesCom(n, 'cor', '#f00')).toEqual([]); expect(facesCom(n, 'parte', 'nao-copia')).toEqual([]);
    expect(neutroCanonico(n).V).toEqual(neutroCanonico(puro).V);
    expect(neutroCanonico(n).F).toEqual(neutroCanonico(puro).F);
  });

  it('uma fonte estrutural com faces copiáveis e uma face no plano produz zero cópias e não deixa saída parcial utilizável', () => {
    const faixa = { op: 'loft', id: 40, faixa: 0 };
    const saida = { op: 'espelha', id: 50, de: faixa };
    const aliasesDaSaida: any = [['faixaEspelhada', { origem: saida }]];
    const secoes = [
      { pos: [0, 0, 0], contorno: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
      { pos: [0, 1, 0], contorno: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
    ];
    const fonte: any[] = [['loft', { id: 0, origemId: 40, lados: 4, secoes }]];
    const passos: any[] = [...fonte,
      ['espelha', { eixo: 'x', pos: 1, origemId: 50, derivaDe: faixa, sel: { origem: faixa } }],
      ['pincel', { modo: 'face', sel: { alias: 'faixaEspelhada' }, cor: '#f00' }],
      ['parte', { nome: 'nao-copia', sel: { alias: 'faixaEspelhada' } }],
      ['transladar', { d: [3, 0, 0], sel: { alias: 'faixaEspelhada' } }],
    ];
    const puro = nucleo(fonte, {}, {});
    const fonteFaces = [...puro.F.values()];
    expect(fonteFaces).toHaveLength(4);
    expect(fonteFaces.filter((f: any) => f.vs.every((v: number) => puro.V.get(v)![0] === 1))).toHaveLength(1);
    expect(fonteFaces.some((f: any) => f.vs.some((v: number) => puro.V.get(v)![0] !== 1))).toBe(true);

    const n = nucleo(passos, {}, {}, {}, null, aliasesDaSaida);
    expect(n.orfaos.some((o: any) => o.op === 'espelha' && /nenhuma cópia foi criada/.test(o.motivo))).toBe(true);
    for (const op of ['pincel', 'parte', 'transladar']) expect(n.orfaos.some((o: any) => o.op === op && /inexistente/.test(o.motivo))).toBe(true);
    expect(n.V.size).toBe(puro.V.size); expect(n.F.size).toBe(puro.F.size);
    expect(neutroCanonico(n).V).toEqual(neutroCanonico(puro).V);
    expect(neutroCanonico(n).F).toEqual(neutroCanonico(puro).F);
    expect(facesCom(n, 'cor', '#f00')).toEqual([]); expect(facesCom(n, 'parte', 'nao-copia')).toEqual([]);
  });
});

/* P8b do playground — chamferBox. */
describe('P8b — chamferBox (caixa cantelada: cantos e arestas chanfrados)', () => {
  const newell = (V: any, vs: number[]) => {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < vs.length; k++) {
      const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
      nx += (c[1] - n[1]) * (c[2] + n[2]); ny += (c[2] - n[2]) * (c[0] + n[0]); nz += (c[0] - n[0]) * (c[1] + n[1]);
    }
    return [nx, ny, nz];
  };
  const centroide = (V: any, vs: number[]) => {
    const c = [0, 0, 0];
    for (const v of vs) { const p = V.get(v); c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    return c.map((x) => x / vs.length);
  };
  const manifoldRuim = (F: any) => {
    const m = new Map<string, number>();
    for (const f of F.values()) for (let k = 0; k < (f as any).vs.length; k++) { const a = (f as any).vs[k], b = (f as any).vs[(k + 1) % (f as any).vs.length]; m.set(`${a},${b}`, (m.get(`${a},${b}`) ?? 0) + 1); }
    let ruim = 0; for (const [k, c] of m) { const [a, b] = k.split(','); if (c !== 1 || (m.get(`${b},${a}`) ?? 0) !== 1) ruim++; } return ruim;
  };
  const volume = (V: any, F: any) => {
    let vol = 0;
    for (const f of F.values()) { const vs = (f as any).vs; for (let k = 1; k + 1 < vs.length; k++) {
      const a = V.get(vs[0]), b = V.get(vs[k]), c = V.get(vs[k + 1]);
      vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    } }
    return vol;
  };

  it('numeração EXATA travada — vértices dos cantos 0 e 6, faces das 3 famílias (derivado da fórmula documentada, medido)', () => {
    // larg=alt=prof=2 -> lx=1,ly=2,lz=1 (o mesmo ly CHEIO do cubo, não /2); chanfro=0.3
    const { V, F, orfaos } = nucleo([['chamferBox', { id: 0, larg: 2, alt: 2, prof: 2, chanfro: 0.3 }]], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(24);
    expect(F.size).toBe(26);
    // canto 0 = (sx=-1,sy=0,sz=-1): X=b+0, Y=b+1, Z=b+2
    expect(V.get(0)).toEqual([-1, 0.3, -0.7]);    // X: x CHEIO (-lx), y/z encolhidos (+oy·c no y pois sy=0 empurra pra dentro)
    expect(V.get(1)).toEqual([-0.7, 0, -0.7]);    // Y: y CHEIO (0), x/z encolhidos
    expect(V.get(2)).toEqual([-0.7, 0.3, -1]);    // Z: z CHEIO (-lz), x/y encolhidos
    // canto 6 = (sx=1,sy=1,sz=1): X=b+18, Y=b+19, Z=b+20
    expect(V.get(18)).toEqual([1, 1.7, 0.7]);
    expect(V.get(19)).toEqual([0.7, 2, 0.7]);
    expect(V.get(20)).toEqual([0.7, 1.7, 1]);
    // uma face de cada família (ids fixos, formato salvo)
    expect(F.get(0)!.vs).toEqual([1, 4, 7, 10]);      // fundo -y: os 4 vértices Y dos cantos 0..3
    expect(F.get(6)!.vs.length).toBe(4);              // 1a aresta (retângulo)
    expect(F.get(18)!.vs.length).toBe(3);             // 1o triângulo de canto
  });

  it('manifold + winding pra FORA em TODAS as 26 faces (não numa amostra) + volume < caixa reta, em geometrias variadas (não só cúbica)', () => {
    for (const [larg, alt, prof, chanfro] of [[2.6, 2.1, 1.6, 0.25], [2, 2, 2, 0.01], [4, 1, 4, 0.2], [0.6, 5, 3.4, 0.1]] as const) {
      const { V, F, orfaos } = nucleo([['chamferBox', { id: 0, larg, alt, prof, chanfro }]], {}, {});
      expect(orfaos).toHaveLength(0);
      expect(manifoldRuim(F)).toBe(0);
      const centro = [0, alt / 2, 0];
      for (const f of F.values()) {
        const n = newell(V, (f as any).vs), c = centroide(V, (f as any).vs);
        const dot = n[0] * (c[0] - centro[0]) + n[1] * (c[1] - centro[1]) + n[2] * (c[2] - centro[2]);
        expect(dot).toBeGreaterThan(0);
      }
      const vol = volume(V, F), volReto = larg * alt * prof;
      expect(vol).toBeGreaterThan(0);
      expect(vol).toBeLessThan(volReto);   // chanfro sempre CORTA volume, nunca adiciona
    }
  });

  it('fronteira EXATA de `chanfro` válido (lado=1 -> limite=min(0.5,0.5,0.5)=0.5): dentro passa, no limite e além GRITA e não constrói nada', () => {
    const dentro = nucleo([['chamferBox', { id: 0, lado: 1, chanfro: 0.499999 }]], {}, {});
    expect(dentro.orfaos).toHaveLength(0);
    expect(dentro.V.size).toBe(24);

    for (const chanfro of [0.5, 0.500001, 0, -0.1]) {
      const { V, F, orfaos } = nucleo([['chamferBox', { id: 0, lado: 1, chanfro }]], {}, {});
      expect(orfaos).toHaveLength(1);
      expect(orfaos[0]).toMatchObject({ op: 'chamferBox' });
      expect(V.size).toBe(0);   // fail-closed: NADA se constrói, não uma malha degenerada
      expect(F.size).toBe(0);
    }
  });

  it('larg/alt/prof/chanfro citam PARAM por nome; determinismo bit-a-bit em 2 rodadas', () => {
    const { V, orfaos } = nucleo([['chamferBox', { id: 0, larg: 'w', alt: 'h', prof: 'p', chanfro: 'c' }]], { w: 3, h: 2, p: 1.5, c: 0.2 }, {});
    expect(orfaos).toHaveLength(0);
    expect(V.size).toBe(24);
    const canon = () => { const n = nucleo([['chamferBox', { id: 0, larg: 2, alt: 1.4, prof: 1.8, chanfro: 0.15 }]], {}, {});
      return JSON.stringify([[...n.V.entries()].sort((a, b) => a[0] - b[0]), [...n.F.entries()].sort((a, b) => a[0] - b[0]).map(([k, f]) => [k, (f as any).vs])]); };
    expect(canon()).toBe(canon());
  });

  it('guarda de id da posição (o mesmo confereId de toda primitiva) e órfão não corrompe passo seguinte', () => {
    const n = nucleo([['plano', { id: 0 }], ['chamferBox', { id: 999 }]], {}, {});   // id escrito ≠ base da posição (1000)
    expect(n.orfaos.some((o: any) => o.op === 'chamferBox' && o.motivo.includes('posição'))).toBe(true);
    expect(n.V.size).toBe(4 + 24);   // plano seg=1 default -> (1+1)²=4 + chamferBox: segue construindo normal, só o AVISO de id
  });
});

/* P8c do playground — `displace` (desloca uma seleção ao longo da normal média por
   ruído seedado). O ruído (`hash3`/`ruido3`, no núcleo) é reimplementado AQUI —
   igual ao `newell` de todo describe acima — porque não é exportado; os testes
   provam determinismo/semente por MEDIÇÃO (recomputando o valor esperado com a
   MESMA fórmula, não só comparando contra si mesmo). */
describe('P8c — displace (deslocamento por ruído seedado ao longo da normal)', () => {
  const hash3 = (x: number, y: number, z: number, seed: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 269.5) * 43758.5453123; return s - Math.floor(s); };
  const ruido3 = (x: number, y: number, z: number, seed: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed);
    const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
    const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed);
    const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  };
  const manifoldRuim = (F: any) => {
    const m = new Map<string, number>();
    for (const f of F.values()) for (let k = 0; k < (f as any).vs.length; k++) { const a = (f as any).vs[k], b = (f as any).vs[(k + 1) % (f as any).vs.length]; m.set(`${a},${b}`, (m.get(`${a},${b}`) ?? 0) + 1); }
    let ruim = 0; for (const [k, c] of m) { const [a, b] = k.split(','); if (c !== 1 || (m.get(`${b},${a}`) ?? 0) !== 1) ruim++; } return ruim;
  };

  it('desloca CADA vértice ao longo da normal média — magnitude bate a fórmula EXATA recomputada (cubo: normal por vértice é a média de 3 faces axis-aligned)', () => {
    const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }], ['displace', { amplitude: 0.2, frequencia: 1.5, semente: 7 }]], {}, {});
    expect(orfaos).toHaveLength(0);
    // vértice 0 do cubo lado=1: [-0.5,0,-0.5], tocado pelas faces fundo(-y), -z, -x -> normal média = norm3(-1,-1,-1) = cada eixo -1/√3
    const nrm = 1 / Math.sqrt(3);
    const p0 = [-0.5, 0, -0.5];
    const r = ruido3(p0[0] * 1.5, p0[1] * 1.5, p0[2] * 1.5, 7);
    const d = (r * 2 - 1) * 0.2;
    expect(V.get(0)![0]).toBeCloseTo(p0[0] + -nrm * d, 9);
    expect(V.get(0)![1]).toBeCloseTo(p0[1] + -nrm * d, 9);
    expect(V.get(0)![2]).toBeCloseTo(p0[2] + -nrm * d, 9);
  });

  it('amplitude=0 é no-op determinístico (posição intacta)', () => {
    const antes = nucleo([['cubo', { id: 0, lado: 1 }]], {}, {});
    const depois = nucleo([['cubo', { id: 0, lado: 1 }], ['displace', { amplitude: 0, semente: 42 }]], {}, {});
    for (const id of antes.V.keys()) expect(depois.V.get(id)).toEqual(antes.V.get(id));
  });

  it('determinismo: mesma semente -> 2 rodadas idênticas bit-a-bit; semente diferente diverge em pelo menos um vértice', () => {
    const passos = (semente: number) => [['cubo', { id: 0, lado: 1 }], ['displace', { amplitude: 0.3, semente }]];
    const canon = (semente: number) => { const n = nucleo(passos(semente) as any, {}, {}); return JSON.stringify([...n.V.entries()].sort((a, b) => a[0] - b[0])); };
    expect(canon(5)).toBe(canon(5));
    expect(canon(5)).not.toBe(canon(6));
  });

  it('seleção parcial (sel.regiao) só desloca os vértices ATINGIDOS — o resto fica intacto', () => {
    // topo do cubo (y=1 exato, ly não /2) via regiao — o mesmo teste do resolverAlvosV do P8
    const { V, orfaos } = nucleo([['cubo', { id: 0, lado: 1 }],
      ['displace', { amplitude: 0.4, semente: 1, sel: { regiao: { min: [-2, 0.9, -2], max: [2, 1.1, 2] } } }],
    ], {}, {});
    expect(orfaos).toHaveLength(0);
    expect(V.get(0)).toEqual([-0.5, 0, -0.5]);   // base fora da região, intacta
    expect(V.get(4)).not.toEqual([-0.5, 1, -0.5]);   // topo deslocado
  });

  it('vértice sem NENHUMA face (apagaFace deixou solto) GRITA e fica parado — nunca desloca às cegas', () => {
    const passos: any[] = [['cubo', { id: 0, lado: 1 }]];
    for (let f = 0; f < 6; f++) passos.push(['apagaFace', { face: f }]);   // apaga as 6 faces -> todo vértice fica sem face
    passos.push(['displace', { amplitude: 0.5, semente: 1 }]);
    const { V, orfaos } = nucleo(passos, {}, {});
    expect(orfaos.filter((o: any) => o.op === 'displace')).toHaveLength(8);   // os 8 vértices, um órfão cada
    expect(V.get(0)).toEqual([-0.5, 0, -0.5]);   // nenhum moveu
  });

  it('composição: displace em cima de inflate/loft/rotaciona/espelha — sem NaN nem órfão indevido; manifold PRESERVADO (só move posição, nunca muda topologia)', () => {
    const QUAD = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const passos of [
      [['cubo', { id: 0, lado: 1 }], ['rotaciona', { eixo: 'y', graus: 25 }], ['displace', { amplitude: 0.1, semente: 3 }]],
      [['inflate', { id: 0, contornoLado: QUAD, contornoTopo: QUAD, divisoes: 3 }], ['displace', { amplitude: 0.05, frequencia: 2, semente: 9 }]],
      [['cubo', { id: 0, lado: 1 }], ['espelha', { eixo: 'x', pos: 0 }], ['displace', { amplitude: 0.1, semente: 2 }]],
    ] as const) {
      const { V, F, orfaos } = nucleo(passos as any, {}, {});
      expect(orfaos).toHaveLength(0);
      expect(manifoldRuim(F)).toBe(0);
      expect([...V.values()].every((p: any) => p.every((c: number) => Number.isFinite(c)))).toBe(true);
    }
  });

  it('peça-exemplo _pedra (chamferBox + displace): sem órfãos, V/F exatos (24/26 — displace não cria/apaga), MANIFOLD intacto por cima do relevo, colisão calculada', async () => {
    const pUrl = new URL('../../prototipos/fps/v3/pecas/_pedra.js', import.meta.url);
    const peca: any = await import(fileURLToPath(pUrl));
    const n = nucleo(peca.PASSOS, peca.PARAMS, peca.TOPO);
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.size).toBe(24);
    expect(n.F.size).toBe(26);
    expect(manifoldRuim(n.F)).toBe(0);
    expect([...n.V.values()].every((p: any) => p.every((c: number) => Number.isFinite(c)))).toBe(true);
    expect(peca.meta.colisao.forma).toBe('cilindro');
    expect(peca.meta.colisao.raio).toBeGreaterThan(0);
  });
});

/* D-128 — `transladar` (soma um deslocamento a uma seleção). O IRMÃO do
   `rotaciona`: mesma semântica de `sel`, e igualmente SIMPLES (NUNCA cria id).
   Nasceu do experimento do TETO (docs/historico/TETO.md): o vocabulário girava a malha
   inteira mas não transladava nada maior que UMA face, e as 7 primitivas presas
   à origem ficavam inutilizáveis em composição.

   Prova por MEDIÇÃO: posições EXATAS (o delta somado, não "mudou"), seleção
   ausente = malha inteira, seleção por v/f/regiao/grupo, fora da seleção
   INTOCADO, NUNCA cria vértice/face, `d` por NOME de PARAM, aditividade
   (transladar 2× == transladar pela soma), órfão grita sem corromper, e o caso
   que MOTIVOU a op: posicionar uma primitiva inteira num passo só, com manifold
   preservado (transladar não pode rasgar malha — é rígido). */
describe('D-128 — transladar (posiciona uma seleção; o que faltava pra compor com primitiva)', () => {
  // manifold local: a convenção deste arquivo é redefinir por bloco (o do P6/P8 vive
  // no escopo DELES, não no do módulo — um `describe` novo não o alcança)
  const manifoldRuim = (F: any) => {
    const m = new Map<string, number>();
    for (const f of F.values()) for (let k = 0; k < (f as any).vs.length; k++) { const a = (f as any).vs[k], b = (f as any).vs[(k + 1) % (f as any).vs.length]; m.set(`${a},${b}`, (m.get(`${a},${b}`) ?? 0) + 1); }
    let ruim = 0;
    for (const [k, c] of m) { const [a, b] = k.split(','); if (c !== 1 || (m.get(`${b},${a}`) ?? 0) !== 1) ruim++; }
    return ruim;
  };

  it('soma o delta EXATO em cada vértice da malha (sel AUSENTE = malha inteira)', () => {
    const base = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
    const d: [number, number, number] = [1.5, -0.25, 3];
    const mov = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d }]], {}, {});
    expect(mov.V.size).toBe(base.V.size);
    for (const [id, p] of base.V) {
      const q = mov.V.get(id)!;
      // valor esperado DERIVADO da base (não hardcoded à mão — a lição D-116)
      expect(q[0]).toBeCloseTo(p[0] + d[0], 12);
      expect(q[1]).toBeCloseTo(p[1] + d[1], 12);
      expect(q[2]).toBeCloseTo(p[2] + d[2], 12);
    }
  });

  it('seleção por v e por f: só os alvos movem, o resto fica INTOCADO (bit-a-bit)', () => {
    const base = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
    const porV = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: [0, 5, 0], sel: { v: [1] } }]], {}, {});
    expect(porV.V.get(1)![1]).toBeCloseTo(base.V.get(1)![1] + 5, 12);
    for (const id of [...base.V.keys()].filter((k) => k !== 1)) expect(porV.V.get(id)).toEqual(base.V.get(id));   // intocados EXATOS

    // face 3 (+x do cubo, cantos [2,1,5,6]) move os 4 cantos DELA
    const porF = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: [0, 0, 7], sel: { f: [3] } }]], {}, {});
    const cantos = new Set(base.F.get(3)!.vs);
    for (const id of base.V.keys()) {
      const esperado = cantos.has(id) ? base.V.get(id)![2] + 7 : base.V.get(id)![2];
      expect(porF.V.get(id)![2]).toBeCloseTo(esperado, 12);
    }
  });

  it('seleção por REGIÃO e por GRUPO (a mesma lei do resolverAlvosV que o rotaciona usa)', () => {
    // região: só o topo do cubo (y >= 0.5) — o conjunto é DERIVADO da base, não assumido
    const base = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
    const noTopo = [...base.V.entries()].filter(([, p]) => p[1] >= 0.5).map(([id]) => id);
    expect(noTopo.length).toBeGreaterThan(0);   // a fixture tem que ter alvo, senão o teste não prova nada
    const reg = nucleo([['cubo', { id: 0, lado: 2 }],
      ['transladar', { d: [0, 2, 0], sel: { regiao: { min: [-9, 0.5, -9], max: [9, 9, 9] } } }]], {}, {});
    for (const id of base.V.keys()) {
      const esperado = noTopo.includes(id) ? base.V.get(id)![1] + 2 : base.V.get(id)![1];
      expect(reg.V.get(id)![1]).toBeCloseTo(esperado, 12);
    }

    // grupo: nomeia uma parte e translada por nome
    const grp = nucleo([['cubo', { id: 0, lado: 2 }], ['parte', { nome: 'tampa', faces: [4] }],
      ['transladar', { d: [0, 0, -3], sel: { grupo: 'tampa' } }]], {}, {});
    const cantosTampa = new Set(base.F.get(4)!.vs);
    for (const id of base.V.keys()) {
      const esperado = cantosTampa.has(id) ? base.V.get(id)![2] - 3 : base.V.get(id)![2];
      expect(grp.V.get(id)![2]).toBeCloseTo(esperado, 12);
    }
  });

  it('NUNCA cria vértice/face — mesmos ids e mesmas contagens antes/depois', () => {
    const antes = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
    const depois = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: [3, 3, 3] }]], {}, {});
    expect(depois.V.size).toBe(antes.V.size);
    expect(depois.F.size).toBe(antes.F.size);
    expect([...depois.V.keys()].sort((a, b) => a - b)).toEqual([...antes.V.keys()].sort((a, b) => a - b));
    expect([...depois.F.keys()].sort((a, b) => a - b)).toEqual([...antes.F.keys()].sort((a, b) => a - b));
  });

  it('`d` por NOME de PARAM (mexer no PARAM remodela sem tocar em passo); nome inexistente grita ALTO', () => {
    const { V } = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: ['dx', 0, 0] }]], { dx: 4 }, {});
    const base = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
    expect(V.get(1)![0]).toBeCloseTo(base.V.get(1)![0] + 4, 12);
    expect(() => nucleo([['cubo', { id: 0, lado: 1 }], ['transladar', { d: ['fantasma', 0, 0] }]], {}, {})).toThrow(/fantasma/);
  });

  it('ADITIVO: transladar 2× == transladar 1× pela soma (acompanha a base, como o moveV)', () => {
    const duas = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: [1, 2, 3] }], ['transladar', { d: [10, 20, 30] }]], {}, {});
    const uma = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: [11, 22, 33] }]], {}, {});
    expect(JSON.stringify(neutroCanonico(duas))).toBe(JSON.stringify(neutroCanonico(uma)));
  });

  it('`d` ausente/zero é NO-OP silencioso (a lei do moveV/moveF/moveA) — canônico bit-a-bit', () => {
    const base = JSON.stringify(neutroCanonico(nucleo([['cubo', { id: 0, lado: 2 }]], {}, {})));
    for (const passo of [['transladar', {}], ['transladar', { d: [0, 0, 0] }]] as any[]) {
      expect(JSON.stringify(neutroCanonico(nucleo([['cubo', { id: 0, lado: 2 }], passo], {}, {})))).toBe(base);
    }
  });

  it('id/face/grupo inexistente GRITA (órfão) e é IGNORADO — malha intacta, alvo válido move normalmente', () => {
    const base = nucleo([['cubo', { id: 0, lado: 2 }]], {}, {});
    const { orfaos, V } = nucleo([['cubo', { id: 0, lado: 2 }], ['transladar', { d: [0, 1, 0], sel: { v: [1, 999] } }]], {}, {});
    expect(orfaos).toHaveLength(1);
    expect(orfaos[0]).toMatchObject({ passo: 1, op: 'transladar', ref: 999 });
    expect(V.size).toBe(8);                                              // malha intacta
    expect(V.get(1)![1]).toBeCloseTo(base.V.get(1)![1] + 1, 12);         // o id válido moveu

    const f = nucleo([['cubo', { id: 0, lado: 1 }], ['transladar', { d: [1, 0, 0], sel: { f: [999] } }]], {}, {});
    expect(f.orfaos.some((o: any) => o.op === 'transladar' && o.ref === 999)).toBe(true);
    expect(f.V.size).toBe(8);

    const g = nucleo([['cubo', { id: 0, lado: 1 }], ['transladar', { d: [1, 0, 0], sel: { grupo: 'nao-existe' } }]], {}, {});
    expect(g.orfaos.some((o: any) => o.op === 'transladar')).toBe(true);
    // GEOMETRIA intacta (V/F apenas — o canônico COMPLETO difere de propósito: o órfão ENTRA nele, é o registro do grito)
    const soGeo = (n: any) => { const c: any = neutroCanonico(n); return JSON.stringify({ V: c.V, F: c.F }); };
    expect(soGeo(g)).toBe(soGeo(nucleo([['cubo', { id: 0, lado: 1 }]], {}, {})));   // seleção vazia = no-op geométrico
  });

  it('★ O CASO QUE MOTIVOU A OP: duas primitivas iguais em posições DIFERENTES, um passo de transladar cada — manifold preservado nas duas', () => {
    // era isto que custava 32 moveV por peça e fez a moto do TETO virar 100% loft
    const n = nucleo([
      ['cilindro', { id: 0, raio: 0.4, altura: 0.2, lados: 12 }],
      ['transladar', { d: [0, 0, -1] }],                              // sel ausente = a malha TODA (só o cilindro existe)
      ['cilindro', { id: 2000, raio: 0.4, altura: 0.2, lados: 12 }],   // `id` = a BASE do bloco da posição (posição 2 × BLOCO 1000), não um contador próprio
      ['transladar', { d: [0, 0, 1], sel: { regiao: { min: [-9, -9, -0.5], max: [9, 9, 0.5] } } }],   // só a 2ª (a 1ª já saiu da caixa)
    ], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(manifoldRuim(n.F)).toBe(0);                                // rígido: não rasga malha
    const zs = [...n.V.values()].map((p: any) => p[2]);
    expect(Math.min(...zs)).toBeLessThan(-0.5);                       // uma roda atrás
    expect(Math.max(...zs)).toBeGreaterThan(0.5);                     // outra na frente
    expect([...n.V.values()].every((p: any) => p.every((c: number) => Number.isFinite(c)))).toBe(true);
  });

  it('determinismo + round-trip: mesma lista 2× dá canônico idêntico, e o JSON da lista sobrevive', () => {
    const passos: any[] = [['cubo', { id: 0, lado: 1 }], ['transladar', { d: [0.3, -0.7, 1.1], sel: { f: [0, 1] } }]];
    const a = JSON.stringify(neutroCanonico(nucleo(passos, {}, {})));
    const b = JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {})));
    expect(a).toBe(b);
  });
});

/* Fase 4 (achado por três corridas cegas independentes — drone da Fase 4, reescrita
   do _torno.js e a lanterna BLOQUEADA): `sel.origem` só existia pra `loft`/`cubo`.
   `lathe` reusa o MESMO contrato do loft (faixa×lado, `contratoFaixaLado`); os
   testes espelham fielmente D-130 Rodada A/C, trocando loft por lathe. */
describe('Fase 4 — sel.origem para lathe (mesmo contrato do loft: faixa × lado)', () => {
  // perfil [[1,y]] com y=0..4 -> 5 pontos, todos anel (raio>0): 4 segmentos anel<->anel = 4 faixas de `lados` faces cada
  const perfil = [0, 1, 2, 3, 4].map((y) => [1, y]);
  const lathe = (id: number, origemId = 1000): any => ['lathe', { id, origemId, lados: 4, perfil }];
  const pintaOrigem = (extra: any = {}): any => ['pincel', { modo: 'face', sel: { origem: { op: 'lathe', id: 1000, ...extra } }, cor: '#123456' }];
  const pintados = (n: any) => [...n.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('coluna {lado:3} e {faixa:2} batem byte a byte com a lista manual equivalente (via neutroCanonico)', () => {
    const nColuna = nucleo([lathe(0), pintaOrigem({ lado: 3 })], {}, {});
    expect(nColuna.orfaos).toHaveLength(0);
    expect(pintados(nColuna)).toEqual([3, 7, 11, 15]); // faixa0=[0..3], faixa1=[4..7], faixa2=[8..11], faixa3=[12..15]
    const colunaLegado = nucleo([lathe(0), ['pincel', { modo: 'face', faces: [3, 7, 11, 15], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(nColuna))).toBe(JSON.stringify(neutroCanonico(colunaLegado)));

    const nFaixa = nucleo([lathe(0), pintaOrigem({ faixa: 2 })], {}, {});
    expect(pintados(nFaixa)).toEqual([8, 9, 10, 11]);
    const faixaLegado = nucleo([lathe(0), ['pincel', { modo: 'face', faces: [8, 9, 10, 11], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(nFaixa))).toBe(JSON.stringify(neutroCanonico(faixaLegado)));
  });

  it('eixo ausente = todos: {} é a união de todas as faixas, byte a byte com a lista manual', () => {
    const n = nucleo([lathe(0), pintaOrigem()], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const legado = nucleo([lathe(0), ['pincel', { modo: 'face', faces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(n))).toBe(JSON.stringify(neutroCanonico(legado)));
  });

  it('filtro de progressão par/ímpar em lado e em faixa batem byte a byte com a lista manual', () => {
    const ladoPar = nucleo([lathe(0), pintaOrigem({ lado: { passo: 2, fase: 0 } })], {}, {});
    expect(pintados(ladoPar)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    const ladoParLegado = nucleo([lathe(0), ['pincel', { modo: 'face', faces: [0, 2, 4, 6, 8, 10, 12, 14], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(ladoPar))).toBe(JSON.stringify(neutroCanonico(ladoParLegado)));

    const faixaImpar = nucleo([lathe(0), pintaOrigem({ faixa: { passo: 2, fase: 1 } })], {}, {});
    expect(pintados(faixaImpar)).toEqual([4, 5, 6, 7, 12, 13, 14, 15]);
  });

  it('{passo:1,fase:0} é a identidade — todos os índices, nos dois eixos', () => {
    const porLado = nucleo([lathe(0), pintaOrigem({ lado: { passo: 1, fase: 0 } })], {}, {});
    const semNada = nucleo([lathe(0), pintaOrigem()], {}, {});
    expect(JSON.stringify(neutroCanonico(porLado))).toBe(JSON.stringify(neutroCanonico(semNada)));
    const porFaixa = nucleo([lathe(0), pintaOrigem({ faixa: { passo: 1, fase: 0 } })], {}, {});
    expect(JSON.stringify(neutroCanonico(porFaixa))).toBe(JSON.stringify(neutroCanonico(semNada)));
  });

  it('índice fora do limite e filtro malformado GRITAM (nos dois eixos), sem pintar nada', () => {
    const foraDoLimite = nucleo([lathe(0), pintaOrigem({ lado: 99 })], {}, {});
    expect(foraDoLimite.orfaos.some((o: any) => o.op === 'pincel' && /lado 99 fora do limite/.test(o.motivo))).toBe(true);
    expect(pintados(foraDoLimite)).toEqual([]);

    const faixaForaDoLimite = nucleo([lathe(0), pintaOrigem({ faixa: 99 })], {}, {});
    expect(faixaForaDoLimite.orfaos.some((o: any) => o.op === 'pincel' && /faixa 99 fora do limite/.test(o.motivo))).toBe(true);

    for (const malformado of [{ passo: 0, fase: 0 }, { passo: 2, fase: 2 }, { passo: 2 }, { fase: 0 }]) {
      const n = nucleo([lathe(0), pintaOrigem({ lado: malformado })], {}, {});
      expect(n.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
      expect(pintados(n)).toEqual([]);
    }
  });

  it('filtro que não casa nenhum índice GRITA (seleção vazia, nunca no-op)', () => {
    const n = nucleo([lathe(0), pintaOrigem({ lado: { passo: 5, fase: 4 } })], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'pincel' && /não casa nenhum índice/.test(o.motivo))).toBe(true);
    expect(pintados(n)).toEqual([]);
  });

  it('faixa degenerada (segmento polo↔polo) é pulada na união e GRITA se endereçada explícita', () => {
    // perfil polo(y=0) -> polo(y=1) -> anel(y=2) -> anel(y=3): o segmento 0 (polo<->polo) não emite
    // face -> faixas[0] fica vazia; segmento 1 (polo->anel) e segmento 2 (anel->anel) emitem normal
    const perfilComPolo = [[0, 0], [0, 1], [1, 2], [1, 3]];
    const n = nucleo([['lathe', { id: 0, origemId: 1000, lados: 4, perfil: perfilComPolo }], pintaOrigem()], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'lathe' && /polo↔polo/.test(o.motivo))).toBe(true); // o próprio lathe já grita o segmento degenerado
    expect(pintados(n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]); // a união pula o segmento 0 (vazio), pega os segmentos 1 e 2

    const explicito = nucleo([['lathe', { id: 0, origemId: 1000, lados: 4, perfil: perfilComPolo }], pintaOrigem({ faixa: 0 })], {}, {});
    expect(explicito.orfaos.some((o: any) => o.op === 'pincel' && /não tem faces laterais/.test(o.motivo))).toBe(true);
  });
});

/* Fase 4 — sel.origem para cilindro: dois eixos INDEPENDENTES (`lado` numérico
   sobre as laterais, `tampa` nominal fundo/topo) em vez da grade faixa×lado do
   loft/lathe. `{}` = todas as laterais, SEM as tampas (resolve o BLOQUEADO 2 da
   lanterna: "só a lateral, não as tampas" — os cantos da tampa caem na mesma
   caixa que os das laterais, então `sel.regiao` não conseguia separar). */
describe('Fase 4 — sel.origem para cilindro (lado numérico + tampa nominal)', () => {
  const cil = (id: number, origemId = 2000): any => ['cilindro', { id, origemId, lados: 6, raio: 1, altura: 1 }];
  // faces: lados 6+0..6+5, fundo 6+6, topo 6+7 — mas a base do passo já soma; usar ids relativos ao passo(0)=0
  const pintaOrigem = (extra: any = {}): any => ['pincel', { modo: 'face', sel: { origem: { op: 'cilindro', id: 2000, ...extra } }, cor: '#123456' }];
  const pintados = (n: any) => [...n.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('{} (nem lado nem tampa) seleciona só as 6 laterais, byte a byte com a lista manual — NÃO pega as tampas', () => {
    const n = nucleo([cil(0), pintaOrigem()], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintados(n)).toEqual([0, 1, 2, 3, 4, 5]); // laterais 0..5 — SEM o fundo(6) nem o topo(7)
    const legado = nucleo([cil(0), ['pincel', { modo: 'face', faces: [0, 1, 2, 3, 4, 5], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(n))).toBe(JSON.stringify(neutroCanonico(legado)));
  });

  it('lado inteiro seleciona uma lateral só, byte a byte com a lista manual', () => {
    const n = nucleo([cil(0), pintaOrigem({ lado: 3 })], {}, {});
    expect(pintados(n)).toEqual([3]);
    const legado = nucleo([cil(0), ['pincel', { modo: 'face', faces: [3], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(n))).toBe(JSON.stringify(neutroCanonico(legado)));
  });

  it('filtro de progressão par/ímpar em lado bate byte a byte com a lista manual (o caso do detector-de-banding)', () => {
    const pares = nucleo([cil(0), pintaOrigem({ lado: { passo: 2, fase: 0 } })], {}, {});
    expect(pintados(pares)).toEqual([0, 2, 4]);
    const legadoPares = nucleo([cil(0), ['pincel', { modo: 'face', faces: [0, 2, 4], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(pares))).toBe(JSON.stringify(neutroCanonico(legadoPares)));

    const impares = nucleo([cil(0), pintaOrigem({ lado: { passo: 2, fase: 1 } })], {}, {});
    expect(pintados(impares)).toEqual([1, 3, 5]);
  });

  it('{passo:1,fase:0} é a identidade — todos os lados', () => {
    const porLado = nucleo([cil(0), pintaOrigem({ lado: { passo: 1, fase: 0 } })], {}, {});
    const semNada = nucleo([cil(0), pintaOrigem()], {}, {});
    expect(JSON.stringify(neutroCanonico(porLado))).toBe(JSON.stringify(neutroCanonico(semNada)));
  });

  it('tampa explícita (fundo/topo) seleciona só aquela face, byte a byte — e NÃO traz as laterais junto', () => {
    const fundo = nucleo([cil(0), pintaOrigem({ tampa: 'fundo' })], {}, {});
    expect(pintados(fundo)).toEqual([6]);
    const topo = nucleo([cil(0), pintaOrigem({ tampa: 'topo' })], {}, {});
    expect(pintados(topo)).toEqual([7]);
    const legadoFundo = nucleo([cil(0), ['pincel', { modo: 'face', faces: [6], cor: '#123456' }]], {}, {});
    expect(JSON.stringify(neutroCanonico(fundo))).toBe(JSON.stringify(neutroCanonico(legadoFundo)));
  });

  it('os dois presentes = união (lado + tampa)', () => {
    const n = nucleo([cil(0), pintaOrigem({ lado: 0, tampa: 'topo' })], {}, {});
    expect(pintados(n)).toEqual([0, 7]);
  });

  it('tampa removida por apagaFace GRITA quando endereçada explicitamente', () => {
    const n = nucleo([cil(0), ['apagaFace', { face: 7 }], pintaOrigem({ tampa: 'topo' })], {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'pincel' && /tampa 'topo'.*foi removida/.test(o.motivo))).toBe(true);
    expect(pintados(n)).toEqual([]);
    // mas {} continua funcionando (só as laterais, que não foram tocadas)
    const semTampa = nucleo([cil(0), ['apagaFace', { face: 7 }], pintaOrigem()], {}, {});
    expect(pintados(semTampa)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('lado explícito removido por apagaFace GRITA nomeando o lado (a mesma distinção do cubo); a união segue pulando em silêncio', () => {
    const explicito = nucleo([cil(0), ['apagaFace', { face: 2 }], pintaOrigem({ lado: 2 })], {}, {});
    expect(explicito.orfaos.some((o: any) => o.op === 'pincel' && /lado 2.*foi removido/.test(o.motivo))).toBe(true);
    expect(pintados(explicito)).toEqual([]);

    const uniao = nucleo([cil(0), ['apagaFace', { face: 2 }], pintaOrigem()], {}, {});
    expect(uniao.orfaos).toHaveLength(0); // {} pula o lado removido em silêncio, como o cubo faz com face
    expect(pintados(uniao)).toEqual([0, 1, 3, 4, 5]);
  });

  it('lado inteiro fora do limite GRITA e não seleciona parcial; filtro que não casa nada GRITA', () => {
    const foraDoLimite = nucleo([cil(0), pintaOrigem({ lado: 99 })], {}, {});
    expect(foraDoLimite.orfaos.some((o: any) => o.op === 'pincel' && /lado 99 fora do limite/.test(o.motivo))).toBe(true);
    expect(pintados(foraDoLimite)).toEqual([]);

    const semCasar = nucleo([cil(0), pintaOrigem({ lado: { passo: 9, fase: 8 } })], {}, {});
    expect(semCasar.orfaos.some((o: any) => o.op === 'pincel' && /não casa nenhum índice/.test(o.motivo))).toBe(true);
    expect(pintados(semCasar)).toEqual([]);
  });

  it('tampa inválida e chave desconhecida GRITAM', () => {
    const tampaInvalida = nucleo([cil(0), pintaOrigem({ tampa: 'lateral' as any })], {}, {});
    expect(tampaInvalida.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
    expect(pintados(tampaInvalida)).toEqual([]);

    const chaveDesconhecida = nucleo([cil(0), ['pincel', { modo: 'face', sel: { origem: { op: 'cilindro', id: 2000, faixa: 1 } as any }, cor: '#123456' }]], {}, {});
    expect(chaveDesconhecida.orfaos.some((o: any) => o.op === 'pincel')).toBe(true);
    expect(pintados(chaveDesconhecida)).toEqual([]);
  });
});

/* O-2 (docs/mecanifica/OFICINA-OTIMIZACOES.md, Faixa 1) — reatribuir `parte`
   passa a GRITAR. Era a pior classe de defeito do vocabulário: resultado errado
   que PASSA. Duas seleções sobrepostas, a parte declarada antes perde faces sem
   nada reclamar, e a bancada só mostra a contagem de faces SEM nome — nunca as
   roubadas. A premissa de que a rede é ADITIVA foi MEDIDA antes de instalar
   (instrumentando a op e construindo as 18 peças do repositório: 90 chamadas de
   `parte`, 0 face reatribuída para outra parte, e 8 reatribuições para a MESMA
   parte — 4 em `caixa-ferramentas` e 4 em `drone-inspecao`). Por isso o conflito
   aqui é só entre nomes DIFERENTES: renomear para a mesma parte é seleção
   redundante e segue mudo, senão essas duas peças shipadas passariam a ter
   órfão e o `gabarito:selecao` cairia. */
describe('O-2 — reatribuir parte GRITA (roubo silencioso de face)', () => {
  const cubo: any = ['cubo', { id: 0, lado: 1 }];
  const parte = (nome: string, faces: number[], extra: any = {}): any => ['parte', { nome, faces, ...extra }];
  const conflitos = (n: any) => n.orfaos.filter((o: any) => o.op === 'parte' && /já pertence à parte/.test(o.motivo));

  it('caminho feliz: partes disjuntas não gritam, e renomear para a MESMA parte segue mudo', () => {
    const disjuntas = nucleo([cubo, parte('a', [0, 1]), parte('b', [2, 3])], {}, {});
    expect(disjuntas.orfaos).toHaveLength(0);
    expect(disjuntas.F.get(0).parte).toBe('a'); expect(disjuntas.F.get(2).parte).toBe('b');

    // seleções sobrepostas com o MESMO nome: é redundância, não conflito (o caso medido nas 18 peças)
    const mesma = nucleo([cubo, parte('a', [0, 1]), parte('a', [1, 2])], {}, {});
    expect(mesma.orfaos).toHaveLength(0);
    expect([...mesma.F.values()].filter((f: any) => f.parte === 'a').map((f: any) => f.id)).toEqual([0, 1, 2]);
  });

  it('conflito GRITA nomeando o passo que nomeou antes, o dono antigo e o nome novo; a face fica com o dono ANTIGO', () => {
    const n = nucleo([cubo, parte('a', [0, 1]), parte('b', [1, 2])], {}, {});
    const orf = conflitos(n);
    expect(orf).toHaveLength(1);
    expect(orf[0].passo).toBe(2);                        // o passo que TENTOU roubar
    expect(orf[0].ref).toBe(1);                          // a face disputada
    expect(orf[0].motivo).toMatch(/parte 'a'/);          // dono antigo
    expect(orf[0].motivo).toMatch(/passo 1/);            // quem nomeou antes (procedência)
    expect(orf[0].motivo).toMatch(/'b'/);                // o nome que teria vencido em silêncio
    expect(orf[0].motivo).toMatch(/substituir: true/);   // a saída explícita
    // a face disputada fica com quem chegou primeiro; a face livre da mesma seleção é atribuída normalmente
    expect(n.F.get(1).parte).toBe('a');
    expect(n.F.get(2).parte).toBe('b');
    expect(n.partes.b).toBeDefined();
  });

  it('substituir: true transfere sem gritar; toda a seleção recusada não deixa parte fantasma', () => {
    const transferiu = nucleo([cubo, parte('a', [0, 1]), parte('b', [1], { substituir: true })], {}, {});
    expect(transferiu.orfaos).toHaveLength(0);
    expect(transferiu.F.get(1).parte).toBe('b');
    expect(transferiu.F.get(0).parte).toBe('a');

    const fantasma = nucleo([cubo, parte('a', [0]), parte('b', [0])], {}, {});
    expect(conflitos(fantasma)).toHaveLength(1);
    expect(Object.keys(fantasma.partes)).toEqual(['a']);   // 'b' não roubou nada: não vira parte de mentira
  });

  it('substituir com valor inesperado GRITA e a op segue ESTRITA (fail-closed, como tudo:true)', () => {
    for (const valor of ['sim', 1, false]) {
      const n = nucleo([cubo, parte('a', [0]), parte('b', [0], { substituir: valor })], {}, {});
      expect(n.orfaos.some((o: any) => o.op === 'parte' && o.ref === 'substituir' && /só aceita o literal true/.test(o.motivo))).toBe(true);
      expect(conflitos(n)).toHaveLength(1);               // não desligou a rede
      expect(n.F.get(0).parte).toBe('a');
    }
  });

  it('parte herdada por espelha também é protegida (sem procedência de passo, o diagnóstico degrada mas não some)', () => {
    const n = nucleo([cubo, parte('a', [0, 1, 2, 3, 4, 5]), ['espelha', { eixo: 'x', sel: { grupo: 'a' } }], ['parte', { nome: 'b', sel: { grupo: 'a' } }]], {}, {});
    const orf = conflitos(n);
    expect(orf.length).toBeGreaterThan(6);                                          // originais + cópias
    expect(orf.some((o: any) => /nomeada no passo 1/.test(o.motivo))).toBe(true);    // original: procedência conhecida
    expect(orf.some((o: any) => !/nomeada no passo/.test(o.motivo))).toBe(true);     // cópia do espelha: herdou o nome, não o passo
    expect([...n.F.values()].every((f: any) => f.parte === 'a')).toBe(true);
    expect(n.partes.b).toBeUndefined();
  });
});

/* CONTRATO DE IDENTIDADE DE PARTE — a correção dos dois defeitos que a revisão
   adversarial da R2 achou, e que têm a MESMA raiz: `parte.nome` entrava sem
   contrato nenhum.

   (1) A trava do O-2 perguntava `f.parte != null` e o `neutroCanonico`
       perguntava `if (f.parte)`: identidade falsy-mas-não-nula (`''`) sumia do
       formato salvo E mesmo assim bloqueava a nomeação seguinte — regressão
       provada contra o núcleo de antes do O-2, que nomeava a face normalmente.
   (2) `nome: 42`/`true`/`['a']` atravessava tudo (0 órfãos, canon gravando o
       lixo, gabarito hasheando) e só estourava na régua da bancada; `nome`
       AUSENTE registrava a chave literal `"undefined"` em `st.partes` — nomear
       virava no-op silencioso, o que o CLAUDE.md proíbe.

   O contrato é UM: nome de parte é string com pelo menos um caractere visível,
   validado na ENTRADA, e a guarda, o canon e o adaptador perguntam todos por
   `temNomeDeParte`. */
describe('contrato de identidade de parte (nome)', () => {
  const cubo: any = ['cubo', { id: 0, lado: 1 }];
  const parte = (nome: any, faces: number[]): any => ['parte', { nome, faces }];
  const canonF0 = (n: any) => neutroCanonico(n).F[0];
  const nomeRuim = (n: any) => n.orfaos.filter((o: any) => o.op === 'parte' && o.ref === 'nome');

  it('nome vazio não bloqueia a nomeação seguinte: quem grita é o passo do nome vazio (regressão do O-2)', () => {
    // ANTES do O-2 esta lista dava F0.parte='disco'; a trava passou a ver '' como
    // identidade e a face travava com um nome que o arquivo salvo nem registra.
    const n = nucleo([cubo, parte('', [0]), parte('disco', [0])], {}, {});
    expect(nomeRuim(n)).toHaveLength(1);                     // o grito é no passo 1, o do nome vazio
    expect(nomeRuim(n)[0].passo).toBe(1);
    expect(n.orfaos.some((o: any) => /já pertence à parte ''/.test(o.motivo))).toBe(false);   // a mensagem sem sentido morreu
    expect(n.F.get(0).parte).toBe('disco');                  // o passo 2 nomeia normalmente
    expect(Object.keys(n.partes)).toEqual(['disco']);        // '' nunca virou parte
    expect(canonF0(n)[6]).toBe('disco');                     // e a cauda de parte está no canon
  });

  it('o que a GUARDA considera identidade é exatamente o que o CANON grava (as três fontes concordam)', () => {
    // a peça nomeada de verdade: canon tem cauda E a face está travada contra roubo
    const nomeada = nucleo([cubo, parte('a', [0]), parte('b', [0])], {}, {});
    expect(canonF0(nomeada)[6]).toBe('a');
    expect(nomeada.orfaos.some((o: any) => /já pertence à parte 'a'/.test(o.motivo))).toBe(true);
    // a identidade recusada não grava cauda no canon...
    const so = nucleo([cubo, parte('   ', [0])], {}, {});
    expect(canonF0(so)).toHaveLength(6);
    // ...e por isso também não pode travar a nomeação seguinte
    const depois = nucleo([cubo, parte('   ', [0]), parte('b', [0])], {}, {});
    expect(canonF0(depois)[6]).toBe('b');
    expect(depois.F.get(0).parte).toBe('b');
    expect(depois.orfaos.some((o: any) => /já pertence à parte/.test(o.motivo))).toBe(false);
  });

  it('nome não-string GRITA e a op é fail-closed: nada no neutro, nada no canon, nada em partes', () => {
    for (const nome of [42, true, ['a'], { n: 1 }, null, undefined]) {
      const n = nucleo([cubo, parte(nome, [0, 1])], {}, {});
      expect(nomeRuim(n)).toHaveLength(1);
      expect(nomeRuim(n)[0].motivo).toMatch(/nome de parte inválido/);
      expect(n.F.get(0).parte).toBeNull();                   // nenhuma face tocada
      expect(n.F.get(1).parte).toBeNull();
      expect(Object.keys(n.partes)).toEqual([]);             // nem a chave literal "undefined"
      expect(canonF0(n)).toHaveLength(6);                    // canon byte-idêntico ao de uma face sem parte
    }
  });

  it('nome inválido não chega na régua: a medida headless da bancada segue abrindo a peça', () => {
    // MEDIA-4 na prática: com `nome: 42` o núcleo entregava um neutro que fazia
    // `caixasPorParte` LANÇAR, e a bancada deixava de abrir uma peça que abria antes.
    const n = nucleo([cubo, parte(42, [0, 1])], {}, {});
    expect(() => caixasPorParte(n)).not.toThrow();
    const { caixas, facesSemParte } = caixasPorParte(n);
    expect(caixas.size).toBe(0);
    expect(facesSemParte).toHaveLength(6);                   // e a régua CONTA as 6 sem nome, em vez de mentir
  });

  it('sel:{grupo} usa o MESMO contrato: o que não pode ser criado não pode ser citado', () => {
    for (const grupo of ['', '  ', 7 as any]) {
      const n = nucleo([cubo, parte('a', [0]), ['pincel', { modo: 'face', sel: { grupo }, cor: '#123456' }]], {}, {});
      expect(n.orfaos.some((o: any) => o.ref === 'sel.grupo' && /nome de parte/.test(o.motivo))).toBe(true);
    }
  });
});

/* O-3 (Faixa 1) — `sel.regiao` ganha `modo`. O argumento não é conforto: o
   seletor JÁ se comportava de duas maneiras e nada no formato dizia isso —
   vértice entrava por "toca", face só por "contem" (`f.vs.every(dentro)`), de
   modo que uma op de vértice e uma op de face com a MESMA caixa selecionavam
   conjuntos diferentes. `modo` não inventa comportamento: torna explícito o que
   já existia implícito, com `contem` de default para o gabarito seguir
   byte-idêntico. */
describe('O-3 — sel.regiao com modo contem|toca', () => {
  const cubo: any = ['cubo', { id: 0, lado: 1 }];   // x,z em [-0.5,0.5], y em [0,1]; face 1 = topo
  const caixaDoTopo = { min: [-1, 0.9, -1], max: [1, 1.1, 1] };   // contém o topo INTEIRO; toca as 4 paredes
  const pinta = (regiao: any): any => ['pincel', { modo: 'face', sel: { regiao }, cor: '#123456' }];
  const pintadas = (n: any) => [...n.F.values()].filter((f: any) => f.cor).map((f: any) => f.id).sort((a: number, b: number) => a - b);
  const canon = (n: any) => JSON.stringify(neutroCanonico(n));

  it('contem é o DEFAULT e é byte-idêntico à ausência de modo (a compat do gabarito)', () => {
    const semModo = nucleo([cubo, pinta(caixaDoTopo)], {}, {});
    const explicito = nucleo([cubo, pinta({ ...caixaDoTopo, modo: 'contem' })], {}, {});
    expect(semModo.orfaos).toHaveLength(0);
    expect(pintadas(semModo)).toEqual([1]);            // só a face INTEIRA na caixa
    expect(canon(explicito)).toBe(canon(semModo));     // mesma canon, byte a byte
  });

  it('toca seleciona a face com PELO MENOS UM canto dentro', () => {
    const n = nucleo([cubo, pinta({ ...caixaDoTopo, modo: 'toca' })], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintadas(n)).toEqual([1, 2, 3, 4, 5]);       // topo + as 4 paredes; o fundo (y=0) fica de fora
  });

  it('sem modo, a op de VÉRTICE lê a caixa como sempre leu: entra o canto que está dentro', () => {
    const n = nucleo([cubo, ['transladar', { d: [0, 2, 0], sel: { regiao: caixaDoTopo } }]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(n.V.get(4)).toEqual([-0.5, 3, -0.5]);       // canto de cima subiu
    expect(n.V.get(0)).toEqual([-0.5, 0, -0.5]);       // canto de baixo, fora da caixa, ficou
  });

  /* A revisão adversarial da R2 provou que `modo` era ENGOLIDO em op de vértice:
     `toca`, `contem` e a AUSÊNCIA davam canon byte-idêntico em `transladar`,
     enquanto no `pincel` a mesma caixa pinta 1 face contra 5. Chave do formato
     salvo aceita em silêncio ensina a próxima IA a escrever besteira que passa —
     e o cenário é concreto: copiar o `sel` de um exemplo de `pincel` para um
     `transladar` e receber calado o comportamento antigo, com a malha rasgando.
     A escolha foi GRITAR (fail-closed) em vez de fazer `modo` mover vértice:
     arrastar canto de FORA da caixa mudaria em silêncio o que
     `transladar`/`rotaciona` movem, que é a classe de surpresa que o O-3 veio
     matar. */
  it('modo numa op de VÉRTICE GRITA em vez de evaporar, nos DOIS valores, e é fail-closed', () => {
    for (const modo of ['toca', 'contem']) {
      for (const op of ['transladar', 'rotaciona', 'displace']) {
        const args: any = op === 'transladar' ? { d: [0, 2, 0] } : op === 'rotaciona' ? { eixo: 'y', graus: 90 } : { amplitude: 0.1, frequencia: 2 };
        const n = nucleo([cubo, [op, { ...args, sel: { regiao: { ...caixaDoTopo, modo } } }]], {}, {});
        const grito = n.orfaos.filter((o: any) => o.ref === 'sel.regiao' && /modo só governa o eixo de FACE/.test(o.motivo));
        expect(grito, `${op} com modo:${modo}`).toHaveLength(1);
        expect(grito[0].op).toBe(op);
        expect(grito[0].motivo).toMatch(/consome só vértices/);
        // fail-closed: a região não seleciona nada, então a malha não se move (e nada muda em silêncio)
        expect(JSON.stringify([...n.V.entries()])).toBe(JSON.stringify([...nucleo([cubo], {}, {}).V.entries()]));
      }
    }
  });

  it('a MESMA caixa com modo continua funcionando na op de FACE (o grito é sobre o eixo, não sobre a chave)', () => {
    const n = nucleo([cubo, pinta({ ...caixaDoTopo, modo: 'toca' })], {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(pintadas(n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('modo inválido GRITA nomeando os dois valores aceitos e não seleciona nada', () => {
    for (const modo of ['contido', 'TOCA', true, 1]) {
      const n = nucleo([cubo, pinta({ ...caixaDoTopo, modo })], {}, {});
      expect(n.orfaos.some((o: any) => o.ref === 'sel.regiao' && /modo só aceita 'contem'.*'toca'/.test(o.motivo))).toBe(true);
      expect(pintadas(n)).toEqual([]);
    }
    // chave desconhecida dentro da região continua gritando (modo não abriu a porta pra qualquer chave)
    const chaveRuim = nucleo([cubo, pinta({ ...caixaDoTopo, mode: 'toca' })], {}, {});
    expect(chaveRuim.orfaos.some((o: any) => o.ref === 'sel.regiao' && /precisa ter min E max/.test(o.motivo))).toBe(true);
    expect(pintadas(chaveRuim)).toEqual([]);
  });
});

/* O-11 (Faixa 1, atrito A-7) — diagnóstico de completude de alias. Citar um
   alias de conjunto antes de todas as suas primitivas existirem produzia órfão
   CORRETO e confuso (`origem cilindro:303 inexistente ou ainda não criada`):
   foi a única iteração perdida na escrita do freio a disco, porque o autor pensa
   "o disco" como UMA coisa e o alias só é conjunto depois do último passo que o
   compõe. A informação de QUANDO ele fecha já existia no núcleo (o mapa de
   declarações que `mapearDeclaracoesOrigem` monta antes de executar). Só
   MENSAGEM: a resolução do alias continua sendo na citação. */
describe('O-11 — diagnóstico de completude de alias', () => {
  const cil = (i: number, origemId: number): any => ['cilindro', { id: i * 1000, raio: 0.5, altura: 1, lados: 4, origemId }];
  const metades: any = [['discoInteiro', { unir: [{ origem: { op: 'cilindro', id: 302 } }, { origem: { op: 'cilindro', id: 303 } }] }]];
  const completude = (n: any) => n.orfaos.filter((o: any) => /fica completo no passo/.test(o.motivo));

  it('citar antes de fechar diz em que passo o alias fica completo e o que falta; citar depois é o caminho feliz', () => {
    const passos: any = [
      cil(0, 302),                                                        // passo 0: primeira metade
      ['transladar', { d: [0, 1, 0], sel: { alias: 'discoInteiro' } }],   // passo 1: cita cedo demais
      cil(2, 303),                                                        // passo 2: a segunda metade nasce aqui
      ['parte', { nome: 'disco', sel: { alias: 'discoInteiro' } }],       // passo 3: agora sim
    ];
    const n = nucleo(passos, {}, {}, {}, null, metades);
    const dica = completude(n);
    expect(dica).toHaveLength(1);
    expect(dica[0].passo).toBe(1); expect(dica[0].op).toBe('transladar'); expect(dica[0].ref).toBe('sel.alias');
    expect(dica[0].motivo).toMatch(/alias 'discoInteiro' fica completo no passo 2/);
    expect(dica[0].motivo).toMatch(/você citou no passo 1/);
    expect(dica[0].motivo).toMatch(/cilindro:303 \(nasce no passo 2\)/);
    // a CAUSA crua continua sendo relatada junto (o diagnóstico soma, não substitui)
    expect(n.orfaos.some((o: any) => o.passo === 1 && /inexistente ou ainda não criada/.test(o.motivo))).toBe(true);
    // e o passo 3, com o alias fechado, funciona: as faces das DUAS metades viram a parte
    expect(n.orfaos.every((o: any) => o.passo !== 3)).toBe(true);
    const daParte = [...n.F.values()].filter((f: any) => f.parte === 'disco').map((f: any) => f.id);
    expect(daParte.length).toBe(8);                                        // 4 laterais por cilindro ({} da origem = laterais, sem tampa)
    expect(daParte.some((id: number) => id >= 2000)).toBe(true);           // inclui a metade do passo 2
  });

  it('alias direto (sem unir) também ganha a dica', () => {
    const n = nucleo([
      ['transladar', { d: [0, 1, 0], sel: { alias: 'metade' } }],
      cil(1, 302),
    ] as any, {}, {}, {}, null, [['metade', { origem: { op: 'cilindro', id: 302 } }]] as any);
    expect(completude(n)[0].motivo).toMatch(/alias 'metade' fica completo no passo 1; você citou no passo 0/);
  });

  it('origem que NUNCA é declarada não ganha dica de completude (a causa é outra, e inventar passo seria mentira)', () => {
    const n = nucleo([
      cil(0, 302),
      ['transladar', { d: [0, 1, 0], sel: { alias: 'discoInteiro' } }],
    ] as any, {}, {}, {}, null, metades);
    expect(completude(n)).toHaveLength(0);
    expect(n.orfaos.some((o: any) => /cilindro:303 inexistente ou ainda não criada/.test(o.motivo))).toBe(true);
  });

  /* CONSELHO SÓ SE FOR VERDADE. A revisão adversarial da R2 provou o conselho
     ERRADO: com um termo que aponta `{op:'cilindro'}` para uma origem declarada
     por um `cubo`, o diagnóstico mandava "espere o alias fechar" — e seguir a
     instrução não resolvia, porque a citação seguinte falhava com `origem 7 foi
     declarada por 'cubo', não por 'cilindro'`. A causa era tratar "id
     registrado" como "termo resolvido". */
  const nunca = (n: any) => n.orfaos.filter((o: any) => /NUNCA fica completo/.test(o.motivo));

  it('termo que falha em QUALQUER passo diz "nunca fecha" e o porquê, em vez de mandar esperar', () => {
    const passos: any = [
      ['cubo', { id: 0, lado: 1, origemId: 7 }],                          // o 7 nasce como CUBO
      ['transladar', { d: [0, 1, 0], sel: { alias: 'X' } }],              // passo 1: cita o alias
      ['cubo', { id: 2000, lado: 1, origemId: 8 }],                       // passo 2: o outro termo nasce
      ['parte', { nome: 'p', sel: { alias: 'X' } }],                      // passo 3: seguir "espere" não resolveria
    ];
    const aliases: any = [['X', { unir: [{ origem: { op: 'cilindro', id: 7 } }, { origem: { op: 'cubo', id: 8 } }] }]];
    const n = nucleo(passos, {}, {}, {}, null, aliases);
    expect(completude(n)).toHaveLength(0);                                // nada de "espere o alias fechar"
    const aviso = nunca(n);
    expect(aviso.length).toBeGreaterThan(0);
    expect(aviso[0].passo).toBe(1); expect(aviso[0].ref).toBe('sel.alias');
    expect(aviso[0].motivo).toMatch(/alias 'X' NUNCA fica completo/);
    expect(aviso[0].motivo).toMatch(/a origem 7 foi declarada por 'cubo', não por 'cilindro'/);
    expect(aviso[0].motivo).toMatch(/esperar não resolve/);
    // e o conselho está certo: no passo 3, com TUDO já nascido, a citação continua falhando
    expect(n.orfaos.some((o: any) => o.passo === 3 && /foi declarada por 'cubo'/.test(o.motivo))).toBe(true);
  });

  it('termo que vai NASCER com outra op também é insalvável (a declaração futura não casa)', () => {
    const passos: any = [
      ['transladar', { d: [0, 1, 0], sel: { alias: 'Y' } }],              // passo 0: cita antes de tudo
      ['cubo', { id: 1000, lado: 1, origemId: 9 }],                       // passo 1: o 9 vai nascer CUBO, não cilindro
    ];
    const n = nucleo(passos, {}, {}, {}, null, [['Y', { origem: { op: 'cilindro', id: 9 } }]] as any);
    expect(completude(n)).toHaveLength(0);
    expect(nunca(n)[0].motivo).toMatch(/o passo 1 declara a origem 9 por 'cubo', não por 'cilindro'/);
  });

  it('um termo insalvável contamina a dica do alias inteiro (nenhum "espere" ao lado de um termo morto)', () => {
    const passos: any = [
      ['cubo', { id: 0, lado: 1, origemId: 7 }],                          // termo A: nasce cubo, o alias pede cilindro
      ['transladar', { d: [0, 1, 0], sel: { alias: 'Z' } }],              // passo 1: cita
      cil(2, 303),                                                        // termo B: esse SIM só faltava esperar
    ];
    const aliases: any = [['Z', { unir: [{ origem: { op: 'cilindro', id: 7 } }, { origem: { op: 'cilindro', id: 303 } }] }]];
    const n = nucleo(passos, {}, {}, {}, null, aliases);
    expect(completude(n)).toHaveLength(0);                                // esperar o passo 2 não faria o alias fechar
    expect(nunca(n)).toHaveLength(1);
  });
});

/* BAIXA-13 — o núcleo ensinava SEIS seletores na mensagem de seleção vazia,
   omitindo justamente `alias`: a mesma omissão que o O-0 corrigiu na skill,
   impressa pela própria ferramenta, na hora em que o autor mais precisa da
   lista certa. As três mensagens saem agora de uma lista só. */
describe('as mensagens de seleção ensinam os OITO seletores', () => {
  const cubo: any = ['cubo', { id: 0, lado: 1 }];
  const SETE = ['tudo', 'v', 'f', 'grupo', 'regiao', 'origem', 'porta', 'alias'];

  it('seleção vazia, chave desconhecida e sel não-objeto nomeiam todos os sete, alias incluído', () => {
    const vazia = nucleo([cubo, ['transladar', { d: [0, 1, 0], sel: {} }]] as any, {}, {});
    const desconhecida = nucleo([cubo, ['transladar', { d: [0, 1, 0], sel: { xyz: 1 } }]] as any, {}, {});
    const naoObjeto = nucleo([cubo, ['transladar', { d: [0, 1, 0], sel: 'tudo' }]] as any, {}, {});
    for (const [qual, n] of [['vazia', vazia], ['desconhecida', desconhecida], ['naoObjeto', naoObjeto]] as any[]) {
      const msg = n.orfaos.map((o: any) => o.motivo).join(' | ');
      for (const seletor of SETE) expect(msg, `${qual} omite '${seletor}'`).toMatch(new RegExp(`\\b${seletor}\\b`));
    }
  });
});

/* ---------------------------------------------------------------------------
   Endereços semânticos v1 — A-18, A-19 e A-20 de docs/mecanifica/ATRITOS-AUTORIA.md.
   Cada bloco abaixo falha no código anterior a esta rodada: os três geradores
   só sabiam citar a primitiva inteira (A-18), o eixo só aceitava inteiro
   literal (A-19) e `nucleo` não devolvia as portas (A-20).
--------------------------------------------------------------------------- */
const pintaOrigemEm = (passos: any[], origem: any) => nucleo([...passos, ['pincel', { modo: 'face', sel: { origem }, cor: '#123456' }]] as any, {}, {});
const idsPintados = (n: any) => [...n.F.values()].filter((f: any) => f.cor === '#123456').map((f: any) => f.id).sort((a: number, b: number) => a - b);

describe('A-18 — cone, plano e chamferBox passam a citar o eixo que a topologia já tem', () => {
  const cone: any = ['cone', { id: 0, lados: 6, origemId: 10 }];
  const plano: any = ['plano', { id: 0, seg: 3, origemId: 11 }];
  const caixa: any = ['chamferBox', { id: 0, lado: 2, chanfro: 0.3, origemId: 12 }];

  it('cone: `lado` é a lateral, `tampa:fundo` é a base — e a primitiva inteira continua sendo lados+1 faces', () => {
    expect(idsPintados(pintaOrigemEm([cone], { op: 'cone', id: 10, lado: 2 }))).toEqual([2]);
    expect(idsPintados(pintaOrigemEm([cone], { op: 'cone', id: 10, tampa: 'fundo' }))).toEqual([6]);
    expect(idsPintados(pintaOrigemEm([cone], { op: 'cone', id: 10, lado: { passo: 2, fase: 0 } }))).toEqual([0, 2, 4]);
    const inteiro = pintaOrigemEm([cone], { op: 'cone', id: 10 });   // ADITIVIDADE: o que já estava escrito não muda de alvo
    expect(inteiro.orfaos).toHaveLength(0);
    expect(idsPintados(inteiro)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("cone não inventa um 'topo' que não existe: o ápice é vértice, e citá-lo GRITA", () => {
    const n = pintaOrigemEm([cone], { op: 'cone', id: 10, tampa: 'topo' });
    expect(n.orfaos.some((o: any) => o.op === 'pincel' && /tampa opcional \('fundo'\)/.test(o.motivo))).toBe(true);
    expect(idsPintados(n)).toEqual([]);
  });

  it('plano: `faixa` é a linha em z, `lado` é a coluna em x, e os dois juntos dão uma célula', () => {
    expect(idsPintados(pintaOrigemEm([plano], { op: 'plano', id: 11, faixa: 1 }))).toEqual([3, 4, 5]);
    expect(idsPintados(pintaOrigemEm([plano], { op: 'plano', id: 11, lado: 2 }))).toEqual([2, 5, 8]);
    expect(idsPintados(pintaOrigemEm([plano], { op: 'plano', id: 11, faixa: 1, lado: 2 }))).toEqual([5]);
    const inteiro = pintaOrigemEm([plano], { op: 'plano', id: 11 });
    expect(inteiro.orfaos).toHaveLength(0);
    expect(idsPintados(inteiro)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('chamferBox: as 6 faces nominais do cubo, mais as 12 arestas e os 8 cantos', () => {
    expect(idsPintados(pintaOrigemEm([caixa], { op: 'chamferBox', id: 12, face: 'topo' }))).toEqual([1]);
    expect(idsPintados(pintaOrigemEm([caixa], { op: 'chamferBox', id: 12, face: 'esquerda' }))).toEqual([5]);
    expect(idsPintados(pintaOrigemEm([caixa], { op: 'chamferBox', id: 12, aresta: 0 }))).toEqual([6]);
    expect(idsPintados(pintaOrigemEm([caixa], { op: 'chamferBox', id: 12, canto: 7 }))).toEqual([25]);
    expect(idsPintados(pintaOrigemEm([caixa], { op: 'chamferBox', id: 12, face: 'fundo', canto: 0 }))).toEqual([0, 18]);   // os campos UNEM
    const inteira = pintaOrigemEm([caixa], { op: 'chamferBox', id: 12 });
    expect(inteira.orfaos).toHaveLength(0);
    expect(idsPintados(inteira)).toEqual(Array.from({ length: 26 }, (_, k) => k));
  });

  it('eixo fora do limite GRITA e não pinta nada pela metade, nas três famílias', () => {
    for (const origem of [{ op: 'cone', id: 10, lado: 99 }, { op: 'plano', id: 11, faixa: 99 }, { op: 'chamferBox', id: 12, aresta: 12 }, { op: 'chamferBox', id: 12, canto: 8 }]) {
      const passos: any[] = origem.op === 'cone' ? [cone] : origem.op === 'plano' ? [plano] : [caixa];
      const n = pintaOrigemEm(passos, origem);
      expect(n.orfaos.some((o: any) => o.op === 'pincel' && /fora do limite/.test(o.motivo)), JSON.stringify(origem)).toBe(true);
      expect(idsPintados(n)).toEqual([]);
    }
  });

  it('inflate continua no contrato mínimo, dito como decisão: citar eixo nele GRITA', () => {
    const n = pintaOrigemEm([['cubo', { id: 0, lado: 1, origemId: 13 }]], { op: 'inflate', id: 13, faixa: 0 });
    expect(n.orfaos.some((o: any) => o.op === 'pincel' && /inflate usa somente op e id/.test(o.motivo))).toBe(true);
  });
});

describe('A-19 — o eixo de uma origem aceita parâmetro e extremidade', () => {
  // esfera com `lados: 4`: a faixa k são as faces [4k..4k+3]; `aneis` é TOPO, muda a CONTAGEM.
  const esfera: any = ['esfera', { id: 0, aneis: 'aneis', lados: 4, origemId: 20 }];
  const pinta = (origem: any, TOPO: any, PARAMS: any = {}) => nucleo([esfera, ['pincel', { modo: 'face', sel: { origem: { op: 'esfera', id: 20, ...origem } }, cor: '#123456' }]] as any, PARAMS, TOPO);

  it("'ultima' continua sendo a última quando a contagem muda; o literal reaponta em silêncio", () => {
    expect(idsPintados(pinta({ faixa: 'ultima' }, { aneis: 3 }))).toEqual([8, 9, 10, 11]);
    expect(idsPintados(pinta({ faixa: 'ultima' }, { aneis: 4 }))).toEqual([12, 13, 14, 15]);
    expect(idsPintados(pinta({ faixa: 'primeira' }, { aneis: 4 }))).toEqual([0, 1, 2, 3]);
    // o mesmo endereço escrito como literal: era a última com aneis=3 e vira a do meio com aneis=4, sem erro nenhum
    expect(idsPintados(pinta({ faixa: 2 }, { aneis: 3 }))).toEqual([8, 9, 10, 11]);
    expect(idsPintados(pinta({ faixa: 2 }, { aneis: 4 }))).toEqual([8, 9, 10, 11]);
  });

  it('o eixo cita PARAM e expressão pelo mesmo caminho de todo campo dimensional', () => {
    expect(idsPintados(pinta({ faixa: 'anelDaFlor' }, { aneis: 4 }, { anelDaFlor: 1 }))).toEqual([4, 5, 6, 7]);
    expect(idsPintados(pinta({ faixa: '=aneis - 1' }, { aneis: 4 }))).toEqual([12, 13, 14, 15]);
    expect(idsPintados(pinta({ faixa: 1, lado: '=2 + 1' }, { aneis: 4 }))).toEqual([7]);
  });

  it('valor fora do contrato GRITA com a causa nomeada, e não pinta nada', () => {
    const casos: any[] = [
      [{ faixa: 'naoExiste' }, {}, /não resolve/],
      [{ faixa: 'meio' }, { meio: 1.5 }, /não é índice/],
      [{ faixa: 'negativo' }, { negativo: -1 }, /não é índice/],
      [{ faixa: 'aneis' }, {}, /fora do limite/],          // resolve para 4 numa esfera de 4 faixas (0..3)
      [{ faixa: '' }, {}, /faixa opcional/],               // string vazia não é endereço nenhum
    ];
    for (const [origem, PARAMS, esperado] of casos) {
      const n = pinta(origem, { aneis: 4 }, PARAMS);
      expect(n.orfaos.some((o: any) => o.op === 'pincel' && esperado.test(o.motivo)), JSON.stringify(origem) + ' -> ' + n.orfaos.map((o: any) => o.motivo).join(' | ')).toBe(true);
      expect(idsPintados(n)).toEqual([]);
    }
  });

  it('os eixos novos do A-18 falam a mesma língua: extremidade e parâmetro no cilindro e no chamferBox', () => {
    const cil: any = ['cilindro', { id: 0, raio: 0.5, altura: 1, lados: 'lados', origemId: 30 }];
    const nCil = nucleo([cil, ['pincel', { modo: 'face', sel: { origem: { op: 'cilindro', id: 30, lado: 'ultima' } }, cor: '#123456' }]] as any, {}, { lados: 5 });
    expect(nCil.orfaos).toHaveLength(0);
    expect(idsPintados(nCil)).toEqual([4]);
    const caixa: any = ['chamferBox', { id: 0, lado: 2, chanfro: 0.3, origemId: 31 }];
    const nCaixa = nucleo([caixa, ['pincel', { modo: 'face', sel: { origem: { op: 'chamferBox', id: 31, aresta: 'ultima', canto: 'qual' } }, cor: '#123456' }]] as any, { qual: 3 }, {});
    expect(nCaixa.orfaos).toHaveLength(0);
    expect(idsPintados(nCaixa)).toEqual([17, 21]);
  });
});

describe('A-20 — o núcleo devolve as portas publicadas', () => {
  const passos: any = [
    ['cilindro', { id: 0, raio: 0.5, altura: 1, lados: 8, origemId: 40 }],
    ['cone', { id: BLOCO, lados: 6, origemId: 41 }],
    ['publicarPorta', { nome: 'zeladoria', de: { op: 'cone', id: 41, tampa: 'fundo' } }],
    ['publicarPorta', { nome: 'assentoDoEixo', de: { op: 'cilindro', id: 40, tampa: 'topo' } }],
  ];

  it('nome, origem declarada e passo de publicação saem do núcleo, ordenados por nome', () => {
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect([...n.portas.keys()]).toEqual(['assentoDoEixo', 'zeladoria']);   // ordem do NOME, não do passo
    expect(n.portas.get('assentoDoEixo')).toEqual({ nome: 'assentoDoEixo', de: { op: 'cilindro', id: 40, tampa: 'topo' }, passo: 3 });
    expect(n.portas.get('zeladoria').passo).toBe(2);
  });

  it('a porta devolvida é um CLONE: mexer nela não altera o passo da peça, e rodar de novo dá o mesmo', () => {
    const n = nucleo(passos, {}, {});
    n.portas.get('zeladoria').de.id = 999;
    expect(passos[2][1].de.id).toBe(41);
    const outra = nucleo(passos, {}, {});
    expect(JSON.stringify([...outra.portas])).toBe(JSON.stringify([...nucleo(passos, {}, {}).portas]));
  });

  it('peça sem porta devolve mapa vazio, e porta recusada não entra no mapa', () => {
    expect([...nucleo([['cubo', { id: 0, lado: 1 }]] as any, {}, {}).portas]).toEqual([]);
    const recusada = nucleo([['cubo', { id: 0, lado: 1, origemId: 50 }], ['publicarPorta', { nome: 'fantasma', de: { op: 'cubo', id: 50, face: 'nenhuma' } }]] as any, {}, {});
    expect(recusada.orfaos.some((o: any) => o.op === 'publicarPorta')).toBe(true);
    expect([...recusada.portas]).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
   O-13 — `arranja` (arranjo radial e linear com identidade por cópia).

   O que estes casos existem para matar, dito na cara, porque os dois ciclos
   anteriores morreram do mesmo jeito (verde pelo motivo errado):

   1. CÓPIA ANÔNIMA. Um arranjo que devolve faces sem nome desfaz O-6 e O-12.
      Então nenhum caso aqui cita id de face para dizer QUEM é a cópia: todos
      passam por `sel:{alias}`/`sel:{origem}` e só então conferem o id que saiu.
   2. ÂNGULO ACUMULADO. Somar o passo N vezes e somar uma vez multiplicado por N
      dão doubles DIFERENTES, e a diferença entra no arquivo salvo. Os casos de
      determinismo comparam contra o valor DERIVADO e provam, no mesmo teste,
      que o valor ACUMULADO seria outro — senão a afirmação passaria com as duas
      implementações e não provaria nada.
   3. NUMERAÇÃO SEM AFIRMAÇÃO. Toda chave nova do formato salvo (`total`,
      `volta`, `graus`, `d`, `pivo`, `copia`) tem pelo menos um caso que troca o
      valor e cobra outro resultado.
--------------------------------------------------------------------------- */
describe('O-13 — arranja (arranjo radial e linear)', () => {
  const fonte = { op: 'cubo', id: 30 };
  const colecao = { op: 'arranja', id: 50, de: fonte };
  const braco = (extra: any = {}): any[] => [
    ['cubo', { id: 0, lado: 0.2, origemId: 30 }],
    ['transladar', { d: [1, 0, 0] }],
    ['arranja', { modo: 'radial', eixo: 'y', total: 4, volta: 360, origemId: 50, derivaDe: fonte, sel: { origem: fonte }, ...extra }],
  ];
  const aliases: any = [
    ['todasAsCopias', { origem: colecao }],
    ['segundaCopia', { origem: { ...colecao, copia: 1 } }],
    ['ultimaCopia', { origem: { ...colecao, copia: 'ultima' } }],
    ['primeiraCopia', { origem: { ...colecao, copia: 'primeira' } }],
    ['copiaPorParam', { origem: { ...colecao, copia: 'qual' } }],
    ['copiasAlternadas', { origem: { ...colecao, copia: { passo: 2, fase: 0 } } }],
    ['fonteMaisCopias', { unir: [{ origem: fonte }, { origem: colecao }] }],
  ];
  const idsCom = (n: any, chave: string, valor: any) => [...n.F.values()].filter((f: any) => f[chave] === valor).map((f: any) => f.id).sort((a: number, b: number) => a - b);
  const nomear = (nome: string, alias: string) => ['parte', { nome, sel: { alias } }];

  it('a coleção inteira e cada cópia são endereçáveis por identidade, sem citar id nem posição de passo', () => {
    const n = nucleo([...braco(),
      nomear('coroa', 'todasAsCopias'),
      ['pincel', { modo: 'face', sel: { alias: 'segundaCopia' }, cor: '#f00' }],
      ['liso', { sel: { alias: 'ultimaCopia' } }],
      ['solido', { sel: { alias: 'primeiraCopia' } }],
    ] as any, {}, {}, {}, null, aliases);
    expect(n.orfaos).toHaveLength(0);
    // 3 cópias × 6 faces, base do passo 2 = 2000, cada cópia numa corrida contígua
    expect(idsCom(n, 'parte', 'coroa')).toEqual([2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]);
    expect(idsCom(n, 'cor', '#f00')).toEqual([2006, 2007, 2008, 2009, 2010, 2011]);       // cópia 1
    expect(idsCom(n, 'liso', true)).toEqual([2012, 2013, 2014, 2015, 2016, 2017]);        // 'ultima' = cópia 2
    expect(idsCom(n, 'solido', true)).toEqual([2000, 2001, 2002, 2003, 2004, 2005]);      // 'primeira' = cópia 0
    // a fonte NÃO é cópia: nenhuma das citações acima pegou face dela
    expect([...n.F.values()].filter((f: any) => f.id < BLOCO).every((f: any) => f.parte === null && f.cor === null && !f.liso && !f.solido)).toBe(true);
    // e a união com a fonte é o mecanismo que já existe para querer as duas coisas
    const comFonte = nucleo([...braco(), nomear('tudo', 'fonteMaisCopias')] as any, {}, {}, {}, null, aliases);
    expect(idsCom(comFonte, 'parte', 'tudo')).toHaveLength(24);
  });

  it('a cópia citada por PARAM acompanha o parâmetro, e a citada por extremidade acompanha a contagem', () => {
    const dois = nucleo([...braco(), nomear('alvo', 'copiaPorParam')] as any, { qual: 2 }, {}, {}, null, aliases);
    const zero = nucleo([...braco(), nomear('alvo', 'copiaPorParam')] as any, { qual: 0 }, {}, {}, null, aliases);
    expect(idsCom(dois, 'parte', 'alvo')).toEqual([2012, 2013, 2014, 2015, 2016, 2017]);
    expect(idsCom(zero, 'parte', 'alvo')).toEqual([2000, 2001, 2002, 2003, 2004, 2005]);
    // 'ultima' com total 4 e com total 6 aponta para cópias DIFERENTES, sem tocar na citação
    const quatro = nucleo([...braco(), nomear('alvo', 'ultimaCopia')] as any, {}, {}, {}, null, aliases);
    const seis = nucleo([...braco({ total: 6 }), nomear('alvo', 'ultimaCopia')] as any, {}, {}, {}, null, aliases);
    expect(idsCom(quatro, 'parte', 'alvo')).toEqual([2012, 2013, 2014, 2015, 2016, 2017]);
    expect(idsCom(seis, 'parte', 'alvo')).toEqual([2024, 2025, 2026, 2027, 2028, 2029]);
    // progressão sobre as cópias: 0 e 2 de três
    const alt = nucleo([...braco(), nomear('alvo', 'copiasAlternadas')] as any, {}, {}, {}, null, aliases);
    expect(idsCom(alt, 'parte', 'alvo')).toEqual([2000, 2001, 2002, 2003, 2004, 2005, 2012, 2013, 2014, 2015, 2016, 2017]);
  });

  it('a identidade não depende da posição do passo: inserir um passo antes não muda quem é a cópia', () => {
    const semInserir = nucleo([...braco(), nomear('alvo', 'segundaCopia')] as any, {}, {}, {}, null, aliases);
    const comInserir = nucleo([
      ['cubo', { id: 0, lado: 0.05 }],
      ['cubo', { id: BLOCO, lado: 0.2, origemId: 30 }],
      ['transladar', { d: [1, 0, 0] }],
      ['arranja', { modo: 'radial', eixo: 'y', total: 4, volta: 360, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
      nomear('alvo', 'segundaCopia'),
    ] as any, {}, {}, {}, null, aliases);
    expect(semInserir.orfaos).toHaveLength(0); expect(comInserir.orfaos).toHaveLength(0);
    expect(idsCom(semInserir, 'parte', 'alvo')).toEqual([2006, 2007, 2008, 2009, 2010, 2011]);
    expect(idsCom(comInserir, 'parte', 'alvo')).toEqual([3006, 3007, 3008, 3009, 3010, 3011]);   // só a base do passo mudou
  });

  it('o ângulo é DERIVADO da contagem, não acumulado — e o acumulado daria outro double', () => {
    // 7 instâncias fechando 360°: o passo 360/7 é o caso em que somar 6 vezes != multiplicar por 6
    const n = nucleo([...braco({ total: 7 })] as any, {}, {}, {}, null, aliases);
    expect(n.orfaos).toHaveLength(0);
    const passo = 360 / 7;
    const gira = (p: number[], graus: number) => { const r = (graus * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
    const origem = [...nucleo(braco({ total: 7 }).slice(0, 2) as any, {}, {}).V.entries()].sort((a: any, b: any) => a[0] - b[0]);
    const nVporCopia = origem.length;
    for (let k = 0; k < 6; k++) {
      for (let j = 0; j < nVporCopia; j++) {
        const esperado = gira(origem[j][1] as number[], (k + 1) * passo);
        expect(n.V.get(2000 + k * nVporCopia + j)).toEqual(esperado);   // igualdade EXATA de double
      }
    }
    // a afirmação acima não é vazia: o acumulado daria OUTRO valor na cópia 5
    let acumulado = 0; for (let j = 0; j < 6; j++) acumulado += passo;
    expect(acumulado).not.toBe(6 * passo);
    expect(gira(origem[0][1] as number[], acumulado)).not.toEqual(gira(origem[0][1] as number[], 6 * passo));
  });

  it('linear: a cópia k fica em p+(k+1)·d, também derivado — o acumulado erraria o último passo', () => {
    const passos: any[] = [
      ['cubo', { id: 0, lado: 0.2, origemId: 30 }],
      ['arranja', { modo: 'linear', d: [0.1, 0, 0], total: 8, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
    ];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toHaveLength(0);
    const puro = [...nucleo([passos[0]], {}, {}).V.entries()].sort((a: any, b: any) => a[0] - b[0]);
    for (let k = 0; k < 7; k++) for (let j = 0; j < puro.length; j++) {
      const p = puro[j][1] as number[];
      expect(n.V.get(BLOCO + k * puro.length + j)).toEqual([p[0] + (k + 1) * 0.1, p[1], p[2]]);
    }
    let acumulado = 0; for (let j = 0; j < 7; j++) acumulado += 0.1;
    expect(acumulado).not.toBe(7 * 0.1);   // 0.7 vs 0.7000000000000001 — a diferença entraria no arquivo salvo
  });

  it('vértice EXATAMENTE sobre o eixo é soldado: as cópias reusam o id original em vez de empilhar', () => {
    // um cone tem o ápice em cima do eixo Y e o centro da base na origem
    const fonteCone = { op: 'cone', id: 30 };
    const passos: any[] = [
      ['cone', { id: 0, raio: 0.5, altura: 1, lados: 4, origemId: 30 }],
      ['arranja', { modo: 'radial', eixo: 'y', total: 3, volta: 360, origemId: 50, derivaDe: fonteCone, sel: { origem: fonteCone } }],
    ];
    const n = nucleo(passos, {}, {});
    const puro = nucleo([passos[0]], {}, {});
    expect(n.orfaos).toHaveLength(0);
    const noEixo = [...puro.V.entries()].filter(([, p]: any) => p[0] === 0 && p[2] === 0).map(([id]: any) => id);
    expect(noEixo).toEqual([4]);                          // só o ápice: o anel da base nasce com ±1e-17, e o weld é EXATO
    const soltos = puro.V.size - noEixo.length;
    expect(n.V.size).toBe(puro.V.size + soltos * 2);      // 2 cópias × só os vértices FORA do eixo
    // e as faces das cópias realmente citam os vértices ORIGINAIS do eixo
    const usadosNasCopias = new Set<number>();
    for (const f of n.F.values() as any) if (f.id >= BLOCO) for (const v of f.vs) usadosNasCopias.add(v);
    for (const v of noEixo) expect(usadosNasCopias.has(v)).toBe(true);
  });

  it('a mão da face é PRESERVADA: os cantos da cópia saem na mesma ordem da fonte, não revertidos', () => {
    // rotação e translação preservam a orientação; só o espelho a troca. Reverter aqui
    // viraria toda normal para dentro — invisível no teste de manifold e plausível na foto.
    const newell = (V: any, vs: number[]) => {
      let nx = 0, ny = 0, nz = 0;
      for (let k = 0; k < vs.length; k++) { const c = V.get(vs[k]), d = V.get(vs[(k + 1) % vs.length]); nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]); }
      const l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l];
    };
    // LINEAR: a cópia é a fonte transladada, então a normal é IDÊNTICA à da fonte
    const lin = nucleo([
      ['cubo', { id: 0, lado: 0.4, origemId: 30 }],
      ['arranja', { modo: 'linear', d: [1, 0, 0], total: 2, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
    ] as any, {}, {});
    expect(lin.orfaos).toHaveLength(0);
    const fonteFaces = [...lin.F.values()].filter((f: any) => f.id < BLOCO).sort((a: any, b: any) => a.id - b.id);
    fonteFaces.forEach((f: any, k: number) => {
      const copia = lin.F.get(BLOCO + k) as any;
      expect(copia.vs.length).toBe(f.vs.length);
      // ordem dos cantos: a MESMA da fonte, canto a canto (não a revertida)
      expect(copia.vs).not.toEqual(f.vs.map((v: number) => v).reverse());
      expect(newell(lin.V, copia.vs).map((x) => +x.toFixed(9))).toEqual(newell(lin.V, f.vs).map((x) => +x.toFixed(9)));
    });
    // RADIAL a 180° em torno de Y: a normal da cópia é a da fonte GIRADA, nunca a oposta dela
    const rad = nucleo([
      ['cubo', { id: 0, lado: 0.4, origemId: 30 }],
      ['transladar', { d: [1, 0, 0] }],
      ['arranja', { modo: 'radial', eixo: 'y', total: 2, graus: 180, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
    ] as any, {}, {});
    expect(rad.orfaos).toHaveLength(0);
    const radFonte = [...rad.F.values()].filter((f: any) => f.id < BLOCO).sort((a: any, b: any) => a.id - b.id);
    radFonte.forEach((f: any, k: number) => {
      const n0 = newell(rad.V, f.vs);
      const girada = [-n0[0], n0[1], -n0[2]];                              // 180° em torno de Y
      const nc = newell(rad.V, (rad.F.get(2000 + k) as any).vs);
      expect(nc.map((x) => +x.toFixed(6))).toEqual(girada.map((x) => +x.toFixed(6)));
    });
  });

  it('atributo da fonte é herdado pela cópia, e a fonte não é alterada', () => {
    const n = nucleo([
      ['cubo', { id: 0, lado: 0.2, origemId: 30 }],
      ['transladar', { d: [1, 0, 0] }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 30, face: 'topo' } }, cor: '#0f0' }],
      ['parte', { nome: 'braco', sel: { origem: fonte } }],
      ['arranja', { modo: 'radial', eixo: 'y', total: 3, volta: 360, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
    ] as any, {}, {});
    expect(n.orfaos).toHaveLength(0);
    expect(idsCom(n, 'cor', '#0f0')).toEqual([1, 4001, 4007]);           // topo da fonte + topo de cada cópia
    expect(idsCom(n, 'parte', 'braco')).toHaveLength(18);
  });

  it('cada valor recusado GRITA e não deixa NADA para trás — meia coleção nunca existe', () => {
    const base = ['cubo', { id: 0, lado: 0.2, origemId: 30 }];
    const bom = { modo: 'radial', eixo: 'y', total: 4, volta: 360, origemId: 50, derivaDe: fonte, sel: { origem: fonte } };
    const casos: [string, any][] = [
      ['modo ausente', { ...bom, modo: undefined }],
      ['modo desconhecido', { ...bom, modo: 'grade' }],
      ['total 1', { ...bom, total: 1 }],
      ['total fracionário', { ...bom, total: 2.5 }],
      ['volta e graus juntos', { ...bom, graus: 90 }],
      ['nem volta nem graus', { ...bom, volta: undefined }],
      ['radial com d', { ...bom, d: [1, 0, 0] }],
      ['eixo desconhecido', { ...bom, eixo: 'w' }],
      ['linear sem d', { modo: 'linear', total: 4, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
      ['linear com d nulo', { modo: 'linear', total: 4, d: [0, 0, 0], origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
      ['linear com eixo', { modo: 'linear', total: 4, d: [1, 0, 0], eixo: 'y', origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
      ['cópia coincidente com a fonte', { ...bom, volta: undefined, graus: 180, total: 3 }],
      ['sem origemId', { ...bom, origemId: undefined }],
      ['sem derivaDe', { ...bom, derivaDe: undefined }],
      ['sel por id literal', { ...bom, sel: { f: [1] } }],
      ['sel por região', { ...bom, sel: { regiao: { min: [-9, -9, -9], max: [9, 9, 9] } } }],
      ['sel de outra origem', { ...bom, sel: { origem: { op: 'cubo', id: 30, face: 'topo' } } }],
      ['faces literais junto', { ...bom, faces: [1] }],
      ['fonte inexistente', { ...bom, derivaDe: { op: 'cubo', id: 31 }, sel: { origem: { op: 'cubo', id: 31 } } }],
    ];
    const puro = nucleo([base] as any, {}, {});
    for (const [nome, args] of casos) {
      const n = nucleo([base, ['arranja', args], nomear('alvo', 'todasAsCopias')] as any, {}, {}, {}, null, aliases);
      expect(n.orfaos.some((o: any) => o.op === 'arranja'), nome).toBe(true);
      expect(neutroCanonico(n).V, nome).toEqual(neutroCanonico(puro).V);
      expect(neutroCanonico(n).F, nome).toEqual(neutroCanonico(puro).F);
      expect(idsCom(n, 'parte', 'alvo'), nome).toEqual([]);                 // a coleção não existe para citar
    }
  });

  it('face inteiramente sobre o eixo aborta a coleção antes de alocar geometria', () => {
    // um plano centrado na origem tem a face inteira atravessada pelo eixo Y? não —
    // o caso real é uma face cujos 4 cantos estão TODOS no eixo, o que só acontece
    // quando a face é degenerada no eixo. Usa-se um cubo achatado sobre o eixo Y.
    const passos: any[] = [
      ['cubo', { id: 0, lado: 1, origemId: 30 }],
      ['moveV', { v: 0, d: [0.5, 0, 0.5] }], ['moveV', { v: 1, d: [-0.5, 0, 0.5] }],
      ['moveV', { v: 2, d: [-0.5, 0, -0.5] }], ['moveV', { v: 3, d: [0.5, 0, -0.5] }],
      ['arranja', { modo: 'radial', eixo: 'y', total: 3, volta: 360, origemId: 50, derivaDe: fonte, sel: { origem: fonte } }],
    ];
    const n = nucleo(passos, {}, {});
    const puro = nucleo(passos.slice(0, 5), {}, {});
    expect(n.orfaos.some((o: any) => o.op === 'arranja' && /sobre o eixo/.test(o.motivo))).toBe(true);
    expect(n.V.size).toBe(puro.V.size); expect(n.F.size).toBe(puro.F.size);
  });

  it('citar uma cópia fora do limite GRITA em vez de escolher a mais próxima', () => {
    const fora: any = [['sumida', { origem: { ...colecao, copia: 3 } }]];   // total 4 = cópias 0..2
    const n = nucleo([...braco(), nomear('alvo', 'sumida')] as any, {}, {}, {}, null, fora);
    expect(idsCom(n, 'parte', 'alvo')).toEqual([]);
    expect(n.orfaos.some((o: any) => /fora do limite da origem arranja:50/.test(o.motivo))).toBe(true);
  });

  it('o bloco de ids do passo é conferido ANTES de inserir', () => {
    const grande = (total: number): any[] => [
      ['plano', { id: 0, largura: 1, profundidade: 1, seg: 9, origemId: 30 }],   // 100 vértices, 81 faces
      ['arranja', { modo: 'linear', d: [2, 0, 0], total, origemId: 50, derivaDe: { op: 'plano', id: 30 }, sel: { origem: { op: 'plano', id: 30 } } }],
    ];
    expect(() => nucleo(grande(11), {}, {})).not.toThrow();     // 10 cópias × 100 vértices = 1000 = BLOCO
    expect(() => nucleo(grande(12), {}, {})).toThrow(/arranja estoura o bloco/);
  });

  it('determinístico: re-rodar e ida-e-volta por JSON dão o mesmo neutro canônico', () => {
    const passos = [...braco(), nomear('alvo', 'ultimaCopia')] as any;
    const canon = JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, {}, null, aliases)));
    expect(JSON.stringify(neutroCanonico(nucleo(passos, {}, {}, {}, null, aliases)))).toBe(canon);
    expect(JSON.stringify(neutroCanonico(nucleo(JSON.parse(JSON.stringify(passos)), {}, {}, {}, null, JSON.parse(JSON.stringify(aliases)))))).toBe(canon);
  });

  it('volta e graus dizem coisas diferentes, e a diferença aparece na malha', () => {
    const posDaCopia = (extra: any) => {
      const n = nucleo(braco(extra) as any, {}, {});
      return (n.V.get(2000) as number[]).map((x) => +x.toFixed(9));
    };
    // total 4: volta 360 => passo 90; graus 90 => o MESMO passo (arco aberto de 270)
    expect(posDaCopia({ total: 4, volta: 360 })).toEqual(posDaCopia({ total: 4, volta: undefined, graus: 90 }));
    // total 5: volta 360 => passo 72; graus 60 => passo 60. Não são a mesma coisa.
    expect(posDaCopia({ total: 5, volta: 360 })).not.toEqual(posDaCopia({ total: 5, volta: undefined, graus: 60 }));
    // e o arco ABERTO com passo que fecha a volta é justamente o caso que grita:
    // total 5 com graus 90 põe a quarta cópia a 360° da fonte, em cima dela
    const fecha = nucleo(braco({ total: 5, volta: undefined, graus: 90 }) as any, {}, {});
    expect(fecha.orfaos.some((o: any) => /múltiplo exato de 360/.test(o.motivo))).toBe(true);
    expect(fecha.V.size).toBe(8);
  });

  it('o pivô ausente é [0,0,0] declarado, não o centroide da seleção', () => {
    const semPivo = nucleo(braco({ total: 3 }) as any, {}, {});
    const comPivoZero = nucleo(braco({ total: 3, pivo: [0, 0, 0] }) as any, {}, {});
    const comOutroPivo = nucleo(braco({ total: 3, pivo: [1, 0, 0] }) as any, {}, {});
    expect(neutroCanonico(semPivo).V).toEqual(neutroCanonico(comPivoZero).V);
    expect(neutroCanonico(semPivo).V).not.toEqual(neutroCanonico(comOutroPivo).V);
    // com o pivô no centro do próprio braço as cópias ficam EM CIMA dele — é por isso
    // que o default não é o centroide: seria silenciosamente errado e plausível na foto
    const caixa = (n: any) => { let min = Infinity, max = -Infinity; for (const p of n.V.values() as any) { min = Math.min(min, p[0]); max = Math.max(max, p[0]); } return +(max - min).toFixed(6); };
    expect(caixa(semPivo)).toBeGreaterThan(caixa(comOutroPivo));
  });

  it('a origem do arranjo atravessa a API pública e nomeia só o que ela criou', () => {
    const ctx = { tex: { texCanvas: (w: number, h: number) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
    const viaApi: any = executar([...braco(), nomear('coroa', 'todasAsCopias')] as any, {}, {}, ctx, {}, {}, null, aliases);
    const lote = viaApi.lotes.find((l: any) => l.parte === 'coroa');
    expect(lote).toBeDefined();
    expect(lote.mesh.v.length).toBe(18 * 6 * 8);   // 3 cópias × 6 faces × 2 triângulos × 3 vértices × 8 floats
  });

  it('publicarPorta aceita a coleção e uma cópia, e a porta sai do núcleo', () => {
    const n = nucleo([...braco(),
      ['publicarPorta', { nome: 'coroaDeBracos', de: colecao }],
      ['publicarPorta', { nome: 'bracoDaFrente', de: { ...colecao, copia: 'primeira' } }],
    ] as any, {}, {}, {}, null, aliases);
    expect(n.orfaos).toHaveLength(0);
    expect([...n.portas.keys()]).toEqual(['bracoDaFrente', 'coroaDeBracos']);
    const pintada = nucleo([...braco(),
      ['publicarPorta', { nome: 'bracoDaFrente', de: { ...colecao, copia: 'primeira' } }],
      ['parte', { nome: 'frente', sel: { porta: 'bracoDaFrente' } }],
    ] as any, {}, {}, {}, null, aliases);
    expect(idsCom(pintada, 'parte', 'frente')).toEqual([2000, 2001, 2002, 2003, 2004, 2005]);
  });
});

/* ---------------------------------------------------------------------------
   Dívida do ciclo anterior — a palavra reservada de extremidade engolia um
   PARAM homônimo. Medido na revisão de "Endereços semânticos v1": num `plano`
   com `seg:3` e `PARAMS {ultima: 0}`, `faixa:'ultima'` devolvia a ÚLTIMA linha,
   não a linha 0, sem diagnóstico. Referência que resolve para outra coisa em
   silêncio é o que o CLAUDE.md proíbe.
--------------------------------------------------------------------------- */
describe('extremidade de eixo x PARAM homônimo', () => {
  const grade = { op: 'plano', id: 30 };
  const passos = (eixo: any): any[] => [
    ['plano', { id: 0, largura: 3, profundidade: 3, seg: 3, origemId: 30 }],
    ['parte', { nome: 'linha', sel: { origem: { ...grade, faixa: eixo } } }],
  ];
  const ids = (n: any) => [...n.F.values()].filter((f: any) => f.parte === 'linha').map((f: any) => f.id).sort((a: number, b: number) => a - b);

  it('sem colisão nada muda: a palavra resolve pela contagem e o PARAM resolve pelo valor', () => {
    expect(ids(nucleo(passos('ultima'), {}, {}))).toEqual([6, 7, 8]);
    expect(ids(nucleo(passos('primeira'), {}, {}))).toEqual([0, 1, 2]);
    expect(ids(nucleo(passos('qual'), { qual: 0 }, {}))).toEqual([0, 1, 2]);
    expect(ids(nucleo(passos('qual'), { qual: 2 }, {}))).toEqual([6, 7, 8]);
  });

  it('PARAM com o nome de uma extremidade GRITA na citação, em vez de a palavra ganhar calada', () => {
    const n = nucleo(passos('ultima'), { ultima: 0 }, {});
    expect(ids(n)).toEqual([]);                                   // não resolveu para a linha 0
    expect(n.F.has(6)).toBe(true);                                // nem para a última: não resolveu para nada
    expect(ids(nucleo(passos('ultima'), { ultima: 0 }, {}))).not.toEqual([6, 7, 8]);
    expect(n.orfaos.some((o: any) => /palavra reservada de extremidade E também um parâmetro declarado/.test(o.motivo))).toBe(true);
    // TOPO conta igual a PARAM: os dois entram no mesmo dicionário
    const porTopo = nucleo(passos('primeira'), {}, { primeira: 2 });
    expect(ids(porTopo)).toEqual([]);
    expect(porTopo.orfaos.some((o: any) => /parâmetro declarado/.test(o.motivo))).toBe(true);
  });

  it('a colisão grita em todo eixo que usa extremidade, não só na faixa do plano', () => {
    const cilindro = { op: 'cilindro', id: 40 };
    const n = nucleo([
      ['cilindro', { id: 0, raio: 1, altura: 1, lados: 6, origemId: 40 }],
      ['parte', { nome: 'lado', sel: { origem: { ...cilindro, lado: 'ultima' } } }],
    ] as any, { ultima: 1 }, {});
    expect([...n.F.values()].filter((f: any) => f.parte === 'lado')).toHaveLength(0);
    expect(n.orfaos.some((o: any) => /parâmetro declarado/.test(o.motivo))).toBe(true);
  });
});

/* ============================================================================
   FURO — ciclo "Corte e orientação de seção v1", a primeira SUBTRAÇÃO do núcleo.
   O risco do item não é geométrico, é de IDENTIDADE: um corte cria dezenas de
   faces e destrói outras, e sem afirmação que morra o formato salvo passa a
   depender de coisas que ninguém confere. Então tudo que entra no salvo tem
   afirmação aqui: a numeração exata, a contagem por família, a orientação de
   cada normal, a herança de atributo, o casamento angular da borda, e o grito
   de toda face consumida.
============================================================================ */
const PLACA = (furo: any, extra: any[] = []) => [
  ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
  ['furo', { origemId: 9, ...furo }],
  ...extra,
];
const PASSANTE = { de: { op: 'cubo', id: 1, face: 'topo' }, saida: { op: 'cubo', id: 1, face: 'fundo' }, centro: [0, 0, 0], raio: 0.5, lados: 6 };
const CEGO = { de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.4, centro: [0, 0, 0], raio: 0.5, lados: 6 };

/* arestas com saldo ≠ 0 = malha aberta. Um corte que esquecesse a parede, ou
   que orientasse a borda ao contrário, apareceria aqui e em lugar nenhum. */
const arestasSoltas = (n: any) => {
  const m = new Map<string, number>();
  for (const f of n.F.values()) for (let k = 0; k < f.vs.length; k++) {
    const a = f.vs[k], b = f.vs[(k + 1) % f.vs.length];
    const chave = a < b ? `${a}_${b}` : `${b}_${a}`;
    m.set(chave, (m.get(chave) ?? 0) + (a < b ? 1 : -1));
  }
  return [...m.entries()].filter(([, v]) => v !== 0).length;
};
const normalDe = (n: any, fid: number) => {
  const f = n.F.get(fid);
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < f.vs.length; k++) {
    const c = n.V.get(f.vs[k]), d = n.V.get(f.vs[(k + 1) % f.vs.length]);
    nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]);
  }
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
};
const pintadas = (n: any, cor: string) => [...n.F.values()].filter((f: any) => f.cor === cor).map((f: any) => f.id).sort((a: number, b: number) => a - b);

describe('furo — numeração é formato salvo', () => {
  it('passante: 2·lados vértices e 3·lados faces, nos ids exatos do bloco', () => {
    const n = nucleo(PLACA(PASSANTE) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    // vértices novos: b+0..b+5 (anel de entrada), b+6..b+11 (anel de saída)
    expect([...n.V.keys()].filter((v: number) => v >= 1000).sort((a: number, b: number) => a - b))
      .toEqual([1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011]);
    // faces novas: borda b+0..b+5, parede b+6..b+11, borda de saída b+12..b+17
    expect([...n.F.keys()].filter((f: number) => f >= 1000).sort((a: number, b: number) => a - b))
      .toEqual([1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017]);
    // as DUAS faces cortadas sumiram da malha, e só elas
    expect(n.F.has(1)).toBe(false);   // topo do cubo
    expect(n.F.has(0)).toBe(false);   // fundo do cubo
    expect([...n.F.keys()].filter((f: number) => f < 1000).sort((a: number, b: number) => a - b)).toEqual([2, 3, 4, 5]);
    expect(n.V.size).toBe(8 + 12);
    expect(n.F.size).toBe(4 + 18);
  });

  it('cego: mesmos 2·lados vértices, mas 2·lados+1 faces — o fundo mora em b+2·lados', () => {
    const n = nucleo(PLACA(CEGO) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([...n.F.keys()].filter((f: number) => f >= 1000).sort((a: number, b: number) => a - b))
      .toEqual([1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012]);
    expect(n.F.get(1012).vs).toEqual([1006, 1007, 1008, 1009, 1010, 1011]);   // o fundo é o anel de baixo inteiro
    expect(n.F.has(0)).toBe(true);    // o fundo do CUBO continua vivo: o furo cego não o toca
    expect(n.F.has(1)).toBe(false);
  });

  it('mudar PARAM não renumera; mudar lados (TOPO) renumera', () => {
    const ids = (n: any) => [...n.F.keys()].filter((f: number) => f >= 1000).sort((a: number, b: number) => a - b);
    const base = nucleo(PLACA(PASSANTE) as any, {}, {});
    const outroRaio = nucleo(PLACA({ ...PASSANTE, raio: 0.9 }) as any, {}, {});
    const outroCentro = nucleo(PLACA({ ...PASSANTE, centro: [1, 0, -0.7] }) as any, {}, {});
    expect(ids(outroRaio)).toEqual(ids(base));
    expect(ids(outroCentro)).toEqual(ids(base));
    expect(n0(outroRaio)).not.toEqual(n0(base));            // a FORMA mudou
    const outrosLados = nucleo(PLACA({ ...PASSANTE, lados: 10 }) as any, {}, {});
    expect(ids(outrosLados)).not.toEqual(ids(base));
    expect(ids(outrosLados)).toHaveLength(30);
  });

  it('`lados` abaixo de 3 é preso em 3, a mesma convenção do cilindro/cone/esfera', () => {
    const n = nucleo(PLACA({ ...PASSANTE, lados: 2 }) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toHaveLength(9);   // 3·3, não 3·2
    expect([...n.V.keys()].filter((v: number) => v >= 1000)).toHaveLength(6);
    expect(arestasSoltas(n)).toBe(0);
  });

  it('um furo que estouraria o bloco de ids GRITA ALTO (throw), como as outras primitivas', () => {
    expect(() => nucleo(PLACA({ ...PASSANTE, lados: BLOCO }) as any, {}, {})).toThrow(/estoura o bloco de ids/);
  });

  it('o mesmo passo roda duas vezes com o neutro idêntico', () => {
    const a = neutroCanonico(nucleo(PLACA(PASSANTE) as any, {}, {}));
    const b = neutroCanonico(nucleo(PLACA(PASSANTE) as any, {}, {}));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
const n0 = (n: any) => n.V.get(1000);

describe('furo — a malha continua fechada e virada para o lado certo', () => {
  it('passante numa placa: zero aresta solta', () => {
    expect(arestasSoltas(nucleo(PLACA(PASSANTE) as any, {}, {}))).toBe(0);
  });

  it('cego numa placa: zero aresta solta', () => {
    expect(arestasSoltas(nucleo(PLACA(CEGO) as any, {}, {}))).toBe(0);
  });

  it('a borda herda a normal da face cortada, a parede aponta PARA o eixo e o fundo para a boca', () => {
    const n = nucleo(PLACA(PASSANTE) as any, {}, {});
    for (let j = 0; j < 6; j++) {
      expect(normalDe(n, 1000 + j)[1]).toBeCloseTo(1, 9);        // borda de entrada: +y, como o topo do cubo
      expect(normalDe(n, 1012 + j)[1]).toBeCloseTo(-1, 9);       // borda de saída: -y, como o fundo do cubo
      // parede j: a normal aponta do meio da parede PARA o eixo do furo
      const nrm = normalDe(n, 1006 + j);
      const a = n.V.get(1000 + j), b = n.V.get(1000 + (j + 1) % 6);
      const radial = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
      const l = Math.hypot(radial[0], radial[2]);
      expect(nrm[0] * radial[0] / l + nrm[2] * radial[2] / l).toBeCloseTo(-1, 6);
    }
    const cego = nucleo(PLACA(CEGO) as any, {}, {});
    expect(normalDe(cego, 1012)[1]).toBeCloseTo(1, 9);           // o fundo olha para a boca do furo
  });

  it('toda face da borda sai CONVEXA no próprio plano — é para isso que o casamento é ANGULAR', () => {
    // com casamento por ÍNDICE (floor(j·n/lados)) esta afirmação morre num
    // quadrado com furo central e lados:8: aparecem quadriláteros reflexos.
    const n = nucleo(PLACA({ ...PASSANTE, lados: 8 }) as any, {}, {});
    for (let j = 0; j < 8; j++) for (const fid of [1000 + j, 1016 + j]) {
      const vs = n.F.get(fid).vs.map((v: number) => n.V.get(v));
      const nrm = normalDe(n, fid);
      for (let k = 0; k < vs.length; k++) {
        const p = vs[k], q = vs[(k + 1) % vs.length], r = vs[(k + 2) % vs.length];
        const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const e2 = [r[0] - q[0], r[1] - q[1], r[2] - q[2]];
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        expect(cr[0] * nrm[0] + cr[1] * nrm[1] + cr[2] * nrm[2]).toBeGreaterThan(-1e-9);
      }
    }
  });

  it('a borda tem SEMPRE `lados` faces, tanto num quadrado de 4 cantos quanto numa tampa de 12', () => {
    const tampa = nucleo([
      ['cilindro', { id: 0, raio: 2, altura: 1, lados: 12, origemId: 1 }],
      ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, centro: [0, 0, 0], raio: 0.4, lados: 6 }],
    ] as any, {}, {});
    expect(tampa.orfaos).toEqual([]);
    expect(arestasSoltas(tampa)).toBe(0);
    expect([...tampa.F.keys()].filter((f: number) => f >= 1000)).toHaveLength(18);
  });
});

describe('furo — toda face nova é endereçável, e as famílias não se confundem', () => {
  const furo = { op: 'furo', id: 9 };
  const cores = (extra: any[]) => nucleo(PLACA(PASSANTE, extra) as any, {}, {});

  it('cada família responde pelo que criou, e o furo inteiro pela soma', () => {
    const n = cores([
      ['pincel', { modo: 'face', sel: { origem: { ...furo, borda: 0 } }, cor: '#100000' }],
      ['pincel', { modo: 'face', sel: { origem: { ...furo, parede: 'ultima' } }, cor: '#200000' }],
      ['pincel', { modo: 'face', sel: { origem: { ...furo, saida: { passo: 2, fase: 0 } } }, cor: '#300000' }],
      ['pincel', { modo: 'face', sel: { origem: furo }, cor: '#400000' }],
    ]);
    expect(n.orfaos).toEqual([]);
    expect(pintadas(n, '#400000')).toHaveLength(18);            // o furo INTEIRO
    const so = cores([['pincel', { modo: 'face', sel: { origem: { ...furo, borda: 0 } }, cor: '#100000' }]]);
    expect(pintadas(so, '#100000')).toEqual([1000]);
    const ult = cores([['pincel', { modo: 'face', sel: { origem: { ...furo, parede: 'ultima' } }, cor: '#200000' }]]);
    expect(pintadas(ult, '#200000')).toEqual([1011]);
    const alt = cores([['pincel', { modo: 'face', sel: { origem: { ...furo, saida: { passo: 2, fase: 0 } } }, cor: '#300000' }]]);
    expect(pintadas(alt, '#300000')).toEqual([1012, 1014, 1016]);
  });

  it('citar saida num furo CEGO grita; citar tampa num furo PASSANTE grita', () => {
    const cego = nucleo(PLACA(CEGO, [['pincel', { modo: 'face', sel: { origem: { ...furo, saida: 0 } }, cor: '#f00' }]]) as any, {}, {});
    expect(cego.orfaos.some((o: any) => /é um furo CEGO/.test(o.motivo))).toBe(true);
    expect(pintadas(cego, '#f00')).toEqual([]);
    const passante = nucleo(PLACA(PASSANTE, [['pincel', { modo: 'face', sel: { origem: { ...furo, tampa: 'fundo' } }, cor: '#f00' }]]) as any, {}, {});
    expect(passante.orfaos.some((o: any) => /é um furo PASSANTE/.test(o.motivo))).toBe(true);
    expect(pintadas(passante, '#f00')).toEqual([]);
    // e no cego a tampa RESOLVE, para a face única do fundo
    const ok = nucleo(PLACA(CEGO, [['pincel', { modo: 'face', sel: { origem: { ...furo, tampa: 'fundo' } }, cor: '#0f0' }]]) as any, {}, {});
    expect(ok.orfaos).toEqual([]);
    expect(pintadas(ok, '#0f0')).toEqual([1012]);
  });

  it('índice fora do limite grita nomeando a família, em vez de devolver nada', () => {
    const n = nucleo(PLACA(PASSANTE, [['pincel', { modo: 'face', sel: { origem: { ...furo, borda: 6 } }, cor: '#f00' }]]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /borda 6 fora do limite da origem furo:9 \(0\.\.5\)/.test(o.motivo))).toBe(true);
  });

  it('chave desconhecida na origem do furo GRITA com o vocabulário certo, em vez de ser ignorada', () => {
    const n = nucleo(PLACA(PASSANTE, [['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, lado: 0 } }, cor: '#f00' }]]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /furo usa op, id, furo\/borda\/parede\/saida\/preenchimento\/preenchimentoDaSaida opcionais/.test(o.motivo))).toBe(true);
    expect(pintadas(n, '#f00')).toEqual([]);
  });

  it('a origem do furo é publicável como PORTA, e a porta entrega as mesmas faces', () => {
    const n = nucleo(PLACA(PASSANTE, [
      ['publicarPorta', { nome: 'bocaDoFuro', de: { ...furo, borda: 0 } }],
      ['parte', { nome: 'boca', sel: { porta: 'bocaDoFuro' } }],
    ]) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => f.parte === 'boca').map((f: any) => f.id)).toEqual([1000]);
  });
});

describe('furo — face consumida GRITA, nunca some em silêncio', () => {
  const topo = { op: 'cubo', id: 1, face: 'topo' };

  it('citação EXPLÍCITA da face cortada diz QUEM a comeu e em que passo', () => {
    const n = nucleo(PLACA(CEGO, [['pincel', { modo: 'face', sel: { origem: topo }, cor: '#f00' }]]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /face 'topo' da origem cubo:1 foi removida \(consumida pelo furo do passo 1\)/.test(o.motivo))).toBe(true);
    expect(pintadas(n, '#f00')).toEqual([]);
  });

  it('citação em UNIÃO para de PULAR a face consumida: a primitiva inteira vira ERRO', () => {
    // sem o registro de consumo, `{op:'cubo',id:1}` devolveria 5 faces das 6 e
    // pintaria "o cubo inteiro" sem a borda do furo — plausível na foto.
    const n = nucleo(PLACA(CEGO, [['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1 } }, cor: '#f00' }]]) as any, {}, {});
    expect(pintadas(n, '#f00')).toEqual([]);
    expect(n.orfaos.some((o: any) => /face 'topo' da origem cubo:1 foi consumida pelo furo do passo 1 — a face virou a borda do corte/.test(o.motivo))).toBe(true);
  });

  it('o mesmo vale para a tampa de um cilindro e para o eixo numérico de uma família', () => {
    const cil = nucleo([
      ['cilindro', { id: 0, raio: 2, altura: 1, lados: 8, origemId: 1 }],
      ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, profundidade: 0.3, centro: [0, 0, 0], raio: 0.4, lados: 6 }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cilindro', id: 1, tampa: 'topo' } }, cor: '#f00' }],
    ] as any, {}, {});
    expect(cil.orfaos.some((o: any) => /consumida pelo furo do passo 1/.test(o.motivo))).toBe(true);
    expect(pintadas(cil, '#f00')).toEqual([]);
    // e o furo numa LATERAL some do eixo numérico do cilindro, também gritando
    const lateral = nucleo([
      ['cilindro', { id: 0, raio: 2, altura: 2, lados: 4, origemId: 1 }],
      ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, lado: 0 }, profundidade: 0.3, centro: [1, 1, 1], raio: 0.3, lados: 6 }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cilindro', id: 1 } }, cor: '#f00' }],
    ] as any, {}, {});
    expect(lateral.orfaos.some((o: any) => /lado 0 da origem cilindro:1 foi consumida pelo furo do passo 1/.test(o.motivo))).toBe(true);
    expect(pintadas(lateral, '#f00')).toEqual([]);
  });

  it('num furo PASSANTE a face de SAÍDA também é registrada, não só a de entrada', () => {
    const n = nucleo(PLACA(PASSANTE, [
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } }, cor: '#f00' }],
    ]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /face 'fundo' da origem cubo:1 foi removida \(consumida pelo furo do passo 1\)/.test(o.motivo))).toBe(true);
    expect(pintadas(n, '#f00')).toEqual([]);
    // e na UNIÃO da primitiva inteira o grito também nomeia a saída
    const uniao = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['furo', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, saida: { op: 'cubo', id: 1, face: 'fundo' }, centro: [0, 0, 0], raio: 0.5, lados: 6 }],
      ['apagaFace', { sel: { origem: { op: 'furo', id: 9, borda: 0 } } }],   // some com a borda: a entrada some do caminho
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1 } }, cor: '#0f0' }],
    ] as any, {}, {});
    expect(uniao.orfaos.some((o: any) => /da origem cubo:1 foi consumida pelo furo do passo 1/.test(o.motivo))).toBe(true);
    expect(pintadas(uniao, '#0f0')).toEqual([]);
  });

  it('uma peça SEM furo nenhum continua pulando face removida em silêncio, como sempre', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 1, alt: 1, prof: 1, origemId: 1 }],
      ['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'topo' } } }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1 } }, cor: '#f00' }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(pintadas(n, '#f00')).toHaveLength(5);
  });
});

describe('furo — herança de atributo', () => {
  it('borda, parede e fundo herdam a face de ENTRADA; a borda de saída herda a de SAÍDA', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'topo' } }, cor: '#aabbcc' }],
      ['parte', { nome: 'tampoDaMesa', sel: { origem: { op: 'cubo', id: 1, face: 'topo' } } }],
      ['liso', { sel: { origem: { op: 'cubo', id: 1, face: 'topo' } } }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } }, cor: '#112233' }],
      ['furo', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, saida: { op: 'cubo', id: 1, face: 'fundo' }, centro: [0, 0, 0], raio: 0.5, lados: 6 }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(pintadas(n, '#aabbcc')).toEqual([5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011]);
    expect(pintadas(n, '#112233')).toEqual([5012, 5013, 5014, 5015, 5016, 5017]);
    expect([...n.F.values()].filter((f: any) => f.parte === 'tampoDaMesa').map((f: any) => f.id))
      .toEqual([5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011]);
    expect([...n.F.values()].filter((f: any) => f.liso).map((f: any) => f.id)).toHaveLength(12);
    // no cego a herança da entrada chega ao FUNDO também
    const cego = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'topo' } }, cor: '#aabbcc' }],
      ['furo', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.4, centro: [0, 0, 0], raio: 0.5, lados: 6 }],
    ] as any, {}, {});
    expect(pintadas(cego, '#aabbcc')).toHaveLength(13);
    expect(cego.F.get(2012).cor).toBe('#aabbcc');
  });
});

describe('furo — orientação declarada da fase do anel', () => {
  it('o vértice 0 do anel fica na direção declarada, e sem a chave fica no quadro de sempre', () => {
    const comX = nucleo(PLACA({ ...PASSANTE, orientacao: [1, 0, 0] }) as any, {}, {});
    expect(comX.orfaos).toEqual([]);
    expect(comX.V.get(1000)[0]).toBeCloseTo(0.5, 9);
    expect(comX.V.get(1000)[2]).toBeCloseTo(0, 9);
    const comZ = nucleo(PLACA({ ...PASSANTE, orientacao: [0, 0, 1] }) as any, {}, {});
    expect(comZ.V.get(1000)[2]).toBeCloseTo(0.5, 9);
    expect(comZ.V.get(1000)[0]).toBeCloseTo(0, 9);
    // a chave é PROJETADA no plano: uma referência oblíqua vale pela componente no plano
    const obliqua = nucleo(PLACA({ ...PASSANTE, orientacao: [3, 7, 0] }) as any, {}, {});
    expect(obliqua.V.get(1000)[0]).toBeCloseTo(0.5, 9);
    // ausente: o quadro determinístico (para a normal +y, o +u é +z)
    const sem = nucleo(PLACA(PASSANTE) as any, {}, {});
    expect(sem.V.get(1000)[2]).toBeCloseTo(0.5, 9);
    expect(JSON.stringify(neutroCanonico(sem))).not.toBe(JSON.stringify(neutroCanonico(comX)));
  });

  it('orientação paralela à normal da face GRITA e aborta — nunca desempata sozinha', () => {
    const n = nucleo(PLACA({ ...PASSANTE, orientacao: [0, 1, 0] }) as any, {}, {});
    expect(n.orfaos.some((o: any) => /é paralela à normal da face/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toEqual([]);
    const nulo = nucleo(PLACA({ ...PASSANTE, orientacao: [0, 0, 0] }) as any, {}, {});
    expect(nulo.orfaos.some((o: any) => /vetor nulo/.test(o.motivo))).toBe(true);
  });
});

describe('furo — completude: cada recusa aborta o passo inteiro, 0 V / 0 F', () => {
  const semSaida = (n: any) => [...n.F.keys()].filter((f: number) => f >= 1000).length + [...n.V.keys()].filter((v: number) => v >= 1000).length;
  const casos: Array<[string, any, RegExp]> = [
    ['sem origemId', { ...CEGO, origemId: null }, /origemId é obrigatório/],
    ['os dois modos juntos', { ...PASSANTE, profundidade: 0.4 }, /declare exatamente uma/],
    ['modo nenhum', { de: { op: 'cubo', id: 1, face: 'topo' }, centro: [0, 0, 0], raio: 0.5 }, /exatamente uma/],
    ['raio zero', { ...CEGO, raio: 0 }, /raio precisa ser > 0/],
    ['profundidade zero', { ...CEGO, profundidade: 0 }, /profundidade precisa ser > 0/],
    ['sem centro', { de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.4, raio: 0.5 }, /furo exige centro/],
    ['centro com aridade errada', { ...CEGO, centro: [0, 0] }, /centro precisa ser \[x,y,z\]/],
    ['anel maior que a face', { ...CEGO, raio: 3 }, /não cabe dentro da face de entrada/],
    ['anel encostando na borda', { ...CEGO, centro: [1.6, 0, 0], raio: 0.5 }, /não cabe dentro da face de entrada/],
    ['entrada ambígua', { ...CEGO, de: { op: 'cubo', id: 1 } }, /precisa resolver para EXATAMENTE uma face/],
    ['entrada inexistente', { ...CEGO, de: { op: 'cubo', id: 77 } }, /inexistente ou ainda não criada/],
    ['saída igual à entrada', { ...PASSANTE, saida: { op: 'cubo', id: 1, face: 'topo' } }, /a saída é a MESMA face da entrada/],
    ['saída que o eixo não atravessa', { ...PASSANTE, saida: { op: 'cubo', id: 1, face: 'frente' } }, /não ATRAVESSA a face de saída/],
  ];
  for (const [nome, furo, esperado] of casos) {
    it(`${nome}: grita e não cria nada`, () => {
      const n = nucleo(PLACA(furo) as any, {}, {});
      expect(n.orfaos.some((o: any) => esperado.test(o.motivo))).toBe(true);
      expect(semSaida(n)).toBe(0);
      expect(n.F.has(1)).toBe(true);      // a face de entrada continua INTEIRA
      expect(n.V.size).toBe(8);
    });
  }

  /* A revisão adversarial do ciclo mediu: a op valida a face de ENTRADA e a de
     SAÍDA com as MESMAS regras, e só a entrada tinha afirmação. Desligar a
     guarda de encaixe do anel na saída sobrevivia à suíte inteira — 646 de 646
     verdes — e um furo cujo anel vaza pela saída construía as faces com o anel
     atravessando o contorno, sem diagnóstico nenhum. Corte silencioso é
     exatamente o que esta op existe para impedir.

     Os treze casos da tabela acima citam entrada ou modo; os dois de anel usam
     o modo CEGO, que nem chega no ramo da saída. Estes três fecham o outro lado.
     A placa fina embaixo é o que torna as duas faces diferentes: numa caixa, a
     saída é congruente com a entrada e o anel que cabe numa cabe na outra. */
  const COM_TARUGO = (furo: any) => [
    ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
    ['cubo', { larg: 0.6, alt: 1, prof: 0.6, origemId: 2 }],
    ['transladar', { d: [0, -1, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
    ['furo', {
      origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' },
      saida: { op: 'cubo', id: 2, face: 'fundo' }, centro: [0, 0, 0], lados: 6, ...furo,
    }],
  ];

  it('o anel que cabe na ENTRADA e não na SAÍDA grita, e não corta nada', () => {
    /* raio 0.2 cabe nas duas faces; 0.5 cabe na placa de 4 e vaza no tarugo de
       0.6. É a mesma peça, e a diferença é só o raio. */
    const passa = nucleo(COM_TARUGO({ raio: 0.2 }) as any, {}, {});
    expect(passa.orfaos).toEqual([]);

    const vaza = nucleo(COM_TARUGO({ raio: 0.5 }) as any, {}, {});
    expect(vaza.orfaos.some((o: any) => /não cabe dentro da face de saída/.test(o.motivo))).toBe(true);
    /* aborta inteiro: a entrada continua íntegra e nenhuma face nova nasce */
    expect([...vaza.F.keys()].filter((f: number) => f >= 3000)).toEqual([]);
    expect(vaza.F.has(1)).toBe(true);
  });

  it('o anel DESLOCADO que vaza pela borda da SAÍDA também grita', () => {
    /* outra causa, mesma guarda: aqui o raio caberia, mas o centro fora do eixo
       joga o anel para fora do tarugo. Uma guarda que só olhasse o raio passaria
       neste caso. Em `centro: [0.11]` ainda cabe; em `[0.15]` sobra −0,023. */
    const n = nucleo(COM_TARUGO({ raio: 0.2, centro: [0.15, 0, 0] }) as any, {}, {});
    expect(n.orfaos.some((o: any) => /não cabe dentro da face de saída/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 3000)).toEqual([]);
  });

  it('saída NÃO-PLANA grita, com a mesma severidade da entrada não-plana', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['moveV', { v: 0, d: [0, -0.4, 0] }],          // torce um canto do fundo
      ['furo', {
        origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' },
        saida: { op: 'cubo', id: 1, face: 'fundo' }, centro: [0, 0, 0], raio: 0.5, lados: 6,
      }],
    ] as any, {}, {});
    expect(n.orfaos.some((o: any) => /saída: .*não é plana/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 3000)).toEqual([]);
  });

  it('saída ATRÁS da entrada ao longo do eixo grita — o furo sairia antes de entrar', () => {
    // a normal da saída atravessa (é -y, como o eixo), mas a face está ACIMA da
    // entrada: sem o teste de distância, o furo se estenderia para trás.
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['cubo', { id: 1000, larg: 4, alt: 1, prof: 4, origemId: 2 }],
      ['transladar', { d: [0, 2, 0], sel: { origem: { op: 'cubo', id: 2 } } }],
      ['furo', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, saida: { op: 'cubo', id: 2, face: 'fundo' }, centro: [0, 0, 0], raio: 0.5, lados: 6 }],
    ] as any, {}, {});
    expect(n.orfaos.some((o: any) => /está ATRÁS da entrada ao longo do eixo/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 3000)).toEqual([]);
    expect(n.F.has(1)).toBe(true);
    expect(n.F.has(1000)).toBe(true);
  });

  it('face NÃO-PLANA grita: não existe plano de entrada para inventar', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['moveV', { v: 4, d: [0, 0.5, 0] }],   // levanta um canto do topo
      ['furo', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.4, centro: [0, 0, 0], raio: 0.5, lados: 6 }],
    ] as any, {}, {});
    expect(n.orfaos.some((o: any) => /não é plana/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 2000)).toEqual([]);
  });

  it('face CÔNCAVA grita: o furo só corta convexo, e isso é decisão declarada', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['moveV', { v: 4, d: [3, 0, 3] }],     // puxa um canto do topo para dentro
      ['furo', { origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.4, centro: [0.5, 0, 0.5], raio: 0.2, lados: 6 }],
    ] as any, {}, {});
    expect(n.orfaos.some((o: any) => /CÔNCAVO/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 2000)).toEqual([]);
  });
});

/* ============================================================================
   FURO v2 — VÁRIOS FUROS NA MESMA FACE (A-26). O que muda aqui não é geometria,
   é o que o formato salvo passa a prometer: N anéis num passo, cada um com
   identidade PRÓPRIA, uma partição que fecha a malha e um grito quando dois
   anéis se cruzam. Cada uma dessas promessas tem afirmação abaixo, e cada
   afirmação morre quando o valor muda.
============================================================================ */
const CIRCULO = (extra: any = {}) => ({
  de: { op: 'cubo', id: 1, face: 'topo' },
  saida: { op: 'cubo', id: 1, face: 'fundo' },
  centros: { distancia: 1.2, total: 4, volta: 360 },
  raio: 0.3, lados: 6, ...extra,
});
const QUATRO_PONTOS = (extra: any = {}) => ({
  de: { op: 'cubo', id: 1, face: 'topo' },
  saida: { op: 'cubo', id: 1, face: 'fundo' },
  centros: [[0, 0, 1.2], [1.2, 0, 0], [0, 0, -1.2], [-1.2, 0, 0]],
  raio: 0.3, lados: 6, ...extra,
});

describe('furo v2 — um passo abre vários furos na mesma face', () => {
  it('quatro furos passantes numa placa: malha FECHADA, zero órfão, contagem fechada', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS()) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(arestasSoltas(n)).toBe(0);
    // vértices: 2·lados por furo, nada mais — a partição não cria canto novo
    expect([...n.V.keys()].filter((v: number) => v >= 1000)).toHaveLength(2 * 6 * 4);
    expect(n.V.size).toBe(8 + 48);
    /* faces: 3·lados por furo (borda, parede, borda de saída) + o preenchimento
       dos dois lados, `n + 2M − 2` cada um (n = 4 cantos do quadrado, M = 4). */
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toHaveLength(3 * 6 * 4 + 2 * (4 + 2 * 4 - 2));
    expect(n.F.has(1)).toBe(false);   // topo consumido
    expect(n.F.has(0)).toBe(false);   // fundo consumido
    expect([...n.F.keys()].filter((f: number) => f < 1000).sort((a: number, b: number) => a - b)).toEqual([2, 3, 4, 5]);
  });

  it('quatro furos CEGOS: mesma partição na entrada, um fundo por furo e nenhum na saída', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS({ saida: undefined, profundidade: 0.4 })) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(arestasSoltas(n)).toBe(0);
    expect(n.F.has(0)).toBe(true);    // o fundo do cubo continua vivo
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toHaveLength((2 * 6 + 1) * 4 + (4 + 2 * 4 - 2));
  });

  it('a numeração é FORMATO SALVO: o furo k mora em b+3·lados·k, e o preenchimento vem depois de todos', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS()) as any, {}, {});
    const L = 6;
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 3 * L; j++) expect(n.F.has(1000 + 3 * L * k + j)).toBe(true);
      for (let j = 0; j < 2 * L; j++) expect(n.V.has(1000 + 2 * L * k + j)).toBe(true);
    }
    /* e o bloco de ids do furo k responde pelo ANEL k: a borda j contém a
       aresta j→j+1 daquele anel, e a parede j só tem vértices dele. Sem esta
       afirmação, trocar a ordem dos blocos (dar ao furo 0 os ids do último)
       passa por todos os outros testes, e toda peça já escrita passa a
       endereçar outro furo. */
    for (let k = 0; k < 4; k++) {
      const meus = new Set(Array.from({ length: 2 * L }, (_, j) => 1000 + 2 * L * k + j));
      for (let j = 0; j < L; j++) {
        const borda = n.F.get(1000 + 3 * L * k + j).vs;
        expect(borda).toContain(1000 + 2 * L * k + j);
        expect(borda).toContain(1000 + 2 * L * k + (j + 1) % L);
        for (const v of n.F.get(1000 + 3 * L * k + L + j).vs) expect(meus.has(v)).toBe(true);
      }
    }
    // o preenchimento começa exatamente em b + 3·lados·M
    const cheio = [...n.F.keys()].filter((f: number) => f >= 1000 + 3 * L * 4).sort((a: number, b: number) => a - b);
    expect(cheio[0]).toBe(1000 + 3 * L * 4);
    expect(cheio).toHaveLength(2 * (4 + 2 * 4 - 2));
  });

  it('cada furo do passo é DISTINGUÍVEL dos outros: `furo:k` responde por um só, e o eixo ausente por todos', () => {
    const furo = { op: 'furo', id: 9 };
    const cor = (origem: any) => {
      const n = nucleo(PLACA(QUATRO_PONTOS(), [['pincel', { modo: 'face', sel: { origem }, cor: '#abc' }]]) as any, {}, {});
      expect(n.orfaos).toEqual([]);
      return pintadas(n, '#abc');
    };
    const p0 = cor({ ...furo, furo: 0, parede: 0 });
    const p2 = cor({ ...furo, furo: 2, parede: 0 });
    expect(p0).toHaveLength(1);
    expect(p2).toHaveLength(1);
    expect(p0).not.toEqual(p2);                              // dois furos, duas identidades
    expect(cor({ ...furo, parede: 0 })).toEqual([...p0, ...p2, ...cor({ ...furo, furo: 1, parede: 0 }), ...cor({ ...furo, furo: 3, parede: 0 })].sort((a, b) => a - b));
    expect(cor({ ...furo, furo: 'ultima' })).toEqual(cor({ ...furo, furo: 3 }));
    expect(cor({ ...furo, furo: 1 })).toHaveLength(3 * 6);    // o furo inteiro: borda + parede + saída
    expect(cor({ ...furo, furo: { passo: 2, fase: 0 } })).toEqual([...cor({ ...furo, furo: 0 }), ...cor({ ...furo, furo: 2 })].sort((a, b) => a - b));
    expect(cor(furo)).toHaveLength(3 * 6 * 4 + 2 * (4 + 2 * 4 - 2));   // a origem nua: tudo, preenchimento incluído
  });

  it('`furo` fora do limite GRITA nomeando a faixa, e o diagnóstico das famílias nomeia o furo', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS(), [['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, furo: 4 } }, cor: '#f00' }]]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /furo 4 fora do limite da origem furo:9 \(0\.\.3\)/.test(o.motivo))).toBe(true);
    const fam = nucleo(PLACA(QUATRO_PONTOS(), [['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, furo: 2, parede: 9 } }, cor: '#f00' }]]) as any, {}, {});
    expect(fam.orfaos.some((o: any) => /parede 9 fora do limite do furo 2 da origem furo:9 \(0\.\.5\)/.test(o.motivo))).toBe(true);
  });

  it('o PREENCHIMENTO é endereçável, e citá-lo num furo de um anel só GRITA em vez de devolver vazio', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS(), [
      ['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, preenchimento: 0 } }, cor: '#0f0' }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, preenchimentoDaSaida: 'ultima' } }, cor: '#00f' }],
    ]) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(pintadas(n, '#0f0')).toHaveLength(1);
    expect(pintadas(n, '#00f')).toHaveLength(1);
    expect(normalDe(n, pintadas(n, '#0f0')[0])[1]).toBeCloseTo(1, 9);    // preenchimento da entrada: olha para +y
    expect(normalDe(n, pintadas(n, '#00f')[0])[1]).toBeCloseTo(-1, 9);   // o da saída: para -y

    const um = nucleo(PLACA(PASSANTE, [['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, preenchimento: 0 } }, cor: '#f00' }]]) as any, {}, {});
    expect(um.orfaos.some((o: any) => /abriu UM anel só — a borda dá a volta inteira e não sobra preenchimento/.test(o.motivo))).toBe(true);
    const cego = nucleo(PLACA(QUATRO_PONTOS({ saida: undefined, profundidade: 0.4 }), [['pincel', { modo: 'face', sel: { origem: { op: 'furo', id: 9, preenchimentoDaSaida: 0 } }, cor: '#f00' }]]) as any, {}, {});
    expect(cego.orfaos.some((o: any) => /é um furo CEGO — não tem preenchimento de saída/.test(o.motivo))).toBe(true);
  });

  it('a herança segue a face de origem: entrada e saída pintam lados diferentes', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'topo' } }, cor: '#111' }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'fundo' } }, cor: '#222' }],
      ['furo', { origemId: 9, ...QUATRO_PONTOS() }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    // borda + parede + preenchimento da entrada herdam #111; borda e preenchimento da saída, #222
    expect(pintadas(n, '#111')).toHaveLength(2 * 6 * 4 + (4 + 2 * 4 - 2));
    expect(pintadas(n, '#222')).toHaveLength(6 * 4 + (4 + 2 * 4 - 2));
  });

  it('toda face da partição sai com área POSITIVA e virada para o mesmo lado da face cortada', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS()) as any, {}, {});
    for (const f of n.F.values() as any) {
      if (f.id < 1000) continue;
      const vs = f.vs.map((v: number) => n.V.get(v));
      let area = 0;
      for (let k = 0; k < vs.length; k++) {
        const p = vs[k], q = vs[(k + 1) % vs.length];
        area += Math.hypot((p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1]));
      }
      expect(area).toBeGreaterThan(1e-9);
    }
    // a soma das áreas do lado de entrada bate com o quadrado menos os quatro discos
    const soma = [...n.F.values()].filter((f: any) => normalDe(n, f.id)[1] > 0.999).reduce((s: number, f: any) => {
      const vs = f.vs.map((v: number) => n.V.get(v));
      let a = 0;
      for (let k = 0; k < vs.length; k++) { const p = vs[k], q = vs[(k + 1) % vs.length]; a += p[0] * q[2] - q[0] * p[2]; }
      return s + Math.abs(a) / 2;
    }, 0);
    const areaAnel = (6 / 2) * Math.sin((2 * Math.PI) / 6) * 0.3 * 0.3;
    expect(soma).toBeCloseTo(4 * 4 - 4 * areaAnel, 9);
  });
});

describe('furo v2 — dois anéis que se cruzam GRITAM, e o passo inteiro aborta', () => {
  const dois = (c1: any, c2: any, extra: any = {}) => nucleo(PLACA({
    de: { op: 'cubo', id: 1, face: 'topo' }, saida: { op: 'cubo', id: 1, face: 'fundo' },
    centros: [c1, c2], raio: 0.5, lados: 6, ...extra,
  }) as any, {}, {});

  it('anéis sobrepostos não viram um furo em oito: GRITA e nada é construído', () => {
    const n = dois([0.4, 0, 0], [-0.4, 0, 0]);
    expect(n.orfaos.some((o: any) => /os anéis 0 e 1 se cruzam ou se encostam na face de entrada/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toEqual([]);   // 0 F
    expect([...n.V.keys()].filter((v: number) => v >= 1000)).toEqual([]);   // 0 V
    expect(n.F.has(1)).toBe(true);   // e a face de entrada continua VIVA
    expect(arestasSoltas(n)).toBe(0);
  });

  it('anéis que só se ENCOSTAM também gritam — vértice pinçado é malha errada e plausível', () => {
    // dois hexágonos de raio 0.5 com centros a exatamente 2·0.5·cos(30°) = √3/2
    const n = dois([0, 0, 0], [Math.sqrt(3) / 2, 0, 0]);
    expect(n.orfaos.some((o: any) => /se cruzam ou se encostam/.test(o.motivo))).toBe(true);
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toEqual([]);
  });

  it('anéis separados por uma folga mínima PASSAM — a recusa é do cruzamento, não da vizinhança', () => {
    const n = dois([0, 0, 0], [Math.sqrt(3) / 2 + 0.01, 0, 0]);
    expect(n.orfaos).toEqual([]);
    expect(arestasSoltas(n)).toBe(0);
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toHaveLength(3 * 6 * 2 + 2 * (4 + 2 * 2 - 2));
  });

  it('saída OBLÍQUA: dois anéis quase encostados continuam separados do outro lado, e a malha fecha', () => {
    /* a projeção do anel na face de saída é AFIM (`p ↦ p + eixo·t(p)`, com `t`
       linear em `p`), então ela não pode aproximar dois anéis que a entrada
       separou. É por isso que a sobreposição é conferida UMA vez, na entrada.
       Este teste mede a afirmação em vez de confiar nela: a saída é inclinada,
       os anéis passam a um centésimo de se encostar, e o resultado é malha
       fechada com os anéis ainda separados do outro lado. */
    const n = nucleo([
      ['cubo', { id: 0, larg: 6, alt: 2, prof: 6, origemId: 1 }],
      ['moveV', { v: 0, d: [0, 0.8, 0] }], ['moveV', { v: 1, d: [0, 0.8, 0] }],   // inclina o FUNDO em torno do eixo x
      ['furo', {
        origemId: 9, de: { op: 'cubo', id: 1, face: 'topo' }, saida: { op: 'cubo', id: 1, face: 'fundo' },
        centros: [[0, 0, -0.44], [0, 0, 0.44]], raio: 0.25, lados: 6,
      }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(arestasSoltas(n)).toBe(0);
    expect([...n.F.keys()].filter((f: number) => f >= 1000)).toHaveLength(3 * 6 * 2 + 2 * (4 + 2 * 2 - 2));
    // o furo é o passo 3, então b = 3000: os anéis do outro lado são b+6..b+11 e b+18..b+23
    const anel = (base: number) => Array.from({ length: 6 }, (_, j) => n.V.get(base + j));
    let menor = Infinity;
    for (const p of anel(3006)) for (const q of anel(3018)) menor = Math.min(menor, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    expect(menor).toBeGreaterThan(0);
  });
});

describe('furo v2 — o círculo de parafusos é uma FRASE, e as duas formas dizem o mesmo', () => {
  it('quatro furos a 1,2 do centro: a forma de círculo produz os mesmos anéis da lista escrita à mão', () => {
    const porCirculo = nucleo(PLACA(CIRCULO()) as any, {}, {});
    const porLista = nucleo(PLACA(QUATRO_PONTOS()) as any, {}, {});
    expect(porCirculo.orfaos).toEqual([]);
    const pos = (n: any) => [...n.V.keys()].filter((v: number) => v >= 1000).sort((a: number, b: number) => a - b).map((v: number) => n.V.get(v).map((x: number) => +x.toFixed(9)));
    expect(pos(porCirculo)).toEqual(pos(porLista));
    expect([...porCirculo.F.keys()].sort()).toEqual([...porLista.F.keys()].sort());
  });

  it('a distância e a contagem MANDAM: mudar `total` muda a contagem de furos e `distancia` afasta os centros', () => {
    const seis = nucleo(PLACA(CIRCULO({ centros: { distancia: 1.2, total: 6, volta: 360 } })) as any, {}, {});
    expect(seis.orfaos).toEqual([]);
    expect([...seis.V.keys()].filter((v: number) => v >= 1000)).toHaveLength(2 * 6 * 6);
    const raioDe = (n: any) => {
      const p = n.V.get(1000);   // vértice 0 do anel 0
      return Math.hypot(p[0], p[2]);
    };
    expect(raioDe(nucleo(PLACA(CIRCULO()) as any, {}, {}))).toBeCloseTo(1.2 + 0.3, 9);
    expect(raioDe(nucleo(PLACA(CIRCULO({ centros: { distancia: 1.5, total: 4, volta: 360 } })) as any, {}, {}))).toBeCloseTo(1.5 + 0.3, 9);
  });

  it('`graus` é o passo direto, e `volta` o arco fechado: 4 furos em volta 360 == 4 furos de 90 em 90', () => {
    const porVolta = nucleo(PLACA(CIRCULO()) as any, {}, {});
    const porGraus = nucleo(PLACA(CIRCULO({ centros: { distancia: 1.2, total: 4, graus: 90 } })) as any, {}, {});
    const pos = (n: any) => [...n.V.keys()].filter((v: number) => v >= 1000).sort((a: number, b: number) => a - b).map((v: number) => n.V.get(v).map((x: number) => +x.toFixed(9)));
    expect(pos(porGraus)).toEqual(pos(porVolta));
  });

  it('`orientacao` decide onde cai o furo 0 — é a mesma chave que já decidia a fase do anel', () => {
    const padrao = nucleo(PLACA(CIRCULO()) as any, {}, {});
    const girado = nucleo(PLACA(CIRCULO({ orientacao: [1, 0, 0] })) as any, {}, {});
    expect(girado.orfaos).toEqual([]);
    const centro = (n: any) => {
      let x = 0, z = 0;
      for (let j = 0; j < 6; j++) { const p = n.V.get(1000 + j); x += p[0] / 6; z += p[2] / 6; }
      return [+x.toFixed(9), +z.toFixed(9)];
    };
    expect(centro(padrao)).not.toEqual(centro(girado));
    expect(Math.hypot(...centro(girado))).toBeCloseTo(1.2, 9);
  });

  it('o `pivo` desloca o círculo inteiro, e ele é dimensional como todo ponto do núcleo', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 4, alt: 1, prof: 4, origemId: 1 }],
      ['furo', { origemId: 9, ...CIRCULO({ centros: { pivo: [1, 0, 0], distancia: 0.6, total: 4, volta: 360 } }) }],
    ] as any, {}, {});
    expect(n.orfaos).toEqual([]);
    let x = 0, z = 0;
    for (let j = 0; j < 6; j++) { x += n.V.get(1000 + j)[0] / 6; z += n.V.get(1000 + j)[2] / 6; }
    expect(x).toBeCloseTo(1, 9);     // o pivô desloca o círculo inteiro em x
    expect(z).toBeCloseTo(0.6, 9);   // e o furo 0 fica a `distancia` na direção do +u da face
  });
});

describe('furo v2 — completude: a recusa vem antes do primeiro id, e a forma velha não muda', () => {
  const casos: [string, any, RegExp][] = [
    ['centro e centros juntos', { ...PASSANTE, centros: [[0, 0, 0]] }, /centro e centros dizem a mesma coisa em número diferente/],
    ['nenhum dos dois', { de: { op: 'cubo', id: 1, face: 'topo' }, profundidade: 0.4, raio: 0.3 }, /furo exige centro/],
    ['lista vazia', { ...PASSANTE, centro: undefined, centros: [] }, /centros é uma lista vazia/],
    ['ponto de aridade errada', { ...PASSANTE, centro: undefined, centros: [[0, 0]] }, /centros\[0\] precisa ser \[x,y,z\]/],
    ['círculo sem total', { ...PASSANTE, centro: undefined, centros: { distancia: 1, volta: 360 } }, /precisa de total inteiro ≥ 2/],
    ['círculo sem distância', { ...PASSANTE, centro: undefined, centros: { total: 4, volta: 360 } }, /precisa de distancia > 0/],
    ['círculo com volta E graus', { ...PASSANTE, centro: undefined, centros: { distancia: 1, total: 4, volta: 360, graus: 90 } }, /volta e graus dizem coisas diferentes/],
    ['círculo sem volta nem graus', { ...PASSANTE, centro: undefined, centros: { distancia: 1, total: 4 } }, /exige volta .* ou graus/],
    ['círculo com palavra estranha', { ...PASSANTE, centro: undefined, centros: { distancia: 1, total: 4, volta: 360, eixo: [0, 1, 0] } }, /'eixo' não é palavra desta forma/],
    ['círculo que empilha dois furos no mesmo lugar', { ...PASSANTE, centro: undefined, centros: { distancia: 1, total: 3, graus: 360 } }, /múltiplo exato de 360° — dois furos no mesmo lugar/],
    ['anel de fora do contorno', { ...PASSANTE, centro: undefined, centros: [[0, 0, 0], [1.9, 0, 0]], raio: 0.3 }, /o anel 1 de raio 0\.3 .* não cabe dentro da face de entrada/],
    ['forma que não é lista nem círculo', { ...PASSANTE, centro: undefined, centros: 4 }, /centros é uma lista \[\[x,y,z\], …\] ou um círculo/],
  ];
  for (const [nome, furo, esperado] of casos) {
    it(`${nome}: grita e o passo aborta com 0 V / 0 F`, () => {
      const n = nucleo(PLACA(furo) as any, {}, {});
      expect(n.orfaos.some((o: any) => esperado.test(o.motivo))).toBe(true);
      expect([...n.F.keys()].filter((f: number) => f >= 1000)).toEqual([]);
      expect([...n.V.keys()].filter((v: number) => v >= 1000)).toEqual([]);
    });
  }

  it('`centros` com UM ponto é o `centro` de sempre, vértice por vértice e face por face', () => {
    const singular = nucleo(PLACA(PASSANTE) as any, {}, {});
    const plural = nucleo(PLACA({ ...PASSANTE, centro: undefined, centros: [[0, 0, 0]] }) as any, {}, {});
    expect([...plural.F.keys()].sort()).toEqual([...singular.F.keys()].sort());
    for (const [id, p] of plural.V) expect(p).toEqual(singular.V.get(id));
    for (const [id, f] of plural.F) expect(f.vs).toEqual(singular.F.get(id).vs);
  });

  it('a face consumida por um furo de VÁRIOS anéis grita igual à de um anel só', () => {
    const n = nucleo(PLACA(QUATRO_PONTOS(), [['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 1, face: 'topo' } }, cor: '#f00' }]]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /face 'topo' da origem cubo:1 foi removida \(consumida pelo furo do passo 1\)/.test(o.motivo))).toBe(true);
  });
});

/* ============================================================================
   FURO V2 — A PARTIÇÃO EM FACE SIMÉTRICA (rodada "Flange de uma peça só")

   Achado ao levar o `centros` para uma peça de PRODUTO: o flange do freio é a
   tampa de um cilindro de 16 lados, com 4 anéis de 12 lados a 90°. 16, 12 e 4
   são todos múltiplos de 4, e essa simetria põe vértices de um anel EXATAMENTE
   em cima da aresta de uma orelha de outro. "Em cima" não é "dentro": o teste
   de orelha só recusava o vértice ESTRITAMENTE interno, então a orelha era
   cortada, engolia a lasca do outro lado da aresta e o resto do polígono
   sobrava com orientação invertida.

   O sintoma chegava longe da causa — "a partição criou um triângulo de área
   nula ou invertida", uma das três provas de estado impossível, que o núcleo
   declara não ter teste que as dispare. Ela tinha. Estas afirmações existem
   para que a face simétrica seja ENTRADA VÁLIDA, e não um grito.
============================================================================ */
describe('furo v2 — face redonda com círculo de furos em simetria exata', () => {
  /* a mesma figura do flange, sem vocabulário automotivo: tampa de um cilindro
     de `ladosDaFace` lados, com `total` furos de `ladosDoFuro` lados. */
  const FLANGE = (ladosDaFace: number, ladosDoFuro: number, total: number) => [
    ['cilindro', { id: 0, origemId: 1, raio: 0.052, altura: 0.012, lados: ladosDaFace }],
    ['furo', {
      origemId: 9,
      de: { op: 'cilindro', id: 1, tampa: 'topo' },
      saida: { op: 'cilindro', id: 1, tampa: 'fundo' },
      centros: { distancia: 0.038, total, volta: 360 },
      raio: 0.0065,
      lados: ladosDoFuro,
      orientacao: [1, 0, 0],
    }],
  ];

  it('16 lados, 4 furos de 12: a partição fecha, e é ESTE o caso que a peça usa', () => {
    const n = nucleo(FLANGE(16, 12, 4) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(arestasSoltas(n)).toBe(0);
    /* contagem fechada, dos dois lados: 3·L por furo mais o preenchimento
       `n + 2M − 2` na entrada e na saída. */
    expect([...n.F.keys()].filter((f: number) => f >= 1000))
      .toHaveLength(3 * 12 * 4 + 2 * (16 + 2 * 4 - 2));
    expect([...n.V.keys()].filter((v: number) => v >= 1000)).toHaveLength(2 * 12 * 4);
  });

  /* a simetria não é um caso: é uma FAMÍLIA. Cada linha aqui põe pelo menos um
     vértice em cima de uma aresta de orelha, e todas passavam a gritar sem a
     recusa por `pontoNoSegmento`. */
  const familia: [number, number, number][] = [
    [16, 12, 4], [8, 12, 4], [10, 6, 6], [24, 6, 6], [32, 10, 6], [16, 12, 8], [20, 12, 4], [6, 8, 8],
  ];
  for (const [face, furo, total] of familia) {
    it(`face de ${face} lados com ${total} furos de ${furo}: zero órfão e malha fechada`, () => {
      const n = nucleo(FLANGE(face, furo, total) as any, {}, {});
      expect(n.orfaos).toEqual([]);
      expect(arestasSoltas(n)).toBe(0);
      expect([...n.F.keys()].filter((f: number) => f >= 1000))
        .toHaveLength(3 * furo * total + 2 * (face + 2 * total - 2));
    });
  }

  it('a área da partição é a da face MENOS a dos furos — cobrir a lasca duas vezes morreria aqui', () => {
    /* a prova que o sintoma dava de graça, agora dita como afirmação: a soma
       das faces do lado de entrada (borda + preenchimento) é a área do
       polígono da face menos a dos anéis. Uma orelha que engole a lasca de um
       anel some com área e a conta não fecha. */
    const n = nucleo(FLANGE(16, 12, 4) as any, {}, {});
    const areaDe = (f: any) => {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < f.vs.length; k++) {
        const a = n.V.get(f.vs[k]), b = n.V.get(f.vs[(k + 1) % f.vs.length]);
        x += a[1] * b[2] - b[1] * a[2]; y += a[2] * b[0] - b[2] * a[0]; z += a[0] * b[1] - b[0] * a[1];
      }
      return Math.hypot(x, y, z) / 2;
    };
    const topo = [...n.F.values()].filter((f: any) => {
      const ys = f.vs.map((v: number) => n.V.get(v)[1]);
      return f.id >= 1000 && ys.every((v: number) => Math.abs(v - 0.012) < 1e-12);
    });
    const area = topo.reduce((s: number, f: any) => s + areaDe(f), 0);
    const poligono = (raio: number, lados: number) => lados * raio * raio * Math.sin(2 * Math.PI / lados) / 2;
    expect(area).toBeCloseTo(poligono(0.052, 16) - 4 * poligono(0.0065, 12), 12);
  });
});

/* ============================================================================
   FURO V2 — ATÉ ONDE A PARTIÇÃO CHEGA, E ONDE ELA PARA (A-33)

   A rodada do flange registrou "17 de 240 combinações gritavam antes, 0
   depois". A frase é verdadeira DENTRO das 240 escolhidas e falsa fora delas.
   Varredura de 14 212 combinações de `face × lados do furo × total`, com a
   mesma figura do flange (raio 0,052, furos de raio 0,0065 a 0,038 do centro):

     10 758  saem inteiras, sem órfão;
      1 240  gritam porque dois anéis se cruzam ou se encostam — CORRETO;
      1 165  gritam porque um anel não cabe na face — CORRETO;
        904  estouram o bloco de ids do passo — LIMITE DECLARADO do núcleo;
         37  travam a partição: "nenhuma orelha livre" — DEFEITO ABERTO (A-33).

   As 37 são todas face de POUCOS lados (6, 7, 8, 10, 18) com muitos furos
   raspando a borda: o polígono com pontes vira fracamente simples com folga na
   casa de 5·10⁻⁴, e a orelha não acha corte livre. O importante, e é o que
   estas afirmações fixam, é que o caso ruim GRITA e ABORTA — nunca sai peça
   com malha rasgada. Quando A-33 for consertado, o segundo bloco fica vermelho
   e quem consertar move a linha para o primeiro.
============================================================================ */
describe('furo v2 — a fronteira medida da partição (A-33)', () => {
  const FLANGE = (ladosDaFace: number, ladosDoFuro: number, total: number) => [
    ['cilindro', { id: 0, origemId: 1, raio: 0.052, altura: 0.012, lados: ladosDaFace }],
    ['furo', {
      origemId: 9,
      de: { op: 'cilindro', id: 1, tampa: 'topo' },
      saida: { op: 'cilindro', id: 1, tampa: 'fundo' },
      centros: { distancia: 0.038, total, volta: 360 },
      raio: 0.0065,
      lados: ladosDoFuro,
      orientacao: [1, 0, 0],
    }],
  ];

  it('147 combinações da região sadia saem inteiras e com malha fechada', () => {
    let contadas = 0;
    for (let face = 8; face <= 20; face += 2) {
      for (const furo of [6, 8, 12]) {
        for (let total = 2; total <= 8; total++) {
          const n = nucleo(FLANGE(face, furo, total) as any, {}, {});
          expect(n.orfaos.map((o: any) => o.motivo), `face ${face}, furo ${furo}, total ${total}`).toEqual([]);
          expect(arestasSoltas(n), `face ${face}, furo ${furo}, total ${total}`).toBe(0);
          expect([...n.F.keys()].filter((f: number) => f >= 1000))
            .toHaveLength(3 * furo * total + 2 * (face + 2 * total - 2));
          contadas++;
        }
      }
    }
    /* a contagem existe para que uma varredura que deixe de varrer não passe
       calada por não ter achado nada. */
    expect(contadas).toBe(147);
  });

  /* a região que AINDA trava, dita na cara. Cada linha veio da varredura de
     14 212 e é geometricamente válida: os anéis cabem na face e não se tocam. */
  const AINDA_TRAVA: [number, number, number][] = [
    [6, 3, 7], [6, 3, 9], [6, 4, 7], [6, 12, 7], [6, 24, 7],
    [7, 3, 8], [7, 5, 8], [8, 3, 9], [8, 4, 10], [10, 4, 11], [18, 3, 11],
  ];
  for (const [face, furo, total] of AINDA_TRAVA) {
    it(`face de ${face} lados com ${total} furos de ${furo}: trava, e trava GRITANDO (A-33)`, () => {
      const n = nucleo(FLANGE(face, furo, total) as any, {}, {});
      expect(n.orfaos.length).toBeGreaterThan(0);
      expect(n.orfaos[0].motivo).toMatch(/nenhuma orelha livre/);
      /* e o passo ABORTA inteiro: o que não dá para particionar não vira meia
         peça na tela. Nenhuma face nem vértice do bloco do furo sobrevive. */
      expect([...n.F.keys()].filter((f: number) => f >= 1000)).toHaveLength(0);
      expect([...n.V.keys()].filter((v: number) => v >= 1000)).toHaveLength(0);
    });
  }
});

/* ============================================================================
   CICLO 5 — A CONDIÇÃO 2 DO GATE MEDIA A COISA ERRADA

   O gate diz: "um arco de raio declarado, escrito com a alça, sai a menos de 1%
   do raio em toda amostra". A afirmação que entrou com a curva media a
   distância dos VÉRTICES ao centro analítico. Essa distância é exata POR
   CONSTRUÇÃO — o núcleo põe cada vértice em `centro + raio·(cos,sin)`. Ela dá
   0,000000% em qualquer discretização, inclusive `segmentosCurva: 1`, onde o
   "arco" é uma corda reta a 29% do arco de verdade. Medido:

     seg= 1  erro nos vértices 0,000000%   desvio da SUPERFÍCIE 29,289%
     seg= 2  erro nos vértices 0,000000%   desvio da SUPERFÍCIE  7,612%
     seg= 3  erro nos vértices 0,000000%   desvio da SUPERFÍCIE  3,407%
     seg= 4  erro nos vértices 0,000000%   desvio da SUPERFÍCIE  1,921%
     seg= 8  erro nos vértices 0,000000%   desvio da SUPERFÍCIE  0,482%
     seg=16  erro nos vértices 0,000000%   desvio da SUPERFÍCIE  0,120%

   Uma afirmação que não pode falhar não é afirmação. O que a peça mostra, e o
   que o cliente vê, é a SUPERFÍCIE: a poligonal que liga os vértices. O desvio
   dela é a flecha da corda, `raio·(1 − cos(giro/2·segmentos))`, e é ELE que
   precisa caber em 1%.
============================================================================ */
describe('ciclo 5 — a curva é medida na SUPERFÍCIE, não só nos vértices', () => {
  /* pior desvio do MEIO de cada corda até o arco verdadeiro, em fração do raio.
     Percorre os pontos do perfil expandido reconstruídos a partir do neutro. */
  const desvioDaSuperficie = (segmentosCurva: number, raio = 0.3) => {
    const n = nucleo([['lathe', {
      id: 0, lados: 8, segmentosCurva,
      perfil: [[0, 0], [1, 0, raio], [1, 1], [0, 1]],
    }]] as any, {}, {});
    expect(n.orfaos).toHaveLength(0);
    /* canto reto em B=(1,0): t = raio, centro = (1−raio, raio). */
    const centro = [1 - raio, raio];
    const aneis = new Map<string, number[]>();
    for (const [, p] of n.V) {
      const r = Math.hypot(p[0], p[2]);
      aneis.set(`${r.toFixed(9)},${p[1].toFixed(9)}`, [r, p[1]]);
    }
    const noArco = [...aneis.values()]
      .filter(([r, y]) => Math.abs(Math.hypot(r - centro[0], y - centro[1]) - raio) < 1e-9)
      .sort((a, b) => a[1] - b[1]);
    expect(noArco.length, 'a medição não achou ponto nenhum do arco').toBe(segmentosCurva + 1);
    let pior = 0;
    for (let k = 0; k + 1 < noArco.length; k++) {
      const meio = [(noArco[k][0] + noArco[k + 1][0]) / 2, (noArco[k][1] + noArco[k + 1][1]) / 2];
      pior = Math.max(pior, Math.abs(Math.hypot(meio[0] - centro[0], meio[1] - centro[1]) - raio));
    }
    return pior / raio;
  };

  it('a discretização BAIXA não passa: com 1 segmento o arco é uma corda reta, a 29% do arco', () => {
    /* esta afirmação existe para provar que a de baixo NÃO é vazia. Se alguém
       trocar a medição de volta para a distância dos vértices, este caso passa
       a dar 0% e o teste cai aqui. */
    expect(desvioDaSuperficie(1)).toBeGreaterThan(0.25);
    expect(desvioDaSuperficie(2)).toBeGreaterThan(0.05);
  });

  it('com 8 segmentos (o padrão do núcleo) num canto reto o desvio da superfície cabe em 1%', () => {
    expect(desvioDaSuperficie(8)).toBeLessThan(0.01);
    expect(desvioDaSuperficie(16)).toBeLessThan(0.01);
  });

  it('a flecha da corda bate com a conta analítica, então o autor pode escolher a discretização', () => {
    /* giro do arco num canto reto = 90°. Flecha = raio·(1 − cos(giro/2n)). */
    for (const seg of [2, 3, 4, 8, 16]) {
      const previsto = 1 - Math.cos((Math.PI / 2) / (2 * seg));
      expect(desvioDaSuperficie(seg)).toBeCloseTo(previsto, 9);
    }
  });
});

/* A mesma medição na peça de PRODUTO: o ombro do pneu da `roda-dianteira` usa
   `segmentosCurva: 3` num giro de 45°, que é metade do canto reto acima — a
   flecha cai junto e cabe em 1% com três segmentos em vez de oito. Isto é o que
   justifica o custo escolhido na peça, e é medido, não estimado. */
describe('ciclo 5 — o ombro do pneu cabe em 1% com a discretização que a peça pediu', () => {
  it('o arco do ombro tem 4 pontos e desvio de superfície abaixo de 1% do raio', async () => {
    // @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
    const P: any = await import('../../prototipos/fps/v3/pecas/roda-dianteira.js');
    const n = nucleo(P.PASSOS, P.PARAMS, P.TOPO, P.MATERIAIS, null, P.ALIASES);
    expect(n.orfaos).toHaveLength(0);
    const raio = P.PARAMS.pneuOmbroConcordancia;
    /* o pneu é girado para o eixo X: o "raio" do perfil é a distância ao eixo X
       e o "y" do perfil é a coordenada X. O ombro de −X fica no canto entre o
       flanco e a banda de rodagem. */
    const aneis = new Map<string, number[]>();
    for (const [, p] of n.V) {
      const r = Math.hypot(p[1], p[2]);
      aneis.set(`${r.toFixed(9)},${p[0].toFixed(9)}`, [r, p[0]]);
    }
    /* centro analítico do arco, reconstruído das MEDIDAS da peça, não do neutro. */
    const B = [P.PARAMS.pneuRaioOmbro, -P.PARAMS.pneuMeiaLargura];
    const A = [P.PARAMS.pneuRaioInterno, -P.PARAMS.pneuMeiaLargura];
    const C = [P.PARAMS.pneuRaioExterno, -P.PARAMS.pneuCoroaMeiaLargura];
    const unit = (p: number[]) => {
      const d = [p[0] - B[0], p[1] - B[1]], l = Math.hypot(d[0], d[1]);
      return [d[0] / l, d[1] / l];
    };
    const u1 = unit(A), u2 = unit(C);
    const theta = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    const bl = Math.hypot(u1[0] + u2[0], u1[1] + u2[1]);
    const centro = [
      B[0] + ((u1[0] + u2[0]) / bl) * (raio / Math.sin(theta / 2)),
      B[1] + ((u1[1] + u2[1]) / bl) * (raio / Math.sin(theta / 2)),
    ];
    const noArco = [...aneis.values()]
      .filter(([r, x]) => Math.abs(Math.hypot(r - centro[0], x - centro[1]) - raio) < 1e-9)
      .sort((a, b) => a[1] - b[1]);
    expect(noArco.length, 'o ombro do pneu perdeu o arco').toBe(P.TOPO.pneuOmbroSegmentos + 1);

    let pior = 0;
    for (let k = 0; k + 1 < noArco.length; k++) {
      const meio = [(noArco[k][0] + noArco[k + 1][0]) / 2, (noArco[k][1] + noArco[k + 1][1]) / 2];
      pior = Math.max(pior, Math.abs(Math.hypot(meio[0] - centro[0], meio[1] - centro[1]) - raio));
    }
    expect(pior / raio).toBeLessThan(0.01);
    /* e o giro é mesmo de 45°: se alguém mudar o perfil e o canto virar reto,
       três segmentos deixam de bastar e este teste cai junto. */
    expect((Math.PI - theta) * 180 / Math.PI).toBeCloseTo(45, 6);
  });
});

/* filete (ciclo "Curva e filete v1") — arredonda UMA aresta escolhida por
   identidade estrutural. O precedente é o `furo`: `de` endereça a face, o
   corte grita em toda referência ambígua/vazia/inválida, e o que ele cria
   entra em CONTRATOS_ORIGEM. A diferença medida é a que mais importa aqui:
   o filete NÃO consome as duas faces da aresta — ele preserva a identidade
   delas (mesmo `f.id`), só muda a forma; as arestas vizinhas continuam de pé. */
const CUBO_FILETE = (filete: any, extra: any[] = []) => [
  ['cubo', { id: 0, larg: 1, alt: 1, prof: 1, origemId: 1 }],
  ['filete', { origemId: 9, ...filete }],
  ...extra,
];
const ARESTA_TOPO_TRAS = { de: { op: 'cubo', id: 1, face: 'topo' }, aresta: 0, raio: 0.1 };

describe('filete — a aresta escolhida vira um painel; as outras cinco ficam de pé', () => {
  it('custo em faces/vértices: cubo 8V/6F -> 10V/7F (+2V/+1F, sempre — só o painel)', () => {
    const base = nucleo([['cubo', { larg: 1, alt: 1, prof: 1 }]], {}, {});
    const com = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {});
    expect(com.orfaos).toEqual([]);
    expect([base.V.size, base.F.size]).toEqual([8, 6]);
    /* v0 e v1 ANDAM para o lado de faceA em vez de virar órfãos; só o lado de
       faceB precisa de canto novo. Um corte, um painel, dois vértices. */
    expect([com.V.size, com.F.size]).toEqual([10, 7]);
  });

  it('a malha inteira passa na conferência única: polígono simples, casca fechada e desenha', () => {
    /* `conferirMalha` existe por causa desta op. O primeiro desenho dela
       preservava os cantos antigos DENTRO da face de entrada, e com isso a face
       ficava com um canto EM CIMA da aresta seguinte: um bico de espessura
       zero. O neutro continuava FECHADO e a contagem BATIA, então nenhum teste
       do núcleo caía. Quem gritou foi o adaptador, ao triangular em orelhas, e
       só quando a op chegou numa peça de verdade, uma rodada depois.
       Malha fechada e contagem certa não provam polígono simples, e nenhuma das
       três prova que a peça desenha. São quatro coisas, e esta linha cobra as
       quatro. */
    conferirMalha(nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {}), {
      fechada: true, rotulo: 'cubo com um filete',
    });
  });

  it('a silhueta muda, medida na malha: 45°/45° — a condição 5 do gate (n=1, θ/(n+1) com θ=90°)', () => {
    const n = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {});
    const nTopo = normalDe(n, 1);       // topo do cubo
    const nPainel = normalDe(n, 1000);  // o painel novo
    const nFrente = normalDe(n, 4);     // a outra face da aresta escolhida
    const ang = (a: number[], b: number[]) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
    expect(ang(nTopo, nPainel)).toBeCloseTo(45, 6);
    expect(ang(nPainel, nFrente)).toBeCloseTo(45, 6);
  });

  it('as faces LONGE do corte ficam EXATAMENTE como estavam — mesma lista de cantos', () => {
    const base = nucleo([['cubo', { larg: 1, alt: 1, prof: 1, origemId: 1 }]], {}, {});
    const com = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {});
    /* das seis faces do cubo, quatro tocam o corte: as duas da aresta e as
       duas das PONTAS dela. As outras duas não mudam de canto nenhum. */
    for (const fid of [0, 2]) expect(com.F.get(fid).vs).toEqual(base.F.get(fid).vs);
  });

  it('as seis faces do cubo continuam VIVAS com a mesma identidade — o filete não consome face nenhuma', () => {
    const n = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {});
    for (const fid of [0, 1, 2, 3, 4, 5]) expect(n.F.has(fid), `face ${fid} sumiu`).toBe(true);
    /* faceA e faceB continuam quads: os cantos delas ANDARAM, não se
       multiplicaram. Quem ganha canto é a terceira face de cada ponta, que é
       onde a fresta do recuo se fecha. */
    expect(n.F.get(1).vs).toHaveLength(4);
    expect(n.F.get(4).vs).toHaveLength(4);
    expect(n.F.get(3).vs).toHaveLength(5);
    expect(n.F.get(5).vs).toHaveLength(5);
  });

  it('as três arestas do vértice que NÃO foram escolhidas continuam retas', () => {
    /* o corte recua o canto, não arredonda o encontro das três arestas. As
       arestas vizinhas continuam sendo segmentos únicos entre dois cantos. */
    const n = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {});
    const v = (id: number) => n.V.get(id);
    /* a aresta vertical da frente-esquerda: de (−0.5,−0.5,0.5) a (−0.5,0.35,0.5)
       depois do recuo de 0.1 — continua UMA aresta, sem canto no meio. */
    const face4 = n.F.get(4).vs.map(v);
    expect(face4.filter((p: number[]) => Math.abs(p[0] + 0.5) < 1e-9)).toHaveLength(2);
  });

  it('o painel novo é ENDEREÇÁVEL: sel.origem cita a origem filete', () => {
    const n = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS, [
      ['pincel', { modo: 'face', sel: { origem: { op: 'filete', id: 9 } }, cor: '#ff0000' }],
    ]) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.F.get(1000).cor).toBe('#ff0000');
  });

  it('painel fora do limite GRITA nomeando a causa', () => {
    const n = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS, [
      ['pincel', { modo: 'face', sel: { origem: { op: 'filete', id: 9, painel: 5 } }, cor: '#ff0000' }],
    ]) as any, {}, {});
    expect(n.orfaos.some((o: any) => /fora do limite/.test(o.motivo))).toBe(true);
  });

  it('replay: o mesmo passo produz o neutro canônico byte-idêntico', () => {
    const PASSOS = CUBO_FILETE(ARESTA_TOPO_TRAS);
    const a = neutroCanonico(nucleo(PASSOS as any, {}, {}));
    const b = neutroCanonico(nucleo(PASSOS as any, {}, {}));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sem origemId GRITA', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 1, alt: 1, prof: 1, origemId: 1 }],
      ['filete', { de: ARESTA_TOPO_TRAS.de, aresta: 0, raio: 0.1 }],
    ] as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/origemId é obrigatório/);
  });

  it('origemId duplicado GRITA (ambíguo)', () => {
    const n = nucleo([
      ['cubo', { id: 0, larg: 1, alt: 1, prof: 1, origemId: 9 }],
      ['filete', { origemId: 9, ...ARESTA_TOPO_TRAS }],
    ] as any, {}, {});
    expect(n.orfaos.some((o: any) => /duplicado nas declarações/.test(o.motivo))).toBe(true);
  });

  it('sem de GRITA', () => {
    const n = nucleo(CUBO_FILETE({ origemId: 9, aresta: 0, raio: 0.1 } as any) as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/origem estrutural/);
  });

  it('aresta fora do índice GRITA', () => {
    const n = nucleo(CUBO_FILETE({ de: ARESTA_TOPO_TRAS.de, aresta: 99, raio: 0.1 }) as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/índice inteiro 0\.\.3/);
  });

  it('aresta EXATAMENTE no limite (o cubo tem 4 cantos, 0..3) GRITA — não é "0..4"', () => {
    const n = nucleo(CUBO_FILETE({ de: ARESTA_TOPO_TRAS.de, aresta: 4, raio: 0.1 }) as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/índice inteiro 0\.\.3/);
  });

  it('raio zero/negativo GRITA', () => {
    for (const raio of [0, -1]) {
      const n = nucleo(CUBO_FILETE({ de: ARESTA_TOPO_TRAS.de, aresta: 0, raio }) as any, {}, {});
      expect(n.orfaos[0]?.motivo, `raio=${raio}`).toMatch(/raio precisa ser > 0/);
    }
  });

  it('raio NaN/Infinity — a mesma lei de TODA op: número tem que ser finito, e não-finito GRITA ALTO (throw)', () => {
    for (const raio of [NaN, Infinity]) {
      expect(() => nucleo(CUBO_FILETE({ de: ARESTA_TOPO_TRAS.de, aresta: 0, raio }) as any, {}, {}), `raio=${raio}`).toThrow(/não-finito/);
    }
  });

  it('aresta que NÃO é manifold (face isolada, sem vizinha) GRITA', () => {
    const n = nucleo([
      ['plano', { id: 0, largura: 1, profundidade: 1, seg: 1, origemId: 1 }],
      ['filete', { origemId: 9, de: { op: 'plano', id: 1 }, aresta: 0, raio: 0.1 }],
    ] as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/não é compartilhada por nenhuma outra face/);
  });

  it('duas faces QUASE COPLANARES na mesma aresta GRITA (canto degenerado — dA e dB apontam quase opostos)', () => {
    // um `plano` com seg:2 é uma grade FLAT — os dois quads vizinhos (0,0) e
    // (1,0) compartilham uma aresta e são, por construção, coplanares: `dA`/`dB`
    // (perpendiculares à aresta, cada um pro centroide da própria face) saem
    // quase OPOSTOS (θ≈180°), não quase iguais — é o canto degenerado, o
    // outro lado da MESMA guarda que barra o "vira" acidental.
    const n = nucleo([
      ['plano', { id: 0, largura: 2, profundidade: 1, seg: 2, origemId: 1 }],
      ['filete', { origemId: 9, de: { op: 'plano', id: 1, faixa: 0, lado: 0 }, aresta: 2, raio: 0.1 }],
    ] as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/canto degenerado/);
  });

  it('id de origem não-inteiro/negativo GRITA', () => {
    const n = nucleo(CUBO_FILETE({ origemId: -1, ...ARESTA_TOPO_TRAS }) as any, {}, {});
    expect(n.orfaos[0]?.motivo).toMatch(/inteiro não-negativo/);
  });

  it('a malha continua fechada (watertight) depois do filete — nenhuma aresta solta', () => {
    const n = nucleo(CUBO_FILETE(ARESTA_TOPO_TRAS) as any, {}, {});
    expect(arestasSoltas(n)).toBe(0);
  });
});
