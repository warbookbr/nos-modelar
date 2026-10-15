/* O importador de .csg: a fixture sintética escrita à mão cobre cada nó, e o resultado é medido pelo próprio esboço (a caixa de
   cada forma depois de posta e recortada), e não pela conta do importador. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { fragmentos, importarCsg, lerCsg, quadroDoEsboco, RecusaDeImportacao } from './esboco-importar-csg.mjs';
import { conferirComMalha, lerStl } from './esboco-importar-csg-conferir.mjs';
import { rodar } from './importar-csg.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/importar-csg/sintetico.csg', import.meta.url));
const texto = readFileSync(FIXTURE, 'utf8');

/* O intervalo do OpenSCAD, escrito no comentário de cada bloco da fixture, no quadro do esboço: (x, y, z) -> (x, z, -y), girado
   em torno de y conforme a frente. */
function noQuadroDoEsboco([[x0, x1], [y0, y1], [z0, z1]], frente = '+y') {
  const giro = { '+y': (v) => v, '-y': ([x, y, z]) => [-x, y, -z], '+x': ([x, y, z]) => [z, y, -x], '-x': ([x, y, z]) => [-z, y, x] }[frente];
  const cantos = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) cantos.push(giro([x, z, -y]));
  return [0, 1, 2].map((i) => [Math.min(...cantos.map((c) => c[i])), Math.max(...cantos.map((c) => c[i]))]);
}

const ESPERADO = {
  caixa_1: [[5, 15], [6, 26], [7, 37]],
  caixa_2: [[90, 110], [-5, 5], [-10, 20]],
  cilindro_3: [[192, 208], [-8, 8], [0, 40]],
  cilindro_4: [[292, 308], [-20, 20], [-8, 8]],
  cone_5: [[390, 410], [-10, 10], [0, 30]],
  cone_6: [[440, 460], [-10, 10], [0, 30]],
  esfera_7: [[488, 512], [-12, 12], [0, 24]],
  extrusao_8: [[600, 630], [0, 30], [0, 10]],
  extrusao_9: [[670, 700], [0, 30], [0, 10]],
  cilindro_10: [[804, 816], [-6, 6], [17.5, 22.5]],
  caixa_11: [[900, 910], [0, 4], [0, 8]],
  anel_12: [[990, 1010], [-10, 10], [0, 6]],
  revolucao_13: [[1090, 1110], [-10, 10], [0, 20]],
  anel_14: [[1188, 1212], [-12, 12], [0, 6]],
  caixa_15_1: [[1300, 1340], [0, 40], [0, 10]],
  cilindro_16_1: [[1400, 1410], [-10, 10], [0, 20]],
  caixa_17_1: [[1500, 1504], [0, 4], [0, 4]],
  caixa_17_2: [[1508, 1512], [0, 4], [0, 4]],
};

function caixasMedidas(esboco) {
  const d = descreverEsboco(JSON.parse(JSON.stringify(esboco)));
  return Object.fromEntries(d.opcoes[0].formas.map((f) => [f.id, [f.caixa.x, f.caixa.y, f.caixa.z]]));
}

describe('a leitura do .csg', () => {
  it('guarda a linha de cada nó e lê os números do formato exportado', () => {
    const arvore = lerCsg('// c\ncolor([1, 0.5, 0, 1]) {\n\tmultmatrix([[1, 0, 0, -2.5e-05], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\tcube(size = [1, 2, 3], center = true);\n\t}\n}\n');
    expect(arvore).toHaveLength(1);
    expect(arvore[0]).toMatchObject({ nome: 'color', linha: 2 });
    expect(arvore[0].filhos[0].pos[0][0][3]).toBe(-2.5e-5);
    expect(arvore[0].filhos[0].filhos[0]).toMatchObject({ nome: 'cube', linha: 4, nomeados: { size: [1, 2, 3], center: true } });
  });

  it('diz a linha do .csg que não consegue ler', () => {
    expect(() => lerCsg('cube(size = [1, 2, 3];\n')).toThrow(/linha 1/);
    expect(() => lerCsg('union() {\n cube(size = 1);\n')).toThrow(/sem fechar/);
  });

  it('conta os fragmentos como o OpenSCAD', () => {
    expect(fragmentos(3, {})).toBe(10); // 2*pi*3/2 = 9,4 -> 10
    expect(fragmentos(10, {})).toBe(30); // limitado por 360/12
    expect(fragmentos(100, {})).toBe(30);
    expect(fragmentos(0.1, {})).toBe(5); // o mínimo
    expect(fragmentos(50, { $fn: 8 })).toBe(8);
    expect(fragmentos(50, { $fn: 1 })).toBe(3);
  });
});

