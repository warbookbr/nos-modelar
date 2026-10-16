/* O importador de .csg: a fixture sintética escrita à mão cobre cada nó, e o resultado é medido pelo próprio esboço (a caixa de
   cada forma depois de posta e recortada), e não pela conta do importador. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { validarEsboco } from '../../modulos/esboco/src/index.js';
import { fragmentos, importarCsg, lerCsg, quadroDoEsboco, RecusaDeImportacao } from './esboco-importar-csg.mjs';
import { conferirComMalha, lerStl } from './esboco-importar-csg-conferir.mjs';
import { rodar } from './importar-csg.mjs';

const temOpenScad = (() => { try { execFileSync('openscad', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } })();
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
    ['hull com esfera', 'hull() {\n\tsphere(r = 1);\n}\n', /sphere dentro do hull/],
    ['minkowski de um filho só', 'minkowski() {\n\tcube(size = [1, 1, 1], center = false);\n}\n', /Minkowski/],
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

  it('recusa torção, escala negativa, a revolução parcial, o toro e o perfil que volta', () => {
    const poligono = 'polygon(points = [[0, 0], [10, 0], [10, 10], [0, 10]], paths = undef, convexity = 1);';
    expect(recusa(`linear_extrude(height = 5, twist = 90) {\n\t${poligono}\n}\n`).recusas[0].motivo).toMatch(/twist/);
    expect(recusa(`linear_extrude(height = 5, scale = [-1, 1]) {\n\t${poligono}\n}\n`).recusas[0].motivo).toMatch(/scale negativo/);
    expect(recusa(`rotate_extrude(angle = 180, $fn = 32) {\n\t${poligono}\n}\n`).recusas[0].motivo).toMatch(/angle/);
    const toro = recusa(`rotate_extrude(angle = 360, $fn = 32) {\n\tmultmatrix([[1, 0, 0, 10], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\tcircle(r = 2, $fn = 16);\n\t}\n}\n`);
    expect(toro.recusas[0]).toMatchObject({ no: 'circle', linha: 3 });
    expect(toro.recusas[0].motivo).toMatch(/toro/);
    const volta = recusa('rotate_extrude(angle = 360, $fn = 32) {\n\tpolygon(points = [[0, 0], [10, 0], [10, 20], [6, 20], [6, 10], [0, 10]], paths = undef, convexity = 1);\n}\n');
    expect(volta.recusas[0].motivo).toMatch(/sobe/);
  });

  it('lista todas as recusas de uma vez, na ordem do arquivo', () => {
    const e = recusa('hull() {\n\tsphere(r = 1);\n}\ntext(text = "a");\nminkowski() {\n}\n');
    expect(e.recusas.map((r) => [r.no, r.linha])).toEqual([['hull', 1], ['text', 4], ['minkowski', 5]]);
  });

  it('no modo parcial grava o resto e diz o que ficou de fora, no relato e no plano', () => {
    const r = importarCsg(`cube(size = [1, 1, 1], center = false);\nhull() {\n\tsphere(r = 1);\n}\n`, { parcial: true, arquivo: 'x.csg' });
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

/* As construções que o importador recusava e agora traduz. Cada caso é um `.csg` escrito à mão; a caixa de cada forma vem do próprio
   esboço (`descreverEsboco`), e a medida contra o OpenSCAD está nos testes do corpus e na fixture sintética. */
