/* Sobreposição na projeção: silhuetas que se cobrem sem penetração 3D, explosão e opacidade. */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, ErroDeEsboco, explodir, resolverOpcao } from '../src/index.js';
import { verificarContato } from '../src/contato.js';
import { descreverGrupoDaProjecao, descreverProjecao, FATORES_DA_SUGESTAO, FOLGA_MINIMA_PADRAO, MAXIMO_PADRAO, medirProjecaoDaOpcao, relatarOpcao, TIPO_DO_ACHADO, verificarProjecao } from '../src/projecao.js';
import { analisarEsboco, ESCALA_RELATIVA_MINIMA, variante } from '../../../tools/modelar/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const esboco = (formas, contato = {}, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, folga: 500, ...contato }, ...extra });
const motivo = 'as peças se cruzam de propósito neste teste';
const ladoALado = (dx = 30, dy = 0, dz = 0, extra = {}) => [caixa('a', [0, 0, 0]), caixa('b', [dx, dy, dz], extra)];
const daVista = (r, vista) => r.porVista[vista];

describe('sobreposição na projeção', () => {
  it('duas caixas separadas 10 mm em x: sem achado na frontal, achado na lateral, e a de x maior fica na frente', () => {
    const r = verificarProjecao(esboco(ladoALado()));
    expect(r.usar).toBe(true);
    expect(daVista(r, 'frontal')).toEqual([]);
    expect(daVista(r, 'superior')).toEqual([]);
    const [a] = daVista(r, 'lateral');
    expect(a).toMatchObject({ tipo: TIPO_DO_ACHADO, opcao: 'T', vista: 'lateral', pecas: ['a', 'b'], cobre: 'b', coberta: 'a', fracao: 1, folga_mm: 10 });
    expect(a.area_mm2).toBeCloseTo(400, -1);
    expect(a.alternativa).toEqual({ vista: 'frontal', fracao: 0 });
    expect(descreverProjecao(a)).toBe('[T] sobreposição na projeção: na vista lateral, b cobre a em 100% (a folga real entre elas é 10,0 mm); na vista frontal elas não se cobrem');
    expect(r.resultado).toBe('aviso');
    /* a medida bruta e a do gate 3D: folga real, nenhuma penetração */
    expect(verificarContato(esboco(ladoALado())).achados.map((x) => x.tipo)).not.toContain('colisao');
  });

  it('quem cobre quem confere com a posição: z maior na frontal, x menor na lateral olhando de +x', () => {
    const emZ = verificarProjecao(esboco(ladoALado(0, 0, 30)));
    expect(daVista(emZ, 'frontal')[0]).toMatchObject({ cobre: 'b', coberta: 'a' });
    expect(daVista(emZ, 'lateral')).toEqual([]);
    const trocado = verificarProjecao(esboco([caixa('a', [0, 0, 30]), caixa('b', [0, 0, 0])]));
    expect(daVista(trocado, 'frontal')[0]).toMatchObject({ cobre: 'a', coberta: 'b' });
    /* da superior (olho em +y), quem está mais alto cobre */
    const emY = verificarProjecao(esboco(ladoALado(0, 30, 0)));
    expect(daVista(emY, 'superior')[0]).toMatchObject({ cobre: 'b', coberta: 'a' });
    expect(daVista(emY, 'frontal')).toEqual([]);
  });

  it('a medida bruta traz a área, a fração da menor silhueta e a profundidade decide a frente', () => {
    const rs = resolverOpcao({ formas: [caixa('a', [0, 0, 0]), caixa('b', [0, 15, 30], { largura: 40, altura: 40 })] });
    const m = medirProjecaoDaOpcao(rs, 'frontal');
    expect(m.pares).toHaveLength(1);
    /* a (20x20) tem y de -10 a 10; b (40x40) tem y de -5 a 35: sobrepõem 20 x 15 mm = 300 mm², 75% da menor */
    expect(m.pares[0].area_mm2).toBeCloseTo(300, -1);
    expect(m.pares[0].fracao).toBeCloseTo(0.75, 1);
    expect(m.pares[0]).toMatchObject({ cobre: 'b', coberta: 'a' });
    expect(m.areas.a).toBeCloseTo(400, -1);
    expect(m.areas.b).toBeCloseTo(1600, -1);
    expect(() => medirProjecaoDaOpcao(rs, 'inferior')).toThrow(ErroDeEsboco);
  });

  it('a silhueta é a da forma inteira: um anel visto de frente deixa o furo livre', () => {
    const anel = { id: 'anel', tipo: 'anel', diametroExterno: 100, diametroInterno: 60, espessura: 10, eixo: 'z', centro: [0, 0, 0] };
    const pino = caixa('pino', [0, 0, 30], { largura: 10, altura: 10, profundidade: 10 });
    const m = medirProjecaoDaOpcao(resolverOpcao({ formas: [anel, pino] }), 'frontal');
    expect(m.pares).toEqual([]);
    expect(m.areas.anel).toBeCloseTo(Math.PI * (50 ** 2 - 30 ** 2), -2);
  });

  it('par com penetração 3D acima da penetracao, par atravessa e par em contato não geram achado', () => {
    /* caixas de 20 mm com 10 mm de penetração em x: a lateral as cobre por inteiro, mas elas se cruzam */
    const cruzam = verificarProjecao(esboco(ladoALado(10)));
    expect(cruzam.achados).toEqual([]);
    expect(cruzam.resultado).toBe('aprovado');
    /* penetração aceita pelo gate: as peças estão em contato, e a sobreposição é o contato */
    expect(verificarProjecao(esboco(ladoALado(10), { penetracao: 12 })).achados).toEqual([]);
    /* atravessa declarado, mesmo separado */
    const atravessa = verificarProjecao(esboco(ladoALado(), { pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 5, motivo }] }));
    expect(atravessa.achados).toEqual([]);
    /* encostadas: a sobreposição é o contato */
    expect(verificarProjecao(esboco(ladoALado(20))).achados).toEqual([]);
    /* longe: passa da espessura das peças, a distância explica a sobreposição */
    expect(verificarProjecao(esboco(ladoALado(100))).achados).toEqual([]);
  });

  it('o limiar decide, é declarável na raiz e na opção, e `reprova` faz reprovar', () => {
    const formas = [caixa('a', [0, 0, 0]), caixa('b', [0, 10, 30])]; /* frontal: 50% de sobreposição */
    const com = (projecao, extra = {}) => verificarProjecao(esboco(formas, { projecao }, extra));
    expect(com({}).resultado).toBe('aviso');
    expect(com({}).limiar).toBe(0.15);
    expect(com({ limiar: 0.4 }).achados).toHaveLength(1);
    expect(com({ limiar: 0.6 }).achados).toEqual([]);
    expect(com({ limiar: 0.6 }).resultado).toBe('aprovado');
    const reprova = com({ reprova: true });
    expect(reprova.resultado).toBe('reprovado');
    expect(reprova.reprova).toBe(true);
    /* a opção sobrepõe a raiz */
    const duas = { opcoes: [{ titulo: 'solta', formas }, { titulo: 'rigida', contato: { projecao: { limiar: 0.9 } }, formas }], contato: { usar: true, folga: 500, projecao: { limiar: 0.3 } } };
    const r = verificarProjecao(duas);
    expect(r.achados.map((a) => a.opcao)).toEqual(['solta']);
    expect(r.opcoes.map((o) => [o.limiar, o.resultado])).toEqual([[0.3, 'aviso'], [0.9, 'aprovado']]);
    const opcaoReprova = verificarProjecao({ ...duas, opcoes: [{ titulo: 'x', contato: { projecao: { reprova: true } }, formas }] });
    expect(opcaoReprova.resultado).toBe('reprovado');
    /* e a raiz continua avisando */
    expect(verificarProjecao(duas).resultado).toBe('aviso');
    expect(() => com({ limiar: 0 })).toThrow(/limiar/);
    expect(() => com({ limiar: 2 })).toThrow(/limiar/);
    expect(() => com({ reprova: 'sim' })).toThrow(/reprova/);
    expect(() => verificarProjecao(esboco(formas, { projecao: [] }))).toThrow(/projecao/);
  });

  it('peça oculta não entra, e só roda com contato.usar ou forçada', () => {
    expect(verificarProjecao(esboco(ladoALado(30, 0, 0, { oculto: true }))).achados).toEqual([]);
    const sem = { opcoes: [{ formas: ladoALado() }] };
    expect(verificarProjecao(sem)).toMatchObject({ usar: false, resultado: 'desligado', achados: [] });
    expect(verificarProjecao(esboco(ladoALado(), { usar: false }))).toMatchObject({ usar: false, resultado: 'desligado' });
    const forcada = verificarProjecao(sem, { forcar: true });
    expect(forcada.usar).toBe(true);
    expect(daVista(forcada, 'lateral')).toHaveLength(1);
  });

  it('explosão afasta as formas do centro do conjunto só no desenho, e o gate 3D não muda', () => {
    const formas = ladoALado(30, 5, 5);
    const rs = resolverOpcao({ formas });
    const ex = explodir(rs, { eixo: 'x', fator: 2 });
    /* o centro do conjunto em x é 15: a vai de 0 a -15 e b de 30 a 45 */
    expect(ex.map((r) => r.centro[0])).toEqual([-15, 45]);
    expect(ex.map((r) => r.min[0])).toEqual([-25, 35]);
    expect(rs.map((r) => r.centro[0])).toEqual([0, 30]);
    expect(explodir(rs, undefined)).toBe(rs);
    const e = esboco(formas);
    const explodido = { ...e, explosao: { eixo: 'x', fator: 2 } };
    expect(JSON.stringify(verificarContato(explodido))).toBe(JSON.stringify(verificarContato(e)));
    expect(JSON.stringify(verificarProjecao(explodido).achados)).toBe(JSON.stringify(verificarProjecao(e).achados));
    const normal = desenharEsboco(e);
    const solto = desenharEsboco(explodido);
    expect(solto.svg).not.toBe(normal.svg);
    expect(solto.escala).toBeLessThan(normal.escala);
    /* a explosão da opção vence a da raiz, e fator 1 é a identidade */
    expect(desenharEsboco({ ...e, explosao: { eixo: 'x', fator: 2 }, opcoes: [{ ...e.opcoes[0], explosao: { eixo: 'x', fator: 1 } }] }).svg).toBe(normal.svg);
    expect(() => desenharEsboco({ ...e, explosao: { eixo: 'w', fator: 2 } })).toThrow(/explosao/);
    expect(() => desenharEsboco({ ...e, explosao: { eixo: 'x', fator: 0.5 } })).toThrow(/explosao/);
    expect(() => desenharEsboco({ ...e, explosao: 'x' })).toThrow(/explosao/);
  });

  it('a explosão sugerida é o menor fator que zera os achados (ou o que mais reduz), no eixo que separa com o menor fator', () => {
    /* a e b se cobrem em 56% na lateral e em 19% na isométrica; nenhum fator até 2,5 zera os dois achados
       (a isométrica resiste), e o que mais reduz, de 2 para 1, com o menor fator, é 1,2 no eixo x */
    const e = esboco(ladoALado(30, 5, 5));
    const r = verificarProjecao(e, { sugerir: true });
    expect(r.explosao).toHaveLength(1);
    expect(r.explosao[0]).toMatchObject({ opcao: 'T', indice: 0, origem: 'sugerida', fator: 1.2, achados_antes: 2, achados_depois: 1 });
    expect(r.explosao[0].eixo).toBe('x');
    const restantes = (eixo, fator) => verificarProjecao({ ...e, explosao: { eixo, fator } }, { sugerir: true }).explosao[0].achados_depois;
    for (const eixo of ['x', 'y', 'z']) expect(restantes(eixo, 1), eixo).toBe(2);
    expect(Math.min(...FATORES_DA_SUGESTAO)).toBe(1.2);
    expect(restantes(r.explosao[0].eixo, 1.2)).toBe(1);
    for (const fator of FATORES_DA_SUGESTAO.filter((f) => f > 1.2)) expect(restantes(r.explosao[0].eixo, fator)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...FATORES_DA_SUGESTAO)).toBe(2.5);
    expect(verificarProjecao(e).explosao).toEqual([]);
    const declarada = verificarProjecao({ ...e, explosao: { eixo: 'y', fator: 4 } }, { sugerir: true });
    expect(declarada.explosao[0]).toMatchObject({ origem: 'declarada', eixo: 'y', fator: 4, achados_antes: 2, achados_depois: 1 });
  });

  it('opacidade envolve a forma num grupo e o valor 1 não muda o desenho', () => {
    const base = desenharEsboco(esboco(ladoALado())).svg;
    const um = desenharEsboco(esboco(ladoALado(30, 0, 0, { opacidade: 1 }))).svg;
    expect(um).toBe(base);
    expect(base).not.toContain('<g opacity');
    const meio = desenharEsboco(esboco(ladoALado(30, 0, 0, { opacidade: 0.55 }))).svg;
    expect(meio.match(/<g opacity="0\.55">/g)).toHaveLength(1);
    expect(meio.match(/<\/g>/g)).toHaveLength(1);
    const todas = desenharEsboco(esboco([caixa('a', [0, 0, 0], { opacidade: 0.3 }), caixa('b', [30, 0, 0], { opacidade: 0.3 })])).svg;
    expect(todas.match(/<g opacity="0\.3">/g)).toHaveLength(2);
    expect(() => desenharEsboco(esboco(ladoALado(30, 0, 0, { opacidade: 1.5 })))).toThrow(/opacidade/);
    expect(() => desenharEsboco(esboco(ladoALado(30, 0, 0, { opacidade: '0.5' })))).toThrow(/opacidade/);
  });

  it('o arquivo antigo gera o mesmo SVG com os campos novos ausentes, neutros ou só de gate', () => {
    const pasta = new URL('./fixtures/', import.meta.url);
    for (const nome of ['casa', 'mancal-eixo', 'teste-cubo']) {
      const antigo = JSON.parse(readFileSync(new URL(`${nome}.esboco.json`, pasta), 'utf8'));
      const svg = desenharEsboco(antigo).svg;
      const neutro = { ...antigo, contato: { usar: true, pares: [], projecao: { limiar: 0.5, reprova: true } }, opcoes: antigo.opcoes.map((o) => ({ ...o, formas: o.formas.map((f) => ({ ...f, opacidade: 1 })) })) };
      expect(desenharEsboco(neutro).svg).toBe(svg);
      expect(JSON.stringify(verificarProjecao(antigo))).toBe('{"usar":false,"limiar":null,"reprova":false,"resultado":"desligado","achados":[],"porVista":{},"explosao":[],"opcoes":[]}');
    }
    const casa = JSON.parse(readFileSync(new URL('casa.esboco.json', pasta), 'utf8'));
    expect(desenharEsboco(casa).svg).toBe(readFileSync(new URL('casa.svg', pasta), 'utf8'));
  });

  it('a moto: garfo/roda e balancim/roda na isométrica, nada na frontal, e balancim/motor (atravessa) fica de fora', () => {
    const moto = JSON.parse(readFileSync(new URL('./fixtures/moto.esboco.json', import.meta.url), 'utf8'));
    const r = verificarProjecao(moto, { forcar: true, sugerir: true });
    const par = (a, b) => (x) => x.pecas.includes(a) && x.pecas.includes(b);
    const iso = daVista(r, 'isometrica');
    for (const [a, b, folga, frente] of [['garfoE', 'rodaFrente', 12, 'rodaFrente'], ['garfoD', 'rodaFrente', 12, 'garfoD'], ['balancimE', 'rodaTras', 15, 'rodaTras'], ['balancimD', 'rodaTras', 15, 'balancimD']]) {
      const x = iso.find(par(a, b));
      expect(x, `${a}/${b}`).toBeDefined();
      expect(x.fracao).toBeGreaterThan(0.15);
      expect(x.folga_mm).toBe(folga);
      expect(x.cobre).toBe(frente);
    }
    expect(daVista(r, 'frontal').filter((x) => x.pecas.some((p) => /garfo|balancim/.test(p)) && x.pecas.some((p) => /roda/.test(p)))).toEqual([]);
    expect(r.achados.some(par('balancimE', 'motor'))).toBe(false);
    expect(r.achados.some(par('garfoE', 'guidao'))).toBe(false);
    expect(r.explosao[0]).toMatchObject({ origem: 'sugerida', eixo: 'z' });
    expect(r.explosao[0].fator).toBeLessThanOrEqual(2.5);
    expect(r.explosao[0].achados_depois).toBeLessThan(r.achados.length);
    expect(r.explosao[0].achados_antes).toBe(r.achados.length);
  }, 240000);

  it('a linha de comando imprime os achados de projeção junto do contato, e --estrito só falha com reprova', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'projecao-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco(ladoALado(), { tolerancia: 10 })));
    const r = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', arq, '--estrito'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('sobreposição na projeção (limiar 15%, informativo): aviso');
    expect(r.stdout).toContain('[T] sobreposição na projeção: na vista lateral, b cobre a em 100% (a folga real entre elas é 10,0 mm); na vista frontal elas não se cobrem');
    expect(r.stdout.indexOf('contato (')).toBeLessThan(r.stdout.indexOf('sobreposição na projeção ('));
    writeFileSync(arq, JSON.stringify(esboco(ladoALado(), { tolerancia: 10, projecao: { reprova: true } })));
    const rr = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', arq, '--estrito'], { encoding: 'utf8' });
    expect(rr.status).toBe(1);
    expect(rr.stdout).toContain('reprova): reprovado');
    const desligado = join(pasta, 'd.esboco.json');
    writeFileSync(desligado, JSON.stringify({ opcoes: [{ formas: ladoALado() }] }));
    expect(spawnSync(process.execPath, ['tools/modelar/esboco.mjs', desligado], { encoding: 'utf8' }).stdout).not.toContain('projeção');
  }, 120000);

  it('a análise grava projecao no manifesto, gera as variantes explodida e transparente e não gera sem achado', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'projecao-'));
    const arq = join(pasta, 'p.esboco.json');
    const origem = JSON.stringify(esboco(ladoALado(30, 5, 5)));
    writeFileSync(arq, origem);
    const { pasta: saida, manifesto } = await analisarEsboco(arq, { sugerir: true });
    expect(manifesto.projecao).toMatchObject({ usar: true, limiar: 0.15, reprova: false, resultado: 'aviso' });
    expect(manifesto.projecao.porVista.lateral[0]).toMatchObject({ pecas: ['a', 'b'], cobre: 'b', fracao: expect.any(Number), folga_mm: expect.any(Number), alternativa: expect.any(Object) });
    expect(manifesto.projecao.explosao[0]).toMatchObject({ origem: 'sugerida', fator: 1.2, achados_antes: 2, achados_depois: 1 });
    expect(Math.min(...Object.values(manifesto.projecao.explosao[0].escala_relativa))).toBeGreaterThanOrEqual(ESCALA_RELATIVA_MINIMA);
    const esperadas = ['explodida', 'transparente'].flatMap((m) => ['isometrica', 'frontal', 'lateral', 'superior'].map((v) => `${v}-${m}-legendas.png`));
    expect(manifesto.projecao.variantes).toEqual(esperadas);
    for (const nome of esperadas) { expect(manifesto.arquivos).toContain(nome); expect(existsSync(join(saida, nome))).toBe(true); }
    expect(manifesto.arquivos).toHaveLength(8 + 8);
    expect(manifesto.forcado).toEqual({ linhasCentro: false, legendasExplodidaTransparente: 'lista' });
    expect(readFileSync(arq, 'utf8')).toBe(origem);
    /* uma explosão declarada fica de fora das variantes normais e vale na explodida */
    writeFileSync(arq, JSON.stringify(esboco(ladoALado(30, 5, 5), {}, { explosao: { eixo: 'y', fator: 3 } })));
    const dec = (await analisarEsboco(arq, { sugerir: true })).manifesto;
    expect(dec.forcado).toEqual({ linhasCentro: false, explosao: false, legendasExplodidaTransparente: 'lista' });
    expect(dec.projecao.explosao[0]).toMatchObject({ origem: 'declarada', eixo: 'y', fator: 3 });
    /* sem sobreposição nem explosão: as 8 imagens de sempre */
    writeFileSync(arq, JSON.stringify({ opcoes: [{ formas: [caixa('a', [0, 0, 0]), caixa('b', [100, 0, 0])] }] }));
    const limpo = (await analisarEsboco(arq)).manifesto;
    expect(limpo.arquivos).toHaveLength(8);
    expect(limpo.forcado).toEqual({ linhasCentro: false });
    expect(limpo.projecao).toMatchObject({ usar: true, resultado: 'aprovado', variantes: [], explosao: [] });
  }, 180000);

  it('as variantes explodida e transparente forçam legendas em lista; a normal fica como o arquivo', () => {
    const e = esboco(ladoALado(30, 5, 5), {}, { legendas: 'colunas' });
    e.opcoes[0].legendas = 'colunas';
    const normal = variante(e, { vista: 'isometrica', legendas: true, centros: false });
    expect(normal.legendas).toBe('colunas');
    expect(normal.opcoes[0].legendas).toBe('colunas');
    for (const extra of [{ explosoes: [{ eixo: 'y', fator: 2 }] }, { transparente: true }]) {
      const v = variante(e, { vista: 'isometrica', legendas: true, centros: false, lista: true, ...extra });
      expect(v.legendas).toBe('lista');
      expect(v.opcoes[0].legendas).toBeUndefined();
    }
    expect(JSON.stringify(variante(e, { vista: 'lateral', legendas: false, centros: true, lista: false }))).toBe(JSON.stringify(variante(e, { vista: 'lateral', legendas: false, centros: true })));
  });

  it('a explodida da moto fica com pelo menos 60% da escala da normal em toda vista e reduz o fator para caber', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'projecao-'));
    const arq = join(pasta, 'moto.esboco.json');
    writeFileSync(arq, readFileSync(new URL('./fixtures/moto.esboco.json', import.meta.url)));
    const { manifesto } = await analisarEsboco(arq, { sugerir: true });
    const ex = manifesto.projecao.explosao[0];
    expect(ex.origem).toBe('sugerida');
    expect(ex.fator).toBeLessThanOrEqual(ex.fator_sugerido);
    expect(ex.fator_sugerido).toBeLessThanOrEqual(2.5);
    expect(Math.min(...Object.values(ex.escala_relativa))).toBeGreaterThanOrEqual(ESCALA_RELATIVA_MINIMA);
    expect(ex.aviso).toBeUndefined();
    expect(manifesto.forcado.legendasExplodidaTransparente).toBe('lista');
  }, 240000);
});