describe('a fixture sintética', () => {
  const { esboco, texto: saida, relatorio } = importarCsg(texto, { arquivo: 'sintetico.csg' });
  const medidas = caixasMedidas(esboco);

  it('põe cada forma onde o OpenSCAD a pôs, medida pelo esboço (z para cima vira y, a frente +y vira -z)', () => {
    for (const [id, intervalo] of Object.entries(ESPERADO)) {
      const esperado = noQuadroDoEsboco(intervalo);
      expect(medidas[id], id).toBeDefined();
      medidas[id].forEach(([a, b], i) => {
        expect(a, `${id} eixo ${i} mínimo`).toBeCloseTo(esperado[i][0], 0);
        expect(b, `${id} eixo ${i} máximo`).toBeCloseTo(esperado[i][1], 0);
      });
    }
  });

  it.each(['-y', '+x', '-x'])('a frente %s também põe cada forma onde o OpenSCAD a pôs', (frente) => {
    const m = caixasMedidas(importarCsg(texto, { arquivo: 'sintetico.csg', frente }).esboco);
    for (const [id, intervalo] of Object.entries(ESPERADO)) {
      const esperado = noQuadroDoEsboco(intervalo, frente);
      m[id].forEach(([a, b], i) => {
        expect(a, `${frente} ${id} eixo ${i} mínimo`).toBeCloseTo(esperado[i][0], 0);
        expect(b, `${frente} ${id} eixo ${i} máximo`).toBeCloseTo(esperado[i][1], 0);
      });
    }
  });

  it('usa o tipo de forma que o nó pede', () => {
    const tipo = (id) => esboco.opcoes[0].formas.find((f) => f.id === id).tipo;
    expect(tipo('caixa_1')).toBe('caixa');
    expect(tipo('cilindro_3')).toBe('cilindro');
    expect(tipo('cone_5')).toBe('cone');
    expect(tipo('esfera_7')).toBe('esfera');
    expect(tipo('extrusao_8')).toBe('extrusao');
    expect(tipo('cilindro_10')).toBe('cilindro'); // extrusão de círculo
    expect(tipo('caixa_11')).toBe('caixa'); // extrusão de quadrado
    expect(tipo('anel_12')).toBe('anel'); // extrusão de círculo menos círculo
    expect(tipo('revolucao_13')).toBe('revolucao');
    expect(tipo('anel_14')).toBe('anel'); // revolução de retângulo afastado do eixo
  });

  it('guarda a cor, a rotação e a ordem das medidas do cubo (largura x, altura de z, profundidade de y)', () => {
    const f = Object.fromEntries(esboco.opcoes[0].formas.map((x) => [x.id, x]));
    expect(f.caixa_1).toMatchObject({ largura: 10, altura: 30, profundidade: 20, cor: '#ff0000' });
    expect(f.caixa_1.rotacao).toBeUndefined();
    expect(f.caixa_2.rotacao).toEqual([0, 90, 0]);
    expect(f.cone_5).toMatchObject({ diametro: 20, diametroTopo: 0, comprimento: 30 });
    expect(f.cone_6).toMatchObject({ diametro: 20, diametroTopo: 0, comprimento: 30 });
    expect(Math.abs(f.cone_6.rotacao[0])).toBe(180); // a ponta que estava embaixo vira o início do cone, girado
    expect(f.cilindro_3.lados).toBeUndefined(); // 64 lados é círculo
  });

  it('vira diferença em subtrai com cortador, também dentro do cortador, e descarta o cortador que não toca nada', () => {
    const f = Object.fromEntries(esboco.opcoes[0].formas.map((x) => [x.id, x]));
    expect(f.caixa_15_1.subtrai).toEqual(['corte_cilindro_15_2', 'corte_caixa_15_3_1']);
    expect(f.corte_caixa_15_3_1.subtrai).toEqual(['corte_caixa_15_3_2']);
    expect(f.corte_cilindro_15_2.cortador).toBe(true);
    expect(relatorio.cortadoresSemEfeito).toBe(1);
    expect(esboco.opcoes[0].formas.some((x) => x.id.includes('esfera_15'))).toBe(false);
    // o recorte tirou volume de verdade: furo de r 5 por 10 de altura + moldura (12x12 menos 6x6) por 10
    const d = descreverEsboco(JSON.parse(saida)).opcoes[0].formas.find((x) => x.id === 'caixa_15_1');
    const furo = Math.PI * 25 * 10 / 1000; const moldura = (144 - 36) * 10 / 1000;
    expect(d.recorte.retira_cm3).toBeCloseTo(furo + moldura, 0);
  });

  it('vira interseção com caixa em placas cortadoras, e só as que tocam o sólido ficam', () => {
    const f = Object.fromEntries(esboco.opcoes[0].formas.map((x) => [x.id, x]));
    expect(f.cilindro_16_1.subtrai).toHaveLength(1);
    expect(f.cilindro_16_1.subtrai[0]).toMatch(/^corte_caixa_16_c1_placa\d$/);
    expect(esboco.opcoes[0].formas.some((x) => x.id === 'caixa_16_2')).toBe(false); // a caixa que recorta não aparece como sólido
    // o meio cilindro: metade do volume do cilindro de r 10 e h 20
    const d = descreverEsboco(JSON.parse(saida)).opcoes[0].formas.find((x) => x.id === 'cilindro_16_1');
    expect(d.recorte.retira_cm3).toBeCloseTo((Math.PI * 100 * 20) / 2 / 1000, 0);
  });

  it('espelhar uma extrusão inverte o perfil, e não a mão do referencial', () => {
    const f = Object.fromEntries(esboco.opcoes[0].formas.map((x) => [x.id, x]));
    expect(f.extrusao_9.perfil.map(([u]) => u + 0)).toEqual(f.extrusao_8.perfil.map(([u]) => -u + 0));
    expect(f.extrusao_9.rotacao).toBeUndefined();
  });

  it('ignora o objeto de fundo e diz', () => {
    expect(relatorio.avisos).toHaveLength(2);
    expect(relatorio.avisos[0]).toMatchObject({ no: 'multmatrix', linha: 127 });
    expect(relatorio.avisos[1].texto).toMatch(/sem \$fn: os lados vinham de \$fa e \$fs/); // cones 5 e 6, sem $fn
    expect(esboco.opcoes[0].formas.some((x) => x.id.includes('_18_'))).toBe(false);
  });

  it('dá id posicional, sem nome de parte inventado, e relata o nó e a linha de cada forma', () => {
    for (const f of esboco.opcoes[0].formas) expect(f.id).toMatch(/^(corte_)?(caixa|cilindro|cone|esfera|extrusao|revolucao|anel)_[\d_]+(_c\d_placa\d)?$/);
    expect(esboco.opcoes[0].formas.every((f) => f.rotulo === undefined && f.unidade === undefined)).toBe(true);
    const r = relatorio.formas.find((x) => x.id === 'cone_5');
    expect(r).toMatchObject({ no: 'cylinder', linha: 26, caminho: '5', tipo: 'cone' });
  });

  it('desliga o contato e diz por quê no plano, que cita quadro, nomes e frente', () => {
    expect(esboco.contato).toEqual({ usar: false });
    expect(esboco.plano.texto).toMatch(/sobrepõe as partes de propósito/);
    expect(esboco.plano.texto).toMatch(/z do OpenSCAD é o y do esboço/);
    expect(esboco.plano.texto).toMatch(/quem nomeia as partes é o esbocista/);
  });

  it('é determinístico: o mesmo .csg dá o mesmo arquivo', () => {
    expect(importarCsg(texto, { arquivo: 'sintetico.csg' }).texto).toBe(saida);
    expect(JSON.parse(saida)).toEqual(esboco);
  });

  it('gira o objeto inteiro no quadro do OpenSCAD antes de mapear, como o rotate() do OpenSCAD, e diz no plano', () => {
    const csg = 'cube(size = [10, 20, 30], center = false);\n';
    const r = importarCsg(csg, { girar: [90, 0, 0], arquivo: 'c.csg' });
    // rotate([90,0,0]) leva (x, y, z) a (x, -z, y): x 0..10, y -30..0, z 0..20; no esboço, (x, z, -y): x 0..10, y 0..20, z 0..30
    expect(caixasMedidas(r.esboco).caixa.flat().map((v) => v + 0)).toEqual([0, 10, 0, 20, 0, 30]);
    expect(r.esboco.plano.texto).toMatch(/girado \[90, 0, 0\] graus/);
    expect(r.relatorio.quadro.girar).toEqual([90, 0, 0]);
    expect(() => importarCsg(csg, { girar: [1, 2] })).toThrow(/girar/);
  });

  it('renomeia pelo mapa de nomes e recusa nome que não existe ou que colide', () => {
    const r = importarCsg(texto, { arquivo: 'sintetico.csg', nomes: { caixa_1: 'placa', cone_5: 'bico' } });
    const ids = r.esboco.opcoes[0].formas.map((f) => f.id);
    expect(ids).toContain('placa');
    expect(ids).toContain('bico');
    expect(() => importarCsg(texto, { nomes: { caixa_99: 'x' } })).toThrow(/não produz: caixa_99/);
    expect(() => importarCsg(texto, { nomes: { caixa_1: 'x', cone_5: 'x' } })).toThrow(/se repete/);
  });
});