describe('as construções 2D e 3D que viraram forma', () => {
  const LE = 'center = false, convexity = 10, scale = [1, 1], $fn = 0, $fa = 12, $fs = 2';
  const importa = (csg) => importarCsg(csg, { arquivo: 'x.csg' });
  const recusaDe = (csg) => { try { importarCsg(csg); } catch (e) { if (e instanceof RecusaDeImportacao) return e.recusas; throw e; } return []; };
  const quadrado = (lado, x = 0, y = 0) => `multmatrix([[1, 0, 0, ${x}], [0, 1, 0, ${y}], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\t\tsquare(size = [${lado}, ${lado}], center = false);\n\t\t}`;
  const translada = (x, y, z, filho) => `multmatrix([[1, 0, 0, ${x}], [0, 1, 0, ${y}], [0, 0, 1, ${z}], [0, 0, 0, 1]]) {\n\t${filho}\n}\n`;
  const cil = (h, r, lados = 64) => `cylinder($fn = ${lados}, h = ${h}, r1 = ${r}, r2 = ${r}, center = false);`;
  const ele = 'polygon(points = [[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]], paths = undef, convexity = 1);';

  it('diferença 2D com furo vira a extrusão da peça menos a extrusão do furo, que passa um pouco das faces', () => {
    const { esboco } = importa(`linear_extrude(height = 5, ${LE}) {\n\tdifference() {\n\t\tsquare(size = [20, 20], center = false);\n\t\t${quadrado(4, 5, 5)}\n\t}\n}\n`);
    const [corpo, furo] = esboco.opcoes[0].formas;
    expect(corpo).toMatchObject({ id: 'caixa_1', tipo: 'caixa', subtrai: ['corte_caixa_1_f1'] });
    expect(furo).toMatchObject({ id: 'corte_caixa_1_f1', tipo: 'caixa', cortador: true, largura: 4, profundidade: 4 });
    expect(furo.altura).toBeGreaterThan(5); // o cortador passa das duas faces
    expect(furo.altura).toBeLessThan(5.1);
    expect(caixasMedidas(esboco).caixa_1).toEqual([[0, 20], [0, 5], [-20, 0]]);
  });

  it('o polígono com paths vira o contorno com os furos, e o furo dentro de furo é recusado', () => {
    const { esboco } = importa(`linear_extrude(height = 4, ${LE}) {\n\tpolygon(points = [[0, 0], [20, 0], [20, 20], [0, 20], [5, 5], [15, 5], [15, 15], [5, 15]], paths = [[0, 1, 2, 3], [4, 5, 6, 7]], convexity = 1);\n}\n`);
    expect(esboco.opcoes[0].formas.map((f) => [f.id, f.tipo, !!f.cortador])).toEqual([['extrusao', 'extrusao', false], ['corte_extrusao_f1', 'extrusao', true]]);
    const ilha = recusaDe(`linear_extrude(height = 4, ${LE}) {\n\tpolygon(points = [[0, 0], [30, 0], [30, 30], [0, 30], [5, 5], [25, 5], [25, 25], [5, 25], [10, 10], [20, 10], [20, 20], [10, 20]], paths = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]], convexity = 1);\n}\n`);
    expect(ilha[0].motivo).toMatch(/ilha dentro de furo/);
  });

  it('o subtraendo com furo vira peças convexas que não se sobrepõem', () => {
    const csg = `linear_extrude(height = 3, ${LE}) {\n\tdifference() {\n\t\tsquare(size = [30, 30], center = false);\n\t\tdifference() {\n\t\t\t${quadrado(10, 5, 5)}\n\t\t\t${quadrado(20, 10, 0)}\n\t\t}\n\t}\n}\n`;
    const { esboco } = importa(csg);
    const cortadores = esboco.opcoes[0].formas.filter((f) => f.cortador);
    expect(cortadores).toHaveLength(1); // X - Y com Y cobrindo a metade de X deixa uma peça convexa só
    expect(cortadores[0]).toMatchObject({ tipo: 'extrusao' });
  });

  it('offset(r) arredonda os cantos, offset(delta) os prolonga, chamfer os corta, e o negativo recua', () => {
    const offset = (args) => importa(`linear_extrude(height = 5, ${LE}) {\n\toffset(${args}, $fa = 12, $fs = 2) {\n\t\tsquare(size = [10, 10], center = false);\n\t}\n}\n`);
    for (const [args, caixa] of [['r = 2, $fn = 32', [[-2, 12], [0, 5], [-12, 2]]], ['delta = 2, chamfer = false, $fn = 0', [[-2, 12], [0, 5], [-12, 2]]], ['delta = 2, chamfer = true, $fn = 0', [[-2, 12], [0, 5], [-12, 2]]], ['r = -2, $fn = 32', [[2, 8], [0, 5], [-8, -2]]]]) {
      expect(caixasMedidas(offset(args).esboco).extrusao, args).toEqual(caixa);
    }
    const perfil = (args) => offset(args).esboco.opcoes[0].formas[0].perfil.length;
    expect(perfil('delta = 2, chamfer = false, $fn = 0')).toBe(4); // a esquadria mantém os quatro vértices
    expect(perfil('delta = 2, chamfer = true, $fn = 0')).toBe(8); // o chanfro troca cada canto por dois
    expect(perfil('r = 2, $fn = 32')).toBe(4 * 9); // 32 lados por volta: 8 passos e 9 pontos por canto de 90 graus
  });

  it('offset de círculo continua círculo, e o de círculo de poucos lados desloca o polígono', () => {
    const { esboco } = importa(`linear_extrude(height = 5, ${LE}) {\n\toffset(r = 2, $fn = 64, $fa = 12, $fs = 2) {\n\t\tcircle($fn = 64, r = 8);\n\t}\n}\n`);
    expect(esboco.opcoes[0].formas[0]).toMatchObject({ tipo: 'cilindro', diametro: 20 });
    const hex = importa(`linear_extrude(height = 5, ${LE}) {\n\toffset(r = 2, $fn = 64, $fa = 12, $fs = 2) {\n\t\tcircle($fn = 6, r = 8);\n\t}\n}\n`);
    expect(hex.esboco.opcoes[0].formas[0].tipo).toBe('extrusao');
  });

  it('offset em polígono côncavo, e o recuo que faz sumir ou cruzar', () => {
    const { esboco } = importa(`linear_extrude(height = 5, ${LE}) {\n\toffset(delta = 3, chamfer = false, $fn = 0, $fa = 12, $fs = 2) {\n\t\t${ele}\n\t}\n}\n`);
    expect(caixasMedidas(esboco).extrusao).toEqual([[-3, 33], [0, 5], [-33, 3]]);
    const fino = 'polygon(points = [[0, 0], [30, 0], [30, 4], [4, 4], [4, 30], [0, 30]], paths = undef, convexity = 1);';
    expect(recusaDe(`linear_extrude(height = 5, ${LE}) {\n\toffset(r = -3, $fn = 32, $fa = 12, $fs = 2) {\n\t\t${fino}\n\t}\n}\n`)[0].motivo).toMatch(/offset: o contorno deslocado se cruza/);
    const some = importarCsg(`cube(size = 1);\nlinear_extrude(height = 5, ${LE}) {\n\toffset(r = -9, $fn = 32, $fa = 12, $fs = 2) {\n\t\tsquare(size = [10, 10], center = false);\n\t}\n}\n`);
    expect(some.esboco.opcoes[0].formas).toHaveLength(1);
    expect(some.relatorio.avisos.some((a) => /encolhe o polígono até sumir/.test(a.texto))).toBe(true);
    expect(recusaDe('offset(r = 1) {\n\tsquare(size = 4);\n}\n')[0].motivo).toMatch(/offset 2D fora de linear_extrude/);
  });

  it('linear_extrude com scale vira cone no círculo e loft no polígono convexo, e recusa o côncavo', () => {
    const LS = 'center = false, convexity = 10, scale = [0.5, 0.5], $fn = 0, $fa = 12, $fs = 2';
    const cone = importa(`linear_extrude(height = 10, ${LS}) {\n\tcircle($fn = 64, r = 8);\n}\n`);
    expect(cone.esboco.opcoes[0].formas[0]).toMatchObject({ tipo: 'cone', diametro: 16, diametroTopo: 8, comprimento: 10 });
    const loft = importa(`linear_extrude(height = 10, ${LS}) {\n\tsquare(size = [10, 10], center = false);\n}\n`);
    const [forma] = loft.esboco.opcoes[0].formas;
    expect(forma.tipo).toBe('loft');
    expect(forma.secoes.map((se) => se.pos)).toEqual([-5, 5]);
    expect(caixasMedidas(loft.esboco).loft).toEqual([[0, 10], [0, 10], [-10, 0]]);
    // a escala é em torno da origem do plano: a seção do topo encolhe para o canto, e não para o centro do quadrado
    const [base, topo] = forma.secoes.map((se) => se.perfil);
    const largura = (perfil) => Math.max(...perfil.map((q) => q[0])) - Math.min(...perfil.map((q) => q[0]));
    expect(largura(base)).toBeCloseTo(10, 6);
    expect(largura(topo)).toBeCloseTo(5, 6);
    const ponta = importa(`linear_extrude(height = 10, center = false, convexity = 10, scale = [0, 0], $fn = 64, $fa = 12, $fs = 2) {\n\tcircle($fn = 64, r = 8);\n}\n`);
    expect(ponta.esboco.opcoes[0].formas[0]).toMatchObject({ tipo: 'cone', diametroTopo: 0 });
    expect(recusaDe(`linear_extrude(height = 10, ${LS}) {\n\t${ele}\n}\n`)[0].motivo).toMatch(/polígono côncavo/);
    expect(recusaDe('linear_extrude(height = 10, center = false, convexity = 10, scale = [1, 2], $fn = 64, $fa = 12, $fs = 2) {\n\tcircle($fn = 64, r = 8);\n}\n')[0].motivo).toMatch(/elipse/);
  });

  it('o furo de uma extrusão com scale vira o mesmo cone ou loft como cortador', () => {
    const { esboco } = importa('linear_extrude(height = 10, center = false, convexity = 10, scale = [0.5, 0.5], $fn = 0, $fa = 12, $fs = 2) {\n\tdifference() {\n\t\tsquare(size = [30, 30], center = true);\n\t\tcircle($fn = 64, r = 6);\n\t}\n}\n');
    const [corpo, furo] = esboco.opcoes[0].formas;
    expect(corpo).toMatchObject({ tipo: 'loft', subtrai: [furo.id] });
    expect(furo).toMatchObject({ tipo: 'cone', cortador: true });
    expect(furo.diametro).toBeCloseTo(12, 1); // um pouco acima de 12: o cortador passa da face de baixo na mesma reta do cone
    expect(furo.diametroTopo).toBeCloseTo(6, 1);
  });

  it('hull 2D vira o polígono do casco convexo', () => {
    const { esboco } = importa(`linear_extrude(height = 4, ${LE}) {\n\thull() {\n\t\tcircle($fn = 64, r = 5);\n\t\tmultmatrix([[1, 0, 0, 20], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\t\tcircle($fn = 64, r = 3);\n\t\t}\n\t}\n}\n`);
    expect(caixasMedidas(esboco).extrusao).toEqual([[-5, 23], [0, 4], [-5, 5]]);
  });

  it('hull 3D de prismas da mesma altura vira a extrusão do casco 2D das bases', () => {
    const { esboco } = importa(`hull() {\n\t${cil(8, 5)}\n\t${translada(20, 5, 0, cil(8, 3))}}\n`);
    expect(esboco.opcoes[0].formas).toHaveLength(1);
    expect(esboco.opcoes[0].formas[0].tipo).toBe('extrusao');
    expect(caixasMedidas(esboco).extrusao).toEqual([[-5, 23], [0, 8], [-8, 5]]);
    const caixas = importa(`hull() {\n\tcube(size = [10, 10, 5], center = false);\n\t${translada(20, 5, 0, 'cube(size = [4, 4, 5], center = false);')}}\n`);
    expect(caixasMedidas(caixas.esboco).extrusao).toEqual([[0, 24], [0, 5], [-10, 0]]);
  });

  it('hull 3D de seções semelhantes em torno do mesmo eixo vira cone, revolução ou loft', () => {
    const discos = importa(`hull() {\n\t${cil(2, 10)}\n\t${translada(0, 0, 12, cil(2, 4))}}\n`);
    expect(discos.esboco.opcoes[0].formas[0]).toMatchObject({ tipo: 'revolucao', perfil: [[10, 0], [10, 2], [4, 14]] });
    const virado = importa(`multmatrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]]) {\n\thull() {\n\t\tcylinder($fn = 64, h = 5, r1 = 8, r2 = 3, center = false);\n\t\t${translada(0, 0, 10, cil(3, 6))}\t}\n}\n`);
    expect(virado.esboco.opcoes[0].formas[0]).toMatchObject({ tipo: 'cone', diametro: 16, diametroTopo: 12, comprimento: 13 });
    const tronco = 'linear_extrude(height = 3, center = false, convexity = 5, scale = [1.2, 1.2], $fn = 0, $fa = 12, $fs = 2) {\n\t\tsquare(size = [10, 10], center = true);\n\t}';
    const troncos = importa(`hull() {\n\t${tronco}\n\t${translada(0, 0, 8, `multmatrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]]) {\n\t${tronco}\n}`)}}\n`);
    const [loft] = troncos.esboco.opcoes[0].formas;
    expect(loft.tipo).toBe('loft');
    expect(loft.secoes).toHaveLength(4); // 10 mm em z=0, 12 mm em z=3 e em z=5, 10 mm em z=8
    expect(caixasMedidas(troncos.esboco).loft).toEqual([[-6, 6], [0, 8], [-6, 6]]);
  });

  it('hull 3D que nenhuma forma do esboço expressa é recusado com o motivo', () => {
    expect(recusaDe(`hull() {\n\tcube(size = [10, 10, 5], center = false);\n\t${translada(20, 5, 8, 'cube(size = [4, 4, 2], center = false);')}}\n`)[0].motivo).toMatch(/eixos afastados e alturas diferentes/);
    expect(recusaDe(`hull() {\n\t${cil(5, 5)}\n\tmultmatrix([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]]) {\n\t\t${cil(5, 5)}\n\t}\n}\n`)[0].motivo).toMatch(/eixos que não são paralelos/);
    expect(recusaDe(`hull() {\n\t${cil(5, 5)}\n\tcylinder($fn = 6, h = 5, r1 = 5, r2 = 2, center = false);\n}\n`)[0].motivo).toMatch(/não são semelhantes/);
  });

  it('minkowski de cubo com cilindro é a extrusão do retângulo arredondado, e com esfera é a união de 3 caixas, 12 cilindros e 8 esferas', () => {
    const c = importa('minkowski(convexity = 0) {\n\tcube(size = [20, 10, 5], center = false);\n\tcylinder($fn = 32, h = 2, r1 = 3, r2 = 3, center = false);\n}\n');
    expect(caixasMedidas(c.esboco).extrusao).toEqual([[-3, 23], [0, 7], [-13, 3]]);
    const esf = importa('minkowski(convexity = 0) {\n\tcube(size = [20, 10, 5], center = false);\n\tsphere($fn = 32, r = 2);\n}\n');
    expect(esf.relatorio.tipos).toEqual({ caixa: 3, cilindro: 12, esfera: 8 });
    const m = Object.values(caixasMedidas(esf.esboco));
    const uniao = [0, 1, 2].map((i) => [Math.min(...m.map((q) => q[i][0])), Math.max(...m.map((q) => q[i][1]))]);
    expect(uniao).toEqual([[-2, 22], [-2, 7], [-12, 2]]); // o cubo [0,20]x[0,10]x[0,5] engrossado de 2 mm
    expect(esf.relatorio.nos.minkowski).toBe(1);
    expect(recusaDe('minkowski(convexity = 0) {\n\tsphere(r = 1);\n\tsphere(r = 1);\n}\n')[0].motivo).toMatch(/só a soma de um cubo/);
    expect(recusaDe('minkowski(convexity = 0) {\n\tcube(size = 5);\n\tcylinder(h = 2, r1 = 3, r2 = 1);\n}\n')[0].motivo).toMatch(/cilindro da soma tem de ser reto/);
  });

  it('rotate_extrude com furo vira a revolução menos a revolução do furo', () => {
    const { esboco } = importa('rotate_extrude(angle = 360, $fn = 48) {\n\tdifference() {\n\t\tsquare(size = [10, 10], center = false);\n\t\tmultmatrix([[1, 0, 0, 3], [0, 1, 0, 2], [0, 0, 1, 0], [0, 0, 0, 1]]) {\n\t\t\tsquare(size = [3, 5], center = false);\n\t\t}\n\t}\n}\n');
    const [corpo, furo] = esboco.opcoes[0].formas;
    expect(corpo).toMatchObject({ tipo: 'revolucao', subtrai: [furo.id] });
    expect(furo).toMatchObject({ tipo: 'anel', cortador: true, diametroExterno: 12, diametroInterno: 6, espessura: 5 });
  });

  it('o esboço de cada construção nova valida', () => {
    for (const csg of [
      'linear_extrude(height = 10, center = false, convexity = 10, scale = [0.5, 0.5], $fn = 0, $fa = 12, $fs = 2) {\n\tsquare(size = [10, 10], center = false);\n}\n',
      `hull() {\n\t${cil(2, 10)}\n\t${translada(0, 0, 12, cil(2, 4))}}\n`,
      'minkowski(convexity = 0) {\n\tcube(size = [20, 10, 5], center = false);\n\tsphere($fn = 32, r = 2);\n}\n',
    ]) {
      const { esboco } = importa(csg);
      expect(() => validarEsboco(JSON.parse(JSON.stringify(esboco)))).not.toThrow();
    }
  });
});