describe('ruído da projeção', () => {
  const comProj = (formas, projecao, extra = {}) => esboco(formas, { projecao }, extra);

  it('o relato agrupa os achados por componente, do mais grave ao menos, e os achados completos ficam em porVista', () => {
    const r = verificarProjecao(esboco([caixa('a', [0, 0, 0]), caixa('b', [30, 0, 0]), caixa('c', [60, 0, 0])]));
    const [rel] = r.relatorio;
    expect(rel).toMatchObject({ opcao: 'T', folgaMinima: FOLGA_MINIMA_PADRAO, maximo: MAXIMO_PADRAO, total: 2, ignorados: { espelho: 0, folga: 0 }, omitidos: { grupos: 0, achados: 0 } });
    expect(rel.grupos.map((g) => g.componentes)).toEqual([['a', 'b'], ['b', 'c']]);
    expect(rel.grupos[0]).toMatchObject({ achados: 1, vistas: ['lateral'], pior: { pecas: ['a', 'b'], vista: 'lateral' } });
    expect(r.achados).toHaveLength(2);
    expect(descreverGrupoDaProjecao(rel.grupos[0])).toBe(descreverProjecao(rel.grupos[0].pior));
  });

  it('achados entre as mesmas duas instâncias viram um grupo com o pior achado e a contagem dos outros', () => {
    const moto = JSON.parse(readFileSync(new URL('./fixtures/moto-componentes.esboco.json', import.meta.url), 'utf8'));
    const r = verificarProjecao(moto, { forcar: true });
    for (const rel of r.relatorio) {
      const noGrupo = rel.grupos.reduce((t, g) => t + g.achados, 0);
      expect(rel.total, rel.opcao).toBe(rel.ignorados.espelho + rel.ignorados.folga + noGrupo + rel.omitidos.achados);
      expect(rel.grupos.length).toBeLessThanOrEqual(MAXIMO_PADRAO);
      const chaves = rel.grupos.map((g) => g.componentes.join('|'));
      expect(new Set(chaves).size).toBe(chaves.length);
      const fracoes = rel.grupos.map((g) => g.pior.fracao);
      expect(fracoes).toEqual([...fracoes].sort((x, y) => y - x));
      for (const g of rel.grupos) {
        expect(g.pior.folga_mm).toBeGreaterThanOrEqual(FOLGA_MINIMA_PADRAO);
        for (const c of g.componentes) expect(c).not.toMatch(/\./);
      }
    }
    const agrupado = r.relatorio.flatMap((rel) => rel.grupos).find((g) => g.achados > 1);
    expect(agrupado).toBeDefined();
    expect(descreverGrupoDaProjecao(agrupado)).toMatch(/\n {4}mais \d+ achados? (entre .+ e .+|dentro de .+), nas vistas /);
  });

  it('pares de espelho e folgas abaixo de folgaMinima ficam fora do relato, contados em ignorados, e o limiar é declarável', () => {
    /* b é o espelho de a no eixo x em 15 mm: a lateral cobre um com o outro a 10 mm */
    const espelhados = [caixa('a', [0, 0, 0]), { id: 'b', espelha: { forma: 'a', eixo: 'x', pos: 15 } }];
    const r = verificarProjecao(esboco(espelhados));
    expect(r.achados).toHaveLength(1);
    expect(r.relatorio[0]).toMatchObject({ total: 1, ignorados: { espelho: 1, folga: 0 }, grupos: [] });
    /* as duas cópias de um mesmo espelho não se cobram uma a outra: o par delas é o do original */
    const copias = [caixa('a', [0, 0, 0]), { id: 'b', espelha: { forma: 'a', eixo: 'x', pos: 15 } }, { id: 'c', espelha: { forma: 'a', eixo: 'x', pos: 15 } }];
    expect(relatarOpcao('T', [{ pecas: ['b', 'c'], vista: 'lateral', fracao: 1, area_mm2: 1, folga_mm: 20 }], resolverOpcao({ formas: [copias[0], { ...copias[1], id: 'b' }, { ...copias[2], espelha: { forma: 'a', eixo: 'x', pos: 40 } }] })).ignorados.espelho).toBe(1);
    /* a 10 mm: aparece com o padrão de 10 e some com folgaMinima 15; a 5 mm some com o padrão */
    expect(verificarProjecao(esboco(ladoALado(30))).relatorio[0].grupos).toHaveLength(1);
    const alto = verificarProjecao(comProj(ladoALado(30), { folgaMinima: 15 }));
    expect(alto.relatorio[0]).toMatchObject({ folgaMinima: 15, total: 1, ignorados: { espelho: 0, folga: 1 }, grupos: [] });
    expect(alto.achados).toHaveLength(1);
    const cinco = verificarProjecao(esboco(ladoALado(25, 5, 5)));
    expect(cinco.relatorio[0].ignorados.folga).toBeGreaterThan(0);
    expect(cinco.relatorio[0].grupos).toEqual([]);
    expect(verificarProjecao(comProj(ladoALado(25, 5, 5), { folgaMinima: 0 })).relatorio[0].grupos).toHaveLength(1);
    /* a declaração da opção vence a da raiz */
    const e = comProj(ladoALado(30), { folgaMinima: 15 });
    e.opcoes[0].contato = { projecao: { folgaMinima: 0 } };
    expect(verificarProjecao(e).relatorio[0]).toMatchObject({ folgaMinima: 0, ignorados: { folga: 0 } });
  });

  it('só os N grupos mais graves aparecem, com o total omitido (padrão 10, declarável)', () => {
    const fila = Array.from({ length: 14 }, (_, k) => caixa(`f${k}`, [k * 30, 0, 0]));
    const r = verificarProjecao(esboco(fila));
    expect(r.relatorio[0].total).toBe(13);
    expect(r.relatorio[0].grupos).toHaveLength(10);
    expect(r.relatorio[0].omitidos).toEqual({ grupos: 3, achados: 3 });
    const tres = verificarProjecao(comProj(fila, { maximo: 3 })).relatorio[0];
    expect(tres).toMatchObject({ maximo: 3, omitidos: { grupos: 10, achados: 10 } });
    expect(tres.grupos).toHaveLength(3);
    expect(verificarProjecao(comProj(fila, { maximo: 50 })).relatorio[0].omitidos).toEqual({ grupos: 0, achados: 0 });
    /* o mais grave vem primeiro: a fração coberta decide */
    const desigual = [caixa('a', [0, 0, 0]), caixa('b', [30, 0, 0]), caixa('c', [60, 0, 0], { altura: 20 }), caixa('d', [90, 0, 6], { altura: 20 })];
    const fr = verificarProjecao(comProj(desigual, { maximo: 1 })).relatorio[0];
    expect(fr.grupos).toHaveLength(1);
    expect(fr.grupos[0].pior.fracao).toBe(Math.max(...verificarProjecao(esboco(desigual)).achados.map((a) => a.fracao)));
  });

  it('a declaração de folgaMinima e maximo é validada com a mensagem do campo', () => {
    expect(() => verificarProjecao(comProj(ladoALado(), { folgaMinima: -1 }))).toThrow(/"contato.projecao.folgaMinima" deve ser uma folga em mm/);
    expect(() => verificarProjecao(comProj(ladoALado(), { folgaMinima: '10' }))).toThrow(/folgaMinima/);
    expect(() => verificarProjecao(comProj(ladoALado(), { maximo: 0 }))).toThrow(/"contato.projecao.maximo" deve ser um inteiro de 1 ou mais/);
    expect(() => verificarProjecao(comProj(ladoALado(), { maximo: 2.5 }))).toThrow(/maximo/);
  });

  it('a explosão sugerida diz se converge, e a linha de comando avisa quando não converge', () => {
    const converge = verificarProjecao(esboco(ladoALado(30, 30, 30)), { sugerir: true }).explosao[0];
    expect(converge).toMatchObject({ origem: 'sugerida', achados_depois: 0, converge: true });
    const teimoso = verificarProjecao(esboco(ladoALado(30, 5, 5)), { sugerir: true }).explosao[0];
    expect(teimoso).toMatchObject({ origem: 'sugerida', achados_depois: 1, converge: false });
    const pasta = mkdtempSync(join(tmpdir(), 'ruido-'));
    const arq = join(pasta, 'n.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco(ladoALado(30, 5, 5), { folga: 500 }, { contato: { usar: true, folga: 500, projecao: { folgaMinima: 0 } } })));
    const r = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', arq, '--analise', '--rapido', '--sugerir'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('AVISO: a explosão sugerida não converge, e 1 dos 2 achados continuam com ela');
    writeFileSync(arq, JSON.stringify(esboco(ladoALado(30, 30, 30))));
    const bom = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', arq, '--analise', '--rapido', '--sugerir'], { encoding: 'utf8' });
    expect(bom.stdout).toContain('explosão sugerida [T]');
    expect(bom.stdout).not.toContain('não converge');
  }, 120000);

  it('a saída da linha de comando lista os grupos, o que ficou de fora e como mudar', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'ruido-'));
    const arq = join(pasta, 'f.esboco.json');
    writeFileSync(arq, JSON.stringify(esboco(Array.from({ length: 14 }, (_, k) => caixa(`f${k}`, [k * 30, 0, 0])), { folga: 500 })));
    const r = spawnSync(process.execPath, ['tools/modelar/esboco.mjs', arq, '--analise', '--rapido'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    const linhas = r.stdout.split('\n').filter((l) => l.includes('sobreposição na projeção: na vista'));
    expect(linhas).toHaveLength(10);
    expect(r.stdout).toContain('[T] fora do relato: 3 grupos mais leves (3 achados), acima do máximo de 10');
    expect(r.stdout).toContain('contato.projecao.maximo e contato.projecao.folgaMinima');
    expect(r.stdout).toContain('rode com --sugerir');
  }, 120000);
});