describe('o que o esboço não expressa', () => {
  const recusa = (csg, parcial = false) => {
    try { importarCsg(csg, { parcial }); } catch (e) { if (e instanceof RecusaDeImportacao) return e; throw e; }
    return null;
  };

  it.each([
    ['hull', 'hull() {\n\tcube(size = [1, 1, 1], center = false);\n}\n', /casco convexo/],
    ['minkowski', 'minkowski() {\n\tcube(size = [1, 1, 1], center = false);\n}\n', /Minkowski/],
    ['polyhedron', 'polyhedron(points = [[0, 0, 0]], faces = [[0]], convexity = 1);\n', /poliedro/],
    ['text', 'text(text = "a", size = 10);\n', /texto/],
    ['import', 'import(file = "a.stl", layer = "", convexity = 1);\n', /malha/],
    ['nó desconhecido', 'inventado(x = 1);\n', /desconhecido/],
  ])('recusa %s com o nó e a linha', (nome, csg, motivo) => {
    const e = recusa(`cube(size = [1, 1, 1], center = false);\n${csg}`);
    expect(e.message).toMatch(/nada foi gravado/);
    expect(e.recusas).toHaveLength(1);
    expect(e.recusas[0].linha).toBe(2);
    expect(e.recusas[0].motivo).toMatch(motivo);
    expect(e.message).toMatch(/linha 2/);
  });

  it('recusa a interseção entre dois sólidos que não são caixa', () => {
    const e = recusa('intersection() {\n\tsphere(r = 5);\n\tcylinder(h = 5, r1 = 2, r2 = 2, center = false);\n}\n');
    expect(e.recusas[0]).toMatchObject({ no: 'intersection', linha: 1 });
    expect(e.recusas[0].motivo).toMatch(/dois sólidos que não são caixa/);
  });

  it('recusa cisalhamento, esfera e cilindro de escala desigual', () => {
    const cisalha = recusa(`multmatrix([[1, 0.5, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\tcube(size = [1, 1, 1], center = false);\n}\n`);
    expect(cisalha.recusas[0].motivo).toMatch(/cisalhamento/);
    const elipsoide = recusa(`multmatrix([[1, 0, 0, 0], [0, 2, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\tsphere(r = 1);\n}\n`);
    expect(elipsoide.recusas[0]).toMatchObject({ no: 'sphere', linha: 2 });
    const elipse = recusa(`multmatrix([[1, 0, 0, 0], [0, 2, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\tcylinder(h = 5, r1 = 1, r2 = 1, center = false);\n}\n`);
    expect(elipse.recusas[0].motivo).toMatch(/escala radial desigual/);
  });

  it('recusa torção, escala e furo da extrusão, a revolução parcial, o toro e o perfil que volta', () => {
    const poligono = 'polygon(points = [[0, 0], [10, 0], [10, 10], [0, 10]], paths = undef, convexity = 1);';
    expect(recusa(`linear_extrude(height = 5, twist = 90) {\n\t${poligono}\n}\n`).recusas[0].motivo).toMatch(/twist/);
    expect(recusa(`linear_extrude(height = 5, scale = [2, 2]) {\n\t${poligono}\n}\n`).recusas[0].motivo).toMatch(/scale/);
    expect(recusa('linear_extrude(height = 5) {\n\tpolygon(points = [[0, 0], [10, 0], [10, 10], [0, 10], [2, 2], [4, 2], [4, 4]], paths = [[0, 1, 2, 3], [4, 5, 6]], convexity = 1);\n}\n').recusas[0].motivo).toMatch(/furo/);
    expect(recusa(`rotate_extrude(angle = 180, $fn = 32) {\n\t${poligono}\n}\n`).recusas[0].motivo).toMatch(/angle/);
    const toro = recusa(`rotate_extrude(angle = 360, $fn = 32) {\n\tmultmatrix([[1, 0, 0, 10], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\tcircle(r = 2, $fn = 16);\n\t}\n}\n`);
    expect(toro.recusas[0]).toMatchObject({ no: 'circle', linha: 3 });
    expect(toro.recusas[0].motivo).toMatch(/toro/);
    const volta = recusa('rotate_extrude(angle = 360, $fn = 32) {\n\tpolygon(points = [[0, 0], [10, 0], [10, 20], [6, 20], [6, 10], [0, 10]], paths = undef, convexity = 1);\n}\n');
    expect(volta.recusas[0].motivo).toMatch(/sobe/);
  });

  it('lista todas as recusas de uma vez, na ordem do arquivo', () => {
    const e = recusa('hull() {\n\tcube(size = [1, 1, 1], center = false);\n}\ntext(text = "a");\nminkowski() {\n}\n');
    expect(e.recusas.map((r) => [r.no, r.linha])).toEqual([['hull', 1], ['text', 4], ['minkowski', 5]]);
  });

  it('no modo parcial grava o resto e diz o que ficou de fora, no relato e no plano', () => {
    const r = importarCsg(`cube(size = [1, 1, 1], center = false);\nhull() {\n\tcube(size = [1, 1, 1], center = false);\n}\n`, { parcial: true, arquivo: 'x.csg' });
    expect(r.esboco.opcoes[0].formas).toHaveLength(1);
    expect(r.relatorio.recusas).toHaveLength(1);
    expect(r.esboco.plano.texto).toMatch(/Importação parcial: 1 nó.*hull na linha 2/);
  });

  it('mantém o polígono só quando o .scad pediu $fn, e avisa quando a blocagem da receita não o aceita', () => {
    const r = importarCsg('cylinder($fn = 6, $fa = 12, $fs = 2, h = 5, r1 = 4, r2 = 4, center = false);\ncylinder($fn = 0, $fa = 12, $fs = 2, h = 5, r1 = 4, r2 = 4, center = false);\ncylinder($fn = 12, $fa = 12, $fs = 2, h = 5, r1 = 4, r2 = 4, center = false);\n');
    const [hex, derivado, doze] = r.esboco.opcoes[0].formas;
    expect(hex.lados).toBe(6);
    expect(derivado.lados).toBeUndefined(); // 4 mm de raio no $fs padrão dá 13 lados de tesselação, que não é forma
    expect(doze.lados).toBe(12);
    expect(r.relatorio.avisos.some((a) => /\$fn = 6.*N2/.test(a.texto))).toBe(true);
    const anel = recusa('linear_extrude(height = 2) {\n\tdifference() {\n\t\tcircle($fn = 12, r = 10);\n\t\tcircle($fn = 12, r = 6);\n\t}\n}\n');
    expect(anel.recusas[0].motivo).toMatch(/anel com \$fn = 12/);
  });

  it('recusa frente desconhecida', () => {
    expect(() => importarCsg(`cube(size = [1, 1, 1], center = false);\n`, { frente: 'cima' })).toThrow(/frente "cima"/);
  });

  it('aceita a interseção de caixas entre si (a primeira é o corpo)', () => {
    const r = importarCsg(`intersection() {\n\tcube(size = [10, 10, 10], center = false);\n\tmultmatrix([[1, 0, 0, 5], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\tcube(size = [10, 10, 10], center = false);\n\t}\n}\n`);
    const [corpo, ...resto] = r.esboco.opcoes[0].formas;
    expect(corpo.id).toBe('caixa_1');
    expect(corpo.subtrai.length).toBeGreaterThan(0);
    expect(resto.every((f) => f.cortador)).toBe(true);
    const m = caixasMedidas(r.esboco);
    expect(m.caixa_1[0][0]).toBeCloseTo(5, 3);
    expect(m.caixa_1[0][1]).toBeCloseTo(10, 3);
  });
});