/* O corpus real: `.scad` de terceiros (CC-BY 4.0, ver fixtures/importar-csg/corpus/FONTE.md) e o `.csg` que o OpenSCAD exporta de cada um.
   Cada arquivo fixa o número de formas e a lista exata de recusas (nó, linha e motivo), de modo que uma regressão ou uma recusa nova
   aparece como diferença aqui; e fixa um piso para a razão interseção/união contra a malha que o próprio OpenSCAD calcula. */
describe('o corpus real do Thingiverse', () => {
  const PASTA = fileURLToPath(new URL('./fixtures/importar-csg/corpus/', import.meta.url));
  const HULL_DAS_ALETAS = 'hull: filhos com eixos afastados e alturas diferentes: o casco não é uma extrusão nem um loft de seções semelhantes';
  const CORPUS = [
    { nome: 'drone, trem de pouso', arquivo: 'drone/Landing_gear.csg', formas: 17, recusas: [], piso: 0.999 },
    { nome: 'drone, corpo inferior', arquivo: 'drone/Parametric_lower_body.csg', formas: 115, recusas: [], piso: 0.97, lento: true },
    { nome: 'drone, corpo superior', arquivo: 'drone/Parametric_top_body_v3.csg', formas: 118, recusas: [], piso: 0.98 },
    { nome: 'SCARA paramétrico', arquivo: 'scara/scara.csg', formas: 195, recusas: [], piso: 0.999 },
    {
      nome: 'foguete paramétrico',
      arquivo: 'foguete/foguete.csg',
      formas: 76,
      recusas: [1533, 1573, 1613, 1653, 1693].map((linha) => `hull (linha ${linha}): ${HULL_DAS_ALETAS}`),
      piso: 0.87,
      lento: true,
    },
  ];
  const importa = (arquivo) => importarCsg(readFileSync(join(PASTA, arquivo), 'utf8'), { parcial: true, arquivo: arquivo.replace(/^.*\//, '') });

  it.each(CORPUS)('$nome: importa com $formas formas e a lista de recusas fixada, e o esboço valida', ({ arquivo, formas, recusas }) => {
    const r = importa(arquivo);
    expect(r.esboco.opcoes[0].formas).toHaveLength(formas);
    expect(r.relatorio.recusas.map((x) => `${x.no} (linha ${x.linha}): ${x.motivo}`)).toEqual(recusas);
    expect(() => validarEsboco(JSON.parse(r.texto))).not.toThrow();
    expect(new Set(r.esboco.opcoes[0].formas.map((f) => f.id)).size).toBe(formas); // ids posicionais sem repetição
  });

  it.each(CORPUS)('$nome: o mesmo .csg dá o mesmo texto', ({ arquivo }) => {
    expect(importa(arquivo).texto).toBe(importa(arquivo).texto);
  });

  /* A blocagem da receita só aceita de 8 a 128 lados, e o corpus tem porcas de 6 lados; sem sólido, a conferência as relata em
     `formasSemMedida` e não as mede. Para o piso medir a tradução, a cópia do esboço leva essas formas a 8 lados. O STL sai do
     `openscad -o x.stl x.csg` na hora (nenhum STL fica no repositório), e o OpenSCAD 2021 gasta de 8 s a 1 min por arquivo: os dois
     mais lentos (corpo inferior do drone e foguete) só rodam com IMPORTAR_CSG_MEDIDA_COMPLETA=1. */
  async function iouContraOpenScad(arquivo) {
    const pasta = mkdtempSync(join(tmpdir(), 'importar-csg-corpus-'));
    try {
      const stl = join(pasta, 'x.stl');
      execFileSync('openscad', ['-q', '-o', stl, join(PASTA, arquivo)], { stdio: 'ignore' });
      const copia = JSON.parse(JSON.stringify(importa(arquivo).esboco));
      for (const f of copia.opcoes[0].formas) if (f.lados !== undefined && f.lados < 8) f.lados = 8;
      const medido = await conferirComMalha(copia, lerStl(readFileSync(stl)), quadroDoEsboco({}));
      expect(medido.formasSemMedida).toEqual([]);
      return medido.iou;
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }
  describe.skipIf(!temOpenScad)('contra a malha do OpenSCAD', () => {
    it.each(CORPUS.filter((c) => !c.lento))('$nome: interseção/união acima de $piso', async ({ arquivo, piso }) => {
      expect(await iouContraOpenScad(arquivo), arquivo).toBeGreaterThan(piso);
    }, 300_000);
    it.skipIf(!process.env.IMPORTAR_CSG_MEDIDA_COMPLETA).each(CORPUS.filter((c) => c.lento))('$nome: interseção/união acima de $piso (lento)', async ({ arquivo, piso }) => {
      expect(await iouContraOpenScad(arquivo), arquivo).toBeGreaterThan(piso);
    }, 600_000);
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

  it('não lança com o esboço vazio nem com a forma que a blocagem recusa: relata a forma e o motivo e mede o resto', async () => {
    const vazio = importarCsg('', { parcial: true });
    const r0 = await conferirComMalha(vazio.esboco, lerStl(STL_DO_CUBO), quadroDoEsboco({}));
    expect(r0).toMatchObject({ volumeDoEsboco_mm3: 0, volumeComum_mm3: 0, iou: 0 });
    expect(r0.volumeDoOpenScad_mm3).toBeCloseTo(1000, 1);
    expect(r0.formasSemMedida).toEqual([{ id: null, tipo: null, codigo: 'esboco-vazio', motivo: expect.stringMatching(/não tem forma alguma/) }]);
    const hex = importarCsg('cube(size = [10, 10, 10], center = false);\ncylinder($fn = 6, $fa = 12, $fs = 2, h = 5, r1 = 4, r2 = 4, center = false);\n');
    const r1 = await conferirComMalha(hex.esboco, lerStl(STL_DO_CUBO), quadroDoEsboco({}));
    expect(r1.formasSemMedida).toEqual([{ id: 'cilindro_2', tipo: 'cilindro', codigo: 'n2-recusa', motivo: expect.stringMatching(/entre 8 e 128/) }]);
    expect(r1.volumeDoEsboco_mm3).toBeCloseTo(1000, 1); // o cubo foi medido
    expect(r1.iou).toBe(1);
  });

  it('com --conferir, a forma que a blocagem recusa não derruba o comando e sai na lista', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'importar-csg-conferir-'));
    try {
      writeFileSync(join(pasta, 'x.csg'), 'cube(size = [10, 10, 10], center = false);\ncylinder($fn = 6, $fa = 12, $fs = 2, h = 5, r1 = 4, r2 = 4, center = false);\n');
      writeFileSync(join(pasta, 'x.stl'), STL_DO_CUBO);
      const texto1 = await rodar([join(pasta, 'x.csg'), '--conferir', join(pasta, 'x.stl')]);
      expect(texto1).toMatch(/interseção\/união 1$/m);
      expect(texto1).toMatch(/sem medida na conferência: cilindro_2 \(cilindro\): .*entre 8 e 128/);
      expect(JSON.parse(readFileSync(join(pasta, 'x.importacao.json'), 'utf8')).conferencia.formasSemMedida).toHaveLength(1);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });

  it('lê o STL binário igual ao de texto', () => {
    const tri = lerStl(STL_DO_CUBO);
    const buf = Buffer.alloc(84 + tri.length * 50);
    buf.writeUInt32LE(tri.length, 80);
    tri.forEach((t, i) => t.forEach((p, k) => p.forEach((x, j) => buf.writeFloatLE(x, 84 + i * 50 + 12 + k * 12 + j * 4))));
    expect(lerStl(buf)).toEqual(tri);
  });

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
