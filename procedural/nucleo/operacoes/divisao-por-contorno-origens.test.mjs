/* divisao-por-contorno-origens.test.mjs — a `divisaoPorContorno` e quem cita as faces depois dela: a origem de cada gerador, a cópia
   (espelha e arranja, com a divisão antes e depois), o friso da borda de um vão, o pedaço consumido, o `arredondarCostura` e o
   `limparLascas`. São os casos das revisões de 2026-11-19, separados de `divisao-por-contorno.test.mjs` para cada arquivo ficar abaixo do
   teto de tempo. As medidas estão em `docs/modelar/banco-de-provas/divisao-por-contorno-2026-11-18/README.md`. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../nucleo.js';
import { analisarTopologia } from '../topologia.js';
import { triangularFace } from '../triangulacao-face.js';
import { chapaDeGrade, m, poligonoDeRetas, retangulo } from '../../../tools/fixtures/aberturas-em-teste/chapas.js';

const altura = (x, z) => 30 * Math.sin(x / 150) * Math.cos(z / 180);
const GRADE = chapaDeGrade({ nx: 6, nz: 6, passo: 80, altura, espessura: 2, niveis: 2 });
const CHAPA = { origem: { op: 'subdivisao', id: 1 } };
const BASE = [['subdivisao', { origemId: 1, ...GRADE.passo }]];
const antes = () => nucleo(BASE, {}, GRADE.TOPO);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const triangulos = (r, filtro = () => true) => [...r.F.values()].filter(filtro).flatMap((f) => { const pts = f.vs.map((v) => r.V.get(v)); return triangularFace(pts).map((t) => t.map((k) => pts[k])); });
const area = (tris) => tris.reduce((s, [a, b, c]) => s + Math.hypot(...cruz(sub(b, a), sub(c, a))) / 2, 0);
const reprovas = (r) => analisarTopologia({ vertices: r.V, faces: r.F }, { triangulacao: true }).achados.filter((a) => a.severidade === 'reprova');

describe('divisaoPorContorno: a origem de cada gerador continua cobrindo o objeto depois da divisão (segunda revisão de 2026-11-19)', () => {
  /* Para a seleção `sel` de um gerador: depois da primeira divisão a seleção pela origem marca as faces de antes mais todos os pedaços
     novos, e a segunda divisão, por um contorno que contém o primeiro, não deixa face da primeira parte para trás. */
  function conferir(base, topo, sel, campos, contorno1, contorno2) {
    const marcadas = (passos) => { const r = nucleo([...passos, ['parte', { sel, nome: 'marca', substituir: true }]], {}, topo); expect(r.orfaos).toEqual([]); return [...r.F.values()].filter((f) => f.parte === 'marca').length; };
    const a = nucleo(base, {}, topo);
    expect(a.orfaos).toEqual([]);
    const d1 = ['divisaoPorContorno', { chapa: sel, nome: 'painel', contorno: contorno1, ...campos }];
    const r1 = nucleo([...base, d1], {}, topo);
    expect(r1.orfaos).toEqual([]);
    const novas = r1.F.size - a.F.size;
    expect(novas).toBeGreaterThan(0);
    expect([...r1.F.values()].filter((f) => f.parte === 'painel').length).toBeGreaterThan(0);
    expect(marcadas([...base, d1])).toBe(marcadas(base) + novas);
    const r2 = nucleo([...base, d1, ['divisaoPorContorno', { chapa: sel, nome: 'maior', contorno: contorno2, substituir: true, ...campos }]], {}, topo);
    expect(r2.orfaos).toEqual([]);
    expect([...r2.F.values()].filter((f) => f.parte === 'painel').length).toBe(0);
    expect([...r2.F.values()].filter((f) => f.parte === 'maior').length).toBeGreaterThan([...r1.F.values()].filter((f) => f.parte === 'painel').length);
    expect(reprovas(r2).length).toBe(reprovas(a).length);
    expect(Math.abs(area(triangulos(r2)) - area(triangulos(a))) / area(triangulos(a))).toBeLessThan(1e-12);
    return r2;
  }

  it('subdivisao', () => {
    conferir(BASE, GRADE.TOPO, CHAPA, { vista: 'y' }, retangulo(110.3, 110.7, 250.1, 250.9), retangulo(90.3, 90.7, 290.1, 290.9));
  });

  it('plano, que guarda as faces em grade', () => {
    conferir([['plano', { origemId: 7, largura: 0.4, profundidade: 0.4, seg: 6 }]], {}, { origem: { op: 'plano', id: 7 } }, { vista: 'y' }, retangulo(-110.3, -90.7, 50.1, 80.9), retangulo(-150.3, -150.7, 150.1, 150.9));
  });

  it('lathe, em faixas e lados', () => {
    conferir([['lathe', { origemId: 3, perfil: [[0.3, 0], [0.3, 0.5], [0.3, 1]], lados: 16, superficie: true }]], {}, { origem: { op: 'lathe', id: 3 } }, { vista: 'x', sentido: '+' }, retangulo(-80.3, 300.7, 90.1, 700.9), retangulo(-150.3, 200.7, 160.1, 800.9));
  });

  it('cilindro, pelas laterais', () => {
    const base = [['cilindro', { origemId: 4, raio: 0.3, altura: 1, lados: 16 }]];
    const ys = [...nucleo(base, {}, {}).V.values()].map((p) => p[1]); const y0 = Math.min(...ys) * 1000;
    conferir(base, {}, { origem: { op: 'cilindro', id: 4 } }, { vista: 'x', sentido: '+' }, retangulo(-80.3, y0 + 300.7, 90.1, y0 + 700.9), retangulo(-150.3, y0 + 200.7, 160.1, y0 + 800.9));
  });

  it('espelha, que guarda a cópia de cada face num mapa', () => {
    const base = [...BASE, ['espelha', { eixo: 'x', pos: 0, origemId: 9, derivaDe: { op: 'subdivisao', id: 1 }, sel: CHAPA }]];
    const copia = { origem: { op: 'espelha', id: 9, de: { op: 'subdivisao', id: 1 } } };
    conferir(base, GRADE.TOPO, copia, { vista: 'y' }, retangulo(-250.1, 110.7, -110.3, 250.9), retangulo(-300.1, 60.7, -60.3, 300.9));
    /* a fonte dividida depois do espelho: a cópia continua inteira, e a fonte continua coberta pela origem dela */
    const r = nucleo([...base, ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: retangulo(110.3, 110.7, 250.1, 250.9) }], ['parte', { sel: copia, nome: 'copia' }], ['parte', { sel: CHAPA, nome: 'fonte', substituir: true }]], {}, GRADE.TOPO);
    expect(r.orfaos).toEqual([]);
    expect([...r.F.values()].filter((f) => f.parte === 'copia').length).toBe(880);
    expect([...r.F.values()].filter((f) => f.parte === 'fonte').length).toBe(r.F.size - 880);
  });

  it('arranja', () => {
    const base = [...BASE, ['arranja', { modo: 'linear', total: 2, d: [0.5, 0, 0], origemId: 9, derivaDe: { op: 'subdivisao', id: 1 }, sel: CHAPA, nomes: ['copia'] }]];
    conferir(base, GRADE.TOPO, { origem: { op: 'arranja', id: 9, de: { op: 'subdivisao', id: 1 } } }, { vista: 'y' }, retangulo(610.3, 110.7, 750.1, 250.9), retangulo(590.3, 90.7, 790.1, 290.9));
  });

  it('a face nomeada de um cubo, endereço de uma face só, entrega a face e os pedaços dela', () => {
    const base = [['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1 }]];
    const topo = { origem: { op: 'cubo', id: 1, face: 'topo' } };
    const r = nucleo([...base, ['divisaoPorContorno', { chapa: topo, vista: 'y', nome: 'painel', contorno: retangulo(-300.3, -200.7, 200.1, 300.9) }], ['parte', { sel: topo, nome: 'marca', substituir: true }]], {}, {});
    expect(r.orfaos).toEqual([]);
    expect(r.F.size).toBeGreaterThan(6);
    expect([...r.F.values()].filter((f) => f.parte === 'marca').length).toBe(r.F.size - 5);
  });
});