describe('o objeto-prova guardado no banco de provas', () => {
  const PASTA = fileURLToPath(new URL('../../docs/mecanifica/banco-de-provas/importar-objeto-2026-10-15/', import.meta.url));
  const opcoes = { arquivo: 'toy-truck10-v3a.csg', girar: [-90, 0, 0], frente: '+x' };

  it('o esboço guardado é o que o importador dá hoje para o .csg guardado, byte a byte', () => {
    const r = importarCsg(readFileSync(join(PASTA, 'toy-truck10-v3a.csg'), 'utf8'), opcoes);
    expect(r.texto).toBe(readFileSync(join(PASTA, 'toy-truck10-v3a.esboco.json'), 'utf8'));
    const guardado = JSON.parse(readFileSync(join(PASTA, 'toy-truck10-v3a.importacao.json'), 'utf8'));
    const { conferencia, ...semConferencia } = guardado;
    expect(r.relatorio).toEqual(semConferencia);
    expect(conferencia.iou).toBeGreaterThan(0.98);
  });

  it('dá 17 formas sólidas e 17 cortadoras, e o esboço as lê sem recusar', () => {
    const { esboco } = importarCsg(readFileSync(join(PASTA, 'toy-truck10-v3a.csg'), 'utf8'), opcoes);
    const formas = esboco.opcoes[0].formas;
    expect(formas.filter((f) => !f.cortador)).toHaveLength(17);
    expect(formas.filter((f) => f.cortador)).toHaveLength(17);
    expect(() => descreverEsboco(JSON.parse(JSON.stringify(esboco)))).not.toThrow();
  });

  it('a fonte guardada é a que o .csg guardado exporta: os mesmos números e o mesmo corpo', () => {
    const csg = readFileSync(join(PASTA, 'toy-truck10-v3a.csg'), 'utf8');
    expect(csg).toMatch(/cube\(size = \[34\.5, 22, 12\.5\], center = true\)/); // o corpo: length 34,5 x width 22 x wheel_dia 12,5
    expect(readFileSync(join(PASTA, 'toy-truck10-v3a.scad'), 'utf8')).toMatch(/License - Public domain/);
    expect(readFileSync(join(PASTA, 'FONTE.md'), 'utf8')).toMatch(/42ac2a801d96f131b70cbef1fdb88e7ab348ad62/);
  });
});

describe('a linha de comando', () => {
  it('grava o esboço e a origem de cada forma ao lado, e não grava nada quando recusa', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'importar-csg-'));
    try {
      const saida = join(pasta, 'obj.esboco.json');
      const texto1 = await rodar([FIXTURE, '--saida', saida]);
      expect(texto1).toMatch(/22 formas/);
      expect(JSON.parse(readFileSync(saida, 'utf8')).opcoes[0].formas).toHaveLength(22);
      const lateral = JSON.parse(readFileSync(join(pasta, 'obj.importacao.json'), 'utf8'));
      expect(lateral.formas).toHaveLength(22);
      expect(lateral.fonte.arquivo).toBe('sintetico.csg');
      await expect(rodar([FIXTURE, '--frente', 'cima'])).rejects.toThrow(/frente/);
      await expect(rodar([FIXTURE, '--girar', '90,0'])).rejects.toThrow(/três ângulos/);
      await expect(rodar([FIXTURE, '--inventada'])).rejects.toThrow(/desconhecida/);
      await expect(rodar([])).rejects.toThrow(/falta o arquivo/);
      expect(existsSync(join(pasta, 'sintetico.esboco.json'))).toBe(false);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});

/* Cubo de 10 mm em STL de texto, no quadro do OpenSCAD, para conferir sem o OpenSCAD instalado. */
const STL_DO_CUBO = (() => {
  const v = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10]];
  const faces = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  return `solid cubo\n${faces.map((f) => `facet normal 0 0 0\nouter loop\n${f.map((i) => `vertex ${v[i].join(' ')}`).join('\n')}\nendloop\nendfacet`).join('\n')}\nendsolid cubo\n`;
})();