describe('divisaoPorContorno: a cópia, o friso e a face consumida depois da divisão (terceira revisão de 2026-11-19)', () => {
  const D1 = ['divisaoPorContorno', { chapa: CHAPA, vista: 'y', nome: 'painel', contorno: retangulo(110.3, 110.7, 250.1, 250.9) }];
  const marcadas = (passos, sel) => { const r = nucleo([...passos, ['parte', { sel, nome: 'marca', substituir: true }]], {}, GRADE.TOPO); expect(r.orfaos).toEqual([]); return [...r.F.values()].filter((f) => f.parte === 'marca').length; };

  it('espelha e arranja nas duas ordens: a origem da cópia cobre a cópia inteira com a divisão antes dela, e a cópia de antes segue inteira', () => {
    const dividida = nucleo([...BASE, D1], {}, GRADE.TOPO).F.size;
    expect(dividida).toBeGreaterThan(880 + 100);
    for (const [copiar, sel] of [
      [['espelha', { eixo: 'x', pos: 0, origemId: 9, derivaDe: { op: 'subdivisao', id: 1 }, sel: CHAPA }], { origem: { op: 'espelha', id: 9, de: { op: 'subdivisao', id: 1 } } }],
      [['arranja', { modo: 'linear', total: 2, d: [0.5, 0, 0], origemId: 9, derivaDe: { op: 'subdivisao', id: 1 }, sel: CHAPA, nomes: ['copia'] }], { origem: { op: 'arranja', id: 9, de: { op: 'subdivisao', id: 1 } } }],
    ]) {
      /* a divisão antes da cópia: a cópia nasce com os pedaços, e a origem dela os cita todos */
      const antesDaCopia = [...BASE, D1, copiar];
      const r = nucleo(antesDaCopia, {}, GRADE.TOPO);
      expect(r.orfaos).toEqual([]);
      expect(r.F.size).toBe(2 * dividida);
      expect(marcadas(antesDaCopia, sel), copiar[0]).toBe(dividida);
      expect(marcadas(antesDaCopia, CHAPA), copiar[0]).toBe(dividida);
      /* a divisão da fonte depois da cópia: a cópia fica com as 880 faces dela, e a fonte com os pedaços */
      const depoisDaCopia = [...BASE, copiar, D1];
      expect(nucleo(depoisDaCopia, {}, GRADE.TOPO).F.size).toBe(880 + dividida);
      expect(marcadas(depoisDaCopia, sel), copiar[0]).toBe(880);
      expect(marcadas(depoisDaCopia, CHAPA), copiar[0]).toBe(dividida);
    }
  });

  it('a divisão rente a um vão deixa o friso da borda do vão sair como antes', async () => {
    const { default: receita } = await import('../../../tools/fixtures/abertura-de-prova/receita.js');
    /* uma faixa de 17 mm, a 3 mm da borda reta do vão da peça de prova, corta faces de pele que tocam a borda */
    const naReta = (x) => 430 + ((x - 220) * 50) / 300;
    const dividir = ['divisaoPorContorno', { chapa: { origem: { op: 'aberturaPorContorno', id: 3 } }, vista: 'y', nome: 'painel', substituir: true, contorno: poligonoDeRetas([[300, naReta(300) + 3], [450, naReta(450) + 3], [450, naReta(450) + 20], [300, naReta(300) + 20]]) }];
    const passos = receita.PASSOS;
    expect(passos[5][0]).toBe('friso');
    const sem = nucleo(passos, receita.PARAMS, receita.TOPO);
    const com = nucleo([...passos.slice(0, 5), dividir, ...passos.slice(5)], receita.PARAMS, receita.TOPO);
    expect(sem.orfaos).toEqual([]);
    expect(com.orfaos).toEqual([]);
    const daAba = (r) => [...r.F.values()].filter((f) => f.parte === 'aba').length;
    expect(daAba(sem)).toBeGreaterThan(1000);
    expect(daAba(com)).toBe(daAba(sem));
    expect([...com.F.values()].filter((f) => f.parte === 'painel').length).toBeGreaterThan(20);
    /* a aba no mesmo lugar: a normal da borda soma a face cortada inteira, por todos os pedaços dela, e cada vértice da aba fica
       a menos de um milésimo de micrometro de um vértice da aba de antes (era até 0,072 mm) */
    const pontosDaAba = (r) => { const ids = new Set(); for (const f of r.F.values()) if (f.parte === 'aba') for (const v of f.vs) ids.add(v); return [...ids].map((v) => r.V.get(v)); };
    const de = pontosDaAba(sem); const para = pontosDaAba(com);
    expect(para.length).toBe(de.length);
    let pior = 0;
    for (const p of para) { let perto = Infinity; for (const q of de) { const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < perto) perto = d; } pior = Math.max(pior, perto); }
    expect(pior).toBeLessThan(1e-9);
  });

  it('a divisão seguida do arredondarCostura: a origem da união continua citável, com os pedaços vivos', () => {
    const base = [
      ['cubo', { origemId: 1, larg: m(100), alt: m(20), prof: m(100), em: [0, 0, 0] }],
      ['cubo', { origemId: 2, larg: m(20), alt: m(60), prof: m(20), em: [0, 0, 0] }],
      ['unir', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
    ];
    const uniao = { origem: { op: 'unir', id: 3 } };
    const arredondar = ['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: m(8) }];
    const marcar = ['parte', { sel: uniao, nome: 'marca', substituir: true }];
    const contar = (passos) => { const r = nucleo(passos, {}, {}); expect(r.orfaos).toEqual([]); return { faces: r.F.size, marcadas: [...r.F.values()].filter((f) => f.parte === 'marca').length, painel: [...r.F.values()].filter((f) => f.parte === 'painel').length }; };
    /* o contorno passa a 2,3 mm da costura (que fica em x = 10 mm), dentro da faixa de 8 mm que o arredondamento refaz, sem cruzá-la:
       o arredondamento consome pedaços da divisão e corta outros. O contorno que cruza a costura recusa (o teste seguinte). */
    const dividir = ['divisaoPorContorno', { chapa: uniao, vista: 'y', nome: 'painel', contorno: retangulo(12.3, -25.7, 30.1, 25.9) }];
    const sem = contar([...base, arredondar, marcar]);
    const soDivisao = contar([...base, dividir]);
    const com = contar([...base, dividir, arredondar, marcar]);
    expect(soDivisao.painel).toBeGreaterThan(0);
    expect(com.faces).toBeGreaterThan(sem.faces);
    expect(com.marcadas).toBeGreaterThan(sem.marcadas);
    /* a união e a concordância, juntas, são a peça inteira: nenhum pedaço vivo ficou sem origem */
    const daConcordancia = (passos) => { const r = nucleo([...passos, ['parte', { sel: { origem: { op: 'arredondarCostura', id: 4 } }, nome: 'concordancia' }]], {}, {}); expect(r.orfaos).toEqual([]); return [...r.F.values()].filter((f) => f.parte === 'concordancia').length; };
    expect(sem.marcadas + daConcordancia([...base, arredondar])).toBe(sem.faces);
    expect(com.marcadas + daConcordancia([...base, dividir, arredondar])).toBe(com.faces);
  });

  it('o contorno que corta uma aresta da costura de uma booleana recusa, com a origem e o ponto; dentro da costura, divide', () => {
    /* a esfera cravada no cubo: a costura é um círculo de 32 arestas na face de baixo do cubo, de 15 mm de raio */
    const base = [
      ['cubo', { origemId: 1, larg: m(100), alt: m(20), prof: m(100), em: [0, 0, 0] }],
      ['esfera', { origemId: 2, raio: m(25), aneis: 12, lados: 16, em: [0, m(-20), 0] }],
      ['unir', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'esfera', id: 2 } }] }],
    ];
    const uniao = { origem: { op: 'unir', id: 3 } };
    const dividir = (contorno) => ['divisaoPorContorno', { chapa: uniao, vista: 'y', nome: 'painel', contorno }];
    const arredondar = ['arredondarCostura', { origemId: 4, de: { op: 'unir', id: 3 }, raio: m(4) }];
    const friso = ['friso', { origemId: 4, linha: { nome: 'x' }, costura: { de: { op: 'unir', id: 3 } }, perfil: { circulo: { raio: m(1) } } }];
    const daOrigem = (passos, op) => { const r = nucleo([...passos, ['parte', { sel: { origem: { op, id: 4 } }, nome: 'x4' }]], {}, {}); return { orfaos: r.orfaos, faces: [...r.F.values()].filter((f) => f.parte === 'x4').length }; };
    const antesDaDivisao = nucleo(base, {}, {});
    const cruza = retangulo(10.3, -6.7, 40.1, 6.9);
    const recusada = nucleo([...base, dividir(cruza)], {}, {});
    expect(recusada.orfaos.length).toBe(1);
    expect(recusada.orfaos[0]).toMatchObject({ op: 'divisaoPorContorno', ref: 'contorno' });
    expect(recusada.orfaos[0].motivo).toMatch(/o contorno corta a aresta \d+-\d+ da costura da origem unir:3, em \[[\d.-]+, [\d.-]+\] mm, vista do eixo y: a origem guarda as arestas da costura, e o arredondarCostura e o friso pela costura perderiam esse trecho sem aviso; desloque o contorno para não cruzar a costura, ou ponha a divisão antes do passo unir/);
    /* nada foi cortado: a malha é a de antes, e as 32 arestas da costura existem todas */
    expect(recusada.F.size).toBe(antesDaDivisao.F.size);
    expect(recusada.V.size).toBe(antesDaDivisao.V.size);
    /* o arredondamento e o friso depois do passo recusado saem inteiros, como sem a divisão */
    const concordancia = daOrigem([...base, arredondar], 'arredondarCostura');
    const cordao = daOrigem([...base, friso], 'friso');
    expect(concordancia.orfaos).toEqual([]);
    expect(cordao.orfaos).toEqual([]);
    expect(daOrigem([...base, dividir(cruza), arredondar], 'arredondarCostura').faces).toBe(concordancia.faces);
    expect(daOrigem([...base, dividir(cruza), friso], 'friso').faces).toBe(cordao.faces);
    /* o contorno inteiro dentro do círculo da costura não corta aresta dela: divide, e a concordância sai com as mesmas faces */
    const dentro = retangulo(1.3, -6.7, 8.1, 6.9);
    const dividida = nucleo([...base, dividir(dentro)], {}, {});
    expect(dividida.orfaos).toEqual([]);
    expect([...dividida.F.values()].filter((f) => f.parte === 'painel').length).toBeGreaterThan(0);
    const comDivisao = daOrigem([...base, dividir(dentro), arredondar], 'arredondarCostura');
    expect(comDivisao.orfaos).toEqual([]);
    expect(comDivisao.faces).toBe(concordancia.faces);
  });

  it('a divisão seguida do limparLascas: a lasca que era pedaço sai sem a origem gritar, e a origem cobre a chapa inteira', () => {
    for (const [sel, limite, areaMinima] of [[CHAPA, 0.09, 5e-5], [CHAPA, 0.3, 5e-5], [{ grupo: 'painel' }, 0.3, 2e-5]]) {
      const passos = [...BASE, D1, ['limparLascas', { sel, tolerancia: 2e-3, limite, areaMinima }]];
      const dividida = nucleo([...BASE, D1], {}, GRADE.TOPO);
      const limpa = nucleo(passos, {}, GRADE.TOPO);
      expect(limpa.orfaos).toEqual([]);
      /* a limpeza desfez pedaços novos da divisão */
      expect([...dividida.F.keys()].filter((f) => f >= 1000 && !limpa.F.has(f)).length).toBeGreaterThan(0);
      expect(marcadas(passos, CHAPA), `limite ${limite}`).toBe(limpa.F.size);
      const peles = ['externa', 'interna', 'borda'].map((parte) => marcadas(passos, { origem: { op: 'subdivisao', id: 1, parte } }));
      expect(peles[0] + peles[1] + peles[2]).toBe(limpa.F.size);
    }
  });

  it('o pedaço que um passo posterior consumiu faz a citação da origem gritar, com o pedaço e o passo', () => {
    /* um cubo que engole inteiro o menor pedaço novo da pele de fora (com mais de 5 mm²), meio milímetro para cada lado e sem chegar à
       pele de dentro: o subtrair consome esse pedaço, e a face de que ele saiu continua viva */
    const a = antes();
    const r1 = nucleo([...BASE, D1], {}, GRADE.TOPO);
    const novos = [...r1.F.values()].filter((f) => !a.F.has(f.id) && f.vs.every((v) => r1.V.get(v)[1] > m(altura(r1.V.get(v)[0] * 1000, r1.V.get(v)[2] * 1000) - 0.5)));
    const areaDe = (f) => area(triangulos(r1, (g) => g.id === f.id));
    const alvo = novos.filter((f) => areaDe(f) > 5e-6).reduce((x, y) => (areaDe(y) < areaDe(x) ? y : x));
    const pontos = alvo.vs.map((v) => r1.V.get(v));
    const menor = [0, 1, 2].map((e) => Math.min(...pontos.map((p) => p[e]))), maior = [0, 1, 2].map((e) => Math.max(...pontos.map((p) => p[e])));
    /* `em` do cubo é o centro da base dele */
    const cubo = ['cubo', { origemId: 5, larg: maior[0] - menor[0] + 0.001, alt: maior[1] - menor[1] + 0.001, prof: maior[2] - menor[2] + 0.001, em: [(menor[0] + maior[0]) / 2, menor[1] - 0.0005, (menor[2] + maior[2]) / 2] }];
    const r = nucleo([...BASE, D1, cubo, ['subtrair', { origemId: 9, solidos: [CHAPA, { origem: { op: 'cubo', id: 5 } }] }], ['parte', { sel: CHAPA, nome: 'marca', substituir: true }]], {}, GRADE.TOPO);
    expect(r.F.has(alvo.id)).toBe(false);
    expect(r.orfaos.length).toBeGreaterThan(0);
    expect(r.orfaos[0].motivo).toMatch(new RegExp(`a face ${alvo.id}, pedaço da face \\d+ da origem subdivisao:1 que a divisaoPorContorno cortou, foi consumida pelo subtrair do passo 3`));
  });
});