describe('a conferência contra a malha do OpenSCAD', () => {
  it('dá interseção/união 1 quando o esboço é o mesmo sólido e cai quando a forma muda', async () => {
    const mesmo = importarCsg('cube(size = [10, 10, 10], center = false);\n');
    const r = await conferirComMalha(mesmo.esboco, lerStl(STL_DO_CUBO), quadroDoEsboco({}));
    expect(r.volumeDoOpenScad_mm3).toBeCloseTo(1000, 1);
    expect(r.volumeDoEsboco_mm3).toBeCloseTo(1000, 1);
    expect(r.iou).toBe(1);
    const menor = importarCsg('cube(size = [10, 10, 5], center = false);\n');
    const m = await conferirComMalha(menor.esboco, lerStl(STL_DO_CUBO), quadroDoEsboco({}));
    expect(m.iou).toBeCloseTo(0.5, 3);
    expect(m.soNoOpenScad_mm3).toBeCloseTo(500, 1);
  });

  it('lê o STL binário igual ao de texto', () => {
    const tri = lerStl(STL_DO_CUBO);
    const buf = Buffer.alloc(84 + tri.length * 50);
    buf.writeUInt32LE(tri.length, 80);
    tri.forEach((t, i) => t.forEach((p, k) => p.forEach((x, j) => buf.writeFloatLE(x, 84 + i * 50 + 12 + k * 12 + j * 4))));
    expect(lerStl(buf)).toEqual(tri);
  });

  const temOpenScad = (() => { try { execFileSync('openscad', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } })();
  it.skipIf(!temOpenScad)('a fixture sintética coincide com a malha que o próprio OpenSCAD calcula dela (interseção/união acima de 0,99)', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'importar-csg-stl-'));
    try {
      const stl = join(pasta, 'sintetico.stl');
      execFileSync('openscad', ['-o', stl, FIXTURE], { stdio: 'ignore' });
      for (const [frente, girar] of [['+y', [0, 0, 0]], ['-x', [90, 0, 0]]]) {
        const { esboco } = importarCsg(texto, { arquivo: 'sintetico.csg', frente, girar });
        const r = await conferirComMalha(esboco, lerStl(readFileSync(stl)), quadroDoEsboco({ frente, girar }));
        expect(r.iou, `frente ${frente}, girar ${girar}`).toBeGreaterThan(0.99);
      }
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});
